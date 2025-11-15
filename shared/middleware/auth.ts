import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    role: 'superadmin' | 'admin' | 'teacher' | 'student';
    schoolId: string | null;
  };
}

export const verifyToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = (req as any).headers?.authorization;
    const token = authHeader?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: '인증 토큰이 필요합니다' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      userId: string;
      role: 'superadmin' | 'admin' | 'teacher' | 'student';
      schoolId: string | null;
    };

    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: '유효하지 않은 토큰입니다' });
  }
};

export const requireRole = (...roles: ('superadmin' | 'admin' | 'teacher' | 'student')[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: '인증이 필요합니다' });
    }

    if (!roles.includes(req.user.role as any)) {
      return res.status(403).json({ error: '권한이 없습니다' });
    }

    next();
  };
};

export const requireSchool = (req: AuthRequest, res: Response, next: NextFunction) => {
  // Super admin can access all schools
  if (req.user?.role === 'superadmin') {
    return next();
  }
  
  if (!req.user?.schoolId) {
    return res.status(403).json({ error: '학교 정보가 없습니다' });
  }
  next();
};
