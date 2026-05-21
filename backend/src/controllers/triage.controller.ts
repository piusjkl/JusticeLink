import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/prisma';
import { addComplaintStatusEvent } from '../services/pilot.service';

function demoMaskedPhone(phone?: string | null) {
  if (!phone) return null;
  return `${phone.slice(0, 4)}***${phone.slice(-3)}`;
}

export async function listTriageQueue(req: Request, res: Response) {
  const status = typeof req.query.status === 'string' ? req.query.status : undefined;
  const db = prisma as any;
  const complaints = await db.complaint.findMany({
    where: {
      ...(status ? { status } : {}),
      trackingCode: { startsWith: 'JL-DEMO-' },
    },
    include: {
      citizen: true,
      triage: true,
      referrals: { include: { institution: true, legalAidProvider: true, assignedTo: true } },
      payments: true,
    },
    orderBy: [{ urgency: 'desc' }, { createdAt: 'desc' }],
    take: 100,
  });

  return res.json(complaints.map((complaint: any) => ({
    id: complaint.id,
    trackingCode: complaint.trackingCode,
    status: complaint.status,
    district: complaint.district,
    channel: complaint.channel,
    category: complaint.triage?.category ?? complaint.category,
    urgency: complaint.triage?.urgency ?? complaint.urgency,
    confidence: complaint.triage?.confidence,
    recommendedInstitutionType: complaint.triage?.recommendedInstitutionType,
    safetyFlag: complaint.safetyFlag,
    summary: complaint.summary,
    citizen: {
      phone: demoMaskedPhone(complaint.citizen?.phone),
      district: complaint.citizen?.district,
      language: complaint.citizen?.language,
      lowLiteracy: complaint.citizen?.lowLiteracy,
    },
    referrals: complaint.referrals,
    createdAt: complaint.createdAt,
  })));
}

const reviewSchema = z.object({
  category: z.string().min(2).optional(),
  urgency: z.enum(['normal', 'high', 'emergency']).optional(),
  recommendedInstitutionType: z.enum(['police', 'legal_aid', 'court', 'ngo', 'jlos']).optional(),
  notes: z.string().optional(),
});

export async function reviewTriage(req: Request, res: Response) {
  const parsed = reviewSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const db = prisma as any;
  const complaint = await db.complaint.findFirst({
    where: {
      OR: [{ id: req.params.complaintId }, { trackingCode: req.params.complaintId }],
      trackingCode: { startsWith: 'JL-DEMO-' },
    },
    include: { triage: true },
  });
  if (!complaint?.triage) return res.status(404).json({ error: 'Triage result not found' });

  const user = (req as any).user;
  const updated = await db.triageResult.update({
    where: { complaintId: complaint.id },
    data: {
      category: parsed.data.category ?? undefined,
      urgency: parsed.data.urgency ?? undefined,
      recommendedInstitutionType: parsed.data.recommendedInstitutionType ?? undefined,
      reviewedById: user?.sub ?? null,
      reviewedAt: new Date(),
    },
  });

  await db.complaint.update({
    where: { id: complaint.id },
    data: {
      category: updated.category,
      urgency: updated.urgency,
      status: 'triage_reviewed',
    },
  });

  await addComplaintStatusEvent({
    complaintId: complaint.id,
    status: 'triage_reviewed',
    actorId: user?.sub ?? null,
    actorType: 'user',
    message: parsed.data.notes || 'Triage reviewed',
    metadata: {
      category: updated.category,
      urgency: updated.urgency,
      recommendedInstitutionType: updated.recommendedInstitutionType,
    },
  });

  return res.json(updated);
}
