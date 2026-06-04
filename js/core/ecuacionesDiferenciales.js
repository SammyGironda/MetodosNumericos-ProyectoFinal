/**
 * ============================================================
 * MÓDULO: ecuacionesDiferenciales.js
 * DESCRIPCIÓN: Métodos numéricos para resolver Ecuaciones
 *              Diferenciales Ordinarias (EDOs) de primer orden
 * MÉTODOS: Euler, Heun (Euler mejorado), Runge-Kutta 4to orden
 * PROYECTO: Simulación Numérica de Crisis - Métodos Numéricos
 * CONVENCIÓN: camelCase en JS, comentarios en ESPAÑOL
 * ============================================================
 */

// ─────────────────────────────────────────────────────────────
// VALIDACIONES COMUNES
// ─────────────────────────────────────────────────────────────

/**
 * Valida los parámetros de entrada para los métodos de EDOs.
 * @param {Function} f   - Función f(t, y) que define dy/dt = f(t,y)
 * @param {number}   t0  - Tiempo inicial
 * @param {number}   y0  - Condición inicial y(t0)
 * @param {number}   tf  - Tiempo final
 * @param {number}   h   - Tamaño de paso (debe ser > 0)
 * @throws {Error} Si algún parámetro es inválido
 */
function validarParametrosEDO(f, t0, y0, tf, h) {
  if (typeof f !== 'function') {
    throw new Error('El parámetro f debe ser una función f(t, y).');
  }
  if (typeof t0 !== 'number' || isNaN(t0)) {
    throw new Error('El tiempo inicial t0 debe ser un número válido.');
  }
  if (typeof y0 !== 'number' || isNaN(y0)) {
    throw new Error('La condición inicial y0 debe ser un número válido.');
  }
  if (typeof tf !== 'number' || isNaN(tf)) {
    throw new Error('El tiempo final tf debe ser un número válido.');
  }
  if (tf <= t0) {
    throw new Error('El tiempo final tf debe ser mayor que el tiempo inicial t0.');
  }
  if (typeof h !== 'number' || isNaN(h) || h <= 0) {
    throw new Error('El tamaño de paso h debe ser un número positivo.');
  }
  // Evitar pasos extremadamente pequeños que generen millones de iteraciones
  const nPasos = Math.ceil((tf - t0) / h);
  if (nPasos > 10000) {
    throw new Error(
      `El paso h=${h} genera ${nPasos} iteraciones. Usa un h mayor (mínimo ${((tf - t0) / 10000).toFixed(6)}).`
    );
  }
}


// ─────────────────────────────────────────────────────────────
// MÉTODO DE EULER (1er orden)
// ─────────────────────────────────────────────────────────────

/**
 * Resuelve dy/dt = f(t, y) usando el Método de Euler explícito.
 *
 * Fórmula:
 *   y_{n+1} = y_n + h * f(t_n, y_n)
 *
 * Precisión: O(h) — primer orden. Rápido pero con mayor error acumulado.
 * Útil para: comparación de métodos, pasos pequeños, EDOs no rígidas.
 *
 * @param {Function} f   - f(t, y): derivada dy/dt
 * @param {number}   t0  - Tiempo inicial
 * @param {number}   y0  - Condición inicial y(t0)
 * @param {number}   tf  - Tiempo final
 * @param {number}   h   - Tamaño de paso
 * @returns {Object} { pasos: Array<{n, t, y, pendiente}>, metodo, h, nPasos }
 */
function euler(f, t0, y0, tf, h) {
  validarParametrosEDO(f, t0, y0, tf, h);

  const pasos = [];
  let t = t0;
  let y = y0;
  let n = 0;

  // Registrar condición inicial
  pasos.push({
    n: 0,
    t: redondear(t),
    y: redondear(y),
    pendiente: redondear(f(t, y)),
  });

  while (t < tf - h * 1e-10) { // tolerancia numérica para el último paso
    const pendiente = f(t, y);

    // Verificar que la función es finita
    if (!isFinite(pendiente)) {
      throw new Error(
        `La función f(t,y) devuelve un valor no finito en t=${redondear(t)}, y=${redondear(y)}. Revisa la ecuación o reduce h.`
      );
    }

    y = y + h * pendiente;
    t = t + h;
    n++;

    pasos.push({
      n,
      t: redondear(t),
      y: redondear(y),
      pendiente: redondear(f(t, y)),
    });
  }

  return {
    metodo: 'Euler',
    h,
    nPasos: n,
    pasos,
  };
}


