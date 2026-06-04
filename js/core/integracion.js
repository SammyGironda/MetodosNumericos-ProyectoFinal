/**
 * integracion.js — Métodos de integración numérica
 * Simulación Numérica de Crisis - Métodos Numéricos Aplicados
 *
 * Métodos implementados:
 *  1. Regla del Trapecio compuesta
 *  2. Regla de Simpson 1/3 compuesta
 *  3. Regla de Simpson 3/8 compuesta
 *  4. Cuadratura de Gauss-Legendre (2, 3 y 5 puntos)
 *  5. Integración adaptativa (Simpson adaptativo)
 *
 * Todos los métodos reciben f como función JS y retornan un ResultadoInteg:
 * {
 *   integral:    number          — valor aproximado de ∫f(x)dx en [a,b]
 *   iteraciones: IteracionInteg[]— subintervalos / puntos evaluados
 *   errorEstimado: number        — estimación del error
 *   convergió:   boolean
 *   error:       string | null
 *   metodo:      string
 *   nEvaluaciones: number        — número de veces que se evaluó f
 * }
 */

'use strict';

// ─────────────────────────────────────────────
// UTILIDADES COMUNES
// ─────────────────────────────────────────────

/**
 * Valida los parámetros de entrada para métodos de integración.
 * @param {Function} f
 * @param {number}   a     - límite inferior
 * @param {number}   b     - límite superior
 * @param {number}   n     - número de subintervalos
 * @returns {{ valido: boolean, mensaje: string }}
 */
function validarParametrosInteg(f, a, b, n) {
  const CFG = window.APP_CONFIG;

  if (typeof f !== 'function')
    return { valido: false, mensaje: 'f debe ser una función JavaScript.' };

  if (isNaN(a) || isNaN(b))
    return { valido: false, mensaje: CFG.MENSAJES.NUMERO_INVALIDO };

  if (a >= b)
    return { valido: false, mensaje: CFG.MENSAJES.INTERVALO_INVALIDO };

  if (!Number.isInteger(n) || n < CFG.ALGORITMOS.MIN_SUBINTERVALOS)
    return {
      valido: false,
      mensaje: `El número de subintervalos debe ser un entero ≥ ${CFG.ALGORITMOS.MIN_SUBINTERVALOS}.`,
    };

  if (n > CFG.ALGORITMOS.MAX_SUBINTERVALOS)
    return {
      valido: false,
      mensaje: `Máximo ${CFG.ALGORITMOS.MAX_SUBINTERVALOS} subintervalos permitidos.`,
    };

  return { valido: true, mensaje: '' };
}

/**
 * Evalúa f(x) de forma segura capturando errores numéricos.
 * @param {Function} f
 * @param {number}   x
 * @returns {{ valor: number, error: string | null }}
 */
function evaluarSeguro(f, x) {
  try {
    const valor = f(x);
    if (!isFinite(valor))
      return { valor: NaN, error: `f(${x.toFixed(6)}) no es finito (∞ o NaN).` };
    return { valor, error: null };
  } catch (e) {
    return { valor: NaN, error: `Error al evaluar f(${x.toFixed(6)}): ${e.message}` };
  }
}

/**
 * Genera nPuntos equiespaciados en [a, b] con sus valores f(xi).
 * Útil para construir la tabla de evaluaciones.
 * @param {Function} f
 * @param {number}   a
 * @param {number}   b
 * @param {number}   n  - número de subintervalos (genera n+1 puntos)
 * @returns {{ xs: number[], ys: number[], error: string|null }}
 */
