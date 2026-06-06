// ============================================================
// escenarioA.js - Escenario A: Distribución de Abastecimiento
// Métodos: Gauss-Seidel + Eliminación Gaussiana (LU simplificado)
// Contexto: Optimizar distribución de recursos entre zonas en crisis
// ============================================================

const LIMITES = window.APP_CONFIG?.ALGORITMOS ?? {};

function gaussSeidel(...args) {
  return window.SistemasLineales?.gaussSeidel?.(...args);
}

function eliminacionGaussiana(...args) {
  return window.SistemasLineales?.eliminacionGaussiana?.(...args);
}

function crearGraficoBarras(...args) {
  return window.Graficos?.barra?.(...args);
}

function crearGraficoLineas(...args) {
  return window.Graficos?.linea?.(...args);
}

function destruirGrafico(...args) {
  return window.Graficos?.destruir?.(...args);
}

function renderizarTablaIteraciones(...args) {
  return window.Tablas?.iteraciones?.(...args);
}

function renderizarTablaResultados(...args) {
  return window.Tablas?.sistema?.(...args);
}

function mostrarNotificacion(mensaje, tipo = 'info') {
  const notifier = window.Notificaciones;
  if (!notifier) return;
  if (tipo === 'success')  return notifier.exito(mensaje);
  if (tipo === 'error')    return notifier.error(mensaje);
  if (tipo === 'warning' || tipo === 'warn') return notifier.advertencia(mensaje);
  return notifier.info(mensaje);
}

function validarMatriz(A, n) {
  if (!Array.isArray(A) || A.length !== n)
    return 'La matriz debe ser cuadrada y tener el tamaño correcto.';
  for (let i = 0; i < n; i++) {
    if (!Array.isArray(A[i]) || A[i].length !== n)
      return 'La matriz debe ser cuadrada y contener todas las filas.';
    for (let j = 0; j < n; j++) {
      if (typeof A[i][j] !== 'number' || !isFinite(A[i][j]))
        return 'Todos los coeficientes de la matriz deben ser números válidos.';
    }
  }
  return '';
}

function validarVector(b, n) {
  if (!Array.isArray(b) || b.length !== n)
    return 'El vector debe tener el tamaño correcto.';
  for (let i = 0; i < n; i++) {
    if (typeof b[i] !== 'number' || !isFinite(b[i]))
      return 'Todos los valores del vector deben ser números válidos.';
  }
  return '';
}

function mostrarError(campo, mensaje) {
  const errorEl = document.getElementById(campo);
  if (!errorEl) return;
  errorEl.textContent = mensaje;
  errorEl.style.display = mensaje ? 'block' : 'none';
}

function limpiarErrores(campos) {
  if (!Array.isArray(campos)) campos = [campos];
  campos.forEach((campo) => {
    const errorEl = document.getElementById(campo);
    if (!errorEl) return;
    errorEl.textContent = '';
    errorEl.style.display = 'none';
  });
}

// ------------------------------------------------------------
// ESTADO LOCAL
// ------------------------------------------------------------
const estadoEscA = {
  metodoActual: 'gauss-seidel',
  resultados: null,
  graficos: {},
};

// ------------------------------------------------------------
// DATOS DE EJEMPLO — Lee desde window.DATOS_EJEMPLOS (ejemplos.json)
// Si no están cargados, usa fallback hardcodeado
// ------------------------------------------------------------
function obtenerEjemplosDisponibles() {
  const datos = window.DATOS_EJEMPLOS?.escenarios?.escenarioA?.ejemplos;
  if (datos && datos.length > 0) return datos;

  return [
    {
      id: 'A0',
      nombre: 'Red de 3 zonas — Crisis alimentaria (fallback)',
      dificultad: 'basico',
      descripcion: 'Sistema cargado localmente (ejemplos.json no disponible).',
      parametros: {
        n: 3,
        matriz: [
          [10, -1,  2],
          [-1, 11, -1],
          [ 2, -1, 10],
        ],
        terminos_independientes: [6, 25, -11],
        tolerancia: 1e-6,
        metodo: 'gauss-seidel',
      },
      interpretacion: 'Distribución de alimentos entre tres zonas urbanas con restricciones logísticas.',
      unidades: 'toneladas/día',
      descripcion_contexto: [
        'Zona Norte: capacidad vía principal 10t, interferencia zona centro -1t, apoyo zona sur 2t = 6t netas',
        'Zona Centro: interferencia norte -1t, capacidad central 11t, interferencia sur -1t = 25t demanda',
        'Zona Sur: apoyo norte 2t, interferencia centro -1t, capacidad sur 10t = -11t (excedente redistribuible)',
      ],
    },
  ];
}

