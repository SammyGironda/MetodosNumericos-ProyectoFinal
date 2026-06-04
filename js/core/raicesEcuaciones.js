/**
 * raicesEcuaciones.js — Métodos para encontrar raíces de ecuaciones
 * Simulación Numérica de Crisis - Métodos Numéricos Aplicados
 *
 * Métodos implementados:
 *  1. Bisección
 *  2. Newton-Raphson (con derivada numérica automática)
 *  3. Secante (variante de Newton sin derivada analítica)
 *
 * Todos los métodos reciben f como función JS y retornan un ResultadoRaiz:
 * {
 *   raiz:        number          — valor aproximado de la raíz
 *   iteraciones: IteracionRaiz[] — historial paso a paso
 *   convergió:   boolean
 *   error:       string | null
 *   metodo:      string
 *   iteracionesTotal: number
 *   errorFinal:  number
 * }
 */

'use strict';

// ─────────────────────────────────────────────
// UTILIDADES
// ─────────────────────────────────────────────

/**
 * Calcula la derivada numérica de f en x usando diferencias centradas.
 * f'(x) ≈ [f(x+h) - f(x-h)] / (2h)
 *
 * @param {Function} f
 * @param {number}   x
 * @param {number}   [h]
 * @returns {number}
 */
function derivadaNumerica(f, x, h = null) {
  const CFG = window.APP_CONFIG;
  const paso = h ?? CFG.ALGORITMOS.H_DIFERENCIAS;
  return (f(x + paso) - f(x - paso)) / (2 * paso);
}

/**
 * Valida los parámetros comunes de los métodos de raíces.
 * @param {Function} f
 * @param {number}   tol
 * @param {number}   maxIter
 * @returns {{ valido: boolean, mensaje: string }}
 */
function validarParametros(f, tol, maxIter) {
  const CFG = window.APP_CONFIG;

  if (typeof f !== 'function')
    return { valido: false, mensaje: 'f debe ser una función JavaScript.' };

  if (isNaN(tol) || tol <= 0)
    return { valido: false, mensaje: 'La tolerancia debe ser un número positivo.' };

  if (!Number.isInteger(maxIter) || maxIter < 1)
    return { valido: false, mensaje: 'El máximo de iteraciones debe ser un entero positivo.' };

  return { valido: true, mensaje: '' };
}

/**
 * Evalúa f(x) de forma segura, capturando errores numéricos.
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

// ─────────────────────────────────────────────
// MÉTODO 1: BISECCIÓN
// ─────────────────────────────────────────────

/**
 * Encuentra una raíz de f en [a, b] mediante el método de bisección.
 *
 * Requisito: f(a) y f(b) deben tener signos opuestos (Teorema de Bolzano).
 *
 * Algoritmo:
 *  - Calcula el punto medio c = (a + b) / 2
 *  - Si f(a)·f(c) < 0, la raíz está en [a, c] → b = c
 *  - Si f(b)·f(c) < 0, la raíz está en [c, b] → a = c
 *  - Repite hasta que |b - a| < tol
 *
 * @param {Function} f       - Función continua
 * @param {number}   a       - Extremo izquierdo del intervalo
 * @param {number}   b       - Extremo derecho del intervalo
 * @param {number}   [tol]   - Tolerancia
 * @param {number}   [maxIter]
 * @returns {Object} ResultadoRaiz
 */
