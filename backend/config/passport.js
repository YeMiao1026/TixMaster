const passport = require('passport');
const Auth0Strategy = require('passport-auth0');
const db = require('./database');

/**
 * 🔍 Passport.js 設定檔
 * 
 * 為避免在部署環境缺少 Auth0 設定時整個程式崩潰，
 * 這裡會先檢查必要的環境變數（AUTH0_DOMAIN / AUTH0_CLIENT_ID / AUTH0_CLIENT_SECRET），
 * 若缺少任何一個，會跳過初始化 Auth0Strategy 並在 log 中給出明確提示。
 */

// Helper to check required Auth0 env vars
function hasAuth0Config() {
    return !!(process.env.AUTH0_DOMAIN && process.env.AUTH0_CLIENT_ID && process.env.AUTH0_CLIENT_SECRET);
}

// 設定 Auth0 OAuth 策略（僅在必要 env 存在時初始化）
if (hasAuth0Config()) {
    try {
        passport.use(new Auth0Strategy({
            domain: process.env.AUTH0_DOMAIN,
            clientID: process.env.AUTH0_CLIENT_ID,
            clientSecret: process.env.AUTH0_CLIENT_SECRET,
            callbackURL: process.env.AUTH0_CALLBACK_URL || "http://localhost:3000/auth/callback",
            scope: 'openid profile email'
        },

            async function (accessToken, refreshToken, extraParams, profile, done) {
                try {
                    console.log('📧 Auth0 OAuth - 收到使用者資料:', profile.displayName || profile.username);

                    const providerId = profile.id;

                    // Step 1: 檢查這個 Auth0 帳號是否已經註冊過
                    const oauthCheck = await db.query(
                        'SELECT * FROM oauth_accounts WHERE provider = $1 AND provider_user_id = $2',
                        ['auth0', providerId]
                    );

                    let user;

                    if (oauthCheck.rows.length > 0) {
                        console.log('✅ 使用者已存在，直接登入');
                        const oauthAccount = oauthCheck.rows[0];

                        const userResult = await db.query(
                            'SELECT id, email, name, phone, role FROM users WHERE id = $1',
                            [oauthAccount.user_id]
                        );

                        user = userResult.rows[0];

                        // 更新 token
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
                        console.log('🆕 新使用者或連結現有帳號');

                        const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;
                        const name = profile.displayName || profile.username || 'Auth0 User';

                        // 如果此 email 已存在，將 OAuth 帳號連結到現有使用者
                        const existingUser = email ? await db.query('SELECT * FROM users WHERE email = $1', [email]) : { rows: [] };

                        if (existingUser.rows.length > 0) {
                            user = existingUser.rows[0];
                        } else {
                            const userResult = await db.query(
                                `INSERT INTO users (email, name, password_hash, created_at) 
             VALUES ($1, $2, NULL, NOW()) 
             RETURNING id, email, name, phone, role`,
                                [email, name]
                            );
                            user = userResult.rows[0];
                        }

                        await db.query(
                            `INSERT INTO oauth_accounts 
           (user_id, provider, provider_user_id, access_token, refresh_token, token_expires_at, created_at)
           VALUES ($1, $2, $3, $4, $5, NOW() + INTERVAL '1 hour', NOW())`,
                            [user.id, 'auth0', providerId, accessToken, refreshToken]
                        );
                    }

                    done(null, user);

                } catch (error) {
                    console.error('❌ Auth0 OAuth 錯誤:', error);
                    done(error, null);
                }
            }
        ));
    } catch (e) {
        console.error('❌ Failed to initialize Auth0Strategy:', e.message || e);
    }
} else {
    console.warn('[Auth0] Missing Auth0 configuration (AUTH0_DOMAIN/CLIENT_ID/CLIENT_SECRET). OAuth endpoints will be disabled.');
}
    
// 印出當前使用的 callback URL（方便部署時快速確認）
console.log('[Auth0] Using callback URL =', process.env.AUTH0_CALLBACK_URL || 'http://localhost:3000/auth/callback');

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
