-- ============================================================
-- Schema migrasi Firebase (Auth + Realtime DB) -> Supabase
-- Jalankan ini di Supabase Dashboard > SQL Editor
-- ============================================================

-- 1. Tabel profil user (menggantikan displayName/photoURL Firebase Auth)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  email text,
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Profiles are viewable by everyone"
  on public.profiles for select
  using (true);

create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Auto-create profile row saat user baru daftar
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email), new.email)
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 2. Tabel pesan chat (menggantikan node "chat" di Realtime DB)
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  user_name text,
  email text,
  photo_url text,
  text text default '',
  file_url text,
  file_name text,
  file_type text,
  reply_to jsonb,
  deleted boolean default false,
  created_at timestamptz default now()
);

create index if not exists messages_created_at_idx on public.messages (created_at);
create index if not exists messages_user_id_idx on public.messages (user_id);

alter table public.messages enable row level security;

create policy "Messages are viewable by everyone (login required in app)"
  on public.messages for select
  using (true);

create policy "Authenticated users can insert their own messages"
  on public.messages for insert
  with check (auth.uid() = user_id);

create policy "Users can update (soft-delete) their own messages"
  on public.messages for update
  using (auth.uid() = user_id);

-- 3. Tabel status "sedang mengetik" (menggantikan node "typing")
create table if not exists public.typing_status (
  user_id uuid primary key references auth.users(id) on delete cascade,
  user_name text,
  typing boolean default false,
  updated_at timestamptz default now()
);

alter table public.typing_status enable row level security;

create policy "Typing status viewable by everyone"
  on public.typing_status for select
  using (true);

create policy "Users can upsert their own typing status"
  on public.typing_status for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own typing status"
  on public.typing_status for update
  using (auth.uid() = user_id);

-- 4. Aktifkan Realtime buat kedua tabel (biar bisa subscribe INSERT/UPDATE)
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.typing_status;

-- 5. Storage buckets (kalau belum ada dari sebelumnya)
insert into storage.buckets (id, name, public)
values ('chat-files', 'chat-files', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('chat-avatars', 'chat-avatars', true)
on conflict (id) do nothing;

create policy "Public read chat-files"
  on storage.objects for select
  using (bucket_id = 'chat-files');

create policy "Authenticated upload chat-files"
  on storage.objects for insert
  with check (bucket_id = 'chat-files' and auth.role() = 'authenticated');

create policy "Public read chat-avatars"
  on storage.objects for select
  using (bucket_id = 'chat-avatars');

create policy "Authenticated upload chat-avatars"
  on storage.objects for insert
  with check (bucket_id = 'chat-avatars' and auth.role() = 'authenticated');