// ------------------------------------------------------------
// RENDER PRINCIPAL
// ------------------------------------------------------------
function renderizarEscenarioA(contenedor) {
  try {
    limpiarGraficos();
    estadoEscA.resultados = null;
    contenedor.innerHTML = generarHTML();
    adjuntarEventos();
    // Cargar automáticamente el primer ejemplo al abrir el escenario
    cargarEjemploSeleccionado();
  } catch (err) {
    console.error('Error en renderizarEscenarioA:', err);
    if (contenedor) {
      contenedor.innerHTML = `
        <div class="alert alert--error" role="alert">
          ❌ Ocurrió un error al cargar el Escenario A. Abre la consola para más detalles.
        </div>`;
    }
    try { window.Notificaciones?.error('Error al cargar Escenario A.'); } catch (_) {}
  }
}

// ------------------------------------------------------------
// HTML DEL ESCENARIO
// ------------------------------------------------------------
function generarHTML() {
  return `
    <div class="escenario-header escenario-header--a">
      <div class="escenario-header__badge">Escenario A</div>
      <h1 class="escenario-header__titulo">Distribución de Abastecimiento en Crisis</h1>
      <p class="escenario-header__descripcion">
        Durante una crisis de desabastecimiento, múltiples zonas urbanas compiten por recursos limitados.
        Modelamos la distribución óptima como un <strong>sistema de ecuaciones lineales</strong>
        donde cada ecuación representa las restricciones de una zona (capacidad de vías, demanda compartida,
        interferencias logísticas).
      </p>
      <div class="escenario-header__metodos">
        <span class="badge badge--metodo">Gauss-Seidel</span>
        <span class="badge badge--metodo">Eliminación Gaussiana</span>
        <span class="badge badge--contexto">Sistemas Lineales</span>
      </div>
    </div>

    <div class="card card--info mb-4">
      <div class="card__header">
        <h2 class="card__title">📐 Modelo Matemático</h2>
      </div>
      <div class="card__body">
        <p>Dado un sistema <strong>A·x = b</strong> donde:</p>
        <ul class="lista-modelo">
          <li><strong>A</strong> = Matriz de coeficientes (restricciones logísticas entre zonas)</li>
          <li><strong>x</strong> = Vector solución (toneladas a distribuir por zona)</li>
          <li><strong>b</strong> = Vector de necesidades netas por zona</li>
        </ul>
        <p class="mt-2">
          <strong>Gauss-Seidel</strong>: iterativo, ideal cuando la matriz es diagonal dominante.
          <strong>Eliminación Gaussiana</strong>: directo, garantiza solución exacta.
        </p>
      </div>
    </div>

    <div class="card mb-4">
      <div class="card__header">
        <h2 class="card__title">⚙️ Configurar Sistema</h2>
      </div>
      <div class="card__body">

        <div class="form-row form-row--3-col">
          <div class="form-group">
            <label class="form-label" for="escA-n">Número de zonas (n)</label>
            <select class="form-input" id="escA-n">
              <option value="2">2 zonas</option>
              <option value="3" selected>3 zonas</option>
              <option value="4">4 zonas</option>
              <option value="5">5 zonas</option>
            </select>
            <span class="form-help">Tamaño del sistema n×n</span>
          </div>

          <div class="form-group">
            <label class="form-label" for="escA-metodo">Método de resolución</label>
            <select class="form-input" id="escA-metodo">
              <option value="gauss-seidel" selected>Gauss-Seidel (iterativo)</option>
              <option value="gaussiana">Eliminación Gaussiana (directo)</option>
            </select>
          </div>

          <div class="form-group" id="escA-tolerancia-grupo">
            <label class="form-label" for="escA-tolerancia">Tolerancia (Gauss-Seidel)</label>
            <input type="number" class="form-input" id="escA-tolerancia"
              value="0.000001" min="0.000001" max="0.1" step="0.000001">
            <span class="form-help">Error máximo entre iteraciones</span>
          </div>
        </div>

        <!-- SELECTOR DE EJEMPLOS DESDE JSON -->
        <div class="form-row form-row--2-col" style="margin-bottom: var(--spacing-3);">
          <div class="form-group">
            <label class="form-label" for="escA-select-ejemplo">Ejemplo precargado</label>
            <select class="form-input" id="escA-select-ejemplo">
              <option value="">— Selecciona un ejemplo —</option>
            </select>
            <span class="form-help" id="escA-ejemplo-dificultad"></span>
          </div>
          <div class="form-group" style="display:flex; align-items:flex-end; gap: var(--spacing-2);">
            <button class="btn btn--secondary btn--small" id="escA-btn-ejemplo">
              📋 Cargar Ejemplo
            </button>
            <button class="btn btn--secondary btn--small" id="escA-btn-limpiar">
              🗑️ Limpiar
            </button>
          </div>
        </div>

        <div id="escA-descripcion-ejemplo" class="alert alert--info mb-3" style="display:none;">
          <strong>Contexto del ejemplo cargado:</strong>
          <ul id="escA-lista-descripcion" class="mt-1"></ul>
        </div>

        <div class="form-group">
          <label class="form-label">Matriz de coeficientes A</label>
          <div id="escA-matriz-container" class="matriz-container"></div>
          <span id="escA-error-matriz" class="form-error" style="display:none;"></span>
        </div>

        <div class="form-group mt-3">
          <label class="form-label">Vector de necesidades b</label>
          <div id="escA-vector-container" class="vector-container"></div>
          <span id="escA-error-vector" class="form-error" style="display:none;"></span>
        </div>

        <div class="form-button-group mt-4">
          <button class="btn btn--primary btn--large" id="escA-btn-calcular">
            🔢 Calcular Distribución
          </button>
        </div>
      </div>
    </div>

    <div id="escA-resultados" style="display:none;">

      <div class="card mb-4">
        <div class="card__header">
          <h2 class="card__title">✅ Solución: Distribución Óptima</h2>
        </div>
        <div class="card__body">
          <div id="escA-tabla-solucion"></div>
          <div id="escA-verificacion" class="mt-3"></div>
        </div>
      </div>

      <div class="card mb-4">
        <div class="card__header">
          <h2 class="card__title">📊 Distribución por Zona</h2>
        </div>
        <div class="card__body">
          <div class="grafico-container">
            <canvas id="escA-grafico-barras"></canvas>
          </div>
        </div>
      </div>

      <div id="escA-iteraciones-card" class="card mb-4" style="display:none;">
        <div class="card__header">
          <h2 class="card__title">🔄 Historial de Iteraciones</h2>
          <button class="btn btn--small btn--secondary" id="escA-btn-toggle-iter">
            Mostrar/Ocultar
          </button>
        </div>
        <div class="card__body" id="escA-iteraciones-body">
          <div id="escA-tabla-iteraciones"></div>
          <div class="grafico-container mt-4">
            <canvas id="escA-grafico-convergencia"></canvas>
          </div>
        </div>
      </div>

      <div class="card card--escenario-a mb-4">
        <div class="card__header">
          <h2 class="card__title">💡 Interpretación de Resultados</h2>
        </div>
        <div class="card__body">
          <div id="escA-interpretacion"></div>
        </div>
      </div>

    </div>
  `;
}

