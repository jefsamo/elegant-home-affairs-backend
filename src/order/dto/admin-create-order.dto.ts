export class AdminCreateOrderDto {
  userId?: string;

  customerEmail: string;

  items: { productId: string; quantity: number }[];

  // shipping + delivery details
  deliveryMode: 'ship' | 'pickup';
  delivery: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    address1?: string;
    address2?: string;
    city?: string;
    stateCode: string;
    country: string;
    instructions?: string;
    whatsappNumber?: string;
  };

  // shipping (kobo)
  shippingKobo: number;
  shippingLabel?: string;

  // optional discount (admin can apply)
  discountCode?: string;

  // payment handling
  paymentStatus: 'paid' | 'unpaid'; // admin decides
  paymentProvider: 'manual' | 'paystack';
  adminNote?: string;
}
