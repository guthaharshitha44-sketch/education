'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  Compass, LayoutDashboard, BrainCircuit, Map, BookOpen, Target, LineChart,
  Dna, Wand2, MessageSquareText, FileBarChart, Settings, LogOut, Menu, X,
} from 'lucide-react';

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/skills', label: 'Skill Map', icon: BrainCircuit },
  { href: '/dashboard/roadmap', label: 'Roadmap', icon: Map },
  { href: '/dashboard/learn', label: 'Learn', icon: BookOpen },
  { href: '/dashboard/practice', label: 'Practice', icon: Target },
  { href: '/dashboard/progress', label: 'Progress', icon: LineChart },
  { href: '/dashboard/twin', label: 'Skill Twin', icon: Dna },
  { href: '/dashboard/whatif', label: 'What-If', icon: Wand2 },
  { href: '/dashboard/coach', label: 'AI Coach', icon: MessageSquareText },
  { href: '/dashboard/reports', label: 'Reports', icon: FileBarChart },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    fetch('/api/profile').then(r => r.json()).then(d => {
      if (d.ok) {
        setName(d.bundle?.user?.name || '');
        if (!d.bundle?.user?.onboarded) router.replace('/onboarding');
        else setReady(true);
      } else {
        router.replace('/login');
      }
    }).catch(() => router.replace('/login'));
  }, [router]);

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
  }

  return (
    <div className="min-h-screen lg:flex">
      {/* Mobile top bar */}
      <div className="lg:hidden sticky top-0 z-40 bg-white/80 backdrop-blur border-b border-ink-100 h-14 flex items-center justify-between px-4">
        <Link href="/dashboard" className="flex items-center gap-2 font-display font-bold">
          <span className="w-8 h-8 rounded-lg bg-brand-600 text-white flex items-center justify-center"><Compass size={16} /></span> EduPath
        </Link>
        <button onClick={() => setOpen(o => !o)} aria-label="Menu" className="p-2 rounded-lg hover:bg-ink-100">
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Sidebar */}
      <aside className={`z-40 ${open ? 'fixed inset-0' : 'hidden'} lg:flex lg:flex-col lg:w-60 lg:shrink-0 lg:sticky lg:top-0 lg:h-screen lg:bg-white/70 lg:backdrop-blur lg:border-r lg:border-ink-100`}>
        {open && <div className="absolute inset-0 bg-ink-950/30" onClick={() => setOpen(false)} />}
        <div className={`relative bg-white lg:bg-transparent w-72 max-w-[80vw] h-full lg:h-auto lg:w-auto p-4 flex flex-col ${open ? '' : 'lg:p-0'}`}>
          <Link href="/dashboard" className="hidden lg:flex items-center gap-2.5 font-display font-bold px-2 py-4">
            <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white flex items-center justify-center shadow-glow"><Compass size={18} /></span>
            EduPath
          </Link>
          <nav className="flex-1 space-y-1 overflow-y-auto">
            {NAV.map(n => {
              const p = pathname || '';
              const active = p === n.href || (n.href !== '/dashboard' && p.startsWith(n.href));
              return (
                <Link key={n.href} href={n.href} onClick={() => setOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition
                    ${active ? 'bg-brand-600 text-white shadow-glow' : 'text-ink-600 hover:bg-ink-100 hover:text-ink-900'}`}>
                  <n.icon size={17} /> {n.label}
                </Link>
              );
            })}
          </nav>
          <div className="pt-3 mt-3 border-t border-ink-100">
            <div className="px-3 py-2 text-sm">
              <div className="font-semibold truncate">{name || 'Learner'}</div>
              <button onClick={logout} className="text-xs text-ink-400 hover:text-rose-500 flex items-center gap-1 mt-0.5">
                <LogOut size={12} /> Sign out
              </button>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 min-w-0 px-4 sm:px-8 py-6 lg:py-8 max-w-[1200px]">{ready ? children : (
        <div className="space-y-4">
          <div className="skeleton h-8 w-64" />
          <div className="grid sm:grid-cols-3 gap-4"><div className="skeleton h-24" /><div className="skeleton h-24" /><div className="skeleton h-24" /></div>
          <div className="skeleton h-64" />
        </div>
      )}</main>
    </div>
  );
}
