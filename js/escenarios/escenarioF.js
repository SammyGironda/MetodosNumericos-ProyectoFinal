// ============================================================
// escenarioF.js - Escenario F: Propagación de Rumores y Pánico
// Métodos: Sistemas mal condicionados — Gauss-Seidel + análisis
//          de número de condición + perturbaciones
// Contexto: Modelado de la propagación de rumores durante una
//           crisis social usando sistemas de ecuaciones lineales
//           que representan flujos de información entre zonas
// ============================================================

function gaussSeidel(...args) {
  return window.SistemasLineales?.gaussSeidel?.(...args);
}

function descomposicionLU(...args) {
  return window.SistemasLineales?.descomposicionLU?.(...args);
}

function renderizarGrafico(...args) {
  return window.Graficos?.linea?.(...args);
}

function renderizarTabla(...args) {
  return window.Tablas?.generar?.(...args);
}

function mostrarNotificacion(mensaje, tipo = 'info') {
  const notifier = window.Notificaciones;
  if (!notifier) return;
  if (tipo === 'success') return notifier.exito(mensaje);
  if (tipo === 'error') return notifier.error(mensaje);
  if (tipo === 'warning' || tipo === 'warn') return notifier.advertencia(mensaje);
  return notifier.info(mensaje);
}

function mostrarErrores(errores) {
  if (!errores || typeof errores !== 'object') return;
  Object.entries(errores).forEach(([campo, msg]) => {
    const el = document.getElementById(campo);
    if (el) { el.textContent = msg; el.style.display = 'block'; }
  });
}

function limpiarErrores(campos) {
  if (!Array.isArray(campos)) campos = [campos];
  campos.forEach((campo) => {
    const el = document.getElementById(campo);
    if (el) { el.textContent = ''; el.style.display = 'none'; }
  });
}

function normaVectorial(...args) { return window.Utilidades?.normaVectorial?.(...args); }
function normaMatriz(...args) { return window.Utilidades?.normaMatriz?.(...args); }
function productoMatrizVector(...args) { return window.Utilidades?.productoMatrizVector?.(...args); }

// ─── Constantes ──────────────────────────────────────────────
const ID_ESCENARIO       = 'escenario-f';
const CHART_RADAR_ID     = 'grafico-radar-f';
const CHART_COND_ID      = 'grafico-condicion-f';
const CHART_PERTURB_ID   = 'grafico-perturb-f';
let chartRadar           = null;
let chartCond            = null;
let chartPerturb         = null;

// ─── Sistemas precargados ────────────────────────────────────
/**
 * Cada sistema representa el flujo de rumores entre n zonas de
 * la ciudad. A·x = b donde:
 *   A[i][j] = tasa de influencia de zona j sobre zona i
 *   x[i]    = índice de pánico en zona i (incógnita)
 *   b[i]    = nivel de tensión social observado en zona i
 */
const SISTEMAS_PRECARGADOS = {
  bien_condicionado: {
    nombre:      'Sistema bien condicionado (4 zonas)',
    descripcion: 'Flujo de rumores equilibrado — solución estable ante perturbaciones',
    A: [
      [10, -1,  2,  0],
      [-1,  11, -1,  3],
      [ 2,  -1, 10, -1],
      [ 0,   3, -1,  8]
    ],
    b: [6, 25, -11, 15],
    xInicial: [0, 0, 0, 0]
  },
  mal_condicionado: {
    nombre:      'Sistema mal condicionado (4 zonas)',
    descripcion: 'Red de rumores con fuerte interdependencia — solución muy sensible a errores en datos',
    A: [
      [1,    1,    1,    1   ],
      [1,    1.01, 1,    1   ],
      [1,    1,    1.01, 1   ],
      [1,    1,    1,    1.01]
    ],
    b: [4, 4.01, 4.01, 4.01],
    xInicial: [1, 1, 1, 1]
  },
  hilbert_3: {
    nombre:      'Matriz de Hilbert 3×3 (muy mal condicionada)',
    descripcion: 'Caso extremo: pequeños errores en tensión social generan estimaciones de pánico completamente distintas',
    A: [
      [1,     1/2,  1/3 ],
      [1/2,   1/3,  1/4 ],
      [1/3,   1/4,  1/5 ]
    ],
    b: [1, 1, 1],
    xInicial: [0, 0, 0]
  },
  asimetrico: {
    nombre:      'Red asimétrica de influencia (5 zonas)',
    descripcion: 'Zona central domina la narrativa — modelo de propagación radial',
    A: [
      [8,  -1,  -1,  -1,  -1],
      [-1,  6,   0,   0,  -1],
      [-1,  0,   6,  -1,   0],
      [-1,  0,  -1,   6,   0],
      [-1, -1,   0,   0,   6]
    ],
    b: [20, 5, 8, 3, 10],
    xInicial: [0, 0, 0, 0, 0]
  },
  personalizado: {
    nombre:      'Sistema personalizado',
    descripcion: 'Ingresa tu propia matriz A y vector b',
    A:           null,
    b:           null,
    xInicial:    null
  }
};

