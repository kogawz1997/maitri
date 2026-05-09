import assert from 'node:assert/strict';
import { forecastRevenue, predictOccupancy, pricingSuggestion, routeIntent, shouldEscalate, suggestedReply } from '../../src/lib/ai/assistant.js';

assert.equal(routeIntent('customer asks for refund'), 'escalate_human');
assert.equal(routeIntent('need room availability'), 'reservation');
assert.equal(routeIntent('need better price'), 'pricing');
assert.equal(shouldEscalate('general', 'negative'), true);
assert.equal(typeof suggestedReply('pricing'), 'string');
assert.deepEqual(forecastRevenue({ baseRevenue: 100, growthRate: 0.1, periods: 2 }), [110, 121]);
assert.equal(predictOccupancy({ current: 0.6, leadDemand: 0.2, seasonality: 0.1 }), 0.9);
assert.equal(pricingSuggestion({ baseRate: 1000, occupancy: 0.9 }).suggestedRate, 1200);

console.log('ai assistant tests passed');
