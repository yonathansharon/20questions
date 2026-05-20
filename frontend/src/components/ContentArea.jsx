import CategoryBadge from './CategoryBadge.jsx'
import DifficultyDots from './DifficultyDots.jsx'

export default function ContentArea({
  gameState, questions, currentIndex,
  onStart, onReveal, onScore, onNav, quizVersion = 0
}) {
  const q = questions[currentIndex]
  const isFirst = currentIndex === 0
  const isLast = currentIndex === questions.length - 1

  // ── START STATE ────────────────────────────────────────────────
  if (gameState === 'start') {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-8 py-12">
        <div className="text-center">
          {quizVersion > 0 ? (
            <p className="text-green-600 text-sm font-bold mb-2 bg-green-50 px-3 py-1 rounded-full inline-block">
              ✓ שאלות ערובבו — סט חדש מוכן!
            </p>
          ) : (
            <p className="text-gray-500 text-lg mb-2 font-medium">סוף שבוע</p>
          )}
          <h1 className="text-7xl font-black text-gray-900 leading-none tracking-tight">
            20
          </h1>
          <h1 className="text-5xl font-black text-gray-900 leading-none mt-1">
            שאלות
          </h1>
          <p className="mt-4 text-gray-500 text-sm max-w-xs text-center leading-relaxed">
            עשרים שאלות מגוונות על היסטוריה, מדע, תרבות ועוד — בדקו כמה אתם יודעים
          </p>
        </div>

        <button
          onClick={onStart}
          className="px-12 py-4 bg-quiz-yellow text-gray-900 font-black text-2xl rounded-full shadow-lg hover:shadow-xl hover:bg-yellow-400 active:scale-95 transition-all duration-150"
        >
          התחילו!
        </button>

        <p className="text-xs text-gray-400">
          ענו על כל 20 השאלות ובדקו את הציון שלכם
        </p>
      </div>
    )
  }

  // ── QUESTION & REVEAL STATES ───────────────────────────────────
  return (
    <div className="flex flex-col h-full">

      {/* Top bar: question number + metadata */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <span className="w-10 h-10 rounded-full bg-quiz-yellow text-gray-900 font-black text-lg flex items-center justify-center shadow-sm">
            {currentIndex + 1}
          </span>
          <CategoryBadge category={q.category} />
        </div>
        <DifficultyDots level={q.metadata?.difficulty ?? q.difficulty ?? 3} />
      </div>

      {/* Question text */}
      <div className="flex-1 flex flex-col justify-center">
        <p className="text-2xl font-bold text-gray-900 leading-relaxed mb-8">
          {q.question_text}
        </p>

        {/* Answer reveal */}
        {gameState === 'reveal' && (
          <div className="mb-8 p-5 bg-white rounded-2xl border-2 border-blue-300 shadow-sm">
            <p className="text-xs text-blue-500 font-semibold uppercase tracking-widest mb-2">
              תשובה
            </p>
            <p className="text-xl font-bold text-blue-700">
              {q.correct_answer}
            </p>
            {q.metadata?.source_url && (
              <a
                href={q.metadata.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 text-xs text-gray-400 hover:text-blue-500 underline break-all block"
              >
                מקור: ויקיפדיה
              </a>
            )}
          </div>
        )}

        {/* Self-scoring buttons */}
        {gameState === 'reveal' && (
          <div className="flex flex-col items-center gap-3">
            <p className="text-base font-semibold text-gray-600">האם צדקת?</p>
            <div className="flex gap-4">
              <button
                onClick={() => onScore(true)}
                className="w-16 h-16 rounded-full bg-green-500 text-white text-2xl font-black shadow-md hover:bg-green-600 hover:scale-105 active:scale-95 transition-all duration-150"
              >
                ✓
              </button>
              <button
                onClick={() => onScore(false)}
                className="w-16 h-16 rounded-full bg-gray-400 text-white text-2xl font-black shadow-md hover:bg-red-400 hover:scale-105 active:scale-95 transition-all duration-150"
              >
                ✗
              </button>
            </div>
          </div>
        )}

        {/* Reveal button */}
        {gameState === 'question' && (
          <div className="flex justify-center">
            <button
              onClick={onReveal}
              className="px-10 py-3 border-2 border-gray-800 text-gray-800 font-bold text-lg rounded-full hover:bg-gray-800 hover:text-white active:scale-95 transition-all duration-150"
            >
              תשובה
            </button>
          </div>
        )}
      </div>

      {/* Navigation: Prev / Next */}
      <div className="flex justify-between items-center pt-4 border-t border-gray-200">
        <button
          onClick={() => onNav(-1)}
          disabled={isFirst}
          className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          ← הקודמת
        </button>
        <span className="text-xs text-gray-400">
          {currentIndex + 1} / {questions.length}
        </span>
        <button
          onClick={() => onNav(1)}
          disabled={isLast}
          className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          הבאה →
        </button>
      </div>
    </div>
  )
}
