/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
// src/products/products.controller.ts
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ProductService } from './product.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';
import { FilesInterceptor } from '@nestjs/platform-express';

@Controller('product')
export class ProductController {
  constructor(private readonly productsService: ProductService) {}

  @Get()
  async findAll(@Query() query: PaginationQueryDto) {
    // console.log();
    // const products = await this.productsService.findAll(query);
    // console.log(products.items);
    return await this.productsService.findAll(query);
  }
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.productsService.findById(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @UseInterceptors(FilesInterceptor('images', 10))
  async create(
    @Body() dto: CreateProductDto,
    @UploadedFiles() files: Express.Multer.File[],
    @CurrentUser() user: any,
  ) {
    const parsedDto = {
      ...dto,
      price: Number(dto.price),
      stock: Number(dto.stock),
      categoryId: dto.categoryId,
      images: dto.images ?? [],
      colors: dto.colors ?? [],
    };

    return this.productsService.create(parsedDto, user.userId);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @UseInterceptors(FilesInterceptor('images', 10))
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    const parsedDto = {
      ...dto,
      price: Number(dto.price),
      stock: Number(dto.stock),

      colors: dto.colors ?? [],
    };

    return this.productsService.update(id, parsedDto, files);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async remove(@Param('id') id: string) {
    await this.productsService.remove(id);
    return { message: 'Product deleted' };
  }
}
