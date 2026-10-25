# CONTEXTO MAESTRO — SSOT DE INGENIERÍA

## AWS CDK + NestJS Archetype Template (`aws-cdk-nestjs-archetype-template`)

> **SSOT (Single Source of Truth)** para el arquetipo base y plantilla oficial de microservicios serverless en AWS para **Genaryth** y el ecosistema de **Ricardo Genaro**.  
> **Versión del Arquetipo:** `1.0.0` | **Runtime:** Node.js 22.x | **IaC:** AWS CDK v2 | **DI:** NestJS 11

---

## 1. Resumen Ejecutivo y Propósito

El repositorio `aws-cdk-nestjs-archetype-template` es el **arquetipo maestro de infraestructura y backend serverless** concebido por Ricardo Genaro para Genaryth. Funciona tanto como un microservicio funcional de referencia (`task-manager`) como una plantilla paramétrica de scaffolding compatible con `@ricardogenaro99/scaffolder` (mediante `template.config.json`).

### Objetivos Clave:

1. **Arranque Ultrarrápido:** Reducir a menos de 5 minutos la creación de un nuevo microservicio backend con infraestructura CloudFormation lista para producción.
2. **Cold Starts Mínimos:** Uso exclusivo de `NestFactory.createApplicationContext` (sin adaptadores pesados como Express o Fastify en Lambda), preservando Inyección de Dependencias y Arquitectura Hexagonal con consumo mínimo de memoria.
3. **Gobierno Cloud y Nomenclatura Estricta:** Biblioteca de constructores `Template*` (`TemplateRestApi`, `TemplateLambdaFunction`, `TemplateTable`, etc.) que aplican hashing seguro de identificadores, cifrado obligatorio, políticas de retención de logs escalonadas (`DESA`, `TEST`, `PROD`) y tagging unificado.
4. **Enrutamiento por VTL y Despacho Middy:** Integración API Gateway REST no-proxy mediante Apache Velocity (VTL) que inyecta la acción (`action`) y mapea respuestas vía `eventSourceMiddleware`.

---

## 2. Especificación Arquitectónica (SAD)

### 2.1 Flujo Integral de Invocación

```mermaid
flowchart LR
    Client["Cliente (SigV4 / API Key)"] --> APIGW["API Gateway REST (No-Proxy + VTL)"]
    APIGW -->|"{ action, body, pathParameters, headers }"| Lambda["Lambda Handler (Node.js 22)"]
    subgraph MiddyPipeline ["Pipeline Middy"]
        RM["requestMiddleware (AsyncLocalStorage)"]
        SM["ssmMiddleware (Cache SSM 'ssm:*')"]
        EM["eventSourceMiddleware (Normalización)"]
    end
    Lambda --> MiddyPipeline
    MiddyPipeline --> App["App.ts Handler"]
    App --> Ctx["AppContextHelper (Singleton DI NestJS)"]
    Ctx --> Core["HandlerCore (Resuelve Controller según action)"]
    Core --> Dispatch["after middleware: controller[action](payload)"]
    Dispatch --> Service["Application Service / Domain"]
    Service --> DDB[("DynamoDB Table")]
    Dispatch --> Res["Response: { payload: data }"]
    Res --> APIGW
```

### 2.2 Estructura por Capas (Arquitectura Hexagonal Pragmática)

El código de negocio (`src/[dominio]`) sigue una separación estricta:

- **`domain/`**: Modelos de entidad (`Task`), interfaces de puertos (`TaskRepository`) y servicios de dominio (`TaskDomainService`). Cero acoplamiento a librerías de AWS SDK.
- **`application/`**: Casos de uso (`TaskService`), validaciones de negocio imperativas (`TaskValidation`), DTOs planos y manejo de excepciones de dominio.
- **`infrastructure/`**:
  - Adaptadores secundarios: Repositorios concretos (`TaskAwsRepository` con `@aws-sdk/lib-dynamodb`).
  - Adaptadores primarios: Controladores (`TaskController` donde cada método corresponde a una `action`).
  - Módulos NestJS (`TaskModule`) con inyección desacoplada vía tokens string (`@Inject('TaskRepository')`).
  - Bootstrap Lambda (`App.ts`, `HandlerCore.ts`, `AppContextHelper.ts`).

### 2.3 Estructura del Proyecto

