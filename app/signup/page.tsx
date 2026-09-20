'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Compass } from 'lucide-react';
import { AuthShell } from '@/components/AuthShell';

export default function Signup() {
  const router = useRouter();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      let data: any = null;
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        try {
          data = await res.json();
        } catch {
          data = null;
        }
      }

      if (!res.ok) {
        const errorMsg =
          data?.message ||
          data?.error ||
          (res.status === 404
            ? 'Registration endpoint not found (404). Please verify deployment.'
            : res.status >= 500
            ? 'Server error occurred during registration. Please try again.'
            : `Registration failed with status ${res.status}`);
        throw new Error(errorMsg);
      }

      if (data && (data.success === false || data.ok === false)) {
        throw new Error(data.message || data.error || 'Signup failed');
      }

      router.push(data?.redirect || '/onboarding');
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
      setLoading(false);
    }
  }

  return (
    <AuthShell title="Create your EduPath account" subtitle="Two minutes of setup. A roadmap that adapts for months.">
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label" htmlFor="name">Your name</label>
          <input id="name" className="input" required maxLength={80} value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Aarav Sharma" />
        </div>
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input id="email" className="input" type="email" required value={form.email}
            onChange={e => setForm({ ...form, email: e.target.value })} placeholder="you@college.edu" />
        </div>
        <div>
          <label className="label" htmlFor="password">Password</label>
          <input id="password" className="input" type="password" required minLength={8} value={form.password}
            onChange={e => setForm({ ...form, password: e.target.value })} placeholder="At least 8 characters" />
        </div>
        {error && <div className="rounded-xl bg-rose-50 border border-rose-100 text-rose-600 text-sm px-4 py-3">{error}</div>}
        <button className="btn-primary w-full" disabled={loading}>{loading ? 'Creating account…' : 'Create account'}</button>
      </form>
      <p className="text-sm text-ink-500 mt-5 text-center">
        Already have an account? <Link href="/login" className="text-brand-600 font-semibold hover:underline">Sign in</Link>
      </p>
    </AuthShell>
  );
}

