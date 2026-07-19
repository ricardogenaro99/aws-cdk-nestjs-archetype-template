import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';

// Nota: Estos imports están comentados para evitar errores de compilación por variables no usadas (noUnusedLocals),
// dado que los ejemplos de abajo también están comentados. Descoméntalos conforme los necesites.
// Note: These imports are commented out to prevent 'noUnusedLocals' compilation errors,
// since the examples below are also commented out. Uncomment them as needed.
/*
import {
  TemplateBucket,
  TemplateStringParameter,
  TemplateSecret,
  TemplateLambdaFunction,
  TemplateStateMachine,
  TemplateRestApi,
  TemplateTable
} from './index';

// Import CDK libraries if you instantiate items in comments
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import * as tasks from 'aws-cdk-lib/aws-stepfunctions-tasks';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
*/

export class InfrastructureStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // =========================================================================
    // BASE INFRASTRUCTURE STACK
    // =========================================================================
    // ⚠️ IMPORTANTE / IMPORTANT:
    // NO instanciar recursos de AWS usando directamente las clases de
    // 'aws-cdk-lib' (ej. 's3.Bucket', 'ssm.StringParameter', 'secretsmanager.Secret', etc.).
    //
    // Es MANDATORIO utilizar los constructores pre-configurados (Template Constructs)
    // del arquetipo importándolos desde './index':
    // - 'TemplateBucket' (en lugar de 'Bucket')
    // - 'TemplateStringParameter' (en lugar de 'StringParameter')
    // - 'TemplateSecret' (en lugar de 'Secret')
    // - 'TemplateLambdaFunction' (en lugar de 'Function')
    // - 'TemplateStateMachine' (en lugar de 'StateMachine')
    // - 'TemplateRestApi' (en lugar de 'RestApi')
    // - 'TemplateTable' (en lugar de 'Table')
    //
    // Estos constructores aplican automáticamente los estándares corporativos:
    // 1. Nomenclatura estándar y rutas prefijadas (ej. ssmRootPath, stage prefix).
    // 2. Políticas de seguridad y encriptación por defecto.
    // =========================================================================

    /*
    // =========================================================================
    // EXAMPLE 1: S3 Bucket (TemplateBucket)
    // =========================================================================
    const myBucket = new TemplateBucket(this, 'MyBucket', {
      bucketNameSuffix: 'data-storage', // Custom suffix (automatic naming prefixes apply)
    });
    */

    /*
    // =========================================================================
    // EXAMPLE 1.5: DynamoDB Table (TemplateTable)
    // =========================================================================
    const myTable = new TemplateTable(this, 'MyTable', {
      tableNameSuffix: 'task-data',
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'createdAt', type: dynamodb.AttributeType.NUMBER },
    });
    */

    /*
    // =========================================================================
    // EXAMPLE 2: SSM Parameter Store (TemplateStringParameter)
    // =========================================================================
    const mySsmParameter = new TemplateStringParameter(this, 'MySsmParameter', {
      parameterNameSuffix: 'config/api-url', // Path becomes /${repoAbrev}/${stage}/config/api-url
      stringValue: 'https://api.example.com',
    });
    */

    /*
    // =========================================================================
    // EXAMPLE 3: Secrets Manager (TemplateSecret)
    // =========================================================================
    const mySecret = new TemplateSecret(this, 'MySecret', {
      secretNameSuffix: 'credentials/db', // Path becomes /${repoAbrev}/${stage}/credentials/db
    });
    */

    /*
    // =========================================================================
    // EXAMPLE 4: Lambda Function (TemplateLambdaFunction)
    // =========================================================================
    const myLambda = new TemplateLambdaFunction(this, 'MyApiLambda', {
      functionNameSuffix: 'APIPROC001', // Custom suffix (name prefixes apply)
      handler: 'src/task-manager/infrastructure/bootstrap/App.handler',
      environment: {
        MY_S3_BUCKET: 'placeholder-bucket',
        MY_SSM_PARAMETER: 'placeholder-param',
      },
    });
    */

    /*
    // =========================================================================
    // EXAMPLE 5: Step Function / State Machine (TemplateStateMachine)
    // =========================================================================
    // Define a task for the Step Function calling a Lambda
    const stepTask = new tasks.LambdaInvoke(this, 'StepTask', {
      lambdaFunction: myLambda,
      outputPath: '$.Payload',
    });

    const definition = sfn.Chain.start(stepTask);

    const myStateMachine = new TemplateStateMachine(this, 'MyStateMachine', {
      stateMachineNameSuffix: 'ORCHESTRATION001',
      definitionBody: sfn.DefinitionBody.fromChainable(definition),
    });
    */

    /*
    // =========================================================================
    // EXAMPLE 6: API Gateway Integration (TemplateRestApi)
    // =========================================================================
    const myApiGateway = new TemplateRestApi(this, 'MyApiGateway', {
      apiNameSuffix: 'GATEWAY001',
    });

    // Create a resource and link with Lambda Integration
    const tasksResource = myApiGateway.root.addResource('tasks');
    tasksResource.addMethod('POST', new apigateway.LambdaIntegration(myLambda));
    */
  }
}