// ─── Función principal ────────────────────────────────────────
function renderizarEscenarioF(contenedor) {
  chartRadar = chartCond = chartPerturb = null;

  contenedor.innerHTML = `
    <section class="escenario" id="${ID_ESCENARIO}" aria-labelledby="titulo-esc-f">

      <!-- ENCABEZADO -->
      <div class="escenario__header card card--escenario-f">
        <div class="card__body">
          <div class="escenario__titulo-grupo">
            <span class="badge badge--escenario-f">Escenario F</span>
            <h1 id="titulo-esc-f" class="escenario__titulo">
              Propagación de Rumores y Pánico Social — Sistemas Mal Condicionados
            </h1>
          </div>
          <p class="escenario__descripcion">
            Durante una crisis, los rumores se propagan entre zonas de la ciudad formando
            un sistema de ecuaciones lineales <strong>A·x = b</strong>. Este escenario
            investiga qué ocurre cuando ese sistema está <strong>mal condicionado</strong>:
            pequeños errores en los datos observados producen estimaciones de pánico
            completamente erróneas. Se compara <strong>Gauss-Seidel</strong> con
            <strong>Descomposición LU</strong> y se analiza el
            <strong>número de condición κ(A)</strong>.
          </p>
          <div class="escenario__formula">
            <code>A·x = b &nbsp;|&nbsp; κ(A) = ‖A‖·‖A⁻¹‖ &nbsp;|&nbsp; Δx/x ≤ κ(A)·Δb/b</code>
            <p class="form-help">
              κ(A) ≈ 1: bien condicionado | κ(A) ≫ 1: mal condicionado — amplifica errores en b
            </p>
          </div>
        </div>
      </div>

      <!-- SELECTOR DE SISTEMA -->
      <div class="card">
        <div class="card__header">
          <h2 class="card__title">Sistema de Ecuaciones — Red de Rumores</h2>
        </div>
        <div class="card__body">

          <div class="form-row form-row--2-col">
            <div class="form-group">
              <label class="form-label" for="sistema-preset">
                Sistema precargado
              </label>
              <select class="form-input" id="sistema-preset">
                ${Object.entries(SISTEMAS_PRECARGADOS).map(([k, s]) =>
                  `<option value="${k}">${s.nombre}</option>`
                ).join('')}
              </select>
              <span class="form-help" id="desc-sistema">
                ${SISTEMAS_PRECARGADOS.bien_condicionado.descripcion}
              </span>
            </div>

            <div class="form-group">
              <label class="form-label" for="tamano-personalizado">
                Tamaño del sistema (n×n)
              </label>
              <select class="form-input" id="tamano-personalizado" disabled>
                <option value="2">2×2</option>
                <option value="3">3×3</option>
                <option value="4" selected>4×4</option>
                <option value="5">5×5</option>
              </select>
              <span class="form-help">Solo para sistema personalizado</span>
            </div>
          </div>

          <!-- Matriz A y vector b -->
          <div id="contenedor-matriz-f" style="margin-top:1rem;">
            <!-- Generado dinámicamente -->
          </div>

          <!-- Parámetros de Gauss-Seidel -->
          <div class="form-row form-row--3-col" style="margin-top:1rem;">
            <div class="form-group">
              <label class="form-label" for="tolerancia-f">
                Tolerancia ε (Gauss-Seidel)
              </label>
              <input class="form-input" type="number" id="tolerancia-f"
                value="0.0001" min="1e-12" max="0.1" step="any" />
              <span class="form-help">Criterio de parada: ‖xₖ₊₁ − xₖ‖ &lt; ε</span>
              <span class="form-error" id="error-tol-f" aria-live="polite"></span>
            </div>
            <div class="form-group">
              <label class="form-label" for="max-iter-f">
                Máximo de iteraciones
              </label>
              <input class="form-input" type="number" id="max-iter-f"
                value="100" min="5" max="2000" step="1" />
              <span class="form-error" id="error-iter-f" aria-live="polite"></span>
            </div>
            <div class="form-group">
              <label class="form-label" for="perturbacion-f">
                Perturbación δ en b (%)
              </label>
              <input class="form-input" type="number" id="perturbacion-f"
                value="1" min="0" max="50" step="0.1" />
              <span class="form-help">
                Simula errores en la medición de tensión social
              </span>
            </div>
          </div>

          <div class="form-button-group" style="margin-top:1rem;">
            <button type="button" class="btn btn--primary" id="btn-resolver-f">
              Resolver y analizar condicionamiento
            </button>
            <button type="button" class="btn btn--secondary" id="btn-reset-f">
              Restablecer
            </button>
          </div>
          <span class="form-error" id="error-general-f" aria-live="polite"></span>

        </div>
      </div>

      <!-- RESULTADOS -->
      <div id="resultados-f" hidden aria-live="polite">

        <!-- ALERTA DE CONDICIONAMIENTO -->
        <div id="alerta-condicion-f"></div>

        <!-- SOLUCIONES COMPARADAS -->
        <div class="card">
          <div class="card__header">
            <h2 class="card__title">Índices de Pánico por Zona — Solución x</h2>
          </div>
          <div class="card__body">
            <div class="grid grid--2-col">
              <div>
                <h3 style="font-size:1rem; margin-bottom:0.75rem;">Gauss-Seidel (iterativo)</h3>
                <div id="solucion-gs-f"></div>
              </div>
              <div>
                <h3 style="font-size:1rem; margin-bottom:0.75rem;">Descomposición LU (directo)</h3>
                <div id="solucion-lu-f"></div>
              </div>
            </div>
          </div>
        </div>

        <!-- MÉTRICAS NUMÉRICAS -->
        <div class="card">
          <div class="card__header">
            <h2 class="card__title">Métricas de Calidad Numérica</h2>
          </div>
          <div class="card__body">
            <div class="grid grid--4-col" id="metricas-f"></div>
          </div>
        </div>

        <!-- GRÁFICO RADAR: índices de pánico por zona -->
        <div class="card">
          <div class="card__header">
            <h2 class="card__title">Distribución de Pánico por Zona</h2>
          </div>
          <div class="card__body">
            <div class="grafico-contenedor" style="height: 380px;">
              <canvas id="${CHART_RADAR_ID}" role="img"
                aria-label="Radar de índices de pánico por zona"></canvas>
            </div>
          </div>
        </div>

        <!-- CONVERGENCIA GAUSS-SEIDEL -->
        <div class="card">
          <div class="card__header">
            <h2 class="card__title">Convergencia de Gauss-Seidel</h2>
          </div>
          <div class="card__body">
            <div class="grafico-contenedor" style="height: 320px;">
              <canvas id="${CHART_COND_ID}" role="img"
                aria-label="Convergencia del método de Gauss-Seidel"></canvas>
            </div>
          </div>
        </div>

        <!-- ANÁLISIS DE PERTURBACIÓN -->
        <div class="card">
          <div class="card__header">
            <h2 class="card__title">Efecto de Perturbaciones en b sobre la Solución x</h2>
          </div>
          <div class="card__body">
            <div class="grafico-contenedor" style="height: 320px;">
              <canvas id="${CHART_PERTURB_ID}" role="img"
                aria-label="Amplificación del error por mal condicionamiento"></canvas>
            </div>
          </div>
        </div>

        <!-- TABLA DE ITERACIONES -->
        <div class="card">
          <div class="card__header">
            <h2 class="card__title">Historial de Iteraciones (Gauss-Seidel)</h2>
          </div>
          <div class="card__body">
            <div id="tabla-iter-f" class="tabla-contenedor"></div>
          </div>
        </div>

        <!-- TABLA DE RESIDUALES -->
        <div class="card">
          <div class="card__header">
            <h2 class="card__title">Verificación: Residual r = b − A·x</h2>
          </div>
          <div class="card__body">
            <div id="tabla-residual-f" class="tabla-contenedor"></div>
          </div>
        </div>

        <!-- INTERPRETACIÓN -->
        <div class="card card--info">
          <div class="card__header">
            <h2 class="card__title">Interpretación del Análisis de Condicionamiento</h2>
          </div>
          <div class="card__body" id="interpretacion-f"></div>
        </div>

      </div><!-- /resultados -->

    </section>
  `;

  _cargarSistema('bien_condicionado');
  _registrarEventos();
}

