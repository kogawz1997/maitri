-- Phase 7: Go-live operational hardening

create table if not exists public.go_live_checks (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid references public.hotels(id) on delete cascade,
  check_key text not null,
  status text not null default 'pending' check (status in ('pending', 'passed', 'failed', 'waived')),
  notes text,
  checked_by uuid,
  checked_at timestamptz default now(),
  created_at timestamptz default now(),
  unique (hotel_id, check_key)
);

create index if not exists go_live_checks_hotel_status_idx on public.go_live_checks(hotel_id, status);
create index if not exists operational_events_type_created_idx on public.operational_events(event_type, created_at desc);

alter table public.go_live_checks enable row level security;

do $$ begin
  create policy go_live_checks_hotel_access on public.go_live_checks
    for all using (
      hotel_id in (
        select h.id
        from public.hotels h
        join public.user_profiles up on up.organization_id = h.organization_id
        where up.id = auth.uid()
      )
    )
    with check (
      hotel_id in (
        select h.id
        from public.hotels h
        join public.user_profiles up on up.organization_id = h.organization_id
        where up.id = auth.uid()
      )
    );
exception when duplicate_object then null;
end $$;
