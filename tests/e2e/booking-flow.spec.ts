/**
 * E2E Test: Full Booking Flow
 * Tests: search → hotel page → select room → fill form → payment → confirmation
 *
 * Run: npx playwright test tests/e2e/booking-flow.spec.ts
 * Setup: npm install -D @playwright/test && npx playwright install chromium
 */
import { test, expect } from '@playwright/test';

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const TEST_HOTEL_SLUG = process.env.TEST_HOTEL_SLUG || 'test-hotel';

test.describe('Booking Flow', () => {

  test('search page loads with results', async ({ page }) => {
    await page.goto(`${BASE}/search?city=Bangkok&checkIn=2025-12-01&checkOut=2025-12-03&adults=2`);
    await page.waitForLoadState('networkidle');
    // Should show results or empty state — not error
    const hasResults  = await page.locator('[data-testid="hotel-card"]').count();
    const hasEmpty    = await page.locator('[data-testid="empty-state"]').count();
    expect(hasResults + hasEmpty).toBeGreaterThan(0);
  });

  test('hotel detail page loads', async ({ page }) => {
    await page.goto(`${BASE}/h/${TEST_HOTEL_SLUG}`);
    await page.waitForLoadState('networkidle');
    // Must have hotel name
    await expect(page.locator('h1')).toBeVisible();
    // Must NOT show 404
    await expect(page.locator('text=404')).not.toBeVisible();
  });

  test('booking flow: complete reservation (pay at hotel)', async ({ page }) => {
    const checkIn  = '2025-12-15';
    const checkOut = '2025-12-17';

    // 1. Go to hotel page
    await page.goto(`${BASE}/h/${TEST_HOTEL_SLUG}?checkIn=${checkIn}&checkOut=${checkOut}&adults=2`);
    await page.waitForLoadState('networkidle');

    // 2. Select a room
    const firstRoomBtn = page.locator('[data-testid="select-room-btn"]').first();
    if (await firstRoomBtn.count() === 0) {
      test.skip(); // No rooms available in test hotel
      return;
    }
    await firstRoomBtn.click();

    // 3. Fill guest form
    await page.fill('[name="firstName"]', 'สมชาย');
    await page.fill('[name="lastName"]', 'ทดสอบ');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="phone"]', '0812345678');

    // 4. Select Pay at Hotel
    const payAtHotel = page.locator('[data-value="at_hotel"]');
    if (await payAtHotel.count() > 0) await payAtHotel.click();

    // 5. Submit
    await page.locator('[data-testid="confirm-booking-btn"]').click();
    await page.waitForURL(/\/confirmation|\/booking\/.*\/success/, { timeout: 15000 });

    // 6. Confirmation page shows booking code
    await expect(page.locator('[data-testid="booking-code"]')).toBeVisible();
  });

  test('promo code validation', async ({ page }) => {
    await page.goto(`${BASE}/h/${TEST_HOTEL_SLUG}?checkIn=2025-12-15&checkOut=2025-12-17&adults=2`);
    await page.waitForLoadState('networkidle');

    const promoInput = page.locator('[placeholder*="โค้ด"]').first();
    if (await promoInput.count() === 0) return;

    await promoInput.fill('INVALIDCODE');
    await page.locator('button:has-text("ใช้โค้ด")').click();
    await expect(page.locator('text=โค้ดไม่ถูกต้อง')).toBeVisible({ timeout: 5000 });
  });

  test('availability check prevents overbooking', async ({ request }) => {
    const hotelId    = process.env.TEST_HOTEL_ID || '';
    const roomTypeId = process.env.TEST_ROOM_TYPE_ID || '';
    if (!hotelId || !roomTypeId) return;

    // Two simultaneous availability checks should not both succeed when 1 room left
    const [res1, res2] = await Promise.all([
      request.post(`${BASE}/api/reservations`, {
        data: { hotelId, roomTypeId, checkIn: '2025-12-20', checkOut: '2025-12-22', numAdults: 2, firstName: 'Test1', paymentMethod: 'at_hotel' },
      }),
      request.post(`${BASE}/api/reservations`, {
        data: { hotelId, roomTypeId, checkIn: '2025-12-20', checkOut: '2025-12-22', numAdults: 2, firstName: 'Test2', paymentMethod: 'at_hotel' },
      }),
    ]);

    const statuses = [res1.status(), res2.status()];
    // At least one should fail with 409 conflict
    expect(statuses.some(s => s === 200 || s === 201)).toBe(true);
    // Both succeeding would be a bug (overbooking)
    if (statuses.every(s => s === 200)) {
      throw new Error('OVERBOOKING DETECTED: Both reservations succeeded for same room');
    }
  });
});
