import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { RemovalPolicy } from 'aws-cdk-lib';
import { config } from '../../common/config';
import { Util } from '../../util/util';

export interface TemplateBucketProps extends s3.BucketProps {
  bucketNameSuffix?: string;
}

export class TemplateBucket extends s3.Bucket {
  constructor(scope: Construct, id: string, props?: TemplateBucketProps) {
    const bucketName =
      props?.bucketName ||
      (props?.bucketNameSuffix
        ? `aws-cdk-archetype-bucket-${config.environments}-${props.bucketNameSuffix}`.toLowerCase()
        : `aws-cdk-archetype-bucket-${config.environments}-${Util.generateUniqueIdentifier(id).toLowerCase()}`);

    super(scope, id, {
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
      versioned: true,
      removalPolicy: config.stage === 'PROD' ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY,
      autoDeleteObjects: config.stage !== 'PROD',
      ...props,
      bucketName, // Enforce standard naming convention
    });
  }
}
