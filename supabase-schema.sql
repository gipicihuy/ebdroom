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

-- Bio profil (maks 150 karakter) & banner background. Aman dijalanin ulang.
alter table public.profiles add column if not exists bio text check (char_length(bio) <= 150);
alter table public.profiles add column if not exists banner_url text;
alter table public.profiles add column if not exists banner_dim integer default 60;

-- VIP / title spesial & custom card per user ID. Aman dijalanin ulang.
create table if not exists public.vip_users (
  user_id uuid primary key,
  title text not null default 'ADMIN',
  card_style text,
  created_at timestamptz default now()
);
alter table public.vip_users add column if not exists card_style text;
alter table public.vip_users drop constraint if exists vip_users_title_check;
alter table public.vip_users add constraint vip_users_title_check check (char_length(title) between 1 and 32);
alter table public.vip_users enable row level security;
drop policy if exists "VIP viewable by everyone" on public.vip_users;
create policy "VIP viewable by everyone" on public.vip_users for select using (true);
-- Gak ada policy insert/update/delete: nulis cuma lewat fungsi vip_manage di bawah.

create table if not exists public.app_secrets (name text primary key, value text not null);
alter table public.app_secrets enable row level security;
revoke all on public.app_secrets from anon, authenticated;
insert into public.app_secrets (name, value) values ('vip_key', 'GANTI_KEY_RAHASIA')
  on conflict (name) do update set value = excluded.value;

-- Drop function lama dulu agar Postgres mengizinkan penambahan default parameter baru
drop function if exists public.vip_manage(text, text, uuid, text);
drop function if exists public.vip_manage(text, text, uuid, text, text);

create or replace function public.vip_manage(
  p_key text,
  p_action text,
  p_user uuid default null,
  p_title text default 'ADMIN',
  p_style text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_key is null or not exists (select 1 from app_secrets where name = 'vip_key' and value = p_key) then
    raise exception 'unauthorized' using errcode = '42501';
  end if;
  if p_action = 'add' then
    if p_user is null then raise exception 'user id kosong' using errcode = '22023'; end if;
    insert into vip_users (user_id, title, card_style)
    values (
      p_user,
      upper(coalesce(nullif(trim(p_title), ''), 'ADMIN')),
      nullif(trim(p_style), '')
    )
    on conflict (user_id) do update set
      title = excluded.title,
      card_style = excluded.card_style;
  elsif p_action = 'remove' then
    delete from vip_users where user_id = p_user;
  elsif p_action <> 'list' then
    raise exception 'aksi gak dikenal' using errcode = '22023';
  end if;
  return (
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', v.user_id,
          'title', v.title,
          'style', coalesce(v.card_style, ''),
          'name', p.display_name
        ) order by v.created_at
      ),
      '[]'::jsonb
    )
    from vip_users v left join profiles p on p.id = v.user_id
  );
end;
$$;
revoke all on function public.vip_manage(text, text, uuid, text, text) from public;
grant execute on function public.vip_manage(text, text, uuid, text, text) to anon, authenticated;
-- Kompatibilitas fungsi signature lama (4 argumen)
create or replace function public.vip_manage(p_key text, p_action text, p_user uuid, p_title text)
returns jsonb language sql security definer as $$
  select public.vip_manage(p_key, p_action, p_user, p_title, null::text);
$$;
revoke all on function public.vip_manage(text, text, uuid, text) from public;
grant execute on function public.vip_manage(text, text, uuid, text) to anon, authenticated;

insert into public.vip_users (user_id, title) values
  ('e3fe4a8e-e4d4-422f-bae3-8d5ac822270c', 'ADMIN'),
  ('a48d2c9c-c5b0-446a-bdae-cb5c17b49b07', 'ADMIN')
on conflict (user_id) do nothing;
