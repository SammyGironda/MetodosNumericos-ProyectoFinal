// ============================================================
// escenarioC.js - Escenario C: Curva de Precios durante Crisis
// Métodos: Interpolación de Lagrange + Splines Cúbicos Naturales
// Contexto: Reconstrucción de la curva de precios de productos
//           básicos a partir de datos escasos de mercado
// ============================================================

import { lagrange, splinesNaturales } from '../core/interpolacion.js';
import { renderizarGrafico } from '../ui/graficos.js';
import { renderizarTabla } from '../ui/tablas.js';
import { mostrarNotificacion } from '../ui/notificaciones.js';
import { mostrarErrores, limpiarErrores } from '../ui/formularios.js';

// ─── Constantes del escenario ───────────────────────────────
const ID_ESCENARIO  = 'escenario-c';
const CHART_ID      = 'grafico-precios';
const CHART_ERROR_ID = 'grafico-error-c';
let chartPrincipal  = null;
let chartError      = null;

// ─── Datos de ejemplo precargados ───────────────────────────
// Precio del combustible (Bs/litro) registrado en días de crisis
const DATOS_EJEMPLO = [
  { dia: 0,  precio: 3.74  },
  { dia: 5,  precio: 4.10  },
  { dia: 10, precio: 5.30  },
  { dia: 15, precio: 7.80  },
  { dia: 20, precio: 9.20  },
  { dia: 25, precio: 8.60  },
  { dia: 30, precio: 10.40 }
];
const MAX_PUNTOS = 10;
const MIN_PUNTOS = 3;

