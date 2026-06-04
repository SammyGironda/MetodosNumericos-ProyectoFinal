/**
 * interpolacion.js — Métodos de interpolación numérica
 * Simulación Numérica de Crisis - Métodos Numéricos Aplicados
 *
 * Métodos implementados:
 *  1. Interpolación de Lagrange
 *  2. Diferencias divididas de Newton
 *  3. Splines cúbicos naturales
 *
 * Convención de entrada:
 *  - xs: array de nodos x [x0, x1, ..., xn] (deben ser distintos)
 *  - ys: array de valores y [y0, y1, ..., yn] (f(xi) = yi)
 *
 * Todos los métodos retornan un ResultadoInterp:
 * {
 *   evaluar:     Function        — función interpolante p(x)
 *   puntos:      { x, y }[]     — tabla de nodos originales
 *   coeficientes: number[]      — coeficientes del polinomio/spline
 *   convergió:   boolean
 *   error:       string | null
 *   metodo:      string
 * }
 */

'use strict';

// ─────────────────────────────────────────────
// UTILIDADES COMUNES
// ─────────────────────────────────────────────

/**
 * Valida que xs e ys sean arrays compatibles y que xs no tenga repetidos.
 * @param {number[]} xs
 * @param {number[]} ys
 * @param {number}   [minPuntos] - mínimo de puntos requeridos
 * @returns {{ valido: boolean, mensaje: string }}
 */
function validarNodos(xs, ys, minPuntos = 2) {
  if (!Array.isArray(xs) || !Array.isArray(ys))
    return { valido: false, mensaje: 'xs e ys deben ser arrays.' };

  if (xs.length !== ys.length)
    return { valido: false, mensaje: 'xs e ys deben tener la misma longitud.' };

  if (xs.length < minPuntos)
    return { valido: false,
             mensaje: `Se necesitan al menos ${minPuntos} puntos para interpolar.` };

  if (xs.some(isNaN) || ys.some(isNaN))
    return { valido: false, mensaje: 'Todos los valores deben ser números válidos.' };

  // Verificar nodos distintos (xs no debe tener repetidos)
  const xsSet = new Set(xs.map(x => x.toFixed(12)));
  if (xsSet.size !== xs.length)
    return { valido: false, mensaje: 'Los nodos xs deben ser todos distintos.' };

  return { valido: true, mensaje: '' };
}

/**
 * Genera nPuntos equiespaciados en [a, b] para graficar el polinomio.
 * @param {Function} p       - función interpolante
 * @param {number}   a
 * @param {number}   b
 * @param {number}   [nPuntos]
 * @returns {{ x: number[], y: number[] }}
 */
function puntosGraficado(p, a, b, nPuntos = 200) {
  const x = [], y = [];
  const paso = (b - a) / (nPuntos - 1);
  for (let i = 0; i < nPuntos; i++) {
    const xi = a + i * paso;
    x.push(parseFloat(xi.toFixed(8)));
    try {
      const yi = p(xi);
      y.push(isFinite(yi) ? parseFloat(yi.toFixed(8)) : null);
    } catch {
      y.push(null);
    }
  }
  return { x, y };
}

/**
 * Ordena los nodos por xs de menor a mayor.
 * Necesario para splines y diferencias divididas.
 * @param {number[]} xs
 * @param {number[]} ys
 * @returns {{ xs: number[], ys: number[] }}
 */
function ordenarNodos(xs, ys) {
  const pares = xs.map((x, i) => ({ x, y: ys[i] }));
  pares.sort((a, b) => a.x - b.x);
  return {
    xs: pares.map(p => p.x),
    ys: pares.map(p => p.y),
  };
}

// ─────────────────────────────────────────────
// MÉTODO 1: INTERPOLACIÓN DE LAGRANGE
// ─────────────────────────────────────────────

