// src/admin-reporting/types/timeseries.types.ts
export type TimeSeriesPoint = {
  periodStart: string; // ISO string
  label: string; // e.g. 2026-01-09 or 2026-W02 or 2026-01
  orders: number;
  itemsSold: number;

  newUsers: number;

  discountedOrders: number;
  discountAmountKobo: number;

  revenueKobo: number; // sum(total) paid
  shippingKobo: number; // sum(shipping) paid
  refundedKobo: number; // sum(refund.amount)
  netKobo: number; // revenue - refunded
};

export type TimeSeriesResponse = {
  interval: 'day' | 'week' | 'month';
  tz: string;
  start: string;
  end: string;
  points: TimeSeriesPoint[];
  totals: Omit<TimeSeriesPoint, 'periodStart' | 'label'>;
};
