import { z } from 'zod';

export const permissionKeys = [
  'canCreateCases',
  'canEditCases',
  'canDeleteCases',
  'canViewAllCases',
  'canManageUsers',
  'canViewReports',
  'canManageSystem',
  'canAccessAuditLogs',
] as const;

export type UserPermissionKey = typeof permissionKeys[number];
export type UserPermissions = Record<UserPermissionKey, boolean>;

export const permissionsSchema = z.object({
  canCreateCases: z.boolean().optional(),
  canEditCases: z.boolean().optional(),
  canDeleteCases: z.boolean().optional(),
  canViewAllCases: z.boolean().optional(),
  canManageUsers: z.boolean().optional(),
  canViewReports: z.boolean().optional(),
  canManageSystem: z.boolean().optional(),
  canAccessAuditLogs: z.boolean().optional(),
});

const defaultPermissions: Record<string, UserPermissions> = {
  lawyer: {
    canCreateCases: true,
    canEditCases: true,
    canDeleteCases: false,
    canViewAllCases: false,
    canManageUsers: false,
    canViewReports: false,
    canManageSystem: false,
    canAccessAuditLogs: false,
  },
  judge: {
    canCreateCases: false,
    canEditCases: true,
    canDeleteCases: false,
    canViewAllCases: true,
    canManageUsers: false,
    canViewReports: true,
    canManageSystem: false,
    canAccessAuditLogs: false,
  },
  clerk: {
    canCreateCases: true,
    canEditCases: true,
    canDeleteCases: false,
    canViewAllCases: true,
    canManageUsers: false,
    canViewReports: true,
    canManageSystem: false,
    canAccessAuditLogs: false,
  },
  admin: {
    canCreateCases: true,
    canEditCases: true,
    canDeleteCases: true,
    canViewAllCases: true,
    canManageUsers: true,
    canViewReports: true,
    canManageSystem: true,
    canAccessAuditLogs: true,
  },
  prosecutor: {
    canCreateCases: false,
    canEditCases: true,
    canDeleteCases: false,
    canViewAllCases: true,
    canManageUsers: false,
    canViewReports: true,
    canManageSystem: false,
    canAccessAuditLogs: false,
  },
  paralegal: {
    canCreateCases: false,
    canEditCases: false,
    canDeleteCases: false,
    canViewAllCases: false,
    canManageUsers: false,
    canViewReports: true,
    canManageSystem: false,
    canAccessAuditLogs: false,
  },
  legal_aid_officer: {
    canCreateCases: false,
    canEditCases: false,
    canDeleteCases: false,
    canViewAllCases: false,
    canManageUsers: false,
    canViewReports: true,
    canManageSystem: false,
    canAccessAuditLogs: false,
  },
  partner_admin: {
    canCreateCases: false,
    canEditCases: false,
    canDeleteCases: false,
    canViewAllCases: false,
    canManageUsers: false,
    canViewReports: true,
    canManageSystem: false,
    canAccessAuditLogs: false,
  },
  data_analyst: {
    canCreateCases: false,
    canEditCases: false,
    canDeleteCases: false,
    canViewAllCases: false,
    canManageUsers: false,
    canViewReports: true,
    canManageSystem: false,
    canAccessAuditLogs: true,
  },
  citizen: {
    canCreateCases: false,
    canEditCases: false,
    canDeleteCases: false,
    canViewAllCases: false,
    canManageUsers: false,
    canViewReports: false,
    canManageSystem: false,
    canAccessAuditLogs: false,
  },
};

export function defaultPermissionsForRole(role: string): UserPermissions {
  return { ...(defaultPermissions[role] ?? defaultPermissions.citizen) };
}

export function normalizePermissions(role: string, stored?: string | null | Partial<UserPermissions>): UserPermissions {
  const base = defaultPermissionsForRole(role);
  let parsed: unknown = stored;

  if (typeof stored === 'string' && stored.trim()) {
    try {
      parsed = JSON.parse(stored);
    } catch {
      parsed = {};
    }
  }

  if (!parsed || typeof parsed !== 'object') return base;

  for (const key of permissionKeys) {
    const value = (parsed as Partial<UserPermissions>)[key];
    if (typeof value === 'boolean') base[key] = value;
  }

  return base;
}

export function serializePermissions(role: string, permissions?: Partial<UserPermissions> | string | null) {
  return JSON.stringify(normalizePermissions(role, permissions));
}
