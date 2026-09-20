import Link from 'next/link';
import { Compass } from 'lucide-react';

export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-brand-700 via-brand-800 to-ink-950 text-white flex-col justify-between p-12 relative overflow-hidden">
        <Link href="/" className="flex items-center gap-2.5 font-display font-bold text-lg">
          <span className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center"><Compass size={19} /></span> EduPath
        </Link>
        <div className="max-w-md">
          <h2 className="font-display text-3xl font-bold leading-snug">Know where you are. Know where to go. Let AI build the path.</h2>
          <p className="mt-4 text-brand-100/80 text-sm leading-relaxed">Join learners using EduPath to turn skill gaps into daily, adaptive learning missions.</p>
        </div>
        <div className="text-xs text-brand-100/50">© 2026 EduPath · Learning readiness ≠ hiring prediction</div>
      </div>
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <Link href="/" className="lg:hidden flex items-center gap-2 font-display font-bold text-xl mb-8">
            <span className="w-8 h-8 rounded-lg bg-brand-600 text-white flex items-center justify-center"><Compass size={16} /></span> EduPath
          </Link>
          <h1 className="font-display text-2xl font-bold">{title}</h1>
          <p className="text-sm text-ink-500 mt-1.5 mb-7">{subtitle}</p>
          {children}
        </div>
      </div>
    </div>
  );
}
