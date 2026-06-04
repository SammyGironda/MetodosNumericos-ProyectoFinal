// ============================================================
// escenarioA.js - Escenario A: Distribución de Abastecimiento
// Métodos: Gauss-Seidel + Eliminación Gaussiana (LU simplificado)
// Contexto: Optimizar distribución de recursos entre zonas en crisis
// ============================================================

import { gaussSeidel, eliminacionGaussiana } from '../core/sistemasLineales.js';
import { crearGraficoBarras, crearGraficoLineas, destruirGrafico } from '../ui/graficos.js';
import { renderizarTablaIteraciones, renderizarTablaResultados } from '../ui/tablas.js';
import { validarMatriz, validarVector, mostrarError, limpiarErrores } from '../ui/formularios.js';
import { mostrarNotificacion } from '../ui/notificaciones.js';
import { IDS, LIMITES } from '../constantes.js';

// ------------------------------------------------------------
// ESTADO LOCAL DEL ESCENARIO
// ------------------------------------------------------------
const estado = {
  metodoActual: 'gauss-seidel',
  resultados: null,
  graficos: {},
};

// ------------------------------------------------------------
// DATOS DE EJEMPLO PRECARGADOS
// Contexto: 3 zonas de la ciudad necesitan recursos
// A·x = b  donde:
//   x = [x1, x2, x3] toneladas a enviar a cada zona
//   A = coeficientes de restricciones (capacidad vías, demanda compartida)
//   b = necesidades netas por zona
// ------------------------------------------------------------
const EJEMPLO_PREDETERMINADO = {
  n: 3,
  A: [
    [10, -1,  2],
    [-1,  11, -1],
    [ 2,  -1,  10],
  ],
  b: [6, 25, -11],
  descripcion: [
    'Zona Norte: capacidad vía principal 10t, interferencia zona centro -1t, apoyo zona sur 2t = 6t netas',
    'Zona Centro: interferencia norte -1t, capacidad central 11t, interferencia sur -1t = 25t demanda',
    'Zona Sur: apoyo norte 2t, interferencia centro -1t, capacidad sur 10t = -11t (excedente redistribuible)',
  ],
};

// ------------------------------------------------------------
// RENDER PRINCIPAL DEL ESCENARIO
// Llamado desde app.js cuando el usuario navega a #escenario-a
// ------------------------------------------------------------
export function renderizarEscenarioA(contenedor) {
  limpiarGraficos();
  estado.resultados = null;

  contenedor.innerHTML = generarHTML();
  adjuntarEventos();
  cargarEjemploPredeterminado();
}