function biseccion(f, a, b, tol = null, maxIter = null) {
  const CFG        = window.APP_CONFIG;
  const tolerancia = tol     ?? CFG.ALGORITMOS.TOLERANCIA_DEFAULT;
  const maxIter_   = maxIter ?? CFG.ALGORITMOS.MAX_ITERACIONES;

  // Validar parámetros
  const val = validarParametros(f, tolerancia, maxIter_);
  if (!val.valido)
    return { raiz: NaN, iteraciones: [], convergió: false,
             error: val.mensaje, metodo: 'Bisección' };

  if (a >= b)
    return { raiz: NaN, iteraciones: [], convergió: false,
             error: CFG.MENSAJES.INTERVALO_INVALIDO, metodo: 'Bisección' };

  // Evaluar extremos
  const { valor: fa, error: errA } = evaluarSeguro(f, a);
  const { valor: fb, error: errB } = evaluarSeguro(f, b);

  if (errA) return { raiz: NaN, iteraciones: [], convergió: false, error: errA, metodo: 'Bisección' };
  if (errB) return { raiz: NaN, iteraciones: [], convergió: false, error: errB, metodo: 'Bisección' };

  // Verificar cambio de signo (condición de Bolzano)
  if (fa * fb > 0)
    return { raiz: NaN, iteraciones: [], convergió: false,
             error: CFG.MENSAJES.SIN_CAMBIO_DE_SIGNO, metodo: 'Bisección' };

  const historial = [];
  let ai = a, bi = b;

  for (let iter = 1; iter <= maxIter_; iter++) {
    const c = (ai + bi) / 2;
    const { valor: fc, error: errC } = evaluarSeguro(f, c);

    if (errC)
      return { raiz: c, iteraciones: historial, convergió: false,
               error: errC, metodo: 'Bisección' };

    const errorAbs = (bi - ai) / 2;

    historial.push({
      iteracion: iter,
      a:         ai,
      b:         bi,
      c,
      fa:        evaluarSeguro(f, ai).valor,
      fb:        evaluarSeguro(f, bi).valor,
      fc,
      error:     errorAbs,
      detalle:   `c = (${ai.toFixed(6)} + ${bi.toFixed(6)}) / 2 = ${c.toFixed(6)}, f(c) = ${fc.toExponential(4)}`,
    });

    // Criterio de parada: intervalo suficientemente pequeño O f(c) ≈ 0
    if (errorAbs < tolerancia || Math.abs(fc) < 1e-15) {
      return {
        raiz:             c,
        iteraciones:      historial,
        convergió:        true,
        error:            null,
        metodo:           'Bisección',
        iteracionesTotal: iter,
        errorFinal:       errorAbs,
      };
    }

    // Actualizar intervalo
    const { valor: fai } = evaluarSeguro(f, ai);
    if (fai * fc < 0) {
      bi = c;  // Raíz en [ai, c]
    } else {
      ai = c;  // Raíz en [c, bi]
    }
  }

  // No convergió en maxIter iteraciones
  const c = (ai + bi) / 2;
  return {
    raiz:             c,
    iteraciones:      historial,
    convergió:        false,
    error:            CFG.MENSAJES.NO_CONVERGE,
    metodo:           'Bisección',
    iteracionesTotal: maxIter_,
    errorFinal:       (bi - ai) / 2,
  };
}

// ─────────────────────────────────────────────
// MÉTODO 2: NEWTON-RAPHSON
// ─────────────────────────────────────────────

/**
 * Encuentra una raíz de f partiendo de x0 usando Newton-Raphson.
 *
 * Fórmula de iteración:
 *   x_{n+1} = x_n - f(x_n) / f'(x_n)
 *
 * La derivada f'(x) puede ser:
 *  - Provista analíticamente por el usuario (fPrima)
 *  - Calculada numéricamente (diferencias centradas) si fPrima no se provee
 *
 * Convergencia: cuadrática cerca de la raíz (muy rápida).
 * Riesgo: falla si f'(x_n) ≈ 0 o si x0 está lejos de la raíz.
 *
 * @param {Function}       f        - Función
 * @param {number}         x0       - Punto inicial
 * @param {Function|null}  [fPrima] - Derivada analítica (opcional)
 * @param {number}         [tol]
 * @param {number}         [maxIter]
 * @returns {Object} ResultadoRaiz
 */
