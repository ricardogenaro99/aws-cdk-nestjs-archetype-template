# Infraestructura CDK (`arq-impl-cdk`)

Workspace pnpm con la **app CDK** del servicio y una **biblioteca de constructores** (`Template*`) que estandariza naming, cifrado, retención y políticas de borrado por ambiente.

- Entrypoint: [`bin/infrastructure.ts`](bin/infrastructure.ts). Carga `../../.env` e instancia `InfrastructureStack` con id **`TemplateCdkBaseStack`**.
- Orquestador: [`lib/infrastructure.stack.ts`](lib/infrastructure.stack.ts). Crea la API compartida y los módulos de dominio.
- Biblioteca: todo se exporta desde [`lib/index.ts`](lib/index.ts).

---

## 🗂️ Estructura

```text
infrastructure/
├── bin/infrastructure.ts
├── lib/
│   ├── common/
│   │   ├── config.ts               # Objeto `config` resuelto según STAGE
│   │   └── enum.ts                 # Stage, Region, RegionAbrev, AccountAbrev, TAG, ...
│   ├── construct/
│   │   ├── api/
│   │   │   ├── api-gateway.construct.ts         # TemplateRestApi
│   │   │   └── lambda-integration.construct.ts  # TemplateLambdaIntegration
│   │   ├── database/table.construct.ts          # TemplateTable
│   │   ├── lambda/lambda.construct.ts           # TemplateLambdaFunction
│   │   ├── orchestration/state-machine.construct.ts  # TemplateStateMachine
│   │   ├── sm/secret.construct.ts               # TemplateSecret
│   │   ├── ssm/ssm.construct.ts                 # TemplateStringParameter
│   │   └── storage/bucket.construct.ts          # TemplateBucket
│   ├── interface/config.interface.ts            # ConfigByStage
│   ├── module/task-manager/task-manager.infra.ts
│   ├── util/config.util.ts                      # ConfigUtil.getCurrentStage / setTags
│   ├── util/util.ts                             # Util.generateUniqueIdentifier (sufijo hash SHA-256)
│   ├── infrastructure.stack.ts
│   └── index.ts
├── cdk.json                        # app: npx ts-node bin/infrastructure.ts + feature flags
├── tsconfig.json                   # strict + noUnusedLocals/Parameters, noEmit
└── package.json
```

---

## 📏 Regla de gobernanza

> Dentro de `lib/module/**` y `infrastructure.stack.ts` **no instancies directamente** `s3.Bucket`, `dynamodb.Table`, `lambda.Function`, `apigateway.RestApi`, `ssm.StringParameter`, `secretsmanager.Secret` ni `sfn.StateMachine`. Usa su equivalente `Template*`.
>
> Si necesitas un recurso que no tiene constructor, **agrégalo a `lib/construct/` y expórtalo en `lib/index.ts`** antes de usarlo.

Es una convención de equipo: no hay lint rule que la haga cumplir.

---

## 🧱 Catálogo de constructores

Todos aceptan las props nativas de CDK; los valores de abajo son **defaults** que puedes sobrescribir con props, **excepto el nombre**, que siempre se fuerza.

### `TemplateRestApi` (`apigateway.RestApi`)

| Aspecto          | Valor                                                                                                                                   |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Props propias    | `apiNameSuffix` (req.), `description` (req.)                                                                                            |
| Nombre           | `${regionAbrev}${accountAbrev}APIC${apiNameSuffix}` → ej. `UE1DEVLAPICTSKMGR001`                                                        |
| Stage            | `config.environments` (`desa` / `test` / `prod`)                                                                                        |
| Auth por defecto | `authorizationType: IAM` **+** `apiKeyRequired: true` en cada método                                                                    |
| CORS             | `allowOrigins: ALL`, `allowMethods: ALL`, `allowHeaders: DEFAULT`                                                                       |
| Extras           | Crea **API Key** (`<nombre>-ApiKey`) y **Usage Plan** (`<nombre>-UsagePlan`) asociados al stage. Expuestos como `apiKey` y `usagePlan`. |

### `TemplateLambdaIntegration` (`apigateway.LambdaIntegration`)

| Aspecto       | Valor                                                                                                 |
| ------------- | ----------------------------------------------------------------------------------------------------- |
| Firma         | `new TemplateLambdaIntegration(fn, { action, statusCode? })`                                          |
| Modo          | `proxy: false` (forzado)                                                                              |
| Request (VTL) | `{ "action": "<action>", "body", "pathParameters", "queryStringParameters", "headers" }`              |
| Response      | Solo una integración de éxito (`statusCode`, default `200`) con plantilla `$input.path("$.payload")`. |

