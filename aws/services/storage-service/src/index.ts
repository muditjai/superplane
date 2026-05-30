import express, { Request, Response } from 'express';

const SERVICE = 'storage-service';
const VERSION = '1.0.0';
const PORT = Number(process.env.PORT || 3001);

const app = express();

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'healthy', service: SERVICE, version: VERSION, platform: 'aws' });
});

app.get('/version', (_req: Request, res: Response) => {
  res.json({ service: SERVICE, version: VERSION, platform: 'aws' });
});

app.listen(PORT, () => {
  console.log(`${SERVICE} v${VERSION} listening on ${PORT}`);
});
