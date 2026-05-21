import { createHash } from 'node:crypto';
import { prisma } from '../config/prisma';
import { env } from '../utils/env';

type RegistryInput = {
  complaintId?: string | null;
  entityType: string;
  entityId: string;
  eventType: string;
  metadata?: Record<string, unknown>;
};

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value as Record<string, unknown>)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify((value as Record<string, unknown>)[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
}

function sha256(value: string) {
  return createHash('sha256').update(value).digest('hex');
}

export function hashPartnerToken(token: string) {
  return sha256(token);
}

export async function createRegistryEntry(input: RegistryInput) {
  const db = prisma as any;
  const previous = await db.registryEntry.findFirst({ orderBy: { createdAt: 'desc' } });
  const previousHash = previous?.eventHash ?? null;
  const metadata = { ...(input.metadata ?? {}), demoMode: env.DEMO_MODE, localOnly: env.DEMO_MODE };
  const eventHash = sha256(stableStringify({
    complaintId: input.complaintId ?? null,
    entityType: input.entityType,
    entityId: input.entityId,
    eventType: input.eventType,
    metadata,
    previousHash,
  }));

  return db.registryEntry.create({
    data: {
      complaintId: input.complaintId ?? null,
      entityType: input.entityType,
      entityId: input.entityId,
      eventType: input.eventType,
      eventHash,
      previousHash,
      fabricStatus: env.DEMO_MODE ? 'local_only' : (process.env.FABRIC_ENABLED === 'true' ? 'queued' : 'local_only'),
      metadata: JSON.stringify(metadata),
    },
  });
}

export async function verifyRegistryChain() {
  const db = prisma as any;
  const entries = await db.registryEntry.findMany({ orderBy: { createdAt: 'asc' } });
  let previousHash: string | null = null;

  for (const entry of entries) {
    if ((entry.previousHash ?? null) !== previousHash) {
      return {
        ok: false,
        checked: entries.length,
        failedEntryId: entry.id,
        reason: 'previous_hash_mismatch',
      };
    }

    const metadata = entry.metadata ? JSON.parse(entry.metadata) : {};
    const expected = sha256(stableStringify({
      complaintId: entry.complaintId ?? null,
      entityType: entry.entityType,
      entityId: entry.entityId,
      eventType: entry.eventType,
      metadata,
      previousHash,
    }));

    if (expected !== entry.eventHash) {
      return {
        ok: false,
        checked: entries.length,
        failedEntryId: entry.id,
        reason: 'event_hash_mismatch',
      };
    }

    previousHash = entry.eventHash;
  }

  return { ok: true, checked: entries.length, mode: env.DEMO_MODE ? 'synthetic_demo' : 'standard', localOnly: env.DEMO_MODE };
}
