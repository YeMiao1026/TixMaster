# Database Change Report: RBAC/ABAC Implementation
**Date:** 2025-11-25
**Author:** Antigravity (AI Assistant)
**Target Table:** `users`

## Summary of Changes
To support Role-Based Access Control (RBAC) and Attribute-Based Access Control (ABAC), the `users` table schema has been modified.

### 1. New Column: `role`
- **Type:** `VARCHAR(50)`
- **Default:** `'user'`
- **Purpose:** Stores the user's role (e.g., `admin`, `organizer`, `user`).
- **Constraint:** None currently (application level validation).

### 2. New Column: `attributes`
- **Type:** `JSONB`
- **Default:** `'{}'`
- **Purpose:** Stores dynamic user attributes for fine-grained ABAC policies (e.g., `{ "vip_level": 1, "region": "TW" }`).

## Executed SQL Script
The following SQL was executed to apply the changes:

```sql
-- Add role column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'role') THEN
        ALTER TABLE users ADD COLUMN role VARCHAR(50) DEFAULT 'user';
    END IF;
END $$;

-- Add attributes column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'attributes') THEN
        ALTER TABLE users ADD COLUMN attributes JSONB DEFAULT '{}';
    END IF;
END $$;

-- Backfill existing data
UPDATE users SET role = 'user' WHERE role IS NULL;
UPDATE users SET attributes = '{}' WHERE attributes IS NULL;
```

## Verification
- Columns `role` and `attributes` have been verified in `information_schema`.
- Existing users have been backfilled with default values.

## Rollback Plan
If these changes need to be reverted, execute the following:

```sql
ALTER TABLE users DROP COLUMN role;
ALTER TABLE users DROP COLUMN attributes;
```

## Notes
- The `init.sql` file should be updated to reflect these changes for new deployments.
