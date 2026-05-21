import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { createHash } from 'node:crypto';

const prisma = new PrismaClient();

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

async function main() {
  // Roles are enum; we just create users
  const passwordHash = await bcrypt.hash('password', 10);

  const users = [
    { email: 'admin@demo.justicelink.local', name: 'Demo System Admin', role: 'admin', dateOfBirth: new Date('1980-06-15'), address: 'Synthetic Demo Address' },
    { email: 'judge@demo.justicelink.local', name: 'Demo Presiding Judge', role: 'judge', dateOfBirth: new Date('1970-03-22'), address: 'Justice Link Demo Chambers' },
    { email: 'lawyer@demo.justicelink.local', name: 'Demo Legal Counsel', role: 'lawyer', dateOfBirth: new Date('1990-11-05'), address: 'Justice Link Demo Counsel Desk' },
    { email: 'clerk@demo.justicelink.local', name: 'Demo Court Clerk', role: 'clerk', dateOfBirth: new Date('1994-02-10'), address: 'Justice Link Demo Registry' },
    { email: 'prosecutor@demo.justicelink.local', name: 'Demo Prosecutor', role: 'prosecutor', dateOfBirth: new Date('1986-08-03'), address: 'Justice Link Demo Prosecution Desk' },
    { email: 'paralegal@demo.justicelink.local', name: 'Demo Paralegal Officer', role: 'paralegal', dateOfBirth: new Date('1992-04-08'), address: 'Justice Link Demo Referral Desk' },
    { email: 'legalaid@demo.justicelink.local', name: 'Demo Legal Aid Officer', role: 'legal_aid_officer', dateOfBirth: new Date('1988-09-11'), address: 'Justice Link Demo Legal Aid Desk' },
    { email: 'partner@demo.justicelink.local', name: 'Demo Partner Admin', role: 'partner_admin', dateOfBirth: new Date('1983-01-19'), address: 'Justice Link Demo Analytics Desk' },
    { email: 'analyst@demo.justicelink.local', name: 'Demo Data Analyst', role: 'data_analyst', dateOfBirth: new Date('1991-12-02'), address: 'Justice Link Demo Analytics Lab' },
  ] as const;

  for (const u of users) {
    await (prisma as any).user.upsert({
      where: { email: u.email },
      update: { name: u.name, role: u.role as any, passwordHash, dateOfBirth: u.dateOfBirth, address: u.address },
      create: { email: u.email, name: u.name, role: u.role as any, passwordHash, dateOfBirth: u.dateOfBirth, address: u.address },
    });
  }

  // Seed role-based User Manuals with step-by-step instructions and help info
  const manuals: Array<{ role: string; content: string }> = [
    {
      role: 'admin',
      content: `# Administrator User Manual

## 1. Overview
Administrators manage users, permissions, system settings, manuals, and audit oversight. This guide provides step-by-step tasks and where to get help.

## 2. Before You Begin
- Ensure you have an Administrator account issued by your IT team.
- Recommended browser: latest Chrome/Edge/Firefox.

## 3. Sign In and Profile
1) Visit the local demo URL and click Sign In.
2) Enter your demo email and password.
3) On first login, complete your profile (Date of Birth and Address). This is required for security and audit.

## 4. Navigation Basics
- Top bar: quick actions and notifications.
- Sidebar: modules (Users, Cases, Reports, Settings).
- Your role is shown in the top-right user menu.

## 5. Core Tasks
### A. Manage Users
1) Open Users.
2) Click "Add User" and fill name, email, role, department, DOB, and Address.
3) Submit. The user will receive credentials (per your organization’s process).
4) To update: select a user → Edit → Save.
5) To deactivate: set Status to Inactive.

### B. Configure Role Manuals
1) Click the User Manual button (top-right) to open the modal.
2) Select your role (as Admin you can edit any role’s manual via the dropdown or switch role context if present).
3) Paste or author step-by-step guidance.
4) Click Save. End users will see the updated manual for their role.

### C. Reports and Oversight
1) Open Reports.
2) Generate operational summaries (cases, active cases, users, evidence).
3) Review and export as needed.

### D. System Settings and Security
1) Ensure CORS origins are correct (IT task).
2) Periodically review audit trails (timeline events) and user access.

## 6. Video Hearings (Oversight)
- Admins do not start hearings but can monitor system readiness.
- If judges report issues, coordinate with IT support.

## 7. Getting Help
- In-app: check Notifications for system announcements.
- Contact IT support or the system administrator team.
- Provide timestamp, your email, and the Case ID (if applicable).

## 8. Security Best Practices
- Never share passwords.
- Keep profile data accurate for audit (DOB/Address).
- Log out from shared devices.`
    },
    {
      role: 'clerk',
      content: `# Clerk User Manual

## 1. Overview
Clerks register new cases, manage basic scheduling, and assign participants (judge, lawyer, prosecutor).

## 2. Before You Begin
- Ensure you have a Clerk account.
- Know your court’s case numbering conventions.

## 3. Sign In and Profile
1) Sign in with your demo email and password.
2) Complete your profile (DOB and Address) if prompted.

## 4. Registering a Case
1) Go to Cases → Register New Case.
2) Enter case details: Title, Type, Filing Date, Description, Priority.
3) Enter Plaintiff details:
   - Plaintiff Name
   - Plaintiff Date of Birth → the system auto-computes and stores Plaintiff Age
   - Plaintiff Address (snapshot)
4) Enter Defendant Name.
5) Assign Judge/Lawyer/Prosecutor as instructed by policy.
6) Save to create the case. A timeline entry is recorded.

## 5. Scheduling Basics
1) On the case view, set Next Hearing date/time and location.
2) Update as schedules change. Each update is logged.

## 6. Managing Evidence
1) Open the case → Evidence.
2) Upload files (PDF, images, etc.).
3) Add a brief description and tags if needed.
4) Evidence status flows: pending → approved/rejected (per court procedure).

## 7. Notifications
- Use the bell icon to see assignments or updates.
- Click View to navigate to the referenced case.

## 8. Getting Help
- Check with your Registrar or Admin for process questions.
- For technical issues, contact IT support; include the Case ID and timestamp.

## 9. Security
- Handle PII (DOB/Address) responsibly.
- Log out when leaving your workstation.`
    },
    {
      role: 'judge',
      content: `# Judge User Manual

## 1. Overview
Judges review assigned cases, manage video hearings, record rulings or actions, and oversee case progress.

## 2. Before You Begin
- Ensure your Judge account is active and profile completed.
- Have a webcam and microphone for video hearings.

## 3. Reviewing Cases
1) Go to Cases → My Assigned Cases.
2) Open a case to see parties, filings, evidence, and the timeline.

## 4. Starting a Video Hearing
1) From the Judge Dashboard or Case view, click Start/Join Video Hearing.
2) Allow camera/microphone access in your browser.
3) Confirm the Case ID shown matches the case you intend to hear.

## 5. Managing the Session
1) Participants join via assigned roles (lawyer, prosecutor, clerk).
2) Use the available actions:
   - Mark attendance
   - Request evidence
   - Adjourn
   - Record ruling
   - Proceed in absence (if policy allows)
   - End session
3) All session actions are logged to the case timeline for audit.

## 6. Recording Outcomes
1) Use "Record ruling" to note key orders or decisions.
2) Confirm summary appears in the timeline.

## 7. Getting Help
- For process questions: consult the Registrar or Chief Judge.
- Technical issues: contact IT support; provide the Session ID and Case ID.

## 8. Security
- Verify participant identities.
- Do not disclose sensitive information outside authorized channels.`
    },
    {
      role: 'lawyer',
      content: `# Lawyer User Manual

## 1. Overview
Lawyers access assigned cases, upload evidence, view schedules, and attend video hearings.

## 2. Before You Begin
- Ensure your Lawyer account is active and profile completed.

## 3. Accessing Assigned Cases
1) Go to Cases → My Cases.
2) Select a case to review parties, filings, evidence, and timeline.

## 4. Uploading Evidence
1) Open the case → Evidence.
2) Click Upload and attach the file(s).
3) Add description and tags as needed.

## 5. Attending Video Hearings
1) Join the session via the link/button on the case or dashboard when scheduled.
2) Allow camera/microphone access.
3) Follow directions from the presiding judge.

## 6. Notifications
- Use the bell icon for updates or requests.
 
## 7. Getting Help
- For procedural clarifications: contact the Clerk or Registrar.
- For technical support: contact IT with the Case ID and timestamp.

## 8. Security
- Protect client data.
- Do not upload privileged documents to unrelated cases.`
    },
    {
      role: 'prosecutor',
      content: `# Prosecutor User Manual

## 1. Overview
Prosecutors access assigned cases, manage evidence, and attend hearings.

## 2. Before You Begin
- Ensure your Prosecutor account is active and profile completed.

## 3. Case Work
1) Go to Cases → My Cases.
2) Review parties, filings, evidence, and timeline.

## 4. Evidence
1) Upload new evidence to the relevant case.
2) Track status changes (pending/approved/rejected).

## 5. Video Hearings
1) Join scheduled sessions and follow the court’s protocol.
2) Ensure devices (mic/camera) are functional.

## 6. Notifications
- Monitor the bell icon for updates and requests.

## 7. Getting Help
- Policy/process: consult your office lead or the Clerk.
- Technical: contact IT; include Case ID and any error messages.

## 8. Security
- Handle evidence with care.
- Follow disclosure rules and chain-of-custody policies.`
    }
  ];

  for (const m of manuals) {
    await (prisma as any).userManual.upsert({
      where: { role: m.role },
      update: { content: m.content },
      create: { role: m.role, content: m.content }
    });
  }

  const pilotManuals = [
    { role: 'paralegal', content: '# Paralegal User Manual\n\nReview triaged complaints, contact citizens through approved channels, accept or escalate referrals, and keep notes free of unnecessary personal data.' },
    { role: 'legal_aid_officer', content: '# Legal Aid Officer User Manual\n\nManage legal-aid referrals, prioritize emergency and vulnerable-person matters, update referral status, and monitor partner analytics.' },
    { role: 'partner_admin', content: '# Partner Admin User Manual\n\nUse partner analytics to monitor anonymized complaint trends and referral performance. Do not request or export citizen PII.' },
    { role: 'data_analyst', content: '# Data Analyst User Manual\n\nUse synthetic Justice Link dashboards, registry verification, and aggregate reports for demo planning.' },
    { role: 'citizen', content: '# Citizen Guide\n\nSubmit a complaint through the public portal or USSD, keep your tracking code private, and use your phone number to check status.' },
  ];

  for (const m of pilotManuals) {
    await (prisma as any).userManual.upsert({
      where: { role: m.role },
      update: { content: m.content },
      create: { role: m.role, content: m.content }
    });
  }

  for (const district of ['Mbarara', 'Gulu', 'Jinja']) {
    await (prisma as any).institution.upsert({
      where: { name: `Justice Link Referral Desk - ${district}` },
      update: { type: 'jlos', district },
      create: { name: `Justice Link Referral Desk - ${district}`, type: 'jlos', district }
    });
    await (prisma as any).institution.upsert({
      where: { name: `Justice Link Emergency Referral Desk - ${district}` },
      update: { type: 'police', district, supportsEmergency: true },
      create: { name: `Justice Link Emergency Referral Desk - ${district}`, type: 'police', district, supportsEmergency: true }
    });
    await (prisma as any).legalAidProvider.upsert({
      where: { name: `Justice Link Partner Legal Aid Desk - ${district}` },
      update: { district, active: true },
      create: {
        name: `Justice Link Partner Legal Aid Desk - ${district}`,
        providerType: 'legal_aid',
        district,
        services: JSON.stringify(['legal_aid', 'mediation', 'case_referral']),
        supportsWomen: true,
        supportsYouth: true,
        supportsPwd: true
      }
    });
  }

  const partner = await (prisma as any).partnerOrg.upsert({
    where: { name: 'Justice Link Demo Analytics' },
    update: { type: 'demo_partner', active: true },
    create: { name: 'Justice Link Demo Analytics', type: 'demo_partner', district: 'National' }
  });
  await (prisma as any).partnerApiToken.upsert({
    where: { tokenHash: hashToken('demo-justicelink-analytics-token') },
    update: { scopes: JSON.stringify(['analytics:read']) },
    create: {
      partnerOrgId: partner.id,
      name: 'Demo analytics token',
      tokenHash: hashToken('demo-justicelink-analytics-token'),
      scopes: JSON.stringify(['analytics:read'])
    }
  });

  // Create sample cases
  const judge = await prisma.user.findFirst({ where: { role: 'judge' } });
  const lawyer = await prisma.user.findFirst({ where: { role: 'lawyer' } });
  const prosecutor = await prisma.user.findFirst({ where: { role: 'prosecutor' } });

  if (judge && lawyer && prosecutor) {
    const created = await (prisma as any).case.upsert({
      where: { externalId: 'DEMO-CASE-2026-001' },
      update: {},
      create: {
        externalId: 'DEMO-CASE-2026-001',
        title: 'Justice Link Demo Matter 001',
        type: 'criminal',
        status: 'active',
        filingDate: new Date('2026-05-21'),
        nextHearing: new Date('2026-05-22T09:00:00Z'),
        hearingLocation: 'Justice Link Demo Courtroom',
        judgeId: judge.id,
        lawyerId: lawyer.id,
        prosecutorId: prosecutor.id,
        plaintiff: 'Demo Complainant',
        defendant: 'Demo Respondent',
        description: 'Synthetic demo case for the Justice Link local presentation.',
        priority: 'high',
        plaintiffAge: 0,
        plaintiffAddress: 'Synthetic demo address',
      }
    });
    // Seed some notifications to demonstrate the bell
    const recips = [judge.id, lawyer.id, prosecutor.id];
    await (prisma as any).notification.createMany({
      data: recips.map((uid) => ({
        userId: uid,
        title: 'Welcome',
        message: 'Your dashboard is now active. You have been assigned to DEMO-CASE-2026-001.',
        link: '/case/DEMO-CASE-2026-001'
      }))
    });
  }
}

main().catch(e => {
  console.error(e);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
