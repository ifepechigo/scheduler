-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Create enum types
create type user_role as enum ('admin', 'manager', 'employee');
create type availability_status as enum ('available', 'preferred', 'unavailable');
create type shift_status as enum ('draft', 'published', 'completed');

-- Users/Employees table (extends auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null,
  role user_role not null default 'employee',
  department_id uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Departments table
create table if not exists public.departments (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  description text,
  manager_id uuid references public.profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Add foreign key for department_id in profiles
alter table public.profiles 
  add constraint fk_department 
  foreign key (department_id) 
  references public.departments(id) 
  on delete set null;

-- Shift templates table
create table if not exists public.shift_templates (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  start_time time not null,
  end_time time not null,
  department_id uuid references public.departments(id) on delete cascade,
  required_employees integer not null default 1,
  created_by uuid references public.profiles(id),
  created_at timestamptz default now()
);

-- Shifts table (actual scheduled shifts)
create table if not exists public.shifts (
  id uuid primary key default uuid_generate_v4(),
  template_id uuid references public.shift_templates(id),
  department_id uuid references public.departments(id) on delete cascade,
  employee_id uuid references public.profiles(id) on delete set null,
  shift_date date not null,
  start_time time not null,
  end_time time not null,
  status shift_status default 'draft',
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Employee availability table
create table if not exists public.availability (
  id uuid primary key default uuid_generate_v4(),
  employee_id uuid references public.profiles(id) on delete cascade,
  date date not null,
  status availability_status not null,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(employee_id, date)
);

-- Time off requests table
create table if not exists public.time_off_requests (
  id uuid primary key default uuid_generate_v4(),
  employee_id uuid references public.profiles(id) on delete cascade,
  start_date date not null,
  end_date date not null,
  reason text,
  status text not null default 'pending',
  approved_by uuid references public.profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Notifications table
create table if not exists public.notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade,
  title text not null,
  message text not null,
  type text not null,
  read boolean default false,
  action_url text,
  created_at timestamptz default now()
);

-- Enable Row Level Security
alter table public.profiles enable row level security;
alter table public.departments enable row level security;
alter table public.shift_templates enable row level security;
alter table public.shifts enable row level security;
alter table public.availability enable row level security;
alter table public.time_off_requests enable row level security;
alter table public.notifications enable row level security;

-- RLS Policies for profiles
create policy "Users can view all profiles"
  on public.profiles for select
  using (true);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- RLS Policies for departments
create policy "Everyone can view departments"
  on public.departments for select
  using (true);

create policy "Admins can manage departments"
  on public.departments for all
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- RLS Policies for shift_templates
create policy "Everyone can view shift templates"
  on public.shift_templates for select
  using (true);

create policy "Managers and admins can manage shift templates"
  on public.shift_templates for all
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'manager')
    )
  );

-- RLS Policies for shifts
create policy "Employees can view their own shifts"
  on public.shifts for select
  using (
    employee_id = auth.uid() or
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'manager')
    )
  );

create policy "Managers and admins can manage shifts"
  on public.shifts for all
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'manager')
    )
  );

-- RLS Policies for availability
create policy "Employees can view all availability"
  on public.availability for select
  using (true);

create policy "Employees can manage own availability"
  on public.availability for insert
  with check (auth.uid() = employee_id);

create policy "Employees can update own availability"
  on public.availability for update
  using (auth.uid() = employee_id);

create policy "Employees can delete own availability"
  on public.availability for delete
  using (auth.uid() = employee_id);

-- RLS Policies for time_off_requests
create policy "Employees can view own time off requests"
  on public.time_off_requests for select
  using (
    employee_id = auth.uid() or
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'manager')
    )
  );

create policy "Employees can create time off requests"
  on public.time_off_requests for insert
  with check (auth.uid() = employee_id);

create policy "Managers can update time off requests"
  on public.time_off_requests for update
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'manager')
    )
  );

-- RLS Policies for notifications
create policy "Users can view own notifications"
  on public.notifications for select
  using (auth.uid() = user_id);

create policy "Users can update own notifications"
  on public.notifications for update
  using (auth.uid() = user_id);

-- Create indexes for better performance
create index idx_shifts_employee on public.shifts(employee_id);
create index idx_shifts_date on public.shifts(shift_date);
create index idx_shifts_department on public.shifts(department_id);
create index idx_availability_employee on public.availability(employee_id);
create index idx_availability_date on public.availability(date);
create index idx_notifications_user on public.notifications(user_id);
create index idx_time_off_employee on public.time_off_requests(employee_id);