// ─────────────────────────────────────────────────────────────
// MÉTODO DE HEUN (Euler mejorado / Trapecio predictor-corrector)
// ─────────────────────────────────────────────────────────────

/**
 * Resuelve dy/dt = f(t, y) usando el Método de Heun (2do orden).
 *
 * Fórmula:
 *   Predictor:  ỹ_{n+1} = y_n + h * f(t_n, y_n)              ← Euler
 *   Corrector:  y_{n+1} = y_n + (h/2) * [f(t_n, y_n) + f(t_{n+1}, ỹ_{n+1})]
 *
 * Precisión: O(h²) — segundo orden. Mejor que Euler con el mismo costo computacional ~2x.
 * Útil para: mayor precisión sin la complejidad de RK4.
 *
 * @param {Function} f   - f(t, y): derivada dy/dt
 * @param {number}   t0  - Tiempo inicial
 * @param {number}   y0  - Condición inicial y(t0)
 * @param {number}   tf  - Tiempo final
 * @param {number}   h   - Tamaño de paso
 * @returns {Object} { pasos: Array<{n, t, y, k1, k2, yPredicho}>, metodo, h, nPasos }
 */
function heun(f, t0, y0, tf, h) {
  validarParametrosEDO(f, t0, y0, tf, h);

  const pasos = [];
  let t = t0;
  let y = y0;
  let n = 0;

  // Condición inicial
  pasos.push({
    n: 0,
    t: redondear(t),
    y: redondear(y),
    k1: redondear(f(t, y)),
    k2: null,
    yPredicho: null,
  });

  while (t < tf - h * 1e-10) {
    // Pendiente en el punto actual (Euler hacia adelante)
    const k1 = f(t, y);

    if (!isFinite(k1)) {
      throw new Error(`f(t,y) no es finita en t=${redondear(t)}, y=${redondear(y)}.`);
    }

    // Paso predictor (Euler explícito)
    const yPredicho = y + h * k1;
    const tSiguiente = t + h;

    // Pendiente en el punto predicho
    const k2 = f(tSiguiente, yPredicho);

    if (!isFinite(k2)) {
      throw new Error(`f(t,y) no es finita en t=${redondear(tSiguiente)}, y_pred=${redondear(yPredicho)}.`);
    }

    // Paso corrector (promedio de pendientes)
    y = y + (h / 2) * (k1 + k2);
    t = tSiguiente;
    n++;

    pasos.push({
      n,
      t: redondear(t),
      y: redondear(y),
      k1: redondear(k1),
      k2: redondear(k2),
      yPredicho: redondear(yPredicho),
    });
  }

  return {
    metodo: 'Heun',
    h,
    nPasos: n,
    pasos,
  };
}


// ─────────────────────────────────────────────────────────────
// MÉTODO DE RUNGE-KUTTA DE 4TO ORDEN (RK4) — CLÁSICO
// ─────────────────────────────────────────────────────────────

/**
 * Resuelve dy/dt = f(t, y) usando Runge-Kutta de 4to orden (RK4 clásico).
 *
 * Fórmulas:
 *   k1 = f(t_n,           y_n)
 *   k2 = f(t_n + h/2,     y_n + (h/2)*k1)
 *   k3 = f(t_n + h/2,     y_n + (h/2)*k2)
 *   k4 = f(t_n + h,       y_n + h*k3)
 *   y_{n+1} = y_n + (h/6) * (k1 + 2*k2 + 2*k3 + k4)
 *
 * Precisión: O(h⁴) — cuarto orden. El más preciso de los tres métodos.
 * Útil para: simulaciones de alta precisión, EDOs de dinámica de sistemas.
 *
 * @param {Function} f   - f(t, y): derivada dy/dt
 * @param {number}   t0  - Tiempo inicial
 * @param {number}   y0  - Condición inicial y(t0)
 * @param {number}   tf  - Tiempo final
 * @param {number}   h   - Tamaño de paso
 * @returns {Object} { pasos: Array<{n, t, y, k1, k2, k3, k4}>, metodo, h, nPasos }
 */
