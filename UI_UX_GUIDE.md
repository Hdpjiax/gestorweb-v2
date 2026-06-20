# UI / UX Guide - Gestor Web

Guia base para mantener una experiencia consistente en la aplicacion.

## Objetivo de Fase 4

Mejorar legibilidad, respuesta visual, accesibilidad basica y consistencia sin reescribir la arquitectura del renderer.

## Capa agregada

La capa `src/renderer/ux-polish.js` se carga desde `src/renderer/browser-redesign-start.js`.

Esta capa agrega:

- Estilos visuales no invasivos.
- Foco visible solo cuando el usuario navega con teclado.
- Etiquetas `aria-label` automaticas para botones con `title` o texto visible.
- `role="dialog"` y `aria-modal="true"` para modales/paleta.
- Microinteracciones para botones, filas, tarjetas y modales.
- Respeto a `prefers-reduced-motion`.
- Region `aria-live` para feedback rapido de acciones de copiado.

## Reglas de diseno

- Mantener tema oscuro base.
- Usar `--accent` para accion principal y seleccion activa.
- Usar `--live`, `--warn` y `--danger` solo para estado real.
- Evitar colocar estilos inline nuevos salvo casos estrictamente dinamicos.
- No duplicar componentes: reutilizar `.metric`, `.panel-card`, `.pill`, `.btn`, `.input`, `.select`, `.textarea`.
- Cada boton iconico debe tener `title` o texto visible para generar `aria-label`.
- Cada modal debe tener una cabecera clara y una accion primaria visible.

## Checklist rapido para UI

- Navegar con Tab muestra foco visible.
- Navegar con mouse no deja anillos de foco innecesarios.
- Las filas seleccionadas se distinguen sin depender solo del color.
- Los estados vacios explican que hacer despues.
- Los modales se leen como dialogos.
- En pantallas menores a 820 px no se rompen filtros ni acciones principales.
- Con `prefers-reduced-motion`, las animaciones quedan practicamente apagadas.

## Archivos relacionados

- `styles.css`: estilos base del producto.
- `src/renderer/ux-polish.js`: capa de pulido visual/accesibilidad.
- `tests/renderer/ux-polish.test.js`: pruebas minimas de instalacion UX.
- `QA_SMOKE_TEST.md`: validacion manual completa.
