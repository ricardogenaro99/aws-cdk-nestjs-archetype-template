import { Construct } from 'constructs';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { TemplateLambdaFunction, TemplateLambdaIntegration, TemplateTable } from '../../index';
import { config } from '../../common/config';

export interface TaskManagerInfraProps {
  apiGateway: apigateway.RestApi;
}

export class TaskManagerInfra extends Construct {
  public readonly lambda: TemplateLambdaFunction;
  public readonly table: TemplateTable;
  public readonly jwtSecretParam: ssm.StringParameter;

  constructor(scope: Construct, id: string, props: TaskManagerInfraProps) {
    super(scope, id);

    // 0. SSM Parameter Store Standard para Secret de Firma JWT ($0.00)
    this.jwtSecretParam = new ssm.StringParameter(this, 'TaskManagerJwtSecretParam', {
      parameterName: `${config.ssmRootPath}/jwt-secret`,
      description: `JWT Secret Parameter for ${config.repoAbrev} (SSM Standard $0.00)`,
      stringValue: process.env.JWT_SECRET || 'super_secret_jwt_key_genaryth_2026',
    });

    // 1. Base de datos del módulo (DynamoDB Table)
    this.table = new TemplateTable(this, 'TaskTable', {
      tableNameSuffix: 'TSKMGR001',
      partitionKey: { name: 'taskId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING },
    });

    // 2. Lambda Function del módulo
    this.lambda = new TemplateLambdaFunction(this, 'TaskManagerLambda', {
      functionNameSuffix: 'TSKMGR001',
      handler: 'src/task-manager/infrastructure/bootstrap/App.handler',
      description: 'Task Manager Lambda Function',
      environment: {
        TASKS_TABLE_NAME: this.table.tableName,
        DATABASE_URL:
          process.env.DATABASE_URL ||
          'postgresql://user:password@localhost:5432/postgres?schema=public',
        DIRECT_URL:
          process.env.DIRECT_URL ||
          process.env.DATABASE_URL ||
          'postgresql://user:password@localhost:5432/postgres?schema=public',
        JWT_SECRET: process.env.JWT_SECRET || 'super_secret_jwt_key_genaryth_2026',
      },
    });

    // Otorgar permisos IAM de lectura del SSM parameter JWT a la Lambda
    this.jwtSecretParam.grantRead(this.lambda);

    // Otorgar permisos de lectura y escritura a la Lambda sobre la tabla
    this.table.grantReadWriteData(this.lambda);

    // 3. Registrar endpoints en el API Gateway compartido
    const tasksResource = props.apiGateway.root.addResource('tasks');

    // Mapear POST /tasks -> createTask (Crea recurso)
    tasksResource.addMethod(
      'POST',
      new TemplateLambdaIntegration(this.lambda, { action: 'createTask', statusCode: '201' }),
      {
        methodResponses: [{ statusCode: '201' }],
      },
    );

    // Mapear GET /tasks -> getTasks (Listar recursos)
    tasksResource.addMethod(
      'GET',
      new TemplateLambdaIntegration(this.lambda, { action: 'getTasks', statusCode: '200' }),
      {
        methodResponses: [{ statusCode: '200' }],
      },
    );

    // Recursos individuales: /tasks/{id}
    const singleTaskResource = tasksResource.addResource('{id}');

    // Mapear GET /tasks/{id} -> getTask (Obtener uno)
    singleTaskResource.addMethod(
      'GET',
      new TemplateLambdaIntegration(this.lambda, { action: 'getTask', statusCode: '200' }),
      {
        methodResponses: [{ statusCode: '200' }],
      },
    );

    // Mapear PUT /tasks/{id} -> updateTask (Actualizar)
    singleTaskResource.addMethod(
      'PUT',
      new TemplateLambdaIntegration(this.lambda, { action: 'updateTask', statusCode: '200' }),
      {
        methodResponses: [{ statusCode: '200' }],
      },
    );

    // Mapear DELETE /tasks/{id} -> deleteTask (Eliminar)
    singleTaskResource.addMethod(
      'DELETE',
      new TemplateLambdaIntegration(this.lambda, { action: 'deleteTask', statusCode: '200' }),
      {
        methodResponses: [{ statusCode: '200' }],
      },
    );
  }
}
