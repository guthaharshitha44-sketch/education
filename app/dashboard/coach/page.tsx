'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import { api } from '@/lib/client';
import { useToast } from '@/components/ui/Toast';
import { Skeleton, Badge } from '@/components/ui/Misc';
import { MessageSquareText, Send, Bot, User as UserIcon } from 'lucide-react';

const QUICK = [
  'What should I study today?',
  'Why did my roadmap change?',
  'What are my biggest gaps?',
  'I only have 30 minutes today.',
  'Which skill should I focus on next?',
  'Why am I struggling with DSA?',
];

export default function CoachPage() {
  const { toast } = useToast();
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [source, setSource] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api('/api/coach').then(d => setMessages(d.messages || [])).catch(() => {});
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function send(text?: string) {
    const q = (text ?? input).trim();
    if (!q || sending) return;
    setInput('');
    setSending(true);
    setMessages(m => [...m, { role: 'user', content: q }]);
    try {
      const d = await api('/api/coach', { method: 'POST', body: { message: q } });
      setSource(d.source);
      setMessages(m => [...m, { role: 'assistant', content: d.answer }]);
    } catch (e: any) {
      setMessages(m => [...m, { role: 'assistant', content: `Sorry — I couldn't answer right now (${e.message}). Your progress is safe; try again in a moment.` }]);
    } finally { setSending(false); }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] min-h-[520px]">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2.5"><MessageSquareText size={24} className="text-brand-600" /> AI Learning Coach</h1>
          <p className="text-ink-500 text-sm mt-1">Knows your roadmap, scores, struggles and today's plan — not a generic chatbot.</p>
        </div>
        <Badge tone={source === 'ai' ? 'brand' : 'slate'}>{source === 'ai' ? 'AI model connected' : 'EduPath engine'}</Badge>
      </div>

      <div className="card flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <Bot size={36} className="text-brand-200 mb-3" />
              <p className="text-sm text-ink-400 max-w-sm">Ask me anything about your learning path. I use your actual EduPath data to answer.</p>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`flex gap-3 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${m.role === 'user' ? 'bg-ink-100 text-ink-500' : 'bg-gradient-to-br from-brand-500 to-brand-700 text-white'}`}>
                {m.role === 'user' ? <UserIcon size={15} /> : <Bot size={15} />}
              </div>
              <div className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap
                ${m.role === 'user' ? 'bg-brand-600 text-white rounded-br-md' : 'bg-ink-50 text-ink-800 rounded-bl-md'}`}>
                {m.content}
              </div>
            </div>
          ))}
          {sending && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 text-white flex items-center justify-center"><Bot size={15} /></div>
              <div className="bg-ink-50 rounded-2xl rounded-bl-md px-4 py-3 flex gap-1.5 items-center">
                {[0, 1, 2].map(i => <span key={i} className="w-1.5 h-1.5 rounded-full bg-ink-300 animate-pulse-dot" style={{ animationDelay: `${i * 200}ms` }} />)}
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* quick prompts */}
        <div className="px-5 pb-2 flex flex-wrap gap-2">
          {QUICK.map(q => (
            <button key={q} onClick={() => send(q)} className="chip hover:border-brand-300 hover:text-brand-700 transition !py-1.5">{q}</button>
          ))}
        </div>

        <form className="border-t border-ink-100 p-4 flex gap-2" onSubmit={(e: FormEvent) => { e.preventDefault(); send(); }}>
          <input className="input flex-1" value={input} onChange={e => setInput(e.target.value)}
            placeholder="Ask your coach… e.g. “What should I study today?”" aria-label="Message the coach" />
          <button className="btn-primary" disabled={sending || !input.trim()} aria-label="Send"><Send size={16} /></button>
        </form>
      </div>
    </div>
  );
}
