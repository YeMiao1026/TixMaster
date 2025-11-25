/**
 * 🎭 Role Definitions
 * 
 * Defines available roles and their permissions.
 */

const ROLES = {
    ADMIN: 'admin',
    ORGANIZER: 'organizer',
    USER: 'user'
};

const PERMISSIONS = {
    // User management
    VIEW_USERS: 'view_users',
    MANAGE_USERS: 'manage_users',

    // Event management
    CREATE_EVENT: 'create_event',
    EDIT_EVENT: 'edit_event',
    DELETE_EVENT: 'delete_event',

    // System
    VIEW_ANALYTICS: 'view_analytics',
    MANAGE_FEATURE_FLAGS: 'manage_feature_flags'
};

const ROLE_PERMISSIONS = {
    [ROLES.ADMIN]: [
        PERMISSIONS.VIEW_USERS,
        PERMISSIONS.MANAGE_USERS,
        PERMISSIONS.CREATE_EVENT,
        PERMISSIONS.EDIT_EVENT,
        PERMISSIONS.DELETE_EVENT,
        PERMISSIONS.VIEW_ANALYTICS,
        PERMISSIONS.MANAGE_FEATURE_FLAGS
    ],
    [ROLES.ORGANIZER]: [
        PERMISSIONS.CREATE_EVENT,
        PERMISSIONS.EDIT_EVENT,
        PERMISSIONS.VIEW_ANALYTICS
    ],
    [ROLES.USER]: [
        // Basic users have no special permissions by default
        // They can only access their own data (handled by ABAC)
    ]
};

module.exports = {
    ROLES,
    PERMISSIONS,
    ROLE_PERMISSIONS
};
