-- Create sample employees with proper role hierarchy
-- 1 Admin, 2 Managers, 8 Employees (4 per manager)

-- First, let's create departments if they don't exist
INSERT INTO public.departments (name, description, created_at, updated_at)
VALUES 
  ('Engineering', 'Software development and technical operations', NOW(), NOW()),
  ('Customer Service', 'Customer support and relations', NOW(), NOW())
ON CONFLICT (name) DO NOTHING;

-- Get department IDs for reference
DO $$
DECLARE
  eng_dept_id UUID;
  cs_dept_id UUID;
  admin_user_id UUID;
  manager1_user_id UUID;
  manager2_user_id UUID;
BEGIN
  -- Get department IDs
  SELECT id INTO eng_dept_id FROM public.departments WHERE name = 'Engineering' LIMIT 1;
  SELECT id INTO cs_dept_id FROM public.departments WHERE name = 'Customer Service' LIMIT 1;

  -- Create Admin User
  INSERT INTO auth.users (
    id,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    role
  ) VALUES (
    gen_random_uuid(),
    'admin@company.com',
    crypt('Admin123!', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Sarah Johnson"}',
    false,
    'authenticated'
  )
  ON CONFLICT (email) DO NOTHING
  RETURNING id INTO admin_user_id;

  -- Create admin profile
  IF admin_user_id IS NOT NULL THEN
    INSERT INTO public.profiles (id, email, full_name, role, created_at, updated_at)
    VALUES (admin_user_id, 'admin@company.com', 'Sarah Johnson', 'admin', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
  ELSE
    SELECT id INTO admin_user_id FROM auth.users WHERE email = 'admin@company.com' LIMIT 1;
  END IF;

  -- Create Manager 1 (Engineering)
  INSERT INTO auth.users (
    id,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    role
  ) VALUES (
    gen_random_uuid(),
    'manager1@company.com',
    crypt('Manager123!', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Michael Chen"}',
    false,
    'authenticated'
  )
  ON CONFLICT (email) DO NOTHING
  RETURNING id INTO manager1_user_id;

  IF manager1_user_id IS NOT NULL THEN
    INSERT INTO public.profiles (id, email, full_name, role, department_id, created_at, updated_at)
    VALUES (manager1_user_id, 'manager1@company.com', 'Michael Chen', 'manager', eng_dept_id, NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
  ELSE
    SELECT id INTO manager1_user_id FROM auth.users WHERE email = 'manager1@company.com' LIMIT 1;
  END IF;

  -- Create Manager 2 (Customer Service)
  INSERT INTO auth.users (
    id,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    role
  ) VALUES (
    gen_random_uuid(),
    'manager2@company.com',
    crypt('Manager123!', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Emily Rodriguez"}',
    false,
    'authenticated'
  )
  ON CONFLICT (email) DO NOTHING
  RETURNING id INTO manager2_user_id;

  IF manager2_user_id IS NOT NULL THEN
    INSERT INTO public.profiles (id, email, full_name, role, department_id, created_at, updated_at)
    VALUES (manager2_user_id, 'manager2@company.com', 'Emily Rodriguez', 'manager', cs_dept_id, NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
  ELSE
    SELECT id INTO manager2_user_id FROM auth.users WHERE email = 'manager2@company.com' LIMIT 1;
  END IF;

  -- Create 4 Employees under Manager 1 (Engineering)
  DECLARE
    emp_emails TEXT[] := ARRAY[
      'john.smith@company.com',
      'lisa.wang@company.com',
      'david.brown@company.com',
      'maria.garcia@company.com'
    ];
    emp_names TEXT[] := ARRAY[
      'John Smith',
      'Lisa Wang',
      'David Brown',
      'Maria Garcia'
    ];
    emp_id UUID;
    i INTEGER;
  BEGIN
    FOR i IN 1..4 LOOP
      INSERT INTO auth.users (
        id,
        email,
        encrypted_password,
        email_confirmed_at,
        created_at,
        updated_at,
        raw_app_meta_data,
        raw_user_meta_data,
        is_super_admin,
        role
      ) VALUES (
        gen_random_uuid(),
        emp_emails[i],
        crypt('Employee123!', gen_salt('bf')),
        NOW(),
        NOW(),
        NOW(),
        '{"provider":"email","providers":["email"]}',
        json_build_object('full_name', emp_names[i])::jsonb,
        false,
        'authenticated'
      )
      ON CONFLICT (email) DO NOTHING
      RETURNING id INTO emp_id;

      IF emp_id IS NOT NULL THEN
        INSERT INTO public.profiles (id, email, full_name, role, department_id, manager_id, created_at, updated_at)
        VALUES (emp_id, emp_emails[i], emp_names[i], 'employee', eng_dept_id, manager1_user_id, NOW(), NOW())
        ON CONFLICT (id) DO NOTHING;
      END IF;
    END LOOP;
  END;

  -- Create 4 Employees under Manager 2 (Customer Service)
  DECLARE
    emp_emails TEXT[] := ARRAY[
      'alex.thompson@company.com',
      'sophia.martinez@company.com',
      'james.wilson@company.com',
      'olivia.taylor@company.com'
    ];
    emp_names TEXT[] := ARRAY[
      'Alex Thompson',
      'Sophia Martinez',
      'James Wilson',
      'Olivia Taylor'
    ];
    emp_id UUID;
    i INTEGER;
  BEGIN
    FOR i IN 1..4 LOOP
      INSERT INTO auth.users (
        id,
        email,
        encrypted_password,
        email_confirmed_at,
        created_at,
        updated_at,
        raw_app_meta_data,
        raw_user_meta_data,
        is_super_admin,
        role
      ) VALUES (
        gen_random_uuid(),
        emp_emails[i],
        crypt('Employee123!', gen_salt('bf')),
        NOW(),
        NOW(),
        NOW(),
        '{"provider":"email","providers":["email"]}',
        json_build_object('full_name', emp_names[i])::jsonb,
        false,
        'authenticated'
      )
      ON CONFLICT (email) DO NOTHING
      RETURNING id INTO emp_id;

      IF emp_id IS NOT NULL THEN
        INSERT INTO public.profiles (id, email, full_name, role, department_id, manager_id, created_at, updated_at)
        VALUES (emp_id, emp_emails[i], emp_names[i], 'employee', cs_dept_id, manager2_user_id, NOW(), NOW())
        ON CONFLICT (id) DO NOTHING;
      END IF;
    END LOOP;
  END;

END $$;

-- Display created users
SELECT 
  p.full_name,
  p.email,
  p.role,
  d.name as department,
  m.full_name as manager
FROM public.profiles p
LEFT JOIN public.departments d ON p.department_id = d.id
LEFT JOIN public.profiles m ON p.manager_id = m.id
ORDER BY 
  CASE p.role 
    WHEN 'admin' THEN 1 
    WHEN 'manager' THEN 2 
    WHEN 'employee' THEN 3 
  END,
  p.full_name;
