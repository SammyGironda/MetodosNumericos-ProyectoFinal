# 🌐 Simulación Numérica de Crisis
### Métodos Numéricos Aplicados — Proyecto Final

Aplicación web interactiva (SPA) que simula **7 escenarios de crisis** usando métodos numéricos reales: sistemas lineales, raíces de ecuaciones, interpolación, integración y ecuaciones diferenciales.

🔗 **[Ver demo en GitHub Pages](https://sammygironda.github.io/MetodosNumericos-ProyectoFinal/)**

---

## 📋 Tabla de contenidos

- [Descripción](#descripción)
- [Escenarios](#escenarios)
- [Métodos implementados](#métodos-implementados)
- [Estructura del proyecto](#estructura-del-proyecto)
- [Instalación y uso](#instalación-y-uso)
- [Tecnologías](#tecnologías)
- [Autores](#autores)

---

## Descripción

Este proyecto aplica métodos numéricos a situaciones reales de crisis social y económica: escasez de alimentos, colapso de reservas, inflación de precios, propagación de rumores y conflictos sociales.

Cada escenario permite al usuario ingresar parámetros, ejecutar el algoritmo correspondiente y visualizar los resultados en tablas y gráficas interactivas con interpretación automática.

---

## Escenarios

| # | Escenario | Problema real | Método |
|---|-----------|---------------|--------|
| A | **Distribución de abastecimiento** | Asignación óptima de recursos entre zonas | Gauss-Seidel / Eliminación LU |
| B | **Vaciado de reservas** | Proyección de agotamiento de inventario | Runge-Kutta 4 / Euler |
| C | **Curva de precios** | Estimación de precios en mercado informal | Lagrange / Splines cúbicos |
| D | **Costo acumulado** | Gasto total durante período de crisis | Simpson / Trapecio |
| E | **Umbrales críticos** | Punto de quiebre en conflicto social | Newton-Raphson / Bisección |
| F | **Propagación de rumores** | Modelo de pánico en red social | Sistemas mal condicionados |
| G | **Difusión de opinión** | Evolución de posiciones en conflicto | Heun / RK4 |

---

## Métodos implementados

### Sistemas de ecuaciones lineales
- **Gauss-Seidel** — iterativo, con criterio de convergencia configurable
- **Factorización LU** — directo, con pivoteo parcial

### Raíces de ecuaciones
- **Newton-Raphson** — convergencia cuadrática, requiere derivada
- **Bisección** — robusto, garantiza convergencia en intervalo

### Interpolación
- **Lagrange** — polinomio interpolante de grado n
- **Splines cúbicos** — interpolación suave por tramos

### Integración numérica
- **Regla de Simpson 1/3** — precisión O(h⁴)
- **Regla del Trapecio** — precisión O(h²), comparativa

### Ecuaciones diferenciales ordinarias
- **Runge-Kutta 4 (RK4)** — método estándar, error O(h⁵)
- **Euler explícito** — referencia, error O(h²)
- **Heun (RK2)** — predictor-corrector, error O(h³)

---

## Estructura del proyecto

```
proyecto-metodos-numericos/
│
├── index.html                 # SPA — punto de entrada único
├── README.md
├── .gitignore
│
├── css/
│   ├── variables.css          # Variables CSS globales
│   ├── base.css               # Reset + tipografía
│   ├── layout.css             # Sidebar + contenido principal
│   ├── componentes.css        # Botones, cards, tablas, alertas
│   ├── responsivo.css         # Media queries
│   └── sidebar.css            # Navegación lateral
│
├── js/
│   ├── main.js                # Router SPA + inicialización
│   ├── sidebar.js             # Generador de menú dinámico
│   ├── constantes.js          # IDs, rutas, configuración
│   │
│   ├── core/                  # Algoritmos matemáticos puros
│   │   ├── sistemasLineales.js
│   │   ├── raicesEcuaciones.js
│   │   ├── interpolacion.js
│   │   ├── integracion.js
│   │   ├── ecuacionesDiferenciales.js
│   │   └── utilidades.js
│   │
│   ├── escenarios/            # Lógica + UI de cada escenario
│   │   ├── escenarioA.js
│   │   ├── escenarioB.js
│   │   ├── escenarioC.js
│   │   ├── escenarioD.js
│   │   ├── escenarioE.js
│   │   ├── escenarioF.js
│   │   └── escenarioG.js
│   │
│   └── ui/                    # Componentes de interfaz
│       ├── graficos.js
│       ├── tablas.js
│       ├── formularios.js
│       └── notificaciones.js
│
└── data/
    └── ejemplos.json          # Datos precargados por escenario
```

---

## Instalación y uso

### Opción 1 — GitHub Pages (recomendado)
Accede directamente al link de demo arriba. No requiere instalación.

### Opción 2 — Local
```bash
# Clonar repositorio
git clone https://github.com/TU_USUARIO/proyecto-metodos-numericos.git

# Entrar al directorio
cd proyecto-metodos-numericos

# Abrir con Live Server (VS Code) o cualquier servidor local
# NO abrir index.html directamente con doble clic (rutas relativas)
```

> **Nota**: Se recomienda usar la extensión **Live Server** de VS Code, o `python -m http.server 8080` desde la raíz del proyecto.

### Uso de la aplicación

1. Seleccionar un escenario en el menú lateral
2. Leer el contexto del problema
3. Ajustar los parámetros de entrada (o usar los valores precargados)
4. Hacer clic en **"Calcular"**
5. Revisar la tabla de iteraciones, el gráfico y la interpretación automática

---

## Tecnologías

| Tecnología | Versión | Uso |
|------------|---------|-----|
| HTML5 | — | Estructura SPA |
| CSS3 Vanilla | — | Estilos, animaciones, responsive |
| JavaScript ES6+ | — | Lógica, algoritmos, DOM |
| [Chart.js](https://www.chartjs.org/) | CDN latest | Gráficas interactivas |
| GitHub Pages | — | Publicación gratuita |

Sin frameworks. Sin dependencias de npm. Sin build step.

---

## Autores

| Nombre | Rol |
|--------|-----|
| **[Nombre 1]** | Algoritmos matemáticos (core/) + escenarios A, B, C |
| **[Nombre 2]** | Interfaz (css/ + ui/) + escenarios D, E, F, G |

**Materia**: Métodos Numéricos Aplicados
**Institución**: [Tu universidad]
**Período**: 2025

---

## Licencia

MIT — libre para uso académico y personal.
