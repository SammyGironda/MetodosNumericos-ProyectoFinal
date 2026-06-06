/**
 * escenarioD.js — Costo Acumulado de Crisis
 * Simulación Numérica de Crisis - Métodos Numéricos Aplicados
 *
 * CONTEXTO DEL PROBLEMA:
 *   Durante una crisis de abastecimiento, el gobierno necesita calcular
 *   el costo total acumulado de las medidas de emergencia en un período
 *   [t0, tFin]. Si c(t) representa el costo marginal (costo por unidad
 *   de tiempo) de las intervenciones, el costo total es:
 *
 *     C_total = ∫[t0, tFin] c(t) dt
 *
 *   Modelos de costo marginal disponibles:
 *     1. Lineal creciente:   c(t) = a + b·t
 *     2. Exponencial:        c(t) = A·e^(k·t)
 *     3. Cuadrático:         c(t) = a·t² + b·t + c
 *     4. Sinusoidal (ciclos semanales): c(t) = A + B·sin(2π·t/7)
 *     5. Personalizado: el usuario escribe su propia función
 *
 * MÉTODOS NUMÉRICOS (ejecutados en paralelo para comparar):
 *   1. Regla del Trapecio compuesta
 *   2. Regla de Simpson 1/3 compuesta
 *   3. Cuadratura de Gauss-Legendre (5 puntos)
 *
 *   Si se conoce la primitiva analítica, se calcula el error real de
 *   cada método numérico.
 *
 * EXPORTA: window.escenarioD
 */

'use strict';

// ─────────────────────────────────────────────
// ALGORITMOS DE INTEGRACIÓN (autocontenidos)
// ─────────────────────────────────────────────

/**
 * Evalúa f(x) de forma segura.
 * @param {Function} f
 * @param {number}   x
 * @returns {{ valor: number, error: string|null }}
 */
function evaluarSeguro(f, x) {
  try {
    const v = f(x);
    if (!isFinite(v)) return { valor: NaN, error: `f(${x.toFixed(4)}) no es finito.` };
    return { valor: v, error: null };
  } catch (e) {
    return { valor: NaN, error: `Error en f(${x.toFixed(4)}): ${e.message}` };
  }
}

/**
 * Genera n+1 puntos equiespaciados en [a,b] con sus valores f(xi).
 * @param {Function} f
 * @param {number}   a
 * @param {number}   b
 * @param {number}   n - número de subintervalos
 * @returns {{ xs: number[], ys: number[], error: string|null }}
 */
function generarPuntos(f, a, b, n) {
  const h = (b - a) / n;
  const xs = [], ys = [];
  for (let i = 0; i <= n; i++) {
    const x = a + i * h;
    const { valor, error } = evaluarSeguro(f, x);
    if (error) return { xs: [], ys: [], error };
    xs.push(x);
    ys.push(valor);
  }
  return { xs, ys, error: null };
}

/**
 * Regla del Trapecio compuesta.
 * T = (h/2)·[f(x0) + 2f(x1) + ... + 2f(x_{n-1}) + f(xn)]
 * Error: O(h²)
 *
 * @param {Function} f
 * @param {number}   a
 * @param {number}   b
 * @param {number}   n - subintervalos
 * @returns {Object}
 */
function trapecio(f, a, b, n) {
  const { xs, ys, error } = generarPuntos(f, a, b, n);
  if (error) return { integral: NaN, error, metodo: 'Trapecio', iteraciones: [] };

  const h = (b - a) / n;
  let suma = ys[0] + ys[n];
  for (let i = 1; i < n; i++) suma += 2 * ys[i];
  const integral = (h / 2) * suma;

  const iteraciones = [];
  for (let i = 0; i < n; i++) {
    const area = (h / 2) * (ys[i] + ys[i + 1]);
    iteraciones.push({
      tramo: i + 1,
      xi:    xs[i],   fxi:  ys[i],
      xi1:   xs[i+1], fxi1: ys[i+1],
      area,
      detalle: `[${xs[i].toFixed(3)}, ${xs[i+1].toFixed(3)}]: área = ${area.toFixed(6)}`,
    });
  }

  return { integral, error: null, metodo: `Trapecio (n=${n})`,
           iteraciones, nEvaluaciones: n + 1, h, xs, ys };
}

/**
 * Regla de Simpson 1/3 compuesta.
 * S = (h/3)·[f(x0) + 4f(x1) + 2f(x2) + 4f(x3) + ... + f(xn)]
 * Requiere n par. Error: O(h⁴)
 *
 * @param {Function} f
 * @param {number}   a
 * @param {number}   b
 * @param {number}   n - subintervalos (se ajusta al siguiente par si es impar)
 * @returns {Object}
 */
function simpson13(f, a, b, n) {
  if (n % 2 !== 0) n++;

  const { xs, ys, error } = generarPuntos(f, a, b, n);
  if (error) return { integral: NaN, error, metodo: 'Simpson 1/3', iteraciones: [] };

  const h = (b - a) / n;
  let suma = ys[0] + ys[n];
  for (let i = 1; i < n; i++) suma += (i % 2 === 0 ? 2 : 4) * ys[i];
  const integral = (h / 3) * suma;

  const iteraciones = [];
  for (let i = 0; i < n; i += 2) {
    const area = (h / 3) * (ys[i] + 4 * ys[i+1] + ys[i+2]);
    iteraciones.push({
      tramo: i / 2 + 1,
      xi:  xs[i],   fxi:  ys[i],
      xm:  xs[i+1], fxm:  ys[i+1],
      xi2: xs[i+2], fxi2: ys[i+2],
      area,
      detalle: `[${xs[i].toFixed(3)}, ${xs[i+2].toFixed(3)}]: área = ${area.toFixed(6)}`,
    });
  }

  return { integral, error: null, metodo: `Simpson 1/3 (n=${n})`,
           iteraciones, nEvaluaciones: n + 1, h, xs, ys };
}

/**
 * Cuadratura de Gauss-Legendre con 5 puntos.
 * Exacta para polinomios de grado ≤ 9.
 * Cambio de variable: x = ((b-a)t + (b+a)) / 2, t ∈ [-1, 1]
 *
 * @param {Function} f
 * @param {number}   a
 * @param {number}   b
 * @returns {Object}
 */
