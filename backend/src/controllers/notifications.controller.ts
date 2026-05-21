import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import type { JwtPayload } from '../middlewares/auth';

export async function listMyNotifications(req: Request, res: Response) {
  const user = (req as any).user as JwtPayload;
  // Note: ensure `prisma generate` has been run after schema update
  const items = await (prisma as any).notification.findMany({
    where: { userId: user.sub },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  return res.json(items);
}

export async function markNotificationRead(req: Request, res: Response) {
  const user = (req as any).user as JwtPayload;
  const { id } = req.params;
  const n = await (prisma as any).notification.findUnique({ where: { id } });
  if (!n || n.userId !== user.sub) return res.status(404).json({ error: 'Not found' });
  await (prisma as any).notification.update({ where: { id }, data: { readAt: new Date() } });
  return res.status(204).send();
}
