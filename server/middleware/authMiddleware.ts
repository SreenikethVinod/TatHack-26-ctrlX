import { Request, Response, NextFunction } from 'express';
import { db, User } from '../db.ts';
import { verifyToken, SystemRole } from '../services/authService.ts';

declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

export function resolveUserFromRequest(req: Request): User | null {
  // 1. Check Bearer Token
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    const payload = verifyToken(token);
    if (payload) {
      const user = db.getUserById(payload.sub);
      if (user) return user;
    }
  }

  // 2. Check User ID header (validated against real SQL database)
  const demoUserId = req.headers['x-demo-user-id'] as string;
  if (demoUserId) {
    const user = db.getUserById(demoUserId);
    if (user) return user;
  }

  return null;
}

export function authMiddleware(req: Request, _res: Response, next: NextFunction) {
  req.user = resolveUserFromRequest(req) || undefined;
  next();
}

export function requireRole(...allowedRoles: (SystemRole | 'official' | 'citizen' | 'admin')[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user || resolveUserFromRequest(req);
    if (!user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required. Please sign in to perform this action.',
      });
    }
    req.user = user;

    const userSystemRole = user.systemRole as SystemRole;
    const userRole = user.role;

    const hasAccess = allowedRoles.some((role) => {
      if (role === 'admin' && (userRole === 'admin' || userSystemRole === 'ADMIN')) return true;
      if (role === 'official' && (userRole === 'official' || userSystemRole !== 'CITIZEN')) return true;
      if (role === 'citizen' && userRole === 'citizen') return true;
      if (role === userSystemRole) return true;
      return false;
    });

    if (!hasAccess) {
      return res.status(403).json({
        error: 'Permission Denied',
        message: `Your account role (${userSystemRole || userRole}) does not have permission to execute this operation.`,
        requiredRoles: allowedRoles,
      });
    }

    next();
  };
}
