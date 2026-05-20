import { useState, useEffect, useCallback } from 'react'
import { api } from '../api.js'

// ── Difficulty dots ────────────────────────────────────────────────────────
function DifficultyBadge({ value }) {
  const n = Math.min(10, Math.max(1, value || 1))
  const color = n <= 3 ? 'bg-green-400' : n <= 6 ? 'bg-yellow-400' : 'bg-red-400'
  return (
    <div className="flex items-center gap-0.5" title={`קושי: ${n}/10`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <span
          key={i}
          className={`w-1.5 h-1.5 rounded-full ${i < Math.ceil(n / 2) ? color : 'bg-gray-200'}`}
        />
      ))}
    </div>
  )
}

// ── Score ring ──────────────────────────────────────────────────────────────
function ScoreBadge({ score }) {
  if (score == null) return <span className="text-gray-300 text-xs">—</span>
  const pct = Math.round(score * 10)
  const color = pct >= 70 ? 'text-green-600' : pct >= 45 ? 'text-yellow-600' : 'text-red-500'
  return <span className={`font-bold text-xs ${color}`}>{pct}%</span>
}

// ── Action button ───────────────────────────────────────────────────────────
function ActionBtn({ onClick, disabled, loading, label, title, variant }) {
  const base = 'px-2 py-1 rounded text-xs font-semibold transition-all border'
  const variants = {
    blue:   'border-blue-200 text-blue-700 hover:bg-blue-50 disabled:opacity-40',
    purple: 'border-purple-200 text-purple-700 hover:bg-purple-50 disabled:opacity-40',
    green:  'border-green-200 text-green-700 hover:bg-green-50 disabled:opacity-40',
    red:    'border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-40',
  }
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      title={title}
      className={`${base} ${variants[variant] || variants.blue}`}
    >
      {loading ? '⏳' : label}
    </button>
  )
}

// ── Question row ────────────────────────────────────────────────────────────
function QuestionRow({ q, onRefine, onDelete }) {
  const [showAnswer, setShowAnswer] = useState(false)
  const [loadingAction, setLoadingAction] = useState(null)
  const [flash, setFlash] = useState(false)

  async function handleRefine(action) {
    setLoadingAction(action)
    try {
      await onRefine(q.id, action)
      setFlash(true)
      setTimeout(() => setFlash(false), 1200)
    } finally {
      setLoadingAction(null)
    }
  }

  const busy = loadingAction !== null

  return (
    <tr className={`border-b border-gray-100 transition-colors ${flash ? 'bg-yellow-50' : 'hover:bg-gray-50'}`}>
      {/* Category */}
      <td className="px-3 py-2.5 whitespace-nowrap">
        <span className="bg-gray-100 text-gray-700 rounded px-2 py-0.5 text-xs font-medium">
          {q.category || '—'}
        </span>
      </td>

      {/* Question text */}
      <td className="px-3 py-2.5 max-w-xs">
        <p className="text-sm text-gray-900 leading-relaxed">{q.question_text}</p>
        {q.source_name && (
          <p className="text-xs text-gray-400 mt-0.5">📰 {q.source_name}</p>
        )}
      </td>

      {/* Answer (toggle) */}
      <td className="px-3 py-2.5 max-w-[140px]">
        {showAnswer ? (
          <span
            className="text-sm text-gray-800 cursor-pointer"
            onClick={() => setShowAnswer(false)}
          >
            {q.correct_answer}
          </span>
        ) : (
          <button
            onClick={() => setShowAnswer(true)}
            className="text-xs text-blue-500 underline hover:text-blue-700"
          >
            הצג תשובה
          </button>
        )}
      </td>

      {/* Difficulty + Score */}
      <td className="px-3 py-2.5 text-center">
        <DifficultyBadge value={q.difficulty} />
      </td>
      <td className="px-3 py-2.5 text-center">
        <ScoreBadge score={q.quality_score} />
      </td>

      {/* Actions */}
      <td className="px-3 py-2.5">
        <div className="flex items-center gap-1 flex-wrap">
          <ActionBtn
            onClick={() => handleRefine('improve')}
            disabled={busy}
            loading={loadingAction === 'improve'}
            label="✨ שפר"
            title="שפר — הפוך לחכמה ועקיפה יותר"
            variant="blue"
          />
          <ActionBtn
            onClick={() => handleRefine('deepen')}
            disabled={busy}
            loading={loadingAction === 'deepen'}
            label="🔬 העמק"
            title="העמק — הפוך לקשה יותר"
            variant="purple"
          />
          <ActionBtn
            onClick={() => handleRefine('simplify')}
            disabled={busy}
            loading={loadingAction === 'simplify'}
            label="🌿 פשט"
            title="פשט — הפוך לנגיש יותר"
            variant="green"
          />
          <ActionBtn
            onClick={() => onDelete(q.id)}
            disabled={busy}
            loading={false}
            label="🗑️"
            title="מחק שאלה"
            variant="red"
          />
        </div>
      </td>
    </tr>
  )
}