// ------------------------------------------------------------
// EVENTOS
// ------------------------------------------------------------
function adjuntarEventos() {
  document.getElementById('escA-n')
    .addEventListener('change', (e) => {
      regenerarInputs(parseInt(e.target.value));
      ocultarResultados();
    });

  document.getElementById('escA-metodo')
    .addEventListener('change', (e) => {
      estadoEscA.metodoActual = e.target.value;
      const grupoTol = document.getElementById('escA-tolerancia-grupo');
      grupoTol.style.display = e.target.value === 'gauss-seidel' ? 'block' : 'none';
      ocultarResultados();
    });

  document.getElementById('escA-btn-ejemplo')
    .addEventListener('click', cargarEjemploSeleccionado);

  document.getElementById('escA-btn-limpiar')
    .addEventListener('click', limpiarFormulario);

  document.getElementById('escA-btn-calcular')
    .addEventListener('click', ejecutarCalculo);

  document.getElementById('escA-btn-toggle-iter')
    ?.addEventListener('click', () => {
      const body = document.getElementById('escA-iteraciones-body');
      if (body) body.style.display = body.style.display === 'none' ? 'block' : 'none';
    });

  poblarSelectEjemplos();
}

// ------------------------------------------------------------
// POBLAR SELECT
// ------------------------------------------------------------
function poblarSelectEjemplos() {
  const select = document.getElementById('escA-select-ejemplo');
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

  select.addEventListener('change', () => {
    const lista = obtenerEjemplosDisponibles();
    const sel = lista.find(e => e.id === select.value);
    const span = document.getElementById('escA-ejemplo-dificultad');
    if (span) span.textContent = sel ? `Dificultad: ${sel.dificultad ?? '—'}` : '';
  });
}

