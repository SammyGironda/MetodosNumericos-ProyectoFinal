/**
 * formularios.js - Módulo de validación de formularios en tiempo real
 * Proyecto: Simulación Numérica de Crisis - Métodos Numéricos Aplicados
 *
 * Responsabilidades:
 *  - Validar inputs en tiempo real (onInput + onBlur)
 *  - Mostrar/ocultar mensajes de error inline bajo cada campo
 *  - Validaciones específicas para métodos numéricos
 *  - Leer y parsear valores de formularios de escenarios
 *  - Habilitar/deshabilitar botón "Calcular" según estado del form
 *  - Resetear formularios al cambiar de escenario
 *
 * Uso:
 *  window.Formularios.registrar(formId, esquema, callbackValido)
 *  window.Formularios.leer(formId, esquema) → objeto con valores parseados
 *  window.Formularios.validarCampo(inputEl, regla) → boolean
 *  window.Formularios.limpiarErrores(formId)
 *  window.Formularios.desregistrar(formId)
 *
 * API pública completa al final del archivo.
 */

const Formularios = (() => {
  'use strict';

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. REGISTRO DE FORMULARIOS ACTIVOS
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Map<formId, { esquema, listeners, btnCalcular }>
   * Permite desregistrar listeners al cambiar de escenario (evita memory leaks).
   */
  const _registros = new Map();

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. MENSAJES DE ERROR ESTÁNDAR
  // ─────────────────────────────────────────────────────────────────────────────

  const MENSAJES = {
    requerido:        'Este campo es obligatorio.',
    numero:           'Debe ser un número válido.',
    entero:           'Debe ser un número entero.',
    positivo:         'Debe ser un valor positivo (> 0).',
    noNegativo:       'Debe ser un valor ≥ 0.',
    min:              (min) => `El valor mínimo es ${min}.`,
    max:              (max) => `El valor máximo es ${max}.`,
    rango:            (min, max) => `Debe estar entre ${min} y ${max}.`,
    tolerancia:       'La tolerancia debe estar entre 1×10⁻¹² y 1 (ej: 0.0001).',
    maxIter:          'Las iteraciones deben ser un entero entre 1 y 10 000.',
    matrizCuadrada:   'La matriz debe ser cuadrada (mismo número de filas y columnas).',
    matrizDiagonal:   'La diagonal principal no puede contener ceros (Gauss-Seidel).',
    intervaloBisec:   'f(a) y f(b) deben tener signos opuestos [f(a)·f(b) < 0].',
    pasoPositivo:     'El paso h debe ser positivo.',
    nPuntos:          (min) => `Se necesitan al menos ${min} puntos de datos.`,
    nParSimpson:      'Para Simpson 1/3 se necesita un número par de subintervalos.',
    limitesOrden:     'El límite inferior debe ser menor que el superior.',
    sinCeros:         'Este campo no puede ser cero.',
    formatoMatriz:    'Ingresa los valores separados por espacios o comas.',
    formatoVector:    'Ingresa los valores separados por espacios, comas o punto y coma.',
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. VALIDADORES PRIMITIVOS
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Colección de funciones de validación reutilizables.
   * Cada una recibe el valor crudo (string) del input y devuelve
   * { valido: boolean, mensaje: string }.
   */
  const Validadores = {

    /** Campo no vacío */
    requerido: (val) => ({
      valido:  val.trim() !== '',
      mensaje: MENSAJES.requerido,
    }),

    /** Número real válido */
    numero: (val) => ({
      valido:  val.trim() !== '' && !isNaN(Number(val)) && isFinite(Number(val)),
      mensaje: MENSAJES.numero,
    }),

    /** Número entero */
    entero: (val) => {
      const n = Number(val);
      return {
        valido:  Number.isInteger(n) && isFinite(n),
        mensaje: MENSAJES.entero,
      };
    },

    /** Número estrictamente positivo */
    positivo: (val) => {
      const n = Number(val);
      return {
        valido:  !isNaN(n) && n > 0,
        mensaje: MENSAJES.positivo,
      };
    },

    /** Número no negativo */
    noNegativo: (val) => {
      const n = Number(val);
      return {
        valido:  !isNaN(n) && n >= 0,
        mensaje: MENSAJES.noNegativo,
      };
    },

    /** Valor mínimo */
    min: (min) => (val) => {
      const n = Number(val);
      return {
        valido:  !isNaN(n) && n >= min,
        mensaje: MENSAJES.min(min),
      };
    },

    /** Valor máximo */
    max: (max) => (val) => {
      const n = Number(val);
      return {
        valido:  !isNaN(n) && n <= max,
        mensaje: MENSAJES.max(max),
      };
    },

    /** Rango [min, max] */
    rango: (min, max) => (val) => {
      const n = Number(val);
      return {
        valido:  !isNaN(n) && n >= min && n <= max,
        mensaje: MENSAJES.rango(min, max),
      };
    },

    /** Tolerancia para criterio de parada (1e-12 a 1) */
    tolerancia: (val) => {
      const n = Number(val);
      return {
        valido:  !isNaN(n) && n > 1e-12 && n <= 1,
        mensaje: MENSAJES.tolerancia,
      };
    },

    /** Número máximo de iteraciones (1 a 10 000, entero) */
    maxIter: (val) => {
      const n = Number(val);
      return {
        valido:  Number.isInteger(n) && n >= 1 && n <= 10000,
        mensaje: MENSAJES.maxIter,
      };
    },

    /** Paso h estrictamente positivo */
    pasoPositivo: (val) => {
      const n = Number(val);
      return {
        valido:  !isNaN(n) && n > 0,
        mensaje: MENSAJES.pasoPositivo,
      };
    },

    /** No puede ser exactamente cero */
    sinCeros: (val) => {
      const n = Number(val);
      return {
        valido:  !isNaN(n) && n !== 0,
        mensaje: MENSAJES.sinCeros,
      };
    },

    /**
     * Vector: lista de números separados por espacio, coma o punto y coma.
     * @param {number} [minLong] - Longitud mínima del vector
     */
    vector: (minLong = 1) => (val) => {
      const partes = val.trim().split(/[\s,;]+/).filter(Boolean);
      const todosNumeros = partes.every(p => !isNaN(Number(p)) && isFinite(Number(p)));
      if (!todosNumeros) return { valido: false, mensaje: MENSAJES.formatoVector };
      if (partes.length < minLong) return { valido: false, mensaje: MENSAJES.nPuntos(minLong) };
      return { valido: true, mensaje: '' };
    },

    /**
     * Matriz: filas separadas por punto y coma, columnas por espacio o coma.
     * Ejemplo: "2 1 -1; 3 2 1; 1 -1 2"
     * @param {number} [n] - Tamaño esperado (n×n). Si se omite, solo verifica que sea cuadrada.
     */
    matriz: (n = null) => (val) => {
      const filas = val.trim().split(';').map(f => f.trim().split(/[\s,]+/).filter(Boolean));
      const nFilas = filas.length;
      const nCols  = filas[0]?.length ?? 0;

      // Todas las filas deben tener el mismo número de columnas
      if (!filas.every(f => f.length === nCols)) {
        return { valido: false, mensaje: MENSAJES.matrizCuadrada };
      }

      // Debe ser cuadrada
      if (nFilas !== nCols) {
        return { valido: false, mensaje: MENSAJES.matrizCuadrada };
      }

      // Tamaño específico
      if (n !== null && nFilas !== n) {
        return { valido: false, mensaje: `La matriz debe ser de ${n}×${n}.` };
      }

      // Todos los valores deben ser números
      const todosNum = filas.flat().every(v => !isNaN(Number(v)) && isFinite(Number(v)));
      if (!todosNum) return { valido: false, mensaje: MENSAJES.formatoMatriz };

      return { valido: true, mensaje: '' };
    },
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. VALIDACIONES COMPUESTAS (cruzadas entre campos)
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Valida que a < b (para intervalos: bisección, integración).
   * @param {number} a - Límite inferior
   * @param {number} b - Límite superior
   * @returns {{ valido: boolean, mensaje: string }}
   */
  const validarIntervalo = (a, b) => ({
    valido:  a < b,
    mensaje: MENSAJES.limitesOrden,
  });

  /**
   * Valida condición de Bolzano para bisección: f(a)·f(b) < 0.
   * @param {Function} f - Función a evaluar
   * @param {number}   a
   * @param {number}   b
   * @returns {{ valido: boolean, mensaje: string }}
   */
  const validarBolzano = (f, a, b) => {
    try {
      const fa = f(a);
      const fb = f(b);
      return {
        valido:  fa * fb < 0,
        mensaje: MENSAJES.intervaloBisec,
      };
    } catch {
      return { valido: false, mensaje: 'Error al evaluar f(a) o f(b).' };
    }
  };

  /**
   * Valida que la diagonal de una matriz no tenga ceros (Gauss-Seidel).
   * @param {number[][]} matriz
   * @returns {{ valido: boolean, mensaje: string }}
   */
  const validarDiagonalNoNula = (matriz) => {
    const ok = matriz.every((fila, i) => fila[i] !== 0);
    return { valido: ok, mensaje: MENSAJES.matrizDiagonal };
  };

  /**
   * Valida número de subintervalos par para Simpson 1/3.
   * @param {number} n
   * @returns {{ valido: boolean, mensaje: string }}
   */
  const validarParSimpson = (n) => ({
    valido:  Number.isInteger(n) && n > 0 && n % 2 === 0,
    mensaje: MENSAJES.nParSimpson,
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 5. UTILIDADES DOM PARA ERRORES
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Muestra un mensaje de error bajo un input.
   * Busca o crea el elemento .form-error asociado al campo.
   * @param {HTMLElement} inputEl
   * @param {string}      mensaje
   */
  const _mostrarError = (inputEl, mensaje) => {
    inputEl.classList.add('form-input--error');
    inputEl.setAttribute('aria-invalid', 'true');

    // Buscar el .form-error sibling dentro del mismo .form-group
    let errorEl = _obtenerErrorEl(inputEl);
    if (!errorEl) {
      errorEl = document.createElement('span');
      errorEl.className = 'form-error';
      errorEl.setAttribute('role', 'alert');
      errorEl.setAttribute('aria-live', 'polite');
      inputEl.parentNode.appendChild(errorEl);
    }
    errorEl.textContent = mensaje;
    errorEl.style.display = 'block';
  };

  /**
   * Limpia el error de un input específico.
   * @param {HTMLElement} inputEl
   */
  const _limpiarError = (inputEl) => {
    inputEl.classList.remove('form-input--error');
    inputEl.removeAttribute('aria-invalid');

    const errorEl = _obtenerErrorEl(inputEl);
    if (errorEl) {
      errorEl.textContent = '';
      errorEl.style.display = 'none';
    }
  };

  /**
   * Busca el elemento .form-error dentro del .form-group del input.
   * @param {HTMLElement} inputEl
   * @returns {HTMLElement|null}
   */
  const _obtenerErrorEl = (inputEl) => {
    const grupo = inputEl.closest('.form-group');
    return grupo ? grupo.querySelector('.form-error') : null;
  };

  /**
   * Marca un campo como válido visualmente.
   * @param {HTMLElement} inputEl
   */
  const _marcarValido = (inputEl) => {
    _limpiarError(inputEl);
    inputEl.classList.add('form-input--valid');
  };

  /**
   * Quita la marca de válido (estado neutro).
   * @param {HTMLElement} inputEl
   */
  const _quitarMarcaValido = (inputEl) => {
    inputEl.classList.remove('form-input--valid');
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // 6. VALIDACIÓN DE UN CAMPO INDIVIDUAL
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Valida un input contra una regla (o array de reglas).
   * Las reglas se ejecutan en orden; se detiene en el primer fallo.
   *
   * @param {HTMLElement}        inputEl - Elemento <input>, <textarea> o <select>
   * @param {Function|Function[]} reglas - Validador(es) del módulo Validadores
   * @param {boolean} [mostrarUI=true]   - Si false, no toca el DOM (modo silencioso)
   * @returns {boolean} true si todas las reglas pasan
   */
  const validarCampo = (inputEl, reglas, mostrarUI = true) => {
    const valor     = inputEl.value ?? '';
    const reglasArr = Array.isArray(reglas) ? reglas : [reglas];

    for (const regla of reglasArr) {
      const { valido, mensaje } = regla(valor);
      if (!valido) {
        if (mostrarUI) _mostrarError(inputEl, mensaje);
        return false;
      }
    }

    if (mostrarUI) _marcarValido(inputEl);
    return true;
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // 7. REGISTRO DE FORMULARIO CON ESQUEMA
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Registra un formulario para validación en tiempo real.
   *
   * @param {string}   formId            - ID del <form> o contenedor
   * @param {object}   esquema           - Mapa campo → reglas
   *   Formato: { nombreCampo: reglasArray, ... }
   *   El nombreCampo debe coincidir con el `name` o `id` del input.
   * @param {Function} [callbackValido]  - Se llama cuando TODO el form es válido
   * @param {object}   [opciones]
   * @param {string}   [opciones.btnCalcularId]  - ID del botón a habilitar/deshabilitar
   * @param {boolean}  [opciones.validarAlInicio] - Validar todos los campos al registrar
   *
   * @example
   * Formularios.registrar('form-escenario-a', {
   *   tolerancia:  [Formularios.V.requerido, Formularios.V.tolerancia],
   *   maxIter:     [Formularios.V.requerido, Formularios.V.maxIter],
   *   matrizA:     [Formularios.V.requerido, Formularios.V.matriz()],
   * }, (datos) => {
   *   // datos = { tolerancia: 0.001, maxIter: 100, matrizA: [[...]] }
   *   EscenarioA.calcular(datos);
   * }, { btnCalcularId: 'btn-calcular-a' });
   */
  const registrar = (formId, esquema = {}, callbackValido = null, opciones = {}) => {
    // Limpiar registro previo si existe
    desregistrar(formId);

    const formEl = document.getElementById(formId);
    if (!formEl) {
      console.warn(`[Formularios] No se encontró el form/contenedor id="${formId}".`);
      return;
    }

    const {
      btnCalcularId  = null,
      validarAlInicio = false,
    } = opciones;

    const btnCalcular = btnCalcularId
      ? document.getElementById(btnCalcularId)
      : formEl.querySelector('[type="submit"], .btn--calcular');

    const listeners = [];

    // ── Función central: valida todos los campos del esquema ─────────────────
    const validarTodo = (mostrarUI = true) => {
      let todoValido = true;

      for (const [campo, reglas] of Object.entries(esquema)) {
        const inputEl = _obtenerInput(formEl, campo);
        if (!inputEl) continue;

        const campoValido = validarCampo(inputEl, reglas, mostrarUI);
        if (!campoValido) todoValido = false;
      }

      // Habilitar/deshabilitar botón
      if (btnCalcular) {
        btnCalcular.disabled = !todoValido;
        btnCalcular.classList.toggle('btn--disabled', !todoValido);
      }

      return todoValido;
    };

    // ── Listeners por campo ──────────────────────────────────────────────────
    for (const [campo, reglas] of Object.entries(esquema)) {
      const inputEl = _obtenerInput(formEl, campo);
      if (!inputEl) {
        console.warn(`[Formularios] Campo "${campo}" no encontrado en form "${formId}".`);
        continue;
      }

      // Validar en tiempo real (input)
      const onInput = () => {
        validarCampo(inputEl, reglas, true);
        // Re-evaluar estado global del botón
        _actualizarBoton(formEl, esquema, btnCalcular);
      };

      // Validar al salir del campo (blur) — muestra errores aunque no haya escrito
      const onBlur = () => {
        validarCampo(inputEl, reglas, true);
        _actualizarBoton(formEl, esquema, btnCalcular);
      };

      inputEl.addEventListener('input', onInput);
      inputEl.addEventListener('blur',  onBlur);
      listeners.push({ el: inputEl, type: 'input', fn: onInput });
      listeners.push({ el: inputEl, type: 'blur',  fn: onBlur  });
    }

    // ── Listener submit (si es un <form> real) ───────────────────────────────
    if (formEl.tagName.toLowerCase() === 'form') {
      const onSubmit = (e) => {
        e.preventDefault();
        const valido = validarTodo(true);
        if (valido && callbackValido) {
          const datos = leer(formId, esquema);
          callbackValido(datos);
        }
      };
      formEl.addEventListener('submit', onSubmit);
      listeners.push({ el: formEl, type: 'submit', fn: onSubmit });
    }

    // ── Listener en botón calcular (si es un div, no un form) ───────────────
    if (btnCalcular && formEl.tagName.toLowerCase() !== 'form') {
      const onClickBtn = () => {
        const valido = validarTodo(true);
        if (valido && callbackValido) {
          const datos = leer(formId, esquema);
          callbackValido(datos);
        }
      };
      btnCalcular.addEventListener('click', onClickBtn);
      listeners.push({ el: btnCalcular, type: 'click', fn: onClickBtn });
    }

    // Guardar registro
    _registros.set(formId, { esquema, listeners, btnCalcular });

    // Validar al inicio si se pide
    if (validarAlInicio) validarTodo(false);

    // Estado inicial del botón
    if (btnCalcular) btnCalcular.disabled = true;
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // 8. LECTURA Y PARSEO DE VALORES
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Lee y parsea todos los campos del esquema desde el formulario.
   * Convierte automáticamente strings a los tipos adecuados.
   *
   * @param {string} formId
   * @param {object} esquema - El mismo esquema usado en registrar()
   * @returns {object} Objeto con los valores parseados { campo: valorParseado }
   *
   * Reglas de parseo automático:
   *  - Si el valor es numérico puro → Number
   *  - Si contiene ';' → matriz (number[][])
   *  - Si contiene separadores múltiples → array de números (number[])
   *  - Checkbox → boolean
   *  - Select → string
   *  - Resto → string limpio
   */
  const leer = (formId, esquema = {}) => {
    const formEl = document.getElementById(formId);
    if (!formEl) return {};

    const datos = {};

    for (const campo of Object.keys(esquema)) {
      const inputEl = _obtenerInput(formEl, campo);
      if (!inputEl) continue;

      const raw = inputEl.value.trim();

      // Checkbox
      if (inputEl.type === 'checkbox') {
        datos[campo] = inputEl.checked;
        continue;
      }

      // Select con múltiple
      if (inputEl.tagName.toLowerCase() === 'select' && inputEl.multiple) {
        datos[campo] = Array.from(inputEl.selectedOptions).map(o => o.value);
        continue;
      }

      // Matriz (contiene punto y coma)
      if (raw.includes(';')) {
        datos[campo] = _parsearMatriz(raw);
        continue;
      }

      // Vector (contiene comas o espacios múltiples entre números)
      if (/[\s,]+/.test(raw) && raw.split(/[\s,;]+/).filter(Boolean).length > 1) {
        const partes = raw.split(/[\s,;]+/).filter(Boolean);
        const todosNum = partes.every(p => !isNaN(Number(p)) && isFinite(Number(p)));
        if (todosNum) {
          datos[campo] = partes.map(Number);
          continue;
        }
      }

      // Número simple
      if (raw !== '' && !isNaN(Number(raw)) && isFinite(Number(raw))) {
        datos[campo] = Number(raw);
        continue;
      }

      // String
      datos[campo] = raw;
    }

    return datos;
  };

  /**
   * Parsea una cadena de texto a matriz number[][].
   * Formato: "2 1 -1; 3 2 1; 1 -1 2"
   * @param {string} texto
   * @returns {number[][]}
   */
  const _parsearMatriz = (texto) => {
    return texto
      .trim()
      .split(';')
      .map(fila =>
        fila.trim()
          .split(/[\s,]+/)
          .filter(Boolean)
          .map(Number)
      );
  };

  /**
   * Parsea una cadena de texto a vector number[].
   * @param {string} texto
   * @returns {number[]}
   */
  const _parsearVector = (texto) => {
    return texto
      .trim()
      .split(/[\s,;]+/)
      .filter(Boolean)
      .map(Number);
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // 9. LLENADO DE FORMULARIOS (datos de ejemplo)
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Rellena los campos de un formulario con valores predefinidos.
   * Útil para cargar ejemplos desde ejemplos.json.
   *
   * @param {string} formId
   * @param {object} valores - { campo: valor, ... }
   *   - Si el valor es number[][] → se convierte a "fila1; fila2; ..."
   *   - Si es number[] → se convierte a "v1 v2 v3 ..."
   *   - Si es number/string → se asigna directo
   */
  const rellenar = (formId, valores = {}) => {
    const formEl = document.getElementById(formId);
    if (!formEl) return;

    for (const [campo, valor] of Object.entries(valores)) {
      const inputEl = _obtenerInput(formEl, campo);
      if (!inputEl) continue;

      if (Array.isArray(valor)) {
        // Matriz: array de arrays
        if (Array.isArray(valor[0])) {
          inputEl.value = valor.map(fila => fila.join(' ')).join('; ');
        } else {
          // Vector
          inputEl.value = valor.join(' ');
        }
      } else if (inputEl.type === 'checkbox') {
        inputEl.checked = Boolean(valor);
      } else {
        inputEl.value = valor;
      }

      // Disparar evento input para re-validar
      inputEl.dispatchEvent(new Event('input', { bubbles: true }));
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // 10. LIMPIEZA Y DESREGISTRO
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Limpia todos los errores visuales de un formulario sin desregistrarlo.
   * @param {string} formId
   */
  const limpiarErrores = (formId) => {
    const formEl = document.getElementById(formId);
    if (!formEl) return;

    formEl.querySelectorAll('.form-input--error, .form-input--valid').forEach(el => {
      el.classList.remove('form-input--error', 'form-input--valid');
      el.removeAttribute('aria-invalid');
    });

    formEl.querySelectorAll('.form-error').forEach(el => {
      el.textContent    = '';
      el.style.display  = 'none';
    });
  };

  /**
   * Resetea un formulario: limpia valores y errores.
   * @param {string} formId
   */
  const resetear = (formId) => {
    const formEl = document.getElementById(formId);
    if (!formEl) return;

    if (formEl.tagName.toLowerCase() === 'form') {
      formEl.reset();
    } else {
      formEl.querySelectorAll('input, textarea, select').forEach(el => {
        if (el.type === 'checkbox') el.checked = false;
        else el.value = '';
      });
    }

    limpiarErrores(formId);

    // Deshabilitar botón de nuevo
    const registro = _registros.get(formId);
    if (registro?.btnCalcular) {
      registro.btnCalcular.disabled = true;
      registro.btnCalcular.classList.add('btn--disabled');
    }
  };

  /**
   * Elimina todos los event listeners registrados y borra el registro.
   * Llamar al destruir / cambiar de escenario.
   * @param {string} formId
   */
  const desregistrar = (formId) => {
    const registro = _registros.get(formId);
    if (!registro) return;

    registro.listeners.forEach(({ el, type, fn }) => {
      el.removeEventListener(type, fn);
    });

    _registros.delete(formId);
  };

  /**
   * Desregistra todos los formularios activos.
   * Llamar al cambiar de escenario completamente.
   */
  const desregistrarTodos = () => {
    for (const formId of _registros.keys()) {
      desregistrar(formId);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // 11. UTILIDADES INTERNAS
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Busca un input dentro de un formulario por name o id.
   * @param {HTMLElement} formEl
   * @param {string}      campo
   * @returns {HTMLElement|null}
   */
  const _obtenerInput = (formEl, campo) => {
    return formEl.querySelector(`[name="${campo}"], #${campo}`);
  };

  /**
   * Evalúa el estado de todos los campos y actualiza el botón sin mostrar errores.
   * Se usa internamente para feedback en tiempo real.
   * @param {HTMLElement}       formEl
   * @param {object}            esquema
   * @param {HTMLElement|null}  btnCalcular
   */
  const _actualizarBoton = (formEl, esquema, btnCalcular) => {
    if (!btnCalcular) return;

    const todoValido = Object.entries(esquema).every(([campo, reglas]) => {
      const inputEl = _obtenerInput(formEl, campo);
      if (!inputEl) return true; // campo no renderizado → no bloquear
      return validarCampo(inputEl, reglas, false); // silencioso
    });

    btnCalcular.disabled = !todoValido;
    btnCalcular.classList.toggle('btn--disabled', !todoValido);
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // 12. ESTILOS CSS DINÁMICOS
  // ─────────────────────────────────────────────────────────────────────────────

  const _inyectarEstilos = (() => {
    let inyectado = false;
    return () => {
      if (inyectado) return;
      inyectado = true;

      const css = `
        /* ── Formularios.js – estilos de soporte ── */

        /* Estado de error en el input */
        .form-input--error {
          border-color: var(--color-alert, #D97059) !important;
          box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-alert, #D97059) 20%, transparent);
          outline: none;
        }

        /* Estado válido en el input */
        .form-input--valid {
          border-color: var(--color-secondary, #6C8C74) !important;
          box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-secondary, #6C8C74) 15%, transparent);
        }

        /* Mensaje de error bajo el campo */
        .form-error {
          display: none;
          color: var(--color-alert, #D97059);
          font-size: var(--font-size-xs, 0.75rem);
          margin-top: var(--spacing-1, 0.25rem);
          line-height: 1.4;
        }

        /* Botón deshabilitado */
        .btn--disabled,
        button:disabled {
          opacity: 0.45;
          cursor: not-allowed;
          pointer-events: none;
        }

        /* Transición suave en inputs */
        .form-group input,
        .form-group textarea,
        .form-group select {
          transition:
            border-color 0.2s ease,
            box-shadow 0.2s ease;
        }
      `;

      const style = document.createElement('style');
      style.id          = 'formularios-js-styles';
      style.textContent = css;
      document.head.appendChild(style);
    };
  })();

  if (document.head) {
    _inyectarEstilos();
  } else {
    document.addEventListener('DOMContentLoaded', _inyectarEstilos);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 13. API PÚBLICA
  // ─────────────────────────────────────────────────────────────────────────────

  return {
    // Ciclo de vida del formulario
    registrar,
    desregistrar,
    desregistrarTodos,

    // Lectura y escritura de valores
    leer,
    rellenar,

    // Validación manual (uso desde escenarios)
    validarCampo,

    // Limpieza visual
    limpiarErrores,
    resetear,

    // Validaciones compuestas (cross-field)
    validarIntervalo,
    validarBolzano,
    validarDiagonalNoNula,
    validarParSimpson,

    // Parsers exportados (útiles en escenarios)
    parsearMatriz: _parsearMatriz,
    parsearVector: _parsearVector,

    /**
     * Validadores individuales — accesibles como Formularios.V.*
     * Ejemplo: Formularios.V.tolerancia, Formularios.V.rango(0, 100)
     */
    V: Validadores,

    // Mensajes de error (para personalización)
    MENSAJES,
  };
})();

// Exponer globalmente para uso sin módulos ES (script tags)
window.Formularios = Formularios;