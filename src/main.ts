/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as bodyParser from 'body-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(
    bodyParser.json({
      verify: (req: any, _res, buf: Buffer) => {
        req.rawBody = buf;
      },
    }),
  );
  app.setGlobalPrefix('api/v1');
  const port = process.env.PORT || 3000;
  app.enableCors({
    // origin: 'https://finnybank-fe.vercel.app',
    origin: [
      // 'https://finnybank-fe.vercel.app', // production FE
      'http://localhost:5173', // local dev (no trailing slash)
      'http://172.16.50.30:5173', // local dev (no trailing slash)
      'https://elegant-home-affairs-frontend.vercel.app',
      'https://www.eleganthomeaffairs.com',
      'https://eleganthomeaffairs.com',
    ],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type, Authorization',
    credentials: true,
  });
  await app.listen(process.env.PORT ?? 3000);
  console.log(`Backend running on http://localhost:${port}`);
}
bootstrap();