// ------------------------------------------------------------
// CARGAR EJEMPLO SELECCIONADO
// ------------------------------------------------------------
function cargarEjemploSeleccionado() {
  const select = document.getElementById('escA-select-ejemplo');
  const idSel  = select?.value;
  const ejemplos = obtenerEjemplosDisponibles();
  const ejemplo  = idSel
    ? ejemplos.find(e => e.id === idSel)
    : ejemplos[0];

  if (!ejemplo) {
    mostrarNotificacion('No hay ejemplos disponibles.', 'warning');
    return;
  }

  const { n, matriz, terminos_independientes, metodo, tolerancia } = ejemplo.parametros;

  // n
  const selectN = document.getElementById('escA-n');
  if (selectN) selectN.value = n;
  regenerarInputs(n);

  // Matriz A
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++) {
      const inp = document.getElementById(`escA-a-${i}-${j}`);
      if (inp) inp.value = matriz[i][j];
    }

  // Vector b
  for (let i = 0; i < n; i++) {
    const inp = document.getElementById(`escA-b-${i}`);
    if (inp) inp.value = terminos_independientes[i];
  }

  // Método
  if (metodo) {
    const selMet = document.getElementById('escA-metodo');
    if (selMet) {
      selMet.value = metodo;
      estadoEscA.metodoActual = metodo;
      const gt = document.getElementById('escA-tolerancia-grupo');
      if (gt) gt.style.display = metodo === 'gauss-seidel' ? 'block' : 'none';
    }
  }

  // Tolerancia
  if (tolerancia) {
    const inpTol = document.getElementById('escA-tolerancia');
    if (inpTol) inpTol.value = tolerancia;
  }

  // Descripción contextual
  const divDesc = document.getElementById('escA-descripcion-ejemplo');
  const lista   = document.getElementById('escA-lista-descripcion');
  const contexto = ejemplo.descripcion_contexto ?? ejemplo.descripcion;

  if (lista && divDesc) {
    const items = Array.isArray(contexto)
      ? contexto.map(d => `<li>${d}</li>`).join('')
      : `<li>${contexto}</li>`;

    const interpretacion = ejemplo.interpretacion
      ? `<li style="margin-top:var(--spacing-2);">
           <strong>Interpretación:</strong> ${ejemplo.interpretacion}
           ${ejemplo.unidades ? `<em>(${ejemplo.unidades})</em>` : ''}
         </li>`
      : '';

    const solucion = ejemplo.solucion_esperada
      ? `<li>
           <strong>Solución esperada:</strong>
           [${ejemplo.solucion_esperada.map(v =>
             typeof v === 'number' ? v.toFixed(3) : v
           ).join(', ')}]
           ${ejemplo.unidades ?? ''}
         </li>`
      : '';

    lista.innerHTML = items + interpretacion + solucion;
    divDesc.style.display = 'block';
  }

  ocultarResultados();
  mostrarNotificacion(`✅ "${ejemplo.nombre}" cargado`, 'success');
}

