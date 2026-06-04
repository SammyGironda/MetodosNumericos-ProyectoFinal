/**
 * graficos.js - Módulo de visualización con Chart.js
 * Proyecto: Simulación Numérica de Crisis - Métodos Numéricos Aplicados
 *
 * Responsabilidades:
 *  - Crear, actualizar y destruir gráficos de Chart.js
 *  - Exponer una API unificada para todos los escenarios
 *  - Gestionar instancias activas para evitar memory leaks
 *  - Aplicar la paleta de colores del proyecto (variables CSS)
 *
 * Uso:
 *  import { Graficos } from './ui/graficos.js';
 *  // o, si no se usan módulos ES:
 *  const g = window.Graficos;
 *
 * API pública:
 *  Graficos.linea(canvasId, config)
 *  Graficos.barra(canvasId, config)
 *  Graficos.dispersion(canvasId, config)
 *  Graficos.mixto(canvasId, config)
 *  Graficos.polar(canvasId, config)
 *  Graficos.actualizar(canvasId, datasets, labels)
 *  Graficos.destruir(canvasId)
 *  Graficos.destruirTodos()
 *  Graficos.obtenerInstancia(canvasId)
 *  Graficos.exportar(canvasId, nombreArchivo)
 *  Graficos.paleta          → colores del proyecto
 *  Graficos.PALETA_ESCENARIOS → color por escenario A-G
 */

