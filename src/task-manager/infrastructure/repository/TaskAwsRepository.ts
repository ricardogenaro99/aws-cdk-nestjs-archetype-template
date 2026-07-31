import { Injectable } from '../../../common/Injectable';
import { Logger } from '../../../common/Logger';
import { Task } from '../../domain/model/Task';
import { TaskRepository } from '../../domain/repository/TaskRepository';

@Injectable()
export class TaskAwsRepository implements TaskRepository {
  private readonly logger: Logger = new Logger(TaskAwsRepository.name);

  // Singleton in-memory storage to demonstrate actual CRUD behavior locally
  private static tasks: Task[] = [
    {
      taskId: 'task-1',
      title: 'Aprender Arquitectura Hexagonal',
      description: 'Estudiar principios DDD, puertos y adaptadores.',
      status: 'IN_PROGRESS',
      createdAt: new Date().toISOString(),
    },
    {
      taskId: 'task-2',
      title: 'Configurar AWS CDK',
      description: 'Definir constructores abstractos en el arquetipo.',
      status: 'PENDING',
      createdAt: new Date().toISOString(),
    },
  ];

  public async createTask(task: Task): Promise<Task> {
    this.logger.log(`TaskAwsRepository:createTask - ID: ${task.taskId}`);
    TaskAwsRepository.tasks.push(task);
    return task;
  }

  public async getTasks(): Promise<Task[]> {
    this.logger.log('TaskAwsRepository:getTasks');
    return TaskAwsRepository.tasks;
  }

  public async getTask(id: string): Promise<Task | null> {
    this.logger.log(`TaskAwsRepository:getTask - ID: ${id}`);
    const task = TaskAwsRepository.tasks.find((t) => t.taskId === id);
    return task || null;
  }

  public async updateTask(id: string, updates: Partial<Task>): Promise<Task | null> {
    this.logger.log(`TaskAwsRepository:updateTask - ID: ${id}`);
    const taskIndex = TaskAwsRepository.tasks.findIndex((t) => t.taskId === id);
    if (taskIndex === -1) {
      return null;
    }

    const updatedTask = {
      ...TaskAwsRepository.tasks[taskIndex],
      ...updates,
    };

    TaskAwsRepository.tasks[taskIndex] = updatedTask;
    return updatedTask;
  }

  public async deleteTask(id: string): Promise<boolean> {
    this.logger.log(`TaskAwsRepository:deleteTask - ID: ${id}`);
    const taskIndex = TaskAwsRepository.tasks.findIndex((t) => t.taskId === id);
    if (taskIndex === -1) {
      return false;
    }

    TaskAwsRepository.tasks.splice(taskIndex, 1);
    return true;
  }
}
