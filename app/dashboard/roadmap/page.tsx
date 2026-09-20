'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/client';
import { useToast } from '@/components/ui/Toast';
import { Skeleton, Badge, Modal, EmptyState } from '@/components/ui/Misc';
import { Map, RefreshCcw, History, Sparkles, CheckCircle2, Circle, Clock } from 'lucide-react';

const TYPE_TONE: Record<string, 'brand' | 'emerald' | 'amber' | 'slate'> = {
  learn: 'brand', practice: 'emerald', quiz: 'amber', project: 'slate', review: 'amber',
};

export default function RoadmapPage() {
  const { toast } = useToast();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  const load = useCallback(async () => {
    try { setData(await api('/api/roadmap')); } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function regenerate() {
    setRegenerating(true);
    try {
      await api('/api/roadmap', { method: 'POST', body: { reason: 'Regenerated from your current skill profile' } });
      toast('Roadmap regenerated from your latest skill data.', 'success');
      load();
    } catch (e: any) { toast(e.message, 'error'); } finally { setRegenerating(false); }
  }

  if (loading) return <div className="space-y-4"><Skeleton className="h-9 w-64" /><Skeleton className="h-64" /></div>;

  const plan = data?.plan;
  const TaskCard = ({ t }: { t: any }) => (
    <div className="card p-4 hover:shadow-lift transition">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge tone={TYPE_TONE[t.type] || 'slate'}>{t.type}</Badge>
            <span className="text-xs text-ink-400 flex items-center gap-1"><Clock size={11} /> {t.est_minutes} min</span>
            <span className="text-xs text-ink-400">{t.difficulty}</span>
          </div>
          <h3 className="font-semibold text-sm mt-2">{t.title}</h3>
          <p className="text-sm text-ink-500 mt-1 leading-relaxed">{t.description}</p>
          <p className="text-xs text-brand-700 mt-2 bg-brand-50 border border-brand-100 rounded-lg px-2.5 py-1.5 inline-block">
            Why: {t.why}
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold tracking-tight">Learning Roadmap</h1>
          {plan && <p className="text-ink-500 text-sm mt-1">v{plan.version} · {plan.generated_reason}</p>}
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary text-sm" onClick={() => setHistoryOpen(true)}><History size={15} /> History</button>
          <button className="btn-primary text-sm" onClick={regenerate} disabled={regenerating}>
            <RefreshCcw size={15} className={regenerating ? 'animate-spin' : ''} /> Regenerate
          </button>
        </div>
      </div>

      {!plan ? (
        <EmptyState title="No roadmap yet" body="Generate your first personalized plan from your skill gaps." />
      ) : (
        <>
          <div className="grid sm:grid-cols-4 gap-4">
            <Stat label="Daily pace" value={`${plan.daily_minutes} min`} />
            <Stat label="Weekly" value={`${plan.weekly_hours}h`} />
            <Stat label="30-day tasks" value={String(plan.next_30_days.length)} />
            <Stat label="Style" value={plan.style} />
          </div>

          <TaskSection title="Today" icon="☀️" tasks={plan.today} renderTask={(t) => <TaskCard t={t} />} />
          <TaskSection title="This Week" icon="📅" tasks={plan.this_week.filter((t: any) => t.day_offset < 7)} renderTask={(t) => <TaskCard t={t} />} />
          <TaskSection title="Next 30 Days" icon="🗓️" tasks={plan.next_30_days.filter((t: any) => t.day_offset >= 7)} renderTask={(t) => <TaskCard t={t} />} />
          <section className="card p-6">
            <h2 className="font-display font-semibold mb-4">Long-Term Path</h2>
            <div className="space-y-0">
              {plan.long_term.map((p: any, i: number) => (
                <div key={p.phase} className="relative pl-8 pb-6 last:pb-0">
                  {i < plan.long_term.length - 1 && <div className="absolute left-[9px] top-5 bottom-0 w-px bg-ink-200" />}
                  <div className="absolute left-0 top-1 w-[19px] h-[19px] rounded-full bg-brand-100 border-2 border-brand-500 flex items-center justify-center">
                    <CheckCircle2 size={11} className="text-brand-600" />
                  </div>
                  <div className="font-semibold text-sm">{p.phase}</div>
                  <div className="text-sm text-ink-500">{p.skills.join(' · ')}</div>
                  <div className="text-xs text-ink-400 mt-0.5">{p.goal}</div>
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      <Modal open={historyOpen} onClose={() => setHistoryOpen(false)} title="Roadmap version history" wide>
        <div className="space-y-3">
          {(data?.history || []).map((h: any) => (
            <div key={h.id} className={`p-4 rounded-xl border ${h.active ? 'border-brand-300 bg-brand-50/50' : 'border-ink-100'}`}>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm">v{h.version} {h.active && <Badge tone="brand">active</Badge>}</span>
                <span className="text-xs text-ink-400">{new Date(h.created_at + 'Z').toLocaleString()}</span>
              </div>
              <p className="text-sm text-ink-600 mt-1.5">{h.reason}</p>
            </div>
          ))}
          {(data?.history || []).length === 0 && <p className="text-sm text-ink-400">No versions yet.</p>}
        </div>
      </Modal>
    </div>
  );
}

function TaskSection({ title, icon, tasks, renderTask }: { title: string; icon: string; tasks: any[]; renderTask: (t: any) => React.ReactNode }) {
  return (
    <section>
      <h2 className="font-display font-semibold mb-3 flex items-center gap-2">{icon} {title}</h2>
      {tasks.length === 0 ? <p className="text-sm text-ink-400 card p-5">Nothing scheduled.</p> : (
        <div className="grid md:grid-cols-2 gap-4">
          {tasks.map((t: any, i: number) => <div key={i}>{renderTask(t)}</div>)}
        </div>
      )}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-4">
      <div className="text-xs font-semibold text-ink-400 uppercase tracking-wide">{label}</div>
      <div className="font-display font-bold text-lg mt-1">{value}</div>
    </div>
  );
}