function gaussLegendre5(f, a, b) {
  // Nodos y pesos estándar para 5 puntos (Burden & Faires, Tabla 4.2)
  const nodos = [
    -0.9061798459386640, -0.5384693101056831, 0.0,
     0.5384693101056831,  0.9061798459386640,
  ];
  const pesos = [
    0.2369268850561891, 0.4786286704993665, 0.5688888888888889,
    0.4786286704993665, 0.2369268850561891,
  ];

  const mitad  = (b - a) / 2;
  const centro = (b + a) / 2;
  const iteraciones = [];
  let suma = 0;

  for (let i = 0; i < 5; i++) {
    const x  = mitad * nodos[i] + centro;
    const { valor: fx, error } = evaluarSeguro(f, x);
    if (error) return { integral: NaN, error, metodo: 'Gauss-Legendre', iteraciones: [] };

    const contrib = pesos[i] * fx;
    suma += contrib;

    iteraciones.push({
      i: i + 1, nodo_t: nodos[i], x, fx, peso: pesos[i],
      contribucion: mitad * contrib,
      detalle: `t=${nodos[i].toFixed(6)}, x=${x.toFixed(6)}, f(x)=${fx.toFixed(6)}, w·f(x)=${contrib.toFixed(6)}`,
    });
  }

  return { integral: mitad * suma, error: null,
           metodo: 'Gauss-Legendre (5 puntos)',
           iteraciones, nEvaluaciones: 5 };
}

// ─────────────────────────────────────────────
// MODELOS DE COSTO MARGINAL
// ─────────────────────────────────────────────

/**
 * Construye la función c(t) según el modelo elegido.
 * También retorna la primitiva analítica C(t) cuando está disponible,
 * para calcular el error real de cada método numérico.
 *
 * @param {string} modelo
 * @param {Object} p       - parámetros del modelo
 * @returns {{ f: Function, C: Function|null, descripcion: string }|{ error: string }}
 */
function construirModelo(modelo, p) {
  switch (modelo) {

    case 'lineal': {
      // c(t) = a + b·t    →   C(t) = a·t + (b/2)·t²
      const f = t => p.a + p.b * t;
      const C = t => p.a * t + (p.b / 2) * t * t;
      return { f, C, descripcion: `c(t) = ${p.a} + ${p.b}·t` };
    }

    case 'exponencial': {
      // c(t) = A·e^(k·t)  →  C(t) = (A/k)·e^(k·t)
      if (Math.abs(p.k) < 1e-14)
        return { error: 'k no puede ser cero en el modelo exponencial.' };
      const f = t => p.A * Math.exp(p.k * t);
      const C = t => (p.A / p.k) * Math.exp(p.k * t);
      return { f, C, descripcion: `c(t) = ${p.A}·e^(${p.k}·t)` };
    }

    case 'cuadratico': {
      // c(t) = a·t² + b·t + c  →  C(t) = (a/3)·t³ + (b/2)·t² + c·t
      const f = t => p.a * t * t + p.b * t + p.c;
      const C = t => (p.a / 3) * t**3 + (p.b / 2) * t * t + p.c * t;
      return { f, C, descripcion: `c(t) = ${p.a}·t² + ${p.b}·t + ${p.c}` };
    }

    case 'sinusoidal': {
      // c(t) = A + B·sin(2π·t/7)  →  C(t) = A·t − B·(7/2π)·cos(2π·t/7)
      const omega = 2 * Math.PI / 7;
      const f = t => p.A + p.B * Math.sin(omega * t);
      const C = t => p.A * t - p.B * (7 / (2 * Math.PI)) * Math.cos(omega * t);
      return { f, C, descripcion: `c(t) = ${p.A} + ${p.B}·sin(2π·t/7)` };
    }

    case 'personalizado': {
      const expr = (p.expresion ?? '').trim().replace(/\^/g, '**');
      if (!expr) return { error: 'Escribe una expresión para el modelo personalizado.' };
      try {
        // eslint-disable-next-line no-new-func
        const f = new Function('t', `'use strict'; return (${expr});`);
        const prueba = f(1);
        if (!isFinite(prueba))
          return { error: 'La expresión no es finita en t = 1. Revísala.' };
        return { f, C: null, descripcion: `c(t) = ${p.expresion}` };
      } catch (e) {
        return { error: `Expresión inválida: ${e.message}` };
      }
    }

    default:
      return { error: `Modelo desconocido: ${modelo}` };
  }
}

// ─────────────────────────────────────────────
// EJEMPLOS PRECARGADOS DESDE ejemplos.json
// ─────────────────────────────────────────────

/**
 * Devuelve los ejemplos del escenarioD desde window.DATOS_EJEMPLOS.
 * Si no están disponibles, usa un fallback hardcodeado.
 * @returns {Object[]}
 */
function obtenerEjemplosDisponibles() {
  const datos = window.DATOS_EJEMPLOS?.escenarios?.escenarioD?.ejemplos;
  if (datos && datos.length > 0) return datos;

  // Fallback si ejemplos.json no está cargado
  return [
    {
      id: 'D0',
      nombre: 'Costo exponencial — fallback',
      dificultad: 'basico',
      descripcion: 'Ejemplo cargado localmente (ejemplos.json no disponible).',
      parametros: {
        funcion: 'exponencial',
        A: 500,
        k: 0.08,
        a: 0,
        b: 30,
        n: 100,
        metodo: 'simpson',
      },
      descripcion_funcion: 'f(t) = 500·e^(0.08·t)',
      interpretacion: 'Costo de emergencia con escalada exponencial durante 30 días.',
      unidades: 'Bs',
    },
  ];
}

/**
 * Puebla el <select> de ejemplos precargados con los datos del JSON.
 * Idéntico al patrón de escenarioA.js.
 */
function poblarSelectEjemplos() {
  const select = document.getElementById('d-select-ejemplo');
  if (!select) return;

  const ejemplos = obtenerEjemplosDisponibles();

  // Limpiar opciones previas (excepto la primera vacía)
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

  // Actualizar badge de dificultad al cambiar selección
  select.addEventListener('change', () => {
    const lista = obtenerEjemplosDisponibles();
    const sel   = lista.find(e => e.id === select.value);
    const span  = document.getElementById('d-ejemplo-dificultad');
    if (span) span.textContent = sel ? `Dificultad: ${sel.dificultad ?? '—'}` : '';
  });
}

/**
 * Carga el ejemplo seleccionado en el formulario.
 * Mapea los campos del JSON a los inputs correspondientes del escenarioD.
 */