function generarPuntos(f, a, b, n) {
  const h  = (b - a) / n;
  const xs = [];
  const ys = [];

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
 * Parsea una expresión matemática en string y retorna una función JS.
 * Idéntica a la de raicesEcuaciones.js para consistencia.
 * @param {string} expresion
 * @returns {{ f: Function | null, error: string | null }}
 */
function parsearFuncion(expresion) {
  if (!expresion || typeof expresion !== 'string' || expresion.trim() === '')
    return { f: null, error: 'La expresión no puede estar vacía.' };

  const expr = expresion.trim().replace(/\^/g, '**');
  try {
    // eslint-disable-next-line no-new-func
    const f = new Function('x', `'use strict'; return (${expr});`);
    const prueba = f(1);
    if (!isFinite(prueba) && !isNaN(prueba))
      return { f: null, error: 'La función no es finita en x = 1. Revisa la expresión.' };
    return { f, error: null };
  } catch (e) {
    return { f: null, error: `Expresión inválida: ${e.message}` };
  }
}

// ─────────────────────────────────────────────
// MÉTODO 1: REGLA DEL TRAPECIO COMPUESTA
// ─────────────────────────────────────────────

/**
 * Aproxima ∫[a,b] f(x)dx usando la regla del Trapecio compuesta.
 *
 * Fórmula:
 *   T = (h/2) · [f(x0) + 2f(x1) + 2f(x2) + ... + 2f(x_{n-1}) + f(xn)]
 *
 * donde h = (b-a)/n es el ancho de cada subintervalo.
 *
 * Error de truncamiento: O(h²) — decrece cuadráticamente con n.
 * Estimación del error: E ≈ -(b-a)³/(12n²) · f''(ξ)
 *
 * @param {Function} f
 * @param {number}   a
 * @param {number}   b
 * @param {number}   n  - número de subintervalos
 * @returns {Object} ResultadoInteg
 */
function trapecio(f, a, b, n) {
  const CFG = window.APP_CONFIG;
  const val = validarParametrosInteg(f, a, b, n);

  if (!val.valido)
    return { integral: NaN, iteraciones: [], errorEstimado: NaN,
             convergió: false, error: val.mensaje, metodo: 'Trapecio', nEvaluaciones: 0 };

  const { xs, ys, error } = generarPuntos(f, a, b, n);
  if (error)
    return { integral: NaN, iteraciones: [], errorEstimado: NaN,
             convergió: false, error, metodo: 'Trapecio', nEvaluaciones: 0 };

  const h = (b - a) / n;

  // Aplicar fórmula del trapecio
  let suma = ys[0] + ys[n];
  for (let i = 1; i < n; i++) suma += 2 * ys[i];
  const integral = (h / 2) * suma;

  // Construir historial de subintervalos
  const iteraciones = [];
  for (let i = 0; i < n; i++) {
    const areaTramo = (h / 2) * (ys[i] + ys[i + 1]);
    iteraciones.push({
      tramo:    i + 1,
      xi:       xs[i],
      xi1:      xs[i + 1],
      fxi:      ys[i],
      fxi1:     ys[i + 1],
      areaTramo: areaTramo,
      detalle:  `Tramo ${i+1}: (h/2)·[f(${xs[i].toFixed(4)}) + f(${xs[i+1].toFixed(4)})] = ${areaTramo.toFixed(6)}`,
    });
  }

  // Estimación del error con comparación trapecio n vs n/2
  // (si n es par, comparamos con n/2 subintervalos)
  let errorEstimado = NaN;
  if (n >= 4 && n % 2 === 0) {
    const { xs: xs2, ys: ys2 } = generarPuntos(f, a, b, n / 2);
    const h2 = (b - a) / (n / 2);
    let suma2 = ys2[0] + ys2[n / 2];
    for (let i = 1; i < n / 2; i++) suma2 += 2 * ys2[i];
    const integral2 = (h2 / 2) * suma2;
    errorEstimado = Math.abs(integral - integral2) / 3; // Extrapolación de Richardson
  }

  return {
    integral,
    iteraciones,
    errorEstimado,
    convergió:    true,
    error:        null,
    metodo:       `Trapecio compuesto (n = ${n})`,
    nEvaluaciones: n + 1,
    h,
    xs,
    ys,
  };
}

// ─────────────────────────────────────────────
// MÉTODO 2: REGLA DE SIMPSON 1/3 COMPUESTA
// ─────────────────────────────────────────────

/**
 * Aproxima ∫[a,b] f(x)dx usando la regla de Simpson 1/3 compuesta.
 *
 * Requisito: n debe ser PAR.
 *
 * Fórmula:
 *   S = (h/3) · [f(x0) + 4f(x1) + 2f(x2) + 4f(x3) + ... + 4f(x_{n-1}) + f(xn)]
 *
 * Patrón de pesos: 1, 4, 2, 4, 2, ..., 4, 1
 *
 * Error de truncamiento: O(h⁴) — mucho más preciso que el trapecio.
 * Estimación del error: E ≈ -(b-a)⁵/(180n⁴) · f⁴(ξ)
 *
 * @param {Function} f
 * @param {number}   a
 * @param {number}   b
 * @param {number}   n  - número de subintervalos (debe ser par)
 * @returns {Object} ResultadoInteg
 */
function simpson13(f, a, b, n) {
  const CFG = window.APP_CONFIG;

  // n debe ser par para Simpson 1/3
  if (n % 2 !== 0) {
    // Ajustar automáticamente al siguiente par
    n = n + 1;
  }

  const val = validarParametrosInteg(f, a, b, n);
  if (!val.valido)
    return { integral: NaN, iteraciones: [], errorEstimado: NaN,
             convergió: false, error: val.mensaje, metodo: 'Simpson 1/3', nEvaluaciones: 0 };

  const { xs, ys, error } = generarPuntos(f, a, b, n);
  if (error)
    return { integral: NaN, iteraciones: [], errorEstimado: NaN,
             convergió: false, error, metodo: 'Simpson 1/3', nEvaluaciones: 0 };

  const h = (b - a) / n;

  // Aplicar pesos de Simpson 1/3: 1, 4, 2, 4, 2, ..., 4, 1
  let suma = ys[0] + ys[n];
  for (let i = 1; i < n; i++) {
    suma += (i % 2 === 0 ? 2 : 4) * ys[i];
  }
  const integral = (h / 3) * suma;

  // Historial por pares de subintervalos (cada aplicación de Simpson simple)
  const iteraciones = [];
  for (let i = 0; i < n; i += 2) {
    const areaTramo = (h / 3) * (ys[i] + 4 * ys[i + 1] + ys[i + 2]);
    iteraciones.push({
      tramo:    i / 2 + 1,
      xi:       xs[i],
      xm:       xs[i + 1],
      xi2:      xs[i + 2],
      fxi:      ys[i],
      fxm:      ys[i + 1],
      fxi2:     ys[i + 2],
      areaTramo,
      detalle:  `Tramo ${i/2+1}: (h/3)·[f(x${i}) + 4f(x${i+1}) + f(x${i+2})] = ${areaTramo.toFixed(6)}`,
    });
  }

  // Error estimado por comparación con n/2 (si n ≥ 4)
  let errorEstimado = NaN;
  if (n >= 4) {
    const n2 = Math.max(2, Math.floor(n / 2));
    const nPar = n2 % 2 === 0 ? n2 : n2 + 1;
    const { xs: xs2, ys: ys2 } = generarPuntos(f, a, b, nPar);
    const h2 = (b - a) / nPar;
    let suma2 = ys2[0] + ys2[nPar];
    for (let i = 1; i < nPar; i++) suma2 += (i % 2 === 0 ? 2 : 4) * ys2[i];
    const integral2 = (h2 / 3) * suma2;
    errorEstimado = Math.abs(integral - integral2) / 15; // Extrapolación de Richardson para Simpson
  }

  return {
    integral,
    iteraciones,
    errorEstimado,
    convergió:    true,
    error:        null,
    metodo:       `Simpson 1/3 compuesto (n = ${n})`,
    nEvaluaciones: n + 1,
    h,
    xs,
    ys,
  };
}

// ─────────────────────────────────────────────
// MÉTODO 3: REGLA DE SIMPSON 3/8 COMPUESTA
// ─────────────────────────────────────────────

/**
 * Aproxima ∫[a,b] f(x)dx usando la regla de Simpson 3/8 compuesta.
 *
 * Requisito: n debe ser múltiplo de 3.
 *
 * Fórmula:
 *   S = (3h/8) · [f(x0) + 3f(x1) + 3f(x2) + 2f(x3) + 3f(x4) + ... + f(xn)]
 *
 * Patrón de pesos: 1, 3, 3, 2, 3, 3, 2, ..., 3, 3, 1
 *
 * Error de truncamiento: O(h⁴) — similar a Simpson 1/3.
 * Útil cuando n es múltiplo de 3 pero no de 2.
 *
 * @param {Function} f
 * @param {number}   a
 * @param {number}   b
 * @param {number}   n  - número de subintervalos (múltiplo de 3)
 * @returns {Object} ResultadoInteg
 */
function simpson38(f, a, b, n) {
  // Ajustar n al próximo múltiplo de 3
  if (n % 3 !== 0) n = n + (3 - (n % 3));

  const val = validarParametrosInteg(f, a, b, n);
  if (!val.valido)
    return { integral: NaN, iteraciones: [], errorEstimado: NaN,
             convergió: false, error: val.mensaje, metodo: 'Simpson 3/8', nEvaluaciones: 0 };

  const { xs, ys, error } = generarPuntos(f, a, b, n);
  if (error)
    return { integral: NaN, iteraciones: [], errorEstimado: NaN,
             convergió: false, error, metodo: 'Simpson 3/8', nEvaluaciones: 0 };

  const h = (b - a) / n;

  // Pesos: 1, 3, 3, 2, 3, 3, 2, ..., 3, 3, 1
  let suma = ys[0] + ys[n];
  for (let i = 1; i < n; i++) {
    const peso = (i % 3 === 0) ? 2 : 3;
    suma += peso * ys[i];
  }
  const integral = (3 * h / 8) * suma;

  // Historial por triples de subintervalos
  const iteraciones = [];
  for (let i = 0; i < n; i += 3) {
    const areaTramo = (3 * h / 8) * (ys[i] + 3*ys[i+1] + 3*ys[i+2] + ys[i+3]);
    iteraciones.push({
      tramo:    i / 3 + 1,
      xi:       xs[i],
      xi1:      xs[i + 1],
      xi2:      xs[i + 2],
      xi3:      xs[i + 3],
      fxi:      ys[i],
      fxi1:     ys[i + 1],
      fxi2:     ys[i + 2],
      fxi3:     ys[i + 3],
      areaTramo,
      detalle:  `Tramo ${i/3+1}: (3h/8)·[f(x${i})+3f(x${i+1})+3f(x${i+2})+f(x${i+3})] = ${areaTramo.toFixed(6)}`,
    });
  }

  return {
    integral,
    iteraciones,
    errorEstimado: NaN, // estimación simplificada omitida en 3/8
    convergió:    true,
    error:        null,
    metodo:       `Simpson 3/8 compuesto (n = ${n})`,
    nEvaluaciones: n + 1,
    h,
    xs,
    ys,
  };
}

// ─────────────────────────────────────────────
// MÉTODO 4: CUADRATURA DE GAUSS-LEGENDRE
// ─────────────────────────────────────────────

/**
 * Nodos y pesos de Gauss-Legendre en el intervalo estándar [-1, 1].
 * Fuente: tablas estándar de análisis numérico (Burden & Faires).
 */
const GAUSS_LEGENDRE = {
  2: {
    nodos:  [-0.5773502691896257, 0.5773502691896257],
    pesos:  [1.0, 1.0],
  },
  3: {
    nodos:  [-0.7745966692414834, 0.0, 0.7745966692414834],
    pesos:  [0.5555555555555556, 0.8888888888888888, 0.5555555555555556],
  },
  5: {
    nodos:  [
      -0.9061798459386640, -0.5384693101056831, 0.0,
       0.5384693101056831,  0.9061798459386640,
    ],
    pesos:  [
      0.2369268850561891, 0.4786286704993665, 0.5688888888888889,
      0.4786286704993665, 0.2369268850561891,
    ],
  },
};

/**
 * Aproxima ∫[a,b] f(x)dx usando cuadratura de Gauss-Legendre.
 *
 * Cambio de variable: x = ((b-a)t + (b+a)) / 2, t ∈ [-1, 1]
 * ∫[a,b] f(x)dx = ((b-a)/2) · Σ w_i · f(x(t_i))
 *
 * Exacta para polinomios de grado ≤ 2p-1 con p puntos.
 * Muy eficiente: alta precisión con pocos puntos.
 *
 * @param {Function} f
 * @param {number}   a
 * @param {number}   b
 * @param {number}   [nPuntos] - 2, 3 o 5 puntos de Gauss
 * @returns {Object} ResultadoInteg
 */
function gaussLegendre(f, a, b, nPuntos = 5) {
  const CFG = window.APP_CONFIG;

  if (typeof f !== 'function')
    return { integral: NaN, iteraciones: [], errorEstimado: NaN,
             convergió: false, error: 'f debe ser una función.', metodo: 'Gauss-Legendre' };

  if (isNaN(a) || isNaN(b) || a >= b)
    return { integral: NaN, iteraciones: [], errorEstimado: NaN,
             convergió: false, error: CFG.MENSAJES.INTERVALO_INVALIDO,
             metodo: 'Gauss-Legendre' };

  const puntosValidos = [2, 3, 5];
  if (!puntosValidos.includes(nPuntos))
    return { integral: NaN, iteraciones: [], errorEstimado: NaN,
             convergió: false,
             error: `nPuntos debe ser 2, 3 o 5. Se recibió: ${nPuntos}`,
             metodo: 'Gauss-Legendre' };

  const { nodos, pesos } = GAUSS_LEGENDRE[nPuntos];
  const mitad    = (b - a) / 2;
  const centro   = (b + a) / 2;
  const iteraciones = [];
  let integral   = 0;

  for (let i = 0; i < nPuntos; i++) {
    // Transformar nodo de [-1,1] a [a,b]
    const x = mitad * nodos[i] + centro;
    const { valor: fx, error } = evaluarSeguro(f, x);

    if (error)
      return { integral: NaN, iteraciones, errorEstimado: NaN,
               convergió: false, error, metodo: 'Gauss-Legendre' };

    const contribucion = pesos[i] * fx;
    integral += contribucion;

    iteraciones.push({
      i:            i + 1,
      nodo_t:       nodos[i],
      x,
      fx,
      peso:         pesos[i],
      contribucion: mitad * contribucion,
      detalle: `t${i+1} = ${nodos[i].toFixed(6)}, x = ${x.toFixed(6)}, f(x) = ${fx.toExponential(4)}, w·f(x) = ${contribucion.toFixed(6)}`,
    });
  }

  integral *= mitad;

  // Comparar con Gauss de orden inferior para estimar error
  let errorEstimado = NaN;
  const ordenInferior = nPuntos === 5 ? 3 : 2;
  const { nodos: n2, pesos: p2 } = GAUSS_LEGENDRE[ordenInferior];
  let integral2 = 0;
  for (let i = 0; i < ordenInferior; i++) {
    const x = mitad * n2[i] + centro;
    const { valor: fx } = evaluarSeguro(f, x);
    integral2 += p2[i] * fx;
  }
  integral2    *= mitad;
  errorEstimado = Math.abs(integral - integral2);

  return {
    integral,
    iteraciones,
    errorEstimado,
    convergió:    true,
    error:        null,
    metodo:       `Gauss-Legendre (${nPuntos} puntos)`,
    nEvaluaciones: nPuntos,
  };
}

// ─────────────────────────────────────────────
// MÉTODO 5: SIMPSON ADAPTATIVO
// ─────────────────────────────────────────────

/**
 * Aproxima ∫[a,b] f(x)dx usando Simpson adaptativo.
 *
 * Estrategia: divide recursivamente los subintervalos donde el
 * error local es mayor que la tolerancia. Concentra los puntos
 * de evaluación donde f varía más rápidamente.
 *
 * @param {Function} f
 * @param {number}   a
 * @param {number}   b
 * @param {number}   [tol]      - tolerancia global
 * @param {number}   [maxDepth] - profundidad máxima de recursión
 * @returns {Object} ResultadoInteg
 */
function simpsonAdaptativo(f, a, b, tol = null, maxDepth = 20) {
  const CFG        = window.APP_CONFIG;
  const tolerancia = tol ?? CFG.ALGORITMOS.TOLERANCIA_DEFAULT;

  if (typeof f !== 'function')
    return { integral: NaN, iteraciones: [], errorEstimado: NaN,
             convergió: false, error: 'f debe ser una función.',
             metodo: 'Simpson Adaptativo' };

  if (isNaN(a) || isNaN(b) || a >= b)
    return { integral: NaN, iteraciones: [], errorEstimado: NaN,
             convergió: false, error: CFG.MENSAJES.INTERVALO_INVALIDO,
             metodo: 'Simpson Adaptativo' };

  let nEvaluaciones = 0;
  const iteraciones = [];

  /**
   * Calcula Simpson simple en [l, r].
   * @param {number} l
   * @param {number} r
   * @param {number} fl - f(l) precalculado
   * @param {number} fm - f((l+r)/2) precalculado
   * @param {number} fr - f(r) precalculado
   * @returns {number}
   */
  function simpsonSimple(l, r, fl, fm, fr) {
    return ((r - l) / 6) * (fl + 4 * fm + fr);
  }

  /**
   * Paso recursivo del Simpson adaptativo.
   * @param {number} l, r      - intervalo actual
   * @param {number} fl,fm,fr  - valores de f precalculados
   * @param {number} S         - Simpson simple en [l,r]
   * @param {number} tolLocal  - tolerancia local
   * @param {number} depth     - profundidad actual
   * @returns {number}
   */
  function simpsonRec(l, r, fl, fm, fr, S, tolLocal, depth) {
    const m1 = (l + fm) / 2;   // punto medio de [l, m]
    const m2 = (fm + r) / 2;   // punto medio de [m, r]
    const m  = (l + r) / 2;

    const { valor: f1 } = evaluarSeguro(f, m1); nEvaluaciones++;
    const { valor: f2 } = evaluarSeguro(f, m2); nEvaluaciones++;

    const S1 = simpsonSimple(l, m,  fl, f1, fm);
    const S2 = simpsonSimple(m, r,  fm, f2, fr);
    const errorLocal = Math.abs(S1 + S2 - S) / 15;

    iteraciones.push({
      l, r, m, S1, S2, errorLocal, depth,
      detalle: `[${l.toFixed(4)}, ${r.toFixed(4)}]: S1+S2 = ${(S1+S2).toFixed(6)}, err = ${errorLocal.toExponential(3)}`,
    });

    if (depth >= maxDepth || errorLocal < tolLocal) {
      return S1 + S2 + errorLocal; // Corrección de Richardson
    }

    return simpsonRec(l, m,  fl, f1, fm, S1, tolLocal / 2, depth + 1) +
           simpsonRec(m, r,  fm, f2, fr, S2, tolLocal / 2, depth + 1);
  }

  // Evaluaciones iniciales
  const m = (a + b) / 2;
  const { valor: fa } = evaluarSeguro(f, a); nEvaluaciones++;
  const { valor: fm } = evaluarSeguro(f, m); nEvaluaciones++;
  const { valor: fb } = evaluarSeguro(f, b); nEvaluaciones++;

  const S0      = simpsonSimple(a, b, fa, fm, fb);
  const integral = simpsonRec(a, b, fa, fm, fb, S0, tolerancia, 1);

  return {
    integral,
    iteraciones,
    errorEstimado: tolerancia,
    convergió:    true,
    error:        null,
    metodo:       'Simpson Adaptativo',
    nEvaluaciones,
  };
}

// ─────────────────────────────────────────────
// UTILIDAD: COMPARAR MÉTODOS
// ─────────────────────────────────────────────

/**
 * Ejecuta todos los métodos de integración y retorna una tabla comparativa.
 * Útil para mostrar en la UI cuál método es más preciso/eficiente.
 *
 * @param {Function} f
 * @param {number}   a
 * @param {number}   b
 * @param {number}   n         - subintervalos para métodos compuestos
 * @param {number}   [valorExacto] - si se conoce, para calcular error real
 * @returns {Object[]}
 */
function compararMetodos(f, a, b, n, valorExacto = null) {
  const nPar = n % 2 === 0 ? n : n + 1;

  const resultados = [
    trapecio(f, a, b, nPar),
    simpson13(f, a, b, nPar),
    simpson38(f, a, b, n),
    gaussLegendre(f, a, b, 5),
    simpsonAdaptativo(f, a, b),
  ];

  return resultados.map(r => ({
    metodo:        r.metodo,
    integral:      r.integral,
    errorEstimado: r.errorEstimado,
    nEvaluaciones: r.nEvaluaciones,
    errorReal:     valorExacto !== null
                   ? Math.abs(r.integral - valorExacto)
                   : null,
    convergió:     r.convergió,
  }));
}

// ─────────────────────────────────────────────
// EXPORTACIÓN GLOBAL
// ─────────────────────────────────────────────

window.Integracion = Object.freeze({
  trapecio,
  simpson13,
  simpson38,
  gaussLegendre,
  simpsonAdaptativo,
  // Utilidades
  utils: {
    validarParametrosInteg,
    evaluarSeguro,
    generarPuntos,
    parsearFuncion,
    compararMetodos,
    GAUSS_LEGENDRE,
  },
});