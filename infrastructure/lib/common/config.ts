import { AccountAbrev, Region, RegionAbrev, Stage, TAG } from './enum';
import { ConfigByStage } from '../interface/config.interface';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { ConfigUtil } from '../util/config.util';

const stage: Stage = ConfigUtil.getCurrentStage();

const account = {
  [Stage.DESA]: {
    id: '799683146289',
    abrev: AccountAbrev.DEVL,
  },
  [Stage.TEST]: {
    id: '438323272304',
    abrev: AccountAbrev.TEST,
  },
  [Stage.PROD]: {
    id: '391231515244',
    abrev: AccountAbrev.PROD,
  },
}[stage];

const region = {
  [Stage.DESA]: {
    code: Region.US_EAST_1,
    abrev: RegionAbrev.UE1,
  },
  [Stage.TEST]: {
    code: Region.US_EAST_1,
    abrev: RegionAbrev.UE1,
  },
  [Stage.PROD]: {
    code: Region.US_EAST_1,
    abrev: RegionAbrev.UE1,
  },
}[stage];

const environments = stage.toLowerCase();

const lambda = {
  [Stage.DESA]: { logRetention: RetentionDays.ONE_WEEK },
  [Stage.TEST]: { logRetention: RetentionDays.FOUR_MONTHS },
  [Stage.PROD]: { logRetention: RetentionDays.FIVE_MONTHS },
}[stage];

const repoAbrev = 'ARCHETYPE';
const nameStack = `${region.abrev}${account.abrev}MTOCLF${repoAbrev}`;

const service = {
  name: nameStack,
  description: 'AWS CDK Archetype Template Stack',
  tags: {
    [TAG.NAME]: nameStack,
    [TAG.ENTORNO]: 'DESA',
    [TAG.AMBIENTE]: stage,
    [TAG.PROYECTO]: 'ARCHETYPE',
    [TAG.RESPONSABLE]: 'Antigravity',
  },
};

const ssmRootPath = `/${repoAbrev}/${stage}`;

const config: ConfigByStage = {
  service,
  stage,
  environments,
  region,
  account,
  lambda,
  ssmRootPath,
};

export { config };
