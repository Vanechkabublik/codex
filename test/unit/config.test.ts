import 'reflect-metadata';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateEnvironment } from '../../src/config/environment.validation';
void test('configuration validates secrets, ports and SSL without echoing secret values', () => {
  const base = {
    DB_HOST: 'localhost',
    DB_USERNAME: 'user',
    DB_PASSWORD: 'secret',
    DB_DATABASE: 'db',
    JWT_ACCESS_SECRET: 'a'.repeat(40),
    JWT_REFRESH_SECRET: 'b'.repeat(40),
  };
  assert.equal(validateEnvironment({ ...base, DB_SSL: 'false' }).DB_SSL, false);
  assert.equal(validateEnvironment({ ...base, DB_SSL: 'true' }).DB_SSL, true);
  for (const input of [
    { PORT: '0' },
    { DB_SSL: 'yes' },
    { JWT_ACCESS_SECRET: 'short' },
    { JWT_REFRESH_SECRET: base.JWT_ACCESS_SECRET },
  ])
    assert.throws(() => validateEnvironment({ ...base, ...input }));
});
