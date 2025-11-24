const express = require('express');
const router = express.Router();
const db = require('../config/database');

// POST /api/analytics/event - 記錄分析事件
router.post('/event', async (req, res, next) => {
    try {
        const { userId, sessionId, eventType, eventData, featureFlagsSnapshot } = req.body;

        if (!eventType) {
            return res.status(400).json({ error: 'eventType is required' });
        }

        await db.query(
            `INSERT INTO analytics_events (user_id, session_id, event_type, event_data, feature_flags_snapshot) 
       VALUES ($1, $2, $3, $4, $5)`,
            [userId || null, sessionId, eventType, JSON.stringify(eventData || {}), JSON.stringify(featureFlagsSnapshot || {})]
        );

        res.status(201).json({ message: 'Event logged successfully' });
    } catch (err) {
        next(err);
    }
});

// GET /api/analytics/events - 取得分析事件 (可用於數據分析)
router.get('/events', async (req, res, next) => {
    try {
        const { eventType, limit = 100 } = req.query;

        let query = 'SELECT * FROM analytics_events';
        const params = [];

        if (eventType) {
            query += ' WHERE event_type = $1';
            params.push(eventType);
        }

        query += ' ORDER BY created_at DESC LIMIT $' + (params.length + 1);
        params.push(parseInt(limit));

        const result = await db.query(query, params);

        res.json({ events: result.rows });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
