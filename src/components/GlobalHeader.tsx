'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Search, 
  Bell, 
  Key, 
  FileText, 
  CreditCard, 
  AlertTriangle, 
  X, 
  ArrowUpRight,
  CheckCircle2,
  Lock
} from 'lucide-react';
import { getContracts, getInvoices } from '@/app/actions';

import CompanySelector from '@/components/CompanySelector';

export default function GlobalHeader() {
  const router = useRouter();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [query, setQuery] = useState('');
  
  const [contracts, setContracts] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [c, inv] = await Promise.all([getContracts(), getInvoices()]);
        setContracts(c || []);
        setInvoices(inv || []);
      } catch (err) {
        console.error('Error loading header data:', err);
      }
    }
    loadData();
  }, []);

  // Keyboard shortcut Listener: Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      } else if (e.key === 'Escape') {
        setIsSearchOpen(false);
        setIsNotifOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close notification popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setIsNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Compute Alerts / Notifications
  const now = new Date();
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(now.getDate() + 30);

  const expiringContracts = contracts.filter((c) => {
    if (!c.end_date) return false;
    const endDate = new Date(c.end_date);
    return endDate <= thirtyDaysFromNow && endDate >= now;
  });

  const pendingInvoices = invoices.filter((i) => i.status === 'PENDING_ACCEPTANCE' || i.status === 'ISSUED');
  const disputedInvoices = invoices.filter((i) => i.status === 'DISPUTED');

  const totalNotifications = expiringContracts.length + pendingInvoices.length + disputedInvoices.length;

  // Global search filtering
  const allCredentials = contracts.flatMap((c) => 
    (c.credentials || []).map((cred: any) => ({ ...cred, contractId: c.id, contractTitle: c.title }))
  );

  const filteredContracts = query.trim()
    ? contracts.filter((c) =>
        c.title.toLowerCase().includes(query.toLowerCase()) ||
        c.counterpart.toLowerCase().includes(query.toLowerCase()) ||
        c.type.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 5)
    : [];

  const filteredCredentials = query.trim()
    ? allCredentials.filter((cred) =>
        cred.title.toLowerCase().includes(query.toLowerCase()) ||
        (cred.username && cred.username.toLowerCase().includes(query.toLowerCase()))
      ).slice(0, 5)
    : [];

  const filteredInvoices = query.trim()
    ? invoices.filter((inv) =>
        inv.invoice_number.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 5)
    : [];

  return (
    <div className="flex items-center justify-between w-full">
      {/* LEFT: Logo Brand & Search Trigger */}
      <div className="flex items-center gap-4">
        <Link href="/" className="flex items-center gap-2.5 group">
          <img
            src="/themuno_logo.png"
            alt="ThemUno Logo"
            className="w-8 h-8 object-contain rounded-lg ring-1 ring-blue-500/40 shadow-md group-hover:scale-105 transition-transform"
          />
          <span className="font-extrabold text-sm text-white tracking-wider hidden sm:inline bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
            ThemUno <span className="text-blue-400 font-bold">CLMS</span>
          </span>
        </Link>

        <button
          onClick={() => setIsSearchOpen(true)}
          className="flex items-center gap-3 px-4 py-2 bg-slate-950/80 hover:bg-slate-900 border border-[#1e293b] rounded-xl text-gray-400 hover:text-gray-200 transition-all text-xs w-60 md:w-80 justify-between group shadow-inner"
        >
          <div className="flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-blue-400 group-hover:scale-110 transition-transform" />
            <span>Buscar contratos, cofres, faturas...</span>
          </div>
          <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-slate-800 border border-slate-700 text-gray-300 rounded font-semibold">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* RIGHT: Company Selector & Notifications */}
      <div className="flex items-center gap-4 text-xs">
        <CompanySelector />

        <div className="hidden md:flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="text-gray-300 font-medium">Holding Grupo</span>
        </div>

        {/* NOTIFICATION BELL */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setIsNotifOpen((prev) => !prev)}
            className="relative p-2 text-gray-400 hover:text-white bg-slate-950 border border-[#1e293b] hover:border-slate-700 rounded-xl transition-all"
            title="Central de Alertas & Notificações"
          >
            <Bell className="w-4 h-4 text-slate-300" />
            {totalNotifications > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white rounded-full text-[10px] font-extrabold flex items-center justify-center animate-bounce shadow-md">
                {totalNotifications}
              </span>
            )}
          </button>

          {/* NOTIFICATIONS DROPDOWN */}
          {isNotifOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-[#0d1527] border border-[#1e293b] rounded-2xl shadow-2xl z-50 overflow-hidden animate-fade-in">
              <div className="p-4 border-b border-[#1e293b] flex items-center justify-between bg-slate-950/40">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-blue-400" />
                  <h4 className="font-bold text-white text-sm">Central de Alertas</h4>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 font-bold">
                  {totalNotifications} ativas
                </span>
              </div>

              <div className="max-h-80 overflow-y-auto p-3 space-y-2 divide-y divide-[#1e293b]/40">
                {expiringContracts.length > 0 && (
                  <div className="pt-2 space-y-1.5">
                    <p className="text-[10px] font-extrabold uppercase text-amber-400 tracking-wider flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> Contratos a Vencer em 30 Dias
                    </p>
                    {expiringContracts.map((c) => (
                      <Link
                        key={c.id}
                        href={`/contracts/${c.id}`}
                        onClick={() => setIsNotifOpen(false)}
                        className="block p-2 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 transition-colors"
                      >
                        <div className="font-bold text-white text-xs leading-snug">{c.title}</div>
                        <div className="text-[10px] text-amber-300 mt-0.5">
                          Vence em: {new Date(c.end_date).toLocaleDateString('pt-BR')} ({c.counterpart})
                        </div>
                      </Link>
                    ))}
                  </div>
                )}

                {disputedInvoices.length > 0 && (
                  <div className="pt-2 space-y-1.5">
                    <p className="text-[10px] font-extrabold uppercase text-rose-400 tracking-wider flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> Faturas em Contestação
                    </p>
                    {disputedInvoices.map((inv) => (
                      <Link
                        key={inv.id}
                        href="/billing"
                        onClick={() => setIsNotifOpen(false)}
                        className="block p-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition-colors"
                      >
                        <div className="font-bold text-white text-xs">{inv.invoice_number}</div>
                        <div className="text-[10px] text-rose-300">
                          Valor: R$ {inv.amount} | Contestada
                        </div>
                      </Link>
                    ))}
                  </div>
                )}

                {pendingInvoices.length > 0 && (
                  <div className="pt-2 space-y-1.5">
                    <p className="text-[10px] font-extrabold uppercase text-blue-400 tracking-wider flex items-center gap-1">
                      <CreditCard className="w-3 h-3" /> Faturas Pendentes de Medição
                    </p>
                    {pendingInvoices.slice(0, 3).map((inv) => (
                      <Link
                        key={inv.id}
                        href="/billing"
                        onClick={() => setIsNotifOpen(false)}
                        className="block p-2 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 transition-colors"
                      >
                        <div className="font-bold text-white text-xs">{inv.invoice_number}</div>
                        <div className="text-[10px] text-blue-300">
                          Vencimento: {new Date(inv.due_date).toLocaleDateString('pt-BR')}
                        </div>
                      </Link>
                    ))}
                  </div>
                )}

                {totalNotifications === 0 && (
                  <div className="py-8 text-center text-gray-500 space-y-2">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                    <p className="text-xs font-semibold text-gray-300">Nenhum alerta pendente</p>
                    <p className="text-[10px]">Todos os contratos e faturas estão em dia.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* GLOBAL SEARCH MODAL (CMD + K) */}
      {/* ======================================================== */}
      {isSearchOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-start justify-center pt-20 p-4">
          <div className="w-full max-w-2xl bg-[#0d1527] border border-[#1e293b] rounded-2xl shadow-2xl overflow-hidden animate-fade-in space-y-0">
            {/* Search Input Box */}
            <div className="p-4 border-b border-[#1e293b] flex items-center gap-3 bg-slate-950">
              <Search className="w-5 h-5 text-blue-400 shrink-0" />
              <input
                type="text"
                autoFocus
                placeholder="Digite para buscar Contratos, Cofre de Senhas, Faturas..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full bg-transparent text-white text-sm focus:outline-none placeholder-gray-500"
              />
              <button
                onClick={() => setIsSearchOpen(false)}
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Results Content */}
            <div className="p-4 max-h-[70vh] overflow-y-auto space-y-4">
              {query.trim() ? (
                <>
                  {/* CONTRACTS RESULTS */}
                  {filteredContracts.length > 0 && (
                    <div className="space-y-2">
                      <h5 className="text-[11px] font-extrabold uppercase text-purple-400 tracking-wider flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5" /> Contratos ({filteredContracts.length})
                      </h5>
                      <div className="space-y-1">
                        {filteredContracts.map((c) => (
                          <div
                            key={c.id}
                            onClick={() => {
                              setIsSearchOpen(false);
                              router.push(`/contracts/${c.id}`);
                            }}
                            className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 hover:bg-blue-600/20 border border-[#1e293b] cursor-pointer group transition-colors"
                          >
                            <div className="space-y-0.5">
                              <p className="font-bold text-white text-sm group-hover:text-blue-300">
                                {c.title}
                              </p>
                              <p className="text-xs text-gray-400">
                                Contraparte: <span className="text-gray-200">{c.counterpart}</span> | Tipo: {c.type}
                              </p>
                            </div>
                            <ArrowUpRight className="w-4 h-4 text-gray-400 group-hover:text-blue-400 shrink-0" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* VAULT / CREDENTIALS RESULTS */}
                  {filteredCredentials.length > 0 && (
                    <div className="space-y-2">
                      <h5 className="text-[11px] font-extrabold uppercase text-blue-400 tracking-wider flex items-center gap-1.5">
                        <Key className="w-3.5 h-3.5" /> Cofre de Senhas ({filteredCredentials.length})
                      </h5>
                      <div className="space-y-1">
                        {filteredCredentials.map((cred) => (
                          <div
                            key={cred.id}
                            onClick={() => {
                              setIsSearchOpen(false);
                              if (cred.contractId) {
                                router.push(`/contracts/${cred.contractId}`);
                              } else {
                                router.push('/');
                              }
                            }}
                            className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 hover:bg-blue-600/20 border border-[#1e293b] cursor-pointer group transition-colors"
                          >
                            <div className="space-y-0.5">
                              <p className="font-bold text-white text-sm group-hover:text-blue-300 flex items-center gap-2">
                                <Lock className="w-3.5 h-3.5 text-blue-400" /> {cred.title}
                              </p>
                              <p className="text-xs text-gray-400 font-mono">
                                Usuário: {cred.username || 'N/A'} ({cred.contractTitle})
                              </p>
                            </div>
                            <span className="text-[10px] text-blue-400 font-bold bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                              Acessar
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* INVOICES RESULTS */}
                  {filteredInvoices.length > 0 && (
                    <div className="space-y-2">
                      <h5 className="text-[11px] font-extrabold uppercase text-emerald-400 tracking-wider flex items-center gap-1.5">
                        <CreditCard className="w-3.5 h-3.5" /> Faturas ({filteredInvoices.length})
                      </h5>
                      <div className="space-y-1">
                        {filteredInvoices.map((inv) => (
                          <div
                            key={inv.id}
                            onClick={() => {
                              setIsSearchOpen(false);
                              router.push('/billing');
                            }}
                            className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 hover:bg-emerald-600/20 border border-[#1e293b] cursor-pointer group transition-colors"
                          >
                            <div>
                              <p className="font-bold text-white text-sm">{inv.invoice_number}</p>
                              <p className="text-xs text-gray-400">Valor: R$ {inv.amount} | Status: {inv.status}</p>
                            </div>
                            <ArrowUpRight className="w-4 h-4 text-gray-400 group-hover:text-emerald-400" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {filteredContracts.length === 0 && filteredCredentials.length === 0 && filteredInvoices.length === 0 && (
                    <div className="py-12 text-center text-gray-500">
                      <p className="font-semibold text-gray-400">Nenhum resultado encontrado para "{query}"</p>
                      <p className="text-xs text-gray-500 mt-1">Tente pesquisar por título do contrato, nome do fornecedor ou usuário do cofre.</p>
                    </div>
                  )}
                </>
              ) : (
                <div className="py-8 text-center text-gray-500 space-y-2">
                  <Search className="w-8 h-8 text-gray-600 mx-auto" />
                  <p className="text-xs font-semibold text-gray-400">Busca Global do Sistema</p>
                  <p className="text-[11px] text-gray-500">Digite para buscar contratos, credenciais do cofre ou faturas em tempo real.</p>
                </div>
              )}
            </div>

            <div className="p-3 border-t border-[#1e293b] bg-slate-950/80 flex items-center justify-between text-[11px] text-gray-500 px-5">
              <span>Use <kbd className="px-1 bg-slate-800 border border-slate-700 rounded text-gray-300">↑</kbd> <kbd className="px-1 bg-slate-800 border border-slate-700 rounded text-gray-300">↓</kbd> para navegar</span>
              <span>Pressione <kbd className="px-1 bg-slate-800 border border-slate-700 rounded text-gray-300">Esc</kbd> para fechar</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
