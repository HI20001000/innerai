import { Request, Response } from 'express';
import { prisma } from '../prismaClient.js';
import { comparePassword, hashPassword, signAccessToken } from '../utils/auth.js';
import { config } from '../config.js';
import { z } from 'zod';
import { AuthenticatedRequest } from '../middlewares/authMiddleware.js';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  inviteToken: z.string(),
  name: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const register = async (req: Request, res: Response) => {
  const parseResult = registerSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ message: 'Invalid payload', errors: parseResult.error.format() });
  }

  const { email, password, inviteToken, name } = parseResult.data;
  if (inviteToken !== config.registerInviteToken) {
    return res.status(403).json({ message: 'Invalid invite token' });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return res.status(409).json({ message: 'Email already registered' });
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({ data: { email, passwordHash, name, role: 'admin' } });
  const token = signAccessToken(user);
  return res.status(201).json({ token, user: { id: user.id, email: user.email, name: user.name } });
};

export const login = async (req: Request, res: Response) => {
  const parseResult = loginSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ message: 'Invalid payload', errors: parseResult.error.format() });
  }

  const { email, password } = parseResult.data;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const isValid = await comparePassword(password, user.passwordHash);
  if (!isValid) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const token = signAccessToken(user);
  return res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
};

export const me = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }
  return res.json({ user: { id: user.id, email: user.email, name: user.name } });
};
