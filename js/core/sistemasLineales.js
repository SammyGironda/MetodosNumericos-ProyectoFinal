/**
 * sistemasLineales.js — Métodos para sistemas de ecuaciones lineales
 * Simulación Numérica de Crisis - Métodos Numéricos Aplicados
 *
 * Métodos implementados:
 *  1. Eliminación Gaussiana con pivoteo parcial
 *  2. Descomposición LU (Doolittle)
 *  3. Gauss-Seidel (iterativo)
 *
 * Convención: sistema Ax = b
 *  - A: matriz de coeficientes [n×n] (array de arrays)
 *  - b: vector de términos independientes [n] (array)
 *  - x: vector solución [n] (array)
 *
 * Todos los métodos retornan un objeto ResultadoSL:
 * {
 *   solucion:    number[]          — vector x
 *   iteraciones: IteracionSL[]     — historial paso a paso
 *   convergio:   boolean
 *   error:       string | null     — mensaje si falla
 *   metodo:      string
 * }
 */

'use strict';

// ─────────────────────────────────────────────
// UTILIDADES DE MATRIZ
// ─────────────────────────────────────────────

/**
 * Clona una matriz (array de arrays) en profundidad.
 * @param {number[][]} M
 * @returns {number[][]}
 */
function clonarMatriz(M) {
  return M.map(fila => [...fila]);
}

/**
 * Clona un vector.
 * @param {number[]} v
 * @returns {number[]}
 */
function clonarVector(v) {
  return [...v];
}

/**
 * Calcula la norma infinita de un vector (máximo valor absoluto).
 * Usada para medir convergencia en métodos iterativos.
 * @param {number[]} v
 * @returns {number}
 */
function normaInfinita(v) {
  return Math.max(...v.map(Math.abs));
}

/**
 * Calcula el error relativo entre dos vectores (norma infinita).
 * @param {number[]} xNuevo
 * @param {number[]} xAnterior
 * @returns {number}
 */
function errorRelativo(xNuevo, xAnterior) {
  const n = xNuevo.length;
  let maxError = 0;
  for (let i = 0; i < n; i++) {
    const denom = Math.abs(xNuevo[i]) > 1e-15 ? Math.abs(xNuevo[i]) : 1;
    const err = Math.abs(xNuevo[i] - xAnterior[i]) / denom;
    if (err > maxError) maxError = err;
  }
  return maxError;
}

/**
 * Valida que A sea cuadrada y compatible con b.
 * @param {number[][]} A
 * @param {number[]} b
 * @returns {{ valido: boolean, mensaje: string }}
 */
function validarSistema(A, b) {
  const CFG = window.APP_CONFIG;
  const n = A.length;

  if (n === 0)
    return { valido: false, mensaje: 'La matriz A está vacía.' };

  if (b.length !== n)
    return { valido: false, mensaje: CFG.MENSAJES.MATRIZ_NO_CUADRADA };

  for (let i = 0; i < n; i++) {
    if (!Array.isArray(A[i]) || A[i].length !== n)
      return { valido: false, mensaje: `Fila ${i + 1} de A no tiene ${n} columnas.` };

    if (A[i].some(isNaN) || isNaN(b[i]))
      return { valido: false, mensaje: CFG.MENSAJES.NUMERO_INVALIDO };
  }

  return { valido: true, mensaje: '' };
}

// ─────────────────────────────────────────────
// MÉTODO 1: ELIMINACIÓN GAUSSIANA CON PIVOTEO PARCIAL
// ─────────────────────────────────────────────

/**
 * Resuelve Ax = b mediante eliminación Gaussiana con pivoteo parcial.
 *
 * Algoritmo:
 *  - Fase de eliminación: convierte [A|b] en forma triangular superior
 *  - Pivoteo parcial: intercambia filas para maximizar estabilidad numérica
 *  - Sustitución regresiva: resuelve el sistema triangular
 *
 * @param {number[][]} A - Matriz de coeficientes n×n
 * @param {number[]}   b - Vector de términos independientes
 * @returns {Object}     - ResultadoSL
 */
