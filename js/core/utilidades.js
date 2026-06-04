/**
 * ============================================================
 * MÓDULO: utilidades.js
 * DESCRIPCIÓN: Utilidades matemáticas y de validación compartidas
 *              por todos los módulos del core numérico.
 * CONTENIDO:
 *   1. Operaciones matriciales (crear, copiar, multiplicar, etc.)
 *   2. Validaciones de entrada (números, rangos, matrices)
 *   3. Helpers matemáticos (normas, redondeo, signo, etc.)
 *   4. Formateo de resultados para tablas/consola
 *   5. Parseo de funciones desde strings (para formularios)
 * PROYECTO: Simulación Numérica de Crisis - Métodos Numéricos
 * CONVENCIÓN: camelCase en JS, comentarios en ESPAÑOL
 * ============================================================
 */


// ═══════════════════════════════════════════════════════════════
// SECCIÓN 1: OPERACIONES MATRICIALES
// ═══════════════════════════════════════════════════════════════

/**
 * Crea una matriz de ceros de dimensión m×n.
 * @param {number} m - Número de filas
 * @param {number} n - Número de columnas (default = m → matriz cuadrada)
 * @returns {number[][]}
 */
function crearMatrizCeros(m, n = m) {
  return Array.from({ length: m }, () => new Array(n).fill(0));
}

/**
 * Crea una matriz identidad de dimensión n×n.
 * @param {number} n - Dimensión
 * @returns {number[][]}
 */
function crearMatrizIdentidad(n) {
  const I = crearMatrizCeros(n);
  for (let i = 0; i < n; i++) I[i][i] = 1;
  return I;
}

/**
 * Crea una copia profunda de una matriz (evita mutaciones).
 * @param {number[][]} A - Matriz original
 * @returns {number[][]} Copia independiente
 */
function copiarMatriz(A) {
  return A.map(fila => [...fila]);
}

/**
 * Crea una copia profunda de un vector.
 * @param {number[]} v
 * @returns {number[]}
 */
function copiarVector(v) {
  return [...v];
}

/**
 * Multiplica dos matrices A (m×k) y B (k×n).
 * @param {number[][]} A
 * @param {number[][]} B
 * @returns {number[][]} Producto A×B de dimensión m×n
 * @throws {Error} Si las dimensiones son incompatibles
 */
function multiplicarMatrices(A, B) {
  const m = A.length;
  const k = A[0].length;
  const n = B[0].length;

  if (k !== B.length) {
    throw new Error(
      `Dimensiones incompatibles para multiplicación: A es ${m}×${k}, B es ${B.length}×${n}.`
    );
  }

  const C = crearMatrizCeros(m, n);
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      for (let p = 0; p < k; p++) {
        C[i][j] += A[i][p] * B[p][j];
      }
    }
  }
  return C;
}

/**
 * Multiplica una matriz A (m×n) por un vector v (n×1).
 * @param {number[][]} A
 * @param {number[]}   v
 * @returns {number[]} Vector resultado de longitud m
 */
function multiplicarMatrizVector(A, v) {
  const m = A.length;
  const n = v.length;

  if (A[0].length !== n) {
    throw new Error(
      `Dimensiones incompatibles: A es ${m}×${A[0].length}, v tiene ${n} elementos.`
    );
  }

  return A.map(fila => fila.reduce((suma, aij, j) => suma + aij * v[j], 0));
}

/**
 * Transpone una matriz A (m×n) → resultado (n×m).
 * @param {number[][]} A
 * @returns {number[][]}
 */
function transponerMatriz(A) {
  const m = A.length;
  const n = A[0].length;
  const T = crearMatrizCeros(n, m);
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      T[j][i] = A[i][j];
    }
  }
  return T;
}

/**
 * Suma dos matrices A y B del mismo tamaño.
 * @param {number[][]} A
 * @param {number[][]} B
 * @returns {number[][]}
 */
function sumarMatrices(A, B) {
  validarMismaDimension(A, B);
  return A.map((fila, i) => fila.map((val, j) => val + B[i][j]));
}

/**
 * Resta dos matrices A - B del mismo tamaño.
 * @param {number[][]} A
 * @param {number[][]} B
 * @returns {number[][]}
 */
function restarMatrices(A, B) {
  validarMismaDimension(A, B);
  return A.map((fila, i) => fila.map((val, j) => val - B[i][j]));
}

