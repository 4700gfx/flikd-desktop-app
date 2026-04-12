import React, { useState, useEffect, useCallback, useRef } from 'react'
import supabase from '../../config/SupabaseClient'

/**
 * FLIK'D — AI Quiz System (Polished v2)
 * ─────────────────────────────────────
 * Centered modal with smooth animations, refined feedback,
 * and improved visual design maintaining the gold/dark aesthetic.
 */

const OPENAI_KEY = import.meta.env.VITE_OPENAI_API_KEY

const QUIZ_CONFIG = {
  movie:   { count: 5,  pass: 0.60, cooldownDays: 1, label: 'Film Quiz',      icon: '🎬' },
  episode: { count: 2,  pass: 0.50, cooldownDays: 0, label: 'Episode Check',  icon: '📺' },
  season:  { count: 10, pass: 0.80, cooldownDays: 7, label: 'Season Mastery', icon: '🏆' },
}

/* ─── Spinner ── */
const Spin = ({ size = 20, color = '#D4AF37' }) => (
  <svg width={size} height={size} viewBox='0 0 24 24' fill='none'
    style={{ animation: 'quizSpin 0.8s linear infinite', flexShrink: 0 }}>
    <circle cx='12' cy='12' r='10' stroke={color} strokeWidth='3' opacity='0.15' />
    <path fill={color} opacity='0.8' d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z' />
  </svg>
)

/* ─── Score ring with animation ── */
const ScoreRing = ({ pct, pass, size = 96 }) => {
  const [animated, setAnimated] = useState(0)
  useEffect(() => {
    const t = setTimeout(() => setAnimated(pct), 120)
    return () => clearTimeout(t)
  }, [pct])
  const R = size / 2 - 7
  const C = 2 * Math.PI * R
  const passed = pct >= pass
  const color = passed ? '#D4AF37' : pct >= pass * 0.75 ? '#F59E0B' : '#EF4444'
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size/2} cy={size/2} r={R} fill='none' stroke='rgba(255,255,255,0.04)' strokeWidth='6' />
      <circle cx={size/2} cy={size/2} r={R} fill='none' stroke={color} strokeWidth='6'
        strokeDasharray={`${C * animated} ${C}`} strokeLinecap='round'
        transform={`rotate(-90 ${size/2} ${size/2})`}
        style={{ transition: 'stroke-dasharray 1.2s cubic-bezier(0.34, 1.56, 0.64, 1)' }} />
      <text x={size/2} y={size/2 + 1} textAnchor='middle' dominantBaseline='middle'
        style={{ fontSize: size * 0.2, fontWeight: 800, fill: color, fontFamily: 'system-ui' }}>
        {Math.round(pct * 100)}%
      </text>
      <text x={size/2} y={size/2 + size * 0.2} textAnchor='middle'
        style={{ fontSize: size * 0.1, fill: 'rgba(255,255,255,0.3)', fontFamily: 'system-ui' }}>
        {passed ? 'PASSED' : 'FAILED'}
      </text>
    </svg>
  )
}

/* ─── Cache system (unchanged from v1) ── */
const MIN_POOL         = 15
const EXPAND_THRESHOLD = 30
const TOPUP_BATCH      = 10
const LS_PREFIX        = 'flikd_quiz_'
const memoryCache      = new Map()

