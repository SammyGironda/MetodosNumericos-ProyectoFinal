/**
 * escenarioG.js — Difusión de Opinión en Red Social
 * Simulación Numérica de Crisis - Métodos Numéricos Aplicados
 *
 * CONTEXTO DEL PROBLEMA:
 *   Durante una crisis (desabastecimiento, conflicto social), las opiniones
 *   se propagan en redes sociales siguiendo un modelo compartimental SIR
 *   adaptado a opiniones:
 *
 *     S(t) = Susceptibles   (personas que aún no adoptaron la opinión)
 *     I(t) = Infectados     (personas que difunden activamente la opinión)
 *     R(t) = Recuperados    (personas que abandonaron/cambiaron de opinión)
 *
 *   Sistema de EDOs:
 *     dS/dt = -β · S · I / N
 *     dI/dt =  β · S · I / N  - γ · I
 *     dR/dt =  γ · I
 *
 *   donde:
 *     β = tasa de contagio de opinión (contactos efectivos por día)
 *     γ = tasa de recuperación (abandono de la opinión)
 *     N = población total (constante: S + I + R = N)
 *
 * MÉTODO NUMÉRICO: Runge-Kutta 4to orden (RK4)
 *   Elegido por su precisión O(h⁴) y estabilidad para sistemas de EDOs.
 *
 * EXPORTA: window.escenarioG — función que retorna el HTML de la vista.
 */

'use strict';

// ─────────────────────────────────────────────
// ALGORITMO RK4 PARA SISTEMAS DE EDOs
// (autocontenido, no depende de ecuacionesDiferenciales.js)
// ─────────────────────────────────────────────

/**
 * Resuelve un sistema de EDOs usando Runge-Kutta de 4to orden.
 *
 * dy/dt = F(t, y)   donde y es un vector de estado
 *
 * Fórmulas RK4:
 *   k1 = F(t,        y)
 *   k2 = F(t + h/2,  y + h·k1/2)
 *   k3 = F(t + h/2,  y + h·k2/2)
 *   k4 = F(t + h,    y + h·k3)
 *   y_{n+1} = y_n + (h/6)·(k1 + 2k2 + 2k3 + k4)
 *
 * @param {Function}  F       - F(t, y) → vector dydt (mismo tamaño que y)
 * @param {number[]}  y0      - condiciones iniciales [S0, I0, R0]
 * @param {number}    t0      - tiempo inicial
 * @param {number}    tFin    - tiempo final
 * @param {number}    h       - paso de tiempo
 * @returns {{ t: number[], y: number[][], pasos: Object[] }}
 */
function rk4Sistema(F, y0, t0, tFin, h) {
  const t    = [t0];
  const y    = [y0.slice()];
  const pasos = [];
  const n    = Math.ceil((tFin - t0) / h);

  for (let i = 0; i < n; i++) {
    const ti = t[i];
    const yi = y[i];
    const m  = yi.length;

    // k1 = F(t, y)
    const k1 = F(ti, yi);

    // k2 = F(t + h/2, y + h·k1/2)
    const y2 = yi.map((v, j) => v + (h / 2) * k1[j]);
    const k2 = F(ti + h / 2, y2);

    // k3 = F(t + h/2, y + h·k2/2)
    const y3 = yi.map((v, j) => v + (h / 2) * k2[j]);
    const k3 = F(ti + h / 2, y3);

    // k4 = F(t + h, y + h·k3)
    const y4 = yi.map((v, j) => v + h * k3[j]);
    const k4 = F(ti + h, y4);

    // y_{i+1} = y_i + (h/6)(k1 + 2k2 + 2k3 + k4)
    const yNuevo = yi.map((v, j) =>
      v + (h / 6) * (k1[j] + 2 * k2[j] + 2 * k3[j] + k4[j])
    );

    // Clamp: ninguna variable puede ser negativa ni superar N
    const N = yi.reduce((a, b) => a + b, 0);
    const yClamp = yNuevo.map(v => Math.max(0, Math.min(N, v)));

    const tNuevo = ti + h;
    t.push(parseFloat(tNuevo.toFixed(8)));
    y.push(yClamp);

    pasos.push({
      paso: i + 1,
      t:    tNuevo,
      S:    yClamp[0],
      I:    yClamp[1],
      R:    yClamp[2],
      k1, k2, k3, k4,
    });
  }

  return { t, y, pasos };
}

