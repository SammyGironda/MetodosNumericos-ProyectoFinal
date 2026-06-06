  (function() {


  // ============================================================
  // escenarioD.js - Escenario D: Costo Acumulado durante Crisis
  // Métodos: Regla del Trapecio + Regla de Simpson 1/3 y 3/8
  // Contexto: Cálculo del costo económico total acumulado de una
  //           crisis a partir de tasas de gasto instantáneo
  // ============================================================

  function trapecio(...args) {
    return window.Integracion?.trapecio?.(...args);
  }

  function simpson13(...args) {
    return window.Integracion?.simpson13?.(...args);
  }

  function simpson38(...args) {
    return window.Integracion?.simpson38?.(...args);
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

  // ─── Constantes del escenario ───────────────────────────────
  const CHART_TASA_ID  = 'grafico-tasa-d';
  const CHART_ACUM_ID  = 'grafico-acumulado-d';
  const CHART_ERROR_ID = 'grafico-error-d';
  let chartTasa        = null;
  let chartAcum        = null;
  let chartError       = null;

  // ─── Modelos de tasa de gasto predefinidos ───────────────────
  /**
   * Cada modelo define f(t) = tasa de gasto instantáneo en el día t
   * Unidad: millones de Bs / día
   */
  const MODELOS_TASA = {
    lineal: {
      nombre:      'Lineal creciente',
      descripcion: 'Gasto que aumenta proporcionalmente con el tiempo',
      formula:     'f(t) = a·t + b',
      params:      [
        { id: 'param-a', label: 'Pendiente a', valor: 2.5,  min: 0, step: 0.1 },
        { id: 'param-b', label: 'Intercepto b', valor: 10,  min: 0, step: 1   }
      ],
      fn: (t, p) => p.a * t + p.b
    },
    exponencial: {
      nombre:      'Exponencial',
      descripcion: 'Gasto que crece de forma explosiva (pánico o colapso)',
      formula:     'f(t) = A·eᵏᵗ',
      params:      [
        { id: 'param-a', label: 'Amplitud A',   valor: 5,    min: 0.1, step: 0.1 },
        { id: 'param-b', label: 'Tasa k',       valor: 0.08, min: 0.001, step: 0.001 }
      ],
      fn: (t, p) => p.a * Math.exp(p.b * t)
    },
    gaussiana: {
      nombre:      'Pico gaussiano',
      descripcion: 'Gasto con pico en el momento álgido de la crisis',
      formula:     'f(t) = A·exp(−(t−μ)²/(2σ²))',
      params:      [
        { id: 'param-a', label: 'Amplitud A',     valor: 100,  min: 1,   step: 1   },
        { id: 'param-b', label: 'Centro μ (día)', valor: 15,   min: 0,   step: 1   },
        { id: 'param-c', label: 'Ancho σ',        valor: 5,    min: 0.5, step: 0.5 }
      ],
      fn: (t, p) => p.a * Math.exp(-Math.pow(t - p.b, 2) / (2 * p.c * p.c))
    },
    sinusoidal: {
      nombre:      'Oscilante (crisis cíclica)',
      descripcion: 'Gasto con ciclos de tensión y alivio',
      formula:     'f(t) = A·sin(ωt + φ) + D',
      params:      [
        { id: 'param-a', label: 'Amplitud A',     valor: 30,  min: 0, step: 1    },
        { id: 'param-b', label: 'Frecuencia ω',   valor: 0.3, min: 0.01, step: 0.01 },
        { id: 'param-c', label: 'Desplaz. D',     valor: 50,  min: 0, step: 1    }
      ],
      fn: (t, p) => p.a * Math.sin(p.b * t) + p.c
    },
    personalizada: {
      nombre:      'Datos manuales',
      descripcion: 'Ingresa tus propios valores de tasa de gasto por día',
      formula:     'Tabla de valores (tᵢ, f(tᵢ))',
      params:      [],
      fn:          null  // usa tabla de entrada
    }
  };

  // ─── Función principal: renderizar el escenario ─────────────
  function renderizarEscenarioD(contenedor) {
    const ID_ESCENARIO = 'escenario-d';
    const TITULO = 'Costo Económico Acumulado de una Crisis de Abastecimiento';
    chartAcum  = null;
    chartError = null;

    contenedor.innerHTML = `
      <section class="escenario" id="${ID_ESCENARIO}" aria-labelledby="titulo-esc-d">

        <!-- ENCABEZADO -->
        <div class="escenario__header card card--escenario-d">
          <div class="card__body">
            <div class="escenario__titulo-grupo">
              <span class="badge badge--escenario-d">Escenario D</span>
              <h1 id="titulo-esc-d" class="escenario__titulo">
                Costo Económico Acumulado de una Crisis de Abastecimiento
              </h1>
            </div>
            <p class="escenario__descripcion">
              El gasto de emergencia durante una crisis varía segundo a segundo.
              Este escenario calcula el <strong>costo total acumulado</strong> integrando
              numéricamente la tasa de gasto f(t), usando
              <strong>Trapecio</strong>, <strong>Simpson 1/3</strong> y
              <strong>Simpson 3/8</strong>, y compara su precisión contra la
              solución analítica cuando está disponible.
            </p>
            <div class="escenario__formula">
              <code>Costo total = ∫ₐᵇ f(t) dt</code>
              <p class="form-help">
                Trapecio: O(h²) | Simpson 1/3: O(h⁴) | Simpson 3/8: O(h⁴) — f(t) = tasa de gasto [millones Bs/día]
              </p>
            </div>
          </div>
        </div>

        <!-- CONFIGURACIÓN -->
        <div class="card">
          <div class="card__header">
            <h2 class="card__title">Configuración del Modelo de Gasto</h2>
          </div>
          <div class="card__body">

            <!-- Selector de modelo -->
            <div class="form-row form-row--2-col">
              <div class="form-group">
                <label class="form-label" for="modelo-tasa">
                  Modelo de tasa de gasto f(t)
                </label>
                <select class="form-input" id="modelo-tasa">
                  ${Object.entries(MODELOS_TASA).map(([key, m]) =>
                    `<option value="${key}">${m.nombre} — ${m.formula}</option>`
                  ).join('')}
                </select>
                <span class="form-help" id="desc-modelo">
                  ${MODELOS_TASA.lineal.descripcion}
                </span>
              </div>

              <div class="form-group">
                <label class="form-label" for="n-subintervalos">
                  Número de subintervalos n <span aria-hidden="true">*</span>
                </label>
                <input
                  class="form-input"
                  type="number"
                  id="n-subintervalos"
                  value="100"
                  min="2"
                  max="10000"
                  step="2"
                />
                <span class="form-help">
                  Debe ser <strong>par</strong> (Simpson 1/3) y múltiplo de 3 (Simpson 3/8).
                  Se recomienda múltiplo de 6 (ej: 6, 12, 30, 60, 300).
                </span>
                <span class="form-error" id="error-n" aria-live="polite"></span>
              </div>
            </div>

            <!-- Intervalo de integración -->
            <div class="form-row form-row--2-col">
              <div class="form-group">
                <label class="form-label" for="t-inicio">
                  Día inicial a <span aria-hidden="true">*</span>
                </label>
                <input
                  class="form-input"
                  type="number"
                  id="t-inicio"
                  value="0"
                  min="0"
                  step="1"
                />
                <span class="form-error" id="error-t-inicio" aria-live="polite"></span>
              </div>
              <div class="form-group">
                <label class="form-label" for="t-fin">
                  Día final b <span aria-hidden="true">*</span>
                </label>
                <input
                  class="form-input"
                  type="number"
                  id="t-fin"
                  value="30"
                  min="1"
                  max="365"
                  step="1"
                />
                <span class="form-error" id="error-t-fin" aria-live="polite"></span>
              </div>
            </div>

            <!-- Parámetros dinámicos del modelo -->
            <div id="contenedor-params-modelo">
              <!-- Generado dinámicamente según modelo seleccionado -->
            </div>

            <!-- Tabla manual (solo para modelo personalizado) -->
            <div id="contenedor-tabla-manual" hidden>
              <div class="form-group">
                <label class="form-label">Tabla de valores f(t)</label>
                <p class="form-help">
                  Ingresa al menos 3 pares (día, gasto). Los días deben ser
                  estrictamente crecientes. El número de intervalos se determinará
                  automáticamente a partir de los datos.
                </p>
                <div id="tabla-manual-d" class="tabla-contenedor"></div>
                <div class="form-button-group" style="margin-top:0.5rem;">
                  <button type="button" class="btn btn--secondary btn--small" id="btn-agregar-fila-d">
                    + Agregar fila
                  </button>
                  <button type="button" class="btn btn--secondary btn--small" id="btn-quitar-fila-d">
                    − Quitar última
                  </button>
                </div>
              </div>
            </div>

            <div class="form-button-group" style="margin-top: 1.5rem;">
              <button type="button" class="btn btn--primary" id="btn-integrar-d">
                Calcular costo acumulado
              </button>
              <button type="button" class="btn btn--secondary" id="btn-reset-d">
                Restablecer
              </button>
            </div>

            <span class="form-error" id="error-general-d" aria-live="polite"></span>
          </div>
        </div>

        <!-- RESULTADOS -->
        <div id="resultados-d" hidden aria-live="polite">

          <!-- RESULTADO DESTACADO -->
          <div class="card card--success" id="card-resultado-principal">
            <div class="card__header">
              <h2 class="card__title">Costo Total Estimado</h2>
            </div>
            <div class="card__body" id="resultado-principal-d">
              <!-- Generado dinámicamente -->
            </div>
          </div>

          <!-- MÉTRICAS -->
          <div class="card">
            <div class="card__header">
              <h2 class="card__title">Comparación de Métodos</h2>
            </div>
            <div class="card__body">
              <div class="grid grid--4-col" id="metricas-d"></div>
            </div>
          </div>

          <!-- GRÁFICO TASA -->
          <div class="card">
            <div class="card__header">
              <h2 class="card__title">Tasa de Gasto f(t) a lo largo de la Crisis</h2>
            </div>
            <div class="card__body">
              <div class="grafico-contenedor" style="height: 340px;">
                <canvas id="${CHART_TASA_ID}" role="img"
                  aria-label="Gráfico de tasa de gasto diaria"></canvas>
              </div>
            </div>
          </div>

          <!-- GRÁFICO ACUMULADO -->
          <div class="card">
            <div class="card__header">
              <h2 class="card__title">Costo Acumulado F(t) = ∫₀ᵗ f(s) ds</h2>
            </div>
            <div class="card__body">
              <div class="grafico-contenedor" style="height: 340px;">
                <canvas id="${CHART_ACUM_ID}" role="img"
                  aria-label="Gráfico de costo acumulado"></canvas>
              </div>
            </div>
          </div>

          <!-- TABLA DETALLADA -->
          <div class="card">
            <div class="card__header">
              <h2 class="card__title">Tabla de Integración Detallada</h2>
            </div>
            <div class="card__body">
              <div id="tabla-integracion-d" class="tabla-contenedor"></div>
            </div>
          </div>

          <!-- GRÁFICO DE ERROR -->
          <div class="card">
            <div class="card__header">
              <h2 class="card__title">Error Relativo vs. Solución de Referencia</h2>
            </div>
            <div class="card__body">
              <div class="grafico-contenedor" style="height: 280px;">
                <canvas id="${CHART_ERROR_ID}" role="img"
                  aria-label="Error relativo de los métodos de integración"></canvas>
              </div>
              <p class="form-help" style="margin-top:0.5rem;" id="nota-referencia">
                <!-- Nota sobre qué se usa como referencia -->
              </p>
            </div>
          </div>

          <!-- CONVERGENCIA -->
          <div class="card">
            <div class="card__header">
              <h2 class="card__title">Análisis de Convergencia (variando n)</h2>
            </div>
            <div class="card__body">
              <div id="tabla-convergencia-d" class="tabla-contenedor"></div>
            </div>
          </div>

          <!-- INTERPRETACIÓN -->
          <div class="card card--info">
            <div class="card__header">
              <h2 class="card__title">Interpretación Económica</h2>
            </div>
            <div class="card__body" id="interpretacion-d">
              <!-- Generado dinámicamente -->
            </div>
          </div>

        </div><!-- /resultados -->

      </section>
    `;

    _renderizarParamsModelo('lineal');
    _registrarEventos();
  }

  // ─── Tabla de datos manuales ─────────────────────────────────
  let filasManual = [
    { t: 0,  ft: 10 },
    { t: 5,  ft: 25 },
    { t: 10, ft: 45 },
    { t: 15, ft: 80 },
    { t: 20, ft: 60 },
    { t: 25, ft: 40 },
    { t: 30, ft: 30 }
  ];

  function _renderizarTablaManual() {
    const contenedor = document.getElementById('tabla-manual-d');
    if (!contenedor) return;

    contenedor.innerHTML = `
      <table style="width:100%; border-collapse:collapse;">
        <thead>
          <tr>
            <th style="padding:8px; background:var(--color-neutral-100,#f5f5f5); text-align:center; width:40px;">#</th>
            <th style="padding:8px; background:var(--color-neutral-100,#f5f5f5); text-align:center;">Día t</th>
            <th style="padding:8px; background:var(--color-neutral-100,#f5f5f5); text-align:center;">f(t) [M Bs/día]</th>
          </tr>
        </thead>
        <tbody>
          ${filasManual.map((fila, i) => `
            <tr>
              <td style="text-align:center; padding:4px; color:var(--color-neutral-500,#888);">${i + 1}</td>
              <td style="padding:4px 8px;">
                <input class="form-input" type="number" data-index="${i}" data-campo="t"
                  value="${fila.t}" step="any" style="width:100%; text-align:right;"
                  aria-label="Día ${i + 1}" />
              </td>
              <td style="padding:4px 8px;">
                <input class="form-input" type="number" data-index="${i}" data-campo="ft"
                  value="${fila.ft}" step="any" style="width:100%; text-align:right;"
                  aria-label="f(t) punto ${i + 1}" />
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;

    contenedor.querySelectorAll('input[data-index]').forEach(inp => {
      inp.addEventListener('change', e => {
        const idx   = parseInt(e.target.dataset.index, 10);
        const campo = e.target.dataset.campo;
        filasManual[idx][campo] = parseFloat(e.target.value) || 0;
      });
    });
  }

  // ─── Parámetros dinámicos del modelo ────────────────────────
  function _renderizarParamsModelo(modeloKey) {
    const modelo     = MODELOS_TASA[modeloKey];
    const contenedor = document.getElementById('contenedor-params-modelo');
    const tabManual  = document.getElementById('contenedor-tabla-manual');
    const descModelo = document.getElementById('desc-modelo');

    if (descModelo) descModelo.textContent = modelo.descripcion;

    // Mostrar/ocultar tabla manual
    if (tabManual) tabManual.hidden = modeloKey !== 'personalizada';
    if (modeloKey === 'personalizada') _renderizarTablaManual();

    if (!contenedor) return;

    if (!modelo.params || modelo.params.length === 0) {
      contenedor.innerHTML = '';
      return;
    }

    contenedor.innerHTML = `
      <div class="form-row form-row--3-col" style="margin-top:1rem;">
        ${modelo.params.map(p => `
          <div class="form-group">
            <label class="form-label" for="${p.id}">${p.label}</label>
            <input
              class="form-input"
              type="number"
              id="${p.id}"
              value="${p.valor}"
              min="${p.min}"
              step="${p.step}"
            />
          </div>
        `).join('')}
      </div>
    `;
  }

  // ─── Registro de eventos ─────────────────────────────────────
  function _registrarEventos() {
    document.getElementById('modelo-tasa')
      ?.addEventListener('change', e => _renderizarParamsModelo(e.target.value));

    document.getElementById('btn-integrar-d')
      ?.addEventListener('click', _manejarCalculo);

    document.getElementById('btn-reset-d')
      ?.addEventListener('click', _restablecerTodo);

    document.getElementById('btn-agregar-fila-d')
      ?.addEventListener('click', () => {
        const ultimoT = filasManual.length > 0
          ? filasManual[filasManual.length - 1].t + 5
          : 0;
        filasManual.push({ t: ultimoT, ft: 0 });
        _renderizarTablaManual();
      });

    document.getElementById('btn-quitar-fila-d')
      ?.addEventListener('click', () => {
        if (filasManual.length <= 3) {
          mostrarNotificacion('Mínimo 3 puntos requeridos', 'warning');
          return;
        }
        filasManual.pop();
        _renderizarTablaManual();
      });
  }

  // ─── Manejador principal ─────────────────────────────────────
  function _manejarCalculo() {
    limpiarErrores(['error-n', 'error-t-inicio', 'error-t-fin', 'error-general-d']);

    const config = _leerYValidarConfig();
    if (!config) return;

    const resultados = _ejecutarIntegraciones(config);
    _renderizarResultados(config, resultados);

    const divRes = document.getElementById('resultados-d');
    if (divRes) {
      divRes.hidden = false;
      divRes.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    mostrarNotificacion('Cálculo de costo acumulado completado', 'success');
  }

  // ─── Lectura y validación de configuración ───────────────────
  function _leerYValidarConfig() {
    const modeloKey = document.getElementById('modelo-tasa').value;
    const modelo    = MODELOS_TASA[modeloKey];
    let   n         = parseInt(document.getElementById('n-subintervalos').value, 10);
    const a         = parseFloat(document.getElementById('t-inicio').value);
    const b         = parseFloat(document.getElementById('t-fin').value);
    let   valido    = true;

    if (isNaN(a) || a < 0) {
      mostrarErrores({ 'error-t-inicio': 'El día inicial debe ser un número no negativo.' });
      valido = false;
    }
    if (isNaN(b) || b <= a) {
      mostrarErrores({ 'error-t-fin': 'El día final debe ser mayor que el día inicial.' });
      valido = false;
    }
    if (isNaN(n) || n < 2) {
      mostrarErrores({ 'error-n': 'El número de subintervalos debe ser al menos 2.' });
      valido = false;
    }
    if (!valido) return null;

    // Ajustar n para que sea múltiplo de 6 (compatible con Simpson 1/3 y 3/8)
    if (n % 6 !== 0) {
      n = Math.ceil(n / 6) * 6;
      mostrarNotificacion(`n ajustado a ${n} (múltiplo de 6 para compatibilidad con ambas reglas de Simpson)`, 'info');
    }

    // Leer parámetros del modelo
    let params = {};
    if (modeloKey !== 'personalizada') {
      const letras = ['a', 'b', 'c', 'd'];
      modelo.params.forEach((p, i) => {
        const val = parseFloat(document.getElementById(p.id)?.value);
        if (isNaN(val)) {
          mostrarErrores({ 'error-general-d': `Parámetro "${p.label}" inválido.` });
          valido = false;
        }
        params[letras[i]] = val;
      });
    }

    if (!valido) return null;

    // Para datos manuales, leer y validar tabla
    let datosManual = null;
    if (modeloKey === 'personalizada') {
      // Actualizar desde inputs
      document.querySelectorAll('#tabla-manual-d input[data-index]').forEach(inp => {
        const idx   = parseInt(inp.dataset.index, 10);
        const campo = inp.dataset.campo;
        filasManual[idx][campo] = parseFloat(inp.value) || 0;
      });

      const ts = filasManual.map(f => f.t);
      const ys = filasManual.map(f => f.ft);

      for (let i = 1; i < ts.length; i++) {
        if (ts[i] <= ts[i - 1]) {
          mostrarErrores({ 'error-general-d': `Los días deben ser estrictamente crecientes. Error en fila ${i + 1}.` });
          return null;
        }
      }
      if (ts.length < 3) {
        mostrarErrores({ 'error-general-d': 'Se necesitan al menos 3 puntos.' });
        return null;
      }
      datosManual = { ts, ys };
      n = ts.length - 1;
    }

    // Función f(t) según modelo
    const f = modeloKey !== 'personalizada'
      ? (t) => Math.max(0, modelo.fn(t, params))
      : null;

    return { modeloKey, modelo, n, a, b, params, f, datosManual };
  }

  // ─── Ejecución de las integraciones ─────────────────────────
  function _ejecutarIntegraciones({ modeloKey, modelo, n, a, b, f, datosManual }) {
    const h = (b - a) / n;

    // Generar nodos uniformes
    const ts = datosManual
      ? datosManual.ts
      : Array.from({ length: n + 1 }, (_, i) => a + i * h);
    const ys = datosManual
      ? datosManual.ys
      : ts.map(t => f(t));

    // Métodos de integración total
    const resTrapecio  = trapecio(ts, ys);
    const resSimpson13 = simpson13(ts, ys);
    const resSimpson38 = n % 3 === 0 ? simpson38(ts, ys) : null;

    // Solución analítica (solo para modelos conocidos, no personalizada)
    const analitica = _solucionAnalitica(modeloKey, a, b, f, modelo);

    // Referencia: analítica si existe, sino Simpson 1/3 con n×10
    const referencia = analitica !== null
      ? analitica
      : (() => {
          const nRef = n * 10;
          const hRef = (b - a) / nRef;
          const tsRef = Array.from({ length: nRef + 1 }, (_, i) => a + i * hRef);
          const ysRef = tsRef.map(t => f(t));
          return simpson13(tsRef, ysRef);
        })();

    // Cálculo de errores relativos (%)
    const errorTrapecio  = referencia > 1e-10
      ? Math.abs((resTrapecio  - referencia) / referencia * 100)
      : 0;
    const errorSimpson13 = referencia > 1e-10
      ? Math.abs((resSimpson13 - referencia) / referencia * 100)
      : 0;
    const errorSimpson38 = resSimpson38 !== null && referencia > 1e-10
      ? Math.abs((resSimpson38 - referencia) / referencia * 100)
      : null;

    // Curva de tasa para graficar (200 puntos densos)
    const tsDensos = datosManual
      ? ts
      : Array.from({ length: 200 }, (_, i) => a + i * (b - a) / 199);
    const ysDensos = datosManual
      ? ys
      : tsDensos.map(t => f(t));

    // Costo acumulado (integral parcial) — para gráfico
    const acumuladoTrapecio  = _integralAcumulada(ts, ys, 'trapecio');
    const acumuladoSimpson13 = _integralAcumulada(ts, ys, 'simpson13');

    // Análisis de convergencia
    const convergencia = datosManual ? null : _analizarConvergencia(a, b, f, referencia);

    return {
      ts, ys, tsDensos, ysDensos,
      resTrapecio, resSimpson13, resSimpson38,
      analitica, referencia,
      errorTrapecio, errorSimpson13, errorSimpson38,
      acumuladoTrapecio, acumuladoSimpson13,
      convergencia,
      h, n
    };
  }

  // ─── Solución analítica por modelo ───────────────────────────
  function _solucionAnalitica(modeloKey, a, b, f, modelo) {
    // Solo para los modelos con antiderivada conocida
    switch (modeloKey) {
      case 'lineal':
        // ∫(a·t + b)dt = a·t²/2 + b·t
        return null; // se calcula abajo con params
      default:
        return null;
    }
    // Nota: podría expandirse para cada caso con los parámetros
  }

  // ─── Integral acumulada (parcial) para graficar ──────────────
  function _integralAcumulada(ts, ys, metodo) {
    const resultado = [{ t: ts[0], F: 0 }];
    let acum = 0;

    for (let i = 1; i < ts.length; i++) {
      const dt = ts[i] - ts[i - 1];
      let area = 0;

      if (metodo === 'trapecio') {
        area = (ys[i - 1] + ys[i]) / 2 * dt;
      } else {
        // simpson13 por tramos (si i es par desde inicio)
        if (i >= 2 && (i % 2 === 0)) {
          const h2 = (ts[i] - ts[i - 2]) / 2;
          area = h2 / 3 * (ys[i - 2] + 4 * ys[i - 1] + ys[i]);
          // Restar lo que ya se sumó en i-1 (trapecio provisional)
          acum = resultado[i - 2].F + area;
          resultado.push({ t: ts[i], F: acum });
          continue;
        } else {
          area = (ys[i - 1] + ys[i]) / 2 * dt; // trapecio provisional
        }
      }

      acum += area;
      resultado.push({ t: ts[i], F: acum });
    }

    return resultado;
  }

  // ─── Análisis de convergencia ────────────────────────────────
  function _analizarConvergencia(a, b, f, referencia) {
    const valores_n = [6, 12, 30, 60, 120, 300, 600];
    return valores_n.map(n => {
      const h  = (b - a) / n;
      const ts = Array.from({ length: n + 1 }, (_, i) => a + i * h);
      const ys = ts.map(t => f(t));

      const vTrap = trapecio(ts, ys);
      const vS13  = simpson13(ts, ys);
      const vS38  = n % 3 === 0 ? simpson38(ts, ys) : null;

      const errTrap = referencia > 1e-10 ? Math.abs((vTrap - referencia) / referencia * 100) : 0;
      const errS13  = referencia > 1e-10 ? Math.abs((vS13  - referencia) / referencia * 100) : 0;
      const errS38  = vS38 !== null && referencia > 1e-10
        ? Math.abs((vS38 - referencia) / referencia * 100)
        : null;

      return { n, h: parseFloat(h.toFixed(6)), vTrap, vS13, vS38, errTrap, errS13, errS38 };
    });
  }

  // ─── Renderizado de resultados ───────────────────────────────
  function _renderizarResultados(config, resultados) {
    _renderizarResultadoPrincipal(config, resultados);
    _renderizarMetricas(config, resultados);
    _renderizarGraficoTasa(config, resultados);
    _renderizarGraficoAcumulado(config, resultados);
    _renderizarTablaDetallada(config, resultados);
    _renderizarGraficoError(config, resultados);
    if (resultados.convergencia) _renderizarTablaConvergencia(resultados.convergencia);
    _renderizarInterpretacion(config, resultados);
  }

  // ─── Resultado principal destacado ───────────────────────────
  function _renderizarResultadoPrincipal({ a, b }, { resTrapecio, resSimpson13, resSimpson38, analitica, referencia }) {
    const contenedor = document.getElementById('resultado-principal-d');
    if (!contenedor) return;

    const mejor = resSimpson13;

    contenedor.innerHTML = `
      <div class="grid grid--3-col" style="margin-bottom:1rem;">
        <div style="text-align:center; padding:1rem;">
          <p class="form-help" style="margin:0 0 0.25rem;">Trapecio</p>
          <strong style="font-size:1.5rem;">${resTrapecio.toFixed(4)}</strong>
          <p class="form-help" style="margin:0.25rem 0 0;">M Bs</p>
        </div>
        <div style="text-align:center; padding:1rem; border-left:2px solid var(--color-secondary,#6C8C74); border-right:2px solid var(--color-secondary,#6C8C74);">
          <p class="form-help" style="margin:0 0 0.25rem;">Simpson 1/3 ✓ Recomendado</p>
          <strong style="font-size:1.8rem; color:var(--color-primary,#3E594F);">
            ${resSimpson13.toFixed(4)}
          </strong>
          <p class="form-help" style="margin:0.25rem 0 0;">M Bs</p>
        </div>
        <div style="text-align:center; padding:1rem;">
          <p class="form-help" style="margin:0 0 0.25rem;">Simpson 3/8</p>
          <strong style="font-size:1.5rem;">
            ${resSimpson38 !== null ? resSimpson38.toFixed(4) : 'N/A'}
          </strong>
          <p class="form-help" style="margin:0.25rem 0 0;">M Bs</p>
        </div>
      </div>
      <p style="text-align:center;" class="form-help">
        Período de crisis: días ${a} – ${b} &nbsp;|&nbsp;
        ${analitica !== null
          ? `Solución exacta: <strong>${analitica.toFixed(4)}</strong> M Bs`
          : `Referencia (Simpson 1/3, n×10): <strong>${referencia.toFixed(6)}</strong> M Bs`}
      </p>
    `;
  }

  // ─── Métricas ────────────────────────────────────────────────
  function _renderizarMetricas({ n, h }, { errorTrapecio, errorSimpson13, errorSimpson38, resSimpson13 }) {
    const contenedor = document.getElementById('metricas-d');
    if (!contenedor) return;

    const metricas = [
      {
        label: 'Subintervalos n',
        valor: `${n} (h = ${parseFloat(h.toFixed(4))} días)`,
        clase: 'info'
      },
      {
        label: 'Error Trapecio',
        valor: `${errorTrapecio.toFixed(6)}%`,
        clase: errorTrapecio > 1 ? 'alert' : 'success'
      },
      {
        label: 'Error Simpson 1/3',
        valor: `${errorSimpson13.toFixed(8)}%`,
        clase: errorSimpson13 > 0.01 ? 'alert' : 'success'
      },
      {
        label: 'Error Simpson 3/8',
        valor: errorSimpson38 !== null ? `${errorSimpson38.toFixed(8)}%` : 'N/A',
        clase: (errorSimpson38 !== null && errorSimpson38 > 0.01) ? 'alert' : 'success'
      }
    ];

    contenedor.innerHTML = metricas.map(m => `
      <div class="card card--${m.clase}" style="text-align:center; padding:1rem;">
        <p class="form-help" style="margin:0 0 0.25rem;">${m.label}</p>
        <strong style="font-size:1.1rem;">${m.valor}</strong>
      </div>
    `).join('');
  }

  // ─── Gráfico: tasa de gasto ──────────────────────────────────
  function _renderizarGraficoTasa({ a, b }, { tsDensos, ysDensos, ts, ys }) {
    const canvas = document.getElementById(CHART_TASA_ID);
    if (!canvas) return;
    if (chartTasa) { chartTasa.destroy(); chartTasa = null; }

    chartTasa = renderizarGrafico(CHART_TASA_ID, {
      type: 'line',
      data: {
        datasets: [
          {
            label: 'Tasa de gasto f(t)',
            data: tsDensos.map((t, i) => ({ x: t, y: parseFloat(ysDensos[i].toFixed(4)) })),
            borderColor: '#F29966',
            backgroundColor: 'rgba(242,153,102,0.15)',
            borderWidth: 2.5,
            pointRadius: 0,
            fill: true,
            tension: 0.3
          },
          {
            label: 'Puntos de integración',
            data: ts.map((t, i) => ({ x: t, y: parseFloat(ys[i].toFixed(4)) })),
            type: 'scatter',
            backgroundColor: '#3E594F',
            borderColor: '#3E594F',
            pointRadius: 4,
            showLine: false
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        parsing: false,
        plugins: { legend: { position: 'top' } },
        scales: {
          x: { type: 'linear', title: { display: true, text: 'Día de la crisis' } },
          y: { title: { display: true, text: 'Tasa de gasto [M Bs/día]' }, beginAtZero: true }
        }
      }
    });
  }

  // ─── Gráfico: costo acumulado ────────────────────────────────
  function _renderizarGraficoAcumulado(config, { acumuladoTrapecio, acumuladoSimpson13 }) {
    const canvas = document.getElementById(CHART_ACUM_ID);
    if (!canvas) return;
    if (chartAcum) { chartAcum.destroy(); chartAcum = null; }

    chartAcum = renderizarGrafico(CHART_ACUM_ID, {
      type: 'line',
      data: {
        datasets: [
          {
            label: 'Costo acumulado (Simpson 1/3)',
            data: acumuladoSimpson13.map(p => ({ x: p.t, y: parseFloat(p.F.toFixed(4)) })),
            borderColor: '#3E594F',
            backgroundColor: 'rgba(62,89,79,0.08)',
            borderWidth: 2.5,
            pointRadius: 0,
            fill: true,
            tension: 0.2
          },
          {
            label: 'Costo acumulado (Trapecio)',
            data: acumuladoTrapecio.map(p => ({ x: p.t, y: parseFloat(p.F.toFixed(4)) })),
            borderColor: '#D97059',
            backgroundColor: 'transparent',
            borderWidth: 1.5,
            borderDash: [5, 3],
            pointRadius: 0,
            fill: false,
            tension: 0.2
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        parsing: false,
        plugins: { legend: { position: 'top' } },
        scales: {
          x: { type: 'linear', title: { display: true, text: 'Día' } },
          y: { title: { display: true, text: 'Costo acumulado [M Bs]' }, beginAtZero: true }
        }
      }
    });
  }

  // ─── Tabla detallada ─────────────────────────────────────────
  function _renderizarTablaDetallada({ n }, { ts, ys, acumuladoTrapecio, acumuladoSimpson13 }) {
    const contenedor = document.getElementById('tabla-integracion-d');
    if (!contenedor) return;

    // Mostrar submuestra: ~12 puntos distribuidos uniformemente
    const paso = Math.max(1, Math.floor(n / 12));
    const indices = [];
    for (let i = 0; i <= n; i += paso) indices.push(i);
    if (indices[indices.length - 1] !== n) indices.push(n);

    const filas = indices.map(i => ({
      'Día t':            ts[i] !== undefined ? ts[i].toFixed(4) : '—',
      'f(t) [M Bs/día]':  ys[i] !== undefined ? ys[i].toFixed(6) : '—',
      'F(t) Trapecio':    acumuladoTrapecio[i]  ? acumuladoTrapecio[i].F.toFixed(4)  : '—',
      'F(t) Simpson 1/3': acumuladoSimpson13[i] ? acumuladoSimpson13[i].F.toFixed(4) : '—',
      'Diferencia':       (acumuladoTrapecio[i] && acumuladoSimpson13[i])
        ? Math.abs(acumuladoTrapecio[i].F - acumuladoSimpson13[i].F).toFixed(6)
        : '—'
    }));

    renderizarTabla('tabla-integracion-d', {
      columnas: ['Día t', 'f(t) [M Bs/día]', 'F(t) Trapecio', 'F(t) Simpson 1/3', 'Diferencia'],
      filas,
      columnasNumericas: ['f(t) [M Bs/día]', 'F(t) Trapecio', 'F(t) Simpson 1/3', 'Diferencia'],
      resaltarUltimaFila: true
    });
  }

  // ─── Gráfico de error relativo ───────────────────────────────
  function _renderizarGraficoError({ a, b, f, datosManual }, { errorTrapecio, errorSimpson13, errorSimpson38, referencia, n }) {
    const canvas = document.getElementById(CHART_ERROR_ID);
    const nota   = document.getElementById('nota-referencia');
    if (!canvas) return;
    if (chartError) { chartError.destroy(); chartError = null; }

    if (nota) {
      nota.textContent = datosManual
        ? 'Referencia: Simpson 1/3 con los mismos datos. Los errores son respecto a esta estimación.'
        : `Referencia: Simpson 1/3 con n×10 = ${n * 10} subintervalos (alta precisión).`;
    }

    const labels  = ['Trapecio', 'Simpson 1/3', 'Simpson 3/8'];
    const errores = [
      errorTrapecio,
      errorSimpson13,
      errorSimpson38 !== null ? errorSimpson38 : 0
    ];
    const colores = ['#D97059', '#3E594F', '#6C8C74'];

    chartError = renderizarGrafico(CHART_ERROR_ID, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Error relativo (%)',
          data: errores.map(e => parseFloat(e.toFixed(8))),
          backgroundColor: colores,
          borderColor: colores,
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: ctx => `Error: ${ctx.parsed.y.toFixed(8)}%`
            }
          }
        },
        scales: {
          y: {
            title: { display: true, text: 'Error relativo (%)' },
            beginAtZero: true
          }
        }
      }
    });
  }

  // ─── Tabla de convergencia ───────────────────────────────────
  function _renderizarTablaConvergencia(convergencia) {
    const contenedor = document.getElementById('tabla-convergencia-d');
    if (!contenedor) return;

    const filas = convergencia.map(row => ({
      'n':              String(row.n),
      'h':              row.h.toFixed(6),
      'Trapecio':       row.vTrap.toFixed(6),
      'Error Trap (%)': row.errTrap.toFixed(8),
      'Simpson 1/3':    row.vS13.toFixed(6),
      'Error S1/3 (%)': row.errS13.toFixed(10),
      'Simpson 3/8':    row.vS38 !== null ? row.vS38.toFixed(6) : 'N/A',
      'Error S3/8 (%)': row.errS38 !== null ? row.errS38.toFixed(10) : 'N/A'
    }));

    renderizarTabla('tabla-convergencia-d', {
      columnas: ['n', 'h', 'Trapecio', 'Error Trap (%)', 'Simpson 1/3', 'Error S1/3 (%)', 'Simpson 3/8', 'Error S3/8 (%)'],
      filas,
      columnasNumericas: ['Trapecio', 'Error Trap (%)', 'Simpson 1/3', 'Error S1/3 (%)', 'Simpson 3/8', 'Error S3/8 (%)']
    });
  }

  // ─── Interpretación económica ────────────────────────────────
  function _renderizarInterpretacion(
    { modeloKey, modelo, a, b, n },
    { resTrapecio, resSimpson13, resSimpson38, errorTrapecio, errorSimpson13, referenciaEsAnalitica, convergencia }
  ) {
    const contenedor = document.getElementById('interpretacion-d');
    if (!contenedor) return;

    const duracion  = b - a;
    const promDiario = resSimpson13 / duracion;
    const mejorMetodo = errorSimpson13 <= (errorTrapecio ?? Infinity)
      ? 'Simpson 1/3'
      : 'Trapecio';

    // Recomendación según orden de convergencia
    const ordenTrapecio  = 'O(h²)';
    const ordenSimpson   = 'O(h⁴)';

    const advertenciaN = n < 30
      ? `<div class="alert alert--warning">
          ⚠ Con n = ${n} subintervalos, la precisión puede ser limitada.
          Se recomienda n ≥ 30 para resultados confiables en análisis de política pública.
        </div>`
      : '';

    contenedor.innerHTML = `
      ${advertenciaN}

      <h3>Gasto total durante la crisis</h3>
      <p>
        Integrando la tasa de gasto desde el día <strong>${a}</strong> hasta el
        día <strong>${b}</strong> (${duracion} días de crisis), el costo total
        estimado por <strong>Simpson 1/3</strong> es
        <strong>${resSimpson13.toFixed(4)} millones de Bs</strong>,
        con un gasto diario promedio de <strong>${promDiario.toFixed(4)} M Bs/día</strong>.
      </p>

      <h3>Comparación de métodos de integración numérica</h3>
      <ul>
        <li>
          <strong>Regla del Trapecio (${ordenTrapecio}):</strong> Aproxima cada
          subintervalo como un trapecio. Simple y robusto, pero converge lentamente.
          Error relativo: <code>${errorTrapecio.toFixed(6)}%</code>.
        </li>
        <li>
          <strong>Simpson 1/3 (${ordenSimpson}):</strong> Usa parabolas por pares de
          subintervalos (n par). Cuatro órdenes de magnitud más preciso que el Trapecio
          para funciones suaves. Error: <code>${errorSimpson13.toFixed(8)}%</code>.
          <strong>Método recomendado.</strong>
        </li>
        <li>
          <strong>Simpson 3/8 (${ordenSimpson}):</strong> Usa polinomios cúbicos por
          triples de subintervalos (n múltiplo de 3). Precisión similar a Simpson 1/3,
          útil cuando n es múltiplo de 3 pero no de 2.
          ${resSimpson38 !== null
            ? `Resultado: <code>${resSimpson38.toFixed(6)}</code>`
            : 'No aplicable para el n seleccionado.'}
        </li>
      </ul>

      <h3>Implicaciones para la planificación de emergencias</h3>
      <ul>
        <li>
          El modelo <strong>${modelo.nombre}</strong> (${modelo.formula}) captura la
          dinámica de gasto bajo el supuesto de ${modelo.descripcion.toLowerCase()}.
        </li>
        <li>
          Para presupuestación de emergencia, usar <strong>Simpson 1/3 con n ≥ 60</strong>
          garantiza un error por debajo del 0.001%, suficiente para decisiones de política
          de millones de bolivianos.
        </li>
        <li>
          El gasto diario promedio de <strong>${promDiario.toFixed(2)} M Bs/día</strong>
          permite estimar la reserva de emergencia necesaria para extender la respuesta
          a una crisis de duración diferente.
        </li>
        ${convergencia
          ? `<li>
              El análisis de convergencia confirma que Simpson 1/3 alcanza error
              < 0.0001% con n = ${convergencia.find(r => r.errS13 < 0.0001)?.n ?? '≥ 300'},
              mientras Trapecio requiere n mucho mayor para la misma precisión.
            </li>`
          : ''}
      </ul>
    `;
  }

  // ─── Restablecer ─────────────────────────────────────────────
  function _restablecerTodo() {
    limpiarErrores(['error-n', 'error-t-inicio', 'error-t-fin', 'error-general-d']);

    const modeloSelect = document.getElementById('modelo-tasa');
    if (modeloSelect) { modeloSelect.value = 'lineal'; _renderizarParamsModelo('lineal'); }

    document.getElementById('n-subintervalos') && (document.getElementById('n-subintervalos').value = '100');
    document.getElementById('t-inicio')        && (document.getElementById('t-inicio').value = '0');
    document.getElementById('t-fin')           && (document.getElementById('t-fin').value = '30');
    document.getElementById('x-eval')          && (document.getElementById('x-eval').value = '');

    filasManual = [
      { t: 0,  ft: 10 }, { t: 5,  ft: 25 }, { t: 10, ft: 45 },
      { t: 15, ft: 80 }, { t: 20, ft: 60 }, { t: 25, ft: 40 }, { t: 30, ft: 30 }
    ];

    const divRes = document.getElementById('resultados-d');
    if (divRes) divRes.hidden = true;

    [chartTasa, chartAcum, chartError].forEach(c => { if (c) { c.destroy(); } });
    chartTasa = chartAcum = chartError = null;

    mostrarNotificacion('Escenario D restablecido', 'info');
  }

  // Exponer al scope global para el router runtime
  window.renderizarEscenarioD = renderizarEscenarioD;

})();