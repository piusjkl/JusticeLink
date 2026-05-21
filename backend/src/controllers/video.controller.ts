import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import type { JwtPayload } from '../middlewares/auth';
import { z } from 'zod';
import { broadcastCase, broadcastSession } from '../realtime/ws';
import { signToken, verifyToken } from '../services/token.service';
import { env } from '../utils/env';

function demoMeta() {
  return env.DEMO_MODE ? { mode: 'synthetic_demo', mocked: true, localOnly: true } : {};
}

async function notifyJudgeAndClerks(caseId: string, title: string, message: string, link?: string) {
  try {
    const c = await prisma.case.findUnique({ where: { id: caseId } });
    if (!c) return;
    const judgeId = c.judgeId;
    const clerks = await prisma.user.findMany({ where: { role: 'clerk', status: 'active' } });
    const recipientIds = [judgeId, ...clerks.map((u) => u.id)].filter(Boolean) as string[];
    if (recipientIds.length === 0) return;
    await (prisma as any).notification.createMany({
      data: recipientIds.map((uid) => ({ userId: uid, title, message, link })),
      skipDuplicates: false,
    });
  } catch (e) {
    // best-effort notifications
  }
}

export async function startSession(req: Request, res: Response) {
  const user = (req as any).user as JwtPayload;
  const { caseId } = req.params;
  const c = await prisma.case.findFirst({ where: { OR: [{ id: caseId }, { externalId: caseId }] } });
  if (!c) return res.status(404).json({ error: 'Case not found' });
  // Allow judge to start their own session or clerk to start on behalf of the assigned judge
  if (user.role === 'judge' && c.judgeId !== user.sub) return res.status(403).json({ error: 'Not assigned judge' });
  if (user.role === 'clerk' && !c.judgeId) return res.status(400).json({ error: 'Case has no assigned judge' });
  if (!['judge', 'clerk', 'admin'].includes(user.role)) return res.status(403).json({ error: 'Forbidden' });
  const judgeOwner = user.role === 'judge' ? user.sub : (c.judgeId as string);
  const session = await (prisma as any).videoSession.create({ data: { caseId: c.id, judgeId: judgeOwner } });
  await prisma.timelineEvent.create({ data: { caseId: c.id, type: 'hearing', title: 'Video session started', description: `Session ${session.id}` , actor: user.email } });
  await notifyJudgeAndClerks(c.id, 'Video session started', `${c.externalId || c.id}: Session ${session.id} started by ${user.role}`, `/case/${c.externalId || c.id}`);
  broadcastCase(c.id, { event: 'session_started', sessionId: session.id });
  if (c.externalId) broadcastCase(c.externalId, { event: 'session_started', sessionId: session.id });
  return res.json({ ...session, ...demoMeta(), message: env.DEMO_MODE ? 'Demo session recorded locally; no video provider was contacted.' : undefined });
}

export async function endSession(req: Request, res: Response) {
  const user = (req as any).user as JwtPayload;
  if (user.role !== 'judge') return res.status(403).json({ error: 'Only judges can end sessions' });
  const { sessionId } = req.params;
  const session = await (prisma as any).videoSession.findUnique({ where: { id: sessionId } });
  if (!session) return res.status(404).json({ error: 'Session not found' });
  if (session.judgeId !== user.sub) return res.status(403).json({ error: 'Not your session' });
  const updated = await (prisma as any).videoSession.update({ where: { id: sessionId }, data: { endedAt: new Date() } });
  await prisma.timelineEvent.create({ data: { caseId: session.caseId, type: 'hearing', title: 'Video session ended', description: `Session ${session.id}` , actor: user.email } });
  await notifyJudgeAndClerks(session.caseId, 'Video session ended', `Session ${session.id} ended by Judge`, `/case/${session.caseId}`);
  broadcastSession(sessionId, { event: 'session_ended' });
  return res.json({ ...updated, ...demoMeta() });
}

const joinSchema = z.object({ role: z.string().min(2) });
export async function joinSession(req: Request, res: Response) {
  const user = (req as any).user as JwtPayload;
  const { sessionId } = req.params;
  const parsed = joinSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const session = await (prisma as any).videoSession.findUnique({ where: { id: sessionId }, include: { case: true } });
  if (!session) return res.status(404).json({ error: 'Session not found' });
  // Access: participants must be assigned to the case or be clerk/admin
  const c = session.case;
  const allowed = ['admin','clerk'].includes(user.role) || c.judgeId === user.sub || c.lawyerId === user.sub || c.prosecutorId === user.sub;
  if (!allowed) return res.status(403).json({ error: 'Forbidden' });
  const part = await (prisma as any).videoParticipant.create({ data: { sessionId, userId: user.sub, role: user.role } });
  await notifyJudgeAndClerks(c.id, 'Video session activity', `${c.externalId || c.id}: ${user.role} joined the session`, `/case/${c.externalId || c.id}`);
  broadcastSession(sessionId, { event: 'participant_join', userId: user.sub, role: user.role });
  return res.json({ ...part, ...demoMeta() });
}

