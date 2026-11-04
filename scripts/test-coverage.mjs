import { spawnSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';
const root = fileURLToPath(new URL('../', import.meta.url));
const directory = resolve(root, 'coverage');
const escape = (value) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('"', '&quot;');
async function main() {
  await mkdir(directory, { recursive: true });
  const args = [
    '--test',
    '--test-concurrency=1',
    '--experimental-test-coverage',
    '--test-coverage-include=**/src/modules/**/*.service.js',
    '--test-coverage-include=**/src/modules/**/*.policy.js',
    '--test-coverage-include=**/src/common/guards/*.js',
    '--test-coverage-include=**/src/modules/**/strategies/*.js',
    '--test-reporter=spec',
    '--test-reporter-destination=stdout',
    '--test-reporter=lcov',
    '--test-reporter-destination=coverage/lcov.info',
    '.test-dist/test/unit/*.test.js',
    '.test-dist/test/e2e/*.test.js',
  ];
  const result = spawnSync(process.execPath, args, {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 5 * 1024 * 1024,
  });
  process.stdout.write(result.stdout ?? '');
  process.stderr.write(result.stderr ?? '');
  await writeFile(
    resolve(directory, 'test-results.txt'),
    (result.stdout ?? '') + (result.stderr ?? ''),
  );
  if (result.error || result.status !== 0)
    throw new Error('Business tests failed');
  const lcov = await readFile(resolve(directory, 'lcov.info'), 'utf8');
  const files = lcov
    .split('end_of_record')
    .filter((record) => record.includes('SF:'))
    .map((record) => {
      const fields = new Map(
        record
          .trim()
          .split(/\r?\n/)
          .map((line) => {
            const separator = line.indexOf(':');
            return [line.slice(0, separator), line.slice(separator + 1)];
          }),
      );
      const count = (key) => Number(fields.get(key) ?? 0);
      return {
        file: fields.get('SF'),
        lines: [count('LH'), count('LF')],
        functions: [count('FNH'), count('FNF')],
        branches: [count('BRH'), count('BRF')],
      };
    });
  if (!files.length)
    throw new Error('Coverage report contains no business files');
  const ratio = ([hit, total]) =>
    total
      ? ((100 * hit) / total).toFixed(1) + '% (' + hit + '/' + total + ')'
      : 'n/a';
  const rows = files
    .map(
      (item) =>
        '<tr><td>' +
        escape(item.file) +
        '</td><td>' +
        ratio(item.lines) +
        '</td><td>' +
        ratio(item.functions) +
        '</td><td>' +
        ratio(item.branches) +
        '</td></tr>',
    )
    .join('\n');
  await writeFile(
    resolve(directory, 'summary.json'),
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        scope:
          'V8 coverage of executed business JavaScript compiled from TypeScript; no threshold',
        files,
      },
      null,
      2,
    ) + '\n',
  );
  await writeFile(
    resolve(directory, 'index.html'),
    '<!doctype html><html lang="ru"><meta charset="utf-8"><title>Business coverage</title><style>body{font:16px system-ui;margin:40px;max-width:1200px}table{border-collapse:collapse;font-size:14px}td,th{border:1px solid #bbb;padding:8px;text-align:left}td:first-child{font-family:monospace}</style><h1>Business logic coverage</h1><p>Unit + real PostgreSQL e2e. Scope: policies, services, guards, strategy. Separate DTO, entity, mapper, controller and module files are excluded. Generated transpiler helpers remain included within business files. No 100% target.</p><p>Metrics describe executed JavaScript in .test-dist, not a TypeScript source-map report. Scenario evidence: <a href="../docs/testing.md">docs/testing.md</a>; actual test output: <a href="test-results.txt">test-results.txt</a>.</p><table><tr><th>Executed file</th><th>Lines</th><th>Functions</th><th>Branches</th></tr>' +
      rows +
      '</table></html>\n',
  );
  console.log(
    'Business report: coverage/index.html; scenario matrix: docs/testing.md',
  );
}
main().catch(() => {
  console.error('Coverage run failed; inspect coverage/test-results.txt');
  process.exitCode = 1;
});
