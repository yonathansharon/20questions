const CATEGORY_COLORS = {
  'היסטוריה':   'bg-amber-100 text-amber-800',
  'מדע':        'bg-blue-100 text-blue-800',
  'גאוגרפיה':   'bg-green-100 text-green-800',
  'ספרות':      'bg-purple-100 text-purple-800',
  'מוזיקה':     'bg-pink-100 text-pink-800',
  'ביולוגיה':   'bg-teal-100 text-teal-800',
  'אמנות':      'bg-orange-100 text-orange-800',
  'פיזיקה':     'bg-indigo-100 text-indigo-800',
  'קולנוע':     'bg-red-100 text-red-800',
  'מתמטיקה':    'bg-cyan-100 text-cyan-800',
  'ספורט':      'bg-lime-100 text-lime-800',
  'כלכלה':      'bg-yellow-100 text-yellow-800',
  'פילוסופיה':  'bg-violet-100 text-violet-800',
  'טכנולוגיה':  'bg-sky-100 text-sky-800',
  'כימיה':      'bg-emerald-100 text-emerald-800',
  'אסטרונומיה': 'bg-blue-200 text-blue-900',
}

export default function CategoryBadge({ category }) {
  const cls = CATEGORY_COLORS[category] ?? 'bg-gray-100 text-gray-700'
  return (
    <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide ${cls}`}>
      {category}
    </span>
  )
}
