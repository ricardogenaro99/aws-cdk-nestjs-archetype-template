import { Injectable } from '../../common/Injectable';
import { Logger } from '../../common/Logger';
import CustomException from '../../common/application/exception/CustomException';
import { Task } from '../domain/Task';
import { TaskDomainService } from '../domain/service/TaskDomainService';
import { TaskInitiateResult } from '../domain/repository/TaskRepository';
import { InitiateTaskRequest } from './dto/request/InitiateTaskRequest';

@Injectable()
export class TaskService {
  private readonly logger: Logger = new Logger(TaskService.name);

  constructor(private readonly taskDomainService?: TaskDomainService) {}

  public async initiateTask(payload: InitiateTaskRequest): Promise<TaskInitiateResult> {
    this.logger.log('TaskService:initiateTask');
    try {
      if (!this.taskDomainService) {
        throw new Error('TaskDomainService not injected');
      }
      return await this.taskDomainService.initiateTask(payload.payload, payload.shouldFail);
    } catch (exception: any) {
      this.logger.error('TaskService:initiateTask:ERROR');
      this.logger.error(exception);
      throw new CustomException({
        code: exception.code || 'ECORE-0004',
        message: 'No se pudo iniciar la tarea',
        httpStatus: exception.httpStatus || 500,
        details: [exception.message],
        exception,
      });
    }
  }

  public async getStatus(): Promise<any> {
    this.logger.log('TaskService:getStatus');
    try {
      if (!this.taskDomainService) {
        throw new Error('TaskDomainService not injected');
      }
      return await this.taskDomainService.getStatus();
    } catch (exception: any) {
      this.logger.error('TaskService:getStatus:ERROR');
      this.logger.error(exception);
      throw new CustomException({
        code: exception.code || 'ECORE-0004',
        message: 'No se pudo obtener el estado',
        httpStatus: exception.httpStatus || 500,
        details: [exception.message],
        exception,
      });
    }
  }

  // Mantenemos la lógica de Step Function
  public processTask(task: { taskId: string; payload: string; shouldFail: boolean }): {
    taskId: string;
    status: 'SUCCESS' | 'FAILURE';
    processedAt: string;
    message: string;
  } {
    const processedAt = new Date().toISOString();

    if (task.shouldFail) {
      return {
        taskId: task.taskId,
        status: 'FAILURE',
        processedAt,
        message: 'Intentionally failed per business logic request.',
      };
    }

    return {
      taskId: task.taskId,
      status: 'SUCCESS',
      processedAt,
      message: `Successfully processed: ${task.payload}`,
    };
  }
}
