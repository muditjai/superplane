import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client as AwsS3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { getConfig } from './config';

const localFiles = new Map<string, Buffer>();

export class S3Client {
  private config = getConfig();
  private client = new AwsS3Client({
    region: this.config.region,
    endpoint: this.config.endpoint,
    forcePathStyle: Boolean(this.config.endpoint),
  });

  async putObject(
    key: string,
    body: Buffer,
    contentType = 'application/pdf'
  ): Promise<{ key: string }> {
    if (this.config.useLocalStore) {
      localFiles.set(key, body);
      return { key };
    }
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.config.s3Bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      })
    );
    return { key };
  }

  async getPresignedUrl(key: string, expiresIn = 3600): Promise<string> {
    if (this.config.useLocalStore) {
      return `local://${key}`;
    }
    return getSignedUrl(
      this.client,
      new GetObjectCommand({ Bucket: this.config.s3Bucket, Key: key }),
      { expiresIn }
    );
  }
}