function cargarEjemploSeleccionado() {
  const select   = document.getElementById('d-select-ejemplo');
  const idSel    = select?.value;
  const ejemplos = obtenerEjemplosDisponibles();
  const ejemplo  = idSel
    ? ejemplos.find(e => e.id === idSel)
    : ejemplos[0];

  if (!ejemplo) {
    mostrarNotificacion('No hay ejemplos disponibles.', 'warning');
    return;
  }

  const p = ejemplo.parametros;

  // ── 1. Modelo ────────────────────────────────────────────────────────────
  // Los nombres en el JSON coinciden con los valores del <select id="d-modelo">
  // excepto: 'constante' y 'gaussiana' y 'periodica' no existen en el formulario.
  // Se mapean a los modelos disponibles.
  const mapaModelo = {
    constante:    'lineal',       // c(t) = costo_diario + 0·t  → lineal con b=0
    lineal:       'lineal',
    exponencial:  'exponencial',
    cuadratico:   'cuadratico',
    gaussiana:    'personalizado',// sin equivalente directo → personalizado
    periodica:    'sinusoidal',
    sinusoidal:   'sinusoidal',
  };

  const modeloMapeado = mapaModelo[p.funcion] ?? 'exponencial';
  const selectModelo  = document.getElementById('d-modelo');
  if (selectModelo) selectModelo.value = modeloMapeado;
  actualizarVistaModelo(); // Mostrar/ocultar paneles de parámetros

  // ── 2. Parámetros por modelo ─────────────────────────────────────────────

  if (modeloMapeado === 'lineal') {
    // JSON puede venir como: { costo_diario } (constante) o { costo_inicial, pendiente }
    const a_val = p.costo_inicial ?? p.costo_diario ?? p.a ?? 0;
    const b_val = p.pendiente     ?? p.b             ?? 0;
    const inpA  = document.getElementById('d-lin-a');
    const inpB  = document.getElementById('d-lin-b');
    if (inpA) inpA.value = a_val;
    if (inpB) inpB.value = b_val;

  } else if (modeloMapeado === 'exponencial') {
    const inpA = document.getElementById('d-exp-A');
    const inpK = document.getElementById('d-exp-k');
    if (inpA) inpA.value = p.A ?? p.amplitud ?? 500;
    if (inpK) inpK.value = p.k ?? p.coef_crecimiento ?? 0.08;

  } else if (modeloMapeado === 'cuadratico') {
    const inpA = document.getElementById('d-cua-a');
    const inpB = document.getElementById('d-cua-b');
    const inpC = document.getElementById('d-cua-c');
    if (inpA) inpA.value = p.a ?? 0;
    if (inpB) inpB.value = p.b ?? 0;
    if (inpC) inpC.value = p.c ?? 0;

  } else if (modeloMapeado === 'sinusoidal') {
    // JSON: { costo_base, amplitud } → A y B del formulario
    const inpA = document.getElementById('d-sin-A');
    const inpB = document.getElementById('d-sin-B');
    if (inpA) inpA.value = p.costo_base  ?? p.A ?? 1000;
    if (inpB) inpB.value = p.amplitud    ?? p.B ?? 300;

  } else if (modeloMapeado === 'personalizado') {
    // Para 'gaussiana' u otros, usar descripcion_funcion como expresión orientativa
    const inpExpr = document.getElementById('d-per-expr');
    if (inpExpr) {
      // Construir expresión desde parámetros de gaussiana si están presentes
      if (p.funcion === 'gaussiana') {
        const cb = p.costo_base      ?? 30000;
        const am = p.amplitud_pico   ?? 200000;
        const ce = p.centro_pico     ?? 20;
        const an = p.ancho_pico      ?? 5;
        inpExpr.value =
          `${cb} + ${am} * Math.exp(-Math.pow(t - ${ce}, 2) / (2 * Math.pow(${an}, 2)))`;
      } else {
        inpExpr.value = ejemplo.descripcion_funcion ?? '';
      }
    }
  }

  // ── 3. Intervalo y subintervalos ─────────────────────────────────────────
  const inpA = document.getElementById('d-a');
  const inpB = document.getElementById('d-b');
  const inpN = document.getElementById('d-n');
  if (inpA) inpA.value = p.a  ?? 0;
  if (inpB) inpB.value = p.b  ?? 30;
  if (inpN) inpN.value = p.n  ?? 100;

  // ── 4. Descripción contextual del ejemplo ────────────────────────────────
  const divDesc = document.getElementById('d-descripcion-ejemplo');
  const lista   = document.getElementById('d-lista-descripcion');

  if (lista && divDesc) {
    const contexto = ejemplo.descripcion_contexto ?? ejemplo.descripcion;

    const itemsContexto = Array.isArray(contexto)
      ? contexto.map(d => `<li>${d}</li>`).join('')
      : `<li>${contexto}</li>`;

    const itemFuncion = ejemplo.descripcion_funcion
      ? `<li><strong>Función:</strong> <code>${ejemplo.descripcion_funcion}</code></li>`
      : '';

    const itemInterp = ejemplo.interpretacion
      ? `<li style="margin-top: var(--spacing-2);">
           <strong>Interpretación:</strong> ${ejemplo.interpretacion}
           ${ejemplo.unidades ? `<em>(${ejemplo.unidades})</em>` : ''}
         </li>`
      : '';

    const itemSol = ejemplo.solucion_analitica !== undefined
      ? `<li>
           <strong>Solución analítica esperada:</strong>
           $${Number(ejemplo.solucion_analitica).toLocaleString('es-BO')}
           ${ejemplo.unidades ?? ''}
         </li>`
      : '';

    lista.innerHTML = itemsContexto + itemFuncion + itemInterp + itemSol;
    divDesc.style.display = 'block';
  }

  // ── 5. Ocultar resultados anteriores ────────────────────────────────────
  const resultados = document.getElementById('d-resultados');
  if (resultados) resultados.hidden = true;

  mostrarNotificacion(`✅ "${ejemplo.nombre}" cargado`, 'success');
}

// ─────────────────────────────────────────────
// NOTIFICACIONES (helper local)
// ─────────────────────────────────────────────

/**
 * Muestra una notificación usando window.Notificaciones si está disponible.
 * @param {string} mensaje
 * @param {'info'|'success'|'error'|'warning'} tipo
 */
function mostrarNotificacion(mensaje, tipo = 'info') {
  const n = window.Notificaciones;
  if (!n) return;
  if (tipo === 'success') return n.exito(mensaje);
  if (tipo === 'error')   return n.error(mensaje);
  if (tipo === 'warning') return n.advertencia(mensaje);
  return n.info(mensaje);
}

// ─────────────────────────────────────────────
// GENERADORES DE HTML
// ─────────────────────────────────────────────

/**
 * HTML del formulario de parámetros.
 * Incluye el bloque de selección de ejemplos precargados.
 * @returns {string}
 */