// ------------------------------------------------------------
// REGENERAR INPUTS DINÁMICOS
// ------------------------------------------------------------
function regenerarInputs(n) {
  const matrizContainer = document.getElementById('escA-matriz-container');
  const vectorContainer = document.getElementById('escA-vector-container');

  let htmlMatriz = `<table class="tabla-inputs-matriz" aria-label="Matriz A">`;
  htmlMatriz += `<thead><tr><th></th>${Array.from({length:n},(_,j)=>`<th>Zona ${j+1}</th>`).join('')}</tr></thead><tbody>`;
  for (let i = 0; i < n; i++) {
    htmlMatriz += `<tr><th>Zona ${i+1}</th>`;
    for (let j = 0; j < n; j++) {
      htmlMatriz += `<td><input type="number" class="form-input form-input--matrix"
        id="escA-a-${i}-${j}" placeholder="a${i+1}${j+1}" step="any"
        aria-label="Coeficiente fila ${i+1} col ${j+1}"></td>`;
    }
    htmlMatriz += `</tr>`;
  }
  htmlMatriz += `</tbody></table>`;
  matrizContainer.innerHTML = htmlMatriz;

  let htmlVector = `<div class="vector-inputs">`;
  for (let i = 0; i < n; i++) {
    htmlVector += `
      <div class="form-group form-group--inline">
        <label class="form-label" for="escA-b-${i}">b${i+1} (Zona ${i+1})</label>
        <input type="number" class="form-input" id="escA-b-${i}"
          placeholder="Necesidad zona ${i+1}" step="any"
          aria-label="Necesidad zona ${i+1}">
      </div>`;
  }
  htmlVector += `</div>`;
  vectorContainer.innerHTML = htmlVector;
}

// ------------------------------------------------------------
// LIMPIAR FORMULARIO
// ------------------------------------------------------------
function limpiarFormulario() {
  const n = parseInt(document.getElementById('escA-n').value);
  regenerarInputs(n);
  document.getElementById('escA-descripcion-ejemplo').style.display = 'none';
  limpiarErrores(['escA-error-matriz', 'escA-error-vector']);
  ocultarResultados();
}

// ------------------------------------------------------------
// LEER DATOS DEL FORMULARIO
// ------------------------------------------------------------
function leerDatosFormulario() {
  const n = parseInt(document.getElementById('escA-n').value);
  const A = [];
  const b = [];
  for (let i = 0; i < n; i++) {
    A.push([]);
    for (let j = 0; j < n; j++) {
      A[i].push(parseFloat(document.getElementById(`escA-a-${i}-${j}`)?.value));
    }
    b.push(parseFloat(document.getElementById(`escA-b-${i}`)?.value));
  }
  return { n, A, b };
}

// ------------------------------------------------------------
// VALIDACIONES
// ------------------------------------------------------------
function validarDatos(n, A, b) {
  const errores = [];
  const eM = validarMatriz(A, n);
  if (eM) errores.push({ campo: 'escA-error-matriz', msg: eM });
  const eV = validarVector(b, n);
  if (eV) errores.push({ campo: 'escA-error-vector', msg: eV });
  if (errores.length > 0) {
    errores.forEach(({ campo, msg }) => mostrarError(campo, msg));
    return false;
  }
  if (estadoEscA.metodoActual === 'gauss-seidel' && !verificarDiagonalDominante(A, n)) {
    mostrarNotificacion(
      '⚠️ La matriz no es diagonal dominante. Gauss-Seidel puede no converger. ' +
      'Considera Eliminación Gaussiana.', 'warning'
    );
  }
  limpiarErrores(['escA-error-matriz', 'escA-error-vector']);
  return true;
}

