import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { DocumentModel } from "./document.schema";
import { classify, validate } from "./extraction";
import { IngestionService } from "./ingestion";
import { LlmService } from "./llm.service";
@Injectable()
export class DocumentsService {
  constructor(
    @InjectModel(DocumentModel.name) private m: Model<DocumentModel>,
    private i: IngestionService,
    private l: LlmService,
  ) {}
  async create(f: Express.Multer.File) {
    const d = await this.m.create({
      filename: f.originalname,
      status: "processing",
    });
    setImmediate(() => this.process(d._id.toString(), f));
    return d;
  }
  async process(id: string, f: Express.Multer.File) {
    const started = Date.now();
    try {
      const x = await this.i.text(f);
      const type = classify(x.text);

      if (type === "unknown") {
        await this.m.findByIdAndUpdate(id, {
          documentType: "unknown",
          extractedData: {},
          fields: [],
          validation: {
            status: "needs_review",
            issues: ["Could not confidently determine the document type."],
          },
          status: "needs_review",
          processing: {
            durationMs: Date.now() - started,
            pages: x.pages,
            ingestionMethod: x.method,
            warning: "Document type could not be determined automatically.",
          },
        });

        return;
      }

      const r = await this.l.run(type, x.text);
      const v = validate(type, r.data);
      const fields = Object.entries(r.data).map(([name, value]) => ({
        name,
        value,
        confidence: value === "" ? 0.35 : r.confidence,
        source: { page: 1 },
      }));
      await this.m.findByIdAndUpdate(id, {
        documentType: type,
        extractedData: r.data,
        fields,
        validation: v,
        status: v.status === "needs_review" ? "needs_review" : "completed",
        processing: {
          durationMs: Date.now() - started,
          pages: x.pages,
          ingestionMethod: x.method,
          provider: r.provider,
          warning: r.warning,
        },
      });
    } catch (e: any) {
      await this.m.findByIdAndUpdate(id, {
        status: "failed",
        error: e.message,
        processing: { durationMs: Date.now() - started },
      });
    }
  }
  async all(params: {
    q?: string;
    type?: string;
    totalMin?: number;
    totalMax?: number;
  }) {
    const filter: any = {};

    if (params.type) {
      filter.documentType = params.type;
    }

    if (params.q?.trim()) {
      const search = params.q.trim();

      filter.$or = [
        { filename: { $regex: search, $options: "i" } },
        { documentType: { $regex: search, $options: "i" } },
        { "extractedData.vendor": { $regex: search, $options: "i" } },
        { "extractedData.invoiceNumber": { $regex: search, $options: "i" } },
        { "extractedData.accountHolder": { $regex: search, $options: "i" } },
        { "extractedData.accountNumber": { $regex: search, $options: "i" } },
        { "extractedData.name": { $regex: search, $options: "i" } },
        { "extractedData.email": { $regex: search, $options: "i" } },
        { "extractedData.location": { $regex: search, $options: "i" } },
        { "extractedData.experience": { $regex: search, $options: "i" } },
        { "extractedData.education": { $regex: search, $options: "i" } },
        { "extractedData.skills": { $regex: search, $options: "i" } },
      ];
    }

    if (params.totalMin !== undefined || params.totalMax !== undefined) {
      filter["extractedData.total"] = {};

      if (params.totalMin !== undefined) {
        filter["extractedData.total"].$gte = params.totalMin;
      }

      if (params.totalMax !== undefined) {
        filter["extractedData.total"].$lte = params.totalMax;
      }
    }

    return this.m.find(filter).sort({ createdAt: -1 }).lean();
  }
  async one(id: string) {
    const d = await this.m.findById(id).lean();
    if (!d) throw new NotFoundException("Document not found");
    return d;
  }
}