// ------------------------------------------------------------
// GENERACIÓN DEL HTML DEL ESCENARIO
// ------------------------------------------------------------
function generarHTML() {
  return `
    <!-- ENCABEZADO DEL ESCENARIO -->
    <div class="escenario-header escenario-header--a">
      <div class="escenario-header__badge">Escenario A</div>
      <h1 class="escenario-header__titulo">Distribución de Abastecimiento en Crisis</h1>
      <p class="escenario-header__descripcion">
        Durante una crisis de desabastecimiento, múltiples zonas urbanas compiten por recursos limitados.
        Modelamos la distribución óptima como un <strong>sistema de ecuaciones lineales</strong> 
        donde cada ecuación representa las restricciones de una zona (capacidad de vías, demanda compartida, 
        interferencias logísticas).
      </p>
      <div class="escenario-header__metodos">
        <span class="badge badge--metodo">Gauss-Seidel</span>
        <span class="badge badge--metodo">Eliminación Gaussiana</span>
        <span class="badge badge--contexto">Sistemas Lineales</span>
      </div>
    </div>

    <!-- CONTEXTO MATEMÁTICO -->
    <div class="card card--info mb-4">
      <div class="card__header">
        <h2 class="card__title">📐 Modelo Matemático</h2>
      </div>
      <div class="card__body">
        <p>Dado un sistema <strong>A·x = b</strong> donde:</p>
        <ul class="lista-modelo">
          <li><strong>A</strong> = Matriz de coeficientes (restricciones logísticas entre zonas)</li>
          <li><strong>x</strong> = Vector solución (toneladas a distribuir por zona)</li>
          <li><strong>b</strong> = Vector de necesidades netas por zona</li>
        </ul>
        <p class="mt-2">
          <strong>Gauss-Seidel</strong> es iterativo: ideal cuando la matriz es <em>diagonal dominante</em> 
          (cada zona depende principalmente de su propia capacidad). 
          <strong>Eliminación Gaussiana</strong> es directo: garantiza solución exacta en sistemas bien condicionados.
        </p>
      </div>
    </div>

    <!-- CONFIGURACIÓN DEL SISTEMA -->
    <div class="card mb-4">
      <div class="card__header">
        <h2 class="card__title">⚙️ Configurar Sistema</h2>
      </div>
      <div class="card__body">

        <!-- Selector de tamaño y método -->
        <div class="form-row form-row--3-col">
          <div class="form-group">
            <label class="form-label" for="escA-n">Número de zonas (n)</label>
            <select class="form-input" id="escA-n">
              <option value="2">2 zonas</option>
              <option value="3" selected>3 zonas</option>
              <option value="4">4 zonas</option>
              <option value="5">5 zonas</option>
            </select>
            <span class="form-help">Tamaño del sistema n×n</span>
          </div>

          <div class="form-group">
            <label class="form-label" for="escA-metodo">Método de resolución</label>
            <select class="form-input" id="escA-metodo">
              <option value="gauss-seidel" selected>Gauss-Seidel (iterativo)</option>
              <option value="gaussiana">Eliminación Gaussiana (directo)</option>
            </select>
          </div>

          <div class="form-group" id="escA-tolerancia-grupo">
            <label class="form-label" for="escA-tolerancia">Tolerancia (Gauss-Seidel)</label>
            <input type="number" class="form-input" id="escA-tolerancia"
              value="0.0001" min="0.000001" max="0.1" step="0.000001">
            <span class="form-help">Error máximo permitido entre iteraciones</span>
          </div>
        </div>

        <!-- Botón cargar ejemplo -->
        <div class="form-button-group mb-3">
          <button class="btn btn--secondary btn--small" id="escA-btn-ejemplo">
            📋 Cargar Ejemplo de Crisis
          </button>
          <button class="btn btn--secondary btn--small" id="escA-btn-limpiar">
            🗑️ Limpiar
          </button>
        </div>

        <!-- Descripción del ejemplo -->
        <div id="escA-descripcion-ejemplo" class="alert alert--info mb-3" style="display:none;">
          <strong>Contexto del ejemplo cargado:</strong>
          <ul id="escA-lista-descripcion" class="mt-1"></ul>
        </div>

        <!-- Matriz A (generada dinámicamente) -->
        <div class="form-group">
          <label class="form-label">Matriz de coeficientes A</label>
          <div id="escA-matriz-container" class="matriz-container">
            <!-- Generado dinámicamente por JS -->
          </div>
          <span id="escA-error-matriz" class="form-error" style="display:none;"></span>
        </div>

        <!-- Vector b -->
        <div class="form-group mt-3">
          <label class="form-label">Vector de necesidades b</label>
          <div id="escA-vector-container" class="vector-container">
            <!-- Generado dinámicamente por JS -->
          </div>
          <span id="escA-error-vector" class="form-error" style="display:none;"></span>
        </div>

        <!-- Botón calcular -->
        <div class="form-button-group mt-4">
          <button class="btn btn--primary btn--large" id="escA-btn-calcular">
            🔢 Calcular Distribución
          </button>
        </div>
      </div>
    </div>

    <!-- ZONA DE RESULTADOS (oculta hasta calcular) -->
    <div id="escA-resultados" style="display:none;">

      <!-- Tabla de solución -->
      <div class="card mb-4">
        <div class="card__header">
          <h2 class="card__title">✅ Solución: Distribución Óptima</h2>
        </div>
        <div class="card__body">
          <div id="escA-tabla-solucion"></div>
          <div id="escA-verificacion" class="mt-3"></div>
        </div>
      </div>

      <!-- Gráfico de distribución -->
      <div class="card mb-4">
        <div class="card__header">
          <h2 class="card__title">📊 Distribución por Zona</h2>
        </div>
        <div class="card__body">
          <div class="grafico-container">
            <canvas id="escA-grafico-barras"></canvas>
          </div>
        </div>
      </div>

      <!-- Tabla de iteraciones (solo Gauss-Seidel) -->
      <div id="escA-iteraciones-card" class="card mb-4" style="display:none;">
        <div class="card__header">
          <h2 class="card__title">🔄 Historial de Iteraciones</h2>
          <button class="btn btn--small btn--secondary" id="escA-btn-toggle-iter">
            Mostrar/Ocultar
          </button>
        </div>
        <div class="card__body" id="escA-iteraciones-body">
          <div id="escA-tabla-iteraciones"></div>
          <div class="grafico-container mt-4">
            <canvas id="escA-grafico-convergencia"></canvas>
          </div>
        </div>
      </div>

      <!-- Interpretación automática -->
      <div class="card card--escenario-a mb-4">
        <div class="card__header">
          <h2 class="card__title">💡 Interpretación de Resultados</h2>
        </div>
        <div class="card__body">
          <div id="escA-interpretacion"></div>
        </div>
      </div>

    </div>
  `;
}

