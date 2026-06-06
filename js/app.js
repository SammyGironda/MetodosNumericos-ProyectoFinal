/**
 * app.js — Router Principal SPA
 * Simulación Numérica de Crisis - Métodos Numéricos Aplicados
 *
 * Responsabilidades:
 *  1. Renderizar sidebar dinámicamente
 *  2. Sistema de rutas hash-based (#inicio, #escenario-a, ...)
 *  3. Cambiar contenido principal sin recargar página
 *  4. Manejar menú hamburguesa (mobile)
 *  5. Carga dinámica de módulos de escenario
 */

// ─────────────────────────────────────────────
// CONFIGURACIÓN DE RUTAS Y ESCENARIOS
// ─────────────────────────────────────────────

/** Definición centralizada de todas las rutas de la SPA */
const RUTAS = {
  '#inicio':      { titulo: 'Inicio',                        icono: '🏠', seccion: 'inicio' },
  '#escenario-a': { titulo: 'A. Sistemas Lineales',          icono: '⚖️', seccion: 'escenarios' },
  '#escenario-b': { titulo: 'B. Vaciado de Reservas',        icono: '💧', seccion: 'escenarios' },
  '#escenario-c': { titulo: 'C. Curva de Precios',           icono: '📈', seccion: 'escenarios' },
  '#escenario-d': { titulo: 'D. Costo Acumulado',            icono: '💰', seccion: 'escenarios' },
  '#escenario-e': { titulo: 'E. Umbrales Críticos',          icono: '🚨', seccion: 'escenarios' },
  '#escenario-f': { titulo: 'F. Difusión de Rumores',        icono: '📣', seccion: 'escenarios' },
  '#escenario-g': { titulo: 'G. Difusión de Opinión',        icono: '🌐', seccion: 'escenarios' },
  '#conclusiones':{ titulo: 'Conclusiones',                  icono: '📝', seccion: 'extra' },
};

/** Mapeo de ruta → archivo JS del escenario (carga dinámica) */
const MODULOS_ESCENARIO = {
  '#inicio':      'js/escenarios/inicio.js',
  '#escenario-a': 'js/escenarios/escenarioA.js',
  '#escenario-b': 'js/escenarios/escenarioB.js',
  '#escenario-c': 'js/escenarios/escenarioC.js',
  '#escenario-d': 'js/escenarios/escenarioD.js',
  '#escenario-e': 'js/escenarios/escenarioE.js',
  '#escenario-f': 'js/escenarios/escenarioF.js',
  '#escenario-g': 'js/escenarios/escenarioG.js',
  '#conclusiones': 'js/escenarios/conclusiones.js',
};

/**
 * Dependencias adicionales que deben cargarse antes de cada escenario.
 * Estos archivos exponen APIs globales usadas por los escenarios sin un bundler.
 */
const DEPENDENCIAS_ESCENARIO = {
  '#escenario-a': [
    'js/core/sistemasLineales.js',
    'js/ui/graficos.js',
    'js/ui/tablas.js',
    'js/ui/formularios.js',
    'js/ui/notificaciones.js',
  ],
  '#escenario-b': [
    'js/core/ecuacionesDiferenciales.js',
    'js/ui/graficos.js',
    'js/ui/tablas.js',
    'js/ui/formularios.js',
    'js/ui/notificaciones.js',
  ],
  '#escenario-c': [
    'js/core/interpolacion.js',
    'js/ui/graficos.js',
    'js/ui/tablas.js',
    'js/ui/formularios.js',
    'js/ui/notificaciones.js',
  ],
  '#escenario-d': [
    'js/core/integracion.js',
    'js/ui/graficos.js',
    'js/ui/tablas.js',
    'js/ui/formularios.js',
    'js/ui/notificaciones.js',
  ],
  '#escenario-f': [
    'js/core/sistemasLineales.js',
    'js/core/utilidades.js',
    'js/ui/graficos.js',
    'js/ui/tablas.js',
    'js/ui/formularios.js',
    'js/ui/notificaciones.js',
  ],
  '#escenario-g': [
  ],
};

