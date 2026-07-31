import { Task } from '../model/Task';

export interface TaskRepository {
  createTask(task: Task): Promise<Task>;
  getTasks(): Promise<Task[]>;
  getTask(id: string): Promise<Task | null>;
  updateTask(id: string, updates: Partial<Task>): Promise<Task | null>;
  deleteTask(id: string): Promise<boolean>;
}
