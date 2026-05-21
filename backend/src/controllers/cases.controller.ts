import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { z } from 'zod';
import type { JwtPayload } from '../middlewares/auth';
import { addComplaintStatusEvent } from '../services/pilot.service';
import { env } from '../utils/env';

export async function listCases(req: Request, res: Response) {
  const user = (req as any).user as JwtPayload;
  const where: any = { deletedAt: null };
  if (env.DEMO_MODE) where.externalId = { startsWith: 'DEMO-CASE-' };
  // Restrict non-admin/clerk to only their assigned cases
  if (user.role === 'judge') where.judgeId = user.sub;
  if (user.role === 'lawyer') where.lawyerId = user.sub;
  if (user.role === 'prosecutor') where.prosecutorId = user.sub;
  const cases = await prisma.case.findMany({
    where,
    include: { judge: true, lawyer: true, prosecutor: true, files: true },
    orderBy: { createdAt: 'desc' }
  });
  return res.json(cases);
}

export async function getCase(req: Request, res: Response) {
  const user = (req as any).user as JwtPayload;
  const { id } = req.params;
  const item = await prisma.case.findFirst({
    where: { OR: [{ id }, { externalId: id }] },
    include: { judge: true, lawyer: true, prosecutor: true, files: true, timeline: true }
  });
  if (!item) return res.status(404).json({ error: 'Case not found' });
  if (env.DEMO_MODE && !item.externalId.startsWith('DEMO-CASE-')) return res.status(404).json({ error: 'Demo case not found' });
  if (!['admin', 'clerk'].includes(user.role)) {
    const allowed = (user.role === 'judge' && item.judgeId === user.sub)
      || (user.role === 'lawyer' && item.lawyerId === user.sub)
      || (user.role === 'prosecutor' && item.prosecutorId === user.sub);
    if (!allowed) return res.status(403).json({ error: 'Forbidden' });
  }
  return res.json(item);
}

const caseCreateSchema = z.object({
  externalId: z.string().min(3),
  title: z.string().min(3),
  type: z.enum(['criminal', 'civil', 'family', 'corporate']),
  status: z.enum(['active', 'pending', 'closed', 'archived']).optional(),
  filingDate: z.string().datetime(),
  nextHearing: z.string().datetime().optional(),
  hearingLocation: z.string().optional(),
  judgeId: z.string().optional(),
  lawyerId: z.string().optional(),
  prosecutorId: z.string().optional(),
  plaintiff: z.string(),
  plaintiffAge: z.number().int().min(0).optional(),
  plaintiffAddress: z.string().optional(),
  defendant: z.string(),
  description: z.string().optional().default(''),
  priority: z.enum(['high', 'medium', 'low']).optional()
});

export async function createCase(req: Request, res: Response) {
  const parse = caseCreateSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: parse.error.flatten() });
  const data = parse.data;
  if (env.DEMO_MODE && !data.externalId.startsWith('DEMO-CASE-')) {
    return res.status(400).json({ error: 'Demo mode only accepts DEMO-CASE identifiers' });
  }
  const created = await (prisma as any).case.create({ data: {
    externalId: data.externalId,
    title: data.title,
    type: data.type,
    status: data.status ?? 'pending',
    filingDate: new Date(data.filingDate),
    nextHearing: data.nextHearing ? new Date(data.nextHearing) : null,
    hearingLocation: data.hearingLocation,
    judgeId: data.judgeId,
    lawyerId: data.lawyerId,
    prosecutorId: data.prosecutorId,
    plaintiff: data.plaintiff,
    plaintiffAge: typeof data.plaintiffAge === 'number' ? data.plaintiffAge : null,
    plaintiffAddress: data.plaintiffAddress ?? null,
    defendant: data.defendant,
    description: data.description ?? '',
    priority: data.priority ?? 'medium'
  }});
  await prisma.timelineEvent.create({
    data: {
      caseId: created.id,
      type: 'filing',
      title: 'Demo case registered',
      description: 'Synthetic Justice Link demo case opened in the local registry.',
      actor: (req as any).user?.email || 'system',
      timestamp: new Date(),
    },
  });
  return res.status(201).json(created);
}

