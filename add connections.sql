-- Добавляем user_token в nodes
alter table nodes add column if not exists user_token text;

-- Индекс для быстрого поиска узлов по токену
create index if not exists nodes_user_token_idx on nodes(user_token);

-- Таблица связей
create table if not exists connections (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  from_node_id uuid references nodes(id) on delete cascade,
  to_node_id uuid references nodes(id) on delete cascade,
  status text default 'pending' check (status in ('pending', 'accepted', 'declined'))
);

-- Анонимный доступ
alter table connections enable row level security;
create policy "anon insert" on connections for insert to anon with check (true);
create policy "anon select" on connections for select to anon using (true);
create policy "anon update" on connections for update to anon using (true);
