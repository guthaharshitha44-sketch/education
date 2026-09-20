'use client';

export async function api<T = any>(
  path: string,
  options: { method?: string; body?: unknown; rawBody?: BodyInit; headers?: Record<string, string> } = {}
): Promise<T & { ok: boolean; error?: string }> {
  const { method = 'GET', body, rawBody, headers = {} } = options;
  const res = await fetch(path, {
    method,
    headers: {
      ...(rawBody ? { 'Content-Type': headers['Content-Type'] || 'application/pdf' } : body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...headers,
    },
    body: rawBody || (body !== undefined ? JSON.stringify(body) : undefined),
    credentials: 'same-origin',
  });
  let data: any = {};
  try { data = await res.json(); } catch { /* non-JSON (download endpoints) */ }
  if (!res.ok) throw new Error(data.message || data.error || `Request failed (${res.status})`);
  return data;
}
