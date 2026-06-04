// ============================================================
// escenarioB.js - Escenario B: Vaciado de Reservas
// Métodos: Euler, Heun (Euler mejorado), RK4
// Contexto: Simulación de vaciado de reservas de agua/combustible
//           durante una crisis de abastecimiento
// ============================================================

import { euler, heun, rk4 } from '../core/ecuacionesDiferenciales.js';
import { renderizarGrafico } from '../ui/graficos.js';
import { renderizarTabla } from '../ui/tablas.js';
import { mostrarNotificacion } from '../ui/notificaciones.js';
import { validarCampo, mostrarErrores, limpiarErrores } from '../ui/formularios.js';
import { ESCENARIOS, IDS } from '../constantes.js';

// ─── Constantes del escenario ───────────────────────────────
const ID_ESCENARIO = 'escenario-b';
const CHART_ID     = 'grafico-reservas';
let chartInstance  = null;

// ─── Definición del problema ────────────────────────────────
/**
 * Modelo matemático de vaciado de reservas:
 *
 *   dV/dt = -k * V^n + Q(t)
 *
 * donde:
 *   V(t)  = volumen de reservas en el tiempo t  [unidades]
 *   k     = tasa de consumo/extracción           [1/día]
 *   n     = exponente del modelo (1 = lineal, 0.5 = tipo Torricelli)
 *   Q(t)  = tasa de reposición (puede ser 0 en crisis)
 *   V0    = volumen inicial                       [unidades]
 */

