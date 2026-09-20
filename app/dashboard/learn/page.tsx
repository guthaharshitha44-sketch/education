'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/client';
import { useToast } from '@/components/ui/Toast';
import { Skeleton, Badge, EmptyState, ProgressBar } from '@/components/ui/Misc';
import { Sun, CheckCircle2, CircleDashed, SkipForward, CalendarClock, Clock, Activity } from 'lucide-react';

export default function LearnPage() {
  const { toast } = useToast();
  const [data, setData] = useState<any>(null);
  const [activity, setActivity] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [t, a] = await Promise.all([api('/api/tasks'), api('/api/activity')]);
      setData(t); setActivity(a);
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function act(taskId: string, action: string) {
    setBusy(taskId);
    try {
      const res = await api('/api/tasks', { method: 'POST', body: { taskId, action } });
      const r = res.result;
      if (r?.adapted && r.changes?.length && action === 'complete') {
        toast(`EduPath adapted your plan: ${r.changes[0]}`, 'success');
      } else if (action === 'complete') {
        toast('Task completed. Skill level updated.', 'success');
      } else {
        toast(r?.reason || r?.changes?.[0] || 'Rescheduled.', 'info');
      }
      load();
    } catch (e: any) { toast(e.message, 'error'); } finally { setBusy(null); }
  }

  if (loading) return <div className="space-y-4"><Skeleton className="h-9 w-64" /><Skeleton className="h-40" /><Skeleton className="h-64" /></div>;

  const today = data?.today || [];
  const done = today.filter((t: any) => t.status === 'done').length;
  const totalMin = today.reduce((a: number, b: any) => a + b.est_minutes, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2.5"><Sun size={24} className="text-amber-400" /> Today's Mission</h1>
        <p className="text-ink-500 text-sm mt-1">⏱ {totalMin} minutes planned · {done}/{today.length} completed</p>
      </div>

      <ProgressBar value={today.length ? (done / today.length) * 100 : 0} className="max-w-md" />

      {today.length === 0 ? (
        <EmptyState title="All clear for today 🎉" body="You've completed everything scheduled. Check the Roadmap for what's next, or generate new practice." />
      ) : (
        <div className="space-y-3">
          {today.map((t: any) => (
            <div key={t.id} className={`card p-5 transition ${t.status === 'done' ? 'opacity-60' : ''}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1.5">
                    <Badge tone={t.type === 'review' ? 'amber' : 'brand'}>{t.type}</Badge>
                    <span className="text-xs text-ink-400 flex items-center gap-1"><Clock size={11} /> {t.est_minutes} min</span>
                    <span className="chip !text-[11px] !py-0.5">{t.skill}</span>
                  </div>
                  <h3 className="font-semibold">{t.title}</h3>
                  <p className="text-sm text-ink-500 mt-1">{t.description}</p>
                  <p className="text-xs text-brand-700 mt-2 bg-brand-50 border border-brand-100 rounded-lg px-2.5 py-1.5 inline-block">Why: {t.why}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  {t.status !== 'done' && (
                    <>
                      <button className="btn-primary text-sm" disabled={busy === t.id} onClick={() => act(t.id, 'complete')}>
                        <CheckCircle2 size={15} /> Complete
                      </button>
                      <button className="btn-secondary text-sm" disabled={busy === t.id} onClick={() => act(t.id, 'skip')}>
                        <SkipForward size={15} /> Skip
                      </button>
                      <button className="btn-ghost text-sm" disabled={busy === t.id} onClick={() => act(t.id, 'reschedule')} aria-label="Reschedule to tomorrow">
                        <CalendarClock size={16} />
                      </button>
                    </>
                  )}
                  {t.status === 'done' && <Badge tone="emerald"><CheckCircle2 size={12} /> Done</Badge>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Struggle areas */}
      {(activity?.struggles || []).length > 0 && (
        <section className="card p-6 border-amber-100">
          <h2 className="font-display font-semibold mb-1 flex items-center gap-2"><CircleDashed size={17} className="text-amber-500" /> Your Struggle Areas</h2>
          <p className="text-sm text-ink-500 mb-4">Detected from your real results. Ask the AI Coach “why am I struggling with X?” for a personalized answer.</p>
          <div className="space-y-3">
            {activity.struggles.map((s: any) => (
              <div key={s.skill} className="rounded-xl border border-amber-100 bg-amber-50/50 p-4">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm">{s.skill}</span>
                  <Badge tone="amber">severity {s.severity}/3</Badge>
                </div>
                <div className="text-xs text-ink-500 mt-1.5">Detected from: {s.evidence.join(' · ')}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Activity timeline */}
      <section className="card p-6">
        <h2 className="font-display font-semibold mb-4 flex items-center gap-2"><Activity size={17} className="text-brand-600" /> Activity Timeline</h2>
        {(activity?.activity || []).length === 0 ? <p className="text-sm text-ink-400">No activity yet.</p> : (
          <div className="space-y-0">
            {activity.activity.slice(0, 15).map((a: any, i: number) => (
              <div key={i} className="relative pl-7 pb-5 last:pb-0">
                {i < Math.min(14, activity.activity.length - 1) && <div className="absolute left-[8px] top-4 bottom-0 w-px bg-ink-200" />}
                <div className={`absolute left-0 top-1.5 w-[17px] h-[17px] rounded-full border-2 flex items-center justify-center
                  ${a.type === 'roadmap_adapted' ? 'border-brand-500 bg-brand-50' : a.type === 'struggle_detected' ? 'border-amber-500 bg-amber-50' : 'border-ink-200 bg-white'}`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${a.type === 'roadmap_adapted' ? 'bg-brand-600' : a.type === 'struggle_detected' ? 'bg-amber-500' : 'bg-ink-300'}`} />
                </div>
                <div className="text-sm">{a.message}</div>
                <div className="text-[11px] text-ink-400 mt-0.5">{new Date(a.at + 'Z').toLocaleString()}</div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
