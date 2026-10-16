import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { UserSession } from '../types/index.js';
import { Role } from '@prisma/client';

export interface AuthenticatedRequest extends Request {
  user?: UserSession;
}

export function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      error: 'AuthenticationRequired',
      message: 'Missing or invalid Authorization header.',
    });
    return;
  }

  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, config.jwtSecret) as UserSession;
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({
      error: 'InvalidToken',
      message: 'Token has expired or is invalid.',
    });
  }
}

export function requireRole(allowedRoles: Role[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
      return;
    }
    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        error: 'Forbidden',
        message: `Requires one of roles: ${allowedRoles.join(', ')}. Current role is ${req.user.role}.`,
      });
      return;
    }
    next();
  };
}
