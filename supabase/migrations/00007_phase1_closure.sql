-- ============================================
-- Phase 1 Closure
-- Auth/onboarding durability, role-aware tenant isolation, and final hot-path indexes.
-- Safe to run after previous migrations.
-- ============================================

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

-- Keep policy rewrites idempotent. Yes, SQL makes us do this dance like it's 1998.
DROP POLICY IF EXISTS "profiles_same_org_select" ON user_profiles;
DROP POLICY IF EXISTS "profiles_self_update" ON user_profiles;
DROP POLICY IF EXISTS "profiles_org_admin_update" ON user_profiles;
DROP POLICY IF EXISTS "profiles_self_insert" ON user_profiles;

CREATE POLICY "profiles_same_org_select" ON user_profiles FOR SELECT
  USING (id = auth.uid() OR organization_id = auth.user_organization_id());

CREATE POLICY "profiles_self_update" ON user_profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    AND organization_id = auth.user_organization_id()
  );

CREATE POLICY "profiles_org_admin_update" ON user_profiles FOR UPDATE
  USING (
    organization_id = auth.user_organization_id()
    AND EXISTS (
      SELECT 1 FROM user_profiles p
      WHERE p.id = auth.uid()
        AND p.organization_id = auth.user_organization_id()
        AND p.role IN ('owner', 'admin')
        AND p.active = true
    )
  )
  WITH CHECK (organization_id = auth.user_organization_id());

-- Invited users may create/update their own profile only inside the org embedded in auth metadata.
CREATE POLICY "profiles_self_insert" ON user_profiles FOR INSERT
  WITH CHECK (
    id = auth.uid()
    AND organization_id::text = COALESCE(auth.jwt() -> 'user_metadata' ->> 'organization_id', organization_id::text)
  );

-- Tighten common hotel-data policies so writes cannot hop hotel_id across tenants.
DROP POLICY IF EXISTS "hotel_data_isolation" ON reservations;
CREATE POLICY "hotel_data_isolation" ON reservations FOR ALL
  USING (hotel_id IN (SELECT id FROM hotels WHERE organization_id = auth.user_organization_id()))
  WITH CHECK (hotel_id IN (SELECT id FROM hotels WHERE organization_id = auth.user_organization_id()));

DROP POLICY IF EXISTS "hotel_data_isolation" ON guests;
CREATE POLICY "hotel_data_isolation" ON guests FOR ALL
  USING (hotel_id IN (SELECT id FROM hotels WHERE organization_id = auth.user_organization_id()))
  WITH CHECK (hotel_id IN (SELECT id FROM hotels WHERE organization_id = auth.user_organization_id()));

DROP POLICY IF EXISTS "hotel_data_isolation" ON conversations;
CREATE POLICY "hotel_data_isolation" ON conversations FOR ALL
  USING (hotel_id IN (SELECT id FROM hotels WHERE organization_id = auth.user_organization_id()))
  WITH CHECK (hotel_id IN (SELECT id FROM hotels WHERE organization_id = auth.user_organization_id()));

DROP POLICY IF EXISTS "messages_via_conversation" ON messages;
CREATE POLICY "messages_via_conversation" ON messages FOR ALL
  USING (conversation_id IN (
    SELECT id FROM conversations WHERE hotel_id IN (
      SELECT id FROM hotels WHERE organization_id = auth.user_organization_id()
    )
  ))
  WITH CHECK (conversation_id IN (
    SELECT id FROM conversations WHERE hotel_id IN (
      SELECT id FROM hotels WHERE organization_id = auth.user_organization_id()
    )
  ));

-- Core uniqueness/performance guards for onboarding and dashboard.
CREATE UNIQUE INDEX IF NOT EXISTS user_profiles_email_org_unique
  ON user_profiles(organization_id, lower(email))
  WHERE organization_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS user_profiles_org_role_active_idx
  ON user_profiles(organization_id, role, active);

CREATE INDEX IF NOT EXISTS hotels_org_created_idx
  ON hotels(organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS room_types_hotel_created_idx
  ON room_types(hotel_id, created_at DESC);

CREATE INDEX IF NOT EXISTS rooms_hotel_status_type_idx
  ON rooms(hotel_id, status, room_type_id);

CREATE INDEX IF NOT EXISTS reservations_hotel_checkin_status_idx
  ON reservations(hotel_id, check_in, status);

CREATE INDEX IF NOT EXISTS reservations_hotel_checkout_status_idx
  ON reservations(hotel_id, check_out, status);

CREATE INDEX IF NOT EXISTS guests_hotel_email_phone_idx
  ON guests(hotel_id, lower(email), phone);
