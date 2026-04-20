/**
 * FLIK'D — ResetPasswordPage
 * ─────────────────────────────────────────────────────────
 * Handles the /reset-password route that Supabase redirects
 * to after the user clicks the link in their email.
 *
 * Flow:
 *   1. User clicks reset link in email
 *   2. Supabase redirects to <origin>/reset-password#access_token=...
 *   3. Supabase SDK fires onAuthStateChange('PASSWORD_RECOVERY')
 *   4. This page intercepts that event and shows the new-password form
 *   5. On success → redirects to /home (user is now signed in)
 *
 * Security:
 *   • Password strength meter + confirm field
 *   • Generic error messages
 *   • Loading guard — if no recovery token, redirect to /login
 *   • updateUser() is the ONLY Supabase call here — the token
 *     is consumed server-side automatically after use
 * ─────────────────────────────────────────────────────────
 */

import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import supabase from '../config/SupabaseClient'
import logo from '../assets/photos/flikd-logo.png'

/* ─── Password strength ────────────────────────────────── */
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

/* ─── Tiny shared components (mirrors LogInPage style) ── */
const Spin = () => (
  <svg className='animate-spin w-5 h-5' fill='none' viewBox='0 0 24 24'>
    <circle className='opacity-25' cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='4' />
    <path className='opacity-75' fill='currentColor' d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z' />
  </svg>
)

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

const inputCls = (hasError) => `
  w-full bg-[#0D0D0D] border rounded-xl px-4 py-3 text-[13px] text-white outline-none
  placeholder-white/20 transition-all duration-200
  ${hasError
    ? 'border-red-500/50 focus:border-red-500/70 focus:shadow-[0_0_0_3px_rgba(239,68,68,0.08)]'
    : 'border-white/[0.08] focus:border-[#D4AF37]/50 focus:shadow-[0_0_0_3px_rgba(212,175,55,0.08)]'
  }
`

