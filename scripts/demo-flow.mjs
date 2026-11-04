import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { parseEnv } from 'node:util';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import process from 'node:process';

const root = fileURLToPath(new URL('../', import.meta.url));
export async function demoSettings() {
  const file = await readFile(resolve(root, '.env'), 'utf8').catch((error) => {
    if (error.code !== 'ENOENT') throw error;
    return '';
  });
  const settings = { ...parseEnv(file), ...process.env };
  return {
    baseUrl: (
      settings.DEMO_BASE_URL ?? 'http://localhost:' + (settings.PORT ?? '3000')
    ).replace(/\/$/, ''),
    password: settings.SEED_DEMO_PASSWORD ?? 'DemoPass123!',
  };
}

// Only public business identifiers and expected results are saved. Tokens/passwords stay in memory.
export async function runDemoFlow() {
  const { baseUrl, password } = await demoSettings();
  assert.ok(
    ['localhost', '127.0.0.1', '::1', '[::1]'].includes(
      new URL(baseUrl).hostname,
    ),
    'Demo flow is limited to a local demo environment',
  );
  const accounts = new Map();
  const steps = [];
  async function api(method, path, role, body, expected = 200) {
    const response = await fetch(baseUrl + '/api' + path, {
      method,
      headers: {
        ...(role
          ? { Authorization: 'Bearer ' + accounts.get(role).accessToken }
          : {}),
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    });
    assert.equal(
      response.status,
      expected,
      method + ' ' + path + ': unexpected HTTP status (no credentials logged)',
    );
    return response.status === 204 ? undefined : response.json();
  }
  function record(name, evidence) {
    steps.push({ name, ...evidence });
    console.log('PASS ' + name);
  }
  try {
    const health = await api('GET', '/health/ready');
    assert.equal(health.database, 'up');
    for (const role of [
      'owner',
      'product',
      'analyst',
      'operations',
      'client',
    ]) {
      accounts.set(
        role,
        await api('POST', '/auth/login', undefined, {
          email: role + '@demo.local',
          password,
        }),
      );
    }
    record('Five demo accounts authenticated; PostgreSQL ready', {});
    const initial = await api('GET', '/storefront', 'client');
    // Earlier expiry keeps a repeated demo run within the current deterministic top seven.
    const now = Date.now();
    const earliest = Math.min(
      ...initial.offers.map((offer) => Date.parse(offer.endsAt)),
    );
    const expiry = Math.min(now + 3600000, earliest - 1000);
    assert.ok(
      expiry > now + 30000,
      'An existing offer expires in <30 seconds; rerun after expiry',
    );
    const offer = await api(
      'POST',
      '/offers',
      'owner',
      {
        title: 'Jury demo ' + randomUUID().slice(0, 8),
        category: 'Продукты',
        type: 'PARTNER',
        cashbackPercent: '10.00',
        startsAt: new Date(now - 3600000).toISOString(),
        endsAt: new Date(expiry).toISOString(),
        payoutLimit: '100.00',
        mccCodes: ['5411'],
        clientDescription: '10% кэшбэка за покупки продуктов',
      },
      201,
    );
    assert.equal(offer.status, 'DRAFT');
    record('Owner created a draft', { offerId: offer.id });
    const path = '/offers/' + offer.id;
    const first = await api('POST', path + '/submit', 'owner', {}, 201);
    const review = (roundId, role, decision, comment) =>
      api(
        'POST',
        path + '/rounds/' + roundId + '/reviews',
        role,
        { decision, comment },
        201,
      );
    await review(
      first.round.id,
      'product',
      'APPROVED',
      'Продуктовые условия согласованы',
    );
    let card = await api('GET', path, 'owner');
    assert.equal(card.status, 'PARTIALLY_APPROVED');
    assert.equal(card.pendingRoles.length, 2);
    await review(
      first.round.id,
      'analyst',
      'CHANGES_REQUESTED',
      'Уточнить описание для клиента',
    );
    await review(
      first.round.id,
      'operations',
      'APPROVED',
      'Операционная готовность подтверждена',
    );
    card = await api('GET', path, 'owner');
    assert.equal(card.status, 'CHANGES_REQUESTED');
    assert.ok(
      card.launchBlockers.some(
        (blocker) => blocker.code === 'CHANGES_REQUESTED',
      ),
    );
    await api('POST', path + '/ready-to-launch', 'owner', {}, 409);
    record('Parallel review found changes; premature launch blocked', {
      firstRoundId: first.round.id,
    });
    await api('PATCH', path, 'owner', {
      clientDescription: '10% кэшбэка на продукты, MCC 5411; условия уточнены',
    });
    const second = await api('POST', path + '/submit', 'owner', {}, 201);
    assert.notEqual(second.round.id, first.round.id);
    await Promise.all(
      ['product', 'analyst', 'operations'].map((role) =>
        review(
          second.round.id,
          role,
          'APPROVED',
          'Уточнённые условия согласованы',
        ),
      ),
    );
    card = await api('GET', path, 'owner');
    assert.equal(card.status, 'APPROVED');
    const rounds = await api('GET', path + '/rounds', 'owner');
    assert.equal(rounds.total, 2);
    assert.ok(rounds.items.every((round) => round.reviews.length === 3));
    const original = rounds.items.find((round) => round.number === 1);
    assert.equal(
      original.revision.snapshot.clientDescription,
      '10% кэшбэка за покупки продуктов',
    );
    await api('POST', path + '/ready-to-launch', 'owner', {});
    card = await api('GET', path, 'owner');
    assert.equal(card.status, 'READY_TO_LAUNCH');
    record(
      'Second round fully approved; immutable history retained; offer launched',
      { secondRoundId: second.round.id },
    );
    const storefront = await api('GET', '/storefront', 'client');
    assert.ok(storefront.offers.length <= 7);
    assert.ok(storefront.offers.some((item) => item.id === offer.id));
    assert.equal(storefront.baseCategory.title, '1% на всё');
    record('Client sees launched offer and mandatory 1% category', {});
    const activation = await api('PUT', path + '/activation', 'client', {});
    const repeatedActivation = await api(
      'PUT',
      path + '/activation',
      'client',
      {},
    );
    assert.equal(activation.id, repeatedActivation.id);
    record('Activation is idempotent', { activationId: activation.id });
    const purchase = {
      offerId: offer.id,
      reference: 'jury-' + randomUUID(),
      amount: '100.00',
      mcc: '5411',
      purchasedAt: new Date().toISOString(),
    };
    const result = await api('POST', '/purchases', 'client', purchase);
    assert.equal(result.evaluation.result, 'ACCRUED');
    assert.equal(result.accrual.amount, '10.00');
    const repeated = await api('POST', '/purchases', 'client', purchase);
    assert.equal(repeated.purchase.id, result.purchase.id);
    assert.equal(repeated.accrual.id, result.accrual.id);
    record('Purchase accrued 10.00 once; retry returned the same accrual', {
      purchaseId: result.purchase.id,
      accrualId: result.accrual.id,
    });
    const mismatch = await api('POST', '/purchases', 'client', {
      ...purchase,
      reference: 'jury-' + randomUUID(),
      mcc: '9999',
    });
    assert.equal(mismatch.evaluation.reason, 'MCC_NOT_ELIGIBLE');
    assert.equal(mismatch.accrual, null);
    await api('PATCH', path, 'client', { title: 'Unauthorized edit' }, 403);
    record('Wrong MCC is declined and client cannot edit internal offers', {});
    const report = {
      verifiedAt: new Date().toISOString(),
      baseUrl,
      offerId: offer.id,
      roundIds: [first.round.id, second.round.id],
      purchaseId: result.purchase.id,
      cashbackAmount: result.accrual.amount,
      status: 'passed',
      steps,
    };
    await mkdir(resolve(root, 'artifacts'), { recursive: true });
    await writeFile(
      resolve(root, 'artifacts/demo-flow.json'),
      JSON.stringify(report, null, 2) + '\n',
    );
    console.log(
      'Offer: ' +
        offer.id +
        '\nReport: artifacts/demo-flow.json\nSwagger: ' +
        baseUrl +
        '/api/docs',
    );
    return report;
  } finally {
    for (const pair of accounts.values()) {
      await api(
        'POST',
        '/auth/logout',
        undefined,
        { refreshToken: pair.refreshToken },
        204,
      ).catch(() =>
        console.error('Demo session cleanup failed (credentials not logged)'),
      );
    }
  }
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  runDemoFlow().catch(() => {
    console.error(
      'Demo flow failed. Check API readiness, demo credentials and the last PASS step. No tokens were written.',
    );
    process.exitCode = 1;
  });
}
