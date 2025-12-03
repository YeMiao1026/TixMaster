-- 🔧 修正 OAuth 使用者的資料庫約束問題
-- 
-- 問題：OAuth 使用者不需要密碼，但 password_hash 欄位設定為 NOT NULL
-- 解決：允許 password_hash 為 NULL

-- 執行這個 SQL 指令：
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;

-- 驗證修改：
-- 執行後，password_hash 欄位應該可以是 NULL
-- OAuth 使用者的 password_hash 會是 NULL
-- 傳統註冊的使用者仍然有 password_hash

-- 🎯 說明：
-- 1. OAuth 使用者（Google 登入）：password_hash = NULL
-- 2. 傳統註冊使用者：password_hash = bcrypt hash

-- ✅ 這樣兩種登入方式可以並存！
