'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/client';
import { useToast } from '@/components/ui/Toast';
import { ProgressBar, Badge, StateTag, Skeleton, EmptyState } from '@/components/ui/Misc';
import { Sparkles, ArrowRight, Flame, CheckCircle2, Circle, SkipForward, Clock, AlertCircle } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, RadarChart, PolarGrid,
  PolarAngleAxis, Radar, BarChart, Bar, CartesianGrid,
} from 'recharts';

export default function DashboardHome() {
  const { toast } = useToast();
  const [data, setData] = useState<any>(null);
  const [tasks, setTasks] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [p, t] = await Promise.all([api('/api/progress'), api('/api/tasks')]);
      setData(p.progress);
      setTasks(t);
    } catch {
      /* layout guards auth */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function act(taskId: string, action: string) {
    try {
      const res = await api('/api/tasks', { method: 'POST', body: { taskId, action } });
      const r = res.result;
      if (action === 'complete' && r?.adapted) {
        toast(`EduPath adapted your plan: ${r.changes?.[0] || 'plan updated'}`, 'success');
      } else if (action === 'complete') {
        toast('Task completed — progress updated.', 'success');
      } else {
        toast(r?.changes?.[0] || 'Task rescheduled.', 'info');
      }
      load();
    } catch (e: any) { toast(e.message, 'error'); }
  }

  if (loading) return (
    <div className="space-y-6">
      <Skeleton className="h-9 w-72" />
      <div className="grid sm:grid-cols-3 gap-4"><Skeleton className="h-28" /><Skeleton className="h-28" /><Skeleton className="h-28" /></div>
      <Skeleton className="h-72" />
    </div>
  );

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold tracking-tight">{greeting}{data?.learnerName ? `, ${data.learnerName}` : ''}</h1>
          <p className="text-ink-500 text-sm mt-1">Your target: <span className="font-semibold text-ink-700">{data?.targetRole || '—'}</span></p>
        </div>
        <Link href="/dashboard/learn" className="btn-secondary text-sm">Continue learning <ArrowRight size={15} /></Link>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi label="Learning Readiness" value={`${data?.readiness ?? 0}%`} sub="vs role requirements" tone="brand" />
        <Kpi label="Today's mission" value={`${tasks?.today?.length ?? 0} tasks`} sub={`~${(tasks?.today || []).reduce((a: number, b: any) => a + b.est_minutes, 0)} min`} />
        <Kpi label="Current streak" value={`${data?.streak ?? 0} days`} sub={data?.streak > 0 ? 'keep it going 🔥' : 'start today'} tone="amber" />
        <Kpi label="This week" value={`${data?.weeklyHours ?? 0}h`} sub={`${data?.tasksCompleted ?? 0} tasks done`} />
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        {/* Today's mission */}
        <div className="lg:col-span-2 space-y-5">
          <section className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-semibold">Today's Focus</h2>
              <Link href="/dashboard/learn" className="text-sm text-brand-600 hover:underline font-medium">Open Learn →</Link>
            </div>
            {(tasks?.today || []).length === 0 ? (
              <EmptyState title="No tasks yet" body="Generate your first roadmap to get daily missions." />
            ) : (
              <ul className="space-y-2.5">
                {tasks.today.map((t: any) => (
                  <li key={t.id} className="flex items-start gap-3 p-3.5 rounded-xl border border-ink-100 hover:border-brand-200 transition">
                    <Circle size={18} className="text-ink-300 mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">{t.title}</div>
                      <div className="text-xs text-ink-400 mt-0.5 flex items-center gap-2">
                        <Clock size={11} /> {t.est_minutes} min · {t.skill}
                      </div>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <button onClick={() => act(t.id, 'complete')} className="btn-primary !px-3 !py-1.5 text-xs">Done</button>
                      <button onClick={() => act(t.id, 'skip')} aria-label="Skip" className="btn-ghost !px-2"><SkipForward size={14} /></button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="card p-6">
            <h2 className="font-display font-semibold mb-4">Skill Growth</h2>
            {(data?.skillGrowth || []).length === 0 ? (
              <p className="text-sm text-ink-400">Complete onboarding and tasks to see growth.</p>
            ) : (
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.skillGrowth} margin={{ top: 4, right: 8, left: -22, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#eceef5" />
                    <XAxis dataKey="skill" tick={{ fontSize: 10 }} interval={0} angle={-18} textAnchor="end" height={54} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="before" fill="#c5d6fe" radius={[4, 4, 0, 0]} name="Before" />
                    <Bar dataKey="current" fill="#5b78f0" radius={[4, 4, 0, 0]} name="Current" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </section>
        </div>

        {/* Right column */}
        <div className="space-y-5">
          <section className="card p-6">
            <h2 className="font-display font-semibold mb-4 flex items-center gap-2"><AlertCircle size={17} className="text-amber-500" /> Your Biggest Gap</h2>
            {data?.biggestGap ? (
              <div>
                <div className="flex justify-between items-baseline">
                  <span className="font-semibold">{data.biggestGap.skill}</span>
                  <span className="text-sm text-ink-400">{data.biggestGap.current}% / {data.biggestGap.target}%</span>
                </div>
                <ProgressBar value={data.biggestGap.current} tone="amber" className="mt-2.5" />
                <Link href="/dashboard/skills" className="text-sm text-brand-600 hover:underline mt-3 inline-block font-medium">See full skill map →</Link>
              </div>
            ) : <p className="text-sm text-ink-400">Complete onboarding to see gaps.</p>}
          </section>

          <section className="card p-6">
            <h2 className="font-display font-semibold mb-3 flex items-center gap-2"><Sparkles size={17} className="text-brand-600" /> AI Recommendation</h2>
            <p className="text-sm text-ink-600 leading-relaxed">{data?.aiRecommendation || '—'}</p>
          </section>

          <section className="card p-6">
            <h2 className="font-display font-semibold mb-4">Recent Progress</h2>
            <div className="h-40">
              {(data?.assessmentTrend || []).length > 1 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.assessmentTrend}>
                    <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="score" stroke="#3943c8" strokeWidth={2.5} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-ink-400">Take a practice set to start your score trend.</p>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function Kpi({ label, value, sub, tone = 'slate' }: { label: string; value: string; sub?: string; tone?: string }) {
  return (
    <div className="card p-5">
      <div className="text-xs font-semibold text-ink-400 uppercase tracking-wide">{label}</div>
      <div className={`font-display text-2xl font-bold mt-1.5 ${tone === 'brand' ? 'text-brand-700' : tone === 'amber' ? 'text-amber-500' : 'text-ink-900'}`}>{value}</div>
      {sub && <div className="text-xs text-ink-400 mt-1">{sub}</div>}
    </div>
  );
}
