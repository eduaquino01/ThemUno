'use client';

import { useActionState } from 'react';
import { LogIn, Loader2 } from 'lucide-react';
import { login } from '@/app/auth/actions';

export default function LoginForm() {
  const [state, action, pending] = useActionState(login, undefined);

  return (
    <form action={action} className="space-y-5">
      <div className="space-y-2">
        <label htmlFor="email" className="block text-xs font-bold text-slate-300">E-mail</label>
        <input id="email" name="email" type="email" autoComplete="username" required
          className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
      </div>
      <div className="space-y-2">
        <label htmlFor="password" className="block text-xs font-bold text-slate-300">Senha</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required
          className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
      </div>
      {state?.message && <p role="alert" className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">{state.message}</p>}
      <button type="submit" disabled={pending}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-blue-500 disabled:opacity-60">
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
        {pending ? 'Entrando...' : 'Entrar'}
      </button>
    </form>
  );
}
