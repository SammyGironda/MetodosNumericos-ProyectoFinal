/**
 * escenarioE.js — Umbrales Críticos de Desabastecimiento
 * Simulación Numérica de Crisis - Métodos Numéricos Aplicados
 *
 * CONTEXTO DEL PROBLEMA:
 *   Durante una crisis de abastecimiento, los gestores necesitan identificar
 *   el punto exacto en que el stock de un recurso cae por debajo de un
 *   umbral crítico U. Si f(t) representa el nivel de inventario en el
 *   tiempo t, el umbral crítico es la raíz de:
 *
 *     g(t) = f(t) - U = 0
 *
 *   Conocer ese instante permite activar alertas, racionamiento o reposición
 *   antes de que el desabastecimiento sea total.
 *
 * MODELOS DE INVENTARIO DISPONIBLES:
 *   1. Exponencial:  f(t) = A · e^(-k·t)
 *   2. Lineal:       f(t) = A - r·t
 *   3. Logístico:    f(t) = A / (1 + e^(k·(t - t0)))
 *   4. Personalizado: el usuario escribe su propia función
 *
 * MÉTODOS NUMÉRICOS: Bisección y Newton-Raphson
 *   Ambos se ejecutan en paralelo para comparar convergencia.
 *
 * EXPORTA: window.escenarioE
 */

'use strict';

// ─────────────────────────────────────────────
// ALGORITMOS DE RAÍCES
// (autocontenidos — no dependen de raicesEcuaciones.js)
// ─────────────────────────────────────────────

/**
 * Evalúa f(x) de forma segura.
 * @param {Function} f
 * @param {number}   x
 * @returns {{ valor: number, error: string|null }}
 */
function evaluarSeguro(f, x) {
  try {
    const valor = f(x);
    if (!isFinite(valor))
      return { valor: NaN, error: `f(${x.toFixed(4)}) no es finito.` };
    return { valor, error: null };
  } catch (e) {
    return { valor: NaN, error: `Error evaluando f(${x.toFixed(4)}): ${e.message}` };
  }
}

/**
 * Derivada numérica por diferencias centradas.
 * f'(x) ≈ [f(x+h) - f(x-h)] / (2h)
 * @param {Function} f
 * @param {number}   x
 * @returns {number}
 */
function derivadaNumerica(f, x) {
  const h = 1e-7;
  return (f(x + h) - f(x - h)) / (2 * h);
}

/**
 * Bisección: encuentra raíz de g en [a, b].
 * Requiere g(a)·g(b) < 0 (cambio de signo).
 *
 * @param {Function} g
 * @param {number}   a
 * @param {number}   b
 * @param {number}   tol
 * @param {number}   maxIter
 * @returns {Object}
 */
function biseccion(g, a, b, tol, maxIter) {
  const historial = [];

  const { valor: ga } = evaluarSeguro(g, a);
  const { valor: gb } = evaluarSeguro(g, b);

  if (isNaN(ga) || isNaN(gb))
    return { raiz: NaN, convergió: false,
             error: 'No se pudo evaluar g en los extremos del intervalo.',
             iteraciones: [], metodo: 'Bisección' };

  if (ga * gb > 0)
    return { raiz: NaN, convergió: false,
             error: 'No hay cambio de signo en [a, b]. El umbral puede estar fuera del intervalo.',
             iteraciones: [], metodo: 'Bisección' };

  let ai = a, bi = b;

  for (let iter = 1; iter <= maxIter; iter++) {
    const c  = (ai + bi) / 2;
    const { valor: gc } = evaluarSeguro(g, c);
    const errorAbs = (bi - ai) / 2;

    historial.push({
      iteracion: iter,
      a: ai, b: bi, c,
      ga: evaluarSeguro(g, ai).valor,
      gb: evaluarSeguro(g, bi).valor,
      gc,
      error: errorAbs,
      detalle: `c = ${c.toFixed(6)}, g(c) = ${gc.toExponential(4)}, error = ${errorAbs.toExponential(4)}`,
    });

    if (errorAbs < tol || Math.abs(gc) < 1e-14)
      return { raiz: c, convergió: true, error: null,
               iteraciones: historial, metodo: 'Bisección',
               iteracionesTotal: iter, errorFinal: errorAbs };

    const { valor: gai } = evaluarSeguro(g, ai);
    if (gai * gc < 0) bi = c; else ai = c;
  }

  const c = (ai + bi) / 2;
  return { raiz: c, convergió: false,
           error: 'Bisección no convergió en el máximo de iteraciones.',
           iteraciones: historial, metodo: 'Bisección',
           iteracionesTotal: maxIter, errorFinal: (bi - ai) / 2 };
}

