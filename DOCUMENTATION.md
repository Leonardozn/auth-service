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
> base `data-encrypt` (no crear paquete nuevo para eso).

1. Definir y generar los modelos del módulo Authentication: `Role`, `User`, `Session`.
2. Definir y generar el modelo del módulo AccountManagement: `PasswordResetToken`.
3. Crear el paquete `@backend/email-resend` envolviendo `resend` (por `proc-no-new-packages`),
   consumido a través de su handler. (Necesario antes de la recuperación de contraseña.)
4. Implementar el contrato: registrar un usuario (`POST /auth/register`).
5. Implementar el contrato: iniciar sesión (`POST /auth/login`).
6. Implementar el contrato: validar un token de sesión (`POST /auth/validate`) — base del
   Protocolo de autenticación consumido por cv-service.
7. Implementar el contrato: cerrar sesión (`POST /auth/logout`).
8. Implementar el contrato: cambiar contraseña (`POST /auth/change-password`).
9. Implementar el contrato: solicitar recuperación (`POST /auth/forgot-password`) — usa
   `@backend/email-resend`.
10. Implementar el contrato: enviar el email de recuperación vía Resend (auth-service → Resend)
    — usa `@backend/email-resend`.
11. Implementar el contrato: restablecer contraseña (`POST /auth/reset-password`).
12. Implementar el contrato: gestión de cuenta (`PATCH /user/:id`, `DELETE /user/:id`).
13. Implementar la lógica de negocio — Authentication → Registrar un Usuario.
14. Implementar la lógica de negocio — Authentication → Iniciar Sesión de un Usuario.
15. Implementar la lógica de negocio — Authentication → Cerrar Sesión.
16. Implementar la lógica de negocio — Authentication → Validar un Token.
17. Implementar la lógica de negocio — AccountManagement → Cambiar Contraseña.
18. Implementar la lógica de negocio — AccountManagement → Solicitar Recuperación de Contraseña.
19. Implementar la lógica de negocio — AccountManagement → Restablecer Contraseña.
20. Implementar la lógica de negocio — AccountManagement → Editar Perfil / Eliminar Cuenta.

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

1. En el login, auth-service emite un token de sesión opaco (almacenado en `Session` con
   `expiresAt`). El formato, la expiración y la revocación son responsabilidad exclusiva de
   auth-service.
2. El cliente envía el token como `Authorization: Bearer <token>`.
3. Un servicio protegido (cv-service) reenvía el token a `POST /auth/validate`; nunca lo decodifica.
4. auth-service responde con el `User` autenticado (incluyendo `role`) si es válido, o 401.
5. El servicio llamador usa el `user` y su `role` para autorizar a nivel de recurso/ruta (RBAC:
   admin es superconjunto de user).
6. Ante token ausente/inválido/expirado o auth-service caído, se falla cerrado.

### Contrato: el frontend registra un usuario vía auth-service
- `POST /auth/register` (acción personalizada)
- Request: `{ name: <string>, email: <string>, password: <string> }`
- Respuesta: `{ success, message, statusCode, content: { user: <User> } }` (201) en éxito;
  `content: null` con 400 si el email ya está registrado (código custom lanza `BadRequestError`).

### Contrato: el frontend inicia sesión de un usuario vía auth-service
- `POST /auth/login` (acción personalizada)
- Request: `{ email: <string>, password: <string> }`
- Respuesta: `{ ..., content: { token: <string>, user: <User> } }`; `content: null` con 401 si
  las credenciales son inválidas. El `token` se usará como `Authorization: Bearer <token>`.

### Contrato: cv-service valida un token de sesión con auth-service
- `POST /auth/validate` (acción personalizada; base del Protocolo de autenticación)
- Request: `{ token: <string> }`
- Respuesta: `{ ..., content: { user: <User> } }` si el token es válido y no expiró; `content:
  null` con 401 en caso contrario.
- Failure handling: caller (cv-service) reintenta una vez a los 5s; este servicio solo debe
  responder rápido y de forma determinista.

### Contrato: el frontend cierra sesión vía auth-service
- `POST /auth/logout` (acción personalizada). Requiere `Authorization: Bearer <token>`; revoca
  (elimina) la Session de ese token. Respuesta 200 `content: null`. Idempotente.

### Contrato: el frontend cambia la contraseña (usuario autenticado) vía auth-service
- `POST /auth/change-password` (acción personalizada). Requiere `Authorization: Bearer <token>`.
- Request: `{ currentPassword: <string>, newPassword: <string> }`
- Respuesta 200 `content: null`; 401 si `currentPassword` no coincide. Revoca las demás sesiones.

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
- CRUD estándar sobre `User`: `PATCH /user/:id` (name/email), `DELETE /user/:id`. Requiere
  `Authorization: Bearer <token>`; solo la propia cuenta (o un admin sobre cualquiera): un
  no-dueño sin rol admin recibe 403.
