/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
// src/products/combo.service.ts
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Product } from './schemas/product.schema';
import { CreateComboDto } from './dto/create-combo.dto';

@Injectable()
export class ComboService {
  constructor(
    @InjectModel(Product.name) private productModel: Model<Product>,
  ) {}

  async createCombo(dto: CreateComboDto) {
    // Ensure component products exist and are "single"
    const ids = dto.components.map((c) => new Types.ObjectId(c.productId));
    const products = await this.productModel.find({ _id: { $in: ids } });

    if (products.length !== ids.length) {
      throw new BadRequestException('One or more component products not found');
    }

    const anyComboInside = products.some((p: any) => p.kind === 'combo');
    if (anyComboInside) {
      throw new BadRequestException(
        'Combo cannot contain another combo (optional rule)',
      );
    }

    return this.productModel.create({
      name: dto.name,
      description: dto.description,
      price: dto.price,
      images: dto.images ?? [],
      kind: 'combo',
      components: dto.components.map((c) => ({
        productId: new Types.ObjectId(c.productId),
        quantity: c.quantity,
      })),
      stock: 0, // derived
    });
  }

  async listCombos() {
    return this.productModel
      .find({ kind: 'combo' })
      .populate('components.productId', 'name price images stock')
      .sort({ createdAt: -1 });
  }

  async getCombo(id: string) {
    const combo = await this.productModel
      .findOne({ _id: id, kind: 'combo' })
      .populate('components.productId', 'name price images stock');

    if (!combo) throw new NotFoundException('Combo not found');
    return combo;
  }

  /**
   * Compute how many combos can be fulfilled based on component stocks.
   * Example: combo needs 2 plates, 1 pot.
   * If plates stock=10, pot stock=3 => combosAvailable=min(10/2, 3/1)=3
   */
  async getComboAvailability(comboId: string) {
    const combo: any = await this.productModel
      .findById(comboId)
      .populate('components.productId', 'stock');

    if (!combo || combo.kind !== 'combo') {
      throw new NotFoundException('Combo not found');
    }

    if (!combo.components?.length) return { combosAvailable: 0 };

    const possibleCounts = combo.components.map((c: any) => {
      const stock = c.productId?.stock ?? 0;
      const needed = c.quantity ?? 1;
      return Math.floor(stock / needed);
    });

    return { combosAvailable: Math.min(...possibleCounts) };
  }
}
