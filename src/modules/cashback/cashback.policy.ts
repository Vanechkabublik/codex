import Decimal from 'decimal.js';
import { OfferSnapshot, OfferStatus } from '../offers/offer.enums';
import { CashbackReason } from './cashback.enums';
const Money = Decimal.clone({ precision: 40, rounding: Decimal.ROUND_HALF_UP });
export interface CashbackInput {
  status: OfferStatus;
  snapshot: OfferSnapshot | null;
  payoutSpent: string;
  activatedAt: Date | null;
  purchasedAt: Date;
  amount: string;
  mcc: string;
}
export type CashbackOutcome =
  { reason: CashbackReason; amount: '0.00' } | { reason: null; amount: string };
export function evaluateCashback(input: CashbackInput): CashbackOutcome {
  const decline = (reason: CashbackReason): CashbackOutcome => ({
    reason,
    amount: '0.00',
  });
  if (!input.activatedAt || input.activatedAt > input.purchasedAt)
    return decline(CashbackReason.OFFER_NOT_ACTIVATED);
  if (input.status !== OfferStatus.READY_TO_LAUNCH || !input.snapshot)
    return decline(CashbackReason.OFFER_NOT_READY);
  const snapshot = input.snapshot;
  if (input.purchasedAt < new Date(snapshot.startsAt))
    return decline(CashbackReason.OFFER_NOT_STARTED);
  if (input.purchasedAt >= new Date(snapshot.endsAt))
    return decline(CashbackReason.OFFER_EXPIRED);
  if (!snapshot.mccCodes.includes(input.mcc))
    return decline(CashbackReason.MCC_NOT_ELIGIBLE);
  const amount = new Money(input.amount)
    .mul(snapshot.cashbackPercent)
    .div(100)
    .toDecimalPlaces(2);
  if (!amount.gt(0)) return decline(CashbackReason.CASHBACK_ROUNDED_TO_ZERO);
  if (new Money(input.payoutSpent).plus(amount).gt(snapshot.payoutLimit))
    return decline(CashbackReason.PAYOUT_LIMIT_EXCEEDED);
  return { reason: null, amount: amount.toFixed(2) };
}
export const CASHBACK_EXPLANATIONS: Record<CashbackReason, string> = {
  OFFER_NOT_ACTIVATED:
    'Client had not activated this offer before the purchase',
  MCC_NOT_ELIGIBLE: 'Purchase MCC is not eligible for this offer',
  OFFER_NOT_STARTED: 'Purchase occurred before the offer started',
  OFFER_EXPIRED: 'Purchase occurred at or after the offer expiry',
  OFFER_NOT_READY: 'Offer is not ready to launch',
  PAYOUT_LIMIT_EXCEEDED:
    'Remaining payout budget cannot cover the full cashback',
  CASHBACK_ROUNDED_TO_ZERO:
    'Cashback rounds to zero at the supported monetary precision',
};
