import { USER_ROLES, isAdminRole } from '@milky-shakes/shared';

/**
 * Express middleware enforcing Role-Based Access Control (RBAC) for administrative routes (AC-FR-005.3).
 *
 * Rules:
 * 1. Checks for user role in request headers:
 *    - 'x-user-role' or 'x-role' (sent by client / gateway)
 *    - or req.user.role (from authenticated session/JWT)
 * 2. If unauthenticated / no role: returns HTTP 401 Unauthorized
 * 3. If role is non-admin (e.g. 'PATRON'): returns HTTP 403 Forbidden (AC-FR-005.3)
 * 4. If role is 'MANAGER' or 'STAFF': allows request to proceed
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