function caseTypeForComplaint(category?: string | null): 'criminal' | 'civil' | 'family' | 'corporate' {
  if (category === 'criminal' || category === 'domestic_violence' || category === 'child_protection') return 'criminal';
  if (category === 'family') return 'family';
  if (category === 'labor_conflict') return 'corporate';
  return 'civil';
}

function priorityForComplaint(urgency?: string | null): 'high' | 'medium' | 'low' {
  if (urgency === 'emergency' || urgency === 'high') return 'high';
  if (urgency === 'normal') return 'medium';
  return 'low';
}

async function nextDemoCaseExternalId(trackingCode: string) {
  const db = prisma as any;
  const suffix = trackingCode.replace(/[^A-Z0-9]/gi, '').slice(-6) || Date.now().toString().slice(-6);
  const year = new Date().getFullYear();
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const externalId = attempt === 0 ? `DEMO-CASE-${year}-${suffix}` : `DEMO-CASE-${year}-${suffix}-${attempt + 1}`;
    const existing = await db.case.findUnique({ where: { externalId } });
    if (!existing) return externalId;
  }
  return `DEMO-CASE-${year}-${Date.now().toString().slice(-6)}`;
}

export async function createCaseFromComplaint(req: Request, res: Response) {
  const user = (req as any).user as JwtPayload;
  const db = prisma as any;
  const complaint = await db.complaint.findFirst({
    where: {
      OR: [{ id: req.params.complaintId }, { trackingCode: String(req.params.complaintId || '').toUpperCase() }],
      trackingCode: { startsWith: 'JL-DEMO-' },
    },
    include: {
      citizen: true,
      triage: true,
      referrals: true,
      statusEvents: true,
    },
  });

  if (!complaint) return res.status(404).json({ error: 'Complaint not found' });

  const existingCaseEvent = complaint.statusEvents.find((event: any) => event.status === 'case_opened');
  if (existingCaseEvent?.metadata) {
    try {
      const metadata = JSON.parse(existingCaseEvent.metadata);
      if (metadata.caseId || metadata.externalId) {
        const existingCase = await db.case.findFirst({
          where: { OR: [{ id: metadata.caseId }, { externalId: metadata.externalId }] },
          include: { judge: true, lawyer: true, prosecutor: true, files: true },
        });
        if (existingCase) return res.json({ case: existingCase, complaintStatus: complaint.status, alreadyCreated: true, mode: 'synthetic_demo', localOnly: true });
      }
    } catch {
      // Fall through and create a synthetic case if the old metadata cannot be read.
    }
  }

  const [judge, lawyer, prosecutor] = await Promise.all([
    prisma.user.findFirst({ where: { role: 'judge', status: 'active' } }),
    prisma.user.findFirst({ where: { role: 'lawyer', status: 'active' } }),
    prisma.user.findFirst({ where: { role: 'prosecutor', status: 'active' } }),
  ]);

  const category = complaint.triage?.category || complaint.category;
  const urgency = complaint.triage?.urgency || complaint.urgency;
  const externalId = await nextDemoCaseExternalId(complaint.trackingCode);
  const created = await db.case.create({
    data: {
      externalId,
      title: `Justice Link demo matter ${complaint.trackingCode}`,
      type: caseTypeForComplaint(category),
      status: 'active',
      filingDate: new Date(),
      hearingLocation: 'Justice Link Demo Courtroom',
      judgeId: judge?.id ?? null,
      lawyerId: lawyer?.id ?? null,
      prosecutorId: prosecutor?.id ?? null,
      plaintiff: complaint.citizen?.fullName || 'Demo Citizen',
      plaintiffAddress: complaint.citizen?.district ? `Demo district: ${complaint.citizen.district}` : 'Synthetic demo address',
      defendant: 'Demo Respondent',
      description: `Synthetic case generated from complaint ${complaint.trackingCode}. ${complaint.summary || complaint.description}`,
      priority: priorityForComplaint(urgency),
    },
    include: { judge: true, lawyer: true, prosecutor: true, files: true },
  });

  await prisma.timelineEvent.create({
    data: {
      caseId: created.id,
      type: 'filing',
      title: 'Created from Justice Link complaint',
      description: `Synthetic court case opened from tracking code ${complaint.trackingCode}.`,
      actor: user.email,
      timestamp: new Date(),
    },
  });

  if (complaint.referrals.length > 0) {
    await db.referral.updateMany({
      where: { complaintId: complaint.id, status: { in: ['recommended', 'accepted', 'assigned', 'escalated'] } },
      data: { status: 'accepted', acceptedAt: new Date(), notes: 'Accepted for synthetic demo court filing.' },
    });
  }

  await addComplaintStatusEvent({
    complaintId: complaint.id,
    status: 'case_opened',
    actorId: user.sub,
    actorType: 'user',
    message: `Synthetic court case ${externalId} opened for demo workflow.`,
    metadata: { caseId: created.id, externalId, localOnly: true, demoMode: true },
    updateComplaintStatus: true,
  });

  return res.status(201).json({
    case: created,
    complaintStatus: 'case_opened',
    mode: 'synthetic_demo',
    localOnly: true,
  });
}

