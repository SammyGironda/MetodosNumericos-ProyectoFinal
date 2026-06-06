// ============================================================
// PANTALLA DE CONCLUSIONES - Simulación Numérica de Crisis
// js/escenarios/conclusiones.js
// PROMPT #29
// ============================================================

/**
 * Renderiza la pantalla de conclusiones en el contenedor principal.
 * Muestra: reflexión académica, aprendizajes por escenario,
 * comparativa de métodos y cierre del proyecto.
 */
function renderizarConclusiones() {
  const contenedor = document.getElementById('contenido-principal');
  if (!contenedor) return;

  contenedor.innerHTML = `
    <section class="conclusiones" id="seccion-conclusiones" aria-label="Conclusiones del proyecto">

      <!-- HERO -->
      <div class="conclusiones__hero">
        <div class="conclusiones__hero-badge">📝 Reflexión Final</div>
        <h1 class="conclusiones__titulo">Conclusiones del Proyecto</h1>
        <p class="conclusiones__subtitulo">
          Análisis crítico de los métodos numéricos aplicados a siete escenarios
          de crisis real: abastecimiento, precios y conflicto social.
        </p>
      </div>

      <!-- RESUMEN EJECUTIVO -->
      <div class="conclusiones__seccion">
        <h2 class="conclusiones__seccion-titulo">🎯 Resumen Ejecutivo</h2>
        <div class="card card--info">
          <div class="card__body">
            <p>
              Este proyecto demostró que los <strong>métodos numéricos clásicos</strong>
              son herramientas poderosas para modelar fenómenos sociales y económicos
              complejos. A través de siete escenarios interactivos, se implementaron
              algoritmos de álgebra lineal, análisis de raíces, interpolación,
              integración numérica y ecuaciones diferenciales ordinarias, aplicados
              a problemas concretos de distribución de recursos, propagación de
              información y evolución de precios en contextos de crisis.
            </p>
            <p style="margin-top: var(--spacing-3); margin-bottom:0;">
              La naturaleza iterativa de estos métodos los hace especialmente
              adecuados para sistemas donde la solución analítica exacta es
              inaccesible o computacionalmente prohibitiva.
            </p>
          </div>
        </div>
      </div>

      <!-- CONCLUSIONES POR ESCENARIO -->
      <div class="conclusiones__seccion">
        <h2 class="conclusiones__seccion-titulo">📊 Conclusiones por Escenario</h2>
        <div class="conclusiones__grid-escenarios">

          ${_tarjetaConclusionEscenario({
            letra: 'A', icono: '⚖️',
            titulo: 'Distribución de Abastecimiento',
            metodo: 'Gauss-Seidel · LU',
            clase: 'card--escenario-a',
            aprendizaje: `
              Los sistemas lineales permiten modelar restricciones simultáneas de
              oferta y demanda entre múltiples nodos de distribución. Gauss-Seidel
              resultó eficiente para matrices dispersas grandes, mientras que la
              descomposición LU fue más estable para sistemas densos y pequeños.
            `,
            limitacion: 'Requiere que la matriz sea diagonalmente dominante para garantizar convergencia en Gauss-Seidel.',
            aplicacion: 'Asignación de suministros médicos en red hospitalaria durante emergencia.'
          })}

          ${_tarjetaConclusionEscenario({
            letra: 'B', icono: '💧',
            titulo: 'Vaciado de Reservas Críticas',
            metodo: 'RK4 · Euler · Heun',
            clase: 'card--escenario-b',
            aprendizaje: `
              Runge-Kutta de orden 4 demostró ser significativamente más preciso que
              Euler y Heun para modelar tasas de consumo variables. Con pasos de
              tiempo h mayores, Euler acumuló errores notables, mientras que RK4
              mantuvo precisión comparable al doble de iteraciones de Euler.
            `,
            limitacion: 'RK4 requiere 4 evaluaciones de función por paso; Euler es más rápido pero menos preciso.',
            aplicacion: 'Predicción del agotamiento de combustible en zonas de corte de suministro.'
          })}

          ${_tarjetaConclusionEscenario({
            letra: 'C', icono: '📈',
            titulo: 'Curva de Precios en Crisis',
            metodo: 'Lagrange · Splines Cúbicos',
            clase: 'card--escenario-c',
            aprendizaje: `
              Los splines cúbicos superaron al polinomio de Lagrange en estabilidad
              para conjuntos de datos con más de 6 puntos, evitando el fenómeno de
              oscilación de Runge. Lagrange fue más simple de implementar pero
              mostró inestabilidad numérica en los extremos del intervalo.
            `,
            limitacion: 'Lagrange no debe usarse con muchos puntos igualmente espaciados: el polinomio oscila en los bordes.',
            aplicacion: 'Estimación del precio de productos básicos en períodos sin datos de mercado.'
          })}

          ${_tarjetaConclusionEscenario({
            letra: 'D', icono: '💰',
            titulo: 'Costo Acumulado de Emergencia',
            metodo: 'Simpson 1/3 · Trapecio',
            clase: 'card--escenario-d',
            aprendizaje: `
              La regla de Simpson 1/3 compuesta ofreció mayor precisión que el
              trapecio con el mismo número de subintervalos, al ajustar parábolas
              en lugar de segmentos lineales. Para funciones suaves, Simpson
              convergió al resultado exacto con la mitad de subintervalos.
            `,
            limitacion: 'Simpson 1/3 requiere número par de subintervalos; el trapecio no tiene esta restricción.',
            aplicacion: 'Cálculo del gasto total en operaciones de emergencia civil con tasa variable.'
          })}

          ${_tarjetaConclusionEscenario({
            letra: 'E', icono: '🚨',
            titulo: 'Umbrales Críticos de Colapso',
            metodo: 'Newton-Raphson · Bisección',
            clase: 'card--escenario-e',
            aprendizaje: `
              Newton-Raphson convergió en 4-6 iteraciones vs. 20-30 de bisección,
              pero falló cuando la derivada fue cercana a cero o la aproximación
              inicial estaba lejos de la raíz. Bisección, aunque más lenta, garantizó
              convergencia absoluta en cualquier intervalo con cambio de signo.
            `,
            limitacion: 'Newton-Raphson puede divergir o ciclar si la función no es suave o la semilla inicial es inadecuada.',
            aplicacion: 'Identificación del punto exacto de quiebre en sistemas de distribución bajo estrés máximo.'
          })}

          ${_tarjetaConclusionEscenario({
            letra: 'F', icono: '📢',
            titulo: 'Propagación de Rumores y Pánico',
            metodo: 'Gauss-Seidel · Número de condición',
            clase: 'card--escenario-f',
            aprendizaje: `
              Las matrices mal condicionadas (número de condición κ >> 1) revelaron
              que pequeñas perturbaciones en los datos iniciales —equivalentes a
              rumores distorsionados— producen variaciones amplificadas en la
              solución. Esto modela fielmente cómo la desinformación se propaga
              de forma no lineal en redes sociales.
            `,
            limitacion: 'Para matrices con κ > 10⁶ el sistema es numéricamente inestable y los resultados deben interpretarse con cautela.',
            aplicacion: 'Análisis de sensibilidad de modelos de opinión pública ante datos erróneos o manipulados.'
          })}

          ${_tarjetaConclusionEscenario({
            letra: 'G', icono: '🌐',
            titulo: 'Difusión de Opinión Social',
            metodo: 'RK4 · Modelo SIR adaptado',
            clase: 'card--escenario-g',
            aprendizaje: `
              El modelo SIR adaptado con RK4 capturó correctamente el pico de
              adopción de una opinión, su decaimiento y el estado de equilibrio.
              La tasa de contacto β y la tasa de recuperación γ resultaron ser
              los parámetros más sensibles: pequeños cambios alteraron
              drásticamente la magnitud y velocidad del pico.
            `,
            limitacion: 'El modelo asume mezcla homogénea de la población, lo cual subestima efectos de red y clustering social.',
            aplicacion: 'Predicción de la velocidad de propagación de protestas o movimientos ciudadanos en contexto urbano.'
          })}

        </div>
      </div>

      <!-- COMPARATIVA DE MÉTODOS -->
      <div class="conclusiones__seccion">
        <h2 class="conclusiones__seccion-titulo">⚡ Comparativa de Métodos</h2>
        <div class="card">
          <div class="card__body" style="overflow-x:auto;">
            <table>
              <thead>
                <tr>
                  <th>Método</th>
                  <th>Orden de convergencia</th>
                  <th>Velocidad</th>
                  <th>Estabilidad</th>
                  <th>Uso recomendado</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>Gauss-Seidel</strong></td>
                  <td class="table__cell--number">Lineal</td>
                  <td>Media</td>
                  <td class="table__cell--highlight">Alta (D. dominante)</td>
                  <td>Sistemas grandes y dispersos</td>
                </tr>
                <tr>
                  <td><strong>LU</strong></td>
                  <td class="table__cell--number">Directa O(n³)</td>
                  <td>Alta</td>
                  <td class="table__cell--highlight">Muy alta</td>
                  <td>Sistemas densos y pequeños</td>
                </tr>
                <tr>
                  <td><strong>Newton-Raphson</strong></td>
                  <td class="table__cell--number">Cuadrática</td>
                  <td>Muy alta</td>
                  <td>Media</td>
                  <td>Raíces con buena semilla inicial</td>
                </tr>
                <tr>
                  <td><strong>Bisección</strong></td>
                  <td class="table__cell--number">Lineal</td>
                  <td>Baja</td>
                  <td class="table__cell--highlight">Muy alta</td>
                  <td>Cuando se necesita garantía absoluta</td>
                </tr>
                <tr>
                  <td><strong>Lagrange</strong></td>
                  <td class="table__cell--number">Exacto en nodos</td>
                  <td>Alta</td>
                  <td>Baja (muchos puntos)</td>
                  <td>Pocos puntos de interpolación</td>
                </tr>
                <tr>
                  <td><strong>Splines cúbicos</strong></td>
                  <td class="table__cell--number">C² continuo</td>
                  <td>Media</td>
                  <td class="table__cell--highlight">Muy alta</td>
                  <td>Curvas suaves con muchos puntos</td>
                </tr>
                <tr>
                  <td><strong>Simpson 1/3</strong></td>
                  <td class="table__cell--number">O(h⁴)</td>
                  <td>Alta</td>
                  <td class="table__cell--highlight">Alta</td>
                  <td>Integración precisa (n par)</td>
                </tr>
                <tr>
                  <td><strong>Trapecio</strong></td>
                  <td class="table__cell--number">O(h²)</td>
                  <td>Muy alta</td>
                  <td class="table__cell--highlight">Alta</td>
                  <td>Integración rápida o n impar</td>
                </tr>
                <tr>
                  <td><strong>Euler</strong></td>
                  <td class="table__cell--number">O(h)</td>
                  <td>Muy alta</td>
                  <td>Baja (h grande)</td>
                  <td>Prototipado rápido de EDOs</td>
                </tr>
                <tr>
                  <td><strong>Heun</strong></td>
                  <td class="table__cell--number">O(h²)</td>
                  <td>Alta</td>
                  <td>Media</td>
                  <td>EDOs simples mejoradas</td>
                </tr>
                <tr>
                  <td><strong>RK4</strong></td>
                  <td class="table__cell--number">O(h⁴)</td>
                  <td>Media</td>
                  <td class="table__cell--highlight">Muy alta</td>
                  <td>EDOs de alta precisión</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- REFLEXIÓN CRÍTICA -->
      <div class="conclusiones__seccion">
        <h2 class="conclusiones__seccion-titulo">🧠 Reflexión Crítica</h2>
        <div class="form-row form-row--2-col">

          <div class="card card--success">
            <div class="card__header">
              <h3 class="card__title">✅ Fortalezas identificadas</h3>
            </div>
            <div class="card__body">
              <ul style="padding-left: var(--spacing-4); line-height: var(--line-height-relaxed);">
                <li>Los métodos iterativos permiten controlar el error con precisión arbitraria mediante la tolerancia.</li>
                <li>La modularidad del código facilita reutilizar algoritmos en diferentes contextos sin modificar el núcleo matemático.</li>
                <li>La visualización con Chart.js permitió identificar patrones de convergencia y comportamiento dinámico de forma intuitiva.</li>
                <li>El enfoque SPA garantizó tiempos de carga mínimos entre escenarios, mejorando la experiencia del usuario.</li>
              </ul>
            </div>
          </div>

          <div class="card card--alert">
            <div class="card__header">
              <h3 class="card__title">⚠️ Limitaciones encontradas</h3>
            </div>
            <div class="card__body">
              <ul style="padding-left: var(--spacing-4); line-height: var(--line-height-relaxed);">
                <li>Los modelos asumen parámetros estacionarios; en crisis reales los coeficientes cambian continuamente.</li>
                <li>La precisión de doble flotante de JavaScript introduce errores de redondeo acumulados en muchas iteraciones.</li>
                <li>Los escenarios simplificaron la dimensionalidad real: sistemas de 3×3 vs. redes con miles de nodos.</li>
                <li>La ausencia de datos históricos reales limitó la validación de los modelos contra resultados conocidos.</li>
              </ul>
            </div>
          </div>

        </div>
      </div>

      <!-- APRENDIZAJES TÉCNICOS -->
      <div class="conclusiones__seccion">
        <h2 class="conclusiones__seccion-titulo">💡 Aprendizajes Técnicos</h2>
        <div class="card">
          <div class="card__body">
            <div class="form-row form-row--3-col">

              <div class="conclusiones__aprendizaje">
                <div class="conclusiones__aprendizaje-icono">🔢</div>
                <h4 class="conclusiones__aprendizaje-titulo">Matemáticas Numéricas</h4>
                <p class="conclusiones__aprendizaje-texto">
                  Comprendimos la diferencia práctica entre convergencia lineal y
                  cuadrática, y cuándo la estabilidad importa más que la velocidad.
                </p>
              </div>

              <div class="conclusiones__aprendizaje">
                <div class="conclusiones__aprendizaje-icono">💻</div>
                <h4 class="conclusiones__aprendizaje-titulo">Programación Vanilla</h4>
                <p class="conclusiones__aprendizaje-texto">
                  Implementar una SPA sin frameworks demostró que el DOM nativo es
                  suficiente para aplicaciones académicas interactivas bien organizadas.
                </p>
              </div>

              <div class="conclusiones__aprendizaje">
                <div class="conclusiones__aprendizaje-icono">📊</div>
                <h4 class="conclusiones__aprendizaje-titulo">Visualización de Datos</h4>
                <p class="conclusiones__aprendizaje-texto">
                  Chart.js facilitó representar procesos iterativos y dinámicos,
                  haciendo visibles patrones que las tablas numéricas no transmiten.
                </p>
              </div>

              <div class="conclusiones__aprendizaje">
                <div class="conclusiones__aprendizaje-icono">🏗️</div>
                <h4 class="conclusiones__aprendizaje-titulo">Arquitectura Modular</h4>
                <p class="conclusiones__aprendizaje-texto">
                  Separar core matemático, lógica de escenarios y UI en capas
                  independientes redujo drásticamente los errores de integración.
                </p>
              </div>

              <div class="conclusiones__aprendizaje">
                <div class="conclusiones__aprendizaje-icono">🧪</div>
                <h4 class="conclusiones__aprendizaje-titulo">Validación Numérica</h4>
                <p class="conclusiones__aprendizaje-texto">
                  Verificar resultados contra ejemplos del libro de texto confirmó
                  la correctitud de los algoritmos antes de integrarlos a los escenarios.
                </p>
              </div>

              <div class="conclusiones__aprendizaje">
                <div class="conclusiones__aprendizaje-icono">🤝</div>
                <h4 class="conclusiones__aprendizaje-titulo">Trabajo Colaborativo</h4>
                <p class="conclusiones__aprendizaje-texto">
                  Git permitió dividir el trabajo (core matemático vs. UI) y
                  fusionar cambios sin conflictos, simulando flujo de trabajo profesional.
                </p>
              </div>

            </div>
          </div>
        </div>
      </div>

      <!-- TRABAJO FUTURO -->
      <div class="conclusiones__seccion">
        <h2 class="conclusiones__seccion-titulo">🚀 Trabajo Futuro</h2>
        <div class="card card--info">
          <div class="card__body">
            <div class="form-row form-row--2-col">
              <div>
                <h4 style="margin-bottom: var(--spacing-2); color: var(--color-primary);">Mejoras matemáticas</h4>
                <ul style="padding-left: var(--spacing-4); line-height: var(--line-height-relaxed); font-size: var(--font-size-sm);">
                  <li>Métodos adaptativos: paso de tiempo variable en RK45</li>
                  <li>Métodos de mayor orden para sistemas rígidos (stiff ODEs)</li>
                  <li>Interpolación con datos con ruido: mínimos cuadrados</li>
                  <li>Sistemas no lineales: Newton multivariable</li>
                </ul>
              </div>
              <div>
                <h4 style="margin-bottom: var(--spacing-2); color: var(--color-primary);">Mejoras de aplicación</h4>
                <ul style="padding-left: var(--spacing-4); line-height: var(--line-height-relaxed); font-size: var(--font-size-sm);">
                  <li>Importar datos reales desde CSV para calibrar modelos</li>
                  <li>Exportar resultados y gráficos en PDF</li>
                  <li>Comparador lado a lado de dos métodos en el mismo escenario</li>
                  <li>Análisis de sensibilidad automatizado de parámetros</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- CIERRE -->
      <div class="conclusiones__cierre">
        <div class="conclusiones__cierre-contenido">
          <p class="conclusiones__cierre-cita">
            "Los métodos numéricos no son sustitutos del pensamiento matemático,
            sino herramientas que lo amplifican cuando los problemas reales
            superan los límites de la solución analítica."
          </p>
          <p class="conclusiones__cierre-autoria">
            Proyecto — Métodos Numéricos Aplicados &nbsp;·&nbsp; 2025
          </p>
          <button
            class="btn btn--primary btn--large"
            onclick="navegarA('inicio')"
            aria-label="Volver al inicio"
            style="margin-top: var(--spacing-6);"
          >
            ← Volver al inicio
          </button>
        </div>
      </div>

    </section>
  `;
}

