/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
// src/orders/orders.service.ts
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, FilterQuery, Model } from 'mongoose';
import { Order } from './entities/order.entity';
import { Product } from 'src/product/schemas/product.schema';

import { OrderQueryDto } from './dto/order-query.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';

export type PaginatedOrders = {
  items: Order[];
  totalItems: number;
  totalPages: number;
  currentPage: number;
  limit: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
};

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

  async findPaginated(args: {
    query: OrderQueryDto;
    userId?: string;
  }): Promise<PaginatedOrders> {
    const { query, userId } = args;

    const page = Number(query.page ?? 1);
    const limit = Number(query.limit ?? 10);
    const skip = (page - 1) * limit;

    const filter: FilterQuery<Order> = {};

    if (userId) filter.userId = userId as any;

    if (query.status) filter.orderStatus = query.status;

    if (query.search?.trim()) {
      const s = query.search.trim();
      filter.$or = [
        { paymentReference: { $regex: s, $options: 'i' } },
        { 'delivery.email': { $regex: s, $options: 'i' } },
        { 'delivery.phone': { $regex: s, $options: 'i' } },
        { _id: { $regex: s, $options: 'i' } as any },
      ];
    }

    const sortBy = query.sortBy?.trim() || 'createdAt';
    const sortOrder = query.sortOrder === 'asc' ? 1 : -1;
    const sortOption = { [sortBy]: sortOrder } as any;

    const [items, totalItems] = await Promise.all([
      this.orderModel
        .find(filter)
        .sort(sortOption)
        .skip(skip)
        .limit(limit)
        .exec(),
      this.orderModel.countDocuments(filter).exec(),
    ]);

    const totalPages = Math.ceil(totalItems / limit) || 1;

    return {
      items,
      totalItems,
      totalPages,
      currentPage: page,
      limit,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    };
  }

  async findById(
    orderId: string,
    currentUser: { userId: string; roles: string[] },
  ) {
    console.log(currentUser);
    const order = await this.orderModel.findById(orderId).exec();
    if (!order) throw new NotFoundException('Order not found');

    const isAdmin = currentUser.roles?.includes('admin');
    console.log(isAdmin);
    if (!isAdmin && String(order.userId) !== currentUser.userId) {
      throw new ForbiddenException('Not allowed to view this order');
    }

    return order;
  }

  /**
   * Admin updates status
   */
  async updateStatus(orderId: string, dto: UpdateOrderStatusDto) {
    const order = await this.orderModel.findById(orderId).exec();
    if (!order) throw new NotFoundException('Order not found');

    order.orderStatus = dto.orderStatus;
    await order.save();

    return order;
  }

  async cancel(orderId: string) {
    const order = await this.orderModel.findById(orderId).exec();
    if (!order) throw new NotFoundException('Order not found');

    if (['shipped', 'delivered', 'refunded'].includes(order.orderStatus)) {
      throw new BadRequestException('Order cannot be cancelled at this stage');
    }

    order.orderStatus = 'cancelled';
    await order.save();

    return order;
  }

  /**
   * Refund (admin):
   * - calls Paystack refund
   * - updates orderStatus/paymentStatus
   */
  // async refund(orderId: string) {
  //   const order = await this.orderModel.findById(orderId).exec();
  //   if (!order) throw new NotFoundException('Order not found');

  //   if (!order.paymentReference) {
  //     throw new BadRequestException('Order has no payment reference');
  //   }

  //   if (order.orderStatus === 'refunded') {
  //     throw new BadRequestException('Order already refunded');
  //   }

  //   const paid =
  //     order.paymentStatus === 'paid' || order.paymentStatus === 'success';
  //   if (!paid) throw new BadRequestException('Order is not paid');

  //   // Paystack expects transaction reference/id in "transaction" :contentReference[oaicite:2]{index=2}
  //   await this.paystackService.refundTransaction({
  //     transaction: order.paymentReference,
  //     // amount: optional for partial refund (in kobo)
  //   });

  //   order.orderStatus = 'refunded';
  //   order.paymentStatus = 'refunded';
  //   await order.save();

  //   return {
  //     status: 'success',
  //     message: 'Refund initiated',
  //     order,
  //   };
  // }
}