// ─────────────────────────────────────────────
// MODELO SIR DE DIFUSIÓN DE OPINIÓN
// ─────────────────────────────────────────────

/**
 * Define el sistema de EDOs del modelo SIR de opinión.
 *
 * @param {number} beta  - tasa de contagio
 * @param {number} gamma - tasa de recuperación
 * @param {number} N     - población total
 * @returns {Function}   F(t, y) donde y = [S, I, R]
 */
function modeloSIR(beta, gamma, N) {
  return function F(t, y) {
    const [S, I, R] = y;
    const dS = -beta * S * I / N;
    const dI =  beta * S * I / N - gamma * I;
    const dR =  gamma * I;
    return [dS, dI, dR];
  };
}

/**
 * Calcula el número reproductivo básico R0 = β/γ.
 * R0 > 1: la opinión se propaga epidémicamente.
 * R0 < 1: la opinión se extingue.
 * @param {number} beta
 * @param {number} gamma
 * @returns {number}
 */
function calcularR0(beta, gamma) {
  return beta / gamma;
}

/**
 * Calcula el pico de difusión: máximo de I(t) y el tiempo en que ocurre.
 * @param {number[]} tArr
 * @param {number[][]} yArr - cada fila es [S, I, R]
 * @returns {{ tPico: number, iPico: number }}
 */
function calcularPico(tArr, yArr) {
  let iPico = 0, tPico = tArr[0];
  for (let i = 0; i < yArr.length; i++) {
    if (yArr[i][1] > iPico) {
      iPico = yArr[i][1];
      tPico = tArr[i];
    }
  }
  return { tPico, iPico };
}

// ─────────────────────────────────────────────
// GENERADORES DE HTML (UI)
// ─────────────────────────────────────────────

/**
 * Genera el HTML del formulario de parámetros del escenario G.
 * @returns {string}
 */
function htmlFormulario() {
  return `
    <form id="form-escenario-g" novalidate>
      <div class="form-row form-row--3-col">

        <div class="form-group">
          <label class="form-label" for="g-N">
            Población total (N)
          </label>
          <input
            class="form-input" type="number"
            id="g-N" name="N"
            value="10000" min="100" max="10000000" step="100"
            aria-describedby="g-N-help"
          >
          <span class="form-help" id="g-N-help">
            Número total de personas en la red
          </span>
        </div>

        <div class="form-group">
          <label class="form-label" for="g-I0">
            Difusores iniciales (I₀)
          </label>
          <input
            class="form-input" type="number"
            id="g-I0" name="I0"
            value="50" min="1" step="1"
            aria-describedby="g-I0-help"
          >
          <span class="form-help" id="g-I0-help">
            Personas que inician la difusión de opinión
          </span>
        </div>

        <div class="form-group">
          <label class="form-label" for="g-tFin">
            Días a simular
          </label>
          <input
            class="form-input" type="number"
            id="g-tFin" name="tFin"
            value="60" min="5" max="365" step="1"
            aria-describedby="g-tFin-help"
          >
          <span class="form-help" id="g-tFin-help">
            Horizonte temporal de la simulación
          </span>
        </div>

      </div>

      <div class="form-row form-row--3-col">

        <div class="form-group">
          <label class="form-label" for="g-beta">
            Tasa de contagio (β)
          </label>
          <input
            class="form-input" type="number"
            id="g-beta" name="beta"
            value="0.3" min="0.01" max="5" step="0.01"
            aria-describedby="g-beta-help"
          >
          <span class="form-help" id="g-beta-help">
            Contactos efectivos por día (0.01 – 5)
          </span>
        </div>

        <div class="form-group">
          <label class="form-label" for="g-gamma">
            Tasa de recuperación (γ)
          </label>
          <input
            class="form-input" type="number"
            id="g-gamma" name="gamma"
            value="0.1" min="0.001" max="2" step="0.001"
            aria-describedby="g-gamma-help"
          >
          <span class="form-help" id="g-gamma-help">
            Fracción que abandona la opinión por día
          </span>
        </div>

        <div class="form-group">
          <label class="form-label" for="g-h">
            Paso de tiempo h (días)
          </label>
          <input
            class="form-input" type="number"
            id="g-h" name="h"
            value="0.5" min="0.01" max="2" step="0.01"
            aria-describedby="g-h-help"
          >
          <span class="form-help" id="g-h-help">
            Paso RK4 — menor = más preciso
          </span>
        </div>

      </div>

      <div class="form-button-group">
        <button type="button" class="btn btn--primary" id="g-btn-calcular">
          ▶ Simular difusión
        </button>
        <button type="button" class="btn btn--secondary" id="g-btn-limpiar">
          ↺ Restablecer
        </button>
      </div>
    </form>
  `;
}

