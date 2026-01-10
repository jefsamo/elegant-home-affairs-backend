/* eslint-disable @typescript-eslint/no-unsafe-return */
import * as React from 'react';
import {
  Button,
  Container,
  Hr,
  Heading,
  Link,
  Text,
} from '@react-email/components';

export function ResetPasswordEmail(props: {
  firstName?: string;
  resetUrl: string;
}) {
  const { firstName, resetUrl } = props;

  return (
    <Container style={{ fontFamily: 'Arial, sans-serif', padding: '24px' }}>
      <Heading style={{ margin: 0 }}>Reset your password</Heading>
      <Text>Hello{firstName ? ` ${firstName}` : ''},</Text>
      <Text>
        We received a request to reset your password. Click the button below to
        set a new one.
      </Text>

      <Button
        href={resetUrl}
        style={{
          display: 'inline-block',
          padding: '12px 16px',
          borderRadius: '10px',
          textDecoration: 'none',
          backgroundColor: '#111',
          color: '#fff',
          fontWeight: 600,
        }}
      >
        Reset password
      </Button>

      <Text style={{ marginTop: 16, fontSize: 12, color: '#555' }}>
        If the button doesn’t work, copy and paste this link:
      </Text>
      <Link href={resetUrl} style={{ fontSize: 12 }}>
        {resetUrl}
      </Link>

      <Hr style={{ margin: '24px 0' }} />
      <Text style={{ fontSize: 12, color: '#777' }}>
        If you didn’t request this, you can ignore this email.
      </Text>
    </Container>
  );
}
