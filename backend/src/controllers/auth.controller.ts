import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../utils/env';
import { z } from 'zod';

const registerSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
  password: z.string().min(6),
  role: z.enum(['citizen']).optional().default('citizen'),
});

export async function register(req: Request, res: Response) {
  const parse = registerSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: parse.error.flatten() });
  const { email, name, password, role } = parse.data;
  if (env.DEMO_MODE && !email.endsWith('@demo.justicelink.local')) {
    return res.status(400).json({ error: 'Demo mode only accepts @demo.justicelink.local accounts' });
  }

  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) return res.status(409).json({ error: 'Email already in use' });

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({ data: { email, name, passwordHash, role } });
  return res.status(201).json({ id: user.id, email: user.email, name: user.name, role: user.role });
}

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

export async function login(req: Request, res: Response) {
  const parse = loginSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: parse.error.flatten() });
  const { email, password } = parse.data;
  if (env.DEMO_MODE && !email.endsWith('@demo.justicelink.local')) {
    return res.status(401).json({ error: 'Demo mode only allows synthetic demo accounts' });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

  // Update last login timestamp (non-blocking)
  prisma.user.update({ where: { id: user.id }, data: { lastLogin: new Date() } }).catch(() => {});

  const token = jwt.sign({ sub: user.id, role: user.role, email: user.email }, env.JWT_SECRET, { expiresIn: '7d' });
  const u: any = user as any;
  return res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      dateOfBirth: u.dateOfBirth ?? null,
      address: u.address ?? null,
    }
  });
}
