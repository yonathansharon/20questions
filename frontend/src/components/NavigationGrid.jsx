export default function NavigationGrid({ questions, answers, currentIndex, gameState, onSelect }) {
  function circleClass(i) {
    if (answers[i].correct === true) return 'quiz-circle quiz-circle-correct'
    if (answers[i].correct === false) return 'quiz-circle quiz-circle-incorrect'
    if (i === currentIndex && gameState !== 'start') return 'quiz-circle quiz-circle-active'
    return 'quiz-circle quiz-circle-default'
  }

  function circleLabel(i) {
    if (answers[i].correct === true) return '✓'
    if (answers[i].correct === false) return '✗'
    return i + 1
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-xl font-bold text-gray-800 text-center">שאלות</h2>

      {/* 4×5 grid — 4 columns, 5 rows */}
      <div className="grid grid-cols-4 gap-2">
        {questions.map((_, i) => (
          <button
            key={i}
            className={circleClass(i)}
            onClick={() => gameState !== 'start' && onSelect(i)}
            title={questions[i].category}
          >
            {circleLabel(i)}
          </button>
        ))}
      </div>

      {/* Score tally */}
      <div className="mt-2 text-center text-sm text-gray-500 font-medium">
        {answers.filter(a => a.correct === true).length} נכון ·{' '}
        {answers.filter(a => a.correct === false).length} שגוי ·{' '}
        {answers.filter(a => a.correct === null).length} נותרו
      </div>

      {/* Bonus button */}
      <button className="mt-2 w-full py-2 rounded-full border-2 border-quiz-yellow bg-white text-gray-800 font-bold text-sm hover:bg-quiz-yellow transition-colors duration-200">
        ★ בונוס
      </button>
    </div>
  )
}