function newtonRaphson(f, x0, fPrima = null, tol = null, maxIter = null) {
  const CFG        = window.APP_CONFIG;
  const tolerancia = tol     ?? CFG.ALGORITMOS.TOLERANCIA_DEFAULT;
  const maxIter_   = maxIter ?? CFG.ALGORITMOS.MAX_ITERACIONES;

  const val = validarParametros(f, tolerancia, maxIter_);
  if (!val.valido)
    return { raiz: NaN, iteraciones: [], convergió: false,
             error: val.mensaje, metodo: 'Newton-Raphson' };

  if (isNaN(x0))
    return { raiz: NaN, iteraciones: [], convergió: false,
             error: 'El punto inicial x0 no es un número válido.', metodo: 'Newton-Raphson' };

  // Decidir si usar derivada analítica o numérica
  const calcularDerivada = typeof fPrima === 'function'
    ? (x) => fPrima(x)
    : (x) => derivadaNumerica(f, x);

  const historial = [];
  let x = x0;

  for (let iter = 1; iter <= maxIter_; iter++) {
    const { valor: fx, error: errFx } = evaluarSeguro(f, x);
    if (errFx)
      return { raiz: x, iteraciones: historial, convergió: false,
               error: errFx, metodo: 'Newton-Raphson' };

    // Calcular derivada
    let fpx;
    try {
      fpx = calcularDerivada(x);
    } catch (e) {
      return { raiz: x, iteraciones: historial, convergió: false,
               error: `Error al calcular f'(${x.toFixed(6)}): ${e.message}`,
               metodo: 'Newton-Raphson' };
    }

    // Verificar que la derivada no sea cero
    if (Math.abs(fpx) < 1e-15)
      return { raiz: x, iteraciones: historial, convergió: false,
               error: CFG.MENSAJES.DIVISION_CERO +
                      ` f'(${x.toFixed(6)}) ≈ 0. Cambia el punto inicial x0.`,
               metodo: 'Newton-Raphson' };

    const xNuevo   = x - fx / fpx;
    const errorAbs = Math.abs(xNuevo - x);
    const errorRel = Math.abs(x) > 1e-15 ? errorAbs / Math.abs(x) : errorAbs;

    historial.push({
      iteracion: iter,
      x,
      fx,
      fpx,
      xNuevo,
      errorAbs,
      errorRel,
      detalle: `x${iter} = ${x.toFixed(6)} - (${fx.toExponential(4)}) / (${fpx.toExponential(4)}) = ${xNuevo.toFixed(6)}`,
    });

    x = xNuevo;

    // Criterio de convergencia: error absoluto Y f(x) pequeños
    if (errorAbs < tolerancia && Math.abs(fx) < tolerancia) {
      return {
        raiz:             x,
        iteraciones:      historial,
        convergió:        true,
        error:            null,
        metodo:           fPrima ? 'Newton-Raphson (derivada analítica)'
                                 : 'Newton-Raphson (derivada numérica)',
        iteracionesTotal: iter,
        errorFinal:       errorAbs,
      };
    }
  }

  return {
    raiz:             x,
    iteraciones:      historial,
    convergió:        false,
    error:            CFG.MENSAJES.NO_CONVERGE,
    metodo:           'Newton-Raphson',
    iteracionesTotal: maxIter_,
    errorFinal:       historial.at(-1)?.errorAbs ?? NaN,
  };
}

// ─────────────────────────────────────────────
// MÉTODO 3: SECANTE
// ─────────────────────────────────────────────

/**
 * Encuentra una raíz de f usando el método de la Secante.
 *
 * Variante de Newton-Raphson que aproxima la derivada con:
 *   f'(x_n) ≈ [f(x_n) - f(x_{n-1})] / [x_n - x_{n-1}]
 *
 * Ventaja: no requiere calcular f' analítica ni numéricamente.
 * Convergencia: superlineal (orden ≈ 1.618, la razón áurea).
 *
 * @param {Function} f       - Función
 * @param {number}   x0      - Primer punto inicial
 * @param {number}   x1      - Segundo punto inicial (x1 ≠ x0)
 * @param {number}   [tol]
 * @param {number}   [maxIter]
 * @returns {Object} ResultadoRaiz
 */
