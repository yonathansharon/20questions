// In production (Vercel) point to the deployed Render backend.
// In dev the Vite proxy handles /api → localhost:8001.
const BASE = (import.meta.env.VITE_API_URL ?? '/api')

async function req(method, path, body) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } }
  if (body !== undefined) opts.body = JSON.stringify(body)

  let res
  try {
    res = await fetch(BASE + path, opts)
  } catch {
    throw new Error('השרת לא מחובר — הפעל את FastAPI:\n  uvicorn main:app --reload')
  }

  if (!res.ok) {
    let detail = null
    try { detail = (await res.json()).detail } catch { /* HTML error page */ }

    if (res.status >= 500)
      throw new Error(`שגיאת שרת (${res.status}) — בדוק את לוג ה-Backend`)
    if (res.status === 404) throw new Error('הפריט לא נמצא')
    if (res.status === 422) throw new Error('נתונים שגויים — בדוק את השדות')
    throw new Error(detail || res.statusText)
  }

  if (res.status === 204) return null
  return res.json()
}

export const api = {
  // Quiz
  getQuestions:  ()     => req('GET',    '/questions'),

  // Sources
  listSources:   ()     => req('GET',    '/sources'),
  createSource:  (body) => req('POST',   '/sources', body),
  deleteSource:  (id)   => req('DELETE', `/sources/${id}`),
  ingestSource:  (id)   => req('POST',   `/sources/${id}/ingest`),

  // Jobs
  getJob:          (id) => req('GET',    `/jobs/${id}`),
  recentJobs:      ()   => req('GET',    '/jobs/recent'),
  rejectionsDebug: ()   => req('GET',    '/debug/rejections'),

  // Evaluation
  getLatestEval: ()     => req('GET',    '/eval/latest'),
  runEval:       ()     => req('POST',   '/eval/run'),

  // Stats
  getStats:      ()     => req('GET',    '/stats'),

  // Skills
  listSkills:          ()      => req('GET',    '/skills'),
  createSkill:         (body)  => req('POST',   '/skills', body),
  deleteSkill:         (id)    => req('DELETE', `/skills/${id}`),
  generateSkillPrompts:(goal)  => req('POST',   '/skills/generate-prompts', { goal }),

  // Admin — question management
  adminQuestions:  (status = 'active') => req('GET',    `/admin/questions?status=${status}`),
  deleteQuestion:  (id)                => req('DELETE', `/admin/questions/${id}`),
  refineQuestion:  (id, action)        => req('POST',   `/admin/questions/${id}/refine`, { action }),

  // Health
  health:        ()     => req('GET',    '/health'),
}