function rungeKutta4(f, t0, y0, tf, h) {
  validarParametrosEDO(f, t0, y0, tf, h);

  const pasos = [];
  let t = t0;
  let y = y0;
  let n = 0;

  // Condición inicial
  pasos.push({
    n: 0,
    t: redondear(t),
    y: redondear(y),
    k1: null,
    k2: null,
    k3: null,
    k4: null,
  });

  while (t < tf - h * 1e-10) {
    // Las 4 pendientes características de RK4
    const k1 = f(t,           y);
    const k2 = f(t + h / 2,   y + (h / 2) * k1);
    const k3 = f(t + h / 2,   y + (h / 2) * k2);
    const k4 = f(t + h,       y + h * k3);

    // Verificar que todas las pendientes son finitas
    [k1, k2, k3, k4].forEach((k, i) => {
      if (!isFinite(k)) {
        throw new Error(
          `La pendiente k${i + 1} no es finita en paso n=${n}, t=${redondear(t)}. Revisa la función o reduce h.`
        );
      }
    });

    // Actualizar solución con promedio ponderado
    y = y + (h / 6) * (k1 + 2 * k2 + 2 * k3 + k4);
    t = t + h;
    n++;

    pasos.push({
      n,
      t: redondear(t),
      y: redondear(y),
      k1: redondear(k1),
      k2: redondear(k2),
      k3: redondear(k3),
      k4: redondear(k4),
    });
  }

  return {
    metodo: 'Runge-Kutta 4',
    h,
    nPasos: n,
    pasos,
  };
}


// ─────────────────────────────────────────────────────────────
// COMPARACIÓN DE LOS 3 MÉTODOS (para gráficas comparativas)
// ─────────────────────────────────────────────────────────────

/**
 * Ejecuta los tres métodos (Euler, Heun, RK4) sobre la misma EDO
 * y devuelve los resultados juntos para facilitar comparación visual.
 *
 * @param {Function} f   - f(t, y): derivada dy/dt
 * @param {number}   t0  - Tiempo inicial
 * @param {number}   y0  - Condición inicial y(t0)
 * @param {number}   tf  - Tiempo final
 * @param {number}   h   - Tamaño de paso
 * @param {Function} [solucionExacta] - Opcional: función sol(t) con solución analítica
 * @returns {Object} { euler, heun, rk4, tiempos, errores (si hay sol exacta) }
 */
function compararMetodos(f, t0, y0, tf, h, solucionExacta = null) {
  const resEuler = euler(f, t0, y0, tf, h);
  const resHeun  = heun(f, t0, y0, tf, h);
  const resRK4   = rungeKutta4(f, t0, y0, tf, h);

  // Extraer solo los arrays de t e y para facilitar graficación
  const tiempos   = resRK4.pasos.map(p => p.t);
  const yEuler    = resEuler.pasos.map(p => p.y);
  const yHeun     = resHeun.pasos.map(p => p.y);
  const yRK4      = resRK4.pasos.map(p => p.y);

  const resultado = { euler: resEuler, heun: resHeun, rk4: resRK4, tiempos, yEuler, yHeun, yRK4 };

  // Si se proporciona solución exacta, calcular errores absolutos
  if (solucionExacta && typeof solucionExacta === 'function') {
    const yExacta       = tiempos.map(t => redondear(solucionExacta(t)));
    const errorEuler    = tiempos.map((t, i) => redondear(Math.abs(yExacta[i] - yEuler[i])));
    const errorHeun     = tiempos.map((t, i) => redondear(Math.abs(yExacta[i] - yHeun[i])));
    const errorRK4      = tiempos.map((t, i) => redondear(Math.abs(yExacta[i] - yRK4[i])));

    resultado.yExacta    = yExacta;
    resultado.errorEuler = errorEuler;
    resultado.errorHeun  = errorHeun;
    resultado.errorRK4   = errorRK4;

    // Error máximo de cada método (métrica de evaluación)
    resultado.errorMaxEuler = Math.max(...errorEuler);
    resultado.errorMaxHeun  = Math.max(...errorHeun);
    resultado.errorMaxRK4   = Math.max(...errorRK4);
  }

  return resultado;
}


