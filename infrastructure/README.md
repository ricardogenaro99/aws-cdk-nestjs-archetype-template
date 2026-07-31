# AWS CDK Biblioteca de Infraestructura (`arq-impl-cdk`)

Este subdirectorio contiene la definición y provisionamiento de la infraestructura del microservicio en AWS mediante **AWS CDK (Cloud Development Kit)** y TypeScript.

Funciona como una **biblioteca reutilizable de constructores abstractos** preconfigurados con las mejores prácticas corporativas de seguridad, gobernanza y estándares de nomenclatura.

---

## 🛠️ Estructura de la Carpeta

```text
├── bin/                          # Entrypoint de la aplicación CDK (instanciación del Stack)
├── lib/
│   ├── common/
│   │   ├── config.ts             # Configuración centralizada por entorno (stage, región, cuenta, tags)
│   │   └── enum.ts               # Enumeraciones (Stage, Region, AccountAbrev, TAG, etc.)
│   ├── construct/                # Constructores abstractos reutilizables (*.construct.ts)
│   │   ├── api/                  # API Gateway pre-configurado (TemplateRestApi)
│   │   ├── database/             # DynamoDB Table segura (TemplateTable) ← NUEVO
│   │   ├── lambda/               # Lambdas con logs estándar y runtime configurado (TemplateLambdaFunction)
│   │   ├── orchestration/        # Step Functions / State Machines (TemplateStateMachine)
│   │   ├── sm/                   # Secrets Manager con prefijos estándar (TemplateSecret)
│   │   ├── ssm/                  # SSM Parameter Store con rutas estandarizadas (TemplateStringParameter)
│   │   └── storage/              # S3 Buckets seguros - SSL, encriptación, KMS (TemplateBucket)
│   ├── interface/
│   │   └── config.interface.ts   # Interfaz TypeScript de la configuración (ConfigByStage)
│   ├── util/
│   │   ├── config.util.ts        # Utilidad para resolver el stage actual (ConfigUtil)
│   │   └── util.ts               # Utilidades generales (Util.generateUniqueIdentifier, etc.)
│   ├── infrastructure.stack.ts   # Stack principal donde se componen los recursos AWS
│   └── index.ts                  # Punto de exportación de toda la biblioteca CDK
├── cdk.json                      # Configuración del CLI de CDK y entrypoint ts-node
├── tsconfig.json                 # Configuración del compilador TS para infraestructura
└── package.json                  # Dependencias CDK y scripts locales de ejecución
```

---

## ⚠️ Regla de Oro / Mandamiento

**NO instanciar recursos de AWS usando directamente las clases nativas de `aws-cdk-lib`** (como `s3.Bucket`, `dynamodb.Table`, `secretsmanager.Secret`, `lambda.Function`, etc.).

Es **MANDATORIO** utilizar los constructores preconfigurados (Template Constructs) de este arquetipo importándolos desde `./lib/index.ts`:

| Constructor               | Reemplaza               | Beneficios Automáticos                                                     |
| ------------------------- | ----------------------- | -------------------------------------------------------------------------- |
| `TemplateBucket`          | `s3.Bucket`             | SSL forzado, bloqueo de acceso público, encriptación habilitada            |
| `TemplateTable`           | `dynamodb.Table`        | `PAY_PER_REQUEST`, encriptación AWS managed, PITR en PROD, naming estándar |
| `TemplateStringParameter` | `ssm.StringParameter`   | Ruta prefijada: `/${repoAbrev}/${stage}/...`                               |
| `TemplateSecret`          | `secretsmanager.Secret` | Nombre prefijado con entorno y abreviaciones corporativas                  |
| `TemplateLambdaFunction`  | `lambda.Function`       | Retención de logs por entorno, nombre con prefijo corporativo              |
| `TemplateStateMachine`    | `sfn.StateMachine`      | Nombre estándar, integración con configuración de entorno                  |
| `TemplateRestApi`         | `apigateway.RestApi`    | Nombre con prefijo corporativo y stage                                     |

### ¿Por qué?

Estos constructores aplican de manera automática:

1. **Nomenclatura estándar**: Prefijos por entorno (`desa`, `test`, `prod`), abreviaciones de región (`UE1`) y cuenta (`DEVL`, `TEST`, `PROD`).
2. **Seguridad por defecto**: Encriptación en reposo obligatoria, bloqueo de acceso público en S3, SSL forzado, políticas de retención de logs configuradas por entorno.
3. **Gobernanza**: Todos los recursos heredan automáticamente las etiquetas corporativas definidas en `config.ts`.

