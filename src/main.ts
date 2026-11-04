import 'reflect-metadata';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { configureApp } from './configure-app';
import { AppModule } from './app.module';
import { EnvironmentVariables } from './config/environment.validation';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const config =
    app.get<ConfigService<EnvironmentVariables, true>>(ConfigService);
  configureApp(app);
  app.enableShutdownHooks();
  await app.listen(config.get('PORT', { infer: true }), '0.0.0.0');
}

void bootstrap();
