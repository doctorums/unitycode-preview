-- ============================================================================
-- SCHEMA.SQL — схема базы UnityCode. НЕСУЩАЯ СТЕНА.
-- Выполни один раз в Supabase (SQL Editor) при настройке своего портала.
-- Структуру таблиц и полей менять нельзя — на ней держится совместимость
-- твоего узла с общей Сетью (см. fork.html).
-- ============================================================================

-- Узлы: каждый сохранённый шум + его интерпретация.
create table if not exists nodes (
  id                 uuid primary key default gen_random_uuid(),
  created_at         timestamptz default now(),
  raw_noise          text not null,           -- что ввёл человек
  ai_interpretation  text,                     -- ответ узла-Зеркала
  parent_id          uuid references nodes(id),-- иерархия. Заполняется ТОЛЬКО после консенсуса.
  suggested_parent_id uuid references nodes(id),-- предложение третьего агента (не приговор)
  suggestion_reason  text,                     -- почему агент так считает
  node_origin        text                      -- метка портала-источника (identity.nodeLabel)
);

-- Связи: горизонтальная сеть «многие ко многим».
create table if not exists connections (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz default now(),
  from_node_id uuid references nodes(id) not null,
  to_node_id   uuid references nodes(id) not null
);

-- Анонимность из коробки: разрешаем чтение всем, запись — всем (без аккаунтов),
-- но никаких персональных колонок в схеме нет вовсе.
alter table nodes       enable row level security;
alter table connections enable row level security;
create policy "read nodes"  on nodes for select using (true);
create policy "write nodes" on nodes for insert with check (true);
create policy "read conns"  on connections for select using (true);
create policy "write conns" on connections for insert with check (true);
