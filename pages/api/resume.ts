import type { NextApiRequest, NextApiResponse } from 'next';
import { ok, fail, withUser } from '@/lib/api';
import { analyzeResumeText, aiResumeEnhance } from '@/lib/services/resume';
import { getDb, uid } from '@/lib/db';
import { SKILLS } from '@/lib/domain/skills';

export const config = { api: { bodyParser: false } }; // raw stream upload (UI sends file bytes as body)

const MAX_BYTES = 4 * 1024 * 1024; // 4 MB
const ALLOWED = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];

async function readRawBody(req: NextApiRequest): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (c: Buffer) => {
      chunks.push(c);
      if (chunks.reduce((a, b) => a + b.length, 0) > MAX_BYTES) {
        reject(new Error('File too large (max 4 MB).'));
        req.destroy();
      }
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function extractTextFromPdf(buf: Buffer): string {
  // Lightweight PDF text extraction: decompress FlateDecode streams and pull text operators.
  const zlib = require('zlib') as typeof import('zlib');
  const raw = buf.toString('latin1');
  const texts: string[] = [];
  const streamRe = /stream\r?\n([\s\S]*?)endstream/g;
  let m: RegExpExecArray | null;
  while ((m = streamRe.exec(raw)) && texts.length < 60) {
    const chunk = m[1];
    let content = chunk;
    try { content = zlib.inflateSync(Buffer.from(chunk, 'latin1')).toString('latin1'); } catch { /* uncompressed stream */ }
    // pull (...) show-text operators
    const textRe = /\(((?:\\.|[^\\()])*)\)\s*Tj|\[((?:\\.|[^\]])*)\]\s*TJ/g;
    let t: RegExpExecArray | null;
    while ((t = textRe.exec(content))) {
      const piece = (t[1] ?? t[2] ?? '')
        .replace(/\\([()\\])/g, '$1')
        .replace(/\\n/g, ' ');
      if (piece.trim()) texts.push(piece);
    }
  }
  return texts.join('\n').replace(/[ \t]+/g, ' ').trim();
}

function extractTextFromDocx(buf: Buffer): string {
  const zlib = require('zlib') as typeof import('zlib');
  // docx is a zip; find document.xml entry via local file headers
  let xml = '';
  let idx = 0;
  const latin = buf;
  while (idx < latin.length - 4) {
    const sig = latin.readUInt32LE(idx);
    if (sig === 0x04034b50) {
      const method = latin.readUInt16LE(idx + 8);
      const compSize = latin.readUInt32LE(idx + 18);
      const nameLen = latin.readUInt16LE(idx + 26);
      const extraLen = latin.readUInt16LE(idx + 28);
      const name = latin.slice(idx + 30, idx + 30 + nameLen).toString('utf8');
      const dataStart = idx + 30 + nameLen + extraLen;
      if (name === 'word/document.xml' && method === 8) {
        const comp = latin.slice(dataStart, dataStart + compSize);
        xml = zlib.inflateRawSync(comp).toString('utf8');
        break;
      }
      idx = dataStart + compSize;
    } else idx++;
  }
  if (!xml) return '';
  return xml
    .replace(/<w:p[ >]/g, '\n<w:p ')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}

export default withUser(async ({ req, res, user }) => {
  const db = getDb();

  if (req.method === 'GET') {
    const rows = db.prepare('SELECT id, filename, parsed_json, created_at FROM resumes WHERE user_id = ? ORDER BY created_at DESC LIMIT 5').all(user.id) as any[];
    return ok(res, {
      resumes: rows.map(r => ({ id: r.id, filename: r.filename, createdAt: r.created_at, parsed: r.parsed_json ? JSON.parse(r.parsed_json) : null })),
      catalog: SKILLS.map(s => s.name),
    });
  }

  if (req.method === 'POST') {
    let buf: Buffer;
    try { buf = await readRawBody(req); } catch (e: any) { return fail(res, 413, e.message || 'File too large.'); }
    if (buf.length === 0) return fail(res, 400, 'No file received. Please choose a file first.');

    const mime = (req.headers['content-type'] as string || '').split(';')[0].trim();
    const isPdf = mime === 'application/pdf' || (buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46);
    const isDocx = mime.includes('wordprocessingml') || (buf[0] === 0x50 && buf[1] === 0x4b);
    const isTxt = mime === 'text/plain';
    if (!isPdf && !isDocx && !isTxt) return fail(res, 415, 'Unsupported file type. Please upload a text-based PDF or DOCX.');

    let text = '';
    if (isPdf) text = extractTextFromPdf(buf);
    else if (isDocx) text = extractTextFromDocx(buf);
    else text = buf.toString('utf8');

    if (text.replace(/\s/g, '').length < 60) {
      return fail(res, 422, "Unable to analyze this file. Please upload a text-based PDF or DOCX (scanned images aren't supported).");
    }

    const analysis = analyzeResumeText(text);
    const ai = await aiResumeEnhance(text);
    if (ai?.summary) analysis.summary = ai.summary;
    if (ai?.extraSkills?.length) {
      const have = new Set(analysis.detectedSkills.map(s => s.skill));
      for (const s of ai.extraSkills) {
        if (!have.has(s)) analysis.detectedSkills.push({ skill: s, level: 30, confidence: 0.5, evidence: ['ai_detected'] });
      }
      analysis.needsConfirmation.push(...ai.extraSkills);
    }

    db.prepare('INSERT INTO resumes (id, user_id, filename, mime, text, parsed_json) VALUES (?,?,?,?,?,?)')
      .run(uid(), user.id, (req.headers['x-filename'] as string || 'resume').slice(0, 120), mime, text.slice(0, 100_000), JSON.stringify(analysis));

    return ok(res, { analysis, aiUsed: !!ai });
  }

  if (req.method === 'PUT') {
    // User corrections to extracted data
    const body = req.body || {};
    const latest = db.prepare('SELECT id FROM resumes WHERE user_id = ? ORDER BY created_at DESC LIMIT 1').get(user.id) as any;
    if (!latest) return fail(res, 404, 'No resume on file.');
    const parsed = db.prepare('SELECT parsed_json FROM resumes WHERE id = ?').get(latest.id) as any;
    const current = JSON.parse(parsed.parsed_json || '{}');
    const next = { ...current, ...body };
    db.prepare('UPDATE resumes SET parsed_json = ? WHERE id = ?').run(JSON.stringify(next), latest.id);
    return ok(res, { analysis: next });
  }

  return fail(res, 405, 'Method not allowed.');
});
