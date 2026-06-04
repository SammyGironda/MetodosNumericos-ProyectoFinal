const Notificaciones = (() => {
  'use strict';

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. CONFIGURACIÓN
  // ─────────────────────────────────────────────────────────────────────────────

  const CONFIG = {
    duracionDefecto:  4500,   // ms — tiempo visible por defecto
    duracionError:    7000,   // ms — errores se quedan más tiempo
    duracionExito:    3500,   // ms — éxitos desaparecen rápido
    maxToasts:        4,      // máximo simultáneo en pantalla
    animDuracion:     280,    // ms — duración de animación entrada/salida
    zIndexBase:       9000,   // z-index del contenedor de toasts
  };

  // Íconos por tipo (emoji semánticos, sin dependencias externas)
  const ICONOS = {
    exito:      '✓',
    error:      '✕',
    advertencia:'⚠',
    info:       'ℹ',
    cargando:   '◌',
  };

  // Etiquetas ARIA para accesibilidad
  const ARIA_LABELS = {
    exito:      'Notificación de éxito',
    error:      'Notificación de error',
    advertencia:'Advertencia',
    info:       'Información',
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. ESTADO INTERNO
  // ─────────────────────────────────────────────────────────────────────────────

  /** Lista de toasts activos { id, el, timerId } */
  const _toastsActivos = [];

  /** Map<contenedorId, HTMLElement> — overlays de carga activos */
  const _overlaysCarga = new Map();

  /** Map<contenedorId, HTMLElement> — alertas inline activas */
  const _alertasInline = new Map();

  /** Contador para IDs únicos */
  let _contador = 0;

  /** Referencia al contenedor de toasts (creado una sola vez) */
  let _contenedorToasts = null;

  /** Modal activo (solo uno a la vez) */
  let _modalActivo = null;

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. CONTENEDOR DE TOASTS
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Crea o devuelve el contenedor de toasts (región ARIA live).
   * @returns {HTMLElement}
   */
  const _obtenerContenedorToasts = () => {
    if (_contenedorToasts && document.body.contains(_contenedorToasts)) {
      return _contenedorToasts;
    }

    _contenedorToasts = document.createElement('div');
    _contenedorToasts.id            = 'notif-toasts-container';
    _contenedorToasts.className     = 'notif-toasts-container';
    _contenedorToasts.setAttribute('aria-live',   'polite');
    _contenedorToasts.setAttribute('aria-atomic', 'false');
    _contenedorToasts.setAttribute('aria-label',  'Notificaciones del sistema');
    _contenedorToasts.setAttribute('role',        'log');
    document.body.appendChild(_contenedorToasts);
    return _contenedorToasts;
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. CREACIÓN DE TOAST
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Construye y muestra un toast en la esquina superior derecha.
   *
   * @param {string} tipo     - 'exito' | 'error' | 'advertencia' | 'info'
   * @param {string} mensaje  - Texto del toast
   * @param {object} [opts]
   * @param {number}  [opts.duracion]    - ms hasta auto-dismiss (0 = permanente)
   * @param {string}  [opts.titulo]      - Título en negrita sobre el mensaje
   * @param {boolean} [opts.cerrable]    - Muestra botón ✕ (default true)
   * @param {Function}[opts.onCerrar]    - Callback al cerrar
   * @returns {string} id del toast (para cerrar manualmente)
   */
  const _crearToast = (tipo, mensaje, opts = {}) => {
    const {
      duracion = tipo === 'error'   ? CONFIG.duracionError
               : tipo === 'exito'  ? CONFIG.duracionExito
               : CONFIG.duracionDefecto,
      titulo   = '',
      cerrable = true,
      onCerrar = null,
    } = opts;

    const contenedor = _obtenerContenedorToasts();

    // Límite de toasts simultáneos: eliminar el más antiguo
    if (_toastsActivos.length >= CONFIG.maxToasts) {
      _cerrarToast(_toastsActivos[0].id, true);
    }

    const id = `toast-${++_contador}`;

    // ── Elemento toast ───────────────────────────────────────────────────────
    const el = document.createElement('div');
    el.id        = id;
    el.className = `notif-toast notif-toast--${tipo} notif-toast--entrando`;
    el.setAttribute('role',       tipo === 'error' ? 'alert' : 'status');
    el.setAttribute('aria-label', ARIA_LABELS[tipo] ?? tipo);
    el.setAttribute('tabindex',   '-1');

    // Ícono
    const iconoEl = document.createElement('span');
    iconoEl.className      = 'notif-toast__icono';
    iconoEl.textContent    = ICONOS[tipo] ?? 'ℹ';
    iconoEl.setAttribute('aria-hidden', 'true');
    el.appendChild(iconoEl);

    // Cuerpo
    const cuerpoEl = document.createElement('div');
    cuerpoEl.className = 'notif-toast__cuerpo';

    if (titulo) {
      const tituloEl = document.createElement('strong');
      tituloEl.className   = 'notif-toast__titulo';
      tituloEl.textContent = titulo;
      cuerpoEl.appendChild(tituloEl);
    }

    const mensajeEl = document.createElement('p');
    mensajeEl.className   = 'notif-toast__mensaje';
    mensajeEl.textContent = mensaje;
    cuerpoEl.appendChild(mensajeEl);
    el.appendChild(cuerpoEl);

    // Barra de progreso (solo si tiene auto-dismiss)
    if (duracion > 0) {
      const barraEl = document.createElement('div');
      barraEl.className = 'notif-toast__barra';
      const progresoEl = document.createElement('div');
      progresoEl.className = 'notif-toast__progreso';
      progresoEl.style.animationDuration = `${duracion}ms`;
      barraEl.appendChild(progresoEl);
      el.appendChild(barraEl);
    }

    // Botón cerrar
    if (cerrable) {
      const btnEl = document.createElement('button');
      btnEl.className            = 'notif-toast__cerrar';
      btnEl.textContent          = '×';
      btnEl.setAttribute('aria-label', 'Cerrar notificación');
      btnEl.addEventListener('click', () => {
        _cerrarToast(id);
        if (onCerrar) onCerrar();
      });
      el.appendChild(btnEl);
    }

    contenedor.appendChild(el);

    // Registrar
    const timerId = duracion > 0
      ? setTimeout(() => _cerrarToast(id), duracion)
      : null;

    _toastsActivos.push({ id, el, timerId });

    // Activar animación de entrada en siguiente frame
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        el.classList.remove('notif-toast--entrando');
        el.classList.add('notif-toast--visible');
      });
    });

    return id;
  };

  /**
   * Cierra y elimina un toast del DOM.
   * @param {string}  id        - ID del toast
   * @param {boolean} [forzar]  - Si true, elimina sin animación
   */
  const _cerrarToast = (id, forzar = false) => {
    const indice = _toastsActivos.findIndex(t => t.id === id);
    if (indice === -1) return;

    const { el, timerId } = _toastsActivos[indice];
    if (timerId) clearTimeout(timerId);
    _toastsActivos.splice(indice, 1);

    if (forzar || !el.isConnected) {
      el.remove();
      return;
    }

    el.classList.remove('notif-toast--visible');
    el.classList.add('notif-toast--saliendo');

    setTimeout(() => el.remove(), CONFIG.animDuracion);
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // 5. API DE TOASTS (pública)
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Toast de éxito — operación completada correctamente.
   * @param {string} mensaje
   * @param {object} [opciones]
   * @returns {string} id
   */
  const exito = (mensaje, opciones = {}) =>
    _crearToast('exito', mensaje, opciones);

  /**
   * Toast de error — fallo en cálculo, validación o sistema.
   * @param {string} mensaje
   * @param {object} [opciones]
   * @returns {string} id
   */
  const error = (mensaje, opciones = {}) =>
    _crearToast('error', mensaje, opciones);

  /**
   * Toast de advertencia — resultado obtenido pero con reservas.
   * @param {string} mensaje
   * @param {object} [opciones]
   * @returns {string} id
   */
  const advertencia = (mensaje, opciones = {}) =>
    _crearToast('advertencia', mensaje, opciones);

  /**
   * Toast informativo — mensajes neutros del sistema.
   * @param {string} mensaje
   * @param {object} [opciones]
   * @returns {string} id
   */
  const info = (mensaje, opciones = {}) =>
    _crearToast('info', mensaje, opciones);

  /**
   * Cierra un toast específico por su id.
   * @param {string} id
   */
  const cerrarToast = (id) => _cerrarToast(id);

  /**
   * Cierra todos los toasts activos.
   */
  const limpiarToasts = () => {
    [..._toastsActivos].forEach(t => _cerrarToast(t.id));
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // 6. ALERTAS INLINE
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Muestra una alerta inline dentro de un contenedor del DOM.
   * Reemplaza cualquier alerta previa en ese mismo contenedor.
   *
   * @param {string} contenedorId - ID del elemento donde se inserta
   * @param {'exito'|'error'|'advertencia'|'info'} tipo
   * @param {string} mensaje
   * @param {object} [opciones]
   * @param {string}  [opciones.titulo]     - Título en negrita
   * @param {boolean} [opciones.cerrable]   - Muestra botón ✕ (default true)
   * @param {number}  [opciones.duracion]   - Auto-dismiss en ms (0 = permanente)
   */
  const inline = (contenedorId, tipo, mensaje, opciones = {}) => {
    const contenedor = document.getElementById(contenedorId);
    if (!contenedor) {
      console.warn(`[Notificaciones] inline(): no se encontró id="${contenedorId}".`);
      return;
    }

    const {
      titulo   = '',
      cerrable = true,
      duracion = 0,
    } = opciones;

    // Limpiar alerta anterior en este contenedor
    limpiarInline(contenedorId);

    const el = document.createElement('div');
    el.className = `alert alert--${_mapaTipoAlert(tipo)} notif-inline`;
    el.setAttribute('role', tipo === 'error' ? 'alert' : 'status');
    el.setAttribute('aria-live', tipo === 'error' ? 'assertive' : 'polite');

    // Ícono
    const iconoEl = document.createElement('span');
    iconoEl.textContent = ICONOS[tipo] ?? 'ℹ';
    iconoEl.setAttribute('aria-hidden', 'true');
    el.appendChild(iconoEl);

    // Cuerpo
    const cuerpoEl = document.createElement('div');
    cuerpoEl.style.flex = '1';

    if (titulo) {
      const tituloEl = document.createElement('strong');
      tituloEl.style.display  = 'block';
      tituloEl.style.marginBottom = '0.2em';
      tituloEl.textContent = titulo;
      cuerpoEl.appendChild(tituloEl);
    }

    const textoEl = document.createElement('span');
    textoEl.textContent = mensaje;
    cuerpoEl.appendChild(textoEl);
    el.appendChild(cuerpoEl);

    // Botón cerrar
    if (cerrable) {
      const btnEl = document.createElement('button');
      btnEl.className   = 'notif-inline__cerrar';
      btnEl.textContent = '×';
      btnEl.setAttribute('aria-label', 'Cerrar');
      btnEl.style.cssText = `
        background: none; border: none; cursor: pointer;
        font-size: 1.2rem; line-height: 1; padding: 0 0 0 0.5rem;
        color: inherit; opacity: 0.7; align-self: flex-start;
      `;
      btnEl.addEventListener('click', () => limpiarInline(contenedorId));
      el.appendChild(btnEl);
    }

    contenedor.appendChild(el);
    _alertasInline.set(contenedorId, el);

    // Auto-dismiss
    if (duracion > 0) {
      setTimeout(() => limpiarInline(contenedorId), duracion);
    }
  };

  /**
   * Elimina la alerta inline de un contenedor.
   * @param {string} contenedorId
   */
  const limpiarInline = (contenedorId) => {
    const el = _alertasInline.get(contenedorId);
    if (el && el.isConnected) el.remove();
    _alertasInline.delete(contenedorId);
  };

  /**
   * Mapea el tipo interno al sufijo de clase .alert-- del proyecto.
   * @param {string} tipo
   * @returns {string}
   */
  const _mapaTipoAlert = (tipo) => {
    const mapa = {
      exito:      'success',
      error:      'error',
      advertencia:'warning',
      info:       'info',
    };
    return mapa[tipo] ?? 'info';
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // 7. OVERLAYS DE CARGA
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Muestra un overlay de carga sobre un contenedor.
   * El contenedor debe tener position: relative (se fuerza si no lo tiene).
   *
   * @param {string} contenedorId
   * @param {string} [mensaje='Calculando...']
   */
  const cargando = (contenedorId, mensaje = 'Calculando...') => {
    const contenedor = document.getElementById(contenedorId);
    if (!contenedor) return;

    // Evitar duplicados
    detenerCarga(contenedorId);

    // Asegurar positioning
    const posicion = getComputedStyle(contenedor).position;
    if (posicion === 'static') {
      contenedor.style.position = 'relative';
    }

    const overlay = document.createElement('div');
    overlay.className = 'notif-carga-overlay';
    overlay.setAttribute('role',     'status');
    overlay.setAttribute('aria-live','polite');
    overlay.setAttribute('aria-label', mensaje);

    overlay.innerHTML = `
      <div class="notif-carga-cuerpo">
        <div class="notif-spinner" aria-hidden="true">
          <div class="notif-spinner__anillo"></div>
        </div>
        <p class="notif-carga-mensaje">${_escaparHTML(mensaje)}</p>
      </div>
    `;

    contenedor.appendChild(overlay);
    _overlaysCarga.set(contenedorId, overlay);
  };

  /**
   * Elimina el overlay de carga de un contenedor.
   * @param {string} contenedorId
   */
  const detenerCarga = (contenedorId) => {
    const overlay = _overlaysCarga.get(contenedorId);
    if (overlay && overlay.isConnected) overlay.remove();
    _overlaysCarga.delete(contenedorId);
  };

  /**
   * Detiene todos los overlays de carga activos.
   */
  const detenerTodasLasCargas = () => {
    for (const id of _overlaysCarga.keys()) detenerCarga(id);
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // 8. MODAL
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Muestra un modal de confirmación o de información.
   *
   * @param {object} config
   * @param {string}   config.titulo          - Título del modal
   * @param {string}   config.mensaje         - Cuerpo del modal
   * @param {'info'|'error'|'advertencia'|'confirmacion'} [config.tipo='info']
   * @param {string}   [config.txtConfirmar='Aceptar']
   * @param {string}   [config.txtCancelar='Cancelar']
   * @param {boolean}  [config.mostrarCancelar=false]
   * @param {Function} [config.onConfirmar]   - Callback al aceptar
   * @param {Function} [config.onCancelar]    - Callback al cancelar / cerrar
   * @returns {HTMLElement} elemento del modal
   */
  const modal = (config = {}) => {
    const {
      titulo          = 'Aviso',
      mensaje         = '',
      tipo            = 'info',
      txtConfirmar    = 'Aceptar',
      txtCancelar     = 'Cancelar',
      mostrarCancelar = false,
      onConfirmar     = null,
      onCancelar      = null,
    } = config;

    // Cerrar modal anterior
    cerrarModal();

    // Backdrop
    const backdrop = document.createElement('div');
    backdrop.className = 'notif-modal-backdrop';
    backdrop.setAttribute('aria-hidden', 'true');
    backdrop.addEventListener('click', () => {
      cerrarModal();
      if (onCancelar) onCancelar();
    });

    // Modal
    const modalEl = document.createElement('div');
    modalEl.className = `notif-modal notif-modal--${tipo}`;
    modalEl.setAttribute('role',          'dialog');
    modalEl.setAttribute('aria-modal',    'true');
    modalEl.setAttribute('aria-labelledby', 'notif-modal-titulo');
    modalEl.setAttribute('aria-describedby','notif-modal-mensaje');
    modalEl.setAttribute('tabindex',      '-1');

    // Ícono superior
    const iconoEl = document.createElement('div');
    iconoEl.className      = `notif-modal__icono notif-modal__icono--${tipo}`;
    iconoEl.textContent    = ICONOS[tipo] ?? ICONOS.info;
    iconoEl.setAttribute('aria-hidden', 'true');

    // Título
    const tituloEl = document.createElement('h2');
    tituloEl.id          = 'notif-modal-titulo';
    tituloEl.className   = 'notif-modal__titulo';
    tituloEl.textContent = titulo;

    // Mensaje
    const mensajeEl = document.createElement('p');
    mensajeEl.id          = 'notif-modal-mensaje';
    mensajeEl.className   = 'notif-modal__mensaje';
    mensajeEl.textContent = mensaje;

    // Botones
    const botonesEl = document.createElement('div');
    botonesEl.className = 'notif-modal__botones';

    if (mostrarCancelar) {
      const btnCancelar = document.createElement('button');
      btnCancelar.className   = 'btn btn--secondary';
      btnCancelar.textContent = txtCancelar;
      btnCancelar.addEventListener('click', () => {
        cerrarModal();
        if (onCancelar) onCancelar();
      });
      botonesEl.appendChild(btnCancelar);
    }

    const btnConfirmar = document.createElement('button');
    btnConfirmar.className   = `btn btn--${tipo === 'error' ? 'alert' : 'primary'}`;
    btnConfirmar.textContent = txtConfirmar;
    btnConfirmar.addEventListener('click', () => {
      cerrarModal();
      if (onConfirmar) onConfirmar();
    });
    botonesEl.appendChild(btnConfirmar);

    modalEl.appendChild(iconoEl);
    modalEl.appendChild(tituloEl);
    modalEl.appendChild(mensajeEl);
    modalEl.appendChild(botonesEl);

    document.body.appendChild(backdrop);
    document.body.appendChild(modalEl);
    _modalActivo = { backdrop, modalEl };

    // Bloquear scroll
    document.body.style.overflow = 'hidden';

    // Focus al botón confirmar
    requestAnimationFrame(() => btnConfirmar.focus());

    // Cerrar con Escape
    const onKeydown = (e) => {
      if (e.key === 'Escape') {
        cerrarModal();
        if (onCancelar) onCancelar();
        document.removeEventListener('keydown', onKeydown);
      }
    };
    document.addEventListener('keydown', onKeydown);

    return modalEl;
  };

  /**
   * Cierra el modal activo.
   */
  const cerrarModal = () => {
    if (!_modalActivo) return;
    const { backdrop, modalEl } = _modalActivo;
    if (backdrop.isConnected) backdrop.remove();
    if (modalEl.isConnected)  modalEl.remove();
    _modalActivo = null;
    document.body.style.overflow = '';
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // 9. HELPERS SEMÁNTICOS PARA ESCENARIOS
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Notifica convergencia exitosa de un método iterativo.
   * @param {string} metodo      - Nombre del método (ej: 'Gauss-Seidel')
   * @param {number} iteraciones - Número de iteraciones realizadas
   * @param {number} errorFinal  - Error en la última iteración
   */
  const convergenciaExitosa = (metodo, iteraciones, errorFinal) =>
    exito(
      `Convergió en ${iteraciones} iteración${iteraciones !== 1 ? 'es' : ''} ` +
      `(error final: ${errorFinal.toExponential(3)})`,
      { titulo: `${metodo} — Convergencia` }
    );

  /**
   * Notifica que el método no convergió.
   * @param {string} metodo      - Nombre del método
   * @param {number} maxIter     - Máximo de iteraciones alcanzado
   */
  const noConverge = (metodo, maxIter) =>
    error(
      `No se alcanzó convergencia en ${maxIter} iteraciones. ` +
      `Intenta aumentar el límite, reducir la tolerancia o verificar los datos.`,
      { titulo: `${metodo} — Sin convergencia` }
    );

  /**
   * Notifica un error matemático (división por cero, dominio, etc.)
   * @param {string} detalle - Descripción del error matemático
   */
  const errorMatematico = (detalle) =>
    error(detalle, {
      titulo:   'Error matemático',
      duracion: CONFIG.duracionError,
    });

  /**
   * Notifica que se cargaron datos de ejemplo.
   * @param {string} escenario - Nombre o letra del escenario
   */
  const datosEjemplosCargados = (escenario) =>
    info(`Datos de ejemplo del Escenario ${escenario} cargados en el formulario.`);

  /**
   * Confirma antes de limpiar o resetear resultados.
   * @param {Function} onConfirmar - Acción a ejecutar si acepta
   */
  const confirmarReset = (onConfirmar) =>
    modal({
      tipo:           'advertencia',
      titulo:         'Limpiar resultados',
      mensaje:        '¿Deseas limpiar los resultados actuales? Esta acción no se puede deshacer.',
      mostrarCancelar: true,
      txtConfirmar:   'Sí, limpiar',
      txtCancelar:    'Cancelar',
      onConfirmar,
    });

  /**
   * Muestra error crítico con modal (para fallos irrecuperables del sistema).
   * @param {string} mensaje
   */
  const errorCritico = (mensaje) =>
    modal({
      tipo:    'error',
      titulo:  'Error del sistema',
      mensaje,
      txtConfirmar: 'Entendido',
    });

  // ─────────────────────────────────────────────────────────────────────────────
  // 10. LIMPIEZA GENERAL
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Limpia absolutamente todo: toasts, inline, overlays y modal.
   */
  const limpiarTodos = () => {
    limpiarToasts();
    for (const id of _alertasInline.keys()) limpiarInline(id);
    detenerTodasLasCargas();
    cerrarModal();
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // 11. UTILIDADES INTERNAS
  // ─────────────────────────────────────────────────────────────────────────────

  const _escaparHTML = (str) =>
    String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

  // ─────────────────────────────────────────────────────────────────────────────
  // 12. ESTILOS CSS DINÁMICOS
  // ─────────────────────────────────────────────────────────────────────────────

  const _inyectarEstilos = (() => {
    let inyectado = false;
    return () => {
      if (inyectado) return;
      inyectado = true;

      const css = `
        /* ════════════════════════════════════════════
           NOTIFICACIONES.JS — Estilos de soporte
           Usa variables CSS del proyecto (variables.css)
        ════════════════════════════════════════════ */

        /* ── Contenedor de toasts ───────────────── */
        .notif-toasts-container {
          position: fixed;
          top: var(--spacing-4, 1rem);
          right: var(--spacing-4, 1rem);
          z-index: ${CONFIG.zIndexBase};
          display: flex;
          flex-direction: column;
          gap: var(--spacing-2, 0.5rem);
          max-width: min(360px, calc(100vw - 2rem));
          pointer-events: none;
        }

        /* ── Toast base ─────────────────────────── */
        .notif-toast {
          display: flex;
          align-items: flex-start;
          gap: var(--spacing-3, 0.75rem);
          padding: var(--spacing-3, 0.75rem) var(--spacing-4, 1rem);
          border-radius: var(--border-radius-md, 6px);
          box-shadow: var(--shadow-lg, 0 8px 24px rgba(0,0,0,0.15));
          pointer-events: all;
          position: relative;
          overflow: hidden;
          min-width: 260px;
          border-left: 4px solid transparent;

          /* Estado inicial (fuera de pantalla a la derecha) */
          transform: translateX(110%);
          opacity: 0;
          transition:
            transform ${CONFIG.animDuracion}ms cubic-bezier(0.34, 1.2, 0.64, 1),
            opacity   ${CONFIG.animDuracion}ms ease;
        }

        .notif-toast--visible {
          transform: translateX(0);
          opacity: 1;
        }

        .notif-toast--saliendo {
          transform: translateX(110%);
          opacity: 0;
        }

        /* Variantes por tipo */
        .notif-toast--exito {
          background: #f0f7ec;
          border-left-color: var(--color-secondary, #6C8C74);
          color: var(--color-neutral-800, #1C2B25);
        }
        .notif-toast--error {
          background: #fdf0ee;
          border-left-color: var(--color-alert, #D97059);
          color: var(--color-neutral-800, #1C2B25);
        }
        .notif-toast--advertencia {
          background: #fdf6ed;
          border-left-color: var(--color-accent-warm, #F29966);
          color: var(--color-neutral-800, #1C2B25);
        }
        .notif-toast--info {
          background: #fdfaf4;
          border-left-color: var(--color-primary, #3E594F);
          color: var(--color-neutral-800, #1C2B25);
        }

        /* Ícono del toast */
        .notif-toast__icono {
          font-size: 1rem;
          line-height: 1.5;
          flex-shrink: 0;
          width: 20px;
          text-align: center;
        }
        .notif-toast--exito      .notif-toast__icono { color: var(--color-secondary, #6C8C74); }
        .notif-toast--error      .notif-toast__icono { color: var(--color-alert,     #D97059); }
        .notif-toast--advertencia .notif-toast__icono { color: var(--color-accent-warm, #F29966); }
        .notif-toast--info       .notif-toast__icono { color: var(--color-primary,   #3E594F); }

        /* Cuerpo del toast */
        .notif-toast__cuerpo { flex: 1; min-width: 0; }
        .notif-toast__titulo {
          display: block;
          font-size: var(--font-size-sm, 0.875rem);
          font-weight: var(--font-weight-semibold, 600);
          margin-bottom: 2px;
        }
        .notif-toast__mensaje {
          margin: 0;
          font-size: var(--font-size-sm, 0.875rem);
          line-height: 1.45;
          opacity: 0.9;
          word-break: break-word;
        }

        /* Botón cerrar */
        .notif-toast__cerrar {
          background: none;
          border: none;
          cursor: pointer;
          font-size: 1.25rem;
          line-height: 1;
          padding: 0;
          color: inherit;
          opacity: 0.5;
          flex-shrink: 0;
          align-self: flex-start;
          transition: opacity 0.15s;
        }
        .notif-toast__cerrar:hover { opacity: 1; }

        /* Barra de progreso */
        .notif-toast__barra {
          position: absolute;
          bottom: 0; left: 0; right: 0;
          height: 3px;
          background: rgba(0,0,0,0.08);
          border-radius: 0 0 6px 6px;
        }
        .notif-toast__progreso {
          height: 100%;
          border-radius: 0 0 6px 6px;
          animation: notifProgreso linear forwards;
          transform-origin: left;
        }
        .notif-toast--exito      .notif-toast__progreso { background: var(--color-secondary,   #6C8C74); }
        .notif-toast--error      .notif-toast__progreso { background: var(--color-alert,        #D97059); }
        .notif-toast--advertencia .notif-toast__progreso { background: var(--color-accent-warm, #F29966); }
        .notif-toast--info       .notif-toast__progreso { background: var(--color-primary,      #3E594F); }

        @keyframes notifProgreso {
          from { transform: scaleX(1); }
          to   { transform: scaleX(0); }
        }

        /* ── Overlay de carga ───────────────────── */
        .notif-carga-overlay {
          position: absolute;
          inset: 0;
          background: rgba(255, 255, 255, 0.82);
          backdrop-filter: blur(2px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10;
          border-radius: inherit;
        }
        .notif-carga-cuerpo {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: var(--spacing-3, 0.75rem);
        }
        .notif-carga-mensaje {
          margin: 0;
          font-size: var(--font-size-sm, 0.875rem);
          color: var(--color-neutral-700, #3a4f42);
          font-weight: var(--font-weight-medium, 500);
        }

        /* Spinner */
        .notif-spinner {
          width: 36px;
          height: 36px;
          position: relative;
        }
        .notif-spinner__anillo {
          width: 100%;
          height: 100%;
          border-radius: 50%;
          border: 3px solid var(--color-neutral-200, #E8F0E9);
          border-top-color: var(--color-primary, #3E594F);
          animation: notifGiro 0.75s linear infinite;
        }
        @keyframes notifGiro {
          to { transform: rotate(360deg); }
        }

        /* ── Modal ──────────────────────────────── */
        .notif-modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(15, 30, 24, 0.55);
          z-index: ${CONFIG.zIndexBase + 10};
          animation: notifFadeIn 0.2s ease;
        }
        .notif-modal {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          z-index: ${CONFIG.zIndexBase + 11};
          background: #fff;
          border-radius: var(--border-radius-lg, 10px);
          box-shadow: var(--shadow-xl, 0 20px 60px rgba(0,0,0,0.2));
          padding: var(--spacing-8, 2rem);
          width: min(440px, calc(100vw - 2rem));
          text-align: center;
          animation: notifModalEntrada 0.25s cubic-bezier(0.34, 1.4, 0.64, 1);
        }
        @keyframes notifFadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes notifModalEntrada {
          from { opacity: 0; transform: translate(-50%, -52%) scale(0.96); }
          to   { opacity: 1; transform: translate(-50%, -50%) scale(1);    }
        }
        .notif-modal__icono {
          font-size: 2.5rem;
          line-height: 1;
          margin-bottom: var(--spacing-3, 0.75rem);
          display: block;
        }
        .notif-modal__icono--exito       { color: var(--color-secondary,   #6C8C74); }
        .notif-modal__icono--error       { color: var(--color-alert,        #D97059); }
        .notif-modal__icono--advertencia { color: var(--color-accent-warm,  #F29966); }
        .notif-modal__icono--info        { color: var(--color-primary,      #3E594F); }
        .notif-modal__titulo {
          font-size: var(--font-size-lg, 1.125rem);
          font-weight: var(--font-weight-semibold, 600);
          color: var(--color-neutral-900, #0f1e18);
          margin: 0 0 var(--spacing-2, 0.5rem);
        }
        .notif-modal__mensaje {
          font-size: var(--font-size-sm, 0.875rem);
          color: var(--color-neutral-600, #5a7060);
          margin: 0 0 var(--spacing-6, 1.5rem);
          line-height: 1.6;
        }
        .notif-modal__botones {
          display: flex;
          justify-content: center;
          gap: var(--spacing-3, 0.75rem);
          flex-wrap: wrap;
        }

        /* ── Responsive ─────────────────────────── */
        @media (max-width: 480px) {
          .notif-toasts-container {
            top: auto;
            bottom: var(--spacing-4, 1rem);
            right: var(--spacing-2, 0.5rem);
            left:  var(--spacing-2, 0.5rem);
            max-width: 100%;
          }
          .notif-toast { min-width: unset; }
        }

        /* ── Accesibilidad: movimiento reducido ─── */
        @media (prefers-reduced-motion: reduce) {
          .notif-toast,
          .notif-toast--visible,
          .notif-toast--saliendo {
            transition: opacity 0.15s ease;
            transform: none !important;
          }
          .notif-spinner__anillo { animation: none; border-top-color: var(--color-primary, #3E594F); }
          .notif-toast__progreso { animation: none; }
          .notif-modal           { animation: none; }
          .notif-modal-backdrop  { animation: none; }
        }
      `;

      const style = document.createElement('style');
      style.id          = 'notificaciones-js-styles';
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
    // Toasts
    exito,
    error,
    advertencia,
    info,
    cerrarToast,
    limpiarToasts,

    // Inline
    inline,
    limpiarInline,

    // Carga
    cargando,
    detenerCarga,
    detenerTodasLasCargas,

    // Modal
    modal,
    cerrarModal,

    // Helpers semánticos para escenarios
    convergenciaExitosa,
    noConverge,
    errorMatematico,
    datosEjemplosCargados,
    confirmarReset,
    errorCritico,

    // Limpieza total
    limpiarTodos,
  };
})();

// Exponer globalmente para uso sin módulos ES (script tags)
window.Notificaciones = Notificaciones;