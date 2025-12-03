const express = require('express');
const router = express.Router();
const db = require('../config/database');

// GET /api/events - 取得所有已發布的活動
router.get('/', async (req, res, next) => {
    try {
        const result = await db.query(
            `SELECT id, title, description, event_date, location, image_url, status, created_at 
       FROM events 
       WHERE status = 'published' 
       ORDER BY event_date ASC`
        );

        res.json({ events: result.rows });
    } catch (err) {
        next(err);
    }
});

// GET /api/events/:id - 取得單一活動詳細資訊
router.get('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;

        const result = await db.query(
            'SELECT id, title, description, event_date, location, image_url, status, created_at FROM events WHERE id = $1',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Event not found' });
        }

        res.json({ event: result.rows[0] });
    } catch (err) {
        next(err);
    }
});

// GET /api/events/:id/tickets - 取得活動的所有票種
router.get('/:id/tickets', async (req, res, next) => {
    try {
        const { id } = req.params;

        // Check if event exists
        const eventCheck = await db.query('SELECT id FROM events WHERE id = $1', [id]);
        if (eventCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Event not found' });
        }

        // Get tickets for this event
        const result = await db.query(
            'SELECT id, event_id, ticket_type, price, total_quantity, available_quantity, created_at FROM tickets WHERE event_id = $1',
            [id]
        );

        res.json({ tickets: result.rows });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
