-- Marketing waitlist.
-- The public API roles cannot read or write this table.
-- Signups are inserted by the waitlist edge function, which uses the service role.

create table public.waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  source text not null,
  created_at timestamptz not null default pg_catalog.now(),
  constraint waitlist_email_length check (char_length(email) between 6 and 320),
  constraint waitlist_email_shape check (
    email ~ '^[a-z0-9.!#$%&*+/=?^_`{|}~-]+@[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$'
  ),
  constraint waitlist_source_allowed check (source in ('hero', 'closer'))
);

create unique index waitlist_email_key on public.waitlist (email);
create index waitlist_created_at_idx on public.waitlist (created_at);

create or replace function public.waitlist_normalize()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.email := lower(pg_catalog.btrim(new.email));
  new.source := lower(pg_catalog.btrim(new.source));
  new.created_at := pg_catalog.now();
  return new;
end;
$$;

revoke all on function public.waitlist_normalize() from public;
revoke all on function public.waitlist_normalize() from anon, authenticated;

create trigger waitlist_normalize
  before insert on public.waitlist
  for each row
  execute function public.waitlist_normalize();

alter table public.waitlist enable row level security;

revoke all on table public.waitlist from public;
revoke all on table public.waitlist from anon, authenticated;

comment on table public.waitlist is
  'Marketing waitlist. Anonymous API access is revoked. The waitlist edge function inserts rows.';

notify pgrst, 'reload schema';
