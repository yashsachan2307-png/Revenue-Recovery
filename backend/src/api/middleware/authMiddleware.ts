import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../../services/AuthService';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    merchantId: string;
    email: string;
    name: string;
    role: string;
  };
  merchantId?: string;
}

export function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing or invalid authentication token.' });
  }

  const token = authHeader.substring(7).trim();
  const payload = AuthService.verifyToken(token);

  if (!payload) {
    return res.status(401).json({ error: 'Unauthorized: Token is invalid or expired.' });
  }

  req.user = {
    id: payload.sub,
    merchantId: payload.merchantId,
    email: payload.email,
    name: payload.name,
    role: payload.role
  };
  req.merchantId = payload.merchantId;

  next();
}

export function optionalAuthMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    const payload = AuthService.verifyToken(token);
    if (payload) {
      req.user = {
        id: payload.sub,
        merchantId: payload.merchantId,
        email: payload.email,
        name: payload.name,
        role: payload.role
      };
      req.merchantId = payload.merchantId;
    }
  }
  next();
}
