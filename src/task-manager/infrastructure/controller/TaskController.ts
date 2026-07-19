import { Controller } from '@nestjs/common';
import { Logger } from '../../../common/Logger';
import { RequestDto } from '../../../common/application/dto/RequestDto';
import { TaskService } from '../../application/TaskService';
import { TaskValidation } from '../../application/validation/TaskValidation';
import { buildInitiateTaskPayload } from '../../application/mappers/TaskRequestMapper';

@Controller()
export class TaskController {
  private readonly logger: Logger = new Logger(TaskController.name);

  constructor(
    private readonly taskValidation: TaskValidation,
    private readonly taskService: TaskService,
  ) {}

  public async initiateTask(request: RequestDto): Promise<any> {
    this.logger.log('TaskController:initiateTask');

    const payload = buildInitiateTaskPayload(request);

    await this.taskValidation.validarInitiateTask(payload);
    const result = await this.taskService.initiateTask(payload);

    return {
      status: 'SUCCESS',
      message: 'Template Architecture: Task created and Step Function started.',
      ...result,
    };
  }

  public async getStatus(request: RequestDto): Promise<any> {
    this.logger.log('TaskController:getStatus');
    return this.taskService.getStatus();
  }
}
