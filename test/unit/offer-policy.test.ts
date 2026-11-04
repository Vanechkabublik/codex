import 'reflect-metadata';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { Offer } from '../../src/modules/offers/entities/offer.entity';
import {
  aggregateStatus,
  applyOfferChanges,
  assertEditable,
  assertOwnership,
  completeSnapshot,
} from '../../src/modules/offers/offer.policy';
import {
  OfferStatus,
  OfferType,
  ReviewDecision,
} from '../../src/modules/offers/offer.enums';
import { Role, REVIEWER_ROLES } from '../../src/modules/users/role.enum';
function draft(): Offer {
  return Object.assign(new Offer(), {
    ownerId: 'owner',
    title: null,
    category: null,
    type: null,
    cashbackPercent: null,
    startsAt: null,
    endsAt: null,
    payoutLimit: null,
    clientDescription: null,
    mccCodes: [],
    status: OfferStatus.DRAFT,
  });
}
void test('parallel decisions aggregate independently, with rejection then changes precedence', () => {
  assert.equal(aggregateStatus([]), OfferStatus.UNDER_REVIEW);
  for (const role of REVIEWER_ROLES)
    assert.equal(
      aggregateStatus([
        { reviewerRole: role, decision: ReviewDecision.APPROVED },
      ]),
      OfferStatus.PARTIALLY_APPROVED,
    );
  assert.equal(
    aggregateStatus(
      REVIEWER_ROLES.map((reviewerRole) => ({
        reviewerRole,
        decision: ReviewDecision.APPROVED,
      })),
    ),
    OfferStatus.APPROVED,
  );
  const mixed = [
    { reviewerRole: Role.ANALYST, decision: ReviewDecision.CHANGES_REQUESTED },
    {
      reviewerRole: Role.OPERATIONS_MANAGER,
      decision: ReviewDecision.APPROVED,
    },
  ];
  assert.equal(aggregateStatus(mixed), OfferStatus.CHANGES_REQUESTED);
  assert.equal(
    aggregateStatus([
      ...mixed,
      { reviewerRole: Role.PRODUCT_MANAGER, decision: ReviewDecision.REJECTED },
    ]),
    OfferStatus.REJECTED,
  );
});
void test('snapshots require all fields and do not share mutable MCC array with draft', () => {
  const offer = draft();
  assert.throws(() => completeSnapshot(offer), BadRequestException);
  applyOfferChanges(offer, {
    title: 'Offer',
    category: 'Groceries',
    type: OfferType.PARTNER,
    cashbackPercent: '10',
    payoutLimit: '100',
    startsAt: '2026-01-01T00:00:00Z',
    endsAt: '2027-01-01T00:00:00Z',
    mccCodes: ['5411'],
    clientDescription: 'Description',
  });
  const snapshot = completeSnapshot(offer);
  offer.mccCodes.push('5812');
  assert.deepEqual(snapshot.mccCodes, ['5411']);
  assert.equal(snapshot.cashbackPercent, '10.00');
  assert.throws(() => {
    applyOfferChanges(offer, { cashbackPercent: '101' });
  }, BadRequestException);
  assert.throws(() => {
    applyOfferChanges(draft(), { payoutLimit: '0' });
  }, BadRequestException);
  assert.throws(() => {
    applyOfferChanges(draft(), {
      startsAt: '2027-01-01T00:00:00Z',
      endsAt: '2026-01-01T00:00:00Z',
    });
  }, BadRequestException);
});
void test('ownership and state restrictions cannot be bypassed by ordinary owners or by admin editing launched offers', () => {
  const offer = draft();
  assert.throws(() => {
    assertOwnership(offer, {
      id: 'other',
      email: 'other@test.local',
      role: Role.OFFER_OWNER,
    });
  }, ForbiddenException);
  assert.doesNotThrow(() => {
    assertOwnership(offer, {
      id: 'admin',
      email: 'admin@test.local',
      role: Role.ADMIN,
    });
  });
  offer.status = OfferStatus.READY_TO_LAUNCH;
  assert.throws(() => {
    assertEditable(offer);
  }, ConflictException);
  offer.status = OfferStatus.CHANGES_REQUESTED;
  assert.doesNotThrow(() => {
    assertEditable(offer);
  });
});
