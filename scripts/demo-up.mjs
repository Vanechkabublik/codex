import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';
import { demoSettings, runDemoFlow } from './demo-flow.mjs';
const root = fileURLToPath(new URL('../', import.meta.url));
function docker(...args) {
  const result = spawnSync('docker', ['compose', ...args], {
    cwd: root,
    stdio: 'inherit',
  });
  if (result.error || result.status !== 0)
    throw new Error('Docker Compose command failed');
}
async function main() {
  const example = await readFile(resolve(root, '.env.example'), 'utf8');
  const prepared = example
    .replace(
      /^JWT_ACCESS_SECRET=.*$/m,
      'JWT_ACCESS_SECRET=' + randomBytes(48).toString('hex'),
    )
    .replace(
      /^JWT_REFRESH_SECRET=.*$/m,
      'JWT_REFRESH_SECRET=' + randomBytes(48).toString('hex'),
    );
  try {
    await writeFile(resolve(root, '.env'), prepared, { flag: 'wx' });
    console.log('Created .env with local demo settings and random JWT keys');
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
    console.log('Preserving existing .env and existing data');
  }
  console.log('[1/6] Validate Compose configuration');
  docker('config', '--quiet');
  console.log('[2/6] Build backend image');
  docker('build', 'backend');
  console.log('[3/6] Start PostgreSQL and wait for readiness');
  docker('up', '-d', '--wait', '--wait-timeout', '60', 'postgres');
  console.log('[4/6] Apply migrations, then safely repeat demo seed');
  docker('run', '--rm', 'backend', 'npm', 'run', 'migration:run:prod');
  docker('run', '--rm', 'backend', 'npm', 'run', 'migration:check:prod');
  docker(
    'run',
    '--rm',
    '-e',
    'ALLOW_DEMO_SEED=true',
    'backend',
    'npm',
    'run',
    'seed:prod',
  );
  console.log('[5/6] Start backend and wait for readiness');
  docker('up', '-d', '--wait', '--wait-timeout', '60', 'backend');
  console.log('[6/6] Verify complete business flow over real HTTP');
  await runDemoFlow();
  const { baseUrl } = await demoSettings();
  console.log('Demo ready: ' + baseUrl + '/api/docs');
}
main().catch(() => {
  console.error(
    'Demo preparation failed; no data was deleted. Check the failed step, Docker and port availability.',
  );
  process.exitCode = 1;
});
