'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/client';
import { useToast } from '@/components/ui/Toast';
import { Skeleton, Badge, Modal } from '@/components/ui/Misc';
import { Wand2, Sparkles, CheckCircle2, ArrowRight, Info } from 'lucide-react';

const INTENTS = ['More time on one skill', 'Reduce study time', 'Switch target role', 'Intensive sprint'];

export default function WhatIfPage() {
  const { toast } = useToast();
  const [questions, setQuestions] = useState<any[]>([]);
  const [scenarios, setScenarios] = useState<any[]>([]);
  const [intent, setIntent] = useState(INTENTS[0]);
  const [answers, setAnswers] = useState<Record<string, string>>({ skill: '', days: '14', newTime: '60', newRole: '' });
  const [result, setResult] = useState<any>(null);
  const [scenarioId, setScenarioId] = useState<string | null>(null);
  const [simulating, setSimulating] = useState(false);
  const [applying, setApplying] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [needsSkill, setNeedsSkill] = useState(false);

  useEffect(() => {
    api('/api/whatif').then(d => { setQuestions(d.questions || []); setScenarios(d.scenarios || []); }).catch(() => {});
  }, []);

  async function simulate() {
    if (intent === 'More time on one skill' && !answers.skill.trim()) { setNeedsSkill(true); return; }
    setNeedsSkill(false);
    setSimulating(true);
    try {
      const d = await api('/api/whatif', { method: 'POST', body: { action: 'simulate', answers: { ...answers, intent } } });
      setResult(d.result);
      setScenarioId(d.scenarioId);
    } catch (e: any) { toast(e.message, 'error'); } finally { setSimulating(false); }
  }

  async function apply() {
    setApplying(true);
    try {
      const d = await api('/api/whatif', { method: 'POST', body: { action: 'apply', scenarioId } });
      toast(`Scenario applied — roadmap is now v${d.version}.`, 'success');
      setConfirmOpen(false);
      setResult(null);
    } catch (e: any) { toast(e.message, 'error'); } finally { setApplying(false); }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2.5"><Wand2 size={24} className="text-brand-600" /> What-If Simulator</h1>
        <p className="text-ink-500 text-sm mt-1">Simulate a change to your learning path before committing. A plan simulation — never a job prediction.</p>
      </div>

      <div className="grid lg:grid-cols-5 gap-5">
        <section className="card p-6 lg:col-span-2">
          <h2 className="font-display font-semibold mb-4">Build a scenario</h2>
          <label className="label">What do you want to simulate?</label>
          <div className="grid grid-cols-2 gap-2 mb-4">
            {INTENTS.map(i => (
              <button key={i} onClick={() => setIntent(i)}
                className={`p-3 rounded-xl border-2 text-xs font-semibold text-left transition ${intent === i ? 'border-brand-500 bg-brand-50 text-brand-800' : 'border-ink-200 hover:border-brand-300'}`}>
                {i}
              </button>
            ))}
          </div>

          {intent === 'More time on one skill' && (
            <div className="mb-3">
              <label className="label">Which skill? {needsSkill && <span className="text-rose-500">— required</span>}</label>
              <input className={`input ${needsSkill ? 'border-rose-300' : ''}`} value={answers.skill} onChange={e => setAnswers(a => ({ ...a, skill: e.target.value }))} placeholder="e.g. Data Structures & Algorithms" />
            </div>
          )}
          {intent === 'Switch target role' && (
            <div className="mb-3">
              <label className="label">New target role</label>
              <input className="input" value={answers.newRole} onChange={e => setAnswers(a => ({ ...a, newRole: e.target.value }))} placeholder="e.g. Backend Developer" />
            </div>
          )}
          {intent !== 'Switch target role' && (
            <>
              <div className="mb-3">
                <label className="label">How many days?</label>
                <div className="flex gap-2">
                  {['7', '14', '30'].map(d => (
                    <button key={d} onClick={() => setAnswers(a => ({ ...a, days: d }))}
                      className={`flex-1 py-2 rounded-xl border-2 text-sm font-semibold transition ${answers.days === d ? 'border-brand-500 bg-brand-50 text-brand-800' : 'border-ink-200'}`}>{d}</button>
                  ))}
                </div>
              </div>
              <div className="mb-4">
                <label className="label">Daily minutes in the scenario</label>
                <div className="flex gap-2">
                  {['15', '30', '60', '90', '120'].map(m => (
                    <button key={m} onClick={() => setAnswers(a => ({ ...a, newTime: m }))}
                      className={`flex-1 py-2 rounded-xl border-2 text-sm font-semibold transition ${answers.newTime === m ? 'border-brand-500 bg-brand-50 text-brand-800' : 'border-ink-200'}`}>{m}</button>
                  ))}
                </div>
              </div>
            </>
          )}

          <button className="btn-primary w-full" onClick={simulate} disabled={simulating}>
            <Sparkles size={15} /> {simulating ? 'Simulating…' : 'Simulate this scenario'}
          </button>
        </section>

        <section className="lg:col-span-3">
          {result ? (
            <div className="card p-6 animate-fade-up">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h2 className="font-display font-semibold text-lg">{result.title}</h2>
                <Badge tone="brand">simulation</Badge>
              </div>
              <div className="grid sm:grid-cols-2 gap-3 mt-4">
                <div className="rounded-xl border border-ink-100 p-4">
                  <div className="text-xs font-semibold text-ink-400 uppercase mb-1">Current Path</div>
                  <p className="text-sm">{result.currentPathSummary}</p>
                </div>
                <div className="rounded-xl border border-brand-200 bg-brand-50/60 p-4">
                  <div className="text-xs font-semibold text-brand-600 uppercase mb-1">Simulated Path</div>
                  <p className="text-sm">{result.simulatedPathSummary}</p>
                </div>
              </div>

              <h3 className="font-semibold text-sm mt-5 mb-2">Changes</h3>
              <div className="space-y-2">
                {result.changes.map((c: any, i: number) => (
                  <div key={i} className="flex items-start gap-2.5 text-sm p-3 rounded-xl bg-ink-50">
                    <Badge tone={c.type === 'added' ? 'emerald' : c.type === 'removed' ? 'rose' : c.type === 'delayed' ? 'amber' : 'brand'}>{c.type}</Badge>
                    <div><span className="font-medium">{c.label}</span> — <span className="text-ink-500">{c.detail}</span></div>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 mt-5 p-4 rounded-xl bg-ink-50">
                <div className="text-sm">
                  <span className="font-semibold">Projected readiness: {result.newReadinessProjection}%</span>
                  {result.estimatedExtraDays > 0 && <span className="text-ink-400"> · ~{result.estimatedExtraDays} extra days</span>}
                </div>
                <button className="btn-primary" onClick={() => setConfirmOpen(true)}>
                  Apply This Scenario <ArrowRight size={15} />
                </button>
              </div>

              <p className="text-xs text-ink-400 mt-3 flex gap-1.5"><Info size={12} className="shrink-0 mt-0.5" /> {result.disclaimer}</p>
            </div>
          ) : (
            <div className="card p-10 text-center h-full flex flex-col items-center justify-center">
              <Wand2 size={36} className="text-brand-200 mb-3" />
              <p className="text-sm text-ink-400 max-w-xs">Run a simulation to compare your current path with a what-if path, side by side.</p>
            </div>
          )}

          {scenarios.length > 0 && (
            <div className="mt-5">
              <h3 className="text-sm font-semibold text-ink-600 mb-2">Recent scenarios</h3>
              <div className="space-y-2">
                {scenarios.slice(0, 4).map(s => (
                  <div key={s.id} className="flex items-center justify-between text-sm card px-4 py-3">
                    <span>{s.result?.title || 'Scenario'}</span>
                    {s.applied ? <Badge tone="emerald">applied</Badge> : <Badge tone="slate">saved</Badge>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>

      <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)} title="Apply this scenario?">
        <p className="text-sm text-ink-600">This will <strong>replace your current roadmap</strong> with the simulated one. Your history, scores and struggle data are kept, and the change will be logged in your activity timeline.</p>
        <div className="flex justify-end gap-2 mt-5">
          <button className="btn-secondary" onClick={() => setConfirmOpen(false)}>Cancel</button>
          <button className="btn-primary" onClick={apply} disabled={applying}>{applying ? 'Applying…' : 'Yes, replace my roadmap'}</button>
        </div>
      </Modal>
    </div>
  );
}