function verificarDiagonalDominante(A, n) {
  for (let i = 0; i < n; i++) {
    let suma = 0;
    for (let j = 0; j < n; j++) if (i !== j) suma += Math.abs(A[i][j]);
    if (Math.abs(A[i][i]) <= suma) return false;
  }
  return true;
}

// ------------------------------------------------------------
// EJECUTAR CÁLCULO
// ------------------------------------------------------------
function ejecutarCalculo() {
  limpiarErrores(['escA-error-matriz', 'escA-error-vector']);
  const { n, A, b } = leerDatosFormulario();
  if (!validarDatos(n, A, b)) return;

  const metodo     = document.getElementById('escA-metodo').value;
  const tolerancia = parseFloat(document.getElementById('escA-tolerancia').value) || 1e-6;
  const maxIter    = LIMITES?.MAX_ITERACIONES || 100;

  let resultado;
  try {
    resultado = metodo === 'gauss-seidel'
      ? gaussSeidel(A, b, tolerancia, maxIter)
      : eliminacionGaussiana(A, b);
  } catch (err) {
    mostrarNotificacion(`Error en el cálculo: ${err.message}`, 'error');
    return;
  }

  if (!resultado?.solucion) {
    mostrarNotificacion('El sistema no tiene solución única o no convergió.', 'error');
    return;
  }

  estadoEscA.resultados = { ...resultado, n, A, b, metodo };
  renderizarResultados();
  mostrarNotificacion('✅ Cálculo completado exitosamente', 'success');
}

// ------------------------------------------------------------
// RENDERIZAR RESULTADOS
// ------------------------------------------------------------
function renderizarResultados() {
  const { solucion, iteraciones, n, A, b, metodo } = estadoEscA.resultados;

  document.getElementById('escA-resultados').style.display = 'block';
  document.getElementById('escA-resultados').scrollIntoView({ behavior: 'smooth' });

  renderizarTablaSolucion(solucion, n);
  renderizarVerificacion(A, solucion, b, n);
  renderizarGraficoDistribucion(solucion, n);

  if (metodo === 'gauss-seidel' && iteraciones?.length > 0) {
    document.getElementById('escA-iteraciones-card').style.display = 'block';
    renderizarTablaIteraciones(
      document.getElementById('escA-tabla-iteraciones'),
      iteraciones,
      solucion.length
    );
    renderizarGraficoConvergencia(iteraciones, solucion.length);
  } else {
    document.getElementById('escA-iteraciones-card').style.display = 'none';
  }

  renderizarInterpretacion(solucion, n, metodo, iteraciones);
}

// ------------------------------------------------------------
// TABLA SOLUCIÓN
// ------------------------------------------------------------
function renderizarTablaSolucion(solucion, n) {
  const contenedor = document.getElementById('escA-tabla-solucion');
  let html = `
    <table class="tabla-resultados" aria-label="Solución del sistema">
      <thead>
        <tr>
          <th>Zona</th>
          <th>Variable</th>
          <th class="table__cell--number">Toneladas a distribuir</th>
          <th>Situación</th>
        </tr>
      </thead>
      <tbody>`;

  solucion.forEach((val, i) => {
    const ton = parseFloat(val.toFixed(6));
    let sit, cls;
    if (ton < 0)    { sit = '⬇️ Excedente (puede redistribuir)'; cls = 'table__cell--highlight'; }
    else if (ton > 50) { sit = '🚨 Alta demanda crítica';        cls = 'table__cell--error'; }
    else if (ton > 20) { sit = '⚠️ Demanda elevada';            cls = ''; }
    else               { sit = '✅ Demanda normal';              cls = ''; }

    html += `
      <tr>
        <td><strong>Zona ${i+1}</strong></td>
        <td>x<sub>${i+1}</sub></td>
        <td class="table__cell--number ${cls}">${ton.toFixed(4)}</td>
        <td>${sit}</td>
      </tr>`;
  });

  html += `</tbody></table>`;
  contenedor.innerHTML = html;
}

