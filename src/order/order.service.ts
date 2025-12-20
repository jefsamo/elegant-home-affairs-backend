/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
// src/orders/orders.service.ts
import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model } from 'mongoose';
import { Order } from './entities/order.entity';
import { Product } from 'src/product/schemas/product.schema';

@Injectable()
export class OrdersService {
  constructor(
    @InjectModel(Order.name) private orderModel: Model<Order>,
    @InjectModel(Product.name) private productModel: Model<Product>,
    @InjectConnection() private connection: Connection,
  ) {}

  private async decrementStockForOrderItems(
    items: { productId: string; quantity: number }[],
    session: any,
  ) {
    for (const item of items) {
      const prod: any = await this.productModel
        .findById(item.productId)
        .session(session);

      if (!prod)
        throw new BadRequestException(`Product not found: ${item.productId}`);

      if (prod.kind === 'single') {
        // deduct directly
        const ok = await this.productModel.updateOne(
          { _id: prod._id, stock: { $gte: item.quantity } },
          { $inc: { stock: -item.quantity } },
          { session },
        );
        if (ok.modifiedCount !== 1) {
          throw new BadRequestException(`Insufficient stock for ${prod.name}`);
        }
      }

      if (prod.kind === 'combo') {
        // load components and deduct from each component product stock
        if (!prod.components?.length) {
          throw new BadRequestException(
            `Combo has no components: ${prod.name}`,
          );
        }

        for (const c of prod.components) {
          const needed = (c.quantity ?? 1) * item.quantity;

          const ok = await this.productModel.updateOne(
            { _id: c.productId, stock: { $gte: needed } },
            { $inc: { stock: -needed } },
            { session },
          );

          if (ok.modifiedCount !== 1) {
            throw new BadRequestException(
              `Insufficient stock for combo component`,
            );
          }
        }
      }
    }
  }
  async createFromPayment(args: {
    userId: string;
    reference: string;
    amount: number;
    cart: { productId: string; quantity: number; price: number }[];
    delivery: any;
    discount?: { discountId: string; code: string; percentage: number } | null;
  }) {
    const subtotal = args.cart.reduce(
      (sum, i) => sum + i.price * i.quantity,
      0,
    );

    const shipping = subtotal === 0 ? 0 : 499;

    const discountPct = args.discount?.percentage ?? 0;

    const discountAmount = Math.round((subtotal * discountPct) / 100);

    const total = Math.max(subtotal + shipping - discountAmount, 0);
    const totalAfterDiscount = total - discountAmount;
    const totalAndDiscountPlusShipping = total + shipping - discountAmount;

    const payload = {
      userId: args.userId,
      items: args.cart,
      subtotal,
      shipping,
      discountId: args.discount?.discountId ?? null,
      discountCode: args.discount?.code ?? null,
      discountPercentage: discountPct,
      discountAmount,
      totalAfterDiscount,
      totalAndDiscountPlusShipping,
      total,
      paymentReference: args.reference,
      paymentStatus: 'paid' as const,
      delivery: args.delivery,
    };

    if (total !== args.amount) {
      return this.orderModel.create({
        ...payload,
        orderStatus: 'needs_review',
      });
    }

    return this.orderModel.create({
      ...payload,
      orderStatus: 'processing',
    });
  }
}