/**
 * Construye el polinomio interpolante de Lagrange.
 *
 * Fórmula:
 *   P(x) = Σ_{i=0}^{n} y_i · L_i(x)
 *
 * donde el polinomio base de Lagrange es:
 *   L_i(x) = Π_{j≠i} (x - x_j) / (x_i - x_j)
 *
 * Grado del polinomio: n (con n+1 puntos).
 * Ventaja: simple de implementar, sin necesidad de resolver sistemas.
 * Desventaja: fenómeno de Runge en grado alto, costoso de evaluar O(n²).
 *
 * @param {number[]} xs - Nodos de interpolación
 * @param {number[]} ys - Valores en los nodos
 * @returns {Object} ResultadoInterp
 */
function lagrange(xs, ys) {
  const val = validarNodos(xs, ys, 2);
  if (!val.valido)
    return { evaluar: null, puntos: [], coeficientes: [],
             convergió: false, error: val.mensaje, metodo: 'Lagrange' };

  const n = xs.length;

  /**
   * Evalúa el polinomio de Lagrange en un punto x.
   * @param {number} x
   * @returns {number}
   */
  function evaluar(x) {
    let resultado = 0;

    for (let i = 0; i < n; i++) {
      // Calcular L_i(x)
      let Li = 1;
      for (let j = 0; j < n; j++) {
        if (j !== i) {
          Li *= (x - xs[j]) / (xs[i] - xs[j]);
        }
      }
      resultado += ys[i] * Li;
    }

    return resultado;
  }

  // Generar tabla de bases de Lagrange en cada nodo (para mostrar en UI)
  const tablaBases = xs.map((xi, i) => {
    // Expresión simbólica del denominador de L_i
    const denominador = xs
      .filter((_, j) => j !== i)
      .reduce((acc, xj) => acc * (xi - xj), 1);
    return {
      i,
      xi,
      yi: ys[i],
      denominador,
      detalle: `L_${i}(x) = Π_{j≠${i}} (x - x_j) / (x_${i} - x_j)`,
    };
  });

  return {
    evaluar,
    puntos:       xs.map((x, i) => ({ x, y: ys[i] })),
    coeficientes: ys,   // En Lagrange, los "coeficientes" son los ys
    tablaBases,
    grado:        n - 1,
    convergió:    true,
    error:        null,
    metodo:       `Lagrange (grado ${n - 1})`,
  };
}

// ─────────────────────────────────────────────
// MÉTODO 2: DIFERENCIAS DIVIDIDAS DE NEWTON
// ─────────────────────────────────────────────

/**
 * Construye la tabla de diferencias divididas.
 *
 * f[x0] = y0
 * f[x0,x1] = (f[x1] - f[x0]) / (x1 - x0)
 * f[x0,x1,x2] = (f[x1,x2] - f[x0,x1]) / (x2 - x0)
 * ...
 *
 * @param {number[]} xs
 * @param {number[]} ys
 * @returns {{ tabla: number[][], coefs: number[] }}
 */
function tablaDiferenciasDivididas(xs, ys) {
  const n = xs.length;
  // tabla[i][j] = f[xi, xi+1, ..., xi+j]
  const tabla = Array.from({ length: n }, (_, i) => new Array(n).fill(0));

  // Columna 0: valores originales
  for (let i = 0; i < n; i++) tabla[i][0] = ys[i];

  // Construir columnas sucesivas
  for (let j = 1; j < n; j++) {
    for (let i = 0; i < n - j; i++) {
      tabla[i][j] = (tabla[i + 1][j - 1] - tabla[i][j - 1]) / (xs[i + j] - xs[i]);
    }
  }

  // Los coeficientes del polinomio de Newton son la primera fila
  const coefs = tabla[0].slice(0, n);

  return { tabla, coefs };
}

/**
 * Construye el polinomio interpolante mediante diferencias divididas de Newton.
 *
 * Forma de Newton (hacia adelante):
 *   P(x) = f[x0]
 *         + f[x0,x1](x-x0)
 *         + f[x0,x1,x2](x-x0)(x-x1)
 *         + ...
 *
 * Ventaja sobre Lagrange: agregar un nuevo punto solo requiere calcular
 * un nuevo término (no recalcular todo el polinomio).
 *
 * @param {number[]} xs
 * @param {number[]} ys
 * @returns {Object} ResultadoInterp
 */
