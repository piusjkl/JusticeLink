import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { createComplaintWorkflow, getComplaintForTracking, normalizePhone } from '../services/pilot.service';
import { env } from '../utils/env';

const districts: Record<string, string> = {
  '1': 'Mbarara',
  '2': 'Gulu',
  '3': 'Jinja',
  '4': 'Other',
};

function bodyValue(req: Request, keys: string[]) {
  for (const key of keys) {
    const value = (req.body?.[key] ?? req.query?.[key]) as string | undefined;
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

function textResponse(res: Response, body: string) {
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  return res.send(body);
}

async function upsertSession(provider: string, sessionId: string, phone: string, state: string, payload?: Record<string, unknown>, complaintId?: string) {
  const db = prisma as any;
  const key = `${provider}:${sessionId}`;
  return db.uSSDSession.upsert({
    where: { sessionId: key },
    update: {
      phone,
      state,
      payload: payload ? JSON.stringify(payload) : undefined,
      complaintId: complaintId ?? undefined,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    },
    create: {
      provider,
      sessionId: key,
      phone,
      state,
      payload: payload ? JSON.stringify(payload) : null,
      complaintId: complaintId ?? null,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    },
  });
}

async function handleUssd(provider: 'mtn' | 'airtel', req: Request, res: Response) {
  const sessionId = bodyValue(req, ['sessionId', 'sessionID', 'transactionId']) || `${Date.now()}`;
  const phone = normalizePhone(bodyValue(req, ['phoneNumber', 'msisdn', 'phone']));
  const text = bodyValue(req, ['text', 'userInput', 'input']);
  const parts = text.split('*').filter(Boolean);

  if (parts.length === 0) {
    await upsertSession(provider, sessionId, phone, 'menu');
    return textResponse(res, `${env.DEMO_MODE ? 'CON JUSTICE LINK DEMO (local stub)' : 'CON JUSTICE LINK'}\n1. File legal complaint\n2. Track complaint`);
  }

  if (parts[0] === '1') {
    if (parts.length === 1) {
      await upsertSession(provider, sessionId, phone, 'district');
      return textResponse(res, 'CON Select district\n1. Mbarara\n2. Gulu\n3. Jinja\n4. Other');
    }

    const district = districts[parts[1]] || 'Other';
    if (parts.length === 2) {
      await upsertSession(provider, sessionId, phone, 'description', { district });
      return textResponse(res, 'CON Briefly describe the issue');
    }

    const description = parts.slice(2).join(' ').trim();
    if (description.length < 10) return textResponse(res, 'CON Add more detail about the issue');

    const result = await createComplaintWorkflow({
      phone,
      district,
      description,
      language: 'en',
      channel: 'ussd',
      lowLiteracy: true,
    });
    await upsertSession(provider, sessionId, phone, 'completed', { district }, result.complaint.id);
    return textResponse(
      res,
      `END ${env.DEMO_MODE ? 'Demo complaint received locally' : 'Complaint received'}. Tracking code: ${result.complaint.trackingCode}. Status: ${result.complaint.status}. ${result.payment.status === 'waived' ? 'Fee waived.' : `${env.DEMO_MODE ? 'Mock payment' : 'Pay'} UGX ${result.payment.amount} using ref ${result.payment.externalRef}.`}`,
    );
  }

  if (parts[0] === '2') {
    if (parts.length === 1) {
      await upsertSession(provider, sessionId, phone, 'tracking');
      return textResponse(res, 'CON Enter your tracking code');
    }
    const trackingCode = parts.slice(1).join('*').trim().toUpperCase();
    const complaint = await getComplaintForTracking(trackingCode, phone);
    if (!complaint) return textResponse(res, 'END No complaint found for this phone and tracking code.');
    return textResponse(
      res,
      `END ${complaint.trackingCode}: ${complaint.status}. Category: ${complaint.triage?.category || complaint.category}. Referral: ${complaint.referrals?.[0]?.status || 'pending'}.`,
    );
  }

  return textResponse(res, 'END Invalid option. Dial again and choose 1 or 2.');
}

export async function handleMtnUssd(req: Request, res: Response) {
  return handleUssd('mtn', req, res);
}

export async function handleAirtelUssd(req: Request, res: Response) {
  return handleUssd('airtel', req, res);
}
