import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import { IFunction } from 'aws-cdk-lib/aws-lambda';

export interface TemplateLambdaIntegrationProps extends Omit<apigateway.LambdaIntegrationOptions, 'proxy'> {
  action: string;
  statusCode?: string;
}

export class TemplateLambdaIntegration extends apigateway.LambdaIntegration {
  constructor(handler: IFunction, props: TemplateLambdaIntegrationProps) {
    const successCode = props.statusCode ?? '200';
    super(handler, {
      proxy: false,
      requestTemplates: {
        'application/json': `{
          "action": "${props.action}",
          "body": $input.json('$'),
          "pathParameters": {
            #foreach($p in $input.params().path.keySet())
            "$p": "$util.escapeJavaScript($input.params().path.get($p))"#if($foreach.hasNext),#end
            #end
          },
          "queryStringParameters": {
            #foreach($q in $input.params().querystring.keySet())
            "$q": "$util.escapeJavaScript($input.params().querystring.get($q))"#if($foreach.hasNext),#end
            #end
          },
          "headers": {
            #foreach($h in $input.params().header.keySet())
            "$h": "$util.escapeJavaScript($input.params().header.get($h))"#if($foreach.hasNext),#end
            #end
          }
        }`,
      },
      integrationResponses: [
        {
          statusCode: successCode,
          responseTemplates: {
            'application/json': '$input.path("$.payload")',
          },
        },
      ],
      ...props,
    });
  }
}
