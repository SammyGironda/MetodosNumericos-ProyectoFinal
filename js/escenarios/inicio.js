// ============================================================
// PANTALLA DE INICIO - Simulación Numérica de Crisis
// Proyecto: Métodos Numéricos Aplicados
// ============================================================

/**
 * Renderiza la pantalla de inicio en el contenedor principal.
 * Muestra: título del proyecto, descripción, tarjetas de los
 * 7 escenarios y contexto académico.
 */
function renderizarInicio() {
  const contenedor = document.getElementById('contenido-principal');
  if (!contenedor) return;

  contenedor.innerHTML = `
    <section class="inicio" id="seccion-inicio" aria-label="Pantalla de inicio">

      <!-- HERO -->
      <div class="inicio__hero">
        <div class="inicio__hero-badge">📐 Métodos Numéricos Aplicados</div>
        <h1 class="inicio__titulo">
          Simulación Numérica<br>
          <span class="inicio__titulo-accent">de Crisis</span>
        </h1>
        <p class="inicio__subtitulo">
          Siete escenarios reales de abastecimiento, precios y conflicto social
          modelados con algoritmos numéricos clásicos. Ingresa parámetros,
          ejecuta los métodos y observa los resultados al instante.
        </p>
        <div class="inicio__hero-acciones">
          <button
            class="btn btn--primary btn--large"
            onclick="navegarA('escenario-a')"
            aria-label="Comenzar con el Escenario A"
          >
            🚀 Comenzar simulación
          </button>
          <button
            class="btn btn--secondary"
            onclick="document.getElementById('inicio-escenarios').scrollIntoView({ behavior: 'smooth' })"
            aria-label="Ver todos los escenarios"
          >
            📋 Ver escenarios
          </button>
        </div>
      </div>

      <!-- CONTEXTO ACADÉMICO -->
      <div class="inicio__contexto card card--info">
        <div class="card__header">
          <h2 class="card__title">🎓 Contexto del Proyecto</h2>
        </div>
        <div class="card__body">
          <div class="form-row form-row--3-col">
            <div class="inicio__meta-item">
              <span class="inicio__meta-label">Asignatura</span>
              <span class="inicio__meta-valor">Métodos Numéricos</span>
            </div>
            <div class="inicio__meta-item">
              <span class="inicio__meta-label">Modalidad</span>
              <span class="inicio__meta-valor">Trabajo grupal · 2 integrantes</span>
            </div>
            <div class="inicio__meta-item">
              <span class="inicio__meta-label">Evaluación</span>
              <span class="inicio__meta-valor">70 puntos · Rúbrica oficial</span>
            </div>
          </div>
        </div>
      </div>

      <!-- TARJETAS DE ESCENARIOS -->
      <div class="inicio__seccion" id="inicio-escenarios">
        <h2 class="inicio__seccion-titulo">📊 Los 7 Escenarios</h2>
        <p class="inicio__seccion-descripcion">
          Cada escenario aplica uno o más métodos numéricos a un problema
          concreto de crisis. Selecciona cualquiera para ingresar datos y calcular.
        </p>

        <div class="inicio__grid-escenarios" role="list">

          ${_tarjetaEscenario({
            id: 'escenario-a',
            letra: 'A',
            icono: '⚖️',
            titulo: 'Distribución de Abastecimiento',
            metodo: 'Sistemas Lineales',
            algoritmos: 'Gauss-Seidel · Descomposición LU',
            descripcion: 'Modela la distribución óptima de recursos entre zonas afectadas resolviendo sistemas de ecuaciones lineales con múltiples restricciones de oferta y demanda.',
            clase: 'card--escenario-a',
            puntos: 6
          })}

          ${_tarjetaEscenario({
            id: 'escenario-b',
            letra: 'B',
            icono: '💧',
            titulo: 'Vaciado de Reservas Críticas',
            metodo: 'Ecuaciones Diferenciales',
            algoritmos: 'Runge-Kutta 4 · Euler · Heun',
            descripcion: 'Simula el agotamiento de reservas de agua, combustible o alimentos bajo diferentes tasas de consumo y condiciones de reabastecimiento.',
            clase: 'card--escenario-b',
            puntos: 6
          })}

          ${_tarjetaEscenario({
            id: 'escenario-c',
            letra: 'C',
            icono: '📈',
            titulo: 'Curva de Precios en Crisis',
            metodo: 'Interpolación',
            algoritmos: 'Lagrange · Splines Cúbicos',
            descripcion: 'Reconstruye la curva de evolución de precios a partir de datos históricos dispersos para estimar valores en períodos sin información.',
            clase: 'card--escenario-c',
            puntos: 6
          })}

          ${_tarjetaEscenario({
            id: 'escenario-d',
            letra: 'D',
            icono: '💰',
            titulo: 'Costo Acumulado de Emergencia',
            metodo: 'Integración Numérica',
            algoritmos: 'Simpson 1/3 · Trapecio compuesto',
            descripcion: 'Calcula el costo total acumulado de una emergencia integrando la función de gasto continuo sobre el período de crisis.',
            clase: 'card--escenario-d',
            puntos: 6
          })}

          ${_tarjetaEscenario({
            id: 'escenario-e',
            letra: 'E',
            icono: '🚨',
            titulo: 'Umbrales Críticos de Colapso',
            metodo: 'Raíces de Ecuaciones',
            algoritmos: 'Newton-Raphson · Bisección',
            descripcion: 'Determina el punto exacto (umbral) en que un sistema social o económico entra en estado crítico, hallando raíces de funciones no lineales.',
            clase: 'card--escenario-e',
            puntos: 6
          })}

          ${_tarjetaEscenario({
            id: 'escenario-f',
            letra: 'F',
            icono: '📢',
            titulo: 'Propagación de Rumores y Pánico',
            metodo: 'Sistemas Mal Condicionados',
            algoritmos: 'Gauss-Seidel · Número de condición',
            descripcion: 'Analiza la propagación de información falsa en redes sociales usando sistemas lineales con matrices mal condicionadas que representan la sensibilidad del sistema.',
            clase: 'card--escenario-f',
            puntos: 5
          })}

          ${_tarjetaEscenario({
            id: 'escenario-g',
            letra: 'G',
            icono: '🌐',
            titulo: 'Difusión de Opinión Social',
            metodo: 'Ecuaciones Diferenciales',
            algoritmos: 'RK4 · Modelo SIR adaptado',
            descripcion: 'Modela cómo una opinión, protesta o movimiento social se difunde en la población mediante un sistema de ecuaciones diferenciales acopladas.',
            clase: 'card--escenario-g',
            puntos: 5
          })}

        </div>
      </div>

      <!-- MÉTODOS NUMÉRICOS REFERENCIA RÁPIDA -->
      <div class="inicio__seccion">
        <h2 class="inicio__seccion-titulo">🔢 Métodos implementados</h2>
        <div class="form-row form-row--2-col">

          <div class="card">
            <div class="card__header">
              <h3 class="card__title">Álgebra Lineal</h3>
            </div>
            <div class="card__body">
              <table>
                <thead>
                  <tr><th>Método</th><th>Uso</th></tr>
                </thead>
                <tbody>
                  <tr><td>Gauss-Seidel</td><td>Sistemas iterativos grandes</td></tr>
                  <tr><td>Descomp. LU</td><td>Solución directa y estable</td></tr>
                </tbody>
              </table>
            </div>
          </div>

          <div class="card">
            <div class="card__header">
              <h3 class="card__title">Raíces de Ecuaciones</h3>
            </div>
            <div class="card__body">
              <table>
                <thead>
                  <tr><th>Método</th><th>Uso</th></tr>
                </thead>
                <tbody>
                  <tr><td>Newton-Raphson</td><td>Convergencia cuadrática</td></tr>
                  <tr><td>Bisección</td><td>Garantía de convergencia</td></tr>
                </tbody>
              </table>
            </div>
          </div>

          <div class="card">
            <div class="card__header">
              <h3 class="card__title">Interpolación</h3>
            </div>
            <div class="card__body">
              <table>
                <thead>
                  <tr><th>Método</th><th>Uso</th></tr>
                </thead>
                <tbody>
                  <tr><td>Lagrange</td><td>Polinomio global exacto</td></tr>
                  <tr><td>Splines cúbicos</td><td>Suavidad entre puntos</td></tr>
                </tbody>
              </table>
            </div>
          </div>

          <div class="card">
            <div class="card__header">
              <h3 class="card__title">EDOs e Integración</h3>
            </div>
            <div class="card__body">
              <table>
                <thead>
                  <tr><th>Método</th><th>Uso</th></tr>
                </thead>
                <tbody>
                  <tr><td>Runge-Kutta 4</td><td>EDOs de alta precisión</td></tr>
                  <tr><td>Euler / Heun</td><td>EDOs simples / mejorado</td></tr>
                  <tr><td>Simpson 1/3</td><td>Integración precisa</td></tr>
                  <tr><td>Trapecio</td><td>Integración robusta</td></tr>
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>

      <!-- ESTADO DEL PROYECTO -->
      <div class="inicio__seccion">
        <h2 class="inicio__seccion-titulo">📋 Rúbrica de Evaluación</h2>
        <div class="card">
          <div class="card__body">
            <table>
              <thead>
                <tr>
                  <th>Pts</th>
                  <th>Criterio</th>
                  <th>Escenario / Módulo</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td class="table__cell--number"><span class="badge">5</span></td>
                  <td>Contexto del problema claro</td>
                  <td>Esta pantalla de inicio</td>
                </tr>
                <tr>
                  <td class="table__cell--number"><span class="badge">6</span></td>
                  <td>Sistemas lineales correcto</td>
                  <td>Escenario A</td>
                </tr>
                <tr>
                  <td class="table__cell--number"><span class="badge">6</span></td>
                  <td>Raíces de ecuaciones</td>
                  <td>Escenario E</td>
                </tr>
                <tr>
                  <td class="table__cell--number"><span class="badge">6</span></td>
                  <td>Interpolación correcta</td>
                  <td>Escenario C</td>
                </tr>
                <tr>
                  <td class="table__cell--number"><span class="badge">6</span></td>
                  <td>Integración numérica</td>
                  <td>Escenario D</td>
                </tr>
                <tr>
                  <td class="table__cell--number"><span class="badge">6</span></td>
                  <td>Ecuaciones diferenciales</td>
                  <td>Escenarios B y G</td>
                </tr>
                <tr>
                  <td class="table__cell--number"><span class="badge">5</span></td>
                  <td>Página interactiva (formularios)</td>
                  <td>Todos los escenarios</td>
                </tr>
                <tr>
                  <td class="table__cell--number"><span class="badge">5</span></td>
                  <td>Resultados visibles en pantalla</td>
                  <td>Tablas + gráficos Chart.js</td>
                </tr>
                <tr>
                  <td class="table__cell--number"><span class="badge">5</span></td>
                  <td>Interpretación clara</td>
                  <td>Párrafos automáticos por escenario</td>
                </tr>
                <tr>
                  <td class="table__cell--number"><span class="badge">4</span></td>
                  <td>Diseño responsivo</td>
                  <td>css/responsivo.css</td>
                </tr>
                <tr>
                  <td class="table__cell--number"><span class="badge">4</span></td>
                  <td>Código organizado</td>
                  <td>Estructura de carpetas</td>
                </tr>
                <tr>
                  <td class="table__cell--number"><span class="badge">3</span></td>
                  <td>Repositorio Git con commits</td>
                  <td>GitHub público</td>
                </tr>
                <tr>
                  <td class="table__cell--number"><span class="badge">4</span></td>
                  <td>GitHub Pages publicado</td>
                  <td>URL de despliegue</td>
                </tr>
                <tr>
                  <td class="table__cell--number"><span class="badge">5</span></td>
                  <td>Conclusiones finales</td>
                  <td>Pantalla de conclusiones</td>
                </tr>
                <tr style="font-weight:bold;">
                  <td class="table__cell--number table__cell--highlight"><span class="badge">70</span></td>
                  <td class="table__cell--highlight">TOTAL</td>
                  <td class="table__cell--highlight">Proyecto completo</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- CTA FINAL -->
      <div class="inicio__cta">
        <p class="inicio__cta-texto">¿Listo para simular?</p>
        <button
          class="btn btn--primary btn--large"
          onclick="navegarA('escenario-a')"
          aria-label="Ir al primer escenario"
        >
          Comenzar con Escenario A →
        </button>
      </div>

    </section>
  `;
}

