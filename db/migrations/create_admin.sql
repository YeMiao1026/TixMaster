-- 建立管理員賬戶用於測試
-- Email: admin@tixmaster.com
-- 密碼: admin123
-- 密碼 hash 使用 bcrypt 生成 (salt rounds = 10)

-- 檢查是否已存在管理員賬戶
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM users WHERE email = 'admin@tixmaster.com') THEN
        INSERT INTO users (email, password_hash, name, phone, role, created_at, updated_at)
        VALUES (
            'admin@tixmaster.com',
            '$2b$10$SJHcEDF1dBZ03/eJNSXyyeE1Y6pqzgYN/x1X/Si7ivm0gFEe2MUgG',  -- admin123
            'System Admin',
            '0900000000',
            'admin',
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP
        );
        RAISE NOTICE '管理員帳號已建立: admin@tixmaster.com / admin123';
    ELSE
        RAISE NOTICE '管理員帳號已存在: admin@tixmaster.com';
        -- 如果需要更新密碼，取消下面的註釋
        -- UPDATE users SET password_hash = '$2b$10$SJHcEDF1dBZ03/eJNSXyyeE1Y6pqzgYN/x1X/Si7ivm0gFEe2MUgG' WHERE email = 'admin@tixmaster.com';
    END IF;
END $$;
