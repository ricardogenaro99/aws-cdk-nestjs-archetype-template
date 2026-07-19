import '../../../common/supports/LogContext';
import { logContextStorage } from '../../../common/supports/LogContext';
import { Context } from 'aws-lambda';
import { TaskService } from '../../application/TaskService';
import { Logger } from '../../../common/Logger';

const taskService = new TaskService();
const logger = new Logger('StepBootstrap');

interface StepInput {
  taskId: string;
  payload: string;
  shouldFail: boolean;
}

export const handler = async (event: StepInput, context: Context): Promise<any> => {
  return logContextStorage.run({ requestId: context.awsRequestId }, async () => {
    logger.info(`Received Step Function task invocation. Event details: ${JSON.stringify(event)}`);

    try {
      const result = taskService.processTask(event);
      logger.info(`Task processed successfully with status: ${result.status}`);
      return result;
    } catch (error: any) {
      logger.error('Error during step task processing:', error);
      throw error; // Propagate error so Step Function registers the failure state
    }
  });
};
