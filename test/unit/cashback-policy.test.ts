import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluateCashback,
  CashbackInput,
} from '../../src/modules/cashback/cashback.policy';
import { CashbackReason } from '../../src/modules/cashback/cashback.enums';
import { OfferStatus, OfferType } from '../../src/modules/offers/offer.enums';
function valid(): CashbackInput {
  return {
    status: OfferStatus.READY_TO_LAUNCH,
    snapshot: {
      title: 'Offer',
      category: 'Category',
      type: OfferType.INTERNAL,
      cashbackPercent: '10.00',
      startsAt: '2026-01-01T00:00:00Z',
      endsAt: '2027-01-01T00:00:00Z',
      payoutLimit: '100.00',
      mccCodes: ['5411'],
      clientDescription: 'Description',
    },
    payoutSpent: '0.00',
    activatedAt: new Date('2025-01-01T00:00:00Z'),
    purchasedAt: new Date('2026-05-01T00:00:00Z'),
    amount: '100.00',
    mcc: '5411',
  };
}
void test('decimal cashback uses half-up rounding and exact budget boundary', () => {
  assert.deepEqual(evaluateCashback(valid()), {
    reason: null,
    amount: '10.00',
  });
  assert.deepEqual(evaluateCashback({ ...valid(), amount: '0.15' }), {
    reason: null,
    amount: '0.02',
  });
  assert.equal(
    evaluateCashback({ ...valid(), payoutSpent: '90.00' }).reason,
    null,
  );
  assert.equal(
    evaluateCashback({ ...valid(), payoutSpent: '90.01' }).reason,
    CashbackReason.PAYOUT_LIMIT_EXCEEDED,
  );
  assert.equal(
    evaluateCashback({ ...valid(), amount: '0.01' }).reason,
    CashbackReason.CASHBACK_ROUNDED_TO_ZERO,
  );
});
void test('declines distinguish activation, MCC, readiness and date boundaries', () => {
  assert.equal(
    evaluateCashback({ ...valid(), activatedAt: null }).reason,
    CashbackReason.OFFER_NOT_ACTIVATED,
  );
  assert.equal(
    evaluateCashback({
      ...valid(),
      activatedAt: new Date('2026-06-01T00:00:00Z'),
    }).reason,
    CashbackReason.OFFER_NOT_ACTIVATED,
  );
  assert.equal(
    evaluateCashback({ ...valid(), mcc: '9999' }).reason,
    CashbackReason.MCC_NOT_ELIGIBLE,
  );
  assert.equal(
    evaluateCashback({ ...valid(), status: OfferStatus.DRAFT }).reason,
    CashbackReason.OFFER_NOT_READY,
  );
  assert.equal(
    evaluateCashback({
      ...valid(),
      purchasedAt: new Date('2025-12-31T23:59:59Z'),
    }).reason,
    CashbackReason.OFFER_NOT_STARTED,
  );
  assert.equal(
    evaluateCashback({
      ...valid(),
      purchasedAt: new Date('2026-01-01T00:00:00Z'),
    }).reason,
    null,
  );
  assert.equal(
    evaluateCashback({
      ...valid(),
      purchasedAt: new Date('2027-01-01T00:00:00Z'),
    }).reason,
    CashbackReason.OFFER_EXPIRED,
  );
});
