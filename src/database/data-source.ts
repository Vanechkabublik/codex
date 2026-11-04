import 'reflect-metadata';
import 'dotenv/config';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import {
  EnvironmentVariables,
  validateEnvironment,
} from '../config/environment.validation';
import { databaseOptions } from './database-options';

const config = new ConfigService<EnvironmentVariables, true>(
  validateEnvironment(process.env),
);
export default new DataSource(databaseOptions(config));
