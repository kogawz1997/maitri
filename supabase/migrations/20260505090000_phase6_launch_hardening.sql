-- Phase 6: Launch readiness / operational hardening

create table if not exists public.launch_check_runs (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid references public.hotels(id) on delete cascade,
  status text not null default 'pending',
  checks jsonb not null default '{}'::jsonb,
  created_by uuid,
  created_at timestamptz not null default now()
);

create index if not exists launch_check_runs_hotel_created_idx
  on public.launch_check_runs(hotel_id, created_at desc);

alter table public.launch_check_runs enable row level security;

do $$ begin
  create policy launch_check_runs_isolation on public.launch_check_runs
    for all using (
      hotel_id in (
        select h.id from public.hotels h
        join public.user_profiles up on up.organization_id = h.organization_id
        where up.id = auth.uid()
      )
    )
    with check (
      hotel_id in (
        select h.id from public.hotels h
        join public.user_profiles up on up.organization_id = h.organization_id
        where up.id = auth.uid()
      )
    );
exception when duplicate_object then null;
end $$;

create index if not exists operational_events_hotel_severity_created_idx
  on public.operational_events(hotel_id, severity, created_at desc);

create index if not exists audit_logs_hotel_created_idx
  on public.audit_logs(hotel_id, created_at desc);