const caseUpdateSchema = z.object({
  externalId: z.string().min(3).optional(),
  title: z.string().min(1).optional(),
  type: z.enum(['criminal', 'civil', 'family', 'corporate']).optional(),
  status: z.enum(['active', 'pending', 'closed', 'archived']).optional(),
  filingDate: z.string().datetime().optional(),
  nextHearing: z.string().datetime().nullable().optional(),
  hearingLocation: z.string().nullable().optional(),
  judgeId: z.string().nullable().optional(),
  lawyerId: z.string().nullable().optional(),
  prosecutorId: z.string().nullable().optional(),
  plaintiff: z.string().optional(),
  defendant: z.string().optional(),
  description: z.string().nullable().optional(),
  priority: z.enum(['high', 'medium', 'low']).optional(),
});

async function findComplaintIdForCase(caseId: string, externalId: string) {
  const db = prisma as any;
  const events = await db.complaintStatusEvent.findMany({
    where: { status: 'case_opened' },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });
  for (const event of events) {
    try {
      const metadata = event.metadata ? JSON.parse(event.metadata) : null;
      if (metadata?.caseId === caseId || metadata?.externalId === externalId) return event.complaintId as string;
    } catch {
      // Ignore malformed metadata and keep searching.
    }
  }
  return null;
}

