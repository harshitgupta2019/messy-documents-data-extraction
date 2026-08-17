import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { DocumentModel, DocumentSchema } from "./document.schema";
import { DocumentsController } from "./documents.controller";
import { DocumentsService } from "./documents.service";
import { IngestionService } from "./ingestion";
import { LlmService } from "./llm.service";
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: DocumentModel.name, schema: DocumentSchema },
    ]),
  ],
  controllers: [DocumentsController],
  providers: [DocumentsService, IngestionService, LlmService],
})
export class DocumentsModule {}
