import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { RemovalPolicy } from 'aws-cdk-lib';
import { config } from '../../common/config';
import { Util } from '../../util/util';

export interface TemplateTableProps extends dynamodb.TableProps {
  tableNameSuffix?: string;
}

export class TemplateTable extends dynamodb.Table {
  constructor(scope: Construct, id: string, props: TemplateTableProps) {
    const tableName =
      props.tableName ||
      `${config.region.abrev}${config.account.abrev}DBCT${
        props.tableNameSuffix || Util.generateUniqueIdentifier(id)
      }`.toUpperCase();

    super(scope, id, {
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      pointInTimeRecovery: config.stage === 'PROD',
      removalPolicy: config.stage === 'PROD' ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY,
      ...props,
      tableName, // Enforce standard naming convention
    });
  }
}
