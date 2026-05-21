import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import type { JwtPayload } from '../middlewares/auth';
import { z } from 'zod';
import { env } from '../utils/env';

export async function listTimeline(req: Request, res: Response) {
  const { id } = req.params;
  const caseRow = await prisma.case.findFirst({ where: { OR: [{ id }, { externalId: id }] } });
  if (!caseRow) return res.status(404).json({ error: 'Case not found' });
  if (env.DEMO_MODE && !caseRow.externalId.startsWith('DEMO-CASE-')) return res.status(404).json({ error: 'Demo case not found' });
  const user = (req as any).user as JwtPayload;
  if (!['admin','clerk'].includes(user.role)) {
    const allowed = (user.role === 'judge' && caseRow.judgeId === user.sub)
      || (user.role === 'lawyer' && caseRow.lawyerId === user.sub)
      || (user.role === 'prosecutor' && caseRow.prosecutorId === user.sub);
    if (!allowed) return res.status(403).json({ error: 'Forbidden' });
  }
  const events = await prisma.timelineEvent.findMany({ where: { caseId: caseRow.id }, orderBy: { timestamp: 'desc' } });
  return res.json(events);
}

const addTimelineSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional().default(''),
  type: z.string().optional().default('action')
});

export async function addTimeline(req: Request, res: Response) {
  const user = (req as any).user as JwtPayload;
  const { id } = req.params;
  const caseRow = await prisma.case.findFirst({ where: { OR: [{ id }, { externalId: id }] } });
  if (!caseRow) return res.status(404).json({ error: 'Case not found' });
  if (env.DEMO_MODE && !caseRow.externalId.startsWith('DEMO-CASE-')) return res.status(404).json({ error: 'Demo case not found' });
  if (!['admin','clerk'].includes(user.role)) {
    const allowed = (user.role === 'judge' && caseRow.judgeId === user.sub)
      || (user.role === 'lawyer' && caseRow.lawyerId === user.sub)
      || (user.role === 'prosecutor' && caseRow.prosecutorId === user.sub);
    if (!allowed) return res.status(403).json({ error: 'Forbidden' });
  }
  const parse = addTimelineSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: parse.error.flatten() });
  const { title, description, type } = parse.data;
  const ev = await prisma.timelineEvent.create({
    data: {
      caseId: caseRow.id,
      type,
      title,
      description,
      actor: (user.email || user.sub),
      timestamp: new Date(),
    }
  });
  return res.status(201).json(ev);
}
