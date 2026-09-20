'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  BrainCircuit, Map, LineChart, RefreshCcw, MessageSquareHeart, Sparkles,
  ShieldCheck, ArrowRight, Check, ChevronDown, GitBranch, Target, Zap, Compass,
} from 'lucide-react';

const PIPELINE = [
  { icon: '🎯', label: 'Current Skills' },
  { icon: '🧠', label: 'AI Analysis' },
  { icon: '🧩', label: 'Skill Gaps' },
  { icon: '🗺️', label: 'Learning Path' },
  { icon: '🏆', label: 'Career Goal' },
];

const FEATURES = [
  { icon: BrainCircuit, title: 'Resume Intelligence', body: 'Upload your resume and get skills, projects and certificates extracted with evidence — nothing invented, low-confidence items flagged "Needs confirmation".' },
  { icon: Target, title: 'Skill-Gap Engine', body: 'Your profile is compared against a structured knowledge base for 9+ career roles. See Learning Readiness, biggest gaps and critical missing skills.' },
  { icon: Map, title: 'Personalized Roadmap', body: 'A week-by-week plan built around your gaps, study time and learning style — with the "why" behind every objective.' },
  { icon: RefreshCcw, title: 'Adaptive Agent', body: 'Score low and the plan slows down, adds reinforcement and reschedules. Score high and it accelerates. Every change is explained and versioned.' },
  { icon: LineChart, title: 'Skill Twin + What-If', body: 'A living model of your skills — simulate "2 weeks of DSA only" or "switch to backend" and compare paths before committing.' },
  { icon: MessageSquareHeart, title: 'AI Learning Coach', body: 'A chat that knows your roadmap, scores and struggle areas — so "what should I study today?" gets a real answer, not a generic one.' },
];

const ROLES = ['Software Engineer', 'Frontend Developer', 'Backend Developer', 'Full Stack Developer', 'Data Scientist', 'Data Analyst', 'AI/ML Engineer', 'Cybersecurity Analyst', 'Cloud Engineer'];

