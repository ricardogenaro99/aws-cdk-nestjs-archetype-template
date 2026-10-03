# AWS CDK + NestJS Archetype Template

Arquetipo para construir microservicios **serverless en AWS** con **NestJS 11**, **TypeScript**, **AWS CDK v2** y **pnpm workspaces**, organizado por capas (Dominio → Aplicación → Infraestructura).

Incluye un dominio de ejemplo completo (`task-manager`: CRUD de tareas sobre DynamoDB expuesto por API Gateway REST) y una biblioteca de constructores CDK (`Template*`) que aplican naming, cifrado y políticas de retención por ambiente.

> [!NOTE]
> Este repositorio es una **plantilla** (topic `scaffold-template`). Contiene un [`template.config.json`](template.config.json) consumido por el Scaffolder CLI de [@ricardogenaro99](https://github.com/ricardogenaro99). Ver [Uso como plantilla](#-uso-como-plantilla-scaffolder-cli).

---

## 📑 Contenido

- [Stack](#-stack)
- [Requisitos](#-requisitos)
- [Inicio rápido](#-inicio-rápido)
- [Estructura del repositorio](#-estructura-del-repositorio)
- [Scripts disponibles](#-scripts-disponibles)
- [Variables de entorno](#-variables-de-entorno)
- [API del dominio de ejemplo](#-api-del-dominio-de-ejemplo)
- [Desarrollo local](#-desarrollo-local)
- [Build y despliegue](#-build-y-despliegue)
- [Calidad de código](#-calidad-de-código)
- [Uso como plantilla (Scaffolder CLI)](#-uso-como-plantilla-scaffolder-cli)
- [Limitaciones conocidas](#-limitaciones-conocidas)
- [Documentación relacionada](#-documentación-relacionada)

---

## 🧰 Stack

| Capa               | Tecnología                                                | Versión (según `package.json`)                          |
| ------------------ | --------------------------------------------------------- | ------------------------------------------------------- |
| Runtime            | Node.js                                                   | `>=22` (`.nvmrc` = `22`), Lambda `nodejs22.x`           |
| Lenguaje           | TypeScript                                                | `^5.3`                                                  |
| Framework          | NestJS (`@nestjs/common`, `@nestjs/core`)                 | `11.1.21` (solo `ApplicationContext`, sin HTTP adapter) |
| Middlewares Lambda | `@middy/core`                                             | `4.5.5`                                                 |
| IaC                | `aws-cdk-lib` / `aws-cdk` (CLI)                           | `^2.147.1` (rango declarado)                            |
| SDK AWS            | `@aws-sdk/*` v3 (DynamoDB, S3, SSM, Secrets Manager, SFN) | `^3.609`                                                |
| Servidor local     | Express                                                   | `^5.2`                                                  |
| Gestor de paquetes | pnpm (workspaces)                                         | `packageManager: pnpm@11.14.0`                          |

---

## 📋 Requisitos

- **Node.js 22+** (`nvm use` toma la versión de [`.nvmrc`](.nvmrc)).
- **pnpm 9+** (se fuerza con `preinstall: npx only-allow pnpm`; `npm`/`yarn` fallan a propósito).
- **Credenciales AWS** (vía `.env`, `AWS_PROFILE` o `~/.aws/credentials`) para desplegar **y también para el servidor local**, que lee/escribe en DynamoDB real.
- Cuenta/región con **`cdk bootstrap`** ejecutado (una vez).

---

## 🚀 Inicio rápido

```bash
# 1. Instalar (dispara postinstall → build completo en /app)
pnpm install

# 2. Configurar entorno local
cp .env.example .env   # completar credenciales y STAGE

# 3. Primer despliegue (crea tabla DynamoDB, Lambda y API Gateway)
pnpm run infra:bootstrap   # solo la primera vez por cuenta/región
pnpm run build             # asegura que /app tenga el último código
pnpm run infra:deploy

# 4. Copiar el nombre de la tabla creada a TASKS_TABLE_NAME en .env y levantar local
pnpm start:local
```

---

## 🗂️ Estructura del repositorio

```text
.
├── .husky/                         # Hooks git: pre-commit (tsc) y commit-msg (commitlint)
├── .vscode/                        # Settings y extensiones recomendadas (versionado)
├── infrastructure/                 # Workspace pnpm "arq-impl-cdk" (app + biblioteca CDK)
│   ├── bin/infrastructure.ts       # Entrypoint CDK: carga ../../.env e instancia el stack
│   ├── lib/
│   │   ├── common/                 # config.ts (config por STAGE) y enum.ts
│   │   ├── construct/              # Constructores Template* (api, database, lambda, orchestration, sm, ssm, storage)
│   │   ├── interface/              # ConfigByStage
│   │   ├── module/task-manager/    # Infra del dominio: tabla + lambda + rutas /tasks
│   │   ├── util/                   # ConfigUtil (stage, tags) y Util (ids con hash)
│   │   ├── infrastructure.stack.ts # Orquestador: API compartida + módulos
│   │   └── index.ts                # Barrel de la biblioteca
│   └── cdk.json
├── server-local/                   # Servidor Express de desarrollo con carga dinámica de módulos
│   ├── server.local.ts
│   ├── local-bootstrap.helper.ts   # Contexto NestJS singleton para local
│   └── modules/task-manager.local.ts
├── src/
│   ├── common/
│   │   ├── application/            # RequestDto, excepciones (AppException, CustomException), logger + AsyncLocalStorage
│   │   ├── core/                   # Middlewares middy, catálogo ECORE-*, wrapper instrumentado, excepciones base
│   │   ├── infrastructure/         # Helpers reutilizables: DynamoDbHelper, S3Helper, HttpHelper (aún sin uso en el ejemplo)
│   │   ├── supports/LogContext.ts
│   │   ├── Injectable.ts           # Re-export de @nestjs/common Injectable
│   │   └── Logger.ts               # Re-export de CustomLoggerSupport
│   └── task-manager/               # Dominio de ejemplo
│       ├── domain/                 # model/Task.ts, repository/TaskRepository.ts (puerto), service/TaskDomainService.ts
│       ├── application/            # TaskService, dto/request (Create/Update), validation/TaskValidation
│       └── infrastructure/
│           ├── bootstrap/          # App.ts (handler API), Step.ts (handler Step Functions), HandlerCore, AppModule, AppContextHelper
│           ├── controller/         # TaskController (acciones) y TaskModule (DI)
│           └── repository/         # TaskAwsRepository (DynamoDB)
├── app/                            # ⚙️ Generado por el build (gitignored). Es el asset que se sube a Lambda
├── prepareBuild.ts                 # Genera app/package.json solo con deps de runtime
├── run-cdk.ts                      # Lanzador de CDK que inyecta .env
├── template.config.json            # Metadatos para el Scaffolder CLI
├── ARCHITECTURE.md
└── package.json
```

---

## 📜 Scripts disponibles

| Script                             | Qué hace realmente                                                                                            |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `pnpm install`                     | Instala workspaces y ejecuta `postinstall` → `pnpm run build`.                                                |
| `pnpm run build`                   | `prebuild` (`tsc` de `src/` → `app/`) → `prepareBuild.ts` → `postbuild` (`npm install --omit=dev` en `app/`). |
| `pnpm run tsc` / `tsc:watch`       | Compilación TypeScript de `src/` (sin empaquetar).                                                            |
| `pnpm start:local`                 | Servidor Express con `node --watch` (reinicia al cambiar archivos) en `PORT` o `3000`.                        |
| `pnpm run infra:bootstrap`         | `cdk bootstrap` vía `run-cdk.ts`.                                                                             |
| `pnpm run infra:synth`             | `cdk synth` → `infrastructure/cdk.out/`.                                                                      |
| `pnpm run infra:diff`              | `cdk diff` contra lo desplegado.                                                                              |
| `pnpm run infra:deploy`            | `cdk deploy`. **No recompila `app/`**: ejecuta `pnpm run build` antes.                                        |
| `pnpm run infra:destroy`           | `cdk destroy`.                                                                                                |
| `pnpm run lint` / `lint:fix`       | ESLint (flat config, `typescript-eslint` recommended + prettier).                                             |
| `pnpm run format` / `format:check` | Prettier sobre `ts, js, json, md, yml, yaml`.                                                                 |

---

## 🔐 Variables de entorno

Se leen desde `.env` en la raíz (gitignored) por `run-cdk.ts`, `infrastructure/bin/infrastructure.ts` y `server-local`. Plantilla: [`.env.example`](.env.example).

| Variable                                                            | Usada por              | Descripción                                                                                 |
| ------------------------------------------------------------------- | ---------------------- | ------------------------------------------------------------------------------------------- |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` / `AWS_SESSION_TOKEN` | CDK, SDK local         | Credenciales. Alternativa: `AWS_PROFILE`.                                                   |
| `AWS_REGION` / `AWS_DEFAULT_REGION`                                 | CDK, SDK local         | Región destino del despliegue y del SDK.                                                    |
| `STAGE`                                                             | CDK                    | `DESA` (default) \| `TEST` \| `PROD`. Define naming, retención de logs y `RemovalPolicy`.   |
| `TASKS_TABLE_NAME`                                                  | Lambda, servidor local | Tabla DynamoDB de tareas. En Lambda la inyecta CDK; en local debes copiarla del despliegue. |
| `PORT`                                                              | Servidor local         | Puerto del servidor Express (default `3000`).                                               |

Variables inyectadas automáticamente a toda Lambda creada con `TemplateLambdaFunction`: `TZ=America/Lima`, `STAGE`.

> [!TIP]
> Cualquier variable de entorno de la Lambda cuyo valor empiece con `ssm:` (p. ej. `DB_URL=ssm:/ARCHETYPE/DESA/db-url`) se resuelve contra SSM Parameter Store en la primera invocación del contenedor (`ssmMiddleware`).

---

## 📡 API del dominio de ejemplo

Definida en [`task-manager.infra.ts`](infrastructure/lib/module/task-manager/task-manager.infra.ts). API Gateway usa integración **no-proxy** con plantilla VTL que envía a la Lambda un evento `{ action, body, pathParameters, queryStringParameters, headers }`.

| Método   | Ruta          | `action`     | Body                                                                                        | Respuesta OK |
| -------- | ------------- | ------------ | ------------------------------------------------------------------------------------------- | ------------ |
| `POST`   | `/tasks`      | `createTask` | `{ "title": string (obligatorio), "description": string }`                                  | `201`        |
| `GET`    | `/tasks`      | `getTasks`   | —                                                                                           | `200`        |
| `GET`    | `/tasks/{id}` | `getTask`    | —                                                                                           | `200`        |
| `PUT`    | `/tasks/{id}` | `updateTask` | `{ "title"?, "description"?, "status"?: PENDING \| IN_PROGRESS \| COMPLETED \| CANCELLED }` | `200`        |
| `DELETE` | `/tasks/{id}` | `deleteTask` | —                                                                                           | `200`        |

> [!IMPORTANT]
> **Autenticación en AWS:** `TemplateRestApi` configura por defecto `authorizationType: IAM` **y** `apiKeyRequired: true` en todos los métodos (CORS abierto a todos los orígenes). Para invocar la API desplegada necesitas firmar con **SigV4** y enviar el header **`x-api-key`** (la API Key y el Usage Plan se crean en el mismo stack; el valor se obtiene desde la consola o `aws apigateway get-api-key --include-value`).

---

## 💻 Desarrollo local

```bash
pnpm start:local
```

- Levanta Express en `http://localhost:3000` y monta automáticamente cada archivo `server-local/modules/*.local.ts` que exporte `path`, `router`, `initialize`, `cleanup` y `printHelp`.
- Asigna un `requestId` por petición (header `x-request-id` o generado) usando `AsyncLocalStorage`, para que aparezca en los logs.
- Usa **DynamoDB real**: necesitas credenciales y `TASKS_TABLE_NAME` apuntando a una tabla desplegada.

```bash
curl http://localhost:3000/tasks
curl http://localhost:3000/tasks/task-1
curl -X POST http://localhost:3000/tasks -H "Content-Type: application/json" \
  -d '{"title":"Mi tarea","description":"Detalle"}'
curl -X PUT http://localhost:3000/tasks/task-1 -H "Content-Type: application/json" \
  -d '{"status":"COMPLETED"}'
curl -X DELETE http://localhost:3000/tasks/task-1
```

> [!WARNING]
> El servidor local **invoca el controlador directamente** y no pasa por el handler Lambda (`App.handler`) ni por los middlewares middy. Por eso: (1) cualquier error devuelve `500` (en AWS una `ValidationException` sería `400`, una `BusinessException` `422`), y (2) el mapeo de eventos de API Gateway no se prueba en local.

---

## 📦 Build y despliegue

1. **`tsc`** compila `src/**` a `app/src/**` (`rootDir: ./`, `outDir: app`).
2. **`prepareBuild.ts`** copia el `package.json` raíz a `app/package.json` quitando `devDependencies`, `@aws-sdk/*`, `aws-sdk`, `aws-lambda` y `express` (el SDK v3 ya viene en el runtime `nodejs22.x`).
3. **`postbuild`** instala solo dependencias de producción dentro de `app/`.
4. **CDK** empaqueta `app/` completo como código de **todas** las Lambdas creadas con `TemplateLambdaFunction` (`Code.fromAsset('app')`).

Los comandos `infra:*` pasan por [`run-cdk.ts`](run-cdk.ts), que carga `.env` (si existe) y ejecuta `npx cdk <comando>` dentro de `infrastructure/`. Sin `.env` se usan las credenciales globales.

> [!CAUTION]
> El stack **no fija `env` (account/region)**: se despliega en la cuenta de las credenciales activas, sin importar `config.account.id`. Verifica tu perfil antes de `infra:deploy` / `infra:destroy`.

---

## 🛡️ Calidad de código

- **Pre-commit** ([`.husky/pre-commit`](.husky/pre-commit)): `npx tsc` (solo `src/`; la infraestructura no se compila aquí).
- **Commit-msg**: `commitlint` con `@commitlint/config-conventional` (`feat:`, `fix:`, `docs:`, `chore:`, `refactor:`…).
- **ESLint** flat config: `eslint` + `typescript-eslint` recommended + `eslint-config-prettier`; `no-explicit-any` en `warn`; `no-unused-vars` en `error` (ignora `_prefijo`).
- **Prettier**: comillas simples, `trailingComma: all`, `printWidth: 120`, `endOfLine: lf`.
- **TypeScript**: `src/` usa `strictNullChecks` (no `strict`; `noImplicitAny: false`). `infrastructure/` usa `strict: true` + `noUnusedLocals/Parameters`.
- **Tests**: no hay suite de pruebas ni script `test` todavía.

---

## 🧩 Uso como plantilla (Scaffolder CLI)

El CLI descubre repos con el topic `scaffold-template`, lee [`template.config.json`](template.config.json), clona sin historial, pregunta los valores (`prompts`), aplica `replacements`, crea `.env` desde `.env.example`, ejecuta los hooks y elimina los archivos de `cleanup` (incluido el propio `template.config.json`).

Los reemplazos se hacen sobre **literales reales del código** (p. ej. `aws-cdk-nestjs-archetype-template`, `ARCHETYPE`, `TemplateCdkBaseStack`), de modo que la plantilla sigue compilando y desplegándose tal cual sin pasar por el CLI.

> [!NOTE]
> Los IDs de cuenta AWS por ambiente están fijos en [`config.ts`](infrastructure/lib/common/config.ts). Tras instanciar, revísalos o parametrízalos.

---

## ⚠️ Limitaciones conocidas

Comportamiento actual verificado en el código (pendiente de corrección):

| #   | Área           | Descripción                                                                                                                                                                                                                                                       |
| --- | -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Runtime        | En AWS, `GET/PUT/DELETE /tasks/{id}` no reciben el `id`: `eventSourceMiddleware` pasa al controlador `path` (indefinido en eventos VTL) en vez de `pathParameters`, así que el controlador usa `'unknown'`. En local funciona porque Express provee `req.params`. |
| 2   | API Gateway    | `TemplateLambdaIntegration` solo define la respuesta de éxito (sin `selectionPattern` de error). Los errores de la Lambda terminan en esa respuesta por defecto (2xx) en lugar de 4xx/5xx.                                                                        |
| 3   | Gobernanza     | `config.service.tags` existe pero `ConfigUtil.setTags` nunca se invoca: **ningún recurso recibe tags corporativos**.                                                                                                                                              |
| 4   | Build          | `infra:deploy` no ejecuta `build`; si olvidas `pnpm run build` despliegas un `app/` desactualizado.                                                                                                                                                               |
| 5   | Logs           | El LogGroup de las Lambdas usa `RemovalPolicy.DESTROY` incluso en `PROD`.                                                                                                                                                                                         |
| 6   | Errores        | `TaskService` reutiliza `ECORE-0005` (catálogo: _Identity Not Found_) para "tarea no encontrada", y la validación usa el código `V-001`, fuera del catálogo.                                                                                                      |
| 7   | CDK            | `pointInTimeRecovery` está deprecado (usar `pointInTimeRecoverySpecification`).                                                                                                                                                                                   |
| 8   | Step Functions | `Step.handler` existe en el código pero el stack no crea ninguna State Machine ni Lambda que lo use.                                                                                                                                                              |

---

## 📚 Documentación relacionada

- [ARCHITECTURE.md](ARCHITECTURE.md): capas, flujo de una invocación, decisiones de diseño y cómo agregar un dominio.
- [infrastructure/README.md](infrastructure/README.md): biblioteca CDK, constructores, naming y configuración por ambiente.

---

## 👤 Autor

**Ricardo Genaro** · [@ricardogenaro99](https://github.com/ricardogenaro99)