function htmlFormulario() {
  return `
    <!-- ══════════════════════════════════════════════════
         BLOQUE DE EJEMPLOS PRECARGADOS (patrón escenarioA)
         ══════════════════════════════════════════════════ -->
    <div class="form-row form-row--2-col" style="margin-bottom: var(--spacing-3);">
      <div class="form-group">
        <label class="form-label" for="d-select-ejemplo">Ejemplo precargado</label>
        <select class="form-input" id="d-select-ejemplo">
          <option value="">— Selecciona un ejemplo —</option>
        </select>
        <span class="form-help" id="d-ejemplo-dificultad"></span>
      </div>
      <div class="form-group" style="display:flex; align-items:flex-end; gap: var(--spacing-2);">
        <button type="button" class="btn btn--secondary btn--small" id="d-btn-ejemplo">
          📋 Cargar Ejemplo
        </button>
        <button type="button" class="btn btn--secondary btn--small" id="d-btn-limpiar-ejemplo">
          🗑️ Limpiar
        </button>
      </div>
    </div>

    <!-- Descripción contextual del ejemplo cargado -->
    <div id="d-descripcion-ejemplo" class="alert alert--info mb-3" style="display:none;">
      <strong>Contexto del ejemplo cargado:</strong>
      <ul id="d-lista-descripcion" class="mt-1"></ul>
    </div>

    <!-- ══════════════════════════════════════════════════
         SELECTOR DE MODELO
         ══════════════════════════════════════════════════ -->
    <div class="form-group">
      <label class="form-label" for="d-modelo">Modelo de costo marginal c(t)</label>
      <select class="form-input" id="d-modelo">
        <option value="lineal">Lineal: c(t) = a + b·t</option>
        <option value="exponencial" selected>Exponencial: c(t) = A·e^(k·t)</option>
        <option value="cuadratico">Cuadrático: c(t) = a·t² + b·t + c</option>
        <option value="sinusoidal">Sinusoidal (ciclos semanales): c(t) = A + B·sin(2π·t/7)</option>
        <option value="personalizado">Personalizado (escribe tu función)</option>
      </select>
    </div>

    <!-- Parámetros: Lineal -->
    <div id="d-params-lineal" class="d-params" hidden>
      <div class="form-row form-row--2-col">
        <div class="form-group">
          <label class="form-label" for="d-lin-a">Intercepto (a) — costo base</label>
          <input class="form-input" type="number" id="d-lin-a" value="1000" step="1">
          <span class="form-help">Costo fijo por unidad de tiempo ($/día)</span>
        </div>
        <div class="form-group">
          <label class="form-label" for="d-lin-b">Pendiente (b)</label>
          <input class="form-input" type="number" id="d-lin-b" value="50" step="1">
          <span class="form-help">Incremento de costo por día ($/día²)</span>
        </div>
      </div>
    </div>

    <!-- Parámetros: Exponencial -->
    <div id="d-params-exponencial" class="d-params">
      <div class="form-row form-row--2-col">
        <div class="form-group">
          <label class="form-label" for="d-exp-A">Amplitud (A)</label>
          <input class="form-input" type="number" id="d-exp-A" value="500" step="1">
          <span class="form-help">Costo inicial ($/día)</span>
        </div>
        <div class="form-group">
          <label class="form-label" for="d-exp-k">Tasa de crecimiento (k)</label>
          <input class="form-input" type="number" id="d-exp-k" value="0.08" step="0.001">
          <span class="form-help">k > 0 = escalada, k &lt; 0 = alivio</span>
        </div>
      </div>
    </div>

    <!-- Parámetros: Cuadrático -->
    <div id="d-params-cuadratico" class="d-params" hidden>
      <div class="form-row form-row--3-col">
        <div class="form-group">
          <label class="form-label" for="d-cua-a">Coeficiente a (t²)</label>
          <input class="form-input" type="number" id="d-cua-a" value="2" step="0.1">
        </div>
        <div class="form-group">
          <label class="form-label" for="d-cua-b">Coeficiente b (t)</label>
          <input class="form-input" type="number" id="d-cua-b" value="10" step="1">
        </div>
        <div class="form-group">
          <label class="form-label" for="d-cua-c">Término independiente c</label>
          <input class="form-input" type="number" id="d-cua-c" value="500" step="1">
        </div>
      </div>
    </div>

    <!-- Parámetros: Sinusoidal -->
    <div id="d-params-sinusoidal" class="d-params" hidden>
      <div class="form-row form-row--2-col">
        <div class="form-group">
          <label class="form-label" for="d-sin-A">Costo base (A)</label>
          <input class="form-input" type="number" id="d-sin-A" value="1000" step="1">
          <span class="form-help">Costo promedio por día</span>
        </div>
        <div class="form-group">
          <label class="form-label" for="d-sin-B">Amplitud de variación (B)</label>
          <input class="form-input" type="number" id="d-sin-B" value="300" step="1">
          <span class="form-help">Variación semanal del costo</span>
        </div>
      </div>
    </div>

    <!-- Parámetros: Personalizado -->
    <div id="d-params-personalizado" class="d-params" hidden>
      <div class="form-group">
        <label class="form-label" for="d-per-expr">Expresión c(t)</label>
        <input class="form-input" type="text" id="d-per-expr"
          placeholder="Ej: 500 * Math.exp(0.08*t) + 100*t"
          aria-describedby="d-per-expr-help">
        <span class="form-help" id="d-per-expr-help">
          Usa t como variable. Soporta: +, −, *, /, **, Math.exp(), Math.sin(), Math.log(), etc.
        </span>
      </div>
    </div>

    <!-- Parámetros comunes: intervalo y subintervalos -->
    <div class="form-row form-row--3-col" style="margin-top: var(--spacing-4);">
      <div class="form-group">
        <label class="form-label" for="d-a">Inicio de crisis t₀ (días)</label>
        <input class="form-input" type="number" id="d-a" value="0" min="0" step="1">
      </div>
      <div class="form-group">
        <label class="form-label" for="d-b">Fin de crisis t_fin (días)</label>
        <input class="form-input" type="number" id="d-b" value="30" min="1" step="1">
      </div>
      <div class="form-group">
        <label class="form-label" for="d-n">Subintervalos (n)</label>
        <input class="form-input" type="number" id="d-n" value="100" min="2" max="10000" step="2">
        <span class="form-help">Debe ser par (se ajusta automáticamente)</span>
      </div>
    </div>

    <div class="form-button-group">
      <button type="button" class="btn btn--primary" id="d-btn-calcular">
        ▶ Calcular costo acumulado
      </button>
      <button type="button" class="btn btn--secondary" id="d-btn-limpiar">
        ↺ Restablecer
      </button>
    </div>
  `;
}

