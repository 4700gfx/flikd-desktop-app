import React, { useState, useEffect, useRef, useCallback } from 'react'
import ReactDOM from 'react-dom'

/**
 * QuizModal — Standalone AI Quiz Component
 * ─────────────────────────────────────────
 * Fully self-contained modal for AI-powered quiz verification.
 * Replaces any inline quiz logic throughout the app.
 *
 * Quiz types:
 *   'movie'   → 5 questions, 60% pass, 1-day cooldown
 *   'episode' → 2 questions, 50% pass, no cooldown
 *   'season'  → 10 questions, 80% pass, 7-day cooldown
 *   'list'    → 3 questions, 60% pass, 1-day cooldown  ← NEW for navbar lists
 *
 * Props:
 *   type        - 'movie' | 'episode' | 'season' | 'list'
 *   title       - Content title
 *   seasonNum   - (optional) for episode/season types
 *   episodeNum  - (optional) for episode type
 *   episodeName - (optional) for episode type
 *   posterPath  - (optional) TMDB poster path
 *   refId       - Unique reference ID for cooldown tracking
 *   userId      - Current user ID
 *   onPass      - Callback on successful quiz completion
 *   onClose     - Callback to close modal
 *   onFail      - (optional) Callback on failed quiz
 */

const OPENAI_KEY = import.meta.env.VITE_OPENAI_API_KEY

const QUIZ_CONFIG = {
  movie:   { questions: 5,  passRate: 0.60, cooldownDays: 1,  label: 'Movie Verification',   emoji: '🎬', color: '#D4AF37' },
  episode: { questions: 2,  passRate: 0.50, cooldownDays: 0,  label: 'Episode Check',         emoji: '📺', color: '#60A5FA' },
  season:  { questions: 10, passRate: 0.80, cooldownDays: 7,  label: 'Season Completion',     emoji: '🏆', color: '#A78BFA' },
  list:    { questions: 3,  passRate: 0.60, cooldownDays: 1,  label: 'List Item Verified',    emoji: '📋', color: '#34D399' },
}

/* ─── Cooldown helpers ─────────────────────────────── */
export const checkQuizCooldown = async (userId, refId, type) => {
  const cfg = QUIZ_CONFIG[type]
  if (!cfg || cfg.cooldownDays === 0) return { blocked: false }
  try {
    const key  = `quiz_cooldown_${userId}_${refId}`
    const stored = localStorage.getItem(key)
    if (!stored) return { blocked: false }
    const { passedAt } = JSON.parse(stored)
    const daysSince = (Date.now() - new Date(passedAt)) / 86_400_000
    if (daysSince < cfg.cooldownDays) {
      const hoursLeft = Math.ceil((cfg.cooldownDays - daysSince) * 24)
      return { blocked: true, hoursLeft }
    }
    return { blocked: false }
  } catch { return { blocked: false } }
}

export const recordQuizPass = (userId, refId, type, score) => {
  try {
    const key = `quiz_cooldown_${userId}_${refId}`
    localStorage.setItem(key, JSON.stringify({ passedAt: new Date().toISOString(), score, type }))
  } catch {}
}

/* ─── Spinner ──────────────────────────────────────── */
const Spin = ({ size = 20, color = '#D4AF37' }) => (
  <svg width={size} height={size} viewBox='0 0 24 24' fill='none'
    style={{ animation: 'spin 0.8s linear infinite', color, flexShrink: 0 }}>
    <circle cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='3' opacity='0.2' />
    <path fill='currentColor' opacity='0.8' d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z' />
  </svg>
)

