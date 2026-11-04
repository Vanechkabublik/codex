import { ConfigService } from '@nestjs/config';
import { join } from 'node:path';
import { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';
import { EnvironmentVariables } from '../config/environment.validation';

export function databaseOptions(
  config: ConfigService<EnvironmentVariables, true>,
): PostgresConnectionOptions {
  return {
    type: 'postgres',
    host: config.get('DB_HOST', { infer: true }),
    port: config.get('DB_PORT', { infer: true }),
    username: config.get('DB_USERNAME', { infer: true }),
    password: config.get('DB_PASSWORD', { infer: true }),
    database: config.get('DB_DATABASE', { infer: true }),
    ssl: config.get('DB_SSL', { infer: true })
      ? { rejectUnauthorized: true }
      : false,
    entities: [join(__dirname, '..', '**', '*.entity.{ts,js}')],
    migrations: [join(__dirname, 'migrations', '*.{ts,js}')],
    migrationsTableName: 'typeorm_migrations',
    migrationsRun: false,
    synchronize: false,
    logging: false,
  };
}