// ============================================================
// FUNCIÓN PRIVADA: genera HTML de una tarjeta de escenario
// ============================================================

/**
 * @param {Object} cfg - Configuración de la tarjeta
 * @param {string} cfg.id        - ID de navegación (ej: 'escenario-a')
 * @param {string} cfg.letra     - Letra del escenario (A-G)
 * @param {string} cfg.icono     - Emoji representativo
 * @param {string} cfg.titulo    - Nombre del escenario
 * @param {string} cfg.metodo    - Método numérico principal
 * @param {string} cfg.algoritmos - Lista de algoritmos
 * @param {string} cfg.descripcion - Descripción breve
 * @param {string} cfg.clase     - Clase CSS del escenario
 * @param {number} cfg.puntos    - Puntos en rúbrica
 * @returns {string} HTML de la tarjeta
 */
function _tarjetaEscenario(cfg) {
  return `
    <article
      class="card ${cfg.clase} inicio__card-escenario"
      role="listitem"
      aria-label="Escenario ${cfg.letra}: ${cfg.titulo}"
    >
      <div class="card__header">
        <div class="inicio__card-header-row">
          <span class="inicio__card-letra" aria-hidden="true">${cfg.icono} ${cfg.letra}</span>
          <span class="badge" title="Puntos en rúbrica">${cfg.puntos} pts</span>
        </div>
        <h3 class="card__title">${cfg.titulo}</h3>
        <span class="inicio__card-metodo">${cfg.metodo}</span>
      </div>
      <div class="card__body">
        <p class="inicio__card-descripcion">${cfg.descripcion}</p>
        <p class="form-help">
          <strong>Algoritmos:</strong> ${cfg.algoritmos}
        </p>
      </div>
      <div class="card__footer">
        <button
          class="btn btn--primary btn--full-width"
          onclick="navegarA('${cfg.id}')"
          aria-label="Ir al escenario ${cfg.letra}"
        >
          Abrir escenario ${cfg.letra}
        </button>
      </div>
    </article>
  `;
}

// ============================================================
// EXPORTAR (para app.js que use módulos, o global si no usa ESM)
// ============================================================
// Si tu app.js usa ES Modules:
// export { renderizarInicio };

// Exponer al ámbito global para el router
window.renderizarInicio = renderizarInicio;
//
// Si es script global (recomendado para este proyecto sin bundler):
// la función ya está en el scope global, app.js la llama directamente.