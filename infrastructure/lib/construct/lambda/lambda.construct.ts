import { Code, Function, FunctionProps, Runtime, Tracing } from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';
import { resolve } from 'node:path';
import { LogGroup } from 'aws-cdk-lib/aws-logs';
import { Duration, RemovalPolicy } from 'aws-cdk-lib';
import { config } from '../../common/config';
import { Util } from '../../util/util';

export interface TemplateLambdaFunctionProps extends Partial<FunctionProps> {
  functionNameSuffix: string;
  handler: string;
}

export class TemplateLambdaFunction extends Function {
  constructor(scope: Construct, id: string, props: TemplateLambdaFunctionProps) {
    const functionName = `${config.region.abrev}${config.account.abrev}LMBFACT${props.functionNameSuffix}`;
    const logGroupName = `/aws/lambda/${functionName}`;

    const environment = {
      TZ: 'America/Lima',
      STAGE: config.stage,
      ...props.environment,
    };

    const logGroup = new LogGroup(scope, Util.generateUniqueIdentifier(functionName, 'LogGroup'), {
      logGroupName,
      retention: config.lambda.logRetention,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    super(scope, id, {
      runtime: Runtime.NODEJS_22_X,
      memorySize: 512,
      timeout: Duration.seconds(30),
      tracing: Tracing.DISABLED,
      code: Code.fromAsset(resolve(__dirname, '../../../../app'), {
        exclude: ['.npmrc'],
      }),
      ...props,
      functionName,
      environment,
      logGroup,
    });
  }
}
