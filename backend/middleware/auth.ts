import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../services/jwtService';
import { findUserById } from '../services/userService';

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        email: string;
        role: string;
      };
    }
  }
}

/**
 * Authentication middleware
 * Verifies JWT token and attaches user to request
 */
export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ 
        error: 'Unauthorized',
        message: 'No token provided. Please login first.' 
      });
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const payload = verifyAccessToken(token);

    // Verify user still exists and is active (check provider or patient)
    if (payload.role === 'patient') {
      // Check patient
      const { findPatientById } = await import('../services/patientService');
      const patient = await findPatientById(payload.userId);
      if (!patient || !patient.isActive) {
        res.status(401).json({ 
          error: 'Unauthorized',
          message: 'Patient not found or inactive' 
        });
        return;
      }
    } else {
      // Check provider
      const user = await findUserById(payload.userId);
      if (!user || !user.isActive) {
        res.status(401).json({ 
          error: 'Unauthorized',
          message: 'User not found or inactive' 
        });
        return;
      }
    }

    // Attach user to request
    req.user = {
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
    };

    next();
  } catch (error) {
    res.status(401).json({ 
      error: 'Unauthorized',
      message: error instanceof Error ? error.message : 'Invalid token' 
    });
  }
}

/**
 * Role-based authorization middleware
 */
export function authorize(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ 
        error: 'Unauthorized',
        message: 'Authentication required' 
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({ 
        error: 'Forbidden',
        message: 'Insufficient permissions' 
      });
      return;
    }

    next();
  };
}

/**
 * Optional authentication middleware
 * Attaches user if token is valid, but doesn't require it
 */
export async function optionalAuthenticate(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const payload = verifyAccessToken(token);
      const user = await findUserById(payload.userId);
      
      if (user && user.isActive) {
        req.user = {
          userId: payload.userId,
          email: payload.email,
          role: payload.role,
        };
      }
    }
  } catch {
    // Ignore errors for optional auth
  }
  
  next();
}

