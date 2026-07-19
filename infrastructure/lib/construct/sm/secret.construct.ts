import { Secret, SecretProps } from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';
import { config } from '../../common/config';

export interface TemplateSecretProps extends SecretProps {
  secretNameSuffix?: string;
}

export class TemplateSecret extends Secret {
  constructor(scope: Construct, id: string, props?: TemplateSecretProps) {
    const secretName =
      props?.secretName ||
      (props?.secretNameSuffix ? `${config.ssmRootPath}/${props.secretNameSuffix}` : `${config.ssmRootPath}/${id}`);

    super(scope, id, {
      ...props,
      secretName, // Enforce standard naming convention
    });
  }
}
