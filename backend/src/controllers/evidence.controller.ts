import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { z } from 'zod';
import fs from 'node:fs/promises';
import path from 'node:path';
import { env } from '../utils/env';
import type { JwtPayload } from '../middlewares/auth';

export async function listEvidence(req: Request, res: Response) {
  const { caseId } = req.params;
  const caseRow = await prisma.case.findFirst({ where: { OR: [{ id: caseId }, { externalId: caseId }] } });
  if (!caseRow) return res.status(404).json({ error: 'Case not found' });
  if (env.DEMO_MODE && !caseRow.externalId.startsWith('DEMO-CASE-')) return res.status(404).json({ error: 'Demo case not found' });
  const user = (req as any).user as JwtPayload;
  let evidence;
  if (!['admin','clerk'].includes(user.role)) {
    const assigned = (user.role === 'judge' && caseRow.judgeId === user.sub)
      || (user.role === 'lawyer' && caseRow.lawyerId === user.sub)
      || (user.role === 'prosecutor' && caseRow.prosecutorId === user.sub);
    const where = assigned
      ? { caseId: caseRow.id }
      : { caseId: caseRow.id, uploadedBy: { equals: (user.email || ''), mode: 'insensitive' as any } };
    evidence = await prisma.evidence.findMany({ where, orderBy: { uploadedAt: 'desc' } });
    if (!assigned && evidence.length === 0) return res.status(403).json({ error: 'Forbidden' });
  } else {
    evidence = await prisma.evidence.findMany({ where: { caseId: caseRow.id }, orderBy: { uploadedAt: 'desc' } });
  }
  return res.json(evidence);
}

export async function addEvidence(req: Request, res: Response) {
  const { caseId } = req.params;
  const file = (req as any).file as Express.Multer.File | undefined;
  if (!file) return res.status(400).json({ error: 'File is required' });
  const caseRow = await prisma.case.findFirst({ where: { OR: [{ id: caseId }, { externalId: caseId }] } });
  if (!caseRow) return res.status(404).json({ error: 'Case not found' });
  if (env.DEMO_MODE && !caseRow.externalId.startsWith('DEMO-CASE-')) return res.status(404).json({ error: 'Demo case not found' });
  const user = (req as any).user as JwtPayload;
  // Only allow uploads by lawyers/prosecutors if assigned; clerks/admin are unrestricted
  if (['lawyer','prosecutor'].includes(user.role)) {
    const assigned = (user.role === 'lawyer' && caseRow.lawyerId === user.sub)
      || (user.role === 'prosecutor' && caseRow.prosecutorId === user.sub);
    if (!assigned) return res.status(403).json({ error: 'Forbidden' });
  }
  const payload = {
    caseId: caseRow.id,
    name: file.originalname,
    type: file.mimetype,
    size: file.size,
    uploadedBy: ((req as any).user?.email as string) || 'unknown',
    status: 'pending' as const,
  };
  const created = await prisma.evidence.create({ data: payload });
  // add timeline event: document uploaded
  await prisma.timelineEvent.create({
    data: {
      caseId: caseRow.id,
      type: 'document',
      title: 'Document Uploaded',
      description: `${file.originalname} uploaded`,
      actor: payload.uploadedBy,
      timestamp: new Date(),
    }
  });
  // Notify assigned users (judge/lawyer/prosecutor) about new upload
  try {
    const recipients = [caseRow.judgeId, caseRow.lawyerId, caseRow.prosecutorId].filter(Boolean) as string[];
    await (prisma as any).notification.createMany({
      data: recipients.map((uid) => ({
        userId: uid!,
        title: 'New Evidence Uploaded',
        message: `${file.originalname} uploaded to case ${caseRow.externalId || caseRow.id}`,
        link: `/case/${caseRow.externalId || caseRow.id}`
      }))
    });
  } catch {}
  return res.status(201).json({
    ...created,
    mode: env.DEMO_MODE ? 'synthetic_demo' : 'standard',
    mocked: env.DEMO_MODE,
    localOnly: env.DEMO_MODE,
    message: env.DEMO_MODE ? 'Demo evidence metadata recorded locally; no uploaded file was stored.' : undefined,
  });
}

export async function deleteEvidence(req: Request, res: Response) {
  const { caseId, evidenceId } = req.params as any;
  const user = (req as any).user as JwtPayload;
  const caseRow = await prisma.case.findFirst({ where: { OR: [{ id: caseId }, { externalId: caseId }] } });
  if (!caseRow) return res.status(404).json({ error: 'Case not found' });
  if (env.DEMO_MODE && !caseRow.externalId.startsWith('DEMO-CASE-')) return res.status(404).json({ error: 'Demo case not found' });
  if (user.role === 'judge') {
    if (!caseRow || caseRow.judgeId !== user.sub) return res.status(403).json({ error: 'Forbidden' });
  }
  await prisma.evidence.delete({ where: { id: evidenceId } });
  return res.status(204).send();
}

export async function downloadEvidence(req: Request, res: Response) {
  const { evidenceId } = req.params as any;
  const ev = await prisma.evidence.findUnique({ where: { id: evidenceId } });
  if (!ev) return res.status(404).json({ error: 'Evidence not found' });
  const user = (req as any).user as JwtPayload;
  // Enforce that only assigned case members or the uploader can download
  const caseRow = await prisma.case.findUnique({ where: { id: ev.caseId } });
  if (!caseRow) return res.status(404).json({ error: 'Case not found' });
  if (env.DEMO_MODE && !caseRow.externalId.startsWith('DEMO-CASE-')) return res.status(404).json({ error: 'Demo case not found' });
  if (!['admin','clerk'].includes(user.role)) {
    const allowed = (user.role === 'judge' && caseRow.judgeId === user.sub)
      || (user.role === 'lawyer' && caseRow.lawyerId === user.sub)
      || (user.role === 'prosecutor' && caseRow.prosecutorId === user.sub)
      || (ev.uploadedBy && ev.uploadedBy.toLowerCase() === (user.email || '').toLowerCase());
    if (!allowed) return res.status(403).json({ error: 'Forbidden' });
  }
  if (env.DEMO_MODE) {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="demo-${ev.name || 'evidence.txt'}"`);
    return res.send('Justice Link synthetic demo: no uploaded evidence file is stored or exposed in demo mode.');
  }
  // Files are saved as `${timestamp}_${originalname}`; we try to find the closest match by mtime
  try {
    const files = await fs.readdir(env.UPLOAD_DIR);
    const candidates = files.filter(f => f.endsWith(`_${ev.name}`));
    if (candidates.length === 0) return res.status(404).json({ error: 'File not found on server' });
    const targetTime = ev.uploadedAt?.getTime?.() ?? new Date(ev.uploadedAt as any).getTime();
    let best = candidates[0];
    let bestDelta = Number.POSITIVE_INFINITY;
    for (const c of candidates) {
      const full = path.join(env.UPLOAD_DIR, c);
      const st = await fs.stat(full);
      const delta = Math.abs(st.mtime.getTime() - targetTime);
      if (delta < bestDelta) { bestDelta = delta; best = c; }
    }
    const fullPath = path.join(env.UPLOAD_DIR, best);
    res.setHeader('Content-Type', ev.type || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${ev.name}"`);
    return res.sendFile(fullPath);
  } catch (e) {
    return res.status(500).json({ error: 'Failed to read file' });
  }
}