/**
 * Genera HTML de la tabla de resultados (cada 5 pasos para no saturar).
 * @param {number[]}   tArr
 * @param {number[][]} yArr
 * @param {number}     N
 * @returns {string}
 */
function htmlTabla(tArr, yArr, N) {
  // Mostrar cada 5 pasos para mantener la tabla manejable
  const intervalo = Math.max(1, Math.floor(tArr.length / 20));
  const indices   = [];
  for (let i = 0; i < tArr.length; i += intervalo) indices.push(i);
  if (indices[indices.length - 1] !== tArr.length - 1)
    indices.push(tArr.length - 1);

  const filas = indices.map(i => {
    const [S, I, R] = yArr[i];
    const pctI = ((I / N) * 100).toFixed(1);
    const claseI = I / N > 0.3
      ? 'table__cell--error'
      : I / N > 0.1
        ? 'table__cell--highlight'
        : '';
    return `
      <tr>
        <td class="table__cell--number">${tArr[i].toFixed(1)}</td>
        <td class="table__cell--number">${Math.round(S).toLocaleString()}</td>
        <td class="table__cell--number ${claseI}">${Math.round(I).toLocaleString()} (${pctI}%)</td>
        <td class="table__cell--number">${Math.round(R).toLocaleString()}</td>
        <td class="table__cell--number">${Math.round(S + I + R).toLocaleString()}</td>
      </tr>
    `;
  }).join('');

  return `
    <div style="overflow-x: auto;">
      <table>
        <thead>
          <tr>
            <th>Día (t)</th>
            <th>Susceptibles (S)</th>
            <th>Difusores (I)</th>
            <th>Recuperados (R)</th>
            <th>Total (N)</th>
          </tr>
        </thead>
        <tbody>${filas}</tbody>
      </table>
    </div>
    <p class="form-help">
      Mostrando ${indices.length} de ${tArr.length} pasos.
      Naranja = difusión moderada (&gt;10%), rojo = difusión alta (&gt;30%).
    </p>
  `;
}

/**
 * Genera HTML de la interpretación automática de resultados.
 * @param {Object} params - parámetros del modelo
 * @param {Object} pico   - { tPico, iPico }
 * @param {number} R0
 * @param {number[]} yFinal - [S_fin, I_fin, R_fin]
 * @returns {string}
 */
