import { Construct } from 'constructs';
import * as cdk from 'aws-cdk-lib';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import { config } from '../../common/config';
import { TAG } from '../../common/enum';

export interface TemplateCloudFrontProps {
  /**
   * Instancia de API Gateway REST para usar como origen Application Edge.
   */
  restApi: apigateway.RestApi;

  /**
   * Dominios alternativos (CNAMEs) asociados a la distribución CloudFront.
   */
  domainNames?: string[];

  /**
   * Certificado ACM preexistente para usar en CloudFront (debe estar en us-east-1).
   */
  certificate?: acm.ICertificate;

  /**
   * ARN de un certificado ACM en us-east-1 para importar.
   */
  certificateArn?: string;

  /**
   * Habilita o deshabilita la asignación de dominio personalizado y certificado ACM.
   * Por defecto true si hay certificado configurado o CREATE_ACM_CERTIFICATE=true.
   */
  enableCustomDomain?: boolean;
}

/**
 * Construct de Distribución Perimetral AWS CloudFront para Template Archetype
 *
 * Implementa:
 * - Edge CDN con origen hacia Amazon API Gateway.
 * - Desacople y blindaje ACM: dominio nativo (*.cloudfront.net) por defecto para prevenir LRN-006.
 * - ResponseHeadersPolicy con directivas estrictas de ciberseguridad perimetral (CSP, HSTS, X-Frame-Options: DENY).
 * - Compresión Brotli y Gzip activada.
 * - Nomenclatura corporativa Secuencial 001.
 */
export class TemplateCloudFront extends Construct {
  public readonly distribution: cloudfront.Distribution;
  public readonly certificate?: acm.ICertificate;
  public readonly responseHeadersPolicy: cloudfront.ResponseHeadersPolicy;

