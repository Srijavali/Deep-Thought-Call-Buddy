-- DeepThought Cold-Call Companion initial Supabase schema.
-- Apply in Supabase SQL Editor. This schema is designed for authenticated ownership.
-- Before production: enable Supabase Auth, review every RLS policy, and never expose service-role keys.

create extension if not exists pgcrypto;

create table if not exists public.prospects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  full_name text not null check (length(trim(full_name)) between 1 and 160),
  company_name text,
  role text,
  email text,
  phone text,
  business_description text,
  relationship_status text not null default 'unknown',
  do_not_contact boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists prospects_owner_name_idx on public.prospects(owner_id, lower(full_name));
create index if not exists prospects_owner_company_idx on public.prospects(owner_id, lower(company_name));

create table if not exists public.call_purposes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (length(trim(title)) between 1 and 160),
  wording text not null check (length(trim(wording)) between 1 and 2000),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.calls (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  prospect_id uuid not null references public.prospects(id) on delete restrict,
  purpose_id uuid references public.call_purposes(id) on delete set null,
  purpose_snapshot text,
  status text not null default 'in_progress' check (status in ('in_progress','closed')),
  current_stage smallint not null default 1 check (current_stage between 1 and 8),
  input_method text not null default 'manual_notes' check (input_method in ('manual_notes','audio_upload','browser_recording')),
  transcript text,
  audio_storage_path text,
  summary text,
  final_outcome text,
  call_ending text,
  started_at timestamptz not null default now(),
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((status = 'in_progress' and closed_at is null) or (status = 'closed' and closed_at is not null))
);
create index if not exists calls_owner_started_idx on public.calls(owner_id, started_at desc);
create index if not exists calls_prospect_started_idx on public.calls(prospect_id, started_at desc);

create table if not exists public.stage_results (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  call_id uuid not null references public.calls(id) on delete cascade,
  stage_number smallint not null check (stage_number between 1 and 8),
  status text not null default 'incomplete' check (status in ('complete','incomplete','needs_clarification','not_assessable')),
  outcome_key text,
  prospect_words text,
  caller_notes text,
  extracted_information jsonb not null default '{}'::jsonb,
  evidence jsonb not null default '[]'::jsonb,
  missing_information jsonb not null default '[]'::jsonb,
  uncertainty text,
  ai_analysis jsonb,
  caller_corrected boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(call_id, stage_number)
);
create index if not exists stage_results_call_idx on public.stage_results(call_id, stage_number);

create table if not exists public.prospect_facts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  prospect_id uuid not null references public.prospects(id) on delete cascade,
  source_call_id uuid references public.calls(id) on delete set null,
  fact_type text not null,
  fact_text text not null,
  source_quote text,
  confidence_note text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  superseded_at timestamptz
);
create index if not exists prospect_facts_active_idx on public.prospect_facts(prospect_id, active, created_at desc);

create table if not exists public.next_steps (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  prospect_id uuid not null references public.prospects(id) on delete cascade,
  source_call_id uuid references public.calls(id) on delete set null,
  action text not null,
  channel text check (channel in ('phone','email','whatsapp','meeting','other')),
  timing_text text,
  due_at timestamptz,
  responsible_party text not null default 'unspecified' check (responsible_party in ('caller','prospect','both','unspecified')),
  supporting_words text,
  confirmed boolean not null default false,
  status text not null default 'pending' check (status in ('pending','completed','cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists next_steps_pending_idx on public.next_steps(owner_id, status, due_at);
create index if not exists next_steps_prospect_idx on public.next_steps(prospect_id, status);

-- Enable RLS. The API should use a verified user JWT for user-scoped access.
alter table public.prospects enable row level security;
alter table public.call_purposes enable row level security;
alter table public.calls enable row level security;
alter table public.stage_results enable row level security;
alter table public.prospect_facts enable row level security;
alter table public.next_steps enable row level security;

-- Owner-scoped policies. Calls/stage/facts/steps ownership is stored explicitly and
-- should be validated against parent ownership in backend service logic as well.
create policy "prospects owner access" on public.prospects for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "purposes owner access" on public.call_purposes for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "calls owner access" on public.calls for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "stage results owner access" on public.stage_results for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "prospect facts owner access" on public.prospect_facts for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "next steps owner access" on public.next_steps for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
