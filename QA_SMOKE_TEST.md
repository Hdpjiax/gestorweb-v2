# QA Smoke Test - Gestor Web

Checklist manual para ejecutar despues de `npm run qa` y antes de empaquetar.

## 1. Preparacion

- Ejecutar `npm install` si es primera vez o cambiaron dependencias.
- Ejecutar `npm run qa`.
- Ejecutar `npm start`.

## 2. Arranque

- La ventana principal abre sin pantalla en blanco.
- La consola no muestra errores rojos al iniciar.
- Si no hay licencia activa, aparece la pantalla de activacion.
- Si hay licencia activa, aparece el dashboard.

## 3. Activacion simulada

- Copiar HWID funciona.
- Una clave que empieza con `GW-` activa la app.
- El onboarding aparece despues de activar.
- Cerrar onboarding mantiene el estado al reiniciar.

## 4. Perfiles

- Crear perfil con nombre y URL valida `https://example.com`.
- Crear perfil con URL sin esquema `example.com` normaliza correctamente.
- Editar nombre, grupo, URL y notas.
- Clonar perfil genera un ID nuevo y mantiene datos base.
- Eliminar perfil pide confirmacion y desaparece de la tabla.

## 5. Seguridad de URLs

- Intentar abrir `javascript:alert(1)` desde la barra del navegador debe bloquearse.
- Intentar abrir `file:///C:/Windows/win.ini` debe bloquearse.
- Abrir `https://example.com` debe permitirse.
- Abrir enlace externo HTTP/HTTPS debe permitirse.
- Esquemas externos no permitidos deben bloquearse.

## 6. Proxies

- Agregar proxy `127.0.0.1:8080` como HTTP.
- Importar bulk con formato `host:port`.
- Importar CSV con columnas `host,port,username,password`.
- Proxies invalidos deben omitirse.
- Seleccionar proxies y borrar seleccionados.

## 7. Vault

- Exportar vault crea archivo JSON.
- Importar el mismo vault restaura perfiles, proxies y eventos.
- Importar JSON invalido no debe romper la app.
- Importar archivo mayor al limite debe rechazarse.

## 8. Cookies y TOTP

- Guardar TOTP base32 valido.
- TOTP invalido debe ser rechazado.
- Abrir editor de cookies no debe romper si no hay perfil activo.
- Limpiar cookies debe actualizar la UI.

## 9. Navegador embebido

- Crear pestana nueva.
- Cambiar de perfil desde selector.
- Navegar a sitio HTTPS.
- Recargar pestana.
- Cerrar pestana activa sin dejar estado corrupto.

## 10. Cierre

- Cerrar perfil activo lo remueve de `liveIds`.
- Reiniciar app mantiene estado guardado.
- `npm run dist` genera instalador sin errores.