/* ════════════════════════════════════════════════════════
   MAIN COMPONENT
════════════════════════════════════════════════════════ */
const ResetPasswordPage = () => {
  const navigate = useNavigate()

  const [ready,           setReady]           = useState(false)  // recovery session confirmed
  const [password,        setPassword]        = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPw,          setShowPw]          = useState(false)
  const [showConfPw,      setShowConfPw]      = useState(false)
  const [pwStrength,      setPwStrength]      = useState(0)
  const [loading,         setLoading]         = useState(false)
  const [fields,          setFields]          = useState({})
  const [toast,           setToast]           = useState(null)
  const [done,            setDone]            = useState(false)

  /* ── Wait for PASSWORD_RECOVERY auth event ─────────── */
  useEffect(() => {
    /*
     * Supabase fires PASSWORD_RECOVERY when the user lands
     * here via the email link. The hash fragment is consumed
     * by the SDK automatically.
     */
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event) => {
        if (event === 'PASSWORD_RECOVERY') setReady(true)
      }
    )

    /*
     * Safety net: if someone navigates here directly without
     * a token, check if there's already a recovery session
     * (e.g. tab refresh after the event already fired).
     */
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true)
    })

    const timeout = setTimeout(() => {
      /* After 6 s without a recovery event, redirect to login */
      if (!ready) navigate('/login', { replace: true })
    }, 6000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timeout)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate])

  /* ── Validation ─────────────────────────────────────── */
  const validate = () => {
    const errs = {}
    if (password.length < 8)            errs.password = 'Minimum 8 characters'
    if (password !== confirmPassword)   errs.confirmPassword = 'Passwords do not match'
    if (getStrength(password) < 2)      errs.password = 'Please choose a stronger password'
    setFields(errs)
    return Object.keys(errs).length === 0
  }

  /* ── Submit ─────────────────────────────────────────── */
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return
    setLoading(true); setToast(null)

    try {
      const { error } = await supabase.auth.updateUser({ password })

      if (error) {
        setToast({ type: 'error', msg: 'Unable to update password. The link may have expired — request a new one.' })
        return
      }

      setDone(true)
      setToast({ type: 'success', msg: 'Password updated! Redirecting you in…' })

      /* Sign out all other sessions so the old password is fully invalidated */
      await supabase.auth.signOut({ scope: 'others' })

      setTimeout(() => navigate('/home', { replace: true }), 2500)
    } catch {
      setToast({ type: 'error', msg: 'Something went wrong. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  /* ── Render ─────────────────────────────────────────── */
  return (
    <section
      className='min-h-screen flex items-center justify-center p-4 relative overflow-hidden'
      style={{ background: 'linear-gradient(135deg, #060606 0%, #0A0A0A 50%, #0D0D0D 100%)' }}
    >
      {/* Ambient background — mirrors LogInPage */}
      <div className='absolute inset-0 pointer-events-none overflow-hidden'>
        <div className='absolute inset-0 opacity-[0.025]'
          style={{ backgroundImage: 'repeating-linear-gradient(90deg, #D4AF37 0px, #D4AF37 2px, transparent 2px, transparent 48px)', backgroundSize: '48px 100%' }} />
        <div className='absolute -top-60 -right-60 w-[600px] h-[600px] rounded-full'
          style={{ background: 'radial-gradient(circle, rgba(212,175,55,0.06) 0%, transparent 70%)' }} />
        <div className='absolute -bottom-60 -left-60 w-[600px] h-[600px] rounded-full'
          style={{ background: 'radial-gradient(circle, rgba(212,175,55,0.04) 0%, transparent 70%)' }} />
      </div>

      {/* Card */}
      <div
        className='relative z-10 w-full max-w-sm'
        style={{
          animation: 'authReveal .45s cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      >
        <div
          className='rounded-3xl px-10 py-12'
          style={{
            background:  'linear-gradient(160deg, #0E0E0E 0%, #080808 100%)',
            boxShadow:   '0 40px 120px rgba(0,0,0,0.9), 0 0 0 1px rgba(212,175,55,0.08)',
          }}
        >
          {/* Gold accent line */}
          <div className='absolute top-0 left-0 right-0 h-[2px] rounded-t-3xl'
            style={{ background: 'linear-gradient(90deg, transparent, #D4AF37 30%, #F0C93A 50%, #D4AF37 70%, transparent)' }} />

          {/* Logo */}
          <div className='flex items-center gap-3 mb-8'>
            <img src={logo} alt="Flik'd" className='h-10 w-auto' />
            <span className='font-bebas text-3xl text-[#D4AF37] tracking-wider'>FLIK'D</span>
          </div>

          {/* Heading */}
          <div className='mb-7'>
            <p className='text-[10px] font-black text-[#D4AF37]/40 uppercase tracking-[0.22em] mb-1'>
              Account security
            </p>
            <h1 className='font-bebas text-[38px] text-white tracking-wide leading-none'>
              New Password
            </h1>
          </div>

          {/* Toast */}
          {toast && (
            <div
              className={`mb-6 flex items-start gap-3 px-4 py-3.5 rounded-xl border text-[12px] leading-snug
                ${toast.type === 'success'
                  ? 'border-[#D4AF37]/25 bg-[#D4AF37]/8 text-[#D4AF37]/80'
                  : 'border-red-500/25 bg-red-500/8 text-red-400/80'
                }`}
              role='alert'
            >
              <span className='flex-shrink-0 text-base'>
                {toast.type === 'success' ? '✓' : '⚠'}
              </span>
              <p>{toast.msg}</p>
            </div>
          )}

          {/* Loading state — waiting for recovery event */}
          {!ready && !toast && (
            <div className='flex items-center gap-3 py-6 text-white/30 text-[13px]'>
              <Spin />
              <span>Verifying reset link…</span>
            </div>
          )}

          {/* Form — only shown once recovery session confirmed */}
          {ready && !done && (
            <form onSubmit={handleSubmit} noValidate className='space-y-4'>

              {/* New password */}
              <div className='space-y-1.5'>
                <label className='block text-[11px] font-black text-white/40 uppercase tracking-[0.18em]'>
                  New Password
                </label>
                <div className='relative'>
                  <input
                    type={showPw ? 'text' : 'password'}
                    autoComplete='new-password'
                    value={password}
                    onChange={e => {
                      setPassword(e.target.value)
                      setPwStrength(getStrength(e.target.value))
                      setFields(f => ({ ...f, password: '' }))
                    }}
                    placeholder='Min. 8 characters'
                    className={inputCls(fields.password) + ' pr-11'}
                    disabled={loading}
                    autoFocus
                  />
                  <button type='button' tabIndex={-1}
                    onClick={() => setShowPw(p => !p)}
                    className='absolute right-3.5 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/60 transition-colors'>
                    <EyeIcon open={showPw} />
                  </button>
                </div>
                {fields.password && (
                  <p className='text-[11px] text-red-400/80'>{fields.password}</p>
                )}
                {/* Strength meter */}
                {password && (
                  <div>
                    <div className='flex gap-1 mb-1'>
                      {[1, 2, 3, 4].map(i => (
                        <div key={i} className='h-1 flex-1 rounded-full transition-all duration-400'
                          style={{ background: i <= pwStrength ? STRENGTH_COLOR[pwStrength] : 'rgba(255,255,255,0.06)' }} />
                      ))}
                    </div>
                    <p className='text-[10px] text-white/30'>
                      Strength:{' '}
                      <span style={{ color: STRENGTH_COLOR[pwStrength] }} className='font-bold'>
                        {STRENGTH_LABEL[pwStrength]}
                      </span>
                    </p>
                  </div>
                )}
              </div>

              {/* Confirm password */}
              <div className='space-y-1.5'>
                <label className='block text-[11px] font-black text-white/40 uppercase tracking-[0.18em]'>
                  Confirm Password
                </label>
                <div className='relative'>
                  <input
                    type={showConfPw ? 'text' : 'password'}
                    autoComplete='new-password'
                    value={confirmPassword}
                    onChange={e => {
                      setConfirmPassword(e.target.value)
                      setFields(f => ({ ...f, confirmPassword: '' }))
                    }}
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
                {fields.confirmPassword && (
                  <p className='text-[11px] text-red-400/80'>{fields.confirmPassword}</p>
                )}
              </div>

              {/* Requirements hint */}
              <p className='text-[10px] text-white/20 leading-snug px-0.5'>
                Use at least 8 characters. Mix uppercase, lowercase, numbers, and symbols for a stronger password.
              </p>

              {/* Submit */}
              <button
                type='submit'
                disabled={loading}
                className={`w-full py-3.5 rounded-xl text-[14px] font-bold transition-all duration-200
                  flex items-center justify-center gap-2 mt-1 active:scale-[0.98]
                  ${loading
                    ? 'bg-[#D4AF37]/30 text-black/40 cursor-not-allowed'
                    : 'bg-[#D4AF37] text-[#0A0A0A] hover:bg-[#E8C55B] shadow-lg shadow-[#D4AF37]/20 hover:shadow-[#D4AF37]/30'
                  }`}
              >
                {loading ? <><Spin /> Updating…</> : 'Set New Password'}
              </button>

              {/* Back to login */}
              <button
                type='button'
                onClick={() => navigate('/login')}
                disabled={loading}
                className='w-full py-2 text-[12px] text-white/30 hover:text-white/60 transition-colors flex items-center justify-center gap-1.5'
              >
                <svg className='w-3 h-3' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M15 19l-7-7 7-7' />
                </svg>
                Back to sign in
              </button>
            </form>
          )}
        </div>
      </div>

      <style>{`
        @keyframes authReveal { from{opacity:0;transform:scale(.97) translateY(12px)} to{opacity:1;transform:scale(1) translateY(0)} }
      `}</style>
    </section>
  )
}

export default ResetPasswordPage