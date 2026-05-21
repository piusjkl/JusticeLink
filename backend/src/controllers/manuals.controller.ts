import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { z } from 'zod';

const allowedManualRoles = ['admin','judge','lawyer','clerk','prosecutor','citizen','paralegal','legal_aid_officer','partner_admin','data_analyst'];

export async function getManual(req: Request, res: Response) {
  const role = String(req.params.role || '').toLowerCase();
  if (!allowedManualRoles.includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }
  const manual = await (prisma as any).userManual.findUnique({ where: { role } });
  return res.json({ role, content: manual?.content || defaultManual(role) });
}

const upsertSchema = z.object({
  content: z.string().min(1, 'Content is required'),
});

export async function saveManual(req: Request, res: Response) {
  const role = String(req.params.role || '').toLowerCase();
  if (!allowedManualRoles.includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }
  const parsed = upsertSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { content } = parsed.data;
  const item = await (prisma as any).userManual.upsert({
    where: { role },
    update: { content },
    create: { role, content },
  });
  return res.json({ role: item.role, content: item.content });
}

function defaultManual(role: string) {
  const header = `# ${capitalize(role)} User Manual\n`;
  const common = `\n## Getting Started\n- Log in with your official email.\n- Complete your profile (DOB & Address).\n\n`;
  const sections: Record<string,string> = {
    admin: `## Admin Tasks\n- Manage users and roles.\n- Update User Manuals.\n- Review audit logs.\n`,
    clerk: `## Clerk Tasks\n- Register new cases.\n- Assign judges/lawyers/prosecutors.\n- Manage scheduling.\n`,
    judge: `## Judge Tasks\n- Review assigned cases.\n- Start/Join video hearings.\n- Record rulings and adjournments.\n`,
    lawyer: `## Lawyer Tasks\n- Review assigned cases.\n- Upload and manage evidence.\n- View hearing schedule.\n`,
    prosecutor: `## Prosecutor Tasks\n- Review assigned cases.\n- Upload and manage evidence.\n- Coordinate with court staff.\n`,
    citizen: `## Citizen Tasks\n- File a legal complaint through the public portal or USSD.\n- Keep the tracking code private.\n- Track status using your phone number.\n`,
    paralegal: `## Paralegal Tasks\n- Review triaged complaints.\n- Accept, assign, or escalate referrals.\n- Record concise non-sensitive notes.\n`,
    legal_aid_officer: `## Legal Aid Tasks\n- Manage legal-aid referrals.\n- Prioritize vulnerable and emergency matters.\n- Monitor partner analytics.\n`,
    partner_admin: `## Partner Tasks\n- Review anonymized pilot analytics.\n- Monitor referral performance.\n- Avoid requesting citizen PII.\n`,
    data_analyst: `## Analyst Tasks\n- Review anonymized trends.\n- Verify the registry hash chain.\n- Prepare evidence-based planning reports.\n`,
  };
  return header + common + (sections[role] || '');
}

function capitalize(s: string) { return s.charAt(0).toUpperCase() + s.slice(1); }
