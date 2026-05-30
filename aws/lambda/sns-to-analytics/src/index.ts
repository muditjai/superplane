import type { SNSEvent } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';

const doc = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const tableName = process.env.ANALYTICS_TABLE || 'superplane-analytics';

export async function handler(event: SNSEvent): Promise<void> {
  for (const record of event.Records) {
    let payload: Record<string, unknown> = {};
    try {
      payload = JSON.parse(record.Sns.Message);
    } catch {
      payload = { raw: record.Sns.Message };
    }
    await doc.send(
      new PutCommand({
        TableName: tableName,
        Item: {
          id: uuidv4(),
          type: String(payload.type || 'sns-event'),
          offerId: payload.offerId,
          metadata: payload,
          source: 'lambda-sns-to-analytics',
          createdAt: new Date().toISOString(),
        },
      })
    );
  }
}
