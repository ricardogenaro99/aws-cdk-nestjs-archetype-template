import { INestApplicationContext } from '@nestjs/common';
import { TaskController } from '../controller/TaskController';
import { TaskModule } from '../controller/TaskModule';

const handlerCore = async (
  appContext: INestApplicationContext,
  action: string,
): Promise<TaskController | undefined> => {
  const taskController = appContext.select(TaskModule).get(TaskController);

  const controllerActions = taskController as unknown as Record<string, unknown>;
  return controllerActions[action] ? taskController : undefined;
};

export default handlerCore;
