'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/client';
import { Skeleton, Badge, ProgressBar, StateTag } from '@/components/ui/Misc';
import { Dna, Zap, Crosshair } from 'lucide-react';
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, Tooltip, Legend } from 'recharts';

export default function TwinPage() {
  const [twin, setTwin] = useState<any>(null);

  useEffect(() => { api('/api/twin').then(d => setTwin(d.twin)).catch(() => {}); }, []);

  if (!twin) return <div className="space-y-4"><Skeleton className="h-9 w-64" /><Skeleton className="h-72" /></div>;

  const radar = twin.skills.slice(0, 8).map((s: any) => ({ subject: s.name.length > 18 ? s.name.slice(0, 17) + '…' : s.name, current: s.level, target: s.target ?? undefined }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2.5"><Dna size={24} className="text-brand-600" /> Skill Twin</h1>
        <p className="text-ink-500 text-sm mt-1">A living digital representation of your skills — current levels, targets, velocity and focus.</p>
      </div>

      <div className="grid sm:grid-cols-4 gap-4">
        <Kpi label="Overall level" value={`${twin.overallLevel}%`} tone="brand" />
        <Kpi label="Readiness" value={`${twin.readiness}%`} />
        <Kpi label="Velocity" value={`${twin.velocityWeekly} pts/wk`} tone="amber" />
        <Kpi label="Current focus" value={twin.focus || '—'} small />
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <section className="card p-6">
          <h2 className="font-display font-semibold mb-4">Twin radar — current vs target</h2>
          {radar.length >= 3 ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radar} outerRadius="72%">
                  <PolarGrid stroke="#d5d9e6" />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10 }} />
                  <Radar name="Current" dataKey="current" stroke="#3943c8" fill="#5b78f0" fillOpacity={0.35} />
                  <Radar name="Target" dataKey="target" stroke="#14b8a6" fill="#14b8a6" fillOpacity={0.08} strokeDasharray="5 3" />
                  <Legend />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          ) : <p className="text-sm text-ink-400">Add a few skills to render your twin radar.</p>}
        </section>

        <section className="card p-6">
          <h2 className="font-display font-semibold mb-4">Skill inventory</h2>
          <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
            {twin.skills.map((s: any) => (
              <div key={s.name}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium">{s.name}</span>
                  <span className="text-xs text-ink-400">{s.level}{s.target ? `% → ${s.target}%` : ''}</span>
                </div>
                <ProgressBar value={s.level} tone={s.state === 'strong' ? 'emerald' : s.state === 'missing' ? 'rose' : 'brand'} />
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="card p-6">
        <h2 className="font-display font-semibold mb-3 flex items-center gap-2"><Zap size={17} className="text-amber-500" /> Twin insights</h2>
        <div className="grid sm:grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-4">
            <div className="font-semibold text-emerald-700 mb-1">Strong areas</div>
            {twin.strong.length ? twin.strong.join(', ') : 'None yet — building.'}
          </div>
          <div className="rounded-xl bg-amber-50 border border-amber-100 p-4">
            <div className="font-semibold text-amber-600 mb-1">Weak areas</div>
            {twin.weak.length ? twin.weak.slice(0, 6).join(', ') : 'None — keep growing.'}
          </div>
        </div>
        <p className="text-xs text-ink-400 mt-4">Twin generated {new Date(twin.generatedAt).toLocaleString()} · velocity estimated from logged learning minutes (≈6 points per focused hour).</p>
      </section>
    </div>
  );
}

function Kpi({ label, value, tone, small }: { label: string; value: string; tone?: string; small?: boolean }) {
  return (
    <div className="card p-5">
      <div className="text-xs font-semibold text-ink-400 uppercase tracking-wide">{label}</div>
      <div className={`font-display font-bold mt-1.5 ${small ? 'text-base' : 'text-2xl'} ${tone === 'brand' ? 'text-brand-700' : tone === 'amber' ? 'text-amber-500' : ''}`}>{value}</div>
    </div>
  );
}
