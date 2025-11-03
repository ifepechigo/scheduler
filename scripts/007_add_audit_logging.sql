-- Create audit log table for GDPR compliance
create table if not exists public.audit_logs (
  id uuid primary key default uuid_generate_v4(),
  admin_id uuid references public.profiles(id) on delete set null,
  action text not null,
  target_user_id uuid references public.profiles(id) on delete set null,
  details jsonb,
  ip_address text,
  created_at timestamptz default now()
);

-- Enable RLS on audit logs
alter table public.audit_logs enable row level security;

-- Only admins can view audit logs
create policy "Admins can view audit logs"
  on public.audit_logs for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Create index for performance
create index idx_audit_logs_admin on public.audit_logs(admin_id);
create index idx_audit_logs_target on public.audit_logs(target_user_id);
create index idx_audit_logs_created on public.audit_logs(created_at);

-- Add GDPR consent tracking to profiles
alter table public.profiles 
  add column if not exists gdpr_consent boolean default false,
  add column if not exists gdpr_consent_date timestamptz,
  add column if not exists data_retention_date timestamptz;
