-- Run this in your Supabase SQL editor (Database > SQL Editor > New query)

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Trucks table
create table if not exists trucks (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamp with time zone default now(),
  truck_number text not null,
  driver_name text not null,
  make text default '',
  model text default '',
  year integer default 0,
  license_plate text default '',
  status text default 'active' check (status in ('active', 'inactive', 'maintenance')),
  user_id uuid references auth.users(id) on delete cascade not null
);

-- Inspections table
create table if not exists inspections (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamp with time zone default now(),
  truck_id uuid references trucks(id) on delete cascade not null,
  inspector_name text not null,
  inspection_type text not null,
  notes text default '',
  overall_condition text default 'Unknown',
  summary text default '',
  follow_up_required boolean default false,
  repair_urgency text default 'Monitoring only',
  is_baseline boolean default false,
  user_id uuid references auth.users(id) on delete cascade not null
);

-- Damages table
create table if not exists damages (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamp with time zone default now(),
  inspection_id uuid references inspections(id) on delete cascade not null,
  truck_id uuid references trucks(id) on delete cascade not null,
  severity text not null check (severity in ('critical', 'moderate', 'minor')),
  location text not null,
  description text not null,
  recommendation text default '',
  is_new boolean default false,
  user_id uuid references auth.users(id) on delete cascade not null
);

-- Inspection photos table
create table if not exists inspection_photos (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamp with time zone default now(),
  inspection_id uuid references inspections(id) on delete cascade not null,
  truck_id uuid references trucks(id) on delete cascade not null,
  storage_path text not null,
  photo_type text default 'general',
  user_id uuid references auth.users(id) on delete cascade not null
);

-- Row Level Security (RLS) - users only see their own data
alter table trucks enable row level security;
alter table inspections enable row level security;
alter table damages enable row level security;
alter table inspection_photos enable row level security;

create policy "Users can manage their own trucks" on trucks
  for all using (auth.uid() = user_id);

create policy "Users can manage their own inspections" on inspections
  for all using (auth.uid() = user_id);

create policy "Users can manage their own damages" on damages
  for all using (auth.uid() = user_id);

create policy "Users can manage their own photos" on inspection_photos
  for all using (auth.uid() = user_id);

-- Storage bucket for inspection photos
insert into storage.buckets (id, name, public) values ('inspection-photos', 'inspection-photos', false)
on conflict do nothing;

create policy "Users can upload their own photos" on storage.objects
  for insert with check (bucket_id = 'inspection-photos' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users can view their own photos" on storage.objects
  for select using (bucket_id = 'inspection-photos' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users can delete their own photos" on storage.objects
  for delete using (bucket_id = 'inspection-photos' and auth.uid()::text = (storage.foldername(name))[1]);
