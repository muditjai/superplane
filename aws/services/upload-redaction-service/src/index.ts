import { PDFDocument, rgb } from 'pdf-lib';
import {
  getConfig,
  OfferStore,
  S3Client,
  SNSClient,
  SQSClient,
} from '@superplane/shared';
import cors from 'cors';
import express, { Request, Response } from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';

const PORT = Number(process.env.PORT || 3003);
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
const app = express();
const offers = new OfferStore();
const s3 = new S3Client();
const sns = new SNSClient();
const sqs = new SQSClient();
const config = getConfig();

app.use(cors());
app.use(express.json());

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'upload-redaction-service' });
});

async function redactPdf(buffer: Buffer): Promise<Buffer> {
  const pdf = await PDFDocument.load(buffer);
  pdf.setTitle('');
  pdf.setAuthor('');
  pdf.setSubject('');
  pdf.setKeywords([]);
  pdf.setProducer('superplane-redaction');
  const pages = pdf.getPages();
  if (pages.length > 0) {
    const first = pages[0];
    const { width, height } = first.getSize();
    first.drawRectangle({
      x: 40,
      y: height - 80,
      width: width - 80,
      height: 30,
      color: rgb(1, 1, 1),
      borderColor: rgb(0.8, 0.8, 0.8),
      borderWidth: 1,
    });
  }
  return Buffer.from(await pdf.save());
}

app.post('/api/upload', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'PDF file required' });
      return;
    }
    if (req.file.mimetype !== 'application/pdf') {
      res.status(400).json({ error: 'Only PDF files are supported' });
      return;
    }

    const offerId = uuidv4();
    const originalKey = `${offerId}/original.pdf`;
    const redactedKey = `${offerId}/redacted.pdf`;

    await s3.putObject(originalKey, req.file.buffer);
    const redacted = await redactPdf(req.file.buffer);
    await s3.putObject(redactedKey, redacted);

    const offer = await offers.put({
      id: offerId,
      company: String(req.body.company || 'Anonymous Co'),
      level: String(req.body.level || 'Unknown'),
      location: String(req.body.location || 'Remote'),
      baseSalary: Number(req.body.baseSalary || 0),
      role: req.body.role ? String(req.body.role) : undefined,
      status: 'published',
      originalKey,
      redactedKey,
    });

    await sqs.sendMessage(config.uploadQueueUrl, {
      offerId,
      originalKey,
      redactedKey,
    });

    await sns.publish(config.offerPublishedTopicArn, {
      type: 'offer-published',
      offerId,
      company: offer.company,
    });

    res.status(201).json({ offer });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

app.listen(PORT, () => {
  console.log(`upload-redaction-service listening on port ${PORT}`);
});
