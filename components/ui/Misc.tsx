'use client';

import { ReactNode, useEffect } from 'react';
import { X, Inbox, AlertTriangle } from 'lucide-react';

export function Skeleton({ className = 'h-4 w-full' }: { className?: string }) {
  return <div className={`skeleton ${className}`} aria-hidden />;
}

export function EmptyState({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div className="card p-10 text-center">
      <div className="mx-auto w-12 h-12 rounded-2xl bg-brand-50 flex items-center justify-center text-brand-600 mb-4">
        <Inbox size={22} />
      </div>
      <h3 className="font-display font-semibold text-ink-900">{title}</h3>
      <p className="text-sm text-ink-500 mt-1 max-w-sm mx-auto">{body}</p>
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}

export function ErrorState({ title = 'Something went wrong', body, onRetry }: { title?: string; body: string; onRetry?: () => void }) {
  return (
    <div className="card p-10 text-center border-rose-100">
      <div className="mx-auto w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-500 mb-4">
        <AlertTriangle size={22} />
      </div>
      <h3 className="font-display font-semibold text-ink-900">{title}</h3>
      <p className="text-sm text-ink-500 mt-1 max-w-sm mx-auto">{body}</p>
      {onRetry && <button className="btn-secondary mt-5" onClick={onRetry}>Try again</button>}
    </div>
  );
}

export function ProgressBar({ value, tone = 'brand', className = '' }: { value: number; tone?: 'brand' | 'emerald' | 'amber' | 'rose'; className?: string }) {
  const tones: Record<string, string> = {
    brand: 'bg-brand-500', emerald: 'bg-emerald-500', amber: 'bg-amber-500', rose: 'bg-rose-500',
  };
  return (
    <div className={`h-2.5 rounded-full bg-ink-100 overflow-hidden ${className}`} role="progressbar" aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={100}>
      <div className={`h-full rounded-full ${tones[tone]} transition-all duration-700`} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}

export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center p-0 sm:p-6" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-ink-950/40 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative w-full ${wide ? 'sm:max-w-3xl' : 'sm:max-w-lg'} bg-white rounded-t-2xl sm:rounded-2xl shadow-lift max-h-[92vh] overflow-y-auto animate-fade-up`}>
        <div className="sticky top-0 bg-white/90 backdrop-blur border-b border-ink-100 px-5 py-4 flex items-center justify-between rounded-t-2xl">
          <h3 className="font-display font-semibold">{title}</h3>
          <button onClick={onClose} aria-label="Close" className="p-1.5 rounded-lg hover:bg-ink-100 text-ink-500"><X size={18} /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function Badge({ tone = 'brand', children }: { tone?: 'brand' | 'emerald' | 'amber' | 'rose' | 'slate'; children: ReactNode }) {
  const tones: Record<string, string> = {
    brand: 'bg-brand-50 text-brand-700 border-brand-100',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    amber: 'bg-amber-50 text-amber-700 border-amber-100',
    rose: 'bg-rose-50 text-rose-600 border-rose-100',
    slate: 'bg-ink-100 text-ink-600 border-ink-200',
  };
  return <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${tones[tone]}`}>{children}</span>;
}

export function StateTag({ state }: { state: string }) {
  const map: Record<string, { tone: 'brand' | 'emerald' | 'amber' | 'rose' | 'slate'; label: string }> = {
    strong: { tone: 'emerald', label: 'Strong' },
    developing: { tone: 'brand', label: 'Developing' },
    'needs-work': { tone: 'amber', label: 'Needs Work' },
    missing: { tone: 'rose', label: 'Missing' },
  };
  const v = map[state] || { tone: 'slate' as const, label: state };
  return <Badge tone={v.tone}>{v.label}</Badge>;
}
