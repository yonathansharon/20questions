function Metric({ label, value, sub, color = 'text-gray-900' }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">{label}</p>
      <p className={`text-4xl font-black leading-none ${color}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1.5">{sub}</p>}
    </div>
  )
}

export default function MetricsGrid({ stats, evalData }) {
  const rateColor = stats.rejection_rate > 60 ? 'text-red-500'
    : stats.rejection_rate > 35 ? 'text-yellow-600'
    : 'text-green-600'

  const diffColor = evalData.avg_difficulty >= 3.5 ? 'text-green-600'
    : evalData.avg_difficulty >= 2 ? 'text-yellow-600'
    : 'text-red-500'

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <Metric
        label="שאלות פעילות"
        value={stats.total_active.toLocaleString()}
        sub={`${stats.total_sources} מקורות`}
      />
      <Metric
        label="שיעור דחייה (Agent C)"
        value={`${stats.rejection_rate}%`}
        sub={`${stats.total_rejected} נדחו מתוך ${stats.total_active + stats.total_rejected}`}
        color={rateColor}
      />
      <Metric
        label="קושי ממוצע"
        value={evalData.avg_difficulty.toFixed(1)}
        sub="סקלה 1–5"
        color={diffColor}
      />
      <Metric
        label="קטגוריות פעילות"
        value={Object.keys(evalData.category_distribution || {}).length}
        sub="מתוך 8 קטגוריות"
      />
    </div>
  )
}