/**
 * Multiplica una matriz por un escalar.
 * @param {number}     c - Escalar
 * @param {number[][]} A - Matriz
 * @returns {number[][]}
 */
function escalarMatriz(c, A) {
  return A.map(fila => fila.map(val => c * val));
}

/**
 * Intercambia dos filas de una matriz (operación elemental de fila).
 * MODIFICA la matriz in-place.
 * @param {number[][]} A
 * @param {number}     i - Índice fila 1
 * @param {number}     j - Índice fila 2
 */
function intercambiarFilas(A, i, j) {
  const temp = A[i];
  A[i] = A[j];
  A[j] = temp;
}

/**
 * Calcula el determinante de una matriz cuadrada n×n
 * mediante eliminación de Gauss con pivoteo parcial.
 * @param {number[][]} A
 * @returns {number} Determinante
 */
function determinante(A) {
  validarMatrizCuadrada(A);
  const n = A.length;
  const M = copiarMatriz(A);
  let signo = 1;
  let det = 1;

  for (let col = 0; col < n; col++) {
    // Pivoteo parcial
    let maxFila = col;
    for (let fila = col + 1; fila < n; fila++) {
      if (Math.abs(M[fila][col]) > Math.abs(M[maxFila][col])) {
        maxFila = fila;
      }
    }
    if (maxFila !== col) {
      intercambiarFilas(M, col, maxFila);
      signo *= -1;
    }

    if (Math.abs(M[col][col]) < 1e-12) return 0; // Matriz singular

    det *= M[col][col];

    for (let fila = col + 1; fila < n; fila++) {
      const factor = M[fila][col] / M[col][col];
      for (let k = col; k < n; k++) {
        M[fila][k] -= factor * M[col][k];
      }
    }
  }

  return signo * det;
}

/**
 * Construye la matriz aumentada [A | b] para sistemas lineales.
 * @param {number[][]} A - Matriz de coeficientes (n×n)
 * @param {number[]}   b - Vector de términos independientes (n)
 * @returns {number[][]} Matriz aumentada n×(n+1)
 */
function matrizAumentada(A, b) {
  return A.map((fila, i) => [...fila, b[i]]);
}


// ═══════════════════════════════════════════════════════════════
// SECCIÓN 2: OPERACIONES CON VECTORES
// ═══════════════════════════════════════════════════════════════

/**
 * Suma dos vectores del mismo tamaño.
 * @param {number[]} a
 * @param {number[]} b
 * @returns {number[]}
 */
function sumarVectores(a, b) {
  if (a.length !== b.length) throw new Error('Vectores de distinto tamaño.');
  return a.map((ai, i) => ai + b[i]);
}

/**
 * Resta dos vectores: a - b.
 * @param {number[]} a
 * @param {number[]} b
 * @returns {number[]}
 */
function restarVectores(a, b) {
  if (a.length !== b.length) throw new Error('Vectores de distinto tamaño.');
  return a.map((ai, i) => ai - b[i]);
}

/**
 * Producto punto (escalar) de dos vectores.
 * @param {number[]} a
 * @param {number[]} b
 * @returns {number}
 */
function productoPunto(a, b) {
  if (a.length !== b.length) throw new Error('Vectores de distinto tamaño.');
  return a.reduce((suma, ai, i) => suma + ai * b[i], 0);
}

/**
 * Multiplica un escalar por un vector.
 * @param {number}   c
 * @param {number[]} v
 * @returns {number[]}
 */
function escalarVector(c, v) {
  return v.map(vi => c * vi);
}

/**
 * Norma euclidiana (L2) de un vector.
 * @param {number[]} v
 * @returns {number}
 */
function normaL2(v) {
  return Math.sqrt(v.reduce((suma, vi) => suma + vi * vi, 0));
}

/**
 * Norma infinita (máximo valor absoluto) de un vector.
 * Usada como criterio de convergencia en métodos iterativos.
 * @param {number[]} v
 * @returns {number}
 */
function normaInfinita(v) {
  return Math.max(...v.map(Math.abs));
}

/**
 * Norma L1 (suma de valores absolutos) de un vector.
 * @param {number[]} v
 * @returns {number}
 */
function normaL1(v) {
  return v.reduce((suma, vi) => suma + Math.abs(vi), 0);
}

/**
 * Calcula el error relativo entre dos vectores (iteración actual vs anterior).
 * Útil para criterio de parada en métodos iterativos (Gauss-Seidel).
 * @param {number[]} xNuevo - Iteración actual
 * @param {number[]} xAnterior - Iteración anterior
 * @returns {number} Error relativo máximo
 */
