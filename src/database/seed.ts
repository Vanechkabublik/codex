import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { EnvironmentVariables } from '../config/environment.validation';
import { AppModule } from '../app.module';
import { seedDemo } from './seed-demo';
async function seed(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });
  try {
    const config =
      app.get<ConfigService<EnvironmentVariables, true>>(ConfigService);
    if (
      config.get('NODE_ENV', { infer: true }) === 'production' &&
      !config.get('ALLOW_DEMO_SEED', { infer: true })
    )
      throw new Error('Production demo seed requires ALLOW_DEMO_SEED=true');
    await seedDemo(app);
    console.log(
      'Demo seed complete: six role accounts and thirteen example offers; existing data preserved.',
    );
  } finally {
    await app.close();
  }
}
void seed().catch(() => {
  console.error(
    'Seed failed. Verify configuration, migrations, demo user roles and ALLOW_DEMO_SEED for production.',
  );
  process.exitCode = 1;
});
