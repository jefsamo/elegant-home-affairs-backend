/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Order } from './entities/order.entity';
import { User } from 'src/users/schemas/user.schema';
import {
  addDays,
  fmtDayLabel,
  fmtISODate,
  startOfDay,
} from 'src/common/utils/helpers';

@Injectable()
export class DashboardService {
  constructor(
    @InjectModel(Order.name) private readonly orderModel: Model<Order>,
    @InjectModel(User.name) private readonly userModel: Model<User>,
  ) {}

  async getOverview() {
    const now = new Date();

    const start7d = startOfDay(addDays(now, -6));
    const endTomorrow = startOfDay(addDays(now, 1));

    const prevStart7d = startOfDay(addDays(start7d, -7));
    const prevEnd7d = startOfDay(start7d);

    const start30d = startOfDay(addDays(now, -29));
    const end30d = endTomorrow;

    const revenueMatch = {
      createdAt: { $gte: start7d, $lt: endTomorrow },
      paymentStatus: 'paid', // adjust to your schema
    };

    const prevRevenueMatch = {
      createdAt: { $gte: prevStart7d, $lt: prevEnd7d },
      paymentStatus: 'paid',
    };

    const dailyAgg = await this.orderModel.aggregate([
      {
        $match: {
          createdAt: { $gte: start7d, $lt: endTomorrow },
        },
      },
      {
        $group: {
          _id: {
            y: { $year: '$createdAt' },
            m: { $month: '$createdAt' },
            d: { $dayOfMonth: '$createdAt' },
          },
          orders: { $sum: 1 },
          revenue: {
            $sum: {
              $cond: [
                { $eq: ['$paymentStatus', 'paid'] },
                '$total', // adjust field name
                0,
              ],
            },
          },
        },
      },
      { $sort: { '_id.y': 1, '_id.m': 1, '_id.d': 1 } },
    ]);

    const series: any[] = [];
    const index = new Map<string, { revenue: number; orders: number }>();

    for (const row of dailyAgg) {
      const { y, m, d } = row._id;
      // build a date key
      const dt = new Date(Date.UTC(y, m - 1, d));
      const key = fmtISODate(dt);
      index.set(key, { revenue: row.revenue ?? 0, orders: row.orders ?? 0 });
    }

    for (let i = 0; i < 7; i++) {
      const dt = addDays(start7d, i);
      const key = fmtISODate(dt);
      const v = index.get(key) ?? { revenue: 0, orders: 0 };

      series.push({
        date: fmtDayLabel(dt),
        revenue: v.revenue,
        orders: v.orders,
      });
    }

    const totals7d = await this.orderModel.aggregate([
      { $match: { createdAt: { $gte: start7d, $lt: endTomorrow } } },
      {
        $group: {
          _id: null,
          totalOrders7d: { $sum: 1 },
          totalRevenue7d: {
            $sum: {
              $cond: [{ $eq: ['$paymentStatus', 'paid'] }, '$total', 0],
            },
          },
        },
      },
    ]);

    const totalOrders7d = totals7d[0]?.totalOrders7d ?? 0;
    const totalRevenue7d = totals7d[0]?.totalRevenue7d ?? 0;

    const prevTotals7d = await this.orderModel.aggregate([
      { $match: prevRevenueMatch },
      {
        $group: {
          _id: null,
          totalRevenuePrev7d: { $sum: '$total' },
        },
      },
    ]);

    const totalRevenuePrev7d = prevTotals7d[0]?.totalRevenuePrev7d ?? 0;
    const revenueChangePct7d =
      totalRevenuePrev7d === 0
        ? totalRevenue7d > 0
          ? 100
          : 0
        : ((totalRevenue7d - totalRevenuePrev7d) / totalRevenuePrev7d) * 100;

    const pendingOrders = await this.orderModel.countDocuments({
      orderStatus: 'pending',
    });

    const activeCustomersAgg = await this.orderModel.aggregate([
      {
        $match: {
          createdAt: { $gte: start30d, $lt: end30d },
        },
      },
      { $group: { _id: '$userId' } },
      { $count: 'count' },
    ]);
    const activeCustomers30d = activeCustomersAgg[0]?.count ?? 0;

    const refundsAgg = await this.orderModel.aggregate([
      {
        $match: {
          refundedAt: { $gte: start30d, $lt: end30d },
          refundStatus: { $in: ['in_review', 'approved', 'rejected', 'paid'] },
        },
      },
      {
        $group: {
          _id: '$refundStatus',
          count: { $sum: 1 },
        },
      },
    ]);

    const refunds30d = refundsAgg.reduce((acc, r) => acc + r.count, 0);
    const refundsInReview30d =
      refundsAgg.find((r) => r._id === 'in_review')?.count ?? 0;

    return {
      summary: {
        totalRevenue7d,
        revenueChangePct7d: Math.round(revenueChangePct7d),
        totalOrders7d,
        pendingOrders,
        activeCustomers30d,
        refunds30d,
        refundsInReview30d,
      },
      daily: series,
    };
  }

