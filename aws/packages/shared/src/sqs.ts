import {
  SendMessageCommand,
  SQSClient as AwsSQSClient,
} from '@aws-sdk/client-sqs';
import { getConfig } from './config';

export const localSqsMessages: Array<{ queueUrl: string; body: string }> = [];

export class SQSClient {
  private config = getConfig();
  private client = new AwsSQSClient({
    region: this.config.region,
    endpoint: this.config.endpoint,
  });

  async sendMessage(
    queueUrl: string,
    message: unknown
  ): Promise<{ messageId?: string }> {
    const body =
      typeof message === 'string' ? message : JSON.stringify(message);
    if (this.config.useLocalStore || !queueUrl) {
      localSqsMessages.push({ queueUrl, body });
      return { messageId: `local-${Date.now()}` };
    }
    const result = await this.client.send(
      new SendMessageCommand({ QueueUrl: queueUrl, MessageBody: body })
    );
    return { messageId: result.MessageId };
  }
}