function eliminacionGaussiana(A, b) {
  const CFG = window.APP_CONFIG;
  const validacion = validarSistema(A, b);

  if (!validacion.valido) {
    return { solucion: [], iteraciones: [], convergió: false,
             error: validacion.mensaje, metodo: 'Eliminación Gaussiana' };
  }

  const n   = A.length;
  const M   = clonarMatriz(A);   // Matriz aumentada [A|b] (trabajamos en M y bv)
  const bv  = clonarVector(b);
  const historial = [];          // Registro de cada paso

  // ── Fase de eliminación ──────────────────────
  for (let col = 0; col < n; col++) {

    // Pivoteo parcial: encontrar la fila con el mayor valor absoluto en la columna
    let filaPivote = col;
    for (let fila = col + 1; fila < n; fila++) {
      if (Math.abs(M[fila][col]) > Math.abs(M[filaPivote][col])) {
        filaPivote = fila;
      }
    }

    // Intercambiar filas si es necesario
    if (filaPivote !== col) {
      [M[col], M[filaPivote]]   = [M[filaPivote], M[col]];
      [bv[col], bv[filaPivote]] = [bv[filaPivote], bv[col]];
    }

    // Verificar si el pivote es cero (sistema singular)
    if (Math.abs(M[col][col]) < 1e-15) {
      return { solucion: [], iteraciones: historial, convergió: false,
               error: CFG.MENSAJES.SISTEMA_SIN_SOLUCION, metodo: 'Eliminación Gaussiana' };
    }

    // Eliminar la columna `col` en las filas inferiores
    for (let fila = col + 1; fila < n; fila++) {
      const factor = M[fila][col] / M[col][col];
      for (let k = col; k < n; k++) {
        M[fila][k] -= factor * M[col][k];
      }
      bv[fila] -= factor * bv[col];

      historial.push({
        paso:    historial.length + 1,
        tipo:    'eliminacion',
        detalle: `Eliminar columna ${col + 1} en fila ${fila + 1} (factor = ${factor.toFixed(6)})`,
        matrizAumentada: M.map((r, i) => [...r, bv[i]]),
      });
    }
  }

  // ── Sustitución regresiva ────────────────────
  const x = new Array(n).fill(0);

  for (let i = n - 1; i >= 0; i--) {
    let suma = bv[i];
    for (let j = i + 1; j < n; j++) {
      suma -= M[i][j] * x[j];
    }

    if (Math.abs(M[i][i]) < 1e-15) {
      return { solucion: [], iteraciones: historial, convergió: false,
               error: CFG.MENSAJES.SISTEMA_SIN_SOLUCION, metodo: 'Eliminación Gaussiana' };
    }

    x[i] = suma / M[i][i];

    historial.push({
      paso:    historial.length + 1,
      tipo:    'sustitucion',
      detalle: `x${i + 1} = ${x[i].toFixed(6)}`,
      xParcial: [...x],
    });
  }

  return {
    solucion:    x,
    iteraciones: historial,
    convergió:   true,
    error:       null,
    metodo:      'Eliminación Gaussiana con Pivoteo Parcial',
  };
}

// ─────────────────────────────────────────────
// MÉTODO 2: DESCOMPOSICIÓN LU (DOOLITTLE)
// ─────────────────────────────────────────────

/**
 * Descompone A = L·U usando el método de Doolittle.
 * L: triangular inferior con diagonal 1
 * U: triangular superior
 *
 * @param {number[][]} A
 * @returns {{ L: number[][], U: number[][], exito: boolean, mensaje: string }}
 */
function descomponerLU(A) {
  const n = A.length;
  const L = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))
  );
  const U = Array.from({ length: n }, () => new Array(n).fill(0));

  for (let i = 0; i < n; i++) {
    // Calcular fila i de U
    for (let k = i; k < n; k++) {
      let suma = 0;
      for (let j = 0; j < i; j++) {
        suma += L[i][j] * U[j][k];
      }
      U[i][k] = A[i][k] - suma;
    }

    // Verificar pivote
    if (Math.abs(U[i][i]) < 1e-15) {
      return { L, U, exito: false,
               mensaje: 'La descomposición LU no es posible (pivote cero). Usa Gauss con pivoteo.' };
    }

    // Calcular columna i de L
    for (let k = i + 1; k < n; k++) {
      let suma = 0;
      for (let j = 0; j < i; j++) {
        suma += L[k][j] * U[j][i];
      }
      L[k][i] = (A[k][i] - suma) / U[i][i];
    }
  }

  return { L, U, exito: true, mensaje: '' };
}