// ------------------------------------------------------------
// ADJUNTAR EVENTOS AL DOM
// ------------------------------------------------------------
function adjuntarEventos() {
  // Cambio de tamaño n → regenerar inputs
  document.getElementById('escA-n')
    .addEventListener('change', (e) => {
      regenerarInputs(parseInt(e.target.value));
      ocultarResultados();
    });

  // Cambio de método → mostrar/ocultar tolerancia
  document.getElementById('escA-metodo')
    .addEventListener('change', (e) => {
      estado.metodoActual = e.target.value;
      const grupoTol = document.getElementById('escA-tolerancia-grupo');
      grupoTol.style.display = e.target.value === 'gauss-seidel' ? 'block' : 'none';
      ocultarResultados();
    });

  // Botón cargar ejemplo
  document.getElementById('escA-btn-ejemplo')
    .addEventListener('click', cargarEjemploPredeterminado);

  // Botón limpiar
  document.getElementById('escA-btn-limpiar')
    .addEventListener('click', limpiarFormulario);

  // Botón calcular
  document.getElementById('escA-btn-calcular')
    .addEventListener('click', ejecutarCalculo);

  // Toggle iteraciones
  document.getElementById('escA-btn-toggle-iter')?.addEventListener('click', () => {
    const body = document.getElementById('escA-iteraciones-body');
    if (body) body.style.display = body.style.display === 'none' ? 'block' : 'none';
  });
}

// ------------------------------------------------------------
// GENERACIÓN DINÁMICA DE INPUTS
// ------------------------------------------------------------
function regenerarInputs(n) {
  const matrizContainer = document.getElementById('escA-matriz-container');
  const vectorContainer = document.getElementById('escA-vector-container');

  // Generar tabla de matriz A
  let htmlMatriz = `<table class="tabla-inputs-matriz" aria-label="Matriz de coeficientes A">`;
  htmlMatriz += `<thead><tr><th></th>${Array.from({length: n}, (_, j) =>
    `<th>Zona ${j + 1}</th>`).join('')}</tr></thead><tbody>`;

  for (let i = 0; i < n; i++) {
    htmlMatriz += `<tr><th>Zona ${i + 1}</th>`;
    for (let j = 0; j < n; j++) {
      htmlMatriz += `
        <td>
          <input type="number" 
            class="form-input form-input--matrix" 
            id="escA-a-${i}-${j}"
            placeholder="a${i+1}${j+1}"
            step="any"
            aria-label="Coeficiente fila ${i+1} columna ${j+1}">
        </td>`;
    }
    htmlMatriz += `</tr>`;
  }
  htmlMatriz += `</tbody></table>`;
  matrizContainer.innerHTML = htmlMatriz;

  // Generar vector b
  let htmlVector = `<div class="vector-inputs">`;
  for (let i = 0; i < n; i++) {
    htmlVector += `
      <div class="form-group form-group--inline">
        <label class="form-label" for="escA-b-${i}">b${i+1} (Zona ${i + 1})</label>
        <input type="number" 
          class="form-input" 
          id="escA-b-${i}"
          placeholder="Necesidad zona ${i+1}"
          step="any"
          aria-label="Necesidad zona ${i+1}">
      </div>`;
  }
  htmlVector += `</div>`;
  vectorContainer.innerHTML = htmlVector;
}

