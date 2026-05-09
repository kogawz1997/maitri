/**
 * Unit Tests: Cancellation Policy Engine
 * Run: npx jest tests/unit/cancellation-policy.test.ts
 */
import { calculateCancellation, POLICIES } from '@/lib/booking/cancellation-policy';

describe('Cancellation Policy', () => {

  const paidAmount = 3000;

  describe('flexible policy', () => {
    it('gives 100% refund if cancelled 2 days before', () => {
      const checkIn    = getFutureDate(2);
      const cancelAt   = new Date();
      const result     = calculateCancellation('flexible', checkIn, paidAmount, cancelAt);
      expect(result.refundPercent).toBe(100);
      expect(result.refundAmount).toBe(3000);
      expect(result.penaltyAmount).toBe(0);
      expect(result.canCancel).toBe(true);
    });

    it('gives 0% refund if cancelled same day', () => {
      const checkIn = getFutureDate(0.5); // 12 hours from now
      const result  = calculateCancellation('flexible', checkIn, paidAmount);
      expect(result.refundPercent).toBe(0);
      expect(result.refundAmount).toBe(0);
    });
  });

  describe('moderate policy', () => {
    it('gives 100% refund if cancelled 7 days before', () => {
      const result = calculateCancellation('moderate', getFutureDate(7), paidAmount);
      expect(result.refundPercent).toBe(100);
    });

    it('gives 50% refund if cancelled 3 days before', () => {
      const result = calculateCancellation('moderate', getFutureDate(3), paidAmount);
      expect(result.refundPercent).toBe(50);
      expect(result.refundAmount).toBe(1500);
      expect(result.penaltyAmount).toBe(1500);
    });

    it('gives 0% refund if cancelled day of', () => {
      const result = calculateCancellation('moderate', getFutureDate(0.2), paidAmount);
      expect(result.refundPercent).toBe(0);
    });
  });

  describe('strict policy', () => {
    it('gives 100% refund if cancelled 20 days before', () => {
      const result = calculateCancellation('strict', getFutureDate(20), paidAmount);
      expect(result.refundPercent).toBe(100);
    });

    it('gives 50% refund if cancelled 10 days before', () => {
      const result = calculateCancellation('strict', getFutureDate(10), paidAmount);
      expect(result.refundPercent).toBe(50);
    });

    it('gives 0% refund if cancelled 5 days before', () => {
      const result = calculateCancellation('strict', getFutureDate(5), paidAmount);
      expect(result.refundPercent).toBe(0);
    });
  });

  describe('non_refundable policy', () => {
    it('never refunds', () => {
      const result = calculateCancellation('non_refundable', getFutureDate(365), paidAmount);
      expect(result.refundPercent).toBe(0);
      expect(result.canCancel).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('handles past check-in date', () => {
      const result = calculateCancellation('flexible', '2020-01-01', paidAmount);
      expect(result.canCancel).toBe(false);
      expect(result.refundAmount).toBe(0);
    });

    it('refund never exceeds paid amount', () => {
      const result = calculateCancellation('flexible', getFutureDate(5), paidAmount);
      expect(result.refundAmount).toBeLessThanOrEqual(paidAmount);
    });
  });
});

function getFutureDate(daysFromNow: number): string {
  const d = new Date(Date.now() + daysFromNow * 86400000);
  return d.toISOString().slice(0, 10);
}