/** Registro de módulos ya cargados para no repetir imports */
const modulosCargados = new Set();

// ─────────────────────────────────────────────
// ESTADO GLOBAL DE LA APP
// ─────────────────────────────────────────────

const estado = {
  rutaActual: '#inicio',
  sidebarAbierto: false,
};

// ─────────────────────────────────────────────
// UTILIDADES DOM
// ─────────────────────────────────────────────

/**
 * Selecciona un elemento del DOM. Lanza error si no existe.
 * @param {string} selector
 * @returns {HTMLElement}
 */
function $(selector) {
  const el = document.querySelector(selector);
  if (!el) throw new Error(`Elemento no encontrado: ${selector}`);
  return el;
}

/**
 * Inserta HTML en un contenedor, limpiando el contenido previo.
 * @param {HTMLElement} contenedor
 * @param {string} html
 */
function renderizar(contenedor, html) {
  contenedor.innerHTML = html;
}

// ─────────────────────────────────────────────
// SIDEBAR: GENERACIÓN DINÁMICA
// ─────────────────────────────────────────────

/**
 * Construye el HTML completo del sidebar a partir de RUTAS.
 * Agrupa los links por sección: inicio / escenarios / extra.
 * @returns {string} HTML del sidebar
 */
function generarHTMLSidebar() {
  const grupos = {
    inicio:     { label: 'Principal',   rutas: [] },
    escenarios: { label: 'Escenarios',  rutas: [] },
    extra:      { label: 'Análisis',    rutas: [] },
  };

  // Agrupar rutas por sección
  Object.entries(RUTAS).forEach(([hash, config]) => {
    grupos[config.seccion].rutas.push({ hash, ...config });
  });

  // Renderizar cada grupo como sección del sidebar
  const seccionesHTML = Object.entries(grupos)
    .filter(([, g]) => g.rutas.length > 0)
    .map(([, grupo]) => `
      <div class="sidebar__section">
        <span class="sidebar__section-title">${grupo.label}</span>
        <ul class="sidebar__nav" role="list">
          ${grupo.rutas.map(ruta => `
            <li class="sidebar__item">
                <a
                href="${ruta.hash}"
                class="sidebar__link"
                data-ruta="${ruta.hash}"
                aria-label="${ruta.titulo}"
              >
                <span class="sidebar__icon" aria-hidden="true">${ruta.icono}</span>
                <span class="sidebar__text">${ruta.titulo}</span>
              </a>
            </li>
          `).join('')}
        </ul>
      </div>
    `).join('');

  return `
    <div class="sidebar__header">
      <div class="sidebar__logo">
        <span class="sidebar__logo-icon" aria-hidden="true">🔢</span>
        <div>
          <div class="sidebar__logo-title">Métodos Numéricos</div>
          <div class="sidebar__logo-sub">Simulación de Crisis</div>
        </div>
      </div>
    </div>

    <nav class="sidebar__menu" aria-label="Escenarios de simulación">
      ${seccionesHTML}
    </nav>

    <div class="sidebar__footer">
      <small>v1.0.0 &mdash; Proyecto Académico</small>
    </div>
  `;
}

/**
 * Inyecta el sidebar en el DOM y registra eventos de sus links.
 */
function inicializarSidebar() {
  const sidebar = $('#sidebar');
  renderizar(sidebar, generarHTMLSidebar());

  // Delegación de eventos: un solo listener para todos los links
  sidebar.addEventListener('click', manejarClickSidebar);
}

/**
 * Maneja clicks en links del sidebar.
 * Cierra sidebar en mobile tras navegar.
 * @param {MouseEvent} evento
 */
function manejarClickSidebar(evento) {
  const link = evento.target.closest('[data-ruta]');
  if (!link) return;

  // Cerrar sidebar en mobile al navegar
  if (window.innerWidth < 768) {
    cerrarSidebar();
  }
}

// ─────────────────────────────────────────────
// SIDEBAR: ESTADO ACTIVO
// ─────────────────────────────────────────────

