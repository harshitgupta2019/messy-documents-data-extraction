import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { DocumentsService } from "./documents.service";
@Controller("documents")
export class DocumentsController {
  constructor(private s: DocumentsService) {}
  @Post()
  @UseInterceptors(
    FileInterceptor("file", { limits: { fileSize: 10 * 1024 * 1024 } }),
  )
  upload(@UploadedFile() f: Express.Multer.File) {
    if (!f) throw new BadRequestException("file is required");
    return this.s.create(f);
  }
  @Get(":id") one(@Param("id") id: string) {
    return this.s.one(id);
  }

  @Get()
    all(
    @Query('q') q?: string,
    @Query('type') type?: string,
    @Query('totalMin') totalMin?: string,
    @Query('totalMax') totalMax?: string,
    ) {
    return this.s.all({
        q,
        type,
        totalMin: totalMin ? Number(totalMin) : undefined,
        totalMax: totalMax ? Number(totalMax) : undefined,
    });
    }
}
