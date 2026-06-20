# Data Storage - Gestor Web

Documento de referencia para la persistencia local del proyecto.

## Ubicacion

En Electron, los datos se guardan dentro de `app.getPath("userData")`:

```txt
data/
  state.json
  state.json.bak
  profiles/
preloads/
```

## Estado principal

Archivo principal:

```txt
data/state.json
```

Backup automatico:

```txt
data/state.json.bak
```

Cada escritura JSON usa archivo temporal y luego `rename`, dejando copia previa como `.bak` cuando existe estado anterior.

## Version actual

```txt
schema_version: 2
```

La version se define en:

```txt
src/main/state-schema.js
```

## Flujo de carga

1. `state:load` lee `state.json`.
2. Si falla, intenta leer `state.json.bak`.
3. Migra el contenido a `CURRENT_STATE_VERSION`.
4. Normaliza arreglos, filtros, settings, perfiles y proxies.
5. Limpia `liveIds` para evitar sesiones fantasma tras reinicio.
6. Reescribe `state.json` en formato actual.

## Flujo de guardado

1. `state:save` valida tamano maximo.
2. Migra/normaliza el estado recibido.
3. Actualiza metadata.
4. Guarda con escritura recuperable.

## Campos principales

- `schema_version`: version del esquema local.
- `license`: estado de licencia.
- `onboardingSeen`: onboarding completado.
- `view`: vista activa.
- `selectedId`: perfil seleccionado.
- `filters`: filtros UI.
- `profiles`: perfiles.
- `proxies`: proxies.
- `schedules`: tareas programadas locales.
- `events`: historial limitado.
- `liveIds`: no se persiste activo despues de migracion/carga.
- `browserTabs`: pestanas guardadas.
- `netEntries`: entradas de red limitadas.
- `settings`: preferencias locales.
- `meta`: timestamps de creacion/actualizacion.

## Reglas para cambios futuros

- Nunca modificar `state.json` directamente desde el renderer sin pasar por `state:save` cuando Electron esta disponible.
- Toda version nueva debe incrementar `CURRENT_STATE_VERSION`.
- Cada migracion debe conservar datos existentes salvo campos temporales o inseguros.
- Limitar historiales grandes para evitar archivos pesados.
- Agregar pruebas en `tests/main/state-schema.test.js` por cada cambio de esquema.
