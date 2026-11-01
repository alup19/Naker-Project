import 'reflect-metadata';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { existsSync } from 'fs';
// Em modo watch o código pode rodar de src/ ou dist/. Localiza o .env da raiz nos dois casos.
const envPath = [
  path.resolve(__dirname, '../../.env'),
  path.resolve(__dirname, '../../../.env'),
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), '../../.env'),
].find((candidate) => existsSync(candidate));
if (envPath) dotenv.config({ path: envPath, override: true });
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import express from 'express';
import { AppModule } from './modules';
function isPrivateDevelopmentOrigin(origin?: string) {
  if (!origin) return true;
  try {
    const url = new URL(origin);
    if (url.protocol !== 'http:' || url.port !== '3000') return false;
    const host = url.hostname;
    if (host === 'localhost' || host === '127.0.0.1') return true;
    const octets = host.split('.').map(Number);
    if (octets.length !== 4 || octets.some(n => !Number.isInteger(n) || n < 0 || n > 255)) return false;
    return octets[0] === 10 ||
      (octets[0] === 192 && octets[1] === 168) ||
      (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31);
  } catch { return false; }
}
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(helmet());
  app.use(cookieParser());
  app.use('/uploads', express.static(path.resolve(process.env.UPLOAD_DIR || 'uploads')));
  const configuredOrigin = process.env.WEB_ORIGIN || 'http://localhost:3000';
  app.enableCors({ origin: (origin, callback) => {
    const allowed = !origin || origin === configuredOrigin ||
      (process.env.NODE_ENV !== 'production' && isPrivateDevelopmentOrigin(origin));
    callback(null, allowed);
  }, credentials: true });
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
  const swagger = new DocumentBuilder().setTitle('Naker Distribuidor API').setDescription('API de catálogo e pedidos').setVersion('1.0').addBearerAuth().build();
  SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, swagger));
  await app.listen(4000);
}
bootstrap();
