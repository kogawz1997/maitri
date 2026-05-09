export type VatBreakdown = {
  subtotal: number;
  vatRate: number;
  vatAmount: number;
  totalBeforeAdjustments: number;
  adjustments: number;
  total: number;
};

const round2 = (n: number) => Math.round(n * 100) / 100;

export function calculateVatBreakdown(params: {
  positiveItemsTotal: number;
  adjustments?: number;
  vatRate?: number;
}) : VatBreakdown {
  const subtotal = Math.max(0, Number(params.positiveItemsTotal || 0));
  const adjustments = Number(params.adjustments || 0);
  const vatRate = Number.isFinite(params.vatRate) ? Number(params.vatRate) : 0.07;

  const vatAmount = round2(subtotal * vatRate);
  const totalBeforeAdjustments = round2(subtotal + vatAmount);
  const total = round2(totalBeforeAdjustments + adjustments);

  return {
    subtotal: round2(subtotal),
    vatRate,
    vatAmount,
    totalBeforeAdjustments,
    adjustments: round2(adjustments),
    total,
  };
}
