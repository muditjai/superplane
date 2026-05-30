import cors from 'cors';
import express, { Request, Response } from 'express';
import { getConfig, PaymentStore, SNSClient } from '@superplane/shared';

const PORT = Number(process.env.PORT || 3004);
const app = express();
const payments = new PaymentStore();
const sns = new SNSClient();
const config = getConfig();

app.use(cors());
app.use(express.json());

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'payment-service' });
});

app.post('/api/payments', async (req: Request, res: Response) => {
  try {
    const { offerId, amount = 5 } = req.body as { offerId?: string; amount?: number };
    if (!offerId) {
      res.status(400).json({ error: 'offerId is required' });
      return;
    }
    const payment = await payments.put({ offerId, amount: Number(amount) });
    await sns.publish(config.paymentCompletedTopicArn, {
      type: 'payment-completed',
      paymentId: payment.id,
      offerId: payment.offerId,
      amount: payment.amount,
    });
    res.status(201).json({
      payment,
      message: 'Mock payment completed',
    });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

app.get('/api/payments', async (_req: Request, res: Response) => {
  try {
    const list = await payments.list();
    res.json({ payments: list });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

app.listen(PORT, () => {
  console.log(`payment-service listening on port ${PORT}`);
});