```text
.
├── .genaryth/                      # Arnés de gobernanza, CI local runner y learnings
│   ├── ci/runner.mjs               # Titanium CI Runner (pnpm ci:local / ci:local:fast)
│   ├── harness/enforcer.mjs        # Guardrails de ejecución y sandboxing (ADR-011)
│   └── learnings.json              # Protocolo ALF (Agent Learning & Feedback)
├── .husky/                         # Hooks git: pre-commit (tsc) y commit-msg (commitlint)
├── docs/                           # Documentación SSOT (Fase Kickoff)
│   ├── CONTEXTO_MAESTRO.md         # Este documento (SSOT técnico y funcional)
│   └── OPERATING_THREADS.md        # Catálogo de hilos de Antigravity
├── infrastructure/                 # Workspace pnpm "@genaryth/archetype-infra" (AWS CDK v2)
│   ├── bin/infrastructure.ts       # Entrypoint CDK con carga de variables .env
│   ├── lib/
│   │   ├── common/                 # config.ts (ambientes DESA/TEST/PROD), enum.ts
│   │   ├── construct/              # Constructores Template* reutilizables (API, Lambda, DDB, Aurora, WAF, CloudFront)
│   │   ├── module/task-manager/    # Recursos CDK del dominio (Tabla, Lambda, Rutas)
│   │   ├── infrastructure.stack.ts # Stack orquestador
│   │   └── index.ts                # Barrel export de constructores
│   └── cdk.json
├── server-local/                   # Servidor Express (Puerto 3001) para emulación local y Swagger
├── src/
│   ├── common/                     # Núcleo transversal: middlewares, logging SSOT, excepciones
│   └── task-manager/               # Microservicio/dominio de referencia
├── template.config.json            # Metadatos y transformaciones Mustache para @ricardogenaro99/scaffolder v1.3+
├── prepareBuild.ts                 # Script de empaquetado optimizado para /app (excluye AWS SDK)
├── GEMINI.md                       # Reglas maestras del repositorio para Agentes IA (SSOT)
├── CLAUDE.md -> GEMINI.md          # Symlink relativo POSIX (ADR-010)
├── AGENTS.md -> GEMINI.md          # Symlink relativo POSIX (ADR-010)
├── .cursorrules -> GEMINI.md       # Symlink relativo POSIX (ADR-010)
└── package.json                    # Workspace raíz "@genaryth/archetype-api" (pnpm)
```

---

## 3. Modelo de Datos y Persistencia

### DynamoDB (Tabla de Ejemplo: `TSKMGR001`)

- **Partition Key (`PK`):** `taskId` (String, formato `task-<timestamp>`)
- **Sort Key (`SK`):** `createdAt` (String ISO-8601)
- **Billing Mode:** `PAY_PER_REQUEST` (On-Demand)
- **Point-in-Time Recovery (PITR):** Activado en `PROD`
- **Cifrado:** AWS Managed Key (KMS)
- **RemovalPolicy:** `DESTROY` en `DESA`/`TEST`, `RETAIN` en `PROD`

---

## 4. Requerimientos No Funcionales y SLAs

1. **Latencia de Cold Start:** < 850 ms (sin VPC, Node 22 ESM/CJS, bundle podado sin `@aws-sdk/*` embebido).
2. **Warm Invocation Duration:** < 35 ms para operaciones simples de lectura/escritura en DynamoDB.
3. **Consumo de Memoria:** Lambda configurada en 512 MB (óptimo balance vCPU/costo en AWS).
4. **Seguridad y Cifrado:**
   - Cifrado en tránsito forzado (TLS 1.2+ en API Gateway).
   - Variables de entorno sensibles cargadas dinámicamente vía SSM Parameter Store con prefijo `ssm:*` resuelto en memoria por `ssmMiddleware`.
   - Tags de trazabilidad y auditoría obligatorios (`Name`, `Entorno`, `Ambiente`, `Proyecto`, `Responsable`).

---

## 5. Roadmap de Evolución del Arquetipo

### Sprint 1: Hardening de Errores, Calidad y Gobernanza (Completado)

- [x] Documentación SSOT (`CONTEXTO_MAESTRO.md`, `OPERATING_THREADS.md`, `GEMINI.md`).
- [x] Mapeo de errores y Gateway Responses perimetrales en API Gateway con cabeceras CORS (`DEFAULT_4XX`, `DEFAULT_5XX`).
- [x] Consolidación de SSOT de logging y erradicación de duplicados de `LogContext.ts`.
- [x] Mitigación de cuota de 20 KB en políticas de recursos Lambda (`scopePermissionToMethod: false`, `allowTestInvoke: false`).
- [x] Segregación de puerto local (`3001`) para evitar colisiones con microservicios cliente (ADR-013).
- [x] Arnés de ejecución, guardrails y Quality Gate local con Titanium CI Runner (`pnpm run ci:local`).

### Sprint 2: Compatibilidad y Scaffolder CLI v1.3+

- [x] Validar y testear reemplazos de `template.config.json` con sintaxis Mustache `{{PROJECT_NAME}}`.
- [x] Estandarización de nombres con scope empresarial (`@genaryth/archetype-api`, `@genaryth/archetype-infra`).
- [ ] Agregar soporte para multi-región en `infrastructure/lib/common/config.ts`.
- [ ] Crear plantilla de tests de integración para Lambdas simuladas.

### Sprint 3: Observabilidad y Métricas

- [ ] Integrar métricas embebidas (CloudWatch EMF) en `createInstrumentedWrapper`.
- [ ] Configurar alarmas CloudWatch automáticas en `TemplateLambdaFunction` (errores 5xx, throttling).
- [ ] Dashboard automático de CloudWatch sintetizado en CDK.

### Sprint 4: Automatización CI/CD

- [x] Quality Gate unificado local (`pnpm run ci:local` y `ci:local:fast`) antes de pre-push.
- [ ] Pipelines de GitHub Actions para validación remota (`typecheck`, `lint`, `format:check`).
- [ ] Despliegue continuo condicional a cuentas de AWS por branch (`develop` -> DESA, `main` -> PROD).