// Exponer al ámbito global para el router
window.renderizarConclusiones = renderizarConclusiones;

// ============================================================
// FUNCIÓN PRIVADA: tarjeta de conclusión por escenario
// ============================================================

/**
 * @param {Object} cfg
 * @param {string} cfg.letra
 * @param {string} cfg.icono
 * @param {string} cfg.titulo
 * @param {string} cfg.metodo
 * @param {string} cfg.clase        - clase CSS del escenario
 * @param {string} cfg.aprendizaje  - párrafo de aprendizaje
 * @param {string} cfg.limitacion   - limitación principal
 * @param {string} cfg.aplicacion   - aplicación práctica
 * @returns {string} HTML de la tarjeta
 */
function _tarjetaConclusionEscenario(cfg) {
  return `
    <article class="card ${cfg.clase} conclusiones__card" aria-label="Conclusión escenario ${cfg.letra}">
      <div class="card__header">
        <div class="inicio__card-header-row">
          <span class="inicio__card-letra" aria-hidden="true">${cfg.icono} ${cfg.letra}</span>
          <span class="badge">${cfg.metodo}</span>
        </div>
        <h3 class="card__title">${cfg.titulo}</h3>
      </div>
      <div class="card__body">
        <p style="font-size: var(--font-size-sm); line-height: var(--line-height-relaxed); margin-bottom: var(--spacing-3);">
          ${cfg.aprendizaje.trim()}
        </p>
        <div class="alert alert--warning" style="font-size: var(--font-size-sm); padding: var(--spacing-2) var(--spacing-3); margin-bottom: var(--spacing-2);">
          <strong>Limitación:</strong> ${cfg.limitacion}
        </div>
        <div class="alert alert--info" style="font-size: var(--font-size-sm); padding: var(--spacing-2) var(--spacing-3); margin-bottom:0;">
          <strong>Aplicación:</strong> ${cfg.aplicacion}
        </div>
      </div>
    </article>
  `;
}