/**
 * Newton-Raphson: encuentra raíz de g partiendo de x0.
 * Usa derivada numérica automáticamente.
 *
 * @param {Function} g
 * @param {number}   x0
 * @param {number}   tol
 * @param {number}   maxIter
 * @returns {Object}
 */
function newtonRaphson(g, x0, tol, maxIter) {
  const historial = [];
  let x = x0;

  for (let iter = 1; iter <= maxIter; iter++) {
    const { valor: gx, error: errGx } = evaluarSeguro(g, x);
    if (errGx)
      return { raiz: x, convergió: false, error: errGx,
               iteraciones: historial, metodo: 'Newton-Raphson' };

    const gpx = derivadaNumerica(g, x);

    if (Math.abs(gpx) < 1e-14)
      return { raiz: x, convergió: false,
               error: `g'(${x.toFixed(4)}) ≈ 0. Cambia el punto inicial.`,
               iteraciones: historial, metodo: 'Newton-Raphson' };

    const xNuevo   = x - gx / gpx;
    const errorAbs = Math.abs(xNuevo - x);

    historial.push({
      iteracion: iter,
      x, gx, gpx, xNuevo, errorAbs,
      detalle: `x = ${x.toFixed(6)} − (${gx.toExponential(4)})/(${gpx.toExponential(4)}) = ${xNuevo.toFixed(6)}`,
    });

    x = xNuevo;

    if (errorAbs < tol && Math.abs(gx) < tol)
      return { raiz: x, convergió: true, error: null,
               iteraciones: historial, metodo: 'Newton-Raphson (derivada numérica)',
               iteracionesTotal: iter, errorFinal: errorAbs };
  }

  return { raiz: x, convergió: false,
           error: 'Newton-Raphson no convergió en el máximo de iteraciones.',
           iteraciones: historial, metodo: 'Newton-Raphson',
           iteracionesTotal: maxIter, errorFinal: historial.at(-1)?.errorAbs ?? NaN };
}

// ─────────────────────────────────────────────
// MODELOS DE INVENTARIO
// ─────────────────────────────────────────────

/**
 * Retorna la función de inventario f(t) según el modelo elegido.
 * g(t) = f(t) - U es la función cuya raíz buscamos.
 *
 * @param {string} modelo
 * @param {Object} p      - parámetros del modelo
 * @param {number} U      - umbral crítico
 * @returns {{ f: Function, g: Function, descripcion: string } | { error: string }}
 */
function construirModelo(modelo, p, U) {
  let f;
  let descripcion;

  switch (modelo) {
    case 'exponencial':
      // f(t) = A · e^(-k·t)
      f = (t) => p.A * Math.exp(-p.k * t);
      descripcion = `f(t) = ${p.A} · e^(−${p.k}·t)`;
      break;

    case 'lineal':
      // f(t) = A - r·t
      f = (t) => p.A - p.r * t;
      descripcion = `f(t) = ${p.A} − ${p.r}·t`;
      break;

    case 'logistico':
      // f(t) = A / (1 + e^(k·(t - t0)))
      f = (t) => p.A / (1 + Math.exp(p.k * (t - p.t0)));
      descripcion = `f(t) = ${p.A} / (1 + e^(${p.k}·(t − ${p.t0})))`;
      break;

    case 'personalizado': {
      // El usuario escribe la expresión en términos de t
      const expr = (p.expresion ?? '').trim().replace(/\^/g, '**');
      if (!expr)
        return { error: 'Escribe una expresión para el modelo personalizado.' };
      try {
        // eslint-disable-next-line no-new-func
        f = new Function('t', `'use strict'; return (${expr});`);
        // Prueba de evaluación
        const prueba = f(0);
        if (!isFinite(prueba))
          return { error: 'La expresión no produce valores finitos en t = 0.' };
        descripcion = `f(t) = ${p.expresion}`;
      } catch (e) {
        return { error: `Expresión inválida: ${e.message}` };
      }
      break;
    }

    default:
      return { error: `Modelo desconocido: ${modelo}` };
  }

  const g = (t) => f(t) - U;
  return { f, g, descripcion };
}

// ─────────────────────────────────────────────
// GENERACIÓN DE PUNTOS PARA GRÁFICO
// ─────────────────────────────────────────────

/**
 * Genera puntos {t, ft} para graficar f(t) en [0, tMax].
 * @param {Function} f
 * @param {number}   tMax
 * @param {number}   [nPuntos]
 * @returns {{ ts: number[], fs: number[] }}
 */
function generarPuntosGrafico(f, tMax, nPuntos = 300) {
  const ts = [], fs = [];
  for (let i = 0; i <= nPuntos; i++) {
    const t = (tMax / nPuntos) * i;
    const { valor } = evaluarSeguro(f, t);
    ts.push(parseFloat(t.toFixed(6)));
    fs.push(isFinite(valor) ? parseFloat(valor.toFixed(6)) : null);
  }
  return { ts, fs };
}

