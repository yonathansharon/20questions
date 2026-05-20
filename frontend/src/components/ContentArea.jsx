export default function ContentArea({
  gameState, questions, currentIndex,
  onStart, onReveal, onScore, onNav, answers = [],
}) {
  const q = questions[currentIndex]
  const isFirst  = currentIndex === 0
  const isLast   = currentIndex === questions.length - 1
  const answered = answers[currentIndex]?.correct !== null && answers[currentIndex]?.correct !== undefined

  // ── START ─────────────────────────────────────────────────────────
  if (gameState === 'start') {
    return (
      <div className="flex flex-col h-full" dir="rtl">
        {/* White upper half */}
        <div className="flex-1 flex flex-col items-center justify-end pb-10 bg-white">
          <span className="font-black text-gray-900 leading-none"
            style={{ fontSize: 'clamp(7rem, 30vw, 11rem)' }}>
            20
          </span>
          <span className="font-black text-gray-900 mt-1"
            style={{ fontSize: 'clamp(2.5rem, 10vw, 4rem)' }}>
            שאלות
          </span>
        </div>

        {/* Button straddling the two halves */}
        <div className="relative z-10 flex justify-center" style={{ height: 0 }}>
          <button
            onClick={onStart}
            className="absolute -translate-y-1/2 w-32 h-32 rounded-full bg-quiz-yellow border-[3px] border-gray-900 font-black text-xl text-gray-900 shadow-xl hover:scale-105 active:scale-95 transition-transform"
            style={{ fontSize: 'clamp(1.1rem, 4vw, 1.4rem)' }}
          >
            התחילו!
          </button>
        </div>

        {/* Light-blue lower half */}
        <div className="bg-quiz-blue-bg" style={{ flex: '0 0 42%' }} />
      </div>
    )
  }

  // ── QUESTION / REVEAL ─────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full" dir="rtl">

      {/* ── Top bar ── */}
      <div className="flex items-center justify-between px-5 pt-5 pb-3 shrink-0">
        {/* Left: dots progress */}
        <div className="flex gap-1 flex-wrap max-w-[55%]">
          {questions.map((_, i) => {
            const a = answers[i]
            const isActive = i === currentIndex
            let bg = 'bg-gray-200'
            if (a?.correct === true)  bg = 'bg-green-400'
            if (a?.correct === false) bg = 'bg-red-400'
            if (isActive && a?.correct == null) bg = 'bg-gray-800'
            return (
              <button
                key={i}
                onClick={() => onNav(i - currentIndex)}
                className={`rounded-full transition-all ${bg} ${isActive ? 'w-4 h-4' : 'w-2.5 h-2.5'}`}
              />
            )
          })}
        </div>
        {/* Right: counter */}
        <span className="text-[#1B5DBB] font-bold text-lg tabular-nums">
          {currentIndex + 1}/{questions.length}
        </span>
      </div>

      {/* ── Question area ── */}
      <div className="flex-1 flex flex-col justify-center px-6 pb-4">
        {/* Category (small) */}
        {q.category && (
          <p className="text-center text-xs text-gray-400 font-medium mb-4 uppercase tracking-wider">
            {q.category}
          </p>
        )}

        {/* Question text — large, centered */}
        <p
          className="text-center font-bold text-gray-900 leading-relaxed"
          style={{ fontSize: 'clamp(1.25rem, 4vw, 1.75rem)' }}
        >
          {q.question_text}
        </p>

        {/* Reveal button (question state only) */}
        {gameState === 'question' && (
          <div className="flex justify-center mt-8">
            <button
              onClick={onReveal}
              className="px-8 py-2.5 border-2 border-gray-800 text-gray-900 font-bold rounded-full hover:bg-gray-900 hover:text-white active:scale-95 transition-all"
              style={{ fontSize: 'clamp(0.95rem, 3vw, 1.1rem)' }}
            >
              תשובה
            </button>
          </div>
        )}
      </div>

      {/* ── Bottom: nav arrows when still in question state ── */}
      {gameState === 'question' && (
        <div className="flex justify-between px-6 pb-6 shrink-0">
          <NavArrow onClick={() => onNav(-1)} disabled={isFirst}  dir="right" />
          <NavArrow onClick={() => onNav(1)}  disabled={isLast}   dir="left"  />
        </div>
      )}

      {/* ── Blue reveal panel ── */}
      {gameState === 'reveal' && (
        <div className="shrink-0 bg-[#1B5DBB] rounded-t-3xl px-6 pt-6 pb-4">

          {/* Answer */}
          <p className="text-center text-white font-bold mb-1"
            style={{ fontSize: 'clamp(1.2rem, 4.5vw, 1.6rem)' }}>
            {q.correct_answer}
          </p>

          {/* Explanation (if any) */}
          {q.explanation && (
            <p className="text-center text-blue-200 text-xs leading-relaxed mb-3 max-w-sm mx-auto">
              {q.explanation}
            </p>
          )}

          {/* Score prompt */}
          {!answered && (
            <>
              <p className="text-center text-blue-200 text-sm mt-3 mb-3">האם צדקת?</p>
              <div className="flex justify-center gap-5 mb-4">
                <ScoreBtn type="wrong" onClick={() => onScore(false)} />
                <ScoreBtn type="right" onClick={() => onScore(true)}  />
              </div>
            </>
          )}

          {/* Nav arrows (inside blue panel) */}
          <div className="flex justify-between items-center pt-2">
            <NavArrow onClick={() => onNav(-1)} disabled={isFirst} dir="right" />
            <NavArrow onClick={() => onNav(1)}  disabled={isLast}  dir="left"  />
          </div>
        </div>
      )}
    </div>
  )
}

// ── Yellow circle nav arrow ─────────────────────────────────────────
function NavArrow({ onClick, disabled, dir }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-12 h-12 rounded-full bg-quiz-yellow border-2 border-gray-900 font-black text-gray-900 text-xl flex items-center justify-center disabled:opacity-25 active:scale-95 transition-all shadow-sm"
    >
      {dir === 'right' ? '‹' : '›'}
    </button>
  )
}

// ── Score button (wrong / right) ────────────────────────────────────
function ScoreBtn({ type, onClick }) {
  const isRight = type === 'right'
  return (
    <button
      onClick={onClick}
      className="w-14 h-14 rounded-full border-2 border-white text-white text-2xl flex items-center justify-center hover:bg-white/20 active:scale-95 transition-all font-bold"
    >
      {isRight ? '✓' : '✕'}
    </button>
  )
}