// ------------------------------------------------------------
// VERIFICACIÓN A·x = b
// ------------------------------------------------------------
function renderizarVerificacion(A, solucion, b, n) {
  const contenedor = document.getElementById('escA-verificacion');
  const Ax = A.map(fila => fila.reduce((s, aij, j) => s + aij * solucion[j], 0));
  const errores = Ax.map((v, i) => Math.abs(v - b[i]));
  const errorMax = Math.max(...errores);
  const exacto = errorMax < 1e-6;

  let html = `
    <div class="alert ${exacto ? 'alert--success' : 'alert--warning'}">
      <strong>Verificación A·x = b</strong>: Error máximo = ${errorMax.toExponential(4)}
      ${exacto ? '✅ Solución exacta' : '⚠️ Error residual (normal en métodos iterativos)'}
    </div>
    <table class="tabla-resultados mt-2" aria-label="Verificación">
      <thead>
        <tr>
          <th>Zona</th>
          <th class="table__cell--number">b (real)</th>
          <th class="table__cell--number">A·x (calculado)</th>
          <th class="table__cell--number">Error residual</th>
        </tr>
      </thead>
      <tbody>`;

  for (let i = 0; i < n; i++) {
    html += `
      <tr>
        <td>Zona ${i+1}</td>
        <td class="table__cell--number">${b[i].toFixed(4)}</td>
        <td class="table__cell--number">${Ax[i].toFixed(4)}</td>
        <td class="table__cell--number ${errores[i] > 1e-4 ? 'table__cell--error' : ''}">
          ${errores[i].toExponential(4)}
        </td>
      </tr>`;
  }
  html += `</tbody></table>`;
  contenedor.innerHTML = html;
}

// ------------------------------------------------------------
// GRÁFICO BARRAS — DISTRIBUCIÓN
// ------------------------------------------------------------
function renderizarGraficoDistribucion(solucion, n) {
  limpiarGrafico('escA-grafico-barras');
  const etiquetas = Array.from({ length: n }, (_, i) => `Zona ${i+1}`);
  const colores = solucion.map(v =>
    v < 0 ? '#6C8C74' : v > 50 ? '#D97059' : v > 20 ? '#F29966' : '#3E594F'
  );
  estadoEscA.graficos['barras'] = crearGraficoBarras(
    'escA-grafico-barras',
    {
      labels: etiquetas,
      datasets: [{
        label: 'Toneladas a distribuir',
        data: solucion.map(v => parseFloat(v.toFixed(4))),
        backgroundColor: colores,
        borderColor: colores.map(c => c + 'CC'),
        borderWidth: 2,
        borderRadius: 4,
      }],
    },
    {
      plugins: {
        title: { display: true, text: 'Distribución de Recursos por Zona', font: { size: 14 } },
        legend: { display: false },
        tooltip: { callbacks: { label: ctx => ` ${ctx.parsed.y.toFixed(4)} toneladas` } },
      },
      scales: {
        y: { title: { display: true, text: 'Toneladas' }, beginAtZero: true },
        x: { title: { display: true, text: 'Zonas' } },
      },
    }
  );
}

