/**
 * Cancellation Policy Engine
 * Calculates refund amount based on policy and days until check-in
 */

export type PolicyType = 'flexible' | 'moderate' | 'strict' | 'non_refundable' | 'custom';

export interface CancellationPolicy {
  type: PolicyType;
  rules?: CancellationRule[];  // for 'custom'
  description?: string;
}

export interface CancellationRule {
  daysBeforeCheckIn: number;  // cancel >= this many days before → apply this rule
  refundPercent: number;       // 0-100
  label: string;
}

export interface CancellationResult {
  refundPercent: number;
  refundAmount: number;
  penaltyAmount: number;
  rule: string;
  canCancel: boolean;
}

// Standard policies
export const POLICIES: Record<PolicyType, CancellationPolicy> = {
  flexible: {
    type: 'flexible',
    description: 'ยกเลิกฟรีก่อน 24 ชม.',
    rules: [
      { daysBeforeCheckIn: 1,  refundPercent: 100, label: 'ยกเลิกฟรี (แจ้งล่วงหน้า > 24 ชม.)' },
      { daysBeforeCheckIn: 0,  refundPercent: 0,   label: 'ไม่คืนเงิน (แจ้งน้อยกว่า 24 ชม.)' },
    ],
  },
  moderate: {
    type: 'moderate',
    description: 'ยกเลิกฟรีก่อน 5 วัน',
    rules: [
      { daysBeforeCheckIn: 5,  refundPercent: 100, label: 'ยกเลิกฟรี (แจ้งล่วงหน้า > 5 วัน)' },
      { daysBeforeCheckIn: 1,  refundPercent: 50,  label: 'คืน 50% (1-5 วัน ก่อนเช็คอิน)' },
      { daysBeforeCheckIn: 0,  refundPercent: 0,   label: 'ไม่คืนเงิน (น้อยกว่า 24 ชม.)' },
    ],
  },
  strict: {
    type: 'strict',
    description: 'ยกเลิกฟรีก่อน 14 วัน',
    rules: [
      { daysBeforeCheckIn: 14, refundPercent: 100, label: 'ยกเลิกฟรี (แจ้งล่วงหน้า > 14 วัน)' },
      { daysBeforeCheckIn: 7,  refundPercent: 50,  label: 'คืน 50% (7-14 วัน ก่อนเช็คอิน)' },
      { daysBeforeCheckIn: 0,  refundPercent: 0,   label: 'ไม่คืนเงิน (น้อยกว่า 7 วัน)' },
    ],
  },
  non_refundable: {
    type: 'non_refundable',
    description: 'ไม่สามารถคืนเงินได้',
    rules: [
      { daysBeforeCheckIn: 0, refundPercent: 0, label: 'ไม่คืนเงินทุกกรณี' },
    ],
  },
  custom: {
    type: 'custom',
    description: 'กำหนดเอง',
    rules: [],
  },
};

export function calculateCancellation(
  policy: CancellationPolicy | PolicyType,
  checkInDate: string,
  paidAmount: number,
  cancelledAt: Date = new Date()
): CancellationResult {
  const policyObj = typeof policy === 'string' ? POLICIES[policy] : policy;
  const rules = policyObj.rules || POLICIES[policyObj.type]?.rules || [];

  const checkIn  = new Date(checkInDate + 'T14:00:00');
  const diffMs   = checkIn.getTime() - cancelledAt.getTime();
  const daysLeft = diffMs / (1000 * 60 * 60 * 24);

  if (daysLeft < 0) {
    // Already past check-in
    return { refundPercent: 0, refundAmount: 0, penaltyAmount: paidAmount, rule: 'เลย check-in แล้ว', canCancel: false };
  }

  // Find applicable rule (highest daysBeforeCheckIn that daysLeft >= rule.daysBeforeCheckIn)
  const sortedRules = [...rules].sort((a, b) => b.daysBeforeCheckIn - a.daysBeforeCheckIn);
  const applicable  = sortedRules.find(r => daysLeft >= r.daysBeforeCheckIn);

  if (!applicable) {
    return { refundPercent: 0, refundAmount: 0, penaltyAmount: paidAmount, rule: 'ไม่คืนเงิน', canCancel: true };
  }

  const refundAmount  = Math.round((paidAmount * applicable.refundPercent) / 100);
  const penaltyAmount = paidAmount - refundAmount;

  return {
    refundPercent:  applicable.refundPercent,
    refundAmount,
    penaltyAmount,
    rule:           applicable.label,
    canCancel:      true,
  };
}

export function getPolicyDescription(policy: PolicyType): string {
  return POLICIES[policy]?.description || 'กำหนดเอง';
}

export function getPolicyForRatePlan(ratePlanType: string): PolicyType {
  if (ratePlanType?.includes('non_refundable') || ratePlanType?.includes('nr')) return 'non_refundable';
  if (ratePlanType?.includes('flexible') || ratePlanType?.includes('flex'))   return 'flexible';
  if (ratePlanType?.includes('moderate'))                                       return 'moderate';
  if (ratePlanType?.includes('strict'))                                         return 'strict';
  return 'flexible'; // default
}