// ─────────────────────────────────────────────────────────────
// SISTEMAS DE EDOs (para escenarios con múltiples variables)
// ─────────────────────────────────────────────────────────────

/**
 * RK4 para SISTEMA de EDOs: dy/dt = F(t, Y)
 * donde Y = [y1, y2, ..., yn] es un vector de variables.
 *
 * Ejemplo de uso en escenarioG (difusión de opinión):
 *   dS/dt = -beta*S*I
 *   dI/dt =  beta*S*I - gamma*I
 *   dR/dt =  gamma*I
 *
 * @param {Function} F   - F(t, Y): Array<number> → derivadas del sistema
 * @param {number}   t0  - Tiempo inicial
 * @param {Array}    Y0  - Condición inicial [y1_0, y2_0, ..., yn_0]
 * @param {number}   tf  - Tiempo final
 * @param {number}   h   - Tamaño de paso
 * @param {Array}    [nombresVariables] - Etiquetas para el resultado ['S','I','R']
 * @returns {Object} { pasos: Array<{n, t, Y, K1, K2, K3, K4}>, metodo, h, nPasos }
 */
function rungeKutta4Sistema(F, t0, Y0, tf, h, nombresVariables = null) {
  // Validaciones básicas para sistema
  if (typeof F !== 'function') throw new Error('F debe ser una función F(t, Y).');
  if (!Array.isArray(Y0) || Y0.length === 0) throw new Error('Y0 debe ser un array no vacío.');
  if (tf <= t0) throw new Error('tf debe ser mayor que t0.');
  if (h <= 0)   throw new Error('El paso h debe ser positivo.');

  const n = Y0.length; // número de ecuaciones del sistema
  const nPasosMax = Math.ceil((tf - t0) / h);
  if (nPasosMax > 10000) {
    throw new Error(`El paso h genera ${nPasosMax} iteraciones. Usa un h mayor.`);
  }

  const pasos = [];
  let t = t0;
  let Y = [...Y0]; // copia del vector inicial
  let paso = 0;

  pasos.push({
    n: 0,
    t: redondear(t),
    Y: Y.map(redondear),
    ...(nombresVariables ? Object.fromEntries(nombresVariables.map((v, i) => [v, redondear(Y[i])])) : {}),
  });

  // Función auxiliar: suma vectores
  const sumar = (a, b) => a.map((ai, i) => ai + b[i]);
  // Función auxiliar: escalar * vector
  const escalar = (c, v) => v.map(vi => c * vi);

  while (t < tf - h * 1e-10) {
    const K1 = F(t,         Y);
    const K2 = F(t + h / 2, sumar(Y, escalar(h / 2, K1)));
    const K3 = F(t + h / 2, sumar(Y, escalar(h / 2, K2)));
    const K4 = F(t + h,     sumar(Y, escalar(h,     K3)));

    // Verificar finitud
    [...K1, ...K2, ...K3, ...K4].forEach((v, idx) => {
      if (!isFinite(v)) throw new Error(`Valor no finito en K${Math.floor(idx / n) + 1}[${idx % n}] en t=${redondear(t)}.`);
    });

    // Actualizar sistema: Y_{n+1} = Y_n + (h/6)*(K1 + 2K2 + 2K3 + K4)
    Y = Y.map((yi, i) => yi + (h / 6) * (K1[i] + 2 * K2[i] + 2 * K3[i] + K4[i]));
    t = t + h;
    paso++;

    pasos.push({
      n: paso,
      t: redondear(t),
      Y: Y.map(redondear),
      ...(nombresVariables ? Object.fromEntries(nombresVariables.map((v, i) => [v, redondear(Y[i])])) : {}),
    });
  }

  return {
    metodo: 'Runge-Kutta 4 (Sistema)',
    h,
    nPasos: paso,
    nVariables: n,
    nombresVariables,
    pasos,
  };
}


// ─────────────────────────────────────────────────────────────
// UTILIDAD: Redondeo controlado
// ─────────────────────────────────────────────────────────────

/**
 * Redondea un número a 8 decimales significativos.
 * Evita acumulación de ruido de punto flotante en tablas/gráficas.
 * @param {number} valor
 * @param {number} [decimales=8]
 * @returns {number}
 */