function errorRelativo(xNuevo, xAnterior) {
  let maxError = 0;
  for (let i = 0; i < xNuevo.length; i++) {
    const denominador = Math.abs(xNuevo[i]) > 1e-12 ? Math.abs(xNuevo[i]) : 1;
    const error = Math.abs(xNuevo[i] - xAnterior[i]) / denominador;
    if (error > maxError) maxError = error;
  }
  return maxError;
}

/**
 * Calcula el error absoluto entre dos vectores.
 * @param {number[]} xNuevo
 * @param {number[]} xAnterior
 * @returns {number} Error absoluto máximo (norma infinita de la diferencia)
 */
function errorAbsoluto(xNuevo, xAnterior) {
  return normaInfinita(restarVectores(xNuevo, xAnterior));
}


// ═══════════════════════════════════════════════════════════════
// SECCIÓN 3: VALIDACIONES DE ENTRADA
// ═══════════════════════════════════════════════════════════════

/**
 * Valida que un valor sea un número finito (no NaN, no Infinity).
 * @param {*}      valor
 * @param {string} nombre - Nombre del parámetro para el mensaje de error
 * @throws {Error}
 */
function validarNumero(valor, nombre = 'El valor') {
  if (typeof valor !== 'number' || !isFinite(valor)) {
    throw new Error(`${nombre} debe ser un número finito. Se recibió: ${valor}`);
  }
}

/**
 * Valida que un número esté dentro de un rango [min, max].
 * @param {number} valor
 * @param {number} min
 * @param {number} max
 * @param {string} nombre
 * @throws {Error}
 */
function validarRango(valor, min, max, nombre = 'El valor') {
  validarNumero(valor, nombre);
  if (valor < min || valor > max) {
    throw new Error(`${nombre} debe estar entre ${min} y ${max}. Se recibió: ${valor}`);
  }
}

/**
 * Valida que un número sea estrictamente positivo (> 0).
 * @param {number} valor
 * @param {string} nombre
 * @throws {Error}
 */
function validarPositivo(valor, nombre = 'El valor') {
  validarNumero(valor, nombre);
  if (valor <= 0) {
    throw new Error(`${nombre} debe ser positivo (> 0). Se recibió: ${valor}`);
  }
}

/**
 * Valida que un número sea no negativo (≥ 0).
 * @param {number} valor
 * @param {string} nombre
 * @throws {Error}
 */
function validarNoNegativo(valor, nombre = 'El valor') {
  validarNumero(valor, nombre);
  if (valor < 0) {
    throw new Error(`${nombre} debe ser ≥ 0. Se recibió: ${valor}`);
  }
}

/**
 * Valida que un valor sea un entero positivo.
 * @param {number} valor
 * @param {string} nombre
 * @throws {Error}
 */
function validarEnteroPositivo(valor, nombre = 'El valor') {
  validarPositivo(valor, nombre);
  if (!Number.isInteger(valor)) {
    throw new Error(`${nombre} debe ser un número entero. Se recibió: ${valor}`);
  }
}

/**
 * Valida que una matriz sea cuadrada n×n.
 * @param {number[][]} A
 * @throws {Error}
 */
function validarMatrizCuadrada(A) {
  if (!Array.isArray(A) || A.length === 0) {
    throw new Error('La matriz debe ser un array no vacío.');
  }
  const n = A.length;
  for (let i = 0; i < n; i++) {
    if (!Array.isArray(A[i]) || A[i].length !== n) {
      throw new Error(`La fila ${i} tiene ${A[i]?.length ?? 0} elementos; se esperaban ${n} (matriz cuadrada).`);
    }
  }
}

/**
 * Valida que dos matrices tengan la misma dimensión.
 * @param {number[][]} A
 * @param {number[][]} B
 * @throws {Error}
 */
function validarMismaDimension(A, B) {
  if (A.length !== B.length || A[0].length !== B[0].length) {
    throw new Error(
      `Las matrices deben tener la misma dimensión. A: ${A.length}×${A[0].length}, B: ${B.length}×${B[0].length}`
    );
  }
}

/**
 * Valida que un vector tenga exactamente n elementos numéricos.
 * @param {number[]} v
 * @param {number}   n
 * @param {string}   nombre
 * @throws {Error}
 */
