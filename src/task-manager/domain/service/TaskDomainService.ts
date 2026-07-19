import { Inject, Injectable } from '../../../common/Injectable';
import { TaskRepository, TaskInitiateResult } from '../repository/TaskRepository';

@Injectable()
export class TaskDomainService {
  constructor(
    @Inject('TaskRepository')
    private readonly taskRepository: TaskRepository,
  ) {}

  public async initiateTask(payload: string, shouldFail: boolean): Promise<TaskInitiateResult> {
    return this.taskRepository.initiateTask(payload, shouldFail);
  }

  public async getStatus(): Promise<any> {
    return this.taskRepository.getStatus();
  }
}
