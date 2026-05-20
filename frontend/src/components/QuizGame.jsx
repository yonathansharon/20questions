import { useState } from 'react'
import NavigationGrid from './NavigationGrid.jsx'
import ContentArea from './ContentArea.jsx'

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export default function QuizGame({ questions, onNewQuiz, loadingNew, backendOnline, quizVersion }) {
  const [gameState, setGameState] = useState('start')
  const [currentIndex, setCurrentIndex] = useState(0)
  const [activeQuestions, setActiveQuestions] = useState(() => shuffle(questions))
  const [answers, setAnswers] = useState(
    () => shuffle(questions).map(() => ({ correct: null }))
  )

  // When a fresh question set arrives, reshuffle and reset the game
  const [prevQuestions, setPrevQuestions] = useState(questions)
  if (questions !== prevQuestions) {
    const shuffled = shuffle(questions)
    setPrevQuestions(questions)
    setActiveQuestions(shuffled)
    setAnswers(shuffled.map(() => ({ correct: null })))
    setCurrentIndex(0)
    setGameState('start')
  }

  function handleStart() {
    const shuffled = shuffle(questions)
    setActiveQuestions(shuffled)
    setAnswers(shuffled.map(() => ({ correct: null })))
    setCurrentIndex(0)
    setGameState('question')
  }

  function handleReveal() {
    setGameState('reveal')
  }

  function handleScore(isCorrect) {
    setAnswers(prev => {
      const next = [...prev]
      next[currentIndex] = { correct: isCorrect }
      return next
    })
    const nextUnanswered = answers.findIndex(
      (a, i) => i > currentIndex && a.correct === null
    )
    if (nextUnanswered !== -1) {
      setCurrentIndex(nextUnanswered)
    } else if (currentIndex < activeQuestions.length - 1) {
      setCurrentIndex(prev => prev + 1)
    }
    setGameState('question')
  }

  function handleNav(delta) {
    const next = currentIndex + delta
    if (next >= 0 && next < activeQuestions.length) {
      setCurrentIndex(next)
      setGameState('question')
    }
  }

  function handleSelectFromGrid(i) {
    setCurrentIndex(i)
    setGameState(answers[i].correct !== null ? 'reveal' : 'question')
  }

  function handleRestart() {
    const reshuffled = shuffle(activeQuestions)
    setActiveQuestions(reshuffled)
    setAnswers(reshuffled.map(() => ({ correct: null })))
    setCurrentIndex(0)
    setGameState('start')
  }

  const allAnswered = answers.every(a => a.correct !== null)
  const score = answers.filter(a => a.correct === true).length

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="bg-gray-900 text-white px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-quiz-yellow font-black text-2xl">20</span>
            <span className="font-bold text-lg">שאלות</span>
            {backendOnline && (
              <span className="text-green-400 text-xs font-medium bg-green-400/10 px-2 py-0.5 rounded-full">
                ● Live
              </span>
            )}
          </div>
          {gameState !== 'start' && (
            <button
              onClick={handleRestart}
              className="text-gray-400 hover:text-white text-sm underline transition-colors"
            >
              התחל מחדש
            </button>
          )}
        </div>

        {/* Body */}
        <div className="flex min-h-[600px]">
          <div className="flex-1 bg-quiz-blue-bg p-8">
            <ContentArea
              gameState={gameState}
              questions={activeQuestions}
              currentIndex={currentIndex}
              onStart={handleStart}
              onReveal={handleReveal}
              onScore={handleScore}
              onNav={handleNav}
              quizVersion={quizVersion}
            />
          </div>

          {gameState !== 'start' && (
            <div className="w-56 bg-gray-50 border-r border-gray-200 p-5 flex flex-col justify-start">
              <NavigationGrid
                questions={activeQuestions}
                answers={answers}
                currentIndex={currentIndex}
                gameState={gameState}
                onSelect={handleSelectFromGrid}
              />
            </div>
          )}
        </div>

        {/* Final score + New Quiz CTA */}
        {allAnswered && gameState !== 'start' && (
          <div className="bg-quiz-yellow px-8 py-5">
            <div className="flex items-center justify-between mb-4">
              <span className="font-black text-gray-900 text-lg">
                סיימתם! ציון סופי:
              </span>
              <span className="font-black text-gray-900 text-3xl">
                {score} / {activeQuestions.length}
              </span>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleRestart}
                className="flex-1 py-2.5 bg-gray-900 text-white font-bold rounded-xl hover:bg-gray-700 transition-colors text-sm"
              >
                🔁 נסה שוב — סדר חדש
              </button>
              <button
                onClick={onNewQuiz}
                disabled={loadingNew}
                className="flex-1 py-2.5 bg-white text-gray-900 font-bold rounded-xl hover:bg-gray-100 disabled:opacity-60 transition-colors text-sm border-2 border-gray-900 flex items-center justify-center gap-2"
              >
                {loadingNew ? (
                  <>
                    <span className="w-4 h-4 border-2 border-gray-600 border-t-transparent rounded-full animate-spin inline-block" />
                    טוען שאלות חדשות…
                  </>
                ) : (
                  <>✨ שאלות חדשות {backendOnline ? '(AI)' : '(ערבוב)'}</>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Loading overlay for new quiz */}
        {loadingNew && gameState === 'start' && (
          <div className="bg-quiz-yellow/20 px-8 py-3 text-center">
            <span className="w-4 h-4 border-2 border-gray-600 border-t-transparent rounded-full animate-spin inline-block mr-2" />
            <span className="text-sm font-medium text-gray-700">מביא שאלות חדשות מה-AI…</span>
          </div>
        )}
      </div>
    </div>
  )
}