// ─────────────────────────────────────────────
// RENDERIZADO HTML
// ─────────────────────────────────────────────

/**
 * HTML del formulario de parámetros.
 * @returns {string}
 */
function htmlFormulario() {
  return `
    <div class="form-group">
      <label class="form-label" for="e-modelo">Modelo de inventario</label>
      <select class="form-input" id="e-modelo" name="modelo">
        <option value="exponencial">Decaimiento exponencial: f(t) = A·e^(−k·t)</option>
        <option value="lineal">Decaimiento lineal: f(t) = A − r·t</option>
        <option value="logistico">Decaimiento logístico: f(t) = A/(1+e^(k·(t−t₀)))</option>
        <option value="personalizado">Personalizado (escribe tu función)</option>
      </select>
    </div>

    <!-- Parámetros dinámicos según modelo -->
    <div id="e-params-exponencial" class="e-params">
      <div class="form-row form-row--3-col">
        <div class="form-group">
          <label class="form-label" for="e-exp-A">Stock inicial (A)</label>
          <input class="form-input" type="number" id="e-exp-A" value="5000" min="1" step="1">
          <span class="form-help">Unidades en inventario al inicio</span>
        </div>
        <div class="form-group">
          <label class="form-label" for="e-exp-k">Tasa de decaimiento (k)</label>
          <input class="form-input" type="number" id="e-exp-k" value="0.05" min="0.001" step="0.001">
          <span class="form-help">k > 0, mayor k = agotamiento más rápido</span>
        </div>
        <div class="form-group">
          <label class="form-label" for="e-exp-tmax">Tiempo máximo (días)</label>
          <input class="form-input" type="number" id="e-exp-tmax" value="60" min="5" step="1">
        </div>
      </div>
    </div>

    <div id="e-params-lineal" class="e-params" hidden>
      <div class="form-row form-row--3-col">
        <div class="form-group">
          <label class="form-label" for="e-lin-A">Stock inicial (A)</label>
          <input class="form-input" type="number" id="e-lin-A" value="5000" min="1" step="1">
        </div>
        <div class="form-group">
          <label class="form-label" for="e-lin-r">Tasa de consumo (r)</label>
          <input class="form-input" type="number" id="e-lin-r" value="80" min="0.01" step="0.1">
          <span class="form-help">Unidades consumidas por día</span>
        </div>
        <div class="form-group">
          <label class="form-label" for="e-lin-tmax">Tiempo máximo (días)</label>
          <input class="form-input" type="number" id="e-lin-tmax" value="60" min="5" step="1">
        </div>
      </div>
    </div>

    <div id="e-params-logistico" class="e-params" hidden>
      <div class="form-row form-row--2-col">
        <div class="form-group">
          <label class="form-label" for="e-log-A">Stock inicial (A)</label>
          <input class="form-input" type="number" id="e-log-A" value="5000" min="1" step="1">
        </div>
        <div class="form-group">
          <label class="form-label" for="e-log-k">Pendiente (k)</label>
          <input class="form-input" type="number" id="e-log-k" value="0.3" min="0.01" step="0.01">
        </div>
        <div class="form-group">
          <label class="form-label" for="e-log-t0">Punto de inflexión (t₀)</label>
          <input class="form-input" type="number" id="e-log-t0" value="20" min="1" step="1">
          <span class="form-help">Día en que el consumo es más rápido</span>
        </div>
        <div class="form-group">
          <label class="form-label" for="e-log-tmax">Tiempo máximo (días)</label>
          <input class="form-input" type="number" id="e-log-tmax" value="60" min="5" step="1">
        </div>
      </div>
    </div>

    <div id="e-params-personalizado" class="e-params" hidden>
      <div class="form-row form-row--2-col">
        <div class="form-group">
          <label class="form-label" for="e-per-expr">Expresión f(t)</label>
          <input class="form-input" type="text" id="e-per-expr"
            placeholder="Ej: 5000 * Math.exp(-0.05*t)"
            aria-describedby="e-per-expr-help">
          <span class="form-help" id="e-per-expr-help">
            Usa t como variable. Operadores: +, −, *, /, ** o ^, Math.exp(), Math.log(), etc.
          </span>
        </div>
        <div class="form-group">
          <label class="form-label" for="e-per-tmax">Tiempo máximo (días)</label>
          <input class="form-input" type="number" id="e-per-tmax" value="60" min="5" step="1">
        </div>
      </div>
    </div>

    <!-- Parámetros comunes -->
    <div class="form-row form-row--3-col" style="margin-top: var(--spacing-4);">
      <div class="form-group">
        <label class="form-label" for="e-umbral">Umbral crítico (U)</label>
        <input class="form-input" type="number" id="e-umbral" value="500" min="0" step="1">
        <span class="form-help">Nivel mínimo aceptable de inventario</span>
      </div>
      <div class="form-group">
        <label class="form-label" for="e-x0">Punto inicial Newton (t₀)</label>
        <input class="form-input" type="number" id="e-x0" value="30" min="0" step="1">
        <span class="form-help">Estimación inicial para Newton-Raphson</span>
      </div>
      <div class="form-group">
        <label class="form-label" for="e-tol">Tolerancia</label>
        <input class="form-input" type="number" id="e-tol" value="0.000001"
          min="1e-12" max="0.01" step="0.000001">
        <span class="form-help">Criterio de parada (ej: 1e-6)</span>
      </div>
    </div>

    <div class="form-button-group">
      <button type="button" class="btn btn--primary" id="e-btn-calcular">
        ▶ Encontrar umbral crítico
      </button>
      <button type="button" class="btn btn--secondary" id="e-btn-limpiar">
        ↺ Restablecer
      </button>
    </div>
  `;
}

