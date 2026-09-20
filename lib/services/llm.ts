// Central LLM access for all AI services. When OPENAI_API_KEY is absent every
// service falls back to deterministic local logic, so the product fully works
// offline. All structured outputs are schema-validated before use.

const KEY = process.env.OPENAI_API_KEY || '';
const MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

export function aiEnabled(): boolean {
  return KEY.length > 10;
}

async function chat(system: string, user: string, maxTokens = 900): Promise<string> {
  const resp = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      max_tokens: maxTokens,
      temperature: 0.4,
    }),
  });
  if (!resp.ok) throw new Error(`AI request failed (${resp.status})`);
  const data = await resp.json();
  return data.choices?.[0]?.message?.content ?? '';
}

// Extract the first JSON object/array from an LLM response (handles code fences).
function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fenced ? fenced[1] : text;
  const start = raw.search(/[[{]/);
  if (start === -1) throw new Error('No JSON found in AI response.');
  const sliced = raw.slice(start);
  try {
    return JSON.parse(sliced);
  } catch {
    // try trimming to the last closing bracket
    const lastObj = sliced.lastIndexOf('}');
    const lastArr = sliced.lastIndexOf(']');
    const end = Math.max(lastObj, lastArr);
    if (end > 0) return JSON.parse(sliced.slice(0, end + 1));
    throw new Error('Malformed JSON from AI.');
  }
}

// Parse + validate with retry. Never throws out of this module unless both
// attempts fail, in which case callers fall back to deterministic logic.
export async function generateStructured<T>(
  system: string,
  user: string,
  validate: (data: unknown) => T,
  maxTokens = 900,
  retries = 1
): Promise<T | null> {
  if (!aiEnabled()) return null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const text = await chat(system, user, maxTokens);
      const json = extractJson(text);
      return validate(json);
    } catch (err) {
      if (attempt === retries) {
        console.error('[ai] structured generation failed:', (err as Error).message);
        return null;
      }
    }
  }
  return null;
}

export async function generateText(system: string, user: string, maxTokens = 700): Promise<string | null> {
  if (!aiEnabled()) return null;
  try {
    return await chat(system, user, maxTokens);
  } catch (err) {
    console.error('[ai] text generation failed:', (err as Error).message);
    return null;
  }
}
