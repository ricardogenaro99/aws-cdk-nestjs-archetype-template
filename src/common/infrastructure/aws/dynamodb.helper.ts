import { Injectable } from '../../Injectable';
import { Logger } from '../../Logger';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  ScanCommand,
  QueryCommand,
  DeleteCommand,
} from '@aws-sdk/lib-dynamodb';

@Injectable()
export class DynamoDbHelper {
  private readonly logger = new Logger(DynamoDbHelper.name);
  private readonly documentClient: DynamoDBDocumentClient;

  constructor() {
    const client = new DynamoDBClient({});
    this.documentClient = DynamoDBDocumentClient.from(client, {
      marshallOptions: {
        removeUndefinedValues: true,
        convertClassInstanceToMap: true,
      },
    });
  }

  public getClient(): DynamoDBDocumentClient {
    return this.documentClient;
  }

  public async put(tableName: string, item: Record<string, any>): Promise<void> {
    this.logger.log(`PutItem on table: ${tableName}`);
    await this.documentClient.send(
      new PutCommand({
        TableName: tableName,
        Item: item,
      }),
    );
  }

  public async get<T>(tableName: string, key: Record<string, any>): Promise<T | null> {
    this.logger.log(`GetItem from table: ${tableName}`);
    const response = await this.documentClient.send(
      new GetCommand({
        TableName: tableName,
        Key: key,
      }),
    );
    return (response.Item as T) || null;
  }

  public async scan<T>(tableName: string): Promise<T[]> {
    this.logger.log(`Scan table: ${tableName}`);
    const response = await this.documentClient.send(
      new ScanCommand({
        TableName: tableName,
      }),
    );
    return (response.Items as T[]) || [];
  }

  public async query<T>(
    tableName: string,
    keyConditionExpression: string,
    expressionAttributeValues: Record<string, any>,
  ): Promise<T[]> {
    this.logger.log(`Query table: ${tableName}`);
    const response = await this.documentClient.send(
      new QueryCommand({
        TableName: tableName,
        KeyConditionExpression: keyConditionExpression,
        ExpressionAttributeValues: expressionAttributeValues,
      }),
    );
    return (response.Items as T[]) || [];
  }

  public async delete(tableName: string, key: Record<string, any>): Promise<void> {
    this.logger.log(`DeleteItem from table: ${tableName}`);
    await this.documentClient.send(
      new DeleteCommand({
        TableName: tableName,
        Key: key,
      }),
    );
  }
}
