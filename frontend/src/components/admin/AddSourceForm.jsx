import { useState, useEffect } from 'react'
import * as pdfjsLib from 'pdfjs-dist'
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { api } from '../../api.js'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl

const TYPE_LABELS = {
  wikipedia:     'ויקיפדיה',
  url:           'URL',
  rss:           'RSS Feed',
  local_archive: 'ארכיון מקומי',
}

async function extractTextFromFile(file) {
  if (file.name.toLowerCase().endsWith('.pdf')) {
    const arrayBuffer = await file.arrayBuffer()
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
    const pages = []
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i)
      const content = await page.getTextContent()
      pages.push(content.items.map(item => item.str).join(' '))
    }
    return pages.join('\n\n')
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = e => resolve(e.target.result)
    reader.onerror = reject
    reader.readAsText(file, 'utf-8')
  })
}

function SkillSelector({ skills, value, onChange }) {
  const selected = skills.find(s => s.id === value)
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-600 mb-2">
        כישור יצירה
        <span className="font-normal text-gray-400 mr-1">— מגדיר את אופי השאלה שתיוצר</span>
      </label>
      <div className="grid grid-cols-3 gap-2 mb-2">
        <button
          type="button"
          onClick={() => onChange(null)}
          className={`p-2.5 rounded-xl border-2 text-center transition-all ${
            !value ? 'border-gray-400 bg-gray-50' : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <div className="text-xl mb-0.5">🎲</div>
          <div className="text-xs font-semibold text-gray-600">כללי</div>
        </button>
        {skills.map(skill => (
          <button
            key={skill.id}
            type="button"
            onClick={() => onChange(skill.id)}
            className={`p-2.5 rounded-xl border-2 text-center transition-all ${
              value === skill.id ? 'border-opacity-100 bg-opacity-10' : 'border-gray-200 hover:border-gray-300'
            }`}
            style={value === skill.id ? { borderColor: skill.color, backgroundColor: skill.color + '15' } : {}}
            title={skill.description}
          >
            <div className="text-xl mb-0.5">{skill.icon}</div>
            <div className="text-xs font-semibold text-gray-700 leading-tight">{skill.name}</div>
          </button>
        ))}
      </div>
      {selected && (
        <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-1.5">{selected.description}</p>
      )}
    </div>
  )
}

export default function AddSourceForm({ onSubmit, onCancel }) {
  const [type, setType]       = useState('wikipedia')
  const [name, setName]       = useState('')
  const [skillId, setSkillId] = useState(null)
  const [config, setConfig]   = useState({
    article_title: '', language: 'he', url: '', max_articles: 5, raw_text: '', topic: ''
  })
  const [skills, setSkills]         = useState([])
  const [busy, setBusy]             = useState(false)
  const [fileLoading, setFileLoading] = useState(false)
  const [fileInfo, setFileInfo]     = useState(null)

  useEffect(() => {
    api.listSkills().then(setSkills).catch(() => {})
  }, [])

  function updateConfig(key, value) {
    setConfig(prev => ({ ...prev, [key]: value }))
  }

  async function handleFiles(e) {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    setFileLoading(true)
    setFileInfo(null)
    try {
      const texts = await Promise.all(files.map(extractTextFromFile))
      const combined = texts.join('\n\n---\n\n')
      updateConfig('raw_text', combined)
      setFileInfo(`${files.length} קובץ/ים נטענו — ${combined.length.toLocaleString()} תווים`)
      if (!name) {
        setName(files.length === 1
          ? files[0].name.replace(/\.[^.]+$/, '')
          : `ארכיון (${files.length} קבצים)`)
      }
    } catch (err) {
      setFileInfo(`שגיאה בקריאת הקובץ: ${err.message}`)
    } finally {
      setFileLoading(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setBusy(true)
    try {
      await onSubmit({ type, name, config, skill_id: skillId })
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">סוג מקור</label>
          <select
            value={type}
            onChange={e => setType(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-quiz-yellow"
          >
            {Object.entries(TYPE_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">שם המקור</label>
          <input
            required
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="למשל: מלחמת העולם השנייה"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-quiz-yellow"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">
            נושא
            <span className="font-normal text-gray-400 mr-1">— קטגוריית השאלות (אופציונלי)</span>
          </label>
          <input
            value={config.topic}
            onChange={e => updateConfig('topic', e.target.value)}
            placeholder="למשל: ארכיון המעפיל"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-quiz-yellow"
          />
        </div>
      </div>

      {type === 'wikipedia' && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">כותרת מאמר</label>
            <input
              required
              value={config.article_title}
              onChange={e => updateConfig('article_title', e.target.value)}
              placeholder="למשל: מהפכה צרפתית"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-quiz-yellow"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">שפה</label>
            <select
              value={config.language}
              onChange={e => updateConfig('language', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-quiz-yellow"
            >
              <option value="he">עברית (he)</option>
              <option value="en">English (en)</option>
            </select>
          </div>
        </div>
      )}

      {(type === 'url' || type === 'rss') && (
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">URL</label>
            <input
              required type="url"
              value={config.url}
              onChange={e => updateConfig('url', e.target.value)}
              placeholder="https://..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-quiz-yellow"
              dir="ltr"
            />
          </div>
          {type === 'rss' && (
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">מקסימום מאמרים</label>
              <input
                type="number" min={1} max={20}
                value={config.max_articles}
                onChange={e => updateConfig('max_articles', parseInt(e.target.value))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-quiz-yellow"
              />
            </div>
          )}
        </div>
      )}

      {type === 'local_archive' && (
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-semibold text-gray-600">
              טקסט גולמי
              <span className="font-normal text-gray-400 mr-1">— הדבק או העלה קבצים</span>
            </label>
            <label className={`cursor-pointer px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
              fileLoading
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
            }`}>
              {fileLoading ? (
                <><span className="w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin inline-block" /> קורא...</>
              ) : (
                <>📄 העלה קבצים (.txt / .md / .pdf)</>
              )}
              <input
                type="file"
                multiple
                accept=".txt,.md,.csv,.pdf"
                className="hidden"
                disabled={fileLoading}
                onChange={handleFiles}
              />
            </label>
          </div>
          {fileInfo && (
            <p className={`text-xs mb-2 px-3 py-1.5 rounded-lg ${
              fileInfo.startsWith('שגיאה') ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'
            }`}>
              {fileInfo.startsWith('שגיאה') ? '⚠️ ' : '✓ '}{fileInfo}
            </p>
          )}
          <textarea
            required
            rows={10}
            value={config.raw_text}
            onChange={e => updateConfig('raw_text', e.target.value)}
            placeholder="הדבק כאן את הטקסט, או השתמש בכפתור להעלאת קובץ (.txt / .pdf)..."
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-quiz-yellow resize-y font-mono leading-relaxed"
            dir="auto"
          />
          <p className="text-xs text-gray-400 mt-1">
            ניתן להעלות מספר קבצים בו-זמנית — הם יאוחדו ויחולקו לקטעים (עד 5) לעיבוד AI
          </p>
        </div>
      )}

      {skills.length > 0 && (
        <SkillSelector skills={skills} value={skillId} onChange={setSkillId} />
      )}

      <div className="flex gap-3 pt-1">
        <button
          type="submit" disabled={busy || fileLoading}
          className="px-6 py-2.5 bg-gray-900 text-white font-bold rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors text-sm"
        >
          {busy ? 'מוסיף...' : 'הוסף מקור'}
        </button>
        <button
          type="button" onClick={onCancel}
          className="px-6 py-2.5 border border-gray-200 text-gray-600 font-medium rounded-lg hover:bg-gray-50 transition-colors text-sm"
        >
          בטל
        </button>
      </div>
    </form>
  )
}
