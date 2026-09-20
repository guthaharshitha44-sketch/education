'use client';

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/client';
import { useToast } from '@/components/ui/Toast';
import { ProgressBar, Badge, Skeleton } from '@/components/ui/Misc';
import { SKILLS, LEVEL_LABELS } from '@/lib/domain/skills';
import { ROLE_TEMPLATES } from '@/lib/domain/roles';
import { Compass, Plus, X, FileUp, Sparkles, Check } from 'lucide-react';

const STATUSES = ['Student', 'Graduate', 'Working Professional', 'Career Switcher'];
const STYLES = ['Video', 'Reading', 'Hands-on coding', 'Projects', 'Mixed'];

export default function Onboarding() {
  const router = useRouter();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    name: '', education: '', currentStatus: 'Student',
    skills: [] as Array<{ name: string; level: number }>,
    targetRole: 'Software Engineer', careerGoal: '',
    dailyMinutes: 60, learningStyle: 'mixed',
    projects: [] as Array<{ title: string; description: string }>,
    certificates: [] as Array<{ title: string; issuer: string }>,
    portfolioUrl: '', githubUrl: '',
  });
  const [resumeInfo, setResumeInfo] = useState<{ filename: string; parsed: any } | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/profile').then(r => r.json()).then(d => {
      if (d.ok && d.bundle?.user?.name) setForm(f => ({ ...f, name: d.bundle.user.name || '' }));
    }).catch(() => {});
  }, []);

  const steps = ['Name', 'Education', 'Status', 'Skills', 'Target', 'Goal', 'Time', 'Style', 'Resume', 'Portfolio', 'Certificates'];

  function toggleSkill(name: string) {
    setForm(f => {
      const has = f.skills.some(s => s.name === name);
      return { ...f, skills: has ? f.skills.filter(s => s.name !== name) : [...f.skills, { name, level: 40 }] };
    });
  }

  function setSkillLevel(name: string, level: number) {
    setForm(f => ({ ...f, skills: f.skills.map(s => s.name === name ? { ...s, level } : s) }));
  }

  async function uploadResume(file: File) {
    setUploading(true);
    setError('');
    try {
      const res = await fetch('/api/resume', { method: 'POST', body: file, headers: { 'X-Filename': encodeURIComponent(file.name) } });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'Upload failed');
      setResumeInfo({ filename: file.name, parsed: data.analysis });
      // merge detected skills into selected skills (don't overwrite user choices)
      const detected = (data.analysis.detectedSkills || []) as any[];
      setForm(f => {
        const merged = [...f.skills];
        for (const d of detected) {
          const idx = merged.findIndex(s => s.name === d.skill);
          if (idx >= 0) merged[idx] = { name: d.skill, level: Math.max(merged[idx].level, d.level) };
          else merged.push({ name: d.skill, level: d.level });
          }
        return { ...f, skills: merged.slice(0, 40) };
      });
      toast(`Resume analyzed: ${detected.length} skills detected.`, 'success');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setUploading(false);
    }
  }

  async function finish() {
    setSaving(true);
    setError('');
    try {
      await api('/api/onboarding', { method: 'POST', body: { ...form, learningStyle: form.learningStyle.toLowerCase() } });
      toast('Profile saved. Building your learning path…', 'success');
      router.push('/dashboard');
    } catch (e: any) {
      setError(e.message);
      setSaving(false);
    }
  }

  const canNext = useMemo(() => {
    switch (step) {
      case 0: return form.name.trim().length > 0;
      case 3: return form.skills.length > 0;
      case 8: return true; // resume optional
      default: return true;
    }
  }, [step, form]);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-ink-100 bg-white/70 backdrop-blur sticky top-0 z-30">
        <div className="max-w-3xl mx-auto px-5 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 font-display font-bold">
            <span className="w-8 h-8 rounded-lg bg-brand-600 text-white flex items-center justify-center"><Compass size={16} /></span> EduPath
          </div>
          <div className="text-sm text-ink-400">Step {step + 1} of {steps.length} — {steps[step]}</div>
        </div>
      </header>

      <main className="flex-1 max-w-3xl w-full mx-auto px-5 py-10">
        <ProgressBar value={((step + 1) / steps.length) * 100} className="mb-10" />

        {step === 0 && (
          <StepCard title="What should we call you?" hint="This is how you'll be greeted across EduPath.">
            <input className="input text-lg" autoFocus value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Aarav Sharma" />
          </StepCard>
        )}

        {step === 1 && (
          <StepCard title="Your education" hint="Degree, stream and year — e.g. “B.Tech CSE, 2nd year”.">
            <input className="input text-lg" autoFocus value={form.education} onChange={e => setForm({ ...form, education: e.target.value })} placeholder="B.Tech CSE, 2nd year" />
          </StepCard>
        )}

        {step === 2 && (
          <StepCard title="Where are you right now?" hint="Pick the closest match.">
            <div className="grid sm:grid-cols-2 gap-3">
              {STATUSES.map(s => (
                <button key={s} onClick={() => setForm({ ...form, currentStatus: s })}
                  className={`p-4 rounded-xl border-2 text-left font-medium transition ${form.currentStatus === s ? 'border-brand-500 bg-brand-50 text-brand-800' : 'border-ink-200 hover:border-brand-300'}`}>
                  {s}
                </button>
              ))}
            </div>
          </StepCard>
        )}

        {step === 3 && (
          <StepCard title="Your current skills" hint="Search and add skills, then set your level for each.">
            <SkillPicker skills={form.skills} onToggle={toggleSkill} onLevel={setSkillLevel}
              onAdd={(n) => toggleSkill(n)} />
          </StepCard>
        )}

        {step === 4 && (
          <StepCard title="Your target career" hint="Where do you want to go? Pick a template or type a custom role.">
            <div className="grid sm:grid-cols-3 gap-2.5 mb-4">
              {ROLE_TEMPLATES.map(r => (
                <button key={r.name} onClick={() => setForm({ ...form, targetRole: r.name })}
                  className={`p-3.5 rounded-xl border-2 text-left text-sm font-medium transition ${form.targetRole === r.name ? 'border-brand-500 bg-brand-50 text-brand-800' : 'border-ink-200 hover:border-brand-300'}`}>
                  {r.name}
                </button>
              ))}
            </div>
            <label className="label">Or a custom role</label>
            <input className="input" value={form.targetRole} onChange={e => setForm({ ...form, targetRole: e.target.value })} placeholder="e.g. Game Developer" />
          </StepCard>
        )}

        {step === 5 && (
          <StepCard title="What's the career goal?" hint="A sentence is enough — it steers your roadmap tone.">
            <textarea className="input min-h-[100px]" value={form.careerGoal} onChange={e => setForm({ ...form, careerGoal: e.target.value })} placeholder="Land a product-based SDE internship by next summer" />
          </StepCard>
        )}

        {step === 6 && (
          <StepCard title="Daily study time" hint="Be honest — the agent paces your plan to fit.">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[{ l: '30 min', v: 30 }, { l: '1 hour', v: 60 }, { l: '2 hours', v: 120 }, { l: '3+ hours', v: 180 }].map(o => (
                <button key={o.v} onClick={() => setForm({ ...form, dailyMinutes: o.v })}
                  className={`p-4 rounded-xl border-2 font-medium transition ${form.dailyMinutes === o.v ? 'border-brand-500 bg-brand-50 text-brand-800' : 'border-ink-200 hover:border-brand-300'}`}>
                  {o.l}<span className="block text-xs text-ink-400 font-normal">per day</span>
                </button>
              ))}
            </div>
          </StepCard>
        )}

        {step === 7 && (
          <StepCard title="How do you like to learn?" hint="We'll bias resources toward your style.">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              {STYLES.map(s => (
                <button key={s} onClick={() => setForm({ ...form, learningStyle: s })}
                  className={`p-3.5 rounded-xl border-2 text-sm font-medium transition ${form.learningStyle === s ? 'border-brand-500 bg-brand-50 text-brand-800' : 'border-ink-200 hover:border-brand-300'}`}>
                  {s}
                </button>
              ))}
            </div>
          </StepCard>
        )}

        {step === 8 && (
          <StepCard title="Upload your resume" hint="PDF or DOCX. We extract skills, projects and certificates — you confirm everything.">
            <div
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) uploadResume(f); }}
              className="border-2 border-dashed border-ink-200 rounded-2xl p-10 text-center hover:border-brand-300 transition cursor-pointer"
              onClick={() => fileRef.current?.click()}
              role="button" tabIndex={0} onKeyDown={e => e.key === 'Enter' && fileRef.current?.click()}>
            <input ref={fileRef} type="file" accept=".pdf,.docx,.txt" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) uploadResume(f); }} />
              <FileUp className="mx-auto text-brand-400 mb-3" size={30} />
              {uploading ? (
                <div className="space-y-2">
                  <p className="font-medium">Analyzing your resume…</p>
                  <Skeleton className="h-3 w-48 mx-auto" />
                </div>
              ) : resumeInfo ? (
                <>
                  <p className="font-medium text-emerald-600 flex items-center justify-center gap-1.5"><Check size={16} /> {resumeInfo.filename} analyzed</p>
                  <p className="text-sm text-ink-400 mt-1">{resumeInfo.parsed?.detectedSkills?.length || 0} skills detected — review them in the skill list or after onboarding.</p>
                </>
              ) : (
                <>
                  <p className="font-medium">Drop your resume here, or click to browse</p>
                  <p className="text-sm text-ink-400 mt-1">PDF, DOCX or TXT · max 4 MB</p>
                </>
              )}
            </div>
            {resumeInfo?.parsed && <ResumeIntelligence parsed={resumeInfo.parsed} />}
            {error && <div className="mt-4 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 text-sm px-4 py-3">{error}</div>}
          </StepCard>
        )}

        {step === 9 && (
          <StepCard title="Portfolio & projects" hint="Paste links or describe projects — both feed your profile.">
            <div className="space-y-3">
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="label">GitHub URL</label>
                  <input className="input" value={form.githubUrl} onChange={e => setForm({ ...form, githubUrl: e.target.value })} placeholder="https://github.com/you" />
                </div>
                <div>
                  <label className="label">Portfolio URL</label>
                  <input className="input" value={form.portfolioUrl} onChange={e => setForm({ ...form, portfolioUrl: e.target.value })} placeholder="https://you.dev" />
                </div>
              </div>
              {form.projects.map((p, i) => (
                <div key={i} className="flex gap-2">
                  <input className="input flex-1" value={p.title} onChange={e => setForm({ ...form, projects: form.projects.map((x, xi) => xi === i ? { ...x, title: e.target.value } : x) })} placeholder={`Project ${i + 1} title`} />
                  <button className="btn-ghost px-2" onClick={() => setForm({ ...form, projects: form.projects.filter((_, xi) => xi !== i) })} aria-label="Remove project"><X size={16} /></button>
                </div>
              ))}
              <button className="btn-secondary w-full" onClick={() => setForm({ ...form, projects: [...form.projects, { title: '', description: '' }] })}>
                <Plus size={15} /> Add project
              </button>
            </div>
          </StepCard>
        )}

        {step === 10 && (
          <StepCard title="Certificates" hint="Any certificate worth mentioning — optional.">
            {form.certificates.map((c, i) => (
              <div key={i} className="flex gap-2 mb-3">
                <input className="input flex-1" value={c.title} onChange={e => setForm({ ...form, certificates: form.certificates.map((x, xi) => xi === i ? { ...x, title: e.target.value } : x) })} placeholder="Certificate title" />
                <input className="input w-40" value={c.issuer} onChange={e => setForm({ ...form, certificates: form.certificates.map((x, xi) => xi === i ? { ...x, issuer: e.target.value } : x) })} placeholder="Issuer" />
                <button className="btn-ghost px-2" onClick={() => setForm({ ...form, certificates: form.certificates.filter((_, xi) => xi !== i) })} aria-label="Remove certificate"><X size={16} /></button>
              </div>
            ))}
            <button className="btn-secondary w-full" onClick={() => setForm({ ...form, certificates: [...form.certificates, { title: '', issuer: '' }] })}>
              <Plus size={15} /> Add certificate
            </button>
            {error && <div className="mt-4 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 text-sm px-4 py-3">{error}</div>}
          </StepCard>
        )}

        <div className="flex justify-between items-center mt-8">
          <button className="btn-ghost" onClick={() => setStep(s => Math.max(0, s - 1))} disabled={step === 0}>← Back</button>
          {step < steps.length - 1 ? (
            <button className="btn-primary" onClick={() => setStep(s => s + 1)} disabled={!canNext}>Continue →</button>
          ) : (
            <button className="btn-primary" onClick={finish} disabled={saving}>
              <Sparkles size={16} /> {saving ? 'Analyzing…' : 'Analyze My Profile'}
            </button>
          )}
        </div>
      </main>
    </div>
  );
}

