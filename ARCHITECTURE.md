# Arquitectura y Diseño Técnico (Template Archetype)

Este documento detalla la arquitectura de software, el flujo de ejecución, la integración de NestJS en entornos Serverless (AWS Lambda) y la gobernanza de infraestructura definida con AWS CDK.

---

## 📋 Resumen de Arquitectura

El arquetipo está diseñado bajo los principios de **Clean Architecture** (Arquitectura Hexagonal / Puertos y Adaptadores), desacoplando completamente las reglas de negocio del framework NestJS y del proveedor de nube (AWS).

```mermaid
graph TD
    subgraph Entrada / Trigger
        APIGW[API Gateway] -->|HTTP Request| APP_H[App.handler Lambda]
        SFN[Step Functions] -->|Task Execution| STEP_H[Step.handler Lambda]
    end

    subgraph Capa de Adaptadores / Infraestructura
        APP_H -->|1. Middy Middlewares| MID[Middlewares: Request, SSM, EventSource]
        MID -->|2. Resolver Contexto| ACH[AppContextHelper NestJS]
        ACH -->|3. Router| HC[HandlerCore]
        HC -->|4. Invocar Action| TC[TaskController]
    end

    subgraph Capa de Aplicación
        TC -->|5. Validar DTO| TV[TaskValidation]
        TC -->|6. Ejecutar| TS[TaskService]
    end

    subgraph Capa de Dominio
        TS -->|7. Reglas de Negocio| TDS[TaskDomainService]
        TDS -->|8. Puerto| TR[TaskRepository Interface]
    end

    subgraph Capa de Adaptadores Salida
        TR -->|9. Adaptador| TAWSR[TaskAwsRepository]
        TAWSR -->|10. SDK/Storage| AWS[(DynamoDB / S3)]
    end

    style Capa de Dominio fill:#f9f,stroke:#333,stroke-width:2px
    style Capa de Aplicación fill:#bbf,stroke:#333,stroke-width:2px
    style Capa de Adaptadores / Infraestructura fill:#ddf,stroke:#333,stroke-width:2px
```

---

## 📂 Capas del Directorio `src/` (Clean Architecture)

### 1. Dominio (`src/task-manager/domain/`)

Es el núcleo de la aplicación. No depende de NestJS, base de datos ni librerías de AWS.

- **Modelos (`/model`)**: Entidades puras de negocio (ej. `Task`).
- **Puertos de Repositorio (`/repository`)**: Interfaces TypeScript que definen el contrato para persistencia o integraciones (ej. `TaskRepository`).
- **Servicios de Dominio (`/service`)**: Contienen la lógica y reglas de negocio puras (`TaskDomainService`).

### 2. Aplicación (`src/task-manager/application/`)

Coordina los flujos de datos hacia y desde la capa de dominio.

- **Casos de Uso / Servicios (`TaskService`)**: Expone la lógica funcional hacia la capa externa.
- **DTOs**: Contratos de datos estrictos para entrada y salida.
- **Validación (`/validation`)**: Validadores de negocio específicos para asegurar la integridad de la entrada antes de procesarla.

### 3. Infraestructura (`src/task-manager/infrastructure/`)

Implementa los adaptadores que conectan el software con tecnologías externas.

- **Controladores (`/controller`)**: Recibe las solicitudes mapeadas, valida el payload y delega la ejecución.
- **Adaptadores de Repositorio (`/repository`)**: Implementación concreta de las interfaces de dominio (ej. `TaskAwsRepository` simulado en memoria o persistido en AWS S3/DynamoDB).
- **Módulos NestJS (`/controller/TaskModule.ts`)**: Módulo específico del dominio para configurar la inyección de dependencias.

---

## ⚡ Integración NestJS & AWS Lambda (Serverless Bootstrapping)

Levantar una aplicación completa de NestJS por cada invocación de Lambda degrada el rendimiento (Cold Starts). Para mitigar esto, el arquetipo implementa un patrón Singleton:

### 1. Contexto NestJS Compartido (`AppContextHelper`)

El archivo `AppContextHelper.ts` instancia y cachea el contexto NestJS de forma persistente entre invocaciones calientes de Lambda:

```typescript
let cachedContext: INestApplicationContext;

export async function getAppContext(): Promise<INestApplicationContext> {
  if (!cachedContext) {
    cachedContext = await NestFactory.createApplicationContext(AppModule);
  }
  return cachedContext;
}
```

### 2. Middleware Pipeline (Middy)

El Handler principal en `App.ts` está envuelto con middleware personalizado para estandarizar el ciclo de vida:

- **`requestMiddleware`**: Genera un ID de transacción (`requestId`) y configura el `AsyncLocalStorage` global.
- **`ssmMiddleware`**: Descarga variables de configuración de SSM Parameter Store.
- **`eventSourceMiddleware`**: Normaliza eventos provenientes de S3, SQS, SNS o API Gateway hacia un formato unificado.

### 3. Router por Acciones (`HandlerCore`)

A diferencia de un servidor web HTTP clásico, las peticiones Lambda se enrutan mediante una propiedad `action` contenida en el evento. `HandlerCore` localiza dinámicamente el controlador y la función a ejecutar basándose en dicha propiedad, evitando usar enrutamiento HTTP completo de Express/Fastify dentro de Lambda.

---

