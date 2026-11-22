import { USER_ROLES, isAdminRole } from '@milky-shakes/shared';

/**
 * Express middleware enforcing Role-Based Access Control (RBAC) for administrative routes.
 */
export function requireAdminRole(req, res, next) {
  const role = req.headers['x-user-role'] || req.headers['x-role'] || req.user?.role;

  if (!role) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: Authentication credentials required to access management reporting.',
      code: 'AUTH_REQUIRED',
    });
  }

  const normalizedRole = String(role).toUpperCase().trim();

  if (!isAdminRole(normalizedRole)) {
    return res.status(403).json({
      success: false,
      error: 'Forbidden: Access restricted to store administrators (MANAGER or STAFF).',
      code: 'RBAC_FORBIDDEN',
      attemptedRole: normalizedRole,
    });
  }

  // Attach normalized role to request for handlers
  req.adminRole = normalizedRole;
  next();
}
