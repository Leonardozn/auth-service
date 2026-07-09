# Generador de CV — auth-service

## 1. Owner

Leonardozn

## 2. Description

Este proyecto es el microservicio **auth-service** del sistema Generador de CV. Es el único
dueño de la identidad y de los roles de los usuarios (user/admin) de toda la plataforma:
registro, inicio y cierre de sesión, validación de sesión/token, cambio y recuperación de
contraseña (por email vía Resend) y gestión de cuenta. Define el **protocolo de autorización**
que los demás servicios (cv-service) deben seguir para autorizar solicitudes.

## 3. Objective

Permitir a un visitante registrarse e iniciar sesión, mantener una sesión con token opaco,
cerrar sesión, cambiar y recuperar su contraseña, y gestionar su cuenta; y servir como única
autoridad de validación de token/rol para que cv-service pueda autorizar el acceso a sus
recursos. auth-service es la fuente de verdad de *quién es* el usuario y *qué rol* tiene.

## 4. Task List

> Códigos de estado: ceñirse a lo que maneja `handle-errors` (201/200, 400, 401, 403, 404,
> 500, 502). No usar 409 (email duplicado → 400). El hashing de contraseñas usa el paquete
> base `data-encrypt` (no crear paquete nuevo para eso). Los tiempos de token y la config de
> Resend se leen de variables de entorno (ver "Variables de entorno").

1. Definir y generar los modelos del módulo Authentication: `Role`, `User`, `Session` (Session
   con `accessToken`/`accessTokenExpiresAt` y `refreshToken`/`refreshTokenExpiresAt`).
2. Definir y generar el modelo del módulo AccountManagement: `PasswordResetToken`.
3. Crear el paquete `@auth-service/email-manager` envolviendo `resend` (por `proc-no-new-packages`),
   consumido a través de su handler. (Necesario antes de la recuperación de contraseña.)
4. Crear las variables de entorno (evars) del proyecto: `SESSION_TOKEN_DEFAULT_TIME`,
   `REFRESH_TOKEN_DEFAULT_TIME`, `RESET_TOKEN_DEFAULT_TIME`, `RESEND_TOKEN`, `RESEND_API_URL`,
   `ADMIN_MAIL_FROM`, `PASSWORD_RESET_URL_BASE` (ver "Variables de entorno").
5. Implementar el contrato: registrar un usuario (`POST /auth/register`).
6. Implementar el contrato: iniciar sesión (`POST /auth/login`) — emite access + refresh tokens.
7. Implementar el contrato: renovar la sesión (`POST /auth/refresh`).
8. Implementar el contrato: validar un token de sesión (`POST /auth/validate`) — base del
   Protocolo de autenticación consumido por cv-service.
9. Implementar el contrato: cerrar sesión (`POST /auth/logout`).
10. Implementar el contrato: cambiar contraseña (`POST /auth/change-password`).
11. Implementar el contrato: solicitar recuperación (`POST /auth/forgot-password`) — usa
    `@auth-service/email-manager`.
12. Implementar el contrato: enviar el email de recuperación vía Resend (auth-service → Resend)
    — usa `@auth-service/email-manager`.
13. Implementar el contrato: restablecer contraseña (`POST /auth/reset-password`).
14. Implementar el contrato: gestión de cuenta — editar perfil (`PATCH /user/:id`) y desactivar
    la propia cuenta (`POST /auth/deactivate`).
15. Implementar la lógica de negocio — Authentication → Registrar un Usuario.
16. Implementar la lógica de negocio — Authentication → Iniciar Sesión de un Usuario.
17. Implementar la lógica de negocio — Authentication → Refrescar la Sesión.
18. Implementar la lógica de negocio — Authentication → Cerrar Sesión.
19. Implementar la lógica de negocio — Authentication → Validar un Token.
20. Implementar la lógica de negocio — AccountManagement → Cambiar Contraseña.
21. Implementar la lógica de negocio — AccountManagement → Solicitar Recuperación de Contraseña.
22. Implementar la lógica de negocio — AccountManagement → Restablecer Contraseña.
23. Implementar la lógica de negocio — AccountManagement → Editar Perfil / Desactivar Cuenta.

## 5. Artifacts