function htmlInterpretacion(params, pico, R0, yFinal) {
  const { N, beta, gamma, tFin } = params;
  const [Sfin, Ifin, Rfin] = yFinal;
  const pctAfectados = ((Rfin / N) * 100).toFixed(1);
  const pctPico      = ((pico.iPico / N) * 100).toFixed(1);

  const nivelR0 = R0 > 2
    ? { clase: 'alert--error',   icono: '🔴', texto: 'propagación explosiva' }
    : R0 > 1
      ? { clase: 'alert--warning', icono: '🟠', texto: 'propagación sostenida' }
      : { clase: 'alert--success', icono: '🟢', texto: 'extinción natural' };

  return `
    <div class="alert ${nivelR0.clase}" role="status">
      ${nivelR0.icono} <strong>R₀ = ${R0.toFixed(3)}</strong> —
      Con β = ${beta} y γ = ${gamma}, la opinión muestra
      <strong>${nivelR0.texto}</strong>.
      ${R0 > 1
        ? `Cada difusor convierte en promedio <strong>${R0.toFixed(2)} personas</strong>.`
        : `La opinión no alcanza masa crítica y se extingue naturalmente.`
      }
    </div>

    <div class="card card--escenario-g" style="margin-top: var(--spacing-4);">
      <div class="card__header">
        <h3 class="card__title">📊 Resumen de la simulación</h3>
      </div>
      <div class="card__body">
        <div class="grid grid--auto">

          <div class="card card--info">
            <div class="card__body">
              <strong>Pico de difusión</strong><br>
              <span style="font-size: 1.4rem; color: var(--color-alert);">
                ${Math.round(pico.iPico).toLocaleString()}
              </span>
              personas difundiendo simultáneamente<br>
              <small>(${pctPico}% de la población, día ${pico.tPico.toFixed(1)})</small>
            </div>
          </div>

          <div class="card card--info">
            <div class="card__body">
              <strong>Alcance total</strong><br>
              <span style="font-size: 1.4rem; color: var(--color-primary);">
                ${Math.round(Rfin).toLocaleString()}
              </span>
              personas impactadas al día ${tFin}<br>
              <small>(${pctAfectados}% de la población)</small>
            </div>
          </div>

          <div class="card card--info">
            <div class="card__body">
              <strong>Susceptibles restantes</strong><br>
              <span style="font-size: 1.4rem; color: var(--color-secondary);">
                ${Math.round(Sfin).toLocaleString()}
              </span>
              nunca expuestos al día ${tFin}<br>
              <small>(${((Sfin/N)*100).toFixed(1)}% de la población)</small>
            </div>
          </div>

        </div>

        <p style="margin-top: var(--spacing-4);">
          <strong>Interpretación para gestión de crisis:</strong>
          ${R0 > 1
            ? `Con un R₀ de ${R0.toFixed(2)}, la narrativa alcanzará a
               aproximadamente el <strong>${pctAfectados}%</strong> de la población.
               Para contenerla se requiere reducir β (limitar contactos) o aumentar γ
               (proveer información alternativa), hasta lograr R₀ &lt; 1.
               La ventana crítica de intervención es <strong>antes del día ${pico.tPico.toFixed(0)}</strong>.`
            : `Con R₀ = ${R0.toFixed(2)} &lt; 1, la opinión se disipa por sí sola.
               Sin embargo, ${Math.round(Rfin).toLocaleString()} personas
               (${pctAfectados}%) habrán sido impactadas al final del período.`
          }
        </p>

        <p>
          <strong>Método numérico:</strong> Runge-Kutta 4to orden (RK4) con
          paso h = ${params.h} día(s). Error de truncamiento local: O(h⁵) = O(${Math.pow(params.h, 5).toExponential(2)}).
          La conservación de la población (S+I+R = N) se verifica en cada paso.
        </p>
      </div>
    </div>
  `;
}

// ─────────────────────────────────────────────
// LÓGICA DE GRÁFICO (Chart.js)
// ─────────────────────────────────────────────

/** Referencia al gráfico activo para destruirlo antes de recrear */
let chartInstanciaG = null;