function diferenciasDivididasNewton(xs, ys) {
  // Ordenar nodos (Newton requiere xs ordenados)
  const ordenados = ordenarNodos(xs, ys);
  const xsOrd = ordenados.xs;
  const ysOrd = ordenados.ys;

  const val = validarNodos(xsOrd, ysOrd, 2);
  if (!val.valido)
    return { evaluar: null, puntos: [], coeficientes: [],
             convergió: false, error: val.mensaje, metodo: 'Diferencias Divididas de Newton' };

  const n = xsOrd.length;
  const { tabla, coefs } = tablaDiferenciasDivididas(xsOrd, ysOrd);

  /**
   * Evalúa el polinomio de Newton en x usando el esquema de Horner.
   * Más eficiente que evaluar término a término.
   * @param {number} x
   * @returns {number}
   */
  function evaluar(x) {
    // Esquema de Horner para Newton:
    // P(x) = c0 + (x-x0)[c1 + (x-x1)[c2 + ... ]]
    let resultado = coefs[n - 1];
    for (let i = n - 2; i >= 0; i--) {
      resultado = resultado * (x - xsOrd[i]) + coefs[i];
    }
    return resultado;
  }

  // Tabla de diferencias divididas formateada para UI
  const tablaFormateada = [];
  for (let i = 0; i < n; i++) {
    const fila = { x: xsOrd[i], orden0: ysOrd[i] };
    for (let j = 1; j < n - i; j++) {
      fila[`orden${j}`] = tabla[i][j];
    }
    tablaFormateada.push(fila);
  }

  return {
    evaluar,
    puntos:          xsOrd.map((x, i) => ({ x, y: ysOrd[i] })),
    coeficientes:    coefs,
    tablaFormateada,
    grado:           n - 1,
    convergió:       true,
    error:           null,
    metodo:          `Diferencias Divididas de Newton (grado ${n - 1})`,
  };
}

// ─────────────────────────────────────────────
// MÉTODO 3: SPLINES CÚBICOS NATURALES
// ─────────────────────────────────────────────

/**
 * Construye splines cúbicos naturales que interpolan los nodos (xs, ys).
 *
 * Un spline cúbico natural es una función S(x) tal que:
 *  - En cada subintervalo [xi, xi+1]: S(x) es un polinomio cúbico
 *  - S(xi) = yi para todo nodo (interpola exactamente)
 *  - S, S' y S'' son continuas en todos los nodos interiores
 *  - Condición natural: S''(x0) = S''(xn) = 0
 *
 * Resultado: n-1 cúbicas de la forma:
 *   Si(x) = ai + bi(x-xi) + ci(x-xi)² + di(x-xi)³
 *
 * Algoritmo: resolver sistema tridiagonal para los momentos M_i = S''(xi).
 *
 * @param {number[]} xs - Nodos (serán ordenados internamente)
 * @param {number[]} ys - Valores en nodos
 * @returns {Object} ResultadoInterp
 */
