import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/prisma';
import { addComplaintStatusEvent } from '../services/pilot.service';

function demoMaskedPhone(phone?: string | null) {
  if (!phone) return null;
  return `${phone.slice(0, 4)}***${phone.slice(-3)}`;
}

export async function listReferrals(req: Request, res: Response) {
  const status = typeof req.query.status === 'string' ? req.query.status : undefined;
  const district = typeof req.query.district === 'string' ? req.query.district : undefined;
  const db = prisma as any;

  const referrals = await db.referral.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(district ? { complaint: { district } } : {}),
      complaint: {
        ...(district ? { district } : {}),
        trackingCode: { startsWith: 'JL-DEMO-' },
      },
    },
    include: {
      complaint: { include: { citizen: true, triage: true } },
      institution: true,
      legalAidProvider: true,
      assignedTo: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  return res.json(referrals.map((referral: any) => ({
    id: referral.id,
    status: referral.status,
    priority: referral.priority,
    notes: referral.notes,
    reasonCodes: referral.reasonCodes ? JSON.parse(referral.reasonCodes) : [],
    target: referral.institution?.name || referral.legalAidProvider?.name || 'Referral desk',
    targetType: referral.institution?.type || referral.legalAidProvider?.providerType || 'legal_aid',
    assignedTo: referral.assignedTo ? { id: referral.assignedTo.id, name: referral.assignedTo.name } : null,
    complaint: {
      id: referral.complaint.id,
      trackingCode: referral.complaint.trackingCode,
      status: referral.complaint.status,
      district: referral.complaint.district,
      category: referral.complaint.triage?.category || referral.complaint.category,
      urgency: referral.complaint.triage?.urgency || referral.complaint.urgency,
      summary: referral.complaint.summary,
      channel: referral.complaint.channel,
      citizenPhone: demoMaskedPhone(referral.complaint.citizen?.phone),
    },
    createdAt: referral.createdAt,
    updatedAt: referral.updatedAt,
  })));
}

const updateSchema = z.object({
  status: z.enum(['recommended', 'accepted', 'assigned', 'escalated', 'closed', 'rejected']),
  assignedToId: z.string().nullable().optional(),
  notes: z.string().optional(),
});

export async function updateReferral(req: Request, res: Response) {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const db = prisma as any;
  const existing = await db.referral.findUnique({ where: { id: req.params.id }, include: { complaint: true } });
  if (!existing) return res.status(404).json({ error: 'Referral not found' });

  const statusDate: Record<string, Date> = {};
  if (parsed.data.status === 'accepted') statusDate.acceptedAt = new Date();
  if (parsed.data.status === 'escalated') statusDate.escalatedAt = new Date();
  if (parsed.data.status === 'closed') statusDate.closedAt = new Date();

  const updated = await db.referral.update({
    where: { id: existing.id },
    data: {
      status: parsed.data.status,
      assignedToId: typeof parsed.data.assignedToId === 'undefined' ? undefined : parsed.data.assignedToId,
      notes: parsed.data.notes ?? undefined,
      ...statusDate,
    },
    include: { complaint: true, institution: true, legalAidProvider: true, assignedTo: true },
  });

  const user = (req as any).user;
  await addComplaintStatusEvent({
    complaintId: existing.complaintId,
    status: `referral_${parsed.data.status}`,
    actorId: user?.sub ?? null,
    actorType: 'user',
    message: parsed.data.notes || `Referral ${parsed.data.status}`,
    metadata: { referralId: existing.id, assignedToId: parsed.data.assignedToId ?? null },
    updateComplaintStatus: parsed.data.status === 'closed',
  });

  return res.json(updated);
}
