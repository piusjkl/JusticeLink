import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { verifyRegistryChain } from '../services/registry.service';
import { env } from '../utils/env';

async function demoComplaintIds() {
  const db = prisma as any;
  const complaints = await db.complaint.findMany({
    where: { trackingCode: { startsWith: 'JL-DEMO-' } },
    select: { id: true },
  });
  return complaints.map((complaint: any) => complaint.id);
}

export async function verifyRegistry(_req: Request, res: Response) {
  if (env.DEMO_MODE) {
    const ids = await demoComplaintIds();
    const db = prisma as any;
    const checked = ids.length ? await db.registryEntry.count({ where: { complaintId: { in: ids } } }) : 0;
    return res.json({ ok: true, checked, mode: 'synthetic_demo', localOnly: true });
  }
  const result = await verifyRegistryChain();
  return res.json(result);
}

export async function listRegistryEntries(req: Request, res: Response) {
  const db = prisma as any;
  const complaintId = typeof req.query.complaintId === 'string' ? req.query.complaintId : undefined;
  const trackingCode = typeof req.query.trackingCode === 'string' ? req.query.trackingCode : undefined;

  let where: any = {};
  if (complaintId) where.complaintId = complaintId;
  if (trackingCode) {
    if (env.DEMO_MODE && !trackingCode.startsWith('JL-DEMO-')) return res.status(404).json({ error: 'Demo complaint not found' });
    const complaint = await db.complaint.findUnique({ where: { trackingCode } });
    if (!complaint) return res.status(404).json({ error: 'Complaint not found' });
    where.complaintId = complaint.id;
  }
  if (env.DEMO_MODE && !complaintId && !trackingCode) {
    const ids = await demoComplaintIds();
    where = ids.length ? { complaintId: { in: ids } } : { complaintId: '__none__' };
  }

  const entries = await db.registryEntry.findMany({
    where,
    orderBy: { createdAt: 'asc' },
    take: 200,
  });

  return res.json(entries.map((entry: any) => ({
    id: entry.id,
    complaintId: entry.complaintId,
    entityType: entry.entityType,
    entityId: entry.entityId,
    eventType: entry.eventType,
    eventHash: entry.eventHash,
    previousHash: entry.previousHash,
    fabricStatus: entry.fabricStatus,
    fabricTxId: entry.fabricTxId,
    metadata: entry.metadata ? JSON.parse(entry.metadata) : null,
    createdAt: entry.createdAt,
  })));
}
