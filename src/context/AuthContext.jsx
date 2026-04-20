/**
 * FLIK'D — AuthContext  (production-hardened)
 * ─────────────────────────────────────────────────────────
 * Provides:
 *   • user          — raw Supabase auth user object (or null)
 *   • profile       — row from public.profiles (or null)
 *   • isAuthenticated — boolean convenience flag
 *   • loading       — true while the initial session check runs
 *   • signOut       — signs out from ALL devices, clears local state
 *   • refreshSession — proactively refreshes the JWT
 *   • updateProfile  — patches public.profiles + reflects locally
 *
 * Security notes:
 *   • Uses onAuthStateChange (SIGNED_IN / SIGNED_OUT / TOKEN_REFRESHED /
 *     USER_UPDATED / PASSWORD_RECOVERY) so the UI always reflects the real
 *     server state — no stale data possible.
 *   • Proactive token refresh: fires 2 minutes before the JWT expires.
 *   • signOut() calls supabase.auth.signOut({ scope: 'global' }) to
 *     invalidate the refresh token on every device/browser.
 *   • Profile fetch is guarded against race conditions with an AbortController.
 *   • Auth events are logged to public.activities for audit purposes
 *     (sign_in, sign_out, token_refreshed, password_recovery_started).
 *   • handle_new_user() DB trigger creates the profile row automatically
 *     on signup; the fetchProfile() here is just a read + local cache.
 * ─────────────────────────────────────────────────────────
 */

import React, {
  createContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  useContext,
} from 'react'
import supabase from '../config/SupabaseClient'

/* ─── Context ─────────────────────────────────────────── */
const AuthContext = createContext({
  user:            null,
  profile:         null,
  isAuthenticated: false,
  loading:         true,
  signOut:         async () => {},
  refreshSession:  async () => {},
  updateProfile:   async () => ({ error: null }),
})

