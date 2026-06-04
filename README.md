````
// Ejemplo: cargar el ejemplo B2 en escenarioB.js

function cargarEjemploB(idEjemplo) {
  if (!window.DATOS_EJEMPLOS) return;

  const ejemplos = window.DATOS_EJEMPLOS.escenarios.escenarioB.ejemplos;
  const ejemplo  = ejemplos.find(e => e.id === idEjemplo);
  if (!ejemplo) return;

  // Rellenar formulario con los parámetros del ejemplo
  document.getElementById('input-y0').value  = ejemplo.parametros.y0;
  document.getElementById('input-t0').value  = ejemplo.parametros.t0;
  document.getElementById('input-tf').value  = ejemplo.parametros.tf;
  document.getElementById('input-h').value   = ejemplo.parametros.h;

  // Mostrar interpretación
  document.getElementById('texto-interpretacion').textContent =
    ejemplo.interpretacion;
}
````