// ------------------------------------------------------------
// GRÁFICO CONVERGENCIA — GAUSS-SEIDEL
// ------------------------------------------------------------
function renderizarGraficoConvergencia(iteraciones, nVars) {
  limpiarGrafico('escA-grafico-convergencia');
  const colores = ['#3E594F','#6C8C74','#F29966','#D97059','#C9D7A6'];
  const labels  = iteraciones.map((_, i) => `Iter ${i+1}`);
  const datasets = Array.from({ length: nVars }, (_, v) => ({
    label: `x${v+1} (Zona ${v+1})`,
    data: iteraciones.map(it => parseFloat(it.valores[v].toFixed(6))),
    borderColor: colores[v % colores.length],
    backgroundColor: colores[v % colores.length] + '20',
    tension: 0.3,
    fill: false,
    pointRadius: iteraciones.length <= 20 ? 4 : 2,
  }));
  estadoEscA.graficos['convergencia'] = crearGraficoLineas(
    'escA-grafico-convergencia',
    { labels, datasets },
    {
      plugins: {
        title: { display: true, text: 'Convergencia de Gauss-Seidel', font: { size: 14 } },
      },
      scales: {
        y: { title: { display: true, text: 'Valor de la variable' } },
        x: { title: { display: true, text: 'Iteración' } },
      },
    }
  );
}

// ------------------------------------------------------------
// INTERPRETACIÓN AUTOMÁTICA
// ------------------------------------------------------------
function renderizarInterpretacion(solucion, n, metodo, iteraciones) {
  const contenedor = document.getElementById('escA-interpretacion');
  const iMax = solucion.indexOf(Math.max(...solucion));
  const iMin = solucion.indexOf(Math.min(...solucion));
  const hayExcedente = solucion.some(v => v < 0);
  const total = solucion.filter(v => v > 0).reduce((a, c) => a + c, 0);
  const numIter = iteraciones ? iteraciones.length : 'N/A';
  const nombre  = metodo === 'gauss-seidel' ? 'Gauss-Seidel' : 'Eliminación Gaussiana';

  contenedor.innerHTML = `
    <div class="interpretacion-grid">

      <div class="interpretacion-item">
        <h3>📦 Distribución Total</h3>
        <p>
          El sistema requiere distribuir <strong>${total.toFixed(2)} toneladas</strong> entre ${n} zonas.
          Mayor demanda: <strong>Zona ${iMax+1}</strong> (${solucion[iMax].toFixed(4)} t).
          Menor demanda: <strong>Zona ${iMin+1}</strong> (${solucion[iMin].toFixed(4)} t).
        </p>
      </div>

      ${hayExcedente ? `
      <div class="interpretacion-item interpretacion-item--destacado">
        <h3>♻️ Excedente disponible</h3>
        <p>
          Las zonas con valores negativos tienen <strong>excedente redistribuible</strong>.
          Permite optimizar rutas logísticas priorizando zonas deficitarias.
        </p>
      </div>` : ''}

      <div class="interpretacion-item">
        <h3>🔢 Método: ${nombre}</h3>
        <p>
          ${metodo === 'gauss-seidel'
            ? `Convergió en <strong>${numIter} iteraciones</strong>. Actualiza cada variable
               usando los valores más recientes. Ideal para sistemas grandes diagonalmente dominantes.`
            : `Solución <strong>directa y exacta</strong> sin iteraciones. Triangulariza la matriz
               y aplica sustitución regresiva. Recomendado cuando se requiere precisión máxima.`
          }
        </p>
      </div>

      <div class="interpretacion-item">
        <h3>🏙️ Recomendación Logística</h3>
        <p>
          Priorizar el envío a <strong>Zona ${iMax+1}</strong>. Establecer corredores humanitarios
          que respeten las capacidades de la matriz A. La solución garantiza que se satisfacen
          todas las restricciones simultáneamente.
        </p>
      </div>

    </div>
  `;
}

// ------------------------------------------------------------
// HELPERS
// ------------------------------------------------------------
function ocultarResultados() {
  const res = document.getElementById('escA-resultados');
  if (res) res.style.display = 'none';
}

function limpiarGrafico(id) {
  destruirGrafico(id);
}

function limpiarGraficos() {
  Object.keys(estadoEscA.graficos).forEach(key => {
    try { estadoEscA.graficos[key]?.destroy(); } catch (_) {}
    estadoEscA.graficos[key] = null;
  });
}

// Exponer al router
window.renderizarEscenarioA = renderizarEscenarioA;