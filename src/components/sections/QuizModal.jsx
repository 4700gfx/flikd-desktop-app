import React, { useState, useEffect, useCallback, useRef } from 'react'
import supabase from '../../config/SupabaseClient'

/**
 * FLIK'D — AI Quiz System
 * ────────────────────────────────────────────────────
 * Integrates with OpenAI GPT-4o-mini to verify that users
 * actually watched content before marking it complete.
 *
 * Quiz types & rules:
 *   🎬 Movie        → 5 questions · 60% to pass · retry after 1 day
 *   📺 Episode      → 2 questions · 50% to pass · no cooldown
 *   📦 Full Season  → 10 questions · 80% to pass · retry after 7 days
 *
 * Supabase tables expected:
 *   quiz_attempts (id, user_id, ref_id, ref_type, score, passed, taken_at, next_allowed_at)
 *   list_items    (existing — is_completed, completed_at, quiz_score)
 *   list_item_episodes (existing — is_watched, watched_at)
 */

const OPENAI_KEY = import.meta.env.VITE_OPENAI_API_KEY

/* ─── Quiz config per type ─────────────────────────── */
const QUIZ_CONFIG = {
  movie:   { count: 5,  pass: 0.60, cooldownDays: 1,  label: 'Film Quiz',       icon: '🎬' },
  episode: { count: 2,  pass: 0.50, cooldownDays: 0,  label: 'Episode Check',   icon: '📺' },
  season:  { count: 10, pass: 0.80, cooldownDays: 7,  label: 'Season Mastery',  icon: '🏆' },
}

/* ─── Spinner ──────────────────────────────────────── */
const Spin = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox='0 0 24 24' fill='none' className='animate-spin text-[#D4AF37] flex-shrink-0'>
    <circle cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='3' className='opacity-20' />
    <path fill='currentColor' className='opacity-75' d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z' />
  </svg>
)

/* ─── Score ring ───────────────────────────────────── */
const ScoreRing = ({ pct, pass, size = 80 }) => {
  const R = size / 2 - 6
  const C = 2 * Math.PI * R
  const passed = pct >= pass
  const color = passed ? '#D4AF37' : pct >= pass * 0.7 ? '#F59E0B' : '#EF4444'
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size/2} cy={size/2} r={R} fill='none' stroke='rgba(255,255,255,0.05)' strokeWidth='5' />
      <circle cx={size/2} cy={size/2} r={R} fill='none' stroke={color} strokeWidth='5'
        strokeDasharray={`${C * pct} ${C}`} strokeLinecap='round'
        transform={`rotate(-90 ${size/2} ${size/2})`}
        style={{ transition: 'stroke-dasharray 1s cubic-bezier(.34,1.56,.64,1)', filter: passed ? `drop-shadow(0 0 6px ${color})` : 'none' }} />
      <text x={size/2} y={size/2 + 6} textAnchor='middle'
        style={{ fontSize: size * 0.22, fontWeight: 900, fill: color, fontFamily: 'system-ui' }}>
        {Math.round(pct * 100)}%
      </text>
    </svg>
  )
}

/* ─── OpenAI quiz generator ────────────────────────── */
const generateQuiz = async ({ title, type, seasonNum, episodeNum, episodeName, count }) => {
  if (!OPENAI_KEY) throw new Error('No OpenAI API key configured. Add VITE_OPENAI_API_KEY to your .env file.')

  const context =
    type === 'movie'
      ? `the film "${title}"`
      : type === 'episode'
        ? `Season ${seasonNum} Episode ${episodeNum} "${episodeName}" of "${title}"`
        : `Season ${seasonNum} of "${title}"`

  const prompt = type === 'season'
    ? `Generate ${count} multiple-choice quiz questions testing deep knowledge of ${context}. 
       Cover different aspects: plot arcs, character development, episode-specific events, themes, and notable moments across the season.
       Make questions challenging — a person who actually watched the season should get 80%+.`
    : type === 'episode'
      ? `Generate ${count} multiple-choice questions about ${context}.
         Focus on specific plot events, dialogue, and character actions that only someone who watched this episode would know.`
      : `Generate ${count} multiple-choice questions about ${context}.
         Mix easy (40%), medium (40%), and hard (20%) questions covering plot, characters, themes, cinematography, and notable scenes.`

  const systemPrompt = `You are a film and TV quiz generator for a cinema app called Flik'd.
Return ONLY a valid JSON array with no markdown, no explanation.
Each question object must have exactly:
  "q": string (the question),
  "opts": string[] (exactly 4 options, labeled A/B/C/D internally but stored without labels),
  "answer": number (0-indexed correct answer index),
  "difficulty": "easy"|"medium"|"hard"

Example: [{"q":"What color was the door?","opts":["Red","Blue","Green","Yellow"],"answer":1,"difficulty":"easy"}]`

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      temperature: 0.8,
      max_tokens: 2000,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: prompt },
      ],
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error?.message || `OpenAI error ${res.status}`)
  }

  const data = await res.json()
  const raw  = data.choices?.[0]?.message?.content?.trim() || '[]'

  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed) || parsed.length === 0) throw new Error('Empty quiz returned')
    return parsed.slice(0, count)
  } catch {
    throw new Error('Could not parse quiz questions. Please try again.')
  }
}

