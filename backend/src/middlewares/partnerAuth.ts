import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/prisma';
import { env } from '../utils/env';
import { hashPartnerToken } from '../services/registry.service';

export async function authOrPartnerToken(req: Request, res: Response, next: NextFunction) {
  const auth = req.headers.authorization;
  if (auth?.startsWith('Bearer ')) {
    try {
      (req as any).user = jwt.verify(auth.slice('Bearer '.length), env.JWT_SECRET);
      return next();
    } catch {
      return res.status(401).json({ error: 'Invalid token' });
    }
  }

  const token = req.header('x-partner-token');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  const db = prisma as any;
  const tokenHash = hashPartnerToken(token);
  const record = await db.partnerApiToken.findUnique({
    where: { tokenHash },
    include: { partnerOrg: true },
  });

  if (!record || !record.partnerOrg?.active) return res.status(401).json({ error: 'Invalid partner token' });
  if (record.expiresAt && new Date(record.expiresAt).getTime() < Date.now()) {
    return res.status(401).json({ error: 'Partner token expired' });
  }

  await db.partnerApiToken.update({ where: { id: record.id }, data: { lastUsedAt: new Date() } });
  (req as any).partner = {
    id: record.partnerOrg.id,
    name: record.partnerOrg.name,
    scopes: record.scopes ? JSON.parse(record.scopes) : [],
  };
  return next();
}

export function requireUserRoleOrPartner(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    const partner = (req as any).partner;
    if (partner) return next();
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    if (!roles.includes(user.role)) return res.status(403).json({ error: 'Forbidden' });
    return next();
  };
}