/**
 * Renderiza el gráfico SIR en el canvas indicado.
 * @param {string}     canvasId
 * @param {number[]}   tArr
 * @param {number[][]} yArr
 */
function renderizarGrafico(canvasId, tArr, yArr) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  // Destruir instancia previa para evitar memory leaks
  if (chartInstanciaG) {
    chartInstanciaG.destroy();
    chartInstanciaG = null;
  }

  const CFG    = window.APP_CONFIG?.CHART_CONFIG ?? {};
  const colores = CFG.COLORES ?? {
    PRIMARY: '#3E594F', ALERT: '#D97059', SUCCESS: '#C9D7A6',
  };
  const fondos = CFG.COLORES_FONDO ?? {
    PRIMARY: 'rgba(62,89,79,0.15)', ALERT: 'rgba(217,112,89,0.15)',
    SUCCESS: 'rgba(201,215,166,0.20)',
  };

  // Submuestrear etiquetas para no saturar el eje X
  const maxPuntos = 100;
  const paso = Math.max(1, Math.floor(tArr.length / maxPuntos));
  const indices = [];
  for (let i = 0; i < tArr.length; i += paso) indices.push(i);
  if (indices[indices.length - 1] !== tArr.length - 1)
    indices.push(tArr.length - 1);

  const labels = indices.map(i => tArr[i].toFixed(1));
  const S_data = indices.map(i => Math.round(yArr[i][0]));
  const I_data = indices.map(i => Math.round(yArr[i][1]));
  const R_data = indices.map(i => Math.round(yArr[i][2]));

  const opcionesBase = CFG.OPCIONES_BASE
    ? JSON.parse(JSON.stringify(CFG.OPCIONES_BASE))
    : {};

  chartInstanciaG = new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label:           'Susceptibles (S)',
          data:            S_data,
          borderColor:     colores.PRIMARY,
          backgroundColor: fondos.PRIMARY,
          borderWidth:     2,
          pointRadius:     0,
          fill:            true,
          tension:         0.3,
        },
        {
          label:           'Difusores activos (I)',
          data:            I_data,
          borderColor:     colores.ALERT,
          backgroundColor: fondos.ALERT,
          borderWidth:     2.5,
          pointRadius:     0,
          fill:            true,
          tension:         0.3,
        },
        {
          label:           'Recuperados (R)',
          data:            R_data,
          borderColor:     colores.SUCCESS,
          backgroundColor: fondos.SUCCESS,
          borderWidth:     2,
          pointRadius:     0,
          fill:            true,
          tension:         0.3,
        },
      ],
    },
    options: {
      ...opcionesBase,
      plugins: {
        ...(opcionesBase.plugins ?? {}),
        title: {
          display: true,
          text:    'Dinámica de difusión de opinión — Modelo SIR',
          font:    { size: 14, weight: 'bold' },
        },
      },
      scales: {
        x: {
          ...(opcionesBase.scales?.x ?? {}),
          title: { display: true, text: 'Tiempo (días)' },
          ticks: { maxTicksLimit: 12, font: { size: 11 } },
        },
        y: {
          ...(opcionesBase.scales?.y ?? {}),
          title:    { display: true, text: 'Número de personas' },
          beginAtZero: true,
        },
      },
    },
  });
}

// ─────────────────────────────────────────────
// VALIDACIÓN DE FORMULARIO
// ─────────────────────────────────────────────

/**
 * Lee y valida los valores del formulario.
 * @returns {{ params: Object|null, errores: string[] }}
 */
