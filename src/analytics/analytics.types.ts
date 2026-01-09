export type MoneyStat = {
  kobo: number;
  naira: number;
};

export type AllTimeAnalytics = {
  totals: {
    orders: number;
    itemsSold: number;
    uniqueUsers: number;
    guestOrders: number;

    grossRevenue: MoneyStat;
    subtotal: MoneyStat;
    shipping: MoneyStat;
    discountGiven: MoneyStat;
    refunded: MoneyStat;

    aov: MoneyStat;
  };

  breakdowns: {
    orderStatus: { status: string; count: number }[];
    paymentStatus: { status: string; count: number }[];
    paymentProvider: { provider: string; count: number }[];
    shippingMethod: { method: string; count: number }[];
    source: { source: string; count: number }[];
    discountCodes: { code: string; count: number; discountGivenKobo: number }[];
  };

  top: {
    productsByUnits: {
      productId: string;
      units: number;
      revenueKobo: number;
    }[];
    productsByRevenue: {
      productId: string;
      units: number;
      revenueKobo: number;
    }[];
  };

  timeseries: {
    salesByMonth: { month: string; revenueKobo: number; orders: number }[];
  };
};

export const toMoneyStat = (kobo: number): MoneyStat => ({
  kobo,
  naira: Math.round(kobo) / 100,
});
export const toMoneyStatV2 = (kobo: number): MoneyStat => ({
  kobo,
  naira: Math.round(kobo),
});
