import React from 'react';

interface SkeletonProps {
  className?: string;
}

// Bloco base de "loading skeleton": uma barra cinza pulsante que ocupa o
// espaço do conteúdo real enquanto ele carrega. Isso substitui a tela em
// branco/congelada que aparecia antes durante a busca de dados (só o
// módulo Financeiro tinha algum indicador, e mesmo assim apenas um ícone
// de refresh girando) — deixa claro que algo está carregando e aproxima o
// layout final, reduzindo o "salto" visual quando os dados chegam.
export function Skeleton({ className = '' }: SkeletonProps) {
  return <div className={`animate-pulse rounded-lg bg-slate-800/60 ${className}`} />;
}

// Linhas de texto simuladas (a última mais curta, como texto real).
export function SkeletonText({ lines = 1, className = '' }: { lines?: number; className?: string }) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={`h-3 ${i === lines - 1 && lines > 1 ? 'w-2/3' : 'w-full'}`} />
      ))}
    </div>
  );
}

// Aproxima um card de estatística (título curto + número grande + legenda),
// usado nos cabeçalhos de Dashboard, Financeiro, Faturamento, etc.
export function SkeletonStatCard({ className = '' }: { className?: string }) {
  return (
    <div className={`p-5 rounded-2xl bg-[#0d1527] border border-[#1e293b] space-y-3 ${className}`}>
      <Skeleton className="h-3 w-1/2" />
      <Skeleton className="h-7 w-2/3" />
      <Skeleton className="h-2 w-1/3" />
    </div>
  );
}

// Aproxima uma tabela: cabeçalho + N linhas de M colunas.
export function SkeletonTable({ rows = 6, columns = 5, className = '' }: { rows?: number; columns?: number; className?: string }) {
  return (
    <div className={`bg-[#0d1527] rounded-xl border border-[#1e293b] overflow-hidden ${className}`}>
      <div className="border-b border-[#1e293b] bg-slate-950/20 px-6 py-4">
        <Skeleton className="h-3 w-1/4" />
      </div>
      <div className="divide-y divide-[#1e293b]/50">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex items-center gap-6 px-6 py-4">
            {Array.from({ length: columns }).map((_, c) => (
              <Skeleton key={c} className="h-3 flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// Aproxima um card genérico de conteúdo (usado em grades tipo cofre de
// senhas, listas de cartões, etc.).
export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div className={`p-5 rounded-2xl bg-[#0d1527] border border-[#1e293b] space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-4 w-10" />
      </div>
      <Skeleton className="h-3 w-2/3" />
      <Skeleton className="h-8 w-full" />
    </div>
  );
}

// Cabeçalho de página padrão (título + subtítulo), usado no topo de quase
// toda tela para manter a posição do título estável durante o carregamento.
export function SkeletonPageHeader({ className = '' }: { className?: string }) {
  return (
    <div className={`space-y-2 ${className}`}>
      <Skeleton className="h-7 w-72" />
      <Skeleton className="h-3 w-96 max-w-full" />
    </div>
  );
}
