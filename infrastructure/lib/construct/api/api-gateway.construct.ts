import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import { Construct } from 'constructs';
import { config } from '../../common/config';

export interface TemplateRestApiProps extends Omit<apigateway.RestApiProps, 'restApiName'> {
  apiNameSuffix: string;
}

export class TemplateRestApi extends apigateway.RestApi {
  constructor(scope: Construct, id: string, props: TemplateRestApiProps) {
    const apiName = `${config.region.abrev}${config.account.abrev}APIC${props.apiNameSuffix}`;

    super(scope, id, {
      description: 'REST API created with CDK Archetype Template',
      deployOptions: {
        stageName: config.environments,
      },
      defaultCorsPreflightOptions: {
        allowHeaders: apigateway.Cors.DEFAULT_HEADERS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
      },
      ...props,
      restApiName: apiName,
    });
  }
}
