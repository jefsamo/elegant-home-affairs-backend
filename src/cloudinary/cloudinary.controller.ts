/* eslint-disable @typescript-eslint/no-unsafe-call */
import {
  Controller,
  Post,
  Body,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  UseGuards,
} from '@nestjs/common';
import { CloudinaryService } from './cloudinary.service';

import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';

@Controller('cloudinary')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class CloudinaryController {
  constructor(private readonly cloudinaryService: CloudinaryService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    const result = await this.cloudinaryService.uploadImage(file);
    return {
      message: 'Image uploaded successfully',
      url: result.secure_url,
    };
  }

  @Post('images')
  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles('admin')
  @UseInterceptors(FilesInterceptor('files', 10)) // up to 10 images
  async uploadImages(@UploadedFiles() files: Express.Multer.File[]) {
    const uploads = await Promise.all(
      (files ?? []).map((f) => this.cloudinaryService.uploadImage(f)),
    );

    return {
      message: 'Images uploaded successfully',
      urls: uploads.map((u) => u.secure_url),
    };
  }
}
