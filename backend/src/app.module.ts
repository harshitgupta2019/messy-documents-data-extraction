import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { DocumentsModule } from "./documents/documents.module";
import { QueryModule } from "./query/query.module";
@Module({
  imports: [
    MongooseModule.forRoot(
      process.env.MONGO_URL || "mongodb://localhost:27017/docquery",
    ),
    DocumentsModule,
    QueryModule,
  ],
})
export class AppModule {}
