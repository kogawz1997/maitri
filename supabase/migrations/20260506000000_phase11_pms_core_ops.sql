-- ============================================
-- Phase 11 — PMS Core Operations Closure
-- Deposit/partial payments, cancellation policy, no-show metadata,
-- folio split/merge, housekeeping mobile support, and overbooking guard.
-- ============================================

CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS deposit_amount DECIMAL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cancellation_policy JSONB,
  ADD COLUMN IF NOT EXISTS cancellation_quote JSONB,
  ADD COLUMN IF NOT EXISTS no_show_marked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS extended_from_checkout DATE;

ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS payment_purpose TEXT DEFAULT 'partial'
    CHECK (payment_purpose IN ('deposit', 'partial', 'balance', 'refund'));

ALTER TABLE folios
  ADD COLUMN IF NOT EXISTS split_from_folio_id UUID REFERENCES folios(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS merged_into_folio_id UUID REFERENCES folios(id) ON DELETE SET NULL;

ALTER TABLE housekeeping_tasks
  ADD COLUMN IF NOT EXISTS source_reservation_id UUID REFERENCES reservations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS due_date DATE,
  ADD COLUMN IF NOT EXISTS completed_by UUID REFERENCES user_profiles(id),
  ADD COLUMN IF NOT EXISTS mobile_notes JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS photo_urls TEXT[] DEFAULT '{}';

CREATE INDEX IF NOT EXISTS reservations_active_room_overlap_idx
  ON reservations USING gist (hotel_id, room_id, daterange(check_in, check_out, '[)'))
  WHERE room_id IS NOT NULL AND status IN ('pending', 'confirmed', 'checked_in', 'on_hold');

CREATE INDEX IF NOT EXISTS reservations_active_room_type_overlap_idx
  ON reservations(hotel_id, room_type_id, check_in, check_out, status)
  WHERE status IN ('pending', 'confirmed', 'checked_in', 'on_hold');

CREATE INDEX IF NOT EXISTS housekeeping_tasks_mobile_idx
  ON housekeeping_tasks(hotel_id, status, due_date, priority);

CREATE UNIQUE INDEX IF NOT EXISTS housekeeping_turnover_once_per_reservation_idx
  ON housekeeping_tasks(source_reservation_id, task_type)
  WHERE source_reservation_id IS NOT NULL AND task_type = 'turnover';

CREATE OR REPLACE FUNCTION prevent_reservation_overbooking()
RETURNS TRIGGER AS $$
DECLARE
  room_capacity INT;
  overlapping_count INT;
BEGIN
  IF NEW.status NOT IN ('pending', 'confirmed', 'checked_in', 'on_hold') THEN
    RETURN NEW;
  END IF;

  IF NEW.check_out <= NEW.check_in THEN
    RAISE EXCEPTION 'Invalid stay dates: check_out must be after check_in';
  END IF;

  -- Exact room lock: one room cannot have overlapping active reservations.
  IF NEW.room_id IS NOT NULL THEN
    PERFORM pg_advisory_xact_lock(hashtext(NEW.hotel_id::text || ':' || NEW.room_id::text));

    IF EXISTS (
      SELECT 1 FROM reservations r
      WHERE r.hotel_id = NEW.hotel_id
        AND r.room_id = NEW.room_id
        AND r.id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
        AND r.status IN ('pending', 'confirmed', 'checked_in', 'on_hold')
        AND daterange(r.check_in, r.check_out, '[)') && daterange(NEW.check_in, NEW.check_out, '[)')
    ) THEN
      RAISE EXCEPTION 'Room is already booked for these dates';
    END IF;
  END IF;

  -- Room type inventory lock for unassigned bookings.
  PERFORM pg_advisory_xact_lock(hashtext(NEW.hotel_id::text || ':' || NEW.room_type_id::text));

  SELECT COUNT(*) INTO room_capacity
  FROM rooms
  WHERE hotel_id = NEW.hotel_id
    AND room_type_id = NEW.room_type_id
    AND status NOT IN ('maintenance', 'blocked', 'out_of_order');

  SELECT COUNT(*) INTO overlapping_count
  FROM reservations r
  WHERE r.hotel_id = NEW.hotel_id
    AND r.room_type_id = NEW.room_type_id
    AND r.id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
    AND r.status IN ('pending', 'confirmed', 'checked_in', 'on_hold')
    AND daterange(r.check_in, r.check_out, '[)') && daterange(NEW.check_in, NEW.check_out, '[)');

  IF overlapping_count >= room_capacity THEN
    RAISE EXCEPTION 'No rooms available for these dates';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_reservation_overbooking ON reservations;
CREATE TRIGGER trg_prevent_reservation_overbooking
BEFORE INSERT OR UPDATE OF room_id, room_type_id, check_in, check_out, status
ON reservations
FOR EACH ROW
EXECUTE FUNCTION prevent_reservation_overbooking();

CREATE OR REPLACE FUNCTION recalculate_folio_totals(p_folio_id UUID)
RETURNS VOID AS $$
DECLARE
  charges NUMERIC;
  payments NUMERIC;
BEGIN
  SELECT
    COALESCE(SUM(CASE WHEN type IN ('payment', 'refund') THEN 0 ELSE amount * quantity END), 0),
    COALESCE(SUM(CASE WHEN type IN ('payment', 'refund') THEN ABS(amount * quantity) ELSE 0 END), 0)
  INTO charges, payments
  FROM folio_items
  WHERE folio_id = p_folio_id;

  UPDATE folios
  SET total_charges = charges,
      total_payments = payments,
      balance = charges - payments
  WHERE id = p_folio_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION auto_create_checkout_housekeeping()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'checked_out' AND OLD.status IS DISTINCT FROM 'checked_out' AND NEW.room_id IS NOT NULL THEN
    INSERT INTO housekeeping_tasks(hotel_id, room_id, source_reservation_id, task_type, priority, status, notes, due_date)
    VALUES(NEW.hotel_id, NEW.room_id, NEW.id, 'turnover', 'high', 'pending', 'Auto-created after checkout', CURRENT_DATE)
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_auto_create_checkout_housekeeping ON reservations;
CREATE TRIGGER trg_auto_create_checkout_housekeeping
AFTER UPDATE OF status ON reservations
FOR EACH ROW
EXECUTE FUNCTION auto_create_checkout_housekeeping();
