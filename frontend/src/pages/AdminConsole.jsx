import { useState } from 'react'
import SourcesTab   from './SourcesTab.jsx'
import TelemetryTab from './TelemetryTab.jsx'
import SkillsTab    from './SkillsTab.jsx'
import QuestionsTab from './QuestionsTab.jsx'

const TABS = [
  { id: 'sources',   label: 'מקורות',   icon: '🗄️' },
  { id: 'questions', label: 'שאלות',    icon: '❓' },
  { id: 'skills',    label: 'כישורים',  icon: '🎯' },
  { id: 'telemetry', label: 'טלמטריה',  icon: '📊' },
]

function BackendBanner({ status }) {
  if (status === 'online') return (
    <div className="bg-green-50 border-b border-green-100 px-6 py-2 flex items-center gap-2">
      <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
      <span className="text-xs text-green-700 font-medium">Backend מחובר ופועל</span>
    </div>
  )

  if (status === 'offline') return (
    <div className="bg-amber-50 border-b border-amber-200 px-6 py-3 flex items-start gap-3">
      <span className="text-amber-500 text-base mt-0.5">⚠️</span>
      <div>
        <p className="text-sm font-bold text-amber-800">Backend לא פועל — כל הפעולות יכשלו</p>
        <p className="text-xs text-amber-700 mt-1">
          הפעל בטרמינל:&nbsp;
          <code className="bg-amber-100 border border-amber-200 px-2 py-0.5 rounded font-mono text-amber-900 select-all">
            cd 20questions/backend &amp;&amp; uvicorn main:app --reload
          </code>
        </p>
        <p className="text-xs text-amber-600 mt-0.5">
          ודא שקיים קובץ&nbsp;
          <code className="font-mono">.env</code>
          &nbsp;עם&nbsp;
          <code className="font-mono">ANTHROPIC_API_KEY=sk-ant-…</code>
        </p>
      </div>
      <span className="mr-auto w-2 h-2 rounded-full bg-red-400 inline-block mt-1 flex-shrink-0" />
    </div>
  )

  return (
    <div className="bg-gray-50 border-b border-gray-100 px-6 py-2 flex items-center gap-2">
      <span className="w-2 h-2 rounded-full bg-gray-300 animate-pulse inline-block" />
      <span className="text-xs text-gray-400">בודק חיבור לשרת…</span>
    </div>
  )
}

export default function AdminConsole({ onBack, backendStatus = 'checking' }) {
  const [activeTab, setActiveTab] = useState('sources')
  const backendOnline = backendStatus === 'online'

  return (
    <div className="min-h-screen bg-gray-100" dir="rtl">
      <header className="bg-gray-900 text-white px-6 py-3 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-4">
          <span className="text-quiz-yellow font-black text-xl">20</span>
          <span className="font-bold">Admin Console</span>
          <span className="text-gray-500 text-xs font-mono">v2.0 — Autonomous Engine</span>
        </div>
        <button
          onClick={onBack}
          className="text-gray-400 hover:text-white text-sm underline transition-colors"
        >
          ← חזרה למשחק
        </button>
      </header>

      <BackendBanner status={backendStatus} />

      <div className="bg-white border-b border-gray-200 px-6 flex gap-1">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-quiz-yellow text-gray-900'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="p-6">
        {activeTab === 'sources'   && <SourcesTab   backendOnline={backendOnline} />}
        {activeTab === 'questions' && <QuestionsTab backendOnline={backendOnline} />}
        {activeTab === 'skills'    && <SkillsTab    backendOnline={backendOnline} />}
        {activeTab === 'telemetry' && <TelemetryTab backendOnline={backendOnline} />}
      </div>
    </div>
  )
}
