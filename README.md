# AWS CDK NestJS Archetype Template

Este repositorio es una plantilla base (arquetipo) para el desarrollo de microservicios serverless utilizando **AWS CDK (Cloud Development Kit)**, **TypeScript** y **NestJS** bajo principios de arquitectura limpia.

Permite desarrollar la lógica de negocio de manera desacoplada del proveedor de nube y proporciona una biblioteca de constructores abstractos preconfigurados con las mejores prácticas y estándares de nomenclatura corporativos.

---

## 📋 Requisitos Previos

Antes de comenzar, asegúrate de tener instalado en tu máquina:

- **Node.js**: `v22.x` o superior (se incluye un archivo [`.nvmrc`](.nvmrc) para gestionar la versión usando `nvm`).
- **pnpm**: `v9.x` o superior (se recomienda `v11.x` definida en [`package.json`](package.json) vía `packageManager`).

> [!NOTE]
> El campo `preinstall` del `package.json` ejecuta `npx only-allow pnpm` para forzar el uso exclusivo de `pnpm` como gestor de paquetes.

---

## 🛠️ Arquitectura del Proyecto

Para una explicación detallada de los principios de diseño, la integración de NestJS con Lambda y la gobernanza de CDK, consulta el documento de [Arquitectura y Diseño Técnico](ARCHITECTURE.md).

El proyecto está dividido en dos partes principales:

1. **`src/`**: Contiene el código fuente de la lógica de negocio y controladores del microservicio bajo principios de **Clean Architecture** (Dominio → Aplicación → Infraestructura).
2. **`infrastructure/`**: Contiene la definición de infraestructura de AWS CDK como una biblioteca reutilizable de constructores (`*.construct.ts`).

### Estructura de Directorios

