-- ========================================
-- DEBUG AND FIX LOGIN ISSUE
-- ========================================
-- This script will help diagnose and fix the login problem
-- Run this entire script in Supabase SQL Editor

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ========================================
-- STEP 1: Check current users table structure
-- ========================================
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'users'
ORDER BY ordinal_position;

-- ========================================
-- STEP 2: Check if admin user exists
-- ========================================
SELECT
  id,
  email,
  full_name,
  role,
  is_active,
  (password_hash IS NOT NULL) as has_password,
  LENGTH(password_hash) as password_length,
  LEFT(password_hash, 10) as password_preview
FROM users
WHERE email = 'admin@ramahospital.com';

-- ========================================
-- STEP 3: Drop foreign key constraint if exists
-- ========================================
DO $$
BEGIN
    -- Drop the foreign key constraint
    ALTER TABLE users DROP CONSTRAINT IF EXISTS users_id_fkey;
    RAISE NOTICE 'Foreign key constraint dropped (if existed)';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'No foreign key to drop or error: %', SQLERRM;
END $$;

-- ========================================
-- STEP 4: Add missing columns if needed
-- ========================================
ALTER TABLE users
ADD COLUMN IF NOT EXISTS password_hash TEXT;

ALTER TABLE users
ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ;

-- Make sure id has default value
ALTER TABLE users
ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- ========================================
-- STEP 5: Delete any existing admin user
-- ========================================
DELETE FROM users WHERE email = 'admin@ramahospital.com';

-- ========================================
-- STEP 6: Create admin user with bcrypt password
-- ========================================
-- Using bcryptjs compatible hash
INSERT INTO users (
  id,
  email,
  password_hash,
  full_name,
  role,
  phone,
  is_active,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'admin@ramahospital.com',
  crypt('Admin@123', gen_salt('bf')),  -- This creates a bcrypt hash
  'System Administrator',
  'admin',
  NULL,
  true,
  now(),
  now()
);

-- ========================================
-- STEP 7: Verify the admin user was created correctly
-- ========================================
SELECT
  'VERIFICATION CHECK' as section,
  id,
  email,
  full_name,
  role,
  is_active,
  (password_hash IS NOT NULL) as has_password,
  (password_hash LIKE '$2a$%' OR password_hash LIKE '$2b$%' OR password_hash LIKE '$2y$%') as is_bcrypt,
  LENGTH(password_hash) as hash_length,
  LEFT(password_hash, 20) as hash_preview,
  created_at
FROM users
WHERE email = 'admin@ramahospital.com';

-- ========================================
-- STEP 8: Test password verification (PostgreSQL side)
-- ========================================
-- This tests if the password can be verified on the database side
SELECT
  email,
  (password_hash = crypt('Admin@123', password_hash)) as password_matches,
  'If true, password is correct' as note
FROM users
WHERE email = 'admin@ramahospital.com';

-- ========================================
-- STEP 9: Show all users for debugging
-- ========================================
SELECT
  id,
  email,
  full_name,
  role,
  is_active,
  (password_hash IS NOT NULL) as has_password
FROM users
ORDER BY created_at DESC
LIMIT 10;

-- ========================================
-- SUCCESS CHECKLIST
-- ========================================
-- After running this script, verify:
-- 1. password_hash column exists ✓
-- 2. Admin user exists ✓
-- 3. has_password = true ✓
-- 4. is_bcrypt = true ✓
-- 5. password_matches = true ✓
--
-- If all checks pass, login should work!
--
-- LOGIN CREDENTIALS:
-- Email: admin@ramahospital.com
-- Password: Admin@123
-- ========================================
