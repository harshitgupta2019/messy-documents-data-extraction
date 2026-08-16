import { Injectable } from '@nestjs/common';
import pdfParse from 'pdf-parse';
import { createWorker } from 'tesseract.js';

@Injectable()
export class IngestionService {
  async text(f: Express.Multer.File) {
    if (
      f.mimetype === 'application/pdf' ||
      f.originalname.endsWith('.pdf')
    ) {
      const result = await pdfParse(f.buffer);

      if (!result.text.trim()) {
        throw new Error(
          'Scanned PDF has no text layer; upload an image or OCR-enabled PDF.',
        );
      }

      return {
        text: result.text,
        pages: result.numpages || 1,
        method: 'pdf-text',
      };
    }

    if (f.mimetype.startsWith('image/')) {
      const worker = await createWorker('eng');
      const result = await worker.recognize(f.buffer);
      await worker.terminate();

      return {
        text: result.data.text,
        pages: 1,
        method: 'ocr',
      };
    }

    return {
      text: f.buffer.toString(),
      pages: 1,
      method: 'text',
    };
  }
}