| Artefacto           | Tipo                     | Dueño / Usado por             |
| ------------------- | ------------------------ | ----------------------------- |
| auth-service        | Microservicio propio     | —                             |
| auth-db (MongoDB)   | Base de datos            | auth-service                  |
| Resend              | Servicio de terceros     | auth-service                  |

> cv-service (que consume el Protocolo de autenticación de este servicio) y el frontend tienen
> sus propios proyectos; ver el DOCUMENTATION.md de la raíz del workspace si necesitas su detalle.

## 6. Artifact Objectives

### auth-service (Microservicio propio)
Maneja el ciclo de vida de identidad y cuenta: registro, inicio y cierre de sesión, validación
de sesión/token, cambio y recuperación de contraseña (por email vía Resend) y gestión de cuenta
(editar perfil, eliminar cuenta). Es el único dueño de la identidad y de los roles de los
usuarios (user/admin) y define el protocolo de autorización que los demás servicios deben seguir.

### auth-db (Base de datos)
Almacena roles, usuarios, sus sesiones activas y los tokens de recuperación de contraseña.

### Resend (Servicio de terceros)
Proveedor de correo transaccional. auth-service lo usa para enviar el email con el enlace de
recuperación de contraseña.

## 7. Artifact Contracts

### Convención de códigos de estado (easy-node)

Manejados por el paquete `handle-errors`:

- **201** create (`POST /<model>`); **200** demás operaciones y acciones custom.
- **400** validación (Zod) o reglas custom de "petición inválida" (email ya registrado, token de
  recuperación inválido/expirado).
- **404** recurso no encontrado.
- **401** no autenticado (token ausente/inválido).
- **403** prohibido (no es dueño / sin rol admin).
- **500** error inesperado; **502** fallo de un upstream (Axios).

### Protocolo de autenticación (definido por auth-service)

auth-service es la única autoridad de identidad y define el protocolo que cualquier otro servicio
debe seguir para autorizar solicitudes. Ningún otro servicio interpreta el token por su cuenta:

1. En el login, auth-service emite un par de tokens opacos en la `Session`: un **access token**
   de corta duración (`SESSION_TOKEN_DEFAULT_TIME`) y un **refresh token** de larga duración
   (`REFRESH_TOKEN_DEFAULT_TIME`). Formato, expiraciones, rotación y revocación son
   responsabilidad exclusiva de auth-service.
2. El cliente envía el **access token** como `Authorization: Bearer <token>`; cuando expira, lo
   renueva con el refresh token vía `POST /auth/refresh` (no reenvía credenciales).
3. Un servicio protegido (cv-service) reenvía el access token a `POST /auth/validate`; nunca lo
   decodifica.
4. auth-service responde con el `User` autenticado (incluyendo `role`) si es válido, o 401. En la
   respuesta de `/auth/validate` el `role` se resuelve al **nombre** del Role (`"user"`/`"admin"`),
   no a su id — es el campo del que depende la autorización por rol del consumidor. (En cambio,
   `/auth/login`, `/auth/register` y `/auth/refresh` devuelven `user.role` como el **id** del Role;
   un cliente que necesite el nombre lo resuelve con `GET /role/:id`.)
5. El servicio llamador usa el `user` y su `role` para autorizar a nivel de recurso/ruta (RBAC:
   admin es superconjunto de user).
6. Ante token ausente/inválido/expirado o auth-service caído, se falla cerrado.

### Variables de entorno de auth-service

Evars del proyecto (gestionadas con el CLI de easy-node; `RESEND_TOKEN` es secreto y no se
commitea — su valor se toma del entorno al crear el evar). Los tiempos usan formato de duración
(`15m`, `5d`, `30m`). En modo pruebas de Resend bastan `RESEND_TOKEN` y `ADMIN_MAIL_FROM`.

