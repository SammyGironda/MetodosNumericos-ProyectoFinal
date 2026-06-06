(function () {

  // ============================================================
  // escenarioC.js - Escenario C: Curva de Precios durante Crisis
  // Métodos: Interpolación de Lagrange + Splines Cúbicos Naturales
  // ============================================================

  function lagrange(...args) {
    return window.Interpolacion?.lagrange?.(...args);
  }

  function splinesNaturales(...args) {
    return window.Interpolacion?.splinesNaturales?.(...args);
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

  // ─── Constantes ─────────────────────────────────────────────
  const CHART_ID       = 'grafico-precios';
  const CHART_ERROR_ID = 'grafico-error-c';
  let chartPrincipal   = null;
  let chartError       = null;
  const MAX_PUNTOS     = 10;
  const MIN_PUNTOS     = 3;

  // ─── Estado de la tabla de entrada ──────────────────────────
  let filasActuales = [];

  // ============================================================
  // DATOS DE EJEMPLO — Lee desde window.DATOS_EJEMPLOS (ejemplos.json)
  // Fallback hardcodeado si el JSON no está disponible
  // ============================================================
  function obtenerEjemplosDisponibles() {
    const datos = window.DATOS_EJEMPLOS?.escenarios?.escenarioC?.ejemplos;
    if (datos && datos.length > 0) return datos;

    // Fallback: datos de combustible originales del escenario
    return [
      {
        id: 'C0',
        nombre: 'Precio del combustible — 7 registros (fallback)',
        dificultad: 'intermedio',
        descripcion: 'Evolución del precio de combustible con escasez intermitente.',
        parametros: {
          puntos_x: [0,  5,  10,  15,  20,  25,  30],
          puntos_y: [3.74, 4.10, 5.30, 7.80, 9.20, 8.60, 10.40],
          x_evaluar: [12],
          metodo: 'ambos',
        },
        interpretacion: 'El precio del combustible sube con un alivio parcial en el día 25.',
        unidades: 'Bs/litro',
        eje_x: 'días desde inicio de crisis',
      },
    ];
  }

  /**
   * Convierte los parámetros del JSON al formato interno de filasActuales.
   * El JSON usa puntos_x[] + puntos_y[] (arrays paralelos).
   * filasActuales usa [{ dia, precio }, ...]
   */
  function mapearPuntosJSON(params) {
    const xs = params.puntos_x ?? [];
    const ys = params.puntos_y ?? [];
    return xs.map((x, i) => ({ dia: x, precio: ys[i] ?? 0 }));
  }

  // ─── Render principal ────────────────────────────────────────
  function renderizarEscenarioC(contenedor) {
    chartPrincipal = null;
    chartError     = null;

    contenedor.innerHTML = _generarHTML();
    _inicializarTablaEntrada(); // tabla vacía mínima
    _registrarEventos();
    _poblarSelectEjemplos();
    // Cargar el primer ejemplo automáticamente
    _cargarEjemploSeleccionado();
  }

  // ============================================================
  // HTML DEL ESCENARIO
  // ============================================================
  function _generarHTML() {
    return `
      <section class="escenario" id="escenario-c" aria-labelledby="titulo-esc-c">

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
                Lagrange: suma ponderada de bases | Spline: polinomio por tramo con continuidad C²
              </p>
            </div>
          </div>
        </div>

        <!-- CARD DE DATOS -->
        <div class="card">
          <div class="card__header">
            <h2 class="card__title">Datos de Precios Observados</h2>
          </div>
          <div class="card__body">

            <!-- ── SELECTOR DE EJEMPLOS ── -->
            <div class="form-row form-row--2-col" style="margin-bottom: var(--spacing-4);">
              <div class="form-group">
                <label class="form-label" for="escC-select-ejemplo">Ejemplo precargado</label>
                <select class="form-input" id="escC-select-ejemplo">
                  <option value="">— Selecciona un ejemplo —</option>
                </select>
                <span class="form-help" id="escC-ejemplo-dificultad"></span>
              </div>
              <div class="form-group"
                   style="display:flex; align-items:flex-end; gap: var(--spacing-2);">
                <button type="button" class="btn btn--secondary btn--small"
                        id="escC-btn-ejemplo">
                  📋 Cargar Ejemplo
                </button>
                <button type="button" class="btn btn--secondary btn--small"
                        id="btn-reset-c">
                  🗑️ Limpiar todo
                </button>
              </div>
            </div>

            <!-- Descripción contextual del ejemplo -->
            <div id="escC-descripcion-ejemplo" class="alert alert--info mb-3"
                 style="display:none;">
              <strong>Contexto del ejemplo cargado:</strong>
              <ul id="escC-lista-descripcion" class="mt-1"></ul>
            </div>

            <p class="form-help" style="margin-bottom: 1rem;">
              Ingresa entre ${MIN_PUNTOS} y ${MAX_PUNTOS} pares (día, precio).
              Los días deben ser <strong>estrictamente crecientes</strong>.
            </p>

            <!-- Tabla de entrada dinámica -->
            <div id="tabla-entrada-c" class="tabla-contenedor"
                 style="margin-bottom: 1rem;"></div>

            <!-- Botones para manejar filas -->
            <div class="form-button-group" style="margin-bottom: 1.5rem;">
              <button type="button" class="btn btn--secondary btn--small"
                      id="btn-agregar-fila">
                + Agregar punto
              </button>
              <button type="button" class="btn btn--secondary btn--small"
                      id="btn-quitar-fila">
                − Quitar último
              </button>
            </div>

            <!-- Opciones de evaluación -->
            <div class="form-row form-row--3-col">
              <div class="form-group">
                <label class="form-label" for="x-eval">Evaluar en el día x</label>
                <input class="form-input" type="number" id="x-eval"
                       name="x-eval" placeholder="Ej: 12" step="any"/>
                <span class="form-help">Estima el precio en un día no observado</span>
                <span class="form-error" id="error-x-eval" aria-live="polite"></span>
              </div>

              <div class="form-group">
                <label class="form-label" for="puntos-grafico">
                  Puntos en el gráfico
                </label>
                <input class="form-input" type="number" id="puntos-grafico"
                       value="200" min="50" max="500" step="10"/>
                <span class="form-help">Densidad de la curva (50–500)</span>
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
                🔢 Interpolar curva de precios
              </button>
            </div>

            <span class="form-error" id="error-datos-c" aria-live="polite"></span>

          </div>
        </div>

        <!-- RESULTADOS -->
        <div id="resultados-c" hidden aria-live="polite">

          <div class="card card--info" id="card-eval-puntual" hidden>
            <div class="card__header">
              <h2 class="card__title">Evaluación Puntual</h2>
            </div>
            <div class="card__body" id="contenido-eval-puntual"></div>
          </div>

          <div class="card">
            <div class="card__header">
              <h2 class="card__title">Métricas de la Interpolación</h2>
            </div>
            <div class="card__body">
              <div class="grid grid--4-col" id="metricas-c"></div>
            </div>
          </div>

          <div class="card">
            <div class="card__header">
              <h2 class="card__title">Curva de Precios Interpolada</h2>
            </div>
            <div class="card__body">
              <div class="grafico-contenedor" style="height: 420px;">
                <canvas id="${CHART_ID}" role="img"
                        aria-label="Curva de precios interpolada"></canvas>
              </div>
            </div>
          </div>

          <div class="card">
            <div class="card__header">
              <h2 class="card__title">Tabla Comparativa en Puntos Conocidos</h2>
            </div>
            <div class="card__body">
              <div id="tabla-resultados-c" class="tabla-contenedor"></div>
            </div>
          </div>

          <div class="card">
            <div class="card__header">
              <h2 class="card__title">Diferencia entre Lagrange y Splines</h2>
            </div>
            <div class="card__body">
              <div class="grafico-contenedor" style="height: 280px;">
                <canvas id="${CHART_ERROR_ID}" role="img"
                        aria-label="Diferencia entre métodos"></canvas>
              </div>
            </div>
          </div>

          <div class="card card--info">
            <div class="card__header">
              <h2 class="card__title">Interpretación Económica</h2>
            </div>
            <div class="card__body" id="interpretacion-c"></div>
          </div>

        </div>

      </section>
    `;
  }

  // ============================================================
  // TABLA DE ENTRADA DINÁMICA
  // ============================================================
  function _inicializarTablaEntrada(datos) {
    // Si no se pasan datos, usar 3 filas vacías
    filasActuales = datos
      ? datos.map(d => ({ dia: d.dia, precio: d.precio }))
      : [{ dia: 0, precio: 0 }, { dia: 5, precio: 0 }, { dia: 10, precio: 0 }];
    _renderizarTablaEntrada();
  }

  function _renderizarTablaEntrada() {
    const contenedor = document.getElementById('tabla-entrada-c');
    if (!contenedor) return;

    contenedor.innerHTML = `
      <table style="width:100%; border-collapse:collapse;">
        <thead>
          <tr>
            <th style="text-align:center; padding:8px;
                       background:var(--color-neutral-100,#f5f5f5); width:40px;">#</th>
            <th style="text-align:center; padding:8px;
                       background:var(--color-neutral-100,#f5f5f5);">Día (x)</th>
            <th style="text-align:center; padding:8px;
                       background:var(--color-neutral-100,#f5f5f5);">Precio (y)</th>
          </tr>
        </thead>
        <tbody id="tbody-entrada-c">
          ${filasActuales.map((fila, i) => `
            <tr>
              <td style="text-align:center; padding:6px;
                         color:var(--color-neutral-500,#888);">${i + 1}</td>
              <td style="padding:4px 8px;">
                <input class="form-input" type="number"
                  data-index="${i}" data-campo="dia"
                  value="${fila.dia}" step="any"
                  style="width:100%; text-align:right;"
                  aria-label="Día del punto ${i + 1}"/>
              </td>
              <td style="padding:4px 8px;">
                <input class="form-input" type="number"
                  data-index="${i}" data-campo="precio"
                  value="${fila.precio}" step="any"
                  style="width:100%; text-align:right;"
                  aria-label="Precio del punto ${i + 1}"/>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;

    // Sincronizar cambios manuales con filasActuales
    contenedor.querySelectorAll('input[data-index]').forEach(input => {
      input.addEventListener('change', (e) => {
        const idx   = parseInt(e.target.dataset.index, 10);
        const campo = e.target.dataset.campo;
        filasActuales[idx][campo] = parseFloat(e.target.value) || 0;
      });
    });
  }

  // ============================================================
  // EVENTOS
  // ============================================================
  function _registrarEventos() {
    document.getElementById('btn-agregar-fila')
      ?.addEventListener('click', _agregarFila);

    document.getElementById('btn-quitar-fila')
      ?.addEventListener('click', _quitarFila);

    document.getElementById('escC-btn-ejemplo')
      ?.addEventListener('click', _cargarEjemploSeleccionado);

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

  // ============================================================
  // POBLAR SELECT DE EJEMPLOS
  // ============================================================
  function _poblarSelectEjemplos() {
    const select = document.getElementById('escC-select-ejemplo');
    if (!select) return;

    const ejemplos = obtenerEjemplosDisponibles();
    while (select.options.length > 1) select.remove(1);

    const iconos = { basico: '🟢', intermedio: '🟡', avanzado: '🔴' };

    ejemplos.forEach((ej) => {
      const option = document.createElement('option');
      option.value = ej.id;
      option.textContent =
        `${iconos[ej.dificultad] ?? '⚪'} [${ej.id}] ${ej.nombre}`;
      select.appendChild(option);
    });

    // Preseleccionar el primero
    if (ejemplos.length > 0) select.value = ejemplos[0].id;

    // Mostrar dificultad al cambiar selección
    select.addEventListener('change', () => {
      const lista = obtenerEjemplosDisponibles();
      const sel   = lista.find(e => e.id === select.value);
      const span  = document.getElementById('escC-ejemplo-dificultad');
      if (span) span.textContent = sel ? `Dificultad: ${sel.dificultad ?? '—'}` : '';
    });
  }

  // ============================================================
  // CARGAR EJEMPLO SELECCIONADO
  // ============================================================
  function _cargarEjemploSeleccionado() {
    const select   = document.getElementById('escC-select-ejemplo');
    const idSel    = select?.value;
    const ejemplos = obtenerEjemplosDisponibles();
    const ejemplo  = idSel
      ? ejemplos.find(e => e.id === idSel)
      : ejemplos[0];

    if (!ejemplo) {
      mostrarNotificacion('No hay ejemplos disponibles.', 'warning');
      return;
    }

    const params = ejemplo.parametros;

    // ── 1. Poblar la tabla de entrada con puntos_x / puntos_y ──
    const filas = mapearPuntosJSON(params);
    if (filas.length < MIN_PUNTOS) {
      mostrarNotificacion(
        `El ejemplo "${ejemplo.nombre}" tiene menos de ${MIN_PUNTOS} puntos.`,
        'warning'
      );
      return;
    }
    filasActuales = filas;
    _renderizarTablaEntrada();

    // ── 2. Primer valor de x_evaluar → campo "Evaluar en el día x" ──
    const xEvalArr = params.x_evaluar ?? [];
    const inputXEval = document.getElementById('x-eval');
    if (inputXEval) {
      inputXEval.value = xEvalArr.length > 0 ? xEvalArr[0] : '';
    }

    // ── 3. Método a mostrar ──
    const selMetodo = document.getElementById('metodo-mostrar');
    if (selMetodo && params.metodo) {
      const mapa = {
        'ambos':   'ambos',
        'lagrange': 'lagrange',
        'splines':  'spline',
        'spline':   'spline',
      };
      selMetodo.value = mapa[params.metodo] ?? 'ambos';
    }

    // ── 4. Puntos del gráfico: si el JSON trae comparar_metodos,
    //       usar densidad mayor ──
    const inputPuntos = document.getElementById('puntos-grafico');
    if (inputPuntos) {
      inputPuntos.value = params.comparar_metodos ? 300 : 200;
    }

    // ── 5. Mostrar descripción contextual ──
    _mostrarDescripcionEjemplo(ejemplo);

    // ── 6. Limpiar resultados anteriores ──
    const divRes = document.getElementById('resultados-c');
    if (divRes) divRes.hidden = true;
    if (chartPrincipal) { chartPrincipal.destroy(); chartPrincipal = null; }
    if (chartError)     { chartError.destroy();     chartError     = null; }

    limpiarErrores(['error-datos-c', 'error-x-eval']);
    mostrarNotificacion(`✅ "${ejemplo.nombre}" cargado`, 'success');
  }

  /**
   * Muestra el panel de descripción contextual del ejemplo.
   * @param {Object} ejemplo
   */
  function _mostrarDescripcionEjemplo(ejemplo) {
    const divDesc = document.getElementById('escC-descripcion-ejemplo');
    const lista   = document.getElementById('escC-lista-descripcion');
    if (!divDesc || !lista) return;

    const contexto = ejemplo.descripcion_contexto ?? ejemplo.descripcion;
    const items = Array.isArray(contexto)
      ? contexto.map(d => `<li>${d}</li>`).join('')
      : `<li>${contexto}</li>`;

    // Datos del JSON que enriquecen el contexto
    const unidades = ejemplo.unidades
      ? `<li><strong>Unidades:</strong> ${ejemplo.unidades}
           ${ejemplo.eje_x ? `· Eje X: ${ejemplo.eje_x}` : ''}</li>`
      : '';

    const xEvalArr = ejemplo.parametros?.x_evaluar ?? [];
    const evalInfo = xEvalArr.length > 0
      ? `<li><strong>Días a evaluar:</strong> ${xEvalArr.join(', ')}</li>`
      : '';

    const compararInfo = ejemplo.parametros?.comparar_metodos
      ? `<li><strong>Nota:</strong> Este ejemplo está diseñado para comparar
           Lagrange vs Splines — se recomienda seleccionar "Lagrange + Splines".</li>`
      : '';

    const interpretacion = ejemplo.interpretacion
      ? `<li style="margin-top:var(--spacing-2);">
           <strong>Interpretación:</strong> ${ejemplo.interpretacion}
         </li>`
      : '';

    // Tabla de puntos resumida (máx 5 para no saturar)
    const xs = ejemplo.parametros?.puntos_x ?? [];
    const ys = ejemplo.parametros?.puntos_y ?? [];
    const mostrarHasta = Math.min(xs.length, 5);
    const puntosResumen = xs.length > 0
      ? `<li><strong>Muestra de datos:</strong>
           ${xs.slice(0, mostrarHasta).map(
             (x, i) => `(día ${x}, precio ${ys[i]})`
           ).join(' · ')}
           ${xs.length > 5 ? ` · ... y ${xs.length - 5} más` : ''}
         </li>`
      : '';

    lista.innerHTML =
      items + unidades + evalInfo + compararInfo + puntosResumen + interpretacion;
    divDesc.style.display = 'block';
  }

  // ============================================================
  // MANEJADOR PRINCIPAL DE INTERPOLACIÓN
  // ============================================================
  function _manejarInterpolacion() {
    limpiarErrores(['error-datos-c', 'error-x-eval']);

    const datos = _validarDatos();
    if (!datos) return;

    const xEvalStr      = document.getElementById('x-eval').value.trim();
    const xEval         = xEvalStr !== '' ? parseFloat(xEvalStr) : null;
    const puntosGrafico = parseInt(document.getElementById('puntos-grafico').value, 10) || 200;
    const metodoMostrar = document.getElementById('metodo-mostrar').value;

    if (xEval !== null) {
      const xMin = datos.xs[0];
      const xMax = datos.xs[datos.xs.length - 1];
      if (isNaN(xEval)) {
        mostrarErrores({ 'error-x-eval': 'Ingresa un número válido.' });
        return;
      }
      if (xEval < xMin || xEval > xMax) {
        mostrarErrores({
          'error-x-eval':
            `El día debe estar entre ${xMin} y ${xMax} (rango de los datos).`
        });
        return;
      }
    }

    const resultados = _ejecutarInterpolaciones(datos, puntosGrafico, xEval);
    _renderizarResultados(datos, resultados, xEval, metodoMostrar);

    const divResultados = document.getElementById('resultados-c');
    if (divResultados) {
      divResultados.hidden = false;
      divResultados.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    mostrarNotificacion('Interpolación completada', 'success');
  }

  // ============================================================
  // VALIDACIÓN DE DATOS DE ENTRADA
  // ============================================================
  function _validarDatos() {
    // Leer valores actuales de los inputs (por si el usuario editó sin 'change')
    document.querySelectorAll('input[data-index]').forEach(input => {
      const idx   = parseInt(input.dataset.index, 10);
      const campo = input.dataset.campo;
      const val   = parseFloat(input.value);
      if (!isNaN(val)) filasActuales[idx][campo] = val;
    });

    if (filasActuales.length < MIN_PUNTOS) {
      mostrarErrores({
        'error-datos-c': `Se necesitan al menos ${MIN_PUNTOS} puntos de datos.`
      });
      return null;
    }

    const xs = filasActuales.map(f => f.dia);
    const ys = filasActuales.map(f => f.precio);

    for (let i = 1; i < xs.length; i++) {
      if (xs[i] <= xs[i - 1]) {
        mostrarErrores({
          'error-datos-c':
            `Los días deben ser estrictamente crecientes. ` +
            `Error en fila ${i + 1}: día ${xs[i]} ≤ día ${xs[i - 1]}.`
        });
        return null;
      }
    }

    for (let i = 0; i < ys.length; i++) {
      if (isNaN(ys[i]) || ys[i] < 0) {
        mostrarErrores({
          'error-datos-c':
            `El precio en la fila ${i + 1} debe ser un número no negativo.`
        });
        return null;
      }
    }

    return { xs, ys, n: xs.length };
  }

  // ============================================================
  // EJECUCIÓN DE INTERPOLACIONES
  // ============================================================
  function _ejecutarInterpolaciones({ xs, ys, n }, puntosGrafico, xEval) {
    const xMin = xs[0];
    const xMax = xs[xs.length - 1];
    const paso  = (xMax - xMin) / (puntosGrafico - 1);

    const xDensos = Array.from({ length: puntosGrafico }, (_, i) => xMin + i * paso);

    const curveLagrange = xDensos.map(x => ({ x, y: lagrange(xs, ys, x) }));
    const coefSplines   = splinesNaturales(xs, ys);
    const curveSpline   = xDensos.map(x => ({
      x,
      y: _evaluarSpline(xs, coefSplines, x)
    }));

    let evalPuntual = null;
    if (xEval !== null) {
      evalPuntual = {
        x:        xEval,
        lagrange: lagrange(xs, ys, xEval),
        spline:   _evaluarSpline(xs, coefSplines, xEval)
      };
    }

    const errorEnPuntos = xs.map((x, i) => ({
      dia:          x,
      precioReal:   ys[i],
      lagrange:     lagrange(xs, ys, x),
      spline:       _evaluarSpline(xs, coefSplines, x),
      diffLagrange: Math.abs(lagrange(xs, ys, x) - ys[i]),
      diffSpline:   Math.abs(_evaluarSpline(xs, coefSplines, x) - ys[i])
    }));

    const diferencia = xDensos.map((x, i) => ({
      x,
      diff: Math.abs(curveLagrange[i].y - curveSpline[i].y)
    }));

    const maxDiff    = Math.max(...diferencia.map(d => d.diff));
    const maxDiffIdx = diferencia.findIndex(d => d.diff === maxDiff);
    const precioMax  = Math.max(...ys);
    const precioMin  = Math.min(...ys);

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
        xMaxDiff:    diferencia[maxDiffIdx]?.x,
        precioMax,
        precioMin,
        diaMaxPrecio: xs[ys.indexOf(precioMax)],
        variacion:   ((precioMax - precioMin) / precioMin * 100).toFixed(1)
      }
    };
  }

  // ============================================================
  // EVALUAR SPLINE CÚBICO EN UN PUNTO
  // ============================================================
  function _evaluarSpline(xs, coefs, x) {
    const n = xs.length - 1;
    let i = n - 1;
    for (let j = 0; j < n; j++) {
      if (x <= xs[j + 1]) { i = j; break; }
    }
    const h = x - xs[i];
    const c = coefs[i];
    return c.a + c.b * h + c.c * h * h + c.d * h * h * h;
  }

  // ============================================================
  // RENDERIZADO DE RESULTADOS (sin cambios respecto al original)
  // ============================================================
  function _renderizarResultados(datos, resultados, xEval, metodoMostrar) {
    _renderizarEvalPuntual(resultados.evalPuntual);
    _renderizarMetricas(datos, resultados);
    _renderizarGraficoPrincipal(datos, resultados, metodoMostrar, xEval);
    _renderizarTablaComparativa(resultados.errorEnPuntos);
    _renderizarGraficoDiferencia(resultados.diferencia);
    _renderizarInterpretacion(datos, resultados);
  }

  function _renderizarEvalPuntual(evalPuntual) {
    const card      = document.getElementById('card-eval-puntual');
    const contenido = document.getElementById('contenido-eval-puntual');
    if (!card || !contenido) return;
    if (!evalPuntual) { card.hidden = true; return; }

    card.hidden = false;
    const { x, lagrange: pL, spline: pS } = evalPuntual;
    const promedio = (pL + pS) / 2;

    contenido.innerHTML = `
      <div class="grid grid--3-col">
        <div style="text-align:center; padding:1rem;">
          <p class="form-help" style="margin:0 0 0.25rem;">Día evaluado</p>
          <strong style="font-size:1.6rem;">${x}</strong>
        </div>
        <div style="text-align:center; padding:1rem;">
          <p class="form-help" style="margin:0 0 0.25rem;">Precio por Lagrange</p>
          <strong style="font-size:1.6rem; color:var(--color-accent-warm,#F29966);">
            ${pL.toFixed(4)}
          </strong>
        </div>
        <div style="text-align:center; padding:1rem;">
          <p class="form-help" style="margin:0 0 0.25rem;">Precio por Splines</p>
          <strong style="font-size:1.6rem; color:var(--color-primary,#3E594F);">
            ${pS.toFixed(4)}
          </strong>
        </div>
      </div>
      <p class="form-help" style="text-align:center; margin-top:0.5rem;">
        Promedio: <strong>${promedio.toFixed(4)}</strong> &nbsp;|&nbsp;
        Diferencia entre métodos: <strong>${Math.abs(pL - pS).toFixed(6)}</strong>
      </p>
    `;
  }

  function _renderizarMetricas({ n }, { stats }) {
    const contenedor = document.getElementById('metricas-c');
    if (!contenedor) return;

    const metricas = [
      { label: 'Puntos de datos',          valor: `${n} observaciones`,                     clase: 'info'    },
      { label: 'Variación de precios',      valor: `+${stats.variacion}%`,                   clase: parseFloat(stats.variacion) > 100 ? 'alert' : 'info' },
      { label: 'Precio máximo',             valor: `${stats.precioMax.toFixed(2)} (día ${stats.diaMaxPrecio})`, clase: 'alert' },
      { label: 'Divergencia máx. métodos',  valor: stats.maxDiff.toFixed(6),                 clase: stats.maxDiff > 0.5 ? 'alert' : 'success' },
    ];

    contenedor.innerHTML = metricas.map(m => `
      <div class="card card--${m.clase}" style="text-align:center; padding:1rem;">
        <p class="form-help" style="margin:0 0 0.25rem;">${m.label}</p>
        <strong style="font-size:1.2rem;">${m.valor}</strong>
      </div>
    `).join('');
  }

  function _renderizarGraficoPrincipal({ xs, ys }, resultados, metodoMostrar, xEval) {
    const canvas = document.getElementById(CHART_ID);
    if (!canvas) return;
    if (chartPrincipal) { chartPrincipal.destroy(); chartPrincipal = null; }

    const datasets = [];

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
              label: (ctx) =>
                `${ctx.dataset.label}: ${parseFloat(ctx.parsed.y).toFixed(4)}`
            }
          }
        },
        scales: {
          x: {
            type: 'linear',
            title: { display: true, text: 'Día de la crisis' },
            min: xs[0],
            max: xs[xs.length - 1]
          },
          y: {
            title: { display: true, text: 'Precio' },
            beginAtZero: false
          }
        }
      }
    });
  }

  function _renderizarTablaComparativa(errorEnPuntos) {
    const contenedor = document.getElementById('tabla-resultados-c');
    if (!contenedor) return;

    const filas = errorEnPuntos.map(p => ({
      'Día':             p.dia.toFixed(2),
      'Precio real':     p.precioReal.toFixed(4),
      'Lagrange':        p.lagrange.toFixed(8),
      'Splines':         p.spline.toFixed(8),
      'Error Lagrange':  p.diffLagrange.toExponential(3),
      'Error Splines':   p.diffSpline.toExponential(3)
    }));

    renderizarTabla('tabla-resultados-c', {
      columnas: ['Día', 'Precio real', 'Lagrange', 'Splines', 'Error Lagrange', 'Error Splines'],
      filas,
      columnasNumericas: ['Precio real', 'Lagrange', 'Splines', 'Error Lagrange', 'Error Splines']
    });
  }

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
          x: { type: 'linear', title: { display: true, text: 'Día' } },
          y: { title: { display: true, text: 'Diferencia absoluta' }, beginAtZero: true }
        }
      }
    });
  }

  function _renderizarInterpretacion({ xs, ys, n }, { stats, evalPuntual }) {
    const contenedor = document.getElementById('interpretacion-c');
    if (!contenedor) return;

    const xMin = xs[0];
    const xMax = xs[xs.length - 1];

    const advertenciaRunge = n >= 7
      ? `<div class="alert alert--warning">
          ⚠ <strong>Fenómeno de Runge:</strong> Con ${n} puntos, el polinomio de Lagrange
          (grado ${n - 1}) puede oscilar cerca de los extremos. Se recomienda
          <strong>splines cúbicos</strong> para esta cantidad de datos.
        </div>`
      : '';

    const evalTexto = evalPuntual
      ? `<p>Para el <strong>día ${evalPuntual.x}</strong>, Lagrange estima
         <strong>${evalPuntual.lagrange.toFixed(4)}</strong> y Splines
         <strong>${evalPuntual.spline.toFixed(4)}</strong>.
         Diferencia: <strong>${Math.abs(evalPuntual.lagrange - evalPuntual.spline).toFixed(6)}</strong>
         ${Math.abs(evalPuntual.lagrange - evalPuntual.spline) < 0.01
           ? '— alta consistencia entre métodos.'
           : '— revisar si el punto está en zona de alta variabilidad.'}</p>`
      : '';

    contenedor.innerHTML = `
      ${advertenciaRunge}

      <h3>Análisis de la dinámica de precios</h3>
      <p>
        Los datos cubren del día <strong>${xMin}</strong> al <strong>${xMax}</strong>,
        con una variación total de <strong>${stats.variacion}%</strong>.
        Precio máximo: <strong>${stats.precioMax.toFixed(2)}</strong>
        en el día <strong>${stats.diaMaxPrecio}</strong>.
      </p>
      ${evalTexto}

      <h3>Comparación de métodos</h3>
      <ul>
        <li>
          <strong>Lagrange:</strong> Polinomio único de grado ${n - 1} que pasa exactamente
          por todos los puntos. Simple pero puede oscilar para n grande.
        </li>
        <li>
          <strong>Splines cúbicos naturales:</strong> Tramos cúbicos con continuidad C².
          Curvas más suaves y realistas. Divergencia máxima entre métodos:
          <strong>${stats.maxDiff.toFixed(6)}</strong>
          cerca del día <strong>${stats.xMaxDiff?.toFixed(1)}</strong>.
        </li>
      </ul>

      <h3>Recomendaciones</h3>
      <ul>
        <li>Usar <strong>splines cúbicos</strong> para reportes oficiales.</li>
        <li>Lagrange es útil como verificación rápida con pocos puntos (≤ 5).</li>
        <li>
          La variación de <strong>${stats.variacion}%</strong> indica
          ${parseFloat(stats.variacion) > 150
            ? 'una crisis de precios severa que requiere intervención de emergencia.'
            : parseFloat(stats.variacion) > 50
              ? 'presión significativa sobre el poder adquisitivo.'
              : 'fluctuaciones moderadas, consistentes con escasez temporal.'}
        </li>
      </ul>
    `;
  }

  // ============================================================
  // RESTABLECER TODO
  // ============================================================
  function _restablecerTodo() {
    _inicializarTablaEntrada(); // 3 filas vacías

    const divDesc = document.getElementById('escC-descripcion-ejemplo');
    if (divDesc) divDesc.style.display = 'none';

    limpiarErrores(['error-datos-c', 'error-x-eval']);

    const divResultados = document.getElementById('resultados-c');
    if (divResultados) divResultados.hidden = true;

    if (chartPrincipal) { chartPrincipal.destroy(); chartPrincipal = null; }
    if (chartError)     { chartError.destroy();     chartError     = null; }

    mostrarNotificacion(
      'Datos limpiados. Ingresa nuevos puntos o carga un ejemplo.',
      'info'
    );
  }

  // Exponer al router
  window.renderizarEscenarioC = renderizarEscenarioC;

})();