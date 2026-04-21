-- SQL for Supabase User Management Setup
-- Run this script in your Supabase SQL Editor to configure the 'users' table roles and schema.

-- 1. ENFORCE ROLE CONSTRAINTS
-- This ensures only valid roles can be assigned to users.
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('owner', 'supervisor', 'journalist', 'corrector', 'user'));

-- 2. SETUP STATUS COLUMN
-- Ensures users have a status and restricts it to 'active' or 'suspended'.
ALTER TABLE users ALTER COLUMN status SET DEFAULT 'active';
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_status_check;
ALTER TABLE users ADD CONSTRAINT users_status_check CHECK (status IN ('active', 'suspended'));

-- 3. ENSURE METADATA COLUMNS EXIST
-- Adds columns for special notes and punishment reasons if they don't already exist.
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='special_notes') THEN
        ALTER TABLE users ADD COLUMN special_notes TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='punishment_reason') THEN
        ALTER TABLE users ADD COLUMN punishment_reason TEXT;
    END IF;
END $$;

-- 4. OPTIMIZE WITH INDEXES
-- Improves search performance for usernames and roles.
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Role Mapping Reference (For Frontend):
-- 'owner'      -> Propriétaire (Théo Forest Tran)
-- 'supervisor' -> Superviseurs
-- 'journalist' -> Journalistes
-- 'corrector'  -> Correcteurs
-- 'user'       -> Public
