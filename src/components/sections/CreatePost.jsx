import React, { useState, useRef, useCallback } from 'react'
import supabase from '../../config/SupabaseClient'

const serializeMovie = (m) => ({
  id: m.id,
  title: m.title,
  posterPath: m.posterPath ?? null,
  backdropPath: m.backdropPath ?? null,
  mediaType: m.mediaType ?? 'movie',
  year: m.year ?? null,
  overview: m.overview ?? null,
  voteAverage: m.voteAverage ?? null,
  releaseDate: m.releaseDate ?? null,
  runtime: m.runtime ?? null,
  genres: Array.isArray(m.genres) ? m.genres : [],
  director: m.director ?? null,
  cast: Array.isArray(m.cast) ? m.cast : [],
  originalLanguage: m.originalLanguage ?? null,
  status: m.status ?? null,
  productionCompanies: Array.isArray(m.productionCompanies) ? m.productionCompanies : [],
})

/* ── Tab definitions ── */
const TABS = [
  {
    id: 'review',
    label: 'Review',
    icon: (active) => (
      <svg className={`w-4 h-4 ${active ? 'text-[#D4AF37]' : 'text-current'}`} fill='none' stroke='currentColor' viewBox='0 0 24 24'>
        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={1.8}
          d='M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z' />
      </svg>
    ),
  },
  {
    id: 'list',
    label: 'Create List',
    icon: (active) => (
      <svg className={`w-4 h-4 ${active ? 'text-[#D4AF37]' : 'text-current'}`} fill='none' stroke='currentColor' viewBox='0 0 24 24'>
        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={1.8}
          d='M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01' />
      </svg>
    ),
  },
  {
    id: 'quick',
    label: 'Quick Add',
    icon: (active) => (
      <svg className={`w-4 h-4 ${active ? 'text-[#D4AF37]' : 'text-current'}`} fill='none' stroke='currentColor' viewBox='0 0 24 24'>
        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={1.8}
          d='M13 10V3L4 14h7v7l9-11h-7z' />
      </svg>
    ),
  },
]

