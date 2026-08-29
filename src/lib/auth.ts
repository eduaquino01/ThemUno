import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from '@/lib/db';
import { UserRole } from '@prisma/client';

export const SESSION_COOKIE_NAME = 'themuno_session';

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
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  await prisma.session.create({
    data: {
      user_id: userId,
      token,
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
  });

  return token;
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (token) {
    await prisma.session.deleteMany({ where: { token } }).catch(() => {});
    cookieStore.delete(SESSION_COOKIE_NAME);
  }
}

export async function getAuthenticatedUser() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (!token) return null;

    const session = await prisma.session.findUnique({
      where: { token },
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

    if (!session || session.expires_at < new Date()) {
      if (session) await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
      return null;
    }

    return session.user;
  } catch (error) {
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
    return user;
  }

  const allowedCompanies = user.user_companies.map((uc: any) => uc.company_id);
  if (!allowedCompanies.includes(companyId)) {
    throw new Error(`Acesso negado: Você não possui permissão para acessar a empresa selecionada.`);
  }

  return user;
}
