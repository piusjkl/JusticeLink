import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { z } from 'zod';
import type { JwtPayload } from '../middlewares/auth';

const createSchema = z.object({
  caseId: z.string().min(1),
  amount: z.number().int().positive(),
  reason: z.string().optional(),
});

export async function createBail(req: Request, res: Response) {
  const user = (req as any).user as JwtPayload;
  if (!['clerk','admin'].includes(user.role)) return res.status(403).json({ error: 'Forbidden' });
  const parse = createSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: parse.error.flatten() });
  const { caseId, amount, reason } = parse.data;
  const c = await prisma.case.findFirst({ where: { OR: [{ id: caseId }, { externalId: caseId }] } });
  if (!c) return res.status(404).json({ error: 'Case not found' });
  if (!c.judgeId) return res.status(400).json({ error: 'Case has no assigned judge' });
  const item = await (prisma as any).bailRequest.create({ data: {
    caseId: c.id,
    requestedById: user.sub,
    judgeId: c.judgeId,
    amount,
    reason: reason ?? null,
    status: 'pending',
  }});
  await prisma.timelineEvent.create({ data: { caseId: c.id, type: 'update', title: 'Bail requested', description: `Amount: ${amount}`, actor: (req as any).user?.email || 'system' } });
  try {
    await (prisma as any).notification.create({ data: { userId: c.judgeId!, title: 'Bail Request', message: `${c.externalId || c.id}: Bail requested (${amount})`, link: `/case/${c.externalId || c.id}` } });
  } catch {}
  return res.status(201).json(item);
}

export async function listBailForCase(req: Request, res: Response) {
  const user = (req as any).user as JwtPayload;
  const { caseId } = req.params;
  const c = await prisma.case.findFirst({ where: { OR: [{ id: caseId }, { externalId: caseId }] } });
  if (!c) return res.status(404).json({ error: 'Case not found' });
  // Access: judge for the case, clerk/admin, or assigned lawyer/prosecutor can view
  const allowed = ['admin','clerk'].includes(user.role) || c.judgeId === user.sub || c.lawyerId === user.sub || c.prosecutorId === user.sub;
  if (!allowed) return res.status(403).json({ error: 'Forbidden' });
  const items = await (prisma as any).bailRequest.findMany({ where: { caseId: c.id }, orderBy: { createdAt: 'desc' } });
  return res.json(items);
}

const decideSchema = z.object({ status: z.enum(['approved','declined']), notes: z.string().optional() });
export async function decideBail(req: Request, res: Response) {
  const user = (req as any).user as JwtPayload;
  if (user.role !== 'judge' && user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  const { id } = req.params;
  const parse = decideSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: parse.error.flatten() });
  const item = await (prisma as any).bailRequest.findUnique({ where: { id } });
  if (!item) return res.status(404).json({ error: 'Not found' });
  // Only assigned judge (or admin) can decide
  if (user.role !== 'admin' && item.judgeId !== user.sub) return res.status(403).json({ error: 'Forbidden' });
  const updated = await (prisma as any).bailRequest.update({ where: { id }, data: {
    status: parse.data.status,
    decisionNotes: parse.data.notes ?? null,
    decidedAt: new Date(),
    decisionById: user.sub,
  }});
  await prisma.timelineEvent.create({ data: { caseId: item.caseId, type: 'update', title: `Bail ${parse.data.status}`, description: parse.data.notes || '', actor: (req as any).user?.email || 'system' } });
  try {
    // Notify clerk team
    const clerks = await prisma.user.findMany({ where: { role: 'clerk', status: 'active' } });
    await (prisma as any).notification.createMany({ data: clerks.map(c => ({ userId: c.id, title: 'Bail Decision', message: `Bail ${parse.data.status}`, link: `/case/${item.caseId}` })) });
  } catch {}
  return res.json(updated);
}
