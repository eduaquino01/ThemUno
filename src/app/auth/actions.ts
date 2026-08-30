'use server';

import { z } from 'zod';
import { redirect } from 'next/navigation';
import { comparePassword, createSession, destroySession, getFailedLoginState } from '@/lib/auth';
import { prisma } from '@/lib/db';

const DUMMY_PASSWORD_HASH = '$2b$12$ySpFOZX5TU1odDihAn2rEuUHc/P4vWWEuAiMb.H/OzrMpb2qDvGOa';

const LoginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Informe um e-mail válido.'),
  password: z.string().min(1, 'Informe sua senha.').max(200),
});

export type LoginState = { message?: string } | undefined;

export async function login(_state: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = LoginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });

  if (!parsed.success) {
    return { message: parsed.error.issues[0]?.message ?? 'Dados de acesso inválidos.' };
  }

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (user?.locked_until && user.locked_until > new Date()) {
    await comparePassword(parsed.data.password, DUMMY_PASSWORD_HASH);
    return { message: 'E-mail ou senha inválidos. Tente novamente mais tarde.' };
  }

  const validPassword = user
    ? await comparePassword(parsed.data.password, user.password_hash)
    : await comparePassword(parsed.data.password, DUMMY_PASSWORD_HASH);

  if (!user || !user.is_active || !validPassword) {
    if (user?.is_active) {
      await prisma.user.update({
        where: { id: user.id },
        data: getFailedLoginState(user.failed_login_attempts),
      });
    }
    return { message: 'E-mail ou senha inválidos.' };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { failed_login_attempts: 0, locked_until: null },
  });
  await createSession(user.id);
  redirect('/');
}

export async function logout(): Promise<void> {
  await destroySession();
  redirect('/login');
}