// ─── Función principal: renderizar el escenario ─────────────
export function renderizarEscenarioC(contenedor) {
  chartPrincipal = null;
  chartError     = null;

  contenedor.innerHTML = `
    <section class="escenario" id="${ID_ESCENARIO}" aria-labelledby="titulo-esc-c">

      <!-- ENCABEZADO -->
      <div class="escenario__header card card--escenario-c">
        <div class="card__body">
          <div class="escenario__titulo-grupo">
            <span class="badge badge--escenario-c">Escenario C</span>
            <h1 id="titulo-esc-c" class="escenario__titulo">
              Reconstrucción de la Curva de Precios durante una Crisis
            </h1>
          </div>
          <p class="escenario__descripcion">
            Durante una crisis de abastecimiento, los precios de productos básicos
            solo se registran en momentos puntuales. Este escenario utiliza
            <strong>Interpolación Polinómica</strong> para reconstruir la curva de
            precios continua a partir de datos escasos, comparando
            <strong>Lagrange</strong> (polinomio único) con
            <strong>Splines Cúbicos</strong> (tramos suaves).
          </p>
          <div class="escenario__formula">
            <code>P(x) = Σ yᵢ · Lᵢ(x) &nbsp;|&nbsp; S(x) = aᵢ + bᵢh + cᵢh² + dᵢh³</code>
            <p class="form-help">
              Lagrange: suma ponderada de bases | Spline cúbico: polinomio por tramo con continuidad C²
            </p>
          </div>
        </div>
      </div>

      <!-- INGRESO DE DATOS -->
      <div class="card">
        <div class="card__header">
          <h2 class="card__title">Datos de Precios Observados</h2>
        </div>
        <div class="card__body">
          <p class="form-help" style="margin-bottom: 1rem;">
            Ingresa entre ${MIN_PUNTOS} y ${MAX_PUNTOS} pares (día, precio).
            Los días deben ser <strong>estrictamente crecientes</strong>.
          </p>

          <div id="tabla-entrada-c" class="tabla-contenedor" style="margin-bottom: 1rem;">
            <!-- Tabla dinámica generada por JS -->
          </div>

          <div class="form-button-group" style="margin-bottom: 1.5rem;">
            <button type="button" class="btn btn--secondary btn--small" id="btn-agregar-fila">
              + Agregar punto
            </button>
            <button type="button" class="btn btn--secondary btn--small" id="btn-quitar-fila">
              − Quitar último
            </button>
            <button type="button" class="btn btn--secondary btn--small" id="btn-cargar-ejemplo">
              Cargar ejemplo (combustible)
            </button>
          </div>

          <!-- Opciones de evaluación -->
          <div class="form-row form-row--3-col">
            <div class="form-group">
              <label class="form-label" for="x-eval">
                Evaluar en el día x
              </label>
              <input
                class="form-input"
                type="number"
                id="x-eval"
                name="x-eval"
                placeholder="Ej: 12"
                step="any"
              />
              <span class="form-help">Estima el precio en un día no observado</span>
              <span class="form-error" id="error-x-eval" aria-live="polite"></span>
            </div>

            <div class="form-group">
              <label class="form-label" for="puntos-grafico">
                Puntos en el gráfico
              </label>
              <input
                class="form-input"
                type="number"
                id="puntos-grafico"
                value="200"
                min="50"
                max="500"
                step="10"
              />
              <span class="form-help">Densidad de la curva interpolada (50–500)</span>
            </div>

            <div class="form-group">
              <label class="form-label" for="metodo-mostrar">
                Métodos a mostrar
              </label>
              <select class="form-input" id="metodo-mostrar">
                <option value="ambos" selected>Lagrange + Splines</option>
                <option value="lagrange">Solo Lagrange</option>
                <option value="spline">Solo Splines cúbicos</option>
              </select>
            </div>
          </div>

          <div class="form-button-group">
            <button type="button" class="btn btn--primary" id="btn-interpolar-c">
              Interpolar curva de precios
            </button>
            <button type="button" class="btn btn--secondary" id="btn-reset-c">
              Limpiar todo
            </button>
          </div>

          <span class="form-error" id="error-datos-c" aria-live="polite"></span>

        </div>
      </div><!-- /card datos -->

      <!-- RESULTADOS -->
      <div id="resultados-c" hidden aria-live="polite">

        <!-- EVALUACIÓN PUNTUAL -->
        <div class="card card--info" id="card-eval-puntual" hidden>
          <div class="card__header">
            <h2 class="card__title">Evaluación Puntual</h2>
          </div>
          <div class="card__body" id="contenido-eval-puntual">
            <!-- Generado dinámicamente -->
          </div>
        </div>

        <!-- MÉTRICAS -->
        <div class="card">
          <div class="card__header">
            <h2 class="card__title">Métricas de la Interpolación</h2>
          </div>
          <div class="card__body">
            <div class="grid grid--4-col" id="metricas-c"></div>
          </div>
        </div>

        <!-- GRÁFICO PRINCIPAL -->
        <div class="card">
          <div class="card__header">
            <h2 class="card__title">Curva de Precios Interpolada</h2>
          </div>
          <div class="card__body">
            <div class="grafico-contenedor" style="height: 420px;">
              <canvas id="${CHART_ID}" role="img" aria-label="Curva de precios interpolada"></canvas>
            </div>
          </div>
        </div>

        <!-- TABLA COMPARATIVA -->
        <div class="card">
          <div class="card__header">
            <h2 class="card__title">Tabla Comparativa en Puntos Conocidos</h2>
          </div>
          <div class="card__body">
            <div id="tabla-resultados-c" class="tabla-contenedor"></div>
          </div>
        </div>

        <!-- GRÁFICO DE DIFERENCIAS -->
        <div class="card">
          <div class="card__header">
            <h2 class="card__title">Diferencia entre Lagrange y Splines</h2>
          </div>
          <div class="card__body">
            <div class="grafico-contenedor" style="height: 280px;">
              <canvas id="${CHART_ERROR_ID}" role="img" aria-label="Diferencia entre métodos"></canvas>
            </div>
          </div>
        </div>

        <!-- INTERPRETACIÓN -->
        <div class="card card--info">
          <div class="card__header">
            <h2 class="card__title">Interpretación Económica</h2>
          </div>
          <div class="card__body" id="interpretacion-c">
            <!-- Generado dinámicamente -->
          </div>
        </div>

      </div><!-- /resultados -->

    </section>
  `;

  _inicializarTablaEntrada();
  _registrarEventos();
}