/* ─── Progress ring ─────────────────────────────────── */
const ProgressRing = ({ pct, size = 80, stroke = 6, color = '#D4AF37', children }) => {
  const R = (size - stroke) / 2
  const C = 2 * Math.PI * R
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0 }}>
      <circle cx={size/2} cy={size/2} r={R} fill='none' stroke='rgba(255,255,255,0.06)' strokeWidth={stroke} />
      <circle cx={size/2} cy={size/2} r={R} fill='none' stroke={color} strokeWidth={stroke}
        strokeDasharray={`${C * pct / 100} ${C}`} strokeLinecap='round'
        transform={`rotate(-90 ${size/2} ${size/2})`}
        style={{ transition: 'stroke-dasharray 0.5s ease' }} />
      {children}
    </svg>
  )
}

/* ─── Generate quiz via OpenAI ─────────────────────── */
const generateQuiz = async (type, title, seasonNum, episodeNum, episodeName) => {
  const cfg = QUIZ_CONFIG[type]
  let prompt = ''

  if (type === 'movie') {
    prompt = `Generate ${cfg.questions} multiple-choice trivia questions about the movie "${title}". Questions should test genuine knowledge (plot, characters, themes, director, year). Each question must have 4 options with exactly one correct answer. Return ONLY valid JSON in this exact format: {"questions":[{"q":"Question text","options":["A","B","C","D"],"answer":0}]} where answer is the 0-based index of the correct option.`
  } else if (type === 'episode') {
    prompt = `Generate ${cfg.questions} multiple-choice questions about Season ${seasonNum}, Episode ${episodeNum} "${episodeName}" of the TV show "${title}". Focus on episode-specific events. Return ONLY valid JSON: {"questions":[{"q":"Question text","options":["A","B","C","D"],"answer":0}]}`
  } else if (type === 'season') {
    prompt = `Generate ${cfg.questions} multiple-choice questions covering Season ${seasonNum} of "${title}". Test knowledge of major plot points, character arcs, and key moments across the season. Return ONLY valid JSON: {"questions":[{"q":"Question text","options":["A","B","C","D"],"answer":0}]}`
  } else if (type === 'list') {
    prompt = `Generate ${cfg.questions} general knowledge multiple-choice questions about "${title}" (could be a movie or TV show). Make them moderately challenging. Return ONLY valid JSON: {"questions":[{"q":"Question text","options":["A","B","C","D"],"answer":0}]}`
  }

  if (!OPENAI_KEY) {
    // Fallback mock questions for development
    return Array.from({ length: cfg.questions }, (_, i) => ({
      q: `Sample question ${i + 1} about ${title}?`,
      options: ['Option A', 'Option B', 'Option C', 'Option D'],
      answer: Math.floor(Math.random() * 4),
    }))
  }

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 1500,
    }),
  })

  if (!res.ok) throw new Error(`OpenAI ${res.status}`)
  const data = await res.json()
  const text = data.choices[0].message.content.trim()
  const clean = text.replace(/```json|```/g, '').trim()
  const parsed = JSON.parse(clean)
  return parsed.questions
}

/* ─── QUIZ STATES ───────────────────────────────────── */
// idle → loading → active → result