/* ─── Cooldown check helper ────────────────────────── */
export const checkQuizCooldown = async (userId, refId, refType) => {
  if (!userId) return { blocked: false, nextAllowed: null }
  const { data } = await supabase
    .from('quiz_attempts')
    .select('passed, taken_at, next_allowed_at')
    .eq('user_id', userId)
    .eq('ref_id', refId)
    .eq('ref_type', refType)
    .order('taken_at', { ascending: false })
    .limit(1)
    .single()

  if (!data) return { blocked: false, nextAllowed: null }
  if (data.passed) return { blocked: false, nextAllowed: null, alreadyPassed: true }
  if (!data.next_allowed_at) return { blocked: false, nextAllowed: null }

  const next = new Date(data.next_allowed_at)
  if (Date.now() < next.getTime()) {
    return { blocked: true, nextAllowed: next }
  }
  return { blocked: false, nextAllowed: null }
}

/* ─── Save quiz attempt ────────────────────────────── */
const saveAttempt = async ({ userId, refId, refType, score, passed, cooldownDays }) => {
  const takenAt = new Date().toISOString()
  const nextAllowed = cooldownDays > 0 && !passed
    ? new Date(Date.now() + cooldownDays * 86400000).toISOString()
    : null

  await supabase.from('quiz_attempts').insert({
    user_id:        userId,
    ref_id:         refId,
    ref_type:       refType,
    score:          Math.round(score * 100),
    passed,
    taken_at:       takenAt,
    next_allowed_at: nextAllowed,
  })

  return { nextAllowed }
}

