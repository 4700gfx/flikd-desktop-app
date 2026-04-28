import React, { useState, useEffect, useCallback, useRef } from 'react'
import ReactDOM from 'react-dom'
import supabase from '../../config/SupabaseClient'
import QuizModal, { checkQuizCooldown } from './QuizModal'

/**
 * ShareableList — Collaborative Watchlist with Per-User Progress
 * ──────────────────────────────────────────────────────────────
 * Features:
 *   ✦ Each user maintains their own watched/unwatched state per item
 *   ✦ Shows aggregate progress across all collaborators
 *   ✦ Real-time presence & progress updates via Supabase subscriptions
 *   ✦ Invite collaborators by username
 *   ✦ Owner can remove items (no credit granted)
 *   ✦ Each item requires AI quiz to mark as watched
 *   ✦ Fully mobile-optimized with touch-friendly controls
 *
 * DB Schema expected:
 *   shared_list_progress: { list_id, item_id, user_id, is_completed, completed_at }
 *   list_collaborators:   { list_id, user_id, role: 'owner'|'viewer', joined_at }
 */

const TMDB_IMG = (path, size = 'w342') => path ? `https://image.tmdb.org/t/p/${size}${path}` : null

/* ─── Helpers ──────────────────────────────────────── */
const relTime = (iso) => {
  if (!iso) return ''
  const s = Math.floor((Date.now() - new Date(iso)) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

const Spin = ({ size = 20, color = '#D4AF37' }) => (
  <svg width={size} height={size} viewBox='0 0 24 24' fill='none'
    className='flex-shrink-0'
    style={{ animation: 'spin 0.8s linear infinite', color }}>
    <circle cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='3' opacity='0.2' />
    <path fill='currentColor' opacity='0.8' d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z' />
  </svg>
)

/* ─── Collaborator Avatar Stack ────────────────────── */
const AvatarStack = ({ collaborators, maxShow = 4 }) => {
  const shown = collaborators.slice(0, maxShow)
  const rest  = collaborators.length - maxShow
  return (
    <div className='flex items-center' style={{ gap: '-6px' }}>
      {shown.map((c, i) => (
        <div key={c.user_id}
          title={c.display_name || c.username}
          style={{ zIndex: shown.length - i }}
          className='relative w-7 h-7 rounded-full border-2 border-[#0A0A0A] overflow-hidden flex-shrink-0 -ml-2 first:ml-0'>
          {c.avatar_url
            ? <img src={c.avatar_url} alt={c.display_name} className='w-full h-full object-cover' />
            : <div className='w-full h-full bg-gradient-to-br from-[#D4AF37] to-[#B8961F] flex items-center justify-center'>
                <span className='text-[#0A0A0A] text-[9px] font-black'>{(c.display_name || c.username || '?')[0].toUpperCase()}</span>
              </div>
          }
        </div>
      ))}
      {rest > 0 && (
        <div className='relative w-7 h-7 rounded-full border-2 border-[#0A0A0A] bg-[#1A1A1A] flex items-center justify-center flex-shrink-0 -ml-2'>
          <span className='text-white/40 text-[9px] font-bold'>+{rest}</span>
        </div>
      )}
    </div>
  )
}

/* ─── User Progress Bar ────────────────────────────── */
const UserProgressBar = ({ user, watched, total, isCurrentUser }) => {
  const pct = total > 0 ? Math.round((watched / total) * 100) : 0
  return (
    <div className={`flex items-center gap-2.5 p-2.5 rounded-xl ${isCurrentUser ? 'bg-[#D4AF37]/5 border border-[#D4AF37]/15' : 'bg-white/[0.02] border border-white/[0.04]'}`}>
      <div className='w-7 h-7 rounded-full overflow-hidden flex-shrink-0 ring-1 ring-white/10'>
        {user.avatar_url
          ? <img src={user.avatar_url} alt={user.display_name} className='w-full h-full object-cover' />
          : <div className={`w-full h-full flex items-center justify-center text-[10px] font-black ${isCurrentUser ? 'bg-[#D4AF37]/20 text-[#D4AF37]' : 'bg-[#1A1A1A] text-white/40'}`}>
              {(user.display_name || user.username || '?')[0].toUpperCase()}
            </div>
        }
      </div>
      <div className='flex-1 min-w-0'>
        <div className='flex items-center justify-between mb-1'>
          <span className={`text-[11px] font-semibold truncate ${isCurrentUser ? 'text-[#D4AF37]' : 'text-white/55'}`}>
            {user.display_name || user.username} {isCurrentUser && '(you)'}
          </span>
          <span className='text-[10px] font-bold text-white/25 tabular-nums flex-shrink-0 ml-1'>{watched}/{total}</span>
        </div>
        <div className='h-1.5 bg-[#1A1A1A] rounded-full overflow-hidden'>
          <div className={`h-full rounded-full transition-all duration-500 ${
            isCurrentUser ? 'bg-gradient-to-r from-[#D4AF37] to-[#E8C55B]' : 'bg-white/20'
          }`} style={{ width: `${pct}%` }} />
        </div>
      </div>
      <span className={`text-[11px] font-bold tabular-nums flex-shrink-0 ${pct === 100 ? 'text-[#D4AF37]' : 'text-white/20'}`}>
        {pct === 100 ? '✓' : `${pct}%`}
      </span>
    </div>
  )
}

/* ─── Remove Item Modal ─────────────────────────────── */
const RemoveItemModal = ({ item, listName, onConfirm, onCancel }) => (
  <div className='fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm'
    style={{ animation: 'fadeIn 0.15s ease-out' }}>
    <div className='bg-[#111] border border-white/[0.08] rounded-2xl w-full max-w-sm p-6 shadow-2xl'
      style={{ animation: 'scaleIn 0.2s cubic-bezier(0.34,1.56,0.64,1)' }}>
      <div className='w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4'>
        <svg className='w-5 h-5 text-red-400' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
          <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16' />
        </svg>
      </div>
      <h3 className='font-bebas text-xl text-white text-center tracking-wide mb-2'>Remove Item?</h3>
      <p className='text-white/40 text-[13px] text-center mb-1 leading-relaxed'>
        Remove <span className='text-white/70 font-semibold'>"{item.title}"</span> from <span className='text-white/70'>"{listName}"</span>?
      </p>
      <p className='text-red-400/60 text-[11px] text-center mb-6'>
        ⚠️ No watch credit will be given. This cannot be undone.
      </p>
      <div className='flex gap-3'>
        <button onClick={onCancel}
          className='flex-1 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white/40 text-[13px] font-bold transition-all hover:bg-white/[0.07]'
          style={{ touchAction: 'manipulation' }}>
          Cancel
        </button>
        <button onClick={onConfirm}
          className='flex-1 py-2.5 rounded-xl bg-red-500/15 border border-red-500/25 text-red-400 text-[13px] font-bold transition-all hover:bg-red-500/25'
          style={{ touchAction: 'manipulation' }}>
          Remove
        </button>
      </div>
    </div>
  </div>
)

/* ─── Invite Panel ──────────────────────────────────── */
const InvitePanel = ({ listId, listName, onClose }) => {
  const [username, setUsername] = useState('')
  const [status,   setStatus]   = useState('idle') // idle | searching | inviting | success | error
  const [msg,      setMsg]      = useState('')
  const inputRef = useRef(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  const handleInvite = async () => {
    if (!username.trim()) return
    setStatus('searching')
    try {
      // Find user by username
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('id, display_name, username, avatar_url')
        .eq('username', username.trim().toLowerCase())
        .single()

      if (error || !profile) { setStatus('error'); setMsg('User not found.'); return }

      setStatus('inviting')
      // Add to collaborators
      const { error: err } = await supabase
        .from('list_collaborators')
        .upsert({ list_id: listId, user_id: profile.id, role: 'viewer' }, { onConflict: 'list_id,user_id' })

      if (err) { setStatus('error'); setMsg('Could not invite. Try again.'); return }
      setStatus('success')
      setMsg(`${profile.display_name || profile.username} invited!`)
      setUsername('')
    } catch {
      setStatus('error')
      setMsg('Something went wrong.')
    }
  }

  return (
    <div className='border border-[#D4AF37]/20 bg-[#D4AF37]/4 rounded-2xl p-4 mb-4'>
      <div className='flex items-center justify-between mb-3'>
        <div className='flex items-center gap-2'>
          <span className='text-sm'>🔗</span>
          <h4 className='font-bebas text-[15px] text-white tracking-wide'>Invite to "{listName}"</h4>
        </div>
        <button onClick={onClose} className='text-white/25 hover:text-white transition-colors' style={{ touchAction: 'manipulation' }}>
          <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M6 18L18 6M6 6l12 12' />
          </svg>
        </button>
      </div>
      <div className='flex gap-2'>
        <input
          ref={inputRef}
          value={username}
          onChange={e => { setUsername(e.target.value); setStatus('idle'); setMsg('') }}
          onKeyDown={e => e.key === 'Enter' && handleInvite()}
          placeholder='Enter username…'
          className='flex-1 bg-[#0E0E0E] border border-white/[0.07] focus:border-[#D4AF37]/40 rounded-xl px-3 py-2.5 text-[13px] text-white outline-none placeholder-white/20 transition-all'
        />
        <button onClick={handleInvite} disabled={!username.trim() || status === 'searching' || status === 'inviting'}
          className='px-4 py-2.5 rounded-xl bg-[#D4AF37] text-[#0A0A0A] font-bold text-[12px] transition-all hover:bg-[#E8C55B] disabled:opacity-40 flex items-center gap-2'
          style={{ touchAction: 'manipulation' }}>
          {(status === 'searching' || status === 'inviting') ? <Spin size={14} color='#0A0A0A' /> : null}
          Invite
        </button>
      </div>
      {msg && (
        <p className={`text-[11px] mt-2 ${status === 'success' ? 'text-emerald-400' : 'text-red-400/80'}`}>{msg}</p>
      )}
      <p className='text-[10px] text-white/20 mt-2'>Each user tracks their own progress independently</p>
    </div>
  )
}

/* ─── Shareable List Item Row ───────────────────────── */
const ShareableListItem = ({ item, userWatched, isOwner, userId, listId, onToggle, onRemove }) => {
  const [quizOpen, setQuizOpen] = useState(false)
  const [locked,   setLocked]   = useState(false)
  const [removing, setRemoving] = useState(false)
  const [confirmRemove, setConfirmRemove] = useState(false)
  const poster = TMDB_IMG(item.poster_path, 'w92')

  useEffect(() => {
    let live = true
    if (!userWatched) {
      checkQuizCooldown(userId, `${item.id}-${userId}`, 'movie')
        .then(({ blocked }) => { if (live) setLocked(blocked) })
        .catch(() => {})
    }
    return () => { live = false }
  }, [item.id, userId, userWatched])

  const handleWatchToggle = (e) => {
    e.stopPropagation()
    if (userWatched) { onToggle(item, false); return }
    if (locked) return
    setQuizOpen(true)
  }

  const handleRemove = async () => {
    setRemoving(true)
    await onRemove(item.id)
    setRemoving(false)
    setConfirmRemove(false)
  }

  return (
    <>
      <div className={`group flex items-center gap-3 p-3 rounded-2xl border transition-all duration-200 ${
        userWatched ? 'bg-[#D4AF37]/4 border-[#D4AF37]/15' : 'bg-[#0C0C0C] border-white/[0.04] hover:border-white/[0.08]'
      }`}>
        {/* Poster */}
        <div className='relative flex-shrink-0'>
          {poster
            ? <img src={poster} alt={item.title}
                className={`w-10 h-14 object-cover rounded-xl ring-1 transition-all ${userWatched ? 'ring-[#D4AF37]/25 brightness-50' : 'ring-white/5'}`} />
            : <div className='w-10 h-14 bg-[#1A1A1A] rounded-xl ring-1 ring-white/5 flex items-center justify-center'>
                <svg className='w-4 h-4 text-white/15' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={1.5} d='M7 4v16M17 4v16M3 12h18' />
                </svg>
              </div>
          }
          {userWatched && (
            <div className='absolute inset-0 rounded-xl flex items-center justify-center'>
              <div className='w-5 h-5 rounded-full bg-[#D4AF37] flex items-center justify-center shadow-lg'>
                <svg className='w-2.5 h-2.5 text-[#0A0A0A]' fill='currentColor' viewBox='0 0 20 20'>
                  <path fillRule='evenodd' clipRule='evenodd' d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z' />
                </svg>
              </div>
            </div>
          )}
        </div>

        {/* Info */}
        <div className='flex-1 min-w-0'>
          <p className={`text-[13px] font-semibold leading-tight mb-0.5 ${userWatched ? 'text-white/30 line-through' : 'text-white/80'}`}>
            {item.title}
          </p>
          <div className='flex items-center gap-1.5'>
            <span className='text-[9px] text-white/20'>{item.media_type === 'tv' ? '📺' : '🎬'}</span>
            {item.year && <span className='text-[9px] text-white/20'>· {item.year}</span>}
            {!userWatched && !locked && (
              <span className='text-[9px] text-[#D4AF37]/40 font-bold'>· ✨ Quiz required</span>
            )}
            {locked && !userWatched && (
              <span className='text-[9px] text-red-400/50 font-bold'>· ⏳ Locked 1d</span>
            )}
          </div>

          {/* Collaborator completion avatars */}
          {item.collaboratorProgress && item.collaboratorProgress.length > 0 && (
            <div className='flex items-center gap-1 mt-1.5'>
              {item.collaboratorProgress.filter(p => p.completed).slice(0, 5).map(p => (
                <div key={p.userId}
                  title={`${p.username} watched`}
                  className='w-4 h-4 rounded-full overflow-hidden ring-1 ring-white/10 flex-shrink-0'>
                  {p.avatarUrl
                    ? <img src={p.avatarUrl} alt={p.username} className='w-full h-full object-cover' />
                    : <div className='w-full h-full bg-[#D4AF37]/30 flex items-center justify-center text-[6px] text-[#D4AF37] font-black'>
                        {p.username?.[0]?.toUpperCase()}
                      </div>
                  }
                </div>
              ))}
              <span className='text-[9px] text-white/20 ml-0.5'>
                {item.collaboratorProgress.filter(p => p.completed).length}/{item.collaboratorProgress.length} watched
              </span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className='flex items-center gap-1.5 flex-shrink-0'>
          {/* Watch toggle */}
          <button onClick={handleWatchToggle}
            style={{ touchAction: 'manipulation', minWidth: '36px', minHeight: '36px' }}
            className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-all duration-200 ${
              userWatched
                ? 'bg-[#D4AF37] border-[#D4AF37] text-[#0A0A0A] hover:bg-transparent hover:text-[#D4AF37]/60'
                : locked
                  ? 'border-red-500/20 text-red-400/30 cursor-not-allowed bg-red-500/5'
                  : 'border-white/[0.08] text-white/20 hover:border-[#D4AF37]/40 hover:text-[#D4AF37]/60 hover:bg-[#D4AF37]/6'
            }`}>
            {userWatched
              ? <svg className='w-4 h-4' fill='currentColor' viewBox='0 0 20 20'><path fillRule='evenodd' clipRule='evenodd' d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z' /></svg>
              : locked
                ? <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z' /></svg>
                : <span className='text-[10px] font-black'>✨</span>
            }
          </button>

          {/* Remove (owner only) */}
          {isOwner && (
            <button
              onClick={() => setConfirmRemove(true)}
              style={{ touchAction: 'manipulation', minWidth: '32px', minHeight: '32px' }}
              disabled={removing}
              className='w-8 h-8 rounded-xl border border-transparent text-white/10 hover:border-red-500/25 hover:text-red-400/60 hover:bg-red-500/6 transition-all duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100'>
              {removing
                ? <Spin size={12} color='#EF4444' />
                : <svg className='w-3.5 h-3.5' fill='none' stroke='currentColor' viewBox='0 0 24 24'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16' /></svg>
              }
            </button>
          )}
        </div>
      </div>

      {/* Quiz Modal */}
      {quizOpen && (
        <QuizModal
          type='movie'
          title={item.title}
          posterPath={item.poster_path}
          refId={`${item.id}-${userId}`}
          userId={userId}
          onPass={() => { setQuizOpen(false); onToggle(item, true) }}
          onClose={() => setQuizOpen(false)}
        />
      )}

      {/* Remove Confirm */}
      {confirmRemove && (
        <RemoveItemModal
          item={item}
          listName='this list'
          onConfirm={handleRemove}
          onCancel={() => setConfirmRemove(false)}
        />
      )}

      <style>{`
        @keyframes fadeIn  { from{opacity:0} to{opacity:1} }
        @keyframes scaleIn { from{opacity:0;transform:scale(0.92)} to{opacity:1;transform:scale(1)} }
      `}</style>
    </>
  )
}

/* ─── MAIN COMPONENT ─────────────────────────────────── */
const ShareableList = ({ list, currentUser, onClose, isOwner: propIsOwner }) => {
  const [items,            setItems]            = useState([])
  const [collaborators,    setCollaborators]    = useState([])
  const [userProgress,     setUserProgress]     = useState({}) // { userId: Set<itemId> }
  const [loading,          setLoading]          = useState(true)
  const [showInvite,       setShowInvite]       = useState(false)
  const [showProgress,     setShowProgress]     = useState(false)
  const [activeFilter,     setActiveFilter]     = useState('all') // all | mine | unwatched
  const [removingItem,     setRemovingItem]     = useState(null)
  const channelRef = useRef(null)

  const userId  = currentUser?.id
  const isOwner = propIsOwner ?? list?.user_id === userId

  /* ── Load everything ── */
  useEffect(() => {
    if (!list?.id) return
    let live = true
    const load = async () => {
      setLoading(true)
      try {
        const [
          { data: listItems },
          { data: collabs },
          { data: progress },
        ] = await Promise.all([
          supabase.from('list_items').select('*').eq('list_id', list.id).order('position', { ascending: true, nullsFirst: false }),
          supabase.from('list_collaborators')
            .select('*, profiles(id,display_name,username,avatar_url)')
            .eq('list_id', list.id),
          supabase.from('shared_list_progress').select('*').eq('list_id', list.id),
        ])

        if (!live) return

        // Normalize collaborators
        const collabUsers = (collabs || []).map(c => ({
          user_id:      c.profiles?.id || c.user_id,
          display_name: c.profiles?.display_name,
          username:     c.profiles?.username,
          avatar_url:   c.profiles?.avatar_url,
          role:         c.role,
        }))
        setCollaborators(collabUsers)

        // Build progress map: { userId: Set<itemId> }
        const progMap = {}
        ;(progress || []).forEach(p => {
          if (!progMap[p.user_id]) progMap[p.user_id] = new Set()
          if (p.is_completed) progMap[p.user_id].add(p.item_id)
        })
        setUserProgress(progMap)

        // Enrich items with collaborator progress
        const enriched = (listItems || []).map(item => ({
          ...item,
          collaboratorProgress: collabUsers.map(c => ({
            userId:    c.user_id,
            username:  c.display_name || c.username,
            avatarUrl: c.avatar_url,
            completed: progMap[c.user_id]?.has(item.id) ?? false,
          })),
        }))
        setItems(enriched)
      } catch (e) {
        console.error('ShareableList load error:', e)
      } finally {
        if (live) setLoading(false)
      }
    }
    load()
    return () => { live = false }
  }, [list?.id])

  /* ── Realtime subscription ── */
  useEffect(() => {
    if (!list?.id) return
    const channel = supabase
      .channel(`shared_list_${list.id}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'shared_list_progress',
        filter: `list_id=eq.${list.id}`,
      }, (payload) => {
        const { user_id, item_id, is_completed } = payload.new || payload.old || {}
        if (!user_id || !item_id) return
        setUserProgress(prev => {
          const next = { ...prev }
          if (!next[user_id]) next[user_id] = new Set()
          else next[user_id] = new Set(next[user_id])
          if (is_completed) next[user_id].add(item_id)
          else next[user_id].delete(item_id)
          return next
        })
      })
      .subscribe()
    channelRef.current = channel
    return () => { supabase.removeChannel(channel) }
  }, [list?.id])

  /* ── Watch toggle ── */
  const handleToggle = useCallback(async (item, shouldWatch) => {
    if (!userId) return
    setUserProgress(prev => {
      const next = { ...prev }
      if (!next[userId]) next[userId] = new Set()
      else next[userId] = new Set(next[userId])
      shouldWatch ? next[userId].add(item.id) : next[userId].delete(item.id)
      return next
    })
    try {
      await supabase.from('shared_list_progress').upsert({
        list_id:      list.id,
        item_id:      item.id,
        user_id:      userId,
        is_completed: shouldWatch,
        completed_at: shouldWatch ? new Date().toISOString() : null,
      }, { onConflict: 'list_id,item_id,user_id' })
    } catch {
      // Rollback
      setUserProgress(prev => {
        const next = { ...prev }
        next[userId] = new Set(next[userId])
        shouldWatch ? next[userId].delete(item.id) : next[userId].add(item.id)
        return next
      })
    }
  }, [userId, list?.id])

  /* ── Remove item (owner only, no credit) ── */
  const handleRemove = useCallback(async (itemId) => {
    setItems(prev => prev.filter(i => i.id !== itemId))
    try {
      await Promise.all([
        supabase.from('list_items').delete().eq('id', itemId),
        supabase.from('shared_list_progress').delete().eq('item_id', itemId),
      ])
    } catch {
      // Re-fetch on error
    }
  }, [])

  /* ── Derived data ── */
  const myWatched  = userProgress[userId] || new Set()
  const myCount    = myWatched.size
  const totalItems = items.length
  const myPct      = totalItems > 0 ? Math.round((myCount / totalItems) * 100) : 0

  const filteredItems = items.filter(item => {
    if (activeFilter === 'mine')     return myWatched.has(item.id)
    if (activeFilter === 'unwatched') return !myWatched.has(item.id)
    return true
  })

  if (!list) return null

  return ReactDOM.createPortal(
    <div className='fixed inset-0 z-[9100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/85 backdrop-blur-md'
      style={{ animation: 'qOverlayIn 0.2s ease-out' }}
      onClick={e => e.target === e.currentTarget && onClose()}>

      <div className='bg-[#080808] border border-white/[0.06] w-full sm:max-w-2xl max-h-[95vh] sm:max-h-[88vh] flex flex-col shadow-[0_40px_120px_rgba(0,0,0,0.95)] sm:rounded-3xl rounded-t-3xl overflow-hidden'
        style={{ animation: 'qModalIn 0.3s cubic-bezier(0.22,1,0.36,1)' }}>

        {/* Gold top line */}
        <div className='h-[2px] flex-shrink-0' style={{ background: 'linear-gradient(90deg, transparent, #D4AF37 30%, #F0C93A 50%, #D4AF37 70%, transparent)' }} />

        {/* Mobile drag handle */}
        <div className='flex justify-center pt-2 pb-0 sm:hidden flex-shrink-0'>
          <div className='w-8 h-1 rounded-full bg-white/10' />
        </div>

        {/* Header */}
        <div className='px-5 sm:px-6 pt-4 sm:pt-5 pb-0 flex-shrink-0'>
          <div className='flex items-start justify-between gap-3 mb-4'>
            <div className='flex-1 min-w-0'>
              <div className='flex items-center gap-2 mb-1 flex-wrap'>
                <h2 className='font-bebas text-2xl text-white tracking-wide leading-none'>{list.name}</h2>
                {list.is_public && <span className='text-[9px] font-black text-blue-400/60 uppercase tracking-widest px-2 py-0.5 bg-blue-400/8 border border-blue-400/15 rounded-full'>Public</span>}
                <span className='text-[9px] font-black text-[#D4AF37]/50 uppercase tracking-widest px-2 py-0.5 bg-[#D4AF37]/6 border border-[#D4AF37]/15 rounded-full'>Shared</span>
              </div>
              {list.description && <p className='text-white/30 text-[12px] mt-1'>{list.description}</p>}
            </div>
            <div className='flex items-center gap-2 flex-shrink-0'>
              {isOwner && (
                <button onClick={() => setShowInvite(p => !p)}
                  style={{ touchAction: 'manipulation', minWidth: '36px', minHeight: '36px' }}
                  className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-all ${showInvite ? 'border-[#D4AF37]/40 bg-[#D4AF37]/10 text-[#D4AF37]' : 'border-white/[0.08] text-white/25 hover:border-[#D4AF37]/30 hover:text-[#D4AF37]/60'}`}>
                  <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z' />
                  </svg>
                </button>
              )}
              <button onClick={onClose}
                style={{ touchAction: 'manipulation', minWidth: '36px', minHeight: '36px' }}
                className='w-9 h-9 rounded-xl border border-white/[0.08] text-white/20 hover:text-white hover:bg-white/[0.04] transition-all flex items-center justify-center'>
                <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M6 18L18 6M6 6l12 12' />
                </svg>
              </button>
            </div>
          </div>

          {/* Invite panel */}
          {showInvite && isOwner && (
            <InvitePanel listId={list.id} listName={list.name} onClose={() => setShowInvite(false)} />
          )}

          {/* My progress summary */}
          <div className='flex items-center gap-3 mb-4 bg-[#0E0E0E] border border-white/[0.05] rounded-2xl p-3'>
            <div className='relative w-11 h-11 flex-shrink-0'>
              <svg width='44' height='44' viewBox='0 0 44 44'>
                <circle cx='22' cy='22' r='18' fill='none' stroke='rgba(255,255,255,0.06)' strokeWidth='3' />
                <circle cx='22' cy='22' r='18' fill='none' stroke='#D4AF37' strokeWidth='3'
                  strokeDasharray={`${2 * Math.PI * 18 * myPct / 100} ${2 * Math.PI * 18}`}
                  strokeLinecap='round' transform='rotate(-90 22 22)'
                  style={{ transition: 'stroke-dasharray 0.6s ease' }} />
              </svg>
              <div className='absolute inset-0 flex items-center justify-center'>
                {currentUser?.avatar
                  ? <img src={currentUser.avatar} alt='' className='w-8 h-8 rounded-full object-cover' />
                  : <span className='font-bebas text-sm text-[#D4AF37]'>{currentUser?.name?.[0] || 'U'}</span>
                }
              </div>
            </div>
            <div className='flex-1 min-w-0'>
              <p className='text-[12px] font-bold text-white/70 mb-1'>Your progress</p>
              <div className='flex items-center gap-2'>
                <div className='flex-1 h-1.5 bg-[#1A1A1A] rounded-full overflow-hidden'>
                  <div className='h-full rounded-full bg-gradient-to-r from-[#D4AF37] to-[#E8C55B] transition-all duration-700'
                    style={{ width: `${myPct}%` }} />
                </div>
                <span className='text-[11px] text-white/30 tabular-nums flex-shrink-0'>{myCount}/{totalItems}</span>
              </div>
            </div>
            <button onClick={() => setShowProgress(p => !p)}
              style={{ touchAction: 'manipulation' }}
              className='flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-white/[0.07] text-white/25 hover:border-[#D4AF37]/25 hover:text-[#D4AF37]/60 transition-all text-[10px] font-bold'>
              <AvatarStack collaborators={collaborators} maxShow={3} />
              <svg className={`w-3 h-3 transition-transform duration-200 ${showProgress ? 'rotate-180' : ''}`} fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M19 9l-7 7-7-7' />
              </svg>
            </button>
          </div>

          {/* Collaborator progress breakdown */}
          {showProgress && collaborators.length > 0 && (
            <div className='mb-4 space-y-2' style={{ animation: 'qFadeUp 0.2s ease-out' }}>
              <p className='text-[9px] font-black text-white/20 uppercase tracking-[0.18em] mb-2'>Team Progress</p>
              {collaborators.map(c => (
                <UserProgressBar
                  key={c.user_id}
                  user={c}
                  watched={userProgress[c.user_id]?.size || 0}
                  total={totalItems}
                  isCurrentUser={c.user_id === userId}
                />
              ))}
            </div>
          )}

          {/* Filter tabs */}
          <div className='flex border-b border-white/[0.04] -mx-5 sm:-mx-6 px-5 sm:px-6 overflow-x-auto' style={{ scrollbarWidth: 'none' }}>
            {[
              { id: 'all',       label: 'All',       count: items.length },
              { id: 'unwatched', label: 'Unwatched', count: items.filter(i => !myWatched.has(i.id)).length },
              { id: 'mine',      label: 'Watched',   count: myCount },
            ].map(f => (
              <button key={f.id} onClick={() => setActiveFilter(f.id)}
                style={{ touchAction: 'manipulation' }}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-[12px] font-bold whitespace-nowrap border-b-2 -mb-px transition-all ${
                  activeFilter === f.id ? 'text-[#D4AF37] border-[#D4AF37]' : 'text-white/25 border-transparent hover:text-white/50'
                }`}>
                {f.label}
                <span className={`px-1.5 py-0.5 rounded text-[10px] ${activeFilter === f.id ? 'bg-[#D4AF37]/15 text-[#D4AF37]' : 'bg-[#141414] text-white/20'}`}>
                  {f.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable items */}
        <div className='flex-1 overflow-y-auto px-4 sm:px-5 py-3 space-y-2'
          style={{ scrollbarWidth: 'thin', scrollbarColor: '#1A1A1A transparent' }}>
          {loading ? (
            <div className='py-20 flex flex-col items-center gap-4'>
              <Spin size={32} />
              <p className='text-white/25 text-[13px]'>Loading shared list…</p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className='py-20 text-center'>
              <p className='text-white/20 text-[13px]'>
                {activeFilter === 'mine' ? 'Nothing watched yet. Time to quiz!' :
                 activeFilter === 'unwatched' ? 'All caught up! 🎉' : 'No items in this list.'}
              </p>
            </div>
          ) : (
            filteredItems.map(item => (
              <ShareableListItem
                key={item.id}
                item={item}
                userWatched={myWatched.has(item.id)}
                isOwner={isOwner}
                userId={userId}
                listId={list.id}
                onToggle={handleToggle}
                onRemove={handleRemove}
              />
            ))
          )}
        </div>

        {/* Footer */}
        <div className='px-5 py-3.5 border-t border-white/[0.04] flex items-center justify-between flex-shrink-0'>
          <p className='text-[10px] text-white/20'>
            {totalItems} item{totalItems !== 1 ? 's' : ''} · {collaborators.length} collaborator{collaborators.length !== 1 ? 's' : ''} · ✨ AI-verified
          </p>
          <button onClick={onClose} style={{ touchAction: 'manipulation' }}
            className='px-4 py-2 rounded-xl bg-[#141414] hover:bg-[#1C1C1C] text-white/35 hover:text-white text-[12px] font-semibold transition-all'>
            Close
          </button>
        </div>
      </div>

      <style>{`
        @keyframes qOverlayIn { from{opacity:0} to{opacity:1} }
        @keyframes qModalIn   { from{opacity:0;transform:scale(0.97) translateY(16px)} to{opacity:1;transform:scale(1) translateY(0)} }
        @keyframes qFadeUp    { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin       { to{transform:rotate(360deg)} }
      `}</style>
    </div>,
    document.body
  )
}

export default ShareableList
export { RemoveItemModal, InvitePanel, AvatarStack, UserProgressBar }