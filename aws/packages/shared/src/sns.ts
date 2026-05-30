import {
  PublishCommand,
  SNSClient as AwsSNSClient,
} from '@aws-sdk/client-sns';
import { getConfig } from './config';

export const localSnsMessages: Array<{ topicArn: string; payload: string }> = [];

export class SNSClient {
  private config = getConfig();
  private client = new AwsSNSClient({
    region: this.config.region,
    endpoint: this.config.endpoint,
  });

  async publish(
    topicArn: string,
    message: unknown
  ): Promise<{ messageId?: string }> {
    const payload =
      typeof message === 'string' ? message : JSON.stringify(message);
    if (this.config.useLocalStore || !topicArn) {
      localSnsMessages.push({ topicArn, payload });
      return { messageId: `local-${Date.now()}` };
    }
    const result = await this.client.send(
      new PublishCommand({ TopicArn: topicArn, Message: payload })
    );
    return { messageId: result.MessageId };
  }
}
