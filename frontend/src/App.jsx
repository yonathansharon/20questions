import { useState, useEffect, useCallback, Component } from 'react'
import QuizGame from './components/QuizGame.jsx'
import AdminConsole from './pages/AdminConsole.jsx'
import { DUMMY_QUESTIONS } from './dummyData.js'
import { api } from './api.js'

class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null } }
  static getDerivedStateFromError(e) { return { error: e } }
  render() {
    if (this.state.error) return (
      <div dir="ltr" style={{padding:32,fontFamily:'monospace',background:'#fee',color:'#900',whiteSpace:'pre-wrap'}}>
        <b>React crash — copy this to the chat:</b>{'\n\n'}
        {this.state.error?.toString()}{'\n'}
        {this.state.error?.stack}
      </div>
    )
    return this.props.children
  }
}

export default function App() {
  const [mode, setMode] = useState(
    () => window.location.hash === '#admin' ? 'admin' : 'quiz'
  )
  const [questions, setQuestions]     = useState(DUMMY_QUESTIONS)
  const [loadingNew, setLoadingNew]   = useState(false)
  const [backendStatus, setBackendStatus] = useState('checking')
  const [quizVersion, setQuizVersion] = useState(0)

  // Central health check — shared by quiz and admin
  useEffect(() => {
    let cancelled = false
    const check = async () => {
      try {
        await api.health()
        if (!cancelled) setBackendStatus('online')
      } catch {
        if (!cancelled) setBackendStatus('offline')
      }
    }
    check()
    const id = setInterval(check, 5000)
    return () => { cancelled = true; clearInterval(id) }
  }, [])

  // Initial question load — silent fallback to dummy data
  useEffect(() => {
    api.getQuestions()
      .then(data => { if (data?.length >= 5) setQuestions(data) })
      .catch(() => {})
  }, [])

  // Fetch a fresh shuffled set from the backend (or shuffle locally if offline)
  const refreshQuestions = useCallback(async () => {
    setLoadingNew(true)
    try {
      const data = await api.getQuestions()
      if (data?.length >= 5) {
        setQuestions(data)
      } else {
        setQuestions(q => [...q].sort(() => Math.random() - 0.5))
      }
    } catch {
      setQuestions(q => [...q].sort(() => Math.random() - 0.5))
    } finally {
      setLoadingNew(false)
      setQuizVersion(v => v + 1)
    }
  }, [])

  function handleBackFromAdmin() {
    setMode('quiz')
    refreshQuestions()
  }

  if (mode === 'admin') {
    return (
      <ErrorBoundary>
        <AdminConsole
          onBack={handleBackFromAdmin}
          backendStatus={backendStatus}
        />
      </ErrorBoundary>
    )
  }

  return (
    <ErrorBoundary>
      <div className="relative">
        <button
          onClick={() => setMode('admin')}
          title="Admin Console"
          className="fixed bottom-5 left-5 z-50 w-10 h-10 bg-gray-800 text-white rounded-full shadow-lg hover:bg-gray-600 transition-colors flex items-center justify-center text-lg"
        >
          ⚙
        </button>
        <QuizGame
          questions={questions}
          onNewQuiz={refreshQuestions}
          loadingNew={loadingNew}
          backendOnline={backendStatus === 'online'}
          quizVersion={quizVersion}
        />
      </div>
    </ErrorBoundary>
  )
}
