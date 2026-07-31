import { Injectable } from '../../Injectable';
import { Logger } from '../../Logger';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class S3Helper {
  private readonly logger = new Logger(S3Helper.name);
  private readonly s3Client: S3Client;

  constructor() {
    this.s3Client = new S3Client({});
  }

  public getClient(): S3Client {
    return this.s3Client;
  }

  public async upload(bucket: string, key: string, body: Buffer | string, contentType?: string): Promise<void> {
    this.logger.log(`Uploading object to S3 bucket: ${bucket}, key: ${key}`);
    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );
  }

  public async getObject(bucket: string, key: string): Promise<Buffer | null> {
    this.logger.log(`Retrieving object from S3 bucket: ${bucket}, key: ${key}`);
    try {
      const response = await this.s3Client.send(
        new GetObjectCommand({
          Bucket: bucket,
          Key: key,
        }),
      );
      if (!response.Body) return null;
      const byteArray = await response.Body.transformToByteArray();
      return Buffer.from(byteArray);
    } catch (error: any) {
      if (error.name === 'NoSuchKey') {
        return null;
      }
      throw error;
    }
  }

  public async deleteObject(bucket: string, key: string): Promise<void> {
    this.logger.log(`Deleting object from S3 bucket: ${bucket}, key: ${key}`);
    await this.s3Client.send(
      new DeleteObjectCommand({
        Bucket: bucket,
        Key: key,
      }),
    );
  }

  public async getSignedDownloadUrl(bucket: string, key: string, expiresInSeconds = 3600): Promise<string> {
    this.logger.log(`Generating signed download URL for bucket: ${bucket}, key: ${key}`);
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    });
    return getSignedUrl(this.s3Client as any, command as any, {
      expiresIn: expiresInSeconds,
    });
  }
}