const CreatePost = ({
  currentUser,
  onPostCreate,
  onListCreate,
  onListItemAdd,
  onMovieSearch,
  onMovieDetails,
  userLists = [],
}) => {
  /* ── Tab ── */
  const [activeTab, setActiveTab] = useState('review')

  /* ── Review ── */
  const [reviewMovie, setReviewMovie] = useState(null)
  const [reviewContent, setReviewContent] = useState('')
  const [rating, setRating] = useState(0)
  const [hovered, setHovered] = useState(0)
  const [postedId, setPostedId] = useState(null)

  /* ── List creation ── */
  const [listName, setListName] = useState('')
  const [listDesc, setListDesc] = useState('')
  const [listMovies, setListMovies] = useState([])
  const [listPublic, setListPublic] = useState(false)
  const [listCollab, setListCollab] = useState(false)
  const [createdList, setCreatedList] = useState(null) // { id, name } after creation

  /* ── List invite ── */
  const [inviteQ, setInviteQ] = useState('')
  const [inviteStatus, setInviteStatus] = useState(null) // { type, msg }
  const [inviting, setInviting] = useState(false)
  const [invitedUsers, setInvitedUsers] = useState([])

  /* ── Quick add ── */
  const [quickList, setQuickList] = useState('')
  const [quickMovie, setQuickMovie] = useState(null)

  /* ── Search ── */
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchCtx, setSearchCtx] = useState('review')
  const [searchQ, setSearchQ] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [enriching, setEnriching] = useState(false)

  /* ── Submission ── */
  const [submitting, setSubmitting] = useState(false)
  const [flash, setFlash] = useState(null)

  /* ── Share ── */
  const [shareToast, setShareToast] = useState(false)

  const debounceRef = useRef(null)

  /* ── Helpers ── */
  const showFlash = (type, msg) => {
    setFlash({ type, msg })
    setTimeout(() => setFlash(null), 4500)
  }

  const initials = () => {
    if (!currentUser?.displayName) return 'U'
    const p = currentUser.displayName.split(' ')
    return p.length === 1 ? p[0][0].toUpperCase() : (p[0][0] + p[p.length - 1][0]).toUpperCase()
  }

  const posterUrl = (path) => path ? `https://image.tmdb.org/t/p/w185${path}` : null

  const handleShare = async (postId) => {
    const url = `${window.location.origin}${window.location.pathname}?post=${postId}`
    try {
      if (navigator.share) {
        await navigator.share({ title: "Check out this review on FLIK'D", url })
      } else {
        await navigator.clipboard.writeText(url)
        setShareToast(true)
        setTimeout(() => setShareToast(false), 2500)
      }
    } catch {}
  }

  /* ── Search ── */
  const doSearch = useCallback(async (q) => {
    if (!q.trim()) { setSearchResults([]); setSearching(false); return }
    setSearching(true)
    try {
      const res = await onMovieSearch(q)
      setSearchResults(res || [])
    } catch {
      setSearchResults([])
    } finally {
      setSearching(false)
    }
  }, [onMovieSearch])

  const handleSearchInput = (e) => {
    const q = e.target.value
    setSearchQ(q)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => doSearch(q), 300)
  }

  const openSearch = (ctx) => { setSearchCtx(ctx); setSearchQ(''); setSearchResults([]); setSearchOpen(true) }
  const closeSearch = () => { setSearchOpen(false); setSearchQ(''); setSearchResults([]) }

  const pickMovie = async (raw) => {
    closeSearch()
    let movie = serializeMovie(raw)
    if (onMovieDetails) {
      setEnriching(true)
      try { movie = serializeMovie(await onMovieDetails(movie)) } catch {}
      finally { setEnriching(false) }
    }
    if (searchCtx === 'review') setReviewMovie(movie)
    else if (searchCtx === 'list') setListMovies(prev => prev.find(m => m.id === movie.id) ? prev : [...prev, movie])
    else if (searchCtx === 'quick') setQuickMovie(movie)
  }

  /* ── Submit: Review ── */
  const submitReview = async () => {
    if (!reviewMovie)          return showFlash('error', 'Please select a movie or TV show.')
    if (!reviewContent.trim()) return showFlash('error', 'Please write your review.')
    if (!rating)               return showFlash('error', 'Please add a rating (1–10).')
    setSubmitting(true)
    try {
      const result = await onPostCreate({ content: reviewContent.trim(), movie: reviewMovie, rating, timestamp: new Date().toISOString() })
      if (result.success) {
        setPostedId(result.postId ?? null)
        setReviewMovie(null); setReviewContent(''); setRating(0)
        showFlash('success', 'Review posted! +10 points')
      } else {
        showFlash('error', result.error || 'Failed to post review.')
      }
    } catch (e) {
      showFlash('error', e.message || 'Something went wrong.')
    } finally {
      setSubmitting(false)
    }
  }

  /* ── Submit: List ── */
  const submitList = async () => {
    if (!listName.trim())   return showFlash('error', 'Please enter a list name.')
    if (!listMovies.length) return showFlash('error', 'Add at least one movie to the list.')
    setSubmitting(true)
    try {
      const result = await onListCreate({
        name: listName.trim(),
        description: listDesc.trim(),
        isPublic: listPublic,
        isCollaborative: listCollab || true, // always collab so invites work
        movies: listMovies.map(serializeMovie),
      })
      if (result.success) {
        setCreatedList({ id: result.listId, name: listName.trim() })
        setListName(''); setListDesc(''); setListMovies([])
        setListPublic(false); setListCollab(false)
        setInvitedUsers([])
        showFlash('success', `"${result.listName || 'List'}" created!`)
      } else {
        showFlash('error', result.error || 'Failed to create list.')
      }
    } catch (e) {
      const msg = e.message?.includes('infinite recursion') ? 'Database error — please try again.' : e.message || 'Something went wrong.'
      showFlash('error', msg)
    } finally {
      setSubmitting(false)
    }
  }

  /* ── Invite collaborator ── */
  const handleInvite = async () => {
    if (!inviteQ.trim() || !createdList) return
    setInviting(true)
    setInviteStatus(null)
    try {
      const { data: profile, error: pErr } = await supabase
        .from('profiles')
        .select('id, display_name, username, avatar_url')
        .eq('username', inviteQ.trim().toLowerCase())
        .single()
      if (pErr || !profile) { setInviteStatus({ type: 'error', msg: 'User not found.' }); return }
      const { error } = await supabase.from('list_collaborators')
        .insert({ list_id: createdList.id, user_id: profile.id, role: 'viewer' })
      if (error && error.code !== '23505') throw error
      setInvitedUsers(prev => prev.find(u => u.id === profile.id) ? prev : [...prev, profile])
      setInviteStatus({ type: 'success', msg: `${profile.display_name || profile.username} invited!` })
      setInviteQ('')
    } catch (e) {
      setInviteStatus({ type: 'error', msg: e.message || 'Could not invite.' })
    } finally {
      setInviting(false)
    }
  }

  /* ── Copy list share link ── */
  const handleCopyListLink = async () => {
    if (!createdList) return
    const url = `${window.location.origin}${window.location.pathname}?list=${createdList.id}`
    try {
      await navigator.clipboard.writeText(url)
      setShareToast(true)
      setTimeout(() => setShareToast(false), 2500)
    } catch {}
  }

  /* ── Submit: Quick Add ── */
  const submitQuickAdd = async () => {
    if (!quickList)  return showFlash('error', 'Please select a list.')
    if (!quickMovie) return showFlash('error', 'Please select a movie.')
    setSubmitting(true)
    try {
      const result = await onListItemAdd({ listId: quickList, movie: serializeMovie(quickMovie) })
      if (result.success) {
        const listLabel = userLists.find(l => l.id === quickList)?.name || 'list'
        setQuickMovie(null); setQuickList('')
        showFlash('success', `Added to "${listLabel}"!`)
      } else {
        showFlash('error', result.error || 'Failed to add to list.')
      }
    } catch (e) {
      showFlash('error', e.message || 'Something went wrong.')
    } finally {
      setSubmitting(false)
    }
  }

  const switchTab = (id) => { setActiveTab(id); setFlash(null) }

  /* ── Sub-components ── */
  const Spinner = () => (
    <svg className='w-4 h-4 animate-spin' fill='none' viewBox='0 0 24 24'>
      <circle className='opacity-25' cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='4' />
      <path className='opacity-75' fill='currentColor' d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z' />
    </svg>
  )

  const Toggle = ({ label, desc, state, set }) => (
    <label className='flex items-center gap-3 cursor-pointer group select-none p-3 rounded-xl hover:bg-white/[0.02] transition-colors'>
      <div
        onClick={() => set(p => !p)}
        className={`w-10 h-[22px] rounded-full relative transition-all duration-200 flex-shrink-0 ${state ? 'bg-[#D4AF37]' : 'bg-[#252525] border border-[#333]'}`}
      >
        <div className={`absolute top-[3px] w-4 h-4 rounded-full shadow transition-all duration-200 ${state ? 'translate-x-[22px] bg-[#0A0A0A]' : 'translate-x-[3px] bg-white/50'}`} />
      </div>
      <div>
        <p className={`text-sm font-semibold transition-colors ${state ? 'text-white/90' : 'text-white/50 group-hover:text-white/70'}`}>{label}</p>
        {desc && <p className='text-[11px] text-white/25 mt-0.5'>{desc}</p>}
      </div>
    </label>
  )

  const MoviePill = ({ movie, onRemove }) => (
    <div className='flex items-center gap-3 bg-[#141414] border border-[#222] rounded-xl px-3 py-2.5 group hover:border-[#2D2D2D] transition-colors'>
      {posterUrl(movie.posterPath)
        ? <img src={posterUrl(movie.posterPath)} alt={movie.title} className='w-9 h-12 object-cover rounded-lg shadow-md flex-shrink-0' />
        : <div className='w-9 h-12 bg-[#1E1E1E] rounded-lg flex-shrink-0 flex items-center justify-center'>
            <svg className='w-4 h-4 text-white/15' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={1.5} d='M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18' />
            </svg>
          </div>
      }
      <div className='flex-1 min-w-0'>
        <p className='text-white text-sm font-semibold truncate'>{movie.title}</p>
        <p className='text-white/35 text-xs mt-0.5'>{movie.year} · {movie.mediaType === 'tv' ? 'Series' : 'Movie'}</p>
      </div>
      {onRemove && (
        <button onClick={onRemove}
          className='w-7 h-7 rounded-lg flex items-center justify-center text-white/20 hover:text-red-400/70 hover:bg-red-500/8 border border-transparent hover:border-red-500/20 transition-all duration-200 flex-shrink-0'>
          <svg className='w-3.5 h-3.5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M6 18L18 6M6 6l12 12' />
          </svg>
        </button>
      )}
    </div>
  )

  const AddMovieBtn = ({ ctx, label = '+ Select Movie / Show' }) => (
    <button
      onClick={() => openSearch(ctx)}
      className='w-full py-3.5 border-2 border-dashed border-[#232323] hover:border-[#D4AF37]/50 rounded-xl text-sm font-semibold text-white/30 hover:text-[#D4AF37] transition-all duration-200'
    >
      {enriching
        ? <span className='flex items-center justify-center gap-2'><Spinner /><span>Fetching details…</span></span>
        : label}
    </button>
  )

  const SubmitBtn = ({ onClick, disabled, label, loadingLabel }) => (
    <button
      onClick={onClick}
      disabled={disabled || submitting}
      className='px-6 py-2.5 rounded-full font-bold text-sm disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-2 hover:scale-[1.02] active:scale-95'
      style={{ background: (disabled || submitting) ? '#1A1A1A' : 'linear-gradient(135deg, #D4AF37, #F0C93A)', color: (disabled || submitting) ? 'rgba(255,255,255,0.2)' : '#0A0A0A', boxShadow: (disabled || submitting) ? 'none' : '0 4px 16px rgba(212,175,55,0.3)' }}
    >
      {submitting ? <><Spinner />{loadingLabel}</> : label}
    </button>
  )

  /* ── Post-creation invite panel ── */
  const InviteSection = () => (
    <div className='rounded-2xl border border-[#1E1E1E] bg-[#0D0D0D] overflow-hidden'
      style={{ animation: 'slideUp 0.25s ease-out' }}>
      {/* Header */}
      <div className='px-4 py-3 flex items-center justify-between border-b border-[#161616]'
        style={{ background: 'linear-gradient(135deg, rgba(212,175,55,0.06), rgba(212,175,55,0.02))' }}>
        <div className='flex items-center gap-2'>
          <div className='w-7 h-7 rounded-lg flex items-center justify-center'
            style={{ background: 'rgba(212,175,55,0.12)', border: '1px solid rgba(212,175,55,0.2)' }}>
            <svg className='w-3.5 h-3.5 text-[#D4AF37]' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' />
            </svg>
          </div>
          <div>
            <p className='text-[13px] font-semibold text-white/90'>Invite collaborators</p>
            <p className='text-[10px] text-white/35'>to "{createdList?.name}"</p>
          </div>
        </div>
        <button onClick={handleCopyListLink}
          className='flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#252525] text-white/40 hover:text-[#D4AF37] hover:border-[#D4AF37]/30 transition-all duration-200 text-[11px] font-semibold'>
          <svg className='w-3 h-3' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z' />
          </svg>
          Copy link
        </button>
      </div>

      {/* Invite input */}
      <div className='p-4 space-y-3'>
        <div className='flex gap-2'>
          <div className='relative flex-1'>
            <span className='absolute left-3 top-1/2 -translate-y-1/2 text-white/25 text-sm select-none'>@</span>
            <input
              value={inviteQ}
              onChange={e => { setInviteQ(e.target.value); setInviteStatus(null) }}
              onKeyDown={e => e.key === 'Enter' && handleInvite()}
              placeholder='username'
              className='w-full bg-[#141414] border border-[#242424] focus:border-[#D4AF37]/50 rounded-xl pl-7 pr-4 py-2.5 text-white placeholder:text-white/20 text-sm focus:outline-none transition-colors'
            />
          </div>
          <button
            onClick={handleInvite}
            disabled={!inviteQ.trim() || inviting}
            className='px-4 py-2.5 rounded-xl font-bold text-sm disabled:opacity-30 transition-all duration-200 flex items-center gap-1.5 flex-shrink-0'
            style={{ background: (!inviteQ.trim() || inviting) ? '#1A1A1A' : 'rgba(212,175,55,0.15)', color: (!inviteQ.trim() || inviting) ? 'rgba(255,255,255,0.2)' : '#D4AF37', border: '1px solid', borderColor: (!inviteQ.trim() || inviting) ? '#252525' : 'rgba(212,175,55,0.3)' }}>
            {inviting ? <Spinner /> : 'Invite'}
          </button>
        </div>

        {/* Status */}
        {inviteStatus && (
          <p className={`text-[12px] font-medium flex items-center gap-1.5 ${inviteStatus.type === 'success' ? 'text-emerald-400' : 'text-red-400'}`}>
            {inviteStatus.type === 'success'
              ? <svg className='w-3.5 h-3.5' fill='none' stroke='currentColor' viewBox='0 0 24 24'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M5 13l4 4L19 7' /></svg>
              : <svg className='w-3.5 h-3.5' fill='none' stroke='currentColor' viewBox='0 0 24 24'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M6 18L18 6M6 6l12 12' /></svg>
            }
            {inviteStatus.msg}
          </p>
        )}

        {/* Invited users */}
        {invitedUsers.length > 0 && (
          <div className='flex flex-wrap gap-2'>
            {invitedUsers.map(u => (
              <div key={u.id} className='flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#1A1A1A] border border-[#262626] text-white/60 text-[11px] font-medium'>
                {u.avatar_url
                  ? <img src={u.avatar_url} className='w-4 h-4 rounded-full object-cover' alt='' />
                  : <div className='w-4 h-4 rounded-full bg-[#D4AF37]/20 flex items-center justify-center text-[8px] font-bold text-[#D4AF37]'>{(u.display_name || u.username || '?')[0].toUpperCase()}</div>
                }
                {u.display_name || u.username}
              </div>
            ))}
          </div>
        )}

        <button onClick={() => setCreatedList(null)}
          className='text-[11px] text-white/20 hover:text-white/50 transition-colors'>
          Done inviting
        </button>
      </div>
    </div>
  )

  return (
    <div className='relative bg-[#0A0A0A] border-b border-[#141414]'>

      {/* Subtle top accent */}
      <div className='absolute top-0 left-0 right-0 h-px'
        style={{ background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.12), transparent)' }} />

      {/* Share toast */}
      {shareToast && (
        <div className='absolute top-4 left-1/2 -translate-x-1/2 z-10 px-4 py-2 rounded-full bg-[#1A1A1A] border border-[#2D2D2D] text-white/70 text-[12px] font-semibold flex items-center gap-2 shadow-xl'
          style={{ animation: 'slideUp 0.2s ease-out' }}>
          <svg className='w-3.5 h-3.5 text-emerald-400' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M5 13l4 4L19 7' />
          </svg>
          Link copied!
        </div>
      )}

      {/* Flash banner */}
      {flash && (
        <div className={`mx-5 mt-4 px-4 py-3 rounded-xl flex items-center gap-3 border text-[13px] ${
          flash.type === 'success'
            ? 'bg-emerald-500/8 border-emerald-500/20 text-emerald-400'
            : 'bg-red-500/8 border-red-500/20 text-red-400'
        }`}>
          {flash.type === 'success'
            ? <svg className='w-4 h-4 shrink-0' fill='none' stroke='currentColor' viewBox='0 0 24 24'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M5 13l4 4L19 7' /></svg>
            : <svg className='w-4 h-4 shrink-0' fill='none' stroke='currentColor' viewBox='0 0 24 24'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' /></svg>
          }
          <span className='flex-1 font-medium'>{flash.msg}</span>
          <button onClick={() => setFlash(null)} className='hover:opacity-60 transition-opacity'>
            <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M6 18L18 6M6 6l12 12' />
            </svg>
          </button>
        </div>
      )}

      <div className='p-5 flex gap-4'>
        {/* Avatar */}
        <div className='w-11 h-11 rounded-full flex-shrink-0 overflow-hidden shadow-lg'
          style={{ boxShadow: '0 0 0 2px rgba(255,255,255,0.06), 0 4px 16px rgba(0,0,0,0.5)' }}>
          {currentUser?.avatar
            ? <img src={currentUser.avatar} alt={currentUser.displayName} className='w-full h-full object-cover' />
            : <div className='w-full h-full flex items-center justify-center font-bold text-[#0A0A0A] text-sm'
                style={{ background: 'linear-gradient(135deg, #D4AF37 0%, #B8961F 100%)' }}>
                {initials()}
              </div>
          }
        </div>

        <div className='flex-1 min-w-0'>

          {/* Tabs */}
          <div className='flex gap-0.5 mb-5 p-1 rounded-xl bg-[#111] border border-[#1A1A1A]'>
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => switchTab(t.id)}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 text-[13px] font-semibold rounded-lg transition-all duration-200 ${
                  activeTab === t.id
                    ? 'text-[#D4AF37] bg-[#D4AF37]/[0.08] shadow-[inset_0_1px_0_rgba(212,175,55,0.15)]'
                    : 'text-white/30 hover:text-white/60 hover:bg-white/[0.03]'
                }`}
              >
                {t.icon(activeTab === t.id)}
                <span className='hidden sm:block'>{t.label}</span>
              </button>
            ))}
          </div>

          {/* ── TAB: REVIEW ── */}
          {activeTab === 'review' && (
            <div className='space-y-4'>
              <div className='flex items-center justify-between'>
                <div>
                  <h3 className='font-bebas text-xl text-white tracking-wide leading-none'>WRITE A REVIEW</h3>
                  <p className='text-[11px] text-white/30 mt-0.5'>Share your thoughts · earn 10 XP</p>
                </div>
                {postedId && (
                  <button onClick={() => handleShare(postedId)}
                    className='flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#242424] text-white/35 hover:text-[#D4AF37] hover:border-[#D4AF37]/30 transition-all duration-200 text-[11px] font-semibold'>
                    <svg className='w-3 h-3' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z' />
                    </svg>
                    Share post
                  </button>
                )}
              </div>

              {reviewMovie
                ? <MoviePill movie={reviewMovie} onRemove={() => { setReviewMovie(null); setRating(0); setPostedId(null) }} />
                : <AddMovieBtn ctx='review' />
              }

              {reviewMovie && (
                <div>
                  <label className='block text-[10px] font-bold text-white/40 mb-2.5 uppercase tracking-wider'>Your Rating</label>
                  <div className='flex items-center gap-1.5 flex-wrap'>
                    {[1,2,3,4,5,6,7,8,9,10].map(v => (
                      <button
                        key={v}
                        onClick={() => setRating(v)}
                        onMouseEnter={() => setHovered(v)}
                        onMouseLeave={() => setHovered(0)}
                        className={`w-8 h-8 rounded-lg font-bold text-[13px] transition-all duration-150 ${
                          v <= (hovered || rating)
                            ? 'text-[#0A0A0A] scale-110'
                            : 'bg-[#161616] text-white/30 hover:bg-[#1E1E1E] border border-[#222]'
                        }`}
                        style={v <= (hovered || rating) ? { background: 'linear-gradient(135deg, #D4AF37, #F0C93A)', boxShadow: '0 2px 12px rgba(212,175,55,0.3)' } : {}}
                      >{v}</button>
                    ))}
                    {rating > 0 && (
                      <span className='ml-2 font-bold text-sm' style={{ color: '#D4AF37', fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.04em', fontSize: '16px' }}>
                        {rating}/10
                      </span>
                    )}
                  </div>
                </div>
              )}

              {reviewMovie && (
                <div className='relative'>
                  <textarea
                    value={reviewContent}
                    onChange={(e) => setReviewContent(e.target.value.slice(0, 1000))}
                    placeholder='What did you think?'
                    rows={4}
                    className='w-full bg-[#0E0E0E] border border-[#1E1E1E] focus:border-[#D4AF37]/50 rounded-xl px-4 py-3 text-white placeholder:text-white/20 text-[14px] resize-none focus:outline-none transition-colors leading-relaxed'
                    style={{ boxShadow: 'inset 0 1px 0 rgba(0,0,0,0.3)' }}
                  />
                  <span className='absolute bottom-3 right-4 text-[10px] text-white/20 select-none'>
                    {reviewContent.length}/1000
                  </span>
                </div>
              )}

              {reviewMovie && (
                <div className='flex items-center justify-between'>
                  <p className='text-[11px] text-white/20'>⌘↵ to post</p>
                  <SubmitBtn
                    onClick={submitReview}
                    disabled={!reviewMovie || !reviewContent.trim() || !rating}
                    label='Post Review'
                    loadingLabel='Posting…'
                  />
                </div>
              )}
            </div>
          )}

          {/* ── TAB: CREATE LIST ── */}
          {activeTab === 'list' && (
            <div className='space-y-4'>
              <div>
                <h3 className='font-bebas text-xl text-white tracking-wide leading-none'>CREATE A LIST</h3>
                <p className='text-[11px] text-white/30 mt-0.5'>Curate movies & shows · invite friends</p>
              </div>

              {/* Show invite section after creation */}
              {createdList ? (
                <InviteSection />
              ) : (
                <>
                  <input
                    value={listName}
                    onChange={(e) => setListName(e.target.value.slice(0, 100))}
                    placeholder="List name — e.g. 'Best Sci-Fi of the 90s'"
                    className='w-full bg-[#0E0E0E] border border-[#1E1E1E] focus:border-[#D4AF37]/50 rounded-xl px-4 py-3 text-white placeholder:text-white/20 text-sm focus:outline-none transition-colors'
                    style={{ boxShadow: 'inset 0 1px 0 rgba(0,0,0,0.3)' }}
                  />

                  <textarea
                    value={listDesc}
                    onChange={(e) => setListDesc(e.target.value.slice(0, 500))}
                    placeholder='Description (optional)'
                    rows={2}
                    className='w-full bg-[#0E0E0E] border border-[#1E1E1E] focus:border-[#D4AF37]/50 rounded-xl px-4 py-3 text-white placeholder:text-white/20 text-sm resize-none focus:outline-none transition-colors'
                    style={{ boxShadow: 'inset 0 1px 0 rgba(0,0,0,0.3)' }}
                  />

                  {/* Toggles */}
                  <div className='rounded-xl border border-[#1A1A1A] divide-y divide-[#141414] overflow-hidden'>
                    <Toggle
                      label='Public'
                      desc='Anyone can discover and view this list'
                      state={listPublic}
                      set={setListPublic}
                    />
                    <Toggle
                      label='Collaborative'
                      desc='Invited friends can track progress together'
                      state={listCollab}
                      set={setListCollab}
                    />
                  </div>

                  {/* Movie list */}
                  {listMovies.length > 0 && (
                    <div className='space-y-2 max-h-52 overflow-y-auto pr-1 scrollbar-thin'>
                      {listMovies.map((m, i) => (
                        <MoviePill key={`${m.id}-${i}`} movie={m} onRemove={() => setListMovies(prev => prev.filter((_, j) => j !== i))} />
                      ))}
                    </div>
                  )}

                  <AddMovieBtn ctx='list' label={listMovies.length > 0 ? `+ Add another (${listMovies.length} added)` : '+ Add Movie / Show'} />

                  <div className='flex items-center justify-between pt-1'>
                    <span className='text-[11px] text-white/25'>{listMovies.length} item{listMovies.length !== 1 ? 's' : ''}</span>
                    <SubmitBtn
                      onClick={submitList}
                      disabled={!listName.trim() || !listMovies.length}
                      label='Create List'
                      loadingLabel='Creating…'
                    />
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── TAB: QUICK ADD ── */}
          {activeTab === 'quick' && (
            <div className='space-y-4'>
              <div>
                <h3 className='font-bebas text-xl text-white tracking-wide leading-none'>QUICK ADD</h3>
                <p className='text-[11px] text-white/30 mt-0.5'>Add to an existing list in seconds</p>
              </div>

              <div>
                <label className='block text-[10px] font-bold text-white/40 uppercase tracking-wider mb-2.5'>Select List</label>
                {userLists.length === 0 ? (
                  <div className='py-6 text-center rounded-xl border border-dashed border-[#1E1E1E]'>
                    <p className='text-white/25 text-sm'>No lists yet — create one first.</p>
                  </div>
                ) : (
                  <div className='space-y-1.5 max-h-40 overflow-y-auto scrollbar-thin'>
                    {userLists.map(l => (
                      <button
                        key={l.id}
                        onClick={() => setQuickList(l.id)}
                        className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-left transition-all duration-200 border ${
                          quickList === l.id
                            ? 'border-[#D4AF37]/40 text-[#D4AF37]'
                            : 'bg-[#0E0E0E] border-[#1A1A1A] text-white/50 hover:border-[#272727] hover:text-white/70'
                        }`}
                        style={quickList === l.id ? { background: 'rgba(212,175,55,0.06)' } : {}}
                      >
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${quickList === l.id ? 'bg-[#D4AF37]/15' : 'bg-[#161616] border border-[#222]'}`}>
                          <svg className={`w-3.5 h-3.5 ${quickList === l.id ? 'text-[#D4AF37]' : 'text-white/25'}`} fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={1.8} d='M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' />
                          </svg>
                        </div>
                        <div className='flex-1 min-w-0'>
                          <p className='font-semibold text-[13px] truncate'>{l.name}</p>
                          <p className='text-[10px] opacity-40 mt-0.5'>{l.itemCount || 0} item{l.itemCount !== 1 ? 's' : ''}</p>
                        </div>
                        {quickList === l.id && (
                          <svg className='w-4 h-4 flex-shrink-0' fill='currentColor' viewBox='0 0 20 20'>
                            <path fillRule='evenodd' d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z' clipRule='evenodd' />
                          </svg>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {quickMovie
                ? <MoviePill movie={quickMovie} onRemove={() => setQuickMovie(null)} />
                : <AddMovieBtn ctx='quick' />
              }

              <div className='flex justify-end'>
                <SubmitBtn
                  onClick={submitQuickAdd}
                  disabled={!quickList || !quickMovie}
                  label='Add to List'
                  loadingLabel='Adding…'
                />
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ── SEARCH MODAL ── */}
      {searchOpen && (
        <div
          className='fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4'
          onClick={closeSearch}
        >
          <div
            className='bg-[#0D0D0D] border border-[#1E1E1E] rounded-2xl w-full max-w-lg max-h-[75vh] flex flex-col shadow-2xl'
            onClick={e => e.stopPropagation()}
            style={{ animation: 'slideUp 0.2s ease-out', boxShadow: '0 32px 80px rgba(0,0,0,0.8)' }}
          >
            {/* Header */}
            <div className='px-5 py-4 border-b border-[#161616] flex items-center justify-between'>
              <h3 className='font-bebas text-xl text-white tracking-wide'>
                {searchCtx === 'review' ? 'Select Movie / Show' : searchCtx === 'list' ? 'Add to List' : 'Quick Select'}
              </h3>
              <button onClick={closeSearch}
                className='w-8 h-8 rounded-xl text-white/35 hover:text-white hover:bg-[#1A1A1A] transition-all duration-200 flex items-center justify-center'>
                <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M6 18L18 6M6 6l12 12' />
                </svg>
              </button>
            </div>

            {/* Search input */}
            <div className='px-4 py-3 border-b border-[#141414]'>
              <div className='relative'>
                <svg className='absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z' />
                </svg>
                <input
                  type='text'
                  value={searchQ}
                  onChange={handleSearchInput}
                  placeholder='Search movies & TV shows…'
                  autoFocus
                  className='w-full bg-[#141414] border border-[#222] focus:border-[#D4AF37]/45 rounded-xl pl-10 pr-10 py-2.5 text-white placeholder:text-white/20 text-sm focus:outline-none transition-colors'
                />
                {searching && (
                  <div className='absolute right-3 top-1/2 -translate-y-1/2 text-[#D4AF37]'>
                    <Spinner />
                  </div>
                )}
              </div>
            </div>

            {/* Results */}
            <div className='flex-1 overflow-y-auto py-1 scrollbar-thin'>
              {searchResults.length > 0 ? (
                searchResults.map(m => (
                  <button
                    key={`${m.mediaType}-${m.id}`}
                    onClick={() => pickMovie(m)}
                    className='w-full px-4 py-3 flex items-center gap-3 hover:bg-[#141414] transition-colors text-left group'
                  >
                    {posterUrl(m.posterPath)
                      ? <img src={posterUrl(m.posterPath)} alt={m.title} className='w-10 h-14 object-cover rounded-lg shadow-md flex-shrink-0' />
                      : <div className='w-10 h-14 bg-[#181818] rounded-lg flex-shrink-0 flex items-center justify-center border border-[#222]'>
                          <svg className='w-4 h-4 text-white/15' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={1.5} d='M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18' />
                          </svg>
                        </div>
                    }
                    <div className='flex-1 min-w-0'>
                      <p className='text-white/90 text-sm font-semibold group-hover:text-[#D4AF37] transition-colors truncate'>{m.title}</p>
                      <p className='text-white/35 text-xs mt-0.5'>
                        {m.year}
                        <span className='mx-1.5 text-white/15'>·</span>
                        <span className={`font-medium ${m.mediaType === 'tv' ? 'text-purple-400/60' : 'text-blue-400/60'}`}>
                          {m.mediaType === 'tv' ? 'Series' : 'Movie'}
                        </span>
                      </p>
                    </div>
                    <svg className='w-4 h-4 text-white/15 group-hover:text-[#D4AF37] transition-colors flex-shrink-0' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 5l7 7-7 7' />
                    </svg>
                  </button>
                ))
              ) : searchQ && !searching ? (
                <div className='py-14 text-center'>
                  <svg className='w-10 h-10 text-white/10 mx-auto mb-3' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={1.5} d='M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z' />
                  </svg>
                  <p className='text-white/25 text-sm'>No results for "{searchQ}"</p>
                </div>
              ) : !searchQ ? (
                <div className='py-14 text-center'>
                  <svg className='w-10 h-10 text-white/8 mx-auto mb-3' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={1.5} d='M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z' />
                  </svg>
                  <p className='text-white/20 text-sm'>Start typing to search</p>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .scrollbar-thin::-webkit-scrollbar { width: 4px; }
        .scrollbar-thin::-webkit-scrollbar-track { background: transparent; }
        .scrollbar-thin::-webkit-scrollbar-thumb { background: #242424; border-radius: 4px; }
        .scrollbar-thin::-webkit-scrollbar-thumb:hover { background: #D4AF37; }
      `}</style>
    </div>
  )
}

export default CreatePost
