export interface Offer {
  id: string;
  company: string;
  level: string;
  location: string;
  baseSalary: number;
  role?: string;
  status: 'processing' | 'published';
  originalKey?: string;
  redactedKey?: string;
  createdAt: string;
}

export interface Payment {
  id: string;
  offerId: string;
  amount: number;
  status: 'completed' | 'failed';
  receiptId: string;
  createdAt: string;
}

export interface AnalyticsEvent {
  id: string;
  type: string;
  offerId?: string;
  metadata?: Record<string, unknown>;
  source?: string;
  createdAt: string;
}

export interface AppConfig {
  region: string;
  endpoint?: string;
  s3Bucket: string;
  offersTable: string;
  paymentsTable: string;
  analyticsTable: string;
  uploadQueueUrl: string;
  analyticsQueueUrl: string;
  offerPublishedTopicArn: string;
  paymentCompletedTopicArn: string;
  useLocalStore: boolean;
}
