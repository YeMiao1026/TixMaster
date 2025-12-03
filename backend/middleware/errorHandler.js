const errorHandler = (err, req, res, next) => {
    console.error('Error:', err);

    // Database errors
    if (err.code === '23505') {
        return res.status(409).json({ error: 'Duplicate entry', details: err.detail });
    }

    if (err.code === '23503') {
        return res.status(400).json({ error: 'Invalid reference', details: err.detail });
    }

    // Validation errors
    if (err.name === 'ValidationError') {
        return res.status(400).json({ error: err.message });
    }

    // Default error
    res.status(err.statusCode || 500).json({
        error: err.message || 'Internal server error'
    });
};

module.exports = errorHandler;
