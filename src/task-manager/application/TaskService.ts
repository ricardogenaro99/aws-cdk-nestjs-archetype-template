import { Injectable } from '../../common/Injectable';
import { Logger } from '../../common/Logger';
import CustomException from '../../common/application/exception/CustomException';
import { TaskDomainService } from '../domain/service/TaskDomainService';
import { Task } from '../domain/model/Task';
import { CreateTaskRequest } from './dto/request/CreateTaskRequest';
import { UpdateTaskRequest } from './dto/request/UpdateTaskRequest';

@Injectable()
export class TaskService {
  private readonly logger: Logger = new Logger(TaskService.name);

  constructor(private readonly taskDomainService?: TaskDomainService) {}

  public async createTask(payload: CreateTaskRequest): Promise<Task> {
    this.logger.log('TaskService:createTask');
    try {
      if (!this.taskDomainService) {
        throw new Error('TaskDomainService not injected');
      }
      return await this.taskDomainService.createTask(payload.title, payload.description);
    } catch (exception: any) {
      this.logger.error('TaskService:createTask:ERROR');
      this.logger.error(exception);
      throw new CustomException({
        code: exception.code || 'ECORE-0004',
        message: 'No se pudo crear la tarea',
        httpStatus: exception.httpStatus || 500,
        details: [exception.message],
        exception,
      });
    }
  }

  public async getTasks(): Promise<Task[]> {
    this.logger.log('TaskService:getTasks');
    try {
      if (!this.taskDomainService) {
        throw new Error('TaskDomainService not injected');
      }
      return await this.taskDomainService.getTasks();
    } catch (exception: any) {
      this.logger.error('TaskService:getTasks:ERROR');
      this.logger.error(exception);
      throw new CustomException({
        code: exception.code || 'ECORE-0004',
        message: 'No se pudieron obtener las tareas',
        httpStatus: exception.httpStatus || 500,
        details: [exception.message],
        exception,
      });
    }
  }

  public async getTask(id: string): Promise<Task> {
    this.logger.log(`TaskService:getTask - ID: ${id}`);
    try {
      if (!this.taskDomainService) {
        throw new Error('TaskDomainService not injected');
      }
      const task = await this.taskDomainService.getTask(id);
      if (!task) {
        throw new CustomException({
          code: 'ECORE-0005',
          message: `Tarea con ID ${id} no encontrada`,
          httpStatus: 404,
          details: [`No existe ninguna tarea registrada bajo el ID: ${id}`],
        });
      }
      return task;
    } catch (exception: any) {
      this.logger.error(`TaskService:getTask:ERROR - ID: ${id}`);
      this.logger.error(exception);
      throw new CustomException({
        code: exception.code || 'ECORE-0004',
        message: exception.message || 'No se pudo obtener la tarea',
        httpStatus: exception.httpStatus || 500,
        details: [exception.message],
        exception,
      });
    }
  }

  public async updateTask(id: string, payload: UpdateTaskRequest): Promise<Task> {
    this.logger.log(`TaskService:updateTask - ID: ${id}`);
    try {
      if (!this.taskDomainService) {
        throw new Error('TaskDomainService not injected');
      }
      const updatedTask = await this.taskDomainService.updateTask(id, payload);
      if (!updatedTask) {
        throw new CustomException({
          code: 'ECORE-0005',
          message: `Tarea con ID ${id} no encontrada para actualización`,
          httpStatus: 404,
          details: [`No existe ninguna tarea registrada bajo el ID: ${id}`],
        });
      }
      return updatedTask;
    } catch (exception: any) {
      this.logger.error(`TaskService:updateTask:ERROR - ID: ${id}`);
      this.logger.error(exception);
      throw new CustomException({
        code: exception.code || 'ECORE-0004',
        message: exception.message || 'No se pudo actualizar la tarea',
        httpStatus: exception.httpStatus || 500,
        details: [exception.message],
        exception,
      });
    }
  }

  public async deleteTask(id: string): Promise<boolean> {
    this.logger.log(`TaskService:deleteTask - ID: ${id}`);
    try {
      if (!this.taskDomainService) {
        throw new Error('TaskDomainService not injected');
      }
      const success = await this.taskDomainService.deleteTask(id);
      if (!success) {
        throw new CustomException({
          code: 'ECORE-0005',
          message: `Tarea con ID ${id} no encontrada para eliminación`,
          httpStatus: 404,
          details: [`No existe ninguna tarea registrada bajo el ID: ${id}`],
        });
      }
      return success;
    } catch (exception: any) {
      this.logger.error(`TaskService:deleteTask:ERROR - ID: ${id}`);
      this.logger.error(exception);
      throw new CustomException({
        code: exception.code || 'ECORE-0004',
        message: exception.message || 'No se pudo eliminar la tarea',
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
