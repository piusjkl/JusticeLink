import { Request, Response } from 'express';
import { z } from 'zod';
import { createComplaintWorkflow, getComplaintForTracking } from '../services/pilot.service';
import { prisma } from '../config/prisma';
import { signToken } from '../services/token.service';

const complaintSchema = z.object({
  phone: z.string().min(7),
  fullName: z.string().min(2).optional(),
  district: z.string().optional(),
  language: z.enum(['en', 'lg', 'nyn', 'ach', 'xog']).optional(),
  description: z.string().min(10),
  incidentLocation: z.string().optional(),
  consentToShare: z.boolean().optional(),
  lowLiteracy: z.boolean().optional(),
  disabilityNeeds: z.string().optional(),
  offlineClientId: z.string().optional(),
});

function publicComplaintShape(result: any) {
  return {
    mode: 'synthetic_demo',
    localOnly: true,
    demoNotice: 'Synthetic local demo record. No court, ministry, telecom, or payment system was contacted.',
    trackingCode: result.complaint.trackingCode,
    status: result.complaint.status,
    category: result.triage.category,
    urgency: result.triage.urgency,
    confidence: result.triage.confidence,
    referral: {
      id: result.referral.id,
      status: result.referral.status,
      priority: result.referral.priority,
    },
    payment: {
      provider: result.payment.provider,
      amount: result.payment.amount,
      currency: result.payment.currency,
      status: result.payment.status,
      externalRef: result.payment.externalRef,
      waiverReason: result.payment.waiverReason,
      mocked: true,
      localOnly: true,
    },
  };
}

function metadataFromEvent(event: any) {
  try {
    return event?.metadata ? JSON.parse(event.metadata) : null;
  } catch {
    return null;
  }
}

function openedCaseMetadata(events: any[]) {
  return events
    .map(metadataFromEvent)
    .find((metadata: any) => metadata?.caseId || metadata?.externalId) || null;
}

async function findOpenedCase(events: any[]) {
  const metadata = openedCaseMetadata(events);
  if (!metadata) return null;
  const db = prisma as any;
  return db.case.findFirst({
    where: {
      OR: [
        ...(metadata.caseId ? [{ id: metadata.caseId }] : []),
        ...(metadata.externalId ? [{ externalId: metadata.externalId }] : []),
      ],
    },
  });
}

export async function submitCitizenComplaint(req: Request, res: Response) {
  const parsed = complaintSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const result = await createComplaintWorkflow({
    ...parsed.data,
    channel: 'web',
  });

  return res.status(201).json(publicComplaintShape(result));
}

export async function trackCitizenComplaint(req: Request, res: Response) {
  const trackingCode = String(req.params.trackingCode || '').trim().toUpperCase();
  const phone = String(req.query.phone || '').trim();
  if (!trackingCode || !phone) return res.status(400).json({ error: 'trackingCode and phone are required' });

  const complaint = await getComplaintForTracking(trackingCode, phone);
  if (!complaint) return res.status(404).json({ error: 'Complaint not found for the supplied tracking details' });

  const events = complaint.statusEvents.map((event: any) => {
    const metadata = metadataFromEvent(event);
    return {
      status: event.status,
      message: event.message,
      metadata,
      createdAt: event.createdAt,
    };
  });

  const openedCase = openedCaseMetadata(complaint.statusEvents);

  return res.json({
    mode: 'synthetic_demo',
    localOnly: true,
    demoNotice: 'Synthetic local demo tracking response.',
    trackingCode: complaint.trackingCode,
    status: complaint.status,
    channel: complaint.channel,
    district: complaint.district,
    category: complaint.triage?.category ?? complaint.category,
    urgency: complaint.triage?.urgency ?? complaint.urgency,
    safetyFlag: complaint.safetyFlag,
    referrals: complaint.referrals.map((referral: any) => ({
      id: referral.id,
      status: referral.status,
      priority: referral.priority,
      target: referral.institution?.name || referral.legalAidProvider?.name || 'Referral desk',
      targetType: referral.institution?.type || referral.legalAidProvider?.providerType || 'legal_aid',
      updatedAt: referral.updatedAt,
    })),
    payments: complaint.payments.map((payment: any) => ({
      provider: payment.provider,
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status,
      externalRef: payment.externalRef,
      waiverReason: payment.waiverReason,
      mocked: true,
      localOnly: true,
      updatedAt: payment.updatedAt,
    })),
    openedCase: openedCase ? { externalId: openedCase.externalId, caseId: openedCase.caseId } : null,
    events,
  });
}

export async function getCitizenHearingAccess(req: Request, res: Response) {
  const trackingCode = String(req.params.trackingCode || '').trim().toUpperCase();
  const phone = String(req.query.phone || '').trim();
  if (!trackingCode || !phone) return res.status(400).json({ error: 'trackingCode and phone are required' });

  const complaint = await getComplaintForTracking(trackingCode, phone);
  if (!complaint) return res.status(404).json({ error: 'Complaint not found for the supplied tracking details' });

  const caseRow = await findOpenedCase(complaint.statusEvents || []);
  if (!caseRow) {
    return res.json({
      available: false,
      reason: 'case_not_opened',
      message: 'A demo court case has not been opened for this complaint yet.',
      trackingCode: complaint.trackingCode,
      status: complaint.status,
      localOnly: true,
    });
  }

  const db = prisma as any;
  const session = await db.videoSession.findFirst({
    where: { caseId: caseRow.id, endedAt: null },
    include: { case: true },
    orderBy: { startedAt: 'desc' },
  });

  if (!session) {
    return res.json({
      available: false,
      reason: 'hearing_not_live',
      message: 'The demo hearing is scheduled but has not been started by court staff yet.',
      trackingCode: complaint.trackingCode,
      status: complaint.status,
      case: {
        externalId: caseRow.externalId,
        title: caseRow.title,
        nextHearing: caseRow.nextHearing,
        hearingLocation: caseRow.hearingLocation,
      },
      localOnly: true,
    });
  }

  const token = signToken({ kind: 'video_share', scope: 'public', sessionId: session.id }, '1d');
  return res.json({
    available: true,
    trackingCode: complaint.trackingCode,
    status: complaint.status,
    path: `/public/hearing/${token}`,
    token,
    expiresIn: '1d',
    case: {
      externalId: session.case.externalId,
      title: session.case.title,
      type: session.case.type,
    },
    mode: 'synthetic_demo',
    localOnly: true,
  });
}
