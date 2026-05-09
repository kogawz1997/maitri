export function routeIntent(message = '') {
  const text = String(message).toLowerCase();
  if (/cancel|refund|chargeback|complain|angry/.test(text)) return 'escalate_human';
  if (/price|rate|discount|promotion/.test(text)) return 'pricing';
  if (/book|availability|room/.test(text)) return 'reservation';
  return 'general';
}

export function shouldEscalate(intent, sentiment = 'neutral') {
  return intent === 'escalate_human' || sentiment === 'negative';
}

export function suggestedReply(intent) {
  const map = {
    escalate_human: 'ขอบคุณที่แจ้งครับ เดี๋ยวทีมเจ้าหน้าที่จะติดต่อกลับโดยด่วน',
    pricing: 'ได้เลยครับ ผมช่วยแนะนำราคาที่เหมาะกับช่วงวันที่คุณต้องการได้',
    reservation: 'ผมช่วยเช็คห้องว่างและทำรายการจองให้ได้ทันทีครับ',
    general: 'ยินดีช่วยเหลือครับ บอกผมเพิ่มเติมได้เลย',
  };
  return map[intent] || map.general;
}

export function forecastRevenue({ baseRevenue = 0, growthRate = 0.05, periods = 3 } = {}) {
  const out = [];
  let value = Number(baseRevenue);
  for (let i = 1; i <= periods; i += 1) {
    value = value * (1 + growthRate);
    out.push(Number(value.toFixed(2)));
  }
  return out;
}

export function predictOccupancy({ current = 0.6, leadDemand = 0.1, seasonality = 0 } = {}) {
  const predicted = Math.max(0, Math.min(1, current + leadDemand + seasonality));
  return Number(predicted.toFixed(3));
}

export function pricingSuggestion({ baseRate = 1000, occupancy = 0.6 } = {}) {
  const multiplier = occupancy >= 0.85 ? 1.2 : occupancy <= 0.45 ? 0.9 : 1.0;
  return {
    multiplier,
    suggestedRate: Math.round(baseRate * multiplier),
  };
}