function redondear(valor, decimales = 8) {
  if (!isFinite(valor)) return valor;
  return parseFloat(valor.toFixed(decimales));
}


// ─────────────────────────────────────────────────────────────
// FUNCIONES PRECONSTRUIDAS PARA LOS ESCENARIOS
// ─────────────────────────────────────────────────────────────
// Estas funciones f(t,y) representan modelos matemáticos reales
// usados en los escenarios del proyecto.

/**
 * ESCENARIO B: Vaciado de reservas
 * Modelo: dR/dt = -tasa (vaciado lineal simple)
 * O con demanda variable: dR/dt = -(a + b*t) donde a,b son parámetros
 *
 * @param {number} tasa  - Tasa de consumo por unidad de tiempo
 * @param {number} b     - Aceleración del consumo (0 = tasa constante)
 * @returns {Function} f(t, y)
 */
function modeloVaciadoReservas(tasa, b = 0) {
  return function (t, y) {
    // dy/dt = -(tasa + b*t), la reserva disminuye con posible aceleración
    return -(tasa + b * t);
  };
}

/**
 * ESCENARIO G: Difusión de opinión / Modelo SIR simplificado
 * Sistema: dS/dt = -β*S*I,  dI/dt = β*S*I - γ*I,  dR/dt = γ*I
 * (S = susceptibles, I = influenciados, R = recuperados/resistentes)
 *
 * @param {number} beta  - Tasa de contagio de opinión
 * @param {number} gamma - Tasa de recuperación/resistencia
 * @returns {Function} F(t, Y) con Y=[S,I,R]
 */
function modeloDifusionOpinion(beta, gamma) {
  return function (t, Y) {
    const [S, I, R] = Y;
    const dS = -beta * S * I;
    const dI =  beta * S * I - gamma * I;
    const dR =  gamma * I;
    return [dS, dI, dR];
  };
}

/**
 * Modelo logístico de crecimiento con capacidad de carga.
 * Útil para modelar rumores, pánico, adopción de comportamientos.
 * dy/dt = r*y*(1 - y/K)
 *
 * @param {number} r - Tasa de crecimiento intrínseca
 * @param {number} K - Capacidad de carga (población máxima)
 * @returns {Function} f(t, y)
 */
function modeloLogistico(r, K) {
  return function (t, y) {
    return r * y * (1 - y / K);
  };
}

/**
 * Modelo exponencial puro.
 * dy/dt = k*y  (k>0: crecimiento, k<0: decaimiento)
 * Solución exacta: y(t) = y0 * e^(k*(t-t0))
 * Útil para verificar precisión de métodos numéricos.
 *
 * @param {number} k - Constante de crecimiento/decaimiento
 * @returns {Function} f(t, y)
 */
function modeloExponencial(k) {
  return function (t, y) {
    return k * y;
  };
}

/**
 * Solución exacta del modelo exponencial (para comparar errores).
 * @param {number} k  - Constante
 * @param {number} t0 - Tiempo inicial
 * @param {number} y0 - Condición inicial
 * @returns {Function} sol(t)
 */
function solucionExactaExponencial(k, t0, y0) {
  return function (t) {
    return y0 * Math.exp(k * (t - t0));
  };
}


// ─────────────────────────────────────────────────────────────
// EXPORTACIÓN DEL MÓDULO
// ─────────────────────────────────────────────────────────────

// Compatible con uso directo en el navegador (window) y con módulos ES6
if (typeof window !== 'undefined') {
  window.EcuacionesDiferenciales = {
    // Métodos principales
    euler,
    heun,
    rungeKutta4,
    rungeKutta4Sistema,
    compararMetodos,

    // Modelos preconstruidos para los escenarios
    modeloVaciadoReservas,
    modeloDifusionOpinion,
    modeloLogistico,
    modeloExponencial,
    solucionExactaExponencial,

    // Utilidades
    redondear,
    validarParametrosEDO,
  };
}

// Exportación ES6 (opcional si usas bundler)
// export { euler, heun, rungeKutta4, rungeKutta4Sistema, compararMetodos,
//          modeloVaciadoReservas, modeloDifusionOpinion, modeloLogistico,
//          modeloExponencial, solucionExactaExponencial, redondear };