| Variable | Ejemplo / default | Propósito |
| -------- | ----------------- | --------- |
| `SESSION_TOKEN_DEFAULT_TIME` | `15m` | Duración del access token de sesión |
| `REFRESH_TOKEN_DEFAULT_TIME` | `5d` | Duración del refresh token |
| `RESET_TOKEN_DEFAULT_TIME` | `30m` | Duración del PasswordResetToken de recuperación |
| `RESEND_TOKEN` | `re_...` (secreto) | API key de Resend |
| `RESEND_API_URL` | `https://api.resend.com/emails` | Endpoint de envío de Resend |
| `ADMIN_MAIL_FROM` | `onboarding@resend.dev` | Remitente del email de recuperación |
| `PASSWORD_RESET_URL_BASE` | `http://localhost:5173/reset-password` | Base del enlace de restablecimiento del email |
| `CHANGE_PASSWORD_CODE_DEFAULT_TIME` | `5m` | Duración del código de verificación de cambio de contraseña |
| `CHANGE_PASSWORD_CODE_MAX_ATTEMPTS` | `5` | Intentos fallidos permitidos antes de invalidar el código |

### Contrato: el frontend registra un usuario vía auth-service
- `POST /auth/register` (acción personalizada)
- Request: `{ name: <string>, email: <string>, password: <string> }`
- Respuesta: `{ success, message, statusCode, content: { user: <User> } }` (201) en éxito;
  `content: null` con 400 si el email ya está registrado (código custom lanza `BadRequestError`).

### Contrato: el frontend inicia sesión de un usuario vía auth-service
- `POST /auth/login` (acción personalizada)
- Request: `{ email: <string>, password: <string> }`
- Respuesta: `{ ..., content: { token: <string>, refreshToken: <string>, user: <User> } }`;
  `content: null` con 401 si las credenciales son inválidas. `token` es el **access token**
  (`Authorization: Bearer <token>`); `refreshToken` se guarda para renovar el access al expirar.

### Contrato: el frontend renueva la sesión vía auth-service
- `POST /auth/refresh` (acción personalizada)
- Request: `{ refreshToken: <string> }`
- Respuesta: `{ ..., content: { token: <string>, refreshToken: <string>, user: <User> } }` con un
  nuevo access token y un refresh token rotado si el refresh es válido y no expiró; `content:
  null` con 401 si es inválido, expirado o ya rotado. El cliente lo usa cuando una solicitud
  protegida devuelve 401 por access expirado: renueva y reintenta.

### Contrato: cv-service valida un token de sesión con auth-service
- `POST /auth/validate` (acción personalizada; base del Protocolo de autenticación)
- Request: `{ token: <string> }`
- Respuesta: `{ ..., content: { user: <User> } }` si el token es válido y no expiró; `content:
  null` con 401 en caso contrario. En este contrato (a diferencia de login/register/refresh)
  `user.role` se devuelve como el **nombre** del Role (`"user"`/`"admin"`), no como su id, para que
  el consumidor pueda autorizar por rol directamente (`role === 'admin'`).
- Failure handling: caller (cv-service) reintenta una vez a los 5s; este servicio solo debe
  responder rápido y de forma determinista.

### Contrato: el frontend cierra sesión vía auth-service
- `POST /auth/logout` (acción personalizada). Requiere `Authorization: Bearer <token>`; revoca
  (elimina) la Session de ese token. Respuesta 200 `content: null`. Idempotente.

### Contrato: el frontend cambia la contraseña (usuario autenticado) vía auth-service
Flujo en dos pasos: el paso 1 solo valida y envía un código de verificación por email; el cambio
real ocurre en el paso 2, al confirmar ese código. Esto asegura que quien solicita el cambio es
dueño de la cuenta (email), además de estar logueado.
- Paso 1 — `POST /auth/change-password` (acción personalizada). Requiere
  `Authorization: Bearer <token>`.
  - Request: `{ currentPassword: <string>, newPassword: <string> }`
  - Respuesta 200 `content: null`; 401 si `currentPassword` no coincide. No cambia la contraseña
    todavía: genera un `ChangePasswordVerificationCode` (código de 6 dígitos, expira en
    `CHANGE_PASSWORD_CODE_DEFAULT_TIME`) con `newPassword` ya hasheada, invalida cualquier código
    pendiente anterior del usuario y envía el código por email vía Resend.