/**
 * Tabla comparativa Bisección vs Newton-Raphson.
 * @param {Object} rBis  - resultado bisección
 * @param {Object} rNewt - resultado Newton
 * @returns {string}
 */
function htmlTablaComparativa(rBis, rNewt) {
  const fila = (r) => {
    if (!r.convergió) {
      return `
        <td colspan="4" class="table__cell--error" style="text-align:center;">
          ${r.error ?? 'No convergió'}
        </td>`;
    }
    return `
      <td class="table__cell--number">${r.raiz.toFixed(8)}</td>
      <td class="table__cell--number">${r.iteracionesTotal}</td>
      <td class="table__cell--number">${r.errorFinal.toExponential(3)}</td>
      <td>${r.convergió ? '✅ Sí' : '❌ No'}</td>
    `;
  };

  return `
    <div style="overflow-x: auto;">
      <table>
        <thead>
          <tr>
            <th>Método</th>
            <th>t* (días)</th>
            <th>Iteraciones</th>
            <th>Error final</th>
            <th>Convergió</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Bisección</strong></td>
            ${fila(rBis)}
          </tr>
          <tr>
            <td><strong>Newton-Raphson</strong></td>
            ${fila(rNewt)}
          </tr>
        </tbody>
      </table>
    </div>
  `;
}

/**
 * Tabla del historial de iteraciones de un método.
 * @param {Object[]} iteraciones
 * @param {string}   metodo  - 'biseccion' | 'newton'
 * @returns {string}
 */
function htmlTablaIteraciones(iteraciones, metodo) {
  if (!iteraciones || iteraciones.length === 0)
    return '<p class="form-help">Sin iteraciones disponibles.</p>';

  // Mostrar máximo 30 filas
  const mostrar = iteraciones.slice(0, 30);
  const truncado = iteraciones.length > 30;

  if (metodo === 'biseccion') {
    const filas = mostrar.map(it => `
      <tr>
        <td class="table__cell--number">${it.iteracion}</td>
        <td class="table__cell--number">${it.a.toFixed(6)}</td>
        <td class="table__cell--number">${it.b.toFixed(6)}</td>
        <td class="table__cell--number table__cell--highlight">${it.c.toFixed(6)}</td>
        <td class="table__cell--number">${it.gc.toExponential(4)}</td>
        <td class="table__cell--number">${it.error.toExponential(4)}</td>
      </tr>
    `).join('');

    return `
      <div style="overflow-x: auto;">
        <table>
          <thead>
            <tr>
              <th>Iter.</th><th>a</th><th>b</th>
              <th>c = (a+b)/2</th><th>g(c)</th><th>Error</th>
            </tr>
          </thead>
          <tbody>${filas}</tbody>
        </table>
      </div>
      ${truncado ? `<p class="form-help">Mostrando 30 de ${iteraciones.length} iteraciones.</p>` : ''}
    `;
  }

  // Newton-Raphson
  const filas = mostrar.map(it => `
    <tr>
      <td class="table__cell--number">${it.iteracion}</td>
      <td class="table__cell--number">${it.x.toFixed(6)}</td>
      <td class="table__cell--number">${it.gx.toExponential(4)}</td>
      <td class="table__cell--number">${it.gpx.toExponential(4)}</td>
      <td class="table__cell--number table__cell--highlight">${it.xNuevo.toFixed(6)}</td>
      <td class="table__cell--number">${it.errorAbs.toExponential(4)}</td>
    </tr>
  `).join('');

  return `
    <div style="overflow-x: auto;">
      <table>
        <thead>
          <tr>
            <th>Iter.</th><th>xₙ</th><th>g(xₙ)</th>
            <th>g'(xₙ)</th><th>xₙ₊₁</th><th>|error|</th>
          </tr>
        </thead>
        <tbody>${filas}</tbody>
      </table>
    </div>
    ${truncado ? `<p class="form-help">Mostrando 30 de ${iteraciones.length} iteraciones.</p>` : ''}
  `;
}

