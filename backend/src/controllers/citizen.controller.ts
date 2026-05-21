import { Request, Response } from 'express';
import { z } from 'zod';
import { createComplaintWorkflow, getComplaintForTracking } from '../services/pilot.service';

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
    let metadata: any = null;
    try {
      metadata = event.metadata ? JSON.parse(event.metadata) : null;
    } catch {
      metadata = null;
    }
    return {
      status: event.status,
      message: event.message,
      metadata,
      createdAt: event.createdAt,
    };
  });

  const openedCase = events
    .map((event: any) => event.metadata)
    .find((metadata: any) => metadata?.externalId || metadata?.caseId);

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