// ─── Función principal: renderizar el escenario ────────────
export function renderizarEscenarioB(contenedor) {
  chartInstance = null;

  contenedor.innerHTML = `
    <section class="escenario" id="${ID_ESCENARIO}" aria-labelledby="titulo-esc-b">

      <!-- ENCABEZADO -->
      <div class="escenario__header card card--escenario-b">
        <div class="card__body">
          <div class="escenario__titulo-grupo">
            <span class="badge badge--escenario-b">Escenario B</span>
            <h1 id="titulo-esc-b" class="escenario__titulo">
              Vaciado de Reservas durante Crisis de Abastecimiento
            </h1>
          </div>
          <p class="escenario__descripcion">
            Modela la dinámica de consumo de reservas estratégicas (agua, combustible, alimentos)
            durante una crisis. Utiliza <strong>Ecuaciones Diferenciales Ordinarias (EDO)</strong>
            resueltas por tres métodos numéricos: Euler, Heun (Euler mejorado) y Runge-Kutta 4.
          </p>
          <div class="escenario__formula">
            <code>dV/dt = −k · Vⁿ + Q(t)</code>
            <p class="form-help">
              V = volumen de reservas, k = tasa de consumo, n = exponente del modelo, Q = reposición
            </p>
          </div>
        </div>
      </div>

      <!-- FORMULARIO DE PARÁMETROS -->
      <div class="card">
        <div class="card__header">
          <h2 class="card__title">Parámetros del Modelo</h2>
        </div>
        <div class="card__body">
          <form id="form-reservas" novalidate>
            <div class="form-row form-row--2-col">

              <div class="form-group">
                <label class="form-label" for="v0">
                  Volumen inicial V₀ <span aria-hidden="true">*</span>
                </label>
                <input
                  class="form-input"
                  type="number"
                  id="v0"
                  name="v0"
                  value="1000"
                  min="1"
                  step="any"
                  aria-required="true"
                  placeholder="Ej: 1000"
                />
                <span class="form-help">Unidades de reserva al inicio de la crisis</span>
                <span class="form-error" id="error-v0" aria-live="polite"></span>
              </div>

              <div class="form-group">
                <label class="form-label" for="k">
                  Tasa de consumo k <span aria-hidden="true">*</span>
                </label>
                <input
                  class="form-input"
                  type="number"
                  id="k"
                  name="k"
                  value="0.05"
                  min="0.0001"
                  max="10"
                  step="any"
                  aria-required="true"
                  placeholder="Ej: 0.05"
                />
                <span class="form-help">Fracción de reservas consumidas por unidad de tiempo</span>
                <span class="form-error" id="error-k" aria-live="polite"></span>
              </div>

              <div class="form-group">
                <label class="form-label" for="n-exp">
                  Exponente del modelo n
                </label>
                <select class="form-input" id="n-exp" name="n-exp">
                  <option value="1" selected>n = 1 (lineal – consumo proporcional a reservas)</option>
                  <option value="0.5">n = 0.5 (Torricelli – vaciado hidráulico)</option>
                  <option value="2">n = 2 (cuadrático – presión creciente)</option>
                </select>
                <span class="form-help">Tipo de comportamiento del sistema de reservas</span>
              </div>

              <div class="form-group">
                <label class="form-label" for="q-repo">
                  Tasa de reposición Q
                </label>
                <input
                  class="form-input"
                  type="number"
                  id="q-repo"
                  name="q-repo"
                  value="0"
                  min="0"
                  step="any"
                  placeholder="Ej: 5"
                />
                <span class="form-help">0 = crisis total sin reposición; valor positivo = reposición constante</span>
                <span class="form-error" id="error-q" aria-live="polite"></span>
              </div>

              <div class="form-group">
                <label class="form-label" for="t-final">
                  Tiempo total (días) <span aria-hidden="true">*</span>
                </label>
                <input
                  class="form-input"
                  type="number"
                  id="t-final"
                  name="t-final"
                  value="30"
                  min="1"
                  max="365"
                  step="1"
                  aria-required="true"
                  placeholder="Ej: 30"
                />
                <span class="form-help">Horizonte de simulación en días</span>
                <span class="form-error" id="error-t" aria-live="polite"></span>
              </div>

              <div class="form-group">
                <label class="form-label" for="pasos">
                  Número de pasos h <span aria-hidden="true">*</span>
                </label>
                <input
                  class="form-input"
                  type="number"
                  id="pasos"
                  name="pasos"
                  value="30"
                  min="5"
                  max="1000"
                  step="1"
                  aria-required="true"
                  placeholder="Ej: 30"
                />
                <span class="form-help">Mayor número de pasos = mayor precisión (recomendado: igual al tiempo)</span>
                <span class="form-error" id="error-pasos" aria-live="polite"></span>
              </div>

            </div><!-- /form-row -->

            <div class="form-button-group">
              <button
                type="submit"
                class="btn btn--primary"
                id="btn-calcular-b"
              >
                Simular vaciado de reservas
              </button>
              <button
                type="button"
                class="btn btn--secondary"
                id="btn-reset-b"
              >
                Restablecer valores
              </button>
            </div>

          </form>
        </div>
      </div><!-- /card parámetros -->

      <!-- RESULTADOS: inicialmente ocultos -->
      <div id="resultados-b" class="resultados" hidden aria-live="polite">

        <!-- MÉTRICAS RÁPIDAS -->
        <div class="card">
          <div class="card__header">
            <h2 class="card__title">Resumen de la Simulación</h2>
          </div>
          <div class="card__body">
            <div class="grid grid--4-col" id="metricas-b"></div>
          </div>
        </div>

        <!-- GRÁFICO -->
        <div class="card">
          <div class="card__header">
            <h2 class="card__title">Evolución de las Reservas en el Tiempo</h2>
          </div>
          <div class="card__body">
            <div class="grafico-contenedor" style="height: 400px;">
              <canvas id="${CHART_ID}" role="img" aria-label="Gráfico de evolución de reservas"></canvas>
            </div>
          </div>
        </div>

        <!-- TABLA DE RESULTADOS -->
        <div class="card">
          <div class="card__header">
            <h2 class="card__title">Tabla Comparativa de Métodos</h2>
          </div>
          <div class="card__body">
            <div id="tabla-reservas" class="tabla-contenedor"></div>
          </div>
        </div>

        <!-- ANÁLISIS DE ERROR -->
        <div class="card">
          <div class="card__header">
            <h2 class="card__title">Análisis de Error Relativo vs. RK4</h2>
          </div>
          <div class="card__body">
            <div class="grafico-contenedor" style="height: 300px;">
              <canvas id="grafico-error-b" role="img" aria-label="Gráfico de error relativo"></canvas>
            </div>
          </div>
        </div>

        <!-- INTERPRETACIÓN -->
        <div class="card card--info" id="interpretacion-b">
          <div class="card__header">
            <h2 class="card__title">Interpretación de Resultados</h2>
          </div>
          <div class="card__body" id="texto-interpretacion-b">
            <!-- Generado dinámicamente -->
          </div>
        </div>

      </div><!-- /resultados -->

    </section>
  `;

  // Registrar eventos
  _registrarEventos();
}

