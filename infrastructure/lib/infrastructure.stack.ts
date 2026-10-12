import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { TemplateCloudFront, TemplateRestApi } from './index';
import { TaskManagerInfra } from './module/task-manager/task-manager.infra';

export class InfrastructureStack extends Stack {
  public readonly cloudFront?: TemplateCloudFront;

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // =========================================================================
    // RECURSOS COMPARTIDOS (TRANSVERSALES)
    // =========================================================================
    // API Gateway compartido por el arquetipo para enrutamiento modular.
    const apiGateway = new TemplateRestApi(this, 'SharedApiGateway', {
      apiNameSuffix: 'TSKMGR001',
      description: 'REST API Task Manager created with CDK Archetype Template',
    });

    // =========================================================================
    // EDGE CDN (CLOUDFRONT CONDICIONAL)
    // =========================================================================
    // Instanciado únicamente si ENABLE_CLOUDFRONT='true' para prevenir LRN-006 en cuentas nuevas
    if (process.env.ENABLE_CLOUDFRONT?.toLowerCase() === 'true') {
      this.cloudFront = new TemplateCloudFront(this, 'PerimeterCloudFront', {
        restApi: apiGateway,
      });
    }

    // =========================================================================
    // MÓDULOS DE INFRAESTRUCTURA DE NEGOCIO (FEATURES)
    // =========================================================================
    // Inicialización de recursos aislados del dominio Task Manager.
    new TaskManagerInfra(this, 'TaskManagerModule', {
      apiGateway,
    });
  }
}

