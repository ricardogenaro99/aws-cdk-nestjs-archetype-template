import { StringParameter, StringParameterProps } from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';
import { config } from '../../common/config';

export interface TemplateStringParameterProps extends StringParameterProps {
  parameterNameSuffix?: string;
}

export class TemplateStringParameter extends StringParameter {
  constructor(scope: Construct, id: string, props: TemplateStringParameterProps) {
    const parameterName =
      props.parameterName ||
      (props.parameterNameSuffix
        ? `${config.ssmRootPath}/${props.parameterNameSuffix}`
        : `${config.ssmRootPath}/${id}`);

    super(scope, id, {
      ...props,
      parameterName, // Enforce standard naming convention
    });
  }
}
