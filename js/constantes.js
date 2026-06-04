/**
 * constantes.js — Configuración global de la SPA
 * Simulación Numérica de Crisis - Métodos Numéricos Aplicados
 *
 * Este archivo debe cargarse PRIMERO antes que cualquier otro JS.
 * Expone el objeto global APP_CONFIG accesible desde todos los módulos.
 */

// ─────────────────────────────────────────────
// VERSIÓN Y METADATA
// ─────────────────────────────────────────────

const APP_VERSION = '1.0.0';
const APP_NOMBRE  = 'Simulación Numérica de Crisis';

// ─────────────────────────────────────────────
// IDs DEL DOM (evitar strings sueltos en el código)
// ─────────────────────────────────────────────

const IDS = {
  APP:                 'app',
  SIDEBAR:             'sidebar',
  CONTENIDO_PRINCIPAL: 'contenido-principal',
  BTN_HAMBURGUESA:     'btn-hamburguesa',
  SIDEBAR_BACKDROP:    'sidebar-backdrop',
};

// ─────────────────────────────────────────────
// HASHES DE RUTAS
// ─────────────────────────────────────────────

const HASH = {
  INICIO:       '#inicio',
  ESCENARIO_A:  '#escenario-a',
  ESCENARIO_B:  '#escenario-b',
  ESCENARIO_C:  '#escenario-c',
  ESCENARIO_D:  '#escenario-d',
  ESCENARIO_E:  '#escenario-e',
  ESCENARIO_F:  '#escenario-f',
  ESCENARIO_G:  '#escenario-g',
  CONCLUSIONES: '#conclusiones',
};

// ─────────────────────────────────────────────
// CONFIGURACIÓN DE ALGORITMOS NUMÉRICOS
// ─────────────────────────────────────────────

const ALGORITMOS = {
  // Tolerancia por defecto para convergencia iterativa
  TOLERANCIA_DEFAULT: 1e-6,

  // Máximo de iteraciones para métodos iterativos (Gauss-Seidel, Newton, etc.)
  MAX_ITERACIONES: 100,

  // Incremento h para diferencias finitas (derivadas numéricas)
  H_DIFERENCIAS: 1e-7,

  // Número mínimo de subintervalos para integración (Simpson/Trapecio)
  MIN_SUBINTERVALOS: 2,

  // Número máximo de subintervalos permitidos
  MAX_SUBINTERVALOS: 10000,

  // Paso de tiempo por defecto para EDOs (RK4, Euler, Heun)
  PASO_TIEMPO_DEFAULT: 0.1,
};

// ─────────────────────────────────────────────
// CONFIGURACIÓN DE CHART.JS (estilos globales)
// ─────────────────────────────────────────────

const CHART_CONFIG = {
  // Colores de la paleta del proyecto (coinciden con variables CSS)
  COLORES: {
    PRIMARY:      '#3E594F',
    SECONDARY:    '#6C8C74',
    ACCENT_WARM:  '#F29966',
    ALERT:        '#D97059',
    SUCCESS:      '#C9D7A6',
    INFO:         '#F2CA99',
    NEUTRO:       '#888888',
  },

  // Color de fondo semitransparente para áreas de gráficos
  COLORES_FONDO: {
    PRIMARY:      'rgba(62,  89,  79,  0.15)',
    SECONDARY:    'rgba(108, 140, 116, 0.15)',
    ACCENT_WARM:  'rgba(242, 153, 102, 0.15)',
    ALERT:        'rgba(217, 112, 89,  0.15)',
    SUCCESS:      'rgba(201, 215, 166, 0.20)',
    INFO:         'rgba(242, 202, 153, 0.20)',
  },

  // Opciones comunes para todos los gráficos
  OPCIONES_BASE: {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 600, easing: 'easeInOutQuart' },
    plugins: {
      legend: {
        position: 'top',
        labels: { font: { size: 13 }, padding: 16 },
      },
      tooltip: {
        backgroundColor: '#1a1a1a',
        titleFont: { size: 13, weight: 'bold' },
        bodyFont:  { size: 12 },
        padding: 10,
        cornerRadius: 6,
      },
    },
    scales: {
      x: {
        grid: { color: 'rgba(0,0,0,0.06)' },
        ticks: { font: { size: 12 } },
      },
      y: {
        grid: { color: 'rgba(0,0,0,0.06)' },
        ticks: { font: { size: 12 } },
      },
    },
  },
};

