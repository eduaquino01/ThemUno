import { redirect } from 'next/navigation';
import Image from 'next/image';
import { getAuthenticatedUser } from '@/lib/auth';
import LoginForm from './LoginForm';

export default async function LoginPage() {
  if (await getAuthenticatedUser()) redirect('/');

  return (
    <main className="flex min-h-screen w-full items-center justify-center bg-[#070b13] p-6">
      <section className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/80 p-8 shadow-2xl">
        <div className="mb-8 text-center">
          <Image src="/themuno_logo.png" alt="ThemUno" width={72} height={72} className="mx-auto mb-4 rounded-xl" priority />
          <h1 className="text-2xl font-extrabold text-white">Acesso seguro</h1>
          <p className="mt-2 text-sm text-slate-400">Entre para acessar contratos, finanças e governança.</p>
        </div>
        <LoginForm />
      </section>
    </main>
  );
}
