import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from '@/lib/db';
import { UserRole } from '@prisma/client';
import 'server-only';
import { unstable_rethrow } from 'next/navigation';

export const SESSION_COOKIE_NAME = 'themuno_session';
export const MAX_FAILED_LOGIN_ATTEMPTS = 5;
export const LOGIN_LOCK_MS = 15 * 60 * 1000;
const SESSION_IDLE_TIMEOUT_MS = 30 * 60 * 1000;
const SESSION_TOUCH_INTERVAL_MS = 5 * 60 * 1000;

export function hashSessionToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function getFailedLoginState(currentAttempts: number, now = new Date()) {
  const failedAttempts = currentAttempts + 1;
  const shouldLock = failedAttempts >= MAX_FAILED_LOGIN_ATTEMPTS;
  return {
    failed_login_attempts: shouldLock ? 0 : failedAttempts,
    locked_until: shouldLock ? new Date(now.getTime() + LOGIN_LOCK_MS) : null,
  };
}

function getSessionTtlMs(): number {
  const fallbackHours = process.env.NODE_ENV === 'production' ? 12 : 168;
  const configuredHours = Number(process.env.SESSION_TTL_HOURS ?? fallbackHours);
  const hours = Number.isFinite(configuredHours) && configuredHours > 0
    ? configuredHours
    : fallbackHours;
  return hours * 60 * 60 * 1000;
}

// Roles hierarchy & permissions
export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  ADMIN: [
    'view', 'create', 'edit', 'approve', 'import', 'reconcile',
    'archive', 'reveal_credential', 'manage_users'
  ],
  DIRETORIA: [
    'view', 'create', 'edit', 'approve', 'import', 'reconcile',
    'archive', 'reveal_credential'
  ],
  FINANCEIRO: [
    'view', 'create', 'edit', 'import', 'reconcile'
  ],
  CONTRATOS: [
    'view', 'create', 'edit', 'archive'
  ],
  CONSULTA: [
    'view'
  ]
};

export async function hashPassword(plainText: string): Promise<string> {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(plainText, salt);
}

export async function comparePassword(plainText: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plainText, hash);
}

export async function createSession(userId: string): Promise<string> {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + getSessionTtlMs());

  await prisma.session.create({
    data: {
      user_id: userId,
      token_hash: hashSessionToken(token),
      expires_at: expiresAt,
    },
  });

  await prisma.user.update({
    where: { id: userId },
    data: { last_login_at: new Date() },
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    expires: expiresAt,
    path: '/',
    priority: 'high',
  });

  return token;
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (token) {
    await prisma.session.deleteMany({ where: { token_hash: hashSessionToken(token) } }).catch(() => {});
    cookieStore.delete(SESSION_COOKIE_NAME);
  }
}

export async function getAuthenticatedUser() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (!token) return null;

    const now = new Date();
    const session = await prisma.session.findUnique({
      where: { token_hash: hashSessionToken(token) },
      include: {
        user: {
          include: {
            user_companies: {
              include: { company: true },
            },
          },
        },
      },
    });

    const idleExpired = session
      ? now.getTime() - session.last_seen_at.getTime() > SESSION_IDLE_TIMEOUT_MS
      : false;

    if (!session || session.expires_at < now || idleExpired) {
      if (session) await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
      return null;
    }

    if (now.getTime() - session.last_seen_at.getTime() > SESSION_TOUCH_INTERVAL_MS) {
      await prisma.session.update({
        where: { id: session.id },
        data: { last_seen_at: now },
      });
    }

    return session.user;
  } catch (error) {
    unstable_rethrow(error);
    console.error('Error fetching authenticated user:', error);
    return null;
  }
}

export async function requireAuth(permission?: string) {
  const user = await getAuthenticatedUser();
  if (!user || !user.is_active) {
    throw new Error('Sessão expirada ou não autenticada. Por favor, faça login.');
  }

  if (permission) {
    const userPermissions = ROLE_PERMISSIONS[user.role] || [];
    if (!userPermissions.includes(permission)) {
      throw new Error(`Acesso negado: Perfil ${user.role} não possui permissão para '${permission}'.`);
    }
  }

  return user;
}

export async function requireCompanyAccess(companyId: string, permission?: string) {
  const user = await requireAuth(permission);

  // Admin and Diretoria have global access
  if (user.role === 'ADMIN' || user.role === 'DIRETORIA') {
    return user;
  }

  if (companyId === 'ALL') {
    throw new Error('Acesso negado: somente perfis globais podem consultar todas as empresas.');
  }

  const allowedCompanies = user.user_companies.map((uc) => uc.company_id);
  if (!allowedCompanies.includes(companyId)) {
    throw new Error(`Acesso negado: Você não possui permissão para acessar a empresa selecionada.`);
  }

  return user;
}

export async function getAuthorizedCompanyScope(
  permission: string,
  requestedCompanyId: string | 'ALL' = 'ALL',
): Promise<{ user: Awaited<ReturnType<typeof requireAuth>>; companyIds: string[] | null }> {
  const user = await requireAuth(permission);
  const hasGlobalAccess = user.role === 'ADMIN' || user.role === 'DIRETORIA';

  if (requestedCompanyId !== 'ALL') {
    if (!hasGlobalAccess && !user.user_companies.some((item) => item.company_id === requestedCompanyId)) {
      throw new Error('Acesso negado: empresa não autorizada para este usuário.');
    }
    return { user, companyIds: [requestedCompanyId] };
  }

  return {
    user,
    companyIds: hasGlobalAccess ? null : user.user_companies.map((item) => item.company_id),
  };
}

export async function requireGlobalAccess(permission: string) {
  const user = await requireAuth(permission);
  if (user.role !== 'ADMIN' && user.role !== 'DIRETORIA') {
    throw new Error('Acesso negado: esta operação exige um perfil global.');
  }
  return user;
}
