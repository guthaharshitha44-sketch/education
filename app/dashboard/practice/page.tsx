'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/client';
import { useToast } from '@/components/ui/Toast';
import { Skeleton, Badge, EmptyState, Modal } from '@/components/ui/Misc';
import { Target, Sparkles, Send, RotateCcw } from 'lucide-react';

export default function PracticePage() {
  const { toast } = useToast();
  const [skills, setSkills] = useState<string[]>([]);
  const [skill, setSkill] = useState('');
  const [kind, setKind] = useState('mixed');
  const [count, setCount] = useState(5);
  const [set, setSet] = useState<any>(null);
  const [source, setSource] = useState('');
  const [answers, setAnswers] = useState<Record<number, { choice?: number; text?: string }>>({});
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api('/api/practice').then(d => {
      setSkills(d.skills || []);
      if (d.skills?.length) setSkill(d.skills[0]);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  async function generate() {
    if (!skill) return;
    setGenerating(true);
    setResult(null);
    setAnswers({});
    setSet(null);
    try {
      const d = await api('/api/practice', { method: 'POST', body: { action: 'generate', skill, kind, count } });
      setSet(d.set);
      setSource(d.source);
    } catch (e: any) { toast(e.message, 'error'); } finally { setGenerating(false); }
  }

  async function submit() {
    setSubmitting(true);
    try {
      const d = await api('/api/practice', { method: 'POST', body: { action: 'submit', set, answers: set.questions.map((_: any, i: number) => answers[i] || {}) } });
      setResult(d);
      if (d.adapted?.adapted) toast(`EduPath adapted your plan: ${d.adapted.changes?.[0]}`, 'success');
      else toast(`Scored ${d.score}% — progress updated.`, d.score >= 60 ? 'success' : 'info');
    } catch (e: any) { toast(e.message, 'error'); } finally { setSubmitting(false); }
  }

  const allAnswered = set ? set.questions.every((_: any, i: number) => answers[i]?.choice !== undefined || (answers[i]?.text || '').length > 0) : false;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2.5"><Target size={24} className="text-brand-600" /> Practice Arena</h1>
        <p className="text-ink-500 text-sm mt-1">Generated practice on your current gaps. Results feed struggle detection and plan adaptation.</p>
      </div>

      <section className="card p-6">
        <div className="grid sm:grid-cols-4 gap-3 items-end">
          <div className="sm:col-span-2">
            <label className="label">Skill</label>
            <select className="input" value={skill} onChange={e => setSkill(e.target.value)}>
              {skills.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Type</label>
            <select className="input" value={kind} onChange={e => setKind(e.target.value)}>
              {['mixed', 'quiz', 'coding', 'debug', 'scenario', 'concept'].map(k => <option key={k} value={k}>{k}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Questions</label>
            <select className="input" value={count} onChange={e => setCount(Number(e.target.value))}>
              {[3, 5, 8].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        </div>
        <button className="btn-primary mt-4" onClick={generate} disabled={generating || !skill}>
          <Sparkles size={15} /> {generating ? 'Generating…' : 'Generate practice set'}
        </button>
        {source === 'curated' && <p className="text-xs text-ink-400 mt-2">Running on EduPath's built-in question engine (add an AI key for infinite generation).</p>}
      </section>

      {set && !result && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-semibold">{set.skill} · {set.questions.length} questions</h2>
            <Badge tone="brand">{set.kind}</Badge>
          </div>
          {set.questions.map((q: any, i: number) => (
            <div key={q.id} className="card p-5">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-bold text-ink-400">Q{i + 1}</span>
                <Badge tone="slate">{q.kind}</Badge>
                <Badge tone="slate">{q.difficulty}</Badge>
                <span className="text-xs text-ink-400">~{q.est_minutes} min</span>
              </div>
              <p className="font-medium text-sm whitespace-pre-wrap">{q.prompt}</p>
              {q.choices ? (
                <div className="mt-3 space-y-2">
                  {q.choices.map((c: string, ci: number) => (
                    <button key={ci} onClick={() => setAnswers(a => ({ ...a, [i]: { choice: ci } }))}
                      className={`w-full text-left px-4 py-2.5 rounded-xl border text-sm transition
                        ${answers[i]?.choice === ci ? 'border-brand-500 bg-brand-50 text-brand-800 font-medium' : 'border-ink-200 hover:border-brand-300'}`}>
                      <span className="font-bold mr-2">{String.fromCharCode(65 + ci)}.</span>{c}
                    </button>
                  ))}
                </div>
              ) : (
                <textarea className="input mt-3 min-h-[90px]" placeholder="Type your answer…"
                  value={answers[i]?.text || ''} onChange={e => setAnswers(a => ({ ...a, [i]: { text: e.target.value } }))} />
              )}
            </div>
          ))}
          <div className="flex justify-end">
            <button className="btn-primary" onClick={submit} disabled={submitting || !allAnswered}>
              <Send size={15} /> {submitting ? 'Evaluating…' : 'Submit for evaluation'}
            </button>
          </div>
        </section>
      )}

      {result && (
        <section className="card p-6 animate-fade-up">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-semibold text-xl">Result: <span className={result.score >= 70 ? 'text-emerald-600' : result.score >= 50 ? 'text-amber-500' : 'text-rose-500'}>{result.score}%</span></h2>
            <button className="btn-secondary text-sm" onClick={() => { setResult(null); setSet(null); }}><RotateCcw size={14} /> New set</button>
          </div>
          {result.mistakes?.length > 0 && (
            <div className="rounded-xl bg-rose-50 border border-rose-100 p-4 mb-4">
              <div className="text-sm font-semibold text-rose-700 mb-1">Concepts to revisit</div>
              <ul className="text-sm text-rose-600 list-disc list-inside">
                {result.mistakes.slice(0, 4).map((m: string, i: number) => <li key={i}>{m}</li>)}
              </ul>
            </div>
          )}
          <div className="space-y-3">
            {result.perQuestion.map((p: any, i: number) => (
              <div key={i} className={`rounded-xl border p-4 ${p.correct === false || (p.score !== undefined && p.score < 50) ? 'border-rose-100 bg-rose-50/40' : 'border-emerald-100 bg-emerald-50/40'}`}>
                <div className="text-sm font-semibold mb-1">Q{i + 1} {p.correct === false ? '· incorrect' : p.score !== undefined ? `· ${p.score}%` : '· correct ✓'}</div>
                {p.feedback && <p className="text-sm text-ink-600">{p.feedback}</p>}
                <p className="text-xs text-ink-500 mt-1">{p.explanation}</p>
              </div>
            ))}
          </div>
          {result.adapted?.adapted && (
            <div className="mt-4 rounded-xl bg-brand-50 border border-brand-100 p-4 text-sm text-brand-900">
              <span className="font-semibold">EduPath adapted your plan:</span> {result.adapted.changes.join(' · ')}
            </div>
          )}
        </section>
      )}

      {loading && <Skeleton className="h-40" />}
    </div>
  );
}
