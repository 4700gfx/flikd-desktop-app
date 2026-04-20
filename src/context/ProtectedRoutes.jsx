/**
 * FLIK'D — ProtectedRoute
 * ─────────────────────────────────────────────────────────
 * Wraps any route that requires authentication.
 *
 * Usage in your router:
 *
 *   <Route path="/home" element={
 *     <ProtectedRoute>
 *       <HomePage />
 *     </ProtectedRoute>
 *   } />
 *
 * While the session is loading it shows a full-screen
 * gold-branded spinner so there's no flash of the login
 * page for already-authed users on hard refresh.
 *
 * Once resolved:
 *   • Authenticated  → renders children
 *   • Unauthenticated → redirects to /login, preserving
 *     the attempted URL in location.state so LogInPage
 *     can redirect back after sign-in.
 * ─────────────────────────────────────────────────────────
 */

import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './AuthContext'


/* ─── Full-screen branded loader ─────────────────────── */
const AuthLoader = () => (
  <div
    style={{
      minHeight:      '100vh',
      display:        'flex',
      flexDirection:  'column',
      alignItems:     'center',
      justifyContent: 'center',
      background:     '#0A0A0A',
      gap:            '20px',
    }}
  >
    {/* Spinning film reel */}
    <svg
      width='52'
      height='52'
      viewBox='0 0 52 52'
      fill='none'
      style={{ animation: 'spin 1.1s linear infinite' }}
    >
      <circle cx='26' cy='26' r='22' stroke='#D4AF37' strokeWidth='2' opacity='0.18' />
      <path
        d='M26 4 A22 22 0 0 1 48 26'
        stroke='#D4AF37'
        strokeWidth='2.5'
        strokeLinecap='round'
      />
      {/* Sprocket holes */}
      {[0, 60, 120, 180, 240, 300].map((deg) => {
        const r = 14
        const x = 26 + r * Math.cos((deg * Math.PI) / 180)
        const y = 26 + r * Math.sin((deg * Math.PI) / 180)
        return <circle key={deg} cx={x} cy={y} r='3' fill='#D4AF37' opacity='0.5' />
      })}
      <circle cx='26' cy='26' r='5' fill='#D4AF37' opacity='0.7' />
    </svg>

    <span
      style={{
        fontFamily:    "'Bebas Neue', sans-serif",
        fontSize:      '13px',
        letterSpacing: '0.22em',
        color:         'rgba(212,175,55,0.35)',
      }}
    >
      LOADING
    </span>

    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </div>
)

/* ─── ProtectedRoute ──────────────────────────────────── */
const ProtectedRoute = ({ children, redirectTo = '/login' }) => {
  const { isAuthenticated, loading } = useAuth()
  const location = useLocation()

  /* Still resolving the persisted session — show spinner */
  if (loading) return <AuthLoader />

  /* Not authenticated — redirect, preserving intended destination */
  if (!isAuthenticated) {
    return (
      <Navigate
        to={redirectTo}
        replace
        state={{ from: location }}
      />
    )
  }

  return children
}

export default ProtectedRoute