const QuizModal = ({
  type = 'movie',
  title,
  seasonNum,
  episodeNum,
  episodeName,
  posterPath,
  refId,
  userId,
  onPass,
  onClose,
  onFail,
}) => {
  const cfg = QUIZ_CONFIG[type]

  const [phase,       setPhase]       = useState('idle')   // idle | loading | active | result
  const [questions,   setQuestions]   = useState([])
  const [current,     setCurrent]     = useState(0)
  const [answers,     setAnswers]     = useState({})        // { index: chosenOptionIdx }
  const [selected,    setSelected]    = useState(null)      // current answer choice
  const [revealed,    setRevealed]    = useState(false)     // show correct/wrong
  const [score,       setScore]       = useState(0)
  const [error,       setError]       = useState(null)
  const [timeLeft,    setTimeLeft]    = useState(30)        // per-question timer
  const [timerActive, setTimerActive] = useState(false)
  const timerRef = useRef(null)
  const overlayRef = useRef(null)

  const tmdbImg = (path) => path ? `https://image.tmdb.org/t/p/w342${path}` : null
  const passCount = Math.ceil(cfg.questions * cfg.passRate)

  /* ── Timer ── */
  useEffect(() => {
    if (!timerActive) return
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current)
          // Auto-submit no answer
          handleAnswer(-1)
          return 0
        }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [timerActive, current]) // eslint-disable-line

  /* ── Start quiz ── */
  const startQuiz = async () => {
    setPhase('loading')
    setError(null)
    try {
      const qs = await generateQuiz(type, title, seasonNum, episodeNum, episodeName)
      setQuestions(qs)
      setCurrent(0)
      setAnswers({})
      setSelected(null)
      setRevealed(false)
      setScore(0)
      setTimeLeft(30)
      setPhase('active')
      setTimerActive(true)
    } catch (e) {
      setError('Failed to generate quiz. Please try again.')
      setPhase('idle')
    }
  }

  /* ── Answer selection ── */
  const handleAnswer = useCallback((optionIdx) => {
    if (revealed) return
    clearInterval(timerRef.current)
    setTimerActive(false)
    setSelected(optionIdx)
    setRevealed(true)

    const q = questions[current]
    const correct = optionIdx === q?.answer
    if (correct) setScore(s => s + 1)
    setAnswers(prev => ({ ...prev, [current]: { chosen: optionIdx, correct } }))
  }, [revealed, questions, current])

  /* ── Next question ── */
  const nextQuestion = () => {
    if (current + 1 >= questions.length) {
      // Calculate final score
      const finalScore = score + (answers[current]?.correct ? 0 : 0) // already tallied
      endQuiz()
    } else {
      setCurrent(c => c + 1)
      setSelected(null)
      setRevealed(false)
      setTimeLeft(30)
      setTimerActive(true)
    }
  }

  const endQuiz = () => {
    clearInterval(timerRef.current)
    setTimerActive(false)
    setPhase('result')
  }

  useEffect(() => {
    if (phase === 'active' && revealed) {
      // Brief delay then auto-advance or wait for user
    }
  }, [revealed, phase])

  /* ── Result ── */
  const passed = score >= passCount
  const scorePct = questions.length > 0 ? Math.round((score / questions.length) * 100) : 0

  useEffect(() => {
    if (phase === 'result' && passed) {
      recordQuizPass(userId, refId, type, scorePct)
    }
  }, [phase, passed]) // eslint-disable-line

  /* ── Keyboard ── */
  useEffect(() => {
    const h = (e) => {
      if (e.key === 'Escape') { if (phase !== 'active') onClose() }
      if (phase === 'active' && !revealed) {
        if (e.key === '1') handleAnswer(0)
        if (e.key === '2') handleAnswer(1)
        if (e.key === '3') handleAnswer(2)
        if (e.key === '4') handleAnswer(3)
      }
      if (phase === 'active' && revealed && e.key === 'Enter') nextQuestion()
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [phase, revealed, handleAnswer]) // eslint-disable-line

  /* ── Backdrop click ── */
  const handleOverlayClick = (e) => {
    if (e.target === overlayRef.current && phase !== 'active') onClose()
  }

  const q = questions[current]
  const timerPct = (timeLeft / 30) * 100
  const timerColor = timeLeft > 15 ? '#D4AF37' : timeLeft > 7 ? '#F59E0B' : '#EF4444'

  return ReactDOM.createPortal(
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.88)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px',
        animation: 'qOverlayIn 0.2s ease-out',
      }}>

      <div style={{
        width: '100%', maxWidth: '560px',
        background: 'linear-gradient(160deg, #0F0F0F 0%, #080808 100%)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '24px',
        boxShadow: '0 40px 120px rgba(0,0,0,0.95), 0 0 0 1px rgba(212,175,55,0.08)',
        overflow: 'hidden',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        animation: 'qModalIn 0.3s cubic-bezier(0.22,1,0.36,1)',
      }}>

        {/* Top accent line */}
        <div style={{ height: '2px', flexShrink: 0, background: `linear-gradient(90deg, transparent, ${cfg.color}, transparent)` }} />

        {/* ── IDLE PHASE ── */}
        {phase === 'idle' && (
          <IdleScreen
            cfg={cfg} type={type} title={title}
            posterPath={posterPath} tmdbImg={tmdbImg}
            passCount={passCount}
            onStart={startQuiz} onClose={onClose}
            seasonNum={seasonNum} episodeNum={episodeNum}
            episodeName={episodeName}
          />
        )}

        {/* ── LOADING PHASE ── */}
        {phase === 'loading' && (
          <LoadingScreen cfg={cfg} title={title} />
        )}

        {/* ── ACTIVE PHASE ── */}
        {phase === 'active' && q && (
          <ActiveScreen
            q={q} current={current} total={questions.length}
            selected={selected} revealed={revealed}
            score={score} passCount={passCount}
            timeLeft={timeLeft} timerPct={timerPct} timerColor={timerColor}
            cfg={cfg} answers={answers}
            onAnswer={handleAnswer}
            onNext={nextQuestion}
            onEndQuiz={endQuiz}
            isLastQuestion={current + 1 >= questions.length}
          />
        )}

        {/* ── RESULT PHASE ── */}
        {phase === 'result' && (
          <ResultScreen
            passed={passed} score={score} total={questions.length}
            scorePct={scorePct} passCount={passCount}
            cfg={cfg} title={title}
            onPass={onPass} onRetry={startQuiz}
            onClose={onClose} onFail={onFail}
            answers={answers} questions={questions}
          />
        )}

        {/* ── ERROR ── */}
        {error && (
          <div style={{ padding: '16px 24px', background: 'rgba(239,68,68,0.1)', borderTop: '1px solid rgba(239,68,68,0.2)' }}>
            <p style={{ color: '#FCA5A5', fontSize: '13px', textAlign: 'center' }}>{error}</p>
          </div>
        )}
      </div>

      <style>{`
        @keyframes qOverlayIn { from{opacity:0} to{opacity:1} }
        @keyframes qModalIn { from{opacity:0;transform:scale(0.94) translateY(12px)} to{opacity:1;transform:scale(1) translateY(0)} }
        @keyframes qFadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes qPulse { 0%,100%{opacity:1} 50%{opacity:0.6} }
        @keyframes qShake { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-4px)} 75%{transform:translateX(4px)} }
        @keyframes qBounce { 0%,100%{transform:scale(1)} 50%{transform:scale(1.05)} }
      `}</style>
    </div>,
    document.body
  )
}