// Exponer al scope global para el router runtime
window.renderizarEscenarioF = renderizarEscenarioF;

// ─── Matriz editable ──────────────────────────────────────────
function _renderizarMatrizEditable(A, b, n, soloLectura = false) {
  const contenedor = document.getElementById('contenedor-matriz-f');
  if (!contenedor) return;

  const zonas = Array.from({ length: n }, (_, i) => `Zona ${i + 1}`);

  contenedor.innerHTML = `
    <div style="overflow-x:auto;">
      <p class="form-help" style="margin-bottom:0.5rem;">
        Matriz A — Influencias entre zonas &nbsp;|&nbsp; Vector b — Tensión observada
      </p>
      <table style="border-collapse:collapse; font-size:13px;">
        <thead>
          <tr>
            <th style="padding:6px 10px; background:var(--color-neutral-100,#f5f5f5);">Zona</th>
            ${zonas.map(z =>
              `<th style="padding:6px 10px; background:var(--color-neutral-100,#f5f5f5); text-align:center;">${z}</th>`
            ).join('')}
            <th style="padding:6px 10px; background:var(--color-accent-warm,#F29966); color:#fff; text-align:center;">b</th>
          </tr>
        </thead>
        <tbody>
          ${A.map((fila, i) => `
            <tr>
              <td style="padding:4px 10px; font-weight:500; color:var(--color-text-secondary,#666);">
                ${zonas[i]}
              </td>
              ${fila.map((val, j) => `
                <td style="padding:3px 4px;">
                  <input
                    class="form-input"
                    type="number"
                    data-fila="${i}" data-col="${j}" data-tipo="A"
                    value="${parseFloat(val.toFixed(6))}"
                    step="any"
                    style="width:80px; text-align:right; font-size:12px;"
                    ${soloLectura ? 'readonly' : ''}
                    aria-label="A[${i+1}][${j+1}]"
                  />
                </td>
              `).join('')}
              <td style="padding:3px 4px;">
                <input
                  class="form-input"
                  type="number"
                  data-fila="${i}" data-tipo="b"
                  value="${parseFloat(b[i].toFixed(6))}"
                  step="any"
                  style="width:80px; text-align:right; font-size:12px; background:var(--color-info,#FFF3E0);"
                  ${soloLectura ? 'readonly' : ''}
                  aria-label="b[${i+1}]"
                />
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

// ─── Cargar sistema precargado ────────────────────────────────
function _cargarSistema(key) {
  const sistema    = SISTEMAS_PRECARGADOS[key];
  const descEl     = document.getElementById('desc-sistema');
  const tamanoSel  = document.getElementById('tamano-personalizado');
  if (descEl) descEl.textContent = sistema.descripcion;

  const esPersonalizado = key === 'personalizado';
  if (tamanoSel) tamanoSel.disabled = !esPersonalizado;

  if (esPersonalizado) {
    const n = parseInt(tamanoSel?.value ?? '4', 10);
    const A = Array.from({ length: n }, (_, i) =>
      Array.from({ length: n }, (_, j) => i === j ? 4 : 0)
    );
    const b = Array(n).fill(1);
    _renderizarMatrizEditable(A, b, n, false);
  } else {
    _renderizarMatrizEditable(sistema.A, sistema.b, sistema.A.length, false);
  }
}

// ─── Leer matriz desde el DOM ─────────────────────────────────
function _leerMatrizDOM() {
  const inputs = document.querySelectorAll('#contenedor-matriz-f input[data-tipo]');
  const AMap = {}, bMap = {};

  inputs.forEach(inp => {
    const fila = parseInt(inp.dataset.fila, 10);
    const tipo = inp.dataset.tipo;
    const val  = parseFloat(inp.value);
    if (isNaN(val)) return;

    if (tipo === 'A') {
      const col = parseInt(inp.dataset.col, 10);
      if (!AMap[fila]) AMap[fila] = {};
      AMap[fila][col] = val;
    } else {
      bMap[fila] = val;
    }
  });

  const n = Object.keys(AMap).length;
  if (n === 0) return null;

  const A = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => AMap[i]?.[j] ?? 0)
  );
  const b = Array.from({ length: n }, (_, i) => bMap[i] ?? 0);

  return { A, b, n };
}

