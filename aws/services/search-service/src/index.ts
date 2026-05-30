import cors from 'cors';
import express, { Request, Response } from 'express';
import { OfferStore, type Offer } from '@superplane/shared';

const PORT = Number(process.env.PORT || 3002);
const app = express();
const offers = new OfferStore();

app.use(cors());
app.use(express.json());

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'search-service' });
});

function matchesQuery(offer: Offer, q: string, company: string, level: string): boolean {
  const haystack = [
    offer.company,
    offer.level,
    offer.location,
    offer.role || '',
  ]
    .join(' ')
    .toLowerCase();
  if (q && !haystack.includes(q.toLowerCase())) return false;
  if (company && !offer.company.toLowerCase().includes(company.toLowerCase())) return false;
  if (level && !offer.level.toLowerCase().includes(level.toLowerCase())) return false;
  return offer.status === 'published';
}

app.get('/api/search', async (req: Request, res: Response) => {
  try {
    const q = String(req.query.q || '');
    const company = String(req.query.company || '');
    const level = String(req.query.level || '');
    const all = await offers.list();
    const results = all
      .filter((o) => matchesQuery(o, q, company, level))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    res.json({ results, count: results.length });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

app.listen(PORT, () => {
  console.log(`search-service listening on port ${PORT}`);
});
