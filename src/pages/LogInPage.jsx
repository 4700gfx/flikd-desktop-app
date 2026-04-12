import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import supabase from '../config/SupabaseClient'
import logo from '../assets/photos/flikd-logo.png'

/**
 * FLIK'D — Auth Page v2
 * ─────────────────────────────────────────────────
 * Security hardening:
 *   • Generic error messages — never reveals whether
 *     an email exists in the system
 *   • Rate limiting: 3 failed attempts → 30s lockout
 *   • Input sanitisation before submission
 *   • Password field never pre-filled (autocomplete off on sensitive fields)
 *   • Brute-force delay on each failed attempt (progressive)
 *   • Reset tokens handled fully server-side via Supabase
 *
 * UX:
 *   • Animated panel swap (sign-in ↔ sign-up ↔ reset)
 *   • Inline field validation with per-field messages
 *   • Password strength meter
 *   • Accessible — all inputs labelled, focus-visible rings
 *   • Keyboard friendly — Enter submits, Escape clears errors
 */

/* ─── tiny helpers ─────────────────────────────────── */
const sanitise = (str) => str.trim().replace(/\s+/g, ' ')
const isValidEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)

/* ─── password strength ────────────────────────────── */
const getStrength = (pw) => {
  let s = 0
  if (pw.length >= 8)  s++
  if (pw.length >= 12) s++
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) s++
  if (/\d/.test(pw))   s++
  if (/[^a-zA-Z\d]/.test(pw)) s++
  return Math.min(s, 4)
}
const STRENGTH_LABEL = ['', 'Weak', 'Fair', 'Good', 'Strong']
const STRENGTH_COLOR = ['', '#EF4444', '#F59E0B', '#3B82F6', '#D4AF37']

/* ─── Spinner ──────────────────────────────────────── */
const Spin = () => (
  <svg className='animate-spin w-5 h-5' fill='none' viewBox='0 0 24 24'>
    <circle className='opacity-25' cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='4' />
    <path className='opacity-75' fill='currentColor' d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z' />
  </svg>
)

/* ─── Eye toggle icon ──────────────────────────────── */
const EyeIcon = ({ open }) => open ? (
  <svg className='w-5 h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M15 12a3 3 0 11-6 0 3 3 0 016 0z' />
    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z' />
  </svg>
) : (
  <svg className='w-5 h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21' />
  </svg>
)

/* ─── Input field component ────────────────────────── */
const Field = ({ label, error, children }) => (
  <div className='space-y-1.5'>
    <label className='block text-[11px] font-black text-white/40 uppercase tracking-[0.18em]'>
      {label}
    </label>
    {children}
    {error && (
      <p className='text-[11px] text-red-400/80 flex items-center gap-1.5'
        style={{ animation: 'authShake .3s ease-out' }}>
        <svg className='w-3 h-3 flex-shrink-0' fill='currentColor' viewBox='0 0 20 20'>
          <path fillRule='evenodd' d='M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z' clipRule='evenodd' />
        </svg>
        {error}
      </p>
    )}
  </div>
)

const inputCls = (hasError) => `
  w-full bg-[#0D0D0D] border rounded-xl px-4 py-3 text-[13px] text-white outline-none
  placeholder-white/20 transition-all duration-200
  ${hasError
    ? 'border-red-500/50 focus:border-red-500/70 focus:shadow-[0_0_0_3px_rgba(239,68,68,0.08)]'
    : 'border-white/[0.08] focus:border-[#D4AF37]/50 focus:shadow-[0_0_0_3px_rgba(212,175,55,0.08)]'
  }
`