/**
 * HTML de interpretación automática de resultados.
 * @param {Object} rBis
 * @param {Object} rNewt
 * @param {number} U       - umbral crítico
 * @param {string} descripcionModelo
 * @returns {string}
 */
function htmlInterpretacion(rBis, rNewt, U, descripcionModelo) {
  // Usar el resultado más confiable (Newton si convergió, sino Bisección)
  const rPrincipal = rNewt.convergió ? rNewt : rBis.convergió ? rBis : null;

  if (!rPrincipal) {
    return `
      <div class="alert alert--error" role="alert">
        ❌ Ningún método encontró el umbral crítico en el intervalo dado.
        Verifica que el nivel de inventario realmente cruce el umbral U = ${U}
        dentro del rango de tiempo configurado.
      </div>
    `;
  }

  const tCritico = rPrincipal.raiz;
  const diasEnteros = Math.floor(tCritico);
  const horas = Math.round((tCritico - diasEnteros) * 24);

  const ventaja = rNewt.convergió && rBis.convergió
    ? rNewt.iteracionesTotal < rBis.iteracionesTotal
      ? `Newton-Raphson fue más eficiente: ${rNewt.iteracionesTotal} iteraciones vs ${rBis.iteracionesTotal} de Bisección.`
      : `Bisección fue comparable: ${rBis.iteracionesTotal} iteraciones vs ${rNewt.iteracionesTotal} de Newton-Raphson.`
    : rNewt.convergió
      ? 'Solo Newton-Raphson convergió en este caso.'
      : 'Solo Bisección convergió en este caso.';

  return `
    <div class="alert alert--error" role="status" style="font-size: 1.05rem;">
      🚨 <strong>Alerta crítica:</strong> El inventario alcanzará el umbral de
      <strong>${U.toLocaleString()} unidades</strong> en el
      <strong>día ${tCritico.toFixed(4)}</strong>
      (aprox. día ${diasEnteros}, hora ${horas}:00).
    </div>

    <div class="card card--escenario-e" style="margin-top: var(--spacing-4);">
      <div class="card__header">
        <h3 class="card__title">📊 Análisis del umbral crítico</h3>
      </div>
      <div class="card__body">

        <div class="grid grid--auto">
          <div class="card card--info">
            <div class="card__body">
              <strong>Tiempo crítico t*</strong><br>
              <span style="font-size:1.5rem; color:var(--color-alert);">
                ${tCritico.toFixed(4)} días
              </span><br>
              <small>Instante en que f(t*) = ${U}</small>
            </div>
          </div>
          <div class="card card--info">
            <div class="card__body">
              <strong>Ventana de acción</strong><br>
              <span style="font-size:1.5rem; color:var(--color-primary);">
                ${diasEnteros} días
              </span><br>
              <small>Para activar reposición o racionamiento</small>
            </div>
          </div>
          <div class="card card--info">
            <div class="card__body">
              <strong>Modelo usado</strong><br>
              <code style="font-size:0.85rem;">${descripcionModelo}</code><br>
              <small>Umbral U = ${U.toLocaleString()} unidades</small>
            </div>
          </div>
        </div>

        <p style="margin-top:var(--spacing-4);">
          <strong>Interpretación para gestión de crisis:</strong>
          Con el modelo <em>${descripcionModelo}</em>, el stock caerá por debajo
          del nivel crítico de <strong>${U.toLocaleString()} unidades</strong>
          en exactamente <strong>${tCritico.toFixed(4)} días</strong>.
          Se recomienda activar el protocolo de reposición
          <strong>antes del día ${Math.max(0, diasEnteros - 3)}</strong>
          para absorber tiempos de entrega de 2-3 días.
        </p>

        <p>
          <strong>Comparación de métodos:</strong> ${ventaja}
          Bisección garantiza convergencia siempre que exista cambio de signo,
          con error O(1/2ⁿ). Newton-Raphson converge cuadráticamente (O(h²))
          cuando el punto inicial es cercano a la raíz.
        </p>

      </div>
    </div>
  `;
}

// ─────────────────────────────────────────────
// GRÁFICO
// ─────────────────────────────────────────────

let chartInstanciaE = null;

