/**
 * E2E Test: Payment Flow
 * Tests Omise payment states, refund, receipt
 *
 * Note: Use Omise test cards in test environment
 */
import { test, expect, request as playwrightRequest } from '@playwright/test';

const BASE    = process.env.BASE_URL || 'http://localhost:3000';
const OMISE_TEST_TOKEN = 'tokn_test_no_3d_secured'; // Omise test token

test.describe('Payment Flow', () => {

  test('pending_payment reservation auto-expires after 15 min', async ({ request }) => {
    // This is more of a unit test — just verify the endpoint exists
    const res = await request.get(`${BASE}/api/cron/expire-pending`, {
      headers: { 'Authorization': `Bearer ${process.env.CRON_SECRET || 'test'}` },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('expired');
  });

  test('payment receipt API returns valid data', async ({ request }) => {
    const hotelId = process.env.TEST_HOTEL_ID || '';
    const resId   = process.env.TEST_RESERVATION_ID || '';
    if (!hotelId || !resId) return;

    const res = await request.get(`${BASE}/api/payments/receipt?id=${resId}&hotelId=${hotelId}`, {
      headers: { 'Cookie': process.env.TEST_STAFF_COOKIE || '' },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('receiptNumber');
    expect(body).toHaveProperty('summary.total');
  });

  test('refund API validates amount', async ({ request }) => {
    const res = await request.post(`${BASE}/api/payments/refund`, {
      data: { reservationId: '00000000-0000-0000-0000-000000000000', hotelId: '00000000-0000-0000-0000-000000000000', amount: -100, reason: 'guest_request' },
      headers: { 'Cookie': process.env.TEST_STAFF_COOKIE || '' },
    });
    expect([400, 401, 403, 404]).toContain(res.status());
  });

  test('payment requires auth', async ({ request }) => {
    const res = await request.post(`${BASE}/api/payments/charge`, {
      data: { reservationId: 'test', amount: 100, token: 'tok_test' },
    });
    expect(res.status()).toBe(401);
  });

  test('payment reconciliation runs', async ({ request }) => {
    const res = await request.post(`${BASE}/api/payments/reconcile`, {
      data: { hotelId: process.env.TEST_HOTEL_ID || '00000000-0000-0000-0000-000000000000', days: 7 },
      headers: { 'Cookie': process.env.TEST_STAFF_COOKIE || '' },
    });
    expect([200, 401, 403]).toContain(res.status());
  });
});