- Respuesta: `{ ..., content: <User> | null }`.

### Contrato: auth-service envía el email de recuperación vía Resend
- Caller: auth-service · Callee: Resend
- `POST https://api.resend.com/emails` (API de Resend, no usa el envelope de este proyecto)
- Request: `{ from, to: <email del usuario>, subject, html }`, con el enlace de restablecimiento
  y el PasswordResetToken.
- Response: objeto de Resend con el id del email; un no-2xx significa que no se encoló.
- Failure handling: si Resend falla o no responde, registrar el fallo y responder igualmente
  éxito al frontend (no revela la existencia del email); el usuario puede reintentar.

## 8. Data Models

### auth-service

#### Módulo: Authentication

##### Role
Datos configurables (nuevos roles sin cambiar código).

| Campo  | Tipo    | Requerido | Descripción                                |
| ------ | ------- | --------- | ------------------------------------------ |
| id     | id      | sí        | Identificador único del rol                |
| name   | string  | sí        | Nombre del rol (p. ej., user, admin)       |
| active | boolean | sí        | Si el rol puede asignarse actualmente      |

##### User

| Campo     | Tipo             | Requerido | Descripción                     |
| --------- | ---------------- | --------- | ------------------------------- |
| id        | id               | sí        | Identificador único del usuario |
| name      | string           | sí        | Nombre visible del usuario      |
| email     | string           | sí        | Email de inicio de sesión, único|
| password  | string           | sí        | Contraseña hasheada (data-encrypt)|
| role      | reference → Role | sí        | Rol asignado al usuario         |
| createdAt | datetime         | sí        | Fecha de registro               |

##### Session

| Campo     | Tipo             | Requerido | Descripción                       |
| --------- | ---------------- | --------- | --------------------------------- |
| id        | id               | sí        | Identificador único de la sesión  |
| user      | reference → User | sí        | Dueño de la sesión                |
| token     | string           | sí        | Token de sesión opaco (login)     |
| expiresAt | datetime         | sí        | Fecha de expiración               |

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

## 9. Business Logic

### auth-service

#### Módulo: Authentication
Usa: Role, User, Session
Responsabilidad: Registrar y autenticar usuarios, emitir tokens de sesión y validar tokens para
otros servicios, siendo la autoridad del Protocolo de autenticación.

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
4. Crea una Session con `expiresAt` y devuelve su token opaco.

Resultado: Un token para `Authorization: Bearer`, o error ante credenciales inválidas.

#### Proceso: Cerrar Sesión
1. Recibe el token del header.
2. Elimina la Session con ese token, si existe.

Resultado: Token revocado; validaciones futuras devuelven 401. Idempotente.

#### Proceso: Validar un Token
1. Recibe el token.
2. Busca una Session no expirada con ese token.
3. Si no la encuentra (inexistente o expirada) → 401, content null.
4. Si la encuentra → devuelve el User (incluyendo su role).

Resultado: El User autenticado, o no autorizado. auth-service decide la validez del token.

#### Módulo: AccountManagement
Usa: User, Session, PasswordResetToken, Resend (terceros)
Responsabilidad: Cambiar y recuperar la contraseña y gestionar la cuenta, sobre la propia cuenta
del usuario autenticado (o un admin sobre cualquiera).

#### Proceso: Cambiar Contraseña
1. Recibe currentPassword y newPassword, con el token en el header.
2. Valida la sesión y ubica al User; verifica currentPassword contra el hash.
3. Si no coincide → 401, sin cambios.
4. Hashea newPassword, actualiza el User y revoca las demás Session (deja viva la actual).

Resultado: Contraseña actualizada y otras sesiones cerradas, o error si la actual no coincide.

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

#### Proceso: Editar Perfil / Eliminar Cuenta
1. Valida la sesión e identifica al User autenticado.
2. Confirma que el `:id` objetivo es el propio usuario (o que es admin); si no, 403.
3. Editar perfil: actualiza name/email (rechazando un email ya tomado por otro User). Eliminar:
   borra el User y en cascada sus Session y PasswordResetToken.

Resultado: Perfil actualizado o cuenta eliminada, o error de autorización/validación.
Nota de modularidad: cv-service no se entera de la baja; sus Curriculum quedan huérfanos por id
(sin limpieza en cascada entre servicios, por diseño).