// ── Main tab ────────────────────────────────────────────────────────────────
export default function QuestionsTab() {
  const [questions, setQuestions]   = useState([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState(null)
  const [search, setSearch]         = useState('')
  const [filterCat, setFilterCat]   = useState('הכל')
  const [toast, setToast]           = useState(null)

  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await api.adminQuestions('active')
      setQuestions(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handleRefine = useCallback(async (id, action) => {
    const labels = { improve: 'שיפור', deepen: 'העמקה', simplify: 'פישוט' }
    try {
      const updated = await api.refineQuestion(id, action)
      setQuestions(prev => prev.map(q => q.id === id ? { ...q, ...updated } : q))
      showToast(`✅ ${labels[action]} הושלמ/ה בהצלחה`)
    } catch (e) {
      showToast(`❌ ${e.message}`, 'error')
      throw e // let row know it failed
    }
  }, [showToast])

  const handleDelete = useCallback(async (id) => {
    if (!confirm('למחוק שאלה זו לצמיתות?')) return
    try {
      await api.deleteQuestion(id)
      setQuestions(prev => prev.filter(q => q.id !== id))
      showToast('🗑️ השאלה נמחקה')
    } catch (e) {
      showToast(`❌ ${e.message}`, 'error')
    }
  }, [showToast])

  // Derived
  const categories = ['הכל', ...new Set(questions.map(q => q.category).filter(Boolean))]

  const filtered = questions.filter(q => {
    const catOk  = filterCat === 'הכל' || q.category === filterCat
    const textOk = !search || q.question_text?.includes(search) || q.correct_answer?.includes(search)
    return catOk && textOk
  })

  return (
    <div className="space-y-4" dir="rtl">

      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-lg shadow-lg text-sm font-medium
          ${toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-gray-900 text-white'}`}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-800">מאגר שאלות</h2>
          <p className="text-sm text-gray-500">{questions.length} שאלות פעילות</p>
        </div>
        <button
          onClick={load}
          className="text-sm text-gray-500 hover:text-gray-800 flex items-center gap-1.5 border border-gray-200 rounded px-3 py-1.5 hover:bg-gray-50"
        >
          🔄 רענן
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="חיפוש שאלה או תשובה…"
          className="border border-gray-200 rounded px-3 py-1.5 text-sm w-64 focus:outline-none focus:border-blue-400"
        />
        <div className="flex gap-1 flex-wrap">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setFilterCat(cat)}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                filterCat === cat
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-2.5 text-xs text-blue-700 flex items-center gap-4 flex-wrap">
        <span><strong>✨ שפר</strong> — חכמה ועקיפה יותר</span>
        <span><strong>🔬 העמק</strong> — רמת קושי גבוהה יותר</span>
        <span><strong>🌿 פשט</strong> — נגישה לקהל רחב יותר</span>
        <span className="text-blue-500">הציון מחושב ע&quot;י סוכן הביקורת (0–100%)</span>
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-16 text-gray-400">
          <div className="text-3xl mb-3 animate-spin">⚙️</div>
          <p>טוען שאלות…</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">{error}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <div className="text-4xl mb-3">📭</div>
          <p>אין שאלות תואמות לסינון</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-right">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-3 py-2.5 text-xs font-semibold text-gray-500 text-right">קטגוריה</th>
                <th className="px-3 py-2.5 text-xs font-semibold text-gray-500 text-right">שאלה</th>
                <th className="px-3 py-2.5 text-xs font-semibold text-gray-500 text-right">תשובה</th>
                <th className="px-3 py-2.5 text-xs font-semibold text-gray-500 text-center">קושי</th>
                <th className="px-3 py-2.5 text-xs font-semibold text-gray-500 text-center">ציון</th>
                <th className="px-3 py-2.5 text-xs font-semibold text-gray-500 text-right">פעולות</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(q => (
                <QuestionRow
                  key={q.id}
                  q={q}
                  onRefine={handleRefine}
                  onDelete={handleDelete}
                />
              ))}
            </tbody>
          </table>
          <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 text-xs text-gray-400">
            מציג {filtered.length} מתוך {questions.length} שאלות
          </div>
        </div>
      )}
    </div>
  )
}
