/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateDiscountDto } from './dto/create-discount.dto';
import { Discount } from './schemas/discount.schema';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { UpdateDiscountDto } from './dto/update-discount.dto';
import { MongoServerError } from 'mongodb';

@Injectable()
export class DiscountService {
  constructor(
    @InjectModel(Discount.name)
    private discountModel: Model<Discount>,
  ) {}

  async findAll() {
    return await this.discountModel.find().exec();
  }

  async create(dto: CreateDiscountDto) {
    const code = dto.name.trim().toUpperCase();
    return this.discountModel.create({ ...dto, name: code });
  }
  async findById(id: string) {
    const discount = await this.discountModel.findById(id);
    if (!discount) throw new NotFoundException('Discount not found');
    return discount;
  }

  async findByCode(code: string) {
    const normalized = code.trim().toUpperCase();
    const discount = await this.discountModel.findOne({
      name: normalized,
      isActive: true,
    });
    if (!discount)
      throw new NotFoundException('Invalid or inactive discount code');
    return discount;
  }

  async validate(code: string) {
    const discount = await this.findByCode(code);

    const pct = Number(discount.discountPercentage);

    if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
      throw new BadRequestException('Discount percentage is invalid');
    }

    return {
      code: discount.name,
      discountId: discount._id.toString(),
      percentage: pct,
      description: discount.description ?? null,
    };
  }

  async update(id: string, dto: UpdateDiscountDto) {
    const update: UpdateDiscountDto = { ...dto };

    if (update.name) update.name = update.name.trim().toUpperCase();

    try {
      const updated = await this.discountModel.findByIdAndUpdate(id, update, {
        new: true,
        runValidators: true,
      });

      if (!updated) throw new NotFoundException('Discount not found');
      return updated;
    } catch (e) {
      if (e instanceof MongoServerError && e.code === 11000) {
        throw new BadRequestException('Discount code already exists');
      }
      throw e;
    }
  }

  async softDelete(id: string) {
    const updated = await this.discountModel.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true },
    );

    if (!updated) throw new NotFoundException('Discount not found');
    return { message: 'Discount deactivated', discount: updated };
  }
}
