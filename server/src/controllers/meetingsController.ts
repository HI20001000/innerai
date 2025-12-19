import { Request, Response } from 'express';
import { prisma } from '../prismaClient.js';
import { AuthenticatedRequest } from '../middlewares/authMiddleware.js';
import { z } from 'zod';
import { callDifyAnalysis } from '../utils/dify.js';
import { FollowUpPriority, FollowUpStatus } from '@prisma/client';

const meetingCreateSchema = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
  occurredAt: z.string().datetime(),
  customerId: z.number().int(),
  manufacturerId: z.number().int(),
  productId: z.number().int(),
});

export const listMeetings = async (req: Request, res: Response) => {
  const { customerId, manufacturerId, productId, q, from, to } = req.query;
  const meetings = await prisma.meeting.findMany({
    where: {
      ...(customerId ? { customerId: Number(customerId) } : {}),
      ...(manufacturerId ? { manufacturerId: Number(manufacturerId) } : {}),
      ...(productId ? { productId: Number(productId) } : {}),
      ...(q
        ? {
            OR: [
              { title: { contains: String(q), mode: 'insensitive' } },
              { content: { contains: String(q), mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(from || to
        ? {
            occurredAt: {
              gte: from ? new Date(String(from)) : undefined,
              lte: to ? new Date(String(to)) : undefined,
            },
          }
        : {}),
    },
    orderBy: { occurredAt: 'desc' },
    include: {
      customer: true,
      manufacturer: true,
      product: true,
      analysis: true,
    },
  });
  res.json(meetings);
};

export const getMeeting = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const meeting = await prisma.meeting.findUnique({
    where: { id },
    include: {
      customer: true,
      manufacturer: true,
      product: true,
      analysis: true,
      followups: {
        include: { assigneeUser: true },
        orderBy: { createdAt: 'desc' },
      },
      createdByUser: true,
    },
  });
  if (!meeting) return res.status(404).json({ message: 'Meeting not found' });
  res.json(meeting);
};

export const createMeeting = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
  const parsed = meetingCreateSchema.safeParse({
    ...req.body,
    occurredAt: req.body.occurredAt,
    customerId: Number(req.body.customerId),
    manufacturerId: Number(req.body.manufacturerId),
    productId: Number(req.body.productId),
  });
  if (!parsed.success) return res.status(400).json({ message: 'Invalid payload' });

  const meeting = await prisma.meeting.create({
    data: {
      ...parsed.data,
      occurredAt: new Date(parsed.data.occurredAt),
      createdByUserId: req.user.id,
    },
  });

  const difyResult = await callDifyAnalysis(parsed.data.content);
  const analysis = await prisma.meetingAIAnalysis.create({
    data: {
      meetingId: meeting.id,
      summary: difyResult.summary ?? '',
      rawJson: JSON.stringify(difyResult),
    },
  });

  if (difyResult.followUps?.length) {
    const followupData = difyResult.followUps.map((item) => ({
      meetingId: meeting.id,
      title: item.title,
      description: item.description,
      suggestedOwnerName: item.suggestedOwner,
      dueAt: item.dueDate ? new Date(item.dueDate) : undefined,
      priority: item.priority ? (item.priority as FollowUpPriority) : undefined,
      status: FollowUpStatus.TODO,
    }));
    await prisma.followUp.createMany({ data: followupData });
  }

  const result = await prisma.meeting.findUnique({
    where: { id: meeting.id },
    include: {
      customer: true,
      manufacturer: true,
      product: true,
      analysis: true,
      followups: true,
    },
  });

  res.status(201).json({ meeting: result, analysis });
};