/**
 * Marca como activo el link del sidebar que corresponde a la ruta actual.
 * @param {string} ruta - hash de la ruta actual (ej: '#escenario-a')
 */
function actualizarActivoSidebar(ruta) {
  // Quitar activo de todos
  document.querySelectorAll('.sidebar__link').forEach(link => {
    link.classList.remove('sidebar__link--active');
    link.removeAttribute('aria-current');
  });

  // Marcar el activo
  const linkActivo = document.querySelector(`[data-ruta="${ruta}"]`);
  if (linkActivo) {
    linkActivo.classList.add('sidebar__link--active');
    linkActivo.setAttribute('aria-current', 'page');
  }
}

// ─────────────────────────────────────────────
// HAMBURGUESA: MOBILE
// ─────────────────────────────────────────────

/**
 * Crea e inserta el botón hamburguesa y el backdrop en el DOM.
 */
function inicializarHamburguesa() {
  // Botón hamburguesa
  const boton = document.createElement('button');
  boton.id = 'btn-hamburguesa';
  boton.className = 'hamburger';
  boton.setAttribute('aria-label', 'Abrir menú de navegación');
  boton.setAttribute('aria-expanded', 'false');
  boton.setAttribute('aria-controls', 'sidebar');
  boton.innerHTML = `
    <span class="hamburger__linea" aria-hidden="true"></span>
    <span class="hamburger__linea" aria-hidden="true"></span>
    <span class="hamburger__linea" aria-hidden="true"></span>
  `;
  boton.addEventListener('click', toggleSidebar);

  // Backdrop (overlay oscuro detrás del sidebar en mobile)
  const backdrop = document.createElement('div');
  backdrop.id = 'sidebar-backdrop';
  backdrop.className = 'sidebar__backdrop';
  backdrop.setAttribute('aria-hidden', 'true');
  backdrop.addEventListener('click', cerrarSidebar);

  // Insertar antes del contenedor principal
  const app = $('#app');
  app.insertAdjacentElement('beforebegin', boton);
  document.body.appendChild(backdrop);
}

/** Alterna apertura/cierre del sidebar en mobile */
function toggleSidebar() {
  estado.sidebarAbierto ? cerrarSidebar() : abrirSidebar();
}

/** Abre el sidebar en mobile */
function abrirSidebar() {
  estado.sidebarAbierto = true;
  const sidebar  = $('#sidebar');
  const backdrop = $('#sidebar-backdrop');
  const boton    = $('#btn-hamburguesa');

  sidebar.classList.add('sidebar--abierto');
  backdrop.classList.add('sidebar__backdrop--visible');
  boton.setAttribute('aria-expanded', 'true');
  boton.classList.add('hamburger--activo');
  document.body.style.overflow = 'hidden'; // Evitar scroll detrás
}

/** Cierra el sidebar en mobile */
function cerrarSidebar() {
  estado.sidebarAbierto = false;
  const sidebar  = $('#sidebar');
  const backdrop = $('#sidebar-backdrop');
  const boton    = $('#btn-hamburguesa');

  sidebar.classList.remove('sidebar--abierto');
  backdrop.classList.remove('sidebar__backdrop--visible');
  boton.setAttribute('aria-expanded', 'false');
  boton.classList.remove('hamburger--activo');
  document.body.style.overflow = '';
}

// ─────────────────────────────────────────────
// CONTENIDO: VISTAS ESTÁTICAS
// ─────────────────────────────────────────────

/**
 * Genera el HTML de la pantalla de inicio.
 * @returns {string}
 */
function vistaInicio() {
  setTimeout(() => renderizarInicio(), 0);
  return '';
}

/**
 * Genera el HTML de la pantalla de conclusiones.
 * @returns {string}
 */
function vistaConclusiones() {
  setTimeout(() => renderizarConclusiones(), 0);
  return '';
}

/**
 * Genera el HTML de un escenario cuyo módulo aún no está disponible.
 * @param {string} ruta
 * @returns {string}
 */
