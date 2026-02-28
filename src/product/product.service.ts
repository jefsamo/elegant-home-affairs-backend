/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
// src/products/products.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { Product } from './schemas/product.schema';
import type { ProductDocument } from './schemas/product.schema';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { CategoryService } from 'src/category/category.service';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';
import { PaginatedResult } from 'src/common/interfaces/paginated-result.interface';
import { paginate, paginateV2 } from 'src/common/utils/paginate.util';
import { ProductQueryDto } from './dto/product-query.dto';

@Injectable()
export class ProductService {
  constructor(
    @InjectModel(Product.name)
    private productModel: Model<ProductDocument>,
    private categoriesService: CategoryService,
  ) {}

  async create(dto: CreateProductDto, userId: string) {
    const OTHER_CATEGORY_ID =
      process.env.NODE_ENV === 'production'
        ? '6968deef904ef2688054bc56' // prod
        : '6968e0067143cd103af13871'; // dev

    const categoryId = dto.categoryId?.trim()
      ? dto.categoryId
      : OTHER_CATEGORY_ID;

    const category = await this.categoriesService.findById(categoryId);
    if (!category) {
      throw new NotFoundException('Category not found');
    }

    const product = new this.productModel({
      ...dto,
      categoryName: category.name,
      createdBy: userId,
    });

    return product.save();
  }

  // async create(dto: CreateProductDto, userId: string) {
  //   const otherCategoryIdProd = '6968deef904ef2688054bc56';
  //   const otherCategoryIdDev = '6968e0067143cd103af13871';
  //   const category = await this.categoriesService.findById(
  //     dto.categoryId ?? otherCategoryIdDev,
  //   );
  //   if (!category) throw new NotFoundException('Category not found');

  //   const product = new this.productModel({
  //     ...dto,
  //     createdBy: userId,
  //   });

  //   return product.save();
  // }

  async findAll(
    pagination: ProductQueryDto,
  ): Promise<PaginatedResult<Product>> {
    const filter: FilterQuery<ProductDocument> = {};

    // category filter
    if (pagination.category) {
      filter.category = pagination.category;
    }

    if (pagination.search?.trim()) {
      const q = pagination.search.trim();

      filter.$or = [{ name: { $regex: q, $options: 'i' } }];
    }

    return paginateV2<ProductDocument>(this.productModel, pagination, filter);
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

  async checkAvailability(items: { productId: string; quantity: number }[]) {
    const ids = items.map((i) => new Types.ObjectId(i.productId));

    const products = await this.productModel
      .find({ _id: { $in: ids } })
      .select('_id isAvailable stock name')
      .lean()
      .exec();

    const map = new Map(products.map((p: any) => [String(p._id), p]));

    const results = items.map((it) => {
      const p: any = map.get(it.productId);

      if (!p) {
        return {
          productId: it.productId,
          isAvailable: false,
          reason: 'not_found',
        };
      }

      if (!p.isAvailable) {
        return {
          productId: it.productId,
          isAvailable: false,
          reason: 'disabled',
        };
      }

      if (typeof p.stock === 'number' && it.quantity > p.stock) {
        return {
          productId: it.productId,
          isAvailable: false,
          reason: 'insufficient_stock',
          stock: p.stock,
        };
      }

      return {
        productId: it.productId,
        isAvailable: true,
      };
    });

    const allAvailable = results.every((r) => r.isAvailable);

    return { allAvailable, results };
  }
}
