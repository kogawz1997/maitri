/**
 * E2E Test: Tenant Isolation (Security Critical)
 * Hotel A staff must NOT be able to access Hotel B data
 *
 * Run with two test accounts in different organizations
 */
import { test, expect } from '@playwright/test';

const BASE = process.env.BASE_URL || 'http://localhost:3000';

test.describe('Tenant Isolation', () => {

  test('staff cannot access another hotel reservations', async ({ request }) => {
    const hotelA_id     = process.env.TEST_HOTEL_A_ID || '';
    const hotelB_id     = process.env.TEST_HOTEL_B_ID || '';
    const staffA_cookie = process.env.TEST_STAFF_A_COOKIE || '';
    if (!hotelA_id || !hotelB_id || !staffA_cookie) {
      test.skip();
      return;
    }

    // Staff A should NOT be able to read Hotel B reservations
    const res = await request.get(`${BASE}/api/reservations?hotelId=${hotelB_id}`, {
      headers: { 'Cookie': staffA_cookie },
    });
    expect(res.status()).toBe(403);
  });

  test('staff cannot modify another hotel rooms', async ({ request }) => {
    const hotelB_id     = process.env.TEST_HOTEL_B_ID || '';
    const staffA_cookie = process.env.TEST_STAFF_A_COOKIE || '';
    if (!hotelB_id || !staffA_cookie) { test.skip(); return; }

    const res = await request.patch(`${BASE}/api/rooms/status`, {
      data: { hotelId: hotelB_id, roomId: 'any', status: 'dirty' },
      headers: { 'Cookie': staffA_cookie },
    });
    expect(res.status()).toBe(403);
  });

  test('public API does not expose private hotel data', async ({ request }) => {
    const res = await request.get(`${BASE}/api/public/search?city=Bangkok`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    // Should not include sensitive fields
    const hotels = body.hotels || [];
    for (const h of hotels) {
      expect(h).not.toHaveProperty('stripe_customer_id');
      expect(h).not.toHaveProperty('omise_secret_key');
      expect(h).not.toHaveProperty('organization_id');
    }
  });

  test('guest cannot access staff dashboard', async ({ page }) => {
    // Try to access dashboard without staff auth
    await page.goto(`${BASE}/dashboard`);
    await page.waitForURL(/auth\/login|portal\/login/, { timeout: 5000 });
    expect(page.url()).toMatch(/login/);
  });

  test('different orgs data never mixes in API responses', async ({ request }) => {
    const hotelA_id = process.env.TEST_HOTEL_A_ID || '';
    const hotelB_id = process.env.TEST_HOTEL_B_ID || '';
    const staffA_cookie = process.env.TEST_STAFF_A_COOKIE || '';
    if (!hotelA_id || !staffA_cookie) { test.skip(); return; }

    const res = await request.get(`${BASE}/api/reservations?hotelId=${hotelA_id}`, {
      headers: { 'Cookie': staffA_cookie },
    });
    if (res.status() !== 200) return;
    const body = await res.json();
    for (const r of body.reservations || []) {
      expect(r.hotel_id).toBe(hotelA_id);
    }
  });
});