---

## ⚙️ Configuración del Entorno (`/lib/common/config.ts`)

La configuración de infraestructura determina los valores de despliegue según el entorno activo (`STAGE`):

| Propiedad       | Descripción                                                              |
| --------------- | ------------------------------------------------------------------------ |
| `stage`         | Entorno actual: `DESA`, `TEST` o `PROD` (leído vía `ConfigUtil`)         |
| `environments`  | Versión en minúsculas del `stage` (para naming de recursos)              |
| `region.code`   | Región AWS (ej. `us-east-1`)                                             |
| `region.abrev`  | Abreviación corporativa de región (ej. `UE1`)                            |
| `account.id`    | ID de cuenta AWS por entorno                                             |
| `account.abrev` | Abreviación corporativa de cuenta (`DEVL`, `TEST`, `PROD`)               |
| `lambda`        | Configuración de logs Lambda: retención por entorno (1 semana a 5 meses) |
| `ssmRootPath`   | Ruta raíz para SSM: `/${repoAbrev}/${stage}`                             |
| `service.tags`  | Tags corporativos aplicados a todos los recursos del Stack               |

### Retención de Logs Lambda por Entorno

| Entorno | Retención |
| ------- | --------- |
| `DESA`  | 1 semana  |
| `TEST`  | 4 meses   |
| `PROD`  | 5 meses   |

---

## 🧩 Ejemplos de Uso (en `infrastructure.stack.ts`)

El stack principal incluye ejemplos comentados de todos los constructores disponibles:

```typescript
// EXAMPLE: DynamoDB Table (TemplateTable)
const myTable = new TemplateTable(this, 'MyTable', {
  tableNameSuffix: 'task-data',
  partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
  sortKey: { name: 'createdAt', type: dynamodb.AttributeType.NUMBER },
});

// EXAMPLE: Lambda Function (TemplateLambdaFunction)
const myLambda = new TemplateLambdaFunction(this, 'MyApiLambda', {
  functionNameSuffix: 'APIPROC001',
  handler: 'src/task-manager/infrastructure/bootstrap/App.handler',
  environment: {
    BUCKET_NAME: myBucket.bucketName,
    SSM_PARAMETER_NAME: mySsmParameter.parameterName,
  },
});

// EXAMPLE: API Gateway + Lambda Integration (TemplateRestApi)
const myApiGateway = new TemplateRestApi(this, 'MyApiGateway', {
  apiNameSuffix: 'GATEWAY001',
});
const tasksResource = myApiGateway.root.addResource('tasks');
tasksResource.addMethod('POST', new apigateway.LambdaIntegration(myLambda));
```

> [!TIP]
> Descomenta los bloques de ejemplo en [`infrastructure.stack.ts`](lib/infrastructure.stack.ts) a medida que los necesites. Los imports correspondientes están también comentados para evitar errores `noUnusedLocals` del compilador TypeScript.

---

## 🚀 Comandos Disponibles

Ejecuta estos comandos estando situado dentro de la carpeta `infrastructure/`, o usa los atajos `infra:*` desde la raíz del repositorio:

| Comando (local)    | Atajo raíz                 | Descripción                                           |
| ------------------ | -------------------------- | ----------------------------------------------------- |
| `cdk bootstrap`    | `pnpm run infra:bootstrap` | Inicializa el entorno AWS CDK (requerido una vez)     |
| `pnpm run synth`   | `pnpm run infra:synth`     | Sintetiza la plantilla de CloudFormation              |
| `pnpm run diff`    | `pnpm run infra:diff`      | Compara diferencias con la infraestructura desplegada |
| `pnpm run deploy`  | `pnpm run infra:deploy`    | Despliega la infraestructura a AWS                    |
| `pnpm run destroy` | `pnpm run infra:destroy`   | Elimina la infraestructura de AWS                     |

> [!TIP]
> Antes de ejecutar `deploy` o `synth`, el script `prebuild` del workspace raíz correrá automáticamente para compilar la lógica de negocio en `/app`, asegurando que las Lambdas siempre desplieguen el último código compilado.

> [!IMPORTANT]
> Los atajos `infra:*` ejecutan la herramienta `run-cdk.ts` para inyectar automáticamente las variables de tu archivo `.env` de la raíz del proyecto. Si no cuentas con un archivo `.env`, CDK resolverá tus credenciales globales (como `AWS_PROFILE` o las definidas en `~/.aws/credentials`).