/**
 * Renderiza el gráfico de inventario vs umbral crítico.
 * @param {string}   canvasId
 * @param {number[]} ts        - eje temporal
 * @param {number[]} fs        - f(t)
 * @param {number}   U         - umbral crítico
 * @param {number}   tCritico  - tiempo donde f(t*) = U (puede ser NaN)
 */
function renderizarGrafico(canvasId, ts, fs, U, tCritico) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  if (chartInstanciaE) { chartInstanciaE.destroy(); chartInstanciaE = null; }

  const CFG    = window.APP_CONFIG?.CHART_CONFIG ?? {};
  const colores = CFG.COLORES ?? { PRIMARY: '#3E594F', ALERT: '#D97059', ACCENT_WARM: '#F29966' };
  const fondos  = CFG.COLORES_FONDO ?? { PRIMARY: 'rgba(62,89,79,0.15)' };
  const opcionesBase = CFG.OPCIONES_BASE
    ? JSON.parse(JSON.stringify(CFG.OPCIONES_BASE))
    : {};

  // Línea del umbral U constante
  const umbralData = ts.map(() => U);

  // Anotación del punto crítico como dataset de un solo punto
  const puntoCritico = isFinite(tCritico)
    ? [{ x: tCritico, y: U }]
    : [];

  chartInstanciaE = new Chart(canvas, {
    type: 'line',
    data: {
      labels: ts.map(t => t.toFixed(1)),
      datasets: [
        {
          label:           'Nivel de inventario f(t)',
          data:            fs,
          borderColor:     colores.PRIMARY,
          backgroundColor: fondos.PRIMARY,
          borderWidth:     2.5,
          pointRadius:     0,
          fill:            true,
          tension:         0.3,
        },
        {
          label:           `Umbral crítico U = ${U}`,
          data:            umbralData,
          borderColor:     colores.ALERT,
          borderWidth:     2,
          borderDash:      [8, 4],
          pointRadius:     0,
          fill:            false,
          tension:         0,
        },
        ...(puntoCritico.length > 0 ? [{
          label:           `t* = ${tCritico.toFixed(4)} días`,
          data:            fs.map((_, i) => {
            // Encontrar el índice más cercano a tCritico
            const tIdx = ts.findIndex(t => t >= tCritico);
            return i === tIdx ? U : null;
          }),
          borderColor:     colores.ACCENT_WARM,
          backgroundColor: colores.ACCENT_WARM,
          borderWidth:     0,
          pointRadius:     8,
          pointStyle:      'triangle',
          showLine:        false,
        }] : []),
      ],
    },
    options: {
      ...opcionesBase,
      plugins: {
        ...(opcionesBase.plugins ?? {}),
        title: {
          display: true,
          text:    'Nivel de inventario vs Umbral crítico',
          font:    { size: 14, weight: 'bold' },
        },
      },
      scales: {
        x: {
          ...(opcionesBase.scales?.x ?? {}),
          title:  { display: true, text: 'Tiempo (días)' },
          ticks:  { maxTicksLimit: 12, font: { size: 11 } },
        },
        y: {
          ...(opcionesBase.scales?.y ?? {}),
          title:       { display: true, text: 'Unidades en inventario' },
          beginAtZero: true,
        },
      },
    },
  });
}

// ─────────────────────────────────────────────
// MANEJO DEL SELECTOR DE MODELO
// ─────────────────────────────────────────────

/**
 * Muestra solo el bloque de parámetros del modelo seleccionado.
 */
function actualizarVistaModelo() {
  const modelo = document.getElementById('e-modelo')?.value;
  document.querySelectorAll('.e-params').forEach(el => {
    el.hidden = true;
  });
  const bloque = document.getElementById(`e-params-${modelo}`);
  if (bloque) bloque.hidden = false;
}

// ─────────────────────────────────────────────
// LECTURA Y VALIDACIÓN DEL FORMULARIO
// ─────────────────────────────────────────────

/**
 * Lee todos los parámetros del formulario según el modelo activo.
 * @returns {{ params: Object|null, errores: string[] }}
 */
