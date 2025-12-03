-- Add role and attributes columns to users table

-- Add role column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'role') THEN
        ALTER TABLE users ADD COLUMN role VARCHAR(50) DEFAULT 'user';
    END IF;
END $$;

-- Add attributes column if it doesn't exist (using JSONB for flexibility)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'attributes') THEN
        ALTER TABLE users ADD COLUMN attributes JSONB DEFAULT '{}';
    END IF;
END $$;

-- Set default role for existing users if null
UPDATE users SET role = 'user' WHERE role IS NULL;
UPDATE users SET attributes = '{}' WHERE attributes IS NULL;