export async function updateCase(req: Request, res: Response) {
  const { id } = req.params;
  const parse = caseUpdateSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: parse.error.flatten() });
  const data = parse.data;
  const existing = await prisma.case.findFirst({ where: { OR: [{ id }, { externalId: id }] } });
  if (!existing) return res.status(404).json({ error: 'Case not found' });
  if (env.DEMO_MODE && !existing.externalId.startsWith('DEMO-CASE-')) return res.status(404).json({ error: 'Demo case not found' });
  if (env.DEMO_MODE && data.externalId && !data.externalId.startsWith('DEMO-CASE-')) {
    return res.status(400).json({ error: 'Demo mode only accepts DEMO-CASE identifiers' });
  }
  const updated = await prisma.case.update({ where: { id: existing.id }, data: {
    externalId: data.externalId ?? undefined,
    title: data.title ?? undefined,
    type: data.type ?? undefined,
    status: data.status ?? undefined,
    filingDate: data.filingDate ? new Date(data.filingDate) : undefined,
    nextHearing: data.nextHearing === null ? null : (data.nextHearing ? new Date(data.nextHearing) : undefined),
    hearingLocation: typeof data.hearingLocation === 'undefined' ? undefined : (data.hearingLocation ?? null),
    judgeId: typeof data.judgeId === 'undefined' ? undefined : (data.judgeId ?? null),
    lawyerId: typeof data.lawyerId === 'undefined' ? undefined : (data.lawyerId ?? null),
    prosecutorId: typeof data.prosecutorId === 'undefined' ? undefined : (data.prosecutorId ?? null),
    plaintiff: data.plaintiff ?? undefined,
    defendant: data.defendant ?? undefined,
    description: typeof data.description === 'undefined' ? undefined : (data.description ?? ''),
    priority: data.priority ?? undefined
  }});
  // Add timeline events for notable updates
  const changes: string[] = [];
  if (data.title && data.title !== existing.title) changes.push(`Title changed to "${data.title}"`);
  if (typeof data.judgeId !== 'undefined') changes.push(`Judge ${data.judgeId ? 'assigned' : 'unassigned'}`);
  if (typeof data.lawyerId !== 'undefined') changes.push(`Lawyer ${data.lawyerId ? 'assigned' : 'unassigned'}`);
  if (typeof data.prosecutorId !== 'undefined') changes.push(`Prosecutor ${data.prosecutorId ? 'assigned' : 'unassigned'}`);
  if (data.nextHearing) changes.push(`Next hearing set to ${new Date(data.nextHearing).toLocaleString()}`);
  if (changes.length > 0) {
    await prisma.timelineEvent.create({
      data: {
        caseId: existing.id,
        type: 'update',
        title: 'Case Updated',
        description: changes.join('; '),
        actor: (req as any).user?.email || 'system',
        timestamp: new Date(),
      }
    });
    // Basic notifications to current assignees
    try {
      const fresh = await prisma.case.findUnique({ where: { id: existing.id } });
      const recipients = [fresh?.judgeId, fresh?.lawyerId, fresh?.prosecutorId].filter(Boolean) as string[];
      await (prisma as any).notification.createMany({
        data: recipients.map((uid) => ({
          userId: uid!,
          title: 'Case Updated',
          message: `${fresh?.externalId || fresh?.id}: ${changes.join('; ')}`,
          link: `/case/${fresh?.externalId || fresh?.id}`
        }))
      });
    } catch {}
  }
  if (data.nextHearing) {
    const complaintId = await findComplaintIdForCase(existing.id, existing.externalId);
    if (complaintId) {
      await addComplaintStatusEvent({
        complaintId,
        status: 'hearing_scheduled',
        actorId: (req as any).user?.sub ?? null,
        actorType: 'user',
        message: `Demo hearing scheduled for ${updated.externalId}.`,
        metadata: {
          caseId: updated.id,
          externalId: updated.externalId,
          nextHearing: data.nextHearing,
          hearingLocation: data.hearingLocation ?? updated.hearingLocation,
        },
        updateComplaintStatus: true,
      });
    }
  }
  return res.json(updated);
}

export async function deleteCase(req: Request, res: Response) {
  const { id } = req.params;
  const existing = await prisma.case.findFirst({ where: { OR: [{ id }, { externalId: id }] } });
  if (!existing) return res.status(404).json({ error: 'Case not found' });
  if (env.DEMO_MODE && !existing.externalId.startsWith('DEMO-CASE-')) return res.status(404).json({ error: 'Demo case not found' });
  await prisma.case.update({ where: { id: existing.id }, data: { deletedAt: new Date() } });
  return res.status(204).send();
}

// Pleadings
const pleadingSchema = z.object({
  type: z.string(),
  description: z.string().optional(),
  witnesses: z.string().optional(),
});

export async function listPleadings(req: Request, res: Response) {
  const { id } = req.params;
  const existing = await prisma.case.findFirst({ where: { OR: [{ id }, { externalId: id }] } });
  if (!existing) return res.status(404).json({ error: 'Case not found' });
  const items = await prisma.pleading.findMany({ where: { caseId: existing.id }, include: { documents: true, createdBy: true } });
  return res.json(items);
}