> [!WARNING]
> No define respuestas de error (`selectionPattern`). Un error de la Lambda cae en la respuesta por defecto (2xx). Hay que agregar patrones para `400`/`422`/`500`.

### `TemplateLambdaFunction` (`lambda.Function`)

| Aspecto        | Valor                                                                                                                         |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Props propias  | `functionNameSuffix` (req.), `handler` (req., relativo a `/app`, ej. `src/task-manager/infrastructure/bootstrap/App.handler`) |
| Nombre         | `${regionAbrev}${accountAbrev}LMBFACT${functionNameSuffix}`                                                                   |
| Defaults       | `runtime: nodejs22.x`, `memorySize: 512`, `timeout: 30s`, `tracing: DISABLED`                                                 |
| Código         | `Code.fromAsset('<repo>/app')` (excluye `.npmrc`). **Requiere haber corrido `pnpm run build`.**                               |
| Env inyectadas | `TZ=America/Lima`, `STAGE=<stage>` + las que pases                                                                            |
| Logs           | LogGroup explícito `/aws/lambda/<nombre>` con retención por ambiente y `RemovalPolicy.DESTROY` (en todos los ambientes)       |

### `TemplateTable` (`dynamodb.Table`)

| Aspecto       | Valor                                                                                                        |
| ------------- | ------------------------------------------------------------------------------------------------------------ |
| Props propias | `tableNameSuffix?` (si falta, usa el `id` + hash)                                                            |
| Nombre        | `${regionAbrev}${accountAbrev}DBCT${suffix}` en mayúsculas                                                   |
| Defaults      | `PAY_PER_REQUEST`, `AWS_MANAGED` encryption, PITR solo en `PROD`, `RETAIN` en `PROD` / `DESTROY` en el resto |

> [!NOTE]
> Usa `pointInTimeRecovery`, deprecado en `aws-cdk-lib` reciente (la synth emite warning). Migrar a `pointInTimeRecoverySpecification`.

### `TemplateBucket` (`s3.Bucket`)

| Aspecto       | Valor                                                                                                                                                    |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Props propias | `bucketNameSuffix?`                                                                                                                                      |
| Nombre        | `aws-cdk-archetype-bucket-${environments}-${suffix}` (minúsculas; prefijo fijo, cámbialo al instanciar la plantilla)                                     |
| Defaults      | `S3_MANAGED` encryption, `BLOCK_ALL`, `enforceSSL`, `versioned: true`, `RETAIN` + sin auto-delete en `PROD`; `DESTROY` + `autoDeleteObjects` en el resto |

### `TemplateStringParameter` (`ssm.StringParameter`)

Nombre: `parameterName` explícito o `${ssmRootPath}/${parameterNameSuffix ?? id}` → ej. `/ARCHETYPE/DESA/db-url`.

### `TemplateSecret` (`secretsmanager.Secret`)

Nombre: `secretName` explícito o `${ssmRootPath}/${secretNameSuffix ?? id}`. Cifrado con la clave por defecto de Secrets Manager.

### `TemplateStateMachine` (`sfn.StateMachine`)

| Aspecto       | Valor                                           |
| ------------- | ----------------------------------------------- |
| Props propias | `stateMachineNameSuffix` (req.)                 |
| Nombre        | `${regionAbrev}${accountAbrev}STFFACT${suffix}` |
| Defaults      | `timeout: 10 min`, `tracingEnabled: true`       |

---

## ⚙️ Configuración por ambiente (`lib/common/config.ts`)

El ambiente sale de `process.env.STAGE` (`DESA` por defecto; un valor inválido también cae en `DESA`).

| Campo                           | DESA                | TEST                | PROD                |
| ------------------------------- | ------------------- | ------------------- | ------------------- |
| `account.abrev`                 | `DEVL`              | `TEST`              | `PROD`              |
| `account.id`                    | fijo en código      | fijo en código      | fijo en código      |
| `region`                        | `us-east-1` / `UE1` | `us-east-1` / `UE1` | `us-east-1` / `UE1` |
| Retención logs Lambda           | 1 semana            | 4 meses             | 5 meses             |
| Tabla / Bucket `RemovalPolicy`  | `DESTROY`           | `DESTROY`           | `RETAIN`            |
| PITR DynamoDB                   | no                  | no                  | sí                  |
| LogGroup Lambda `RemovalPolicy` | `DESTROY`           | `DESTROY`           | `DESTROY`           |

Otros valores:

