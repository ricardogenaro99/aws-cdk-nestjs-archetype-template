import { StateMachine, StateMachineProps } from 'aws-cdk-lib/aws-stepfunctions';
import { Construct } from 'constructs';
import { Duration } from 'aws-cdk-lib';
import { config } from '../../common/config';

export interface TemplateStateMachineProps extends Omit<StateMachineProps, 'stateMachineName'> {
  stateMachineNameSuffix: string;
}

export class TemplateStateMachine extends StateMachine {
  constructor(scope: Construct, id: string, props: TemplateStateMachineProps) {
    const stateMachineName = `${config.region.abrev}${config.account.abrev}STFFACT${props.stateMachineNameSuffix}`;

    super(scope, id, {
      timeout: Duration.minutes(10),
      tracingEnabled: true,
      ...props,
      stateMachineName,
    });
  }
}
