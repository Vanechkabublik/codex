import 'reflect-metadata';
import 'dotenv/config';
import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import {
  EnvironmentVariables,
  validateEnvironment,
} from '../../src/config/environment.validation';
import { databaseOptions } from '../../src/database/database-options';
import { configureApp } from '../../src/configure-app';
import {
  seedDemo,
  DEMO_PASSWORD,
  DEMO_USERS,
} from '../../src/database/seed-demo';
import { Role, REVIEWER_ROLES } from '../../src/modules/users/role.enum';
import { User } from '../../src/modules/users/entities/user.entity';
import { RefreshSession } from '../../src/modules/auth/entities/refresh-session.entity';
import { TokenResponseDto } from '../../src/modules/auth/dto/auth.dto';
import { SaveOfferDto } from '../../src/modules/offers/dto/offer.dto';
import {
  OfferCardResponseDto,
  OfferResponseDto,
  SubmitResponseDto,
} from '../../src/modules/offers/dto/offer-response.dto';
import { Offer } from '../../src/modules/offers/entities/offer.entity';
import { OfferRevision } from '../../src/modules/offers/entities/offer-revision.entity';
import { OfferEvent } from '../../src/modules/offers/entities/offer-event.entity';
import {
  OfferStatus,
  OfferType,
  ReviewDecision,
} from '../../src/modules/offers/offer.enums';
import { ApprovalRound } from '../../src/modules/approvals/entities/approval-round.entity';
import { Review } from '../../src/modules/approvals/entities/review.entity';
import { StorefrontResponseDto } from '../../src/modules/storefront/dto/storefront-response.dto';
import { OfferActivation } from '../../src/modules/activations/entities/offer-activation.entity';
import { ActivationResponseDto } from '../../src/modules/activations/dto/activation-response.dto';
import { Purchase } from '../../src/modules/purchases/entities/purchase.entity';
import { PurchaseResultDto } from '../../src/modules/purchases/dto/purchase-response.dto';
import { CashbackEvaluation } from '../../src/modules/cashback/entities/cashback-evaluation.entity';
import { CashbackAccrual } from '../../src/modules/cashback/entities/cashback-accrual.entity';
import {
  CashbackReason,
  EvaluationResult,
} from '../../src/modules/cashback/cashback.enums';

