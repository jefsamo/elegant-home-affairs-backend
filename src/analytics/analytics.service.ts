/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, PipelineStage } from 'mongoose';
import { AnalyticsQueryDto } from './dto/analytics-query.dto';
import { AllTimeAnalytics, toMoneyStatV2 } from './analytics.types';
import { Order } from 'src/order/entities/order.entity';
import { TimeSeriesQueryDto } from './dto/timeseries-query.dto';
import { User } from 'src/users/schemas/user.schema';
import { TimeSeriesPoint, TimeSeriesResponse } from './timeseries.types';

function toDateOrDefault(v?: string, d?: Date) {
  if (!v) return d!;
  const dt = new Date(v);
  return isNaN(dt.getTime()) ? d! : dt;
}

function formatLabel(interval: 'day' | 'week' | 'month', dt: Date) {
  const y = dt.getUTCFullYear();
  const m = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const day = String(dt.getUTCDate()).padStart(2, '0');

  if (interval === 'day') return `${y}-${m}-${day}`;
  if (interval === 'month') return `${y}-${m}`;

  // week label (approx): ISO-week is complex; label with start date is usually enough.
  return `${y}-${m}-${day}`; // week bucket start date
}

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectModel(Order.name) private orderModel: Model<Order>,
    @InjectModel(User.name) private readonly userModel: Model<User>,
  ) {}

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

  private buildOrderMatch(
    q: TimeSeriesQueryDto,
    start: Date,
    end: Date,
  ): FilterQuery<Order> {
    const match: FilterQuery<Order> = {
      createdAt: { $gte: start, $lt: end },
    };

    if (q.paymentStatus) match.paymentStatus = q.paymentStatus;
    if (q.orderStatus) match.orderStatus = q.orderStatus;
    if (q.source) match.source = q.source;
    if (q.paymentProvider) match.paymentProvider = q.paymentProvider;

    return match;
  }

  async getTimeSeries(q: TimeSeriesQueryDto): Promise<TimeSeriesResponse> {
    const tz = q.tz || 'Europe/London';

    const end = toDateOrDefault(q.end, new Date());
    const start = toDateOrDefault(
      q.start,
      new Date(end.getTime() - 90 * 24 * 60 * 60 * 1000),
    );

    const interval = q.interval;

    const orderMatch = this.buildOrderMatch(q, start, end);

    const ordersPipeline: PipelineStage[] = [
      { $match: orderMatch },
      {
        $addFields: {
          periodStart: {
            $dateTrunc: {
              date: '$createdAt',
              unit: interval,
              timezone: tz,
            },
          },
          isPaid: { $eq: ['$paymentStatus', 'paid'] },
          hasDiscount: {
            $or: [
              { $gt: [{ $ifNull: ['$discountAmount', 0] }, 0] },
              { $ne: ['$discountCode', null] },
              { $ne: ['$discountId', null] },
            ],
          },
        },
      },
      {
        $group: {
          _id: '$periodStart',
          orders: { $sum: 1 },

          // sum of quantities across items (per order) then across orders
          itemsSold: { $sum: { $sum: '$items.quantity' } },

          discountedOrders: { $sum: { $cond: ['$hasDiscount', 1, 0] } },
          discountAmountKobo: { $sum: { $ifNull: ['$discountAmount', 0] } },

          revenueKobo: { $sum: { $cond: ['$isPaid', '$total', 0] } },
          shippingKobo: { $sum: { $cond: ['$isPaid', '$shipping', 0] } },

          refundedKobo: { $sum: { $ifNull: ['$refund.amount', 0] } },
        },
      },
      {
        $project: {
          _id: 0,
          periodStart: '$_id',
          orders: 1,
          itemsSold: 1,
          discountedOrders: 1,
          discountAmountKobo: 1,
          revenueKobo: 1,
          shippingKobo: 1,
          refundedKobo: 1,
        },
      },
      { $sort: { periodStart: 1 } },
    ];

    const usersPipeline: PipelineStage[] = [
      { $match: { createdAt: { $gte: start, $lt: end } } },
      {
        $addFields: {
          periodStart: {
            $dateTrunc: {
              date: '$createdAt',
              unit: interval,
              timezone: tz,
            },
          },
        },
      },
      { $group: { _id: '$periodStart', newUsers: { $sum: 1 } } },
      { $project: { _id: 0, periodStart: '$_id', newUsers: 1 } },
      { $sort: { periodStart: 1 } },
    ];

    const [orderRows, userRows] = await Promise.all([
      this.orderModel.aggregate(ordersPipeline).allowDiskUse(true),
      this.userModel.aggregate(usersPipeline).allowDiskUse(true),
    ]);

    // Merge by periodStart ISO key
    const map = new Map<string, Partial<TimeSeriesPoint>>();

    for (const r of orderRows) {
      const k = new Date(r.periodStart).toISOString();
      map.set(k, {
        periodStart: k,
        label: formatLabel(interval, new Date(r.periodStart)),
        orders: r.orders ?? 0,
        itemsSold: r.itemsSold ?? 0,
        discountedOrders: r.discountedOrders ?? 0,
        discountAmountKobo: r.discountAmountKobo ?? 0,
        revenueKobo: r.revenueKobo ?? 0,
        shippingKobo: r.shippingKobo ?? 0,
        refundedKobo: r.refundedKobo ?? 0,
      });
    }

    for (const r of userRows) {
      const k = new Date(r.periodStart).toISOString();
      const existing = map.get(k) ?? {
        periodStart: k,
        label: formatLabel(interval, new Date(r.periodStart)),
      };
      map.set(k, { ...existing, newUsers: r.newUsers ?? 0 });
    }

    const points: TimeSeriesPoint[] = Array.from(map.values())
      .map((p) => ({
        periodStart: p.periodStart!,
        label: p.label!,
        orders: p.orders ?? 0,
        itemsSold: p.itemsSold ?? 0,
        newUsers: p.newUsers ?? 0,
        discountedOrders: p.discountedOrders ?? 0,
        discountAmountKobo: p.discountAmountKobo ?? 0,
        revenueKobo: p.revenueKobo ?? 0,
        shippingKobo: p.shippingKobo ?? 0,
        refundedKobo: p.refundedKobo ?? 0,
        netKobo: (p.revenueKobo ?? 0) - (p.refundedKobo ?? 0),
      }))
      .sort(
        (a, b) =>
          new Date(a.periodStart).getTime() - new Date(b.periodStart).getTime(),
      );

    const totals = points.reduce(
      (acc, p) => ({
        orders: acc.orders + p.orders,
        itemsSold: acc.itemsSold + p.itemsSold,
        newUsers: acc.newUsers + p.newUsers,
        discountedOrders: acc.discountedOrders + p.discountedOrders,
        discountAmountKobo: acc.discountAmountKobo + p.discountAmountKobo,
        revenueKobo: acc.revenueKobo + p.revenueKobo,
        shippingKobo: acc.shippingKobo + p.shippingKobo,
        refundedKobo: acc.refundedKobo + p.refundedKobo,
        netKobo: acc.netKobo + p.netKobo,
      }),
      {
        orders: 0,
        itemsSold: 0,
        newUsers: 0,
        discountedOrders: 0,
        discountAmountKobo: 0,
        revenueKobo: 0,
        shippingKobo: 0,
        refundedKobo: 0,
        netKobo: 0,
      },
    );

    return {
      interval,
      tz,
      start: start.toISOString(),
      end: end.toISOString(),
      points,
      totals,
    };
  }
}
