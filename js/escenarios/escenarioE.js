// ============================================================
// CORE: RAÍCES DE ECUACIONES
// Métodos: Newton-Raphson, Bisección
// Utilizados por: escenarioC.js, escenarioE.js
// ============================================================

// ─── NEWTON-RAPHSON ───────────────────────────────────────────

/**
 * Método de Newton-Raphson para encontrar raíces de f(x) = 0.
 * Convergencia cuadrática cuando la aproximación inicial es buena.
 *
 * Fórmula: x_{n+1} = x_n - f(x_n) / f'(x_n)
 *
 * @param {function} f        - Función f(x)
 * @param {function} fPrima   - Derivada f'(x)
 * @param {number}   x0       - Aproximación inicial
 * @param {number}   tol      - Tolerancia de convergencia (default 1e-6)
 * @param {number}   maxIter  - Máximo de iteraciones (default 100)
 * @returns {{
 *   raiz: number|null,
 *   convergio: boolean,
 *   iteraciones: Array<{n, x, fx, fpx, xSig, error}>,
 *   mensaje: string
 * }}
 */
function newtonRaphson(f, fPrima, x0, tol = 1e-6, maxIter = 100) {
  const iteraciones = [];
  let x = x0;

  for (let n = 0; n < maxIter; n++) {
    const fx  = f(x);
    const fpx = fPrima(x);

    // Verificar derivada no nula (evitar división por cero)
    if (Math.abs(fpx) < 1e-14) {
      return {
        raiz: null,
        convergio: false,
        iteraciones,
        mensaje: `Derivada ≈ 0 en iteración ${n}. Newton-Raphson no puede continuar.`,
      };
    }

    const xSig  = x - fx / fpx;
    const error = Math.abs(xSig - x);

    iteraciones.push({ n: n + 1, x, fx, fpx, xSig, error });

    // Verificar convergencia
    if (error < tol && Math.abs(fx) < tol) {
      return {
        raiz: xSig,
        convergio: true,
        iteraciones,
        mensaje: `Convergió en ${n + 1} iteraciones. Raíz: ${xSig.toFixed(10)}`,
      };
    }

    x = xSig;

    // Verificar divergencia (valores muy grandes)
    if (!isFinite(x) || Math.abs(x) > 1e15) {
      return {
        raiz: null,
        convergio: false,
        iteraciones,
        mensaje: `Divergencia detectada en iteración ${n + 1}.`,
      };
    }
  }

  // Máximo de iteraciones alcanzado
  return {
    raiz: x,
    convergio: false,
    iteraciones,
    mensaje: `Máximo de iteraciones (${maxIter}) alcanzado sin convergencia. Última x: ${x.toFixed(10)}`,
  };
}

// ─── BISECCIÓN ────────────────────────────────────────────────

/**
 * Método de Bisección para encontrar raíces de f(x) = 0 en [a, b].
 * Garantiza convergencia si f(a)*f(b) < 0 (teorema del valor intermedio).
 *
 * Fórmula: c = (a + b) / 2
 *
 * @param {function} f        - Función f(x)
 * @param {number}   a        - Extremo izquierdo del intervalo
 * @param {number}   b        - Extremo derecho del intervalo
 * @param {number}   tol      - Tolerancia (default 1e-6)
 * @param {number}   maxIter  - Máximo de iteraciones (default 100)
 * @returns {{
 *   raiz: number|null,
 *   convergio: boolean,
 *   iteraciones: Array<{n, a, b, x, fx, error}>,
 *   mensaje: string
 * }}
 */
function biseccion(f, a, b, tol = 1e-6, maxIter = 100) {
  const iteraciones = [];

  const fa = f(a);
  const fb = f(b);

  // Verificación inicial: debe haber cambio de signo
  if (fa * fb > 0) {
    return {
      raiz: null,
      convergio: false,
      iteraciones,
      mensaje: `f(a) y f(b) tienen el mismo signo. No se garantiza raíz en [${a}, ${b}].`,
    };
  }

  // Caso especial: el extremo ya es raíz
  if (Math.abs(fa) < tol) {
    iteraciones.push({ n: 0, a, b, x: a, fx: fa, error: Math.abs(b - a) });
    return { raiz: a, convergio: true, iteraciones, mensaje: `a ya es raíz: ${a}` };
  }
  if (Math.abs(fb) < tol) {
    iteraciones.push({ n: 0, a, b, x: b, fx: fb, error: Math.abs(b - a) });
    return { raiz: b, convergio: true, iteraciones, mensaje: `b ya es raíz: ${b}` };
  }

  let ai = a;
  let bi = b;

  for (let n = 0; n < maxIter; n++) {
    const c  = (ai + bi) / 2;
    const fc = f(c);
    const error = Math.abs(bi - ai) / 2;

    iteraciones.push({ n: n + 1, a: ai, b: bi, x: c, fx: fc, error });

    // Convergencia por intervalo O por valor de función
    if (error < tol || Math.abs(fc) < tol) {
      return {
        raiz: c,
        convergio: true,
        iteraciones,
        mensaje: `Convergió en ${n + 1} iteraciones. Raíz: ${c.toFixed(10)}`,
      };
    }

    // Actualizar intervalo
    if (f(ai) * fc < 0) {
      bi = c;  // La raíz está en [ai, c]
    } else {
      ai = c;  // La raíz está en [c, bi]
    }
  }

  const raizFinal = (ai + bi) / 2;
  return {
    raiz: raizFinal,
    convergio: false,
    iteraciones,
    mensaje: `Máximo de iteraciones (${maxIter}) alcanzado. Última estimación: ${raizFinal.toFixed(10)}`,
  };
}