const Graficos = (() => {
  'use strict';

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. PALETA DE COLORES (alineada con variables.css del proyecto)
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Colores base del proyecto. Se leen de las variables CSS cuando es posible;
   * los valores hardcodeados son fallback para entornos sin DOM completo.
   */
  const _leerCSS = (variable, fallback) => {
    try {
      const valor = getComputedStyle(document.documentElement)
        .getPropertyValue(variable)
        .trim();
      return valor || fallback;
    } catch {
      return fallback;
    }
  };

  const paleta = {
    primary:      _leerCSS('--color-primary',      '#3E594F'),
    secondary:    _leerCSS('--color-secondary',    '#6C8C74'),
    accentWarm:   _leerCSS('--color-accent-warm',  '#F29966'),
    alert:        _leerCSS('--color-alert',        '#D97059'),
    success:      _leerCSS('--color-success',      '#C9D7A6'),
    info:         _leerCSS('--color-info',         '#F2CA99'),
    // Neutros útiles para ejes / grids
    neutroOscuro: _leerCSS('--color-neutral-800',  '#1C2B25'),
    neutroMedio:  _leerCSS('--color-neutral-500',  '#7A9080'),
    neutroClaro:  _leerCSS('--color-neutral-200',  '#E8F0E9'),
    blanco:       '#FFFFFF',
  };

  /** Color representativo de cada escenario (para datasets propios) */
  const PALETA_ESCENARIOS = {
    A: paleta.primary,
    B: paleta.secondary,
    C: paleta.info,
    D: paleta.accentWarm,
    E: paleta.alert,
    F: paleta.accentWarm,
    G: paleta.success,
  };

  /** Secuencia de colores para múltiples series en un mismo gráfico */
  const COLORES_SERIES = [
    paleta.primary,
    paleta.accentWarm,
    paleta.secondary,
    paleta.alert,
    paleta.success,
    paleta.info,
    paleta.neutroMedio,
  ];

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. REGISTRO DE INSTANCIAS ACTIVAS
  // ─────────────────────────────────────────────────────────────────────────────

  /** Map<canvasId: string, Chart> — instancias vivas */
  const _instancias = new Map();

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. CONFIGURACIÓN GLOBAL DE CHART.JS
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Aplica defaults globales de Chart.js para mantener consistencia visual.
   * Se llama una sola vez al cargar el módulo.
   */
  const _aplicarDefaultsGlobales = () => {
    if (typeof Chart === 'undefined') {
      console.warn('[Graficos] Chart.js no está disponible aún. Se intentará al crear el primer gráfico.');
      return;
    }

    Chart.defaults.font.family = "'Segoe UI', system-ui, sans-serif";
    Chart.defaults.font.size   = 13;
    Chart.defaults.color       = paleta.neutroOscuro;

    // Responsive por defecto
    Chart.defaults.responsive        = true;
    Chart.defaults.maintainAspectRatio = false;

    // Animaciones suaves
    Chart.defaults.animation = {
      duration: 600,
      easing: 'easeInOutQuart',
    };

    // Tooltip global
    Chart.defaults.plugins.tooltip.backgroundColor = paleta.neutroOscuro;
    Chart.defaults.plugins.tooltip.titleColor      = paleta.blanco;
    Chart.defaults.plugins.tooltip.bodyColor       = paleta.neutroClaro;
    Chart.defaults.plugins.tooltip.borderColor     = paleta.secondary;
    Chart.defaults.plugins.tooltip.borderWidth     = 1;
    Chart.defaults.plugins.tooltip.padding         = 10;
    Chart.defaults.plugins.tooltip.cornerRadius    = 6;
    Chart.defaults.plugins.tooltip.displayColors   = true;

    // Legend global
    Chart.defaults.plugins.legend.labels.usePointStyle = true;
    Chart.defaults.plugins.legend.labels.padding       = 16;
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. UTILIDADES INTERNAS
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Convierte un color hex a rgba con opacidad dada.
   * @param {string} hex   - Color en formato #RRGGBB
   * @param {number} alpha - Opacidad 0-1
   * @returns {string} rgba(...)
   */
  const _hexARgba = (hex, alpha = 1) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  /**
   * Obtiene el canvas DOM a partir de un id.
   * Lanza un error descriptivo si no existe.
   * @param {string} canvasId
   * @returns {HTMLCanvasElement}
   */
  const _obtenerCanvas = (canvasId) => {
    const canvas = document.getElementById(canvasId);
    if (!canvas) {
      throw new Error(`[Graficos] No se encontró el canvas con id="${canvasId}".`);
    }
    if (canvas.tagName.toLowerCase() !== 'canvas') {
      throw new Error(`[Graficos] El elemento con id="${canvasId}" no es un <canvas>.`);
    }
    return canvas;
  };

  /**
   * Destruye una instancia anterior en el mismo canvas (si existe).
   * Necesario para evitar el error "Canvas is already in use" de Chart.js.
   * @param {string} canvasId
   */
  const _limpiarInstanciaPrevia = (canvasId) => {
    if (_instancias.has(canvasId)) {
      _instancias.get(canvasId).destroy();
      _instancias.delete(canvasId);
    }
  };

  /**
   * Genera la configuración de escala X/Y estándar del proyecto.
   * @param {object} opciones
   * @param {string} opciones.labelX  - Título eje X
   * @param {string} opciones.labelY  - Título eje Y
   * @param {boolean} opciones.gridX  - Mostrar grid vertical
   * @param {boolean} opciones.gridY  - Mostrar grid horizontal
   * @returns {object} scales config para Chart.js
   */
  const _escalasEstandar = ({ labelX = '', labelY = '', gridX = false, gridY = true } = {}) => ({
    x: {
      title: {
        display: !!labelX,
        text:    labelX,
        color:   paleta.neutroMedio,
        font:    { size: 12, weight: '500' },
      },
      grid: {
        display: gridX,
        color:   _hexARgba(paleta.neutroMedio, 0.2),
      },
      ticks: {
        color: paleta.neutroMedio,
      },
    },
    y: {
      title: {
        display: !!labelY,
        text:    labelY,
        color:   paleta.neutroMedio,
        font:    { size: 12, weight: '500' },
      },
      grid: {
        display: gridY,
        color:   _hexARgba(paleta.neutroMedio, 0.2),
      },
      ticks: {
        color: paleta.neutroMedio,
      },
    },
  });

  /**
   * Completa los campos opcionales de un dataset de línea con defaults visuales.
   * @param {object} ds       - Dataset parcial del usuario
   * @param {number} indice   - Índice en el array (para asignar color automático)
   * @returns {object} Dataset completo
   */
  const _completarDatasetLinea = (ds, indice) => {
    const color = ds.color || COLORES_SERIES[indice % COLORES_SERIES.length];
    return {
      tension:          0.35,
      fill:             ds.fill !== undefined ? ds.fill : false,
      backgroundColor:  ds.fill ? _hexARgba(color, 0.15) : _hexARgba(color, 0.8),
      borderColor:      color,
      borderWidth:      ds.borderWidth  ?? 2,
      pointRadius:      ds.pointRadius  ?? 4,
      pointHoverRadius: ds.pointHoverRadius ?? 6,
      pointBackgroundColor: color,
      pointBorderColor:     paleta.blanco,
      pointBorderWidth:     1.5,
      ...ds,
      // color es propiedad nuestra, Chart.js no la entiende → eliminar
      color: undefined,
    };
  };

  /**
   * Completa los campos de un dataset de barras.
   * @param {object} ds
   * @param {number} indice
   * @returns {object}
   */
  const _completarDatasetBarra = (ds, indice) => {
    const color = ds.color || COLORES_SERIES[indice % COLORES_SERIES.length];
    return {
      backgroundColor: _hexARgba(color, 0.75),
      borderColor:     color,
      borderWidth:     ds.borderWidth ?? 1.5,
      borderRadius:    ds.borderRadius ?? 4,
      hoverBackgroundColor: _hexARgba(color, 1),
      ...ds,
      color: undefined,
    };
  };

  /**
   * Completa los campos de un dataset de dispersión.
   * @param {object} ds
   * @param {number} indice
   * @returns {object}
   */
  const _completarDatasetDispersion = (ds, indice) => {
    const color = ds.color || COLORES_SERIES[indice % COLORES_SERIES.length];
    return {
      backgroundColor:     _hexARgba(color, 0.7),
      borderColor:         color,
      borderWidth:         ds.borderWidth  ?? 1,
      pointRadius:         ds.pointRadius  ?? 5,
      pointHoverRadius:    ds.pointHoverRadius ?? 7,
      ...ds,
      color: undefined,
    };
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // 5. FUNCIONES DE CREACIÓN DE GRÁFICOS
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Crea un gráfico de líneas.
   *
   * @param {string} canvasId - ID del elemento <canvas>
   * @param {object} config
   * @param {string[]}  config.labels       - Etiquetas eje X
   * @param {object[]}  config.datasets     - Array de datasets
   *   @param {string}    config.datasets[].label  - Nombre de la serie
   *   @param {number[]}  config.datasets[].data   - Valores numéricos
   *   @param {string}   [config.datasets[].color] - Color hex opcional
   *   @param {boolean}  [config.datasets[].fill]  - Relleno bajo la curva
   * @param {string}   [config.titulo]      - Título del gráfico
   * @param {string}   [config.labelX]      - Título eje X
   * @param {string}   [config.labelY]      - Título eje Y
   * @param {boolean}  [config.gridX]       - Grid vertical (default false)
   * @param {boolean}  [config.gridY]       - Grid horizontal (default true)
   * @param {object}   [config.opciones]    - Opciones adicionales Chart.js (merge)
   * @returns {Chart} Instancia creada
   */
  const linea = (canvasId, config = {}) => {
    _limpiarInstanciaPrevia(canvasId);
    _aplicarDefaultsGlobales();

    const canvas = _obtenerCanvas(canvasId);
    const {
      labels   = [],
      datasets = [],
      titulo   = '',
      labelX   = '',
      labelY   = '',
      gridX    = false,
      gridY    = true,
      opciones = {},
    } = config;

    const datasetsCompletos = datasets.map(_completarDatasetLinea);

    const chart = new Chart(canvas, {
      type: 'line',
      data: { labels, datasets: datasetsCompletos },
      options: _mergeProfundo({
        scales:  _escalasEstandar({ labelX, labelY, gridX, gridY }),
        plugins: {
          title: {
            display: !!titulo,
            text:    titulo,
            color:   paleta.neutroOscuro,
            font:    { size: 14, weight: '600' },
            padding: { bottom: 12 },
          },
          legend: { display: datasets.length > 1 },
        },
      }, opciones),
    });

    _instancias.set(canvasId, chart);
    return chart;
  };

  /**
   * Crea un gráfico de barras (vertical u horizontal).
   *
   * @param {string} canvasId
   * @param {object} config
   * @param {string[]}  config.labels
   * @param {object[]}  config.datasets
   * @param {string}   [config.titulo]
   * @param {string}   [config.labelX]
   * @param {string}   [config.labelY]
   * @param {boolean}  [config.horizontal]  - true → barras horizontales
   * @param {boolean}  [config.apilado]     - true → barras apiladas
   * @param {object}   [config.opciones]
   * @returns {Chart}
   */
  const barra = (canvasId, config = {}) => {
    _limpiarInstanciaPrevia(canvasId);
    _aplicarDefaultsGlobales();

    const canvas = _obtenerCanvas(canvasId);
    const {
      labels     = [],
      datasets   = [],
      titulo     = '',
      labelX     = '',
      labelY     = '',
      horizontal = false,
      apilado    = false,
      opciones   = {},
    } = config;

    const datasetsCompletos = datasets.map(_completarDatasetBarra);

    // Escalas con soporte apilado
    const escalas = _escalasEstandar({ labelX, labelY, gridX: horizontal, gridY: !horizontal });
    if (apilado) {
      escalas.x.stacked = true;
      escalas.y.stacked = true;
    }

    const chart = new Chart(canvas, {
      type: horizontal ? 'bar' : 'bar',
      data: { labels, datasets: datasetsCompletos },
      options: _mergeProfundo({
        indexAxis: horizontal ? 'y' : 'x',
        scales:    escalas,
        plugins: {
          title: {
            display: !!titulo,
            text:    titulo,
            color:   paleta.neutroOscuro,
            font:    { size: 14, weight: '600' },
            padding: { bottom: 12 },
          },
          legend: { display: datasets.length > 1 },
        },
      }, opciones),
    });

    _instancias.set(canvasId, chart);
    return chart;
  };

  /**
   * Crea un gráfico de dispersión (scatter).
   * Útil para mostrar pares (x, y) sin interpolación de línea.
   *
   * @param {string} canvasId
   * @param {object} config
   * @param {object[]}  config.datasets     - Cada dataset: { label, data: [{x,y},...] }
   * @param {string}   [config.titulo]
   * @param {string}   [config.labelX]
   * @param {string}   [config.labelY]
   * @param {object}   [config.opciones]
   * @returns {Chart}
   */
  const dispersion = (canvasId, config = {}) => {
    _limpiarInstanciaPrevia(canvasId);
    _aplicarDefaultsGlobales();

    const canvas = _obtenerCanvas(canvasId);
    const {
      datasets = [],
      titulo   = '',
      labelX   = '',
      labelY   = '',
      opciones = {},
    } = config;

    const datasetsCompletos = datasets.map(_completarDatasetDispersion);

    const chart = new Chart(canvas, {
      type: 'scatter',
      data: { datasets: datasetsCompletos },
      options: _mergeProfundo({
        scales:  _escalasEstandar({ labelX, labelY, gridX: true, gridY: true }),
        plugins: {
          title: {
            display: !!titulo,
            text:    titulo,
            color:   paleta.neutroOscuro,
            font:    { size: 14, weight: '600' },
            padding: { bottom: 12 },
          },
          legend: { display: datasets.length > 1 },
        },
      }, opciones),
    });

    _instancias.set(canvasId, chart);
    return chart;
  };

  /**
   * Crea un gráfico mixto (combina tipos en el mismo canvas).
   * Cada dataset debe incluir el campo `type` ('line' | 'bar' | 'scatter').
   *
   * @param {string} canvasId
   * @param {object} config
   * @param {string[]}  config.labels
   * @param {object[]}  config.datasets  - Cada uno con campo `type`
   * @param {string}   [config.titulo]
   * @param {string}   [config.labelX]
   * @param {string}   [config.labelY]
   * @param {object}   [config.opciones]
   * @returns {Chart}
   */
  const mixto = (canvasId, config = {}) => {
    _limpiarInstanciaPrevia(canvasId);
    _aplicarDefaultsGlobales();

    const canvas = _obtenerCanvas(canvasId);
    const {
      labels   = [],
      datasets = [],
      titulo   = '',
      labelX   = '',
      labelY   = '',
      opciones = {},
    } = config;

    // Completar cada dataset según su tipo
    const datasetsCompletos = datasets.map((ds, i) => {
      switch ((ds.type || 'line').toLowerCase()) {
        case 'bar':     return _completarDatasetBarra(ds, i);
        case 'scatter': return _completarDatasetDispersion(ds, i);
        default:        return _completarDatasetLinea(ds, i);
      }
    });

    const chart = new Chart(canvas, {
      type: 'bar',  // tipo base del gráfico mixto en Chart.js v4
      data: { labels, datasets: datasetsCompletos },
      options: _mergeProfundo({
        scales:  _escalasEstandar({ labelX, labelY, gridX: false, gridY: true }),
        plugins: {
          title: {
            display: !!titulo,
            text:    titulo,
            color:   paleta.neutroOscuro,
            font:    { size: 14, weight: '600' },
            padding: { bottom: 12 },
          },
          legend: { display: true },
        },
      }, opciones),
    });

    _instancias.set(canvasId, chart);
    return chart;
  };

  /**
   * Crea un gráfico de radar / polar area.
   * Útil para comparar múltiples variables de un mismo fenómeno.
   *
   * @param {string} canvasId
   * @param {object} config
   * @param {string[]}  config.labels     - Ejes del radar
   * @param {object[]}  config.datasets
   * @param {string}   [config.titulo]
   * @param {'radar'|'polarArea'} [config.subtipo] - default 'radar'
   * @param {object}   [config.opciones]
   * @returns {Chart}
   */
  const polar = (canvasId, config = {}) => {
    _limpiarInstanciaPrevia(canvasId);
    _aplicarDefaultsGlobales();

    const canvas = _obtenerCanvas(canvasId);
    const {
      labels   = [],
      datasets = [],
      titulo   = '',
      subtipo  = 'radar',
      opciones = {},
    } = config;

    // Para radar/polar usamos colores semitransparentes
    const datasetsCompletos = datasets.map((ds, i) => {
      const color = ds.color || COLORES_SERIES[i % COLORES_SERIES.length];
      return {
        backgroundColor: _hexARgba(color, 0.2),
        borderColor:     color,
        borderWidth:     2,
        pointBackgroundColor: color,
        ...ds,
        color: undefined,
      };
    });

    const chart = new Chart(canvas, {
      type: subtipo,
      data: { labels, datasets: datasetsCompletos },
      options: _mergeProfundo({
        plugins: {
          title: {
            display: !!titulo,
            text:    titulo,
            color:   paleta.neutroOscuro,
            font:    { size: 14, weight: '600' },
            padding: { bottom: 12 },
          },
          legend: { display: datasets.length > 1 },
        },
        scales: subtipo === 'radar' ? {
          r: {
            grid:       { color: _hexARgba(paleta.neutroMedio, 0.25) },
            angleLines: { color: _hexARgba(paleta.neutroMedio, 0.25) },
            ticks: {
              color:           paleta.neutroMedio,
              backdropColor:   'transparent',
            },
            pointLabels: { color: paleta.neutroOscuro, font: { size: 12 } },
          },
        } : {},
      }, opciones),
    });

    _instancias.set(canvasId, chart);
    return chart;
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // 6. FUNCIONES DE ACTUALIZACIÓN Y GESTIÓN
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Actualiza los datos de un gráfico existente sin destruirlo.
   * Mantiene la animación de actualización.
   *
   * @param {string}   canvasId - ID del canvas
   * @param {object[]} datasets - Nuevos arrays de datos (solo la propiedad `data`)
   * @param {string[]} [labels] - Nuevas etiquetas (opcional)
   * @returns {boolean} true si la actualización fue exitosa
   */
  const actualizar = (canvasId, datasets = [], labels = null) => {
    const chart = _instancias.get(canvasId);
    if (!chart) {
      console.warn(`[Graficos] actualizar(): no existe gráfico con id="${canvasId}".`);
      return false;
    }

    // Actualizar etiquetas si se proporcionaron
    if (labels !== null) {
      chart.data.labels = labels;
    }

    // Actualizar solo los datos de cada serie (preservar estilos)
    datasets.forEach((ds, i) => {
      if (chart.data.datasets[i]) {
        chart.data.datasets[i].data = ds.data ?? ds;
        // Permitir actualizar label y color si se pasan
        if (ds.label !== undefined) chart.data.datasets[i].label = ds.label;
      }
    });

    chart.update();
    return true;
  };

  /**
   * Destruye un gráfico específico y libera el canvas.
   * @param {string} canvasId
   */
  const destruir = (canvasId) => {
    _limpiarInstanciaPrevia(canvasId);
  };

  /**
   * Destruye todos los gráficos activos (útil al cambiar de escenario).
   */
  const destruirTodos = () => {
    _instancias.forEach((chart) => chart.destroy());
    _instancias.clear();
  };

  /**
   * Obtiene la instancia Chart.js de un canvas (para uso avanzado).
   * @param {string} canvasId
   * @returns {Chart|undefined}
   */
  const obtenerInstancia = (canvasId) => _instancias.get(canvasId);

  /**
   * Exporta el gráfico como imagen PNG descargable.
   * @param {string} canvasId
   * @param {string} [nombreArchivo='grafico'] - Nombre del archivo sin extensión
   */
  const exportar = (canvasId, nombreArchivo = 'grafico') => {
    const chart = _instancias.get(canvasId);
    if (!chart) {
      console.warn(`[Graficos] exportar(): no existe gráfico con id="${canvasId}".`);
      return;
    }
    const url  = chart.toBase64Image('image/png', 1);
    const link = document.createElement('a');
    link.download = `${nombreArchivo}.png`;
    link.href     = url;
    link.click();
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // 7. UTILIDADES PARA ESCENARIOS (helpers de alto nivel)
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Crea un gráfico de convergencia (usado en iteraciones: Gauss-Seidel, Newton, etc.)
   * Muestra el error relativo o valor de la función por iteración.
   *
   * @param {string}   canvasId
   * @param {number[]} errores      - Array de errores por iteración
   * @param {object}  [opciones]
   * @param {string}  [opciones.labelY='Error relativo'] - Etiqueta eje Y
   * @param {string}  [opciones.color]                   - Color de la línea
   * @returns {Chart}
   */
  const convergencia = (canvasId, errores = [], opciones = {}) => {
    const labels = errores.map((_, i) => `Iter ${i + 1}`);
    return linea(canvasId, {
      labels,
      datasets: [{
        label:  opciones.labelSerie ?? 'Error relativo (%)',
        data:   errores,
        color:  opciones.color ?? paleta.alert,
        fill:   false,
      }],
      titulo: opciones.titulo ?? 'Convergencia del método',
      labelX: 'Iteración',
      labelY: opciones.labelY ?? 'Error relativo (%)',
      gridY:  true,
    });
  };

  /**
   * Crea un gráfico de iteraciones para un sistema lineal.
   * Muestra la evolución de cada variable xi por iteración.
   *
   * @param {string}    canvasId
   * @param {number[][]} historial  - historial[i] = [x1, x2, ..., xn] en iteración i
   * @param {string[]}  [nombres]   - Nombre de cada variable (default: x1, x2, ...)
   * @returns {Chart}
   */
  const iteracionesSistema = (canvasId, historial = [], nombres = []) => {
    if (!historial.length) return null;

    const nVars   = historial[0].length;
    const labels  = historial.map((_, i) => `Iter ${i}`);
    const datasets = Array.from({ length: nVars }, (_, j) => ({
      label: nombres[j] ?? `x${j + 1}`,
      data:  historial.map(fila => fila[j]),
    }));

    return linea(canvasId, {
      labels,
      datasets,
      titulo: 'Evolución de variables por iteración',
      labelX: 'Iteración',
      labelY: 'Valor',
      gridY:  true,
    });
  };

  /**
   * Crea un gráfico de función f(x) con marca en la raíz encontrada.
   * Útil para Newton-Raphson y Bisección.
   *
   * @param {string}   canvasId
   * @param {number[]} xs         - Valores de x
   * @param {number[]} ys         - Valores de f(x)
   * @param {number}   [raiz]     - Valor de la raíz (marca vertical)
   * @param {object}   [opciones]
   * @returns {Chart}
   */
  const funcionConRaiz = (canvasId, xs = [], ys = [], raiz = null, opciones = {}) => {
    const datasets = [
      {
        label: opciones.labelFuncion ?? 'f(x)',
        data:  xs.map((x, i) => ({ x, y: ys[i] })),
        color: paleta.primary,
        type:  'line',
        tension: 0.4,
      },
    ];

    // Línea y = 0 de referencia
    datasets.push({
      label: 'y = 0',
      data:  xs.map(x => ({ x, y: 0 })),
      color: paleta.neutroMedio,
      type:  'line',
      borderDash: [5, 4],
      pointRadius: 0,
    });

    // Marcador de la raíz
    if (raiz !== null) {
      const yRaiz = ys[xs.findIndex(x => Math.abs(x - raiz) < 1e-10)] ?? 0;
      datasets.push({
        label: `Raíz ≈ ${raiz.toFixed(6)}`,
        data:  [{ x: raiz, y: yRaiz }],
        color: paleta.alert,
        type:  'scatter',
        pointRadius: 8,
        pointHoverRadius: 10,
      });
    }

    return mixto(canvasId, {
      datasets,
      titulo: opciones.titulo ?? 'f(x) y raíz encontrada',
      labelX: opciones.labelX ?? 'x',
      labelY: opciones.labelY ?? 'f(x)',
    });
  };

  /**
   * Crea un gráfico de interpolación: datos originales + curva interpolada.
   *
   * @param {string}   canvasId
   * @param {number[]} xDatos    - Puntos de datos originales
   * @param {number[]} yDatos    - Valores originales
   * @param {number[]} xInterp   - Puntos x de la curva interpolada (más densos)
   * @param {number[]} yInterp   - Valores interpolados
   * @param {object}   [opciones]
   * @returns {Chart}
   */
  const interpolacion = (canvasId, xDatos = [], yDatos = [], xInterp = [], yInterp = [], opciones = {}) => {
    return mixto(canvasId, {
      datasets: [
        {
          label:       opciones.labelInterp ?? 'Curva interpolada',
          type:        'line',
          data:        xInterp.map((x, i) => ({ x, y: yInterp[i] })),
          color:       paleta.primary,
          tension:     0.4,
          pointRadius: 0,
          borderWidth: 2,
        },
        {
          label:       opciones.labelDatos ?? 'Datos originales',
          type:        'scatter',
          data:        xDatos.map((x, i) => ({ x, y: yDatos[i] })),
          color:       paleta.alert,
          pointRadius: 7,
          pointHoverRadius: 9,
        },
      ],
      titulo: opciones.titulo ?? 'Interpolación',
      labelX: opciones.labelX ?? 'x',
      labelY: opciones.labelY ?? 'y',
    });
  };

  /**
   * Crea un gráfico de EDO: solución numérica vs solución exacta (si existe).
   *
   * @param {string}   canvasId
   * @param {number[]} t          - Valores de tiempo
   * @param {number[]} yNum       - Solución numérica
   * @param {number[]|null} yExacta - Solución exacta (null si no disponible)
   * @param {object}   [opciones]
   * @returns {Chart}
   */
  const solucionEDO = (canvasId, t = [], yNum = [], yExacta = null, opciones = {}) => {
    const datasets = [
      {
        label: opciones.labelNumerica ?? 'Solución numérica',
        data:  yNum,
        color: paleta.primary,
        fill:  false,
      },
    ];

    if (yExacta) {
      datasets.push({
        label:      opciones.labelExacta ?? 'Solución exacta',
        data:       yExacta,
        color:      paleta.secondary,
        borderDash: [6, 4],
        fill:       false,
      });
    }

    return linea(canvasId, {
      labels:  t.map(ti => ti.toFixed(3)),
      datasets,
      titulo:  opciones.titulo ?? 'Solución de EDO',
      labelX:  opciones.labelX ?? 'Tiempo (t)',
      labelY:  opciones.labelY ?? 'y(t)',
      gridY:   true,
    });
  };

  /**
   * Crea un gráfico de área bajo la curva (integración numérica).
   * Rellena el área bajo f(x) visualmente.
   *
   * @param {string}   canvasId
   * @param {number[]} xs       - Puntos de evaluación
   * @param {number[]} ys       - f(xs)
   * @param {object}   [opciones]
   * @returns {Chart}
   */
  const areaIntegracion = (canvasId, xs = [], ys = [], opciones = {}) => {
    return linea(canvasId, {
      labels: xs.map(x => x.toFixed(3)),
      datasets: [{
        label: opciones.labelFuncion ?? 'f(x)',
        data:  ys,
        color: paleta.primary,
        fill:  true,
      }],
      titulo: opciones.titulo ?? `Área bajo la curva ≈ ${opciones.resultado ?? ''}`,
      labelX: opciones.labelX ?? 'x',
      labelY: opciones.labelY ?? 'f(x)',
      gridY:  true,
    });
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // 8. UTILIDAD: MERGE PROFUNDO (sin dependencias externas)
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Merge profundo de objetos planos. Usado para combinar opciones del usuario
   * con los defaults sin sobreescribir completamente sub-objetos.
   * NOTA: no soporta arrays anidados a propósito (Chart.js los reemplaza completos).
   *
   * @param  {...object} objetos
   * @returns {object}
   */
  const _mergeProfundo = (...objetos) => {
    const resultado = {};
    for (const obj of objetos) {
      if (!obj) continue;
      for (const [k, v] of Object.entries(obj)) {
        if (
          v !== null &&
          typeof v === 'object' &&
          !Array.isArray(v) &&
          typeof resultado[k] === 'object' &&
          resultado[k] !== null &&
          !Array.isArray(resultado[k])
        ) {
          resultado[k] = _mergeProfundo(resultado[k], v);
        } else {
          resultado[k] = v;
        }
      }
    }
    return resultado;
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // 9. INICIALIZACIÓN DEL MÓDULO
  // ─────────────────────────────────────────────────────────────────────────────

  // Aplicar defaults en cuanto Chart.js esté disponible
  if (typeof Chart !== 'undefined') {
    _aplicarDefaultsGlobales();
  } else {
    // Si Chart.js aún no cargó (async), esperar al evento load del script
    document.addEventListener('DOMContentLoaded', () => {
      if (typeof Chart !== 'undefined') _aplicarDefaultsGlobales();
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 10. API PÚBLICA
  // ─────────────────────────────────────────────────────────────────────────────

  return {
    // Creación de gráficos base
    linea,
    barra,
    dispersion,
    mixto,
    polar,

    // Gestión de instancias
    actualizar,
    destruir,
    destruirTodos,
    obtenerInstancia,
    exportar,

    // Helpers de alto nivel por tipo de escenario
    convergencia,
    iteracionesSistema,
    funcionConRaiz,
    interpolacion,
    solucionEDO,
    areaIntegracion,

    // Paletas exportadas (para usar en tablas, etc.)
    paleta,
    PALETA_ESCENARIOS,
    COLORES_SERIES,

    // Utilidad interna exportada (útil para tests)
    _hexARgba,
  };
})();

// Exponer globalmente para uso sin módulos ES (compatibilidad con script tags)
window.Graficos = Graficos;