-- Add super admin tracking and admin action approvals
alter table public.profiles
add column if not exists is_super_admin boolean default false,
add column if not exists created_at timestamp with time zone default now();

-- Create admin action approvals table
create table if not exists public.admin_action_approvals (
  id uuid primary key default gen_random_uuid(),
  requesting_admin_id uuid references public.profiles(id) on delete cascade not null,
  target_admin_id uuid references public.profiles(id) on delete cascade not null,
  action_type text not null, -- 'view', 'edit', 'remove'
  reason text,
  status text default 'pending', -- 'pending', 'approved', 'denied'
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamp with time zone,
  created_at timestamp with time zone default now()
);

-- Enable RLS
alter table public.admin_action_approvals enable row level security;

-- Policies for admin action approvals
create policy "Admins can view approval requests"
  on public.admin_action_approvals for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

create policy "Admins can create approval requests"
  on public.admin_action_approvals for insert
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

create policy "Super admins can update approval requests"
  on public.admin_action_approvals for update
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin' and is_super_admin = true
    )
  );

-- Mark the first admin as super admin (the one with earliest created_at)
update public.profiles
set is_super_admin = true
where id = (
  select id from public.profiles
  where role = 'admin'
  order by created_at asc
  limit 1
);