/* ─── Cooldown display ─────────────────────────────── */
const CooldownBadge = ({ nextAllowed, type }) => {
  const config = QUIZ_CONFIG[type]
  const now    = Date.now()
  const ms     = new Date(nextAllowed).getTime() - now
  const hours  = Math.floor(ms / 3600000)
  const mins   = Math.floor((ms % 3600000) / 60000)

  const timeStr = hours >= 24
    ? `${Math.ceil(hours / 24)} day${Math.ceil(hours / 24) !== 1 ? 's' : ''}`
    : hours > 0
      ? `${hours}h ${mins}m`
      : `${mins}m`

  return (
    <div className='flex flex-col items-center gap-3 py-8 px-6 text-center'>
      <div className='w-16 h-16 rounded-full flex items-center justify-center text-3xl'
        style={{ background: 'radial-gradient(circle, rgba(239,68,68,0.12), transparent)', border: '1px solid rgba(239,68,68,0.2)' }}>
        ⏳
      </div>
      <h3 className='font-bebas text-xl text-white/80 tracking-wide'>Quiz Locked</h3>
      <p className='text-[13px] text-white/40 leading-relaxed max-w-xs'>
        You didn't pass the last {config.label.toLowerCase()}. Come back in{' '}
        <span className='text-[#D4AF37] font-bold'>{timeStr}</span> to try again.
      </p>
      <div className='px-4 py-2 rounded-xl border border-red-500/20 bg-red-500/5 mt-1'>
        <p className='text-[11px] text-red-400/70'>
          Required: {Math.round(config.pass * 100)}% · Cooldown: {config.cooldownDays} day{config.cooldownDays !== 1 ? 's' : ''}
        </p>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────
   MAIN QUIZ MODAL
───────────────────────────────────────────────────── */
const QuizModal = ({
  /* What to quiz about */
  type,         // 'movie' | 'episode' | 'season'
  title,        // show/movie title
  seasonNum,    // for episode/season
  episodeNum,   // for episode
  episodeName,  // for episode
  posterPath,   // optional poster

  /* Identity for saving */
  refId,        // list_item_id (movie/season) or `${listItemId}-S${s}E${e}` (episode)
  userId,

  /* Callbacks */
  onPass,       // () => void — called when user passes
  onClose,      // () => void
}) => {
  const config = QUIZ_CONFIG[type]

  // Phases: 'checking' | 'cooldown' | 'intro' | 'loading' | 'error' | 'quiz' | 'result'
  const [phase,       setPhase]       = useState('checking')
  const [questions,   setQuestions]   = useState([])
  const [current,     setCurrent]     = useState(0)
  const [selected,    setSelected]    = useState(null)   // index or null
  const [answers,     setAnswers]     = useState([])     // array of {correct: bool, selected: num, answer: num}
  const [confirmed,   setConfirmed]   = useState(false)
  const [result,      setResult]      = useState(null)   // {score, passed, nextAllowed}
  const [error,       setError]       = useState('')
  const [cooldownAt,  setCooldownAt]  = useState(null)
  const [saving,      setSaving]      = useState(false)
  const [reveal,      setReveal]      = useState(false)  // animate answer reveal

  /* ── Check cooldown on mount ── */
  useEffect(() => {
    let live = true
    const check = async () => {
      try {
        const { blocked, nextAllowed } = await checkQuizCooldown(userId, refId, type)
        if (!live) return
        if (blocked) { setCooldownAt(nextAllowed); setPhase('cooldown') }
        else setPhase('intro')
      } catch {
        if (live) setPhase('intro')
      }
    }
    check()
    return () => { live = false }
  }, [])

  /* ── Generate questions ── */
  const startQuiz = useCallback(async () => {
    setPhase('loading')
    setError('')
    try {
      const qs = await generateQuiz({
        title, type, seasonNum, episodeNum, episodeName,
        count: config.count,
      })
      setQuestions(qs)
      setAnswers([])
      setCurrent(0)
      setSelected(null)
      setConfirmed(false)
      setPhase('quiz')
    } catch (e) {
      setError(e.message || 'Failed to generate quiz. Check your OpenAI API key.')
      setPhase('error')
    }
  }, [title, type, seasonNum, episodeNum, episodeName, config.count])

  /* ── Select option ── */
  const selectOption = (idx) => {
    if (confirmed) return
    setSelected(idx)
  }

  /* ── Confirm answer ── */
  const confirmAnswer = useCallback(() => {
    if (selected === null || confirmed) return
    const q = questions[current]
    const correct = selected === q.answer
    setConfirmed(true)
    setReveal(true)
    setAnswers(prev => [...prev, { correct, selected, answer: q.answer }])
  }, [selected, confirmed, questions, current])

  /* ── Next question / finish ── */
  const advance = useCallback(async () => {
    setReveal(false)
    if (current + 1 < questions.length) {
      setCurrent(p => p + 1)
      setSelected(null)
      setConfirmed(false)
    } else {
      // Calculate result
      const correct = [...answers].filter(a => a.correct).length + (answers.length === questions.length - 1 && confirmed ? 0 : 0)
      const finalAnswers = [...answers]
      const score = finalAnswers.filter(a => a.correct).length / questions.length
      const passed = score >= config.pass

      setSaving(true)
      try {
        const { nextAllowed } = await saveAttempt({
          userId, refId, refType: type, score, passed,
          cooldownDays: config.cooldownDays,
        })
        setResult({ score, passed, nextAllowed })
        if (passed) onPass?.()
      } catch (e) {
        setResult({ score, passed, nextAllowed: null })
        if (passed) onPass?.()
      }
      setSaving(false)
      setPhase('result')
    }
  }, [current, questions, answers, confirmed, config, userId, refId, type, onPass])

  /* ── Keyboard shortcuts ── */
  useEffect(() => {
    const h = (e) => {
      if (phase !== 'quiz') return
      if (['1','2','3','4'].includes(e.key)) selectOption(parseInt(e.key) - 1)
      if (e.key === 'Enter') {
        if (!confirmed && selected !== null) confirmAnswer()
        else if (confirmed) advance()
      }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [phase, selected, confirmed, confirmAnswer, advance])

  const q = questions[current]
  const progressPct = phase === 'quiz' ? (current / questions.length) * 100 : 0
  const tmdbImg = (p) => p ? `https://image.tmdb.org/t/p/w342${p}` : null

  const DIFF_COLOR = { easy: 'text-green-400/60', medium: 'text-[#D4AF37]/60', hard: 'text-red-400/60' }
  const DIFF_BG    = { easy: 'bg-green-500/8 border-green-500/20', medium: 'bg-[#D4AF37]/8 border-[#D4AF37]/20', hard: 'bg-red-500/8 border-red-500/20' }

  return (
    <>
      {/* Scrim */}
      <div className='fixed inset-0 z-[80]' onClick={phase === 'result' || phase === 'cooldown' ? onClose : undefined}
        style={{ background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(12px)', animation: 'quizScrimIn .2s ease-out' }} />

      {/* Modal */}
      <div className='fixed z-[90]'
        style={{
          top: '50%', left: '50%',
          transform: 'translateX(-50%) translateY(-50%)',
          width: 'min(560px, 95vw)',
          maxHeight: '92vh',
          display: 'flex', flexDirection: 'column',
          background: 'linear-gradient(160deg, #0D0D0D 0%, #060606 100%)',
          border: '1px solid rgba(212,175,55,0.18)',
          borderRadius: '28px',
          boxShadow: '0 48px 160px rgba(0,0,0,1), 0 0 0 1px rgba(212,175,55,0.06), inset 0 1px 0 rgba(255,255,255,0.04)',
          animation: 'quizModalIn .32s cubic-bezier(0.22, 1, 0.36, 1)',
          overflow: 'hidden',
        }}>

        {/* Gold top bar */}
        <div className='h-[3px] flex-shrink-0'
          style={{ background: 'linear-gradient(90deg, transparent, #D4AF37 25%, #F0C93A 50%, #D4AF37 75%, transparent)' }} />

        {/* ══════════════════════════════════
            CHECKING phase
        ══════════════════════════════════ */}
        {phase === 'checking' && (
          <div className='flex-1 flex items-center justify-center py-20'>
            <div className='flex flex-col items-center gap-3'>
              <Spin size={32} />
              <p className='text-white/30 text-sm'>Checking eligibility…</p>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════
            COOLDOWN phase
        ══════════════════════════════════ */}
        {phase === 'cooldown' && (
          <>
            <QuizHeader title={title} type={type} config={config} posterPath={posterPath} onClose={onClose} showClose />
            <CooldownBadge nextAllowed={cooldownAt} type={type} />
            <div className='px-6 py-4 border-t border-white/[0.04] flex-shrink-0'>
              <button onClick={onClose}
                className='w-full py-3 rounded-xl bg-[#141414] border border-white/[0.07] text-white/40 text-[13px] font-bold
                  hover:text-white hover:border-white/20 transition-all duration-200'>
                Got it
              </button>
            </div>
          </>
        )}

        {/* ══════════════════════════════════
            INTRO phase
        ══════════════════════════════════ */}
        {phase === 'intro' && (
          <>
            <QuizHeader title={title} type={type} config={config} posterPath={posterPath} onClose={onClose} showClose />
            <div className='flex-1 px-7 py-6 overflow-y-auto' style={{ scrollbarWidth: 'none' }}>
              {/* Context card */}
              <div className='flex gap-4 mb-6'>
                {posterPath && (
                  <img src={tmdbImg(posterPath)} alt={title}
                    className='w-[52px] h-[76px] object-cover rounded-xl flex-shrink-0 ring-1 ring-[#D4AF37]/15 shadow-2xl' />
                )}
                <div className='flex-1 min-w-0'>
                  <p className='text-[11px] font-black text-[#D4AF37]/50 uppercase tracking-[0.18em] mb-1'>
                    {type === 'movie' ? '🎬 Film' : type === 'episode' ? `📺 S${seasonNum} E${episodeNum}` : `📦 Season ${seasonNum}`}
                  </p>
                  <h3 className='font-bebas text-[20px] text-white tracking-wide leading-tight mb-0.5'>{title}</h3>
                  {episodeName && <p className='text-[12px] text-white/40 italic'>"{episodeName}"</p>}
                </div>
              </div>

              {/* Rules */}
              <div className='space-y-3 mb-6'>
                <p className='text-[9px] font-black text-white/20 uppercase tracking-[0.2em]'>Quiz Rules</p>
                {[
                  [`${config.count} Questions`, `You'll answer ${config.count} multiple-choice questions about this ${type === 'movie' ? 'film' : type === 'season' ? 'season' : 'episode'}.`],
                  [`${Math.round(config.pass * 100)}% to Pass`, `You need to get at least ${Math.ceil(config.count * config.pass)} out of ${config.count} correct.`],
                  config.cooldownDays > 0
                    ? [`${config.cooldownDays}-Day Cooldown`, `If you fail, you'll need to wait ${config.cooldownDays} day${config.cooldownDays !== 1 ? 's' : ''} before retrying.`]
                    : null,
                ].filter(Boolean).map(([title, desc]) => (
                  <div key={title} className='flex gap-3 p-3.5 rounded-xl bg-white/[0.025] border border-white/[0.05]'>
                    <div className='w-1.5 h-1.5 rounded-full bg-[#D4AF37] mt-1.5 flex-shrink-0' />
                    <div>
                      <p className='text-[12px] font-bold text-white/80'>{title}</p>
                      <p className='text-[11px] text-white/35 mt-0.5 leading-snug'>{desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* AI notice */}
              <div className='flex items-start gap-3 p-3.5 rounded-xl border border-[#D4AF37]/10 bg-[#D4AF37]/3 mb-2'>
                <span className='text-lg flex-shrink-0'>✨</span>
                <p className='text-[11px] text-white/40 leading-snug'>
                  Questions are generated by AI specifically for this {type === 'movie' ? 'film' : type}. Only someone who actually watched it should be able to pass.
                </p>
              </div>
            </div>
            <div className='px-7 py-5 border-t border-white/[0.04] flex gap-3 flex-shrink-0'>
              <button onClick={onClose}
                className='flex-1 py-3 rounded-xl bg-[#111] border border-white/[0.07] text-white/35 text-[13px] font-bold
                  hover:text-white/60 hover:border-white/15 transition-all duration-200'>
                Cancel
              </button>
              <button onClick={startQuiz}
                className='flex-1 py-3 rounded-xl text-[13px] font-bold transition-all duration-200 active:scale-[0.98]
                  bg-[#D4AF37] text-[#0A0A0A] hover:bg-[#E8C55B] shadow-lg shadow-[#D4AF37]/20'>
                Start Quiz →
              </button>
            </div>
          </>
        )}

        {/* ══════════════════════════════════
            LOADING phase
        ══════════════════════════════════ */}
        {phase === 'loading' && (
          <div className='flex-1 flex flex-col items-center justify-center py-16 gap-5 px-8'>
            <div className='relative'>
              <div className='w-16 h-16 rounded-full border border-[#D4AF37]/15 flex items-center justify-center'
                style={{ background: 'radial-gradient(circle, rgba(212,175,55,0.08), transparent)', animation: 'quizPulse 1.8s ease-in-out infinite' }}>
                <span className='text-2xl'>{config.icon}</span>
              </div>
              <div className='absolute -bottom-1 -right-1'>
                <Spin size={18} />
              </div>
            </div>
            <div className='text-center'>
              <p className='font-bebas text-lg text-white/80 tracking-wide mb-1'>Generating Your Quiz</p>
              <p className='text-[12px] text-white/35'>AI is crafting personalized questions for <span className='text-[#D4AF37]/70'>{title}</span>…</p>
            </div>
            {/* Animated dots */}
            <div className='flex gap-1.5'>
              {[0, 1, 2].map(i => (
                <div key={i} className='w-1.5 h-1.5 rounded-full bg-[#D4AF37]/40'
                  style={{ animation: `quizDot 1.2s ease-in-out ${i * 0.2}s infinite` }} />
              ))}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════
            ERROR phase
        ══════════════════════════════════ */}
        {phase === 'error' && (
          <>
            <QuizHeader title={title} type={type} config={config} posterPath={posterPath} onClose={onClose} showClose />
            <div className='flex-1 flex flex-col items-center justify-center py-10 px-8 gap-4 text-center'>
              <div className='w-14 h-14 rounded-full flex items-center justify-center text-2xl'
                style={{ background: 'radial-gradient(circle, rgba(239,68,68,0.1), transparent)', border: '1px solid rgba(239,68,68,0.2)' }}>
                ⚠️
              </div>
              <div>
                <p className='font-bebas text-lg text-white/80 tracking-wide mb-1'>Quiz Generation Failed</p>
                <p className='text-[12px] text-white/35 leading-relaxed max-w-sm'>{error}</p>
              </div>
            </div>
            <div className='px-7 py-5 border-t border-white/[0.04] flex gap-3 flex-shrink-0'>
              <button onClick={onClose}
                className='flex-1 py-3 rounded-xl bg-[#111] border border-white/[0.07] text-white/35 text-[13px] font-bold hover:text-white/60 transition-all'>
                Close
              </button>
              <button onClick={startQuiz}
                className='flex-1 py-3 rounded-xl bg-[#D4AF37] text-[#0A0A0A] text-[13px] font-bold hover:bg-[#E8C55B] transition-all'>
                Try Again
              </button>
            </div>
          </>
        )}

        {/* ══════════════════════════════════
            QUIZ phase
        ══════════════════════════════════ */}
        {phase === 'quiz' && q && (
          <>
            {/* Progress header */}
            <div className='px-6 pt-5 pb-0 flex-shrink-0'>
              <div className='flex items-center justify-between mb-3'>
                <div className='flex items-center gap-2'>
                  <span className='text-lg'>{config.icon}</span>
                  <span className='font-bebas text-[15px] text-white/70 tracking-wider'>{config.label}</span>
                </div>
                <div className='flex items-center gap-2'>
                  <span className='text-[11px] text-white/25 tabular-nums font-bold'>{current + 1} / {questions.length}</span>
                  {q.difficulty && (
                    <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${DIFF_BG[q.difficulty]} ${DIFF_COLOR[q.difficulty]}`}>
                      {q.difficulty}
                    </span>
                  )}
                </div>
              </div>

              {/* Progress bar */}
              <div className='relative h-1.5 bg-[#1A1A1A] rounded-full overflow-hidden mb-5'>
                <div className='h-full rounded-full transition-all duration-500'
                  style={{
                    width: `${progressPct}%`,
                    background: 'linear-gradient(90deg, #D4AF37, #F0C93A)',
                    boxShadow: '0 0 8px rgba(212,175,55,0.4)',
                  }} />
                {/* Segment ticks */}
                {questions.map((_, i) => (
                  <div key={i}
                    className='absolute top-0 bottom-0 w-px'
                    style={{
                      left: `${(i / questions.length) * 100}%`,
                      background: i === 0 ? 'transparent' : 'rgba(0,0,0,0.5)',
                    }} />
                ))}
              </div>
            </div>

            {/* Question & answers */}
            <div className='flex-1 overflow-y-auto px-6 pb-2' style={{ scrollbarWidth: 'none' }}>
              {/* Question text */}
              <div className='mb-5' style={{ animation: 'quizQuestionIn .25s ease-out' }}>
                <p className='text-[16px] font-semibold text-white leading-snug'>{q.q}</p>
              </div>

              {/* Answer options */}
              <div className='space-y-2.5'>
                {q.opts.map((opt, idx) => {
                  const labels = ['A', 'B', 'C', 'D']
                  let state = 'idle'
                  if (confirmed) {
                    if (idx === q.answer) state = 'correct'
                    else if (idx === selected) state = 'wrong'
                  } else if (idx === selected) state = 'selected'

                  const styles = {
                    idle:     'border-white/[0.07] bg-white/[0.02] text-white/65 hover:border-[#D4AF37]/30 hover:bg-[#D4AF37]/4 hover:text-white cursor-pointer',
                    selected: 'border-[#D4AF37]/60 bg-[#D4AF37]/8 text-white shadow-[0_0_0_1px_rgba(212,175,55,0.2)] cursor-pointer',
                    correct:  'border-green-500/50 bg-green-500/8 text-green-400 shadow-[0_0_12px_rgba(34,197,94,0.15)]',
                    wrong:    'border-red-500/50 bg-red-500/8 text-red-400',
                  }

                  const labelStyles = {
                    idle:     'bg-white/[0.06] text-white/30',
                    selected: 'bg-[#D4AF37]/20 text-[#D4AF37]',
                    correct:  'bg-green-500/20 text-green-400',
                    wrong:    'bg-red-500/20 text-red-400',
                  }

                  return (
                    <button key={idx}
                      onClick={() => selectOption(idx)}
                      disabled={confirmed}
                      className={`w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl border
                        transition-all duration-200 text-left ${styles[state]}`}
                      style={{ animation: `quizOptIn .2s ease-out ${idx * 0.06}s both` }}>
                      {/* Option label */}
                      <span className={`w-7 h-7 rounded-xl flex items-center justify-center text-[11px] font-black flex-shrink-0 transition-all duration-200 ${labelStyles[state]}`}>
                        {confirmed && state === 'correct' ? '✓' : confirmed && state === 'wrong' ? '✗' : labels[idx]}
                      </span>
                      <span className='text-[13px] font-medium leading-snug flex-1'>{opt}</span>
                    </button>
                  )
                })}
              </div>

              {/* Explanation hint (after confirming) */}
              {confirmed && (
                <div className={`mt-3 px-4 py-3 rounded-xl border text-[12px] leading-relaxed
                  ${answers[answers.length-1]?.correct
                    ? 'border-green-500/20 bg-green-500/5 text-green-400/70'
                    : 'border-red-500/20 bg-red-500/5 text-red-400/70'
                  }`}
                  style={{ animation: 'quizReveal .25s ease-out' }}>
                  {answers[answers.length-1]?.correct
                    ? '✓ Correct! Keep going.'
                    : `✗ The correct answer was: "${q.opts[q.answer]}"`
                  }
                </div>
              )}
            </div>

            {/* Footer actions */}
            <div className='px-6 py-4 border-t border-white/[0.04] flex-shrink-0'>
              {/* Score dots */}
              <div className='flex items-center justify-center gap-1 mb-3'>
                {questions.map((_, i) => {
                  const a = answers[i]
                  return (
                    <div key={i} className={`rounded-full transition-all duration-300 ${
                      i < answers.length
                        ? a?.correct
                          ? 'w-3 h-3 bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.5)]'
                          : 'w-3 h-3 bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.4)]'
                        : i === current
                          ? 'w-3 h-3 border-2 border-[#D4AF37] bg-[#D4AF37]/20'
                          : 'w-2 h-2 bg-white/10'
                    }`} />
                  )
                })}
              </div>

              {!confirmed
                ? <button onClick={confirmAnswer} disabled={selected === null}
                    className={`w-full py-3.5 rounded-2xl text-[14px] font-bold transition-all duration-200 ${
                      selected !== null
                        ? 'bg-[#D4AF37] text-[#0A0A0A] hover:bg-[#E8C55B] shadow-lg shadow-[#D4AF37]/20 active:scale-[0.98]'
                        : 'bg-[#141414] text-white/20 cursor-not-allowed border border-white/[0.05]'
                    }`}>
                    Confirm Answer
                  </button>
                : <button onClick={advance} disabled={saving}
                    className='w-full py-3.5 rounded-2xl text-[14px] font-bold bg-[#D4AF37] text-[#0A0A0A]
                      hover:bg-[#E8C55B] shadow-lg shadow-[#D4AF37]/20 active:scale-[0.98] transition-all duration-200
                      flex items-center justify-center gap-2'>
                    {saving ? <Spin size={18} /> : null}
                    {saving ? 'Saving…'
                      : current + 1 < questions.length
                        ? `Next Question →`
                        : 'See Results →'
                    }
                  </button>
              }
              <p className='text-center text-[10px] text-white/15 mt-2'>Press 1–4 to select · Enter to confirm</p>
            </div>
          </>
        )}

        {/* ══════════════════════════════════
            RESULT phase
        ══════════════════════════════════ */}
        {phase === 'result' && result && (
          <>
            {/* Result header */}
            <div className='px-7 pt-7 pb-5 flex-shrink-0'>
              <div className='flex items-start justify-between'>
                <div>
                  <p className='text-[10px] font-black text-white/20 uppercase tracking-[0.2em] mb-1'>{config.label} · Results</p>
                  <h3 className='font-bebas text-[22px] text-white tracking-wide leading-tight'>{title}</h3>
                </div>
              </div>
            </div>

            <div className='flex-1 overflow-y-auto px-7 pb-2' style={{ scrollbarWidth: 'none' }}>
              {/* Score display */}
              <div className={`flex flex-col items-center py-6 mb-5 rounded-2xl border ${
                result.passed
                  ? 'border-[#D4AF37]/25 bg-[#D4AF37]/5'
                  : 'border-red-500/20 bg-red-500/4'
              }`}>
                <ScoreRing pct={result.score} pass={config.pass} size={100} />
                <p className={`font-bebas text-[28px] tracking-wider mt-3 ${result.passed ? 'text-[#D4AF37]' : 'text-red-400'}`}>
                  {result.passed ? 'PASSED! 🎉' : 'NOT YET'}
                </p>
                <p className={`text-[13px] mt-1 ${result.passed ? 'text-white/50' : 'text-white/35'}`}>
                  {Math.round(result.score * questions.length)} / {questions.length} correct
                  {' '}· needed {Math.ceil(config.pass * questions.length)}
                </p>
              </div>

              {/* Per-question breakdown */}
              <div className='space-y-2 mb-4'>
                <p className='text-[9px] font-black text-white/20 uppercase tracking-[0.2em] mb-2'>Question Breakdown</p>
                {questions.map((question, i) => {
                  const a = answers[i]
                  if (!a) return null
                  return (
                    <div key={i}
                      className={`flex items-start gap-3 p-3.5 rounded-xl border transition-all duration-200 ${
                        a.correct ? 'border-green-500/15 bg-green-500/4' : 'border-red-500/15 bg-red-500/4'
                      }`}
                      style={{ animation: `quizOptIn .2s ease-out ${i * 0.04}s both` }}>
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black flex-shrink-0 mt-0.5 ${
                        a.correct ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                      }`}>
                        {a.correct ? '✓' : '✗'}
                      </span>
                      <div className='flex-1 min-w-0'>
                        <p className='text-[11px] text-white/60 leading-snug line-clamp-2'>{question.q}</p>
                        {!a.correct && (
                          <p className='text-[10px] text-green-400/60 mt-1'>
                            ✓ {question.opts[question.answer]}
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Cooldown notice if failed */}
              {!result.passed && result.nextAllowed && (
                <div className='p-4 rounded-xl border border-red-500/20 bg-red-500/5 mb-3'>
                  <p className='text-[12px] text-red-400/70 leading-snug'>
                    ⏳ You can retake this quiz in{' '}
                    <strong className='text-red-400'>
                      {config.cooldownDays} day{config.cooldownDays !== 1 ? 's' : ''}
                    </strong>.
                    Use this time to rewatch and refresh your memory.
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className='px-7 py-5 border-t border-white/[0.04] flex gap-3 flex-shrink-0'>
              <button onClick={onClose}
                className={`flex-1 py-3 rounded-xl text-[13px] font-bold transition-all duration-200 ${
                  result.passed
                    ? 'bg-[#D4AF37] text-[#0A0A0A] hover:bg-[#E8C55B] shadow-lg shadow-[#D4AF37]/20 active:scale-[0.98]'
                    : 'bg-[#141414] border border-white/[0.07] text-white/50 hover:text-white hover:border-white/20'
                }`}>
                {result.passed ? '✓ Done' : 'Close'}
              </button>
            </div>
          </>
        )}
      </div>

      {/* Keyframes */}
      <style>{`
        @keyframes quizScrimIn    { from{opacity:0}                                                                                  to{opacity:1} }
        @keyframes quizModalIn    { from{opacity:0;transform:translateX(-50%) translateY(-48%) scale(.93)} to{opacity:1;transform:translateX(-50%) translateY(-50%) scale(1)} }
        @keyframes quizPulse      { 0%,100%{opacity:0.6;transform:scale(1)} 50%{opacity:1;transform:scale(1.05)} }
        @keyframes quizDot        { 0%,80%,100%{transform:scale(0.8);opacity:0.4} 40%{transform:scale(1.2);opacity:1} }
        @keyframes quizOptIn      { from{opacity:0;transform:translateX(-8px)} to{opacity:1;transform:translateX(0)} }
        @keyframes quizQuestionIn { from{opacity:0;transform:translateY(-4px)} to{opacity:1;transform:translateY(0)} }
        @keyframes quizReveal     { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:translateY(0)} }
      `}</style>
    </>
  )
}

/* ─── Sub-component: modal header ─────────────────── */
const QuizHeader = ({ title, type, config, posterPath, onClose, showClose }) => {
  const tmdbImg = (p) => p ? `https://image.tmdb.org/t/p/w342${p}` : null
  return (
    <div className='px-6 pt-5 pb-4 border-b border-white/[0.04] flex items-center gap-4 flex-shrink-0'>
      {posterPath && (
        <img src={tmdbImg(posterPath)} alt={title}
          className='w-10 h-14 object-cover rounded-lg flex-shrink-0 ring-1 ring-[#D4AF37]/15' />
      )}
      <div className='flex-1 min-w-0'>
        <div className='flex items-center gap-2 mb-0.5'>
          <span className='text-base'>{config.icon}</span>
          <span className='text-[10px] font-black text-[#D4AF37]/50 uppercase tracking-[0.18em]'>{config.label}</span>
        </div>
        <h3 className='font-bebas text-[17px] text-white tracking-wide truncate'>{title}</h3>
      </div>
      {showClose && (
        <button onClick={onClose}
          className='w-8 h-8 flex items-center justify-center rounded-xl text-white/20
            hover:text-white hover:bg-white/[0.06] transition-all duration-200 hover:rotate-90 flex-shrink-0'>
          <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M6 18L18 6M6 6l12 12' />
          </svg>
        </button>
      )}
    </div>
  )
}

export default QuizModal