/* ─── IDLE SCREEN ───────────────────────────────────── */
const IdleScreen = ({ cfg, type, title, posterPath, tmdbImg, passCount, onStart, onClose, seasonNum, episodeNum, episodeName }) => {
  const subtitle =
    type === 'episode' ? `S${String(seasonNum).padStart(2,'0')}E${String(episodeNum).padStart(2,'0')} · ${episodeName}` :
    type === 'season'  ? `Season ${seasonNum}` :
    null

  return (
    <div style={{ overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '32px', height: '32px', borderRadius: '10px',
            background: `${cfg.color}18`, border: `1px solid ${cfg.color}30`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px'
          }}>{cfg.emoji}</div>
          <div>
            <p style={{ fontSize: '11px', fontWeight: 800, color: `${cfg.color}80`, textTransform: 'uppercase', letterSpacing: '0.15em', margin: 0 }}>{cfg.label}</p>
            <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.25)', margin: 0 }}>Verify your watch</p>
          </div>
        </div>
        <button onClick={onClose} style={{
          width: '32px', height: '32px', borderRadius: '8px', background: 'none',
          border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.3)',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.2s', fontSize: '14px'
        }}>✕</button>
      </div>

      <div style={{ padding: '28px 24px', display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
        {/* Poster */}
        {posterPath && (
          <img src={tmdbImg(posterPath)} alt={title}
            style={{
              width: '80px', height: '118px', objectFit: 'cover', borderRadius: '12px',
              flexShrink: 0, boxShadow: '0 12px 40px rgba(0,0,0,0.7)',
              border: '1px solid rgba(255,255,255,0.08)'
            }} />
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '26px', color: 'white', margin: '0 0 4px', letterSpacing: '0.06em', lineHeight: 1.1 }}>{title}</h2>
          {subtitle && <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', margin: '0 0 16px' }}>{subtitle}</p>}

          {/* Quiz info pills */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '20px' }}>
            {[
              { label: `${cfg.questions} Questions`, icon: '❓' },
              { label: `${Math.round(cfg.passRate * 100)}% to Pass`, icon: '🎯' },
              { label: `${passCount}/${cfg.questions} Needed`, icon: '✅' },
              ...(cfg.cooldownDays > 0 ? [{ label: `${cfg.cooldownDays}d Cooldown`, icon: '⏳' }] : []),
            ].map(({ label, icon }) => (
              <div key={label} style={{
                display: 'flex', alignItems: 'center', gap: '5px',
                padding: '5px 10px', borderRadius: '20px',
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)',
              }}>
                <span style={{ fontSize: '10px' }}>{icon}</span>
                <span style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</span>
              </div>
            ))}
          </div>

          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', lineHeight: 1.6, margin: 0 }}>
            Questions are AI-generated based on the content. Show what you know to log this as watched!
          </p>
        </div>
      </div>

      {/* CTA */}
      <div style={{ padding: '0 24px 24px', display: 'flex', gap: '10px' }}>
        <button onClick={onStart} style={{
          flex: 1, padding: '14px 24px', borderRadius: '14px',
          background: `linear-gradient(135deg, ${cfg.color}, ${cfg.color}CC)`,
          border: 'none', color: '#0A0A0A', fontSize: '15px', fontWeight: 900,
          fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.12em',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
          boxShadow: `0 8px 24px ${cfg.color}30`, transition: 'all 0.2s',
        }}
          onMouseEnter={e => { e.target.style.transform = 'scale(1.02)'; e.target.style.boxShadow = `0 12px 32px ${cfg.color}50` }}
          onMouseLeave={e => { e.target.style.transform = 'scale(1)'; e.target.style.boxShadow = `0 8px 24px ${cfg.color}30` }}
        >
          <span>✨</span> START QUIZ
        </button>
        <button onClick={onClose} style={{
          padding: '14px 20px', borderRadius: '14px',
          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
          color: 'rgba(255,255,255,0.35)', fontSize: '13px', fontWeight: 700,
          cursor: 'pointer', transition: 'all 0.2s',
        }}>Cancel</button>
      </div>
    </div>
  )
}