// ─────────────────────────────────────────────
// MENSAJES DE VALIDACIÓN (reutilizables)
// ─────────────────────────────────────────────

const MENSAJES = {
  CAMPO_REQUERIDO:       'Este campo es obligatorio.',
  NUMERO_INVALIDO:       'Ingresa un número válido.',
  NUMERO_POSITIVO:       'El valor debe ser mayor que cero.',
  FUERA_DE_RANGO:        'El valor está fuera del rango permitido.',
  MATRIZ_NO_CUADRADA:    'La matriz debe ser cuadrada (n×n).',
  SISTEMA_SIN_SOLUCION:  'El sistema no tiene solución única.',
  NO_CONVERGE:           'El método no convergió en el número máximo de iteraciones.',
  INTERVALO_INVALIDO:    'El intervalo [a, b] es inválido. Verifica que a < b.',
  SIN_CAMBIO_DE_SIGNO:   'No hay cambio de signo en el intervalo. Verifica los límites.',
  DIVISION_CERO:         'División por cero detectada. Revisa los datos de entrada.',
  CARGA_MODULO_ERROR:    'No se pudo cargar el módulo del escenario.',
  CALCULO_OK:            'Cálculo completado exitosamente.',
};

// ─────────────────────────────────────────────
// CONFIGURACIÓN DE TABLAS
// ─────────────────────────────────────────────

const TABLAS = {
  // Decimales mostrados por defecto en resultados numéricos
  DECIMALES_DEFAULT: 6,

  // Máximo de filas mostradas antes de paginar/truncar
  MAX_FILAS_VISIBLES: 50,

  // Umbral para resaltar valores como "críticos" (según contexto)
  UMBRAL_ERROR_RELATIVO: 1e-4,
};

// ─────────────────────────────────────────────
// BREAKPOINTS (espejo de los CSS, para lógica JS)
// ─────────────────────────────────────────────

const BREAKPOINTS = {
  SM:  480,
  MD:  768,
  LG:  1024,
  XL:  1280,
};

// ─────────────────────────────────────────────
// EXPORTACIÓN GLOBAL
// Todos los módulos acceden vía window.APP_CONFIG
// ─────────────────────────────────────────────

window.APP_CONFIG = Object.freeze({
  VERSION:     APP_VERSION,
  NOMBRE:      APP_NOMBRE,
  IDS,
  HASH,
  ALGORITMOS,
  CHART_CONFIG,
  MENSAJES,
  TABLAS,
  BREAKPOINTS,
});

// Alias corto para usar dentro de cada módulo:
// const CFG = window.APP_CONFIG;

// Al final de constantes.js, después de window.APP_CONFIG = ...

/**
 * Carga los datos de ejemplo precargados desde data/ejemplos.json
 * Disponible como window.DATOS_EJEMPLOS tras la carga.
 */
async function cargarDatosEjemplos() {
  try {
    const respuesta = await fetch('data/ejemplos.json');
    if (!respuesta.ok) throw new Error('No se pudo cargar ejemplos.json');
    window.DATOS_EJEMPLOS = await respuesta.json();
    console.info('✅ Datos de ejemplo cargados correctamente.');
  } catch (error) {
    console.warn('⚠️ No se cargaron los datos de ejemplo:', error.message);
    window.DATOS_EJEMPLOS = null;
  }
}

cargarDatosEjemplos();