void describe(
  'MVP HTTP API with real PostgreSQL',
  { concurrency: false },
  () => {
    let app: INestApplication | undefined;
    let db: DataSource;
    let admin: DataSource;
    let baseUrl: string;
    const testDatabase = 'cashback_e2e_' + randomUUID().replaceAll('-', '');
    const originalDatabase = process.env.DB_DATABASE;
    const tokens = new Map<Role, TokenResponseDto>();
    let mainOfferId: string;
    let firstRoundId: string;
    let secondRoundId: string;
    let clientId: string;

    function access(role: Role): string {
      const pair = tokens.get(role);
      assert.ok(pair);
      return pair.accessToken;
    }
    async function request<T>(
      method: string,
      path: string,
      token?: string,
      body?: unknown,
      expected = 200,
    ): Promise<T> {
      const response = await fetch(baseUrl + '/api' + path, {
        method,
        headers: {
          ...(token ? { Authorization: 'Bearer ' + token } : {}),
          ...(body ? { 'Content-Type': 'application/json' } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      assert.equal(
        response.status,
        expected,
        method + ' ' + path + ': unexpected HTTP status',
      );
      if (response.status === 204) return undefined as T;
      const result: unknown = await response.json();
      return result as T;
    }
    async function login(
      email: string,
      password = DEMO_PASSWORD,
    ): Promise<TokenResponseDto> {
      return request<TokenResponseDto>('POST', '/auth/login', undefined, {
        email,
        password,
      });
    }
    function complete(overrides: Partial<SaveOfferDto> = {}): SaveOfferDto {
      return {
        title: 'E2E ' + randomUUID(),
        category: 'Groceries',
        type: OfferType.PARTNER,
        cashbackPercent: '10.00',
        payoutLimit: '100.00',
        mccCodes: ['5411'],
        clientDescription: 'Cashback for groceries',
        startsAt: new Date(Date.now() - 86400000).toISOString(),
        endsAt: new Date(Date.now() + 86400000).toISOString(),
        ...overrides,
      };
    }
    async function createReady(
      overrides: Partial<SaveOfferDto> = {},
    ): Promise<string> {
      const offer = await request<OfferResponseDto>(
        'POST',
        '/offers',
        access(Role.OFFER_OWNER),
        complete(overrides),
        201,
      );
      const submitted = await request<SubmitResponseDto>(
        'POST',
        '/offers/' + offer.id + '/submit',
        access(Role.OFFER_OWNER),
        {},
        201,
      );
      await Promise.all(
        REVIEWER_ROLES.map((role) =>
          request(
            'POST',
            '/offers/' +
              offer.id +
              '/rounds/' +
              submitted.round.id +
              '/reviews',
            access(role),
            {
              decision: ReviewDecision.APPROVED,
              comment: 'Approved independently',
            },
            201,
          ),
        ),
      );
      await request(
        'POST',
        '/offers/' + offer.id + '/ready-to-launch',
        access(Role.OFFER_OWNER),
        {},
      );
      return offer.id;
    }
    before(
      async () => {
        process.env.NODE_ENV = 'test';
        const configuration = new ConfigService<EnvironmentVariables, true>(
          validateEnvironment(process.env),
        );
        admin = new DataSource(databaseOptions(configuration));
        await admin.initialize();
        // Only this randomly named database is created and dropped; existing databases are untouched.
        assert.match(testDatabase, /^cashback_e2e_[a-f0-9]{32}$/);
        await admin.query('CREATE DATABASE "' + testDatabase + '"');
        const migrationDb = new DataSource({
          ...databaseOptions(configuration),
          database: testDatabase,
        });
        await migrationDb.initialize();
        assert.equal(
          await migrationDb
            .getRepository(User)
            .count()
            .catch(() => -1),
          -1,
        );
        await migrationDb.runMigrations();
        // Verify both rollback implementations, then build the schema again from scratch.
        await migrationDb.undoLastMigration();
        await migrationDb.undoLastMigration();
        await migrationDb.runMigrations();
        await migrationDb.destroy();
        process.env.DB_DATABASE = testDatabase;
        const { AppModule } = await import('../../src/app.module');
        app = await NestFactory.create(AppModule, { logger: false });
        configureApp(app);
        await app.listen(0, '127.0.0.1');
        baseUrl = await app.getUrl();
        db = app.get(DataSource);
        await seedDemo(app, false);
        for (const demo of DEMO_USERS)
          tokens.set(demo.role, await login(demo.email));
        const client = tokens.get(Role.CLIENT);
        assert.ok(client);
        clientId = client.user.id;
      },
      { timeout: 60000 },
    );
    after(async () => {
      if (app) await app.close();
      if (admin.isInitialized) {
        assert.match(testDatabase, /^cashback_e2e_[a-f0-9]{32}$/);
        await admin.query(
          'DROP DATABASE IF EXISTS "' + testDatabase + '" WITH (FORCE)',
        );
        await admin.destroy();
      }
      process.env.DB_DATABASE = originalDatabase;
    });

    void it('auth: protects endpoints, rotates tokens once, revokes logout and never exposes hashes', async () => {
      await request('GET', '/auth/me', undefined, undefined, 401);
      await request(
        'POST',
        '/auth/login',
        undefined,
        { email: 'owner@demo.local', password: 'wrong' },
        401,
      );
      const pair = await login(' CLIENT@DEMO.LOCAL ');
      assert.equal(pair.user.role, Role.CLIENT);
      assert.ok(!('passwordHash' in pair.user));
      const refreshResults = await Promise.all(
        [1, 2].map(async () => {
          const response = await fetch(baseUrl + '/api/auth/refresh', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken: pair.refreshToken }),
          });
          const body: unknown = await response.json();
          return { status: response.status, body };
        }),
      );
      assert.deepEqual(
        refreshResults.map((item) => item.status).sort(),
        [200, 401],
      );
      const winner = refreshResults.find((item) => item.status === 200);
      assert.ok(winner);
      const rotated = winner.body as TokenResponseDto;
      assert.notEqual(rotated.refreshToken, pair.refreshToken);
      await request(
        'POST',
        '/auth/refresh',
        undefined,
        { refreshToken: pair.refreshToken },
        401,
      );
      await request('GET', '/auth/me', rotated.refreshToken, undefined, 401);
      await request(
        'GET',
        '/auth/me',
        rotated.accessToken.slice(0, -5) + 'xxxxx',
        undefined,
        401,
      );
      await request(
        'POST',
        '/auth/logout',
        undefined,
        { refreshToken: rotated.refreshToken },
        204,
      );
      await request('GET', '/auth/me', rotated.accessToken, undefined, 401);
      await request(
        'POST',
        '/auth/refresh',
        undefined,
        { refreshToken: rotated.refreshToken },
        401,
      );
      const user = await db
        .getRepository(User)
        .createQueryBuilder('user')
        .addSelect('user.passwordHash')
        .where('user.email = :email', { email: 'client@demo.local' })
        .getOneOrFail();
      assert.ok(user.passwordHash.startsWith('$argon2id$'));
      const session = await db
        .getRepository(RefreshSession)
        .createQueryBuilder('session')
        .addSelect('session.tokenHash')
        .where('session.userId = :id', { id: user.id })
        .getOneOrFail();
      assert.match(session.tokenHash, /^[a-f0-9]{64}$/);
      assert.notEqual(session.tokenHash, pair.refreshToken);
      const profiles = await request<{ items: Record<string, unknown>[] }>(
        'GET',
        '/users?limit=100',
        access(Role.ADMIN),
      );
      assert.ok(
        profiles.items.every(
          (item) => !('passwordHash' in item) && !('tokenHash' in item),
        ),
      );
    });

    void it('full workflow preserves two rounds, independent decisions and immutable snapshots', async () => {
      const offer = await request<OfferResponseDto>(
        'POST',
        '/offers',
        access(Role.OFFER_OWNER),
        complete(),
        201,
      );
      mainOfferId = offer.id;
      const submitted = await request<SubmitResponseDto>(
        'POST',
        '/offers/' + mainOfferId + '/submit',
        access(Role.OFFER_OWNER),
        {},
        201,
      );
      firstRoundId = submitted.round.id;
      await request(
        'POST',
        '/offers/' + mainOfferId + '/rounds/' + firstRoundId + '/reviews',
        access(Role.PRODUCT_MANAGER),
        { decision: ReviewDecision.APPROVED, comment: 'Product approved' },
        201,
      );
      let card = await request<OfferCardResponseDto>(
        'GET',
        '/offers/' + mainOfferId,
        access(Role.OFFER_OWNER),
      );
      assert.equal(card.status, OfferStatus.PARTIALLY_APPROVED);
      assert.equal(card.pendingRoles.length, 2);
      await request(
        'POST',
        '/offers/' + mainOfferId + '/rounds/' + firstRoundId + '/reviews',
        access(Role.ANALYST),
        {
          decision: ReviewDecision.CHANGES_REQUESTED,
          comment: 'Clarify client description',
        },
        201,
      );
      await request(
        'POST',
        '/offers/' + mainOfferId + '/rounds/' + firstRoundId + '/reviews',
        access(Role.OPERATIONS_MANAGER),
        {
          decision: ReviewDecision.APPROVED,
          comment: 'Operations approved independently',
        },
        201,
      );
      card = await request<OfferCardResponseDto>(
        'GET',
        '/offers/' + mainOfferId,
        access(Role.OFFER_OWNER),
      );
      assert.equal(card.status, OfferStatus.CHANGES_REQUESTED);
      assert.ok(
        card.launchBlockers.some(
          (item) =>
            item.code === 'CHANGES_REQUESTED' &&
            item.message === 'Clarify client description',
        ),
      );
      await request(
        'POST',
        '/offers/' + mainOfferId + '/ready-to-launch',
        access(Role.OFFER_OWNER),
        {},
        409,
      );
      await request(
        'PATCH',
        '/offers/' + mainOfferId,
        access(Role.OFFER_OWNER),
        { clientDescription: 'Updated description' },
      );
      const next = await request<SubmitResponseDto>(
        'POST',
        '/offers/' + mainOfferId + '/submit',
        access(Role.OFFER_OWNER),
        {},
        201,
      );
      secondRoundId = next.round.id;
      assert.notEqual(firstRoundId, secondRoundId);
      assert.equal(next.round.number, 2);
      await request(
        'POST',
        '/offers/' + mainOfferId + '/rounds/' + firstRoundId + '/reviews',
        access(Role.PRODUCT_MANAGER),
        { decision: ReviewDecision.APPROVED, comment: 'Late decision' },
        409,
      );
      await Promise.all(
        REVIEWER_ROLES.map((role) =>
          request(
            'POST',
            '/offers/' + mainOfferId + '/rounds/' + secondRoundId + '/reviews',
            access(role),
            {
              decision: ReviewDecision.APPROVED,
              comment: 'Round two approved',
            },
            201,
          ),
        ),
      );
      card = await request<OfferCardResponseDto>(
        'GET',
        '/offers/' + mainOfferId,
        access(Role.OFFER_OWNER),
      );
      assert.equal(card.status, OfferStatus.APPROVED);
      await request(
        'POST',
        '/offers/' + mainOfferId + '/ready-to-launch',
        access(Role.OFFER_OWNER),
        {},
      );
      card = await request<OfferCardResponseDto>(
        'GET',
        '/offers/' + mainOfferId,
        access(Role.OFFER_OWNER),
      );
      assert.equal(card.status, OfferStatus.READY_TO_LAUNCH);
      assert.deepEqual(card.launchBlockers, []);
      const rounds = await request<{
        total: number;
        items: { reviews: unknown[] }[];
      }>('GET', '/offers/' + mainOfferId + '/rounds', access(Role.OFFER_OWNER));
      assert.equal(rounds.total, 2);
      assert.ok(rounds.items.every((round) => round.reviews.length === 3));
      const old = await db
        .getRepository(OfferRevision)
        .findOneByOrFail({ offerId: mainOfferId, number: 1 });
      assert.equal(old.snapshot.clientDescription, 'Cashback for groceries');
      assert.equal(await db.getRepository(Review).count(), 6);
      await assert.rejects(
        db
          .getRepository(OfferRevision)
          .update(old.id, { snapshot: { ...old.snapshot, title: 'Tampered' } }),
      );
      await assert.rejects(
        db.getRepository(Review).delete({ roundId: firstRoundId }),
      );
      const history = await request<{ items: { type: string }[] }>(
        'GET',
        '/offers/' + mainOfferId + '/history?limit=100',
        access(Role.OFFER_OWNER),
      );
      for (const type of [
        'CREATED',
        'EDITED',
        'SUBMITTED',
        'REVIEWED',
        'CHANGES_REQUESTED',
        'READY_TO_LAUNCH',
      ])
        assert.ok(history.items.some((event) => event.type === type));
      await request(
        'PATCH',
        '/offers/' + mainOfferId,
        access(Role.ADMIN),
        { title: 'Cannot edit launched' },
        409,
      );
    });

    void it('client storefront, concurrent idempotent activation and purchase yield one accrual', async () => {
      const storefront = await request<StorefrontResponseDto>(
        'GET',
        '/storefront',
        access(Role.CLIENT),
      );
      assert.ok(storefront.offers.some((offer) => offer.id === mainOfferId));
      assert.equal(storefront.baseCategory.title, '1% на всё');
      assert.equal(storefront.baseCategory.cashbackPercent, '1.00');
      const activations = await Promise.all(
        [1, 2].map(() =>
          request<ActivationResponseDto>(
            'PUT',
            '/offers/' + mainOfferId + '/activation',
            access(Role.CLIENT),
            {},
          ),
        ),
      );
      assert.equal(activations[0]?.id, activations[1]?.id);
      assert.equal(
        await db
          .getRepository(OfferActivation)
          .countBy({ clientId, offerId: mainOfferId }),
        1,
      );
      const dto = {
        offerId: mainOfferId,
        reference: randomUUID(),
        amount: '100.00',
        mcc: '5411',
        purchasedAt: new Date().toISOString(),
      };
      const results = await Promise.all(
        [1, 2].map(() =>
          request<PurchaseResultDto>(
            'POST',
            '/purchases',
            access(Role.CLIENT),
            dto,
          ),
        ),
      );
      const [first, second] = results;
      assert.ok(first);
      assert.ok(second);
      assert.equal(first.purchase.id, second.purchase.id);
      assert.equal(first.evaluation.result, EvaluationResult.ACCRUED);
      assert.equal(first.accrual?.amount, '10.00');
      assert.equal(await db.getRepository(CashbackAccrual).count(), 1);
      const repeated = await request<PurchaseResultDto>(
        'POST',
        '/purchases',
        access(Role.CLIENT),
        dto,
      );
      assert.equal(repeated.purchase.id, first.purchase.id);
      assert.equal(repeated.evaluation.id, first.evaluation.id);
      const offer = await db
        .getRepository(Offer)
        .findOneByOrFail({ id: mainOfferId });
      assert.equal(offer.payoutSpent, '10.00');
      await request(
        'POST',
        '/purchases',
        access(Role.CLIENT),
        { ...dto, amount: '101.00' },
        409,
      );
      await request(
        'GET',
        '/purchases/' + repeated.purchase.id,
        access(Role.CLIENT),
      );
      await request('GET', '/activations?page=1&limit=1', access(Role.CLIENT));
    });

    void it('purchase ownership and idempotency references are isolated between clients', async () => {
      const source = await db
        .getRepository(User)
        .createQueryBuilder('user')
        .addSelect('user.passwordHash')
        .where('user.id = :id', { id: clientId })
        .getOneOrFail();
      const other = await db.getRepository(User).save(
        db.getRepository(User).create({
          email: 'other-client@demo.local',
          role: Role.CLIENT,
          passwordHash: source.passwordHash,
        }),
      );
      const pair = await login(other.email);
      const original = await db
        .getRepository(Purchase)
        .findOneByOrFail({ clientId });
      await request(
        'GET',
        '/purchases/' + original.id,
        pair.accessToken,
        undefined,
        403,
      );
      const ownActivations = await request<{ total: number }>(
        'GET',
        '/activations',
        pair.accessToken,
      );
      assert.equal(ownActivations.total, 0);
      const dto = {
        offerId: mainOfferId,
        reference: original.reference,
        amount: '100.00',
        mcc: '5411',
        purchasedAt: new Date().toISOString(),
      };
      await request(
        'POST',
        '/purchases',
        pair.accessToken,
        { ...dto, clientId },
        400,
      );
      const result = await request<PurchaseResultDto>(
        'POST',
        '/purchases',
        pair.accessToken,
        dto,
      );
      assert.equal(result.purchase.clientId, other.id);
      assert.notEqual(result.purchase.id, original.id);
      assert.equal(
        result.evaluation.reason,
        CashbackReason.OFFER_NOT_ACTIVATED,
      );
      await request(
        'GET',
        '/purchases/' + result.purchase.id,
        access(Role.CLIENT),
        undefined,
        403,
      );
      await request(
        'POST',
        '/auth/logout',
        undefined,
        { refreshToken: pair.refreshToken },
        204,
      );
    });

    void it('authorization, ownership, mass assignment and input validation reject unsafe requests', async () => {
      await request('POST', '/offers', access(Role.CLIENT), complete(), 403);
      await request(
        'GET',
        '/offers/' + mainOfferId,
        access(Role.CLIENT),
        undefined,
        403,
      );
      await request('POST', '/purchases', access(Role.OFFER_OWNER), {}, 403);
      await request(
        'POST',
        '/offers',
        access(Role.OFFER_OWNER),
        { status: OfferStatus.READY_TO_LAUNCH },
        400,
      );
      await request(
        'POST',
        '/offers',
        access(Role.OFFER_OWNER),
        { cashbackPercent: '101' },
        400,
      );
      await request(
        'POST',
        '/offers',
        access(Role.OFFER_OWNER),
        { payoutLimit: '-1' },
        400,
      );
      await request(
        'POST',
        '/offers',
        access(Role.OFFER_OWNER),
        { title: null },
        400,
      );
      await request(
        'POST',
        '/offers',
        access(Role.OFFER_OWNER),
        { mccCodes: ['123'] },
        400,
      );
      await request(
        'POST',
        '/offers',
        access(Role.OFFER_OWNER),
        complete({ endsAt: '2020-01-01T00:00:00Z' }),
        400,
      );
      const draft = await request<OfferResponseDto>(
        'POST',
        '/offers',
        access(Role.OFFER_OWNER),
        {},
        201,
      );
      await request(
        'POST',
        '/offers/' + draft.id + '/submit',
        access(Role.OFFER_OWNER),
        {},
        400,
      );
      const other = await request<OfferResponseDto>(
        'POST',
        '/offers',
        access(Role.ADMIN),
        complete(),
        201,
      );
      await request(
        'PATCH',
        '/offers/' + other.id,
        access(Role.OFFER_OWNER),
        { title: 'Steal ownership' },
        403,
      );
      await request(
        'GET',
        '/offers/' + other.id + '/history',
        access(Role.OFFER_OWNER),
        undefined,
        403,
      );
      await request(
        'GET',
        '/offers?limit=101',
        access(Role.OFFER_OWNER),
        undefined,
        400,
      );
      await request(
        'GET',
        '/offers/not-a-uuid',
        access(Role.OFFER_OWNER),
        undefined,
        400,
      );
      await request(
        'POST',
        '/auth/login',
        undefined,
        {
          email: 'owner@demo.local',
          password: DEMO_PASSWORD,
          role: Role.ADMIN,
        },
        400,
      );
    });

    void it('duplicate reviews conflict, admin cannot impersonate a review role and rejection is terminal', async () => {
      const offer = await request<OfferResponseDto>(
        'POST',
        '/offers',
        access(Role.OFFER_OWNER),
        complete(),
        201,
      );
      const submitted = await request<SubmitResponseDto>(
        'POST',
        '/offers/' + offer.id + '/submit',
        access(Role.OFFER_OWNER),
        {},
        201,
      );
      const path =
        '/offers/' + offer.id + '/rounds/' + submitted.round.id + '/reviews';
      await request(
        'POST',
        path,
        access(Role.CLIENT),
        { decision: 'APPROVED', comment: 'Invalid role' },
        403,
      );
      await request(
        'POST',
        path,
        access(Role.ADMIN),
        { decision: 'APPROVED', comment: 'No impersonation' },
        403,
      );
      await request(
        'POST',
        path,
        access(Role.ANALYST),
        { decision: 'APPROVED', comment: '   ' },
        400,
      );
      const responses = await Promise.all(
        [1, 2].map(() =>
          fetch(baseUrl + '/api' + path, {
            method: 'POST',
            headers: {
              Authorization: 'Bearer ' + access(Role.PRODUCT_MANAGER),
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              decision: 'APPROVED',
              comment: 'Only once',
            }),
          }),
        ),
      );
      assert.deepEqual(
        responses.map((response) => response.status).sort(),
        [201, 409],
      );
      await request(
        'POST',
        path,
        access(Role.ANALYST),
        { decision: 'REJECTED', comment: 'Unacceptable conditions' },
        201,
      );
      const card = await request<OfferCardResponseDto>(
        'GET',
        '/offers/' + offer.id,
        access(Role.OFFER_OWNER),
      );
      assert.equal(card.status, OfferStatus.REJECTED);
      await request(
        'POST',
        '/offers/' + offer.id + '/submit',
        access(Role.OFFER_OWNER),
        {},
        409,
      );
    });

    void it('declines for no activation, MCC mismatch and insufficient budget are persisted', async () => {
      const offerId = await createReady({ payoutLimit: '1.00' });
      const purchase = (overrides: Record<string, unknown> = {}) => ({
        offerId,
        reference: randomUUID(),
        amount: '20.00',
        mcc: '5411',
        purchasedAt: new Date().toISOString(),
        ...overrides,
      });
      const inactive = await request<PurchaseResultDto>(
        'POST',
        '/purchases',
        access(Role.CLIENT),
        purchase(),
      );
      assert.equal(
        inactive.evaluation.reason,
        CashbackReason.OFFER_NOT_ACTIVATED,
      );
      assert.equal(inactive.accrual, null);
      await request(
        'PUT',
        '/offers/' + offerId + '/activation',
        access(Role.CLIENT),
        {},
      );
      const wrongMcc = await request<PurchaseResultDto>(
        'POST',
        '/purchases',
        access(Role.CLIENT),
        purchase({ mcc: '9999' }),
      );
      assert.equal(wrongMcc.evaluation.reason, CashbackReason.MCC_NOT_ELIGIBLE);
      const overLimit = await request<PurchaseResultDto>(
        'POST',
        '/purchases',
        access(Role.CLIENT),
        purchase(),
      );
      assert.equal(
        overLimit.evaluation.reason,
        CashbackReason.PAYOUT_LIMIT_EXCEEDED,
      );
      assert.ok(overLimit.evaluation.explanation);
      const stored = await request<PurchaseResultDto>(
        'GET',
        '/purchases/' + overLimit.purchase.id,
        access(Role.CLIENT),
      );
      assert.equal(
        stored.evaluation.reason,
        CashbackReason.PAYOUT_LIMIT_EXCEEDED,
      );
      // Two independent purchases compete for exactly one affordable payout.
      const results = await Promise.all(
        [1, 2].map(() =>
          request<PurchaseResultDto>(
            'POST',
            '/purchases',
            access(Role.CLIENT),
            purchase({ amount: '10.00' }),
          ),
        ),
      );
      assert.deepEqual(
        results.map((result) => result.evaluation.result).sort(),
        ['ACCRUED', 'DECLINED'],
      );
      assert.equal(
        (await db.getRepository(Offer).findOneByOrFail({ id: offerId }))
          .payoutSpent,
        '1.00',
      );
    });

    void it('expired offer is absent from storefront and historical purchase stores expiry reason', async () => {
      // A historical ready offer fixture models one approved and activated before its expiry.
      const owner = await db
        .getRepository(User)
        .findOneByOrFail({ email: 'owner@demo.local' });
      const end = new Date(Date.now() - 86400000);
      const start = new Date(end.getTime() - 86400000);
      const offer = await db.getRepository(Offer).save(
        db.getRepository(Offer).create({
          ownerId: owner.id,
          title: 'Historical ready offer',
          category: 'Groceries',
          type: OfferType.PARTNER,
          cashbackPercent: '10.00',
          startsAt: start,
          endsAt: end,
          payoutLimit: '100.00',
          payoutSpent: '0.00',
          mccCodes: ['5411'],
          clientDescription: 'Historical fixture',
          status: OfferStatus.READY_TO_LAUNCH,
          roundNumber: 1,
        }),
      );
      await db.getRepository(OfferRevision).save(
        db.getRepository(OfferRevision).create({
          offerId: offer.id,
          number: 1,
          authorId: owner.id,
          snapshot: {
            title: 'Historical ready offer',
            category: 'Groceries',
            type: OfferType.PARTNER,
            cashbackPercent: '10.00',
            startsAt: start.toISOString(),
            endsAt: end.toISOString(),
            payoutLimit: '100.00',
            mccCodes: ['5411'],
            clientDescription: 'Historical fixture',
          },
        }),
      );
      await db
        .getRepository(OfferActivation)
        .save(
          db
            .getRepository(OfferActivation)
            .create({ clientId, offerId: offer.id, createdAt: start }),
        );
      const expired = await request<PurchaseResultDto>(
        'POST',
        '/purchases',
        access(Role.CLIENT),
        {
          offerId: offer.id,
          reference: randomUUID(),
          amount: '10.00',
          mcc: '5411',
          purchasedAt: end.toISOString(),
        },
      );
      assert.equal(expired.evaluation.reason, CashbackReason.OFFER_EXPIRED);
      const storefront = await request<StorefrontResponseDto>(
        'GET',
        '/storefront',
        access(Role.CLIENT),
      );
      assert.ok(storefront.offers.every((item) => item.id !== offer.id));
      await request(
        'PUT',
        '/offers/' + offer.id + '/activation',
        access(Role.CLIENT),
        {},
      ); // Existing activation remains idempotent.
      const events = await db.getRepository(OfferEvent).count();
      assert.ok(events > 0);
      assert.equal(
        await db.getRepository(CashbackEvaluation).count(),
        await db.getRepository(Purchase).count(),
      );
    });

    void it('seed is safely repeatable, storefront is deterministic and capped at seven; Swagger and health work', async () => {
      assert.ok(app);
      await seedDemo(app);
      const beforeOffers = await db.getRepository(Offer).count();
      const beforeUsers = await db.getRepository(User).count();
      await seedDemo(app);
      assert.equal(await db.getRepository(Offer).count(), beforeOffers);
      assert.equal(await db.getRepository(User).count(), beforeUsers);
      const first = await request<StorefrontResponseDto>(
        'GET',
        '/storefront',
        access(Role.CLIENT),
      );
      const second = await request<StorefrontResponseDto>(
        'GET',
        '/storefront',
        access(Role.CLIENT),
      );
      assert.equal(first.offers.length, 7);
      assert.deepEqual(
        first.offers.map((offer) => offer.id),
        second.offers.map((offer) => offer.id),
      );
      const list = await request<{ items: OfferResponseDto[]; total: number }>(
        'GET',
        '/offers?page=1&limit=2',
        access(Role.ADMIN),
      );
      assert.equal(list.items.length, 2);
      assert.ok(list.total > 2);
      const health = await request<{ status: string; database: string }>(
        'GET',
        '/health/ready',
      );
      assert.equal(health.status, 'ok');
      assert.equal(health.database, 'up');
      const document = await request<{
        paths: Record<
          string,
          {
            get?: {
              parameters?: {
                name: string;
                schema: { type?: string; default?: number };
              }[];
            };
          }
        >;
        components: { schemas: Record<string, unknown> };
      }>('GET', '/docs-json');
      assert.ok(document.paths['/api/offers/{id}/submit']);
      assert.ok(document.components.schemas.CreatePurchaseDto);
      // Regression: Object schemas here make Swagger UI remain on Loading before sending HTTP.
      for (const path of [
        '/api/offers',
        '/api/users',
        '/api/activations',
        '/api/purchases',
        '/api/offers/{id}/rounds',
        '/api/offers/{id}/history',
      ]) {
        const parameters = document.paths[path]?.get?.parameters;
        assert.ok(
          parameters,
          path + ': pagination parameters must be documented',
        );
        for (const [name, defaultValue] of [
          ['page', 1],
          ['limit', 20],
        ] as const) {
          const parameter: (typeof parameters)[number] | undefined =
            parameters.find((item) => item.name === name);
          assert.ok(parameter, path + ': missing ' + name);
          assert.equal(
            parameter.schema.type,
            'integer',
            path + ': ' + name + ' must be a scalar integer for Swagger UI',
          );
          assert.equal(parameter.schema.default, defaultValue);
        }
      }
      const rounds = await db.getRepository(ApprovalRound).count();
      assert.ok(rounds > 0);
    });
  },
);
