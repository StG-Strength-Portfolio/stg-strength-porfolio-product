-- Follow-up hardening for Teaching Materials external-content consent.
-- This migration is intentionally idempotent because production did not yet
-- receive the original privacy migration when the frontend was merged.

alter table public.schools
  add column if not exists privacy_region text not null default 'eu_eea';

alter table public.schools
  drop constraint if exists schools_privacy_region_check;

alter table public.schools
  add constraint schools_privacy_region_check
  check (privacy_region in ('eu_eea', 'us'));

create table if not exists public.external_content_preferences (
  user_id uuid not null references auth.users(id) on delete cascade,
  school_id uuid not null references public.schools(id) on delete cascade,
  external_content_allowed boolean not null,
  consent_version integer not null default 1,
  decided_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, school_id)
);

alter table public.external_content_preferences enable row level security;

-- The browser uses the authenticated role for this table. RLS still limits
-- every operation to the signed-in teacher/school admin and their own school.
grant select, insert, update on public.external_content_preferences to authenticated;
grant all on public.external_content_preferences to service_role;
revoke all on public.external_content_preferences from anon;

drop policy if exists "staff read own external content preference" on public.external_content_preferences;
create policy "staff read own external content preference"
on public.external_content_preferences
for select
to authenticated
using (
  user_id = auth.uid()
  and school_id = public.my_school_id()
  and (
    public.has_role(auth.uid(), 'teacher'::public.app_role)
    or public.has_role(auth.uid(), 'school_admin'::public.app_role)
  )
);

drop policy if exists "staff insert own external content preference" on public.external_content_preferences;
create policy "staff insert own external content preference"
on public.external_content_preferences
for insert
to authenticated
with check (
  user_id = auth.uid()
  and school_id = public.my_school_id()
  and (
    public.has_role(auth.uid(), 'teacher'::public.app_role)
    or public.has_role(auth.uid(), 'school_admin'::public.app_role)
  )
);

drop policy if exists "staff update own external content preference" on public.external_content_preferences;
create policy "staff update own external content preference"
on public.external_content_preferences
for update
to authenticated
using (
  user_id = auth.uid()
  and school_id = public.my_school_id()
  and (
    public.has_role(auth.uid(), 'teacher'::public.app_role)
    or public.has_role(auth.uid(), 'school_admin'::public.app_role)
  )
)
with check (
  user_id = auth.uid()
  and school_id = public.my_school_id()
  and (
    public.has_role(auth.uid(), 'teacher'::public.app_role)
    or public.has_role(auth.uid(), 'school_admin'::public.app_role)
  )
);
