/**
 * escenarioF.js — Difusión de Rumores y Pánico Social
 * Simulación Numérica de Crisis - Métodos Numéricos Aplicados
 *
 * CONTEXTO DEL PROBLEMA:
 *   Durante una crisis de abastecimiento, los rumores se propagan generando
 *   pánico colectivo. A diferencia del Escenario G (modelo SIR estándar),
 *   aquí se modela un sistema de ecuaciones lineales MAL CONDICIONADO que
 *   representa la red de influencia entre grupos sociales.
 *
 *   El sistema Ax = b representa:
 *     - A: matriz de influencia entre n grupos sociales
 *     - b: vector de "presión de rumor" externa sobre cada grupo
 *     - x: vector de "nivel de adopción del rumor" por grupo
 *
 *   El mal condicionamiento refleja que pequeñas perturbaciones en b
 *   (nueva información, desmentido) producen grandes cambios en x
 *   (reacción desproporcionada del sistema social).
 *
 *   ADEMÁS: se modela la dinámica temporal del rumor con la EDO logística:
 *     dR/dt = α·R·(1 - R/K) - δ·R
 *
 *   donde:
 *     R(t) = proporción de personas que creen el rumor
 *     α    = tasa de contagio del rumor
 *     K    = capacidad máxima de adopción (saturación)
 *     δ    = tasa de desmentido/olvido
 *
 * MÉTODOS NUMÉRICOS:
 *   1. Gauss-Seidel (sistema lineal de influencias)
 *   2. Número de condición κ(A) = ||A|| · ||A⁻¹|| (análisis de estabilidad)
 *   3. RK4 (dinámica temporal del rumor)
 *
 * EXPORTA: window.escenarioF
 */

'use strict';

// ─────────────────────────────────────────────
// ALGORITMOS AUTOCONTENIDOS
// ─────────────────────────────────────────────

/**
 * Clona una matriz en profundidad.
 * @param {number[][]} M
 * @returns {number[][]}
 */
function clonarMatriz(M) {
  return M.map(f => [...f]);
}

/**
 * Norma infinita de un vector.
 * @param {number[]} v
 * @returns {number}
 */
function normaInf(v) {
  return Math.max(...v.map(Math.abs));
}

/**
 * Norma infinita de una matriz (máxima suma de fila).
 * ||A||∞ = max_i Σ_j |a_ij|
 * @param {number[][]} A
 * @returns {number}
 */
function normaInfMatriz(A) {
  return Math.max(...A.map(fila => fila.reduce((s, v) => s + Math.abs(v), 0)));
}

/**
 * Resuelve Ax = b con eliminación Gaussiana + pivoteo parcial.
 * Retorna x o null si el sistema es singular.
 * @param {number[][]} A
 * @param {number[]}   b
 * @returns {number[]|null}
 */
function gauss(A, b) {
  const n = A.length;
  const M = clonarMatriz(A);
  const v = [...b];

  for (let col = 0; col < n; col++) {
    // Pivoteo parcial
    let pivote = col;
    for (let f = col + 1; f < n; f++) {
      if (Math.abs(M[f][col]) > Math.abs(M[pivote][col])) pivote = f;
    }
    [M[col], M[pivote]] = [M[pivote], M[col]];
    [v[col], v[pivote]] = [v[pivote], v[col]];

    if (Math.abs(M[col][col]) < 1e-14) return null;

    for (let f = col + 1; f < n; f++) {
      const factor = M[f][col] / M[col][col];
      for (let k = col; k < n; k++) M[f][k] -= factor * M[col][k];
      v[f] -= factor * v[col];
    }
  }

  // Sustitución regresiva
  const x = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let s = v[i];
    for (let j = i + 1; j < n; j++) s -= M[i][j] * x[j];
    x[i] = s / M[i][i];
  }
  return x;
}

/**
 * Gauss-Seidel con historial de iteraciones.
 * @param {number[][]} A
 * @param {number[]}   b
 * @param {number}     tol
 * @param {number}     maxIter
 * @returns {Object}
 */
function gaussSeidel(A, b, tol, maxIter) {
  const n = A.length;
  const historial = [];

  // Verificar diagonal no nula
  for (let i = 0; i < n; i++) {
    if (Math.abs(A[i][i]) < 1e-14)
      return { solucion: null, convergió: false, iteraciones: historial,
               error: `Diagonal A[${i+1}][${i+1}] = 0. Reordena las ecuaciones.` };
  }

  let x = new Array(n).fill(0);

  historial.push({
    iteracion: 0, x: [...x], error: null, detalle: 'Vector inicial x⁰ = 0',
  });

  for (let iter = 1; iter <= maxIter; iter++) {
    const xAnterior = [...x];

    for (let i = 0; i < n; i++) {
      let s = b[i];
      for (let j = 0; j < n; j++) {
        if (j !== i) s -= A[i][j] * x[j];
      }
      x[i] = s / A[i][i];
    }

    // Error relativo máximo
    let err = 0;
    for (let i = 0; i < n; i++) {
      const d = Math.abs(x[i] - xAnterior[i]);
      const denom = Math.abs(x[i]) > 1e-14 ? Math.abs(x[i]) : 1;
      err = Math.max(err, d / denom);
    }

    historial.push({
      iteracion: iter, x: [...x], error: err,
      detalle: `iter ${iter}: error = ${err.toExponential(4)}`,
    });

    if (err < tol)
      return { solucion: x, convergió: true, iteraciones: historial,
               error: null, iteracionesTotal: iter, errorFinal: err };
  }

  return { solucion: x, convergió: false, iteraciones: historial,
           error: 'Gauss-Seidel no convergió. La matriz puede no ser diagonal dominante.',
           iteracionesTotal: maxIter, errorFinal: historial.at(-1)?.error ?? NaN };
}

