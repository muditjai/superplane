import type { S3Event } from 'aws-lambda';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';

const sqs = new SQSClient({});
const queueUrl = process.env.UPLOAD_QUEUE_URL || '';

export async function handler(event: S3Event): Promise<void> {
  for (const record of event.Records) {
    const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));
    const bucket = record.s3.bucket.name;
    if (!queueUrl) continue;
    await sqs.send(
      new SendMessageCommand({
        QueueUrl: queueUrl,
        MessageBody: JSON.stringify({
          type: 's3-upload',
          bucket,
          key,
          eventTime: record.eventTime,
        }),
      })
    );
  }
}
