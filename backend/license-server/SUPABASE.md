# Licencias sin VPS ni dominio: Supabase DB-only

Este modo evita usar dominio propio, Nginx, Certbot y VPS. La app valida la firma localmente y consulta Supabase por HTTPS usando una funcion RPC publica y restringida.

## Arquitectura

```txt
App Electron / Android
  -> https://TU_PROJECT_REF.supabase.co/rest/v1/rpc/verify_license_public
  -> Supabase Postgres
```

La app nunca recibe la `service_role_key`. Solo usa `SUPABASE_ANON_KEY` para ejecutar la RPC `verify_license_public`.

## 1. Crear proyecto Supabase

1. Crea un proyecto en Supabase.
2. Copia estos datos:
   - Project URL: `https://TU_PROJECT_REF.supabase.co`
   - anon/public key
   - service_role key

## 2. Crear tabla y funcion RPC

Abre Supabase Dashboard -> SQL Editor.

Ejecuta completo el archivo:

```txt
backend/license-server/supabase-schema.sql
```

Esto crea:

- tabla `public.licenses`
- indices
- RLS habilitado
- RPC `public.verify_license_public(p_id, p_hwid, p_license_hash)`
- permiso `execute` para `anon`

No se crea policy de lectura directa para `anon`, para que la app no pueda listar licencias.

## 3. Generar claves de firma local

En tu PC admin:

```bash
cd backend/license-server
npm run keys
```

Esto crea:

- `private_key.pem`: queda solo contigo.
- `public_key.pem`: se copia a la app.
- `.env`: archivo privado local.

## 4. Configurar `.env` local

Edita `backend/license-server/.env`:

```env
PRIVATE_KEY_FILE=./private_key.pem
PUBLIC_KEY_FILE=./public_key.pem
SUPABASE_URL=https://TU_PROJECT_REF.supabase.co
SUPABASE_ANON_KEY=tu_anon_publishable_key
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key_solo_admin
```

La `SUPABASE_SERVICE_ROLE_KEY` solo se usa en tu PC para emitir/revocar licencias. No se mete en Electron ni Android.

## 5. Emitir licencia

Planes:

- `1d`
- `7d`
- `15d`
- `30d`
- `lifetime`

Ejemplo para cliente:

```bash
npm run issue:supabase -- GW-ABCD-1234-5678 30d standard
```

Licencia admin permanente para tu propio HWID:

```bash
npm run issue:supabase -- TU_HWID lifetime admin
```

El comando imprime:

```txt
GW-LIC-V1
PAYLOAD
FIRMA
```

Eso se pega en la pantalla de activacion.

## 6. Revocar licencia

```bash
npm run revoke:supabase -- GW-20260621-ABCDEF123456 "pago vencido"
```

La app dejara de activarse en la siguiente validacion online.

## 7. Configurar la app Electron

Opcion recomendada para produccion: copiar la clave publica a:

```txt
src/main/license-public-key.pem
```

La licencia generada ya incluye `SUPABASE_URL` y `SUPABASE_ANON_KEY` en el payload bajo `license_db`, asi que la app puede validar sin variables de entorno extra.

En desarrollo tambien puedes usar:

```bash
set GW_LICENSE_PUBLIC_KEY_FILE=C:\ruta\public_key.pem
set GW_LICENSE_SUPABASE_URL=https://TU_PROJECT_REF.supabase.co
set GW_LICENSE_SUPABASE_ANON_KEY=tu_anon_publishable_key
npm start
```

## 8. Android

Para Android usa un `deviceInstallId` UUID generado al primer arranque y guardado en almacenamiento interno/seguro. Ese valor se manda como HWID para emitir la licencia.
