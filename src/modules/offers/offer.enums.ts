export enum OfferType {
  PARTNER = 'PARTNER',
  INTERNAL = 'INTERNAL',
}
export enum OfferStatus {
  DRAFT = 'DRAFT',
  UNDER_REVIEW = 'UNDER_REVIEW',
  CHANGES_REQUESTED = 'CHANGES_REQUESTED',
  PARTIALLY_APPROVED = 'PARTIALLY_APPROVED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  READY_TO_LAUNCH = 'READY_TO_LAUNCH',
}
export enum ReviewDecision {
  APPROVED = 'APPROVED',
  CHANGES_REQUESTED = 'CHANGES_REQUESTED',
  REJECTED = 'REJECTED',
}
export interface OfferSnapshot {
  title: string;
  category: string;
  type: OfferType;
  cashbackPercent: string;
  startsAt: string;
  endsAt: string;
  payoutLimit: string;
  mccCodes: string[];
  clientDescription: string;
}