// ─── Tabla de entrada dinámica ───────────────────────────────
let filasActuales = [];

function _inicializarTablaEntrada(datos = DATOS_EJEMPLO) {
  filasActuales = datos.map(d => ({ dia: d.dia, precio: d.precio }));
  _renderizarTablaEntrada();
}

function _renderizarTablaEntrada() {
  const contenedor = document.getElementById('tabla-entrada-c');
  if (!contenedor) return;

  contenedor.innerHTML = `
    <table style="width:100%; border-collapse:collapse;">
      <thead>
        <tr>
          <th style="text-align:center; padding:8px; background:var(--color-neutral-100, #f5f5f5); width:40px;">#</th>
          <th style="text-align:center; padding:8px; background:var(--color-neutral-100, #f5f5f5);">Día (x)</th>
          <th style="text-align:center; padding:8px; background:var(--color-neutral-100, #f5f5f5);">Precio (y)</th>
        </tr>
      </thead>
      <tbody id="tbody-entrada-c">
        ${filasActuales.map((fila, i) => `
          <tr>
            <td style="text-align:center; padding:6px; color: var(--color-neutral-500, #888);">${i + 1}</td>
            <td style="padding:4px 8px;">
              <input
                class="form-input"
                type="number"
                data-index="${i}"
                data-campo="dia"
                value="${fila.dia}"
                step="any"
                style="width:100%; text-align:right;"
                aria-label="Día del punto ${i + 1}"
              />
            </td>
            <td style="padding:4px 8px;">
              <input
                class="form-input"
                type="number"
                data-index="${i}"
                data-campo="precio"
                value="${fila.precio}"
                step="any"
                style="width:100%; text-align:right;"
                aria-label="Precio del punto ${i + 1}"
              />
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;

  // Eventos para actualizar filasActuales al editar
  contenedor.querySelectorAll('input[data-index]').forEach(input => {
    input.addEventListener('change', (e) => {
      const idx   = parseInt(e.target.dataset.index, 10);
      const campo = e.target.dataset.campo;
      filasActuales[idx][campo] = parseFloat(e.target.value) || 0;
    });
  });
}

// ─── Registro de eventos ─────────────────────────────────────
function _registrarEventos() {
  document.getElementById('btn-agregar-fila')
    ?.addEventListener('click', _agregarFila);

  document.getElementById('btn-quitar-fila')
    ?.addEventListener('click', _quitarFila);

  document.getElementById('btn-cargar-ejemplo')
    ?.addEventListener('click', () => {
      _inicializarTablaEntrada(DATOS_EJEMPLO);
      mostrarNotificacion('Datos de ejemplo cargados', 'info');
    });

  document.getElementById('btn-interpolar-c')
    ?.addEventListener('click', _manejarInterpolacion);

  document.getElementById('btn-reset-c')
    ?.addEventListener('click', _restablecerTodo);
}

function _agregarFila() {
  if (filasActuales.length >= MAX_PUNTOS) {
    mostrarNotificacion(`Máximo ${MAX_PUNTOS} puntos permitidos`, 'warning');
    return;
  }
  const ultimoDia = filasActuales.length > 0
    ? filasActuales[filasActuales.length - 1].dia + 5
    : 0;
  filasActuales.push({ dia: ultimoDia, precio: 0 });
  _renderizarTablaEntrada();
}

function _quitarFila() {
  if (filasActuales.length <= MIN_PUNTOS) {
    mostrarNotificacion(`Mínimo ${MIN_PUNTOS} puntos requeridos`, 'warning');
    return;
  }
  filasActuales.pop();
  _renderizarTablaEntrada();
}

