require('dotenv').config();
const express = require('express');
const cors = require('cors');
const session = require('express-session');  // NEW - Session 管理
require('dotenv').config();
const passport = require('./config/passport');  // NEW - Passport 設定

const errorHandler = require('./middleware/errorHandler');
const featureFlagsMiddleware = require('./middleware/featureFlags');
const path = require('path');
const fs = require('fs');
const db = require('./config/database');

// Import routes
const usersRouter = require('./routes/users');
const eventsRouter = require('./routes/events');
const ticketsRouter = require('./routes/tickets');
const ordersRouter = require('./routes/orders');
const featureFlagsRouter = require('./routes/featureFlags');
const analyticsRouter = require('./routes/analytics');
const oauthRouter = require('./routes/oauth');  // NEW - OAuth routes

const app = express();
const PORT = process.env.PORT || 3000;

/**
 * 📌 Middleware 設定
 * 中介軟體的順序很重要！
 */

// CORS - 允許跨域請求
app.use(cors());

// Body Parser - 解析請求內容
app.use(express.json());  // 解析 JSON
app.use(express.urlencoded({ extended: true }));  // 解析表單資料

// Basic request logging to help debugging in production (prints method + path)
app.use((req, res, next) => {
    console.log(`[req] ${req.method} ${req.originalUrl}`);
    next();
});

/**
 * 🔐 Session 設定
 * 
 * Session 用來追蹤使用者的登入狀態
 * 即使我們用 JWT，Passport 還是需要 session 來運作
 * 
 * 運作原理：
 * 1. 使用者登入成功後，session 儲存使用者 ID
 * 2. Express 給使用者一個 session cookie
 * 3. 使用者之後的請求會帶著這個 cookie
 * 4. Express 用 cookie 找到對應的 session
 * 5. Passport 從 session 中取得使用者 ID
 * 6. 呼叫 deserializeUser 取得完整使用者資料
 */
app.use(session({
    // Session 的加密密鑰（請用環境變數！）
    secret: process.env.SESSION_SECRET || 'tixmaster-session-secret-change-this',

    // 不要在每次請求都重新儲存 session（效能優化）
    resave: false,

    // 不要為未登入的使用者建立 session
    saveUninitialized: false,

    // Cookie 設定
    cookie: {
        // Cookie 有效期限（7 天）
        maxAge: 7 * 24 * 60 * 60 * 1000,

        // HttpOnly: 防止 JavaScript 存取 cookie（防 XSS 攻擊）
        httpOnly: true,

        // Secure: 只在 HTTPS 使用（生產環境應該設為 true）
            secure: process.env.NODE_ENV === 'production',
            // sameSite 設為 'lax' 允許跨站導向時的 cookie（如 OAuth callback）的傳遞
            sameSite: 'lax'
    }
}));

    // 在部署於代理（如 Railway）時，需信任 proxy 以正確處理 secure cookie 與 req.secure
    app.set('trust proxy', 1);

/**
 * 🔑 Passport 初始化
 *
 * 必須在 session 之後初始化！
 */
app.use(passport.initialize());  // 初始化 Passport
app.use(passport.session());     // 讓 Passport 使用 session

/**
 * 🚩 Feature Flags Middleware
 *
 * 如果沒有設定 DATABASE_URL 或明確要求跳過 DB（SKIP_DB=true），
 * 我們會替換 middleware 為一個不依賴 DB 的簡易實作，避免在 CI 或本機沒有 DB 時啟動失敗。
 */
const skipDb = process.env.SKIP_DB === 'true' || !process.env.DATABASE_URL;
if (skipDb) {
    console.warn('[FeatureFlags] DATABASE_URL not set or SKIP_DB=true — using dummy feature flags');
    // stub attachFeatureFlags
    featureFlagsMiddleware.attachFeatureFlags = (req, res, next) => {
        req.featureFlags = {
            isEnabled: () => false,
            getAll: () => ({})
        };
        next();
    };
    // stub initialize to a no-op
    featureFlagsMiddleware.initialize = async () => {
        console.log('[FeatureFlags] initialize skipped (no DATABASE_URL)');
    };
}

app.use(featureFlagsMiddleware.attachFeatureFlags);

/**
 * 🏥 Health check endpoint
 */
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        message: 'TixMaster API is running',
        oauth: 'enabled'  // 標記 OAuth 已啟用
    });
});

/**
 * 🌐 路由註冊
 * 
 * 注意：OAuth 路由使用 /auth，不是 /api/auth
 * 這樣 Google 的重導向 URL 才會正確
 */