// ─── SECANTE (bonus, sin derivada) ───────────────────────────

/**
 * Método de la Secante: alternativa a Newton cuando f' no está disponible.
 * Convergencia superlineal (~1.618, ratio áureo).
 *
 * Fórmula: x_{n+1} = x_n - f(x_n) * (x_n - x_{n-1}) / (f(x_n) - f(x_{n-1}))
 *
 * @param {function} f        - Función f(x)
 * @param {number}   x0       - Primera aproximación
 * @param {number}   x1       - Segunda aproximación (diferente a x0)
 * @param {number}   tol      - Tolerancia (default 1e-6)
 * @param {number}   maxIter  - Máximo de iteraciones (default 100)
 * @returns {{
 *   raiz: number|null,
 *   convergio: boolean,
 *   iteraciones: Array<{n, x, fx, error}>,
 *   mensaje: string
 * }}
 */
function secante(f, x0, x1, tol = 1e-6, maxIter = 100) {
  const iteraciones = [];
  let xPrev = x0;
  let xCurr = x1;

  for (let n = 0; n < maxIter; n++) {
    const fPrev = f(xPrev);
    const fCurr = f(xCurr);

    // Evitar división por cero
    if (Math.abs(fCurr - fPrev) < 1e-14) {
      return {
        raiz: null,
        convergio: false,
        iteraciones,
        mensaje: `f(x_n) ≈ f(x_{n-1}) en iteración ${n}. Secante no puede continuar.`,
      };
    }

    const xSig  = xCurr - fCurr * (xCurr - xPrev) / (fCurr - fPrev);
    const error = Math.abs(xSig - xCurr);

    iteraciones.push({ n: n + 1, x: xCurr, fx: fCurr, error });

    if (error < tol && Math.abs(fCurr) < tol) {
      return {
        raiz: xSig,
        convergio: true,
        iteraciones,
        mensaje: `Convergió en ${n + 1} iteraciones. Raíz: ${xSig.toFixed(10)}`,
      };
    }

    xPrev = xCurr;
    xCurr = xSig;

    if (!isFinite(xCurr)) {
      return {
        raiz: null,
        convergio: false,
        iteraciones,
        mensaje: `Divergencia en iteración ${n + 1}.`,
      };
    }
  }

  return {
    raiz: xCurr,
    convergio: false,
    iteraciones,
    mensaje: `Máximo de iteraciones alcanzado. Última x: ${xCurr.toFixed(10)}`,
  };
}

// ─── PUNTO FIJO (referencia) ──────────────────────────────────

/**
 * Método de Punto Fijo: resuelve x = g(x) iterando x_{n+1} = g(x_n).
 * Converge si |g'(x)| < 1 en la vecindad de la raíz.
 *
 * @param {function} g        - Función de iteración g(x) tal que f(x)=0 ↔ x=g(x)
 * @param {number}   x0       - Aproximación inicial
 * @param {number}   tol      - Tolerancia (default 1e-6)
 * @param {number}   maxIter  - Máximo de iteraciones (default 100)
 * @returns {{
 *   raiz: number|null,
 *   convergio: boolean,
 *   iteraciones: Array<{n, x, gx, error}>,
 *   mensaje: string
 * }}
 */
function puntoFijo(g, x0, tol = 1e-6, maxIter = 100) {
  const iteraciones = [];
  let x = x0;

  for (let n = 0; n < maxIter; n++) {
    const gx    = g(x);
    const error = Math.abs(gx - x);

    iteraciones.push({ n: n + 1, x, gx, error });

    if (error < tol) {
      return {
        raiz: gx,
        convergio: true,
        iteraciones,
        mensaje: `Convergió en ${n + 1} iteraciones. Punto fijo: ${gx.toFixed(10)}`,
      };
    }

    x = gx;

    if (!isFinite(x)) {
      return {
        raiz: null,
        convergio: false,
        iteraciones,
        mensaje: `Divergencia en iteración ${n + 1}.`,
      };
    }
  }

  return {
    raiz: x,
    convergio: false,
    iteraciones,
    mensaje: `Máximo de iteraciones alcanzado. Última x: ${x.toFixed(10)}`,
  };
}