/**
 * Tabla comparativa de los tres métodos de integración.
 * @param {Object}      rTrap  - resultado Trapecio
 * @param {Object}      rSimp  - resultado Simpson 1/3
 * @param {Object}      rGauss - resultado Gauss-Legendre
 * @param {Function|null} C    - primitiva analítica (para error real)
 * @param {number}      a
 * @param {number}      b
 * @returns {string}
 */
function htmlTablaComparativa(rTrap, rSimp, rGauss, C, a, b) {
  // Valor exacto si existe la primitiva
  const exacto = C ? C(b) - C(a) : null;

  const fila = (r) => {
    if (r.error || isNaN(r.integral)) {
      return `<td colspan="4" class="table__cell--error">${r.error ?? 'Error'}</td>`;
    }
    const errorReal = exacto !== null ? Math.abs(r.integral - exacto) : null;
    return `
      <td class="table__cell--number">
        $${r.integral.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </td>
      <td class="table__cell--number">${r.nEvaluaciones}</td>
      ${exacto !== null
        ? `<td class="table__cell--number ${errorReal > 0.01 ? 'table__cell--error' : ''}">
             ${errorReal.toExponential(4)}
           </td>`
        : '<td class="table__cell--number">—</td>'
      }
    `;
  };

  return `
    ${exacto !== null ? `
      <div class="alert alert--success" role="status" style="margin-bottom: var(--spacing-3);">
        ✅ Valor exacto (primitiva analítica):
        <strong>$${exacto.toLocaleString('es-BO', { minimumFractionDigits: 4 })}</strong>
      </div>
    ` : `
      <div class="alert alert--info" role="status" style="margin-bottom: var(--spacing-3);">
        ℹ️ Modelo personalizado: no se dispone de primitiva analítica.
        Se muestra el resultado numérico de cada método.
      </div>
    `}
    <div style="overflow-x: auto;">
      <table>
        <thead>
          <tr>
            <th>Método</th>
            <th>Costo total (∫c dt)</th>
            <th>Evaluaciones de f</th>
            <th>Error real</th>
          </tr>
        </thead>
        <tbody>
          <tr><td><strong>Trapecio</strong></td>${fila(rTrap)}</tr>
          <tr><td><strong>Simpson 1/3</strong></td>${fila(rSimp)}</tr>
          <tr><td><strong>Gauss-Legendre</strong></td>${fila(rGauss)}</tr>
        </tbody>
      </table>
    </div>
    <p class="form-help">
      Error real = |resultado numérico − valor exacto|.
      Simpson y Gauss-Legendre son significativamente más precisos que
      el Trapecio con el mismo número de evaluaciones.
    </p>
  `;
}

/**
 * Tabla detallada de subintervalos de un método compuesto.
 * Muestra máximo 30 filas.
 * @param {Object[]} iteraciones
 * @param {string}   metodo - 'trapecio' | 'simpson'
 * @returns {string}
 */
function htmlTablaIteraciones(iteraciones, metodo) {
  if (!iteraciones?.length)
    return '<p class="form-help">Sin detalle de subintervalos.</p>';

  const mostrar  = iteraciones.slice(0, 30);
  const truncado = iteraciones.length > 30;

  if (metodo === 'trapecio') {
    const filas = mostrar.map(it => `
      <tr>
        <td class="table__cell--number">${it.tramo}</td>
        <td class="table__cell--number">${it.xi.toFixed(4)}</td>
        <td class="table__cell--number">${it.xi1.toFixed(4)}</td>
        <td class="table__cell--number">${it.fxi.toFixed(4)}</td>
        <td class="table__cell--number">${it.fxi1.toFixed(4)}</td>
        <td class="table__cell--number table__cell--highlight">${it.area.toFixed(6)}</td>
      </tr>
    `).join('');
    return `
      <div style="overflow-x: auto;">
        <table>
          <thead>
            <tr>
              <th>Tramo</th><th>xᵢ</th><th>xᵢ₊₁</th>
              <th>f(xᵢ)</th><th>f(xᵢ₊₁)</th><th>Área tramo</th>
            </tr>
          </thead>
          <tbody>${filas}</tbody>
        </table>
      </div>
      ${truncado ? `<p class="form-help">Mostrando 30 de ${iteraciones.length} tramos.</p>` : ''}
    `;
  }

  // Simpson
  const filas = mostrar.map(it => `
    <tr>
      <td class="table__cell--number">${it.tramo}</td>
      <td class="table__cell--number">${it.xi.toFixed(4)}</td>
      <td class="table__cell--number">${it.xm.toFixed(4)}</td>
      <td class="table__cell--number">${it.xi2.toFixed(4)}</td>
      <td class="table__cell--number">${it.fxi.toFixed(4)}</td>
      <td class="table__cell--number">${it.fxm.toFixed(4)}</td>
      <td class="table__cell--number">${it.fxi2.toFixed(4)}</td>
      <td class="table__cell--number table__cell--highlight">${it.area.toFixed(6)}</td>
    </tr>
  `).join('');
  return `
    <div style="overflow-x: auto;">
      <table>
        <thead>
          <tr>
            <th>Tramo</th><th>xᵢ</th><th>xₘ</th><th>xᵢ₊₂</th>
            <th>f(xᵢ)</th><th>f(xₘ)</th><th>f(xᵢ₊₂)</th><th>Área tramo</th>
          </tr>
        </thead>
        <tbody>${filas}</tbody>
      </table>
    </div>
    ${truncado ? `<p class="form-help">Mostrando 30 de ${iteraciones.length} tramos.</p>` : ''}
  `;
}

/**
 * Tabla de evaluaciones de Gauss-Legendre.
 * @param {Object[]} iteraciones
 * @returns {string}
 */
function htmlTablaGauss(iteraciones) {
  if (!iteraciones?.length) return '';
  const filas = iteraciones.map(it => `
    <tr>
      <td class="table__cell--number">${it.i}</td>
      <td class="table__cell--number">${it.nodo_t.toFixed(8)}</td>
      <td class="table__cell--number">${it.x.toFixed(6)}</td>
      <td class="table__cell--number">${it.fx.toFixed(6)}</td>
      <td class="table__cell--number">${it.peso.toFixed(8)}</td>
      <td class="table__cell--number table__cell--highlight">
        ${it.contribucion.toFixed(6)}
      </td>
    </tr>
  `).join('');
  return `
    <div style="overflow-x: auto;">
      <table>
        <thead>
          <tr>
            <th>#</th><th>Nodo tᵢ ∈ [-1,1]</th><th>x transformado</th>
            <th>f(x)</th><th>Peso wᵢ</th><th>Contribución wᵢ·f(x)·(b-a)/2</th>
          </tr>
        </thead>
        <tbody>${filas}</tbody>
      </table>
    </div>
    <p class="form-help">
      Gauss-Legendre solo necesita 5 evaluaciones de f y es exacto para
      polinomios de grado ≤ 9.
    </p>
  `;
}

