/* eslint-disable @typescript-eslint/no-unsafe-assignment */
// src/orders/orders.service.ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Order } from './entities/order.entity';

@Injectable()
export class OrdersService {
  constructor(@InjectModel(Order.name) private orderModel: Model<Order>) {}

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
