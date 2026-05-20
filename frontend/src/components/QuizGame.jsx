import { useState } from 'react'
import ContentArea from './ContentArea.jsx'

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export default function QuizGame({ questions, onNewQuiz, loadingNew, backendOnline }) {
  const [gameState, setGameState]       = useState('start')
  const [currentIndex, setCurrentIndex] = useState(0)
  const [activeQuestions, setActiveQ]   = useState(() => shuffle(questions))
  const [answers, setAnswers]           = useState(() => shuffle(questions).map(() => ({ correct: null })))
  const [prevQ, setPrevQ]               = useState(questions)

  // New question set arrived → reshuffle + reset
  if (questions !== prevQ) {
    const s = shuffle(questions)
    setPrevQ(questions)
    setActiveQ(s)
    setAnswers(s.map(() => ({ correct: null })))
    setCurrentIndex(0)
    setGameState('start')
  }

  function handleStart() {
    const s = shuffle(questions)
    setActiveQ(s)
    setAnswers(s.map(() => ({ correct: null })))
    setCurrentIndex(0)
    setGameState('question')
  }

  function handleReveal() { setGameState('reveal') }

  function handleScore(isCorrect) {
    setAnswers(prev => {
      const next = [...prev]
      next[currentIndex] = { correct: isCorrect }
      return next
    })
    // auto-advance to next unanswered
    const nextIdx = answers.findIndex((a, i) => i > currentIndex && a.correct === null)
    if (nextIdx !== -1) {
      setCurrentIndex(nextIdx)
    } else if (currentIndex < activeQuestions.length - 1) {
      setCurrentIndex(i => i + 1)
    }
    setGameState('question')
  }

  function handleNav(delta) {
    const next = currentIndex + delta
    if (next >= 0 && next < activeQuestions.length) {
      setCurrentIndex(next)
      const alreadyAnswered = answers[next]?.correct !== null
      setGameState(alreadyAnswered ? 'reveal' : 'question')
    }
  }

  function handleRestart() {
    const s = shuffle(activeQuestions)
    setActiveQ(s)
    setAnswers(s.map(() => ({ correct: null })))
    setCurrentIndex(0)
    setGameState('start')
  }

  const allAnswered = answers.every(a => a.correct !== null)
  const score       = answers.filter(a => a.correct === true).length
  const total       = activeQuestions.length

  return (
    // Full-screen container, centred card on large screens
    <div className="min-h-[100dvh] bg-gray-200 flex items-center justify-center" dir="rtl">
      <div className="relative w-full max-w-md min-h-[100dvh] md:min-h-[750px] md:rounded-3xl md:shadow-2xl overflow-hidden bg-white flex flex-col">

        {/* ── X / back button (hidden on start screen) ── */}
        {gameState !== 'start' && (
          <button
            onClick={handleRestart}
            className="absolute top-4 right-4 z-20 w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-900 text-lg transition-colors"
            title="חזור להתחלה"
          >
            ✕
          </button>
        )}

        {/* ── Live badge ── */}
        {backendOnline && gameState === 'start' && (
          <div className="absolute top-4 left-4 z-20 flex items-center gap-1.5 bg-green-100 text-green-700 text-xs font-semibold px-2.5 py-1 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            Live
          </div>
        )}

        {/* ── Main content ── */}
        <div className="flex-1 flex flex-col">
          <ContentArea
            gameState={gameState}
            questions={activeQuestions}
            currentIndex={currentIndex}
            answers={answers}
            onStart={handleStart}
            onReveal={handleReveal}
            onScore={handleScore}
            onNav={handleNav}
          />
        </div>

        {/* ── Final score overlay ── */}
        {allAnswered && gameState !== 'start' && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-white px-8" dir="rtl">
            {/* Score ring */}
            <div className="relative w-40 h-40 mb-6">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="42" fill="none" stroke="#E5E7EB" strokeWidth="10" />
                <circle
                  cx="50" cy="50" r="42" fill="none"
                  stroke="#F5C518" strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={`${(score / total) * 264} 264`}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-black text-gray-900">{score}</span>
                <span className="text-sm text-gray-500 font-medium">מתוך {total}</span>
              </div>
            </div>

            <h2 className="text-2xl font-black text-gray-900 mb-2">
              {score === total ? '🎉 מושלם!' :
               score >= total * 0.8 ? '⭐ כל הכבוד!' :
               score >= total * 0.5 ? '👍 לא רע!' : '📚 יש מה ללמוד'}
            </h2>
            <p className="text-gray-500 text-sm mb-8 text-center">
              {score === total
                ? 'ענית נכון על כל השאלות!'
                : `ענית נכון על ${score} מתוך ${total} שאלות`}
            </p>

            <div className="flex flex-col gap-3 w-full max-w-xs">
              <button
                onClick={handleRestart}
                className="w-full py-3 bg-gray-900 text-white font-bold rounded-2xl hover:bg-gray-700 active:scale-95 transition-all"
              >
                🔁 נסה שוב — סדר חדש
              </button>
              <button
                onClick={onNewQuiz}
                disabled={loadingNew}
                className="w-full py-3 bg-quiz-yellow text-gray-900 font-bold rounded-2xl border-2 border-gray-900 hover:brightness-95 disabled:opacity-60 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                {loadingNew
                  ? <><span className="w-4 h-4 border-2 border-gray-600 border-t-transparent rounded-full animate-spin" /> טוען…</>
                  : '✨ שאלות חדשות'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
