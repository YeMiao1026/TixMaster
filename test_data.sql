-- 測試腳本：驗證資料庫讀寫功能
-- 作者：Ops (Saisai568)

-- 1. 寫入 (INSERT) 測試資料
-- 注意：因為改用 Auth0，這裡不需要寫入密碼
INSERT INTO users (email, name) 
VALUES ('ops_demo@tixmaster.com', 'Ops Demo User');

INSERT INTO events (title, event_date, location, status) 
VALUES ('Cloud DB Connection Test', NOW(), 'Render Cloud Region', 'published');

-- 2. 讀取 (SELECT) 驗證
-- 應該要能看到剛剛寫入的那兩筆資料
SELECT id, email, name, created_at FROM users WHERE email = 'ops_demo@tixmaster.com';
SELECT id, title, status, event_date FROM events WHERE title = 'Cloud DB Connection Test';

-- 3. (選用) 清理測試資料
-- 如果你想測完就刪除，請把下面兩行取消註解
-- DELETE FROM users WHERE email = 'ops_demo@tixmaster.com';
-- DELETE FROM events WHERE title = 'Cloud DB Connection Test';