function splinesCubicos(xs, ys) {
  // Ordenar nodos (splines requieren orden estricto)
  const ordenados = ordenarNodos(xs, ys);
  const xsOrd = ordenados.xs;
  const ysOrd = ordenados.ys;

  const val = validarNodos(xsOrd, ysOrd, 3);
  if (!val.valido)
    return { evaluar: null, puntos: [], coeficientes: [],
             convergió: false, error: val.mensaje, metodo: 'Splines Cúbicos Naturales' };

  const n  = xsOrd.length;   // número de nodos
  const m  = n - 1;          // número de subintervalos

  // ── Paso 1: calcular tamaños de subintervalos h_i = x_{i+1} - x_i ──
  const h = new Array(m);
  for (let i = 0; i < m; i++) {
    h[i] = xsOrd[i + 1] - xsOrd[i];
    if (h[i] <= 0)
      return { evaluar: null, puntos: [], coeficientes: [], convergió: false,
               error: `Nodos no estrictamente crecientes en posición ${i}.`,
               metodo: 'Splines Cúbicos Naturales' };
  }

  // ── Paso 2: construir sistema tridiagonal para M = S'' ──
  // Sistema: [2(h0+h1)  h1           0    ...] [M1]   [d1]
  //          [h1    2(h1+h2)  h2      ...] [M2] = [d2]
  //          [... (n-2) ecuaciones interiores ...]
  // Con condición natural: M0 = Mn = 0

  const interior = n - 2; // variables interiores M1..M_{n-2}

  if (interior === 0) {
    // Solo 2 nodos → spline lineal (caso degenerado)
    const pendiente = (ysOrd[1] - ysOrd[0]) / h[0];
    const evaluar   = (x) => ysOrd[0] + pendiente * (x - xsOrd[0]);
    return {
      evaluar,
      puntos:       xsOrd.map((x, i) => ({ x, y: ysOrd[i] })),
      coeficientes: [ysOrd[0], pendiente],
      convergió:    true,
      error:        null,
      metodo:       'Spline lineal (solo 2 nodos)',
    };
  }

  // Vector del lado derecho
  const d = new Array(interior);
  for (let i = 0; i < interior; i++) {
    const k = i + 1; // índice real del nodo interior
    d[i] = 6 * (
      (ysOrd[k + 1] - ysOrd[k])     / h[k] -
      (ysOrd[k]     - ysOrd[k - 1]) / h[k - 1]
    );
  }

  // Diagonal principal y subdiagonales del sistema tridiagonal
  const diag  = new Array(interior);
  const subD  = new Array(interior - 1); // diagonal inferior
  const supD  = new Array(interior - 1); // diagonal superior

  for (let i = 0; i < interior; i++) {
    const k = i + 1;
    diag[i] = 2 * (h[k - 1] + h[k]);
  }
  for (let i = 0; i < interior - 1; i++) {
    const k = i + 1;
    subD[i] = h[k];
    supD[i] = h[k];
  }

  // ── Paso 3: resolver sistema tridiagonal (algoritmo de Thomas) ──
  const M_interior = resolverTridiagonal(diag, subD, supD, d);

  if (!M_interior)
    return { evaluar: null, puntos: [], coeficientes: [], convergió: false,
             error: 'No se pudo resolver el sistema tridiagonal para los splines.',
             metodo: 'Splines Cúbicos Naturales' };

  // Momentos completos (M0 = Mn = 0 por condición natural)
  const M = [0, ...M_interior, 0];

  // ── Paso 4: calcular coeficientes de cada cúbica ──
  // Si(x) = ai + bi(x-xi) + ci(x-xi)² + di(x-xi)³
  const tramos = new Array(m);
  for (let i = 0; i < m; i++) {
    const ai = ysOrd[i];
    const bi = (ysOrd[i + 1] - ysOrd[i]) / h[i]
               - h[i] * (2 * M[i] + M[i + 1]) / 6;
    const ci = M[i] / 2;
    const di = (M[i + 1] - M[i]) / (6 * h[i]);

    tramos[i] = { xi: xsOrd[i], xi1: xsOrd[i + 1], ai, bi, ci, di };
  }

  /**
   * Evalúa el spline cúbico en x.
   * Localiza el tramo correspondiente y evalúa el polinomio cúbico.
   * @param {number} x
   * @returns {number}
   */
  function evaluar(x) {
    // Clampear al rango de datos (extrapolación lineal fuera del rango)
    if (x <= xsOrd[0]) {
      const t = tramos[0];
      const dx = x - t.xi;
      return t.ai + t.bi * dx + t.ci * dx * dx + t.di * dx * dx * dx;
    }
    if (x >= xsOrd[n - 1]) {
      const t = tramos[m - 1];
      const dx = x - t.xi;
      return t.ai + t.bi * dx + t.ci * dx * dx + t.di * dx * dx * dx;
    }

    // Búsqueda binaria del tramo
    let izq = 0, der = m - 1;
    while (izq < der) {
      const mid = Math.floor((izq + der) / 2);
      if (xsOrd[mid + 1] < x) izq = mid + 1;
      else der = mid;
    }

    const t  = tramos[izq];
    const dx = x - t.xi;
    return t.ai + t.bi * dx + t.ci * dx * dx + t.di * dx * dx * dx;
  }

  return {
    evaluar,
    puntos:       xsOrd.map((x, i) => ({ x, y: ysOrd[i] })),
    coeficientes: M,           // Momentos (M0..Mn)
    tramos,                    // Coeficientes de cada cúbica
    momentos:     M,
    convergió:    true,
    error:        null,
    metodo:       `Splines Cúbicos Naturales (${m} tramos)`,
  };
}

