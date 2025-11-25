const express = require('express');
const router = express.Router();
const db = require('../config/database');

// GET /api/feature-flags - 取得所有功能開關
router.get('/', async (req, res, next) => {
    try {
        const result = await db.query(
            'SELECT flag_key, flag_value, description, updated_at FROM feature_flags ORDER BY flag_key'
        );

        // Convert to key-value format for easier frontend consumption
        const flags = {};
        result.rows.forEach(row => {
            flags[row.flag_key] = {
                enabled: row.flag_value,
                description: row.description,
                updatedAt: row.updated_at
            };
        });

        res.json({ flags });
    } catch (err) {
        next(err);
    }
});

// GET /api/feature-flags/:key - 取得單一功能開關
router.get('/:key', async (req, res, next) => {
    try {
        const { key } = req.params;

        const result = await db.query(
            'SELECT flag_key, flag_value, description, updated_at FROM feature_flags WHERE flag_key = $1',
            [key]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Feature flag not found' });
        }

        const flag = result.rows[0];

        res.json({
            key: flag.flag_key,
            enabled: flag.flag_value,
            description: flag.description,
            updatedAt: flag.updated_at
        });
    } catch (err) {
        next(err);
    }
});

// PUT /api/feature-flags/:key - 更新功能開關 (管理員用)
router.put('/:key', async (req, res, next) => {
    try {
        const { key } = req.params;
        const { enabled } = req.body;

        console.log(`[FeatureFlags API] PUT /${key}`);
        console.log(`[FeatureFlags API] Request body:`, req.body);
        console.log(`[FeatureFlags API] enabled value: ${enabled} (type: ${typeof enabled})`);

        if (typeof enabled !== 'boolean') {
            console.error(`[FeatureFlags API] Invalid type for enabled: ${typeof enabled}`);
            return res.status(400).json({
                error: 'enabled must be a boolean value',
                received: typeof enabled,
                value: enabled
            });
        }

        console.log(`[FeatureFlags API] Updating ${key} to ${enabled} in database`);

        const result = await db.query(
            'UPDATE feature_flags SET flag_value = $1, updated_at = CURRENT_TIMESTAMP WHERE flag_key = $2 RETURNING *',
            [enabled, key]
        );

        if (result.rows.length === 0) {
            console.error(`[FeatureFlags API] Flag not found: ${key}`);
            return res.status(404).json({ error: 'Feature flag not found' });
        }

        const updatedFlag = {
            message: 'Feature flag updated',
            flag: {
                key: result.rows[0].flag_key,
                enabled: result.rows[0].flag_value,
                description: result.rows[0].description
            }
        };

        console.log(`[FeatureFlags API] Successfully updated ${key}:`, updatedFlag);

        res.json(updatedFlag);
    } catch (err) {
        console.error(`[FeatureFlags API] Error:`, err);
        next(err);
    }
});

module.exports = router;
