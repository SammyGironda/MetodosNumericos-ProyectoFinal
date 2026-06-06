(function() {
// ============================================================
// escenarioB.js - Escenario B: Vaciado de Reservas
// Métodos: Euler, Heun (Euler mejorado), RK4
// Contexto: Simulación de vaciado de reservas de agua/combustible
//           durante una crisis de abastecimiento
// ============================================================

function euler(...args) {
  return window.EcuacionesDiferenciales?.euler?.(...args);
}

function heun(...args) {
  return window.EcuacionesDiferenciales?.heun?.(...args);
}

function rk4(...args) {
  return window.EcuacionesDiferenciales?.rungeKutta4?.(...args);
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
  if (tipo === 'error')   return notifier.error(mensaje);
  if (tipo === 'warning' || tipo === 'warn') return notifier.advertencia(mensaje);
  return notifier.info(mensaje);
}

function mostrarErrores(errores) {
  if (!errores || typeof errores !== 'object') return;
  Object.entries(errores).forEach(([campo, msg]) => {
    const errorEl = document.getElementById(campo);
    if (errorEl) { errorEl.textContent = msg; errorEl.style.display = 'block'; }
  });
}

function limpiarErrores(campos) {
  if (!Array.isArray(campos)) campos = [campos];
  campos.forEach((campo) => {
    const errorEl = document.getElementById(campo);
    if (errorEl) { errorEl.textContent = ''; errorEl.style.display = 'none'; }
  });
}

// ─── Constantes ─────────────────────────────────────────────
const ID_ESCENARIO = 'escenario-b';
const CHART_ID     = 'grafico-reservas';
let chartInstance  = null;

// ============================================================
// DATOS DE EJEMPLO — Lee desde window.DATOS_EJEMPLOS
// Fallback hardcodeado si el JSON no está disponible
// ============================================================
function obtenerEjemplosDisponibles() {
  const datos = window.DATOS_EJEMPLOS?.escenarios?.escenarioB?.ejemplos;
  if (datos && datos.length > 0) return datos;

  // Fallback
  return [
    {
      id: 'B0',
      nombre: 'Reserva de agua — consumo lineal (fallback)',
      dificultad: 'basico',
      descripcion: 'Tanque de agua con consumo constante sin reposición.',
      parametros: {
        y0: 1000,
        t0: 0,
        tf: 30,
        h: 0.5,
        metodo: 'rk4',
        funcion: 'consumo_lineal',
        tasa_consumo: 30,
        tasa_recarga: 5,
        // Mapeados a los campos del formulario:
        v0: 1000,
        k: 0.05,
        n_exp: '1',
        q_repo: 0,
        t_final: 30,
        pasos: 60,
      },
      interpretacion: 'El tanque se vacía gradualmente a una tasa proporcional al volumen.',
      unidades: 'm³',
    },
  ];
}

/**
 * Mapea los parámetros del JSON al formulario del escenario B.
 * El JSON usa nombres como y0, tasa_consumo, etc.
 * El formulario usa: v0, k, n-exp, q-repo, t-final, pasos
 *
 * Reglas de mapeo:
 *   v0       → y0 ?? v0
 *   k        → k ?? (tasa_consumo / y0) si existe tasa_consumo
 *   n-exp    → n_exp ?? '1'
 *   q-repo   → tasa_recarga ?? q_repo ?? 0
 *   t-final  → tf ?? t_final
 *   pasos    → pasos ?? Math.round(tf / h) ?? 60
 */
function mapearParametrosJSON(params) {
  const v0     = params.v0     ?? params.y0      ?? 1000;
  const tf     = params.t_final ?? params.tf     ?? 30;
  const hStep  = params.h      ?? 0.5;
  const pasos  = params.pasos  ?? Math.round(tf / hStep);

  // k: puede venir directo o calcularse desde tasa_consumo
  let k = params.k;
  if (k == null && params.tasa_consumo != null) {
    // tasa_consumo es absoluta (unidades/día), convertir a fracción
    k = params.tasa_consumo / v0;
  }
  k = k ?? 0.05;

  // n_exp: exponente del modelo
  const n_exp = String(params.n_exp ?? params.n ?? '1');

  // q_repo: reposición
  const q_repo = params.tasa_recarga ?? params.q_repo ?? params.Q ?? 0;

  return { v0, k, n_exp, q_repo, t_final: tf, pasos };
}

// ─── Render principal ────────────────────────────────────────
function renderizarEscenarioB(contenedor) {
  chartInstance = null;
  contenedor.innerHTML = _generarHTML();
  _registrarEventos();
  // Cargar primer ejemplo automáticamente al abrir
  _poblarSelectEjemplos();
  _cargarEjemploSeleccionado();
}

// ============================================================
// HTML DEL ESCENARIO
// ============================================================
function _generarHTML() {
  return `
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

          <!-- ── SELECTOR DE EJEMPLOS ── -->
          <div class="form-row form-row--2-col" style="margin-bottom: var(--spacing-4);">
            <div class="form-group">
              <label class="form-label" for="escB-select-ejemplo">Ejemplo precargado</label>
              <select class="form-input" id="escB-select-ejemplo">
                <option value="">— Selecciona un ejemplo —</option>
              </select>
              <span class="form-help" id="escB-ejemplo-dificultad"></span>
            </div>
            <div class="form-group" style="display:flex; align-items:flex-end; gap: var(--spacing-2);">
              <button type="button" class="btn btn--secondary btn--small" id="escB-btn-ejemplo">
                📋 Cargar Ejemplo
              </button>
              <button type="button" class="btn btn--secondary btn--small" id="btn-reset-b">
                🗑️ Restablecer
              </button>
            </div>
          </div>

          <!-- Descripción contextual del ejemplo -->
          <div id="escB-descripcion-ejemplo" class="alert alert--info mb-3" style="display:none;">
            <strong>Contexto del ejemplo cargado:</strong>
            <ul id="escB-lista-descripcion" class="mt-1"></ul>
          </div>

          <!-- FORMULARIO PRINCIPAL -->
          <form id="form-reservas" novalidate>
            <div class="form-row form-row--2-col">

              <div class="form-group">
                <label class="form-label" for="v0">
                  Volumen inicial V₀ <span aria-hidden="true">*</span>
                </label>
                <input class="form-input" type="number" id="v0" name="v0"
                  value="1000" min="1" step="any" aria-required="true" placeholder="Ej: 1000"/>
                <span class="form-help">Unidades de reserva al inicio de la crisis</span>
                <span class="form-error" id="error-v0" aria-live="polite"></span>
              </div>

              <div class="form-group">
                <label class="form-label" for="k">
                  Tasa de consumo k <span aria-hidden="true">*</span>
                </label>
                <input class="form-input" type="number" id="k" name="k"
                  value="0.05" min="0.0001" max="10" step="any" aria-required="true" placeholder="Ej: 0.05"/>
                <span class="form-help">Fracción de reservas consumidas por unidad de tiempo</span>
                <span class="form-error" id="error-k" aria-live="polite"></span>
              </div>

              <div class="form-group">
                <label class="form-label" for="n-exp">Exponente del modelo n</label>
                <select class="form-input" id="n-exp" name="n-exp">
                  <option value="1" selected>n = 1 (lineal – consumo proporcional a reservas)</option>
                  <option value="0.5">n = 0.5 (Torricelli – vaciado hidráulico)</option>
                  <option value="2">n = 2 (cuadrático – presión creciente)</option>
                </select>
                <span class="form-help">Tipo de comportamiento del sistema de reservas</span>
              </div>

              <div class="form-group">
                <label class="form-label" for="q-repo">Tasa de reposición Q</label>
                <input class="form-input" type="number" id="q-repo" name="q-repo"
                  value="0" min="0" step="any" placeholder="Ej: 5"/>
                <span class="form-help">0 = crisis total sin reposición; valor positivo = reposición constante</span>
                <span class="form-error" id="error-q" aria-live="polite"></span>
              </div>

              <div class="form-group">
                <label class="form-label" for="t-final">
                  Tiempo total (días) <span aria-hidden="true">*</span>
                </label>
                <input class="form-input" type="number" id="t-final" name="t-final"
                  value="30" min="1" max="365" step="1" aria-required="true" placeholder="Ej: 30"/>
                <span class="form-help">Horizonte de simulación en días</span>
                <span class="form-error" id="error-t" aria-live="polite"></span>
              </div>

              <div class="form-group">
                <label class="form-label" for="pasos">
                  Número de pasos <span aria-hidden="true">*</span>
                </label>
                <input class="form-input" type="number" id="pasos" name="pasos"
                  value="60" min="5" max="1000" step="1" aria-required="true" placeholder="Ej: 60"/>
                <span class="form-help">Mayor número de pasos = mayor precisión</span>
                <span class="form-error" id="error-pasos" aria-live="polite"></span>
              </div>

            </div>

            <div class="form-button-group">
              <button type="submit" class="btn btn--primary" id="btn-calcular-b">
                🔢 Simular vaciado de reservas
              </button>
            </div>
          </form>

        </div>
      </div>

      <!-- RESULTADOS -->
      <div id="resultados-b" class="resultados" hidden aria-live="polite">

        <div class="card">
          <div class="card__header">
            <h2 class="card__title">Resumen de la Simulación</h2>
          </div>
          <div class="card__body">
            <div class="grid grid--4-col" id="metricas-b"></div>
          </div>
        </div>

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

        <div class="card">
          <div class="card__header">
            <h2 class="card__title">Tabla Comparativa de Métodos</h2>
          </div>
          <div class="card__body">
            <div id="tabla-reservas" class="tabla-contenedor"></div>
          </div>
        </div>

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

        <div class="card card--info" id="interpretacion-b">
          <div class="card__header">
            <h2 class="card__title">Interpretación de Resultados</h2>
          </div>
          <div class="card__body" id="texto-interpretacion-b"></div>
        </div>

      </div>

    </section>
  `;
}

// ============================================================
// EVENTOS
// ============================================================
function _registrarEventos() {
  const form     = document.getElementById('form-reservas');
  const btnReset = document.getElementById('btn-reset-b');
  const btnEj    = document.getElementById('escB-btn-ejemplo');

  if (form)     form.addEventListener('submit', _manejarCalculo);
  if (btnReset) btnReset.addEventListener('click', _restablecerFormulario);
  if (btnEj)    btnEj.addEventListener('click', _cargarEjemploSeleccionado);
}

// ============================================================
// POBLAR SELECT DE EJEMPLOS
// ============================================================
function _poblarSelectEjemplos() {
  const select = document.getElementById('escB-select-ejemplo');
  if (!select) return;

  const ejemplos = obtenerEjemplosDisponibles();
  while (select.options.length > 1) select.remove(1);

  const iconos = { basico: '🟢', intermedio: '🟡', avanzado: '🔴' };

  ejemplos.forEach((ej) => {
    const option = document.createElement('option');
    option.value = ej.id;
    option.textContent = `${iconos[ej.dificultad] ?? '⚪'} [${ej.id}] ${ej.nombre}`;
    select.appendChild(option);
  });

  // Preseleccionar el primero
  if (ejemplos.length > 0) select.value = ejemplos[0].id;

  // Mostrar dificultad al cambiar
  select.addEventListener('change', () => {
    const lista = obtenerEjemplosDisponibles();
    const sel   = lista.find(e => e.id === select.value);
    const span  = document.getElementById('escB-ejemplo-dificultad');
    if (span) span.textContent = sel ? `Dificultad: ${sel.dificultad ?? '—'}` : '';
  });
}

// ============================================================
// CARGAR EJEMPLO SELECCIONADO EN EL FORMULARIO
// ============================================================
function _cargarEjemploSeleccionado() {
  const select = document.getElementById('escB-select-ejemplo');
  const idSel  = select?.value;

  const ejemplos = obtenerEjemplosDisponibles();
  const ejemplo  = idSel
    ? ejemplos.find(e => e.id === idSel)
    : ejemplos[0];

  if (!ejemplo) {
    mostrarNotificacion('No hay ejemplos disponibles.', 'warning');
    return;
  }

  // Mapear parámetros del JSON al formulario
  const p = mapearParametrosJSON(ejemplo.parametros);

  _setVal('v0',      p.v0);
  _setVal('k',       p.k);
  _setVal('q-repo',  p.q_repo);
  _setVal('t-final', p.t_final);
  _setVal('pasos',   p.pasos);

  // Selector n-exp
  const selN = document.getElementById('n-exp');
  if (selN) {
    // Buscar opción más cercana al valor n_exp
    const opcionesValidas = ['1', '0.5', '2'];
    selN.value = opcionesValidas.includes(p.n_exp) ? p.n_exp : '1';
  }

  // Descripción contextual
  _mostrarDescripcionEjemplo(ejemplo);

  // Limpiar resultados anteriores
  const divRes = document.getElementById('resultados-b');
  if (divRes) divRes.hidden = true;
  if (chartInstance) { chartInstance.destroy(); chartInstance = null; }

  mostrarNotificacion(`✅ "${ejemplo.nombre}" cargado`, 'success');
}

/**
 * Setea el valor de un input por ID de forma segura.
 * @param {string} id
 * @param {number|string} valor
 */
function _setVal(id, valor) {
  const el = document.getElementById(id);
  if (el && valor != null) el.value = valor;
}

/**
 * Muestra la descripción contextual del ejemplo en el panel de info.
 * @param {Object} ejemplo
 */
function _mostrarDescripcionEjemplo(ejemplo) {
  const divDesc = document.getElementById('escB-descripcion-ejemplo');
  const lista   = document.getElementById('escB-lista-descripcion');
  if (!divDesc || !lista) return;

  const contexto = ejemplo.descripcion_contexto ?? ejemplo.descripcion;
  const items = Array.isArray(contexto)
    ? contexto.map(d => `<li>${d}</li>`).join('')
    : `<li>${contexto}</li>`;

  // Información adicional del JSON
  const descFuncion = ejemplo.descripcion_funcion
    ? `<li><strong>Modelo:</strong> <code>${ejemplo.descripcion_funcion}</code></li>`
    : '';

  const solAnalitica = ejemplo.solucion_analitica
    ? `<li><strong>Solución analítica:</strong> <code>${ejemplo.solucion_analitica}</code></li>`
    : '';

  const tiempoAgotamiento = ejemplo.tiempo_agotamiento
    ? `<li><strong>Tiempo de agotamiento estimado:</strong> ${ejemplo.tiempo_agotamiento} ${ejemplo.unidades_t ?? 'días'}</li>`
    : '';

  const interpretacion = ejemplo.interpretacion
    ? `<li style="margin-top:var(--spacing-2);">
         <strong>Interpretación:</strong> ${ejemplo.interpretacion}
         ${ejemplo.unidades_y ? `<em>(${ejemplo.unidades_y})</em>` : ''}
       </li>`
    : '';

  lista.innerHTML = items + descFuncion + solAnalitica + tiempoAgotamiento + interpretacion;
  divDesc.style.display = 'block';
}

// ============================================================
// MANEJADOR DEL FORMULARIO (sin cambios respecto al original)
// ============================================================
function _manejarCalculo(evento) {
  evento.preventDefault();
  limpiarErrores(['error-v0', 'error-k', 'error-q', 'error-t', 'error-pasos']);

  const params = _leerParametros();
  if (!params) return;

  const resultados = _ejecutarMetodos(params);
  _renderizarResultados(params, resultados);

  const divResultados = document.getElementById('resultados-b');
  if (divResultados) {
    divResultados.hidden = false;
    divResultados.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  mostrarNotificacion('Simulación completada correctamente', 'success');
}

// ============================================================
// LECTURA Y VALIDACIÓN DE PARÁMETROS
// ============================================================
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

// ============================================================
// EJECUCIÓN DE LOS TRES MÉTODOS NUMÉRICOS
// ============================================================
function _ejecutarMetodos({ v0, k, n, Q, tFinal, pasos }) {
  const h = tFinal / pasos;

  /**
   * EDO: dV/dt = f(t, V) = -k * V^n + Q
   * Se protege contra V negativo.
   */
  const f = (t, V) => {
    const Vpos = Math.max(0, V);
    return -k * Math.pow(Vpos, n) + Q;
  };

  const analitica = (n === 1)
    ? _solucionAnaliticaLineal(v0, k, Q, h, pasos)
    : null;

  const resultadoEuler = euler(f, v0, 0, tFinal, h);
  const resultadoHeun  = heun(f, v0, 0, tFinal, h);
  const resultadoRK4   = rk4(f, v0, 0, tFinal, h);

  return {
    euler: resultadoEuler,
    heun:  resultadoHeun,
    rk4:   resultadoRK4,
    analitica,
  };
}

// ============================================================
// SOLUCIÓN ANALÍTICA (solo n=1)
// V(t) = (V0 - Q/k) * e^(-kt) + Q/k
// ============================================================
function _solucionAnaliticaLineal(v0, k, Q, h, pasos) {
  const estacionario = Q / k;
  const puntos = [];
  for (let i = 0; i <= pasos; i++) {
    const t = i * h;
    const V = (v0 - estacionario) * Math.exp(-k * t) + estacionario;
    puntos.push({ t: parseFloat(t.toFixed(6)), V: Math.max(0, V) });
  }
  return puntos;
}

// ============================================================
// RENDERIZAR TODOS LOS RESULTADOS
// ============================================================
function _renderizarResultados(params, resultados) {
  _renderizarMetricas(params, resultados);
  _renderizarGrafico(params, resultados);
  _renderizarTabla(params, resultados);
  _renderizarGraficoError(params, resultados);
  _renderizarInterpretacion(params, resultados);
}

// ============================================================
// MÉTRICAS RÁPIDAS
// ============================================================
function _renderizarMetricas(params, resultados) {
  const contenedor = document.getElementById('metricas-b');
  if (!contenedor) return;

  const rk4Final   = resultados.rk4[resultados.rk4.length - 1].V;
  const eulerFinal = resultados.euler[resultados.euler.length - 1].V;
  const heunFinal  = resultados.heun[resultados.heun.length - 1].V;
  const porcentaje = ((1 - rk4Final / params.v0) * 100).toFixed(1);

  const nivelCritico = params.v0 * 0.20;
  const diaCritico   = resultados.rk4.find(p => p.V <= nivelCritico);

  const metricas = [
    {
      label: 'Reservas finales (RK4)',
      valor: `${rk4Final.toFixed(2)} u.`,
      clase: rk4Final < params.v0 * 0.2 ? 'alert' : 'success',
    },
    {
      label: 'Reducción total',
      valor: `${porcentaje}%`,
      clase: parseFloat(porcentaje) > 80 ? 'alert' : 'info',
    },
    {
      label: 'Error Euler vs RK4',
      valor: `${Math.abs(eulerFinal - rk4Final).toFixed(3)} u.`,
      clase: 'info',
    },
    {
      label: 'Día nivel crítico (20%)',
      valor: diaCritico ? `Día ${diaCritico.t.toFixed(1)}` : 'No alcanzado',
      clase: diaCritico ? 'alert' : 'success',
    },
  ];

  contenedor.innerHTML = metricas.map(m => `
    <div class="card card--${m.clase}" style="text-align:center; padding: 1rem;">
      <p class="form-help" style="margin:0 0 0.25rem;">${m.label}</p>
      <strong style="font-size: 1.4rem;">${m.valor}</strong>
    </div>
  `).join('');
}

// ============================================================
// GRÁFICO PRINCIPAL: EVOLUCIÓN DE RESERVAS
// ============================================================
function _renderizarGrafico(params, resultados) {
  const canvas = document.getElementById(CHART_ID);
  if (!canvas) return;

  if (chartInstance) { chartInstance.destroy(); chartInstance = null; }

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
      fill: false,
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
      fill: false,
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
      fill: false,
    },
  ];

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
      fill: false,
    });
  }

  // Línea de nivel crítico
  datasets.push({
    label: 'Nivel crítico (20%)',
    data: new Array(labels.length).fill(params.v0 * 0.20),
    borderColor: '#D97059',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderDash: [4, 8],
    pointRadius: 0,
    fill: false,
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
            label: (ctx) =>
              `${ctx.dataset.label}: ${parseFloat(ctx.parsed.y).toFixed(2)} unidades`,
          },
        },
      },
      scales: {
        x: {
          title: { display: true, text: 'Tiempo (días)' },
          ticks: { maxTicksLimit: 15 },
        },
        y: {
          title: { display: true, text: 'Volumen de reservas (unidades)' },
          min: 0,
          beginAtZero: true,
        },
      },
    },
  });
}

