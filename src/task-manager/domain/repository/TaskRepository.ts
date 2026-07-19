import { Task } from '../Task';

export interface TaskInitiateResult {
  task: Task;
  s3Location: string;
  executionArn: string;
  ssmParameterValue: string;
  secretValidation: string;
}

export interface TaskRepository {
  initiateTask(payload: string, shouldFail: boolean): Promise<TaskInitiateResult>;
  getStatus(): Promise<any>;
}