function leerFormulario() {
  const errores = [];
  const modelo  = document.getElementById('e-modelo')?.value ?? 'exponencial';
  const U       = parseFloat(document.getElementById('e-umbral')?.value);
  const x0      = parseFloat(document.getElementById('e-x0')?.value);
  const tol     = parseFloat(document.getElementById('e-tol')?.value);

  if (isNaN(U) || U < 0)
    errores.push('El umbral crítico U debe ser ≥ 0.');
  if (isNaN(x0) || x0 < 0)
    errores.push('El punto inicial para Newton debe ser ≥ 0.');
  if (isNaN(tol) || tol <= 0)
    errores.push('La tolerancia debe ser un número positivo.');

  // Parámetros específicos del modelo
  let p = {};
  let tMax = 60;

  if (modelo === 'exponencial') {
    p.A = parseFloat(document.getElementById('e-exp-A')?.value);
    p.k = parseFloat(document.getElementById('e-exp-k')?.value);
    tMax = parseFloat(document.getElementById('e-exp-tmax')?.value);
    if (isNaN(p.A) || p.A <= 0) errores.push('A debe ser > 0.');
    if (isNaN(p.k) || p.k <= 0) errores.push('k debe ser > 0.');
    if (!isNaN(U) && p.A <= U)
      errores.push('El stock inicial A debe ser mayor que el umbral U.');

  } else if (modelo === 'lineal') {
    p.A = parseFloat(document.getElementById('e-lin-A')?.value);
    p.r = parseFloat(document.getElementById('e-lin-r')?.value);
    tMax = parseFloat(document.getElementById('e-lin-tmax')?.value);
    if (isNaN(p.A) || p.A <= 0) errores.push('A debe ser > 0.');
    if (isNaN(p.r) || p.r <= 0) errores.push('r debe ser > 0.');
    if (!isNaN(U) && p.A <= U)
      errores.push('El stock inicial A debe ser mayor que el umbral U.');

  } else if (modelo === 'logistico') {
    p.A  = parseFloat(document.getElementById('e-log-A')?.value);
    p.k  = parseFloat(document.getElementById('e-log-k')?.value);
    p.t0 = parseFloat(document.getElementById('e-log-t0')?.value);
    tMax = parseFloat(document.getElementById('e-log-tmax')?.value);
    if (isNaN(p.A) || p.A <= 0) errores.push('A debe ser > 0.');
    if (isNaN(p.k) || p.k <= 0) errores.push('k debe ser > 0.');
    if (isNaN(p.t0))             errores.push('t₀ debe ser un número.');

  } else if (modelo === 'personalizado') {
    p.expresion = document.getElementById('e-per-expr')?.value ?? '';
    tMax = parseFloat(document.getElementById('e-per-tmax')?.value);
    if (!p.expresion.trim())
      errores.push('Escribe una expresión para el modelo personalizado.');
  }

  if (isNaN(tMax) || tMax < 5) errores.push('El tiempo máximo debe ser ≥ 5 días.');

  if (errores.length > 0) return { params: null, errores };

  return { params: { modelo, p, U, x0, tol, tMax, maxIter: 100 }, errores: [] };
}

/**
 * Muestra errores de validación.
 * @param {string[]} errores
 */
function mostrarErrores(errores) {
  const contenedor = document.getElementById('e-errores');
  if (!contenedor) return;
  contenedor.innerHTML = errores.length === 0 ? '' : `
    <div class="alert alert--error" role="alert">
      <ul style="margin:0; padding-left:var(--spacing-4);">
        ${errores.map(e => `<li>${e}</li>`).join('')}
      </ul>
    </div>
  `;
}

// ─────────────────────────────────────────────
// MANEJADOR PRINCIPAL DE CÁLCULO
// ─────────────────────────────────────────────

function calcularEscenarioE() {
  const { params, errores } = leerFormulario();
  mostrarErrores(errores);
  if (!params) return;

  const { modelo, p, U, x0, tol, tMax, maxIter } = params;

  // Construir modelo
  const resultado = construirModelo(modelo, p, U);
  if (resultado.error) {
    mostrarErrores([resultado.error]);
    return;
  }
  const { f, g, descripcion } = resultado;

  // Intervalo de búsqueda: [0, tMax]
  const rBis  = biseccion(g, 0, tMax, tol, maxIter);
  const rNewt = newtonRaphson(g, x0, tol, maxIter);

  // Gráfico
  const { ts, fs } = generarPuntosGrafico(f, tMax);
  const tCritico   = rNewt.convergió ? rNewt.raiz
                   : rBis.convergió  ? rBis.raiz
                   : NaN;
  renderizarGrafico('e-chart', ts, fs, U, tCritico);

  // Tabla comparativa
  const contTablaComp = document.getElementById('e-tabla-comparativa');
  if (contTablaComp) contTablaComp.innerHTML = htmlTablaComparativa(rBis, rNewt);

  // Tablas de iteraciones
  const contBis  = document.getElementById('e-tabla-biseccion');
  const contNewt = document.getElementById('e-tabla-newton');
  if (contBis)  contBis.innerHTML  = htmlTablaIteraciones(rBis.iteraciones,  'biseccion');
  if (contNewt) contNewt.innerHTML = htmlTablaIteraciones(rNewt.iteraciones, 'newton');

  // Interpretación
  const contInterp = document.getElementById('e-interpretacion');
  if (contInterp)
    contInterp.innerHTML = htmlInterpretacion(rBis, rNewt, U, descripcion);

  // Mostrar resultados
  const resultados = document.getElementById('e-resultados');
  if (resultados) resultados.hidden = false;
}

