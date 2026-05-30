import cors from 'cors';
import express, { Request, Response } from 'express';
import { AnalyticsStore, getConfig, SQSClient } from '@superplane/shared';

const PORT = Number(process.env.PORT || 3005);
const app = express();
const analytics = new AnalyticsStore();
const sqs = new SQSClient();
const config = getConfig();

app.use(cors());
app.use(express.json());

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'analytics-service' });
});

app.post('/api/analytics/events', async (req: Request, res: Response) => {
  try {
    const { type, offerId, metadata, source } = req.body as {
      type?: string;
      offerId?: string;
      metadata?: Record<string, unknown>;
      source?: string;
    };
    if (!type) {
      res.status(400).json({ error: 'type is required' });
      return;
    }
    const event = await analytics.put({ type, offerId, metadata, source: source || 'web' });
    await sqs.sendMessage(config.analyticsQueueUrl, event);
    res.status(201).json({ event });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

app.get('/api/analytics/events', async (_req: Request, res: Response) => {
  try {
    const events = await analytics.list();
    res.json({ events, count: events.length });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

app.listen(PORT, () => {
  console.log(`analytics-service listening on port ${PORT}`);
});
