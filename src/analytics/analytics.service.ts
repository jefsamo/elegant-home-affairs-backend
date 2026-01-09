/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, PipelineStage } from 'mongoose';
import { AnalyticsQueryDto } from './dto/analytics-query.dto';
import { AllTimeAnalytics, toMoneyStatV2 } from './analytics.types';
import { Order } from 'src/order/entities/order.entity';

@Injectable()
export class AnalyticsService {
  constructor(@InjectModel(Order.name) private orderModel: Model<Order>) {}

  private buildMatch(q: AnalyticsQueryDto): FilterQuery<Order> {
    const match: FilterQuery<Order> = {};

    if (q.paymentStatus) match.paymentStatus = q.paymentStatus;
    if (q.orderStatus) match.orderStatus = q.orderStatus;
    if (q.paymentProvider) match.paymentProvider = q.paymentProvider;
    if (q.source) match.source = q.source;

    if (q.search?.trim()) {
      const s = q.search.trim();
      match.$or = [
        { paymentReference: { $regex: s, $options: 'i' } },
        { discountCode: { $regex: s, $options: 'i' } },
      ] as any;
    }

    return match;
  }

  async getAllTime(q: AnalyticsQueryDto): Promise<AllTimeAnalytics> {
    const match = this.buildMatch(q);

    const pipeline: PipelineStage[] = [
      { $match: match },
      {
        $facet: {
          totalsAll: [
            {
              $group: {
                _id: null,
                orders: { $sum: 1 },
                itemsSold: {
                  $sum: {
                    $sum: '$items.quantity',
                  },
                },
                uniqueUsers: {
                  $addToSet: '$userId',
                },
                guestOrders: {
                  $sum: {
                    $cond: [{ $ifNull: ['$userId', false] }, 0, 1],
                  },
                },
              },
            },
            {
              $project: {
                _id: 0,
                orders: 1,
                itemsSold: 1,
                guestOrders: 1,
                uniqueUsers: {
                  $size: {
                    $setDifference: ['$uniqueUsers', [null]],
                  },
                },
              },
            },
          ],

          totalsPaidMoney: [
            { $match: { paymentStatus: 'paid' } },
            {
              $group: {
                _id: null,
                grossRevenueKobo: { $sum: '$total' },
                subtotalKobo: { $sum: '$subtotal' },
                shippingKobo: { $sum: '$shipping' },
                discountGivenKobo: {
                  $sum: { $ifNull: ['$discountAmount', 0] },
                },
                ordersPaid: { $sum: 1 },
                aovKobo: { $avg: '$total' },
              },
            },
            { $project: { _id: 0 } },
          ],

          refundedMoney: [
            { $match: { 'refund.amount': { $gt: 0 } } },
            {
              $group: {
                _id: null,
                refundedKobo: { $sum: '$refund.amount' },
              },
            },
            { $project: { _id: 0 } },
          ],

          orderStatus: [
            { $group: { _id: '$orderStatus', count: { $sum: 1 } } },
            { $project: { _id: 0, status: '$_id', count: 1 } },
            { $sort: { count: -1 } },
          ],

          paymentStatus: [
            { $group: { _id: '$paymentStatus', count: { $sum: 1 } } },
            { $project: { _id: 0, status: '$_id', count: 1 } },
            { $sort: { count: -1 } },
          ],

          paymentProvider: [
            { $group: { _id: '$paymentProvider', count: { $sum: 1 } } },
            { $project: { _id: 0, provider: '$_id', count: 1 } },
            { $sort: { count: -1 } },
          ],

          shippingMethod: [
            { $group: { _id: '$shippingMethod', count: { $sum: 1 } } },
            { $project: { _id: 0, method: '$_id', count: 1 } },
            { $sort: { count: -1 } },
          ],

          source: [
            { $group: { _id: '$source', count: { $sum: 1 } } },
            { $project: { _id: 0, source: '$_id', count: 1 } },
            { $sort: { count: -1 } },
          ],

          discountCodes: [
            { $match: { discountCode: { $ne: null } } },
            {
              $group: {
                _id: '$discountCode',
                count: { $sum: 1 },
                discountGivenKobo: {
                  $sum: { $ifNull: ['$discountAmount', 0] },
                },
              },
            },
            {
              $project: {
                _id: 0,
                code: '$_id',
                count: 1,
                discountGivenKobo: 1,
              },
            },
            { $sort: { count: -1 } },
            { $limit: 10 },
          ],

          topProducts: [
            { $unwind: '$items' },
            {
              $group: {
                _id: '$items.productId',
                units: { $sum: '$items.quantity' },
                revenueKobo: {
                  $sum: { $multiply: ['$items.price', '$items.quantity'] },
                },
              },
            },
            {
              $project: { _id: 0, productId: '$_id', units: 1, revenueKobo: 1 },
            },
          ],

          salesByMonth: [
            { $match: { paymentStatus: 'paid' } },
            {
              $group: {
                _id: {
                  y: { $year: '$createdAt' },
                  m: { $month: '$createdAt' },
                },
                revenueKobo: { $sum: '$total' },
                orders: { $sum: 1 },
              },
            },
            {
              $project: {
                _id: 0,
                month: {
                  $concat: [
                    { $toString: '$_id.y' },
                    '-',
                    {
                      $cond: [
                        { $lt: ['$_id.m', 10] },
                        { $concat: ['0', { $toString: '$_id.m' }] },
                        { $toString: '$_id.m' },
                      ],
                    },
                  ],
                },
                revenueKobo: 1,
                orders: 1,
              },
            },
            { $sort: { month: 1 } },
          ],
        },
      },
    ];

    const [res] = await this.orderModel.aggregate(pipeline).allowDiskUse(true);

    const totalsAll = res?.totalsAll?.[0] ?? {
      orders: 0,
      itemsSold: 0,
      uniqueUsers: 0,
      guestOrders: 0,
    };
    const paid = res?.totalsPaidMoney?.[0] ?? {
      grossRevenueKobo: 0,
      subtotalKobo: 0,
      shippingKobo: 0,
      discountGivenKobo: 0,
      ordersPaid: 0,
      aovKobo: 0,
    };
    const refunded = res?.refundedMoney?.[0]?.refundedKobo ?? 0;

    const topProducts = (res?.topProducts ?? []) as {
      productId: string;
      units: number;
      revenueKobo: number;
    }[];
    const productsByUnits = [...topProducts]
      .sort((a, b) => b.units - a.units)
      .slice(0, 10);
    const productsByRevenue = [...topProducts]
      .sort((a, b) => b.revenueKobo - a.revenueKobo)
      .slice(0, 10);

    return {
      totals: {
        orders: totalsAll.orders,
        itemsSold: totalsAll.itemsSold,
        uniqueUsers: totalsAll.uniqueUsers,
        guestOrders: totalsAll.guestOrders,

        grossRevenue: toMoneyStatV2(paid.grossRevenueKobo),
        subtotal: toMoneyStatV2(paid.subtotalKobo),
        shipping: toMoneyStatV2(paid.shippingKobo),
        discountGiven: toMoneyStatV2(paid.discountGivenKobo),
        refunded: toMoneyStatV2(refunded),
        aov: toMoneyStatV2(paid.aovKobo ?? 0),
      },
      breakdowns: {
        orderStatus: res?.orderStatus ?? [],
        paymentStatus: res?.paymentStatus ?? [],
        paymentProvider: res?.paymentProvider ?? [],
        shippingMethod: res?.shippingMethod ?? [],
        source: res?.source ?? [],
        discountCodes: res?.discountCodes ?? [],
      },
      top: {
        productsByUnits,
        productsByRevenue,
      },
      timeseries: {
        salesByMonth: res?.salesByMonth ?? [],
      },
    };
  }
}