/**
 * HTML de la interpretación automática de resultados.
 * @param {Object}      rSimp       - resultado Simpson (más preciso)
 * @param {Object}      rTrap       - resultado Trapecio
 * @param {Object}      rGauss      - resultado Gauss
 * @param {Function|null} C         - primitiva analítica
 * @param {number}      a
 * @param {number}      b
 * @param {string}      descripcion - modelo usado
 * @returns {string}
 */
function htmlInterpretacion(rSimp, rTrap, rGauss, C, a, b, descripcion) {
  // Mejor estimación: Simpson si convergió, sino Gauss
  const rPrincipal = !rSimp.error ? rSimp : !rGauss.error ? rGauss : rTrap;
  const costoTotal = rPrincipal.integral;
  const dias = b - a;
  const costoDiario = costoTotal / dias;
  const exacto = C ? C(b) - C(a) : null;

  // Comparar eficiencia: error por evaluación
  const errorTrap  = exacto !== null ? Math.abs(rTrap.integral  - exacto) : null;
  const errorSimp  = exacto !== null ? Math.abs(rSimp.integral  - exacto) : null;
  const errorGauss = exacto !== null ? Math.abs(rGauss.integral - exacto) : null;

  let mejorMetodo = 'Simpson 1/3';
  if (exacto !== null) {
    if (errorGauss < errorSimp && errorGauss < errorTrap) mejorMetodo = 'Gauss-Legendre';
    else if (errorSimp <= errorGauss)                      mejorMetodo = 'Simpson 1/3';
  }

  return `
    <div class="alert alert--warning" role="status" style="font-size:1.05rem;">
      💰 <strong>Costo total acumulado de la crisis:</strong>
      <span style="font-size:1.3rem;">
        $${costoTotal.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </span>
      en ${dias} días (método: ${rPrincipal.metodo})
    </div>

    <div class="card card--escenario-d" style="margin-top: var(--spacing-4);">
      <div class="card__header">
        <h3 class="card__title">📊 Análisis del costo de crisis</h3>
      </div>
      <div class="card__body">

        <div class="grid grid--auto">
          <div class="card card--info">
            <div class="card__body">
              <strong>Costo total ∫c(t)dt</strong><br>
              <span style="font-size:1.4rem; color:var(--color-accent-warm);">
                $${costoTotal.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
              </span><br>
              <small>Período: días ${a} – ${b}</small>
            </div>
          </div>

          <div class="card card--info">
            <div class="card__body">
              <strong>Costo promedio diario</strong><br>
              <span style="font-size:1.4rem; color:var(--color-primary);">
                $${costoDiario.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
              </span><br>
              <small>por día de crisis</small>
            </div>
          </div>

          ${exacto !== null ? `
            <div class="card card--info">
              <div class="card__body">
                <strong>Mejor método numérico</strong><br>
                <span style="font-size:1.1rem; color:var(--color-secondary);">
                  ${mejorMetodo}
                </span><br>
                <small>
                  Error: ${(errorGauss ?? errorSimp ?? 0).toExponential(3)}
                </small>
              </div>
            </div>
          ` : ''}
        </div>

        <p style="margin-top: var(--spacing-4);">
          <strong>Interpretación para gestión de crisis:</strong>
          Con el modelo <em>${descripcion}</em>, las medidas de emergencia
          durante los ${dias} días costarán aproximadamente
          <strong>$${costoTotal.toLocaleString('es-BO', { minimumFractionDigits: 2 })}</strong>.
          Esto equivale a un promedio de
          <strong>$${costoDiario.toFixed(2)} por día</strong>.
          ${rPrincipal === rSimp && !rSimp.error
            ? `Simpson 1/3 con n=${rSimp.nEvaluaciones - 1} subintervalos
               ofrece el mejor balance entre precisión (O(h⁴)) y costo computacional.`
            : `Gauss-Legendre con solo 5 evaluaciones alcanza alta precisión
               gracias a la ubicación óptima de sus nodos.`
          }
        </p>

        ${exacto !== null && errorTrap !== null ? `
          <p>
            <strong>Comparación de precisión:</strong>
            Trapecio: error = ${errorTrap.toExponential(4)} |
            Simpson: error = ${errorSimp.toExponential(4)} |
            Gauss-Legendre: error = ${errorGauss.toExponential(4)}.
            Simpson es ${(errorTrap / (errorSimp + 1e-15)).toFixed(0)}× más preciso
            que el Trapecio con el mismo número de evaluaciones,
            lo que demuestra la ventaja de usar métodos de orden superior.
          </p>
        ` : ''}

        <p>
          <strong>Métodos numéricos:</strong>
          Trapecio O(h²), Simpson 1/3 O(h⁴), Gauss-Legendre exacto para
          polinomios de grado ≤ 9 con solo 5 puntos. El error del Trapecio
          involucra f''(ξ), el de Simpson f⁴(ξ).
        </p>

      </div>
    </div>
  `;
}

// ─────────────────────────────────────────────
// GRÁFICO
// ─────────────────────────────────────────────

let chartInstanciaD = null;

/**
 * Renderiza el gráfico de c(t) con el área bajo la curva sombreada.
 * @param {string}   canvasId
 * @param {number[]} xs  - puntos x (del Trapecio, más denso)
 * @param {number[]} ys  - valores c(xi)
 * @param {Object[]} puntosGauss - puntos evaluados por Gauss-Legendre
 */