- Paso 2 — `POST /auth/change-password/verify` (acción personalizada). Requiere
  `Authorization: Bearer <token>` (la misma sesión).
  - Request: `{ code: <string> }`
  - Respuesta 200 `content: null` y aplica la nueva contraseña, revocando las demás sesiones
    (deja viva la actual); 400 si no hay un cambio pendiente o el código expiró; 401 si el código
    no coincide (cuenta como intento fallido) - tras `CHANGE_PASSWORD_CODE_MAX_ATTEMPTS` intentos
    fallidos el código se invalida y hay que solicitar uno nuevo desde el paso 1.

### Contrato: el frontend solicita recuperar contraseña vía auth-service
- `POST /auth/forgot-password` (acción personalizada)
- Request: `{ email: <string> }`
- Respuesta 200 `content: null` siempre (no revela qué correos existen); si el email existe,
  dispara el envío vía Resend.

### Contrato: el frontend restablece la contraseña con un token de recuperación vía auth-service
- `POST /auth/reset-password` (acción personalizada)
- Request: `{ token: <string>, newPassword: <string> }` (token = PasswordResetToken del email)
- Respuesta 200 `content: null`; 400 si el token no existe, ya se usó o expiró. Revoca sesiones.

### Contrato: el frontend gestiona su cuenta vía auth-service
- Editar perfil: `PATCH /user/:id` (name/email). Desactivar la propia cuenta:
  `POST /auth/deactivate` (acción personalizada) — marca `User.active = false` y revoca sus
  sesiones. Requiere `Authorization: Bearer <token>`; solo la propia cuenta (o un admin sobre
  cualquiera): un no-dueño sin rol admin recibe 403. Un admin reactiva con `PATCH /user/:id`
  `{ active: true }`.
- Respuesta: `{ ..., content: <User> | null }`.

### Contrato: auth-service envía el email de recuperación vía Resend
- Caller: auth-service · Callee: Resend
- `POST <RESEND_API_URL>` (default `https://api.resend.com/emails`; API de Resend, no usa el
  envelope de este proyecto). Auth con `Authorization: Bearer <RESEND_TOKEN>`.
- Request: `{ from: <ADMIN_MAIL_FROM>, to: <email del usuario>, subject, html }`, con el enlace
  `<PASSWORD_RESET_URL_BASE>?token=<PasswordResetToken>`.
- Response: objeto de Resend con el id del email; un no-2xx significa que no se encoló.
- Failure handling: si Resend falla o no responde, registrar el fallo y responder igualmente
  éxito al frontend (no revela la existencia del email); el usuario puede reintentar.

## 8. Data Models

### auth-service

#### Módulo: Authentication

##### Role
Datos configurables (nuevos roles sin cambiar código).

| Campo       | Tipo    | Requerido | Descripción                                                                 |
| ----------- | ------- | --------- | ---------------------------------------------------------------------------- |
| id          | id      | sí        | Identificador único del rol                                                |
| name        | string  | sí        | Nombre del rol (p. ej., user, admin)                                       |
| active      | boolean | sí        | Si el rol puede asignarse actualmente                                      |
| maxSessions | number  | no        | Límite de sesiones concurrentes por usuario con este rol. Vacío o <= 0 = sin límite; al superarlo, login() elimina la sesión más antigua |

##### User

| Campo     | Tipo             | Requerido | Descripción                     |
| --------- | ---------------- | --------- | ------------------------------- |
| id        | id               | sí        | Identificador único del usuario |
| name      | string           | sí        | Nombre visible del usuario      |
| email     | string           | sí        | Email de inicio de sesión, único|
| password  | string           | sí        | Contraseña hasheada (data-encrypt)|
| role      | reference → Role | sí        | Rol asignado al usuario         |
| active    | boolean          | sí        | Si la cuenta está activa (inactiva no puede iniciar sesión)|
| createdAt | datetime         | sí        | Fecha de registro               |

##### Session
Par de tokens opacos por login: access (Bearer, corto) y refresh (largo, para renovar). Duraciones
por evars `SESSION_TOKEN_DEFAULT_TIME` / `REFRESH_TOKEN_DEFAULT_TIME`.

