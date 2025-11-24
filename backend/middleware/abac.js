/**
 * 🎭 ABAC Middleware
 * Attribute-Based Access Control
 */

/**
 * Check if user meets a dynamic policy
 * @param {function} policyFn - Function that returns true if access is allowed
 *                              (user, resource) => boolean
 */
const checkPolicy = (policyFn) => {
    return async (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        try {
            // Resource can be in body, params, or query
            // We pass the entire request object for maximum flexibility, 
            // but usually policies care about specific resources.
            // For simplicity in this middleware, we let the policyFn handle extraction if needed,
            // OR we can pass a standard 'resource' object if we standardize it.

            // Here we pass the full request so the policy can inspect params/body
            const allowed = await policyFn(req.user, req);

            if (!allowed) {
                return res.status(403).json({
                    error: 'Forbidden',
                    message: 'Access denied by policy'
                });
            }

            next();
        } catch (error) {
            console.error('ABAC Policy Error:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    };
};

// --- Common Policies ---

/**
 * Policy: User can only access their own data
 * Assumes resource ID is in req.params.id or req.user.id matches target
 */
const isOwner = (user, req) => {
    // If accessing /users/:id
    if (req.params.id) {
        return user.id === req.params.id;
    }
    // If accessing /users/profile (implicit own profile)
    return true;
};

/**
 * Policy: User is admin OR owner
 */
const isAdminOrOwner = (user, req) => {
    if (user.role === 'admin') return true;
    return isOwner(user, req);
};

module.exports = {
    checkPolicy,
    policies: {
        isOwner,
        isAdminOrOwner
    }
};
