-- Fix RLS policies to allow admins to update user profiles
-- This is required for department assignment and other admin actions

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- Create new policies that allow both self-updates and admin updates
CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Admins can update any profile"
  ON public.profiles
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- Also add policies for admins to insert and delete profiles
CREATE POLICY "Admins can insert profiles"
  ON public.profiles
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

CREATE POLICY "Admins can delete profiles"
  ON public.profiles
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- Add policy to allow system to create notifications
CREATE POLICY "System can insert notifications"
  ON public.notifications
  FOR INSERT
  WITH CHECK (true);

-- Add policy to allow admins to view all notifications
CREATE POLICY "Admins can view all notifications"
  ON public.notifications
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );
