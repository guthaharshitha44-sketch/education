'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/client';
import { useToast } from '@/components/ui/Toast';
import { Skeleton, Badge, EmptyState } from '@/components/ui/Misc';
import { FileBarChart, Download, Share2, Sparkles, History } from 'lucide-react';

export default function ReportsPage() {
  const { toast } = useToast();
  const [latest, setLatest] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const d = await api('/api/reports');
      setLatest(d.latest);
      setHistory(d.history || []);
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function generate() {
    setGenerating(true);
    try {
      const d = await api('/api/reports', { method: 'POST' });
      setLatest(d.report);
      load();
      toast('Weekly report generated.', 'success');
    } catch (e: any) { toast(e.message, 'error'); } finally { setGenerating(false); }
  }

  function share() {
    const text = `My EduPath weekly report — ${latest?.readiness ?? 0}% learning readiness, ${latest?.tasksCompleted ?? 0} tasks completed, ${latest?.learningHours ?? 0}h studied.`;
    if (navigator.share) {
      navigator.share({ title: 'EduPath Weekly Report', text }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text).then(() => toast('Summary copied to clipboard.', 'success'));
    }
  }

  if (loading) return <div className="space-y-4"><Skeleton className="h-9 w-64" /><Skeleton className="h-64" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2.5"><FileBarChart size={24} className="text-brand-600" /> Reports</h1>
          <p className="text-ink-500 text-sm mt-1">Weekly progress reports generated from your actual activity.</p>
        </div>
        <div className="flex gap-2">
          {latest && <>
            <a className="btn-secondary text-sm" href="/api/reports?view=download" target="_blank" rel="noreferrer"><Download size={15} /> Download / Print PDF</a>
            <button className="btn-secondary text-sm" onClick={share}><Share2 size={15} /> Share</button>
          </>}
          <button className="btn-primary text-sm" onClick={generate} disabled={generating}><Sparkles size={15} /> {generating ? 'Generating…' : 'Generate report'}</button>
        </div>
      </div>

      {!latest ? (
        <EmptyState title="No reports yet" body="Generate your first weekly report to see skills acquired, struggle areas, hours and roadmap changes." />
      ) : (
        <>
          <section className="card p-6">
            <h2 className="font-display font-semibold mb-1">Week of {latest.weekStart}</h2>
            <p className="text-xs text-ink-400 mb-5">Readiness is a learning-progress metric — it does not predict hiring outcomes.</p>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <Kpi v={`${latest.readiness}%`} l="Readiness" />
              <Kpi v={String(latest.tasksCompleted)} l="Tasks completed" />
              <Kpi v={`${latest.learningHours}h`} l="Learning hours" />
            </div>
            <div className="grid md:grid-cols-2 gap-5 text-sm">
              <ReportList title="Skills acquired" items={latest.skillsAcquired} empty="None reached 60% yet." />
              <ReportList title="Remaining gaps" items={latest.remainingGaps} empty="No tracked gaps!" />
              <div className="md:col-span-2">
                <div className="font-semibold text-ink-700 mb-1.5">Struggle areas</div>
                {latest.struggleAreas?.length ? (
                  <ul className="space-y-1.5 list-disc list-inside text-ink-600">
                    {latest.struggleAreas.map((s: any) => <li key={s.skill}><b>{s.skill}</b> — {s.evidence.join('; ')}</li>)}
                  </ul>
                ) : <p className="text-ink-400">None detected. 🎉</p>}
              </div>
              <div className="md:col-span-2">
                <div className="font-semibold text-ink-700 mb-1.5">Roadmap changes</div>
                {latest.roadmapChanges?.length ? (
                  <ul className="space-y-1.5 list-disc list-inside text-ink-600">
                    {latest.roadmapChanges.map((c: string) => <li key={c}>{c}</li>)}
                  </ul>
                ) : <p className="text-ink-400">No changes this week.</p>}
              </div>
              <div className="md:col-span-2">
                <div className="font-semibold text-ink-700 mb-1.5">Recommended next steps</div>
                <ul className="space-y-1.5 list-disc list-inside text-ink-600">
                  {latest.recommendedNextSteps.map((s: string) => <li key={s}>{s}</li>)}
                </ul>
              </div>
            </div>
          </section>

          <section className="card p-6">
            <h2 className="font-display font-semibold mb-3 flex items-center gap-2"><History size={16} /> Report history</h2>
            {history.length === 0 ? <p className="text-sm text-ink-400">No saved reports yet.</p> : (
              <div className="space-y-2">
                {history.map(h => (
                  <div key={h.id} className="flex items-center justify-between text-sm px-4 py-3 rounded-xl border border-ink-100">
                    <span>Week of {h.weekStart}</span>
                    <span className="text-xs text-ink-400">{new Date(h.createdAt + 'Z').toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function ReportList({ title, items, empty }: { title: string; items?: string[]; empty: string }) {
  return (
    <div>
      <div className="font-semibold text-ink-700 mb-1.5">{title}</div>
      {items?.length ? <ul className="list-disc list-inside text-ink-600">{items.map(i => <li key={i}>{i}</li>)}</ul> : <p className="text-ink-400">{empty}</p>}
    </div>
  );
}

function Kpi({ v, l }: { v: string; l: string }) {
  return (
    <div className="rounded-xl bg-brand-50 border border-brand-100 p-4 text-center">
      <div className="font-display text-2xl font-bold text-brand-700">{v}</div>
      <div className="text-xs text-ink-400 font-medium mt-0.5">{l}</div>
    </div>
  );
}
