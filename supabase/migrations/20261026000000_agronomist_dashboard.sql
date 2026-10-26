-- Agronomist dashboard records and row-level access.
--
-- Apply this migration with the Supabase CLI or paste it into the SQL editor.
-- It creates one audited record table for the dashboard's editable modules:
-- input products, agronomist contacts, farmers, recommendations, pest reports,
-- messages, follow-ups and insurance products.
--
-- Access model:
--   * Reference records (products, contacts, insurance) are readable without a
--     account, so a visitor can see the catalogue before signing in.
--   * Farmer-linked records are readable only by an authenticated account whose
--     app_metadata.role is "agronomist".
--   * Every write requires the same role. The server functions check it too.
--
-- Grant the role in the Supabase dashboard (Authentication > Users) or with:
--   update auth.users
--      set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
--                              || '{"role":"agronomist"}'::jsonb
--    where email = 'officer@example.org';

create extension if not exists pgcrypto;

create table if not exists public.agronomist_records (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (
    kind in (
      'product',
      'contact',
      'farmer',
      'recommendation',
      'pest',
      'message',
      'followUp',
      'insurance'
    )
  ),
  data jsonb not null default '{}'::jsonb,
  created_by uuid default auth.uid(),
  created_by_name text,
  updated_by uuid default auth.uid(),
  updated_by_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists agronomist_records_kind_idx
  on public.agronomist_records (kind, updated_at desc);

create table if not exists public.agronomist_audit (
  id bigserial primary key,
  actor_id uuid,
  actor_name text,
  action text not null check (action in ('create', 'update', 'delete')),
  kind text not null,
  record_id uuid,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists agronomist_audit_record_idx
  on public.agronomist_audit (record_id, created_at desc);

-- The role lives in app_metadata, which an account holder cannot edit.
create or replace function public.is_agronomist()
returns boolean
language sql
stable
as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'agronomist';
$$;

create or replace function public.agronomist_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists agronomist_records_touch on public.agronomist_records;
create trigger agronomist_records_touch
before update on public.agronomist_records
for each row execute function public.agronomist_touch_updated_at();

alter table public.agronomist_records enable row level security;
alter table public.agronomist_audit enable row level security;

-- Reads: the catalogue is public; farmer-linked records are not.
drop policy if exists "agronomist records read" on public.agronomist_records;
create policy "agronomist records read"
on public.agronomist_records
for select
using (
  public.is_agronomist()
  or kind in ('product', 'contact', 'insurance')
);

-- Writes: only an agronomist.
drop policy if exists "agronomist records insert" on public.agronomist_records;
create policy "agronomist records insert"
on public.agronomist_records
for insert
with check (public.is_agronomist());

drop policy if exists "agronomist records update" on public.agronomist_records;
create policy "agronomist records update"
on public.agronomist_records
for update
using (public.is_agronomist())
with check (public.is_agronomist());

drop policy if exists "agronomist records delete" on public.agronomist_records;
create policy "agronomist records delete"
on public.agronomist_records
for delete
using (public.is_agronomist());

-- Audit: written and read by agronomists only.
drop policy if exists "agronomist audit insert" on public.agronomist_audit;
create policy "agronomist audit insert"
on public.agronomist_audit
for insert
with check (public.is_agronomist());

drop policy if exists "agronomist audit read" on public.agronomist_audit;
create policy "agronomist audit read"
on public.agronomist_audit
for select
using (public.is_agronomist());

comment on table public.agronomist_records is
  'Agronomist dashboard records. data is validated by the app schema before write.';
comment on table public.agronomist_audit is
  'Who created, changed or deleted an agronomist dashboard record, and when.';
