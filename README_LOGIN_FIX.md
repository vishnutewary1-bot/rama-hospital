# 🔐 Login Fix - Run This Script in Supabase

## ⚠️ IMPORTANT: The Problem

The `users` table had a foreign key constraint to `auth.users` table, but we're using a standalone authentication system. This needs to be fixed.

## ✅ The Solution

Run the script below in your Supabase SQL Editor.

---

## 📋 Step-by-Step Instructions

### 1. Go to Supabase
- Open: https://supabase.com/dashboard
- Select project: **rama-hospital**

### 2. Open SQL Editor
- Click **SQL Editor** in left sidebar
- Click **New Query** button

### 3. Copy and Run This Script

**File:** `FIX_DATABASE_FINAL.sql`

Or copy from here and paste into Supabase SQL Editor:

```sql
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Drop foreign key constraint
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'users_id_fkey'
        AND table_name = 'users'
    ) THEN
        ALTER TABLE users DROP CONSTRAINT users_id_fkey;
    END IF;
END $$;

-- Add password_hash column
ALTER TABLE users
ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- Add last_login column
ALTER TABLE users
ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ;

-- Make id column use gen_random_uuid()
ALTER TABLE users
ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- Delete existing admin
DELETE FROM users WHERE email = 'admin@ramahospital.com';

-- Create admin user
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
  crypt('Admin@123', gen_salt('bf')),
  'System Administrator',
  'admin',
  NULL,
  true,
  now(),
  now()
);

-- Verify success
SELECT
  id,
  email,
  full_name,
  role,
  is_active,
  (password_hash IS NOT NULL) as has_password,
  (password_hash LIKE '$2%') as is_bcrypt_hash,
  'SUCCESS! Admin user created' as status
FROM users
WHERE email = 'admin@ramahospital.com';
```

### 4. Click RUN

You should see a result table showing:
- email: admin@ramahospital.com
- has_password: true
- is_bcrypt_hash: true
- status: SUCCESS! Admin user created

---

## 🎯 Now Login!

1. Open: **http://localhost:3000**
2. Enter:
   - **Email:** `admin@ramahospital.com`
   - **Password:** `Admin@123`
3. Click **Login**

You should now be logged in! 🎉

---

## 🆘 If It Still Doesn't Work

Run this query to check the user:

```sql
SELECT
  id,
  email,
  full_name,
  role,
  is_active,
  (password_hash IS NOT NULL) as has_password,
  LEFT(password_hash, 10) as password_preview
FROM users
WHERE email = 'admin@ramahospital.com';
```

You should see:
- has_password: **true**
- password_preview: **$2a$10$...** or **$2b$10$...**

If `has_password` is **false**, run the script again.

---

## ✅ What This Script Does

1. ✅ Removes the foreign key constraint on users.id
2. ✅ Adds password_hash column to users table
3. ✅ Adds last_login column to users table
4. ✅ Creates admin user with bcrypt password hash
5. ✅ Verifies the user was created correctly

---

**After successful login, your Rama Hospital Management System is 100% ready to use!** 🏥✨
