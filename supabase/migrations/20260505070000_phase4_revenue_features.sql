-- ============================================
-- Phase 4 Revenue Features: F&B POS, Spa, Analytics indexes, invoice hardening
-- ============================================

ALTER TABLE fb_orders
  ADD COLUMN IF NOT EXISTS posted_to_folio_at TIMESTAMPTZ;

ALTER TABLE spa_bookings
  ADD COLUMN IF NOT EXISTS posted_to_folio_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS fb_orders_hotel_status_created_idx
  ON fb_orders(hotel_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS fb_orders_reservation_idx
  ON fb_orders(reservation_id);

CREATE INDEX IF NOT EXISTS fb_order_items_order_idx
  ON fb_order_items(order_id);

CREATE INDEX IF NOT EXISTS fb_menu_items_outlet_available_idx
  ON fb_menu_items(outlet_id, available);

CREATE INDEX IF NOT EXISTS spa_bookings_hotel_time_idx
  ON spa_bookings(hotel_id, start_time, end_time);

CREATE INDEX IF NOT EXISTS spa_bookings_therapist_time_idx
  ON spa_bookings(therapist_id, start_time, end_time)
  WHERE therapist_id IS NOT NULL AND status NOT IN ('cancelled', 'no_show');

CREATE INDEX IF NOT EXISTS spa_services_hotel_active_idx
  ON spa_services(hotel_id, active);

CREATE INDEX IF NOT EXISTS payments_hotel_created_status_idx
  ON payments(hotel_id, created_at DESC, status);

CREATE INDEX IF NOT EXISTS invoices_payment_lookup_idx
  ON invoices(hotel_id, reservation_id, created_at DESC);

-- RLS policies for phase-4 tables were already enabled in base schema.
-- This patch makes WITH CHECK explicit so writes cannot cross tenant borders.
DROP POLICY IF EXISTS "hotel_data_isolation" ON fb_outlets;
CREATE POLICY "hotel_data_isolation" ON fb_outlets FOR ALL
  USING (hotel_id IN (SELECT id FROM hotels WHERE organization_id = auth.user_organization_id()))
  WITH CHECK (hotel_id IN (SELECT id FROM hotels WHERE organization_id = auth.user_organization_id()));

DROP POLICY IF EXISTS "fb_categories_via_outlet" ON fb_menu_categories;
CREATE POLICY "fb_categories_via_outlet" ON fb_menu_categories FOR ALL
  USING (outlet_id IN (SELECT id FROM fb_outlets WHERE hotel_id IN (SELECT id FROM hotels WHERE organization_id = auth.user_organization_id())))
  WITH CHECK (outlet_id IN (SELECT id FROM fb_outlets WHERE hotel_id IN (SELECT id FROM hotels WHERE organization_id = auth.user_organization_id())));

DROP POLICY IF EXISTS "fb_items_via_outlet" ON fb_menu_items;
CREATE POLICY "fb_items_via_outlet" ON fb_menu_items FOR ALL
  USING (outlet_id IN (SELECT id FROM fb_outlets WHERE hotel_id IN (SELECT id FROM hotels WHERE organization_id = auth.user_organization_id())))
  WITH CHECK (outlet_id IN (SELECT id FROM fb_outlets WHERE hotel_id IN (SELECT id FROM hotels WHERE organization_id = auth.user_organization_id())));

DROP POLICY IF EXISTS "hotel_data_isolation" ON fb_orders;
CREATE POLICY "hotel_data_isolation" ON fb_orders FOR ALL
  USING (hotel_id IN (SELECT id FROM hotels WHERE organization_id = auth.user_organization_id()))
  WITH CHECK (hotel_id IN (SELECT id FROM hotels WHERE organization_id = auth.user_organization_id()));

DROP POLICY IF EXISTS "fb_order_items_via_order" ON fb_order_items;
CREATE POLICY "fb_order_items_via_order" ON fb_order_items FOR ALL
  USING (order_id IN (SELECT id FROM fb_orders WHERE hotel_id IN (SELECT id FROM hotels WHERE organization_id = auth.user_organization_id())))
  WITH CHECK (order_id IN (SELECT id FROM fb_orders WHERE hotel_id IN (SELECT id FROM hotels WHERE organization_id = auth.user_organization_id())));

DROP POLICY IF EXISTS "hotel_data_isolation" ON spa_services;
CREATE POLICY "hotel_data_isolation" ON spa_services FOR ALL
  USING (hotel_id IN (SELECT id FROM hotels WHERE organization_id = auth.user_organization_id()))
  WITH CHECK (hotel_id IN (SELECT id FROM hotels WHERE organization_id = auth.user_organization_id()));

DROP POLICY IF EXISTS "hotel_data_isolation" ON spa_therapists;
CREATE POLICY "hotel_data_isolation" ON spa_therapists FOR ALL
  USING (hotel_id IN (SELECT id FROM hotels WHERE organization_id = auth.user_organization_id()))
  WITH CHECK (hotel_id IN (SELECT id FROM hotels WHERE organization_id = auth.user_organization_id()));

DROP POLICY IF EXISTS "hotel_data_isolation" ON spa_bookings;
CREATE POLICY "hotel_data_isolation" ON spa_bookings FOR ALL
  USING (hotel_id IN (SELECT id FROM hotels WHERE organization_id = auth.user_organization_id()))
  WITH CHECK (hotel_id IN (SELECT id FROM hotels WHERE organization_id = auth.user_organization_id()));
