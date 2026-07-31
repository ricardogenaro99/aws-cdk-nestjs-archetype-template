import { Inject, Injectable } from '../../../common/Injectable';
import { TaskRepository } from '../repository/TaskRepository';
import { Task } from '../model/Task';

@Injectable()
export class TaskDomainService {
  constructor(
    @Inject('TaskRepository')
    private readonly taskRepository: TaskRepository,
  ) {}

  public async createTask(title: string, description: string): Promise<Task> {
    const task: Task = {
      taskId: `task-${Date.now()}`,
      title,
      description,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
    };
    return this.taskRepository.createTask(task);
  }

  public async getTasks(): Promise<Task[]> {
    return this.taskRepository.getTasks();
  }

  public async getTask(id: string): Promise<Task | null> {
    return this.taskRepository.getTask(id);
  }

  public async updateTask(id: string, updates: Partial<Task>): Promise<Task | null> {
    const updatedFields: Partial<Task> = {
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    return this.taskRepository.updateTask(id, updatedFields);
  }

  public async deleteTask(id: string): Promise<boolean> {
    return this.taskRepository.deleteTask(id);
  }
}