// OAuth 認證路由（新增！）
app.use('/auth', oauthRouter);

// 原有的 API 路由
app.use('/api/users', usersRouter);
app.use('/api/events', eventsRouter);
app.use('/api/tickets', ticketsRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/feature-flags', featureFlagsRouter);
app.use('/api/analytics', analyticsRouter);

/**
 * 📄 靜態檔案服務
 *
 * 原本程式使用相對路徑 express.static('../')，在不同平台或
 * Docker 工作目錄下可能找不到靜態檔案，導致回傳 404 JSON
 * ("Endpoint not found").這裡改為使用絕對路徑並加上容錯處理：
 * - 以 backend 的 __dirname 向上尋找 repo root
 * - 若找不到靜態資料夾或 index.html，會在 logs 顯示警告
 */
// Try to locate a static directory that contains index.html. Different
// deployment environments (Railway/Render/Docker) may place the repo at
// different working directories, so probe several likely candidates.
const candidates = [
    path.join(__dirname, '..'),           // repo root relative to backend
    path.join(__dirname, '..', 'public'), // repo root / public
    path.join(__dirname, 'public'),       // backend/public
    path.join(process.cwd(), '..'),       // parent of current cwd
    path.join(process.cwd(), '.'),        // current working dir
    path.resolve('/workspace'),           // some CI use /workspace
    path.resolve('/')                     // fallback to root
];

let chosenStatic = null;
for (const c of candidates) {
    try {
        const idx = path.join(c, 'index.html');
        if (fs.existsSync(idx)) {
            chosenStatic = c;
            console.log(`[static] Found index.html in ${c}`);
            break;
        }
    } catch (e) {
        // ignore inaccessible paths
    }
}

if (chosenStatic) {
    console.log(`[static] Serving static files from ${chosenStatic}`);
    app.use(express.static(chosenStatic));
} else {
    console.warn('[static] Warning: could not locate index.html in any candidate paths.');
    console.warn('[static] Candidates checked:', candidates.join(', '));
}

// Fallback: for non-API and non-auth routes, serve index.html if present in chosenStatic
app.use((req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/auth')) return next();

    if (chosenStatic) {
        const indexFile = path.join(chosenStatic, 'index.html');
        if (fs.existsSync(indexFile)) {
            return res.sendFile(indexFile);
        }
    }

    // No index.html found — continue to next handler which will return JSON 404
    return next();
});

/**
 * ❌ 404 處理
 */
app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
});

/**
 * 🚨 錯誤處理（必須放最後！）
 */
app.use(errorHandler);

/**
 * 🚀 啟動伺服器
 */
// 啟動前檢查重要環境變數
if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
    console.error('❌ FATAL: JWT_SECRET is not set in production. Set JWT_SECRET environment variable and restart.');
    process.exit(1);
}

app.listen(PORT, async () => {
    console.log(`🚀 TixMaster API server running on http://localhost:${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
    console.log(`🔐 OAuth routes:`);
    console.log(`   - Google login: http://localhost:${PORT}/auth/google`);
    console.log(`   - Callback: http://localhost:${PORT}/auth/google/callback`);
    console.log(`🚩 Feature flags: http://localhost:${PORT}/api/feature-flags`);

    // Initialize feature flags
    try {
        await featureFlagsMiddleware.initialize();
        console.log(`✅ Feature flags initialized`);
    } catch (error) {
        console.error(`❌ Failed to initialize feature flags:`, error);
    }
});

module.exports = app;

/**
 * Graceful shutdown and diagnostic handlers
 * - Log uncaught exceptions / unhandled rejections
 * - Capture SIGTERM/SIGINT to allow graceful DB pool shutdown
 */
process.on('uncaughtException', (err) => {
    console.error('❌ Uncaught Exception:', err && err.stack ? err.stack : err);
    // exit with failure (will be restarted by platform if configured)
    process.exit(1);
});

process.on('unhandledRejection', (reason, p) => {
    console.error('❌ Unhandled Rejection at:', p, 'reason:', reason);
    process.exit(1);
});

async function shutdown(signal) {
    try {
        console.log(`ℹ️ Received ${signal} - shutting down gracefully...`);
        if (db && db.pool && typeof db.pool.end === 'function') {
            console.log('ℹ️ Closing DB pool...');
            await db.pool.end();
            console.log('ℹ️ DB pool closed');
        }
    } catch (e) {
        console.error('❌ Error during shutdown:', e);
    } finally {
        // allow process to exit
        process.exit(0);
    }
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
