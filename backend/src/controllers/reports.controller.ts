import { Request, Response } from 'express';
import { prisma } from '../config/prisma';

export async function generateReport(_req: Request, res: Response) {
  const [casesCount, activeCases, usersCount, evidenceCount] = await Promise.all([
    prisma.case.count(),
    prisma.case.count({ where: { status: 'active' } }),
    prisma.user.count(),
    prisma.evidence.count()
  ]);
  return res.json({
    totals: {
      cases: casesCount,
      activeCases,
      users: usersCount,
      evidence: evidenceCount
    }
  });
}
