/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model } from 'mongoose';
import { OrdersHistoryQueryDto } from './dto/orders-history-query.dto';
import { Order } from 'src/order/entities/order.entity';

@Injectable()
export class OrdersAdminService {
  constructor(
    @InjectModel(Order.name) private readonly orderModel: Model<Order>,
  ) {}

  private buildFilter(q: OrdersHistoryQueryDto): FilterQuery<Order> {
    const filter: FilterQuery<Order> = {};

    if (q.orderStatus) filter.orderStatus = q.orderStatus;
    if (q.paymentStatus) filter.paymentStatus = q.paymentStatus;
    if (q.source) filter.source = q.source;
    if (q.paymentProvider) filter.paymentProvider = q.paymentProvider;

    if (q.search?.trim()) {
      const s = q.search.trim();
      filter.$or = [
        { paymentReference: { $regex: s, $options: 'i' } },
        { discountCode: { $regex: s, $options: 'i' } },
      ] as any;
    }

    return filter;
  }

  async findAllTime(q: OrdersHistoryQueryDto) {
    const page = Number(q.page ?? 1);
    const limit = Math.min(Number(q.limit ?? 20), 100);
    const skip = (page - 1) * limit;

    const filter = this.buildFilter(q);

    const [items, total] = await Promise.all([
      this.orderModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.orderModel.countDocuments(filter),
    ]);

    return {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
      items,
    };
  }
}