// ─── Registro de eventos ─────────────────────────────────────
function _registrarEventos() {
  const form    = document.getElementById('form-reservas');
  const btnReset = document.getElementById('btn-reset-b');

  if (form)     form.addEventListener('submit', _manejarCalculo);
  if (btnReset) btnReset.addEventListener('click', _restablecerFormulario);
}

// ─── Manejador principal del formulario ─────────────────────
function _manejarCalculo(evento) {
  evento.preventDefault();
  limpiarErrores(['error-v0', 'error-k', 'error-q', 'error-t', 'error-pasos']);

  // Leer y validar parámetros
  const params = _leerParametros();
  if (!params) return; // validación falló

  // Ejecutar los tres métodos
  const resultados = _ejecutarMetodos(params);

  // Renderizar resultados
  _renderizarResultados(params, resultados);

  // Mostrar sección de resultados
  const divResultados = document.getElementById('resultados-b');
  if (divResultados) {
    divResultados.hidden = false;
    divResultados.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  mostrarNotificacion('Simulación completada correctamente', 'success');
}

// ─── Lectura y validación de parámetros ─────────────────────
function _leerParametros() {
  const v0     = parseFloat(document.getElementById('v0').value);
  const k      = parseFloat(document.getElementById('k').value);
  const n      = parseFloat(document.getElementById('n-exp').value);
  const Q      = parseFloat(document.getElementById('q-repo').value) || 0;
  const tFinal = parseFloat(document.getElementById('t-final').value);
  const pasos  = parseInt(document.getElementById('pasos').value, 10);

  let valido = true;

  if (isNaN(v0) || v0 <= 0) {
    mostrarErrores({ 'error-v0': 'El volumen inicial debe ser un número positivo.' });
    valido = false;
  }
  if (isNaN(k) || k <= 0 || k > 10) {
    mostrarErrores({ 'error-k': 'La tasa k debe estar entre 0.0001 y 10.' });
    valido = false;
  }
  if (isNaN(Q) || Q < 0) {
    mostrarErrores({ 'error-q': 'La reposición Q no puede ser negativa.' });
    valido = false;
  }
  if (isNaN(tFinal) || tFinal < 1 || tFinal > 365) {
    mostrarErrores({ 'error-t': 'El tiempo total debe estar entre 1 y 365 días.' });
    valido = false;
  }
  if (isNaN(pasos) || pasos < 5 || pasos > 1000) {
    mostrarErrores({ 'error-pasos': 'El número de pasos debe estar entre 5 y 1000.' });
    valido = false;
  }

  if (!valido) return null;
  return { v0, k, n, Q, tFinal, pasos };
}

// ─── Ejecución de los tres métodos numéricos ────────────────
function _ejecutarMetodos({ v0, k, n, Q, tFinal, pasos }) {
  const h = tFinal / pasos;

  /**
   * EDO del modelo: dV/dt = f(t, V)
   * f(t, V) = -k * V^n + Q
   * Se protege contra V negativo (reserva no puede ser negativa)
   */
  const f = (t, V) => {
    const Vpos = Math.max(0, V); // sin reservas negativas
    return -k * Math.pow(Vpos, n) + Q;
  };

  // Solución analítica para n=1 (V(t) = (V0 - Q/k)*e^(-kt) + Q/k)
  const analitica = (n === 1)
    ? _solucionAnaliticaLineal(v0, k, Q, h, pasos)
    : null;

  const resultadoEuler = euler(f, v0, 0, tFinal, h);
  const resultadoHeun  = heun(f, v0, 0, tFinal, h);
  const resultadoRK4   = rk4(f, v0, 0, tFinal, h);

  return { euler: resultadoEuler, heun: resultadoHeun, rk4: resultadoRK4, analitica };
}

// ─── Solución analítica para modelo lineal (n=1) ────────────
function _solucionAnaliticaLineal(v0, k, Q, h, pasos) {
  const estacionario = Q / k; // V_estacionario = Q/k
  const puntos = [];

  for (let i = 0; i <= pasos; i++) {
    const t = i * h;
    const V = (v0 - estacionario) * Math.exp(-k * t) + estacionario;
    puntos.push({ t: parseFloat(t.toFixed(6)), V: Math.max(0, V) });
  }
  return puntos;
}

// ─── Renderizado de todos los resultados ────────────────────
function _renderizarResultados(params, resultados) {
  _renderizarMetricas(params, resultados);
  _renderizarGrafico(params, resultados);
  _renderizarTabla(params, resultados);
  _renderizarGraficoError(params, resultados);
  _renderizarInterpretacion(params, resultados);
}

// ─── Métricas rápidas ───────────────────────────────────────
function _renderizarMetricas(params, resultados) {
  const contenedor = document.getElementById('metricas-b');
  if (!contenedor) return;

  const rk4Final    = resultados.rk4[resultados.rk4.length - 1].V;
  const eulerFinal  = resultados.euler[resultados.euler.length - 1].V;
  const heunFinal   = resultados.heun[resultados.heun.length - 1].V;
  const porcentaje  = ((1 - rk4Final / params.v0) * 100).toFixed(1);

  // Día en que las reservas caen bajo el 20% del inicial (nivel crítico)
  const nivelCritico = params.v0 * 0.20;
  const diaCritico   = resultados.rk4.find(p => p.V <= nivelCritico);

  const metricas = [
    {
      label: 'Reservas finales (RK4)',
      valor: `${rk4Final.toFixed(2)} u.`,
      clase: rk4Final < params.v0 * 0.2 ? 'alert' : 'success'
    },
    {
      label: 'Reducción total',
      valor: `${porcentaje}%`,
      clase: parseFloat(porcentaje) > 80 ? 'alert' : 'info'
    },
    {
      label: 'Error Euler vs RK4',
      valor: `${Math.abs(eulerFinal - rk4Final).toFixed(3)} u.`,
      clase: 'info'
    },
    {
      label: 'Día nivel crítico (20%)',
      valor: diaCritico ? `Día ${diaCritico.t.toFixed(1)}` : 'No alcanzado',
      clase: diaCritico ? 'alert' : 'success'
    }
  ];

  contenedor.innerHTML = metricas.map(m => `
    <div class="card card--${m.clase}" style="text-align:center; padding: 1rem;">
      <p class="form-help" style="margin:0 0 0.25rem;">${m.label}</p>
      <strong style="font-size: 1.4rem;">${m.valor}</strong>
    </div>
  `).join('');
}

// ─── Gráfico principal: evolución de reservas ───────────────
function _renderizarGrafico(params, resultados) {
  const canvas = document.getElementById(CHART_ID);
  if (!canvas) return;

  if (chartInstance) {
    chartInstance.destroy();
    chartInstance = null;
  }

  const labels = resultados.rk4.map(p => p.t.toFixed(1));

  const datasets = [
    {
      label: 'RK4 (más preciso)',
      data: resultados.rk4.map(p => parseFloat(p.V.toFixed(4))),
      borderColor: '#3E594F',
      backgroundColor: 'rgba(62, 89, 79, 0.08)',
      borderWidth: 2.5,
      pointRadius: 0,
      tension: 0.3,
      fill: false
    },
    {
      label: 'Heun (Euler mejorado)',
      data: resultados.heun.map(p => parseFloat(p.V.toFixed(4))),
      borderColor: '#6C8C74',
      backgroundColor: 'transparent',
      borderWidth: 2,
      borderDash: [6, 3],
      pointRadius: 0,
      tension: 0.3,
      fill: false
    },
    {
      label: 'Euler (básico)',
      data: resultados.euler.map(p => parseFloat(p.V.toFixed(4))),
      borderColor: '#D97059',
      backgroundColor: 'transparent',
      borderWidth: 1.5,
      borderDash: [3, 3],
      pointRadius: 0,
      tension: 0.3,
      fill: false
    }
  ];

  // Si existe solución analítica (n=1), agregarla
  if (resultados.analitica) {
    datasets.push({
      label: 'Solución analítica (exacta)',
      data: resultados.analitica.map(p => parseFloat(p.V.toFixed(4))),
      borderColor: '#F29966',
      backgroundColor: 'transparent',
      borderWidth: 1.5,
      borderDash: [10, 4],
      pointRadius: 0,
      tension: 0.1,
      fill: false
    });
  }

  // Línea de nivel crítico (20%)
  const nivelCritico = params.v0 * 0.20;
  datasets.push({
    label: 'Nivel crítico (20%)',
    data: new Array(labels.length).fill(nivelCritico),
    borderColor: '#D97059',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderDash: [4, 8],
    pointRadius: 0,
    fill: false
  });

  chartInstance = renderizarGrafico(CHART_ID, {
    type: 'line',
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { position: 'top' },
        tooltip: {
          callbacks: {
            label: (ctx) => `${ctx.dataset.label}: ${parseFloat(ctx.parsed.y).toFixed(2)} unidades`
          }
        }
      },
      scales: {
        x: {
          title: { display: true, text: 'Tiempo (días)' },
          ticks: { maxTicksLimit: 15 }
        },
        y: {
          title: { display: true, text: 'Volumen de reservas (unidades)' },
          min: 0,
          beginAtZero: true
        }
      }
    }
  });
}

