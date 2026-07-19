import { Stage } from '../common/enum';
import { Tags } from 'aws-cdk-lib';
import { Construct } from 'constructs';

export class ConfigUtil {
  public static getCurrentStage(): Stage {
    const stage = (process.env.STAGE || 'DESA').toUpperCase();
    if (Object.values(Stage).includes(stage as Stage)) {
      return stage as Stage;
    }
    return Stage.DESA;
  }

  public static setTags(scope: Construct, tags: Record<string, string>): void {
    Object.entries(tags).forEach(([key, value]) => {
      Tags.of(scope).add(key, value);
    });
  }
}
