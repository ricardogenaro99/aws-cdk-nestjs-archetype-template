import { Injectable } from '../../../common/Injectable';
import { Logger } from '../../../common/Logger';
import { Task } from '../../domain/model/Task';
import { TaskRepository } from '../../domain/repository/TaskRepository';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, PutCommand, QueryCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';

@Injectable()
export class TaskAwsRepository implements TaskRepository {
  private readonly logger: Logger = new Logger(TaskAwsRepository.name);
  private readonly client = DynamoDBDocumentClient.from(new DynamoDBClient({}));
  private readonly tableName = process.env.TASKS_TABLE_NAME || 'placeholder-tasks-table';

  public async createTask(task: Task): Promise<Task> {
    this.logger.log(`TaskAwsRepository:createTask - ID: ${task.taskId}`);
    await this.client.send(
      new PutCommand({
        TableName: this.tableName,
        Item: task,
      }),
    );
    return task;
  }

  public async getTasks(): Promise<Task[]> {
    this.logger.log('TaskAwsRepository:getTasks');
    const response = await this.client.send(
      new ScanCommand({
        TableName: this.tableName,
      }),
    );
    return (response.Items || []) as Task[];
  }

  public async getTask(id: string): Promise<Task | null> {
    this.logger.log(`TaskAwsRepository:getTask - ID: ${id}`);
    const response = await this.client.send(
      new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: 'taskId = :taskId',
        ExpressionAttributeValues: {
          ':taskId': id,
        },
      }),
    );

    if (response.Items && response.Items.length > 0) {
      return response.Items[0] as Task;
    }
    return null;
  }

  public async updateTask(id: string, updates: Partial<Task>): Promise<Task | null> {
    this.logger.log(`TaskAwsRepository:updateTask - ID: ${id}`);
    const existingTask = await this.getTask(id);
    if (!existingTask) {
      this.logger.warn(`TaskAwsRepository:updateTask - Task ${id} not found`);
      return null;
    }

    const updatedTask: Task = {
      ...existingTask,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    await this.client.send(
      new PutCommand({
        TableName: this.tableName,
        Item: updatedTask,
      }),
    );

    return updatedTask;
  }

  public async deleteTask(id: string): Promise<boolean> {
    this.logger.log(`TaskAwsRepository:deleteTask - ID: ${id}`);
    const existingTask = await this.getTask(id);
    if (!existingTask) {
      this.logger.warn(`TaskAwsRepository:deleteTask - Task ${id} not found`);
      return false;
    }

    await this.client.send(
      new DeleteCommand({
        TableName: this.tableName,
        Key: {
          taskId: id,
          createdAt: existingTask.createdAt,
        },
      }),
    );

    return true;
  }
}