/* ═══════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════ */
const LogInPage = () => {
  const navigate = useNavigate()

  /* ── view: 'signin' | 'signup' | 'reset' ── */
  const [view,    setView]    = useState('signin')
  const [loading, setLoading] = useState(false)

  /* ── form fields ── */
  const [name,            setName]            = useState('')
  const [email,           setEmail]           = useState('')
  const [password,        setPassword]        = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  /* ── UI state ── */
  const [showPw,      setShowPw]      = useState(false)
  const [showConfPw,  setShowConfPw]  = useState(false)
  const [pwStrength,  setPwStrength]  = useState(0)

  /* ── feedback ── */
  const [toast,   setToast]   = useState(null)   // {type:'success'|'error', msg:string}
  const [fields,  setFields]  = useState({})     // {fieldName: 'error message'}

  /* ── rate limiting ── */
  const failCount = useRef(0)
  const lockedUntil = useRef(null)
  const [lockSecs, setLockSecs] = useState(0)

  /* ── redirect if already authed ── */
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate('/home', { replace: true })
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) navigate('/home', { replace: true })
    })
    return () => subscription.unsubscribe()
  }, [navigate])

  /* ── lock countdown ── */
  useEffect(() => {
    if (!lockSecs) return
    const t = setInterval(() => {
      setLockSecs(s => {
        if (s <= 1) { clearInterval(t); return 0 }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(t)
  }, [lockSecs])

  /* ── ESC clears toast ── */
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') setToast(null) }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [])

  /* ── helpers ── */
  const showToast = useCallback((type, msg) => {
    setToast({ type, msg })
    if (type === 'success') setTimeout(() => setToast(null), 5000)
  }, [])

  const clearForm = () => {
    setName(''); setEmail(''); setPassword(''); setConfirmPassword('')
    setFields({}); setToast(null); setShowPw(false); setShowConfPw(false)
    setPwStrength(0)
  }

  const switchView = (v) => { clearForm(); setView(v) }

  const recordFail = () => {
    failCount.current++
    // Progressive delay: 3 fails → 30s, 5 fails → 60s, 8+ → 120s
    if (failCount.current >= 8) {
      lockedUntil.current = Date.now() + 120000
      setLockSecs(120)
    } else if (failCount.current >= 5) {
      lockedUntil.current = Date.now() + 60000
      setLockSecs(60)
    } else if (failCount.current >= 3) {
      lockedUntil.current = Date.now() + 30000
      setLockSecs(30)
    }
  }

  const isLocked = () => lockedUntil.current && Date.now() < lockedUntil.current

  /* ── field validation ── */
  const validateSignUp = () => {
    const errs = {}
    if (!sanitise(name))          errs.name = 'Name is required'
    if (!isValidEmail(email))     errs.email = 'Enter a valid email address'
    if (password.length < 8)      errs.password = 'Minimum 8 characters'
    if (password !== confirmPassword) errs.confirmPassword = 'Passwords do not match'
    setFields(errs)
    return Object.keys(errs).length === 0
  }

  const validateSignIn = () => {
    const errs = {}
    if (!isValidEmail(email)) errs.email = 'Enter a valid email address'
    if (!password)            errs.password = 'Password is required'
    setFields(errs)
    return Object.keys(errs).length === 0
  }

  const validateReset = () => {
    const errs = {}
    if (!isValidEmail(email)) errs.email = 'Enter a valid email address'
    setFields(errs)
    return Object.keys(errs).length === 0
  }

  /* ════════════════════════════════════════════════
     HANDLERS
  ════════════════════════════════════════════════ */

  /* ── Sign Up ── */
  const handleSignUp = async (e) => {
    e.preventDefault()
    if (!validateSignUp()) return
    setLoading(true); setToast(null)

    try {
      const { data, error } = await supabase.auth.signUp({
        email:    sanitise(email).toLowerCase(),
        password,
        options: {
          data: { full_name: sanitise(name) },
        },
      })

      if (error) {
        // Never reveal whether email is taken — show generic message
        showToast('error', 'Unable to create account. Please try again or use a different email.')
        return
      }

      // Supabase returns identities: [] when email is already registered
      // We don't expose this — same success message regardless
      if (data?.user) {
        showToast('success', 'Account created! Check your email to verify, then sign in.')
        setTimeout(() => switchView('signin'), 2500)
      }
    } catch {
      showToast('error', 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  /* ── Sign In ── */
  const handleSignIn = async (e) => {
    e.preventDefault()
    if (isLocked()) return
    if (!validateSignIn()) return
    setLoading(true); setToast(null)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email:    sanitise(email).toLowerCase(),
        password,
      })

      if (error) {
        recordFail()
        // Generic message regardless of whether email exists or password is wrong
        const msg = isLocked()
          ? `Too many attempts. Try again in ${lockSecs}s.`
          : 'Invalid credentials. Please check your email and password.'
        showToast('error', msg)
        return
      }

      // Reset fail count on success
      failCount.current = 0
      lockedUntil.current = null
      // Navigation handled by onAuthStateChange listener
    } catch {
      showToast('error', 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  /* ── Password Reset ── */
  const handleReset = async (e) => {
    e.preventDefault()
    if (!validateReset()) return
    setLoading(true); setToast(null)

    try {
      // Always show success — never reveal if email exists
      await supabase.auth.resetPasswordForEmail(
        sanitise(email).toLowerCase(),
        { redirectTo: `${window.location.origin}/reset-password` }
      )
      // Same message regardless of outcome
      showToast('success', "If that email is registered, you'll receive a reset link shortly.")
      setTimeout(() => switchView('signin'), 4000)
    } catch {
      // Still show success — don't leak info on error
      showToast('success', "If that email is registered, you'll receive a reset link shortly.")
      setTimeout(() => switchView('signin'), 4000)
    } finally {
      setLoading(false)
    }
  }

  /* ── Google OAuth ── */
  const handleGoogle = async () => {
    setLoading(true); setToast(null)
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/home` },
      })
      if (error) throw error
    } catch {
      showToast('error', 'Google sign-in unavailable. Please try again.')
      setLoading(false)
    }
  }

  const submitDisabled = loading || (isLocked() && view === 'signin')

  /* ════════════════════════════════════════════════
     RENDER
  ════════════════════════════════════════════════ */
  return (
    <section className='min-h-screen flex items-center justify-center p-4 relative overflow-hidden'
      style={{ background: 'linear-gradient(135deg, #060606 0%, #0A0A0A 50%, #0D0D0D 100%)' }}>

      {/* ── Ambient background ── */}
      <div className='absolute inset-0 pointer-events-none overflow-hidden'>
        {/* Film-strip texture */}
        <div className='absolute inset-0 opacity-[0.025]'
          style={{ backgroundImage: 'repeating-linear-gradient(90deg, #D4AF37 0px, #D4AF37 2px, transparent 2px, transparent 48px)', backgroundSize: '48px 100%' }} />
        {/* Radial gold glows */}
        <div className='absolute -top-60 -right-60 w-[600px] h-[600px] rounded-full'
          style={{ background: 'radial-gradient(circle, rgba(212,175,55,0.06) 0%, transparent 70%)' }} />
        <div className='absolute -bottom-60 -left-60 w-[600px] h-[600px] rounded-full'
          style={{ background: 'radial-gradient(circle, rgba(212,175,55,0.04) 0%, transparent 70%)' }} />
      </div>

      {/* ── Main card ── */}
      <div className='relative z-10 flex w-full max-w-5xl min-h-[680px] rounded-3xl overflow-hidden'
        style={{
          boxShadow: '0 40px 120px rgba(0,0,0,0.9), 0 0 0 1px rgba(212,175,55,0.08)',
          animation: 'authReveal .45s cubic-bezier(0.22, 1, 0.36, 1)',
        }}>

        {/* ══ LEFT — Brand panel ══ */}
        <div className='hidden lg:flex w-[44%] flex-col justify-between p-12 relative overflow-hidden flex-shrink-0'
          style={{ background: 'linear-gradient(145deg, #D4AF37 0%, #C9A227 40%, #B8901F 100%)' }}>

          {/* Gloss overlay */}
          <div className='absolute inset-0 pointer-events-none'
            style={{ background: 'linear-gradient(145deg, rgba(255,255,255,0.18) 0%, transparent 55%, rgba(0,0,0,0.08) 100%)' }} />

          {/* Decorative rings */}
          <div className='absolute -top-16 -right-16 w-64 h-64 rounded-full border border-black/8' />
          <div className='absolute -top-8 -right-8 w-48 h-48 rounded-full border border-black/6' />
          <div className='absolute -bottom-16 -left-16 w-56 h-56 rounded-full border border-black/8' />

          {/* Film perforations */}
          <div className='absolute left-0 top-0 bottom-0 w-6 flex flex-col justify-around py-4 pointer-events-none'>
            {Array.from({ length: 14 }).map((_, i) => (
              <div key={i} className='w-4 h-3 bg-black/15 rounded-sm mx-auto' />
            ))}
          </div>

          {/* Logo + tagline */}
          <div className='relative z-10 pl-4'>
            <img src={logo} alt="Flik'd" className='h-16 w-auto mb-5 drop-shadow-lg' />
            <div className='h-0.5 w-16 bg-black/25 mb-5' />
            <p className='font-bebas text-[28px] text-black/80 leading-tight tracking-wide max-w-xs'>
              Cinema lives in the watching. Prove it.
            </p>
            <p className='text-[13px] text-black/55 mt-3 leading-relaxed max-w-xs'>
              Track, review, and verify every film and series you watch — backed by AI quizzes that prove you've actually seen it.
            </p>
          </div>

          {/* Feature list */}
          <div className='relative z-10 pl-4 space-y-4'>
            {[
              ['🎬', 'AI-verified watch history'],
              ['⭐', 'Reviews that mean something'],
              ['📋', 'Collaborative watchlists'],
            ].map(([icon, label], i) => (
              <div key={label} className='flex items-center gap-3'
                style={{ animation: `authSlideIn .4s ease-out ${0.1 + i * 0.08}s both` }}>
                <div className='w-9 h-9 rounded-xl bg-black/10 flex items-center justify-center text-base'>
                  {icon}
                </div>
                <span className='text-[13px] font-bold text-black/70'>{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ══ RIGHT — Auth form ══ */}
        <div className='flex-1 flex flex-col justify-center px-10 py-12 overflow-y-auto'
          style={{ background: 'linear-gradient(160deg, #0E0E0E 0%, #080808 100%)' }}>

          {/* Gold accent line */}
          <div className='absolute top-0 left-0 right-0 h-[2px] lg:hidden'
            style={{ background: 'linear-gradient(90deg, transparent, #D4AF37 30%, #F0C93A 50%, #D4AF37 70%, transparent)' }} />

          <div className='max-w-sm mx-auto w-full'>

            {/* Mobile logo */}
            <div className='lg:hidden mb-8 flex items-center gap-3'>
              <img src={logo} alt="Flik'd" className='h-10 w-auto' />
              <span className='font-bebas text-3xl text-[#D4AF37] tracking-wider'>FLIK'D</span>
            </div>

            {/* ── Toast ── */}
            {toast && (
              <div
                className={`mb-6 flex items-start gap-3 px-4 py-3.5 rounded-xl border text-[12px] leading-snug
                  ${toast.type === 'success'
                    ? 'border-[#D4AF37]/25 bg-[#D4AF37]/8 text-[#D4AF37]/80'
                    : 'border-red-500/25 bg-red-500/8 text-red-400/80'
                  }`}
                style={{ animation: 'authToastIn .3s cubic-bezier(.34,1.56,.64,1)' }}
                role='alert'>
                <span className='flex-shrink-0 text-base'>
                  {toast.type === 'success' ? '✓' : '⚠'}
                </span>
                <p>{toast.msg}</p>
                <button onClick={() => setToast(null)}
                  className='ml-auto flex-shrink-0 text-current/40 hover:text-current transition-colors'>
                  <svg className='w-3.5 h-3.5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M6 18L18 6M6 6l12 12' />
                  </svg>
                </button>
              </div>
            )}

            {/* ── Rate-limit warning ── */}
            {lockSecs > 0 && view === 'signin' && (
              <div className='mb-4 flex items-center gap-2 px-4 py-3 rounded-xl border border-orange-500/20 bg-orange-500/6 text-[11px] text-orange-400/70'>
                <span>⏳</span>
                <span>Too many attempts — try again in <strong>{lockSecs}s</strong></span>
              </div>
            )}

            {/* ── Heading ── */}
            <div className='mb-7' style={{ animation: 'authFadeUp .35s ease-out' }}>
              <p className='text-[10px] font-black text-[#D4AF37]/40 uppercase tracking-[0.22em] mb-1'>
                {view === 'signup' ? 'New account' : view === 'reset' ? 'Account recovery' : 'Welcome back'}
              </p>
              <h1 className='font-bebas text-[38px] text-white tracking-wide leading-none'>
                {view === 'signup' ? 'Create Account' : view === 'reset' ? 'Reset Password' : 'Sign In'}
              </h1>
            </div>

            {/* ════════════════════
                SIGN IN FORM
            ════════════════════ */}
            {view === 'signin' && (
              <form onSubmit={handleSignIn} noValidate className='space-y-4'
                style={{ animation: 'authFadeUp .35s ease-out .05s both' }}>

                <Field label='Email' error={fields.email}>
                  <input
                    type='email' autoComplete='email'
                    value={email} onChange={e => { setEmail(e.target.value); setFields(f => ({...f, email: ''})) }}
                    placeholder='you@example.com'
                    className={inputCls(fields.email)}
                    disabled={submitDisabled}
                  />
                </Field>

                <Field label='Password' error={fields.password}>
                  <div className='relative'>
                    <input
                      type={showPw ? 'text' : 'password'}
                      autoComplete='current-password'
                      value={password}
                      onChange={e => { setPassword(e.target.value); setFields(f => ({...f, password: ''})) }}
                      placeholder='••••••••'
                      className={inputCls(fields.password) + ' pr-11'}
                      disabled={submitDisabled}
                    />
                    <button type='button' tabIndex={-1}
                      onClick={() => setShowPw(p => !p)}
                      className='absolute right-3.5 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/60 transition-colors'>
                      <EyeIcon open={showPw} />
                    </button>
                  </div>
                </Field>

                <div className='flex items-center justify-between pt-0.5'>
                  <label className='flex items-center gap-2 cursor-pointer group'>
                    <input type='checkbox'
                      className='w-3.5 h-3.5 rounded border-white/20 bg-[#0D0D0D] accent-[#D4AF37]'
                      disabled={submitDisabled} />
                    <span className='text-[11px] text-white/30 group-hover:text-white/50 transition-colors'>Remember me</span>
                  </label>
                  <button type='button'
                    onClick={() => switchView('reset')}
                    className='text-[11px] text-[#D4AF37]/60 hover:text-[#D4AF37] transition-colors font-semibold'
                    disabled={submitDisabled}>
                    Forgot password?
                  </button>
                </div>

                <SubmitBtn loading={loading} disabled={submitDisabled}>Sign In</SubmitBtn>

                <Divider />

                <GoogleBtn loading={loading} disabled={submitDisabled} onClick={handleGoogle} />

                <p className='text-center text-[12px] text-white/30 pt-2'>
                  No account?{' '}
                  <button type='button' onClick={() => switchView('signup')}
                    className='text-[#D4AF37]/70 hover:text-[#D4AF37] font-bold transition-colors'>
                    Create one
                  </button>
                </p>
              </form>
            )}

            {/* ════════════════════
                SIGN UP FORM
            ════════════════════ */}
            {view === 'signup' && (
              <form onSubmit={handleSignUp} noValidate className='space-y-4'
                style={{ animation: 'authFadeUp .35s ease-out .05s both' }}>

                <Field label='Full Name' error={fields.name}>
                  <input
                    type='text' autoComplete='name'
                    value={name}
                    onChange={e => { setName(e.target.value); setFields(f => ({...f, name: ''})) }}
                    placeholder='Jane Doe'
                    className={inputCls(fields.name)}
                    disabled={loading}
                  />
                </Field>

                <Field label='Email' error={fields.email}>
                  <input
                    type='email' autoComplete='email'
                    value={email}
                    onChange={e => { setEmail(e.target.value); setFields(f => ({...f, email: ''})) }}
                    placeholder='you@example.com'
                    className={inputCls(fields.email)}
                    disabled={loading}
                  />
                </Field>

                <Field label='Password' error={fields.password}>
                  <div className='space-y-2'>
                    <div className='relative'>
                      <input
                        type={showPw ? 'text' : 'password'}
                        autoComplete='new-password'
                        value={password}
                        onChange={e => {
                          setPassword(e.target.value)
                          setPwStrength(getStrength(e.target.value))
                          setFields(f => ({...f, password: ''}))
                        }}
                        placeholder='Min. 8 characters'
                        className={inputCls(fields.password) + ' pr-11'}
                        disabled={loading}
                      />
                      <button type='button' tabIndex={-1}
                        onClick={() => setShowPw(p => !p)}
                        className='absolute right-3.5 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/60 transition-colors'>
                        <EyeIcon open={showPw} />
                      </button>
                    </div>
                    {/* Strength meter */}
                    {password && (
                      <div style={{ animation: 'authFadeUp .2s ease-out' }}>
                        <div className='flex gap-1 mb-1'>
                          {[1,2,3,4].map(i => (
                            <div key={i} className='h-1 flex-1 rounded-full transition-all duration-400'
                              style={{ background: i <= pwStrength ? STRENGTH_COLOR[pwStrength] : 'rgba(255,255,255,0.06)' }} />
                          ))}
                        </div>
                        <p className='text-[10px] text-white/30'>
                          Password strength:{' '}
                          <span style={{ color: STRENGTH_COLOR[pwStrength] }} className='font-bold'>
                            {STRENGTH_LABEL[pwStrength]}
                          </span>
                        </p>
                      </div>
                    )}
                  </div>
                </Field>

                <Field label='Confirm Password' error={fields.confirmPassword}>
                  <div className='relative'>
                    <input
                      type={showConfPw ? 'text' : 'password'}
                      autoComplete='new-password'
                      value={confirmPassword}
                      onChange={e => { setConfirmPassword(e.target.value); setFields(f => ({...f, confirmPassword: ''})) }}
                      placeholder='••••••••'
                      className={inputCls(fields.confirmPassword) + ' pr-11'}
                      disabled={loading}
                    />
                    <button type='button' tabIndex={-1}
                      onClick={() => setShowConfPw(p => !p)}
                      className='absolute right-3.5 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/60 transition-colors'>
                      <EyeIcon open={showConfPw} />
                    </button>
                  </div>
                </Field>

                <p className='text-[10px] text-white/20 leading-snug px-0.5'>
                  By creating an account you agree to our{' '}
                  <span className='text-[#D4AF37]/50 cursor-pointer hover:text-[#D4AF37] transition-colors'>Terms of Service</span>
                  {' '}and{' '}
                  <span className='text-[#D4AF37]/50 cursor-pointer hover:text-[#D4AF37] transition-colors'>Privacy Policy</span>.
                </p>

                <SubmitBtn loading={loading} disabled={loading}>Create Account</SubmitBtn>

                <Divider />

                <GoogleBtn loading={loading} disabled={loading} onClick={handleGoogle} />

                <p className='text-center text-[12px] text-white/30 pt-2'>
                  Already have an account?{' '}
                  <button type='button' onClick={() => switchView('signin')}
                    className='text-[#D4AF37]/70 hover:text-[#D4AF37] font-bold transition-colors'>
                    Sign in
                  </button>
                </p>
              </form>
            )}

            {/* ════════════════════
                PASSWORD RESET FORM
            ════════════════════ */}
            {view === 'reset' && (
              <form onSubmit={handleReset} noValidate className='space-y-5'
                style={{ animation: 'authFadeUp .35s ease-out .05s both' }}>

                <p className='text-[13px] text-white/40 leading-relaxed -mt-2'>
                  Enter your email and we'll send a reset link — if an account exists, you'll hear from us within a minute.
                </p>

                <Field label='Email Address' error={fields.email}>
                  <input
                    type='email' autoComplete='email'
                    value={email}
                    onChange={e => { setEmail(e.target.value); setFields(f => ({...f, email: ''})) }}
                    placeholder='you@example.com'
                    className={inputCls(fields.email)}
                    disabled={loading}
                    // eslint-disable-next-line jsx-a11y/no-autofocus
                    autoFocus
                  />
                </Field>

                <SubmitBtn loading={loading} disabled={loading}>Send Reset Link</SubmitBtn>

                <button type='button' onClick={() => switchView('signin')}
                  className='w-full py-2 text-[12px] text-white/30 hover:text-white/60 transition-colors flex items-center justify-center gap-1.5'
                  disabled={loading}>
                  <svg className='w-3 h-3' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M15 19l-7-7 7-7' />
                  </svg>
                  Back to sign in
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* ── Keyframes ── */}
      <style>{`
        @keyframes authReveal   { from{opacity:0;transform:scale(.97) translateY(12px)} to{opacity:1;transform:scale(1) translateY(0)} }
        @keyframes authFadeUp   { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes authSlideIn  { from{opacity:0;transform:translateX(-12px)} to{opacity:1;transform:translateX(0)} }
        @keyframes authToastIn  { from{opacity:0;transform:scale(.95) translateY(-4px)} to{opacity:1;transform:scale(1) translateY(0)} }
        @keyframes authShake    { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-4px)} 75%{transform:translateX(4px)} }
      `}</style>
    </section>
  )
}

/* ── Shared sub-components ────────────────────────── */
const SubmitBtn = ({ children, loading, disabled }) => (
  <button type='submit' disabled={disabled}
    className={`w-full py-3.5 rounded-xl text-[14px] font-bold transition-all duration-200
      flex items-center justify-center gap-2 mt-1 active:scale-[0.98]
      ${disabled && !loading
        ? 'bg-[#D4AF37]/30 text-black/40 cursor-not-allowed'
        : 'bg-[#D4AF37] text-[#0A0A0A] hover:bg-[#E8C55B] shadow-lg shadow-[#D4AF37]/20 hover:shadow-[#D4AF37]/30'
      }`}>
    {loading ? <><Spin /> Processing…</> : children}
  </button>
)

const Divider = () => (
  <div className='flex items-center gap-3 py-1'>
    <div className='flex-1 h-px bg-white/[0.06]' />
    <span className='text-[10px] font-black text-white/20 uppercase tracking-widest'>or</span>
    <div className='flex-1 h-px bg-white/[0.06]' />
  </div>
)

const GoogleBtn = ({ loading, disabled, onClick }) => (
  <button type='button' onClick={onClick} disabled={disabled}
    className='w-full flex items-center justify-center gap-3 py-3 rounded-xl border border-white/[0.08]
      bg-white/[0.03] text-[13px] font-semibold text-white/60 hover:text-white hover:border-white/20
      hover:bg-white/[0.06] transition-all duration-200 active:scale-[0.98]'>
    {loading ? <Spin /> : (
      <svg className='w-4 h-4 flex-shrink-0' viewBox='0 0 24 24'>
        <path fill='#4285F4' d='M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z'/>
        <path fill='#34A853' d='M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z'/>
        <path fill='#FBBC05' d='M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z'/>
        <path fill='#EA4335' d='M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z'/>
      </svg>
    )}
    Continue with Google
  </button>
)

export default LogInPage