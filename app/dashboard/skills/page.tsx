'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/client';
import { useToast } from '@/components/ui/Toast';
import { ProgressBar, StateTag, Skeleton, Badge, Modal, EmptyState } from '@/components/ui/Misc';
import { DEPENDENCIES, LEVEL_LABELS } from '@/lib/domain/skills';
import { resourcesForSkill } from '@/lib/domain/resources';
import { BrainCircuit, Link2, Sparkles, BookOpen } from 'lucide-react';

const STATE_ORDER = ['missing', 'needs-work', 'developing', 'strong'];

export default function SkillMap() {
  const [gap, setGap] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [explain, setExplain] = useState<string>('');

  const load = useCallback(async () => {
    try {
      const d = await api('/api/gap');
      setGap(d.gap);
    } catch { /* auth guard */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const itemsByState = useMemo(() => {
    const map: Record<string, any[]> = { missing: [], 'needs-work': [], developing: [], strong: [] };
    for (const it of gap?.items || []) map[it.state].push(it);
    for (const k of STATE_ORDER) map[k].sort((a, b) => b.target - b.current - (a.target - a.current));
    return map;
  }, [gap]);

  async function openSkill(name: string) {
    setSelected(name);
    setExplain('');
    try {
      const d = await api('/api/activity', { method: 'POST', body: { subject: name } });
      setExplain(d.explanation);
    } catch { setExplain(''); }
  }

  if (loading) return <div className="space-y-4"><Skeleton className="h-9 w-64" /><Skeleton className="h-40" /><Skeleton className="h-96" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl md:text-3xl font-bold tracking-tight">Skill Map</h1>
        <p className="text-ink-500 text-sm mt-1">{gap?.summary}</p>
      </div>

      {/* Readiness banner */}
      <section className="card p-6 flex flex-col sm:flex-row items-start sm:items-center gap-6">
        <div className="relative w-28 h-28 shrink-0">
          <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
            <circle cx="60" cy="60" r="52" fill="none" stroke="#eceef5" strokeWidth="12" />
            <circle cx="60" cy="60" r="52" fill="none" stroke="url(#grad)" strokeWidth="12" strokeLinecap="round"
              strokeDasharray={`${(gap?.readiness || 0) * 3.27} 999`} />
            <defs><linearGradient id="grad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#5b78f0" /><stop offset="100%" stopColor="#14b8a6" />
            </linearGradient></defs>
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-display text-2xl font-bold text-brand-700">{gap?.readiness ?? 0}%</span>
            <span className="text-[10px] text-ink-400 font-semibold uppercase tracking-wide">Readiness</span>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 flex-1">
          <Count label="Strong" n={itemsByState.strong.length} tone="emerald" />
          <Count label="Developing" n={itemsByState.developing.length} tone="brand" />
          <Count label="Needs work" n={itemsByState['needs-work'].length} tone="amber" />
          <Count label="Missing" n={itemsByState.missing.length} tone="rose" />
        </div>
      </section>

      {/* Skill bars grouped by state */}
      <div className="grid md:grid-cols-2 gap-5">
        {STATE_ORDER.map(state => (
          <section key={state} className="card p-6">
            <div className="flex items-center gap-2 mb-4">
              <StateTag state={state} />
              <span className="text-xs text-ink-400">{itemsByState[state].length} skills</span>
            </div>
            {itemsByState[state].length === 0 ? (
              <p className="text-sm text-ink-400">Nothing here — nice.</p>
            ) : (
              <div className="space-y-4">
                {itemsByState[state].map(it => (
                  <button key={it.skill} onClick={() => openSkill(it.skill)} className="w-full text-left group">
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="font-medium group-hover:text-brand-700 transition">{it.skill}</span>
                      <span className="text-ink-400 text-xs">{it.current}% / {it.target}% · {it.importance}</span>
                    </div>
                    <ProgressBar value={it.current} tone={state === 'strong' ? 'emerald' : state === 'developing' ? 'brand' : state === 'needs-work' ? 'amber' : 'rose'} />
                  </button>
                ))}
              </div>
            )}
          </section>
        ))}
      </div>

      {/* Unlockers */}
      {(gap?.unlockers || []).length > 0 && (
        <section className="card p-6">
          <h2 className="font-display font-semibold mb-1 flex items-center gap-2"><Link2 size={17} className="text-brand-600" /> Skills that unlock others</h2>
          <p className="text-sm text-ink-500 mb-4">Improving these has compounding effects on downstream topics.</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {gap.unlockers.map((u: any) => (
              <div key={u.skill} className="rounded-xl border border-ink-100 p-4 hover:border-brand-200 transition">
                <div className="font-semibold text-sm">{u.skill}</div>
                <div className="text-xs text-ink-400 mt-1">unlocks {u.unlocks.length} skill{u.unlocks.length > 1 ? 's' : ''}</div>
                <div className="text-[11px] text-brand-600 mt-1.5 truncate">{u.unlocks.join(' · ')}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Dependency graph */}
      <DependencyGraph items={gap?.items || []} onPick={openSkill} />

      {/* Skill detail modal */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title={selected || 'Skill'}>
        {selected && (
          <SkillDetail name={selected} item={gap?.items.find((i: any) => i.skill === selected)} explain={explain} />
        )}
      </Modal>
    </div>
  );
}

function Count({ label, n, tone }: { label: string; n: number; tone: string }) {
  const tones: Record<string, string> = { emerald: 'text-emerald-600', brand: 'text-brand-600', amber: 'text-amber-500', rose: 'text-rose-500' };
  return (
    <div className="text-center p-3 rounded-xl bg-ink-50">
      <div className={`font-display text-xl font-bold ${tones[tone]}`}>{n}</div>
      <div className="text-[11px] text-ink-400 font-medium">{label}</div>
    </div>
  );
}

function SkillDetail({ name, item, explain }: { name: string; item: any; explain: string }) {
  const prereqs = DEPENDENCIES.filter(d => d.to === name).map(d => d.from);
  const related = DEPENDENCIES.filter(d => d.from === name).map(d => d.to);
  const resources = resourcesForSkill(name);
  return (
    <div className="space-y-4 text-sm">
      {item ? (
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-semibold">Current level: {LEVEL_LABELS[Math.min(5, Math.round(item.current / 20))]} ({item.current}%)</span>
            <StateTag state={item.state} />
          </div>
          <div className="flex items-center justify-between text-xs text-ink-400 mb-2">
            <span>Target: {item.target}% · {item.importance} for this role</span>
          </div>
          <ProgressBar value={item.current} tone={item.state === 'strong' ? 'emerald' : item.state === 'missing' ? 'rose' : 'brand'} />
        </div>
      ) : <p className="text-ink-500">This skill isn't tracked for your current target role, but it appears in the dependency graph.</p>}

      {explain && (
        <div className="rounded-xl bg-brand-50 border border-brand-100 p-3.5 text-brand-900 flex gap-2">
          <Sparkles size={15} className="shrink-0 mt-0.5 text-brand-600" />
          <div><span className="font-semibold">Why this recommendation?</span><br />{explain}</div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-ink-50 p-3">
          <div className="text-xs font-semibold text-ink-400 uppercase mb-1.5">Prerequisites</div>
          <div className="flex flex-wrap gap-1.5">{prereqs.length ? prereqs.map(p => <span key={p} className="chip !text-[11px]">{p}</span>) : <span className="text-xs text-ink-400">None — start here.</span>}</div>
        </div>
        <div className="rounded-xl bg-ink-50 p-3">
          <div className="text-xs font-semibold text-ink-400 uppercase mb-1.5">Unlocks</div>
          <div className="flex flex-wrap gap-1.5">{related.length ? related.map(p => <span key={p} className="chip !text-[11px]">{p}</span>) : <span className="text-xs text-ink-400">—</span>}</div>
        </div>
      </div>

      <div>
        <div className="text-xs font-semibold text-ink-400 uppercase mb-2 flex items-center gap-1.5"><BookOpen size={12} /> Recommended resources</div>
        {resources.length === 0 ? <p className="text-ink-400">No curated resources for this skill yet.</p> : (
          <ul className="space-y-2">
            {resources.slice(0, 4).map(r => (
              <li key={r.url} className="flex items-center justify-between gap-3 p-2.5 rounded-xl border border-ink-100">
                <div className="min-w-0">
                  <a href={r.url} target="_blank" rel="noreferrer" className="font-medium text-brand-700 hover:underline truncate block">{r.title}</a>
                  <span className="text-xs text-ink-400">{r.provider} · {r.type} · {r.est_minutes} min · {r.difficulty}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function DependencyGraph({ items, onPick }: { items: any[]; onPick: (s: string) => void }) {
  const levelMap: Record<string, number> = {};
  for (const it of items) levelMap[it.skill] = it.current;
  const nodes = useMemo(() => {
    const all = new Set<string>();
    for (const d of DEPENDENCIES) { all.add(d.from); all.add(d.to); }
    return Array.from(all);
  }, []);
  const levels = useMemo(() => {
    const depth: Record<string, number> = {};
    const resolve = (n: string, seen = new Set<string>()): number => {
      if (depth[n] !== undefined) return depth[n];
      if (seen.has(n)) return 0;
      seen.add(n);
      const parents = DEPENDENCIES.filter(d => d.to === n).map(d => d.from);
      depth[n] = parents.length ? Math.max(...parents.map(p => resolve(p, seen))) + 1 : 0;
      return depth[n];
    };
    for (const n of nodes) resolve(n);
    return depth;
  }, [nodes]);

  const byLevel = useMemo(() => {
    const map: Record<number, string[]> = {};
    for (const n of nodes) (map[levels[n]] ||= []).push(n);
    for (const k of Object.keys(map)) map[Number(k)].sort();
    return map;
  }, [nodes, levels]);

  const maxLevel = Math.max(...Object.keys(byLevel).map(Number));
  const W = 980, rowH = 74, padX = 40;
  const H = (maxLevel + 1) * rowH + 60;

  return (
    <section className="card p-6">
      <h2 className="font-display font-semibold mb-1">Skill dependency graph</h2>
      <p className="text-sm text-ink-500 mb-4">Click any node for why it matters, prerequisites, resources and practice. Colors show your current state.</p>
      <div className="overflow-x-auto -mx-2 px-2">
        <svg viewBox={`0 0 ${W} ${H}`} className="min-w-[760px] w-full" style={{ height: 'auto' }}>
          {/* edges */}
          {DEPENDENCIES.map((d, i) => {
            const from = nodePos(d.from), to = nodePos(d.to);
            if (!from || !to) return null;
            const x1 = from.x, y1 = from.y + 16, x2 = to.x, y2 = to.y - 18;
            const mid = (y1 + y2) / 2;
            return <path key={i} d={`M ${x1} ${y1} C ${x1} ${mid}, ${x2} ${mid}, ${x2} ${y2}`} fill="none" stroke="#c5d6fe" strokeWidth="1.6" markerEnd="url(#arrow)" />;
          })}
          <defs>
            <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#a1bdfc" />
            </marker>
          </defs>
          {/* nodes */}
          {nodes.map(n => {
            const p = nodePos(n)!;
            const cur = levelMap[n] ?? -1;
            const tracked = cur >= 0;
            const fill = !tracked ? '#eceef5' : cur <= 5 ? '#fee2e2' : cur < 40 ? '#fef3c7' : cur < 70 ? '#dbeafe' : '#d1fae5';
            const stroke = !tracked ? '#d5d9e6' : cur <= 5 ? '#fca5a5' : cur < 40 ? '#fcd34d' : cur < 70 ? '#93c5fd' : '#6ee7b7';
            return (
              <g key={n} onClick={() => onPick(n)} className="cursor-pointer" role="button" aria-label={n}>
                <rect x={p.x - 78} y={p.y - 17} width={156} height={34} rx={10} fill={fill} stroke={stroke} strokeWidth="1.4" />
                <text x={p.x} y={p.y + 4} textAnchor="middle" fontSize="10.5" fontWeight="600" fill="#23283a">
                  {n.length > 24 ? n.slice(0, 23) + '…' : n}
                </text>
                {tracked && <text x={p.x + 66} y={p.y + 4} fontSize="9" fill="#677297">{cur}%</text>}
              </g>
            );
          })}
        </svg>
      </div>
    </section>
  );

  function nodePos(n: string) {
    const lvl = levels[n];
    const row = byLevel[lvl] || [];
    const idx = row.indexOf(n);
    if (idx === -1) return null;
    const colW = (W - padX * 2) / Math.max(1, row.length);
    return { x: padX + colW * idx + colW / 2, y: H - 50 - lvl * rowH };
  }
}
