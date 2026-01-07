/* eslint-disable @typescript-eslint/prefer-promise-reject-errors */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Injectable } from '@nestjs/common';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';

import * as streamifier from 'streamifier';

@Injectable()
export class CloudinaryService {
  async uploadImage(file: Express.Multer.File): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
        api_key: process.env.CLOUDINARY_API_KEY!,
        api_secret: process.env.CLOUDINARY_API_SECRET!,
      });
      cloudinary.uploader
        .upload_stream(
          { resource_type: 'auto', folder: 'elegant-home-affairs' },
          (err, result) => {
            if (err) return reject(err);
            resolve(result!);
          },
        )
        .end(file.buffer);
    });
  }
  async uploadJson(
    json: Record<string, any>,
    filename: string,
  ): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      const jsonString = JSON.stringify(json);

      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: 'raw',
          public_id: filename,
          folder: 'delivery-json',
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result!);
        },
      );

      streamifier.createReadStream(Buffer.from(jsonString)).pipe(uploadStream);
    });
  }
}
