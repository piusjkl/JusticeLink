import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { normalizePermissions, permissionsSchema, serializePermissions } from '../services/permissions.service';
import { env } from '../utils/env';

function userResponse(user: any, includePii = false) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    status: user.status,
    department: user.department ?? undefined,
    permissions: normalizePermissions(user.role, user.permissions),
    ...(includePii ? { dateOfBirth: user.dateOfBirth ?? null, address: user.address ?? null } : {}),
  };
}

export async function listUsers(_req: Request, res: Response) {
  const users = await prisma.user.findMany({
    where: env.DEMO_MODE ? { email: { endsWith: '@demo.justicelink.local' } } : undefined,
    orderBy: { createdAt: 'desc' },
  });
  return res.json(users.map((u) => userResponse(u)));
}

export async function getUser(req: Request, res: Response) {
  const { id } = req.params;
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return res.status(404).json({ error: 'User not found' });
  return res.json(userResponse(user, true));
}

const userUpdateSchema = z.object({
  name: z.string().min(2).optional(),
  department: z.string().optional(),
  status: z.enum(['active', 'inactive']).optional(),
  role: z.enum(['admin', 'judge', 'lawyer', 'clerk', 'prosecutor', 'citizen', 'paralegal', 'legal_aid_officer', 'partner_admin', 'data_analyst']).optional(),
  permissions: permissionsSchema.optional(),
  dateOfBirth: z.string().datetime().optional(),
  address: z.string().min(3).optional(),
});

export async function updateUser(req: Request, res: Response) {
  const { id } = req.params;
  const parse = userUpdateSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: parse.error.flatten() });
  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ error: 'User not found' });
  const data: any = { ...parse.data };
  if (data.dateOfBirth) data.dateOfBirth = new Date(data.dateOfBirth);
  if (data.permissions) {
    data.permissions = serializePermissions(data.role ?? existing.role, data.permissions);
  }
  const user = await prisma.user.update({ where: { id }, data });
  return res.json(userResponse(user, true));
}

export async function updateUserPermissions(req: Request, res: Response) {
  const { id } = req.params;
  const parse = permissionsSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: parse.error.flatten() });
  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ error: 'User not found' });
  const current = normalizePermissions(existing.role, (existing as any).permissions);
  const next = normalizePermissions(existing.role, { ...current, ...parse.data });
  const user = await prisma.user.update({
    where: { id },
    data: { permissions: JSON.stringify(next) },
  });
  return res.json(userResponse(user, true));
}

export async function deleteUser(req: Request, res: Response) {
  const { id } = req.params;
  await prisma.user.delete({ where: { id } });
  return res.status(204).send();
}

const userCreateSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
  role: z.enum(['admin', 'judge', 'lawyer', 'clerk', 'prosecutor', 'citizen', 'paralegal', 'legal_aid_officer', 'partner_admin', 'data_analyst']),
  department: z.string().optional(),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
  dateOfBirth: z.string().datetime(),
  address: z.string().min(3),
});

export async function createUser(req: Request, res: Response) {
  const parse = userCreateSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: parse.error.flatten() });
  const { email, name, role, department, password, dateOfBirth, address } = parse.data;
  if (env.DEMO_MODE && !email.endsWith('@demo.justicelink.local')) {
    return res.status(400).json({ error: 'Demo mode only accepts @demo.justicelink.local accounts' });
  }
  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) return res.status(409).json({ error: 'Email already in use' });
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await (prisma as any).user.create({
    data: {
      email,
      name,
      role,
      department,
      passwordHash,
      dateOfBirth: new Date(dateOfBirth),
      address,
      permissions: serializePermissions(role),
    }
  });
  return res.status(201).json(userResponse(user, true));
}

// Self profile endpoints
export async function getMe(req: Request, res: Response) {
  const me = (req as any).user as { sub: string };
  const u = await prisma.user.findUnique({ where: { id: me.sub } });
  if (!u) return res.status(404).json({ error: 'User not found' });
  return res.json(userResponse(u, true));
}

export async function updateMe(req: Request, res: Response) {
  const me = (req as any).user as { sub: string };
  const schema = z.object({ name: z.string().min(2).optional(), dateOfBirth: z.string().datetime().optional(), address: z.string().min(3).optional() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const data: any = { ...parsed.data };
  if (data.dateOfBirth) data.dateOfBirth = new Date(data.dateOfBirth);
  const u = await (prisma as any).user.update({ where: { id: me.sub }, data });
  return res.json(userResponse(u, true));
}
