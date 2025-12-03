const express = require('express');
const router = express.Router();
const db = require('../config/database');

// GET /api/tickets/:id - 取得單一票種資訊
router.get('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;

        const result = await db.query(
            'SELECT id, event_id, ticket_type, price, total_quantity, available_quantity, created_at FROM tickets WHERE id = $1',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Ticket not found' });
        }

        res.json({ ticket: result.rows[0] });
    } catch (err) {
        next(err);
    }
});

// GET /api/tickets/:id/availability - 檢查票券可用數量
router.get('/:id/availability', async (req, res, next) => {
    try {
        const { id } = req.params;

        const result = await db.query(
            'SELECT id, ticket_type, available_quantity, total_quantity FROM tickets WHERE id = $1',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Ticket not found' });
        }

        const ticket = result.rows[0];
        const isAvailable = ticket.available_quantity > 0;

        res.json({
            ticketId: ticket.id,
            ticketType: ticket.ticket_type,
            available: isAvailable,
            availableQuantity: ticket.available_quantity,
            totalQuantity: ticket.total_quantity
        });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
