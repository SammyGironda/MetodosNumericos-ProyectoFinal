const Tablas = (() => {
  'use strict';

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. CONSTANTES Y CONFIGURACIÓN POR DEFECTO
  // ─────────────────────────────────────────────────────────────────────────────

  const CONFIG = {
    decimales:        6,      // Cifras decimales por defecto
    notacionCientifica: 1e-4, // Umbral: menor a esto → notación científica
    maxFilas:         500,    // Límite de filas para proteger el DOM
    clasePrefijo:     'tabla', // Prefijo BEM para clases CSS
  };

  // Umbrales para resaltar errores
  const UMBRAL_ERROR = {
    alto:  10,   // % — fondo alerta
    medio:  1,   // % — fondo advertencia
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. UTILIDADES DE FORMATEO
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Formatea un número según magnitud:
   *  - Si |valor| < umbral → notación científica
   *  - Si es entero exacto → sin decimales
   *  - Caso general → toFixed(decimales)
   *
   * @param {number} valor
   * @param {number} [decimales=CONFIG.decimales]
   * @returns {string}
   */
  const _formatearNumero = (valor, decimales = CONFIG.decimales) => {
    if (valor === null || valor === undefined || isNaN(valor)) return '—';
    if (!isFinite(valor)) return valor > 0 ? '+∞' : '−∞';
    if (valor === 0) return '0';

    const abs = Math.abs(valor);

    // Notación científica para valores muy pequeños
    if (abs < CONFIG.notacionCientifica && abs > 0) {
      return valor.toExponential(decimales - 1);
    }

    // Sin decimales si es entero exacto
    if (Number.isInteger(valor)) return valor.toString();

    return valor.toFixed(decimales);
  };

  /**
   * Determina la clase CSS de una celda de error según su magnitud.
   * @param {number} error - Error en porcentaje
   * @returns {string} clase CSS o ''
   */
  const _claseError = (error) => {
    const abs = Math.abs(error);
    if (abs >= UMBRAL_ERROR.alto)  return 'table__cell--error';
    if (abs >= UMBRAL_ERROR.medio) return 'table__cell--highlight';
    return '';
  };

  /**
   * Escapa caracteres HTML para evitar XSS en contenido dinámico.
   * @param {*} valor
   * @returns {string}
   */
  const _escaparHTML = (valor) => {
    if (valor === null || valor === undefined) return '—';
    return String(valor)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. UTILIDADES DOM
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Obtiene el contenedor DOM y lanza error descriptivo si no existe.
   * @param {string} contenedorId
   * @returns {HTMLElement}
   */
  const _obtenerContenedor = (contenedorId) => {
    const el = document.getElementById(contenedorId);
    if (!el) throw new Error(`[Tablas] No se encontró el contenedor id="${contenedorId}".`);
    return el;
  };

  /**
   * Construye un elemento <th> con clase y scope.
   * @param {string} texto
   * @param {string} [scope='col']
   * @param {string} [claseExtra='']
   * @returns {HTMLTableCellElement}
   */
  const _th = (texto, scope = 'col', claseExtra = '') => {
    const th = document.createElement('th');
    th.scope = scope;
    th.textContent = texto;
    if (claseExtra) th.className = claseExtra;
    return th;
  };

  /**
   * Construye un elemento <td> con clase CSS opcional.
   * @param {string|number} contenido - Se escapa si es string
   * @param {string} [clase='']
   * @param {boolean} [esNumero=false]
   * @returns {HTMLTableCellElement}
   */
  const _td = (contenido, clase = '', esNumero = false) => {
    const td = document.createElement('td');
    td.innerHTML = typeof contenido === 'string'
      ? _escaparHTML(contenido)
      : _formatearNumero(contenido);
    if (clase) td.className = clase;
    if (esNumero) td.classList.add('table__cell--number');
    return td;
  };

  /**
   * Envuelve una tabla en un div scrollable con caption y botón exportar.
   * @param {HTMLTableElement} tabla
   * @param {string} [titulo='']
   * @param {boolean} [exportable=false]
   * @returns {HTMLDivElement}
   */
  const _envolver = (tabla, titulo = '', exportable = false) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'tabla-wrapper';

    if (titulo) {
      const caption = document.createElement('div');
      caption.className = 'tabla-titulo';
      caption.textContent = titulo;
      wrapper.appendChild(caption);
    }

    const scroll = document.createElement('div');
    scroll.className = 'tabla-scroll';
    scroll.appendChild(tabla);
    wrapper.appendChild(scroll);

    if (exportable) {
      const btnExportar = document.createElement('button');
      btnExportar.className = 'btn btn--small btn--secondary tabla-btn-exportar';
      btnExportar.textContent = '⬇ Exportar CSV';
      btnExportar.addEventListener('click', () => _exportarCSV(tabla, titulo || 'tabla'));
      wrapper.appendChild(btnExportar);
    }

    return wrapper;
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. EXPORTACIÓN CSV
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Convierte una tabla HTML a CSV y dispara la descarga.
   * @param {HTMLTableElement} tabla
   * @param {string} nombre - Nombre del archivo (sin extensión)
   */
  const _exportarCSV = (tabla, nombre = 'tabla') => {
    const filas = Array.from(tabla.querySelectorAll('tr'));
    const csv = filas
      .map(fila =>
        Array.from(fila.querySelectorAll('th, td'))
          .map(celda => `"${celda.textContent.replace(/"/g, '""')}"`)
          .join(',')
      )
      .join('\n');

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href     = url;
    link.download = `${nombre}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // 5. FUNCIÓN GENÉRICA BASE
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Genera una tabla HTML completamente genérica.
   * Es la base sobre la que se construyen todas las funciones especializadas.
   *
   * @param {string}   contenedorId - ID del elemento donde se inserta
   * @param {object}   config
   * @param {string[]} config.columnas  - Encabezados de columnas
   * @param {Array[]}  config.filas     - Filas: cada fila es un array de valores
   * @param {string}   [config.titulo]  - Título sobre la tabla
   * @param {Function} [config.claseFilaFn]   - fn(fila, indice) → clase CSS de la <tr>
   * @param {Function} [config.claseCeldaFn]  - fn(valor, colIndex, filaIndex) → clase CSS de la <td>
   * @param {boolean[]} [config.esNumero]     - true por columna → alinear derecha
   * @param {number}   [config.decimales]     - Sobrescribe CONFIG.decimales
   * @param {boolean}  [config.exportable]    - Muestra botón "Exportar CSV"
   * @param {string}   [config.idTabla]       - id del <table> generado
   */
  const generar = (contenedorId, config = {}) => {
    const contenedor = _obtenerContenedor(contenedorId);
    const {
      columnas     = [],
      filas        = [],
      titulo       = '',
      claseFilaFn  = null,
      claseCeldaFn = null,
      esNumero     = [],
      decimales    = CONFIG.decimales,
      exportable   = false,
      idTabla      = '',
    } = config;

    // Límite de filas
    const filasRender = filas.slice(0, CONFIG.maxFilas);
    const hayCortado  = filas.length > CONFIG.maxFilas;

    // Crear tabla
    const tabla = document.createElement('table');
    if (idTabla) tabla.id = idTabla;
    tabla.setAttribute('role', 'table');

    // THEAD
    const thead = tabla.createTHead();
    const trHead = thead.insertRow();
    columnas.forEach(col => trHead.appendChild(_th(col)));

    // TBODY
    const tbody = tabla.createTBody();
    filasRender.forEach((fila, fi) => {
      const tr = tbody.insertRow();

      // Clase de fila
      if (claseFilaFn) {
        const claseFila = claseFilaFn(fila, fi);
        if (claseFila) tr.className = claseFila;
      }

      // Celdas
      fila.forEach((valor, ci) => {
        const esNum    = esNumero[ci] ?? (typeof valor === 'number');
        const contenido = esNum
          ? _formatearNumero(valor, decimales)
          : _escaparHTML(valor);

        const claseCelda = claseCeldaFn ? (claseCeldaFn(valor, ci, fi) || '') : '';
        const td = document.createElement('td');
        td.innerHTML  = contenido;
        td.className  = [
          esNum ? 'table__cell--number' : '',
          claseCelda,
        ].filter(Boolean).join(' ');
        tr.appendChild(td);
      });
    });

    // Aviso si se cortaron filas
    if (hayCortado) {
      const trAviso = tbody.insertRow();
      const tdAviso = trAviso.insertCell();
      tdAviso.colSpan = columnas.length;
      tdAviso.className = 'table__cell--highlight';
      tdAviso.textContent = `⚠ Se muestran las primeras ${CONFIG.maxFilas} de ${filas.length} filas.`;
    }

    // Insertar en el DOM
    contenedor.innerHTML = '';
    contenedor.appendChild(_envolver(tabla, titulo, exportable));
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // 6. TABLAS ESPECIALIZADAS POR TIPO DE MÉTODO
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Tabla de iteraciones con columna de error resaltada.
   * Usada por: Gauss-Seidel, Newton-Raphson, Bisección, Heun, RK4, Euler.
   *
   * @param {string} contenedorId
   * @param {object[]} iteraciones  - Array de objetos con los datos de cada iteración
   * @param {object}   [opciones]
   * @param {string[]} [opciones.columnas]    - Nombres de columnas
   *   Si se omite, se infieren de las claves del primer objeto.
   * @param {string}   [opciones.columnaError] - Clave del campo de error (default: 'error')
   * @param {string}   [opciones.titulo]
   * @param {number}   [opciones.decimales]
   * @param {boolean}  [opciones.exportable]
   *
   * @example
   * Tablas.iteraciones('tabla-gauss', [
   *   { iteracion: 1, x1: 2.5, x2: 1.3, error: 15.2 },
   *   { iteracion: 2, x1: 2.1, x2: 1.1, error:  3.8 },
   * ]);
   */
  const iteraciones = (contenedorId, iteraciones = [], opciones = {}) => {
    if (!iteraciones.length) {
      limpiar(contenedorId);
      return;
    }

    const {
      columnas     = Object.keys(iteraciones[0]),
      columnaError = 'error',
      titulo       = 'Tabla de iteraciones',
      decimales    = CONFIG.decimales,
      exportable   = true,
    } = opciones;

    const filas = iteraciones.map(obj => columnas.map(c => obj[c] ?? '—'));

    const indiceError = columnas.indexOf(columnaError);

    generar(contenedorId, {
      columnas:     columnas.map(_etiquetaColumna),
      filas,
      titulo,
      decimales,
      exportable,
      esNumero:     columnas.map(c => c !== 'iteracion' && c !== 'iter' && c !== 'n'),
      claseFilaFn: (fila, fi) => fi === iteraciones.length - 1 ? 'tabla-fila--ultima' : '',
      claseCeldaFn: (valor, ci) => {
        if (ci === indiceError && typeof valor === 'number') {
          return _claseError(valor);
        }
        return '';
      },
    });
  };

  /**
   * Tabla de solución de un sistema lineal (variables y valores).
   * Usada por: Gauss-Seidel, LU.
   *
   * @param {string}   contenedorId
   * @param {number[]} solucion   - Valores xi resueltos
   * @param {string[]} [nombres]  - Nombres de las variables (default: x1, x2, ...)
   * @param {object}   [opciones]
   * @param {number[]} [opciones.exacta]      - Solución exacta para calcular error
   * @param {string}   [opciones.titulo]
   * @param {number}   [opciones.decimales]
   */
  const sistema = (contenedorId, solucion = [], nombres = [], opciones = {}) => {
    const {
      exacta    = null,
      titulo    = 'Solución del sistema',
      decimales = CONFIG.decimales,
    } = opciones;

    const tieneExacta = exacta && exacta.length === solucion.length;

    const columnas = tieneExacta
      ? ['Variable', 'Valor calculado', 'Valor exacto', 'Error absoluto']
      : ['Variable', 'Valor'];

    const filas = solucion.map((val, i) => {
      const nombre = nombres[i] ?? `x${i + 1}`;
      if (tieneExacta) {
        const errorAbs = Math.abs(val - exacta[i]);
        return [nombre, val, exacta[i], errorAbs];
      }
      return [nombre, val];
    });

    generar(contenedorId, {
      columnas,
      filas,
      titulo,
      decimales,
      exportable: true,
      esNumero: tieneExacta
        ? [false, true, true, true]
        : [false, true],
    });
  };

  /**
   * Tabla de comparación de métodos numéricos.
   * Muestra raíz, iteraciones y error de varios métodos lado a lado.
   *
   * @param {string} contenedorId
   * @param {object[]} metodos  - Array de resultados de cada método
   *   Cada objeto: { nombre, resultado, iteraciones, error, convergencia }
   * @param {object}  [opciones]
   * @param {string}  [opciones.titulo]
   * @param {number}  [opciones.decimales]
   */
  const comparacion = (contenedorId, metodos = [], opciones = {}) => {
    const {
      titulo    = 'Comparación de métodos',
      decimales = CONFIG.decimales,
    } = opciones;

    const columnas = ['Método', 'Resultado', 'Iteraciones', 'Error (%)', 'Convergencia'];

    const filas = metodos.map(m => [
      m.nombre       ?? '—',
      m.resultado    ?? 0,
      m.iteraciones  ?? 0,
      m.error        ?? 0,
      m.convergencia ?? '—',
    ]);

    generar(contenedorId, {
      columnas,
      filas,
      titulo,
      decimales,
      exportable: true,
      esNumero: [false, true, true, true, false],
      claseCeldaFn: (valor, ci) => {
        // Resaltar columna de error
        if (ci === 3 && typeof valor === 'number') return _claseError(valor);
        return '';
      },
    });
  };

  /**
   * Tabla de puntos de interpolación con los valores de la función.
   * Usada por: Lagrange, Splines.
   *
   * @param {string}   contenedorId
   * @param {number[]} xs       - Nodos xi
   * @param {number[]} ys       - f(xi)
   * @param {number[]} [yInterp] - Valores interpolados en los mismos nodos (verificación)
   * @param {object}   [opciones]
   * @param {string}   [opciones.titulo]
   * @param {string}   [opciones.labelX]
   * @param {string}   [opciones.labelY]
   * @param {number}   [opciones.decimales]
   */
  const interpolacion = (contenedorId, xs = [], ys = [], yInterp = null, opciones = {}) => {
    const {
      titulo    = 'Tabla de interpolación',
      labelX    = 'x',
      labelY    = 'f(x)',
      decimales = CONFIG.decimales,
    } = opciones;

    const tieneInterp = yInterp && yInterp.length === xs.length;

    const columnas = tieneInterp
      ? ['i', labelX, labelY, 'P(x)', 'Error absoluto']
      : ['i', labelX, labelY];

    const filas = xs.map((x, i) => {
      if (tieneInterp) {
        return [i, x, ys[i], yInterp[i], Math.abs(ys[i] - yInterp[i])];
      }
      return [i, x, ys[i]];
    });

    generar(contenedorId, {
      columnas,
      filas,
      titulo,
      decimales,
      exportable: true,
      esNumero: tieneInterp
        ? [true, true, true, true, true]
        : [true, true, true],
    });
  };

  /**
   * Tabla de integración numérica paso a paso.
   * Muestra los subintervalos, valores de f(x) y los pesos aplicados.
   *
   * @param {string}   contenedorId
   * @param {number[]} xs       - Puntos de evaluación
   * @param {number[]} ys       - f(xs)
   * @param {number[]} pesos    - Coeficientes del método (1/3, 4/3, etc.)
   * @param {object}   [opciones]
   * @param {string}   [opciones.titulo]
   * @param {string}   [opciones.metodo]  - 'Simpson' | 'Trapecio' | etc.
   * @param {number}   [opciones.resultado] - Valor final de la integral
   * @param {number}   [opciones.decimales]
   */
  const integracion = (contenedorId, xs = [], ys = [], pesos = [], opciones = {}) => {
    const {
      titulo    = 'Tabla de integración',
      metodo    = '',
      resultado = null,
      decimales = CONFIG.decimales,
    } = opciones;

    const columnas = ['i', 'x_i', 'f(x_i)', 'Peso', 'Contribución'];

    const filas = xs.map((x, i) => {
      const peso    = pesos[i] ?? 1;
      const contrib = ys[i] * peso;
      return [i, x, ys[i], peso, contrib];
    });

    // Fila de total
    if (resultado !== null) {
      filas.push(['', '', '', 'Integral ≈', resultado]);
    }

    generar(contenedorId, {
      columnas,
      filas,
      titulo: titulo + (metodo ? ` — ${metodo}` : ''),
      decimales,
      exportable: true,
      esNumero: [true, true, true, true, true],
      claseFilaFn: (fila, fi) =>
        fi === filas.length - 1 && resultado !== null ? 'tabla-fila--total' : '',
    });
  };

  /**
   * Tabla de solución de una EDO (Euler, Heun, RK4).
   * Muestra t, y numérico, y exacto (si hay) y error.
   *
   * @param {string}   contenedorId
   * @param {number[]} t         - Valores de tiempo
   * @param {number[]} yNum      - Solución numérica
   * @param {number[]} [yExacta] - Solución exacta (opcional)
   * @param {object}   [opciones]
   * @param {string}   [opciones.titulo]
   * @param {string}   [opciones.metodo]   - 'Euler' | 'Heun' | 'RK4'
   * @param {string}   [opciones.labelT]
   * @param {string}   [opciones.labelY]
   * @param {number}   [opciones.decimales]
   * @param {boolean}  [opciones.exportable]
   */
  const edo = (contenedorId, t = [], yNum = [], yExacta = null, opciones = {}) => {
    const {
      titulo     = 'Tabla de solución EDO',
      metodo     = '',
      labelT     = 't',
      labelY     = 'y(t)',
      decimales  = CONFIG.decimales,
      exportable = true,
    } = opciones;

    const tieneExacta = yExacta && yExacta.length === t.length;

    const columnas = tieneExacta
      ? ['n', labelT, `${labelY} (${metodo || 'Numérico'})`, `${labelY} (Exacta)`, 'Error absoluto']
      : ['n', labelT, `${labelY} (${metodo || 'Numérico'})`];

    const filas = t.map((ti, i) => {
      if (tieneExacta) {
        const errorAbs = Math.abs(yNum[i] - yExacta[i]);
        return [i, ti, yNum[i], yExacta[i], errorAbs];
      }
      return [i, ti, yNum[i]];
    });

    generar(contenedorId, {
      columnas,
      filas,
      titulo: titulo + (metodo ? ` — ${metodo}` : ''),
      decimales,
      exportable,
      esNumero: tieneExacta
        ? [true, true, true, true, true]
        : [true, true, true],
      claseCeldaFn: tieneExacta
        ? (valor, ci) => ci === 4 && typeof valor === 'number' ? _claseError(valor * 100) : ''
        : null,
    });
  };

  /**
   * Tabla de raíces encontradas con historial del método.
   * Usada por Newton-Raphson y Bisección.
   *
   * @param {string}   contenedorId
   * @param {object[]} historial  - Cada objeto tiene las claves del método
   *   Newton: { n, x, fx, dfx, error }
   *   Bisección: { n, a, b, c, fc, error }
   * @param {object}   [opciones]
   * @param {string}   [opciones.metodo]   - 'Newton-Raphson' | 'Bisección' | 'Secante'
   * @param {string}   [opciones.titulo]
   * @param {number}   [opciones.decimales]
   */
  const raices = (contenedorId, historial = [], opciones = {}) => {
    const {
      metodo    = '',
      titulo    = 'Historial de búsqueda de raíz',
      decimales = CONFIG.decimales,
    } = opciones;

    // Columnas automáticas desde el primer objeto
    const columnas = historial.length ? Object.keys(historial[0]) : [];

    iteraciones(contenedorId, historial, {
      columnas,
      columnaError: 'error',
      titulo: titulo + (metodo ? ` — ${metodo}` : ''),
      decimales,
      exportable: true,
    });
  };

  /**
   * Tabla de resumen con métricas clave de un escenario.
   * Para el bloque "Interpretación" de cada escenario.
   *
   * @param {string}    contenedorId
   * @param {object[]}  metricas  - [{ nombre, valor, unidad, estado }]
   *   estado: 'normal' | 'alerta' | 'critico' | 'exito'
   * @param {object}    [opciones]
   * @param {string}    [opciones.titulo]
   */
  const resumen = (contenedorId, metricas = [], opciones = {}) => {
    const { titulo = 'Resumen de resultados' } = opciones;

    const CLASE_ESTADO = {
      normal:  '',
      alerta:  'table__cell--highlight',
      critico: 'table__cell--error',
      exito:   'table__cell--success',
    };

    const columnas = ['Métrica', 'Valor', 'Unidad', 'Estado'];
    const filas    = metricas.map(m => [
      m.nombre ?? '—',
      m.valor  ?? '—',
      m.unidad ?? '',
      m.estado ?? 'normal',
    ]);

    generar(contenedorId, {
      columnas,
      filas,
      titulo,
      exportable: false,
      esNumero: [false, typeof metricas[0]?.valor === 'number', false, false],
      claseCeldaFn: (valor, ci, fi) => {
        if (ci === 3) return CLASE_ESTADO[metricas[fi]?.estado] ?? '';
        return '';
      },
    });
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // 7. GESTIÓN DE TABLAS
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Elimina el contenido de un contenedor de tabla.
   * @param {string} contenedorId
   */
  const limpiar = (contenedorId) => {
    const el = document.getElementById(contenedorId);
    if (el) el.innerHTML = '';
  };

  /**
   * Muestra un mensaje de "sin datos" en el contenedor.
   * @param {string} contenedorId
   * @param {string} [mensaje]
   */
  const sinDatos = (contenedorId, mensaje = 'No hay datos para mostrar.') => {
    const el = document.getElementById(contenedorId);
    if (!el) return;
    el.innerHTML = `
      <div class="alert alert--info" role="status">
        <span>ℹ</span>
        <span>${_escaparHTML(mensaje)}</span>
      </div>`;
  };

  /**
   * Muestra un spinner de carga en el contenedor.
   * @param {string} contenedorId
   */
  const mostrarCarga = (contenedorId) => {
    const el = document.getElementById(contenedorId);
    if (!el) return;
    el.innerHTML = `
      <div class="tabla-cargando" role="status" aria-live="polite">
        <span class="tabla-spinner" aria-hidden="true"></span>
        <span>Calculando...</span>
      </div>`;
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // 8. UTILIDADES AUXILIARES
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Convierte un nombre de clave camelCase/snake_case en etiqueta legible.
   * @param {string} clave - ej: 'errorRelativo' → 'Error Relativo'
   * @returns {string}
   */
  const _etiquetaColumna = (clave) => {
    return clave
      .replace(/_/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/\b\w/g, c => c.toUpperCase());
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // 9. ESTILOS CSS DINÁMICOS (inyectados una sola vez)
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Inyecta los estilos necesarios para los elementos propios del módulo
   * (wrapper, scroll, spinner, fila-total) que no están en componentes.css.
   * Solo se ejecuta una vez.
   */
  const _inyectarEstilos = (() => {
    let inyectado = false;
    return () => {
      if (inyectado) return;
      inyectado = true;

      const css = `
        /* ── Tablas.js – estilos de soporte ── */
        .tabla-wrapper {
          margin: var(--spacing-4, 1rem) 0;
        }
        .tabla-titulo {
          font-size: var(--font-size-sm, 0.875rem);
          font-weight: var(--font-weight-semibold, 600);
          color: var(--color-neutral-700, #3a4f42);
          margin-bottom: var(--spacing-2, 0.5rem);
          padding-left: var(--spacing-1, 0.25rem);
        }
        .tabla-scroll {
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          border-radius: var(--border-radius-md, 6px);
        }
        .tabla-btn-exportar {
          margin-top: var(--spacing-2, 0.5rem);
        }
        .tabla-fila--ultima td {
          font-weight: var(--font-weight-semibold, 600);
          background: var(--color-success, #C9D7A6) !important;
          color: var(--color-neutral-900, #0f1e18);
        }
        .tabla-fila--total td {
          font-weight: var(--font-weight-bold, 700);
          border-top: 2px solid var(--color-primary, #3E594F);
          background: var(--color-info, #F2CA99) !important;
        }
        .tabla-cargando {
          display: flex;
          align-items: center;
          gap: var(--spacing-3, 0.75rem);
          padding: var(--spacing-4, 1rem);
          color: var(--color-neutral-600, #5a7060);
          font-size: var(--font-size-sm, 0.875rem);
        }
        .tabla-spinner {
          display: inline-block;
          width: 18px;
          height: 18px;
          border: 2px solid var(--color-neutral-300, #c8d8ca);
          border-top-color: var(--color-primary, #3E594F);
          border-radius: 50%;
          animation: tablaGiro 0.7s linear infinite;
        }
        @keyframes tablaGiro {
          to { transform: rotate(360deg); }
        }
        /* Clase success para tabla resumen */
        .table__cell--success {
          background: var(--color-success, #C9D7A6);
          color: var(--color-neutral-900, #0f1e18);
        }
      `;

      const style = document.createElement('style');
      style.id        = 'tablas-js-styles';
      style.textContent = css;
      document.head.appendChild(style);
    };
  })();

  // Inyectar estilos al cargar el módulo
  if (document.head) {
    _inyectarEstilos();
  } else {
    document.addEventListener('DOMContentLoaded', _inyectarEstilos);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 10. API PÚBLICA
  // ─────────────────────────────────────────────────────────────────────────────

  return {
    // Función base (uso avanzado / escenarios con estructura propia)
    generar,

    // Tablas especializadas por tipo de método numérico
    iteraciones,
    sistema,
    comparacion,
    interpolacion,
    integracion,
    edo,
    raices,
    resumen,

    // Gestión de estado del contenedor
    limpiar,
    sinDatos,
    mostrarCarga,

    // Utilidades expuestas (útiles para escenarios)
    formatearNumero: _formatearNumero,
    exportarCSV:     _exportarCSV,
  };
})();

// Exponer globalmente para uso sin módulos ES (compatibilidad con script tags)
window.Tablas = Tablas;