function vistaEscenarioPlaceholder(ruta) {
  const cfg = RUTAS[ruta];
  return `
    <section class="seccion-contenido" aria-labelledby="titulo-escenario">
      <div class="seccion-contenido__header">
        <h1 id="titulo-escenario">${cfg.icono} ${cfg.titulo}</h1>
      </div>
      <div class="alert alert--info" role="status">
        ⚙️ Este escenario está en desarrollo. Su módulo JS se cargará próximamente.
      </div>
    </section>
  `;
}

/**
 * Genera el HTML de la vista 404 (ruta no reconocida).
 * @returns {string}
 */
function vista404() {
  return `
    <section class="seccion-contenido" aria-label="Página no encontrada">
      <div class="seccion-contenido__header">
        <h1>🔍 Ruta no encontrada</h1>
      </div>
      <div class="alert alert--error" role="alert">
        La ruta solicitada no existe. 
        <a href="#inicio">Volver al inicio</a>
      </div>
    </section>
  `;
}

// ─────────────────────────────────────────────
// CARGA DINÁMICA DE MÓDULOS
// ─────────────────────────────────────────────

/**
 * Carga un script JS de forma dinámica (solo una vez).
 * @param {string} src - ruta al archivo .js
 * @returns {Promise<void>}
 */
function cargarScript(src) {
  return new Promise((resolve, reject) => {
    if (modulosCargados.has(src)) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = src;
    // ← sin defer, sin async
    script.onload = () => {
      modulosCargados.add(src);
      resolve();
    };
    script.onerror = () => reject(new Error(`No se pudo cargar el módulo: ${src}`));
    document.head.appendChild(script);
  });
}

/**
 * Carga dependencias globales necesarias para un escenario antes de cargar su módulo.
 * @param {string} ruta - hash de la ruta del escenario
 */
async function cargarDependenciasEscenario(ruta) {
  const dependencias = DEPENDENCIAS_ESCENARIO[ruta] || [];
  for (const dependencia of dependencias) {
    await cargarScript(dependencia);
  }
}

// ─────────────────────────────────────────────
// ROUTER: LÓGICA CENTRAL
// ─────────────────────────────────────────────

/**
 * Navega a la ruta indicada:
 *  1. Renderiza el contenido correspondiente
 *  2. Actualiza el link activo en el sidebar
 *  3. Carga el módulo JS del escenario si aplica
 *  4. Hace scroll al inicio del contenido principal
 *
 * @param {string} ruta - hash de la ruta (ej: '#escenario-a')
 */
