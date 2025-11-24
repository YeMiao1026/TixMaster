const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const db = require('./database');

/**
 * 🔍 Passport.js 設定檔
 * 
 * Passport 是一個認證中介軟體，它的工作流程：
 * 1. 使用者點擊「Google 登入」
 * 2. Passport 帶使用者去 Google 登入頁面
 * 3. 使用者授權後，Google 回傳資料給我們
 * 4. Passport 呼叫 verify callback（下面的函數）
 * 5. 我們在 callback 中處理使用者資料（存入資料庫）
 */

// 設定 Google OAuth 策略
passport.use(new GoogleStrategy({
    // Client ID - Google 用來識別你的應用程式
    clientID: process.env.GOOGLE_CLIENT_ID,

    // Client Secret - 證明你的應用程式身份（絕不能洩露！）
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,

    // Callback URL - Google 授權後要跳回的網址
    // 必須與 Google Console 設定的一致
    callbackURL: process.env.GOOGLE_CALLBACK_URL || "http://localhost:3000/auth/google/callback",

    // 要求 Google 提供的資料範圍
    // 'profile' = 姓名、照片等基本資料
    // 'email' = 電子郵件地址
    scope: ['profile', 'email']
},

    /**
     * 🎯 Verify Callback - Google 授權成功後會呼叫這個函數
     * 
     * @param {string} accessToken - 存取令牌（用來呼叫 Google API）
     * @param {string} refreshToken - 刷新令牌（token 過期時用來取得新 token）
     * @param {object} profile - Google 使用者資料
     * @param {function} done - 完成回調（告訴 Passport 處理結果）
     * 
     * profile 物件範例：
     * {
     *   id: '107234567890123456789',
     *   displayName: '王小明',
     *   emails: [{ value: 'user@gmail.com', verified: true }],
     *   photos: [{ value: 'https://...' }]
     * }
     */
    async function (accessToken, refreshToken, profile, done) {
        try {
            console.log('📧 Google OAuth - 收到使用者資料:', profile.displayName);

            // Step 1: 檢查這個 Google 帳號是否已經註冊過
            const oauthCheck = await db.query(
                'SELECT * FROM oauth_accounts WHERE provider = $1 AND provider_user_id = $2',
                ['google', profile.id]
            );

            let user;

            if (oauthCheck.rows.length > 0) {
                // 🔄 情況 A: 已經註冊過 - 直接登入
                console.log('✅ 使用者已存在，直接登入');

                const oauthAccount = oauthCheck.rows[0];

                // 取得完整使用者資料
                const userResult = await db.query(
                    'SELECT id, email, name, phone, created_at FROM users WHERE id = $1',
                    [oauthAccount.user_id]
                );

                user = userResult.rows[0];

                // 更新 OAuth token（Google 可能會給新的 token）
                await db.query(
                    `UPDATE oauth_accounts 
           SET access_token = $1, 
               refresh_token = $2, 
               token_expires_at = NOW() + INTERVAL '1 hour',
               updated_at = NOW()
           WHERE id = $3`,
                    [accessToken, refreshToken, oauthAccount.id]
                );

            } else {
                // 🆕 情況 B: 第一次用 Google 登入 - 建立新帳號
                console.log('🆕 新使用者，建立帳號');

                const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;
                const name = profile.displayName || 'Google User';

                // 檢查這個 email 是否已經用傳統方式註冊過
                const existingUser = await db.query(
                    'SELECT * FROM users WHERE email = $1',
                    [email]
                );

                if (existingUser.rows.length > 0) {
                    // 👤 Email 已存在 - 將 OAuth 帳號連結到現有使用者
                    console.log('🔗 Email 已存在，連結 OAuth 帳號');
                    user = existingUser.rows[0];

                } else {
                    // 🎉 完全新的使用者 - 建立新紀錄
                    const userResult = await db.query(
                        `INSERT INTO users (email, name, password_hash, created_at) 
             VALUES ($1, $2, NULL, NOW()) 
             RETURNING id, email, name, phone, created_at`,
                        [email, name]
                        // 注意：password_hash 是 NULL，因為 OAuth 使用者不需要密碼
                    );

                    user = userResult.rows[0];
                }

                // 建立 OAuth 帳號紀錄
                await db.query(
                    `INSERT INTO oauth_accounts 
           (user_id, provider, provider_user_id, access_token, refresh_token, token_expires_at, created_at)
           VALUES ($1, $2, $3, $4, $5, NOW() + INTERVAL '1 hour', NOW())`,
                    [user.id, 'google', profile.id, accessToken, refreshToken]
                );
            }

            // ✅ 完成！告訴 Passport 認證成功
            // user 物件會被傳給 serializeUser
            done(null, user);

        } catch (error) {
            console.error('❌ Google OAuth 錯誤:', error);
            done(error, null);
        }
    }
));

/**
 * 🔐 serializeUser - 決定要在 session 中儲存什麼
 * 
 * 登入成功後，Passport 會呼叫這個函數
 * 我們只儲存 user.id（不要儲存整個 user 物件，太大了）
 */
passport.serializeUser((user, done) => {
    console.log('💾 序列化使用者 ID:', user.id);
    done(null, user.id);
});

/**
 * 🔓 deserializeUser - 從 session 中的 ID 取得完整使用者資料
 * 
 * 每次使用者發送請求時，Passport 會呼叫這個函數
 * 用儲存的 ID 去資料庫查詢完整資料
 */
passport.deserializeUser(async (id, done) => {
    try {
        const result = await db.query(
            'SELECT id, email, name, phone, created_at FROM users WHERE id = $1',
            [id]
        );

        if (result.rows.length === 0) {
            return done(new Error('使用者不存在'), null);
        }

        console.log('🔍 反序列化使用者:', result.rows[0].email);
        done(null, result.rows[0]);

    } catch (error) {
        console.error('❌ 反序列化錯誤:', error);
        done(error, null);
    }
});

module.exports = passport;
