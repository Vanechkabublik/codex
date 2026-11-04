import 'reflect-metadata';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  EnvironmentVariables,
  validateEnvironment,
} from '../../src/config/environment.validation';
import { TokenService } from '../../src/modules/auth/token.service';

void test('JWT validation isolates access/refresh and checks expiry, issuer, audience and signature', async () => {
  const environment = validateEnvironment({
    DB_HOST: 'localhost',
    DB_USERNAME: 'test',
    DB_PASSWORD: 'test',
    DB_DATABASE: 'test',
    JWT_ACCESS_SECRET: 'a'.repeat(40),
    JWT_REFRESH_SECRET: 'b'.repeat(40),
  });
  const jwt = new JwtService();
  const service = new TokenService(
    jwt,
    new ConfigService<EnvironmentVariables, true>(environment),
  );
  const userId = randomUUID();
  const sessionId = randomUUID();
  const pair = await service.issue(userId, sessionId);
  assert.deepEqual(await service.verify(pair.accessToken, 'access'), {
    sub: userId,
    sid: sessionId,
    kind: 'access',
  });
  await assert.rejects(
    service.verify(pair.refreshToken, 'access'),
    UnauthorizedException,
  );
  await assert.rejects(
    service.verify(pair.accessToken, 'refresh'),
    UnauthorizedException,
  );
  for (const override of [
    { expiresIn: -1 },
    { issuer: 'wrong-issuer' },
    { audience: 'wrong-audience' },
    { secret: 'wrong-secret' },
    { algorithm: 'HS384' as const },
  ]) {
    const invalid = await jwt.signAsync(
      { sub: userId, sid: sessionId, kind: 'access' },
      {
        secret: environment.JWT_ACCESS_SECRET,
        issuer: 'cashback-api',
        audience: 'access',
        expiresIn: 900,
        ...override,
      },
    );
    await assert.rejects(
      service.verify(invalid, 'access'),
      UnauthorizedException,
    );
  }
});
