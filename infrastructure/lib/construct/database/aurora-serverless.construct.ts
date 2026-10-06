import { Construct } from 'constructs';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { RemovalPolicy, Duration } from 'aws-cdk-lib';
import { config } from '../../common/config';

export interface TemplateAuroraServerlessProps {
  vpc: ec2.IVpc;
  dbSecurityGroup: ec2.ISecurityGroup;
  proxySecurityGroup: ec2.ISecurityGroup;
  minCapacity?: number;
  maxCapacity?: number;
  databaseName?: string;
  secretDescription?: string;
}

export class TemplateAuroraServerless extends Construct {
  public readonly secret: secretsmanager.ISecret;
  public readonly cluster: rds.DatabaseCluster;
  public readonly proxy: rds.DatabaseProxy;
  public readonly databaseName: string;

  constructor(scope: Construct, id: string, props: TemplateAuroraServerlessProps) {
    super(scope, id);

    const repoLower = config.repoAbrev.toLowerCase();
    const regionLower = config.region.abrev.toLowerCase();
    const accountLower = config.account.abrev.toLowerCase();

    this.databaseName = props.databaseName ?? `${repoLower}_db`;

    // 1. Secrets Manager para credenciales maestras de PostgreSQL
    const secretName = `${config.ssmRootPath}/db-credentials`;
    this.secret = new secretsmanager.Secret(this, 'AuroraSecret', {
      secretName,
      description:
        props.secretDescription ??
        `Master DB credentials for Amazon Aurora Serverless v2 PostgreSQL (${config.repoAbrev})`,
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ username: `${repoLower}_admin` }),
        generateStringKey: 'password',
        excludePunctuation: true,
        passwordLength: 32,
      },
      removalPolicy: config.stage === 'PROD' ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY,
    });

    // 2. Provisionamiento de Cluster Amazon Aurora PostgreSQL Serverless v2
    const minACU = props.minCapacity ?? (config.stage === 'PROD' ? 1.0 : 0.5);
    const maxACU = props.maxCapacity ?? (config.stage === 'PROD' ? 8.0 : 2.0);

    const clusterIdentifier = `${regionLower}-${accountLower}-rds-${repoLower}-cluster-001`;
    const writerInstanceIdentifier = `${regionLower}-${accountLower}-rds-${repoLower}-writer-001`;
    const readerInstanceIdentifier = `${regionLower}-${accountLower}-rds-${repoLower}-reader-001`;

    this.cluster = new rds.DatabaseCluster(this, 'AuroraCluster', {
      clusterIdentifier,
      engine: rds.DatabaseClusterEngine.auroraPostgres({
        version: rds.AuroraPostgresEngineVersion.VER_15_10,
      }),
      credentials: rds.Credentials.fromSecret(this.secret),
      defaultDatabaseName: this.databaseName,
      vpc: props.vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
      },
      securityGroups: [props.dbSecurityGroup],
      serverlessV2MinCapacity: minACU,
      serverlessV2MaxCapacity: maxACU,
      writer: rds.ClusterInstance.serverlessV2('WriterInstance', {
        instanceIdentifier: writerInstanceIdentifier,
        publiclyAccessible: false,
      }),
      ...(config.stage === 'PROD'
        ? {
            readers: [
              rds.ClusterInstance.serverlessV2('ReaderInstance', {
                instanceIdentifier: readerInstanceIdentifier,
                publiclyAccessible: false,
              }),
            ],
          }
        : {}),
      removalPolicy: config.stage === 'PROD' ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY,
    });

    // 3. RDS Proxy para Connection Pooling y resiliencia en ejecuciones Serverless / Lambda
    const dbProxyName = `${config.region.abrev}${config.account.abrev}PROXY${config.repoAbrev}001`.toUpperCase();

    this.proxy = new rds.DatabaseProxy(this, 'RdsProxy', {
      proxyTarget: rds.ProxyTarget.fromCluster(this.cluster),
      secrets: [this.secret],
      vpc: props.vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      },
      securityGroups: [props.proxySecurityGroup],
      dbProxyName,
      debugLogging: config.stage !== 'PROD',
      idleClientTimeout: Duration.minutes(15),
      requireTLS: true,
    });

    // 4. Parámetros SSM exportados para desacoplamiento e integración continua
    new ssm.StringParameter(this, 'SsmDbProxyEndpoint', {
      parameterName: `${config.ssmRootPath}/db/proxy-endpoint`,
      stringValue: this.proxy.endpoint,
      description: `RDS Proxy Endpoint for ${config.repoAbrev} Backend`,
    });

    new ssm.StringParameter(this, 'SsmDbClusterEndpoint', {
      parameterName: `${config.ssmRootPath}/db/cluster-endpoint`,
      stringValue: this.cluster.clusterEndpoint.hostname,
      description: `Aurora Cluster Writer Endpoint for ${config.repoAbrev}`,
    });

    new ssm.StringParameter(this, 'SsmDbName', {
      parameterName: `${config.ssmRootPath}/db/name`,
      stringValue: this.databaseName,
      description: `Database Name for ${config.repoAbrev}`,
    });

    new ssm.StringParameter(this, 'SsmDbSecretArn', {
      parameterName: `${config.ssmRootPath}/db/secret-arn`,
      stringValue: this.secret.secretArn,
      description: `Secret ARN of DB credentials for ${config.repoAbrev}`,
    });
  }
}