export default function Landing() {
  const router = useRouter();
  const [demoLoading, setDemoLoading] = useState(false);

  async function tryDemo() {
    setDemoLoading(true);
    try {
      const res = await fetch('/api/auth/demo', { method: 'POST' });
      let data: any = null;
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        try { data = await res.json(); } catch { data = null; }
      }
      if (data && (data.ok || data.success)) router.push('/dashboard');
      else setDemoLoading(false);
    } catch {
      setDemoLoading(false);
    }
  }

  return (
    <div className="min-h-screen">
      {/* Nav */}
      <header className="sticky top-0 z-40 glass-card border-b border-white/40 rounded-none">
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white shadow-glow">
              <Compass size={19} />
            </div>
            <div>
              <div className="font-display font-bold text-ink-900 leading-none tracking-tight">EduPath</div>
              <div className="text-[10px] text-ink-400 font-medium tracking-wide uppercase">Adaptive Learning Agent</div>
            </div>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-ink-600">
            <a href="#how" className="hover:text-brand-700 transition">How it works</a>
            <a href="#features" className="hover:text-brand-700 transition">Features</a>
            <a href="#paths" className="hover:text-brand-700 transition">Career paths</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/login" className="btn-ghost text-sm">Sign in</Link>
            <Link href="/signup" className="btn-primary text-sm">Get started</Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-brand-50/60 via-transparent to-transparent" />
        <div className="max-w-6xl mx-auto px-5 pt-16 pb-20 md:pt-24 md:pb-28 grid lg:grid-cols-2 gap-12 items-center">
          <div className="animate-fade-up">
            <div className="chip border-brand-200 text-brand-700 mb-5"><Sparkles size={13} /> AI Agent Hackathon 2026</div>
            <h1 className="font-display text-4xl md:text-6xl font-extrabold tracking-tight text-ink-950 leading-[1.05]">
              Know where you are.<br />
              Know where to go.<br />
              <span className="bg-gradient-to-r from-brand-600 via-brand-500 to-accent-500 bg-clip-text text-transparent">Let AI build the path.</span>
            </h1>
            <p className="mt-6 text-lg text-ink-600 leading-relaxed max-w-xl">
              An adaptive AI learning agent that analyzes your skills, identifies career gaps, builds your
              learning roadmap, and continuously adapts it as you grow.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/signup" className="btn-primary text-base px-7 py-3">
                Build My Learning Path <ArrowRight size={17} />
              </Link>
              <button onClick={tryDemo} disabled={demoLoading} className="btn-secondary text-base px-7 py-3">
                {demoLoading ? 'Preparing demo…' : 'Explore Demo'}
              </button>
            </div>
            <div className="mt-6 flex items-center gap-4 text-xs text-ink-400">
              <span className="flex items-center gap-1"><ShieldCheck size={13} /> Your data stays yours</span>
              <span className="flex items-center gap-1"><Zap size={13} /> Works offline with built-in engine</span>
            </div>
          </div>

          {/* Animated pipeline visual */}
          <div className="relative animate-fade-in [animation-delay:150ms]">
            <div className="card p-6 sm:p-8 max-w-md mx-auto">
              <div className="text-xs font-semibold text-ink-400 uppercase tracking-widest mb-5">The EduPath loop</div>
              <div className="flex flex-col gap-0">
                {PIPELINE.map((step, i) => (
                  <div key={step.label}>
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shadow-card transition-all
                        ${i === 1 ? 'bg-gradient-to-br from-brand-500 to-brand-700 text-white' : 'bg-ink-50 border border-ink-100'}`}
                        style={{ animation: i === 1 ? 'float 3s ease-in-out infinite' : undefined }}>
                        {step.icon}
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-semibold text-ink-800">{step.label}</div>
                      </div>
                    </div>
                    {i < PIPELINE.length - 1 && (
                      <div className="ml-5 h-5 w-px bg-gradient-to-b from-brand-300 to-brand-100 animate-pulse" />
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-4 rounded-xl bg-brand-50 border border-brand-100 p-3 text-xs text-brand-800 flex gap-2">
                <RefreshCcw size={14} className="shrink-0 mt-0.5" />
                …then the loop repeats: every result you log makes the next plan smarter.
              </div>
            </div>
            {/* floating mini-cards */}
            <div className="hidden md:block absolute -left-4 top-8 card px-4 py-3 animate-float shadow-lift">
              <div className="text-[10px] text-ink-400 font-semibold uppercase">Readiness</div>
              <div className="font-display font-bold text-brand-700 text-lg">78%</div>
            </div>
            <div className="hidden md:block absolute -right-2 bottom-10 card px-4 py-3 animate-float [animation-delay:1.2s] shadow-lift">
              <div className="text-[10px] text-ink-400 font-semibold uppercase">Plan adapted</div>
              <div className="text-xs font-semibold text-ink-700">+ recursion revision</div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="py-20 bg-white/60 border-y border-ink-100">
        <div className="max-w-6xl mx-auto px-5">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="section-title">How EduPath works</h2>
            <p className="mt-3 text-ink-500">Four steps. One continuously improving loop.</p>
          </div>
          <div className="grid md:grid-cols-4 gap-5">
            {[
              { n: '01', t: 'Describe yourself', b: 'Skills, level, target role, study time — or just upload your resume and confirm what we detect.' },
              { n: '02', t: 'See your gaps', b: 'A skill map against your target role: strong, developing, needs-work, missing — plus Learning Readiness.' },
              { n: '03', t: 'Follow your path', b: 'Daily missions, weekly milestones, curated resources, practice sets and projects matched to you.' },
              { n: '04', t: 'Let it adapt', b: 'Every quiz, skip and project feeds back. EduPath re-plans and always shows you why.' },
            ].map(s => (
              <div key={s.n} className="card p-6 hover:shadow-lift transition group">
                <div className="font-display text-3xl font-extrabold text-brand-200 group-hover:text-brand-400 transition">{s.n}</div>
                <h3 className="font-display font-semibold mt-3">{s.t}</h3>
                <p className="text-sm text-ink-500 mt-2 leading-relaxed">{s.b}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20">
        <div className="max-w-6xl mx-auto px-5">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="section-title">An agent, not a chatbot</h2>
            <p className="mt-3 text-ink-500">Every module reads and writes your learning memory.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map(f => (
              <div key={f.title} className="card p-6 hover:shadow-lift hover:-translate-y-0.5 transition">
                <div className="w-11 h-11 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center mb-4">
                  <f.icon size={21} />
                </div>
                <h3 className="font-display font-semibold">{f.title}</h3>
                <p className="text-sm text-ink-500 mt-2 leading-relaxed">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Skill-gap viz + coach preview */}
      <section className="py-20 bg-gradient-to-b from-brand-950 to-ink-950 text-white">
        <div className="max-w-6xl mx-auto px-5 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="font-display text-3xl font-bold">Your gaps, made visual</h2>
            <p className="mt-3 text-brand-100/80 leading-relaxed">
              EduPath compares every skill you have (or don't) against your target role's requirements — then
              prioritizes what to learn first by impact, not guesswork.
            </p>
            <ul className="mt-6 space-y-3 text-sm">
              {['Skill dependency graph — see what unlocks what', 'Struggle detection from your real results', 'Weekly reports you can download and share'].map(x => (
                <li key={x} className="flex gap-2.5"><Check size={16} className="text-accent-400 shrink-0 mt-0.5" /> {x}</li>
              ))}
            </ul>
          </div>
          <div className="space-y-3">
            {[
              { n: 'Python', v: 80 }, { n: 'Data Structures & Algorithms', v: 40 },
              { n: 'Java', v: 20 }, { n: 'Git & GitHub', v: 50 }, { n: 'React', v: 65 },
            ].map((s, i) => (
              <div key={s.n} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 backdrop-blur">
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="font-medium">{s.n}</span>
                  <span className="text-brand-200">{s.v}%</span>
                </div>
                <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-brand-400 to-accent-400"
                    style={{ width: `${s.v}%`, animation: `grow-width 1s ease-out ${i * 120}ms both` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Career paths */}
      <section id="paths" className="py-20">
        <div className="max-w-6xl mx-auto px-5">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="section-title">Supported career paths</h2>
            <p className="mt-3 text-ink-500">Structured requirement templates for nine roles — or define your own and EduPath builds the framework.</p>
          </div>
          <div className="flex flex-wrap justify-center gap-2.5 max-w-3xl mx-auto">
            {ROLES.map(r => <span key={r} className="chip hover:border-brand-300 hover:text-brand-700 transition cursor-default">{r}</span>)}
          </div>
        </div>
      </section>

      {/* Privacy */}
      <section className="py-14 border-t border-ink-100">
        <div className="max-w-4xl mx-auto px-5 text-center">
          <ShieldCheck className="mx-auto text-brand-600" size={28} />
          <h2 className="section-title mt-3">Private by design</h2>
          <p className="mt-3 text-ink-500 text-sm leading-relaxed max-w-xl mx-auto">
            Resumes and learning data are stored per-user with strict access checks — you only ever see your own.
            AI features are optional; without an API key EduPath runs entirely on its built-in engine.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="pb-24">
        <div className="max-w-4xl mx-auto px-5">
          <div className="rounded-3xl bg-gradient-to-br from-brand-600 to-brand-800 text-white p-10 md:p-14 text-center shadow-lift relative overflow-hidden">
            <GitBranch size={120} className="absolute -right-6 -top-6 text-white/10 rotate-12" />
            <h2 className="font-display text-3xl md:text-4xl font-bold">Ready to see your path?</h2>
            <p className="mt-3 text-brand-100 max-w-lg mx-auto">Two minutes of onboarding. A roadmap that keeps adapting long after.</p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link href="/signup" className="inline-flex items-center gap-2 rounded-xl bg-white text-brand-700 font-semibold px-7 py-3 hover:bg-brand-50 transition">
                Build My Learning Path <ArrowRight size={17} />
              </Link>
              <button onClick={tryDemo} disabled={demoLoading} className="inline-flex items-center gap-2 rounded-xl border border-white/30 text-white font-semibold px-7 py-3 hover:bg-white/10 transition">
                {demoLoading ? 'Preparing…' : 'Try the demo learner'}
              </button>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-ink-100 py-8">
        <div className="max-w-6xl mx-auto px-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-ink-400">
          <div className="flex items-center gap-2"><Compass size={14} /> EduPath — AI Agent Hackathon 2026</div>
          <div>Learning Readiness measures learning progress. It does not predict hiring outcomes.</div>
        </div>
      </footer>
    </div>
  );
}