// ─── Registro de eventos ──────────────────────────────────────
function _registrarEventos() {
  document.getElementById('sistema-preset')
    ?.addEventListener('change', e => _cargarSistema(e.target.value));

  document.getElementById('tamano-personalizado')
    ?.addEventListener('change', e => {
      const key = document.getElementById('sistema-preset')?.value;
      if (key === 'personalizado') _cargarSistema('personalizado');
    });

  document.getElementById('btn-resolver-f')
    ?.addEventListener('click', _manejarResolucion);

  document.getElementById('btn-reset-f')
    ?.addEventListener('click', _restablecerTodo);
}

// ─── Manejador principal ──────────────────────────────────────
function _manejarResolucion() {
  limpiarErrores(['error-tol-f', 'error-iter-f', 'error-general-f']);

  const datos = _leerMatrizDOM();
  if (!datos) {
    mostrarErrores({ 'error-general-f': 'No se pudo leer la matriz. Verifica los valores.' });
    return;
  }

  const tol      = parseFloat(document.getElementById('tolerancia-f').value);
  const maxIter  = parseInt(document.getElementById('max-iter-f').value, 10);
  const delta    = parseFloat(document.getElementById('perturbacion-f').value) / 100;

  if (isNaN(tol) || tol <= 0 || tol >= 1) {
    mostrarErrores({ 'error-tol-f': 'La tolerancia debe ser un número positivo menor que 1.' });
    return;
  }
  if (isNaN(maxIter) || maxIter < 5) {
    mostrarErrores({ 'error-iter-f': 'El máximo de iteraciones debe ser al menos 5.' });
    return;
  }

  const { A, b, n } = datos;
  const xInicialKey  = document.getElementById('sistema-preset')?.value;
  const xInicial     = SISTEMAS_PRECARGADOS[xInicialKey]?.xInicial ?? Array(n).fill(0);

  const resultados = _ejecutarAnalisis(A, b, n, tol, maxIter, delta, xInicial);
  _renderizarResultados(datos, resultados, tol, delta);

  const divRes = document.getElementById('resultados-f');
  if (divRes) {
    divRes.hidden = false;
    divRes.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  mostrarNotificacion('Análisis de condicionamiento completado', 'success');
}

// ─── Ejecución del análisis completo ─────────────────────────
function _ejecutarAnalisis(A, b, n, tol, maxIter, delta, xInicial) {
  // 1. Resolver con Gauss-Seidel
  const resGS = gaussSeidel(A, b, xInicial, tol, maxIter);

  // 2. Resolver con LU (solución de referencia)
  let resLU = null;
  try {
    resLU = descomposicionLU(A, b);
  } catch (e) {
    resLU = { x: null, error: e.message };
  }

  // 3. Número de condición κ(A) ≈ ‖A‖∞ · ‖A⁻¹‖∞ (estimación por norma infinito)
  const kappa = _estimarNúmeroCondicion(A, n);

  // 4. Residual r = b - A·x (para cada solución)
  const residualGS = resGS.convergio && resGS.x
    ? _calcularResidual(A, resGS.x, b)
    : null;
  const residualLU = resLU?.x
    ? _calcularResidual(A, resLU.x, b)
    : null;

  // 5. Análisis de perturbación: resolver (A·x = b + δb) para varios δ
  const analisisPerturb = _analizarPerturbacion(A, b, n, resLU?.x, kappa);

  // 6. Sistema perturbado con δ del usuario
  const bPerturbado = b.map(bi => bi * (1 + delta * (Math.random() * 2 - 1)));
  let xPerturbado   = null;
  try {
    const resPert = descomposicionLU(A, bPerturbado);
    xPerturbado   = resPert.x;
  } catch (_) { xPerturbado = null; }

  const errRelPerturbacion = resLU?.x && xPerturbado
    ? normaVectorial(resLU.x.map((xi, i) => xi - xPerturbado[i]), 'inf') /
      Math.max(normaVectorial(resLU.x, 'inf'), 1e-14)
    : null;

  return {
    resGS, resLU,
    kappa, residualGS, residualLU,
    analisisPerturb, bPerturbado, xPerturbado,
    errRelPerturbacion, n
  };
}

// ─── Estimación del número de condición ──────────────────────
/**
 * Estima κ(A) = ‖A‖∞ · ‖A⁻¹‖∞
 * A⁻¹ se aproxima resolviendo A·ei = e_i para cada vector canónico
 */
function _estimarNúmeroCondicion(A, n) {
  try {
    const normaA = normaMatriz(A, 'inf');

    // Construir A⁻¹ columna a columna
    const Ainv = [];
    for (let j = 0; j < n; j++) {
      const ej = Array(n).fill(0);
      ej[j]    = 1;
      const col = descomposicionLU(A, ej);
      if (!col?.x) return Infinity;
      Ainv.push(col.x);
    }

    // Transponer para obtener filas de A⁻¹
    const AinvT = Array.from({ length: n }, (_, i) =>
      Array.from({ length: n }, (_, j) => Ainv[j][i])
    );

    const normaAinv = normaMatriz(AinvT, 'inf');
    return normaA * normaAinv;
  } catch (_) {
    return Infinity;
  }
}

// ─── Calcular residual ────────────────────────────────────────
function _calcularResidual(A, x, b) {
  const Ax = productoMatrizVector(A, x);
  return b.map((bi, i) => bi - Ax[i]);
}

// ─── Análisis de perturbaciones ───────────────────────────────
function _analizarPerturbacion(A, b, n, xRef, kappa) {
  const deltas      = [0.001, 0.005, 0.01, 0.05, 0.1, 0.2, 0.5];
  const resultados  = [];

  deltas.forEach(d => {
    // Perturbar b con error relativo d en norma
    const bPert = b.map(bi => bi + d * Math.abs(bi) * (Math.random() > 0.5 ? 1 : -1));

    let xPert = null;
    try {
      const res = descomposicionLU(A, bPert);
      xPert     = res.x;
    } catch (_) { xPert = null; }

    const errRelB = normaVectorial(b.map((bi, i) => bi - bPert[i]), 'inf') /
                    Math.max(normaVectorial(b, 'inf'), 1e-14);

    const errRelX = xRef && xPert
      ? normaVectorial(xRef.map((xi, i) => xi - xPert[i]), 'inf') /
        Math.max(normaVectorial(xRef, 'inf'), 1e-14)
      : null;

    const ampEsperada = isFinite(kappa) ? kappa * errRelB : null;

    resultados.push({
      delta:       d,
      errRelB:     errRelB,
      errRelX:     errRelX,
      ampEsperada: ampEsperada,
      amplificacion: (errRelX !== null && errRelB > 1e-14)
        ? errRelX / errRelB
        : null
    });
  });

  return resultados;
}

// ─── Renderizado completo ─────────────────────────────────────
function _renderizarResultados({ A, b, n }, resultados, tol, delta) {
  _renderizarAlertaCondicion(resultados.kappa);
  _renderizarSoluciones(n, resultados);
  _renderizarMetricas(resultados, tol);
  _renderizarGraficoRadar(n, resultados);
  _renderizarGraficoConvergencia(resultados.resGS);
  _renderizarGraficoPerturbacion(resultados.analisisPerturb, resultados.kappa);
  _renderizarTablaIteraciones(resultados.resGS);
  _renderizarTablaResidual(n, b, resultados);
  _renderizarInterpretacion(A, b, n, resultados, delta);
}

// ─── Alerta de condicionamiento ───────────────────────────────
function _renderizarAlertaCondicion(kappa) {
  const contenedor = document.getElementById('alerta-condicion-f');
  if (!contenedor) return;

  let clase = 'success', icono = '✓', mensaje = '';

  if (!isFinite(kappa)) {
    clase   = 'error';
    icono   = '✗';
    mensaje = `La matriz es <strong>singular o casi singular</strong> (κ → ∞).
               El sistema no tiene solución única — la red de rumores es inestable.`;
  } else if (kappa > 1e6) {
    clase   = 'error';
    icono   = '⚠';
    mensaje = `κ(A) ≈ ${kappa.toExponential(2)} — Sistema <strong>extremadamente mal condicionado</strong>.
               Un error del 0.0001% en los datos produce errores del ${(kappa * 0.000001 * 100).toFixed(0)}% en la solución.`;
  } else if (kappa > 1000) {
    clase   = 'warning';
    icono   = '⚠';
    mensaje = `κ(A) ≈ ${kappa.toFixed(1)} — Sistema <strong>mal condicionado</strong>.
               Los resultados son sensibles a errores de medición en la tensión social.`;
  } else if (kappa > 100) {
    clase   = 'warning';
    icono   = '△';
    mensaje = `κ(A) ≈ ${kappa.toFixed(2)} — Condicionamiento <strong>moderado</strong>.
               Interpretar los índices de pánico con precaución.`;
  } else {
    mensaje = `κ(A) ≈ ${kappa.toFixed(4)} — Sistema <strong>bien condicionado</strong>.
               Los índices de pánico son robustos ante errores de medición.`;
  }

  contenedor.innerHTML = `
    <div class="alert alert--${clase}" style="margin-bottom:1rem;">
      ${icono} ${mensaje}
    </div>
  `;
}

// ─── Soluciones lado a lado ───────────────────────────────────
function _renderizarSoluciones(n, { resGS, resLU, xPerturbado }) {
  const zonas = Array.from({ length: n }, (_, i) => `Zona ${i + 1}`);

  const _tablaX = (x, etiquetas) => {
    if (!x) return `<div class="alert alert--error">No convergió o matriz singular.</div>`;
    return `
      <table style="width:100%; border-collapse:collapse; font-size:13px;">
        <thead>
          <tr>
            <th style="padding:6px 8px; background:var(--color-neutral-100,#f5f5f5);">Zona</th>
            <th style="padding:6px 8px; background:var(--color-neutral-100,#f5f5f5); text-align:right;">Índice de pánico</th>
          </tr>
        </thead>
        <tbody>
          ${x.map((xi, i) => `
            <tr>
              <td style="padding:5px 8px;">${etiquetas[i]}</td>
              <td style="padding:5px 8px; text-align:right; font-family:monospace;">
                ${xi.toFixed(8)}
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      ${resGS.iteraciones !== undefined
        ? `<p class="form-help" style="margin-top:0.5rem;">
             Convergió en <strong>${resGS.iteraciones}</strong> iteraciones
           </p>`
        : ''}
    `;
  };

  const gsEl = document.getElementById('solucion-gs-f');
  const luEl = document.getElementById('solucion-lu-f');

  if (gsEl) gsEl.innerHTML = _tablaX(resGS.x, zonas);
  if (luEl) luEl.innerHTML = _tablaX(resLU?.x, zonas);
}

// ─── Métricas ─────────────────────────────────────────────────
function _renderizarMetricas({ kappa, resGS, residualLU, errRelPerturbacion }, tol) {
  const contenedor = document.getElementById('metricas-f');
  if (!contenedor) return;

  const normResLU = residualLU
    ? normaVectorial(residualLU, 'inf').toExponential(3)
    : '—';

  const metricas = [
    {
      label: 'Número de condición κ(A)',
      valor: isFinite(kappa) ? kappa.toExponential(4) : '∞ (singular)',
      clase: !isFinite(kappa) ? 'alert' : kappa > 1000 ? 'alert' : kappa > 100 ? 'info' : 'success'
    },
    {
      label: 'Iteraciones Gauss-Seidel',
      valor: resGS.convergio ? String(resGS.iteraciones) : `No convergió (>${resGS.iteraciones})`,
      clase: resGS.convergio ? 'success' : 'alert'
    },
    {
      label: '‖r‖∞ residual LU',
      valor: normResLU,
      clase: 'info'
    },
    {
      label: 'Error por perturbación δ',
      valor: errRelPerturbacion !== null
        ? `${(errRelPerturbacion * 100).toFixed(4)}%`
        : '—',
      clase: errRelPerturbacion !== null && errRelPerturbacion > 0.1 ? 'alert' : 'success'
    }
  ];

  contenedor.innerHTML = metricas.map(m => `
    <div class="card card--${m.clase}" style="text-align:center; padding:1rem;">
      <p class="form-help" style="margin:0 0 0.25rem;">${m.label}</p>
      <strong style="font-size:1.1rem; font-family:monospace;">${m.valor}</strong>
    </div>
  `).join('');
}

// ─── Gráfico radar ────────────────────────────────────────────
function _renderizarGraficoRadar(n, { resGS, resLU, xPerturbado }) {
  const canvas = document.getElementById(CHART_RADAR_ID);
  if (!canvas) return;
  if (chartRadar) { chartRadar.destroy(); chartRadar = null; }

  const labels   = Array.from({ length: n }, (_, i) => `Zona ${i + 1}`);
  const datasets = [];

  if (resLU?.x) {
    datasets.push({
      label: 'LU (referencia)',
      data: resLU.x.map(v => parseFloat(v.toFixed(6))),
      borderColor: '#3E594F',
      backgroundColor: 'rgba(62,89,79,0.15)',
      borderWidth: 2,
      pointRadius: 4
    });
  }
  if (resGS.x && resGS.convergio) {
    datasets.push({
      label: 'Gauss-Seidel',
      data: resGS.x.map(v => parseFloat(v.toFixed(6))),
      borderColor: '#6C8C74',
      backgroundColor: 'rgba(108,140,116,0.10)',
      borderWidth: 2,
      borderDash: [5, 3],
      pointRadius: 4
    });
  }
  if (xPerturbado) {
    datasets.push({
      label: 'Solución perturbada',
      data: xPerturbado.map(v => parseFloat(v.toFixed(6))),
      borderColor: '#D97059',
      backgroundColor: 'rgba(217,112,89,0.10)',
      borderWidth: 1.5,
      borderDash: [3, 3],
      pointRadius: 3
    });
  }

  chartRadar = renderizarGrafico(CHART_RADAR_ID, {
    type: 'radar',
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'top' } },
      scales: {
        r: {
          beginAtZero: false,
          ticks: { font: { size: 11 } }
        }
      }
    }
  });
}

// ─── Gráfico convergencia Gauss-Seidel ────────────────────────
function _renderizarGraficoConvergencia(resGS) {
  const canvas = document.getElementById(CHART_COND_ID);
  if (!canvas) return;
  if (chartCond) { chartCond.destroy(); chartCond = null; }

  if (!resGS.historial || resGS.historial.length === 0) {
    canvas.parentElement.innerHTML =
      `<div class="alert alert--warning">Gauss-Seidel no convergió — no hay historial de convergencia.</div>`;
    return;
  }

  const labels = resGS.historial.map((_, i) => `It. ${i + 1}`);
  const errores = resGS.historial.map(h => parseFloat(h.error.toExponential(10)));

  chartCond = renderizarGrafico(CHART_COND_ID, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: '‖xₖ₊₁ − xₖ‖ (error iterativo)',
        data: errores,
        borderColor: '#3E594F',
        backgroundColor: 'rgba(62,89,79,0.08)',
        borderWidth: 2,
        pointRadius: 2,
        fill: true,
        tension: 0.2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'top' } },
      scales: {
        x: { title: { display: true, text: 'Iteración' } },
        y: {
          type: 'logarithmic',
          title: { display: true, text: 'Error (escala log)' }
        }
      }
    }
  });
}

// ─── Gráfico perturbaciones ───────────────────────────────────
function _renderizarGraficoPerturbacion(analisisPerturb, kappa) {
  const canvas = document.getElementById(CHART_PERTURB_ID);
  if (!canvas) return;
  if (chartPerturb) { chartPerturb.destroy(); chartPerturb = null; }

  const labels  = analisisPerturb.map(r => `${(r.errRelB * 100).toFixed(2)}%`);
  const datasets = [];

  // Error real en x
  if (analisisPerturb.some(r => r.errRelX !== null)) {
    datasets.push({
      label: 'Error real en x (%)',
      data: analisisPerturb.map(r =>
        r.errRelX !== null ? parseFloat((r.errRelX * 100).toFixed(6)) : null
      ),
      borderColor: '#D97059',
      backgroundColor: 'transparent',
      borderWidth: 2.5,
      pointRadius: 4,
      tension: 0.3
    });
  }

  // Cota teórica κ·‖Δb‖/‖b‖
  if (isFinite(kappa)) {
    datasets.push({
      label: `Cota κ·‖Δb‖/‖b‖ (κ=${kappa.toExponential(2)})`,
      data: analisisPerturb.map(r =>
        r.ampEsperada !== null ? parseFloat((r.ampEsperada * 100).toFixed(6)) : null
      ),
      borderColor: '#F29966',
      backgroundColor: 'transparent',
      borderWidth: 1.5,
      borderDash: [6, 3],
      pointRadius: 0,
      tension: 0.3
    });
  }

  chartPerturb = renderizarGrafico(CHART_PERTURB_ID, {
    type: 'line',
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'top' } },
      scales: {
        x: { title: { display: true, text: 'Error relativo en b (%)' } },
        y: {
          title: { display: true, text: 'Error relativo en x (%)' },
          beginAtZero: true
        }
      }
    }
  });
}

// ─── Tabla de iteraciones ─────────────────────────────────────
function _renderizarTablaIteraciones(resGS) {
  const contenedor = document.getElementById('tabla-iter-f');
  if (!contenedor) return;

  if (!resGS.historial || resGS.historial.length === 0) {
    contenedor.innerHTML = `<div class="alert alert--warning">Sin historial de iteraciones.</div>`;
    return;
  }

  // Submuestra: máximo 15 filas
  const total = resGS.historial.length;
  const paso  = Math.max(1, Math.floor(total / 15));
  const seleccionados = resGS.historial.filter((_, i) =>
    i === 0 || i === total - 1 || i % paso === 0
  );

  const n = resGS.x?.length ?? 0;
  const filas = seleccionados.map(h => {
    const fila = { 'Iteración': String(h.iteracion) };
    h.x.forEach((xi, i) => { fila[`x${i + 1}`] = xi.toFixed(8); });
    fila['‖error‖'] = h.error.toExponential(6);
    return fila;
  });

  const columnas = ['Iteración', ...Array.from({ length: n }, (_, i) => `x${i + 1}`), '‖error‖'];

  renderizarTabla('tabla-iter-f', {
    columnas,
    filas,
    columnasNumericas: [...Array.from({ length: n }, (_, i) => `x${i + 1}`), '‖error‖'],
    resaltarUltimaFila: true
  });
}

// ─── Tabla de residuales ──────────────────────────────────────
function _renderizarTablaResidual(n, b, { resGS, resLU, residualGS, residualLU }) {
  const contenedor = document.getElementById('tabla-residual-f');
  if (!contenedor) return;

  const filas = Array.from({ length: n }, (_, i) => ({
    'Ecuación':    `Zona ${i + 1}`,
    'b[i]':        b[i].toFixed(6),
    'r LU':        residualLU  ? residualLU[i].toExponential(6)  : '—',
    'r Gauss-Seidel': residualGS ? residualGS[i].toExponential(6) : '—'
  }));

  renderizarTabla('tabla-residual-f', {
    columnas: ['Ecuación', 'b[i]', 'r LU', 'r Gauss-Seidel'],
    filas,
    columnasNumericas: ['b[i]', 'r LU', 'r Gauss-Seidel']
  });
}

// ─── Interpretación ───────────────────────────────────────────
function _renderizarInterpretacion(A, b, n, { kappa, resGS, resLU, errRelPerturbacion, analisisPerturb }, delta) {
  const contenedor = document.getElementById('interpretacion-f');
  if (!contenedor) return;

  const malCond   = !isFinite(kappa) || kappa > 1000;
  const digPerdidos = isFinite(kappa) && kappa > 1
    ? Math.floor(Math.log10(kappa))
    : 0;

  const amplMax = analisisPerturb
    .filter(r => r.amplificacion !== null)
    .reduce((mx, r) => Math.max(mx, r.amplificacion), 0);

  contenedor.innerHTML = `
    <h3>¿Qué significa el número de condición en este contexto?</h3>
    <p>
      El número de condición κ(A) ≈ <strong>${isFinite(kappa) ? kappa.toExponential(4) : '∞'}</strong>
      mide la sensibilidad del sistema: si los datos de tensión social <strong>b</strong>
      tienen un error relativo de ε, los índices de pánico calculados <strong>x</strong>
      pueden tener un error de hasta <strong>κ(A)·ε</strong>.
      ${isFinite(kappa) && digPerdidos > 0
        ? `Con este κ, se pierden aproximadamente <strong>${digPerdidos} dígitos</strong> de precisión.`
        : ''}
    </p>

    <h3>Implicaciones para la gestión de crisis</h3>
    <ul>
      ${malCond
        ? `<li><strong>Peligro:</strong> Las estimaciones de pánico por zona son
             <strong>poco confiables</strong>. Un error del 1% en los sensores de
             tensión social puede generar errores del
             ${isFinite(kappa) ? (kappa * 0.01 * 100).toFixed(0) + '%' : 'orden infinito'}
             en los índices calculados.</li>
           <li>Considerar <strong>regularización</strong> del sistema (Tikhonov) o
             rediseñar la red de monitoreo para obtener una matriz mejor condicionada.</li>`
        : `<li>El sistema está bien condicionado: las estimaciones de pánico son
             <strong>estables y confiables</strong> para la toma de decisiones.</li>`}
      <li>
        La amplificación de error observada en el análisis de perturbaciones fue de
        <strong>${amplMax.toFixed(2)}×</strong> respecto al error en los datos.
        ${amplMax > 10
          ? ' — significativamente mayor que 1, confirma el mal condicionamiento.'
          : ' — dentro de límites aceptables.'}
      </li>
      <li>
        <strong>Gauss-Seidel</strong>
        ${resGS.convergio
          ? `convergió en <strong>${resGS.iteraciones}</strong> iteraciones.
             Este método solo es confiable si la matriz es <em>diagonal dominante</em>.`
          : `<strong>no convergió</strong>. Esto indica que la matriz no es
             diagonal dominante — usar <strong>LU</strong> como método de referencia.`}
      </li>
    </ul>

    <h3>Comparación de métodos</h3>
    <ul>
      <li>
        <strong>Gauss-Seidel (iterativo):</strong> Eficiente para sistemas grandes y
        dispersos con diagonal dominante. Convergencia garantizada si ρ(D⁻¹(L+U)) &lt; 1.
        No recomendado para matrices mal condicionadas.
      </li>
      <li>
        <strong>Descomposición LU (directo):</strong> Factoriza A = L·U una sola vez y
        resuelve por sustitución hacia adelante/atrás. Estable con pivoteo parcial.
        Recomendado como referencia cuando el condicionamiento es dudoso.
      </li>
    </ul>
  `;
}

// ─── Restablecer ──────────────────────────────────────────────
function _restablecerTodo() {
  limpiarErrores(['error-tol-f', 'error-iter-f', 'error-general-f']);

  const sel = document.getElementById('sistema-preset');
  if (sel) { sel.value = 'bien_condicionado'; _cargarSistema('bien_condicionado'); }

  document.getElementById('tolerancia-f') && (document.getElementById('tolerancia-f').value = '0.0001');
  document.getElementById('max-iter-f')   && (document.getElementById('max-iter-f').value = '100');
  document.getElementById('perturbacion-f') && (document.getElementById('perturbacion-f').value = '1');

  const divRes = document.getElementById('resultados-f');
  if (divRes) divRes.hidden = true;

  [chartRadar, chartCond, chartPerturb].forEach(c => { if (c) c.destroy(); });
  chartRadar = chartCond = chartPerturb = null;

  mostrarNotificacion('Escenario F restablecido', 'info');
}
