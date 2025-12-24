-- ========================================
-- FIX DATABASE & CREATE ADMIN USER (FINAL)
-- ========================================
-- This script completely fixes the users table and creates admin user
-- Run this entire script in Supabase SQL Editor

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ========================================
-- STEP 1: Drop foreign key constraint on users table
-- ========================================
-- First, check if the constraint exists and drop it
DO $$
BEGIN
    -- Drop the foreign key constraint if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'users_id_fkey'
        AND table_name = 'users'
    ) THEN
        ALTER TABLE users DROP CONSTRAINT users_id_fkey;
    END IF;
END $$;

-- ========================================
-- STEP 2: Modify users table structure
-- ========================================
-- Add password_hash column if it doesn't exist
ALTER TABLE users
ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- Add last_login column if it doesn't exist
ALTER TABLE users
ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ;

-- Make id column use gen_random_uuid() by default (if not already set)
ALTER TABLE users
ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- ========================================
-- STEP 3: Delete existing admin user if exists
-- ========================================
DELETE FROM users WHERE email = 'admin@ramahospital.com';

-- ========================================
-- STEP 4: Create admin user with proper password hash
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
-- STEP 5: Verify admin user was created
-- ========================================
SELECT
  id,
  email,
  full_name,
  role,
  is_active,
  created_at,
  (password_hash IS NOT NULL) as has_password,
  (password_hash LIKE '$2%') as is_bcrypt_hash,
  'SUCCESS! Admin user created' as status
FROM users
WHERE email = 'admin@ramahospital.com';

-- ========================================
-- STEP 6: Verify table structure
-- ========================================
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'users'
  AND column_name IN ('id', 'email', 'password_hash', 'full_name', 'role', 'is_active', 'last_login')
ORDER BY ordinal_position;

-- ========================================
-- SUCCESS!
-- ========================================
-- The users table has been fixed and admin user created.
--
-- LOGIN CREDENTIALS:
-- Email: admin@ramahospital.com
-- Password: Admin@123
--
-- You can now login at: http://localhost:3000
-- ========================================