/* ─── LOADING SCREEN ─────────────────────────────────── */
const LoadingScreen = ({ cfg, title }) => (
  <div style={{ padding: '60px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
    <div style={{
      width: '72px', height: '72px', borderRadius: '20px',
      background: `${cfg.color}12`, border: `1px solid ${cfg.color}25`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      animation: 'qPulse 1.5s ease-in-out infinite',
    }}>
      <span style={{ fontSize: '28px' }}>{cfg.emoji}</span>
    </div>
    <Spin size={28} color={cfg.color} />
    <div style={{ textAlign: 'center' }}>
      <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '15px', fontWeight: 700, margin: '0 0 6px' }}>Generating your quiz…</p>
      <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '12px', margin: 0 }}>AI is crafting questions about {title}</p>
    </div>
  </div>
)

/* ─── ACTIVE SCREEN ──────────────────────────────────── */
const ActiveScreen = ({
  q, current, total, selected, revealed,
  score, passCount, timeLeft, timerPct, timerColor,
  cfg, answers, onAnswer, onNext, onEndQuiz, isLastQuestion
}) => {
  const optLabels = ['A', 'B', 'C', 'D']

  const getOptionStyle = (idx) => {
    const base = {
      width: '100%', padding: '13px 16px', borderRadius: '12px',
      border: '1px solid', display: 'flex', alignItems: 'center', gap: '12px',
      cursor: revealed ? 'default' : 'pointer', textAlign: 'left',
      transition: 'all 0.25s', background: 'none',
      animation: `qFadeUp 0.2s ease-out ${idx * 0.06}s both`,
    }
    if (!revealed) return {
      ...base,
      borderColor: 'rgba(255,255,255,0.08)',
      color: 'rgba(255,255,255,0.7)',
      background: selected === idx ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.02)',
    }
    if (idx === q.answer) return {
      ...base,
      borderColor: '#34D399',
      background: 'rgba(52,211,153,0.08)',
      color: '#34D399',
    }
    if (idx === selected && idx !== q.answer) return {
      ...base,
      borderColor: '#EF4444',
      background: 'rgba(239,68,68,0.08)',
      color: '#EF4444',
      animation: `qShake 0.3s ease-out`,
    }
    return { ...base, borderColor: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.25)' }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', maxHeight: '85vh' }}>
      {/* Top bar */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
        {/* Progress dots */}
        <div style={{ display: 'flex', gap: '4px', flex: 1 }}>
          {Array.from({ length: total }).map((_, i) => (
            <div key={i} style={{
              flex: 1, height: '4px', borderRadius: '2px',
              background: i < current
                ? answers[i]?.correct ? '#34D399' : '#EF4444'
                : i === current ? cfg.color : 'rgba(255,255,255,0.08)',
              transition: 'all 0.3s',
            }} />
          ))}
        </div>
        {/* Q counter */}
        <span style={{ fontSize: '11px', fontWeight: 800, color: 'rgba(255,255,255,0.3)', flexShrink: 0 }}>
          {current + 1}/{total}
        </span>
        {/* Score */}
        <div style={{
          padding: '3px 10px', borderRadius: '20px',
          background: `${cfg.color}15`, border: `1px solid ${cfg.color}25`,
          fontSize: '11px', fontWeight: 800, color: cfg.color, flexShrink: 0
        }}>
          {score}/{passCount} needed
        </div>
      </div>

      {/* Timer bar */}
      <div style={{ height: '3px', background: 'rgba(255,255,255,0.04)', flexShrink: 0 }}>
        <div style={{
          height: '100%', background: timerColor,
          width: `${timerPct}%`, transition: 'width 1s linear, background 0.3s',
          boxShadow: `0 0 8px ${timerColor}80`,
        }} />
      </div>

      {/* Timer counter */}
      <div style={{ padding: '10px 20px 0', display: 'flex', justifyContent: 'flex-end', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Time</span>
          <span style={{ fontSize: '14px', fontWeight: 900, color: timerColor, fontVariantNumeric: 'tabular-nums', fontFamily: 'monospace', transition: 'color 0.3s' }}>
            {String(timeLeft).padStart(2, '0')}s
          </span>
        </div>
      </div>

      {/* Question */}
      <div style={{ padding: '16px 20px 12px', flexShrink: 0 }}>
        <p style={{
          fontSize: '16px', fontWeight: 700, color: 'rgba(255,255,255,0.92)',
          lineHeight: 1.5, margin: 0,
          animation: 'qFadeUp 0.25s ease-out',
        }}>{q.q}</p>
      </div>

      {/* Options */}
      <div style={{ padding: '0 20px 16px', display: 'flex', flexDirection: 'column', gap: '8px', overflow: 'auto', flexShrink: 0 }}>
        {q.options.map((opt, idx) => (
          <button key={idx} onClick={() => !revealed && onAnswer(idx)} style={getOptionStyle(idx)}>
            <div style={{
              width: '28px', height: '28px', borderRadius: '8px', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '11px', fontWeight: 900,
              background: !revealed
                ? 'rgba(255,255,255,0.06)'
                : idx === q.answer
                  ? 'rgba(52,211,153,0.2)'
                  : idx === selected
                    ? 'rgba(239,68,68,0.2)'
                    : 'rgba(255,255,255,0.04)',
              color: !revealed
                ? 'rgba(255,255,255,0.4)'
                : idx === q.answer
                  ? '#34D399'
                  : idx === selected
                    ? '#EF4444'
                    : 'rgba(255,255,255,0.2)',
            }}>
              {revealed && idx === q.answer ? '✓' : revealed && idx === selected && idx !== q.answer ? '✗' : optLabels[idx]}
            </div>
            <span style={{ fontSize: '13px', fontWeight: 600, lineHeight: 1.4 }}>{opt}</span>
            {/* Keyboard hint */}
            {!revealed && (
              <span style={{ marginLeft: 'auto', fontSize: '10px', color: 'rgba(255,255,255,0.15)', flexShrink: 0 }}>{idx + 1}</span>
            )}
          </button>
        ))}
      </div>

      {/* Feedback + Next */}
      {revealed && (
        <div style={{ padding: '0 20px 20px', flexShrink: 0, animation: 'qFadeUp 0.2s ease-out' }}>
          <div style={{
            padding: '12px 16px', borderRadius: '12px', marginBottom: '12px',
            background: selected === q.answer ? 'rgba(52,211,153,0.08)' : 'rgba(239,68,68,0.08)',
            border: `1px solid ${selected === q.answer ? 'rgba(52,211,153,0.2)' : 'rgba(239,68,68,0.2)'}`,
          }}>
            <p style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: selected === q.answer ? '#34D399' : '#FCA5A5' }}>
              {selected === q.answer ? '✓ Correct!' : selected === -1 ? '⏰ Time\'s up!' : `✗ Incorrect — correct answer was: ${q.options[q.answer]}`}
            </p>
          </div>
          <button onClick={isLastQuestion ? onEndQuiz : onNext} style={{
            width: '100%', padding: '13px', borderRadius: '12px',
            background: cfg.color, border: 'none', color: '#0A0A0A',
            fontSize: '14px', fontWeight: 900, fontFamily: "'Bebas Neue', sans-serif",
            letterSpacing: '0.1em', cursor: 'pointer', transition: 'all 0.2s',
            boxShadow: `0 4px 16px ${cfg.color}30`,
          }}>
            {isLastQuestion ? 'SEE RESULTS →' : 'NEXT QUESTION →'}
          </button>
          <p style={{ textAlign: 'center', fontSize: '10px', color: 'rgba(255,255,255,0.2)', margin: '8px 0 0' }}>Press Enter to continue</p>
        </div>
      )}
    </div>
  )
}

