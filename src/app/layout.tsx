import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import Link from 'next/link';
import GlobalHeader from '@/components/GlobalHeader';
import SidebarNav from '@/components/SidebarNav';
import { ToastProvider } from '@/components/ui/ToastProvider';
import { ConfirmProvider } from '@/components/ui/ConfirmProvider';
import { 
  LayoutDashboard, 
  FileText, 
  ShieldAlert, 
  CreditCard, 
  ClipboardList 
} from 'lucide-react';
import { getAuthenticatedUser } from '@/lib/auth';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'CLMS - Contract Lifecycle & Governance Management System',
  description: 'IT contract management, governance, risk prevention, and invoice reconciliation dashboard.',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getAuthenticatedUser();
  const pathname = (await headers()).get('x-themuno-pathname') || '/';
  if (!user && pathname !== '/login') redirect('/login');

  return (
    <html lang="pt-BR" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}>
      <body className="h-screen w-screen flex overflow-hidden bg-[#070b13] text-[#f1f5f9] font-sans antialiased">
        {!user ? children : (
        <ToastProvider>
        <ConfirmProvider>
        {/* SIDEBAR NAVIGATION */}
        <SidebarNav userName={user.name} userRole={user.role} />

        {/* MAIN CONTENT AREA */}
        <main className="flex-1 flex flex-col h-screen overflow-hidden">
          {/* HEADER */}
          <header className="h-16 border-b border-[#1e293b] bg-[#090f1e] flex items-center justify-between px-8 shrink-0">
            <GlobalHeader />
          </header>

          {/* PAGE CONTENT CONTAINER */}
          <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
            {children}
          </div>
        </main>
        </ConfirmProvider>
        </ToastProvider>
        )}
      </body>
    </html>
  );
}