// ------------------------------------------------------------
// CARGAR EJEMPLO PREDETERMINADO
// ------------------------------------------------------------
function cargarEjemploPredeterminado() {
  const { n, A, b, descripcion } = EJEMPLO_PREDETERMINADO;

  // Actualizar selector n
  document.getElementById('escA-n').value = n;
  regenerarInputs(n);

  // Llenar matriz A
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const input = document.getElementById(`escA-a-${i}-${j}`);
      if (input) input.value = A[i][j];
    }
  }

  // Llenar vector b
  for (let i = 0; i < n; i++) {
    const input = document.getElementById(`escA-b-${i}`);
    if (input) input.value = b[i];
  }

  // Mostrar descripción contextual
  const divDesc = document.getElementById('escA-descripcion-ejemplo');
  const lista = document.getElementById('escA-lista-descripcion');
  lista.innerHTML = descripcion.map(d => `<li>${d}</li>`).join('');
  divDesc.style.display = 'block';

  mostrarNotificacion('Ejemplo de crisis cargado correctamente', 'info');
  ocultarResultados();
}

// ------------------------------------------------------------
// LIMPIAR FORMULARIO
// ------------------------------------------------------------
function limpiarFormulario() {
  const n = parseInt(document.getElementById('escA-n').value);
  regenerarInputs(n);
  document.getElementById('escA-descripcion-ejemplo').style.display = 'none';
  limpiarErrores(['escA-error-matriz', 'escA-error-vector']);
  ocultarResultados();
}

// ------------------------------------------------------------
// LEER DATOS DEL FORMULARIO
// ------------------------------------------------------------
function leerDatosFormulario() {
  const n = parseInt(document.getElementById('escA-n').value);
  const A = [];
  const b = [];

  for (let i = 0; i < n; i++) {
    A.push([]);
    for (let j = 0; j < n; j++) {
      const val = parseFloat(document.getElementById(`escA-a-${i}-${j}`)?.value);
      A[i].push(val);
    }
    const bVal = parseFloat(document.getElementById(`escA-b-${i}`)?.value);
    b.push(bVal);
  }

  return { n, A, b };
}

// ------------------------------------------------------------
// VALIDACIONES ESPECÍFICAS DEL ESCENARIO
// ------------------------------------------------------------
function validarDatos(n, A, b) {
  const errores = [];

  // Validar que no haya NaN
  const errorMatriz = validarMatriz(A, n);
  if (errorMatriz) errores.push({ campo: 'escA-error-matriz', msg: errorMatriz });

  const errorVector = validarVector(b, n);
  if (errorVector) errores.push({ campo: 'escA-error-vector', msg: errorVector });

  if (errores.length > 0) {
    errores.forEach(({ campo, msg }) => mostrarError(campo, msg));
    return false;
  }

  // Advertir si NO es diagonal dominante (Gauss-Seidel puede no converger)
  if (estado.metodoActual === 'gauss-seidel') {
    const esDiagDominante = verificarDiagonalDominante(A, n);
    if (!esDiagDominante) {
      mostrarNotificacion(
        '⚠️ La matriz no es estrictamente diagonal dominante. ' +
        'Gauss-Seidel puede no converger. Considera usar Eliminación Gaussiana.',
        'warning'
      );
    }
  }

  limpiarErrores(['escA-error-matriz', 'escA-error-vector']);
  return true;
}

// ------------------------------------------------------------
// VERIFICAR DIAGONAL DOMINANTE
// Una matriz es diagonal dominante si para cada fila i:
// |a_ii| > Σ |a_ij| para j ≠ i
// ------------------------------------------------------------
function verificarDiagonalDominante(A, n) {
  for (let i = 0; i < n; i++) {
    let sumFuera = 0;
    for (let j = 0; j < n; j++) {
      if (i !== j) sumFuera += Math.abs(A[i][j]);
    }
    if (Math.abs(A[i][i]) <= sumFuera) return false;
  }
  return true;
}

