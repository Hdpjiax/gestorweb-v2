# Modularizacion del renderer

## Estado actual

La entrada del renderer ahora apunta a:

```txt
src/renderer/views/shell-view.js
```

El archivo grande anterior sigue en:

```txt
src/renderer/views.js
```

Por compatibilidad, `shell-view.js` conserva el comportamiento existente mediante un puente temporal hacia la vista anterior.

## Modulos creados

```txt
src/renderer/views/sidebar-view.js
src/renderer/views/topbar-view.js
src/renderer/views/view-router.js
src/renderer/views/original-view.js
src/renderer/views/shell-view.js
```

## Para modificar partes especificas

- Menu lateral: `src/renderer/views/sidebar-view.js`
- Barra superior y filtros: `src/renderer/views/topbar-view.js`
- Estructura general: `src/renderer/views/shell-view.js`
- Ruteo de vistas: `src/renderer/views/view-router.js`
- Pantallas internas aun pendientes: `src/renderer/views.js`

## Siguiente extraccion recomendada

1. Sacar perfiles a `profile-view.js`.
2. Sacar inspector a `inspector-view.js`.
3. Sacar proxies a `proxy-view.js`.
4. Sacar navegador a `browser-view.js`.
5. Sacar modales a `modal-view.js`.

## Regla de trabajo

Mover una pantalla por commit y correr:

```bash
npm run qa
```

No mezclar refactor con cambios de funcionalidad.
