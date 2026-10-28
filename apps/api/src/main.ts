import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
  const config = app.get(ConfigService);
  app.enableCors({ origin: config.getOrThrow<string>('FRONTEND_ORIGIN'), allowedHeaders: ['Content-Type', 'Authorization'] });
  if (config.get('NODE_ENV') !== 'production') {
    const swagger = new DocumentBuilder().setTitle('Self-study Support API').setVersion('1.0').build();
    SwaggerModule.setup('api/v1/docs', app, SwaggerModule.createDocument(app, swagger));
  }
  await app.listen(config.get<number>('API_PORT', 3101), '0.0.0.0');
}

void bootstrap();