// ─── Manejador principal ─────────────────────────────────────
function _manejarInterpolacion() {
  limpiarErrores(['error-datos-c', 'error-x-eval']);

  const datos = _validarDatos();
  if (!datos) return;

  const xEvalStr       = document.getElementById('x-eval').value.trim();
  const xEval          = xEvalStr !== '' ? parseFloat(xEvalStr) : null;
  const puntosGrafico  = parseInt(document.getElementById('puntos-grafico').value, 10) || 200;
  const metodoMostrar  = document.getElementById('metodo-mostrar').value;

  // Validar xEval si fue ingresado
  if (xEval !== null) {
    const xMin = datos.xs[0];
    const xMax = datos.xs[datos.xs.length - 1];
    if (isNaN(xEval)) {
      mostrarErrores({ 'error-x-eval': 'Ingresa un número válido.' });
      return;
    }
    if (xEval < xMin || xEval > xMax) {
      mostrarErrores({
        'error-x-eval': `El día debe estar entre ${xMin} y ${xMax} (rango de los datos).`
      });
      return;
    }
  }

  // Ejecutar interpolaciones
  const resultados = _ejecutarInterpolaciones(datos, puntosGrafico, xEval);

  // Renderizar
  _renderizarResultados(datos, resultados, xEval, metodoMostrar);

  const divResultados = document.getElementById('resultados-c');
  if (divResultados) {
    divResultados.hidden = false;
    divResultados.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  mostrarNotificacion('Interpolación completada', 'success');
}

// ─── Validación de datos de entrada ─────────────────────────
function _validarDatos() {
  // Leer valores actuales de los inputs (por si el usuario editó sin disparar 'change')
  document.querySelectorAll('input[data-index]').forEach(input => {
    const idx   = parseInt(input.dataset.index, 10);
    const campo = input.dataset.campo;
    if (!isNaN(parseFloat(input.value))) {
      filasActuales[idx][campo] = parseFloat(input.value);
    }
  });

  if (filasActuales.length < MIN_PUNTOS) {
    mostrarErrores({ 'error-datos-c': `Se necesitan al menos ${MIN_PUNTOS} puntos de datos.` });
    return null;
  }

  // Verificar que los días sean estrictamente crecientes
  const xs = filasActuales.map(f => f.dia);
  const ys = filasActuales.map(f => f.precio);

  for (let i = 1; i < xs.length; i++) {
    if (xs[i] <= xs[i - 1]) {
      mostrarErrores({
        'error-datos-c': `Los días deben ser estrictamente crecientes. Error en fila ${i + 1}: día ${xs[i]} ≤ día ${xs[i-1]}.`
      });
      return null;
    }
  }

  // Verificar precios no negativos
  for (let i = 0; i < ys.length; i++) {
    if (isNaN(ys[i]) || ys[i] < 0) {
      mostrarErrores({ 'error-datos-c': `El precio en la fila ${i + 1} debe ser un número no negativo.` });
      return null;
    }
  }

  return { xs, ys, n: xs.length };
}

// ─── Ejecución de interpolaciones ────────────────────────────
function _ejecutarInterpolaciones({ xs, ys, n }, puntosGrafico, xEval) {
  const xMin = xs[0];
  const xMax = xs[xs.length - 1];
  const paso  = (xMax - xMin) / (puntosGrafico - 1);

  // Puntos densos para graficar la curva
  const xDensos = Array.from({ length: puntosGrafico }, (_, i) => xMin + i * paso);

  // Calcular curvas
  const curveLagrange = xDensos.map(x => ({
    x,
    y: lagrange(xs, ys, x)
  }));

  const coefSplines   = splinesNaturales(xs, ys);
  const curveSpline   = xDensos.map(x => ({
    x,
    y: _evaluarSpline(xs, coefSplines, x)
  }));

  // Evaluación puntual
  let evalPuntual = null;
  if (xEval !== null) {
    evalPuntual = {
      x:       xEval,
      lagrange: lagrange(xs, ys, xEval),
      spline:   _evaluarSpline(xs, coefSplines, xEval)
    };
  }

  // Error en puntos conocidos (verificar que el método reproduce los datos)
  const errorEnPuntos = xs.map((x, i) => ({
    dia:          x,
    precioReal:   ys[i],
    lagrange:     lagrange(xs, ys, x),
    spline:       _evaluarSpline(xs, coefSplines, x),
    diffLagrange: Math.abs(lagrange(xs, ys, x) - ys[i]),
    diffSpline:   Math.abs(_evaluarSpline(xs, coefSplines, x) - ys[i])
  }));

  // Diferencia entre métodos a lo largo de la curva
  const diferencia = xDensos.map((x, i) => ({
    x,
    diff: Math.abs(curveLagrange[i].y - curveSpline[i].y)
  }));

  // Estadísticas
  const maxDiff     = Math.max(...diferencia.map(d => d.diff));
  const maxDiffIdx  = diferencia.findIndex(d => d.diff === maxDiff);
  const precioMax   = Math.max(...ys);
  const precioMin   = Math.min(...ys);
  const diaMaxPrecio = xs[ys.indexOf(precioMax)];

  return {
    xDensos,
    curveLagrange,
    curveSpline,
    coefSplines,
    evalPuntual,
    errorEnPuntos,
    diferencia,
    stats: {
      maxDiff,
      xMaxDiff: diferencia[maxDiffIdx]?.x,
      precioMax,
      precioMin,
      diaMaxPrecio,
      variacion: ((precioMax - precioMin) / precioMin * 100).toFixed(1)
    }
  };
}

// ─── Evaluar spline cúbico en un punto x ─────────────────────
/**
 * Evalúa el spline cúbico natural en el punto x.
 * Los coeficientes vienen de splinesNaturales() en core/interpolacion.js
 * Formato esperado: array de objetos { a, b, c, d, x0 } por cada tramo
 */
function _evaluarSpline(xs, coefs, x) {
  const n = xs.length - 1;

  // Encontrar el tramo correcto
  let i = n - 1;
  for (let j = 0; j < n; j++) {
    if (x <= xs[j + 1]) { i = j; break; }
  }

  const h  = x - xs[i];
  const c  = coefs[i];
  return c.a + c.b * h + c.c * h * h + c.d * h * h * h;
}

// ─── Renderizado de resultados ───────────────────────────────
function _renderizarResultados(datos, resultados, xEval, metodoMostrar) {
  _renderizarEvalPuntual(resultados.evalPuntual);
  _renderizarMetricas(datos, resultados);
  _renderizarGraficoPrincipal(datos, resultados, metodoMostrar, xEval);
  _renderizarTablaComparativa(resultados.errorEnPuntos);
  _renderizarGraficoDiferencia(resultados.diferencia);
  _renderizarInterpretacion(datos, resultados);
}

// ─── Evaluación puntual ──────────────────────────────────────
function _renderizarEvalPuntual(evalPuntual) {
  const card      = document.getElementById('card-eval-puntual');
  const contenido = document.getElementById('contenido-eval-puntual');
  if (!card || !contenido) return;

  if (!evalPuntual) {
    card.hidden = true;
    return;
  }

  card.hidden = false;
  const { x, lagrange: pL, spline: pS } = evalPuntual;
  const promedio = (pL + pS) / 2;

  contenido.innerHTML = `
    <div class="grid grid--3-col">
      <div style="text-align:center; padding: 1rem;">
        <p class="form-help" style="margin:0 0 0.25rem;">Día evaluado</p>
        <strong style="font-size:1.6rem;">${x}</strong>
      </div>
      <div style="text-align:center; padding: 1rem;">
        <p class="form-help" style="margin:0 0 0.25rem;">Precio por Lagrange</p>
        <strong style="font-size:1.6rem; color: var(--color-accent-warm, #F29966);">
          ${pL.toFixed(4)}
        </strong>
      </div>
      <div style="text-align:center; padding: 1rem;">
        <p class="form-help" style="margin:0 0 0.25rem;">Precio por Splines</p>
        <strong style="font-size:1.6rem; color: var(--color-primary, #3E594F);">
          ${pS.toFixed(4)}
        </strong>
      </div>
    </div>
    <p class="form-help" style="text-align:center; margin-top:0.5rem;">
      Promedio de ambos métodos: <strong>${promedio.toFixed(4)}</strong> &nbsp;|&nbsp;
      Diferencia entre métodos: <strong>${Math.abs(pL - pS).toFixed(6)}</strong>
    </p>
  `;
}

// ─── Métricas ────────────────────────────────────────────────
function _renderizarMetricas({ n }, { stats }) {
  const contenedor = document.getElementById('metricas-c');
  if (!contenedor) return;

  const metricas = [
    {
      label: 'Puntos de datos',
      valor: `${n} observaciones`,
      clase: 'info'
    },
    {
      label: 'Variación de precios',
      valor: `+${stats.variacion}%`,
      clase: parseFloat(stats.variacion) > 100 ? 'alert' : 'info'
    },
    {
      label: 'Precio máximo',
      valor: `${stats.precioMax.toFixed(2)} (día ${stats.diaMaxPrecio})`,
      clase: 'alert'
    },
    {
      label: 'Divergencia máx. métodos',
      valor: stats.maxDiff.toFixed(6),
      clase: stats.maxDiff > 0.5 ? 'alert' : 'success'
    }
  ];

  contenedor.innerHTML = metricas.map(m => `
    <div class="card card--${m.clase}" style="text-align:center; padding: 1rem;">
      <p class="form-help" style="margin:0 0 0.25rem;">${m.label}</p>
      <strong style="font-size:1.2rem;">${m.valor}</strong>
    </div>
  `).join('');
}

// ─── Gráfico principal ───────────────────────────────────────
function _renderizarGraficoPrincipal({ xs, ys }, resultados, metodoMostrar, xEval) {
  const canvas = document.getElementById(CHART_ID);
  if (!canvas) return;
  if (chartPrincipal) { chartPrincipal.destroy(); chartPrincipal = null; }

  const datasets = [];

  // Datos originales (puntos observados)
  datasets.push({
    label: 'Datos observados',
    data: xs.map((x, i) => ({ x, y: ys[i] })),
    type: 'scatter',
    backgroundColor: '#D97059',
    borderColor: '#D97059',
    pointRadius: 7,
    pointHoverRadius: 9,
    showLine: false,
    order: 0
  });

  // Lagrange
  if (metodoMostrar === 'ambos' || metodoMostrar === 'lagrange') {
    datasets.push({
      label: 'Interpolación Lagrange',
      data: resultados.curveLagrange.map(p => ({ x: p.x, y: parseFloat(p.y.toFixed(4)) })),
      borderColor: '#F29966',
      backgroundColor: 'transparent',
      borderWidth: 2,
      pointRadius: 0,
      tension: 0.0,
      fill: false,
      order: 1
    });
  }

  // Splines
  if (metodoMostrar === 'ambos' || metodoMostrar === 'spline') {
    datasets.push({
      label: 'Splines Cúbicos Naturales',
      data: resultados.curveSpline.map(p => ({ x: p.x, y: parseFloat(p.y.toFixed(4)) })),
      borderColor: '#3E594F',
      backgroundColor: 'rgba(62,89,79,0.06)',
      borderWidth: 2.5,
      pointRadius: 0,
      tension: 0.0,
      fill: false,
      order: 2
    });
  }

  // Punto evaluado
  if (xEval !== null && resultados.evalPuntual) {
    const ep = resultados.evalPuntual;
    datasets.push({
      label: `Evaluación día ${xEval}`,
      data: [
        { x: ep.x, y: parseFloat(ep.lagrange.toFixed(4)) },
        { x: ep.x, y: parseFloat(ep.spline.toFixed(4)) }
      ],
      type: 'scatter',
      backgroundColor: '#6C8C74',
      borderColor: '#6C8C74',
      pointRadius: 9,
      pointStyle: 'star',
      showLine: false,
      order: 0
    });
  }

  const xMin = xs[0];
  const xMax = xs[xs.length - 1];

  chartPrincipal = renderizarGrafico(CHART_ID, {
    type: 'line',
    data: { datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      parsing: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { position: 'top' },
        tooltip: {
          callbacks: {
            label: (ctx) => `${ctx.dataset.label}: ${parseFloat(ctx.parsed.y).toFixed(4)}`
          }
        }
      },
      scales: {
        x: {
          type: 'linear',
          title: { display: true, text: 'Día de la crisis' },
          min: xMin,
          max: xMax
        },
        y: {
          title: { display: true, text: 'Precio' },
          beginAtZero: false
        }
      }
    }
  });
}

