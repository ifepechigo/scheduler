-- Add status column to profiles table for user account management
alter table public.profiles
add column if not exists status text default 'active' check (status in ('active', 'suspended', 'terminated'));

-- Add index for faster status queries
create index if not exists idx_profiles_status on public.profiles(status);

-- Update existing profiles to have active status
update public.profiles set status = 'active' where status is null;
