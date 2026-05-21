import { Request, Response } from 'express';
import { prisma } from '../config/prisma';

function groupCount(items: any[], key: (item: any) => string | null | undefined) {
  return items.reduce((acc, item) => {
    const bucket = key(item) || 'unknown';
    acc[bucket] = (acc[bucket] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
}

export async function getPartnerAnalytics(req: Request, res: Response) {
  const db = prisma as any;
  const district = typeof req.query.district === 'string' ? req.query.district : undefined;
  const from = typeof req.query.from === 'string' ? new Date(req.query.from) : undefined;
  const to = typeof req.query.to === 'string' ? new Date(req.query.to) : undefined;

  const complaints = await db.complaint.findMany({
    where: {
      trackingCode: { startsWith: 'JL-DEMO-' },
      ...(district ? { district } : {}),
      ...(from || to ? { createdAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
    },
    include: {
      triage: true,
      referrals: true,
      payments: true,
      statusEvents: true,
    },
  });

  const referrals = complaints.flatMap((complaint: any) => complaint.referrals);
  const payments = complaints.flatMap((complaint: any) => complaint.payments);
  const closed = complaints.filter((complaint: any) => complaint.status === 'closed' || complaint.status === 'referral_closed');
  const emergency = complaints.filter((complaint: any) => complaint.urgency === 'emergency' || complaint.triage?.urgency === 'emergency');
  const emergencyHandled = emergency.filter((complaint: any) => complaint.referrals.some((referral: any) => {
    const firstAction = referral.acceptedAt || referral.escalatedAt || referral.closedAt;
    if (!firstAction) return false;
    return new Date(firstAction).getTime() - new Date(complaint.createdAt).getTime() <= 24 * 60 * 60 * 1000;
  }));

  const averageBacklogHours = closed.length
    ? Math.round(closed.reduce((sum: number, complaint: any) => {
      const lastEvent = complaint.statusEvents
        .slice()
        .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
      const end = lastEvent ? new Date(lastEvent.createdAt).getTime() : new Date(complaint.updatedAt).getTime();
      return sum + ((end - new Date(complaint.createdAt).getTime()) / 36e5);
    }, 0) / closed.length)
    : 0;

  return res.json({
    mode: 'synthetic_demo',
    localOnly: true,
    demoNotice: 'Aggregate metrics are generated from synthetic local demo records.',
    totals: {
      complaints: complaints.length,
      emergency: emergency.length,
      referrals: referrals.length,
      pendingReferrals: referrals.filter((referral: any) => ['recommended', 'assigned'].includes(referral.status)).length,
      closed: closed.length,
      waivedPayments: payments.filter((payment: any) => payment.status === 'waived').length,
      paidPayments: payments.filter((payment: any) => payment.status === 'success').length,
    },
    breakdowns: {
      byDistrict: groupCount(complaints, (complaint) => complaint.district),
      byCategory: groupCount(complaints, (complaint) => complaint.triage?.category || complaint.category),
      byChannel: groupCount(complaints, (complaint) => complaint.channel),
      byReferralStatus: groupCount(referrals, (referral) => referral.status),
      byUrgency: groupCount(complaints, (complaint) => complaint.triage?.urgency || complaint.urgency),
    },
    sla: {
      emergencyHandledWithin24h: emergency.length ? Math.round((emergencyHandled.length / emergency.length) * 100) : 0,
      averageBacklogHours,
    },
    generatedAt: new Date().toISOString(),
    piiRedacted: true,
  });
}
