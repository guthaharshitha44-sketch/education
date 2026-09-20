'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AuthShell } from '@/components/AuthShell';

export default function Login() {
  const router = useRouter();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'Login failed');
      router.push(data.redirect || '/dashboard');
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  }

  return (
    <AuthShell title="Welcome back" subtitle="Sign in to continue your learning path.">
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input id="email" className="input" type="email" required value={form.email}
            onChange={e => setForm({ ...form, email: e.target.value })} placeholder="you@college.edu" />
        </div>
        <div>
          <label className="label" htmlFor="password">Password</label>
          <input id="password" className="input" type="password" required value={form.password}
            onChange={e => setForm({ ...form, password: e.target.value })} placeholder="Your password" />
        </div>
        {error && <div className="rounded-xl bg-rose-50 border border-rose-100 text-rose-600 text-sm px-4 py-3">{error}</div>}
        <button className="btn-primary w-full" disabled={loading}>{loading ? 'Signing in…' : 'Sign in'}</button>
      </form>
      <div className="flex justify-between text-sm mt-5">
        <Link href="/forgot" className="text-ink-500 hover:text-brand-600">Forgot password?</Link>
        <Link href="/signup" className="text-brand-600 font-semibold hover:underline">Create account</Link>
      </div>
    </AuthShell>
  );
}