function validarVector(v, n, nombre = 'El vector') {
  if (!Array.isArray(v) || v.length !== n) {
    throw new Error(`${nombre} debe tener ${n} elementos. Tiene ${v?.length ?? 0}.`);
  }
  v.forEach((val, i) => {
    if (typeof val !== 'number' || !isFinite(val)) {
      throw new Error(`${nombre}[${i}] no es un número finito: ${val}`);
    }
  });
}

/**
 * Verifica si una matriz es diagonal dominante (condición suficiente para
 * convergencia de Gauss-Seidel y Jacobi).
 * Una matriz es diagonal dominante si para cada fila:
 *   |a_ii| ≥ Σ_{j≠i} |a_ij|
 *
 * @param {number[][]} A
 * @returns {{ esDominante: boolean, filasFallidas: number[] }}
 */
function esDiagonalDominante(A) {
  validarMatrizCuadrada(A);
  const n = A.length;
  const filasFallidas = [];

  for (let i = 0; i < n; i++) {
    const diagonal = Math.abs(A[i][i]);
    const sumaResto = A[i].reduce((s, val, j) => j !== i ? s + Math.abs(val) : s, 0);
    if (diagonal < sumaResto) {
      filasFallidas.push(i);
    }
  }

  return {
    esDominante: filasFallidas.length === 0,
    filasFallidas,
  };
}

/**
 * Intenta reordenar las filas de A para lograr dominancia diagonal.
 * Algoritmo greedy: en cada columna, mueve la fila con el mayor |a_ii|.
 * No garantiza éxito, pero funciona para la mayoría de sistemas físicos.
 *
 * @param {number[][]} A
 * @param {number[]}   b
 * @returns {{ A: number[][], b: number[], reordenado: boolean, permutacion: number[] }}
 */
function intentarOrdenarDominante(A, b) {
  const n = A.length;
  const M = copiarMatriz(A);
  const bCopia = copiarVector(b);
  const permutacion = Array.from({ length: n }, (_, i) => i);

  for (let col = 0; col < n; col++) {
    // Buscar fila con mayor valor absoluto en la columna col (desde col en adelante)
    let maxFila = col;
    for (let fila = col + 1; fila < n; fila++) {
      if (Math.abs(M[fila][col]) > Math.abs(M[maxFila][col])) {
        maxFila = fila;
      }
    }
    if (maxFila !== col) {
      intercambiarFilas(M, col, maxFila);
      // Intercambiar b también
      [bCopia[col], bCopia[maxFila]] = [bCopia[maxFila], bCopia[col]];
      [permutacion[col], permutacion[maxFila]] = [permutacion[maxFila], permutacion[col]];
    }
  }

  const { esDominante } = esDiagonalDominante(M);
  return { A: M, b: bCopia, reordenado: true, esDominante, permutacion };
}


// ═══════════════════════════════════════════════════════════════
// SECCIÓN 4: HELPERS MATEMÁTICOS GENERALES
// ═══════════════════════════════════════════════════════════════

/**
 * Redondea a n decimales significativos, eliminando ruido de punto flotante.
 * @param {number} valor
 * @param {number} [decimales=8]
 * @returns {number}
 */
function redondear(valor, decimales = 8) {
  if (!isFinite(valor)) return valor;
  return parseFloat(valor.toFixed(decimales));
}

/**
 * Redondea todos los elementos de un vector.
 * @param {number[]} v
 * @param {number}   [decimales=8]
 * @returns {number[]}
 */
function redondearVector(v, decimales = 8) {
  return v.map(val => redondear(val, decimales));
}

/**
 * Redondea todos los elementos de una matriz.
 * @param {number[][]} A
 * @param {number}     [decimales=8]
 * @returns {number[][]}
 */
function redondearMatriz(A, decimales = 8) {
  return A.map(fila => fila.map(val => redondear(val, decimales)));
}

/**
 * Retorna el signo de un número: +1, -1 o 0.
 * @param {number} x
 * @returns {number}
 */
function signo(x) {
  if (x > 0) return 1;
  if (x < 0) return -1;
  return 0;
}

/**
 * Verifica si dos números son aproximadamente iguales dentro de una tolerancia.
 * @param {number} a
 * @param {number} b
 * @param {number} [tolerancia=1e-10]
 * @returns {boolean}
 */
function sonAproximadamenteIguales(a, b, tolerancia = 1e-10) {
  return Math.abs(a - b) <= tolerancia;
}

