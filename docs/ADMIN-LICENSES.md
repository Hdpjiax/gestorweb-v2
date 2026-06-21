# Panel privado de licencias

El acceso no aparece en la navegación de usuarios. En Windows abre el panel con `Ctrl + Shift + A`.

1. Escribe la URL HTTPS del servidor desplegado.
2. Escribe el valor privado de `LICENSE_ADMIN_TOKEN`.
3. Genera keys para `Windows`, `Android` o `Ambos`.
4. Copia la key generada y entrégala al cliente.

La credencial admin se conserva solamente en memoria del proceso principal; al cerrar la aplicación o pulsar **salir** se elimina. Nunca debe incluirse en el instalador ni enviarse a un cliente.

El servidor calcula el estado de cada licencia al consultar la lista. Cuando vence o se revoca, `/v1/verify` devuelve inactiva. Windows vuelve a comprobar cada minuto y cierra los perfiles; Android valida al iniciar, regresar a la app y cada minuto mientras existe un navegador abierto.

Para producción hacen falta tres valores externos que no deben quedar en el repositorio: dominio HTTPS, `DATABASE_URL` de PostgreSQL y `LICENSE_ADMIN_TOKEN`.
