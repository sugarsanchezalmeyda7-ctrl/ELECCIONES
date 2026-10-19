# Elecciones Municipales Escolares 2026

Aplicación web para la elección de la I. E. Ricardo Palma de Marcona. La aplicación usa Next.js para la interfaz y API de servidor, y Supabase PostgreSQL para votos, control de apertura y límite de intentos administrativos. No hay resultados ni escritura de votos en almacenamiento del navegador.

## Antes de utilizar

Este proyecto está preparado para conectarse a una base real, pero no puede almacenar votos hasta configurar un proyecto Supabase y aplicar `database/schema.sql`. La elección inicia cerrada. Configura la contraseña inicial acordada únicamente como secreto de entorno `ADMIN_PASSWORD` en el proveedor de hosting; no la escribas en GitHub, `.env.example` ni código del navegador. Cámbiala por una contraseña fuerte antes de usar el sistema real.

## Configuración local

Requisitos: Node.js 20 o posterior y un proyecto Supabase PostgreSQL.

1. En Supabase, crea un proyecto y abre SQL Editor. Ejecuta el contenido completo de `database/schema.sql`.
2. Copia `.env.example` a `.env.local`.
3. Completa `NEXT_PUBLIC_SUPABASE_URL` con la URL del proyecto y `SUPABASE_SERVICE_ROLE_KEY` con la clave `service_role` desde Project Settings > API. La clave es secreta: nunca la uses en variables `NEXT_PUBLIC_`, el navegador o repositorios públicos.
4. Establece `ADMIN_PASSWORD` y crea un valor criptográficamente aleatorio de al menos 32 caracteres para `ADMIN_SESSION_SECRET` (por ejemplo, `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`).
5. Instala y ejecuta: `npm install`, `npm run dev`. Abre `http://localhost:3000`.
6. Inicia sesión por el botón Administrador. Abre la votación desde el panel, registra una prueba y cierra la votación al terminar.

## Recursos reemplazables

- `public/videos/presentacion.mp4`: video de bienvenida a pantalla completa; al terminar se desvanece y pasa a la elección. Tras el voto y diez segundos en blanco, se reinicia para el siguiente turno.
- `public/images/insignia-ricardo-palma.png`: insignia.
- `public/images/opcion-1.png` y `public/images/opcion-2.png`: logos de listas.

Los recursos entregados se copiaron a estas ubicaciones. Sustituir los archivos conservando esos nombres actualiza el sitio sin cambiar componentes.

## Seguridad y comportamiento

- La clave `service_role` solo se lee en el servidor. RLS está habilitado y no hay políticas públicas de lectura/escritura en las tablas.
- Los votos solo se escriben con la función transaccional `cast_vote`, que exige estado abierto y usa `operation_id` único. Un reintento idéntico devuelve éxito sin duplicar; el mismo id con otra opción se rechaza. Votos individuales no tienen endpoint de lectura.
- Como el flujo no pide cuenta ni identificador al estudiante, la base de datos no puede demostrar que dos operaciones diferentes provengan de personas diferentes. Para garantizar un voto por estudiante se requiere supervisión en el local o entregar códigos anónimos de un solo uso; no se debe interpretar la idempotencia de reintentos como control de voto único.
- El administrador usa una cookie HttpOnly, SameSite Strict, Secure en producción y sesión de ocho horas. Los intentos incorrectos se limitan por IP hasheada: cinco fallos bloquean 15 minutos. Para producción, configura el hosting detrás de un proxy que establezca correctamente `x-forwarded-for` y aplica límites adicionales en el proveedor perimetral.
- Los agregados y el control de estado requieren sesión. El panel los consulta cada tres segundos; es actualización automática por sondeo, no una suscripción WebSocket.
- El administrador puede cerrar la votación y reiniciar el conteo. El reset solo funciona con la votación cerrada, crea una ronda nueva y deja los votos previos conservados en PostgreSQL como historial; los agregados solo cuentan la ronda activa.
- El servidor confirma el voto antes de mostrar la confirmación; luego aparece la vista blanca limpia por diez segundos y se vuelve al inicio.

## Publicación

Despliega en Vercel u otro host compatible con Next.js. Configura allí las cuatro variables del archivo `.env.example` como secretos del entorno de producción; establece `ADMIN_PASSWORD` con la contraseña inicial acordada y crea `ADMIN_SESSION_SECRET` aleatorio. Aplica `database/schema.sql` en el Supabase de producción antes de abrir la votación. Usa HTTPS. Verifica que el video y las imágenes se publiquen, prueba contraseña errónea y correcta, voto, reintento, recarga, actualización del panel, cierre y reset de ronda. GitHub Pages solo aloja el prototipo estático y no tiene acceso a la contraseña ni a los resultados reales.

La aplicación no se debe considerar lista para una elección real hasta que la base de producción, las variables de entorno y las pruebas de extremo a extremo se hayan completado por el responsable del despliegue.

## Prueba de aceptación

Antes de la elección, verifica en el despliegue configurado: cancelar no incrementa el conteo; confirmar inserta un registro; reintentar con el mismo `operationId` no lo duplica; recargar conserva los totales; el panel se actualiza en un máximo aproximado de tres segundos; cerrar rechaza nuevos votos; credenciales incorrectas y cinco intentos fallidos bloquean el acceso; credenciales correctas habilitan el panel y cerrar sesión lo bloquea; los gráficos coinciden con los agregados; el mensaje aparece antes de una pantalla totalmente blanca que dura diez segundos; inicio y voto se ven correctamente en escritorio y móvil. Para probar sin contaminar una elección, utiliza un proyecto/base de ensayo independiente.
