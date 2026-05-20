import { useState, useEffect, useCallback } from 'react'
import { api } from '../api.js'
import MetricsGrid from '../components/admin/MetricsGrid.jsx'
import SampledQuestionsTable from '../components/admin/SampledQuestionsTable.jsx'

function OfflineState() {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center">
      <p className="text-5xl mb-4">🔌</p>
      <p className="text-lg font-bold text-gray-700 mb-1">Backend לא מחובר</p>
      <p className="text-sm text-gray-400">הפעל את השרת כדי לצפות בנתוני טלמטריה ואיכות</p>
    </div>
  )
}

export default function TelemetryTab({ backendOnline }) {
  const [evalData, setEvalData] = useState(null)
  const [stats, setStats]       = useState(null)
  const [loading, setLoading]   = useState(true)
  const [running, setRunning]   = useState(false)
  const [error, setError]       = useState(null)

  const load = useCallback(async () => {
    if (!backendOnline) return
    setLoading(true)
    try {
      const [ev, st] = await Promise.all([api.getLatestEval(), api.getStats()])
      setEvalData(ev)
      setStats(st)
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

  async function handleRunEval() {
    setRunning(true)
    try {
      const result = await api.runEval()
      setEvalData(result)
      const st = await api.getStats()
      setStats(st)
      setError(null)
    } catch (e) {
      setError(e.message)
    } finally {
      setRunning(false)
    }
  }

  const score = evalData?.system_quality_score ?? null
  const scoreColor = score === null ? 'text-gray-400'
    : score >= 70 ? 'text-green-600'
    : score >= 50 ? 'text-yellow-600'
    : 'text-red-500'

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900">טלמטריה ואיכות</h1>
          <p className="text-sm text-gray-500 mt-1">ביצועי המערכת האוטונומית — ניטור בזמן אמת</p>
        </div>
        {backendOnline && (
          <button
            onClick={handleRunEval}
            disabled={running || loading}
            className="px-5 py-2.5 bg-gray-900 text-white font-bold rounded-full hover:bg-gray-700 disabled:opacity-50 transition-colors shadow-sm flex items-center gap-2"
          >
            {running ? (
              <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" /> מחשב...</>
            ) : '▶ הרץ הערכה'}
          </button>
        )}
      </div>

      {!backendOnline ? (
        <OfflineState />
      ) : loading ? (
        <div className="text-center py-24 text-gray-400">טוען נתונים...</div>
      ) : error ? (
        <div className="text-center py-12">
          <p className="text-3xl mb-3">⚠️</p>
          <p className="text-red-500 font-medium mb-1">שגיאה בטעינת נתונים</p>
          <p className="text-xs text-gray-400 mb-4">{error}</p>
          <button onClick={load}
            className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm hover:bg-gray-700 transition-colors">
            נסה שוב
          </button>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 font-semibold uppercase tracking-widest mb-1">
                System Quality Score
              </p>
              <p className={`text-7xl font-black ${scoreColor} leading-none`}>
                {score !== null ? score.toFixed(1) : '—'}
              </p>
              <p className="text-gray-400 text-sm mt-2">מדד 0–100 • ממוצע ציוני סוכן C × 10</p>
            </div>
            <div className="text-8xl opacity-10 select-none">🎯</div>
          </div>

          {stats && evalData && (
            <MetricsGrid stats={stats} evalData={evalData} />
          )}

          {evalData?.category_distribution && Object.keys(evalData.category_distribution).length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-base font-bold text-gray-800 mb-4">התפלגות קטגוריות</h2>
              <div className="flex flex-wrap gap-3">
                {Object.entries(evalData.category_distribution).map(([cat, count]) => (
                  <div key={cat} className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-full px-4 py-1.5">
                    <span className="font-semibold text-gray-800 text-sm">{cat}</span>
                    <span className="bg-quiz-yellow text-gray-900 text-xs font-black rounded-full w-5 h-5 flex items-center justify-center">
                      {count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {evalData?.sampled_questions?.length > 0 ? (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="font-bold text-gray-800">שאלות לדוגמה (מ-Run האחרון)</h2>
                <p className="text-xs text-gray-400 mt-0.5">Human-in-the-loop: בדקו את הסטנדרט</p>
              </div>
              <SampledQuestionsTable questions={evalData.sampled_questions} />
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400 bg-white rounded-2xl border border-gray-200">
              <p className="text-3xl mb-2">📋</p>
              <p>הרץ הערכה כדי לראות שאלות לדוגמה</p>
            </div>
          )}

          {evalData?.created_at && (
            <p className="text-center text-xs text-gray-400">
              הערכה אחרונה: {new Date(evalData.created_at).toLocaleString('he-IL')}
            </p>
          )}
        </>
      )}
    </div>
  )
}
