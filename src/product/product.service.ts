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

  async create(dto: CreateProductDto, userId: string): Promise<Product> {
    const category = await this.categoriesService.findById(dto.categoryId);
    if (!category) {
      throw new NotFoundException('Category not found');
    }

    const product = new this.productModel({
      ...dto,
      createdBy: userId,
    });
    return product.save();
  }

  async findAll(
    pagination: PaginationQueryDto,
  ): Promise<PaginatedResult<Product>> {
    // optional: build filter here (e.g. filter by category)
    const filter = {};

    return paginate<ProductDocument>(this.productModel, pagination, filter);
  }

  async findById(id: string): Promise<Product> {
    const product = await this.productModel.findById(id).exec();
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async update(id: string, dto: UpdateProductDto): Promise<Product> {
    const product = await this.productModel
      .findByIdAndUpdate(id, dto, { new: true })
      .exec();
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async remove(id: string): Promise<void> {
    const result = await this.productModel.findByIdAndDelete(id).exec();
    if (!result) throw new NotFoundException('Product not found');
  }
}
