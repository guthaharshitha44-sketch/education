'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/client';
import { Skeleton, ProgressBar } from '@/components/ui/Misc';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area, CartesianGrid, Legend, RadialBarChart, RadialBar, PolarAngleAxis, BarChart, Bar } from 'recharts';
import { Flame, TrendingUp } from 'lucide-react';

export default function ProgressPage() {
  const [p, setP] = useState<any>(null);

  useEffect(() => { api('/api/progress').then(d => setP(d.progress)).catch(() => {}); }, []);

  if (!p) return <div className="space-y-4"><Skeleton className="h-9 w-64" /><Skeleton className="h-40" /><Skeleton className="h-64" /></div>;

  const skillsByState = [
    { name: 'Acquired', value: p.skills.acquired, fill: '#10b981' },
    { name: 'In Progress', value: p.skills.inProgress, fill: '#5b78f0' },
    { name: 'Needs Work', value: p.skills.needsWork, fill: '#f59e0b' },
    { name: 'Missing', value: p.skills.missing, fill: '#f43f5e' },
  ].filter(x => x.value > 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl md:text-3xl font-bold tracking-tight">Progress</h1>
        <p className="text-ink-500 text-sm mt-1">Honest metrics from your actual learning activity — no vanity numbers.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi label="Learning Readiness" value={`${p.readiness}%`} tone="brand" />
        <Kpi label="Streak" value={`${p.streak} days`} tone="amber" />
        <Kpi label="This week" value={`${p.weeklyHours}h`} />
        <Kpi label="Tasks remaining" value={String(p.tasksRemaining)} />
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <section className="card p-6">
          <h2 className="font-display font-semibold mb-4 flex items-center gap-2"><TrendingUp size={17} className="text-brand-600" /> Assessment Performance</h2>
          {p.assessmentTrend.length > 1 ? (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={p.assessmentTrend}>
                  <defs><linearGradient id="ag" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#5b78f0" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#5b78f0" stopOpacity={0.02} />
                  </linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eceef5" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Area type="monotone" dataKey="score" stroke="#3943c8" strokeWidth={2.5} fill="url(#ag)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : <p className="text-sm text-ink-400">Take at least two assessments to see your trend.</p>}
        </section>

        <section className="card p-6">
          <h2 className="font-display font-semibold mb-4 flex items-center gap-2"><Flame size={17} className="text-amber-500" /> Skill Growth (before vs current)</h2>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={p.skillGrowth}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eceef5" />
                <XAxis dataKey="skill" tick={{ fontSize: 9 }} interval={0} angle={-15} textAnchor="end" height={60} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="before" name="Before" fill="#c5d6fe" radius={[4, 4, 0, 0]} />
                <Bar dataKey="current" name="Current" fill="#5b78f0" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        <section className="card p-6">
          <h2 className="font-display font-semibold mb-2">Skills by state</h2>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart innerRadius="30%" outerRadius="100%" data={skillsByState} startAngle={90} endAngle={-270}>
                <PolarAngleAxis type="number" domain={[0, Math.max(...skillsByState.map(s => s.value), 1)]} tick={false} />
                <RadialBar background dataKey="value" cornerRadius={6} />
                <Tooltip />
              </RadialBarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap justify-center gap-2 mt-2">
            {skillsByState.map(s => <span key={s.name} className="chip !text-[11px]"><span className="w-2 h-2 rounded-full" style={{ background: s.fill }} /> {s.name}: {s.value}</span>)}
          </div>
        </section>

        <section className="card p-6 lg:col-span-2">
          <h2 className="font-display font-semibold mb-4">Roadmap Milestones</h2>
          <div className="grid sm:grid-cols-2 gap-2.5">
            {p.milestones.map((m: any) => (
              <div key={m.label} className={`flex items-center gap-2.5 p-3 rounded-xl border text-sm ${m.done ? 'border-emerald-100 bg-emerald-50/50 text-emerald-800' : 'border-ink-100 text-ink-400'}`}>
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${m.done ? 'bg-emerald-500 text-white' : 'bg-ink-100'}`}>{m.done ? '✓' : ''}</span>
                {m.label}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function Kpi({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="card p-5">
      <div className="text-xs font-semibold text-ink-400 uppercase tracking-wide">{label}</div>
      <div className={`font-display text-2xl font-bold mt-1.5 ${tone === 'brand' ? 'text-brand-700' : tone === 'amber' ? 'text-amber-500' : ''}`}>{value}</div>
    </div>
  );
}
