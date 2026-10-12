import { Construct } from 'constructs';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as wafv2 from 'aws-cdk-lib/aws-wafv2';
import { config } from '../../common/config';

export interface TemplateWafProps {
  restApi: apigateway.RestApi;
  rateLimit?: number;
}

/**
 * Construct de Seguridad Perimetral AWS WAFv2 para Template Archetype
 *
 * Aplica reglas de rate limiting por IP y reglas administradas de AWS contra OWASP Top 10.
 * Asegura descripciones sanitizadas (LRN-001) compuestas únicamente por texto alfanumérico
 * en inglés sin paréntesis ni caracteres no permitidos.
 */
export class TemplateWaf extends Construct {
  public readonly webAcl: wafv2.CfnWebACL;
  public readonly association: wafv2.CfnWebACLAssociation;

  constructor(scope: Construct, id: string, props: TemplateWafProps) {
    super(scope, id);

    const wafName = `${config.region.abrev}${config.account.abrev}WAF${config.repoAbrev}${config.environments.toUpperCase()}001`;
    const rateLimit = props.rateLimit ?? 300;

    // 1. Web ACL Regional con descripción sanitizada (sin caracteres especiales ni paréntesis)
    this.webAcl = new wafv2.CfnWebACL(this, 'TemplateWebAcl', {
      name: wafName,
      description: `Perimeter protection WAFv2 for API Gateway ${config.stage}`,
      scope: 'REGIONAL',
      defaultAction: { allow: {} },
      visibilityConfig: {
        sampledRequestsEnabled: true,
        cloudWatchMetricsEnabled: true,
        metricName: `${wafName}-Metrics`,
      },
      rules: [
        // Regla 1: Rate Limiting por IP (por defecto 300 peticiones en 5 minutos)
        {
          name: 'RateLimit300PerIP',
          priority: 1,
          action: { block: {} },
          statement: {
            rateBasedStatement: {
              limit: rateLimit,
              aggregateKeyType: 'IP',
            },
          },
          visibilityConfig: {
            sampledRequestsEnabled: true,
            cloudWatchMetricsEnabled: true,
            metricName: 'TemplateWafRateLimitIPMetric',
          },
        },
        // Regla 2: AWS Managed Rules - Common Rule Set (OWASP Top 10)
        {
          name: 'AWS-AWSManagedRulesCommonRuleSet',
          priority: 2,
          overrideAction: { none: {} },
          statement: {
            managedRuleGroupStatement: {
              vendorName: 'AWS',
              name: 'AWSManagedRulesCommonRuleSet',
            },
          },
          visibilityConfig: {
            sampledRequestsEnabled: true,
            cloudWatchMetricsEnabled: true,
            metricName: 'TemplateWafCommonRuleSetMetric',
          },
        },
        // Regla 3: AWS Managed Rules - Known Bad Inputs
        {
          name: 'AWS-AWSManagedRulesKnownBadInputsRuleSet',
          priority: 3,
          overrideAction: { none: {} },
          statement: {
            managedRuleGroupStatement: {
              vendorName: 'AWS',
              name: 'AWSManagedRulesKnownBadInputsRuleSet',
            },
          },
          visibilityConfig: {
            sampledRequestsEnabled: true,
            cloudWatchMetricsEnabled: true,
            metricName: 'TemplateWafKnownBadInputsMetric',
          },
        },
      ],
    });

    // 2. Asociación de la Web ACL al Stage de API Gateway
    this.association = new wafv2.CfnWebACLAssociation(this, 'WafAssociation', {
      resourceArn: props.restApi.deploymentStage.stageArn,
      webAclArn: this.webAcl.attrArn,
    });
  }
}