function StepCard({ title, hint, children }: { title: string; hint: string; children: React.ReactNode }) {
  return (
    <div className="animate-fade-up">
      <h1 className="font-display text-2xl md:text-3xl font-bold tracking-tight">{title}</h1>
      <p className="text-ink-500 mt-2 mb-7 text-sm">{hint}</p>
      {children}
    </div>
  );
}

function SkillPicker({ skills, onToggle, onLevel, onAdd }: {
  skills: Array<{ name: string; level: number }>;
  onToggle: (name: string) => void;
  onLevel: (name: string, level: number) => void;
  onAdd: (name: string) => void;
}) {
  const [query, setQuery] = useState('');
  const catalog = useMemo(() => {
    const q = query.trim().toLowerCase();
    return SKILLS.filter(s => !q || s.name.toLowerCase().includes(q)).slice(0, 60);
  }, [query]);
  const exactSelected = skills.find(s => s.name.toLowerCase() === query.trim().toLowerCase());

  return (
    <div>
      <input className="input mb-3" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search skills (Python, React, SQL…)" />
      <div className="flex flex-wrap gap-2 mb-5">
        {catalog.map(s => {
          const selected = skills.some(x => x.name === s.name);
          return (
            <button key={s.name} onClick={() => onToggle(s.name)}
              className={`chip cursor-pointer transition ${selected ? 'bg-brand-600 text-white border-brand-600' : 'hover:border-brand-300'}`}>
              {s.name}{selected && <X size={12} />}
            </button>
          );
        })}
        {query.trim() && !catalog.some(s => s.name.toLowerCase() === query.trim().toLowerCase()) && !exactSelected && (
          <button onClick={() => { onAdd(query.trim()); setQuery(''); }} className="chip border-dashed border-brand-400 text-brand-600 cursor-pointer">
            <Plus size={12} /> Add "{query.trim()}"
          </button>
        )}
      </div>
      {skills.length > 0 && (
        <div className="space-y-3">
          <div className="text-sm font-semibold text-ink-700">Set your level for each skill</div>
          {skills.map(s => (
            <div key={s.name} className="card p-4">
              <div className="flex items-center justify-between mb-2.5">
                <span className="font-medium text-sm">{s.name}</span>
                <Badge tone="slate">{LEVEL_LABELS[Math.min(5, Math.round(s.level / 20))]}</Badge>
              </div>
              <input type="range" min={5} max={95} step={5} value={s.level} className="w-full accent-brand-600"
                onChange={e => onLevel(s.name, Number(e.target.value))} aria-label={`${s.name} level`} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ResumeIntelligence({ parsed }: { parsed: any }) {
  const sections: Array<{ label: string; items: string[] }> = [
    { label: 'Projects', items: parsed.projects || [] },
    { label: 'Certificates', items: parsed.certificates || [] },
    { label: 'Experience', items: parsed.experience || [] },
    { label: 'Education', items: parsed.education || [] },
    { label: 'Achievements', items: parsed.achievements || [] },
  ];
  return (
    <div className="mt-6 card p-5 animate-fade-up">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles size={16} className="text-brand-600" />
        <h3 className="font-display font-semibold">Resume Intelligence</h3>
        <Badge tone="brand">preview</Badge>
      </div>
      {parsed.summary && <p className="text-sm text-ink-600 mb-4">{parsed.summary}</p>}
      <div className="text-sm font-semibold text-ink-700 mb-2">Detected skills</div>
      <div className="flex flex-wrap gap-2 mb-4">
        {(parsed.detectedSkills || []).map((s: any) => (
          <span key={s.skill} className="chip">
            {s.skill} · {s.level}%
            {s.confidence < 0.6 && <Badge tone="amber">Needs confirmation</Badge>}
          </span>
        ))}
        {(parsed.detectedSkills || []).length === 0 && <span className="text-sm text-ink-400">None detected — you can add skills manually.</span>}
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        {sections.map(sec => sec.items.length > 0 && (
          <div key={sec.label}>
            <div className="text-sm font-semibold text-ink-700 mb-1.5">{sec.label}</div>
            <ul className="text-sm text-ink-500 space-y-1 list-disc list-inside">
              {sec.items.slice(0, 4).map((it, i) => <li key={i} className="line-clamp-2">{it}</li>)}
            </ul>
          </div>
        ))}
      </div>
      <p className="text-xs text-ink-400 mt-4">Everything above was extracted from your file. Low-confidence items are marked “Needs confirmation” — correct anything that looks wrong.</p>
    </div>
  );
}
