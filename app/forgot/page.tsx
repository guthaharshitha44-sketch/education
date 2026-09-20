'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AuthShell } from '@/components/AuthShell';
import { useToast } from '@/components/ui/Toast';

export default function Forgot() {
  const router = useRouter();
  const { toast } = useToast();
  const [stage, setStage] = useState<'request' | 'confirm'>('request');
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);

  async function requestToken(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch('/api/auth/reset-request', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }),
    });
    const data = await res.json();
    setLoading(false);
    if (data.ok && data.token) {
      setToken(data.token);
      setStage('confirm');
      setMsg('Identity verified for the demo — set a new password below. (In production this token would be emailed.)');
    } else if (data.ok) {
      setMsg("If that email exists, a reset link has been sent. (Demo note: no email service is configured, so no token is shown.)");
    } else {
      setMsg(data.error || 'Something went wrong.');
    }
  }

  async function confirmReset(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch('/api/auth/reset-confirm', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, password }),
    });
    const data = await res.json();
    setLoading(false);
    if (data.ok) {
      toast('Password updated. Sign in with your new password.', 'success');
      router.push('/login');
    } else {
      setMsg(data.error || 'Reset failed.');
    }
  }

  return (
    <AuthShell title="Reset your password" subtitle="We'll verify your account and let you set a new password.">
      {stage === 'request' ? (
        <form onSubmit={requestToken} className="space-y-4">
          <div>
            <label className="label" htmlFor="email">Account email</label>
            <input id="email" className="input" type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@college.edu" />
          </div>
          <button className="btn-primary w-full" disabled={loading}>{loading ? 'Checking…' : 'Continue'}</button>
        </form>
      ) : (
        <form onSubmit={confirmReset} className="space-y-4">
          {msg && <div className="rounded-xl bg-brand-50 border border-brand-100 text-brand-800 text-sm px-4 py-3">{msg}</div>}
          <div>
            <label className="label" htmlFor="password">New password</label>
            <input id="password" className="input" type="password" required minLength={8} value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 8 characters" />
          </div>
          <button className="btn-primary w-full" disabled={loading}>{loading ? 'Updating…' : 'Set new password'}</button>
        </form>
      )}
      <p className="text-sm text-ink-500 mt-5 text-center">
        <a href="/login" className="text-brand-600 font-semibold hover:underline">Back to sign in</a>
      </p>
    </AuthShell>
  );
}