```text
├── .husky/                        # Git hooks (pre-commit, commit-msg)
├── infrastructure/                # Biblioteca de Constructores CDK
│   ├── bin/                       # Entrypoint del CDK App
│   ├── lib/
│   │   ├── common/                # Configuración del entorno (config.ts, enum.ts)
│   │   ├── construct/             # Constructores abstractos reutilizables
│   │   │   ├── api/               # API Gateway pre-configurado (TemplateRestApi)
│   │   │   ├── database/          # DynamoDB Table segura (TemplateTable) ← NUEVO
│   │   │   ├── lambda/            # Lambdas con logs y variables estándar (TemplateLambdaFunction)
│   │   │   ├── orchestration/     # Step Functions / State Machines (TemplateStateMachine)
│   │   │   ├── sm/                # Secrets Manager con prefijos (TemplateSecret)
│   │   │   ├── ssm/               # SSM Parameter Store (TemplateStringParameter)
│   │   │   └── storage/           # S3 Buckets seguros (TemplateBucket)
│   │   ├── interface/             # Interfaces de configuración (config.interface.ts)
│   │   ├── util/                  # Utilidades (config.util.ts, util.ts)
│   │   ├── infrastructure.stack.ts # Stack principal donde se componen los recursos
│   │   └── index.ts               # Punto de exportación de la biblioteca CDK
│   ├── cdk.json                   # Configuración del CLI de CDK
│   └── tsconfig.json              # Config del compilador TS para CDK
├── src/                           # Código de lógica de negocio (Lambda Handlers)
│   ├── common/
│   │   ├── application/
│   │   │   ├── dto/               # RequestDto (contrato de request estandarizado)
│   │   │   ├── exception/         # AppException, CustomException, ErrorConstants
│   │   │   └── supports/          # CustomLoggerSupport, LogContext, index
│   │   ├── core/                  # Núcleo del runtime Lambda
│   │   │   ├── business.exception.ts   # Excepción de negocio (BusinessException)
│   │   │   ├── event-source.middleware.ts # Middleware de normalización de eventos
│   │   │   ├── exceptions.constant.ts  # Catálogo de códigos de error (ECORE-*)
│   │   │   ├── http.constant.ts        # Constantes HTTP (status codes)
│   │   │   ├── index.ts               # Barrel exports del core
│   │   │   ├── lambda-bootstrap.helper.ts # createInstrumentedWrapper + sanitize
│   │   │   ├── request.middleware.ts   # Middleware de contexto de request
│   │   │   ├── ssm.middleware.ts       # Middleware de carga de SSM
│   │   │   ├── types.util.ts           # Utilidades de tipos (isEmpty, etc.)
│   │   │   └── validation.exception.ts # Excepción de validación (ValidationException)
│   │   ├── supports/
│   │   │   └── LogContext.ts          # AsyncLocalStorage para Request ID
│   │   ├── Injectable.ts              # Re-exporta @nestjs/common Injectable
│   │   └── Logger.ts                  # Re-exporta CustomLoggerSupport como Logger
│   └── task-manager/                  # Dominio de ejemplo (arquetipo)
│       ├── application/
│       │   ├── dto/request/           # InitiateTaskRequest DTO
│       │   ├── mappers/               # TaskRequestMapper
│       │   ├── validation/            # TaskValidation
│       │   └── TaskService.ts         # Servicio de aplicación
│       ├── domain/
│       │   ├── repository/            # Interface TaskRepository (contrato)
│       │   ├── service/               # TaskDomainService (reglas de negocio)
│       │   └── Task.ts                # Entidad de dominio
│       └── infrastructure/
│           ├── bootstrap/
│           │   ├── helpers/           # AppContextHelper (singleton NestJS context)
│           │   ├── App.ts             # Handler principal + pipeline de middlewares
│           │   ├── AppModule.ts       # Módulo NestJS raíz
│           │   ├── HandlerCore.ts     # Routing de actions al controlador
│           │   └── Step.ts            # Entrypoint del Lambda (re-exports)
│           ├── controller/
│           │   ├── TaskController.ts  # Controlador de actions (initiateTask, getStatus)
│           │   └── TaskModule.ts      # Módulo NestJS del dominio
│           └── repository/
│               └── TaskAwsRepository.ts # Implementación AWS (S3, SSM, Secrets, SFN)
├── server-local/                  # Servidor Express de desarrollo local
├── prepareBuild.ts                # Script de empaquetado para producción (genera /app)
├── tsconfig.json                  # Config raíz del compilador TypeScript
├── eslint.config.mjs              # Configuración de ESLint (Flat Config)
├── commitlint.config.cjs          # Reglas de Conventional Commits
├── .prettierrc                    # Configuración de Prettier
├── pnpm-workspace.yaml            # Definición de workspaces pnpm
└── package.json                   # Scripts y dependencias raíz
```

---

## 🚀 Desarrollo Local

Para probar tus Lambda Handlers localmente sin necesidad de desplegar en AWS, puedes iniciar el servidor de desarrollo local express:

### Iniciar Servidor Local

```bash
pnpm start:local
```

El servidor local se levantará en `http://localhost:3000` y mapeará las solicitudes HTTP directamente a tus controladores de Lambda, simulando un entorno de API Gateway con inyección de Request ID única.

#### Probar Endpoints con curl:

- **Obtener Estado**:
  ```bash
  curl http://localhost:3000/tasks
  ```
- **Crear Tarea**:
  ```bash
  curl -X POST http://localhost:3000/tasks \
    -H "Content-Type: application/json" \
    -d '{"payload": "Hola Mundo"}'
  ```

### 📦 Carga Dinámica de Módulos Locales

El servidor de desarrollo (`server-local/server.local.ts`) utiliza un mecanismo de **autodescubrimiento y carga dinámica**.

Cualquier archivo creado dentro del directorio [`server-local/modules/`](server-local/modules) con la extensión `*.local.ts` será detectado y montado automáticamente al iniciar el servidor, siempre que exporte las siguientes propiedades:

- **`path`**: Ruta HTTP base en la que se expondrá el módulo (ej. `/tasks`).
- **`router`**: Router de Express que expone los endpoints locales.
- **`initialize`**: Función asíncrona de inicialización (ej. para levantar el contenedor de NestJS).
- **`cleanup`**: Función asíncrona de limpieza para liberar recursos en apagados graceful (SIGINT/SIGTERM).
- **`printHelp`**: Función para imprimir instrucciones de prueba en consola al iniciar.

