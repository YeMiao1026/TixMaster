const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const authenticateToken = require('../middleware/auth');
const { checkRole, checkPermission } = require('../middleware/rbac');
const { checkPolicy, policies } = require('../middleware/abac');
const { ROLES } = require('../config/roles');

// POST /api/users/register - 註冊新使用者
router.post('/register', async (req, res, next) => {
    try {
        const { email, password, name, phone } = req.body;

        // Validate input
        if (!email || !password || !name) {
            return res.status(400).json({ error: 'Email, password and name are required' });
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, 10);

        // Insert user with default role 'user' and empty attributes
        const result = await db.query(
            `INSERT INTO users (email, password_hash, name, phone, role, attributes) 
             VALUES ($1, $2, $3, $4, $5, $6) 
             RETURNING id, email, name, phone, role, created_at`,
            [email, passwordHash, name, phone, ROLES.USER, {}]
        );

        res.status(201).json({
            message: 'User registered successfully',
            user: result.rows[0]
        });
    } catch (err) {
        next(err);
    }
});

// POST /api/users/login - 使用者登入
router.post('/login', async (req, res, next) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        // Find user
        const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const user = result.rows[0];

        // Verify password
        const validPassword = await bcrypt.compare(password, user.password_hash);

        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Generate JWT token
        const token = jwt.sign(
            {
                userId: user.id,
                email: user.email,
                role: user.role || ROLES.USER // Include role in token
            },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                phone: user.phone,
                role: user.role
            }
        });
    } catch (err) {
        next(err);
    }
});

// GET /api/users/profile - 取得使用者資料 (需認證)
// ABAC: User can only view their own profile (implicit in logic, but explicit policy is better)
router.get('/profile', authenticateToken, async (req, res, next) => {
    try {
        const result = await db.query(
            'SELECT id, email, name, phone, role, attributes, created_at FROM users WHERE id = $1',
            [req.user.userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ user: result.rows[0] });
    } catch (err) {
        next(err);
    }
});

// PUT /api/users/profile - 更新使用者資料 (需認證)
// ABAC: User can only update their own profile
router.put('/profile', authenticateToken, checkPolicy(policies.isOwner), async (req, res, next) => {
    try {
        const { name, phone } = req.body;

        const result = await db.query(
            'UPDATE users SET name = $1, phone = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING id, email, name, phone, role',
            [name, phone, req.user.userId]
        );

        res.json({
            message: 'Profile updated successfully',
            user: result.rows[0]
        });
    } catch (err) {
        next(err);
    }
});

// POST /api/users/change-password - 修改密碼 (需認證)
router.post('/change-password', authenticateToken, checkPolicy(policies.isOwner), async (req, res, next) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'Current and new password are required' });
        }

        // Get current password hash
        const result = await db.query('SELECT password_hash FROM users WHERE id = $1', [req.user.userId]);
        const user = result.rows[0];

        // Verify current password
        const validPassword = await bcrypt.compare(currentPassword, user.password_hash);

        if (!validPassword) {
            return res.status(401).json({ error: 'Current password is incorrect' });
        }

        // Hash new password
        const newPasswordHash = await bcrypt.hash(newPassword, 10);

        // Update password
        await db.query(
            'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            [newPasswordHash, req.user.userId]
        );

        res.json({ message: 'Password changed successfully' });
    } catch (err) {
        next(err);
    }
});

// GET /api/users/all - 取得所有使用者 (Admin only)
// RBAC: Only admin can access
router.get('/all', authenticateToken, checkRole(ROLES.ADMIN), async (req, res, next) => {
    try {
        const result = await db.query(
            'SELECT id, email, name, phone, role, created_at FROM users ORDER BY created_at DESC'
        );
        res.json({ users: result.rows });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
