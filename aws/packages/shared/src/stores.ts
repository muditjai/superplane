import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  ScanCommand,
} from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { getConfig } from './config';
import type { AnalyticsEvent, Offer, Payment } from './types';

const localOffers = new Map<string, Offer>();
const localPayments = new Map<string, Payment>();
const localAnalytics: AnalyticsEvent[] = [];

function createDocClient(): DynamoDBDocumentClient {
  const config = getConfig();
  const client = new DynamoDBClient({
    region: config.region,
    endpoint: config.endpoint,
  });
  return DynamoDBDocumentClient.from(client);
}

export class OfferStore {
  private config = getConfig();
  private doc = createDocClient();

  async put(offer: Partial<Offer> & Pick<Offer, 'company' | 'level' | 'location' | 'baseSalary'>): Promise<Offer> {
    const record: Offer = {
      id: offer.id || uuidv4(),
      company: offer.company,
      level: offer.level,
      location: offer.location,
      baseSalary: offer.baseSalary,
      role: offer.role,
      status: offer.status || 'published',
      originalKey: offer.originalKey,
      redactedKey: offer.redactedKey,
      createdAt: offer.createdAt || new Date().toISOString(),
    };
    if (this.config.useLocalStore) {
      localOffers.set(record.id, record);
      return record;
    }
    await this.doc.send(
      new PutCommand({ TableName: this.config.offersTable, Item: record })
    );
    return record;
  }

  async get(id: string): Promise<Offer | null> {
    if (this.config.useLocalStore) {
      return localOffers.get(id) || null;
    }
    const result = await this.doc.send(
      new GetCommand({ TableName: this.config.offersTable, Key: { id } })
    );
    return (result.Item as Offer) || null;
  }

  async list(): Promise<Offer[]> {
    if (this.config.useLocalStore) {
      return Array.from(localOffers.values());
    }
    const result = await this.doc.send(
      new ScanCommand({ TableName: this.config.offersTable })
    );
    return (result.Items as Offer[]) || [];
  }
}

export class PaymentStore {
  private config = getConfig();
  private doc = createDocClient();

  async put(payment: Partial<Payment> & Pick<Payment, 'offerId' | 'amount'>): Promise<Payment> {
    const record: Payment = {
      id: payment.id || uuidv4(),
      offerId: payment.offerId,
      amount: payment.amount,
      status: payment.status || 'completed',
      receiptId: payment.receiptId || `rcpt_${uuidv4().slice(0, 8)}`,
      createdAt: payment.createdAt || new Date().toISOString(),
    };
    if (this.config.useLocalStore) {
      localPayments.set(record.id, record);
      return record;
    }
    await this.doc.send(
      new PutCommand({ TableName: this.config.paymentsTable, Item: record })
    );
    return record;
  }

  async list(): Promise<Payment[]> {
    if (this.config.useLocalStore) {
      return Array.from(localPayments.values());
    }
    const result = await this.doc.send(
      new ScanCommand({ TableName: this.config.paymentsTable })
    );
    return (result.Items as Payment[]) || [];
  }
}

export class AnalyticsStore {
  private config = getConfig();
  private doc = createDocClient();

  async put(event: Partial<AnalyticsEvent> & Pick<AnalyticsEvent, 'type'>): Promise<AnalyticsEvent> {
    const record: AnalyticsEvent = {
      id: event.id || uuidv4(),
      type: event.type,
      offerId: event.offerId,
      metadata: event.metadata,
      source: event.source,
      createdAt: event.createdAt || new Date().toISOString(),
    };
    if (this.config.useLocalStore) {
      localAnalytics.push(record);
      return record;
    }
    await this.doc.send(
      new PutCommand({ TableName: this.config.analyticsTable, Item: record })
    );
    return record;
  }

  async list(): Promise<AnalyticsEvent[]> {
    if (this.config.useLocalStore) {
      return [...localAnalytics];
    }
    const result = await this.doc.send(
      new ScanCommand({ TableName: this.config.analyticsTable })
    );
    return (result.Items as AnalyticsEvent[]) || [];
  }
}