| Campo                 | Tipo             | Requerido | Descripción                                    |
| --------------------- | ---------------- | --------- | ---------------------------------------------- |
| id                    | id               | sí        | Identificador único de la sesión               |
| user                  | reference → User | sí        | Dueño de la sesión                             |
| accessToken           | string           | sí        | Access token opaco (Bearer), corta duración    |
| accessTokenExpiresAt  | datetime         | sí        | Expiración del access (SESSION_TOKEN_DEFAULT_TIME)|
| refreshToken          | string           | sí        | Refresh token opaco, larga duración            |
| refreshTokenExpiresAt | datetime         | sí        | Expiración del refresh (REFRESH_TOKEN_DEFAULT_TIME)|

#### Módulo: AccountManagement

##### PasswordResetToken
Token de un solo uso para restablecer la contraseña, enviado por email vía Resend.

| Campo     | Tipo             | Requerido | Descripción                                      |
| --------- | ---------------- | --------- | ------------------------------------------------ |
| id        | id               | sí        | Identificador único del token de recuperación    |
| user      | reference → User | sí        | Usuario que solicitó la recuperación             |
| token     | string           | sí        | Token opaco incluido en el enlace del email      |
| expiresAt | datetime         | sí        | Fecha de expiración del token                    |
| used      | boolean          | sí        | Si el token ya fue usado (no reutilizable)       |

##### ChangePasswordVerificationCode
Código de un solo uso (6 dígitos) para confirmar un cambio de contraseña, enviado por email vía
Resend. Guarda la nueva contraseña ya hasheada para no tener que reenviarla en el paso 2.

| Campo           | Tipo             | Requerido | Descripción                                              |
| --------------- | ---------------- | --------- | --------------------------------------------------------- |
| id              | id               | sí        | Identificador único del código                            |
| user            | reference → User | sí        | Usuario que solicitó el cambio                             |
| code            | string           | sí        | Código de verificación de 6 dígitos                        |
| newPasswordHash | string           | sí        | Nueva contraseña, ya hasheada (data-encrypt)               |
| expiresAt       | datetime         | sí        | Fecha de expiración del código (CHANGE_PASSWORD_CODE_DEFAULT_TIME) |
| used            | boolean          | sí        | Si el código ya fue usado o invalidado (no reutilizable)   |
| attempts        | number           | sí        | Intentos fallidos de verificación (máximo CHANGE_PASSWORD_CODE_MAX_ATTEMPTS) |

## 9. Business Logic

### auth-service

#### Módulo: Authentication
Usa: Role, User, Session
Responsabilidad: Registrar y autenticar usuarios, emitir y renovar los tokens de sesión (access +
refresh), cerrar sesión y validar tokens para otros servicios, siendo la autoridad del Protocolo
de autenticación.

#### Proceso: Registrar un Usuario
1. Recibe name, email y password.
2. Resuelve el Role activo por defecto ("user") en auth-db.
3. Verifica si ya existe un User con el mismo email.
4. Si el email existe → error 400 (BadRequestError), no se crea User.
5. Hashea la contraseña (data-encrypt) y crea un User referenciando el Role.

Resultado: Un User capaz de iniciar sesión, o error si el email ya estaba tomado.

#### Proceso: Iniciar Sesión de un Usuario
1. Recibe email y password.
2. Busca el User por email.
3. Si no coincide el User o el hash de la contraseña → error 401, sin token.
4. Si el User está desactivado (`active = false`) → error 403 ("cuenta desactivada"), sin token.
5. Crea una Session con un access token (expira en `SESSION_TOKEN_DEFAULT_TIME`) y un refresh
   token (expira en `REFRESH_TOKEN_DEFAULT_TIME`), y devuelve ambos.

Resultado: Un access token (para `Authorization: Bearer`) y un refresh token, o error ante
credenciales inválidas.

#### Proceso: Refrescar la Sesión
1. Recibe el refresh token.
2. Busca una Session cuyo `refreshToken` coincida y cuyo `refreshTokenExpiresAt` no haya vencido.
3. Si no la encuentra (inexistente, expirado o ya rotado) → 401, sin renovar.
4. Genera un nuevo access token y rota el refresh token, actualiza sus expiraciones y devuelve
   ambos con el User.

Resultado: Un nuevo par access/refresh, o 401 si el refresh no es válido (re-login).