/**
 * Estima el número de condición κ(A) ≈ ||A||∞ · ||A⁻¹||∞.
 * Un κ grande indica sistema mal condicionado.
 * @param {number[][]} A
 * @returns {{ kappa: number, normA: number, normAinv: number, error: string|null }}
 */
function numeroCondicion(A) {
  const n     = A.length;
  const normA = normaInfMatriz(A);

  // Calcular A⁻¹ columna por columna (resolviendo A·e_i para cada e_i)
  const Ainv = [];
  for (let j = 0; j < n; j++) {
    const ej = new Array(n).fill(0);
    ej[j] = 1;
    const col = gauss(A, ej);
    if (!col)
      return { kappa: Infinity, normA, normAinv: Infinity,
               error: 'La matriz es singular, no se puede calcular κ.' };
    Ainv.push(col);
  }

  // Transponer para obtener filas de A⁻¹
  const AinvT = Array.from({ length: n }, (_, i) => Ainv.map(col => col[i]));
  const normAinv = normaInfMatriz(AinvT);
  const kappa    = normA * normAinv;

  return { kappa, normA, normAinv, error: null };
}

// ─────────────────────────────────────────────
// RK4 PARA EDO LOGÍSTICA DEL RUMOR
// ─────────────────────────────────────────────

/**
 * dR/dt = α·R·(1 - R/K) - δ·R
 * Modelo logístico con desmentido.
 * @param {number} alpha - tasa de contagio del rumor
 * @param {number} K     - capacidad máxima (fracción, ej: 0.9)
 * @param {number} delta - tasa de desmentido
 * @returns {Function} f(t, R) → dR/dt
 */
function modeloRumor(alpha, K, delta) {
  return (t, R) => alpha * R * (1 - R / K) - delta * R;
}

/**
 * RK4 escalar para la EDO del rumor.
 * @param {Function} f    - f(t, R) → dR/dt
 * @param {number}   R0   - condición inicial
 * @param {number}   tFin
 * @param {number}   h    - paso
 * @returns {{ t: number[], R: number[], pasos: Object[] }}
 */
function rk4Escalar(f, R0, tFin, h) {
  const t = [0], R = [R0], pasos = [];
  const n = Math.ceil(tFin / h);

  for (let i = 0; i < n; i++) {
    const ti = t[i];
    const Ri = R[i];

    const k1 = f(ti,           Ri);
    const k2 = f(ti + h / 2,   Ri + (h / 2) * k1);
    const k3 = f(ti + h / 2,   Ri + (h / 2) * k2);
    const k4 = f(ti + h,       Ri + h * k3);

    const Rnuevo = Ri + (h / 6) * (k1 + 2*k2 + 2*k3 + k4);
    const Rclamp = Math.max(0, Math.min(1, Rnuevo)); // R ∈ [0, 1]

    t.push(parseFloat((ti + h).toFixed(8)));
    R.push(Rclamp);
    pasos.push({
      paso: i + 1, t: ti + h, R: Rclamp, k1, k2, k3, k4,
      detalle: `t=${(ti+h).toFixed(2)}: R=${Rclamp.toFixed(6)}, k1=${k1.toFixed(4)}`,
    });
  }

  return { t, R, pasos };
}

// ─────────────────────────────────────────────
// MATRICES PREDEFINIDAS (sistemas mal condicionados)
// ─────────────────────────────────────────────

/**
 * Genera una matriz de Hilbert n×n — el ejemplo clásico de sistema
 * extremadamente mal condicionado.
 * H[i][j] = 1 / (i + j + 1)
 * @param {number} n
 * @returns {number[][]}
 */
function matrizHilbert(n) {
  return Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => 1 / (i + j + 1))
  );
}

/**
 * Genera vector b = A·x_exacto con x_exacto = [1, 1, ..., 1].
 * Permite comparar la solución numérica con la exacta.
 * @param {number[][]} A
 * @returns {number[]}
 */
function vectorBdesdeUnos(A) {
  const n = A.length;
  return Array.from({ length: n }, (_, i) =>
    A[i].reduce((s, aij) => s + aij, 0)
  );
}

/**
 * Retorna las matrices predefinidas disponibles para el escenario.
 * @param {string} tipo
 * @param {number} n    - tamaño (solo para Hilbert)
 * @returns {{ A: number[][], b: number[], descripcion: string }|null}
 */
