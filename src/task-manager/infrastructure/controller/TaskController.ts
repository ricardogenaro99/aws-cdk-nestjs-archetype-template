import { Controller } from '@nestjs/common';
import { Logger } from '../../../common/Logger';
import { RequestDto } from '../../../common/application/dto/RequestDto';
import { TaskService } from '../../application/TaskService';
import { TaskValidation } from '../../application/validation/TaskValidation';
import { CreateTaskRequest } from '../../application/dto/request/CreateTaskRequest';
import { UpdateTaskRequest } from '../../application/dto/request/UpdateTaskRequest';

@Controller()
export class TaskController {
  private readonly logger: Logger = new Logger(TaskController.name);

  constructor(
    private readonly taskValidation: TaskValidation,
    private readonly taskService: TaskService,
  ) {}

  public async createTask(request: RequestDto): Promise<any> {
    this.logger.log('TaskController:createTask - Payload incoming details:', request);
    const body = (request.body || (request as any).body) as CreateTaskRequest;

    await this.taskValidation.validateCreateTask(body);
    const result = await this.taskService.createTask(body);

    return {
      status: 'SUCCESS',
      message: 'Task created successfully.',
      task: result,
    };
  }

  public async getTasks(request: RequestDto): Promise<any> {
    this.logger.log('TaskController:getTasks');
    this.logger.debug(request);
    return this.taskService.getTasks();
  }

  public async getTask(request: RequestDto): Promise<any> {
    this.logger.log('TaskController:getTask');
    this.logger.debug(request);
    const id = (request.path as any)?.id || (request as any).params?.id || 'unknown';
    return this.taskService.getTask(id);
  }

  public async updateTask(request: RequestDto): Promise<any> {
    this.logger.log('TaskController:updateTask');
    this.logger.debug(request);
    const id = (request.path as any)?.id || (request as any).params?.id || 'unknown';
    const body = (request.body || (request as any).body) as UpdateTaskRequest;
    return this.taskService.updateTask(id, body);
  }

  public async deleteTask(request: RequestDto): Promise<any> {
    this.logger.log('TaskController:deleteTask');
    this.logger.debug(request);
    const id = (request.path as any)?.id || (request as any).params?.id || 'unknown';
    const success = await this.taskService.deleteTask(id);
    return {
      status: 'SUCCESS',
      message: `Task with ID ${id} deleted successfully.`,
      success,
    };
  }
}