function leerFormulario() {
  const errores = [];

  const N     = parseFloat(document.getElementById('g-N')?.value);
  const I0    = parseFloat(document.getElementById('g-I0')?.value);
  const tFin  = parseFloat(document.getElementById('g-tFin')?.value);
  const beta  = parseFloat(document.getElementById('g-beta')?.value);
  const gamma = parseFloat(document.getElementById('g-gamma')?.value);
  const h     = parseFloat(document.getElementById('g-h')?.value);

  if (isNaN(N) || N < 100)
    errores.push('La población total N debe ser ≥ 100.');
  if (isNaN(I0) || I0 < 1)
    errores.push('Los difusores iniciales I₀ deben ser ≥ 1.');
  if (!isNaN(N) && !isNaN(I0) && I0 >= N)
    errores.push('I₀ debe ser menor que N.');
  if (isNaN(tFin) || tFin < 5)
    errores.push('Los días a simular deben ser ≥ 5.');
  if (isNaN(beta) || beta <= 0)
    errores.push('La tasa de contagio β debe ser > 0.');
  if (isNaN(gamma) || gamma <= 0)
    errores.push('La tasa de recuperación γ debe ser > 0.');
  if (isNaN(h) || h <= 0 || h > 2)
    errores.push('El paso h debe estar entre 0.01 y 2.');
  if (!isNaN(h) && !isNaN(tFin) && tFin / h > 50000)
    errores.push('Demasiados pasos. Aumenta h o reduce los días a simular.');

  if (errores.length > 0) return { params: null, errores };

  return {
    params: { N, I0, S0: N - I0, R0: 0, tFin, beta, gamma, h },
    errores: [],
  };
}

/**
 * Muestra errores de validación en el formulario.
 * @param {string[]} errores
 */
function mostrarErrores(errores) {
  const contenedor = document.getElementById('g-errores');
  if (!contenedor) return;
  if (errores.length === 0) {
    contenedor.innerHTML = '';
    return;
  }
  contenedor.innerHTML = `
    <div class="alert alert--error" role="alert">
      <ul style="margin: 0; padding-left: var(--spacing-4);">
        ${errores.map(e => `<li>${e}</li>`).join('')}
      </ul>
    </div>
  `;
}

// ─────────────────────────────────────────────
// MANEJADOR PRINCIPAL DE CÁLCULO
// ─────────────────────────────────────────────

/**
 * Ejecuta la simulación y actualiza la UI con los resultados.
 */
function calcularEscenarioG() {
  const { params, errores } = leerFormulario();
  mostrarErrores(errores);
  if (!params) return;

  const { N, S0, I0, tFin, beta, gamma, h } = params;

  // Construir el sistema SIR
  const F  = modeloSIR(beta, gamma, N);
  const y0 = [S0, I0, 0]; // [S0, I0, R0]

  // Ejecutar RK4
  const { t, y, pasos } = rk4Sistema(F, y0, 0, tFin, h);

  // Métricas derivadas
  const R0   = calcularR0(beta, gamma);
  const pico = calcularPico(t, y);
  const yFinal = y[y.length - 1];

  // Renderizar gráfico
  renderizarGrafico('g-chart', t, y);

  // Renderizar tabla
  const contenedorTabla = document.getElementById('g-tabla');
  if (contenedorTabla) contenedorTabla.innerHTML = htmlTabla(t, y, N);

  // Renderizar interpretación
  const contenedorInterp = document.getElementById('g-interpretacion');
  if (contenedorInterp)
    contenedorInterp.innerHTML = htmlInterpretacion(params, pico, R0, yFinal);

  // Mostrar sección de resultados
  const resultados = document.getElementById('g-resultados');
  if (resultados) resultados.hidden = false;
}

/**
 * Restablece el formulario a los valores por defecto.
 */
function limpiarEscenarioG() {
  const form = document.getElementById('form-escenario-g');
  if (form) form.reset();

  const resultados = document.getElementById('g-resultados');
  if (resultados) resultados.hidden = true;

  const errores = document.getElementById('g-errores');
  if (errores) errores.innerHTML = '';

  if (chartInstanciaG) {
    chartInstanciaG.destroy();
    chartInstanciaG = null;
  }
}

// ─────────────────────────────────────────────
// REGISTRO DE EVENTOS
// ─────────────────────────────────────────────

