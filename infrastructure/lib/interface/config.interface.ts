import { RetentionDays } from 'aws-cdk-lib/aws-logs';

export interface Service {
  name: string;
  description: string;
  tags: Record<string, string>;
}

export interface ConfigByStage {
  service: Service;
  stage: string;
  environments: string;
  region: {
    code: string;
    abrev: string;
  };
  account: {
    id: string;
    abrev: string;
  };
  lambda: {
    logRetention: RetentionDays;
  };
  ssmRootPath: string;
}
