import type { AppConfig } from './types';

export function getConfig(): AppConfig {
  return {
    region: process.env.AWS_REGION || 'us-east-1',
    endpoint: process.env.AWS_ENDPOINT || undefined,
    s3Bucket: process.env.S3_BUCKET || 'superplane-offer-pdfs',
    offersTable: process.env.OFFERS_TABLE || 'superplane-offers',
    paymentsTable: process.env.PAYMENTS_TABLE || 'superplane-payments',
    analyticsTable: process.env.ANALYTICS_TABLE || 'superplane-analytics',
    uploadQueueUrl: process.env.UPLOAD_QUEUE_URL || '',
    analyticsQueueUrl: process.env.ANALYTICS_QUEUE_URL || '',
    offerPublishedTopicArn: process.env.OFFER_PUBLISHED_TOPIC_ARN || '',
    paymentCompletedTopicArn: process.env.PAYMENT_COMPLETED_TOPIC_ARN || '',
    useLocalStore: process.env.USE_LOCAL_STORE === 'true',
  };
}