// ─── Tabla comparativa en puntos conocidos ───────────────────
function _renderizarTablaComparativa(errorEnPuntos) {
  const contenedor = document.getElementById('tabla-resultados-c');
  if (!contenedor) return;

  const filas = errorEnPuntos.map(p => ({
    'Día':                p.dia.toFixed(2),
    'Precio real':        p.precioReal.toFixed(4),
    'Lagrange':           p.lagrange.toFixed(8),
    'Splines':            p.spline.toFixed(8),
    'Error Lagrange':     p.diffLagrange.toExponential(3),
    'Error Splines':      p.diffSpline.toExponential(3)
  }));

  renderizarTabla('tabla-resultados-c', {
    columnas: ['Día', 'Precio real', 'Lagrange', 'Splines', 'Error Lagrange', 'Error Splines'],
    filas,
    columnasNumericas: ['Precio real', 'Lagrange', 'Splines', 'Error Lagrange', 'Error Splines']
  });
}

// ─── Gráfico de diferencia entre métodos ─────────────────────
function _renderizarGraficoDiferencia(diferencia) {
  const canvas = document.getElementById(CHART_ERROR_ID);
  if (!canvas) return;
  if (chartError) { chartError.destroy(); chartError = null; }

  chartError = renderizarGrafico(CHART_ERROR_ID, {
    type: 'line',
    data: {
      datasets: [{
        label: '|Lagrange − Splines|',
        data: diferencia.map(d => ({ x: d.x, y: parseFloat(d.diff.toFixed(8)) })),
        borderColor: '#6C8C74',
        backgroundColor: 'rgba(108,140,116,0.12)',
        borderWidth: 1.5,
        pointRadius: 0,
        fill: true,
        tension: 0.3
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      parsing: false,
      plugins: { legend: { position: 'top' } },
      scales: {
        x: {
          type: 'linear',
          title: { display: true, text: 'Día' }
        },
        y: {
          title: { display: true, text: 'Diferencia absoluta' },
          beginAtZero: true
        }
      }
    }
  });
}

// ─── Interpretación económica ─────────────────────────────────
function _renderizarInterpretacion({ xs, ys, n }, { stats, evalPuntual }) {
  const contenedor = document.getElementById('interpretacion-c');
  if (!contenedor) return;

  const xMin = xs[0];
  const xMax = xs[xs.length - 1];

  // Detectar fenómeno de Runge (oscilaciones en los extremos) para grado alto
  const advertenciaRunge = n >= 7
    ? `<div class="alert alert--warning">
        ⚠ <strong>Fenómeno de Runge:</strong> Con ${n} puntos, el polinomio de Lagrange
        (grado ${n - 1}) puede presentar oscilaciones severas cerca de los extremos del
        intervalo. Se recomienda preferir los <strong>splines cúbicos</strong> para
        esta cantidad de datos.
       </div>`
    : '';

  const evalTexto = evalPuntual
    ? `<p>Para el <strong>día ${evalPuntual.x}</strong> (no observado directamente),
       Lagrange estima un precio de <strong>${evalPuntual.lagrange.toFixed(4)}</strong>
       y Splines de <strong>${evalPuntual.spline.toFixed(4)}</strong>.
       La diferencia es <strong>${Math.abs(evalPuntual.lagrange - evalPuntual.spline).toFixed(6)}</strong>,
       ${Math.abs(evalPuntual.lagrange - evalPuntual.spline) < 0.01
         ? 'lo que indica alta consistencia entre ambos métodos en ese punto.'
         : 'lo que sugiere revisar si el punto está en una zona de alta variabilidad.'}
      </p>`
    : '';

  contenedor.innerHTML = `
    ${advertenciaRunge}

    <h3>Análisis de la dinámica de precios</h3>
    <p>
      Los datos cubren del día <strong>${xMin}</strong> al <strong>${xMax}</strong>,
      mostrando una variación total de <strong>${stats.variacion}%</strong>.
      El precio máximo registrado fue <strong>${stats.precioMax.toFixed(2)}</strong>
      en el día <strong>${stats.diaMaxPrecio}</strong>.
    </p>
    ${evalTexto}

    <h3>Comparación de métodos</h3>
    <ul>
      <li>
        <strong>Lagrange:</strong> Construye un único polinomio de grado ${n - 1} que pasa
        exactamente por todos los puntos. Es simple pero puede oscilar entre puntos
        (<em>overfitting</em> para n grande). Error en puntos conocidos: esencialmente cero.
      </li>
      <li>
        <strong>Splines cúbicos naturales:</strong> Divide el intervalo en tramos con
        polinomios de grado 3, garantizando continuidad hasta la segunda derivada (suavidad C²).
        Produce curvas más realistas para datos de precios con cambios abruptos.
        La divergencia máxima entre métodos fue
        <strong>${stats.maxDiff.toFixed(6)}</strong>
        cerca del día <strong>${stats.xMaxDiff?.toFixed(1)}</strong>.
      </li>
    </ul>

    <h3>Recomendaciones para análisis de crisis</h3>
    <ul>
      <li>
        Usar <strong>splines cúbicos</strong> para proyecciones de precios en reportes
        oficiales (curvas más estables y realistas).
      </li>
      <li>
        Lagrange es útil como verificación rápida cuando hay pocos puntos (≤ 5).
      </li>
      <li>
        Recolectar datos más frecuentes alrededor del
        día ${stats.diaMaxPrecio} (pico de precio) para reducir la incertidumbre
        en la zona de mayor variabilidad.
      </li>
      <li>
        La variación de <strong>${stats.variacion}%</strong> en el período indica
        ${parseFloat(stats.variacion) > 150
          ? 'una crisis de precios severa que requiere intervención de emergencia.'
          : parseFloat(stats.variacion) > 50
            ? 'presión significativa sobre el poder adquisitivo de la población.'
            : 'fluctuaciones moderadas, consistentes con escasez temporal.'}
      </li>
    </ul>
  `;
}

// ─── Restablecer todo ────────────────────────────────────────
function _restablecerTodo() {
  filasActuales = [];
  _inicializarTablaEntrada([
    { dia: 0, precio: 0 },
    { dia: 5, precio: 0 },
    { dia: 10, precio: 0 }
  ]);

  limpiarErrores(['error-datos-c', 'error-x-eval']);

  const divResultados = document.getElementById('resultados-c');
  if (divResultados) divResultados.hidden = true;

  if (chartPrincipal) { chartPrincipal.destroy(); chartPrincipal = null; }
  if (chartError)     { chartError.destroy();     chartError     = null; }

  mostrarNotificacion('Datos limpiados. Ingresa nuevos puntos o carga el ejemplo.', 'info');
}