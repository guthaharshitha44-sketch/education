'use client';

import { createContext, useCallback, useContext, useState, ReactNode } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

type ToastKind = 'success' | 'error' | 'info';
interface Toast { id: number; kind: ToastKind; text: string }

const ToastCtx = createContext<{ toast: (text: string, kind?: ToastKind) => void }>({ toast: () => {} });

export function useToast() {
  return useContext(ToastCtx);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((text: string, kind: ToastKind = 'info') => {
    const id = Date.now() + Math.random();
    setToasts(t => [...t, { id, kind, text }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4200);
  }, []);

  return (
    <ToastCtx.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-[92vw] sm:max-w-sm" role="status" aria-live="polite">
        {toasts.map(t => (
          <div key={t.id} className={`animate-fade-up flex items-start gap-2.5 rounded-xl px-4 py-3 shadow-lift text-sm font-medium text-white
            ${t.kind === 'success' ? 'bg-emerald-600' : t.kind === 'error' ? 'bg-rose-600' : 'bg-ink-800'}`}>
            {t.kind === 'success' ? <CheckCircle2 size={18} className="shrink-0 mt-0.5" /> :
             t.kind === 'error' ? <AlertCircle size={18} className="shrink-0 mt-0.5" /> :
             <Info size={18} className="shrink-0 mt-0.5" />}
            <span className="flex-1">{t.text}</span>
            <button aria-label="Dismiss" onClick={() => setToasts(ts => ts.filter(x => x.id !== t.id))}>
              <X size={15} className="opacity-70 hover:opacity-100" />
            </button>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
