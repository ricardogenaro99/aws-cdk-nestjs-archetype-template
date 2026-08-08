import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import { Construct } from 'constructs';
import { config } from '../../common/config';

export interface TemplateRestApiProps extends Omit<apigateway.RestApiProps, 'restApiName'> {
  apiNameSuffix: string;
  description: string;
}

export class TemplateRestApi extends apigateway.RestApi {
  public readonly apiKey: apigateway.IApiKey;
  public readonly usagePlan: apigateway.IUsagePlan;

  constructor(scope: Construct, id: string, props: TemplateRestApiProps) {
    const apiName = `${config.region.abrev}${config.account.abrev}APIC${props.apiNameSuffix}`;

    super(scope, id, {
      deployOptions: {
        stageName: config.environments,
      },
      defaultMethodOptions: {
        authorizationType: apigateway.AuthorizationType.IAM,
        apiKeyRequired: true,
      },
      defaultCorsPreflightOptions: {
        allowHeaders: apigateway.Cors.DEFAULT_HEADERS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
      },
      ...props,
      restApiName: apiName,
    });

    this.apiKey = new apigateway.ApiKey(this, 'ApiKey', {
      apiKeyName: `${apiName}-ApiKey`,
      description: `API Key for ${apiName}`,
      enabled: true,
    });

    this.usagePlan = new apigateway.UsagePlan(this, 'UsagePlan', {
      name: `${apiName}-UsagePlan`,
      description: `Usage Plan for ${apiName}`,
      apiStages: [
        {
          api: this,
          stage: this.deploymentStage,
        },
      ],
    });

    this.usagePlan.addApiKey(this.apiKey);
  }
}