/**
 * Resuelve Ax = b usando descomposición LU (Doolittle).
 *
 * Pasos:
 *  1. Descomponer A = L·U
 *  2. Sustitución progresiva: L·y = b
 *  3. Sustitución regresiva:  U·x = y
 *
 * @param {number[][]} A
 * @param {number[]}   b
 * @returns {Object} ResultadoSL
 */
function descomposicionLU(A, b) {
  const CFG = window.APP_CONFIG;
  const validacion = validarSistema(A, b);

  if (!validacion.valido) {
    return { solucion: [], iteraciones: [], convergió: false,
             error: validacion.mensaje, metodo: 'Descomposición LU' };
  }

  const n = A.length;
  const historial = [];

  // Paso 1: Descomponer A = L·U
  const { L, U, exito, mensaje } = descomponerLU(A);

  if (!exito) {
    return { solucion: [], iteraciones: historial, convergió: false,
             error: mensaje, metodo: 'Descomposición LU' };
  }

  historial.push({
    paso: 1,
    tipo: 'descomposicion',
    detalle: 'Descomposición A = L·U completada',
    L: clonarMatriz(L),
    U: clonarMatriz(U),
  });

  // Paso 2: Sustitución progresiva — resolver L·y = b
  const y = new Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    let suma = b[i];
    for (let j = 0; j < i; j++) {
      suma -= L[i][j] * y[j];
    }
    y[i] = suma; // L tiene diagonal 1, no se divide

    historial.push({
      paso:    historial.length + 1,
      tipo:    'sustitucion_progresiva',
      detalle: `y${i + 1} = ${y[i].toFixed(6)}`,
      yParcial: [...y],
    });
  }

  // Paso 3: Sustitución regresiva — resolver U·x = y
  const x = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let suma = y[i];
    for (let j = i + 1; j < n; j++) {
      suma -= U[i][j] * x[j];
    }
    x[i] = suma / U[i][i];

    historial.push({
      paso:    historial.length + 1,
      tipo:    'sustitucion_regresiva',
      detalle: `x${i + 1} = ${x[i].toFixed(6)}`,
      xParcial: [...x],
    });
  }

  return {
    solucion:    x,
    iteraciones: historial,
    convergió:   true,
    error:       null,
    metodo:      'Descomposición LU (Doolittle)',
    L,
    U,
  };
}

// ─────────────────────────────────────────────
// MÉTODO 3: GAUSS-SEIDEL (ITERATIVO)
// ─────────────────────────────────────────────

/**
 * Verifica si una matriz es diagonal dominante (condición suficiente
 * para garantizar convergencia de Gauss-Seidel).
 *
 * Condición: |a_ii| > Σ_{j≠i} |a_ij| para toda fila i
 *
 * @param {number[][]} A
 * @returns {{ esDominante: boolean, advertencia: string }}
 */
function verificarDiagonalDominante(A) {
  const n = A.length;
  for (let i = 0; i < n; i++) {
    const diagonal = Math.abs(A[i][i]);
    const sumaResto = A[i].reduce((acc, val, j) => j !== i ? acc + Math.abs(val) : acc, 0);
    if (diagonal <= sumaResto) {
      return {
        esDominante: false,
        advertencia: `Fila ${i + 1}: |${A[i][i].toFixed(4)}| ≤ ${sumaResto.toFixed(4)}. ` +
                     'La matriz no es diagonal dominante; Gauss-Seidel puede no converger.',
      };
    }
  }
  return { esDominante: true, advertencia: '' };
}

/**
 * Resuelve Ax = b mediante el método iterativo de Gauss-Seidel.
 *
 * Fórmula de actualización para cada componente i:
 *   x_i^(k+1) = (b_i - Σ_{j<i} a_ij·x_j^(k+1) - Σ_{j>i} a_ij·x_j^(k)) / a_ii
 *
 * Nota: usa los valores más recientes (x^(k+1)) en la misma iteración,
 * lo que lo diferencia de Jacobi y acelera la convergencia.
 *
 * @param {number[][]} A          - Matriz de coeficientes n×n
 * @param {number[]}   b          - Vector de términos independientes
 * @param {number[]}   [x0]       - Vector inicial (por defecto: ceros)
 * @param {number}     [tol]      - Tolerancia de convergencia
 * @param {number}     [maxIter]  - Máximo de iteraciones
 * @returns {Object} ResultadoSL
 */