/* ─── RESULT SCREEN ──────────────────────────────────── */
const ResultScreen = ({ passed, score, total, scorePct, passCount, cfg, title, onPass, onRetry, onClose, onFail, answers, questions }) => {
  useEffect(() => {
    if (!passed && onFail) onFail(scorePct)
  }, []) // eslint-disable-line

  return (
    <div style={{ overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
      {/* Result header */}
      <div style={{ padding: '32px 24px 24px', textAlign: 'center', flexShrink: 0 }}>
        {/* Score ring */}
        <div style={{ position: 'relative', display: 'inline-block', marginBottom: '20px' }}>
          <ProgressRing pct={scorePct} size={100} stroke={7} color={passed ? '#34D399' : '#EF4444'}>
            <text x='50' y='54' textAnchor='middle' style={{ fontSize: '22px', fontWeight: 900, fill: passed ? '#34D399' : '#EF4444', fontFamily: 'system-ui' }}>
              {scorePct}%
            </text>
          </ProgressRing>
          <div style={{
            position: 'absolute', bottom: '-8px', right: '-8px',
            width: '36px', height: '36px', borderRadius: '50%',
            background: passed ? '#34D399' : '#EF4444',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '16px', boxShadow: `0 4px 16px ${passed ? 'rgba(52,211,153,0.4)' : 'rgba(239,68,68,0.4)'}`,
            animation: 'qBounce 0.5s ease-out 0.2s both',
          }}>
            {passed ? '✓' : '✗'}
          </div>
        </div>

        <h2 style={{
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: '28px', letterSpacing: '0.08em',
          color: passed ? '#34D399' : '#FCA5A5',
          margin: '0 0 8px',
        }}>
          {passed ? 'QUIZ PASSED! 🎉' : 'QUIZ FAILED'}
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '13px', margin: 0 }}>
          {passed
            ? `You got ${score}/${total} — "${title}" logged as watched!`
            : `You got ${score}/${total} — needed ${passCount}. Try again to verify your watch.`
          }
        </p>
      </div>

      {/* Answer review */}
      <div style={{ padding: '0 20px 20px', maxHeight: '220px', overflow: 'auto', flexShrink: 0 }}>
        <p style={{ fontSize: '10px', fontWeight: 800, color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '8px' }}>Question Review</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {questions.map((q, i) => {
            const ans = answers[i]
            const correct = ans?.correct
            return (
              <div key={i} style={{
                padding: '8px 12px', borderRadius: '10px',
                background: correct ? 'rgba(52,211,153,0.06)' : 'rgba(239,68,68,0.06)',
                border: `1px solid ${correct ? 'rgba(52,211,153,0.15)' : 'rgba(239,68,68,0.15)'}`,
                display: 'flex', alignItems: 'flex-start', gap: '10px',
              }}>
                <span style={{ fontSize: '12px', flexShrink: 0, marginTop: '1px' }}>{correct ? '✅' : '❌'}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: '11px', color: 'rgba(255,255,255,0.6)', lineHeight: 1.4, marginBottom: correct ? 0 : '3px' }}>{q.q}</p>
                  {!correct && <p style={{ margin: 0, fontSize: '10px', color: '#34D399', opacity: 0.8 }}>✓ {q.options[q.answer]}</p>}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Actions */}
      <div style={{ padding: '0 20px 24px', display: 'flex', gap: '10px', flexShrink: 0 }}>
        {passed ? (
          <button onClick={onPass} style={{
            flex: 1, padding: '14px', borderRadius: '14px',
            background: 'linear-gradient(135deg, #34D399, #10B981)',
            border: 'none', color: '#0A0A0A', fontSize: '15px', fontWeight: 900,
            fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.12em',
            cursor: 'pointer', boxShadow: '0 8px 24px rgba(52,211,153,0.3)',
            transition: 'all 0.2s',
          }}>✓ MARK AS WATCHED</button>
        ) : (
          <>
            <button onClick={onRetry} style={{
              flex: 1, padding: '14px', borderRadius: '14px',
              background: `linear-gradient(135deg, ${cfg.color}, ${cfg.color}CC)`,
              border: 'none', color: '#0A0A0A', fontSize: '15px', fontWeight: 900,
              fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.12em',
              cursor: 'pointer', boxShadow: `0 8px 24px ${cfg.color}30`,
              transition: 'all 0.2s',
            }}>↺ TRY AGAIN</button>
            <button onClick={onClose} style={{
              padding: '14px 20px', borderRadius: '14px',
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
              color: 'rgba(255,255,255,0.35)', fontSize: '13px', fontWeight: 700,
              cursor: 'pointer', transition: 'all 0.2s',
            }}>Close</button>
          </>
        )}
      </div>
    </div>
  )
}

export default QuizModal