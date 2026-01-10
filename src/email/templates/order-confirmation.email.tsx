/* eslint-disable @typescript-eslint/no-unsafe-return */
import * as React from 'react';
import { Container, Heading, Hr, Text } from '@react-email/components';

// function money(nairaKobo: number) {
//   const naira = nairaKobo ?? 0;
//   return `₦${naira.toFixed(2)}`;
// }

export const formatMoneyKoboToNaira = (amountKobo?: number) => {
  if (amountKobo == null) return '—';
  // const naira = amountKobo / 100;
  const naira = amountKobo;
  return `₦${naira.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};
export function OrderConfirmationEmail(props: {
  firstName?: string;
  order: {
    id: string;
    paymentReference: string;
    createdAt?: Date;
    items: {
      productName?: string;
      productId: string;
      quantity: number;
      priceKobo: number;
    }[];
    subtotalKobo: number;
    shippingKobo: number;
    totalKobo: number;
    discountKobo?: number;
    deliverySummary?: string;
  };
}) {
  const { firstName, order } = props;

  return (
    <Container style={{ fontFamily: 'Arial, sans-serif', padding: '24px' }}>
      <Heading style={{ margin: 0 }}>Order confirmed</Heading>
      <Text>
        Hi{firstName ? ` ${firstName}` : ''}, your order has been confirmed.
      </Text>

      <Text style={{ fontSize: 13, color: '#555' }}>
        Reference: <b>{order.paymentReference}</b>
        <br />
        Date: {new Date(order?.createdAt as unknown as string).toLocaleString()}
      </Text>

      <Hr style={{ margin: '18px 0' }} />

      <Heading as="h3" style={{ margin: '0 0 8px 0', fontSize: 16 }}>
        Items
      </Heading>

      {order.items.map((product, index) => {
        const { productId, productName, quantity, priceKobo } = product;
        <Text
          key={`${product.productId}-${index}`}
          style={{ margin: '6px 0', fontSize: 13 }}
        >
          <b>{productName ?? productId}</b> × {quantity} —{' '}
          {formatMoneyKoboToNaira(priceKobo * quantity)}
        </Text>;
      })}

      <Hr style={{ margin: '18px 0' }} />

      <Text style={{ fontSize: 13 }}>
        Subtotal: <b>{formatMoneyKoboToNaira(order.subtotalKobo)}</b>
        <br />
        Shipping: <b>{formatMoneyKoboToNaira(order.shippingKobo)}</b>
        <br />
        Discount: <b>{formatMoneyKoboToNaira(order.discountKobo ?? 0)}</b>
        <br />
        Total: <b>{formatMoneyKoboToNaira(order.totalKobo)}</b>
      </Text>

      {order.deliverySummary ? (
        <>
          <Hr style={{ margin: '18px 0' }} />
          <Heading as="h3" style={{ margin: '0 0 8px 0', fontSize: 16 }}>
            Delivery
          </Heading>
          <Text style={{ fontSize: 13, color: '#555' }}>
            {order.deliverySummary}
          </Text>
        </>
      ) : null}

      <Hr style={{ margin: '18px 0' }} />
      <Text style={{ fontSize: 12, color: '#777' }}>
        Thank you for shopping with us.
      </Text>
    </Container>
  );
}
