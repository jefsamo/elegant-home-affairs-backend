export class AdminInitPaystackDto {
  customerEmail: string;

  items: { productId: string; quantity: number }[];

  deliveryMode: 'ship' | 'pickup';
  delivery: any;

  shippingKobo: number;
  shippingLabel?: string;

  discountCode?: string;

  adminNote?: string;
}
