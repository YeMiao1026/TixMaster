const express = require('express');
const cors = require('cors');
require('dotenv').config();

const errorHandler = require('./middleware/errorHandler');

// Import routes
const usersRouter = require('./routes/users');
const eventsRouter = require('./routes/events');
const ticketsRouter = require('./routes/tickets');
const ordersRouter = require('./routes/orders');
const featureFlagsRouter = require('./routes/featureFlags');
const analyticsRouter = require('./routes/analytics');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors()); // Enable CORS for all origins
app.use(express.json()); // Parse JSON request bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'OK', message: 'TixMaster API is running' });
});

// API Routes
app.use('/api/users', usersRouter);
app.use('/api/events', eventsRouter);
app.use('/api/tickets', ticketsRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/feature-flags', featureFlagsRouter);
app.use('/api/analytics', analyticsRouter);

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
    console.log(`🚀 TixMaster API server running on http://localhost:${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
});

module.exports = app;