// ------------------------------------------------------------
// EJECUTAR CÁLCULO PRINCIPAL
// ------------------------------------------------------------
function ejecutarCalculo() {
  limpiarErrores(['escA-error-matriz', 'escA-error-vector']);

  const { n, A, b } = leerDatosFormulario();

  if (!validarDatos(n, A, b)) return;

  const metodo = document.getElementById('escA-metodo').value;
  const tolerancia = parseFloat(document.getElementById('escA-tolerancia').value) || 0.0001;
  const maxIter = LIMITES?.MAX_ITERACIONES || 100;

  let resultado;

  try {
    if (metodo === 'gauss-seidel') {
      resultado = gaussSeidel(A, b, tolerancia, maxIter);
    } else {
      resultado = eliminacionGaussiana(A, b);
    }
  } catch (err) {
    mostrarNotificacion(`Error en el cálculo: ${err.message}`, 'error');
    return;
  }

  if (!resultado || !resultado.solucion) {
    mostrarNotificacion('El sistema no tiene solución única o no convergió.', 'error');
    return;
  }

  estado.resultados = { ...resultado, n, A, b, metodo };
  renderizarResultados();
  mostrarNotificacion('✅ Cálculo completado exitosamente', 'success');
}

// ------------------------------------------------------------
// RENDERIZAR TODOS LOS RESULTADOS
// ------------------------------------------------------------
function renderizarResultados() {
  const { solucion, iteraciones, n, A, b, metodo } = estado.resultados;

  // Mostrar sección de resultados
  document.getElementById('escA-resultados').style.display = 'block';
  document.getElementById('escA-resultados').scrollIntoView({ behavior: 'smooth' });

  // 1. Tabla de solución
  renderizarTablaSolucion(solucion, n);

  // 2. Verificación A·x = b
  renderizarVerificacion(A, solucion, b, n);

  // 3. Gráfico de barras - distribución
  renderizarGraficoDistribucion(solucion, n);

  // 4. Iteraciones (solo Gauss-Seidel)
  if (metodo === 'gauss-seidel' && iteraciones && iteraciones.length > 0) {
    document.getElementById('escA-iteraciones-card').style.display = 'block';
    renderizarTablaIteraciones(
      document.getElementById('escA-tabla-iteraciones'),
      iteraciones,
      solucion.length
    );
    renderizarGraficoConvergencia(iteraciones, solucion.length);
  } else {
    document.getElementById('escA-iteraciones-card').style.display = 'none';
  }

  // 5. Interpretación automática
  renderizarInterpretacion(solucion, n, metodo, iteraciones);
}

// ------------------------------------------------------------
// TABLA DE SOLUCIÓN
// ------------------------------------------------------------
function renderizarTablaSolucion(solucion, n) {
  const contenedor = document.getElementById('escA-tabla-solucion');

  let html = `
    <table class="tabla-resultados" aria-label="Solución del sistema">
      <thead>
        <tr>
          <th>Zona</th>
          <th>Variable</th>
          <th class="table__cell--number">Toneladas a distribuir</th>
          <th>Situación</th>
        </tr>
      </thead>
      <tbody>
  `;

  solucion.forEach((val, i) => {
    const toneladas = parseFloat(val.toFixed(6));
    let situacion, clase;

    if (toneladas < 0) {
      situacion = '⬇️ Excedente (puede redistribuir)';
      clase = 'table__cell--highlight';
    } else if (toneladas > 50) {
      situacion = '🚨 Alta demanda crítica';
      clase = 'table__cell--error';
    } else if (toneladas > 20) {
      situacion = '⚠️ Demanda elevada';
      clase = '';
    } else {
      situacion = '✅ Demanda normal';
      clase = '';
    }

    html += `
      <tr>
        <td><strong>Zona ${i + 1}</strong></td>
        <td>x<sub>${i + 1}</sub></td>
        <td class="table__cell--number ${clase}">${toneladas.toFixed(4)}</td>
        <td>${situacion}</td>
      </tr>
    `;
  });

  html += `</tbody></table>`;
  contenedor.innerHTML = html;
}