/**
 * Calcula el factorial de n (solo para n enteros no negativos).
 * @param {number} n
 * @returns {number}
 */
function factorial(n) {
  if (n < 0 || !Number.isInteger(n)) throw new Error('factorial requiere entero no negativo.');
  if (n === 0 || n === 1) return 1;
  let resultado = 1;
  for (let i = 2; i <= n; i++) resultado *= i;
  return resultado;
}

/**
 * Genera un rango de números desde inicio hasta fin con paso dado.
 * Similar a numpy.linspace o np.arange.
 * @param {number} inicio
 * @param {number} fin
 * @param {number} paso
 * @returns {number[]}
 */
function rango(inicio, fin, paso = 1) {
  const resultado = [];
  for (let x = inicio; x <= fin + 1e-10; x += paso) {
    resultado.push(redondear(x));
  }
  return resultado;
}

/**
 * Genera n puntos igualmente espaciados entre inicio y fin.
 * (Equivalente a linspace de numpy/MATLAB)
 * @param {number} inicio
 * @param {number} fin
 * @param {number} n
 * @returns {number[]}
 */
function linspace(inicio, fin, n) {
  if (n < 2) return [inicio];
  const paso = (fin - inicio) / (n - 1);
  return Array.from({ length: n }, (_, i) => redondear(inicio + i * paso));
}

/**
 * Clampea un valor dentro de [min, max].
 * @param {number} valor
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
function clamp(valor, min, max) {
  return Math.min(Math.max(valor, min), max);
}


// ═══════════════════════════════════════════════════════════════
// SECCIÓN 5: PARSEO DE FUNCIONES DESDE STRING (para formularios HTML)
// ═══════════════════════════════════════════════════════════════

/**
 * Convierte un string matemático ingresado por el usuario en una función JS.
 * Soporta una variable (una EDO) o dos variables t e y (EDOs de primer orden).
 *
 * Ejemplos de strings válidos:
 *   "x^2 - 3*x + 1"    → función de x
 *   "-0.5*y"            → función de t, y
 *   "Math.sin(t)*y"     → función de t, y con Math
 *
 * IMPORTANTE: Usa Function() — solo para fines educativos con datos del usuario
 * propio (no datos externos). El proyecto es local/GitHub Pages.
 *
 * @param {string} expresion  - String con la expresión matemática
 * @param {string[]} variables - Variables de la función, default ['x']
 * @returns {Function}
 * @throws {Error} Si la expresión tiene sintaxis inválida
 */
