/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
// src/products/products.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Product } from './schemas/product.schema';
import type { ProductDocument } from './schemas/product.schema';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { CategoryService } from 'src/category/category.service';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';
import { PaginatedResult } from 'src/common/interfaces/paginated-result.interface';
import { paginate } from 'src/common/utils/paginate.util';

@Injectable()
export class ProductService {
  constructor(
    @InjectModel(Product.name)
    private productModel: Model<ProductDocument>,
    private categoriesService: CategoryService,
  ) {}

  async create(
    dto: CreateProductDto,
    userId: string,
    files: Express.Multer.File[],
  ) {
    const category = await this.categoriesService.findById(dto.categoryId);
    if (!category) throw new NotFoundException('Category not found');

    // const uploadedUrls = files?.map((f) => `/uploads/${f.filename}`) ?? [];
    // const uploadedUrls = files?.map((f) => `/uploads/${f.filename}`) ?? [];

    const product = new this.productModel({
      ...dto,
      // images: uploadedUrls,
      createdBy: userId,
    });

    return product.save();
  }

  async findAll(
    pagination: PaginationQueryDto,
  ): Promise<PaginatedResult<Product>> {
    const filter = {};

    return paginate<ProductDocument>(this.productModel, pagination, filter);
  }

  async findById(id: string): Promise<Product> {
    const product = await this.productModel.findById(id).exec();
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async update(
    id: string,
    dto: UpdateProductDto,
    files: Express.Multer.File[],
  ): Promise<Product> {
    const product = await this.productModel.findById(id);
    if (!product) throw new NotFoundException('Product not found');

    const uploadedUrls = files?.map((f) => `/uploads/${f.filename}`) ?? [];

    const baseImages =
      dto.keepImages !== undefined ? dto.keepImages : product.images;

    const finalImages = [...(baseImages ?? []), ...uploadedUrls];

    delete dto.keepImages;

    Object.assign(product, dto);

    product.images = finalImages;

    return product.save();
  }

  async remove(id: string): Promise<void> {
    const result = await this.productModel.findByIdAndDelete(id).exec();
    if (!result) throw new NotFoundException('Product not found');
  }
}