// ------------------------------------------------------------
// VERIFICACIÓN: calcular A·x y comparar con b
// ------------------------------------------------------------
function renderizarVerificacion(A, solucion, b, n) {
  const contenedor = document.getElementById('escA-verificacion');
  const Ax = A.map(fila => fila.reduce((sum, aij, j) => sum + aij * solucion[j], 0));
  const errores = Ax.map((val, i) => Math.abs(val - b[i]));
  const errorMax = Math.max(...errores);
  const esExacto = errorMax < 1e-6;

  let html = `
    <div class="alert ${esExacto ? 'alert--success' : 'alert--warning'}">
      <strong>Verificación A·x = b</strong>: 
      Error máximo = ${errorMax.toExponential(4)} 
      ${esExacto ? '✅ Solución exacta' : '⚠️ Error residual (normal en métodos iterativos)'}
    </div>
    <table class="tabla-resultados mt-2" aria-label="Verificación de la solución">
      <thead>
        <tr>
          <th>Zona</th>
          <th class="table__cell--number">b (necesidad real)</th>
          <th class="table__cell--number">A·x (calculado)</th>
          <th class="table__cell--number">Error residual</th>
        </tr>
      </thead>
      <tbody>
  `;

  for (let i = 0; i < n; i++) {
    html += `
      <tr>
        <td>Zona ${i + 1}</td>
        <td class="table__cell--number">${b[i].toFixed(4)}</td>
        <td class="table__cell--number">${Ax[i].toFixed(4)}</td>
        <td class="table__cell--number ${errores[i] > 1e-4 ? 'table__cell--error' : ''}">
          ${errores[i].toExponential(4)}
        </td>
      </tr>
    `;
  }

  html += `</tbody></table>`;
  contenedor.innerHTML = html;
}

// ------------------------------------------------------------
// GRÁFICO DE BARRAS - DISTRIBUCIÓN POR ZONA
// ------------------------------------------------------------
function renderizarGraficoDistribucion(solucion, n) {
  limpiarGrafico('escA-grafico-barras');

  const etiquetas = Array.from({ length: n }, (_, i) => `Zona ${i + 1}`);
  const colores = solucion.map(val =>
    val < 0 ? '#6C8C74' : val > 50 ? '#D97059' : val > 20 ? '#F29966' : '#3E594F'
  );

  estado.graficos['barras'] = crearGraficoBarras(
    'escA-grafico-barras',
    {
      labels: etiquetas,
      datasets: [{
        label: 'Toneladas a distribuir',
        data: solucion.map(v => parseFloat(v.toFixed(4))),
        backgroundColor: colores,
        borderColor: colores.map(c => c + 'CC'),
        borderWidth: 2,
        borderRadius: 4,
      }],
    },
    {
      plugins: {
        title: {
          display: true,
          text: 'Distribución de Recursos por Zona (toneladas)',
          font: { size: 14 },
        },
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => ` ${ctx.parsed.y.toFixed(4)} toneladas`,
          },
        },
      },
      scales: {
        y: {
          title: { display: true, text: 'Toneladas' },
          beginAtZero: true,
        },
        x: {
          title: { display: true, text: 'Zonas' },
        },
      },
    }
  );
}

// ------------------------------------------------------------
// GRÁFICO DE CONVERGENCIA (solo Gauss-Seidel)
// Muestra cómo cada variable converge a su valor final
// ------------------------------------------------------------
function renderizarGraficoConvergencia(iteraciones, nVars) {
  limpiarGrafico('escA-grafico-convergencia');

  const coloresLineas = ['#3E594F', '#6C8C74', '#F29966', '#D97059', '#C9D7A6'];
  const etiquetasIter = iteraciones.map((_, i) => `Iter ${i + 1}`);

  const datasets = Array.from({ length: nVars }, (_, v) => ({
    label: `x${v + 1} (Zona ${v + 1})`,
    data: iteraciones.map(iter => parseFloat(iter.valores[v].toFixed(6))),
    borderColor: coloresLineas[v % coloresLineas.length],
    backgroundColor: coloresLineas[v % coloresLineas.length] + '20',
    tension: 0.3,
    fill: false,
    pointRadius: iteraciones.length <= 20 ? 4 : 2,
  }));

  estado.graficos['convergencia'] = crearGraficoLineas(
    'escA-grafico-convergencia',
    { labels: etiquetasIter, datasets },
    {
      plugins: {
        title: {
          display: true,
          text: 'Convergencia de Gauss-Seidel por Variable',
          font: { size: 14 },
        },
      },
      scales: {
        y: { title: { display: true, text: 'Valor de la variable' } },
        x: { title: { display: true, text: 'Iteración' } },
      },
    }
  );
}