- `repoAbrev = 'ARCHETYPE'`: base de `ssmRootPath` (`/ARCHETYPE/<STAGE>`) y del nombre de servicio.
- `service.name = ${regionAbrev}${accountAbrev}MTOCLF${repoAbrev}`.
- `service.tags`: `Name`, `Entorno`, `Ambiente`, `Proyecto`, `Responsable`.

> [!IMPORTANT]
>
> - **Los tags no se aplican.** `ConfigUtil.setTags()` existe pero nadie lo llama, y la synth actual no contiene ninguno. Para activarlos: `ConfigUtil.setTags(app, config.service.tags)` en `bin/infrastructure.ts`.
> - **`account.id` no se usa.** El stack se crea sin `env`, así que despliega en la cuenta de las credenciales activas.
> - `service.name` tampoco se usa como id del stack (es `TemplateCdkBaseStack`).

---

## 🧩 Módulo de ejemplo: `task-manager`

[`module/task-manager/task-manager.infra.ts`](lib/module/task-manager/task-manager.infra.ts) crea:

- `TemplateTable` `TSKMGR001` (PK `taskId`, SK `createdAt`, ambos string).
- `TemplateLambdaFunction` `TSKMGR001` → `App.handler`, con env `TASKS_TABLE_NAME` y permisos `grantReadWriteData`.
- Rutas sobre la API compartida:

| Método | Ruta          | action       | statusCode |
| ------ | ------------- | ------------ | ---------- |
| POST   | `/tasks`      | `createTask` | 201        |
| GET    | `/tasks`      | `getTasks`   | 200        |
| GET    | `/tasks/{id}` | `getTask`    | 200        |
| PUT    | `/tasks/{id}` | `updateTask` | 200        |
| DELETE | `/tasks/{id}` | `deleteTask` | 200        |

Patrón para un módulo nuevo:

```typescript
import { Construct } from 'constructs';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { TemplateLambdaFunction, TemplateLambdaIntegration, TemplateTable } from '../../index';

export interface ProductInfraProps {
  apiGateway: apigateway.RestApi;
}

export class ProductInfra extends Construct {
  constructor(scope: Construct, id: string, props: ProductInfraProps) {
    super(scope, id);

    const table = new TemplateTable(this, 'ProductTable', {
      tableNameSuffix: 'PRODUCT001',
      partitionKey: { name: 'productId', type: dynamodb.AttributeType.STRING },
    });

    const fn = new TemplateLambdaFunction(this, 'ProductLambda', {
      functionNameSuffix: 'PRODUCT001',
      handler: 'src/product/infrastructure/bootstrap/App.handler',
      environment: { PRODUCTS_TABLE_NAME: table.tableName },
    });
    table.grantReadWriteData(fn);

    const products = props.apiGateway.root.addResource('products');
    products.addMethod('POST', new TemplateLambdaIntegration(fn, { action: 'createProduct', statusCode: '201' }), {
      methodResponses: [{ statusCode: '201' }],
    });
  }
}
```

Y en `infrastructure.stack.ts`: `new ProductInfra(this, 'ProductModule', { apiGateway });`.

---

## 🚀 Comandos

Desde la raíz (recomendado; inyectan `.env` vía [`run-cdk.ts`](../run-cdk.ts)):

| Raíz                       | Equivalente en `infrastructure/` | Descripción                           |
| -------------------------- | -------------------------------- | ------------------------------------- |
| `pnpm run infra:bootstrap` | `npx cdk bootstrap`              | Bootstrap de cuenta/región (una vez). |
| `pnpm run infra:synth`     | `pnpm run synth`                 | Genera `cdk.out/`.                    |
| `pnpm run infra:diff`      | `pnpm run diff`                  | Diferencias con lo desplegado.        |
| `pnpm run infra:deploy`    | `pnpm run deploy`                | Despliega.                            |
| `pnpm run infra:destroy`   | `pnpm run destroy`               | Elimina el stack.                     |

> [!WARNING]
> Ningún comando `infra:*` recompila `/app`. Antes de `infra:deploy` ejecuta `pnpm run build` desde la raíz. Dentro de `infrastructure/`, `pnpm run build` sí dispara el build raíz (vía `prebuild`) y luego hace type-check del CDK.

> [!NOTE]
> `cdk.json` define un subconjunto de feature flags. La synth informa que hay otros no configurados (`cdk flags --unstable=flags` para revisarlos).

---

## 👤 Autor

**Ricardo Genaro** · [@ricardogenaro99](https://github.com/ricardogenaro99)