---

## 📦 Instalación, Construcción y Despliegue

### 1. Instalación de Dependencias

El repositorio utiliza **pnpm workspaces**. Para instalar todas las dependencias (tanto de la raíz como del workspace de infraestructura) ejecuta desde la raíz:

```bash
pnpm install
```

> [!NOTE]
> Al finalizar la instalación, se ejecutará automáticamente el hook `postinstall` (`pnpm run build`), el cual:
>
> 1. **`prebuild`**: Compila todos los TypeScript de `src/` vía `tsc`.
> 2. **`build`**: Ejecuta `prepareBuild.ts` para generar la carpeta `/app` con el `package.json` de producción y el `.npmrc`.
> 3. **`postbuild`**: Entra a `/app` y ejecuta `pnpm run package:install` para instalar únicamente las dependencias de producción.

### 2. Compilar la Lógica del Proyecto Manualmente

Si haces cambios en `src/` y deseas volver a compilar manualmente:

```bash
pnpm run build
```

### 3. Comandos de TypeScript

```bash
# Compilación única
pnpm run tsc

# Compilación en modo watch
pnpm run tsc:watch
```

### 4. Comandos de AWS CDK (Infraestructura)

Puedes ejecutar los comandos de CDK directamente desde la raíz usando los atajos del `package.json`:

#### Desde la raíz (Recomendado):

- **Inicializar entorno AWS (bootstrap)** (requerido una única vez por cuenta/región):
  ```bash
  pnpm run infra:bootstrap
  ```
- **Sintetizar la plantilla CloudFormation**:
  ```bash
  pnpm run infra:synth
  ```
- **Comparar cambios con lo desplegado (diff)**:
  ```bash
  pnpm run infra:diff
  ```
- **Desplegar a AWS**:
  ```bash
  pnpm run infra:deploy
  ```
- **Destruir recursos de AWS**:
  ```bash
  pnpm run infra:destroy
  ```

> [!TIP]
> Todos los comandos `infra:*` ejecutan el script cargador [`run-cdk.ts`](run-cdk.ts). Este script busca automáticamente un archivo `.env` en la raíz del proyecto para cargar y pasar las credenciales de AWS al CLI de CDK. Si no hay un `.env`, utiliza automáticamente tus credenciales y perfiles de AWS globales.

#### Desde la carpeta `infrastructure/`:

```bash
cd infrastructure
pnpm run synth
pnpm run deploy
```

---

## 🔌 Pipeline de Middlewares Lambda

Cada Lambda Handler del arquetipo ejecuta el siguiente pipeline de middlewares en orden (gestionado por `@middy/core`):

```
Invocación Lambda
       ↓
[requestMiddleware]     → Inyecta contexto de request y loggea el inicio
       ↓
[ssmMiddleware]         → Resuelve variables de entorno con prefijo `ssm:` usando AWS SSM
       ↓
[eventSourceMiddleware] → Detecta y normaliza el evento (API Gateway, S3, SNS, SQS, EventBridge, Step Functions, Lambda Directo)
       ↓
[Handler / bootstrap]   → Obtiene el contexto NestJS (singleton) y ejecuta el controlador
```

> [!TIP]
> El `createInstrumentedWrapper` en `lambda-bootstrap.helper.ts` encapsula el handler en un `AsyncLocalStorage` de Node.js para propagar el `requestId` de forma transparente a todos los logs.

---

## 📡 Fuentes de Eventos Soportadas

El `eventSourceMiddleware` detecta y normaliza automáticamente los siguientes orígenes:

| Fuente             | Detección                              | Payload resultante                                               |
| ------------------ | -------------------------------------- | ---------------------------------------------------------------- |
| **API Gateway**    | `httpMethod` / `action` / `origin`     | `{ body, pathParameters, query, headers, path, method, action }` |
| **S3**             | `Records[0].eventSource === 'aws:s3'`  | `[{ bucket, key, eventName }]`                                   |
| **SNS**            | `Records[0].EventSource === 'aws:sns'` | `[{ message, messageAttributes }]`                               |
| **SQS**            | `Records[0].eventSource === 'aws:sqs'` | `[{ messageId, body, attributes }]`                              |
| **EventBridge**    | `detail-type` presente                 | `event.detail` (objeto completo)                                 |
| **Step Functions** | Fallback general                       | `{ action, payload }`                                            |
| **Lambda Directo** | `action` presente                      | `{ action, payload }`                                            |