// ─── Tabla comparativa ──────────────────────────────────────
function _renderizarTabla({ tFinal, pasos }, resultados) {
  const contenedor = document.getElementById('tabla-reservas');
  if (!contenedor) return;

  // Mostrar cada 10% del recorrido + último paso
  const paso = Math.max(1, Math.floor(pasos / 10));
  const indices = [];
  for (let i = 0; i <= pasos; i += paso) indices.push(i);
  if (indices[indices.length - 1] !== pasos) indices.push(pasos);

  const filas = indices.map(i => {
    const rk4V   = resultados.rk4[i]   ? resultados.rk4[i].V   : 0;
    const heunV  = resultados.heun[i]  ? resultados.heun[i].V  : 0;
    const eulerV = resultados.euler[i] ? resultados.euler[i].V : 0;
    const t      = resultados.rk4[i]   ? resultados.rk4[i].t   : 0;

    const errEuler = rk4V > 0 ? Math.abs((eulerV - rk4V) / rk4V * 100) : 0;
    const errHeun  = rk4V > 0 ? Math.abs((heunV  - rk4V) / rk4V * 100) : 0;

    return {
      't (días)':          t.toFixed(2),
      'V Euler':           eulerV.toFixed(4),
      'V Heun':            heunV.toFixed(4),
      'V RK4':             rk4V.toFixed(4),
      'Error Euler (%)':   errEuler.toFixed(6),
      'Error Heun (%)':    errHeun.toFixed(6)
    };
  });

  renderizarTabla('tabla-reservas', {
    columnas: ['t (días)', 'V Euler', 'V Heun', 'V RK4', 'Error Euler (%)', 'Error Heun (%)'],
    filas,
    columnasNumericas: ['V Euler', 'V Heun', 'V RK4', 'Error Euler (%)', 'Error Heun (%)'],
    resaltarUltimaFila: true
  });
}

