import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/prisma';
import { createRegistryEntry } from '../services/registry.service';
import { getComplaintForTracking, normalizePhone } from '../services/pilot.service';
import { env } from '../utils/env';

const initiateSchema = z.object({
  trackingCode: z.string().min(6),
  phone: z.string().min(7),
  amount: z.number().int().min(500).max(1000).optional(),
});

const callbackSchema = z.object({
  externalRef: z.string().min(3),
  status: z.enum(['success', 'failed', 'cancelled', 'pending']),
  providerTransactionId: z.string().optional(),
});

async function initiate(provider: 'mtn' | 'airtel', req: Request, res: Response) {
  const parsed = initiateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const complaint = await getComplaintForTracking(parsed.data.trackingCode.toUpperCase(), parsed.data.phone);
  if (!complaint) return res.status(404).json({ error: 'Complaint not found for supplied tracking details' });

  const db = prisma as any;
  const externalRef = `DEMO-${provider.toUpperCase()}-${complaint.trackingCode}-${Date.now()}`;
  const payment = await db.paymentTransaction.create({
    data: {
      provider,
      complaintId: complaint.id,
      phone: normalizePhone(parsed.data.phone),
      amount: parsed.data.amount ?? 500,
      status: 'pending',
      externalRef,
    },
  });

  await createRegistryEntry({
    complaintId: complaint.id,
    entityType: 'payment_transaction',
    entityId: payment.id,
    eventType: 'mobile_money_initiated',
    metadata: { provider, amount: payment.amount, externalRef },
  });

  return res.status(201).json({
    provider,
    externalRef,
    amount: payment.amount,
    currency: payment.currency,
    status: payment.status,
    mode: env.DEMO_MODE ? 'synthetic_demo' : 'standard',
    mocked: env.DEMO_MODE,
    localOnly: env.DEMO_MODE,
    message: env.DEMO_MODE
      ? 'Demo payment recorded locally. No telecom or mobile-money provider was contacted.'
      : 'Payment request recorded. Telecom collection prompt is handled by the configured provider gateway.',
  });
}

async function callback(provider: 'mtn' | 'airtel', req: Request, res: Response) {
  if (env.DEMO_MODE) {
    return res.json({
      ok: true,
      provider,
      status: 'mocked_ignored',
      mode: 'synthetic_demo',
      localOnly: true,
      message: 'Demo mode ignores external payment callbacks.',
    });
  }

  const parsed = callbackSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const db = prisma as any;

  const existing = await db.paymentTransaction.findUnique({ where: { externalRef: parsed.data.externalRef } });
  if (!existing || existing.provider !== provider) return res.status(404).json({ error: 'Payment transaction not found' });

  const updated = await db.paymentTransaction.update({
    where: { id: existing.id },
    data: {
      status: parsed.data.status,
      callbackPayload: JSON.stringify(req.body),
    },
  });

  await createRegistryEntry({
    complaintId: updated.complaintId,
    entityType: 'payment_transaction',
    entityId: updated.id,
    eventType: `mobile_money_${updated.status}`,
    metadata: {
      provider,
      externalRef: updated.externalRef,
      providerTransactionId: parsed.data.providerTransactionId ?? null,
    },
  });

  return res.json({ ok: true, status: updated.status });
}

export async function initiateMtnPayment(req: Request, res: Response) {
  return initiate('mtn', req, res);
}

export async function initiateAirtelPayment(req: Request, res: Response) {
  return initiate('airtel', req, res);
}

export async function mtnPaymentCallback(req: Request, res: Response) {
  return callback('mtn', req, res);
}

export async function airtelPaymentCallback(req: Request, res: Response) {
  return callback('airtel', req, res);
}
