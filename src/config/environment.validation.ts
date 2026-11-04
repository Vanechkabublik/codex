import { plainToInstance, Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
  validateSync,
} from 'class-validator';

export class EnvironmentVariables {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  SEED_DEMO_PASSWORD?: string;

  @Transform(({ value }: { value: unknown }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  ALLOW_DEMO_SEED = false;

  @IsString()
  @MinLength(32)
  JWT_ACCESS_SECRET!: string;

  @IsString()
  @MinLength(32)
  JWT_REFRESH_SECRET!: string;

  @Type(() => Number)
  @IsInt()
  @Min(60)
  @Max(86400)
  JWT_ACCESS_TTL_SECONDS = 900;

  @Type(() => Number)
  @IsInt()
  @Min(300)
  @Max(2592000)
  JWT_REFRESH_TTL_SECONDS = 604800;

  @IsString()
  CORS_ORIGIN = 'http://localhost:5173';

  @IsIn(['development', 'test', 'production'])
  NODE_ENV = 'development';

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(65535)
  PORT = 3000;

  @IsString()
  @IsNotEmpty()
  DB_HOST!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(65535)
  DB_PORT = 5432;

  @IsString()
  @IsNotEmpty()
  DB_USERNAME!: string;

  @IsString()
  @IsNotEmpty()
  DB_PASSWORD!: string;

  @IsString()
  @IsNotEmpty()
  DB_DATABASE!: string;

  @Transform(({ value }: { value: unknown }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  DB_SSL = false;
}

export function validateEnvironment(
  input: Record<string, unknown>,
): EnvironmentVariables {
  const environment = plainToInstance(EnvironmentVariables, input);
  const errors = validateSync(environment, {
    skipMissingProperties: false,
    validationError: { target: false, value: false },
  });
  if (errors.length > 0) {
    throw new Error(
      `Invalid environment configuration: ${errors.map((error) => error.property).join(', ')}`,
    );
  }
  if (environment.JWT_ACCESS_SECRET === environment.JWT_REFRESH_SECRET) {
    throw new Error('JWT access and refresh secrets must differ');
  }
  return environment;
}