const buildCacheKey = ({ type, title, seasonNum, episodeNum }) => {
  const slug = title.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').slice(0, 48)
  if (type === 'movie')   return `movie__${slug}`
  if (type === 'episode') return `ep__${slug}__s${seasonNum}e${episodeNum}`
  if (type === 'season')  return `season__${slug}__s${seasonNum}`
  return `unknown__${slug}`
}
const shuffle = (arr) => {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
const dedupeQuestions = (questions) => {
  const seen = new Set()
  return questions.filter(q => {
    const key = q.q.toLowerCase().trim()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}
const lsRead = (key) => {
  try { const raw = localStorage.getItem(LS_PREFIX + key); return raw ? JSON.parse(raw) : null } catch { return null }
}
const lsWrite = (key, data) => {
  try { localStorage.setItem(LS_PREFIX + key, JSON.stringify(data)) } catch {}
}
const dbReadPool = async (cacheKey) => {
  try {
    const { data } = await supabase.from('quiz_question_pool').select('questions, use_count').eq('cache_key', cacheKey).single()
    return data || null
  } catch { return null }
}
const dbWritePool = async (cacheKey, questions) => {
  try {
    const existing = await dbReadPool(cacheKey)
    const merged = existing ? dedupeQuestions([...existing.questions, ...questions]) : dedupeQuestions(questions)
    await supabase.from('quiz_question_pool').upsert({ cache_key: cacheKey, questions: merged, updated_at: new Date().toISOString(), use_count: (existing?.use_count || 0) }, { onConflict: 'cache_key' })
    return merged
  } catch { return questions }
}
const dbIncrementUse = (cacheKey) => {
  supabase.rpc('increment_quiz_pool_use_count', { key: cacheKey }).catch(() => {})
}

const callOpenAI = async ({ title, type, seasonNum, episodeNum, episodeName, count }) => {
  if (!OPENAI_KEY) throw new Error('No OpenAI API key configured.')
  const context = type === 'movie' ? `the film "${title}"` : type === 'episode' ? `Season ${seasonNum} Episode ${episodeNum} "${episodeName}" of "${title}"` : `Season ${seasonNum} of "${title}"`
  const prompt = type === 'season'
    ? `Generate ${count} multiple-choice quiz questions testing deep knowledge of ${context}. Cover different aspects: plot arcs, character development, episode-specific events, themes, and notable moments. Make questions challenging — 80%+ pass rate for attentive viewers.`
    : type === 'episode'
      ? `Generate ${count} multiple-choice questions about ${context}. Focus on specific plot events, dialogue, and character actions that only someone who watched this episode would know.`
      : `Generate ${count} multiple-choice questions about ${context}. Mix easy (40%), medium (40%), and hard (20%) questions covering plot, characters, themes, and notable scenes.`
  const systemPrompt = `You are a film and TV quiz generator for a cinema app called Flik'd. Return ONLY a valid JSON array with no markdown. Each question: {"q": string, "opts": string[] (exactly 4), "answer": number (0-indexed), "difficulty": "easy"|"medium"|"hard"}`
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_KEY}` },
    body: JSON.stringify({ model: 'gpt-4o-mini', temperature: 0.85, max_tokens: 2400, messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: prompt }] }),
  })
  if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err?.error?.message || `OpenAI error ${res.status}`) }
  const data = await res.json()
  const raw = data.choices?.[0]?.message?.content?.trim() || '[]'
  const clean = raw.replace(/^```(?:json)?|```$/gm, '').trim()
  try {
    const parsed = JSON.parse(clean)
    if (!Array.isArray(parsed) || parsed.length === 0) throw new Error('Empty quiz returned')
    return parsed
  } catch { throw new Error('Could not parse quiz questions. Please try again.') }
}

const generateQuiz = async ({ title, type, seasonNum, episodeNum, episodeName, count }) => {
  const cacheKey = buildCacheKey({ type, title, seasonNum, episodeNum })
  if (memoryCache.has(cacheKey)) {
    const pool = memoryCache.get(cacheKey)
    if (pool.length >= count) { dbIncrementUse(cacheKey); return shuffle(pool).slice(0, count).map(q => ({ ...q, _fromCache: true })) }
  }
  const dbRow = await dbReadPool(cacheKey)
  if (dbRow && Array.isArray(dbRow.questions) && dbRow.questions.length >= count) {
    const pool = dbRow.questions
    memoryCache.set(cacheKey, pool); lsWrite(cacheKey, pool); dbIncrementUse(cacheKey)
    if (pool.length < EXPAND_THRESHOLD) {
      callOpenAI({ title, type, seasonNum, episodeNum, episodeName, count: TOPUP_BATCH })
        .then(fresh => { const merged = dedupeQuestions([...pool, ...fresh]); memoryCache.set(cacheKey, merged); lsWrite(cacheKey, merged); dbWritePool(cacheKey, fresh) })
        .catch(() => {})
    }
    return shuffle(pool).slice(0, count).map(q => ({ ...q, _fromCache: true }))
  }
  const lsPool = lsRead(cacheKey)
  if (lsPool && Array.isArray(lsPool) && lsPool.length >= count) {
    memoryCache.set(cacheKey, lsPool)
    return shuffle(lsPool).slice(0, count).map(q => ({ ...q, _fromCache: true }))
  }
  const requestCount = Math.max(count, MIN_POOL)
  const fresh = await callOpenAI({ title, type, seasonNum, episodeNum, episodeName, count: requestCount })
  const deduped = dedupeQuestions(fresh)
  memoryCache.set(cacheKey, deduped); lsWrite(cacheKey, deduped)
  dbWritePool(cacheKey, deduped).catch(() => {})
  return shuffle(deduped).slice(0, count)
}

/* ─── Cooldown check ── */
export const checkQuizCooldown = async (userId, refId, refType) => {
  if (!userId) return { blocked: false, nextAllowed: null }
  const { data } = await supabase
    .from('quiz_attempts').select('passed, taken_at, next_allowed_at')
    .eq('user_id', userId).eq('ref_id', refId).eq('ref_type', refType)
    .order('taken_at', { ascending: false }).limit(1).single()
  if (!data) return { blocked: false, nextAllowed: null }
  if (data.passed) return { blocked: false, nextAllowed: null, alreadyPassed: true }
  if (!data.next_allowed_at) return { blocked: false, nextAllowed: null }
  const next = new Date(data.next_allowed_at)
  if (Date.now() < next.getTime()) return { blocked: true, nextAllowed: next }
  return { blocked: false, nextAllowed: null }
}

const saveAttempt = async ({ userId, refId, refType, score, passed, cooldownDays }) => {
  const takenAt = new Date().toISOString()
  const nextAllowed = cooldownDays > 0 && !passed ? new Date(Date.now() + cooldownDays * 86400000).toISOString() : null
  await supabase.from('quiz_attempts').insert({ user_id: userId, ref_id: refId, ref_type: refType, score: Math.round(score * 100), passed, taken_at: takenAt, next_allowed_at: nextAllowed })
  return { nextAllowed }
}

/* ─── Cooldown badge ── */
const CooldownBadge = ({ nextAllowed, type, onClose }) => {
  const config = QUIZ_CONFIG[type]
  const ms = new Date(nextAllowed).getTime() - Date.now()
  const hours = Math.floor(ms / 3600000)
  const mins = Math.floor((ms % 3600000) / 60000)
  const timeStr = hours >= 24 ? `${Math.ceil(hours / 24)} day${Math.ceil(hours / 24) !== 1 ? 's' : ''}` : hours > 0 ? `${hours}h ${mins}m` : `${mins}m`
  return (
    <div style={{ padding: '2rem 1.75rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', textAlign: 'center' }}>
      <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, animation: 'quizPulse 2s ease-in-out infinite' }}>⏳</div>
      <div>
        <p style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 20, color: 'rgba(255,255,255,0.85)', letterSpacing: '0.06em', margin: '0 0 0.5rem' }}>Quiz Locked</p>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6, maxWidth: 280, margin: 0 }}>
          You didn't pass the last {config.label.toLowerCase()}. Come back in{' '}
          <span style={{ color: '#D4AF37', fontWeight: 700 }}>{timeStr}</span> to try again.
        </p>
      </div>
      <div style={{ padding: '0.5rem 1rem', borderRadius: 10, border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.04)' }}>
        <p style={{ fontSize: 11, color: 'rgba(239,68,68,0.6)', margin: 0 }}>
          Required: {Math.round(config.pass * 100)}% · Cooldown: {config.cooldownDays} day{config.cooldownDays !== 1 ? 's' : ''}
        </p>
      </div>
      <button onClick={onClose} style={styles.secondaryBtn}>Got it</button>
    </div>
  )
}

/* ─── Shared styles ── */
const styles = {
  primaryBtn: {
    width: '100%', padding: '0.875rem', borderRadius: 14, border: 'none', cursor: 'pointer',
    background: '#D4AF37', color: '#0A0A0A', fontSize: 14, fontWeight: 800,
    transition: 'all 0.18s ease', letterSpacing: '0.02em',
  },
  secondaryBtn: {
    width: '100%', padding: '0.875rem', borderRadius: 14, cursor: 'pointer',
    background: '#141414', border: '1px solid rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.45)',
    fontSize: 14, fontWeight: 700, transition: 'all 0.18s ease',
  },
}

/* ─── Main QuizModal ── */
const QuizModal = ({
  type, title, seasonNum, episodeNum, episodeName, posterPath,
  refId, userId,
  onPass, onClose,
}) => {
  const config = QUIZ_CONFIG[type]
  const [phase,      setPhase]      = useState('checking')
  const [questions,  setQuestions]  = useState([])
  const [current,    setCurrent]    = useState(0)
  const [selected,   setSelected]   = useState(null)
  const [answers,    setAnswers]     = useState([])
  const [confirmed,  setConfirmed]  = useState(false)
  const [result,     setResult]     = useState(null)
  const [error,      setError]      = useState('')
  const [cooldownAt, setCooldownAt] = useState(null)
  const [saving,     setSaving]     = useState(false)
  const [fromCache,  setFromCache]  = useState(false)
  const [closing,    setClosing]    = useState(false)
  const scrollRef = useRef(null)

  const handleClose = useCallback(() => {
    setClosing(true)
    setTimeout(() => onClose?.(), 250)
  }, [onClose])

  /* Prevent body scroll when open */
  useEffect(() => {
    const orig = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = orig }
  }, [])

  /* Escape key */
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape' && (phase === 'result' || phase === 'cooldown' || phase === 'intro' || phase === 'error')) handleClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [phase, handleClose])

  /* Cooldown check */
  useEffect(() => {
    let live = true
    const check = async () => {
      try {
        const { blocked, nextAllowed } = await checkQuizCooldown(userId, refId, type)
        if (!live) return
        if (blocked) { setCooldownAt(nextAllowed); setPhase('cooldown') }
        else setPhase('intro')
      } catch { if (live) setPhase('intro') }
    }
    check()
    return () => { live = false }
  }, [])

  /* Scroll to top on question change */
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0
  }, [current])

  const startQuiz = useCallback(async () => {
    setPhase('loading'); setError('')
    try {
      const qs = await generateQuiz({ title, type, seasonNum, episodeNum, episodeName, count: config.count })
      setFromCache(qs.some(q => q._fromCache))
      setQuestions(qs.map(({ _fromCache: _, ...q }) => q))
      setAnswers([]); setCurrent(0); setSelected(null); setConfirmed(false)
      setPhase('quiz')
    } catch (e) {
      setError(e.message || 'Failed to generate quiz.')
      setPhase('error')
    }
  }, [title, type, seasonNum, episodeNum, episodeName, config.count])

  const confirmAnswer = useCallback(() => {
    if (selected === null || confirmed) return
    const q = questions[current]
    const correct = selected === q.answer
    setConfirmed(true)
    setAnswers(prev => [...prev, { correct, selected, answer: q.answer }])
  }, [selected, confirmed, questions, current])

  const advance = useCallback(async () => {
    if (current + 1 < questions.length) {
      setCurrent(p => p + 1); setSelected(null); setConfirmed(false)
    } else {
      const finalAnswers = [...answers]
      const score = finalAnswers.filter(a => a.correct).length / questions.length
      const passed = score >= config.pass
      setSaving(true)
      try {
        const { nextAllowed } = await saveAttempt({ userId, refId, refType: type, score, passed, cooldownDays: config.cooldownDays })
        setResult({ score, passed, nextAllowed })
        if (passed) onPass?.()
      } catch {
        setResult({ score, passed, nextAllowed: null })
        if (passed) onPass?.()
      }
      setSaving(false); setPhase('result')
    }
  }, [current, questions, answers, config, userId, refId, type, onPass])

  /* Keyboard shortcuts */
  useEffect(() => {
    const h = (e) => {
      if (phase !== 'quiz') return
      if (['1','2','3','4'].includes(e.key)) setSelected(parseInt(e.key) - 1)
      if (e.key === 'Enter') { if (!confirmed && selected !== null) confirmAnswer(); else if (confirmed) advance() }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [phase, selected, confirmed, confirmAnswer, advance])

  const q = questions[current]
  const progressPct = phase === 'quiz' ? (current / questions.length) * 100 : 0
  const tmdbImg = (p) => p ? `https://image.tmdb.org/t/p/w342${p}` : null

  const DIFF = {
    easy:   { color: '#4ade80', bg: 'rgba(74,222,128,0.08)', border: 'rgba(74,222,128,0.2)' },
    medium: { color: '#D4AF37', bg: 'rgba(212,175,55,0.08)', border: 'rgba(212,175,55,0.2)' },
    hard:   { color: '#f87171', bg: 'rgba(248,113,113,0.08)', border: 'rgba(248,113,113,0.2)' },
  }

  /* ─── Overlay + Modal wrapper ── */
  return (
    <>
      {/* Overlay */}
      <div
        onClick={phase === 'result' || phase === 'cooldown' || phase === 'intro' || phase === 'error' ? handleClose : undefined}
        style={{
          position: 'fixed', inset: 0, zIndex: 9000,
          background: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '1rem',
          animation: closing ? 'quizFadeOut 0.22s ease-out forwards' : 'quizFadeIn 0.22s ease-out',
        }}
      >
        {/* Modal */}
        <div
          onClick={e => e.stopPropagation()}
          style={{
            position: 'relative',
            width: '100%', maxWidth: 520,
            maxHeight: 'calc(100vh - 2rem)',
            display: 'flex', flexDirection: 'column',
            background: 'linear-gradient(160deg, #0E0E0E 0%, #080808 100%)',
            border: '1px solid rgba(212,175,55,0.2)',
            borderRadius: 24,
            boxShadow: '0 40px 120px rgba(0,0,0,0.9), 0 0 0 1px rgba(212,175,55,0.05), inset 0 1px 0 rgba(255,255,255,0.04)',
            animation: closing ? 'quizModalOut 0.22s ease-in forwards' : 'quizModalIn 0.32s cubic-bezier(0.22,1,0.36,1)',
            overflow: 'hidden',
          }}
        >
          {/* Gold top accent */}
          <div style={{ height: 3, flexShrink: 0, background: 'linear-gradient(90deg, transparent, #D4AF37 20%, #F0C93A 50%, #D4AF37 80%, transparent)' }} />

          {/* ── CHECKING ── */}
          {phase === 'checking' && (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4rem 2rem', flexDirection: 'column', gap: '1rem' }}>
              <Spin size={36} />
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', margin: 0 }}>Checking eligibility…</p>
            </div>
          )}

          {/* ── COOLDOWN ── */}
          {phase === 'cooldown' && (
            <>
              <ModalHeader title={title} type={type} config={config} posterPath={posterPath} onClose={handleClose} />
              <CooldownBadge nextAllowed={cooldownAt} type={type} onClose={handleClose} />
            </>
          )}

          {/* ── INTRO ── */}
          {phase === 'intro' && (
            <>
              <ModalHeader title={title} type={type} config={config} posterPath={posterPath} onClose={handleClose} />
              <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '1.25rem 1.75rem', scrollbarWidth: 'none' }}>
                {/* Hero card */}
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', padding: '1rem', background: 'rgba(255,255,255,0.025)', borderRadius: 14, border: '1px solid rgba(255,255,255,0.05)' }}>
                  {posterPath && <img src={tmdbImg(posterPath)} alt={title} style={{ width: 48, height: 70, objectFit: 'cover', borderRadius: 8, flexShrink: 0, boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }} />}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 10, fontWeight: 900, color: 'rgba(212,175,55,0.5)', textTransform: 'uppercase', letterSpacing: '0.18em', marginBottom: 4 }}>
                      {type === 'movie' ? '🎬 Film' : type === 'episode' ? `📺 S${seasonNum} · E${episodeNum}` : `📦 Season ${seasonNum}`}
                    </p>
                    <h3 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 20, color: '#fff', letterSpacing: '0.04em', margin: '0 0 2px', lineHeight: 1.2 }}>{title}</h3>
                    {episodeName && <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontStyle: 'italic', margin: 0 }}>"{episodeName}"</p>}
                  </div>
                </div>

                {/* Rules */}
                <p style={{ fontSize: 9, fontWeight: 900, color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: '0.75rem' }}>Quiz Rules</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.25rem' }}>
                  {[
                    { icon: '❓', label: `${config.count} Questions`, desc: `Answer ${config.count} multiple-choice questions about this ${type === 'movie' ? 'film' : type === 'season' ? 'season' : 'episode'}.` },
                    { icon: '🎯', label: `${Math.round(config.pass * 100)}% to Pass`, desc: `Get at least ${Math.ceil(config.count * config.pass)} out of ${config.count} correct to mark as watched.` },
                    ...(config.cooldownDays > 0 ? [{ icon: '⏳', label: `${config.cooldownDays}-Day Cooldown`, desc: `Failed quizzes lock you out for ${config.cooldownDays} day${config.cooldownDays !== 1 ? 's' : ''} before retrying.` }] : []),
                  ].map(({ icon, label, desc }) => (
                    <div key={label} style={{ display: 'flex', gap: '0.875rem', padding: '0.875rem', background: 'rgba(255,255,255,0.02)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.04)', alignItems: 'flex-start' }}>
                      <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>{icon}</span>
                      <div>
                        <p style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.8)', margin: '0 0 2px' }}>{label}</p>
                        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', margin: 0, lineHeight: 1.5 }}>{desc}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* AI notice */}
                <div style={{ display: 'flex', gap: '0.75rem', padding: '0.875rem', borderRadius: 12, border: '1px solid rgba(212,175,55,0.12)', background: 'rgba(212,175,55,0.03)', alignItems: 'flex-start', marginBottom: '0.25rem' }}>
                  <span style={{ fontSize: 16, flexShrink: 0 }}>✨</span>
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', margin: 0, lineHeight: 1.6 }}>
                    Questions are AI-generated specifically for this {type === 'movie' ? 'film' : type}. Only viewers who actually watched it should be able to pass.
                  </p>
                </div>
              </div>
              <div style={{ padding: '1rem 1.75rem 1.5rem', borderTop: '1px solid rgba(255,255,255,0.04)', flexShrink: 0, display: 'flex', gap: '0.75rem' }}>
                <button onClick={handleClose} style={styles.secondaryBtn}>Cancel</button>
                <button onClick={startQuiz} style={{ ...styles.primaryBtn, flex: 1 }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#E8C55B'; e.currentTarget.style.transform = 'translateY(-1px)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#D4AF37'; e.currentTarget.style.transform = 'none' }}>
                  Start Quiz →
                </button>
              </div>
            </>
          )}

          {/* ── LOADING ── */}
          {phase === 'loading' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem 2rem', gap: '1.5rem' }}>
              <div style={{ position: 'relative' }}>
                <div style={{ width: 72, height: 72, borderRadius: '50%', border: '1px solid rgba(212,175,55,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'radial-gradient(circle, rgba(212,175,55,0.06), transparent)', animation: 'quizPulse 2s ease-in-out infinite' }}>
                  <span style={{ fontSize: 28 }}>{config.icon}</span>
                </div>
                <div style={{ position: 'absolute', bottom: -4, right: -4 }}>
                  <Spin size={20} />
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 18, color: 'rgba(255,255,255,0.85)', letterSpacing: '0.06em', margin: '0 0 0.375rem' }}>Generating Your Quiz</p>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', margin: 0 }}>Crafting questions for <span style={{ color: 'rgba(212,175,55,0.7)' }}>{title}</span>…</p>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: 'rgba(212,175,55,0.4)', animation: `quizDot 1.2s ease-in-out ${i * 0.2}s infinite` }} />
                ))}
              </div>
            </div>
          )}

          {/* ── ERROR ── */}
          {phase === 'error' && (
            <>
              <ModalHeader title={title} type={type} config={config} posterPath={posterPath} onClose={handleClose} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2.5rem 2rem', gap: '1rem', textAlign: 'center' }}>
                <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>⚠️</div>
                <div>
                  <p style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 18, color: 'rgba(255,255,255,0.85)', letterSpacing: '0.06em', margin: '0 0 0.5rem' }}>Quiz Generation Failed</p>
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', lineHeight: 1.6, maxWidth: 300, margin: 0 }}>{error}</p>
                </div>
              </div>
              <div style={{ padding: '1rem 1.75rem 1.5rem', borderTop: '1px solid rgba(255,255,255,0.04)', flexShrink: 0, display: 'flex', gap: '0.75rem' }}>
                <button onClick={handleClose} style={styles.secondaryBtn}>Close</button>
                <button onClick={startQuiz} style={{ ...styles.primaryBtn, flex: 1 }}>Try Again</button>
              </div>
            </>
          )}

          {/* ── QUIZ ── */}
          {phase === 'quiz' && q && (
            <>
              {/* Progress header */}
              <div style={{ padding: '1.25rem 1.75rem 0', flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.875rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: 16 }}>{config.icon}</span>
                    <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 15, color: 'rgba(255,255,255,0.7)', letterSpacing: '0.08em' }}>{config.label}</span>
                    {fromCache && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '2px 6px', borderRadius: 20, border: '1px solid rgba(74,222,128,0.2)', background: 'rgba(74,222,128,0.06)' }}>
                        <span style={{ fontSize: 8 }}>⚡</span>
                        <span style={{ fontSize: 8, fontWeight: 900, color: 'rgba(74,222,128,0.6)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Cached</span>
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{current + 1} / {questions.length}</span>
                    {q.difficulty && (
                      <span style={{ fontSize: 9, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.12em', padding: '3px 8px', borderRadius: 20, background: DIFF[q.difficulty]?.bg, border: `1px solid ${DIFF[q.difficulty]?.border}`, color: DIFF[q.difficulty]?.color }}>
                        {q.difficulty}
                      </span>
                    )}
                  </div>
                </div>

                {/* Segmented progress bar */}
                <div style={{ position: 'relative', height: 6, background: '#181818', borderRadius: 3, overflow: 'hidden', marginBottom: '1.25rem' }}>
                  <div style={{ height: '100%', width: `${progressPct}%`, background: 'linear-gradient(90deg, #D4AF37, #F0C93A)', borderRadius: 3, transition: 'width 0.4s ease' }} />
                  {questions.map((_, i) => i > 0 && (
                    <div key={i} style={{ position: 'absolute', top: 0, bottom: 0, width: 1, left: `${(i / questions.length) * 100}%`, background: 'rgba(0,0,0,0.6)' }} />
                  ))}
                </div>
              </div>

              {/* Q&A body */}
              <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '0 1.75rem 0.75rem', scrollbarWidth: 'none' }}>
                {/* Question */}
                <p key={current} style={{ fontSize: 15, fontWeight: 600, color: '#fff', lineHeight: 1.55, marginBottom: '1.25rem', animation: 'quizQuestionIn 0.22s ease-out' }}>
                  {q.q}
                </p>

                {/* Options */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                  {q.opts.map((opt, idx) => {
                    const labels = ['A', 'B', 'C', 'D']
                    let state = 'idle'
                    if (confirmed) {
                      if (idx === q.answer) state = 'correct'
                      else if (idx === selected) state = 'wrong'
                    } else if (idx === selected) state = 'selected'

                    const optStyle = {
                      idle:     { border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)', color: 'rgba(255,255,255,0.65)', cursor: 'pointer' },
                      selected: { border: '1px solid rgba(212,175,55,0.6)',  background: 'rgba(212,175,55,0.08)',  color: '#fff', cursor: 'pointer', boxShadow: '0 0 0 1px rgba(212,175,55,0.15)' },
                      correct:  { border: '1px solid rgba(74,222,128,0.5)',  background: 'rgba(74,222,128,0.08)',  color: '#4ade80' },
                      wrong:    { border: '1px solid rgba(248,113,113,0.5)', background: 'rgba(248,113,113,0.08)', color: '#f87171' },
                    }
                    const labelStyle = {
                      idle:     { background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.3)' },
                      selected: { background: 'rgba(212,175,55,0.18)', color: '#D4AF37' },
                      correct:  { background: 'rgba(74,222,128,0.18)', color: '#4ade80' },
                      wrong:    { background: 'rgba(248,113,113,0.18)', color: '#f87171' },
                    }

                    return (
                      <button
                        key={idx}
                        disabled={confirmed}
                        onClick={() => !confirmed && setSelected(idx)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '0.875rem',
                          padding: '0.875rem 1rem', borderRadius: 14,
                          textAlign: 'left', width: '100%', outline: 'none',
                          transition: 'all 0.18s ease',
                          animation: `quizOptIn 0.2s ease-out ${idx * 0.06}s both`,
                          ...optStyle[state],
                        }}
                        onMouseEnter={e => { if (state === 'idle') { e.currentTarget.style.borderColor = 'rgba(212,175,55,0.3)'; e.currentTarget.style.background = 'rgba(212,175,55,0.04)' } }}
                        onMouseLeave={e => { if (state === 'idle') { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; e.currentTarget.style.background = 'rgba(255,255,255,0.02)' } }}
                      >
                        <span style={{ width: 28, height: 28, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 900, flexShrink: 0, transition: 'all 0.18s', ...labelStyle[state] }}>
                          {confirmed && state === 'correct' ? '✓' : confirmed && state === 'wrong' ? '✗' : labels[idx]}
                        </span>
                        <span style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.4, flex: 1 }}>{opt}</span>
                      </button>
                    )
                  })}
                </div>

                {/* Feedback toast */}
                {confirmed && (
                  <div style={{
                    marginTop: '0.875rem', padding: '0.75rem 1rem', borderRadius: 12,
                    border: answers[answers.length-1]?.correct ? '1px solid rgba(74,222,128,0.2)' : '1px solid rgba(248,113,113,0.2)',
                    background: answers[answers.length-1]?.correct ? 'rgba(74,222,128,0.05)' : 'rgba(248,113,113,0.05)',
                    color: answers[answers.length-1]?.correct ? 'rgba(74,222,128,0.8)' : 'rgba(248,113,113,0.8)',
                    fontSize: 12, lineHeight: 1.5,
                    animation: 'quizReveal 0.22s ease-out',
                  }}>
                    {answers[answers.length-1]?.correct
                      ? `✓ Correct! ${current + 1 < questions.length ? 'Keep going.' : 'Last question done!'}`
                      : `✗ Correct answer: "${q.opts[q.answer]}"`
                    }
                  </div>
                )}
              </div>

              {/* Footer */}
              <div style={{ padding: '0.875rem 1.75rem 1.25rem', borderTop: '1px solid rgba(255,255,255,0.04)', flexShrink: 0 }}>
                {/* Answer dots */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, marginBottom: '0.875rem' }}>
                  {questions.map((_, i) => {
                    const a = answers[i]
                    const isCurrent = i === current
                    const size = isCurrent ? 10 : a ? 10 : 7
                    return (
                      <div key={i} style={{
                        width: size, height: size, borderRadius: '50%',
                        transition: 'all 0.25s ease',
                        background: i < answers.length
                          ? a?.correct ? '#4ade80' : '#f87171'
                          : isCurrent ? 'rgba(212,175,55,0.4)' : 'rgba(255,255,255,0.1)',
                        border: isCurrent ? '2px solid #D4AF37' : 'none',
                        boxShadow: i < answers.length && a?.correct ? '0 0 5px rgba(74,222,128,0.4)' : i < answers.length && !a?.correct ? '0 0 5px rgba(248,113,113,0.35)' : 'none',
                      }} />
                    )
                  })}
                </div>

                {!confirmed
                  ? <button onClick={confirmAnswer} disabled={selected === null}
                      style={{ ...styles.primaryBtn, opacity: selected === null ? 0.35 : 1, cursor: selected === null ? 'not-allowed' : 'pointer', transition: 'all 0.18s ease' }}
                      onMouseEnter={e => { if (selected !== null) { e.currentTarget.style.background = '#E8C55B'; e.currentTarget.style.transform = 'translateY(-1px)' } }}
                      onMouseLeave={e => { e.currentTarget.style.background = '#D4AF37'; e.currentTarget.style.transform = 'none' }}>
                      Confirm Answer
                    </button>
                  : <button onClick={advance} disabled={saving}
                      style={{ ...styles.primaryBtn, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', cursor: saving ? 'wait' : 'pointer' }}
                      onMouseEnter={e => { if (!saving) { e.currentTarget.style.background = '#E8C55B'; e.currentTarget.style.transform = 'translateY(-1px)' } }}
                      onMouseLeave={e => { e.currentTarget.style.background = '#D4AF37'; e.currentTarget.style.transform = 'none' }}>
                      {saving && <Spin size={16} color='#0A0A0A' />}
                      {saving ? 'Saving…' : current + 1 < questions.length ? 'Next Question →' : 'See Results →'}
                    </button>
                }
                <p style={{ textAlign: 'center', fontSize: 10, color: 'rgba(255,255,255,0.13)', marginTop: '0.5rem' }}>Press 1–4 to select · Enter to confirm</p>
              </div>
            </>
          )}

          {/* ── RESULT ── */}
          {phase === 'result' && result && (
            <>
              <div style={{ padding: '1.5rem 1.75rem 1rem', flexShrink: 0 }}>
                <p style={{ fontSize: 10, fontWeight: 900, color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase', letterSpacing: '0.2em', margin: '0 0 0.25rem' }}>{config.label} · Results</p>
                <h3 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, color: '#fff', letterSpacing: '0.04em', margin: 0, lineHeight: 1.2 }}>{title}</h3>
              </div>

              <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '0 1.75rem 0.75rem', scrollbarWidth: 'none' }}>
                {/* Score card */}
                <div style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '1.5rem',
                  marginBottom: '1.25rem', borderRadius: 16,
                  border: result.passed ? '1px solid rgba(212,175,55,0.25)' : '1px solid rgba(248,113,113,0.2)',
                  background: result.passed ? 'rgba(212,175,55,0.04)' : 'rgba(248,113,113,0.04)',
                  animation: 'quizReveal 0.3s ease-out',
                }}>
                  <ScoreRing pct={result.score} pass={config.pass} size={104} />
                  <p style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 26, letterSpacing: '0.06em', margin: '0.75rem 0 0.25rem', color: result.passed ? '#D4AF37' : '#f87171' }}>
                    {result.passed ? 'Passed! 🎉' : 'Not Quite'}
                  </p>
                  <p style={{ fontSize: 13, color: result.passed ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.3)', margin: 0 }}>
                    {Math.round(result.score * questions.length)} / {questions.length} correct · needed {Math.ceil(config.pass * questions.length)}
                  </p>
                </div>

                {/* Question breakdown */}
                <p style={{ fontSize: 9, fontWeight: 900, color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: '0.625rem' }}>Question Breakdown</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
                  {questions.map((question, i) => {
                    const a = answers[i]
                    if (!a) return null
                    return (
                      <div key={i} style={{
                        display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
                        padding: '0.75rem', borderRadius: 12,
                        border: a.correct ? '1px solid rgba(74,222,128,0.15)' : '1px solid rgba(248,113,113,0.15)',
                        background: a.correct ? 'rgba(74,222,128,0.04)' : 'rgba(248,113,113,0.04)',
                        animation: `quizOptIn 0.2s ease-out ${i * 0.04}s both`,
                      }}>
                        <span style={{ width: 20, height: 20, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 900, flexShrink: 0, marginTop: 1, background: a.correct ? 'rgba(74,222,128,0.15)' : 'rgba(248,113,113,0.15)', color: a.correct ? '#4ade80' : '#f87171' }}>
                          {a.correct ? '✓' : '✗'}
                        </span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', lineHeight: 1.4, margin: 0, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{question.q}</p>
                          {!a.correct && (
                            <p style={{ fontSize: 10, color: 'rgba(74,222,128,0.6)', margin: '0.25rem 0 0' }}>✓ {question.opts[question.answer]}</p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Cooldown notice */}
                {!result.passed && result.nextAllowed && (
                  <div style={{ padding: '1rem', borderRadius: 12, border: '1px solid rgba(248,113,113,0.2)', background: 'rgba(248,113,113,0.04)', marginBottom: '0.75rem' }}>
                    <p style={{ fontSize: 12, color: 'rgba(248,113,113,0.7)', lineHeight: 1.6, margin: 0 }}>
                      ⏳ You can retake this quiz in <strong style={{ color: '#f87171' }}>{config.cooldownDays} day{config.cooldownDays !== 1 ? 's' : ''}</strong>. Use the time to rewatch and refresh your memory.
                    </p>
                  </div>
                )}
              </div>

              <div style={{ padding: '1rem 1.75rem 1.5rem', borderTop: '1px solid rgba(255,255,255,0.04)', flexShrink: 0 }}>
                <button onClick={handleClose}
                  style={result.passed ? { ...styles.primaryBtn } : { ...styles.secondaryBtn }}
                  onMouseEnter={e => { if (result.passed) { e.currentTarget.style.background = '#E8C55B'; e.currentTarget.style.transform = 'translateY(-1px)' } }}
                  onMouseLeave={e => { if (result.passed) { e.currentTarget.style.background = '#D4AF37'; e.currentTarget.style.transform = 'none' } }}>
                  {result.passed ? '✓ Done' : 'Close'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <style>{`
        @keyframes quizFadeIn    { from { opacity: 0 } to { opacity: 1 } }
        @keyframes quizFadeOut   { from { opacity: 1 } to { opacity: 0 } }
        @keyframes quizModalIn   { from { opacity: 0; transform: scale(0.92) translateY(16px) } to { opacity: 1; transform: scale(1) translateY(0) } }
        @keyframes quizModalOut  { from { opacity: 1; transform: scale(1) translateY(0) } to { opacity: 0; transform: scale(0.95) translateY(8px) } }
        @keyframes quizPulse     { 0%,100% { opacity: 0.6; transform: scale(1) } 50% { opacity: 1; transform: scale(1.04) } }
        @keyframes quizDot       { 0%,80%,100% { transform: scale(0.8); opacity: 0.35 } 40% { transform: scale(1.3); opacity: 1 } }
        @keyframes quizOptIn     { from { opacity: 0; transform: translateX(-6px) } to { opacity: 1; transform: translateX(0) } }
        @keyframes quizQuestionIn{ from { opacity: 0; transform: translateY(-5px) } to { opacity: 1; transform: translateY(0) } }
        @keyframes quizReveal    { from { opacity: 0; transform: translateY(5px) } to { opacity: 1; transform: translateY(0) } }
        @keyframes quizSpin      { to { transform: rotate(360deg) } }
      `}</style>
    </>
  )
}

/* ─── Modal header sub-component ── */
const ModalHeader = ({ title, type, config, posterPath, onClose }) => {
  const tmdbImg = (p) => p ? `https://image.tmdb.org/t/p/w342${p}` : null
  return (
    <div style={{ padding: '1rem 1.25rem 1rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', gap: '0.875rem', flexShrink: 0 }}>
      {posterPath && <img src={tmdbImg(posterPath)} alt={title} style={{ width: 36, height: 52, objectFit: 'cover', borderRadius: 6, flexShrink: 0, boxShadow: '0 4px 12px rgba(0,0,0,0.4)' }} />}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginBottom: 2 }}>
          <span style={{ fontSize: 13 }}>{config.icon}</span>
          <span style={{ fontSize: 10, fontWeight: 900, color: 'rgba(212,175,55,0.5)', textTransform: 'uppercase', letterSpacing: '0.18em' }}>{config.label}</span>
        </div>
        <h3 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 16, color: '#fff', letterSpacing: '0.04em', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</h3>
      </div>
      <button onClick={onClose}
        style={{ width: 32, height: 32, borderRadius: 10, border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.2)', transition: 'all 0.18s ease', flexShrink: 0 }}
        onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.transform = 'rotate(90deg)' }}
        onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.2)'; e.currentTarget.style.background = 'transparent'; e.currentTarget.style.transform = 'none' }}>
        <svg width={14} height={14} fill='none' stroke='currentColor' viewBox='0 0 24 24'>
          <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M6 18L18 6M6 6l12 12' />
        </svg>
      </button>
    </div>
  )
}

export default QuizModal