---

## 🧱 Constructores CDK Disponibles

> [!IMPORTANT]
> Es **MANDATORIO** usar estos constructores en lugar de las clases nativas de `aws-cdk-lib`. Se importan desde `infrastructure/lib/index.ts`.

| Constructor               | Reemplaza               | Descripción                                                            |
| ------------------------- | ----------------------- | ---------------------------------------------------------------------- |
| `TemplateBucket`          | `s3.Bucket`             | S3 Bucket con SSL forzado, encriptación y bloqueo de acceso público    |
| `TemplateTable`           | `dynamodb.Table`        | DynamoDB Table con `PAY_PER_REQUEST`, encriptación y PITR en PROD      |
| `TemplateStringParameter` | `ssm.StringParameter`   | Parámetro SSM con ruta prefijada `/${repoAbrev}/${stage}/...`          |
| `TemplateSecret`          | `secretsmanager.Secret` | Secret con prefijo corporativo en el nombre                            |
| `TemplateLambdaFunction`  | `lambda.Function`       | Lambda con retención de logs configurada por entorno y naming estándar |
| `TemplateStateMachine`    | `sfn.StateMachine`      | State Machine con naming estándar corporativo                          |
| `TemplateRestApi`         | `apigateway.RestApi`    | API Gateway con naming estándar                                        |

---

## ⚠️ Catálogo de Excepciones

Los códigos de error estándar del arquetipo (`EXCEPTION_CONSTANT`) son:

| Código       | Clave                           | Mensaje                           |
| ------------ | ------------------------------- | --------------------------------- |
| `ECORE-0001` | `REQUEST_STRUCTURE_EXCEPTION`   | Request Structure Exception       |
| `ECORE-0002` | `VALIDATION_EXCEPTION`          | Validation Exception              |
| `ECORE-0003` | `REQUEST_HANDLER_EXCEPTION`     | Request Handler Exception         |
| `ECORE-0004` | `UNHANDLED_EXCEPTION`           | Unhandled Exception               |
| `ECORE-0005` | `IDENTITY_NOT_FOUND_EXCEPTION`  | Identity Not Found                |
| `ECORE-0006` | `ID_CLIENT_NOT_FOUND_EXCEPTION` | Id Client Not Found               |
| `ECORE-0007` | `NOT_FOUND_SESSION_EXCEPTION`   | User Session Not Found            |
| `ECORE-0008` | `EXPIRED_SESSION_EXCEPTION`     | User Session Expired              |
| `ECORE-0009` | `DUPLICATED_SESSION_EXCEPTION`  | Duplicated User Session Exception |
| `ECORE-0010` | `AUTHENTICATION_EXCEPTION`      | Authentication Exception          |
| `ECORE-0011` | `AUTHORIZATION_EXCEPTION`       | Authorization Exception           |

---

## 🛡️ Calidad de Código y Git Hooks

Este repositorio incluye reglas estrictas de desarrollo:

- **Estructura de Commits**: Enforced por **Husky** y **Commitlint** usando el estándar **Conventional Commits** (`feat:`, `fix:`, `chore:`, `docs:`, etc.).
- **Pre-Commit Check**: Antes de cada commit, se ejecuta automáticamente `npx tsc` para evitar subir código con errores de compilación TypeScript.
- **Estilo de Código**: Formateado consistente con **Prettier** y **EditorConfig**.

```bash
# Formatear todo el código manualmente
pnpm run format

# Verificar formato sin modificar
pnpm run format:check

# Ejecutar linter
pnpm run lint

# Ejecutar linter con auto-fix
pnpm run lint:fix
```

---

## 👥 Créditos / Autor

Este proyecto fue desarrollado y estructurado por:

- **Ricardo Genaro** - [@ricardogenaro99](https://github.com/ricardogenaro99)