const actionSchema = z.object({ action: z.string().min(2), details: z.string().optional() });
export async function recordAction(req: Request, res: Response) {
  const user = (req as any).user as JwtPayload;
  const { sessionId } = req.params;
  const parsed = actionSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const session = await (prisma as any).videoSession.findUnique({ where: { id: sessionId } });
  if (!session) return res.status(404).json({ error: 'Session not found' });
  // Only judge can record judge actions; others can mark attendance
  const allowedActions = user.role === 'judge'
    ? ['record_ruling','adjourn','request_evidence','mark_attendance','proceed_in_absence','end_session']
    : (user.role === 'clerk' ? ['mark_attendance','start_presentation','stop_presentation'] : ['mark_attendance']);
  if (!allowedActions.includes(parsed.data.action)) return res.status(403).json({ error: 'Action not allowed' });
  const action = await (prisma as any).videoAction.create({ data: { sessionId, action: parsed.data.action, details: parsed.data.details, actorId: user.sub } });
  // mirror to timeline for audit
  await prisma.timelineEvent.create({ data: { caseId: session.caseId, type: 'hearing', title: `Session action: ${parsed.data.action}`, description: parsed.data.details || '', actor: (req as any).user?.email || 'system' } });
  await notifyJudgeAndClerks(session.caseId, 'Video session action', `${parsed.data.action.replaceAll('_',' ')}${parsed.data.details ? `: ${parsed.data.details}` : ''}`, `/case/${session.caseId}`);
  broadcastSession(sessionId, { event: 'action', action: parsed.data.action, details: parsed.data.details, actorId: user.sub });
  return res.json({ ...action, ...demoMeta() });
}

export async function getSession(req: Request, res: Response) {
  const { sessionId } = req.params;
  const session = await (prisma as any).videoSession.findUnique({ where: { id: sessionId }, include: { participants: { include: { user: true } }, actions: true } });
  if (!session) return res.status(404).json({ error: 'Session not found' });
  return res.json({ ...session, ...demoMeta() });
}

// Share links
export async function createShareLinks(req: Request, res: Response) {
  const user = (req as any).user as JwtPayload;
  const { sessionId } = req.params;
  const session = await (prisma as any).videoSession.findUnique({ where: { id: sessionId }, include: { case: true } });
  if (!session) return res.status(404).json({ error: 'Session not found' });
  // Only judge, clerk, or admin can generate share links
  if (!['judge','clerk','admin'].includes(user.role)) return res.status(403).json({ error: 'Forbidden' });
  // Tokens expire in 1 day by default
  const exp = '1d';
  const publicToken = signToken({ kind: 'video_share', scope: 'public', sessionId }, exp);
  const prisonToken = signToken({ kind: 'video_share', scope: 'prison', sessionId }, exp);
  return res.json({ publicToken, prisonToken, expiresIn: exp, ...demoMeta(), message: env.DEMO_MODE ? 'Demo share links are local-only placeholders.' : undefined });
}

// Public viewer: read-only session info (no auth)
export async function getPublicSession(req: Request, res: Response) {
  const { token } = req.params as any;
  try {
    const payload = verifyToken<any>(token);
    if (payload?.kind !== 'video_share' || payload?.scope !== 'public') return res.status(403).json({ error: 'Invalid token' });
    const session = await (prisma as any).videoSession.findUnique({ where: { id: payload.sessionId }, include: { case: true, actions: true } });
    if (!session || session.endedAt) return res.status(404).json({ error: 'No live session' });
    // return minimal safe details
    return res.json({ sessionId: session.id, case: { id: session.case.id, externalId: session.case.externalId, title: session.case.title, type: session.case.type }, actions: session.actions, ...demoMeta() });
  } catch (e) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// Prison join: unauthenticated token grants join as 'prison'
export async function prisonJoin(req: Request, res: Response) {
  const { token } = req.params as any;
  try {
    const payload = verifyToken<any>(token);
    if (payload?.kind !== 'video_share' || payload?.scope !== 'prison') return res.status(403).json({ error: 'Invalid token' });
    const sessionId = payload.sessionId as string;
    const session = await (prisma as any).videoSession.findUnique({ where: { id: sessionId }, include: { case: true } });
    if (!session || session.endedAt) return res.status(404).json({ error: 'No live session' });
    if (env.DEMO_MODE) {
      broadcastSession(sessionId, { event: 'participant_join', role: 'demo_prison' });
      return res.json({ ok: true, sessionId, participantId: `demo-prison-${Date.now()}`, ...demoMeta() });
    }
    const part = await (prisma as any).videoParticipant.create({ data: { sessionId, userId: `prison:${Date.now()}`, role: 'prison' } });
    broadcastSession(sessionId, { event: 'participant_join', role: 'prison' });
    return res.json({ ok: true, sessionId, participantId: part.id });
  } catch (e) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export async function getActiveSessionForCase(req: Request, res: Response) {
  const { caseId } = req.params;
  const c = await prisma.case.findFirst({ where: { OR: [{ id: caseId }, { externalId: caseId }] } });
  if (!c) return res.status(404).json({ error: 'Case not found' });
  const session = await (prisma as any).videoSession.findFirst({
    where: { caseId: c.id, endedAt: null },
    orderBy: { startedAt: 'desc' },
  });
  if (!session) return res.status(204).send();
  return res.json({ ...session, ...demoMeta() });
}
