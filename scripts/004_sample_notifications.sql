-- Insert sample notifications for testing
-- Note: Replace the user_id with actual user IDs from your profiles table

-- Sample sick report notification
INSERT INTO public.notifications (user_id, title, message, type, action_url) 
SELECT 
  id,
  'Sick Report',
  'Jane Doe reported sick for her shift on Wed, Mar 20.',
  'sick_report',
  '/time-off'
FROM public.profiles 
WHERE role = 'manager'
LIMIT 1;

-- Sample time-off request notification
INSERT INTO public.notifications (user_id, title, message, type, action_url)
SELECT 
  id,
  'Time-off Request',
  'John Smith requested time off from Apr 1 to Apr 5.',
  'time_off_request',
  '/time-off'
FROM public.profiles 
WHERE role = 'manager'
LIMIT 1;

-- Sample availability update notification
INSERT INTO public.notifications (user_id, title, message, type, action_url)
SELECT 
  id,
  'Availability Update',
  'Emily White updated her availability for next week.',
  'availability_update',
  '/employees'
FROM public.profiles 
WHERE role = 'manager'
LIMIT 1;