// ============================================================
// TABLA COMPARATIVA
// ============================================================
function _renderizarTabla({ tFinal, pasos }, resultados) {
  const contenedor = document.getElementById('tabla-reservas');
  if (!contenedor) return;

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
      't (días)':        t.toFixed(2),
      'V Euler':         eulerV.toFixed(4),
      'V Heun':          heunV.toFixed(4),
      'V RK4':           rk4V.toFixed(4),
      'Error Euler (%)': errEuler.toFixed(6),
      'Error Heun (%)':  errHeun.toFixed(6),
    };
  });

  renderizarTabla('tabla-reservas', {
    columnas: ['t (días)', 'V Euler', 'V Heun', 'V RK4', 'Error Euler (%)', 'Error Heun (%)'],
    filas,
    columnasNumericas: ['V Euler', 'V Heun', 'V RK4', 'Error Euler (%)', 'Error Heun (%)'],
    resaltarUltimaFila: true,
  });
}

// ============================================================
// GRÁFICO DE ERROR RELATIVO
// ============================================================
function _renderizarGraficoError(params, resultados) {
  const canvas = document.getElementById('grafico-error-b');
  if (!canvas) return;

  const labels = resultados.rk4.map(p => p.t.toFixed(1));

  const erroresEuler = resultados.rk4.map((punto, i) => {
    const vRK4   = punto.V;
    const vEuler = resultados.euler[i]?.V ?? 0;
    return vRK4 > 1e-10
      ? parseFloat(Math.abs((vEuler - vRK4) / vRK4 * 100).toFixed(6))
      : 0;
  });

  const erroresHeun = resultados.rk4.map((punto, i) => {
    const vRK4  = punto.V;
    const vHeun = resultados.heun[i]?.V ?? 0;
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
          tension: 0.3,
        },
        {
          label: 'Error relativo Heun (%)',
          data: erroresHeun,
          borderColor: '#6C8C74',
          backgroundColor: 'rgba(108,140,116,0.1)',
          borderWidth: 2,
          pointRadius: 0,
          fill: true,
          tension: 0.3,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'top' },
        tooltip: {
          callbacks: {
            label: (ctx) => `${ctx.dataset.label}: ${ctx.parsed.y.toFixed(6)}%`,
          },
        },
      },
      scales: {
        x: {
          title: { display: true, text: 'Tiempo (días)' },
          ticks: { maxTicksLimit: 15 },
        },
        y: {
          title: { display: true, text: 'Error relativo (%)' },
          beginAtZero: true,
        },
      },
    },
  });
}

// ============================================================
// INTERPRETACIÓN AUTOMÁTICA
// ============================================================
function _renderizarInterpretacion({ v0, k, n, Q, tFinal, pasos }, resultados) {
  const contenedor = document.getElementById('texto-interpretacion-b');
  if (!contenedor) return;

  const rk4Final   = resultados.rk4[resultados.rk4.length - 1].V;
  const eulerFinal = resultados.euler[resultados.euler.length - 1].V;
  const heunFinal  = resultados.heun[resultados.heun.length - 1].V;
  const h          = tFinal / pasos;
  const reduccion  = ((1 - rk4Final / v0) * 100).toFixed(1);

  const nivelCritico = v0 * 0.20;
  const diaCritico   = resultados.rk4.find(p => p.V <= nivelCritico);

  const errEuler = rk4Final > 1e-10
    ? Math.abs((eulerFinal - rk4Final) / rk4Final * 100).toFixed(4) : '—';
  const errHeun = rk4Final > 1e-10
    ? Math.abs((heunFinal  - rk4Final) / rk4Final * 100).toFixed(6) : '—';

  let estadoReserva = '';
  if (rk4Final <= 0) {
    estadoReserva = `
      <div class="alert alert--error">
        ⚠ Las reservas se <strong>agotaron completamente</strong> antes del día ${tFinal}.
        Se necesitan medidas de emergencia inmediatas.
      </div>`;
  } else if (rk4Final < nivelCritico) {
    estadoReserva = `
      <div class="alert alert--warning">
        ⚠ Las reservas cayeron al <strong>nivel crítico</strong> (menos del 20% inicial).
        Al día ${tFinal} quedan <strong>${rk4Final.toFixed(2)} unidades</strong>
        (${(rk4Final / v0 * 100).toFixed(1)}% del original).
      </div>`;
  } else {
    estadoReserva = `
      <div class="alert alert--success">
        ✓ Las reservas se mantuvieron sobre el nivel crítico. Al día ${tFinal} quedan
        <strong>${rk4Final.toFixed(2)} unidades</strong>
        (${(rk4Final / v0 * 100).toFixed(1)}% del inicial).
      </div>`;
  }

  const modelosTexto = {
    '1':   'El modelo <strong>lineal (n=1)</strong> representa consumo proporcional a las reservas, típico de sistemas controlados.',
    '0.5': 'El modelo de <strong>Torricelli (n=0.5)</strong> describe vaciado hidráulico donde la presión disminuye con el nivel.',
    '2':   'El modelo <strong>cuadrático (n=2)</strong> simula consumo acelerado bajo presión social creciente.',
  };

  const reposicionTexto = Q > 0
    ? `<p>Con reposición Q = ${Q} unidades/día, el sistema tiende al estado estacionario
       V* = Q/k = <strong>${(Q / k).toFixed(2)} unidades</strong>.</p>`
    : `<p>Sin reposición (Q = 0), las reservas se vacían inexorablemente.
       Tiempo característico τ = 1/k = <strong>${(1 / k).toFixed(2)} días</strong>.</p>`;

  contenedor.innerHTML = `
    ${estadoReserva}

    <h3>Diagnóstico de la crisis</h3>
    <p>
      Partiendo de <strong>${v0} unidades</strong> con tasa k = ${k}, las reservas se
      redujeron un <strong>${reduccion}%</strong> en ${tFinal} días.
      ${diaCritico
        ? `El nivel crítico (20%) se alcanzó el <strong>día ${diaCritico.t.toFixed(1)}</strong>.`
        : 'El nivel crítico (20%) <strong>no fue alcanzado</strong> en el período simulado.'}
    </p>
    <p>${modelosTexto[String(n)] ?? ''}</p>
    ${reposicionTexto}

    <h3>Comparación de métodos numéricos</h3>
    <ul>
      <li>
        <strong>Euler (orden 1):</strong> Error final <code>${errEuler}%</code> vs RK4.
        Con h = ${h.toFixed(4)} días, ${parseFloat(errEuler) > 1 ? 'puede ser significativo' : 'es aceptable'}.
      </li>
      <li>
        <strong>Heun (orden 2):</strong> Error final <code>${errHeun}%</code>.
        Balance entre costo computacional y precisión.
      </li>
      <li>
        <strong>RK4 (orden 4):</strong> Referencia de máxima precisión local O(h⁵).
        Recomendado para decisiones oficiales de planificación.
      </li>
    </ul>

    <h3>Recomendaciones de política</h3>
    <ul>
      ${rk4Final < nivelCritico ? '<li>Activar protocolos de distribución racionada de emergencia.</li>' : ''}
      <li>Implementar reposición Q ≥ <strong>${(k * v0 * 0.1).toFixed(2)} unidades/día</strong>
          para estabilizar reservas sobre el 20%.</li>
      <li>Monitorear la tasa real k y ajustar el modelo cada 5 días.</li>
      <li>Usar RK4 para proyecciones oficiales; Euler solo para estimaciones rápidas en campo.</li>
    </ul>
  `;
}

// ============================================================
// RESTABLECER FORMULARIO
// ============================================================
function _restablecerFormulario() {
  const form = document.getElementById('form-reservas');
  if (form) form.reset();

  limpiarErrores(['error-v0', 'error-k', 'error-q', 'error-t', 'error-pasos']);

  const divDesc = document.getElementById('escB-descripcion-ejemplo');
  if (divDesc) divDesc.style.display = 'none';

  const divRes = document.getElementById('resultados-b');
  if (divRes) divRes.hidden = true;

  if (chartInstance) { chartInstance.destroy(); chartInstance = null; }

  mostrarNotificacion('Formulario restablecido a valores predeterminados', 'info');
}

// Exponer al router
window.renderizarEscenarioB = renderizarEscenarioB;
})();