function gaussSeidel(A, b, x0 = null, tol = null, maxIter = null) {
  const CFG      = window.APP_CONFIG;
  const tolerancia = tol     ?? CFG.ALGORITMOS.TOLERANCIA_DEFAULT;
  const maxIter_   = maxIter ?? CFG.ALGORITMOS.MAX_ITERACIONES;

  const validacion = validarSistema(A, b);
  if (!validacion.valido) {
    return { solucion: [], iteraciones: [], convergió: false,
             error: validacion.mensaje, metodo: 'Gauss-Seidel' };
  }

  const n = A.length;

  // Verificar diagonal dominante (advertencia, no bloqueo)
  const { esDominante, advertencia } = verificarDiagonalDominante(A);

  // Verificar que la diagonal no tenga ceros
  for (let i = 0; i < n; i++) {
    if (Math.abs(A[i][i]) < 1e-15) {
      return { solucion: [], iteraciones: [], convergió: false,
               error: `Elemento diagonal A[${i+1}][${i+1}] es cero. Reordena las ecuaciones.`,
               metodo: 'Gauss-Seidel' };
    }
  }

  // Vector inicial: ceros si no se proporciona
  let x = x0 ? clonarVector(x0) : new Array(n).fill(0);
  const historial = [];

  // Registrar estado inicial
  historial.push({
    iteracion: 0,
    x:         [...x],
    error:     null,
    detalle:   'Vector inicial x⁰',
  });

  // ── Iteraciones de Gauss-Seidel ─────────────
  for (let iter = 1; iter <= maxIter_; iter++) {
    const xAnterior = clonarVector(x);

    for (let i = 0; i < n; i++) {
      let suma = b[i];

      // Usar x^(k+1) para j < i (ya actualizados en esta iteración)
      for (let j = 0; j < i; j++) {
        suma -= A[i][j] * x[j];
      }

      // Usar x^(k) para j > i (aún no actualizados)
      for (let j = i + 1; j < n; j++) {
        suma -= A[i][j] * xAnterior[j];
      }

      x[i] = suma / A[i][i];
    }

    const err = errorRelativo(x, xAnterior);

    historial.push({
      iteracion: iter,
      x:         [...x],
      error:     err,
      detalle:   `Iteración ${iter}: error relativo = ${err.toExponential(4)}`,
    });

    // Criterio de convergencia
    if (err < tolerancia) {
      return {
        solucion:         x,
        iteraciones:      historial,
        convergió:        true,
        error:            null,
        advertencia:      esDominante ? null : advertencia,
        metodo:           'Gauss-Seidel',
        iteracionesTotal: iter,
        errorFinal:       err,
      };
    }
  }

  // No convergió
  return {
    solucion:         x,       // Última aproximación
    iteraciones:      historial,
    convergió:        false,
    error:            CFG.MENSAJES.NO_CONVERGE,
    advertencia:      advertencia,
    metodo:           'Gauss-Seidel',
    iteracionesTotal: maxIter_,
    errorFinal:       historial.at(-1)?.error ?? null,
  };
}

// ─────────────────────────────────────────────
// FUNCIÓN AUXILIAR: VERIFICAR SOLUCIÓN
// ─────────────────────────────────────────────

/**
 * Verifica la solución calculando el residuo r = b - Ax.
 * El residuo ideal es el vector cero.
 *
 * @param {number[][]} A
 * @param {number[]}   x - Solución calculada
 * @param {number[]}   b
 * @returns {{ residuo: number[], normaResiduo: number }}
 */
function verificarSolucion(A, x, b) {
  const n = A.length;
  const residuo = new Array(n).fill(0);

  for (let i = 0; i < n; i++) {
    let Ax_i = 0;
    for (let j = 0; j < n; j++) {
      Ax_i += A[i][j] * x[j];
    }
    residuo[i] = b[i] - Ax_i;
  }

  return {
    residuo,
    normaResiduo: normaInfinita(residuo),
  };
}

// ─────────────────────────────────────────────
// EXPORTACIÓN GLOBAL
// ─────────────────────────────────────────────

window.SistemasLineales = Object.freeze({
  eliminacionGaussiana,
  descomposicionLU,
  gaussSeidel,
  verificarSolucion,
  // Utilidades expuestas para uso en escenarios
  utils: {
    clonarMatriz,
    clonarVector,
    normaInfinita,
    errorRelativo,
    validarSistema,
    verificarDiagonalDominante,
  },
});