function parsearFuncion(expresion, variables = ['x']) {
  if (!expresion || typeof expresion !== 'string') {
    throw new Error('La expresión debe ser un string no vacío.');
  }

  // Reemplazar ^ por ** para potencias (notación matemática estándar)
  let expr = expresion
    .replace(/\^/g, '**')
    .replace(/sen\(/gi, 'Math.sin(')
    .replace(/cos\(/gi,  'Math.cos(')
    .replace(/tan\(/gi,  'Math.tan(')
    .replace(/ln\(/gi,   'Math.log(')
    .replace(/log\(/gi,  'Math.log10(')
    .replace(/sqrt\(/gi, 'Math.sqrt(')
    .replace(/exp\(/gi,  'Math.exp(')
    .replace(/abs\(/gi,  'Math.abs(')
    .replace(/pi\b/gi,   'Math.PI')
    .replace(/\be\b/g,   'Math.E');

  try {
    // Crear función dinámica con las variables dadas
    // eslint-disable-next-line no-new-func
    const fn = new Function(...variables, `"use strict"; return (${expr});`);

    // Probar que no arroja errores con valores de prueba
    const testArgs = variables.map(() => 1);
    const testResult = fn(...testArgs);

    if (typeof testResult !== 'number') {
      throw new Error('La expresión no devuelve un número.');
    }

    return fn;
  } catch (e) {
    throw new Error(`Error al parsear la expresión "${expresion}": ${e.message}`);
  }
}

/**
 * Valida un string de función sin crear la función.
 * Retorna { valida: boolean, mensaje: string }.
 * @param {string}   expresion
 * @param {string[]} variables
 * @returns {{ valida: boolean, mensaje: string }}
 */
function validarExpresionFuncion(expresion, variables = ['x']) {
  try {
    parsearFuncion(expresion, variables);
    return { valida: true, mensaje: 'Expresión válida.' };
  } catch (e) {
    return { valida: false, mensaje: e.message };
  }
}


// ═══════════════════════════════════════════════════════════════
// SECCIÓN 6: FORMATEO DE RESULTADOS
// ═══════════════════════════════════════════════════════════════

/**
 * Formatea una matriz como string legible (para depuración).
 * @param {number[][]} A
 * @param {number}     [decimales=4]
 * @returns {string}
 */
function formatearMatriz(A, decimales = 4) {
  return A.map(fila =>
    '[ ' + fila.map(val => val.toFixed(decimales).padStart(10)).join('  ') + ' ]'
  ).join('\n');
}

/**
 * Formatea un vector como string legible.
 * @param {number[]} v
 * @param {number}   [decimales=4]
 * @returns {string}
 */
function formatearVector(v, decimales = 4) {
  return '[ ' + v.map(val => val.toFixed(decimales)).join(',  ') + ' ]';
}

/**
 * Genera encabezados para tabla de iteraciones de métodos iterativos.
 * @param {string[]} nombresVariables - Ej: ['x1','x2','x3']
 * @returns {string[]} Encabezados: ['n', 'x1', 'x2', 'x3', 'Error']
 */
function encabezadosTablaIterativa(nombresVariables) {
  return ['n', ...nombresVariables, 'Error'];
}

/**
 * Calcula estadísticas básicas de un array de números.
 * Útil para interpretar resultados numéricos en los escenarios.
 * @param {number[]} datos
 * @returns {{ min, max, media, mediana, desviacion }}
 */
function estadisticasBasicas(datos) {
  if (!datos.length) throw new Error('El array de datos está vacío.');

  const n = datos.length;
  const sorted = [...datos].sort((a, b) => a - b);
  const min = sorted[0];
  const max = sorted[n - 1];
  const media = datos.reduce((s, v) => s + v, 0) / n;
  const mediana = n % 2 === 0
    ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2
    : sorted[Math.floor(n / 2)];
  const varianza = datos.reduce((s, v) => s + (v - media) ** 2, 0) / n;
  const desviacion = Math.sqrt(varianza);

  return {
    min:       redondear(min),
    max:       redondear(max),
    media:     redondear(media),
    mediana:   redondear(mediana),
    desviacion: redondear(desviacion),
  };
}


// ═══════════════════════════════════════════════════════════════
// SECCIÓN 7: CONSTANTES MATEMÁTICAS ÚTILES
// ═══════════════════════════════════════════════════════════════

const TOLERANCIA_DEFAULT   = 1e-6;   // Criterio de convergencia estándar
const MAX_ITERACIONES      = 1000;   // Límite seguro para métodos iterativos
const EPSILON_MAQUINA      = Number.EPSILON; // ~2.22e-16
const TOLERANCIA_CERO      = 1e-12;  // Para comparar con cero (pivotes, etc.)


// ═══════════════════════════════════════════════════════════════
// EXPORTACIÓN DEL MÓDULO
// ═══════════════════════════════════════════════════════════════

if (typeof window !== 'undefined') {
  window.Utilidades = {
    // Matrices
    crearMatrizCeros,
    crearMatrizIdentidad,
    copiarMatriz,
    copiarVector,
    multiplicarMatrices,
    multiplicarMatrizVector,
    transponerMatriz,
    sumarMatrices,
    restarMatrices,
    escalarMatriz,
    intercambiarFilas,
    determinante,
    matrizAumentada,
    esDiagonalDominante,
    intentarOrdenarDominante,

    // Vectores
    sumarVectores,
    restarVectores,
    productoPunto,
    escalarVector,
    normaL1,
    normaL2,
    normaInfinita,
    errorRelativo,
    errorAbsoluto,

    // Validaciones
    validarNumero,
    validarRango,
    validarPositivo,
    validarNoNegativo,
    validarEnteroPositivo,
    validarMatrizCuadrada,
    validarMismaDimension,
    validarVector,

    // Helpers matemáticos
    redondear,
    redondearVector,
    redondearMatriz,
    signo,
    sonAproximadamenteIguales,
    factorial,
    rango,
    linspace,
    clamp,

    // Parseo de funciones (formularios)
    parsearFuncion,
    validarExpresionFuncion,

    // Formateo
    formatearMatriz,
    formatearVector,
    encabezadosTablaIterativa,
    estadisticasBasicas,

    // Constantes
    TOLERANCIA_DEFAULT,
    MAX_ITERACIONES,
    EPSILON_MAQUINA,
    TOLERANCIA_CERO,
  };
}