#### Proceso: Cerrar Sesión
1. Recibe el access token del header.
2. Elimina la Session cuyo `accessToken` coincida, si existe (revoca también su refresh).

Resultado: Sesión revocada (access y refresh); validaciones futuras devuelven 401. Idempotente.

#### Proceso: Validar un Token
1. Recibe el access token.
2. Busca una Session cuyo `accessToken` coincida y cuyo `accessTokenExpiresAt` no haya vencido.
3. Si no la encuentra (inexistente o access expirado) → 401, content null.
4. Si la encuentra → devuelve el User (incluyendo su role).

Resultado: El User autenticado, o no autorizado. auth-service decide la validez del token.

#### Módulo: AccountManagement
Usa: User, Session, PasswordResetToken, ChangePasswordVerificationCode, Resend (terceros)
Responsabilidad: Cambiar y recuperar la contraseña y gestionar la cuenta, sobre la propia cuenta
del usuario autenticado (o un admin sobre cualquiera).

#### Proceso: Cambiar Contraseña (paso 1 de 2 - solicitar código)
1. Recibe currentPassword y newPassword, con el token en el header.
2. Valida la sesión y ubica al User; verifica currentPassword contra el hash.
3. Si no coincide → 401, sin cambios.
4. Descarta cualquier ChangePasswordVerificationCode pendiente anterior del usuario.
5. Hashea newPassword (sin aplicarla todavía) y genera un código de 6 dígitos; crea un
   ChangePasswordVerificationCode con ambos, expiresAt (CHANGE_PASSWORD_CODE_DEFAULT_TIME),
   used=false y attempts=0.
6. Envía el código por email vía Resend a la dirección del propio User.

Resultado: Código de verificación enviado por email; la contraseña no cambia hasta el paso 2, o
error si la actual no coincide.

#### Proceso: Cambiar Contraseña (paso 2 de 2 - confirmar código)
1. Recibe code, con el token en el header (misma sesión del paso 1).
2. Busca el ChangePasswordVerificationCode pendiente (used=false) del usuario.
3. Si no existe → 400. Si expiró → lo invalida (used=true) y 400.
4. Si el código no coincide → cuenta el intento fallido; al llegar a
   CHANGE_PASSWORD_CODE_MAX_ATTEMPTS invalida el código (used=true); 401 en ambos casos.
5. Si coincide, aplica newPasswordHash al User, marca el código used=true y revoca las demás
   Session (deja viva la actual).

Resultado: Contraseña actualizada y otras sesiones cerradas, o error si no hay un cambio
pendiente, el código expiró o no coincide.

#### Proceso: Solicitar Recuperación de Contraseña
1. Recibe el email.
2. Busca el User por email.
3. Si existe → crea un PasswordResetToken (opaco, expiresAt, used=false) y envía por Resend un
   email con el enlace de restablecimiento (ver contrato Resend).
4. Exista o no el email, responde éxito (no revela correos registrados).

Resultado: Si el email existe, el usuario recibe un enlace; la respuesta es la misma en ambos casos.

#### Proceso: Restablecer Contraseña
1. Recibe el token de recuperación y newPassword.
2. Busca un PasswordResetToken con ese token no usado ni expirado.
3. Si no lo encuentra (inexistente, usado o expirado) → 400.
4. Hashea newPassword y actualiza el User; marca el token used=true y revoca las Session activas.

Resultado: Contraseña restablecida y sesiones cerradas, o error si el token no es válido.

#### Proceso: Editar Perfil / Desactivar Cuenta
1. Valida la sesión e identifica al User autenticado.
2. Editar perfil (`PATCH /user/:id`): confirma que el `:id` es el propio usuario (o admin); si no,
   403. Actualiza name/email (rechazando un email ya tomado por otro User).
3. Desactivar (`POST /auth/deactivate`): marca `User.active = false` y revoca (elimina) las
   Session y PasswordResetToken del usuario. Un admin reactiva con `PATCH /user/:id`
   `{ active: true }`.

Resultado: Perfil actualizado o cuenta desactivada, o error de autorización/validación.
Nota de modularidad: al ser desactivación (soft delete), el User sigue existiendo por id, así que
los Curriculum de cv-service NO quedan huérfanos; no hace falta cascada entre servicios.
