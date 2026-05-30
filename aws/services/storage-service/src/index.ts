import cors from 'cors';
import express, { Request, Response } from 'express';
import { OfferStore, S3Client } from '@superplane/shared';

const PORT = Number(process.env.PORT || 3001);
const app = express();
const offers = new OfferStore();
const s3 = new S3Client();

app.use(cors());
app.use(express.json());

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'storage-service' });
});

app.post('/api/offers', async (req: Request, res: Response) => {
  try {
    const offer = await offers.put(req.body);
    res.status(201).json(offer);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

app.get('/api/offers/:id', async (req: Request, res: Response) => {
  try {
    const offer = await offers.get(String(req.params.id));
    if (!offer) {
      res.status(404).json({ error: 'Offer not found' });
      return;
    }
    const downloadUrl = offer.redactedKey
      ? await s3.getPresignedUrl(offer.redactedKey)
      : null;
    res.json({ ...offer, downloadUrl });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

app.listen(PORT, () => {
  console.log(`storage-service listening on port ${PORT}`);
});