export async function addPleading(req: Request, res: Response) {
  const { id } = req.params;
  const parse = pleadingSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: parse.error.flatten() });
  const existing = await prisma.case.findFirst({ where: { OR: [{ id }, { externalId: id }] } });
  if (!existing) return res.status(404).json({ error: 'Case not found' });
  const user = (req as any).user;
  const created = await prisma.pleading.create({ data: {
    caseId: existing.id,
    type: parse.data.type,
    description: parse.data.description ?? null,
    witnesses: parse.data.witnesses ?? null,
    createdById: user?.sub ?? null
  }});
  await prisma.timelineEvent.create({ data: { caseId: existing.id, type: 'pleading', title: 'Pleading added', description: parse.data.type, actor: user?.email || 'system' } });
  return res.status(201).json(created);
}

// Participants
const participantSchema = z.object({ name: z.string(), role: z.string(), contact: z.string().optional(), organization: z.string().optional(), userId: z.string().optional() });

export async function listParticipants(req: Request, res: Response) {
  const { id } = req.params;
  const existing = await prisma.case.findFirst({ where: { OR: [{ id }, { externalId: id }] } });
  if (!existing) return res.status(404).json({ error: 'Case not found' });
  const items = await prisma.participant.findMany({ where: { caseId: existing.id } });
  return res.json(items);
}

export async function addParticipant(req: Request, res: Response) {
  const { id } = req.params;
  const parse = participantSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: parse.error.flatten() });
  const existing = await prisma.case.findFirst({ where: { OR: [{ id }, { externalId: id }] } });
  if (!existing) return res.status(404).json({ error: 'Case not found' });
  const created = await prisma.participant.create({ data: {
    caseId: existing.id,
    name: parse.data.name,
    role: parse.data.role,
    contact: parse.data.contact ?? null,
    organization: parse.data.organization ?? null,
    userId: parse.data.userId ?? null
  }});
  return res.status(201).json(created);
}

// Charges
const chargeSchema = z.object({ description: z.string(), code: z.string().optional(), isCapital: z.boolean().optional() });

export async function listCharges(req: Request, res: Response) {
  const { id } = req.params;
  const existing = await prisma.case.findFirst({ where: { OR: [{ id }, { externalId: id }] } });
  if (!existing) return res.status(404).json({ error: 'Case not found' });
  const items = await prisma.charge.findMany({ where: { caseId: existing.id } });
  return res.json(items);
}

export async function addCharge(req: Request, res: Response) {
  const { id } = req.params;
  const parse = chargeSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: parse.error.flatten() });
  const existing = await prisma.case.findFirst({ where: { OR: [{ id }, { externalId: id }] } });
  if (!existing) return res.status(404).json({ error: 'Case not found' });
  const created = await prisma.charge.create({ data: { caseId: existing.id, description: parse.data.description, code: parse.data.code ?? null, isCapital: parse.data.isCapital ?? false } });
  return res.status(201).json(created);
}

// Related cases
const relatedSchema = z.object({ relatedCaseExternalId: z.string(), relationType: z.string().optional() });

export async function listRelatedCases(req: Request, res: Response) {
  const { id } = req.params;
  const existing = await prisma.case.findFirst({ where: { OR: [{ id }, { externalId: id }] } });
  if (!existing) return res.status(404).json({ error: 'Case not found' });
  const items = await prisma.relatedCase.findMany({ where: { caseId: existing.id }, include: { relatedCase: true } });
  return res.json(items.map(r => ({ relationType: r.relationType, case: r.relatedCase })));
}

export async function addRelatedCase(req: Request, res: Response) {
  const { id } = req.params;
  const parse = relatedSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: parse.error.flatten() });
  const existing = await prisma.case.findFirst({ where: { OR: [{ id }, { externalId: id }] } });
  if (!existing) return res.status(404).json({ error: 'Case not found' });
  const related = await prisma.case.findFirst({ where: { externalId: parse.data.relatedCaseExternalId } });
  if (!related) return res.status(404).json({ error: 'Related case not found' });
  const created = await prisma.relatedCase.create({ data: { caseId: existing.id, relatedCaseId: related.id, relationType: parse.data.relationType ?? null } });
  return res.status(201).json(created);
}
