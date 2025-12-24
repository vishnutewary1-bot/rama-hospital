-- ========================================
-- FIX DATABASE & CREATE ADMIN USER
-- ========================================
-- This script fixes the users table and creates admin user
-- Run this entire script in Supabase SQL Editor

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ========================================
-- STEP 1: Fix users table - Add password_hash column
-- ========================================
ALTER TABLE users
ADD COLUMN IF NOT EXISTS password_hash TEXT;

ALTER TABLE users
ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ;

-- ========================================
-- STEP 2: Delete existing admin if exists
-- ========================================
DELETE FROM users WHERE email = 'admin@ramahospital.com';

-- ========================================
-- STEP 3: Create admin user with proper password hash
-- ========================================
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
  crypt('Admin@123', gen_salt('bf')),  -- bcrypt hashed password
  'System Administrator',
  'admin',
  NULL,
  true,
  now(),
  now()
);

-- ========================================
-- STEP 4: Verify admin user was created
-- ========================================
SELECT
  id,
  email,
  full_name,
  role,
  is_active,
  created_at,
  (password_hash IS NOT NULL) as has_password,
  'Login: admin@ramahospital.com / Admin@123' as credentials
FROM users
WHERE email = 'admin@ramahospital.com';

-- ========================================
-- SUCCESS!
-- ========================================
-- The admin user has been created successfully.
--
-- LOGIN CREDENTIALS:
-- Email: admin@ramahospital.com
-- Password: Admin@123
--
-- You can now login at: http://localhost:3000
-- ========================================