// ─────────────────────────────────────────────
// AUXILIAR: ALGORITMO DE THOMAS (sistema tridiagonal)
// ─────────────────────────────────────────────

/**
 * Resuelve un sistema tridiagonal Ax = d usando el algoritmo de Thomas.
 * Más eficiente que Gauss completo: O(n) en lugar de O(n³).
 *
 * A tiene:
 *  - diagonal principal: diag[0..n-1]
 *  - subdiagonal:        sub[0..n-2]  (debajo de la diagonal)
 *  - superdiagonal:      sup[0..n-2]  (encima de la diagonal)
 *
 * @param {number[]} diag
 * @param {number[]} sub
 * @param {number[]} sup
 * @param {number[]} d
 * @returns {number[] | null} - Solución x, o null si hay división por cero
 */
function resolverTridiagonal(diag, sub, sup, d) {
  const n    = diag.length;
  const diagC = [...diag];
  const dC    = [...d];

  // Eliminación hacia adelante
  for (let i = 1; i < n; i++) {
    if (Math.abs(diagC[i - 1]) < 1e-15) return null;
    const factor = sub[i - 1] / diagC[i - 1];
    diagC[i] -= factor * sup[i - 1];
    dC[i]    -= factor * dC[i - 1];
  }

  // Sustitución regresiva
  const x = new Array(n).fill(0);
  if (Math.abs(diagC[n - 1]) < 1e-15) return null;
  x[n - 1] = dC[n - 1] / diagC[n - 1];

  for (let i = n - 2; i >= 0; i--) {
    x[i] = (dC[i] - sup[i] * x[i + 1]) / diagC[i];
  }

  return x;
}

// ─────────────────────────────────────────────
// UTILIDAD: ERROR DE INTERPOLACIÓN
// ─────────────────────────────────────────────

/**
 * Calcula el error de interpolación comparando p(xi) con yi.
 * Útil para verificar que el polinomio pasa exactamente por los nodos.
 *
 * @param {Function} p   - Función interpolante
 * @param {number[]} xs
 * @param {number[]} ys
 * @returns {{ errores: number[], errorMaximo: number, errorMedio: number }}
 */
function calcularErrorInterpolacion(p, xs, ys) {
  const errores = xs.map((x, i) => Math.abs(p(x) - ys[i]));
  const errorMaximo = Math.max(...errores);
  const errorMedio  = errores.reduce((a, b) => a + b, 0) / errores.length;
  return { errores, errorMaximo, errorMedio };
}

// ─────────────────────────────────────────────
// EXPORTACIÓN GLOBAL
// ─────────────────────────────────────────────

window.Interpolacion = Object.freeze({
  lagrange,
  diferenciasDivididasNewton,
  splinesCubicos,
  // Utilidades
  utils: {
    validarNodos,
    ordenarNodos,
    puntosGraficado,
    calcularErrorInterpolacion,
    tablaDiferenciasDivididas,
    resolverTridiagonal,
  },
});