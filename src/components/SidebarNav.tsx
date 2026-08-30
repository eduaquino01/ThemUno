'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  FileText, 
  ShieldAlert, 
  CreditCard, 
  ClipboardList,
  UserCheck,
  Sparkles,
  Landmark,
  ChevronLeft,
  ChevronRight,
  Settings
} from 'lucide-react';

interface SidebarNavProps {
  userName: string;
  userRole: string;
}

export default function SidebarNav({ userName, userRole }: SidebarNavProps) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('themuno_sidebar_collapsed');
    if (saved === 'true') {
      const frame = requestAnimationFrame(() => setIsCollapsed(true));
      return () => cancelAnimationFrame(frame);
    }
  }, []);

  const toggleCollapse = () => {
    const nextState = !isCollapsed;
    setIsCollapsed(nextState);
    localStorage.setItem('themuno_sidebar_collapsed', String(nextState));
  };

  const navItems = [
    {
      href: '/',
      label: 'Dashboard',
      icon: LayoutDashboard,
      badgeBg: 'bg-blue-500/20 text-blue-300',
    },
    {
      href: '/contracts',
      label: 'Contratos',
      icon: FileText,
      badgeBg: 'bg-purple-500/20 text-purple-300',
    },
    {
      href: '/governance',
      label: 'Governança PM',
      icon: ShieldAlert,
      badgeBg: 'bg-amber-500/20 text-amber-300',
    },
    {
      href: '/billing',
      label: 'Faturamento',
      icon: CreditCard,
      badgeBg: 'bg-emerald-500/20 text-emerald-300',
    },
    {
      href: '/finance',
      label: 'Financeiro',
      icon: Landmark,
      badgeBg: 'bg-cyan-500/20 text-cyan-300',
    },
    {
      href: '/reports',
      label: 'Relatórios Mensais',
      icon: ClipboardList,
      badgeBg: 'bg-rose-500/20 text-rose-300',
    },
    {
      href: '/admin',
      label: 'Administração',
      icon: Settings,
      badgeBg: 'bg-slate-500/20 text-slate-300',
    },
  ].filter((item) => item.href !== '/admin' || userRole === 'ADMIN');

  return (
    <aside className={`border-r border-[#1e293b] bg-[#090f1e] flex flex-col shrink-0 transition-all duration-300 ease-in-out relative ${
      isCollapsed ? 'w-20' : 'w-64'
    }`}>
      {/* TOGGLE COLLAPSE BUTTON */}
      <button
        onClick={toggleCollapse}
        className="absolute -right-3.5 top-7 z-30 p-1.5 rounded-full bg-slate-900 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 shadow-xl transition-all hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#090f1e]"
        title={isCollapsed ? 'Expandir Menu' : 'Encolher Menu'}
      >
        {isCollapsed ? <ChevronRight className="w-3.5 h-3.5 text-blue-400" /> : <ChevronLeft className="w-3.5 h-3.5 text-blue-400" />}
      </button>

      {/* LOGO BRAND BANNER */}
      <div className={`py-5 border-b border-[#1e293b] bg-gradient-to-b from-slate-900 via-[#0d1527] to-[#070b13] relative overflow-hidden group transition-all ${
        isCollapsed ? 'px-2 flex justify-center' : 'px-4'
      }`}>
        <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl -mr-6 -mt-6 group-hover:bg-blue-500/20 transition-all duration-500" />
        <div className={`flex items-center gap-3.5 relative z-10 ${isCollapsed ? 'justify-center' : ''}`}>
          <div className="relative shrink-0">
            <Image
              src="/themuno_logo.png"
              alt="ThemUno Logo"
              width={56}
              height={56}
              className={`object-contain rounded-2xl ring-2 ring-blue-500/60 shadow-2xl shadow-blue-500/40 group-hover:scale-105 transition-all duration-300 bg-slate-950 p-1 ${
                isCollapsed ? 'w-11 h-11' : 'w-14 h-14'
              }`}
            />
            <span className="absolute -bottom-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-slate-900 animate-pulse shadow-md" />
          </div>

          {!isCollapsed && (
            <div className="overflow-hidden transition-all">
              <h1 className="font-black text-lg leading-none tracking-wider bg-gradient-to-r from-white via-slate-100 to-blue-400 bg-clip-text text-transparent flex items-center gap-1.5">
                THEMUNO <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
              </h1>
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-blue-400 mt-1">
                CLMS ENTERPRISE
              </p>
              <span className="text-[10px] text-slate-400 font-medium block">
                Governance & Vault v2.0
              </span>
            </div>
          )}
        </div>
      </div>

      {/* MATERIAL 3 PILL NAV LINKS (COLLAPSIBLE) */}
      <nav className={`flex-1 py-6 space-y-2 ${isCollapsed ? 'px-2' : 'px-3'}`}>
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              title={isCollapsed ? item.label : undefined}
              className={`flex items-center gap-3 py-2 rounded-full text-xs transition-all duration-200 group relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#090f1e] ${
                isCollapsed ? 'px-1.5 justify-center' : 'px-3'
              } ${
                isActive
                  ? 'bg-[#003355] text-[#a3c9ee] font-bold border border-blue-400/40 shadow-lg shadow-blue-950/50'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/50 font-medium'
              }`}
            >
              {/* CIRCULAR ICON BADGE */}
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${item.badgeBg}`}>
                <Icon className="w-5 h-5" />
              </div>
              
              {!isCollapsed && (
                <span className="truncate text-xs tracking-wide">{item.label}</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* USER PROFILE FOOTER */}
      <div className={`p-4 border-t border-[#1e293b] bg-slate-950/60 flex items-center ${
        isCollapsed ? 'justify-center px-2' : 'gap-3'
      }`}>
        <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-500 to-emerald-500 flex items-center justify-center text-white font-bold text-xs ring-2 ring-slate-800 shrink-0">
          <UserCheck className="w-5 h-5 text-white" />
        </div>
        {!isCollapsed && (
          <div className="space-y-0.5 overflow-hidden">
            <div className="font-bold text-xs text-white truncate">{userName}</div>
            <div className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> {userRole}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
