'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/client';
import { useToast } from '@/components/ui/Toast';
import { Skeleton, Badge, EmptyState } from '@/components/ui/Misc';
import { Settings as SettingsIcon, FileText, Trophy, FolderKanban, LogOut } from 'lucide-react';

export default function SettingsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [bundle, setBundle] = useState<any>(null);

  useEffect(() => { api('/api/profile').then(d => setBundle(d.bundle)).catch(() => {}); }, []);

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
  }

  if (!bundle) return <div className="space-y-4"><Skeleton className="h-9 w-64" /><Skeleton className="h-64" /></div>;

  const { user, profile, skills, projects, certificates, resume } = bundle;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2.5"><SettingsIcon size={24} className="text-ink-500" /> Settings & Profile</h1>
        <p className="text-ink-500 text-sm mt-1">Everything EduPath knows about you. Your data is private to your account.</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <section className="card p-6">
          <h2 className="font-display font-semibold mb-4">Profile</h2>
          <dl className="space-y-3 text-sm">
            <Row k="Name" v={user?.name} />
            <Row k="Email" v={user?.email} />
            <Row k="Education" v={profile?.education} />
            <Row k="Current status" v={profile?.currentStatus} />
            <Row k="Target role" v={profile?.targetRole} />
            <Row k="Career goal" v={profile?.careerGoal} />
            <Row k="Daily study time" v={profile ? `${profile.dailyMinutes} min` : ''} />
            <Row k="Learning style" v={profile?.learningStyle} />
          </dl>
          <div className="mt-4 p-3.5 rounded-xl bg-brand-50 border border-brand-100 text-sm text-brand-900">
            To change your target role or skills, re-run onboarding: sign out, sign in, and use the banner on the dashboard — or simply regenerate your roadmap from Settings → Roadmap.
          </div>
        </section>

        <section className="card p-6">
          <h2 className="font-display font-semibold mb-4 flex items-center gap-2"><FileText size={17} /> Resume Intelligence</h2>
          {resume?.parsed ? (
            <div className="space-y-3 text-sm">
              <div className="text-xs text-ink-400">{resume.filename} · analyzed {new Date(resume.createdAt + 'Z').toLocaleString()}</div>
              {resume.parsed.summary && <p className="text-ink-600">{resume.parsed.summary}</p>}
              <div>
                <div className="font-semibold text-ink-700 mb-1.5">Detected skills</div>
                <div className="flex flex-wrap gap-1.5">
                  {(resume.parsed.detectedSkills || []).map((s: any) => (
                    <span key={s.skill} className="chip !text-[11px]">{s.skill} · {s.level}% {s.confidence < 0.6 ? '· needs confirmation' : ''}</span>
                  ))}
                </div>
              </div>
              {resume.parsed.projects?.length > 0 && <div><div className="font-semibold text-ink-700 mb-1.5">Projects</div><ul className="list-disc list-inside text-ink-600">{resume.parsed.projects.map((p: string) => <li key={p}>{p}</li>)}</ul></div>}
              {resume.parsed.certificates?.length > 0 && <div><div className="font-semibold text-ink-700 mb-1.5">Certificates</div><ul className="list-disc list-inside text-ink-600">{resume.parsed.certificates.map((c: string) => <li key={c}>{c}</li>)}</ul></div>}
            </div>
          ) : <p className="text-sm text-ink-400">No resume analyzed yet.</p>}
        </section>

        <section className="card p-6">
          <h2 className="font-display font-semibold mb-4 flex items-center gap-2"><FolderKanban size={17} /> Projects</h2>
          {projects.length === 0 ? <p className="text-sm text-ink-400">No projects added yet.</p> : (
            <div className="space-y-2.5">
              {projects.map((p: any) => (
                <div key={p.id} className="p-3.5 rounded-xl border border-ink-100">
                  <div className="font-medium text-sm">{p.title}</div>
                  {p.description && <p className="text-xs text-ink-500 mt-1 line-clamp-2">{p.description}</p>}
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="card p-6">
          <h2 className="font-display font-semibold mb-4 flex items-center gap-2"><Trophy size={17} /> Certificates</h2>
          {certificates.length === 0 ? <p className="text-sm text-ink-400">No certificates added yet.</p> : (
            <div className="space-y-2.5">
              {certificates.map((c: any) => (
                <div key={c.id} className="p-3.5 rounded-xl border border-ink-100 text-sm">
                  <span className="font-medium">{c.title}</span>
                  {c.issuer && <span className="text-ink-400"> · {c.issuer}</span>}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <section className="card p-6">
        <h2 className="font-display font-semibold mb-4">Your skills ({skills.length})</h2>
        <div className="flex flex-wrap gap-2">
          {skills.map((s: any) => <span key={s.name} className="chip">{s.name} · {s.level}% <Badge tone={s.source === 'earned' ? 'emerald' : s.source === 'resume_detected' ? 'brand' : 'slate'}>{s.source.replace('_', ' ')}</Badge></span>)}
        </div>
      </section>

      <div className="flex justify-end">
        <button className="btn-secondary text-sm !text-rose-600 !border-rose-200 hover:!bg-rose-50" onClick={logout}><LogOut size={15} /> Sign out</button>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v?: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-ink-50 pb-2.5">
      <dt className="text-ink-400 font-medium shrink-0">{k}</dt>
      <dd className="text-right text-ink-800">{v || '—'}</dd>
    </div>
  );
}