function obtenerMatrizPredefinida(tipo, n = 4) {
  switch (tipo) {
    case 'hilbert': {
      const A = matrizHilbert(n);
      const b = vectorBdesdeUnos(A);
      return {
        A, b,
        descripcion: `Matriz de Hilbert ${n}×${n} (extremadamente mal condicionada)`,
        xExacta: new Array(n).fill(1),
      };
    }
    case 'red3': {
      // Red de 3 grupos: bien condicionada (referencia)
      const A = [
        [10, -1,  2],
        [-1,  11, -1],
        [ 2, -1,  10],
      ];
      const b = [6, 25, -11];
      return {
        A, b,
        descripcion: 'Red 3 grupos (diagonal dominante, bien condicionada)',
        xExacta: null,
      };
    }
    case 'crisis4': {
      // Red de 4 grupos en crisis — moderadamente mal condicionada
      const A = [
        [ 4.0,  3.9,  0.0,  0.0],
        [ 3.9,  4.0,  0.0,  0.0],
        [ 0.0,  0.0,  6.0,  5.8],
        [ 0.0,  0.0,  5.8,  6.0],
      ];
      const b = [7.9, 7.9, 11.8, 11.8];
      return {
        A, b,
        descripcion: 'Red de crisis 4 grupos (moderadamente mal condicionada)',
        xExacta: null,
      };
    }
    default: return null;
  }
}

// ─────────────────────────────────────────────
// GENERADORES DE HTML
// ─────────────────────────────────────────────

/**
 * HTML del formulario principal.
 * @returns {string}
 */