function secante(f, x0, x1, tol = null, maxIter = null) {
  const CFG        = window.APP_CONFIG;
  const tolerancia = tol     ?? CFG.ALGORITMOS.TOLERANCIA_DEFAULT;
  const maxIter_   = maxIter ?? CFG.ALGORITMOS.MAX_ITERACIONES;

  const val = validarParametros(f, tolerancia, maxIter_);
  if (!val.valido)
    return { raiz: NaN, iteraciones: [], convergió: false,
             error: val.mensaje, metodo: 'Secante' };

  if (isNaN(x0) || isNaN(x1))
    return { raiz: NaN, iteraciones: [], convergió: false,
             error: 'Los puntos iniciales x0 y x1 deben ser números válidos.',
             metodo: 'Secante' };

  if (Math.abs(x1 - x0) < 1e-15)
    return { raiz: NaN, iteraciones: [], convergió: false,
             error: 'x0 y x1 deben ser distintos.', metodo: 'Secante' };

  const historial = [];
  let xPrev = x0;
  let xCurr = x1;

  const { valor: fPrev, error: errPrev } = evaluarSeguro(f, xPrev);
  if (errPrev)
    return { raiz: NaN, iteraciones: [], convergió: false,
             error: errPrev, metodo: 'Secante' };

  let fCurr_val;
  const { valor: fCurrInit, error: errCurr } = evaluarSeguro(f, xCurr);
  if (errCurr)
    return { raiz: NaN, iteraciones: [], convergió: false,
             error: errCurr, metodo: 'Secante' };
  fCurr_val = fCurrInit;

  let fPrev_val = fPrev;

  for (let iter = 1; iter <= maxIter_; iter++) {
    const denom = fCurr_val - fPrev_val;

    if (Math.abs(denom) < 1e-15)
      return { raiz: xCurr, iteraciones: historial, convergió: false,
               error: CFG.MENSAJES.DIVISION_CERO + ' Diferencia f(x_n) - f(x_{n-1}) ≈ 0.',
               metodo: 'Secante' };

    const xNuevo   = xCurr - fCurr_val * (xCurr - xPrev) / denom;
    const errorAbs = Math.abs(xNuevo - xCurr);

    const { valor: fNuevo, error: errNuevo } = evaluarSeguro(f, xNuevo);
    if (errNuevo)
      return { raiz: xNuevo, iteraciones: historial, convergió: false,
               error: errNuevo, metodo: 'Secante' };

    historial.push({
      iteracion: iter,
      xPrev,
      xCurr,
      fPrev:    fPrev_val,
      fCurr:    fCurr_val,
      xNuevo,
      fNuevo,
      errorAbs,
      detalle:  `x${iter+1} = ${xCurr.toFixed(6)} - ${fCurr_val.toExponential(4)} × ` +
                `(${xCurr.toFixed(6)} - ${xPrev.toFixed(6)}) / (${denom.toExponential(4)}) = ${xNuevo.toFixed(6)}`,
    });

    // Avanzar
    xPrev     = xCurr;
    fPrev_val = fCurr_val;
    xCurr     = xNuevo;
    fCurr_val = fNuevo;

    if (errorAbs < tolerancia && Math.abs(fNuevo) < tolerancia) {
      return {
        raiz:             xCurr,
        iteraciones:      historial,
        convergió:        true,
        error:            null,
        metodo:           'Secante',
        iteracionesTotal: iter,
        errorFinal:       errorAbs,
      };
    }
  }

  return {
    raiz:             xCurr,
    iteraciones:      historial,
    convergió:        false,
    error:            CFG.MENSAJES.NO_CONVERGE,
    metodo:           'Secante',
    iteracionesTotal: maxIter_,
    errorFinal:       historial.at(-1)?.errorAbs ?? NaN,
  };
}

// ─────────────────────────────────────────────
// UTILIDAD: PARSEAR FUNCIÓN DESDE STRING
// ─────────────────────────────────────────────

/**
 * Convierte un string matemático en una función JS evaluable.
 * Permite al usuario escribir funciones en el formulario HTML.
 *
 * Ejemplos de entrada válida:
 *   'x^3 - x - 2'
 *   'Math.exp(x) - 3*x'
 *   'x**2 - 4'
 *
 * @param {string} expresion - Expresión matemática en términos de x
 * @returns {{ f: Function | null, error: string | null }}
 */
function parsearFuncion(expresion) {
  if (!expresion || typeof expresion !== 'string' || expresion.trim() === '')
    return { f: null, error: 'La expresión de la función no puede estar vacía.' };

  // Reemplazar ^ por ** para potencias
  const expr = expresion.trim().replace(/\^/g, '**');

  try {
    // Crear función de forma segura (solo permite expresiones matemáticas)
    // eslint-disable-next-line no-new-func
    const f = new Function('x', `'use strict'; return (${expr});`);

    // Probar que evalúa sin errores en x = 1
    const prueba = f(1);
    if (!isFinite(prueba) && !isNaN(prueba))
      return { f: null, error: 'La función retorna un valor no finito en x = 1. Revisa la expresión.' };

    return { f, error: null };
  } catch (e) {
    return { f: null, error: `Expresión inválida: ${e.message}` };
  }
}

/**
 * Genera puntos {x, y} para graficar f en el intervalo [a, b].
 *
 * @param {Function} f
 * @param {number}   a
 * @param {number}   b
 * @param {number}   [nPuntos]
 * @returns {{ x: number[], y: number[] }}
 */
function puntosGrafico(f, a, b, nPuntos = 200) {
  const xs = [];
  const ys = [];
  const paso = (b - a) / (nPuntos - 1);

  for (let i = 0; i < nPuntos; i++) {
    const x = a + i * paso;
    const { valor } = evaluarSeguro(f, x);
    xs.push(parseFloat(x.toFixed(8)));
    ys.push(isFinite(valor) ? parseFloat(valor.toFixed(8)) : null);
  }

  return { x: xs, y: ys };
}

// ─────────────────────────────────────────────
// EXPORTACIÓN GLOBAL
// ─────────────────────────────────────────────

window.RaicesEcuaciones = Object.freeze({
  biseccion,
  newtonRaphson,
  secante,
  // Utilidades
  utils: {
    derivadaNumerica,
    evaluarSeguro,
    parsearFuncion,
    puntosGrafico,
    validarParametros,
  },
});