## 🏗️ CDK de Infraestructura (`arq-impl-cdk`)

Toda la infraestructura se define bajo el principio de **Plantillas de Gobernanza** e **Infraestructura Modular por Dominios (Feature-based Infrastructure)**:

### 1. Regla de Oro

> **Queda estrictamente prohibido utilizar clases base de `aws-cdk-lib`** de forma directa en el stack principal.

Debes utilizar los constructores abstractos preconfigurados en `infrastructure/lib/construct/`:

1. **`TemplateBucket` (S3)**: Configura bloqueo de acceso público, políticas SSL forzadas y cifrado KMS por defecto.
2. **`TemplateTable` (DynamoDB)**: Aplica modo bajo demanda (`PAY_PER_REQUEST`), PITR (Point-In-Time Recovery) en producción, y nombres consistentes.
3. **`TemplateLambdaFunction` (Lambda)**: Configura variables de entorno corporativas, empaquetado optimizado, y políticas de retención de logs dinámicas de acuerdo al stage (Desarrollo, Test, Producción).
4. **`TemplateStringParameter` (SSM)**: Genera rutas jerárquicas automatizadas: `/${repoAbrev}/${stage}/${parameterSuffix}`.
5. **`TemplateLambdaIntegration` (API Gateway)**: Mapea solicitudes sin proxy (`proxy: false`) inyectando dinámicamente plantillas VTL para enrutamiento por acciones.

### 2. Infraestructura Modular

Los recursos específicos de un dominio de negocio (ej. Lambdas, tablas de base de datos) se definen dentro de su propio módulo bajo `infrastructure/lib/module/`. El archivo `infrastructure.stack.ts` actúa únicamente como orquestador de alto nivel que inicializa los recursos transversales (como el API Gateway compartido) y los pasa a los respectivos módulos de infraestructura.

---

## 📝 Guía: Cómo crear una nueva funcionalidad

Para agregar una nueva funcionalidad/entidad (ejemplo: `User` o `Product`):

1. **Definir Dominio**:
   - Crea `src/your-domain/domain/model/YourEntity.ts`.
   - Define el puerto en `src/your-domain/domain/repository/YourRepository.ts`.
   - Escribe las reglas de negocio en `src/your-domain/domain/service/YourDomainService.ts`.

2. **Crear Capa de Aplicación**:
   - Define DTOs de entrada y salida.
   - Crea `YourService.ts` en `src/your-domain/application/` inyectando tu servicio de dominio.

3. **Crear Capa de Infraestructura**:
   - Escribe el adaptador concreto en `src/your-domain/infrastructure/repository/YourAwsRepository.ts`.
   - Crea `YourController.ts` y regístralo junto con su módulo en `YourModule.ts`.

4. **Registrar Módulo**:
   - Registra `YourModule` dentro de `src/task-manager/infrastructure/bootstrap/AppModule.ts`.
   - Agrega la acción a la interfaz de enrutamiento en `App.ts`.

5. **Infraestructura**:
   - Crea un constructor de infraestructura modular en `infrastructure/lib/module/your-domain/your-domain.infra.ts`.
   - Instancia este constructor dentro del stack principal (`infrastructure/lib/infrastructure.stack.ts`) pasándole el API Gateway compartido.

---

## 🛡️ Calidad de Código y Estándares de Desarrollo

Este arquetipo implementa controles automáticos para asegurar que el código subido a producción mantenga altos estándares de calidad y legibilidad.

### 1. Compilador de TypeScript (`tsconfig.json`)

La configuración del compilador está diseñada para ser estricta pero eficiente:

- `strictNullChecks: true`: Evita errores comunes al acceder a propiedades de variables que puedan ser `null` o `undefined`.
- `skipLibCheck: true`: Optimiza el tiempo de compilación ignorando la verificación de tipos de las declaraciones en las librerías de `node_modules`.

### 2. Análisis Estático (ESLint Flat Config)

Se utiliza la nueva especificación Flat Config a través de `eslint.config.mjs`:

- Se configuran reglas recomendadas de `@typescript-eslint` y `eslint`.
- Se prohibe el alias de `this` (`@typescript-eslint/no-this-alias`) para obligar a usar contextos léxicos correctos (arrow functions y `this` directo).
- Se audita la presencia de variables declaradas y no utilizadas (`@typescript-eslint/no-unused-vars`).
- Se ignoran las librerías de distribución interna (`app/`, `cdk.out/`) y archivos de configuración externos.

### 3. Formateo y Estilo de Código (Prettier)

Configurado a través de `.prettierrc` para imponer consistencia estilística:

- Comas finales obligatorias en objetos de varias líneas (`trailingComma: "all"`).
- Comillas simples para strings (`singleQuote: true`).
- Ancho de línea máximo de 120 caracteres (`printWidth: 120`).

### 4. Git Hooks con Husky y Commitlint

- **Pre-commit (`.husky/pre-commit`)**: Ejecuta automáticamente `npx tsc` para asegurar que el código compile localmente antes de que se pueda realizar el commit.
- **Commit-msg (`.husky/commit-msg`)**: Valida que los mensajes de Git cumplan con el estándar de **Conventional Commits** (ej. `feat:`, `fix:`, `docs:`, `refactor:`, `chore:`).

---

## 👤 Autor

- **Ricardo Genaro** - [@ricardogenaro99](https://github.com/ricardogenaro99)
