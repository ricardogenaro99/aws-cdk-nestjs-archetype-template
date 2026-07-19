import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { SSMClient, GetParameterCommand } from '@aws-sdk/client-ssm';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { SFNClient, StartExecutionCommand } from '@aws-sdk/client-sfn';
import { Injectable } from '../../../common/Injectable';
import { Logger } from '../../../common/Logger';
import { Task } from '../../domain/Task';
import { TaskRepository, TaskInitiateResult } from '../../domain/repository/TaskRepository';

@Injectable()
export class TaskAwsRepository implements TaskRepository {
  private readonly logger: Logger = new Logger(TaskAwsRepository.name);
  private readonly s3 = new S3Client({});
  private readonly ssm = new SSMClient({});
  private readonly secretsManager = new SecretsManagerClient({});
  private readonly sfn = new SFNClient({});

  public async initiateTask(payload: string, shouldFail: boolean): Promise<TaskInitiateResult> {
    this.logger.log('TaskAwsRepository:initiateTask');

    const task: Task = {
      taskId: `task-${Date.now()}`,
      payload,
      shouldFail,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
    };

    // 1. Fetch values from SSM Parameter Store
    let ssmValue = 'N/A';
    const ssmParameterName = process.env.SSM_PARAMETER_NAME;
    if (ssmParameterName) {
      try {
        const ssmRes = await this.ssm.send(new GetParameterCommand({ Name: ssmParameterName }));
        ssmValue = ssmRes.Parameter?.Value || 'N/A';
      } catch (err) {
        this.logger.error('Failed to retrieve SSM Parameter:', err);
      }
    }

    // 2. Fetch Secret credentials from Secrets Manager
    let secretData = null;
    const secretArn = process.env.SECRET_ARN;
    if (secretArn) {
      try {
        const secretRes = await this.secretsManager.send(new GetSecretValueCommand({ SecretId: secretArn }));
        secretData = secretRes.SecretString ? JSON.parse(secretRes.SecretString) : {};
      } catch (err) {
        this.logger.error('Failed to retrieve Secrets Manager Secret:', err);
      }
    }

    // 3. Write object to S3 Bucket
    const bucketName = process.env.BUCKET_NAME;
    const s3Key = `tasks/${task.taskId}.json`;
    if (bucketName) {
      this.logger.info(`Uploading task metadata to S3: ${s3Key}`);
      await this.s3.send(
        new PutObjectCommand({
          Bucket: bucketName,
          Key: s3Key,
          Body: JSON.stringify({ ...task, ssmValue }),
          ContentType: 'application/json',
        }),
      );
    }

    // 4. Trigger Step Functions execution
    let executionArn = '';
    const stateMachineArn = process.env.STATE_MACHINE_ARN;
    if (stateMachineArn) {
      this.logger.info(`Starting Step Function execution: ${task.taskId}`);
      const sfnRes = await this.sfn.send(
        new StartExecutionCommand({
          stateMachineArn,
          name: task.taskId,
          input: JSON.stringify({
            taskId: task.taskId,
            payload: task.payload,
            shouldFail: task.shouldFail,
          }),
        }),
      );
      executionArn = sfnRes.executionArn || '';
    }

    return {
      task,
      s3Location: bucketName ? `s3://${bucketName}/${s3Key}` : 'N/A',
      executionArn,
      ssmParameterValue: ssmValue,
      secretValidation: secretData ? 'OK' : 'FAIL',
    };
  }

  public async getStatus(): Promise<any> {
    this.logger.log('TaskAwsRepository:getStatus');

    let ssmValue = 'N/A';
    const ssmParameterName = process.env.SSM_PARAMETER_NAME;
    if (ssmParameterName) {
      try {
        const ssmRes = await this.ssm.send(new GetParameterCommand({ Name: ssmParameterName }));
        ssmValue = ssmRes.Parameter?.Value || 'N/A';
      } catch (err) {
        this.logger.error('Failed to retrieve SSM Parameter:', err);
      }
    }

    return {
      status: 'ACTIVE',
      message: 'AWS CDK Archetype API operational',
      stage: process.env.STAGE || 'desa',
      ssmParameterValue: ssmValue,
      s3Configured: !!process.env.BUCKET_NAME,
      smConfigured: !!process.env.SECRET_ARN,
      sfnConfigured: !!process.env.STATE_MACHINE_ARN,
    };
  }
}
