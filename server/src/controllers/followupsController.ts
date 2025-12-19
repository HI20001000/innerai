import { Request, Response } from 'express';
import { prisma } from '../prismaClient.js';
import { z } from 'zod';
import { AuthenticatedRequest } from '../middlewares/authMiddleware.js';
import { FollowUpPriority, FollowUpStatus } from '@prisma/client';

const updateSchema = z.object({
  status: z.nativeEnum(FollowUpStatus).optional(),
  assigneeUserId: z.number().int().optional(),
  dueAt: z.string().datetime().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  priority: z.nativeEnum(FollowUpPriority).optional(),
});

export const listFollowups = async (req: Request, res: Response) => {
  const { status, assigneeUserId, meetingId, dueBefore } = req.query;
  const followups = await prisma.followUp.findMany({
    where: {
      ...(status ? { status: status as FollowUpStatus } : {}),
      ...(assigneeUserId ? { assigneeUserId: Number(assigneeUserId) } : {}),
      ...(meetingId ? { meetingId: Number(meetingId) } : {}),
      ...(dueBefore ? { dueAt: { lte: new Date(String(dueBefore)) } } : {}),
    },
    include: { meeting: true, assigneeUser: true },
    orderBy: { dueAt: 'asc' },
  });
  res.json(followups);
};

export const updateFollowup = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const parsed = updateSchema.safeParse({
    ...req.body,
    assigneeUserId: req.body.assigneeUserId ? Number(req.body.assigneeUserId) : undefined,
  });
  if (!parsed.success) return res.status(400).json({ message: 'Invalid payload' });

  const existing = await prisma.followUp.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ message: 'Follow-up not found' });

  const data: any = { ...parsed.data };
  if (parsed.data.dueAt) data.dueAt = new Date(parsed.data.dueAt);

  const followup = await prisma.followUp.update({ where: { id }, data });
  res.json(followup);
};

const commentSchema = z.object({ content: z.string().min(1) });

export const addComment = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
  const id = Number(req.params.id);
  const parsed = commentSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Invalid payload' });

  const followup = await prisma.followUp.findUnique({ where: { id } });
  if (!followup) return res.status(404).json({ message: 'Follow-up not found' });

  const comment = await prisma.followUpComment.create({
    data: {
      followupId: id,
      userId: req.user.id,
      content: parsed.data.content,
    },
  });

  res.status(201).json(comment);
};