async function navegar(ruta) {
  // Normalizar: si está vacío o no existe, ir a inicio
  if (!ruta || !RUTAS[ruta]) {
    ruta = RUTAS[ruta] ? ruta : '#inicio';
  }

  estado.rutaActual = ruta;
  const contenedor = $('#contenido-principal');

  // Mostrar indicador de carga mientras se procesa
  renderizar(contenedor, `
    <div class="cargando" role="status" aria-live="polite">
      <span aria-hidden="true">⏳</span> Cargando...
    </div>
  `);

  try {
    // Determinar qué contenido renderizar
    let html = '';

    if (ruta === '#inicio') {
      try {
        await cargarScript('js/escenarios/inicio.js');

        await cargarDependenciasEscenario(ruta);
        await cargarScript(rutaModulo);

        // ← agregar estas dos líneas
        await new Promise(r => setTimeout(r, 0)); // un tick para que el script se ejecute

        const fn = window.renderizarInicio ?? (typeof renderizarInicio !== 'undefined' ? renderizarInicio : null);
        if (typeof fn === 'function') {
          renderizar(contenedor, '');
          fn(contenedor);   // ← pasamos el contenedor siempre
        } else {
          html = vistaInicio();
        }
      } catch {
        html = vistaInicio();
      }

    } else if (ruta === '#conclusiones') {
      try {
        await cargarScript('js/escenarios/conclusiones.js');
        const fn = window.renderizarConclusiones ?? (typeof renderizarConclusiones !== 'undefined' ? renderizarConclusiones : null);
        if (typeof fn === 'function') {
          renderizar(contenedor, '');
          fn(contenedor);   // ← pasamos el contenedor siempre
        } else {
          html = vistaConclusiones();
        }
      } catch {
        html = vistaConclusiones();
      }

    } else if (ruta.startsWith('#escenario')) {
      const rutaModulo = MODULOS_ESCENARIO[ruta];

      if (rutaModulo) {
        try {
          await cargarDependenciasEscenario(ruta);
          await cargarScript(rutaModulo);

          const clave = ruta.replace('#escenario-', 'escenario')
                  .replace(/-(.)/g, (_, c) => c.toUpperCase())
                  .replace(/escenario(.)/, (_, c) => 'escenario' + c.toUpperCase());
          const claveRender = `renderizar${clave[0].toUpperCase()}${clave.slice(1)}`;
          const renderDirecto = window[claveRender];
          const renderGlobal  = window[clave];

          if (typeof renderDirecto === 'function') {
            renderizar(contenedor, '');
            renderDirecto(contenedor);
          } else if (typeof renderGlobal === 'function') {
            const resultado = renderGlobal();
            if (typeof resultado === 'string') {
              renderizar(contenedor, resultado);
            }
          } else {
            renderizar(contenedor, vistaEscenarioPlaceholder(ruta));
          }

        } catch (err) {
          console.error('❌ Error cargando escenario:', err);
          console.error('Stack:', err.stack);
          renderizar(contenedor, vistaEscenarioPlaceholder(ruta));
        }
      } else {
        renderizar(contenedor, vistaEscenarioPlaceholder(ruta));
      }
    }

    // Si html quedó vacío y el contenedor ya fue poblado directamente,
    // no sobreescribir. Solo renderizar si html tiene contenido.
    if (html) {
      renderizar(contenedor, html);
    }

  } catch (error) {
    console.error('Error al navegar:', error);
    renderizar(contenedor, `
      <div class="alert alert--error" role="alert">
        ❌ Error al cargar la sección. Intenta de nuevo.
      </div>
    `);
  }

  // Actualizar sidebar y scroll
  actualizarActivoSidebar(ruta);
  contenedor.scrollTo({ top: 0, behavior: 'smooth' });

  // Actualizar título del documento
  const cfg = RUTAS[ruta];
  document.title = cfg
    ? `${cfg.titulo} — Métodos Numéricos`
    : 'Métodos Numéricos';
}

// ─────────────────────────────────────────────
// ROUTER: ESCUCHAR CAMBIOS DE HASH
// ─────────────────────────────────────────────

/**
 * Lee el hash actual de la URL y navega a esa ruta.
 */
function leerHash() {
  const hash = window.location.hash || '#inicio';
  navegar(hash);
}

/**
 * Registra el listener para cambios de hash (navegación del usuario).
 */
function inicializarRouter() {
  window.addEventListener('hashchange', leerHash);
  // Interceptar clicks en links con href="#..." dentro del contenido principal
  $('#contenido-principal').addEventListener('click', (evento) => {
    const link = evento.target.closest('a[href^="#"]');
    if (link) {
      const href = link.getAttribute('href');
      if (RUTAS[href]) {
        evento.preventDefault();
        window.location.hash = href;
      }
    }
  });
}

// ─────────────────────────────────────────────
// INICIALIZACIÓN PRINCIPAL
// ─────────────────────────────────────────────

/**
 * Punto de entrada: arranca toda la aplicación.
 * Se ejecuta cuando el DOM está completamente listo.
 */
function iniciarApp() {
  try {
    inicializarSidebar();
    inicializarHamburguesa();
    inicializarRouter();
    leerHash(); // Cargar la ruta inicial según URL
  } catch (error) {
    console.error('Error crítico al iniciar la app:', error);
    document.body.innerHTML = `
      <div style="padding:2rem; color:red;">
        ❌ Error al iniciar la aplicación. Verifica la consola del navegador.
      </div>
    `;
  }
}

// Esperar a que el DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', iniciarApp);
} else {
  iniciarApp();
}
function navegarA(id) {
  window.location.hash = '#' + id;
}