  constructor(scope: Construct, id: string, props: TemplateCloudFrontProps) {
    super(scope, id);

    const distributionName = `${config.region.abrev}${config.account.abrev}CLDF${config.repoAbrev}001`;
    const policyName = `${config.region.abrev}${config.account.abrev}RHP${config.repoAbrev}001`;
    const certName = `${config.region.abrev}${config.account.abrev}ACM${config.repoAbrev}001`;

    // 1. ResponseHeadersPolicy con estándares de Ciberseguridad SecOps (CSP, HSTS, DENY)
    this.responseHeadersPolicy = new cloudfront.ResponseHeadersPolicy(this, 'TemplateResponseHeadersPolicy', {
      responseHeadersPolicyName: policyName,
      comment: `Perimeter Cybersecurity Response Headers Policy for API Gateway ${config.stage}`,
      securityHeadersBehavior: {
        contentSecurityPolicy: {
          contentSecurityPolicy:
            "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob:; connect-src 'self'; font-src 'self' https://fonts.gstatic.com; frame-ancestors 'none'; form-action 'self'; base-uri 'self'; object-src 'none'; upgrade-insecure-requests;",
          override: true,
        },
        strictTransportSecurity: {
          accessControlMaxAge: cdk.Duration.seconds(63072000), // 2 años
          includeSubdomains: true,
          preload: true,
          override: true,
        },
        frameOptions: {
          frameOption: cloudfront.HeadersFrameOption.DENY,
          override: true,
        },
        contentTypeOptions: {
          override: true,
        },
        referrerPolicy: {
          referrerPolicy: cloudfront.HeadersReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN,
          override: true,
        },
      },
      customHeadersBehavior: {
        customHeaders: [
          {
            header: 'Permissions-Policy',
            value: 'geolocation=(self), camera=(), microphone=(), payment=()',
            override: true,
          },
        ],
      },
    });

    // 2. Definición o importación del certificado SSL en ACM (us-east-1)
    // Para evitar bloquear CloudFormation esperando validación DNS manual (hasta 72h de espera),
    // el dominio personalizado solo se activa si se provee un certificado ACM prevalidado
    // (vía props.certificate o ACM_CERTIFICATE_ARN) o si explícitamente se solicita con CREATE_ACM_CERTIFICATE=true.
    const hasPredefinedCert = Boolean(props.certificate || props.certificateArn || process.env.ACM_CERTIFICATE_ARN);
    const useCustomDomain = props.enableCustomDomain ?? (hasPredefinedCert || process.env.CREATE_ACM_CERTIFICATE === 'true');

    let resolvedCertificate: acm.ICertificate | undefined;
    let resolvedDomainNames: string[] | undefined;

    if (useCustomDomain) {
      if (props.certificate) {
        resolvedCertificate = props.certificate;
      } else if (props.certificateArn || process.env.ACM_CERTIFICATE_ARN) {
        const certArn = props.certificateArn || process.env.ACM_CERTIFICATE_ARN!;
        resolvedCertificate = acm.Certificate.fromCertificateArn(this, 'TemplateImportedCertificate', certArn);
      } else if (process.env.CREATE_ACM_CERTIFICATE === 'true' && process.env.ACM_DOMAIN_NAME) {
        const wildcardCert = new acm.Certificate(this, 'TemplateAcmCertificate', {
          domainName: process.env.ACM_DOMAIN_NAME,
          subjectAlternativeNames: process.env.ACM_SUBJECT_ALTERNATIVE_NAMES
            ? process.env.ACM_SUBJECT_ALTERNATIVE_NAMES.split(',').map((d) => d.trim())
            : undefined,
          validation: acm.CertificateValidation.fromDns(),
        });
        cdk.Tags.of(wildcardCert).add(TAG.NAME, certName);
        cdk.Tags.of(wildcardCert).add(TAG.PROYECTO, config.service.tags[TAG.PROYECTO]);
        cdk.Tags.of(wildcardCert).add(TAG.AMBIENTE, config.stage);
        resolvedCertificate = wildcardCert;
      }

      if (resolvedCertificate) {
        if (props.domainNames) {
          resolvedDomainNames = props.domainNames;
        } else if (process.env.CLOUDFRONT_DOMAIN_NAMES) {
          resolvedDomainNames = process.env.CLOUDFRONT_DOMAIN_NAMES.split(',').map((d) => d.trim());
        }
      }
    }

    this.certificate = resolvedCertificate;

    // 3. Distribución CloudFront Perimetral con compresión Brotli y Gzip
    this.distribution = new cloudfront.Distribution(this, 'TemplateCloudFrontDistribution', {
      comment: `${distributionName} - Perimeter CloudFront Distribution for API Gateway ${config.stage}`,
      domainNames: resolvedDomainNames,
      certificate: this.certificate,
      httpVersion: cloudfront.HttpVersion.HTTP2_AND_3,
      minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
      defaultBehavior: {
        origin: new origins.RestApiOrigin(props.restApi),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
        cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD_OPTIONS,
        compress: true, // Habilita compresión Brotli y Gzip nativa
        responseHeadersPolicy: this.responseHeadersPolicy,
        cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
        originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
      },
    });

    // 4. Tags corporativos
    cdk.Tags.of(this).add(TAG.NAME, distributionName);
    cdk.Tags.of(this).add(TAG.PROYECTO, config.service.tags[TAG.PROYECTO]);
    cdk.Tags.of(this).add(TAG.AMBIENTE, config.stage);
    cdk.Tags.of(this).add(TAG.RESPONSABLE, config.service.tags[TAG.RESPONSABLE]);

    // 5. Outputs CloudFormation
    new cdk.CfnOutput(this, 'CloudFrontDistributionId', {
      value: this.distribution.distributionId,
      description: 'Perimeter CloudFront Distribution ID for API Gateway',
    });

    new cdk.CfnOutput(this, 'CloudFrontDomainName', {
      value: this.distribution.distributionDomainName,
      description: 'Perimeter CloudFront Distribution Domain Name for API Gateway',
    });

    if (resolvedDomainNames && resolvedDomainNames.length > 0) {
      new cdk.CfnOutput(this, 'CloudFrontCustomDomains', {
        value: resolvedDomainNames.join(', '),
        description: 'Perimeter CloudFront Configured Custom Domains for API Gateway',
      });
    }
  }
}
