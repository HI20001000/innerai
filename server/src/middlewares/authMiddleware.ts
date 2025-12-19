import { NextFunction, Request, Response } from 'express';
import { verifyToken } from '../utils/auth.js';
import { prisma } from '../prismaClient.js';

export interface AuthenticatedRequest extends Request {
  user?: { id: number; email: string; role?: string };
}

export const requireAuth = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  const token = authHeader.replace('Bearer ', '');
  try {
    const decoded = verifyToken(token);
    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    if (!user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    req.user = { id: user.id, email: user.email, role: user.role ?? undefined };
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
};
