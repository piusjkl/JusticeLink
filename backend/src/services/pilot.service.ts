import { prisma } from '../config/prisma';
import { createRegistryEntry } from './registry.service';
import { classifyComplaint, TriageOutput } from './triage.service';

export type ComplaintPayload = {
  phone: string;
  fullName?: string;
  district?: string;
  language?: string;
  description: string;
  incidentLocation?: string;
  consentToShare?: boolean;
  channel: 'web' | 'ussd' | 'call_center' | 'partner';
  lowLiteracy?: boolean;
  disabilityNeeds?: string;
  offlineClientId?: string;
};

export function normalizePhone(phone: string) {
  const compact = phone.replace(/\s+/g, '').replace(/[^\d+]/g, '');
  if (compact.startsWith('+')) return compact;
  if (compact.startsWith('0')) return `+256${compact.slice(1)}`;
  if (compact.startsWith('256')) return `+${compact}`;
  return compact;
}

function summarize(description: string) {
  return description.length > 160 ? `${description.slice(0, 157)}...` : description;
}

function isLegalAidWaived(triage: TriageOutput) {
  return triage.urgency === 'emergency'
    || ['domestic_violence', 'child_protection', 'disability_rights'].includes(triage.category);
}

async function generateTrackingCode() {
  const db = prisma as any;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const suffix = Math.floor(100000 + Math.random() * 900000);
    const code = `JL-DEMO-${new Date().getFullYear()}-${suffix}`;
    const exists = await db.complaint.findUnique({ where: { trackingCode: code } });
    if (!exists) return code;
  }
  return `JL-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
}

async function ensureInstitution(name: string, type: string, district?: string, supportsEmergency = false) {
  const db = prisma as any;
  return db.institution.upsert({
    where: { name },
    update: { type, district: district ?? null, supportsEmergency },
    create: { name, type, district: district ?? null, supportsEmergency },
  });
}

async function ensureProvider(name: string, district?: string) {
  const db = prisma as any;
  return db.legalAidProvider.upsert({
    where: { name },
    update: { district: district ?? null, active: true },
    create: {
      name,
      providerType: 'legal_aid',
      district: district ?? null,
      contactPhone: '+256000000000',
      services: JSON.stringify(['legal_aid', 'mediation', 'case_referral']),
      supportsWomen: true,
      supportsYouth: true,
      supportsPwd: true,
    },
  });
}

async function referralTarget(triage: TriageOutput, district?: string) {
  const normalizedDistrict = district || 'National';
  if (triage.recommendedInstitutionType === 'legal_aid') {
    const providerName = triage.category === 'domestic_violence'
      ? 'Justice Link Safety Legal Aid Desk'
      : 'Justice Link Partner Legal Aid Desk';
    return { legalAidProvider: await ensureProvider(`${providerName} - ${normalizedDistrict}`, normalizedDistrict) };
  }

  if (triage.recommendedInstitutionType === 'police') {
    return {
      institution: await ensureInstitution(
        `Justice Link Emergency Referral Desk - ${normalizedDistrict}`,
        'police',
        normalizedDistrict,
        true,
      ),
    };
  }

  if (triage.recommendedInstitutionType === 'court') {
    return { institution: await ensureInstitution(`Justice Link Demo Court Registry - ${normalizedDistrict}`, 'court', normalizedDistrict) };
  }

  return { institution: await ensureInstitution(`Justice Link Referral Desk - ${normalizedDistrict}`, 'jlos', normalizedDistrict) };
}

export async function addComplaintStatusEvent(input: {
  complaintId: string;
  status: string;
  actorId?: string | null;
  actorType?: string;
  message?: string;
  metadata?: Record<string, unknown>;
  updateComplaintStatus?: boolean;
}) {
  const db = prisma as any;
  const event = await db.complaintStatusEvent.create({
    data: {
      complaintId: input.complaintId,
      status: input.status,
      actorId: input.actorId ?? null,
      actorType: input.actorType ?? 'system',
      message: input.message ?? null,
      metadata: input.metadata ? JSON.stringify(input.metadata) : null,
    },
  });

  if (input.updateComplaintStatus) {
    await db.complaint.update({ where: { id: input.complaintId }, data: { status: input.status } });
  }

  await createRegistryEntry({
    complaintId: input.complaintId,
    entityType: 'complaint_status_event',
    entityId: event.id,
    eventType: input.status,
    metadata: {
      actorType: input.actorType ?? 'system',
      message: input.message ?? null,
      ...(input.metadata ?? {}),
    },
  });

  return event;
}

export async function createComplaintWorkflow(payload: ComplaintPayload) {
  const db = prisma as any;
  const phone = normalizePhone(payload.phone);
  const trackingCode = await generateTrackingCode();
  const triage = classifyComplaint(payload.description, payload.language);
  const waived = isLegalAidWaived(triage);

  const citizen = await db.citizenProfile.upsert({
    where: { phone },
    update: {
      fullName: payload.fullName || undefined,
      district: payload.district || undefined,
      language: payload.language || triage.language,
      lowLiteracy: payload.lowLiteracy ?? undefined,
      disabilityNeeds: payload.disabilityNeeds || undefined,
    },
    create: {
      phone,
      fullName: payload.fullName ?? null,
      district: payload.district ?? null,
      language: payload.language || triage.language,
      lowLiteracy: payload.lowLiteracy ?? false,
      disabilityNeeds: payload.disabilityNeeds ?? null,
    },
  });

  const complaint = await db.complaint.create({
    data: {
      trackingCode,
      citizenId: citizen.id,
      channel: payload.channel,
      language: payload.language || triage.language,
      district: payload.district ?? null,
      category: triage.category,
      urgency: triage.urgency,
      status: 'triaged',
      summary: summarize(payload.description),
      description: payload.description,
      incidentLocation: payload.incidentLocation ?? null,
      consentToShare: payload.consentToShare ?? true,
      safetyFlag: triage.safetyFlags.length > 0,
      offlineClientId: payload.offlineClientId ?? null,
    },
  });

  const triageResult = await db.triageResult.create({
    data: {
      complaintId: complaint.id,
      category: triage.category,
      urgency: triage.urgency,
      confidence: triage.confidence,
      language: triage.language,
      recommendedInstitutionType: triage.recommendedInstitutionType,
      referralReasonCodes: JSON.stringify(triage.referralReasonCodes),
      safetyFlags: JSON.stringify(triage.safetyFlags),
      modelVersion: triage.modelVersion,
    },
  });

  await createRegistryEntry({
    complaintId: complaint.id,
    entityType: 'complaint',
    entityId: complaint.id,
    eventType: 'complaint_submitted',
    metadata: {
      trackingCode,
      channel: payload.channel,
      district: payload.district ?? null,
      piiRedacted: true,
    },
  });

  await addComplaintStatusEvent({
    complaintId: complaint.id,
    status: 'triaged',
    actorType: 'triage_service',
    message: `Complaint classified as ${triage.category}`,
    metadata: {
      urgency: triage.urgency,
      confidence: triage.confidence,
      modelVersion: triage.modelVersion,
    },
  });

  const target = await referralTarget(triage, payload.district);
  const referral = await db.referral.create({
    data: {
      complaintId: complaint.id,
      institutionId: target.institution?.id ?? null,
      legalAidProviderId: target.legalAidProvider?.id ?? null,
      status: 'recommended',
      priority: triage.urgency,
      reasonCodes: JSON.stringify(triage.referralReasonCodes),
      notes: `Auto-recommended by ${triage.modelVersion}`,
    },
  });

  await createRegistryEntry({
    complaintId: complaint.id,
    entityType: 'referral',
    entityId: referral.id,
    eventType: 'referral_recommended',
    metadata: {
      targetType: target.institution ? 'institution' : 'legal_aid_provider',
      reasonCodes: triage.referralReasonCodes,
    },
  });

  const payment = await db.paymentTransaction.create({
    data: {
      provider: 'mtn',
      complaintId: complaint.id,
      phone,
      amount: waived ? 0 : 500,
      status: waived ? 'waived' : 'pending',
      waiverReason: waived ? 'emergency_or_legal_aid_case' : null,
      externalRef: `DEMO-PAY-${trackingCode}`,
    },
  });

  await createRegistryEntry({
    complaintId: complaint.id,
    entityType: 'payment_transaction',
    entityId: payment.id,
    eventType: waived ? 'payment_waived' : 'payment_pending',
    metadata: {
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status,
    },
  });

  return { complaint, citizen, triage: triageResult, referral, payment };
}

export async function getComplaintForTracking(trackingCode: string, phone: string) {
  const db = prisma as any;
  const normalizedPhone = normalizePhone(phone);
  if (process.env.JUSTICELINK_DEMO_MODE !== 'false' && !trackingCode.startsWith('JL-DEMO-')) {
    return null;
  }
  return db.complaint.findFirst({
    where: {
      trackingCode,
      citizen: { phone: normalizedPhone },
    },
    include: {
      triage: true,
      referrals: { include: { institution: true, legalAidProvider: true, assignedTo: true } },
      statusEvents: { orderBy: { createdAt: 'asc' } },
      payments: { orderBy: { createdAt: 'desc' } },
    },
  });
}
