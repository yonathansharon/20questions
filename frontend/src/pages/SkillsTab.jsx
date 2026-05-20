import { useState, useEffect, useCallback } from 'react'
import { api } from '../api.js'

function OfflineState() {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center">
      <p className="text-5xl mb-4">🔌</p>
      <p className="text-lg font-bold text-gray-700 mb-1">Backend לא מחובר</p>
      <p className="text-sm text-gray-400">הפעל את השרת כדי לנהל כישורי יצירה</p>
    </div>
  )
}

function SkillCard({ skill, onDelete }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div
      className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow"
      style={{ borderTop: `4px solid ${skill.color}` }}
    >
      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{skill.icon}</span>
            <div>
              <h3 className="font-black text-gray-900 text-base leading-tight">{skill.name}</h3>
              {skill.is_builtin ? (
                <span className="text-xs text-gray-400 font-medium">מובנה</span>
              ) : (
                <span className="text-xs text-blue-500 font-medium">מותאם אישית</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="text-xs font-bold px-2 py-1 rounded-full text-white"
              style={{ backgroundColor: skill.color }}
            >
              {skill.source_count ?? 0} מקורות
            </span>
          </div>
        </div>

        <p className="text-sm text-gray-600 leading-relaxed mb-3">{skill.description}</p>

        <button
          onClick={() => setExpanded(v => !v)}
          className="text-xs text-gray-400 hover:text-gray-700 transition-colors flex items-center gap-1"
        >
          {expanded ? '▲ הסתר פרומפטים' : '▼ הצג פרומפטים'}
        </button>

        {expanded && (
          <div className="mt-3 space-y-3">
            <div className="bg-purple-50 rounded-xl p-3">
              <p className="text-xs font-bold text-purple-700 mb-1">Agent A — Researcher Hint</p>
              <p className="text-xs text-purple-900 leading-relaxed font-mono whitespace-pre-wrap">
                {skill.researcher_hint}
              </p>
            </div>
            <div className="bg-blue-50 rounded-xl p-3">
              <p className="text-xs font-bold text-blue-700 mb-1">Agent B — Writer Style Mandate</p>
              <p className="text-xs text-blue-900 leading-relaxed font-mono whitespace-pre-wrap">
                {skill.writer_style}
              </p>
            </div>
          </div>
        )}
      </div>

      {!skill.is_builtin && (
        <div className="border-t border-gray-100 px-5 py-2.5 bg-gray-50 flex justify-end">
          <button
            onClick={() => onDelete(skill.id)}
            className="text-xs text-red-400 hover:text-red-600 font-medium transition-colors"
          >
            מחק כישור
          </button>
        </div>
      )}
    </div>
  )
}


function CreateSkillForm({ onCreated, onCancel }) {
  const [mode, setMode]   = useState('ai')   // 'ai' | 'manual'
  const [goal, setGoal]   = useState('')
  const [generating, setGenerating] = useState(false)
  const [genError, setGenError]     = useState(null)

  const [form, setForm] = useState({
    name: '', description: '', icon: '🎯', color: '#6366F1',
    researcher_hint: '', writer_style: '', min_difficulty: 2,
  })
  const [busy, setBusy] = useState(false)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function handleGenerate() {
    if (!goal.trim()) return
    setGenerating(true)
    setGenError(null)
    try {
      const result = await api.generateSkillPrompts(goal)
      setForm(f => ({
        ...f,
        name:            result.suggested_name        || f.name,
        description:     result.suggested_description || f.description,
        icon:            result.suggested_icon        || f.icon,
        researcher_hint: result.researcher_hint       || f.researcher_hint,
        writer_style:    result.writer_style          || f.writer_style,
      }))
      setMode('manual') // switch to review mode
    } catch (e) {
      setGenError(e.message)
    } finally {
      setGenerating(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setBusy(true)
    try {
      const skill = await api.createSkill(form)
      onCreated(skill)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      {/* Mode toggle */}
      <div className="flex border-b border-gray-100">
        <button
          type="button"
          onClick={() => setMode('ai')}
          className={`flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${
            mode === 'ai' ? 'bg-indigo-50 text-indigo-700 border-b-2 border-indigo-500' : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          🤖 AI מייצר עבורי
        </button>
        <button
          type="button"
          onClick={() => setMode('manual')}
          className={`flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${
            mode === 'manual' ? 'bg-gray-50 text-gray-800 border-b-2 border-gray-400' : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          ✏️ הגדרה ידנית
        </button>
      </div>

      <div className="p-6 space-y-4">
        <h2 className="text-lg font-bold text-gray-900">יצירת כישור חדש</h2>

        {/* ── AI mode ─────────────────────────────────────── */}
        {mode === 'ai' && (
          <div className="space-y-3">
            <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 text-sm text-indigo-800 leading-relaxed">
              <p className="font-semibold mb-1">איך זה עובד?</p>
              <p>כתוב בשפה חופשית מה אתה רוצה לשאול עליו. ה-AI יעצב אוטומטית את הוראות המחקר והכתיבה לסוכנים.</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                תאר את מטרת הכישור — בחופשיות, בעברית או באנגלית
              </label>
              <textarea
                rows={3}
                value={goal}
                onChange={e => setGoal(e.target.value)}
                placeholder={'לדוגמה: "שאלות על קולנוע ישראלי עם דגש על שנות ה-70 וה-80"\n"Science trivia focused on bizarre but real biological facts"\n"שאלות חידה על מוזיקה עולמית — מי כתב, מי השפיע על מי"'}
                className="w-full border border-indigo-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-300 outline-none resize-y leading-relaxed"
              />
            </div>

            {genError && (
              <div className="text-red-500 text-xs bg-red-50 rounded-lg p-3">{genError}</div>
            )}

            <button
              type="button"
              onClick={handleGenerate}
              disabled={generating || !goal.trim()}
              className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              {generating ? (
                <>
                  <span className="animate-spin">⚙️</span>
                  Claude חושב על הכישור הכי מתאים…
                </>
              ) : (
                <>🤖 צור פרומפטים אוטומטית</>
              )}
            </button>
          </div>
        )}

        {/* ── Manual / review mode ─────────────────────────── */}
        {mode === 'manual' && (
          <form onSubmit={handleSubmit} className="space-y-4">
            {form.researcher_hint && (
              <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-2.5 text-xs text-green-800 flex items-center gap-2">
                ✅ פרומפטים נוצרו ע&quot;י AI — ערוך לפי הצורך לפני שמירה
              </div>
            )}

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">אייקון</label>
                <input value={form.icon} onChange={e => set('icon', e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-2xl text-center" maxLength={2} />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-gray-500 mb-1">שם הכישור</label>
                <input required value={form.name} onChange={e => set('name', e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-400 outline-none" />
              </div>
            </div>

            <div className="grid grid-cols-4 gap-3">
              <div className="col-span-3">
                <label className="block text-xs font-semibold text-gray-500 mb-1">תיאור קצר</label>
                <input value={form.description} onChange={e => set('description', e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-400 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">צבע</label>
                <input type="color" value={form.color} onChange={e => set('color', e.target.value)}
                  className="w-full h-10 border border-gray-200 rounded-lg cursor-pointer" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-purple-600 mb-1">
                Agent A — Researcher Hint
                <span className="text-gray-400 font-normal mr-1">(מה לחפש, מה לדחות)</span>
              </label>
              <textarea required rows={4} value={form.researcher_hint} onChange={e => set('researcher_hint', e.target.value)}
                placeholder="Focus on... Only extract facts that... Reject any fact that..."
                className="w-full border border-purple-200 rounded-xl px-3 py-2 text-xs font-mono focus:ring-2 focus:ring-purple-300 outline-none resize-y"
                dir="ltr" />
            </div>

            <div>
              <label className="block text-xs font-semibold text-blue-600 mb-1">
                Agent B — Writer Style Mandate
                <span className="text-gray-400 font-normal mr-1">(צורת השאלה, טון, מה להימנע)</span>
              </label>
              <textarea required rows={4} value={form.writer_style} onChange={e => set('writer_style', e.target.value)}
                placeholder="The question MUST... Preferred form: '...' Never ask about..."
                className="w-full border border-blue-200 rounded-xl px-3 py-2 text-xs font-mono focus:ring-2 focus:ring-blue-300 outline-none resize-y"
                dir="ltr" />
            </div>

            <div className="flex gap-3">
              <button type="submit" disabled={busy}
                className="px-5 py-2.5 bg-indigo-600 text-white font-bold rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50 transition-colors">
                {busy ? 'שומר...' : '💾 שמור כישור'}
              </button>
              <button type="button" onClick={() => setMode('ai')}
                className="px-4 py-2.5 border border-indigo-200 text-indigo-600 rounded-lg text-sm hover:bg-indigo-50 transition-colors">
                ← חזור ל-AI
              </button>
              <button type="button" onClick={onCancel}
                className="px-4 py-2.5 border border-gray-200 text-gray-500 rounded-lg text-sm hover:bg-gray-50 transition-colors">
                בטל
              </button>
            </div>
          </form>
        )}

        {mode === 'ai' && (
          <button type="button" onClick={onCancel}
            className="w-full py-2 text-sm text-gray-400 hover:text-gray-600 transition-colors">
            בטל
          </button>
        )}
      </div>
    </div>
  )
}


export default function SkillsTab({ backendOnline }) {
  const [skills, setSkills]     = useState([])
  const [loading, setLoading]   = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [error, setError]       = useState(null)

  const load = useCallback(async () => {
    if (!backendOnline) return
    setLoading(true)
    try {
      setSkills(await api.listSkills())
      setError(null)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [backendOnline])

  useEffect(() => {
    if (!backendOnline) { setLoading(false); return }
    load()
  }, [backendOnline, load])

  async function handleDelete(id) {
    if (!confirm('למחוק כישור זה?')) return
    try {
      await api.deleteSkill(id)
      load()
    } catch (e) {
      alert(e.message)
    }
  }

  function handleCreated(skill) {
    setShowForm(false)
    setSkills(prev => [...prev, skill])
  }

  const builtin = skills.filter(s => s.is_builtin)
  const custom  = skills.filter(s => !s.is_builtin)

  if (!backendOnline) {
    return (
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-black text-gray-900">כישורי יצירה</h1>
          <p className="text-sm text-gray-500 mt-1">
            כל כישור מזריק הוראות ממוקדות לתוך Agent A ו-Agent B
          </p>
        </div>
        <OfflineState />
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900">כישורי יצירה</h1>
          <p className="text-sm text-gray-500 mt-1">
            כל כישור מזריק הוראות ממוקדות לתוך Agent A ו-Agent B — מגדיר את "אופי השאלה" שתיוצר
          </p>
        </div>
        <button
          onClick={() => setShowForm(v => !v)}
          className="px-5 py-2.5 bg-indigo-600 text-white font-bold rounded-full hover:bg-indigo-700 transition-colors shadow-sm text-sm"
        >
          {showForm ? '✕ בטל' : '+ כישור חדש'}
        </button>
      </div>

      {error && (
        <div className="text-red-500 text-sm bg-red-50 rounded-xl p-4 flex items-center gap-3">
          <span>⚠️</span>
          <span>{error}</span>
          <button onClick={load} className="mr-auto text-xs underline">נסה שוב</button>
        </div>
      )}
      {showForm && <CreateSkillForm onCreated={handleCreated} onCancel={() => setShowForm(false)} />}

      {loading ? (
        <div className="text-center py-24 text-gray-400">טוען...</div>
      ) : (
        <>
          <section>
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">כישורים מובנים</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {builtin.map(s => <SkillCard key={s.id} skill={s} onDelete={handleDelete} />)}
            </div>
          </section>

          {custom.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">כישורים מותאמים אישית</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {custom.map(s => <SkillCard key={s.id} skill={s} onDelete={handleDelete} />)}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}
