-- Таблица узлов
create table if not exists nodes (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  raw_noise text not null,
  ai_interpretation text not null,
  parent_id uuid references nodes(id) on delete set null,
  lat double precision,
  lng double precision
);

-- Разрешить анонимную запись и чтение (без авторизации)
alter table nodes enable row level security;

create policy "anon insert" on nodes for insert to anon with check (true);
create policy "anon select" on nodes for select to anon using (true);