function renderizarGrafico(canvasId, xs, ys, puntosGauss) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  if (chartInstanciaD) { chartInstanciaD.destroy(); chartInstanciaD = null; }

  const CFG    = window.APP_CONFIG?.CHART_CONFIG ?? {};
  const colores = CFG.COLORES ?? {
    PRIMARY: '#3E594F', ACCENT_WARM: '#F29966', ALERT: '#D97059',
  };
  const fondos = CFG.COLORES_FONDO ?? {
    ACCENT_WARM: 'rgba(242,153,102,0.20)',
  };
  const opBase = CFG.OPCIONES_BASE
    ? JSON.parse(JSON.stringify(CFG.OPCIONES_BASE))
    : {};

  // Submuestrear a máx 150 puntos para el gráfico
  const paso    = Math.max(1, Math.floor(xs.length / 150));
  const indices = [];
  for (let i = 0; i < xs.length; i += paso) indices.push(i);
  if (indices.at(-1) !== xs.length - 1) indices.push(xs.length - 1);

  const labels    = indices.map(i => xs[i].toFixed(2));
  const dataLinea = indices.map(i => parseFloat(ys[i].toFixed(4)));

  chartInstanciaD = new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label:           'c(t) — Costo marginal',
          data:            dataLinea,
          borderColor:     colores.ACCENT_WARM,
          backgroundColor: fondos.ACCENT_WARM,
          borderWidth:     2.5,
          pointRadius:     0,
          fill:            true,
          tension:         0.3,
          order:           2,
        },
        {
          label:           'Nodos Gauss-Legendre',
          data:            indices.map(i => {
            const xVal = xs[i];
            const pg   = puntosGauss.find(p => Math.abs(p.x - xVal) < 0.5);
            return pg ? pg.fx : null;
          }),
          borderColor:     colores.ALERT ?? '#D97059',
          backgroundColor: colores.ALERT ?? '#D97059',
          borderWidth:     0,
          pointRadius:     7,
          pointStyle:      'star',
          showLine:        false,
          order:           1,
        },
      ],
    },
    options: {
      ...opBase,
      plugins: {
        ...(opBase.plugins ?? {}),
        title: {
          display: true,
          text:    'Costo marginal c(t) — Área = Costo total acumulado',
          font:    { size: 14, weight: 'bold' },
        },
      },
      scales: {
        x: {
          ...(opBase.scales?.x ?? {}),
          title: { display: true, text: 'Tiempo (días)' },
          ticks: { maxTicksLimit: 12, font: { size: 11 } },
        },
        y: {
          ...(opBase.scales?.y ?? {}),
          title:       { display: true, text: 'Costo marginal c(t) ($/día)' },
          beginAtZero: false,
        },
      },
    },
  });
}

// ─────────────────────────────────────────────
// MANEJO DEL SELECTOR DE MODELO
// ─────────────────────────────────────────────

function actualizarVistaModelo() {
  const modelo = document.getElementById('d-modelo')?.value;
  document.querySelectorAll('.d-params').forEach(el => { el.hidden = true; });
  const bloque = document.getElementById(`d-params-${modelo}`);
  if (bloque) bloque.hidden = false;
}

// ─────────────────────────────────────────────
// LECTURA Y VALIDACIÓN DEL FORMULARIO
// ─────────────────────────────────────────────

/**
 * Lee todos los parámetros del formulario.
 * @returns {{ params: Object|null, errores: string[] }}
 */
function leerFormulario() {
  const errores = [];
  const modelo  = document.getElementById('d-modelo')?.value ?? 'exponencial';
  const a       = parseFloat(document.getElementById('d-a')?.value);
  const b       = parseFloat(document.getElementById('d-b')?.value);
  let   n       = parseInt(document.getElementById('d-n')?.value, 10);

  if (isNaN(a)) errores.push('El tiempo inicial t₀ debe ser un número.');
  if (isNaN(b)) errores.push('El tiempo final t_fin debe ser un número.');
  if (!isNaN(a) && !isNaN(b) && a >= b)
    errores.push('t₀ debe ser menor que t_fin.');
  if (isNaN(n) || n < 2) errores.push('El número de subintervalos debe ser ≥ 2.');
  if (n > 10000)         errores.push('Máximo 10.000 subintervalos.');
  if (n % 2 !== 0) n++;  // Ajustar al siguiente par para Simpson

  // Parámetros del modelo
  let p = {};
  if (modelo === 'lineal') {
    p.a = parseFloat(document.getElementById('d-lin-a')?.value);
    p.b = parseFloat(document.getElementById('d-lin-b')?.value);
    if (isNaN(p.a) || isNaN(p.b)) errores.push('Parámetros del modelo lineal inválidos.');

  } else if (modelo === 'exponencial') {
    p.A = parseFloat(document.getElementById('d-exp-A')?.value);
    p.k = parseFloat(document.getElementById('d-exp-k')?.value);
    if (isNaN(p.A) || p.A <= 0) errores.push('A debe ser > 0 en el modelo exponencial.');
    if (isNaN(p.k))              errores.push('k debe ser un número en el modelo exponencial.');

  } else if (modelo === 'cuadratico') {
    p.a = parseFloat(document.getElementById('d-cua-a')?.value);
    p.b = parseFloat(document.getElementById('d-cua-b')?.value);
    p.c = parseFloat(document.getElementById('d-cua-c')?.value);
    if ([p.a, p.b, p.c].some(isNaN))
      errores.push('Todos los coeficientes del modelo cuadrático deben ser números.');

  } else if (modelo === 'sinusoidal') {
    p.A = parseFloat(document.getElementById('d-sin-A')?.value);
    p.B = parseFloat(document.getElementById('d-sin-B')?.value);
    if (isNaN(p.A) || isNaN(p.B))
      errores.push('Parámetros del modelo sinusoidal inválidos.');

  } else if (modelo === 'personalizado') {
    p.expresion = document.getElementById('d-per-expr')?.value ?? '';
    if (!p.expresion.trim())
      errores.push('Escribe una expresión para el modelo personalizado.');
  }

  if (errores.length > 0) return { params: null, errores };
  return { params: { modelo, p, a, b, n }, errores: [] };
}

