const express = require('express');
const router = express.Router();
const passport = require('../config/passport');
const jwt = require('jsonwebtoken');

/**
 * 🚀 OAuth 路由檔案
 * 
 * 這個檔案處理三個主要功能：
 * 1. 啟動 Google OAuth 流程
 * 2. 處理 Google 回調
 * 3. 登出功能
 */

/**
 * 路由 1: GET /auth/google
 * 🎯 啟動 Google OAuth 流程
 * 
 * 當使用者點擊「Google 登入」按鈕時，會導向這個路由
 * Passport 會自動把使用者重導向到 Google 登入頁面
 * 
 * 流程：
 * 1. 使用者點擊「Google 登入」
 * 2. 前端導向 http://localhost:3000/auth/google
 * 3. Passport 重導向到 Google 登入頁面（附帶 client_id, redirect_uri 等參數）
 * 4. 使用者在 Google 頁面登入並授權
 */
router.get('/google',
    passport.authenticate('google', {
        // 要求 Google 提供的資料權限
        scope: ['profile', 'email'],

        // 使用 session 來追蹤登入狀態
        session: false  // 我們用 JWT，不需要 session
    })
);

/**
 * 路由 2: GET /auth/google/callback
 * 🔄 處理 Google 授權回調
 * 
 * Google 授權成功後會跳回這個路由，並帶著 authorization code
 * Passport 會自動用 code 換取 access_token，並呼叫 verify callback
 * 
 * 流程：
 * 1. Google 重導回 http://localhost:3000/auth/google/callback?code=xxx
 * 2. Passport 用 code 換 token
 * 3. Passport 取得使用者資料
 * 4. 呼叫我們在 passport.js 寫的 verify callback
 * 5. 如果成功，執行下面的回調函數
 * 
 * URL 參數：
 * - ?code=xxx          (成功時)
 * - ?error=xxx         (失敗時)
 */
router.get('/google/callback',
    passport.authenticate('google', {
        // 驗證失敗時的處理
        failureRedirect: '/login.html?error=oauth_failed',

        // 不使用 session（因為我們用 JWT）
        session: false
    }),

    // ✅ 認證成功的處理函數
    async (req, res) => {
        try {
            // req.user 是從 passport.js 的 verify callback 傳來的
            const user = req.user;

            console.log('✅ OAuth 登入成功:', user.email);

            // 🎫 產生 JWT token
            // 這個 token 包含使用者資訊，前端會用它來證明身份
            const token = jwt.sign(
                {
                    userId: user.id,
                    email: user.email,
                    // 特別標記：這是 OAuth 登入的使用者
                    loginMethod: 'google'
                },
                process.env.JWT_SECRET,
                { expiresIn: '7d' }  // 7 天後過期
            );

            /**
             * 🔀 重導向回前端首頁，並帶著 token
             * 
             * 方式一：透過 URL fragment (#)
             * 優點：token 不會被伺服器記錄
             * 缺點：需要前端 JavaScript 處理
             */
            res.redirect(`/simple.html#token=${token}`);

            /**
             * 方式二：透過 Query parameter (?)
             * 缺點：token 會出現在 URL，較不安全
             * res.redirect(`/index.html?token=${token}`);
             */

            /**
             * 方式三：透過 Cookie
             * 優點：更安全
             * 缺點：需要處理 CORS
             * 
             * res.cookie('token', token, {
             *   httpOnly: true,
             *   secure: process.env.NODE_ENV === 'production',
             *   maxAge: 7 * 24 * 60 * 60 * 1000  // 7 days
             * });
             * res.redirect('/index.html');
             */

        } catch (error) {
            console.error('❌ 回調處理錯誤:', error);
            res.redirect('/login.html?error=server_error');
        }
    }
);

/**
 * 路由 3: GET /auth/logout
 * 🚪 登出功能
 * 
 * 清除 session 並登出
 * （如果使用 JWT，前端只需刪除 localStorage 中的 token）
 */
router.get('/logout', (req, res) => {
    // 如果使用 Passport session
    req.logout((err) => {
        if (err) {
            console.error('❌ 登出錯誤:', err);
            return res.status(500).json({ error: 'Logout failed' });
        }

        console.log('👋 使用者登出');
        res.json({ message: 'Logged out successfully' });
    });
});

/**
 * 路由 4: GET /auth/status
 * 📊 檢查登入狀態（測試用）
 * 
 * 回傳目前使用者的登入狀態
 */
router.get('/status', (req, res) => {
    if (req.user) {
        res.json({
            loggedIn: true,
            user: {
                id: req.user.id,
                email: req.user.email,
                name: req.user.name
            }
        });
    } else {
        res.json({
            loggedIn: false
        });
    }
});

module.exports = router;
