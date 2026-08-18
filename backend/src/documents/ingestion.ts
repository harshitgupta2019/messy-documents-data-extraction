import { Injectable } from '@nestjs/common';
import { createWorker } from 'tesseract.js';
import { execFile } from 'child_process';
import { promisify } from 'util';
import {
  mkdtemp,
  writeFile,
  rm,
} from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';

const execFileAsync = promisify(execFile);

@Injectable()
export class IngestionService {
  async text(f: Express.Multer.File) {
    const filename = f.originalname.toLowerCase();

    if (f.mimetype === "application/pdf" || filename.endsWith(".pdf")) {
      return this.extractPdf(f.buffer);
    }

    if (f.mimetype.startsWith("image/")) {
      return this.extractImage(f.buffer);
    }

    return {
      text: f.buffer.toString("utf8"),
      pages: 1,
      method: "text",
    };
  }

  private async extractPdf(buffer: Buffer) {
    const tempDir = await mkdtemp(join(tmpdir(), "docquery-"));

    const pdfPath = join(tempDir, "document.pdf");

    try {
      await writeFile(pdfPath, buffer);

      const scriptPath = join(process.cwd(), "scripts", "extract_pdf.py");

      const { stdout, stderr } = await execFileAsync(
        process.env.PYTHON_PATH || "C:\\Python310\\python.exe",
        [scriptPath, pdfPath],
        {
          maxBuffer: 20 * 1024 * 1024,
        },
      );

      /*
       * PyMuPDF can write warnings to stdout.
       *
       * Example:
       *
       * warning: ...
       * {"text":"...","pages":1}
       *
       * Therefore we don't JSON.parse(stdout) directly.
       */

      const output = `${stdout || ""}\n${stderr || ""}`;

      let result: any = null;

      /*
       * First try to find a JSON object in the output.
       */
      const jsonStart = output.indexOf("{");

      if (jsonStart !== -1) {
        const jsonText = output.slice(jsonStart).trim();

        try {
          result = JSON.parse(jsonText);
        } catch {
          /*
           * If warnings were printed after the JSON,
           * find the last closing brace.
           */
          const jsonEnd = jsonText.lastIndexOf("}");

          if (jsonEnd !== -1) {
            result = JSON.parse(jsonText.slice(0, jsonEnd + 1));
          }
        }
      }

      if (!result) {
        throw new Error(
          `PDF extractor did not return valid JSON. Output: ${
            output || "empty output"
          }`,
        );
      }

      if (result.error) {
        throw new Error(result.error);
      }

      const text = String(result.text || "").trim();

      if (!text) {
        throw new Error(
          "PDF contains no extractable text. OCR is required for scanned PDFs.",
        );
      }

      return {
        text,
        pages: result.pages || 1,
        method: "pymupdf",
      };
    } catch (error: any) {
      throw new Error(`PDF extraction failed: ${error?.message || error}`);
    } finally {
      await rm(tempDir, {
        recursive: true,
        force: true,
      });
    }
  }

  private async extractImage(buffer: Buffer) {
    const worker = await createWorker("eng");

    try {
      const result = await worker.recognize(buffer);

      return {
        text: result.data.text,
        pages: 1,
        method: "ocr",
      };
    } finally {
      await worker.terminate();
    }
  }
}