  async getOverviewV2() {
    const now = new Date();

    // ✅ Daily window: today only
    const startToday = startOfDay(now);
    const startTomorrow = startOfDay(addDays(now, 1));

    // ✅ Previous day window: yesterday only (for % change)
    const startYesterday = startOfDay(addDays(now, -1));
    const startToday2 = startToday;

    // 1) Hourly series for today (recommended for "daily stats" dashboards)
    //    If you truly want a single number only, you can skip this.
    const hourlyAgg = await this.orderModel.aggregate([
      {
        $match: {
          createdAt: { $gte: startToday, $lt: startTomorrow },
        },
      },
      {
        $group: {
          _id: { h: { $hour: '$createdAt' } },
          orders: { $sum: 1 },
          revenue: {
            $sum: {
              $cond: [{ $eq: ['$paymentStatus', 'paid'] }, '$total', 0],
            },
          },
        },
      },
      { $sort: { '_id.h': 1 } },
    ]);

    const hourIndex = new Map<number, { revenue: number; orders: number }>();
    for (const row of hourlyAgg) {
      hourIndex.set(row._id.h, {
        revenue: row.revenue ?? 0,
        orders: row.orders ?? 0,
      });
    }

    const series: any[] = [];
    for (let h = 0; h < 24; h++) {
      const v = hourIndex.get(h) ?? { revenue: 0, orders: 0 };
      series.push({
        hour: `${String(h).padStart(2, '0')}:00`,
        revenue: v.revenue,
        orders: v.orders,
      });
    }

    // 2) Totals for TODAY
    const totalsTodayAgg = await this.orderModel.aggregate([
      { $match: { createdAt: { $gte: startToday, $lt: startTomorrow } } },
      {
        $group: {
          _id: null,
          totalOrdersToday: { $sum: 1 },
          totalRevenueToday: {
            $sum: {
              $cond: [{ $eq: ['$paymentStatus', 'paid'] }, '$total', 0],
            },
          },
        },
      },
    ]);

    const totalOrdersToday = totalsTodayAgg[0]?.totalOrdersToday ?? 0;
    const totalRevenueToday = totalsTodayAgg[0]?.totalRevenueToday ?? 0;

    // 3) Totals for YESTERDAY (for daily % change)
    const totalsYesterdayAgg = await this.orderModel.aggregate([
      {
        $match: {
          createdAt: { $gte: startYesterday, $lt: startToday2 },
          paymentStatus: 'paid',
        },
      },
      {
        $group: {
          _id: null,
          totalRevenueYesterday: { $sum: '$total' },
        },
      },
    ]);

    const totalRevenueYesterday =
      totalsYesterdayAgg[0]?.totalRevenueYesterday ?? 0;

    const revenueChangePctToday =
      totalRevenueYesterday === 0
        ? totalRevenueToday > 0
          ? 100
          : 0
        : ((totalRevenueToday - totalRevenueYesterday) /
            totalRevenueYesterday) *
          100;

    // 4) Pending orders (choose scope)
    // If you mean "pending right now" (all-time pending), keep as-is.
    // If you mean "pending created today", add createdAt filter.
    const pendingOrders = await this.orderModel.countDocuments({
      orderStatus: 'processing',
      createdAt: { $gte: startToday, $lt: startTomorrow },
    });

    // 5) Active customers TODAY (not 30d)
    const activeCustomersAgg = await this.orderModel.aggregate([
      { $match: { createdAt: { $gte: startToday, $lt: startTomorrow } } },
      { $group: { _id: '$userId' } },
      { $count: 'count' },
    ]);
    const activeCustomersToday = activeCustomersAgg[0]?.count ?? 0;

    // 6) Refunds TODAY (not 30d)
    const refundsAgg = await this.orderModel.aggregate([
      {
        $match: {
          refundedAt: { $gte: startToday, $lt: startTomorrow },
          refundStatus: { $in: ['in_review', 'approved', 'rejected', 'paid'] },
        },
      },
      {
        $group: {
          _id: '$refundStatus',
          count: { $sum: 1 },
        },
      },
    ]);

    const refundsToday = refundsAgg.reduce((acc, r) => acc + (r.count ?? 0), 0);
    const refundsInReviewToday =
      refundsAgg.find((r) => r._id === 'in_review')?.count ?? 0;

    return {
      summary: {
        totalRevenueToday,
        revenueChangePctToday: Math.round(revenueChangePctToday),
        totalOrdersToday,
        pendingOrders,
        activeCustomersToday,
        refundsToday,
        refundsInReviewToday,
      },
      // hourly breakdown for today (resets daily)
      hourly: series,
    };
  }
}