function limpiarEscenarioE() {
  document.getElementById('form-escenario-e')?.reset();
  actualizarVistaModelo();

  const resultados = document.getElementById('e-resultados');
  if (resultados) resultados.hidden = true;

  const errores = document.getElementById('e-errores');
  if (errores) errores.innerHTML = '';

  if (chartInstanciaE) { chartInstanciaE.destroy(); chartInstanciaE = null; }
}

// ─────────────────────────────────────────────
// REGISTRO DE EVENTOS
// ─────────────────────────────────────────────

function registrarEventosE() {
  document.getElementById('e-btn-calcular')
    ?.addEventListener('click', calcularEscenarioE);
  document.getElementById('e-btn-limpiar')
    ?.addEventListener('click', limpiarEscenarioE);
  document.getElementById('e-modelo')
    ?.addEventListener('change', actualizarVistaModelo);
}

// ─────────────────────────────────────────────
// FUNCIÓN PRINCIPAL DE RENDERIZADO
// ─────────────────────────────────────────────

function escenarioE() {
  setTimeout(registrarEventosE, 0);

  return `
    <section
      class="seccion-contenido"
      id="vista-escenario-e"
      aria-labelledby="titulo-e"
    >

      <!-- ENCABEZADO -->
      <div class="seccion-contenido__header">
        <h1 id="titulo-e">🚨 Escenario E: Umbrales Críticos de Desabastecimiento</h1>
        <p class="seccion-contenido__subtitulo">
          Raíces de ecuaciones aplicadas a la detección temprana de crisis de inventario
        </p>
      </div>

      <!-- CONTEXTO -->
      <div class="card card--info" style="margin-bottom: var(--spacing-5);">
        <div class="card__body">
          <p>
            Dado un modelo de inventario f(t), el <strong>umbral crítico</strong>
            es el instante t* en que f(t*) = U. Encontrarlo equivale a resolver
            la ecuación <strong>g(t) = f(t) − U = 0</strong>.
          </p>
          <p>
            Se comparan dos métodos: <strong>Bisección</strong> (robusto,
            garantiza convergencia con cambio de signo) y
            <strong>Newton-Raphson</strong> (convergencia cuadrática,
            requiere buen punto inicial). El triángulo naranja en el gráfico
            marca el punto crítico encontrado.
          </p>
        </div>
      </div>

      <!-- FORMULARIO -->
      <div class="card" style="margin-bottom: var(--spacing-5);">
        <div class="card__header">
          <h2 class="card__title">⚙️ Configuración del modelo</h2>
        </div>
        <div class="card__body">
          <div id="e-errores" role="alert" aria-live="polite"></div>
          <form id="form-escenario-e" novalidate>
            ${htmlFormulario()}
          </form>
        </div>
      </div>

      <!-- RESULTADOS -->
      <div id="e-resultados" hidden>

        <!-- GRÁFICO -->
        <div class="card" style="margin-bottom: var(--spacing-5);">
          <div class="card__header">
            <h2 class="card__title">📈 Inventario f(t) vs Umbral crítico U</h2>
          </div>
          <div class="card__body">
            <div class="grafico-contenedor" style="height: 360px;">
              <canvas id="e-chart" aria-label="Gráfico de inventario y umbral crítico"></canvas>
            </div>
          </div>
        </div>

        <!-- INTERPRETACIÓN -->
        <div id="e-interpretacion" style="margin-bottom: var(--spacing-5);"></div>

        <!-- TABLA COMPARATIVA -->
        <div class="card" style="margin-bottom: var(--spacing-5);">
          <div class="card__header">
            <h2 class="card__title">⚖️ Comparación de métodos</h2>
          </div>
          <div class="card__body" id="e-tabla-comparativa"></div>
        </div>

        <!-- ITERACIONES BISECCIÓN -->
        <div class="card" style="margin-bottom: var(--spacing-5);">
          <div class="card__header">
            <h2 class="card__title">📋 Iteraciones — Bisección</h2>
          </div>
          <div class="card__body" id="e-tabla-biseccion"></div>
        </div>

        <!-- ITERACIONES NEWTON -->
        <div class="card">
          <div class="card__header">
            <h2 class="card__title">📋 Iteraciones — Newton-Raphson</h2>
          </div>
          <div class="card__body" id="e-tabla-newton"></div>
        </div>

      </div>

    </section>
  `;
}

// ─────────────────────────────────────────────
// EXPORTACIÓN GLOBAL
// ─────────────────────────────────────────────

window.escenarioE = escenarioE;