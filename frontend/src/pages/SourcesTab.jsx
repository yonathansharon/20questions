import { useState, useEffect, useCallback } from 'react'
import { api } from '../api.js'
import AddSourceForm from '../components/admin/AddSourceForm.jsx'
import SourceTable from '../components/admin/SourceTable.jsx'

function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('he-IL', { dateStyle: 'short', timeStyle: 'short' })
}

function JobsLog({ backendOnline, refreshKey }) {
  const [jobs, setJobs]           = useState([])
  const [open, setOpen]           = useState(false)
  const [diagnose, setDiagnose]   = useState(null)
  const [diagLoading, setDiagLoading] = useState(false)

  useEffect(() => {
    if (!backendOnline || !open) return
    api.recentJobs().then(setJobs).catch(() => {})
  }, [backendOnline, open, refreshKey])

  async function runDiagnose() {
    setDiagLoading(true)
    try {
      const d = await api.rejectionsDebug()
      setDiagnose(d)
    } catch (e) {
      setDiagnose({ error: e.message })
    } finally {
      setDiagLoading(false)
    }
  }

  if (!backendOnline) return null

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <button
          onClick={() => setOpen(v => !v)}
          className="flex items-center gap-2 text-sm font-semibold text-gray-700 hover:text-gray-900 transition-colors"
        >
          <span>יומן עיבודים אחרונים</span>
          <span className="text-gray-400">{open ? '▲' : '▼'}</span>
        </button>
        <button
          onClick={runDiagnose}
          disabled={diagLoading}
          className="px-3 py-1.5 bg-orange-100 text-orange-700 text-xs font-bold rounded-lg hover:bg-orange-200 disabled:opacity-50 transition-colors"
        >
          {diagLoading ? '⏳ בודק...' : '🔍 אבחון — למה נדחו שאלות?'}
        </button>
      </div>

      {diagnose && (
        <div className="border-b border-orange-100 bg-orange-50 p-5 text-sm" dir="ltr">
          {diagnose.error ? (
            <p className="text-red-600 font-mono text-xs">{diagnose.error}</p>
          ) : (
            <>
              <p className="font-bold text-orange-800 mb-3">
                Total rejected: {diagnose.total_rejected} questions
              </p>
              <div className="space-y-1 mb-4">
                {Object.entries(diagnose.by_reason).map(([reason, count]) => (
                  <div key={reason} className="flex items-start gap-3">
                    <span className="bg-red-100 text-red-700 font-bold px-2 py-0.5 rounded text-xs shrink-0">{count}×</span>
                    <span className="text-gray-700 font-mono text-xs break-all">{reason}</span>
                  </div>
                ))}
              </div>
              {diagnose.total_rejected === 0 && (
                <p className="text-gray-500 italic text-xs">No rejections found — has any source been processed?</p>
              )}
            </>
          )}
          <button onClick={() => setDiagnose(null)} className="text-xs text-gray-400 hover:text-gray-600 mt-2">סגור</button>
        </div>
      )}

      {open && (
        <div className="overflow-x-auto">
          {jobs.length === 0 ? (
            <p className="p-6 text-center text-sm text-gray-400">אין עיבודים עדיין</p>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {['מקור', 'סטטוס', 'הופקו', 'נדחו', 'שגיאה', 'זמן'].map(h => (
                    <th key={h} className="px-4 py-2 text-right text-gray-500 font-semibold tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {jobs.map(j => (
                  <tr key={j.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-2 font-medium text-gray-800">{j.source_name ?? j.source_id?.slice(0,8)}</td>
                    <td className="px-4 py-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                        j.status === 'completed' ? 'bg-green-100 text-green-700' :
                        j.status === 'failed'    ? 'bg-red-100 text-red-600' :
                                                   'bg-blue-100 text-blue-700 animate-pulse'
                      }`}>{j.status}</span>
                    </td>
                    <td className="px-4 py-2 font-bold text-green-700">{j.questions_generated ?? '—'}</td>
                    <td className="px-4 py-2 text-red-500">{j.questions_rejected ?? '—'}</td>
                    <td className="px-4 py-2 text-red-400 max-w-xs truncate">{j.error_message ?? ''}</td>
                    <td className="px-4 py-2 text-gray-400 font-mono">{fmtDate(j.started_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}

function OfflineState() {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center">
      <p className="text-5xl mb-4">🔌</p>
      <p className="text-lg font-bold text-gray-700 mb-1">Backend לא מחובר</p>
      <p className="text-sm text-gray-400">הפעל את השרת כדי לנהל מקורות ולהפעיל עיבוד</p>
    </div>
  )
}

export default function SourcesTab({ backendOnline }) {
  const [sources, setSources]         = useState([])
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState(null)
  const [activeJobs, setActiveJobs]   = useState({})
  const [showForm, setShowForm]       = useState(false)
  const [toast, setToast]             = useState(null)
  const [jobsRefreshKey, setJobsRefreshKey] = useState(0)

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  const loadSources = useCallback(async () => {
    if (!backendOnline) return
    try {
      setSources(await api.listSources())
      setError(null)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [backendOnline])

  useEffect(() => {
    if (!backendOnline) { setLoading(false); return }
    loadSources()
  }, [backendOnline, loadSources])

  // Poll running jobs
  useEffect(() => {
    if (Object.keys(activeJobs).length === 0) return
    const id = setInterval(async () => {
      let changed = false
      const updated = { ...activeJobs }
      for (const [srcId, jobId] of Object.entries(activeJobs)) {
        try {
          const job = await api.getJob(jobId)
          if (job.status === 'completed' || job.status === 'failed') {
            delete updated[srcId]
            changed = true
            if (job.status === 'completed') {
              showToast(`✓ הופקו ${job.questions_generated} שאלות (${job.questions_rejected} נדחו)`)
            } else {
              showToast(`שגיאה: ${job.error_message}`, 'error')
            }
            setJobsRefreshKey(k => k + 1)
            loadSources()
          }
        } catch { /* ignore */ }
      }
      if (changed) setActiveJobs(updated)
    }, 3000)
    return () => clearInterval(id)
  }, [activeJobs, loadSources])

  async function handleAdd(formData) {
    try {
      await api.createSource(formData)
      showToast('מקור נוסף בהצלחה')
      setShowForm(false)
      loadSources()
    } catch (e) {
      showToast(e.message, 'error')
    }
  }

  async function handleDelete(id) {
    if (!confirm('למחוק מקור זה ואת כל המסמכים שלו?')) return
    try {
      await api.deleteSource(id)
      showToast('מקור נמחק')
      loadSources()
    } catch (e) {
      showToast(e.message, 'error')
    }
  }

  async function handleIngest(sourceId) {
    try {
      const { job_id } = await api.ingestSource(sourceId)
      setActiveJobs(prev => ({ ...prev, [sourceId]: job_id }))
      showToast('עיבוד התחיל — יעדכן בסיום')
    } catch (e) {
      showToast(e.message, 'error')
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900">מקורות ידע</h1>
          <p className="text-sm text-gray-500 mt-1">ניהול מקורות לאינדוקציה ויצירת שאלות</p>
        </div>
        {backendOnline && (
          <button
            onClick={() => setShowForm(v => !v)}
            className="px-5 py-2.5 bg-quiz-yellow text-gray-900 font-bold rounded-full hover:bg-yellow-400 transition-colors shadow-sm"
          >
            {showForm ? '✕ בטל' : '+ הוסף מקור'}
          </button>
        )}
      </div>

      {toast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-xl shadow-lg text-white font-semibold text-sm
          ${toast.type === 'error' ? 'bg-red-500' : 'bg-green-600'}`}>
          {toast.msg}
        </div>
      )}

      {showForm && backendOnline && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-bold mb-4 text-gray-800">הוספת מקור חדש</h2>
          <AddSourceForm onSubmit={handleAdd} onCancel={() => setShowForm(false)} />
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        {!backendOnline ? (
          <OfflineState />
        ) : loading ? (
          <div className="p-12 text-center text-gray-400">טוען...</div>
        ) : error ? (
          <div className="p-12 text-center">
            <p className="text-3xl mb-3">⚠️</p>
            <p className="text-red-500 font-medium mb-1">שגיאה בטעינת מקורות</p>
            <p className="text-xs text-gray-400">{error}</p>
            <button
              onClick={loadSources}
              className="mt-4 px-4 py-2 bg-gray-900 text-white rounded-lg text-sm hover:bg-gray-700 transition-colors"
            >
              נסה שוב
            </button>
          </div>
        ) : sources.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <p className="text-4xl mb-3">📭</p>
            <p className="font-medium">אין מקורות עדיין — הוסף את הראשון</p>
          </div>
        ) : (
          <SourceTable
            sources={sources}
            activeJobs={activeJobs}
            onIngest={handleIngest}
            onDelete={handleDelete}
          />
        )}
      </div>

      <JobsLog backendOnline={backendOnline} refreshKey={jobsRefreshKey} />
    </div>
  )
}
