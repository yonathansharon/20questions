function DiffDots({ level }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className={`w-2 h-2 rounded-full ${i < level ? 'bg-gray-700' : 'bg-gray-200'}`} />
      ))}
    </div>
  )
}

function ScorePill({ score }) {
  const pct = Math.round(score * 10)
  const cls = pct >= 70 ? 'bg-green-100 text-green-700'
    : pct >= 50 ? 'bg-yellow-100 text-yellow-700'
    : 'bg-red-100 text-red-600'
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${cls}`}>
      {pct}
    </span>
  )
}

export default function SampledQuestionsTable({ questions }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-gray-100 bg-gray-50">
          {['קטגוריה', 'שאלה', 'תשובה', 'קושי', 'ציון C'].map(h => (
            <th key={h} className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {questions.map(q => (
          <tr key={q.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
            <td className="px-5 py-3.5">
              <span className="inline-block bg-blue-50 text-blue-700 text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap">
                {q.category}
              </span>
            </td>
            <td className="px-5 py-3.5 text-gray-800 max-w-sm leading-snug">{q.question_text}</td>
            <td className="px-5 py-3.5 text-blue-700 font-semibold max-w-xs">{q.correct_answer}</td>
            <td className="px-5 py-3.5"><DiffDots level={q.difficulty} /></td>
            <td className="px-5 py-3.5"><ScorePill score={q.quality_score} /></td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