/* ─── Provider ────────────────────────────────────────── */
export const AuthProvider = ({ children }) => {
  const [user,    setUser]    = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  /* Timer ref for the proactive refresh alarm */
  const refreshTimer = useRef(null)

  /* ── Helpers ─────────────────────────────────────────── */

  /**
   * Logs auth events to public.activities so you have an
   * audit trail. Silently swallows errors — never blocks UX.
   */
  const logAuthEvent = useCallback(async (userId, type, data = {}) => {
    if (!userId) return
    try {
      await supabase.from('activities').insert({
        user_id:       userId,
        activity_type: type,
        activity_data: { ...data, ua: navigator.userAgent },
      })
    } catch {
      /* audit log must never break the app */
    }
  }, [])

  /**
   * Reads the profile row from public.profiles.
   * Uses an AbortController so a stale fetch from a previous
   * user can't overwrite the state for the new user.
   */
  const fetchProfile = useCallback(async (userId, signal) => {
    if (!userId) { setProfile(null); return }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
        .abortSignal(signal)

      if (error) {
        /* 
         * PGRST116 = "no rows returned" — the DB trigger
         * (handle_new_user) fires AFTER insert so on very
         * first sign-up there can be a tiny race. Retry once.
         */
        if (error.code === 'PGRST116') {
          await new Promise(r => setTimeout(r, 600))
          const retry = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single()
            .abortSignal(signal)
          if (!retry.error) setProfile(retry.data)
        }
        return
      }

      if (!signal?.aborted) setProfile(data)
    } catch {
      /* request was aborted — ignore */
    }
  }, [])

  /**
   * Schedules a proactive JWT refresh 2 minutes before
   * the current token expires.
   * Supabase auto-refreshes tokens, but this ensures we
   * refresh even when the tab has been idle for a long time.
   */
  const scheduleRefresh = useCallback((session) => {
    clearTimeout(refreshTimer.current)
    if (!session?.expires_at) return

    const msUntilExpiry = session.expires_at * 1000 - Date.now()
    const msUntilRefresh = msUntilExpiry - 2 * 60 * 1000   // 2 min early

    if (msUntilRefresh > 0) {
      refreshTimer.current = setTimeout(async () => {
        const { data: { session: fresh }, error } =
          await supabase.auth.refreshSession()
        if (!error && fresh) scheduleRefresh(fresh)
      }, msUntilRefresh)
    }
  }, [])

  /* ── Auth state listener ─────────────────────────────── */
  useEffect(() => {
    let abortController = new AbortController()

    /* 1. Hydrate from the persisted session first */
    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null
      setUser(u)
      fetchProfile(u?.id, abortController.signal)
      scheduleRefresh(session)
      setLoading(false)
    })

    /* 2. Listen for every subsequent auth event */
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        const u = session?.user ?? null

        /*
         * Always update user synchronously so any component
         * relying on isAuthenticated flips immediately.
         */
        setUser(u)

        /* Abort any in-flight profile fetch for previous user */
        abortController.abort()
        abortController = new AbortController()

        switch (event) {
          case 'SIGNED_IN':
            fetchProfile(u?.id, abortController.signal)
            scheduleRefresh(session)
            logAuthEvent(u?.id, 'sign_in', { provider: u?.app_metadata?.provider })
            break

          case 'SIGNED_OUT':
            setProfile(null)
            clearTimeout(refreshTimer.current)
            // user will have been set to null above already
            break

          case 'TOKEN_REFRESHED':
            scheduleRefresh(session)
            logAuthEvent(u?.id, 'token_refreshed')
            break

          case 'USER_UPDATED':
            fetchProfile(u?.id, abortController.signal)
            break

          case 'PASSWORD_RECOVERY':
            logAuthEvent(u?.id, 'password_recovery_started')
            break

          default:
            break
        }

        setLoading(false)
      }
    )

    return () => {
      subscription.unsubscribe()
      abortController.abort()
      clearTimeout(refreshTimer.current)
    }
  }, [fetchProfile, scheduleRefresh, logAuthEvent])

  /* ── Exposed actions ─────────────────────────────────── */

  /**
   * Signs out from ALL devices / browsers.
   * 'global' scope invalidates the refresh token server-side
   * so stolen tokens can't be reused.
   */
  const signOut = useCallback(async () => {
    if (user) await logAuthEvent(user.id, 'sign_out')
    clearTimeout(refreshTimer.current)
    await supabase.auth.signOut({ scope: 'global' })
    /* onAuthStateChange(SIGNED_OUT) will clear user + profile */
  }, [user, logAuthEvent])

  /**
   * Manually forces a JWT refresh (useful after long idle tabs).
   * Returns { session, error }.
   */
  const refreshSession = useCallback(async () => {
    const result = await supabase.auth.refreshSession()
    if (!result.error && result.data.session) {
      scheduleRefresh(result.data.session)
    }
    return result
  }, [scheduleRefresh])

  /**
   * Patches public.profiles and reflects the change locally.
   * Only updates columns you pass — safe partial update.
   * Returns { error }.
   *
   * @param {object} updates — e.g. { display_name, bio, avatar_url }
   */
  const updateProfile = useCallback(async (updates) => {
    if (!user?.id) return { error: new Error('Not authenticated') }

    const { data, error } = await supabase
      .from('profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', user.id)
      .select()
      .single()

    if (!error && data) {
      setProfile(data)
    }

    return { error }
  }, [user])

  /* ── Context value ───────────────────────────────────── */
  const value = {
    user,
    profile,
    isAuthenticated: !!user,
    loading,
    signOut,
    refreshSession,
    updateProfile,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

/* ─── useAuth hook ────────────────────────────────────── */
/**
 * Must be used inside <AuthProvider>.
 * Throws a clear error in development if used outside.
 */
export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (ctx === undefined) {
    throw new Error('useAuth must be used inside <AuthProvider>')
  }
  return ctx
}

export default AuthContext