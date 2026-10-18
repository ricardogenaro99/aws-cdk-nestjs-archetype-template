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
    const { deployOptions, defaultMethodOptions, defaultCorsPreflightOptions, apiNameSuffix, ...restProps } = props;

    const apiSuffix = apiNameSuffix.startsWith(config.repoAbrev)
      ? apiNameSuffix
      : `${config.repoAbrev}${apiNameSuffix}`;
    const apiName = `${config.region.abrev}${config.account.abrev}APIC${apiSuffix}`;

    super(scope, id, {
      ...restProps,
      restApiName: apiName,
      deployOptions: {
        stageName: deployOptions?.stageName ?? config.environments,
        throttlingRateLimit: 100,
        throttlingBurstLimit: 200,
        metricsEnabled: true,
        ...deployOptions,
      },
      defaultMethodOptions: {
        authorizationType: apigateway.AuthorizationType.IAM,
        apiKeyRequired: true,
        ...defaultMethodOptions,
      },
      defaultCorsPreflightOptions: {
        allowHeaders: apigateway.Cors.DEFAULT_HEADERS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        ...defaultCorsPreflightOptions,
      },
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

    // Inyección de Gateway Responses perimetrales con cabeceras CORS para errores generados por API Gateway (4XX / 5XX)
    this.addGatewayResponse('Default4XXResponse', {
      type: apigateway.ResponseType.DEFAULT_4XX,
      responseHeaders: {
        'Access-Control-Allow-Origin': "'*'",
        'Access-Control-Allow-Headers':
          "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Amz-User-Agent'",
        'Access-Control-Allow-Methods': "'GET,POST,PUT,PATCH,DELETE,OPTIONS'",
      },
    });

    this.addGatewayResponse('Default5XXResponse', {
      type: apigateway.ResponseType.DEFAULT_5XX,
      responseHeaders: {
        'Access-Control-Allow-Origin': "'*'",
        'Access-Control-Allow-Headers':
          "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Amz-User-Agent'",
        'Access-Control-Allow-Methods': "'GET,POST,PUT,PATCH,DELETE,OPTIONS'",
      },
    });
  }
}
