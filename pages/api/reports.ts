import { ok, fail, withUser } from '@/lib/api';
import { buildWeeklyReport } from '@/lib/services/progress';
import { getDb } from '@/lib/db';
import { uid } from '@/lib/db';

export default withUser(async ({ req, res, user }) => {
  const db = getDb();

  if (req.method === 'GET' && req.query.view === 'download') {
    const report = buildWeeklyReport(user.id);
    const html = renderReportHtml(user.name, report);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Disposition', 'inline; filename="edupath-weekly-report.html"');
    return res.status(200).send(html);
  }

  if (req.method === 'GET') {
    const rows = db.prepare('SELECT id, week_start, report_json, created_at FROM weekly_reports WHERE user_id = ? ORDER BY created_at DESC LIMIT 8').all(user.id) as any[];
    let latest = null;
    if (rows.length) {
      latest = JSON.parse(rows[0].report_json);
    }
    return ok(res, { latest, history: rows.map(r => ({ id: r.id, weekStart: r.week_start, createdAt: r.created_at })) });
  }

  if (req.method === 'POST') {
    const report = buildWeeklyReport(user.id);
    const id = uid();
    const weekStart = new Date(Date.now() - 7 * 86400_000).toISOString().slice(0, 10);
    db.prepare('INSERT INTO weekly_reports (id, user_id, week_start, report_json) VALUES (?,?,?,?)')
      .run(id, user.id, weekStart, JSON.stringify(report));
    return ok(res, { report, id });
  }

  return fail(res, 405, 'Method not allowed.');
});

function renderReportHtml(name: string, report: any): string {
  const esc = (s: unknown) => String(s ?? '').replace(/[<>&]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c] as string));
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>EduPath Weekly Report</title>
  <style>
    body { font-family: -apple-system, Segoe UI, sans-serif; margin: 40px auto; max-width: 720px; color: #161927; }
    h1 { color: #3943c8; } h2 { border-bottom: 2px solid #dfe9ff; padding-bottom: 6px; margin-top: 32px; }
    .kpi { display: flex; gap: 16px; } .kpi div { flex: 1; background: #eef4ff; border-radius: 12px; padding: 14px; text-align: center; }
    .kpi b { font-size: 28px; color: #303aa0; display: block; }
    li { margin: 6px 0; } .muted { color: #677297; }
    @media print { body { margin: 12mm; } }
  </style></head><body>
  <h1>EduPath Weekly Report</h1>
  <p class="muted">Prepared for ${esc(name)} · week of ${esc(report.weekStart)} · generated ${new Date().toLocaleString()}</p>
  <div class="kpi">
    <div><b>${report.readiness}%</b>Learning Readiness</div>
    <div><b>${report.tasksCompleted}</b>Tasks completed</div>
    <div><b>${report.learningHours}h</b>Learning hours</div>
  </div>
  <h2>Skills acquired</h2><ul>${(report.skillsAcquired || []).map((s: string) => `<li>${esc(s)}</li>`).join('') || '<li class="muted">None yet this period.</li>'}</ul>
  <h2>Struggle areas</h2><ul>${(report.struggleAreas || []).map((s: any) => `<li><b>${esc(s.skill)}</b> — severity ${s.severity}: ${esc((s.evidence || []).join('; '))}</li>`).join('') || '<li class="muted">None detected. 🎉</li>'}</ul>
  <h2>Assessment performance</h2><ul>${(report.assessmentPerformance || []).map((a: any) => `<li>${a.label}: ${a.score}%</li>`).join('') || '<li class="muted">No assessments yet.</li>'}</ul>
  <h2>Roadmap changes</h2><ul>${(report.roadmapChanges || []).map((c: string) => `<li>${esc(c)}</li>`).join('') || '<li class="muted">No changes this week.</li>'}</ul>
  <h2>Recommended next steps</h2><ul>${(report.recommendedNextSteps || []).map((s: string) => `<li>${esc(s)}</li>`).join('')}</ul>
  <p class="muted">EduPath — Know where you are. Know where to go. Let AI build the path. Readiness is a learning-progress metric, not a hiring prediction.</p>
  </body></html>`;
}