// ─── Gráfico de error relativo ───────────────────────────────
function _renderizarGraficoError(params, resultados) {
  const canvas = document.getElementById('grafico-error-b');
  if (!canvas) return;

  const labels = resultados.rk4.map(p => p.t.toFixed(1));

  const erroresEuler = resultados.rk4.map((punto, i) => {
    const vRK4   = punto.V;
    const vEuler = resultados.euler[i] ? resultados.euler[i].V : 0;
    return vRK4 > 1e-10
      ? parseFloat(Math.abs((vEuler - vRK4) / vRK4 * 100).toFixed(6))
      : 0;
  });

  const erroresHeun = resultados.rk4.map((punto, i) => {
    const vRK4  = punto.V;
    const vHeun = resultados.heun[i] ? resultados.heun[i].V : 0;
    return vRK4 > 1e-10
      ? parseFloat(Math.abs((vHeun - vRK4) / vRK4 * 100).toFixed(6))
      : 0;
  });

  renderizarGrafico('grafico-error-b', {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Error relativo Euler (%)',
          data: erroresEuler,
          borderColor: '#D97059',
          backgroundColor: 'rgba(217,112,89,0.1)',
          borderWidth: 2,
          pointRadius: 0,
          fill: true,
          tension: 0.3
        },
        {
          label: 'Error relativo Heun (%)',
          data: erroresHeun,
          borderColor: '#6C8C74',
          backgroundColor: 'rgba(108,140,116,0.1)',
          borderWidth: 2,
          pointRadius: 0,
          fill: true,
          tension: 0.3
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'top' },
        tooltip: {
          callbacks: {
            label: (ctx) => `${ctx.dataset.label}: ${ctx.parsed.y.toFixed(6)}%`
          }
        }
      },
      scales: {
        x: { title: { display: true, text: 'Tiempo (días)' }, ticks: { maxTicksLimit: 15 } },
        y: { title: { display: true, text: 'Error relativo (%)' }, beginAtZero: true }
      }
    }
  });
}