// ------------------------------------------------------------
// INTERPRETACIÓN AUTOMÁTICA CONTEXTUALIZADA
// ------------------------------------------------------------
function renderizarInterpretacion(solucion, n, metodo, iteraciones) {
  const contenedor = document.getElementById('escA-interpretacion');

  const zonaMaxima = solucion.indexOf(Math.max(...solucion));
  const zonaMinima = solucion.indexOf(Math.min(...solucion));
  const hayExcedente = solucion.some(v => v < 0);
  const totalToneladas = solucion.filter(v => v > 0).reduce((a, b) => a + b, 0);

  const numIter = iteraciones ? iteraciones.length : 'N/A';
  const metodoNombre = metodo === 'gauss-seidel' ? 'Gauss-Seidel' : 'Eliminación Gaussiana';

  let html = `
    <div class="interpretacion-grid">

      <div class="interpretacion-item">
        <h3>📦 Distribución Total</h3>
        <p>
          El sistema requiere distribuir un total de <strong>${totalToneladas.toFixed(2)} toneladas</strong>
          entre ${n} zonas de la ciudad. La zona con mayor necesidad es 
          <strong>Zona ${zonaMaxima + 1}</strong> con ${solucion[zonaMaxima].toFixed(4)} toneladas,
          mientras que <strong>Zona ${zonaMinima + 1}</strong> presenta la menor demanda
          (${solucion[zonaMinima].toFixed(4)} toneladas).
        </p>
      </div>

      ${hayExcedente ? `
      <div class="interpretacion-item interpretacion-item--destacado">
        <h3>♻️ Zonas con Excedente</h3>
        <p>
          Las zonas con valores negativos tienen <strong>excedente disponible</strong> para redistribuir
          a otras zonas. En contexto de crisis, esto permite optimizar la logística
          priorizando rutas desde zonas excedentarias hacia las deficitarias.
        </p>
      </div>
      ` : ''}

      <div class="interpretacion-item">
        <h3>🔢 Método: ${metodoNombre}</h3>
        <p>
          ${metodo === 'gauss-seidel'
            ? `El método iterativo convergió en <strong>${numIter} iteraciones</strong>.
               Cada iteración actualiza cada variable usando los valores más recientes de las otras,
               lo que acelera la convergencia en sistemas diagonalmente dominantes.
               Ideal para sistemas grandes donde la factorización directa sería costosa.`
            : `La eliminación gaussiana resolvió el sistema de forma <strong>exacta y directa</strong>
               en un único paso (sin iteraciones). Transforma la matriz A en forma triangular superior
               y luego aplica sustitución regresiva para obtener x. Recomendado cuando se requiere
               precisión máxima.`
          }
        </p>
      </div>

      <div class="interpretacion-item">
        <h3>🏙️ Recomendación Logística</h3>
        <p>
          Para gestionar la crisis de abastecimiento, se recomienda priorizar el envío a 
          <strong>Zona ${zonaMaxima + 1}</strong>. Las autoridades deben establecer corredores 
          humanitarios que respeten las capacidades de transporte modeladas en la matriz A.
          La solución matemática garantiza que se satisfacen todas las restricciones logísticas 
          simultáneamente.
        </p>
      </div>

    </div>
  `;

  contenedor.innerHTML = html;
}

// ------------------------------------------------------------
// HELPERS: Ocultar resultados, limpiar gráficos
// ------------------------------------------------------------
function ocultarResultados() {
  const res = document.getElementById('escA-resultados');
  if (res) res.style.display = 'none';
}

function limpiarGrafico(id) {
  destruirGrafico(id);
}

function limpiarGraficos() {
  Object.keys(estado.graficos).forEach(key => {
    if (estado.graficos[key]) {
      try { estado.graficos[key].destroy(); } catch (_) {}
      estado.graficos[key] = null;
    }
  });
}