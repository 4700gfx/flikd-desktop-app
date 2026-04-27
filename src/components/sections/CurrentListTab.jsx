import React, { useState, useEffect, useCallback, useRef } from 'react'
import supabase from '../../config/SupabaseClient'
import QuizModal, { checkQuizCooldown, recordQuizPass } from './QuizModal'
import ShareableList, { RemoveItemModal } from './ShareableList'

/**
 * CurrentListTab + ListModal — v3
 * ─────────────────────────────────────────────────────────
 * Changes from v2:
 *   ✦ QuizModal is now the standalone full modal (no inline quiz logic)
 *   ✦ Remove item from list WITHOUT granting watch credit (owner only)
 *   ✦ Shareable/collaborative lists open in ShareableList modal
 *   ✦ Mobile-first layout improvements throughout
 *   ✦ Fully polished UI with consistent gold/dark theme
 *
 * Quiz gates (unchanged):
 *   🎬 Movie toggle     → 5-question quiz, 60%, 1-day cooldown
 *   📺 Episode toggle   → 2-question quiz, 50%, no cooldown
 *   📦 Season check-all → 10-question quiz, 80%, 7-day cooldown
 */

const TMDB_KEY = import.meta.env.VITE_TMDB_API_KEY
const tmdbImg  = (path, size = 'w342') => path ? `https://image.tmdb.org/t/p/${size}${path}` : null
const relTime  = (iso) => {
  if (!iso) return ''
  const s = Math.floor((Date.now() - new Date(iso)) / 1000)
  if (s < 60)     return 'just now'
  if (s < 3600)   return `${Math.floor(s / 60)}m ago`
  if (s < 86400)  return `${Math.floor(s / 3600)}h ago`
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

/* ─── Spinner ──────────────────────────────────────── */
const Spin = ({ cls = 'w-4 h-4' }) => (
  <svg className={`${cls} animate-spin text-[#D4AF37]`} fill='none' viewBox='0 0 24 24'>
    <circle className='opacity-25' cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='4' />
    <path className='opacity-75' fill='currentColor' d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z' />
  </svg>
)

/* ─── Quiz lock badge ──────────────────────────────── */
const QuizBadge = ({ type }) => {
  const config = {
    movie:   { label: '5Q · 60%',  color: '#D4AF37' },
    episode: { label: '2Q · 50%',  color: '#60A5FA' },
    season:  { label: '10Q · 80%', color: '#A78BFA' },
  }
  const c = config[type] || config.movie
  return (
    <div className='flex items-center gap-1 px-2 py-0.5 rounded-full border flex-shrink-0'
      style={{ borderColor: `${c.color}30`, background: `${c.color}0D` }}>
      <span className='text-[8px]'>✨</span>
      <span className='text-[9px] font-black uppercase tracking-wider' style={{ color: `${c.color}AA` }}>{c.label}</span>
    </div>
  )
}

/* ─── TMDB API helpers ─────────────────────────────── */
const fetchShowSeasons = async (tmdbId) => {
  if (!TMDB_KEY) return []
  try {
    const r = await fetch(`https://api.themoviedb.org/3/tv/${tmdbId}?api_key=${TMDB_KEY}`)
    if (!r.ok) return []
    const d = await r.json()
    return (d.seasons || [])
      .filter(s => s.season_number > 0)
      .map(s => ({
        seasonNum:    s.season_number,
        name:         s.name,
        episodeCount: s.episode_count,
        posterPath:   s.poster_path,
      }))
  } catch { return [] }
}

const fetchSeasonEps = async (tmdbId, seasonNum) => {
  if (!TMDB_KEY) return []
  try {
    const r = await fetch(`https://api.themoviedb.org/3/tv/${tmdbId}/season/${seasonNum}?api_key=${TMDB_KEY}`)
    if (!r.ok) return []
    const d = await r.json()
    return (d.episodes || []).map(ep => ({
      episodeNum: ep.episode_number,
      name:       ep.name,
      overview:   ep.overview,
      runtime:    ep.runtime,
      stillPath:  ep.still_path,
    }))
  } catch { return [] }
}

/* ─── Episode Row ──────────────────────────────────── */
const EpisodeRow = ({ ep, watched, showTitle, listItemId, seasonNum, userId, onToggle }) => {
  const [quizOpen, setQuizOpen] = useState(false)
  const [locked,   setLocked]   = useState(false)
  const still = ep.stillPath ? tmdbImg(ep.stillPath, 'w300') : null
  const refId = `${listItemId}-S${seasonNum}E${ep.episodeNum}`

  useEffect(() => {
    let live = true
    if (!watched && userId) {
      checkQuizCooldown(userId, refId, 'episode')
        .then(({ blocked }) => { if (live) setLocked(blocked) })
        .catch(() => {})
    }
    return () => { live = false }
  }, [watched, refId, userId])

  const handleClick = (e) => {
    e.stopPropagation()
    if (watched) { onToggle(ep, false); return }
    if (!locked) setQuizOpen(true)
  }

  return (
    <>
      <div className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group/ep ${
        watched ? 'bg-[#D4AF37]/5' : 'hover:bg-white/[0.025]'
      }`}>
        {/* Thumbnail */}
        {still
          ? <img src={still} alt={ep.name} className={`w-[72px] h-[42px] object-cover rounded-lg flex-shrink-0 transition-all ${watched ? 'brightness-40' : 'brightness-70 group-hover/ep:brightness-90'}`} />
          : <div className='w-[72px] h-[42px] bg-[#161616] rounded-lg flex-shrink-0 flex items-center justify-center'>
              <svg className='w-4 h-4 text-[#2A2A2A]' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={1.5} d='M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z' />
              </svg>
            </div>
        }

        {/* Info */}
        <div className='flex-1 min-w-0'>
          <p className={`text-[12px] font-semibold leading-tight ${watched ? 'text-white/25 line-through' : 'text-white/75'}`}>
            <span className='text-white/20 mr-1'>E{String(ep.episodeNum).padStart(2, '0')}</span>
            {ep.name}
          </p>
          {ep.runtime && <p className='text-[10px] text-white/20 mt-0.5'>{ep.runtime}m</p>}
        </div>

        {/* Quiz badge */}
        {!watched && !locked && <QuizBadge type='episode' />}
        {locked && !watched && <span className='text-[9px] text-red-400/50 font-bold flex-shrink-0'>⏳ Locked</span>}

        {/* Toggle */}
        <button
          onClick={handleClick}
          disabled={locked && !watched}
          style={{ touchAction: 'manipulation', minWidth: '28px', minHeight: '28px' }}
          className={`flex-shrink-0 w-7 h-7 rounded-full border flex items-center justify-center transition-all duration-200 ${
            watched
              ? 'bg-[#D4AF37] border-[#D4AF37] text-[#0A0A0A] hover:bg-transparent hover:text-[#D4AF37]/50'
              : locked
                ? 'border-red-500/20 text-red-400/25 cursor-not-allowed bg-red-500/4'
                : 'border-[#2A2A2A] text-transparent hover:border-[#D4AF37]/60 hover:text-[#D4AF37]/60 hover:bg-[#D4AF37]/8'
          }`}>
          {watched
            ? <svg className='w-3 h-3' fill='currentColor' viewBox='0 0 20 20'><path fillRule='evenodd' d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z' clipRule='evenodd' /></svg>
            : locked
              ? <svg className='w-3 h-3' fill='none' stroke='currentColor' viewBox='0 0 24 24'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z' /></svg>
              : <span className='text-[8px] font-black'>✨</span>
          }
        </button>
      </div>

      {quizOpen && (
        <QuizModal
          type='episode'
          title={showTitle}
          seasonNum={seasonNum}
          episodeNum={ep.episodeNum}
          episodeName={ep.name}
          refId={refId}
          userId={userId}
          onPass={() => { setQuizOpen(false); onToggle(ep, true) }}
          onClose={() => setQuizOpen(false)}
        />
      )}
    </>
  )
}

/* ─── Season Accordion ─────────────────────────────── */
const SeasonSection = ({ season, tvItem, watchedEps, userId, onEpisodeToggle, onSeasonComplete }) => {
  const [open,     setOpen]     = useState(season.seasonNum === 1)
  const [episodes, setEpisodes] = useState([])
  const [loading,  setLoading]  = useState(false)
  const [quizOpen, setQuizOpen] = useState(false)
  const [locked,   setLocked]   = useState(false)
  const fetched = useRef(false)

  const load = useCallback(async () => {
    if (fetched.current) return
    fetched.current = true
    setLoading(true)
    const eps = await fetchSeasonEps(tvItem.tmdb_id, season.seasonNum)
    setEpisodes(eps)
    setLoading(false)
  }, [tvItem.tmdb_id, season.seasonNum])

  useEffect(() => { if (open) load() }, [open, load])

  const watchedCount = episodes.filter(ep => watchedEps.has(`${season.seasonNum}-${ep.episodeNum}`)).length
  const total  = season.episodeCount
  const pct    = total ? Math.round((watchedCount / total) * 100) : 0
  const full   = pct === 100 && total > 0
  const refId  = `${tvItem.id}-S${season.seasonNum}-all`

  const handleSeasonCheckAll = async (e) => {
    e.stopPropagation()
    const { blocked } = await checkQuizCooldown(userId, refId, 'season').catch(() => ({ blocked: false }))
    setLocked(blocked)
    if (!blocked) setQuizOpen(true)
  }

  return (
    <>
      <div className={`rounded-2xl border overflow-hidden transition-all ${full ? 'border-[#D4AF37]/20' : 'border-[#181818]'}`}>
        {/* Season header row */}
        <div className='flex items-center gap-0'>
          {/* Expandable left section */}
          <button
            className='flex items-center gap-3 flex-1 min-w-0 px-4 py-3 hover:bg-[#0F0F0F] transition-colors text-left'
            style={{ touchAction: 'manipulation' }}
            onClick={() => { setOpen(p => !p); load() }}>
            {season.posterPath
              ? <img src={tmdbImg(season.posterPath, 'w92')} alt={season.name} className='w-8 h-11 object-cover rounded-lg flex-shrink-0' />
              : <div className='w-8 h-11 bg-[#1A1A1A] rounded-lg flex-shrink-0' />
            }
            <div className='flex-1 min-w-0'>
              <div className='flex items-center justify-between mb-1.5 gap-2'>
                <span className={`text-[13px] font-bold truncate ${full ? 'text-[#D4AF37]' : 'text-white/75'}`}>{season.name}</span>
                <div className='flex items-center gap-2 flex-shrink-0'>
                  <span className='text-[11px] text-white/25 tabular-nums'>{watchedCount}/{total}</span>
                  {full && <span className='text-[#D4AF37] text-xs'>✓</span>}
                  <svg className={`w-3.5 h-3.5 text-white/25 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M19 9l-7 7-7-7' />
                  </svg>
                </div>
              </div>
              <div className='w-full h-1 bg-[#181818] rounded-full overflow-hidden'>
                <div className={`h-full rounded-full transition-all duration-500 ${full ? 'bg-gradient-to-r from-[#D4AF37] to-[#E8C55B]' : 'bg-[#D4AF37]/50'}`} style={{ width: `${pct}%` }} />
              </div>
            </div>
          </button>

          {/* Season complete button */}
          {!full && total > 0 && (
            <div className='pr-3 flex-shrink-0'>
              <button
                onClick={handleSeasonCheckAll}
                style={{ touchAction: 'manipulation' }}
                className='flex items-center gap-1.5 px-2.5 py-2 rounded-xl border border-[#D4AF37]/20 bg-[#D4AF37]/6 hover:bg-[#D4AF37]/12 text-[#D4AF37]/70 hover:text-[#D4AF37] transition-all text-[9px] font-black uppercase tracking-wider whitespace-nowrap'>
                ✨ <span className='hidden sm:inline'>Complete Season</span><span className='sm:hidden'>All</span>
              </button>
            </div>
          )}
        </div>

        {open && (
          <div className='border-t border-[#111] bg-[#080808] px-2 py-2 space-y-0.5'>
            {loading
              ? <div className='py-5 flex justify-center'><Spin cls='w-5 h-5' /></div>
              : episodes.length === 0
                ? <p className='py-4 text-center text-[11px] text-white/20'>No episodes found</p>
                : episodes.map(ep => (
                    <EpisodeRow
                      key={`${season.seasonNum}-${ep.episodeNum}`}
                      ep={ep}
                      watched={watchedEps.has(`${season.seasonNum}-${ep.episodeNum}`)}
                      showTitle={tvItem.title}
                      listItemId={tvItem.id}
                      seasonNum={season.seasonNum}
                      userId={userId}
                      onToggle={(ep, shouldWatch) => onEpisodeToggle(season.seasonNum, ep, shouldWatch)}
                    />
                  ))
            }
          </div>
        )}
      </div>

      {quizOpen && (
        <QuizModal
          type='season'
          title={tvItem.title}
          seasonNum={season.seasonNum}
          posterPath={tvItem.poster_path}
          refId={refId}
          userId={userId}
          onPass={() => { setQuizOpen(false); onSeasonComplete?.(season.seasonNum, episodes) }}
          onClose={() => setQuizOpen(false)}
        />
      )}
    </>
  )
}

/* ─── TV Show Card ─────────────────────────────────── */
const TVCard = ({ item, index, userId, onTVProgressChange }) => {
  const [seasons,     setSeasons]     = useState([])
  const [watchedEps,  setWatchedEps]  = useState(new Set())
  const [loadingTV,   setLoadingTV]   = useState(true)
  const [showSeasons, setShowSeasons] = useState(false)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoadingTV(true)
      const [seas, { data: saved }] = await Promise.all([
        fetchShowSeasons(item.tmdb_id),
        supabase.from('list_item_episodes').select('season_num, episode_num, is_watched').eq('list_item_id', item.id)
      ])
      if (cancelled) return
      setSeasons(seas)
      const set = new Set((saved || []).filter(e => e.is_watched).map(e => `${e.season_num}-${e.episode_num}`))
      setWatchedEps(set)
      setLoadingTV(false)
    }
    load()
    return () => { cancelled = true }
  }, [item.id, item.tmdb_id])

  const totalEps   = seasons.reduce((a, s) => a + s.episodeCount, 0)
  const watchedCnt = watchedEps.size
  const pct        = totalEps ? Math.round((watchedCnt / totalEps) * 100) : 0
  const full       = pct === 100 && totalEps > 0

  const handleEpisodeToggle = useCallback(async (seasonNum, ep, shouldWatch) => {
    const key = `${seasonNum}-${ep.episodeNum}`
    setWatchedEps(prev => {
      const next = new Set(prev)
      shouldWatch ? next.add(key) : next.delete(key)
      return next
    })
    try {
      await supabase.from('list_item_episodes').upsert({
        list_item_id: item.id,
        season_num:   seasonNum,
        episode_num:  ep.episodeNum,
        episode_name: ep.name,
        is_watched:   shouldWatch,
        watched_at:   shouldWatch ? new Date().toISOString() : null,
      }, { onConflict: 'list_item_id,season_num,episode_num' })
      const newCount = shouldWatch ? watchedEps.size + 1 : watchedEps.size - 1
      onTVProgressChange?.(item.id, newCount, totalEps)
    } catch {
      setWatchedEps(prev => {
        const next = new Set(prev)
        shouldWatch ? next.delete(key) : next.add(key)
        return next
      })
    }
  }, [watchedEps, item.id, totalEps, onTVProgressChange])

  const handleSeasonComplete = useCallback(async (seasonNum, episodes) => {
    const keys = episodes.map(ep => `${seasonNum}-${ep.episodeNum}`)
    setWatchedEps(prev => { const next = new Set(prev); keys.forEach(k => next.add(k)); return next })
    try {
      await supabase.from('list_item_episodes').upsert(
        episodes.map(ep => ({
          list_item_id: item.id, season_num: seasonNum, episode_num: ep.episodeNum,
          episode_name: ep.name, is_watched: true, watched_at: new Date().toISOString(),
        })),
        { onConflict: 'list_item_id,season_num,episode_num' }
      )
      onTVProgressChange?.(item.id, watchedEps.size + keys.length, totalEps)
    } catch {}
  }, [item.id, watchedEps, totalEps, onTVProgressChange])

  const bg = item.backdrop_path ? tmdbImg(item.backdrop_path, 'w780') : null
  const p  = item.poster_path   ? tmdbImg(item.poster_path)           : null

  return (
    <div
      className={`col-span-2 relative rounded-2xl border overflow-hidden transition-all duration-300 ${
        full ? 'border-[#D4AF37]/25 bg-[#D4AF37]/[0.04]' : 'border-[#1C1C1C] bg-[#0D0D0D]'
      }`}
      style={{ animation: `clTabCardIn 0.3s ease-out ${Math.min(index * 0.04, 0.4)}s both` }}>

      {bg && (
        <div className='absolute inset-0 pointer-events-none overflow-hidden'>
          <img src={bg} alt='' className='w-full h-full object-cover opacity-[0.06] scale-105' />
          <div className='absolute inset-0 bg-gradient-to-r from-[#0D0D0D] via-[#0D0D0D]/60 to-transparent' />
        </div>
      )}

      <div className='relative'>
        <div className='flex gap-4 p-5'>
          {p
            ? <img src={p} alt={item.title} className='w-[68px] h-[100px] object-cover rounded-xl flex-shrink-0 shadow-2xl ring-1 ring-white/5' />
            : <div className='w-[68px] h-[100px] bg-[#1A1A1A] rounded-xl flex-shrink-0 ring-1 ring-white/5' />
          }
          <div className='flex-1 min-w-0'>
            <div className='flex items-center gap-2 mb-1 flex-wrap'>
              <span className='text-[10px] font-black text-[#D4AF37]/50 uppercase tracking-widest'>📺 Series</span>
              {full && <span className='text-[10px] font-black text-[#D4AF37] uppercase tracking-widest'>Complete ✓</span>}
            </div>
            <h4 className='font-bold text-[16px] text-white leading-snug mb-3'>{item.title}</h4>
            {loadingTV
              ? <div className='flex items-center gap-2'><Spin cls='w-3.5 h-3.5' /><span className='text-[11px] text-white/25'>Loading episodes…</span></div>
              : <div>
                  <div className='flex justify-between text-[11px] mb-1.5'>
                    <span className='text-white/35'>
                      <span className='text-white font-semibold'>{watchedCnt}</span>
                      <span className='text-white/30'> / {totalEps} episodes watched</span>
                    </span>
                    <span className={`font-bold tabular-nums ${full ? 'text-[#D4AF37]' : 'text-white/30'}`}>{pct}%</span>
                  </div>
                  <div className='w-full h-2 bg-[#161616] rounded-full overflow-hidden'>
                    <div className={`h-full rounded-full transition-all duration-500 ${full ? 'bg-gradient-to-r from-[#D4AF37] to-[#E8C55B] shadow-[0_0_8px_rgba(212,175,55,0.35)]' : 'bg-gradient-to-r from-[#D4AF37]/55 to-[#D4AF37]/75'}`} style={{ width: `${pct}%` }} />
                  </div>
                  <p className='text-[11px] text-white/20 mt-1.5'>{seasons.length} season{seasons.length !== 1 ? 's' : ''}</p>
                </div>
            }
          </div>
        </div>

        {/* Quiz hint */}
        {!loadingTV && !full && (
          <div className='px-5 pb-3 flex flex-wrap items-center gap-1.5'>
            <QuizBadge type='episode' />
            <span className='text-[9px] text-white/20'>per episode ·</span>
            <QuizBadge type='season' />
            <span className='text-[9px] text-white/20'>full season</span>
          </div>
        )}

        {!loadingTV && seasons.length > 0 && (
          <button
            onClick={() => setShowSeasons(p => !p)}
            style={{ touchAction: 'manipulation' }}
            className='w-full flex items-center justify-between px-5 py-2.5 border-t border-[#141414] hover:bg-[#0F0F0F] transition-colors'>
            <span className='text-[11px] font-bold text-white/35 uppercase tracking-wider'>
              {showSeasons ? 'Hide episodes' : 'Show episodes by season'}
            </span>
            <svg className={`w-4 h-4 text-white/25 transition-transform duration-200 ${showSeasons ? 'rotate-180' : ''}`} fill='none' stroke='currentColor' viewBox='0 0 24 24'>
              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M19 9l-7 7-7-7' />
            </svg>
          </button>
        )}

        {showSeasons && !loadingTV && (
          <div className='px-4 pb-4 pt-3 space-y-2 border-t border-[#111]'>
            {seasons.map(s => (
              <SeasonSection
                key={s.seasonNum}
                season={s}
                tvItem={item}
                watchedEps={watchedEps}
                userId={userId}
                onEpisodeToggle={handleEpisodeToggle}
                onSeasonComplete={handleSeasonComplete}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/* ─── Movie Card ───────────────────────────────────── */
const MovieCard = ({ item, index, userId, isOwner, onToggle, onRemove }) => {
  const [quizOpen,       setQuizOpen]       = useState(false)
  const [locked,         setLocked]         = useState(false)
  const [checking,       setChecking]       = useState(false)
  const [expanded,       setExpanded]       = useState(false)
  const [confirmRemove,  setConfirmRemove]  = useState(false)
  const p  = item.poster_path   ? tmdbImg(item.poster_path)           : null
  const bg = item.backdrop_path ? tmdbImg(item.backdrop_path, 'w780') : null
  const hasMore = item.overview && item.overview.length > 100

  useEffect(() => {
    let live = true
    if (!item.is_completed && userId) {
      checkQuizCooldown(userId, item.id, 'movie')
        .then(({ blocked }) => { if (live) setLocked(blocked) })
        .catch(() => {})
    }
    return () => { live = false }
  }, [item.id, item.is_completed, userId])

  const handleWatchToggle = async (e) => {
    e.stopPropagation()
    if (item.is_completed) { onToggle(item); return }
    setChecking(true)
    try {
      const { blocked } = await checkQuizCooldown(userId, item.id, 'movie')
      setLocked(blocked)
      if (!blocked) setQuizOpen(true)
    } catch { setQuizOpen(true) }
    setChecking(false)
  }

  return (
    <>
      <div
        className={`relative rounded-2xl border overflow-hidden flex flex-col transition-all duration-300 ${
          item.is_completed ? 'border-[#D4AF37]/20 bg-[#D4AF37]/[0.04]'
          : locked           ? 'border-red-500/15 bg-[#0D0D0D]'
          :                    'border-[#1C1C1C] bg-[#0D0D0D] hover:border-[#252525]'
        }`}
        style={{ animation: `clTabCardIn 0.3s ease-out ${Math.min(index * 0.04, 0.4)}s both` }}>

        {/* Backdrop strip */}
        <div className='relative h-[80px] flex-shrink-0 overflow-hidden bg-[#111]'>
          {bg
            ? <img src={bg} alt='' className={`w-full h-full object-cover transition-all ${item.is_completed ? 'opacity-15' : 'opacity-25'}`} />
            : <div className='w-full h-full bg-gradient-to-br from-[#161616] to-[#0D0D0D]' />
          }
          <div className='absolute inset-0 bg-gradient-to-b from-transparent to-[#0D0D0D]' />

          {/* Rank */}
          <div className='absolute top-2 left-2 w-5 h-5 rounded-full bg-black/60 flex items-center justify-center'>
            <span className='text-[9px] font-bold text-white/40'>{index + 1}</span>
          </div>

          {/* Watch toggle */}
          <button onClick={handleWatchToggle} disabled={checking}
            style={{ touchAction: 'manipulation', minWidth: '32px', minHeight: '32px' }}
            className={`absolute top-2 right-2 w-8 h-8 rounded-full border flex items-center justify-center transition-all duration-200 ${
              item.is_completed
                ? 'bg-[#D4AF37] border-[#D4AF37] text-[#0A0A0A] shadow-lg shadow-[#D4AF37]/20 hover:shadow-[#D4AF37]/30'
                : locked
                  ? 'bg-black/50 border-red-500/25 text-red-400/40 cursor-not-allowed'
                  : 'bg-black/50 border-[#D4AF37]/30 text-[#D4AF37]/60 hover:border-[#D4AF37] hover:text-[#D4AF37] hover:bg-[#D4AF37]/15'
            } ${checking ? 'opacity-50' : ''}`}>
            {checking
              ? <Spin cls='w-3 h-3' />
              : item.is_completed
                ? <svg className='w-3.5 h-3.5' fill='currentColor' viewBox='0 0 20 20'><path fillRule='evenodd' d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z' clipRule='evenodd' /></svg>
                : locked
                  ? <svg className='w-3.5 h-3.5' fill='none' stroke='currentColor' viewBox='0 0 24 24'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z' /></svg>
                  : <span className='text-[9px] font-black leading-none'>✨</span>
            }
          </button>

          {/* Quiz badge on backdrop */}
          {!item.is_completed && !locked && (
            <div className='absolute bottom-2 right-2'><QuizBadge type='movie' /></div>
          )}
          {locked && !item.is_completed && (
            <div className='absolute bottom-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/20'>
              <span className='text-[8px] text-red-400/60 font-bold'>⏳ Locked 1d</span>
            </div>
          )}
        </div>

        {/* Body */}
        <div className='flex gap-3 px-3 py-3 flex-1'>
          <div className='flex-shrink-0 -mt-10 z-10'>
            {p
              ? <div className='relative'>
                  <img src={p} alt={item.title} className={`w-[52px] h-[76px] object-cover rounded-lg shadow-xl ring-1 transition-all ${item.is_completed ? 'ring-[#D4AF37]/25 brightness-50' : 'ring-white/10'}`} />
                  {item.is_completed && (
                    <div className='absolute inset-0 rounded-lg flex items-center justify-center'>
                      <svg className='w-5 h-5 text-[#D4AF37]' fill='currentColor' viewBox='0 0 20 20'>
                        <path fillRule='evenodd' d='M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z' clipRule='evenodd' />
                      </svg>
                    </div>
                  )}
                </div>
              : <div className='w-[52px] h-[76px] bg-[#1A1A1A] rounded-lg ring-1 ring-white/5' />
            }
          </div>

          <div className='flex-1 min-w-0'>
            <h4 className={`font-bold text-[13px] leading-snug mb-1 transition-colors ${item.is_completed ? 'text-white/30 line-through decoration-white/15' : 'text-white'}`}>
              {item.title}
            </h4>
            <div className='text-[10px] text-white/25 mb-2 leading-relaxed'>
              {item.added_at && <span>Added {relTime(item.added_at)}</span>}
              {item.is_completed && item.completed_at && <span className='text-[#D4AF37]/45 ml-1'>· Watched {relTime(item.completed_at)}</span>}
            </div>

            {item.overview && (
              <div>
                <p className={`text-[11px] text-white/35 leading-relaxed ${expanded ? '' : 'line-clamp-2'}`}>{item.overview}</p>
                {hasMore && (
                  <button onClick={(e) => { e.stopPropagation(); setExpanded(p => !p) }} className='text-[10px] text-[#D4AF37]/45 hover:text-[#D4AF37] mt-0.5 transition-colors'>
                    {expanded ? '↑ Less' : '↓ More'}
                  </button>
                )}
              </div>
            )}

            {item.quiz_score != null && (
              <div className='inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#181818] border border-[#222] mt-2'>
                <span className='text-[#D4AF37] text-xs'>✨</span>
                <span className='text-[10px] font-bold text-white/50'>Quiz {item.quiz_score}%</span>
              </div>
            )}

            {/* Remove without credit — owner only */}
            {isOwner && (
              <div className='mt-2'>
                {confirmRemove ? (
                  <div className='flex items-center gap-2'>
                    <p className='text-[10px] text-red-400/70 flex-1'>Remove without credit?</p>
                    <button
                      onClick={(e) => { e.stopPropagation(); onRemove(item); setConfirmRemove(false) }}
                      style={{ touchAction: 'manipulation' }}
                      className='px-2 py-1 rounded-lg bg-red-500/15 border border-red-500/25 text-red-400 text-[9px] font-bold hover:bg-red-500/25 transition-all'>
                      Remove
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setConfirmRemove(false) }}
                      style={{ touchAction: 'manipulation' }}
                      className='px-2 py-1 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white/30 text-[9px] font-bold'>
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={(e) => { e.stopPropagation(); setConfirmRemove(true) }}
                    style={{ touchAction: 'manipulation' }}
                    className='text-[10px] text-white/15 hover:text-red-400/60 transition-colors flex items-center gap-1'>
                    <svg className='w-3 h-3' fill='none' stroke='currentColor' viewBox='0 0 24 24'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16' /></svg>
                    Remove from list
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {quizOpen && (
        <QuizModal
          type='movie'
          title={item.title}
          posterPath={item.poster_path}
          refId={item.id}
          userId={userId}
          onPass={() => { setQuizOpen(false); onToggle(item) }}
          onClose={() => setQuizOpen(false)}
        />
      )}
    </>
  )
}

/* ─── List Detail Modal ────────────────────────────── */
const ListModal = ({ list, userId, onClose, onCountChange }) => {
  const [items,   setItems]   = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)
  const [filter,  setFilter]  = useState('all')
  const [shareOpen, setShareOpen] = useState(false)

  const isOwner = list?.user_id === userId

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true); setError(null)
      try {
        const { data, error } = await supabase
          .from('list_items').select('*').eq('list_id', list.id)
          .order('position', { ascending: true, nullsFirst: false })
          .order('added_at',  { ascending: true })
        if (error) throw error
        if (!cancelled) setItems(data || [])
      } catch {
        if (!cancelled) setError('Could not load items. Please try again.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [list.id])

  const handleMovieToggle = useCallback(async (item) => {
    const newDone = !item.is_completed
    const doneAt  = newDone ? new Date().toISOString() : null
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, is_completed: newDone, completed_at: doneAt } : i))
    try {
      await supabase.from('list_items').update({ is_completed: newDone, completed_at: doneAt }).eq('id', item.id)
      setItems(cur => { onCountChange?.(list.id, cur.filter(i => i.is_completed).length, cur.length); return cur })
    } catch {
      setItems(prev => prev.map(i => i.id === item.id ? item : i))
    }
  }, [list.id, onCountChange])

  /* Remove without credit */
  const handleRemoveItem = useCallback(async (item) => {
    setItems(prev => prev.filter(i => i.id !== item.id))
    try { await supabase.from('list_items').delete().eq('id', item.id) } catch {
      setItems(prev => [...prev, item].sort((a, b) => (a.position || 0) - (b.position || 0)))
    }
    setItems(cur => { onCountChange?.(list.id, cur.filter(i => i.is_completed).length, cur.length); return cur })
  }, [list.id, onCountChange])

  const handleTVProgress = useCallback(() => {
    setItems(cur => { onCountChange?.(list.id, cur.filter(i => i.is_completed).length, cur.length); return cur })
  }, [list.id, onCountChange])

  const movies     = items.filter(i => i.media_type !== 'tv')
  const shows      = items.filter(i => i.media_type === 'tv')
  const moviesDone = movies.filter(i => i.is_completed).length
  const pct        = movies.length ? Math.round((moviesDone / movies.length) * 100) : 0

  const filtMovies = filter === 'watched'   ? movies.filter(i =>  i.is_completed)
                   : filter === 'unwatched' ? movies.filter(i => !i.is_completed)
                   : movies
  const filtShows  = filter === 'watched' ? [] : shows

  return (
    <>
      <div
        className='fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/88 backdrop-blur-md'
        onClick={e => e.target === e.currentTarget && onClose()}
        style={{ animation: 'clTabOverlayIn 0.2s ease-out' }}>

        <div
          className='bg-[#080808] border border-[#1C1C1C] w-full sm:max-w-4xl max-h-[95vh] sm:max-h-[92vh] flex flex-col shadow-[0_40px_100px_rgba(0,0,0,0.9)] sm:rounded-3xl rounded-t-3xl'
          style={{ animation: 'clTabModalIn 0.25s cubic-bezier(0.34,1.56,0.64,1)' }}>

          {/* Gold top bar */}
          <div className='h-[2px] flex-shrink-0 sm:rounded-t-3xl overflow-hidden'>
            <div className='h-full' style={{ background: 'linear-gradient(90deg, transparent, #D4AF37 25%, #F0C93A 50%, #D4AF37 75%, transparent)' }} />
          </div>

          {/* Mobile drag handle */}
          <div className='flex justify-center pt-2 sm:hidden flex-shrink-0'>
            <div className='w-8 h-1 bg-white/10 rounded-full' />
          </div>

          {/* Header */}
          <div className='px-5 sm:px-7 pt-4 sm:pt-7 pb-0 flex-shrink-0'>
            <div className='flex items-start justify-between gap-4 mb-5'>
              <div className='flex-1 min-w-0'>
                <div className='flex items-center gap-2 mb-1 flex-wrap'>
                  <h2 className='font-bebas text-2xl sm:text-3xl text-white tracking-wide leading-none'>{list.name}</h2>
                  {list.isPublic && (
                    <span className='px-2 py-0.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-black rounded-full uppercase tracking-widest'>Public</span>
                  )}
                  {list.isCollab && (
                    <span className='px-2 py-0.5 bg-purple-400/8 border border-purple-400/20 text-purple-400 text-[10px] font-black rounded-full uppercase tracking-widest'>Shared</span>
                  )}
                </div>
                {list.description && <p className='text-white/30 text-sm'>{list.description}</p>}
                {/* AI quiz notice */}
                <div className='flex items-center gap-1.5 mt-2'>
                  <span className='text-sm'>✨</span>
                  <p className='text-[11px] text-white/30'>Verify watches with AI quiz · films 60%, episodes 50%, seasons 80%</p>
                </div>
              </div>
              <div className='flex items-center gap-2 flex-shrink-0'>
                {/* Share button for collab lists */}
                {list.isCollab && (
                  <button
                    onClick={() => setShareOpen(true)}
                    style={{ touchAction: 'manipulation' }}
                    className='w-9 h-9 rounded-xl border border-purple-400/20 bg-purple-400/6 flex items-center justify-center text-purple-400/60 hover:text-purple-400 hover:bg-purple-400/15 transition-all'>
                    <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' /></svg>
                  </button>
                )}
                <button onClick={onClose} style={{ touchAction: 'manipulation' }}
                  className='w-9 h-9 flex items-center justify-center rounded-xl text-white/20 hover:text-white hover:bg-[#181818] transition-all flex-shrink-0 hover:rotate-90 duration-200'>
                  <svg className='w-5 h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M6 18L18 6M6 6l12 12' /></svg>
                </button>
              </div>
            </div>

            {/* Progress + stats */}
            {!loading && items.length > 0 && (
              <div className='flex items-center gap-5 mb-5'>
                <div className='flex-1'>
                  <div className='flex justify-between text-xs mb-1.5'>
                    <span className='text-white/30'>
                      <span className='text-white font-semibold'>{moviesDone}</span> / {movies.length} films watched
                      {shows.length > 0 && <span className='ml-2 text-white/20'>· {shows.length} show{shows.length > 1 ? 's' : ''}</span>}
                    </span>
                    <span className='text-white/35 font-bold tabular-nums'>{pct}%</span>
                  </div>
                  <div className='w-full h-1.5 bg-[#161616] rounded-full overflow-hidden'>
                    <div className='h-full rounded-full bg-gradient-to-r from-[#D4AF37]/60 to-[#D4AF37] transition-all duration-700' style={{ width: `${pct}%` }} />
                  </div>
                </div>
                <div className='flex gap-2 flex-shrink-0'>
                  {movies.length > 0 && <span className='px-2.5 py-1 bg-[#141414] border border-[#1E1E1E] rounded-lg text-[11px] text-white/35'>🎬 {movies.length}</span>}
                  {shows.length  > 0 && <span className='px-2.5 py-1 bg-[#141414] border border-[#1E1E1E] rounded-lg text-[11px] text-white/35'>📺 {shows.length}</span>}
                </div>
              </div>
            )}

            {/* Filter tabs */}
            {!loading && items.length > 0 && (
              <div className='flex gap-0 border-b border-[#141414]'>
                {[
                  { id: 'all',       label: 'All',       count: items.length },
                  { id: 'unwatched', label: 'Unwatched', count: movies.filter(i => !i.is_completed).length + shows.length },
                  { id: 'watched',   label: 'Watched',   count: moviesDone },
                ].map(t => (
                  <button key={t.id} onClick={() => setFilter(t.id)} style={{ touchAction: 'manipulation' }}
                    className={`px-4 py-2.5 text-xs font-bold transition-all border-b-2 -mb-px ${filter === t.id ? 'text-[#D4AF37] border-[#D4AF37]' : 'text-white/25 border-transparent hover:text-white/50'}`}>
                    {t.label}
                    <span className={`ml-1.5 px-1.5 py-0.5 rounded text-[10px] ${filter === t.id ? 'bg-[#D4AF37]/15 text-[#D4AF37]' : 'bg-[#181818] text-white/20'}`}>{t.count}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Scrollable body */}
          <div className='flex-1 overflow-y-auto px-5 sm:px-7 py-5' style={{ scrollbarWidth: 'thin', scrollbarColor: '#1E1E1E transparent' }}>
            {loading ? (
              <div className='py-32 flex flex-col items-center gap-4'>
                <Spin cls='w-10 h-10' />
                <p className='text-white/20 text-sm'>Loading your list…</p>
              </div>
            ) : error ? (
              <div className='py-32 text-center'><p className='text-red-400/60 text-sm'>{error}</p></div>
            ) : items.length === 0 ? (
              <div className='py-32 text-center'>
                <div className='w-16 h-16 bg-[#111] rounded-full flex items-center justify-center mx-auto mb-4'>
                  <svg className='w-8 h-8 text-[#1E1E1E]' fill='none' stroke='currentColor' viewBox='0 0 24 24'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={1.5} d='M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4' /></svg>
                </div>
                <p className='text-white/20 text-sm'>No titles in this list yet.</p>
              </div>
            ) : (
              <div className='space-y-5'>
                {filtShows.length > 0 && (
                  <div className='space-y-3'>
                    <p className='text-[10px] font-black text-white/20 uppercase tracking-widest'>TV Shows</p>
                    {filtShows.map((show, i) => (
                      <TVCard key={show.id} item={show} index={i} userId={userId} onTVProgressChange={handleTVProgress} />
                    ))}
                  </div>
                )}
                {filtMovies.length > 0 && (
                  <div>
                    {filtShows.length > 0 && <p className='text-[10px] font-black text-white/20 uppercase tracking-widest mb-3'>Films</p>}
                    <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
                      {filtMovies.map((m, i) => (
                        <MovieCard
                          key={m.id}
                          item={m}
                          index={i}
                          userId={userId}
                          isOwner={isOwner}
                          onToggle={handleMovieToggle}
                          onRemove={handleRemoveItem}
                        />
                      ))}
                    </div>
                  </div>
                )}
                {filtMovies.length === 0 && filtShows.length === 0 && (
                  <div className='py-20 text-center'><p className='text-white/20 text-sm'>No {filter} titles.</p></div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className='px-5 sm:px-7 py-4 border-t border-[#141414] flex items-center justify-between flex-shrink-0'>
            <span className='text-white/15 text-xs tabular-nums'>
              {items.length} title{items.length !== 1 ? 's' : ''}
              {shows.length > 0 && ' · episode tracking enabled'}
              {isOwner && ' · tap "Remove from list" to remove without credit'}
            </span>
            <button onClick={onClose} style={{ touchAction: 'manipulation' }}
              className='px-5 py-2 rounded-xl bg-[#141414] hover:bg-[#1C1C1C] text-white/40 hover:text-white text-sm font-semibold transition-all'>
              Close
            </button>
          </div>
        </div>

        <style>{`
          @keyframes clTabOverlayIn { from{opacity:0} to{opacity:1} }
          @keyframes clTabModalIn   { from{opacity:0;transform:scale(0.96) translateY(16px)} to{opacity:1;transform:scale(1) translateY(0)} }
          @keyframes clTabCardIn    { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        `}</style>
      </div>

      {/* Shareable list modal (for collab lists) */}
      {shareOpen && (
        <ShareableList
          list={{ id: list.id, name: list.name, description: list.description, is_public: list.isPublic, user_id: list.user_id }}
          currentUser={{ id: userId }}
          isOwner={isOwner}
          onClose={() => setShareOpen(false)}
        />
      )}
    </>
  )
}

/* ─── CurrentListTab ────────────────────────────────── */
const CurrentListTab = ({ lists = [], userId, onViewAll, onListUpdate }) => {
  const [activeList,  setActiveList]  = useState(null)
  const [localLists,  setLocalLists]  = useState(lists)

  useEffect(() => { setLocalLists(lists) }, [lists])

  const handleCountChange = useCallback((listId, completedCount, itemCount) => {
    setLocalLists(prev => prev.map(l => l.id === listId ? { ...l, completedCount, itemCount } : l))
    onListUpdate?.(listId, { completedCount, itemCount })
  }, [onListUpdate])

  const pct = (l) => !l.itemCount ? 0 : Math.round((l.completedCount / l.itemCount) * 100)

  return (
    <>
      <div className='bg-[#0A0A0A] border border-[#1A1A1A] rounded-2xl overflow-hidden'>
        {/* Header */}
        <div className='px-4 py-3.5 border-b border-[#161616] flex items-center justify-between'>
          <div className='flex items-center gap-2'>
            <svg className='w-4 h-4 text-[#D4AF37]' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' />
            </svg>
            <h2 className='font-bebas text-[17px] tracking-widest text-white'>YOUR LISTS</h2>
          </div>
          <div className='flex items-center gap-2'>
            {localLists.length > 0 && <span className='text-[11px] font-bold text-white/20 tabular-nums'>{localLists.length}</span>}
            <div className='flex items-center gap-1 px-1.5 py-0.5 rounded-full border border-[#D4AF37]/20 bg-[#D4AF37]/5'>
              <span className='text-[8px]'>✨</span>
              <span className='text-[8px] font-black text-[#D4AF37]/50 uppercase tracking-wider'>AI Quiz</span>
            </div>
          </div>
        </div>

        {/* List rows */}
        <div className='divide-y divide-[#0F0F0F]'>
          {localLists.length > 0 ? localLists.slice(0, 6).map((list, i) => {
            const p = pct(list), done = list.completedCount || 0, total = list.itemCount || 0
            const full = p === 100 && total > 0
            return (
              <button key={list.id} onClick={() => setActiveList(list)}
                style={{ touchAction: 'manipulation' }}
                className='w-full px-4 py-3.5 hover:bg-[#0D0D0D] active:bg-[#111] transition-colors text-left group'
                style={{ animation: `clTabRowIn 0.3s ease-out ${i * 0.05}s both` }}>
                <div className='flex items-center justify-between gap-2 mb-2'>
                  <div className='flex items-center gap-1.5 flex-1 min-w-0'>
                    <span className='text-sm font-semibold text-white/70 group-hover:text-white transition-colors line-clamp-1 flex-1'>{list.name}</span>
                    {list.isCollab && <span className='text-[8px] font-black text-purple-400/50 uppercase tracking-wider flex-shrink-0 px-1.5 py-0.5 bg-purple-400/8 border border-purple-400/15 rounded-full'>Shared</span>}
                    {list.isPublic && <span className='text-[9px] font-black text-blue-400/50 uppercase tracking-widest flex-shrink-0'>pub</span>}
                  </div>
                  <div className='flex items-center gap-1.5 flex-shrink-0'>
                    {full
                      ? <span className='text-[#D4AF37] text-xs'>✓</span>
                      : <span className='text-[11px] font-bold text-white/20 tabular-nums'>{p}%</span>
                    }
                  </div>
                </div>
                <div className='w-full h-[3px] bg-[#161616] rounded-full overflow-hidden mb-1.5'>
                  <div className={`h-full rounded-full transition-all duration-500 ${full ? 'bg-gradient-to-r from-[#D4AF37] to-[#E8C55B]' : 'bg-[#D4AF37]/40 group-hover:bg-[#D4AF37]/60'}`} style={{ width: `${p}%` }} />
                </div>
                <span className='text-[11px] text-white/20 tabular-nums'>{done}/{total} watched</span>
              </button>
            )
          }) : (
            <div className='px-4 py-10 text-center'>
              <div className='w-12 h-12 bg-[#111] rounded-full flex items-center justify-center mx-auto mb-3'>
                <svg className='w-6 h-6 text-[#1E1E1E]' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={1.5} d='M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' />
                </svg>
              </div>
              <p className='text-white/25 text-xs font-semibold mb-1'>No lists yet</p>
              <p className='text-white/15 text-xs'>Create your first watchlist!</p>
            </div>
          )}
        </div>

        {localLists.length > 0 && onViewAll && (
          <div className='px-4 py-3 border-t border-[#111]'>
            <button onClick={onViewAll} style={{ touchAction: 'manipulation' }}
              className='w-full py-1.5 text-center text-xs font-bold text-[#D4AF37]/50 hover:text-[#D4AF37] transition-colors tracking-wide'>
              VIEW ALL LISTS →
            </button>
          </div>
        )}
      </div>

      {activeList && (
        <ListModal
          list={activeList}
          userId={userId}
          onClose={() => setActiveList(null)}
          onCountChange={handleCountChange}
        />
      )}

      <style>{`
        @keyframes clTabRowIn { from{opacity:0;transform:translateX(-5px)} to{opacity:1;transform:translateX(0)} }
      `}</style>
    </>
  )
}

export default CurrentListTab
export { ListModal }