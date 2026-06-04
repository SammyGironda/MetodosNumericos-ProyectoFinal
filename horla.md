Perfecto. Voy a generar **PROMPTS QUIRÚRGICOS EN ESPAÑOL**, uno por uno. Cada uno será tan preciso que Qwen 2.5 7B no tenga margen de error.

Empezamos por **la base**: HTML estructura + CSS variables.

---

# 🎯 PROMPT #1: ESTRUCTURA HTML PRINCIPAL

```
Eres un desarrollador web experto en HTML semántico y accesibilidad.

CONTEXTO DEL PROYECTO:
- Nombre: "Simulación numérica de crisis: Abastecimiento, precios y conflicto social"
- Objetivo: Página web interactiva con 7 escenarios de métodos numéricos
- Publicación: GitHub Pages
- Paleta de colores: #3E594F, #6C8C74, #F2CA99, #F29966, #D97059, #C9D7A6

TAREA ESPECÍFICA:
Crear el archivo HTML principal (`index.html`) que sirva como punto de entrada ÚNICO de la aplicación. Este archivo debe:

1. SER EL ÚNICO ARCHIVO HTML
   - Todas las pantallas/escenarios se cargarán dinámicamente con JavaScript (SPA - Single Page Application)
   - NO habrá múltiples archivos .html, solo este

2. ESTRUCTURA BASE:
   
   <html>
     <head>
       - Meta tags (charset, viewport, etc)
       - Título: "Simulación Numérica de Crisis - Métodos Numéricos Aplicados"
       - Links a CSS (se crearán después)
     </head>
     <body>
       <div id="app">
         <!-- Aquí se inyectará todo dinámicamente -->
       </div>
       <script src="js/main.js"></script>
     </body>
   </html>
   

3. CONTENEDOR PRINCIPAL DEBE TENER:
   - Un elemento con id="sidebar" (vacío, se llena con JS)
   - Un elemento con id="contenido-principal" (vacío, se llena con JS)

4. ICONOGRAFÍA:
   Usar emojis nativos (no fuentes de iconos externas):
   - 🏠 Inicio
   - ⚙️ Escenario A (sistemas lineales)
   - 💧 Escenario B (reservas)
   - 📈 Escenario C (precios)
   - 💰 Escenario D (costo)
   - 📍 Escenario E (umbrales)
   - 🗣️ Escenario F (rumores)
   - 👥 Escenario G (opinión)
   - 📋 Conclusiones

5. META TAGS ESENCIALES:
   - charset="UTF-8"
   - viewport: width=device-width, initial-scale=1.0
   - description: Descripción breve del proyecto

6. ESTRUCTURA SEMÁNTICA:
   - Usar <header>, <nav>, <main>, <footer> correctamente
   - Clases BEM (Block__Element--Modifier) cuando sea necesario
   - IDs solo para elementos únicos (sidebar, contenido-principal, etc)

7. ACCESIBILIDAD:
   - lang="es" en <html>
   - alt text en imágenes (si hay)
   - role="navigation" en sidebar
   - aria-label en botones sin texto

8. RECURSOS EXTERNOS NECESARIOS:
   - Chart.js CDN: https://cdn.jsdelivr.net/npm/chart.js
   - Google Fonts: Ninguna (usar system fonts por ahora)
   - Otros: Ninguno por ahora

9. ESTRUCTURA DE SCRIPTS:
   - Solo un <script> al final: <script src="js/main.js"></script>
   - El archivo main.js cargará todos los demás scripts

10. COMENTARIOS EN HTML:
    - Máximo 2-3 comentarios explicativos
    - Español

REQUISITOS TÉCNICOS CRÍTICOS:
- Validar HTML5 (usar <!DOCTYPE html>)
- Sin atributos deprecated
- Sin scripts inline
- Responsive: clase "app__container" que funcione en mobile y desktop
- No usar ningún framework CSS (Bootstrap, Tailwind, etc)

ENTREGA EXACTA:
Solo el código HTML completo, listo para copiar-pegar en `index.html`.
No explicaciones adicionales, solo código comentado.

VALIDACIÓN FINAL:
- El HTML debe ser válido W3C
- El archivo debe poder abrirse en navegador SIN errores en consola
- El elemento #app debe estar vacío (será llenado por JS)
```

---

**Copia este prompt tal cual en Continue/Qwen.**

Una vez tengas el HTML, responde:
1. ¿El HTML se ve bien?
2. ¿Hay errores en consola?

Luego genero **PROMPT #2: Variables CSS** 🎨