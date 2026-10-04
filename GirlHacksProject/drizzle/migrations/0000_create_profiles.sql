create table public.profiles (
  user_id uuid not null primary key references auth.users(id) on delete cascade,
  restrictions text[] not null default '{}',
  also_avoid text,
  likes text,
  dislikes text,
  cuisines text,
  budget numeric(10,2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;

alter table public.profiles enable row level security;

create policy "Users can select own profile"
  on public.profiles for select to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert own profile"
  on public.profiles for insert to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update own profile"
  on public.profiles for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id) values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();