/** Muestra errores en el DOM. */
function mostrarErrores(errores) {
  const el = document.getElementById('d-errores');
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
// MANEJADOR PRINCIPAL DE CÁLCULO
// ─────────────────────────────────────────────

function calcularEscenarioD() {
  const { params, errores } = leerFormulario();
  mostrarErrores(errores);
  if (!params) return;

  const { modelo, p, a, b, n } = params;

  // Construir modelo
  const resultado = construirModelo(modelo, p);
  if (resultado.error) { mostrarErrores([resultado.error]); return; }
  const { f, C, descripcion } = resultado;

  // Ejecutar los tres métodos
  const rTrap  = trapecio(f, a, b, n);
  const rSimp  = simpson13(f, a, b, n);
  const rGauss = gaussLegendre5(f, a, b);

  // Gráfico (usa los puntos del Trapecio como base densa)
  if (!rTrap.error && rTrap.xs) {
    renderizarGrafico('d-chart', rTrap.xs, rTrap.ys, rGauss.iteraciones ?? []);
  }

  // Tabla comparativa
  const contComp = document.getElementById('d-tabla-comparativa');
  if (contComp) contComp.innerHTML = htmlTablaComparativa(rTrap, rSimp, rGauss, C, a, b);

  // Tabla Trapecio
  const contTrap = document.getElementById('d-tabla-trapecio');
  if (contTrap) contTrap.innerHTML = htmlTablaIteraciones(rTrap.iteraciones, 'trapecio');

  // Tabla Simpson
  const contSimp = document.getElementById('d-tabla-simpson');
  if (contSimp) contSimp.innerHTML = htmlTablaIteraciones(rSimp.iteraciones, 'simpson');

  // Tabla Gauss-Legendre
  const contGauss = document.getElementById('d-tabla-gauss');
  if (contGauss) contGauss.innerHTML = htmlTablaGauss(rGauss.iteraciones);

  // Interpretación
  const contInterp = document.getElementById('d-interpretacion');
  if (contInterp)
    contInterp.innerHTML = htmlInterpretacion(rSimp, rTrap, rGauss, C, a, b, descripcion);

  // Mostrar resultados
  const resultados = document.getElementById('d-resultados');
  if (resultados) resultados.hidden = false;
}

function limpiarEscenarioD() {
  document.getElementById('form-escenario-d')?.reset();
  actualizarVistaModelo();

  const resultados = document.getElementById('d-resultados');
  if (resultados) resultados.hidden = true;

  const errores = document.getElementById('d-errores');
  if (errores) errores.innerHTML = '';

  // Ocultar también la descripción del ejemplo
  const divDesc = document.getElementById('d-descripcion-ejemplo');
  if (divDesc) divDesc.style.display = 'none';

  if (chartInstanciaD) { chartInstanciaD.destroy(); chartInstanciaD = null; }
}

// ─────────────────────────────────────────────
// REGISTRO DE EVENTOS
// ─────────────────────────────────────────────

function registrarEventosD() {
  document.getElementById('d-btn-calcular')
    ?.addEventListener('click', calcularEscenarioD);

  document.getElementById('d-btn-limpiar')
    ?.addEventListener('click', limpiarEscenarioD);

  document.getElementById('d-btn-limpiar-ejemplo')
    ?.addEventListener('click', limpiarEscenarioD);

  document.getElementById('d-modelo')
    ?.addEventListener('change', actualizarVistaModelo);

  // Botón "Cargar Ejemplo" — patrón idéntico a escenarioA
  document.getElementById('d-btn-ejemplo')
    ?.addEventListener('click', cargarEjemploSeleccionado);

  // Poblar el select de ejemplos
  poblarSelectEjemplos();

  // Cargar automáticamente el primer ejemplo al abrir el escenario
  cargarEjemploSeleccionado();
}

// ─────────────────────────────────────────────
// FUNCIÓN PRINCIPAL DE RENDERIZADO
// ─────────────────────────────────────────────

function escenarioD() {
  // Destruir gráfico previo si existía (navegación entre escenarios)
  if (chartInstanciaD) { chartInstanciaD.destroy(); chartInstanciaD = null; }

  setTimeout(registrarEventosD, 0);

  return `
    <section
      class="seccion-contenido"
      id="vista-escenario-d"
      aria-labelledby="titulo-d"
    >

      <!-- ENCABEZADO -->
      <div class="seccion-contenido__header">
        <h1 id="titulo-d">💰 Escenario D: Costo Acumulado de Crisis</h1>
        <p class="seccion-contenido__subtitulo">
          Integración numérica aplicada al cálculo del costo total de medidas de emergencia
        </p>
      </div>

      <!-- CONTEXTO -->
      <div class="card card--info" style="margin-bottom: var(--spacing-5);">
        <div class="card__body">
          <p>
            Dado un modelo de costo marginal c(t) ($/día), el costo total de
            la crisis se obtiene integrando:
          </p>
          <p style="text-align:center; font-family:monospace; margin: var(--spacing-2) 0;">
            C_total = ∫[t₀, t_fin] c(t) dt
          </p>
          <p>
            Se comparan tres métodos numéricos: <strong>Trapecio</strong> (O(h²)),
            <strong>Simpson 1/3</strong> (O(h⁴)) y
            <strong>Gauss-Legendre con 5 puntos</strong> (exacto para polinomios
            de grado ≤ 9). Las estrellas rojas en el gráfico marcan los 5 nodos
            de Gauss-Legendre.
          </p>
        </div>
      </div>

      <!-- FORMULARIO -->
      <div class="card" style="margin-bottom: var(--spacing-5);">
        <div class="card__header">
          <h2 class="card__title">⚙️ Configuración del modelo de costo</h2>
        </div>
        <div class="card__body">
          <div id="d-errores" role="alert" aria-live="polite"></div>
          <form id="form-escenario-d" novalidate>
            ${htmlFormulario()}
          </form>
        </div>
      </div>

      <!-- RESULTADOS -->
      <div id="d-resultados" hidden>

        <!-- GRÁFICO -->
        <div class="card" style="margin-bottom: var(--spacing-5);">
          <div class="card__header">
            <h2 class="card__title">📈 Costo marginal c(t) — Área bajo la curva</h2>
          </div>
          <div class="card__body">
            <div class="grafico-contenedor" style="height: 360px;">
              <canvas id="d-chart"
                aria-label="Gráfico de costo marginal con área sombreada"></canvas>
            </div>
          </div>
        </div>

        <!-- INTERPRETACIÓN -->
        <div id="d-interpretacion" style="margin-bottom: var(--spacing-5);"></div>

        <!-- TABLA COMPARATIVA -->
        <div class="card" style="margin-bottom: var(--spacing-5);">
          <div class="card__header">
            <h2 class="card__title">⚖️ Comparación de métodos de integración</h2>
          </div>
          <div class="card__body" id="d-tabla-comparativa"></div>
        </div>

        <!-- DETALLE TRAPECIO -->
        <div class="card" style="margin-bottom: var(--spacing-5);">
          <div class="card__header">
            <h2 class="card__title">📋 Subintervalos — Trapecio</h2>
          </div>
          <div class="card__body" id="d-tabla-trapecio"></div>
        </div>

        <!-- DETALLE SIMPSON -->
        <div class="card" style="margin-bottom: var(--spacing-5);">
          <div class="card__header">
            <h2 class="card__title">📋 Subintervalos — Simpson 1/3</h2>
          </div>
          <div class="card__body" id="d-tabla-simpson"></div>
        </div>

        <!-- DETALLE GAUSS-LEGENDRE -->
        <div class="card">
          <div class="card__header">
            <h2 class="card__title">📋 Evaluaciones — Gauss-Legendre (5 puntos)</h2>
          </div>
          <div class="card__body" id="d-tabla-gauss"></div>
        </div>

      </div>

    </section>
  `;
}

// ─────────────────────────────────────────────
// EXPORTACIÓN GLOBAL
// ─────────────────────────────────────────────

window.escenarioD = escenarioD;