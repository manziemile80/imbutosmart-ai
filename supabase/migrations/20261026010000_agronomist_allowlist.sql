-- The shared reviewer account and the email allowlist.
--
-- Apply this migration after 20261026000000_agronomist_dashboard.sql, with the
-- Supabase CLI (`supabase db push`) or the SQL editor.
--
-- Applies only to the anon/authenticated API roles; the function below is
-- security definer so the policy can read the list without exposing it.
-- `auth.jwt() ->> 'email'` is set by Supabase for a signed-in account, and the
-- address is unique in auth.users, so the mapping is stable.

create table if not exists public.agronomist_allowlist (
  email text primary key,
  note text,
  added_at timestamptz not null default now()
);

alter table public.agronomist_allowlist enable row level security;

-- No policy is added: only the security-definer function reads this table.
revoke all on public.agronomist_allowlist from anon, authenticated;

insert into public.agronomist_allowlist (email, note)
values (
  'manziemile1@gmail.com',
  'Shared account that the dashboard prints on its sign-in form for reviewers.'
)
on conflict (email) do nothing;

-- A write is allowed when the account carries the agronomist role, or when it
-- signs in with an address listed above. The server function checks the same
-- two things, so the app and the policies agree.
create or replace function public.is_agronomist()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'agronomist'
    or exists (
      select 1
        from public.agronomist_allowlist listed
       where lower(listed.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    );
$$;

comment on table public.agronomist_allowlist is
  'Addresses that hold agronomist rights without an app_metadata role. Keep in step with src/lib/agronomist-accounts.ts.';

comment on function public.is_agronomist() is
  'True for an app_metadata agronomist role or an allowlisted email. Used by every dashboard policy.';
