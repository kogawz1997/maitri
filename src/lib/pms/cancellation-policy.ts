import { differenceInCalendarDays, parseISO } from 'date-fns';

export type CancellationPolicy = {
  freeUntilDaysBefore?: number;
  penaltyType?: 'none' | 'fixed' | 'percentage' | 'first_night' | 'full_stay';
  penaltyAmount?: number;
  firstNightAmount?: number;
  nonRefundable?: boolean;
};

export type CancellationQuote = {
  refundableAmount: number;
  penaltyAmount: number;
  isFreeCancellation: boolean;
  reason: string;
};

export function calculateCancellationQuote(params: {
  checkIn: string;
  totalAmount: number;
  paidAmount?: number;
  policy?: CancellationPolicy | null;
  now?: Date;
}): CancellationQuote {
  const policy = params.policy || { freeUntilDaysBefore: 1, penaltyType: 'none' };
  const paidAmount = Math.max(0, Number(params.paidAmount || 0));
  const totalAmount = Math.max(0, Number(params.totalAmount || 0));
  const daysBefore = differenceInCalendarDays(parseISO(params.checkIn), params.now || new Date());

  if (policy.nonRefundable) {
    return { refundableAmount: 0, penaltyAmount: paidAmount, isFreeCancellation: false, reason: 'non_refundable' };
  }

  const freeUntil = Number(policy.freeUntilDaysBefore ?? 1);
  if (daysBefore >= freeUntil) {
    return { refundableAmount: paidAmount, penaltyAmount: 0, isFreeCancellation: true, reason: 'free_cancellation_window' };
  }

  let penalty = 0;
  switch (policy.penaltyType || 'none') {
    case 'fixed': penalty = Number(policy.penaltyAmount || 0); break;
    case 'percentage': penalty = totalAmount * (Number(policy.penaltyAmount || 0) / 100); break;
    case 'first_night': penalty = Number(policy.firstNightAmount || totalAmount); break;
    case 'full_stay': penalty = totalAmount; break;
    case 'none': default: penalty = 0;
  }

  penalty = Math.min(paidAmount, Math.max(0, penalty));
  return {
    refundableAmount: Math.max(0, paidAmount - penalty),
    penaltyAmount: penalty,
    isFreeCancellation: penalty === 0,
    reason: 'policy_penalty_applied',
  };
}
