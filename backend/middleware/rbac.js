const { ROLES, ROLE_PERMISSIONS } = require('../config/roles');

/**
 * 🛡️ RBAC Middleware
 */

/**
 * Check if user has a specific role
 * @param {string} requiredRole - Role required to access the route
 */
const checkRole = (requiredRole) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        // Admin has access to everything (optional design choice)
        if (req.user.role === ROLES.ADMIN) {
            return next();
        }

        if (req.user.role !== requiredRole) {
            return res.status(403).json({
                error: 'Forbidden',
                message: `Requires ${requiredRole} role`
            });
        }

        next();
    };
};

/**
 * Check if user has a specific permission
 * @param {string} permission - Permission required
 */
const checkPermission = (permission) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const userRole = req.user.role || ROLES.USER;
        const permissions = ROLE_PERMISSIONS[userRole] || [];

        if (!permissions.includes(permission)) {
            return res.status(403).json({
                error: 'Forbidden',
                message: `Missing permission: ${permission}`
            });
        }

        next();
    };
};

module.exports = {
    checkRole,
    checkPermission
};
