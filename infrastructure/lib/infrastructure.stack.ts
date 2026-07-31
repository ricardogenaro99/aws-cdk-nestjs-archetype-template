import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { TemplateRestApi } from './index';
import { TaskManagerInfra } from './module/task-manager/task-manager.infra';

export class InfrastructureStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // =========================================================================
    // RECURSOS COMPARTIDOS (TRANSVERSALES)
    // =========================================================================
    // API Gateway compartido por el arquetipo para enrutamiento modular.
    const apiGateway = new TemplateRestApi(this, 'SharedApiGateway', {
      apiNameSuffix: 'TSKMGR001',
    });

    // =========================================================================
    // MÓDULOS DE INFRAESTRUCTURA DE NEGOCIO (FEATURES)
    // =========================================================================
    // Inicialización de recursos aislados del dominio Task Manager.
    new TaskManagerInfra(this, 'TaskManagerModule', {
      apiGateway,
    });
  }
}
