-- Benchspace shared inventory without user accounts.
-- Run this in Supabase SQL Editor. Anyone with access to the website can manage inventory.
create extension if not exists pgcrypto;

create table if not exists public.components (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sku text not null unique,
  category text not null default 'Microcontrollers & Boards',
  stock integer not null default 0 check (stock >= 0),
  min_stock integer not null default 0 check (min_stock >= 0),
  unit text not null default 'pcs',
  description text not null default '',
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.components add column if not exists description text not null default '';
alter table public.components add column if not exists image_url text;
alter table public.components add column if not exists updated_at timestamptz not null default now();

alter table public.components alter column category set default 'Microcontrollers & Boards';

-- Normalize the previous category names. Safe to run again.
update public.components set category = case category
  when 'Power' then 'Power & Batteries'
  when 'Actuators' then 'Motors & Actuators'
  when 'Motors & Motion' then 'Motors & Actuators'
  when 'Network' then 'Networking & Communication'
  when 'Microcontrollers' then 'Microcontrollers & Boards'
  when 'MCU (Microcontrollers)' then 'Microcontrollers & Boards'
  when 'Accessories/Modules' then 'Accessories & Modules'
  when 'Cables' then 'Wires, Cables & Connectors'
  when 'Connectors' then 'Wires, Cables & Connectors'
  when 'Resistors' then 'Electronics'
  when 'LEDs & Lighting' then 'Electronics'
  when 'Prototyping' then 'Accessories & Modules'
  else category
end
where category in ('Power','Actuators','Motors & Motion','Network','Microcontrollers','MCU (Microcontrollers)','Accessories/Modules','Cables','Connectors','Resistors','LEDs & Lighting','Prototyping');

create table if not exists public.stock_activity (
  id uuid primary key default gen_random_uuid(),
  component_id uuid references public.components(id) on delete set null,
  quantity_change integer not null,
  note text not null default '',
  created_at timestamptz not null default now()
);

alter table public.components enable row level security;
alter table public.stock_activity enable row level security;
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.components to anon, authenticated;
grant select, insert on public.stock_activity to anon, authenticated;

drop policy if exists "Public can manage components" on public.components;
create policy "Public can manage components" on public.components for all to anon, authenticated using (true) with check (true);
drop policy if exists "Public can read stock activity" on public.stock_activity;
create policy "Public can read stock activity" on public.stock_activity for select to anon, authenticated using (true);
drop policy if exists "Public can add stock activity" on public.stock_activity;
create policy "Public can add stock activity" on public.stock_activity for insert to anon, authenticated with check (true);

insert into storage.buckets (id, name, public) values ('component-images', 'component-images', true)
on conflict (id) do update set public = true;
drop policy if exists "Public can upload component images" on storage.objects;
create policy "Public can upload component images" on storage.objects for insert to anon, authenticated with check (bucket_id = 'component-images');
drop policy if exists "Anyone can view component images" on storage.objects;
create policy "Anyone can view component images" on storage.objects for select to public using (bucket_id = 'component-images');
drop policy if exists "Public can replace component images" on storage.objects;
create policy "Public can replace component images" on storage.objects for update to anon, authenticated using (bucket_id = 'component-images') with check (bucket_id = 'component-images');
