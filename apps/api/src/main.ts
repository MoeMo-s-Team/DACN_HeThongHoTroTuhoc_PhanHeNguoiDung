import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { createOpenApiDocument } from './openapi';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
  const config = app.get(ConfigService);
  app.enableCors({ origin: config.getOrThrow<string>('FRONTEND_ORIGIN'), allowedHeaders: ['Content-Type', 'Authorization'] });
  if (config.get('NODE_ENV') !== 'production') {
    SwaggerModule.setup('api/v1/docs', app, createOpenApiDocument(app));
  }
  await app.listen(config.get<number>('API_PORT', 3101), '0.0.0.0');
}

void bootstrap();