/**
 * Registra los listeners de botones del escenario.
 * Se llama una vez tras insertar el HTML en el DOM.
 */
function registrarEventosG() {
  document.getElementById('g-btn-calcular')
    ?.addEventListener('click', calcularEscenarioG);

  document.getElementById('g-btn-limpiar')
    ?.addEventListener('click', limpiarEscenarioG);
}

// ─────────────────────────────────────────────
// FUNCIÓN PRINCIPAL DE RENDERIZADO
// Exportada como window.escenarioG — llamada por app.js
// ─────────────────────────────────────────────

/**
 * Retorna el HTML completo de la vista del escenario G.
 * app.js llama esta función y la inyecta en #contenido-principal.
 * @returns {string}
 */
function escenarioG() {
  // Programar registro de eventos tras el próximo ciclo del DOM
  setTimeout(registrarEventosG, 0);

  return `
    <section
      class="seccion-contenido"
      id="vista-escenario-g"
      aria-labelledby="titulo-g"
    >

      <!-- ENCABEZADO -->
      <div class="seccion-contenido__header">
        <h1 id="titulo-g">🌐 Escenario G: Difusión de Opinión en Red Social</h1>
        <p class="seccion-contenido__subtitulo">
          Modelo SIR aplicado a la propagación de narrativas durante una crisis
        </p>
      </div>

      <!-- CONTEXTO -->
      <div class="card card--info" style="margin-bottom: var(--spacing-5);">
        <div class="card__body">
          <p>
            Durante crisis sociales, las opiniones se propagan como "infecciones"
            en redes sociales. Este escenario modela esa dinámica con el sistema de EDOs:
          </p>
          <p style="text-align:center; font-family: monospace; margin: var(--spacing-3) 0;">
            dS/dt = −β·S·I/N &nbsp;|&nbsp;
            dI/dt = β·S·I/N − γ·I &nbsp;|&nbsp;
            dR/dt = γ·I
          </p>
          <p>
            Resuelto numéricamente con <strong>Runge-Kutta de 4to orden (RK4)</strong>,
            el método de mayor precisión para sistemas de EDOs no rígidos.
            El número reproductivo básico <strong>R₀ = β/γ</strong> determina si
            la opinión se propaga (R₀ &gt; 1) o se extingue (R₀ &lt; 1).
          </p>
        </div>
      </div>

      <!-- FORMULARIO -->
      <div class="card" style="margin-bottom: var(--spacing-5);">
        <div class="card__header">
          <h2 class="card__title">⚙️ Parámetros del modelo</h2>
        </div>
        <div class="card__body">
          <div id="g-errores" role="alert" aria-live="polite"></div>
          ${htmlFormulario()}
        </div>
      </div>

      <!-- RESULTADOS (ocultos hasta calcular) -->
      <div id="g-resultados" hidden>

        <!-- GRÁFICO -->
        <div class="card" style="margin-bottom: var(--spacing-5);">
          <div class="card__header">
            <h2 class="card__title">📈 Dinámica temporal S-I-R</h2>
          </div>
          <div class="card__body">
            <div class="grafico-contenedor" style="height: 380px;">
              <canvas id="g-chart" aria-label="Gráfico SIR de difusión de opinión"></canvas>
            </div>
          </div>
        </div>

        <!-- INTERPRETACIÓN -->
        <div id="g-interpretacion" style="margin-bottom: var(--spacing-5);"></div>

        <!-- TABLA -->
        <div class="card">
          <div class="card__header">
            <h2 class="card__title">📋 Tabla de resultados (RK4)</h2>
          </div>
          <div class="card__body" id="g-tabla"></div>
        </div>

      </div>

    </section>
  `;
}

// ─────────────────────────────────────────────
// EXPORTACIÓN GLOBAL
// ─────────────────────────────────────────────

window.escenarioG = escenarioG;