function htmlFormulario() {
  return `
    <!-- SECCIÓN 1: Sistema lineal de influencias -->
    <div class="card card--info" style="margin-bottom: var(--spacing-4);">
      <div class="card__body">
        <strong>Parte 1 — Sistema de influencias (Ax = b):</strong>
        elige una red predefinida o ingresa tu propia matriz.
      </div>
    </div>

    <div class="form-row form-row--2-col">
      <div class="form-group">
        <label class="form-label" for="f-red">Red social predefinida</label>
        <select class="form-input" id="f-red" name="red">
          <option value="hilbert3">Hilbert 3×3 (mal condicionada)</option>
          <option value="hilbert4">Hilbert 4×4 (muy mal condicionada)</option>
          <option value="red3">Red 3 grupos (bien condicionada)</option>
          <option value="crisis4" selected>Red crisis 4 grupos</option>
          <option value="manual">Ingresar manualmente (3×3)</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label" for="f-tol-gs">Tolerancia Gauss-Seidel</label>
        <input class="form-input" type="number" id="f-tol-gs"
          value="0.000001" min="1e-12" max="0.01" step="0.000001">
      </div>
    </div>

    <!-- Entrada manual de matriz 3×3 -->
    <div id="f-matriz-manual" hidden>
      <p class="form-help" style="margin-bottom: var(--spacing-2);">
        Ingresa la matriz A (3×3) y el vector b fila por fila:
      </p>
      <div style="overflow-x: auto;">
        <table style="border-collapse: separate; border-spacing: 4px;">
          <thead>
            <tr>
              <th>a₁₁</th><th>a₁₂</th><th>a₁₃</th>
              <th style="padding-left:12px;">b₁</th>
            </tr>
          </thead>
          <tbody>
            ${[1,2,3].map(i => `
              <tr>
                ${[1,2,3].map(j => `
                  <td>
                    <input class="form-input f-aij" type="number"
                      id="f-a${i}${j}"
                      value="${i === j ? 10 : (Math.random() > 0.5 ? -1 : 1)}"
                      style="width:70px;">
                  </td>
                `).join('')}
                <td style="padding-left:12px;">
                  <input class="form-input" type="number"
                    id="f-b${i}" value="${i}" style="width:70px;">
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <hr style="margin: var(--spacing-5) 0; border-color: var(--color-neutral-200);">

    <!-- SECCIÓN 2: Dinámica temporal del rumor (RK4) -->
    <div class="card card--info" style="margin-bottom: var(--spacing-4);">
      <div class="card__body">
        <strong>Parte 2 — Dinámica temporal del rumor (RK4):</strong>
        modelo logístico con desmentido dR/dt = α·R·(1−R/K) − δ·R
      </div>
    </div>

    <div class="form-row form-row--3-col">
      <div class="form-group">
        <label class="form-label" for="f-R0">Adopción inicial R₀</label>
        <input class="form-input" type="number" id="f-R0"
          value="0.02" min="0.001" max="0.99" step="0.001">
        <span class="form-help">Fracción inicial que cree el rumor (0-1)</span>
      </div>
      <div class="form-group">
        <label class="form-label" for="f-alpha">Tasa de contagio (α)</label>
        <input class="form-input" type="number" id="f-alpha"
          value="0.5" min="0.01" max="5" step="0.01">
        <span class="form-help">Velocidad de propagación del rumor</span>
      </div>
      <div class="form-group">
        <label class="form-label" for="f-K">Saturación (K)</label>
        <input class="form-input" type="number" id="f-K"
          value="0.85" min="0.01" max="1" step="0.01">
        <span class="form-help">Máxima fracción que adoptará el rumor</span>
      </div>
    </div>

    <div class="form-row form-row--3-col">
      <div class="form-group">
        <label class="form-label" for="f-delta">Tasa de desmentido (δ)</label>
        <input class="form-input" type="number" id="f-delta"
          value="0.05" min="0" max="2" step="0.01">
        <span class="form-help">Fracción que abandona el rumor por día</span>
      </div>
      <div class="form-group">
        <label class="form-label" for="f-tFin">Días a simular</label>
        <input class="form-input" type="number" id="f-tFin"
          value="30" min="5" max="365" step="1">
      </div>
      <div class="form-group">
        <label class="form-label" for="f-h">Paso RK4 (h)</label>
        <input class="form-input" type="number" id="f-h"
          value="0.1" min="0.01" max="1" step="0.01">
      </div>
    </div>

    <div class="form-button-group">
      <button type="button" class="btn btn--primary" id="f-btn-calcular">
        ▶ Analizar difusión de rumor
      </button>
      <button type="button" class="btn btn--secondary" id="f-btn-limpiar">
        ↺ Restablecer
      </button>
    </div>
  `;
}

/**
 * HTML de la tabla del sistema lineal Ax = b.
 * Muestra A, b, x calculado y residuo.
 * @param {number[][]} A
 * @param {number[]}   b
 * @param {number[]}   x
 * @param {number[]|null} xExacta
 * @returns {string}
 */
function htmlTablaSistema(A, b, x, xExacta) {
  const n = A.length;

  // Calcular residuo r = b - Ax
  const residuo = b.map((bi, i) => bi - A[i].reduce((s, aij, j) => s + aij * x[j], 0));

  const filas = Array.from({ length: n }, (_, i) => {
    const errorComp = xExacta ? Math.abs(x[i] - xExacta[i]) : null;
    return `
      <tr>
        <td class="table__cell--number">x${i+1}</td>
        <td class="table__cell--number table__cell--highlight">
          ${x[i].toFixed(8)}
        </td>
        ${xExacta ? `
          <td class="table__cell--number">${xExacta[i].toFixed(6)}</td>
          <td class="table__cell--number ${errorComp > 1e-4 ? 'table__cell--error' : ''}">
            ${errorComp.toExponential(4)}
          </td>
        ` : ''}
        <td class="table__cell--number">${residuo[i].toExponential(4)}</td>
      </tr>
    `;
  }).join('');

  return `
    <div style="overflow-x: auto;">
      <table>
        <thead>
          <tr>
            <th>Variable</th>
            <th>x calculado</th>
            ${xExacta ? '<th>x exacto</th><th>Error abs.</th>' : ''}
            <th>Residuo (bᵢ − Aᵢx)</th>
          </tr>
        </thead>
        <tbody>${filas}</tbody>
      </table>
    </div>
  `;
}

/**
 * HTML del historial de Gauss-Seidel (máx 25 iteraciones).
 * @param {Object[]} iteraciones
 * @param {number}   n - dimensión del sistema
 * @returns {string}
 */
function htmlTablaGaussSeidel(iteraciones, n) {
  if (!iteraciones.length)
    return '<p class="form-help">Sin iteraciones disponibles.</p>';

  const mostrar  = iteraciones.slice(0, 26);
  const truncado = iteraciones.length > 26;

  const headers = ['Iter.', ...Array.from({ length: n }, (_, i) => `x${i+1}`), 'Error rel.'];

  const filas = mostrar.map(it => `
    <tr>
      <td class="table__cell--number">${it.iteracion}</td>
      ${it.x.map(v => `<td class="table__cell--number">${v.toFixed(6)}</td>`).join('')}
      <td class="table__cell--number">
        ${it.error !== null ? it.error.toExponential(4) : '—'}
      </td>
    </tr>
  `).join('');

  return `
    <div style="overflow-x: auto;">
      <table>
        <thead>
          <tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>
        </thead>
        <tbody>${filas}</tbody>
      </table>
    </div>
    ${truncado ? `<p class="form-help">Mostrando 26 de ${iteraciones.length} iteraciones.</p>` : ''}
  `;
}

/**
 * HTML de la tabla de la dinámica RK4 del rumor (cada 5 pasos).
 * @param {number[]} t
 * @param {number[]} R
 * @returns {string}
 */
function htmlTablaRumor(t, R) {
  const intervalo = Math.max(1, Math.floor(t.length / 20));
  const indices   = [];
  for (let i = 0; i < t.length; i += intervalo) indices.push(i);
  if (indices.at(-1) !== t.length - 1) indices.push(t.length - 1);

  const filas = indices.map(i => {
    const pct   = (R[i] * 100).toFixed(1);
    const clase = R[i] > 0.6 ? 'table__cell--error'
                : R[i] > 0.3 ? 'table__cell--highlight'
                : '';
    return `
      <tr>
        <td class="table__cell--number">${t[i].toFixed(1)}</td>
        <td class="table__cell--number ${clase}">${R[i].toFixed(6)}</td>
        <td class="table__cell--number ${clase}">${pct}%</td>
      </tr>
    `;
  }).join('');

  return `
    <div style="overflow-x: auto;">
      <table>
        <thead>
          <tr><th>Día (t)</th><th>R(t) fracción</th><th>Adopción</th></tr>
        </thead>
        <tbody>${filas}</tbody>
      </table>
    </div>
    <p class="form-help">
      Amarillo = adopción moderada (&gt;30%), rojo = adopción alta (&gt;60%).
      Mostrando ${indices.length} de ${t.length} pasos.
    </p>
  `;
}

/**
 * HTML de interpretación combinada (sistema + dinámica).
 * @param {Object} paramsSL  - { kappa, convergió, n, descripcion, xExacta }
 * @param {Object} paramsRK  - { alpha, K, delta, tFin, Rfinal, tPico, Rpico }
 * @returns {string}
 */
function htmlInterpretacion(paramsSL, paramsRK) {
  const { kappa, convergioGS, descripcion, xExacta } = paramsSL;
  const { alpha, K, delta, Rfinal, tPico, Rpico } = paramsRK;

  // Clasificar condicionamiento
  const nivelKappa = kappa > 1e6  ? { clase: 'alert--error',   icono: '🔴', texto: 'MUY MAL condicionado', riesgo: 'extremo' }
                   : kappa > 1e3  ? { clase: 'alert--warning',  icono: '🟠', texto: 'MAL condicionado',     riesgo: 'alto' }
                   : kappa > 100  ? { clase: 'alert--info',     icono: '🟡', texto: 'moderadamente condicionado', riesgo: 'moderado' }
                   :                { clase: 'alert--success',   icono: '🟢', texto: 'bien condicionado',    riesgo: 'bajo' };

  // Tasa neta del rumor
  const tasaNeta = alpha - delta;
  const rumorCrece = tasaNeta > 0;

  return `
    <!-- Análisis del sistema lineal -->
    <div class="alert ${nivelKappa.clase}" role="status">
      ${nivelKappa.icono} <strong>Número de condición κ(A) = ${
        isFinite(kappa) ? kappa.toExponential(4) : '∞ (singular)'
      }</strong> — El sistema está <strong>${nivelKappa.texto}</strong>.
      Riesgo de amplificación de errores: <strong>${nivelKappa.riesgo}</strong>.
    </div>

    <div class="card card--escenario-f" style="margin-top: var(--spacing-4);">
      <div class="card__header">
        <h3 class="card__title">📊 Análisis combinado del escenario</h3>
      </div>
      <div class="card__body">

        <div class="grid grid--auto">
          <div class="card card--info">
            <div class="card__body">
              <strong>Condicionamiento κ(A)</strong><br>
              <span style="font-size:1.4rem; color:var(--color-alert);">
                ${isFinite(kappa) ? kappa.toExponential(3) : '∞'}
              </span><br>
              <small>
                ${kappa > 1e6
                  ? 'Un error de 0.01% en b produce un error de ' +
                    (kappa * 0.0001 * 100).toFixed(0) + '% en x'
                  : kappa > 100
                    ? 'Sensibilidad moderada a perturbaciones'
                    : 'Sistema estable frente a perturbaciones'}
              </small>
            </div>
          </div>

          <div class="card card--info">
            <div class="card__body">
              <strong>Gauss-Seidel</strong><br>
              <span style="font-size:1.4rem; color:var(--color-primary);">
                ${convergioGS ? '✅ Convergió' : '❌ No convergió'}
              </span><br>
              <small>
                ${convergioGS
                  ? 'La red social tiene un estado de equilibrio alcanzable'
                  : 'La red puede no tener equilibrio estable (sistema inestable)'}
              </small>
            </div>
          </div>

          <div class="card card--info">
            <div class="card__body">
              <strong>Rumor al día ${paramsRK.tFin}</strong><br>
              <span style="font-size:1.4rem; color:var(--color-${Rfinal > 0.5 ? 'alert' : 'secondary'});">
                ${(Rfinal * 100).toFixed(1)}%
              </span><br>
              <small>
                Pico: ${(Rpico * 100).toFixed(1)}% en día ${tPico.toFixed(1)}
              </small>
            </div>
          </div>
        </div>

        <p style="margin-top:var(--spacing-4);">
          <strong>Análisis del sistema de influencias:</strong>
          La red <em>${descripcion}</em> presenta un número de condición
          κ = ${isFinite(kappa) ? kappa.toExponential(3) : '∞'}.
          ${kappa > 1e3
            ? `Esto significa que un desmentido oficial que reduzca b en un 1%
               puede producir cambios de hasta <strong>${Math.min(kappa * 0.01, 9999).toFixed(0)}%</strong>
               en los niveles de adopción del rumor por grupo, haciendo que
               pequeñas intervenciones tengan efectos impredecibles.`
            : `El sistema es relativamente estable: intervenciones moderadas
               en la presión de rumor producen respuestas proporcionales.`}
        </p>

        <p>
          <strong>Dinámica temporal (RK4):</strong>
          Con α = ${alpha} y δ = ${delta}, la tasa neta es
          <strong>α − δ = ${tasaNeta.toFixed(3)}</strong>.
          ${rumorCrece
            ? `El rumor <strong>crece</strong> y alcanza el ${(K*100).toFixed(0)}%
               de saturación. La ventana óptima de intervención es
               <strong>antes del día ${Math.max(1, Math.floor(tPico / 2))}</strong>,
               cuando R aún está por debajo del ${(Rpico * 50).toFixed(0)}%.`
            : `El rumor <strong>decae</strong> naturalmente gracias al desmentido
               (δ > α − desmentido efectivo). La adopción máxima fue
               ${(Rpico * 100).toFixed(1)}% en el día ${tPico.toFixed(1)}.`}
        </p>

        <p>
          <strong>Método numérico:</strong> Gauss-Seidel con tolerancia ${paramsSL.tol?.toExponential(0) ?? '1e-6'}
          para el sistema lineal. RK4 con paso h = ${paramsRK.h} para la EDO logística.
          Error de truncamiento RK4: O(h⁵) por paso.
          ${xExacta ? ' La solución exacta x = [1,1,...,1] permite medir el error real introducido por el mal condicionamiento.' : ''}
        </p>

      </div>
    </div>
  `;
}

// ─────────────────────────────────────────────
// GRÁFICOS
// ─────────────────────────────────────────────

let chartInstanciaF1 = null; // Sistema lineal (barras)
let chartInstanciaF2 = null; // Dinámica rumor (línea)

/**
 * Gráfico de barras: solución x del sistema lineal.
 * @param {string}   canvasId
 * @param {number[]} x
 * @param {number[]|null} xExacta
 */
function renderizarGraficoSL(canvasId, x, xExacta) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  if (chartInstanciaF1) { chartInstanciaF1.destroy(); chartInstanciaF1 = null; }

  const CFG    = window.APP_CONFIG?.CHART_CONFIG ?? {};
  const colores = CFG.COLORES ?? { PRIMARY: '#3E594F', ACCENT_WARM: '#F29966' };

  const labels = x.map((_, i) => `x${i+1} (Grupo ${i+1})`);

  chartInstanciaF1 = new Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label:           'Adopción calculada (Gauss-Seidel)',
          data:            x,
          backgroundColor: colores.PRIMARY,
          borderColor:     colores.PRIMARY,
          borderWidth:     1,
        },
        ...(xExacta ? [{
          label:           'Solución exacta',
          data:            xExacta,
          backgroundColor: colores.ACCENT_WARM,
          borderColor:     colores.ACCENT_WARM,
          borderWidth:     1,
        }] : []),
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: true,
          text:    'Nivel de adopción del rumor por grupo social',
          font:    { size: 13, weight: 'bold' },
        },
        legend: { position: 'top' },
      },
      scales: {
        y: { title: { display: true, text: 'Nivel de adopción (x)' } },
        x: { title: { display: true, text: 'Grupo social' } },
      },
    },
  });
}

/**
 * Gráfico de línea: dinámica temporal R(t).
 * @param {string}   canvasId
 * @param {number[]} t
 * @param {number[]} R
 */
function renderizarGraficoRumor(canvasId, t, R) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  if (chartInstanciaF2) { chartInstanciaF2.destroy(); chartInstanciaF2 = null; }

  const CFG    = window.APP_CONFIG?.CHART_CONFIG ?? {};
  const colores = CFG.COLORES ?? { ACCENT_WARM: '#F29966' };
  const fondos  = CFG.COLORES_FONDO ?? { ACCENT_WARM: 'rgba(242,153,102,0.15)' };

  // Submuestrear a máx 150 puntos
  const paso    = Math.max(1, Math.floor(t.length / 150));
  const indices = [];
  for (let i = 0; i < t.length; i += paso) indices.push(i);
  if (indices.at(-1) !== t.length - 1) indices.push(t.length - 1);

  chartInstanciaF2 = new Chart(document.getElementById(canvasId), {
    type: 'line',
    data: {
      labels: indices.map(i => t[i].toFixed(1)),
      datasets: [{
        label:           'R(t) — Fracción que cree el rumor',
        data:            indices.map(i => R[i]),
        borderColor:     colores.ACCENT_WARM,
        backgroundColor: fondos.ACCENT_WARM,
        borderWidth:     2.5,
        pointRadius:     0,
        fill:            true,
        tension:         0.3,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: true,
          text:    'Dinámica temporal del rumor — Modelo logístico (RK4)',
          font:    { size: 13, weight: 'bold' },
        },
        legend: { position: 'top' },
      },
      scales: {
        x: { title: { display: true, text: 'Tiempo (días)' },
             ticks: { maxTicksLimit: 12 } },
        y: { title: { display: true, text: 'Fracción de adopción R(t)' },
             min: 0, max: 1 },
      },
    },
  });
}

// ─────────────────────────────────────────────
// LEER FORMULARIO Y VALIDAR
// ─────────────────────────────────────────────

/**
 * Lee y valida todos los campos del formulario.
 * @returns {{ params: Object|null, errores: string[] }}
 */
function leerFormulario() {
  const errores = [];
  const red     = document.getElementById('f-red')?.value ?? 'crisis4';
  const tolGS   = parseFloat(document.getElementById('f-tol-gs')?.value);
  const R0      = parseFloat(document.getElementById('f-R0')?.value);
  const alpha   = parseFloat(document.getElementById('f-alpha')?.value);
  const K       = parseFloat(document.getElementById('f-K')?.value);
  const delta   = parseFloat(document.getElementById('f-delta')?.value);
  const tFin    = parseFloat(document.getElementById('f-tFin')?.value);
  const h       = parseFloat(document.getElementById('f-h')?.value);

  if (isNaN(tolGS) || tolGS <= 0) errores.push('Tolerancia Gauss-Seidel debe ser > 0.');
  if (isNaN(R0) || R0 <= 0 || R0 >= 1) errores.push('R₀ debe estar en (0, 1).');
  if (isNaN(alpha) || alpha <= 0) errores.push('α debe ser > 0.');
  if (isNaN(K) || K <= 0 || K > 1) errores.push('K debe estar en (0, 1].');
  if (isNaN(delta) || delta < 0) errores.push('δ debe ser ≥ 0.');
  if (isNaN(tFin) || tFin < 5) errores.push('Días a simular debe ser ≥ 5.');
  if (isNaN(h) || h <= 0 || h > 1) errores.push('Paso h debe estar entre 0.01 y 1.');

  // Leer sistema lineal
  let A = null, b = null, descripcion = '', xExacta = null;

  if (red === 'manual') {
    try {
      A = [[1,2,3],[1,2,3],[1,2,3]].map((_, i) =>
        [1,2,3].map(j => parseFloat(document.getElementById(`f-a${i+1}${j}`)?.value))
      );
      b = [1,2,3].map(i => parseFloat(document.getElementById(`f-b${i}`)?.value));
      if (A.flat().some(isNaN) || b.some(isNaN))
        errores.push('Todos los valores de la matriz y vector b deben ser números.');
      descripcion = 'Matriz manual 3×3';
    } catch {
      errores.push('Error leyendo la matriz manual.');
    }
  } else {
    const n = red === 'hilbert4' ? 4 : red === 'hilbert3' ? 3 : undefined;
    const tipo = red.startsWith('hilbert') ? 'hilbert' : red;
    const predefinida = obtenerMatrizPredefinida(tipo, n);
    if (!predefinida) {
      errores.push('Red predefinida no reconocida.');
    } else {
      A = predefinida.A;
      b = predefinida.b;
      descripcion = predefinida.descripcion;
      xExacta = predefinida.xExacta;
    }
  }

  if (errores.length > 0) return { params: null, errores };

  return {
    params: { A, b, descripcion, xExacta, tolGS, maxIter: 200,
              R0, alpha, K, delta, tFin, h },
    errores: [],
  };
}

/** Muestra los errores en el DOM. */
function mostrarErrores(errores) {
  const el = document.getElementById('f-errores');
  if (!el) return;
  el.innerHTML = errores.length === 0 ? '' : `
    <div class="alert alert--error" role="alert">
      <ul style="margin:0; padding-left:var(--spacing-4);">
        ${errores.map(e => `<li>${e}</li>`).join('')}
      </ul>
    </div>
  `;
}

// ─────────────────────────────────────────────
// MANEJO DEL SELECTOR DE RED
// ─────────────────────────────────────────────

function actualizarVistaRed() {
  const red    = document.getElementById('f-red')?.value;
  const manual = document.getElementById('f-matriz-manual');
  if (manual) manual.hidden = (red !== 'manual');
}

// ─────────────────────────────────────────────
// MANEJADOR PRINCIPAL
// ─────────────────────────────────────────────

function calcularEscenarioF() {
  const { params, errores } = leerFormulario();
  mostrarErrores(errores);
  if (!params) return;

  const { A, b, descripcion, xExacta, tolGS, maxIter,
          R0, alpha, K, delta, tFin, h } = params;

  // ── PARTE 1: Sistema lineal ──
  const resultGS  = gaussSeidel(A, b, tolGS, maxIter);
  const { kappa, normA, normAinv } = numeroCondicion(A);
  const x = resultGS.solucion ?? new Array(A.length).fill(0);

  // ── PARTE 2: Dinámica RK4 ──
  const F = modeloRumor(alpha, K, delta);
  const { t, R } = rk4Escalar(F, R0, tFin, h);

  // Pico del rumor
  let Rpico = 0, tPico = 0;
  R.forEach((Ri, i) => { if (Ri > Rpico) { Rpico = Ri; tPico = t[i]; } });
  const Rfinal = R.at(-1);

  // ── Gráficos ──
  renderizarGraficoSL('f-chart-sl', x, xExacta);
  renderizarGraficoRumor('f-chart-rumor', t, R);

  // ── Tablas ──
  const contSL = document.getElementById('f-tabla-sl');
  if (contSL) contSL.innerHTML = htmlTablaSistema(A, b, x, xExacta);

  const contGS = document.getElementById('f-tabla-gs');
  if (contGS) contGS.innerHTML = htmlTablaGaussSeidel(resultGS.iteraciones, A.length);

  const contRumor = document.getElementById('f-tabla-rumor');
  if (contRumor) contRumor.innerHTML = htmlTablaRumor(t, R);

  // ── Interpretación ──
  const contInterp = document.getElementById('f-interpretacion');
  if (contInterp)
    contInterp.innerHTML = htmlInterpretacion(
      { kappa, convergioGS: resultGS.convergió, descripcion, xExacta, tol: tolGS },
      { alpha, K, delta, tFin, Rfinal, tPico, Rpico, h }
    );

  // ── Mostrar resultados ──
  const resultados = document.getElementById('f-resultados');
  if (resultados) resultados.hidden = false;
}

function limpiarEscenarioF() {
  document.getElementById('form-escenario-f')?.reset();
  actualizarVistaRed();

  const resultados = document.getElementById('f-resultados');
  if (resultados) resultados.hidden = true;

  const errores = document.getElementById('f-errores');
  if (errores) errores.innerHTML = '';

  [chartInstanciaF1, chartInstanciaF2].forEach(c => {
    if (c) { c.destroy(); }
  });
  chartInstanciaF1 = null;
  chartInstanciaF2 = null;
}

// ─────────────────────────────────────────────
// REGISTRO DE EVENTOS
// ─────────────────────────────────────────────

function registrarEventosF() {
  document.getElementById('f-btn-calcular')
    ?.addEventListener('click', calcularEscenarioF);
  document.getElementById('f-btn-limpiar')
    ?.addEventListener('click', limpiarEscenarioF);
  document.getElementById('f-red')
    ?.addEventListener('change', actualizarVistaRed);
}

// ─────────────────────────────────────────────
// FUNCIÓN PRINCIPAL DE RENDERIZADO
// ─────────────────────────────────────────────

function escenarioF() {
  setTimeout(registrarEventosF, 0);

  return `
    <section
      class="seccion-contenido"
      id="vista-escenario-f"
      aria-labelledby="titulo-f"
    >

      <!-- ENCABEZADO -->
      <div class="seccion-contenido__header">
        <h1 id="titulo-f">📣 Escenario F: Difusión de Rumores y Pánico Social</h1>
        <p class="seccion-contenido__subtitulo">
          Sistemas lineales mal condicionados + modelo logístico de rumor (RK4)
        </p>
      </div>

      <!-- CONTEXTO -->
      <div class="card card--info" style="margin-bottom: var(--spacing-5);">
        <div class="card__body">
          <p>
            Este escenario combina dos análisis complementarios. El
            <strong>sistema Ax = b</strong> modela la red de influencia entre
            grupos sociales, donde el número de condición κ(A) mide cuán
            sensible es la adopción del rumor ante desmentidos oficiales.
            La <strong>EDO logística</strong> modela la evolución temporal
            del rumor, resuelta con RK4.
          </p>
          <p style="font-family: monospace; text-align: center; margin: var(--spacing-2) 0;">
            Ax = b &nbsp;(influencias) &nbsp;|&nbsp;
            dR/dt = α·R·(1−R/K) − δ·R &nbsp;(dinámica)
          </p>
        </div>
      </div>

      <!-- FORMULARIO -->
      <div class="card" style="margin-bottom: var(--spacing-5);">
        <div class="card__header">
          <h2 class="card__title">⚙️ Parámetros del modelo</h2>
        </div>
        <div class="card__body">
          <div id="f-errores" role="alert" aria-live="polite"></div>
          <form id="form-escenario-f" novalidate>
            ${htmlFormulario()}
          </form>
        </div>
      </div>

      <!-- RESULTADOS -->
      <div id="f-resultados" hidden>

        <!-- INTERPRETACIÓN -->
        <div id="f-interpretacion" style="margin-bottom: var(--spacing-5);"></div>

        <!-- GRÁFICO SISTEMA LINEAL -->
        <div class="card" style="margin-bottom: var(--spacing-5);">
          <div class="card__header">
            <h2 class="card__title">📊 Adopción del rumor por grupo social (Ax = b)</h2>
          </div>
          <div class="card__body">
            <div class="grafico-contenedor" style="height: 320px;">
              <canvas id="f-chart-sl"
                aria-label="Gráfico de adopción de rumor por grupo social"></canvas>
            </div>
          </div>
        </div>

        <!-- GRÁFICO DINÁMICA RK4 -->
        <div class="card" style="margin-bottom: var(--spacing-5);">
          <div class="card__header">
            <h2 class="card__title">📈 Dinámica temporal del rumor R(t)</h2>
          </div>
          <div class="card__body">
            <div class="grafico-contenedor" style="height: 320px;">
              <canvas id="f-chart-rumor"
                aria-label="Gráfico de dinámica temporal del rumor"></canvas>
            </div>
          </div>
        </div>

        <!-- TABLA SOLUCIÓN SISTEMA LINEAL -->
        <div class="card" style="margin-bottom: var(--spacing-5);">
          <div class="card__header">
            <h2 class="card__title">📋 Solución del sistema Ax = b</h2>
          </div>
          <div class="card__body" id="f-tabla-sl"></div>
        </div>

        <!-- TABLA GAUSS-SEIDEL -->
        <div class="card" style="margin-bottom: var(--spacing-5);">
          <div class="card__header">
            <h2 class="card__title">📋 Iteraciones Gauss-Seidel</h2>
          </div>
          <div class="card__body" id="f-tabla-gs"></div>
        </div>

        <!-- TABLA RUMOR RK4 -->
        <div class="card">
          <div class="card__header">
            <h2 class="card__title">📋 Dinámica R(t) — RK4</h2>
          </div>
          <div class="card__body" id="f-tabla-rumor"></div>
        </div>

      </div>

    </section>
  `;
}

// ─────────────────────────────────────────────
// EXPORTACIÓN GLOBAL
// ─────────────────────────────────────────────

window.escenarioF = escenarioF;