// ─── Interpretación automática ──────────────────────────────
function _renderizarInterpretacion({ v0, k, n, Q, tFinal, pasos }, resultados) {
  const contenedor = document.getElementById('texto-interpretacion-b');
  if (!contenedor) return;

  const rk4Final    = resultados.rk4[resultados.rk4.length - 1].V;
  const eulerFinal  = resultados.euler[resultados.euler.length - 1].V;
  const heunFinal   = resultados.heun[resultados.heun.length - 1].V;
  const h           = tFinal / pasos;
  const reduccion   = ((1 - rk4Final / v0) * 100).toFixed(1);
  const nivelCritico = v0 * 0.20;
  const diaCritico  = resultados.rk4.find(p => p.V <= nivelCritico);

  const errEuler = rk4Final > 1e-10
    ? Math.abs((eulerFinal - rk4Final) / rk4Final * 100).toFixed(4)
    : '—';
  const errHeun  = rk4Final > 1e-10
    ? Math.abs((heunFinal  - rk4Final) / rk4Final * 100).toFixed(6)
    : '—';

  // Estado de la reserva
  let estadoReserva = '';
  if (rk4Final <= 0) {
    estadoReserva = `
      <div class="alert alert--error">
        ⚠ Las reservas se <strong>agotaron completamente</strong> antes del día ${tFinal}.
        Esto representa una situación de crisis total: es necesario implementar medidas
        de emergencia inmediatas.
      </div>`;
  } else if (rk4Final < nivelCritico) {
    estadoReserva = `
      <div class="alert alert--warning">
        ⚠ Las reservas cayeron al <strong>nivel crítico</strong> (menos del 20% inicial).
        Al día ${tFinal}, quedan <strong>${rk4Final.toFixed(2)} unidades</strong>, lo que
        representa apenas el ${(rk4Final / v0 * 100).toFixed(1)}% del volumen original.
      </div>`;
  } else {
    estadoReserva = `
      <div class="alert alert--success">
        ✓ Las reservas se mantuvieron por encima del nivel crítico durante toda la simulación.
        Al día ${tFinal} quedan <strong>${rk4Final.toFixed(2)} unidades</strong>
        (${(rk4Final / v0 * 100).toFixed(1)}% del inicial).
      </div>`;
  }

  // Comparación de métodos
  const comparacionMetodos = `
    <h3>Comparación de métodos numéricos</h3>
    <ul>
      <li>
        <strong>Euler (orden 1):</strong> Método más simple, error relativo final de
        <code>${errEuler}%</code> respecto a RK4. Con h = ${h.toFixed(4)} días, este error
        ${parseFloat(errEuler) > 1 ? 'puede ser significativo' : 'es aceptable'} para
        esta simulación.
      </li>
      <li>
        <strong>Heun / Euler mejorado (orden 2):</strong> Utiliza un predictor-corrector,
        reduciendo el error a <code>${errHeun}%</code>. Ofrece un balance entre
        costo computacional y precisión.
      </li>
      <li>
        <strong>RK4 (orden 4):</strong> Método de referencia con mayor precisión local
        O(h⁵). Recomendado para decisiones críticas de planificación de emergencias.
      </li>
    </ul>
  `;

  // Análisis del modelo
  const modelosTexto = {
    '1':   'El modelo <strong>lineal (n=1)</strong> representa un consumo proporcional a las reservas disponibles, típico de sistemas controlados.',
    '0.5': 'El modelo de <strong>Torricelli (n=0.5)</strong> describe el vaciado hidráulico donde la presión disminuye con el nivel, adecuado para tanques de agua.',
    '2':   'El modelo <strong>cuadrático (n=2)</strong> simula consumo acelerado bajo presión social creciente, típico de pánico masivo.'
  };

  const reposicionTexto = Q > 0
    ? `<p>Con una tasa de reposición Q = ${Q} unidades/día, el sistema tiende a un
       <strong>estado estacionario</strong> en V* = Q/k = ${(Q / k).toFixed(2)} unidades.</p>`
    : `<p>Sin reposición (Q = 0), las reservas se vacían de forma <strong>inexorable</strong>
       hacia cero. El tiempo característico de vaciado es τ = 1/k = ${(1 / k).toFixed(2)} días.</p>`;

  contenedor.innerHTML = `
    ${estadoReserva}

    <h3>Diagnóstico de la crisis</h3>
    <p>
      Partiendo de <strong>${v0} unidades</strong> de reservas con una tasa de consumo
      k = ${k}, las reservas se redujeron un <strong>${reduccion}%</strong> en
      ${tFinal} días.
      ${diaCritico
        ? `El nivel crítico (20%) se alcanzó el <strong>día ${diaCritico.t.toFixed(1)}</strong>.`
        : 'El nivel crítico (20%) <strong>no fue alcanzado</strong> en el período simulado.'}
    </p>

    <p>${modelosTexto[String(n)]}</p>
    ${reposicionTexto}

    ${comparacionMetodos}

    <h3>Recomendaciones de política</h3>
    <ul>
      ${rk4Final < nivelCritico ? '<li>Activar protocolos de emergencia de distribución racionada.</li>' : ''}
      <li>Implementar tasas de reposición Q ≥ ${(k * v0 * 0.1).toFixed(2)} unidades/día para estabilizar reservas por encima del 20%.</li>
      <li>Monitorear la tasa real k y ajustar el modelo cada 5 días para mayor precisión.</li>
      <li>Usar RK4 para proyecciones oficiales; Euler solo para estimaciones rápidas en campo.</li>
    </ul>
  `;
}

// ─── Restablecer formulario ──────────────────────────────────
function _restablecerFormulario() {
  const form = document.getElementById('form-reservas');
  if (form) form.reset();

  limpiarErrores(['error-v0', 'error-k', 'error-q', 'error-t', 'error-pasos']);

  const resultados = document.getElementById('resultados-b');
  if (resultados) resultados.hidden = true;

  if (chartInstance) {
    chartInstance.destroy();
    chartInstance = null;
  }

  mostrarNotificacion('Formulario restablecido a valores predeterminados', 'info');
}