const TYPE_ICON = { wikipedia: '📖', url: '🔗', rss: '📡', local_archive: '📁' }

const STATUS_BADGE = {
  idle:      'bg-gray-100 text-gray-600',
  ingesting: 'bg-blue-100 text-blue-700 animate-pulse',
  error:     'bg-red-100 text-red-600',
}

function fmt(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('he-IL', { dateStyle: 'short', timeStyle: 'short' })
}

export default function SourceTable({ sources, activeJobs, onIngest, onDelete }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-gray-100 bg-gray-50">
          {['סוג', 'שם', 'סטטוס', 'עדכון אחרון', 'מסמכים', 'שאלות', 'פעולות'].map(h => (
            <th key={h} className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {sources.map(src => {
          const isRunning = src.id in activeJobs
          const statusKey = isRunning ? 'ingesting' : src.status
          const badgeCls  = STATUS_BADGE[statusKey] ?? STATUS_BADGE.idle
          const qCount    = src.question_count ?? 0

          return (
            <tr key={src.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
              <td className="px-5 py-3.5 text-xl">{TYPE_ICON[src.type] ?? '📁'}</td>
              <td className="px-5 py-3.5 font-semibold text-gray-900">
                {src.name}
                {src.config?.article_title && (
                  <span className="block text-xs text-gray-400 font-normal">{src.config.article_title}</span>
                )}
                {src.config?.url && (
                  <span className="block text-xs text-gray-400 font-mono font-normal truncate max-w-xs" dir="ltr">
                    {src.config.url}
                  </span>
                )}
                {src.config?.topic && (
                  <span className="block text-xs text-blue-500 font-normal">נושא: {src.config.topic}</span>
                )}
              </td>
              <td className="px-5 py-3.5">
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${badgeCls}`}>
                  {isRunning && <span className="w-1.5 h-1.5 bg-blue-500 rounded-full inline-block" />}
                  {isRunning ? 'מעבד...' : statusKey}
                </span>
                {src.error_message && (
                  <p className="text-xs text-red-500 mt-1 max-w-xs truncate">{src.error_message}</p>
                )}
              </td>
              <td className="px-5 py-3.5 text-gray-500 text-xs">{fmt(src.last_ingested)}</td>
              <td className="px-5 py-3.5 font-mono text-gray-700">{src.doc_count}</td>
              <td className="px-5 py-3.5">
                <span className={`font-bold text-sm ${qCount > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                  {qCount > 0 ? `✓ ${qCount}` : '—'}
                </span>
              </td>
              <td className="px-5 py-3.5">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onIngest(src.id)}
                    disabled={isRunning || src.status === 'ingesting'}
                    className="px-3 py-1.5 bg-quiz-yellow text-gray-900 text-xs font-bold rounded-lg hover:bg-yellow-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    {isRunning ? '⏳' : '▶ עבד'}
                  </button>
                  <button
                    onClick={() => onDelete(src.id)}
                    disabled={isRunning}
                    className="px-3 py-1.5 border border-red-200 text-red-500 text-xs font-medium rounded-lg hover:bg-red-50 disabled:opacity-40 transition-colors"
                  >
                    מחק
                  </button>
                </div>
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
