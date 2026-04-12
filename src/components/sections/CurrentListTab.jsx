import React, { useState, useEffect, useCallback, useRef } from 'react'
import supabase from '../../config/SupabaseClient'
import QuizModal, { checkQuizCooldown } from './QuizModal'

/**
 * CurrentListTab + ListModal — v2 Polished
 * ─────────────────────────────────────────
 * Refined design with improved animations, feedback, and quiz triggers.
 * Quiz modal always centered regardless of trigger location.
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

/* ─── Spinner ── */
const Spin = ({ size = 16, color = '#D4AF37' }) => (
  <svg width={size} height={size} viewBox='0 0 24 24' fill='none' style={{ animation: 'listSpin 0.8s linear infinite', flexShrink: 0 }}>
    <circle cx='12' cy='12' r='10' stroke={color} strokeWidth='3' opacity='0.15' />
    <path fill={color} opacity='0.8' d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z' />
  </svg>
)

/* ─── Quiz badge pill ── */
const QuizBadge = ({ type }) => {
  const labels = { movie: '5Q · 60%', episode: '2Q · 50%', season: '10Q · 80%' }
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '2px 7px', borderRadius: 20, border: '1px solid rgba(212,175,55,0.25)', background: 'rgba(212,175,55,0.08)' }}>
      <span style={{ fontSize: 8 }}>✨</span>
      <span style={{ fontSize: 9, fontWeight: 900, color: 'rgba(212,175,55,0.7)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{labels[type]}</span>
    </div>
  )
}

/* ─── TMDB helpers ── */
const fetchShowSeasons = async (tmdbId) => {
  if (!TMDB_KEY) return []
  try {
    const r = await fetch(`https://api.themoviedb.org/3/tv/${tmdbId}?api_key=${TMDB_KEY}`)
    if (!r.ok) return []
    const d = await r.json()
    return (d.seasons || []).filter(s => s.season_number > 0).map(s => ({
      seasonNum: s.season_number, name: s.name, episodeCount: s.episode_count, posterPath: s.poster_path,
    }))
  } catch { return [] }
}

const fetchSeasonEps = async (tmdbId, seasonNum) => {
  if (!TMDB_KEY) return []
  try {
    const r = await fetch(`https://api.themoviedb.org/3/tv/${tmdbId}/season/${seasonNum}?api_key=${TMDB_KEY}`)
    if (!r.ok) return []
    const d = await r.json()
    return (d.episodes || []).map(ep => ({ episodeNum: ep.episode_number, name: ep.name, overview: ep.overview, runtime: ep.runtime, stillPath: ep.still_path }))
  } catch { return [] }
}

/* ─── Episode row ── */
const EpisodeRow = ({ ep, watched, showTitle, listItemId, seasonNum, userId, onToggle }) => {
  const [quizOpen, setQuizOpen] = useState(false)
  const [locked,   setLocked]   = useState(false)
  const still = ep.stillPath ? tmdbImg(ep.stillPath, 'w300') : null
  const refId = `${listItemId}-S${seasonNum}E${ep.episodeNum}`

  useEffect(() => {
    let live = true
    if (!watched) {
      checkQuizCooldown(userId, refId, 'episode')
        .then(({ blocked }) => { if (live) setLocked(blocked) })
        .catch(() => {})
    }
    return () => { live = false }
  }, [watched, refId, userId])

  const handleClick = (e) => {
    e.stopPropagation()
    if (watched) { onToggle(ep); return }
    setQuizOpen(true)
  }

  return (
    <>
      <div style={{
        display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0.75rem',
        borderRadius: 10, transition: 'background 0.15s ease',
        background: watched ? 'rgba(212,175,55,0.04)' : 'transparent',
      }}
        onMouseEnter={e => { if (!watched) e.currentTarget.style.background = 'rgba(255,255,255,0.02)' }}
        onMouseLeave={e => { if (!watched) e.currentTarget.style.background = 'transparent' }}>
        {/* Thumbnail */}
        {still
          ? <img src={still} alt={ep.name} style={{ width: 68, height: 40, objectFit: 'cover', borderRadius: 6, flexShrink: 0, filter: watched ? 'brightness(0.35)' : 'brightness(0.7)', transition: 'filter 0.2s' }} />
          : <div style={{ width: 68, height: 40, background: '#141414', borderRadius: 6, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width={14} height={14} fill='none' stroke='rgba(255,255,255,0.15)' viewBox='0 0 24 24'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={1.5} d='M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z'/></svg>
            </div>
        }

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 12, fontWeight: 600, lineHeight: 1.3, margin: 0, color: watched ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.75)', textDecoration: watched ? 'line-through' : 'none', textDecorationColor: 'rgba(255,255,255,0.1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            <span style={{ color: 'rgba(255,255,255,0.2)', marginRight: 4 }}>E{String(ep.episodeNum).padStart(2,'0')}</span>
            {ep.name}
          </p>
          {ep.runtime && <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', margin: '2px 0 0' }}>{ep.runtime}m</p>}
        </div>

        {!watched && !locked && <QuizBadge type='episode' />}
        {locked && !watched && <span style={{ fontSize: 9, color: 'rgba(248,113,113,0.5)', fontWeight: 700, flexShrink: 0 }}>Locked</span>}

        {/* Toggle */}
        <button onClick={handleClick} disabled={locked && !watched}
          style={{
            flexShrink: 0, width: 24, height: 24, borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: locked && !watched ? 'not-allowed' : 'pointer',
            border: watched ? 'none' : locked ? '1px solid rgba(248,113,113,0.2)' : '1px solid #2A2A2A',
            background: watched ? '#D4AF37' : 'transparent',
            color: watched ? '#0A0A0A' : locked ? 'rgba(248,113,113,0.25)' : 'transparent',
            transition: 'all 0.18s ease',
          }}
          onMouseEnter={e => { if (!watched && !locked) { e.currentTarget.style.borderColor = 'rgba(212,175,55,0.6)'; e.currentTarget.style.color = 'rgba(212,175,55,0.7)'; e.currentTarget.style.background = 'rgba(212,175,55,0.08)' } }}
          onMouseLeave={e => { if (!watched && !locked) { e.currentTarget.style.borderColor = '#2A2A2A'; e.currentTarget.style.color = 'transparent'; e.currentTarget.style.background = 'transparent' } }}>
          {watched
            ? <svg width={11} height={11} fill='currentColor' viewBox='0 0 20 20'><path fillRule='evenodd' d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z' clipRule='evenodd'/></svg>
            : locked
              ? <svg width={11} height={11} fill='none' stroke='currentColor' viewBox='0 0 24 24'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z'/></svg>
              : <svg width={11} height={11} fill='currentColor' viewBox='0 0 20 20'><path fillRule='evenodd' d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z' clipRule='evenodd'/></svg>
          }
        </button>
      </div>

      {quizOpen && (
        <QuizModal
          type='episode' title={showTitle} seasonNum={seasonNum}
          episodeNum={ep.episodeNum} episodeName={ep.name}
          refId={refId} userId={userId}
          onPass={() => { setQuizOpen(false); onToggle(ep) }}
          onClose={() => setQuizOpen(false)}
        />
      )}
    </>
  )
}

/* ─── Season section ── */
const SeasonSection = ({ season, tvItem, watchedEps, userId, onEpisodeToggle, onSeasonComplete }) => {
  const [open,         setOpen]         = useState(season.seasonNum === 1)
  const [episodes,     setEpisodes]     = useState([])
  const [loading,      setLoading]      = useState(false)
  const [seasonQuiz,   setSeasonQuiz]   = useState(false)
  const [checkingLock, setCheckingLock] = useState(false)
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
  const total = season.episodeCount
  const pct   = total ? Math.round((watchedCount / total) * 100) : 0
  const full  = pct === 100 && total > 0

  const handleSeasonCheckAll = async (e) => {
    e.stopPropagation()
    setCheckingLock(true)
    try {
      const seasonRefId = `${tvItem.id}-S${season.seasonNum}-all`
      const { blocked } = await checkQuizCooldown(userId, seasonRefId, 'season')
      if (!blocked) setSeasonQuiz(true)
    } catch { setSeasonQuiz(true) }
    setCheckingLock(false)
  }

  return (
    <>
      <div style={{ borderRadius: 12, border: full ? '1px solid rgba(212,175,55,0.2)' : '1px solid #181818', overflow: 'hidden', transition: 'border-color 0.3s ease' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', background: '#0A0A0A', cursor: 'pointer' }}
          onClick={() => { setOpen(p => !p); load() }}>
          {season.posterPath
            ? <img src={tmdbImg(season.posterPath, 'w92')} alt={season.name} style={{ width: 30, height: 44, objectFit: 'cover', borderRadius: 5, flexShrink: 0 }} />
            : <div style={{ width: 30, height: 44, background: '#181818', borderRadius: 5, flexShrink: 0 }} />
          }
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: full ? '#D4AF37' : 'rgba(255,255,255,0.75)' }}>{season.name}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', fontVariantNumeric: 'tabular-nums' }}>{watchedCount}/{total}</span>
                {full && <span style={{ color: '#D4AF37', fontSize: 11 }}>✓</span>}
                <svg width={12} height={12} fill='none' stroke='rgba(255,255,255,0.25)' viewBox='0 0 24 24' style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }}>
                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M19 9l-7 7-7-7' />
                </svg>
              </div>
            </div>
            <div style={{ height: 4, background: '#181818', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${pct}%`, borderRadius: 2, transition: 'width 0.5s ease', background: full ? 'linear-gradient(90deg, #D4AF37, #E8C55B)' : 'rgba(212,175,55,0.5)' }} />
            </div>
          </div>
          {!full && total > 0 && (
            <button onClick={handleSeasonCheckAll} disabled={checkingLock}
              style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 8, border: '1px solid rgba(212,175,55,0.25)', background: 'rgba(212,175,55,0.08)', color: 'rgba(212,175,55,0.8)', fontSize: 9, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', cursor: 'pointer', transition: 'all 0.15s ease' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(212,175,55,0.15)'; e.currentTarget.style.color = '#D4AF37' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(212,175,55,0.08)'; e.currentTarget.style.color = 'rgba(212,175,55,0.8)' }}>
              {checkingLock ? <Spin size={10} /> : '✨'}
              <span style={{ display: 'none' }}>Complete</span>
            </button>
          )}
        </div>

        {open && (
          <div style={{ borderTop: '1px solid #111', background: '#080808', padding: '0.375rem 0.5rem', display: 'flex', flexDirection: 'column', gap: 2 }}>
            {loading
              ? <div style={{ padding: '1.25rem', display: 'flex', justifyContent: 'center' }}><Spin size={18} /></div>
              : episodes.length === 0
                ? <p style={{ padding: '1rem', textAlign: 'center', fontSize: 11, color: 'rgba(255,255,255,0.2)', margin: 0 }}>No episodes found</p>
                : episodes.map(ep => (
                    <EpisodeRow key={`${season.seasonNum}-${ep.episodeNum}`}
                      ep={ep} watched={watchedEps.has(`${season.seasonNum}-${ep.episodeNum}`)}
                      showTitle={tvItem.title} listItemId={tvItem.id}
                      seasonNum={season.seasonNum} userId={userId}
                      onToggle={(ep) => onEpisodeToggle(season.seasonNum, ep)} />
                  ))
            }
          </div>
        )}
      </div>

      {seasonQuiz && (
        <QuizModal
          type='season' title={tvItem.title} seasonNum={season.seasonNum}
          posterPath={tvItem.poster_path}
          refId={`${tvItem.id}-S${season.seasonNum}-all`}
          userId={userId}
          onPass={() => { setSeasonQuiz(false); onSeasonComplete?.(season.seasonNum, episodes) }}
          onClose={() => setSeasonQuiz(false)}
        />
      )}
    </>
  )
}

/* ─── TV Card ── */
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
        supabase.from('list_item_episodes').select('season_num, episode_num, is_watched').eq('list_item_id', item.id),
      ])
      if (cancelled) return
      setSeasons(seas)
      setWatchedEps(new Set((saved || []).filter(e => e.is_watched).map(e => `${e.season_num}-${e.episode_num}`)))
      setLoadingTV(false)
    }
    load()
    return () => { cancelled = true }
  }, [item.id, item.tmdb_id])

  const totalEps   = seasons.reduce((a, s) => a + s.episodeCount, 0)
  const watchedCnt = watchedEps.size
  const pct        = totalEps ? Math.round((watchedCnt / totalEps) * 100) : 0
  const full       = pct === 100 && totalEps > 0

  const handleEpisodeToggle = useCallback(async (seasonNum, ep) => {
    const key = `${seasonNum}-${ep.episodeNum}`
    const nowWatch = !watchedEps.has(key)
    setWatchedEps(prev => { const next = new Set(prev); nowWatch ? next.add(key) : next.delete(key); return next })
    try {
      await supabase.from('list_item_episodes').upsert({ list_item_id: item.id, season_num: seasonNum, episode_num: ep.episodeNum, episode_name: ep.name, is_watched: nowWatch, watched_at: nowWatch ? new Date().toISOString() : null }, { onConflict: 'list_item_id,season_num,episode_num' })
      onTVProgressChange?.(item.id, nowWatch ? watchedEps.size + 1 : watchedEps.size - 1, totalEps)
    } catch {
      setWatchedEps(prev => { const next = new Set(prev); nowWatch ? next.delete(key) : next.add(key); return next })
    }
  }, [watchedEps, item.id, totalEps, onTVProgressChange])

  const handleSeasonComplete = useCallback(async (seasonNum, episodes) => {
    const keys = episodes.map(ep => `${seasonNum}-${ep.episodeNum}`)
    setWatchedEps(prev => { const next = new Set(prev); keys.forEach(k => next.add(k)); return next })
    try {
      await supabase.from('list_item_episodes').upsert(
        episodes.map(ep => ({ list_item_id: item.id, season_num: seasonNum, episode_num: ep.episodeNum, episode_name: ep.name, is_watched: true, watched_at: new Date().toISOString() })),
        { onConflict: 'list_item_id,season_num,episode_num' }
      )
    } catch {}
  }, [item.id])

  const bg = item.backdrop_path ? tmdbImg(item.backdrop_path, 'w780') : null
  const p  = item.poster_path   ? tmdbImg(item.poster_path)           : null

  return (
    <div style={{
      gridColumn: '1 / -1', position: 'relative', borderRadius: 16, overflow: 'hidden',
      border: full ? '1px solid rgba(212,175,55,0.25)' : '1px solid #1C1C1C',
      background: full ? 'rgba(212,175,55,0.03)' : '#0D0D0D',
      transition: 'border-color 0.3s, background 0.3s',
      animation: `cardSlideIn 0.3s ease-out ${Math.min(index * 0.05, 0.4)}s both`,
    }}>
      {bg && (
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
          <img src={bg} alt='' style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.06, transform: 'scale(1.05)' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, #0D0D0D 30%, rgba(13,13,13,0.4) 100%)' }} />
        </div>
      )}

      <div style={{ position: 'relative' }}>
        <div style={{ display: 'flex', gap: '1rem', padding: '1.25rem' }}>
          {p
            ? <img src={p} alt={item.title} style={{ width: 64, height: 94, objectFit: 'cover', borderRadius: 10, flexShrink: 0, boxShadow: '0 8px 24px rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.05)' }} />
            : <div style={{ width: 64, height: 94, background: '#1A1A1A', borderRadius: 10, flexShrink: 0 }} />
          }
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: 4 }}>
              <span style={{ fontSize: 10, fontWeight: 900, color: 'rgba(212,175,55,0.5)', textTransform: 'uppercase', letterSpacing: '0.15em' }}>📺 Series</span>
              {full && <span style={{ fontSize: 10, fontWeight: 900, color: '#D4AF37', textTransform: 'uppercase', letterSpacing: '0.15em' }}>Complete ✓</span>}
            </div>
            <h4 style={{ fontWeight: 700, fontSize: 15, color: '#fff', lineHeight: 1.3, margin: '0 0 0.75rem' }}>{item.title}</h4>
            {loadingTV
              ? <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Spin size={13} /><span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>Loading…</span></div>
              : (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 6 }}>
                    <span style={{ color: 'rgba(255,255,255,0.3)' }}>
                      <span style={{ color: '#fff', fontWeight: 600 }}>{watchedCnt}</span> / {totalEps} episodes
                    </span>
                    <span style={{ fontWeight: 700, color: full ? '#D4AF37' : 'rgba(255,255,255,0.3)', fontVariantNumeric: 'tabular-nums' }}>{pct}%</span>
                  </div>
                  <div style={{ height: 6, background: '#161616', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, borderRadius: 3, transition: 'width 0.5s ease', background: full ? 'linear-gradient(90deg, #D4AF37, #E8C55B)' : 'linear-gradient(90deg, rgba(212,175,55,0.55), rgba(212,175,55,0.75))', boxShadow: full ? '0 0 8px rgba(212,175,55,0.35)' : 'none' }} />
                  </div>
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', margin: '5px 0 0' }}>{seasons.length} season{seasons.length !== 1 ? 's' : ''}</p>
                </div>
              )
            }
          </div>
        </div>

        {/* Toggle seasons */}
        {!loadingTV && seasons.length > 0 && (
          <button onClick={() => setShowSeasons(p => !p)}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.625rem 1.25rem', borderTop: '1px solid #141414', background: 'transparent', border: 'none', borderTop: '1px solid #141414', cursor: 'pointer', transition: 'background 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              {showSeasons ? 'Hide episodes' : 'Browse episodes by season'}
            </span>
            <svg width={14} height={14} fill='none' stroke='rgba(255,255,255,0.25)' viewBox='0 0 24 24' style={{ transform: showSeasons ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }}>
              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M19 9l-7 7-7-7' />
            </svg>
          </button>
        )}

        {showSeasons && !loadingTV && (
          <div style={{ padding: '0.75rem 1rem', borderTop: '1px solid #111', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {seasons.map(s => (
              <SeasonSection key={s.seasonNum} season={s} tvItem={item}
                watchedEps={watchedEps} userId={userId}
                onEpisodeToggle={handleEpisodeToggle}
                onSeasonComplete={handleSeasonComplete} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/* ─── Movie Card ── */
const MovieCard = ({ item, index, userId, onToggle }) => {
  const [quizOpen, setQuizOpen] = useState(false)
  const [locked,   setLocked]   = useState(false)
  const [checking, setChecking] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const p  = item.poster_path   ? tmdbImg(item.poster_path)           : null
  const bg = item.backdrop_path ? tmdbImg(item.backdrop_path, 'w780') : null

  useEffect(() => {
    let live = true
    if (!item.is_completed) {
      checkQuizCooldown(userId, item.id, 'movie')
        .then(({ blocked }) => { if (live) setLocked(blocked) })
        .catch(() => {})
    }
    return () => { live = false }
  }, [item.id, item.is_completed, userId])

  const handleToggle = async (e) => {
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
      <div style={{
        position: 'relative', borderRadius: 16, overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
        border: item.is_completed ? '1px solid rgba(212,175,55,0.2)' : locked ? '1px solid rgba(248,113,113,0.12)' : '1px solid #1C1C1C',
        background: item.is_completed ? 'rgba(212,175,55,0.03)' : '#0D0D0D',
        transition: 'all 0.25s ease',
        animation: `cardSlideIn 0.3s ease-out ${Math.min(index * 0.05, 0.4)}s both`,
      }}>
        {/* Backdrop */}
        <div style={{ position: 'relative', height: 76, overflow: 'hidden', background: '#111', flexShrink: 0 }}>
          {bg && <img src={bg} alt='' style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: item.is_completed ? 0.12 : 0.22, transition: 'opacity 0.2s' }} />}
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent, #0D0D0D)' }} />

          {/* Index badge */}
          <div style={{ position: 'absolute', top: 8, left: 8, width: 20, height: 20, borderRadius: '50%', background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.4)' }}>{index + 1}</span>
          </div>

          {/* Watch toggle */}
          <button onClick={handleToggle} disabled={checking}
            style={{
              position: 'absolute', top: 8, right: 8, width: 28, height: 28, borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: checking ? 'wait' : 'pointer',
              background: item.is_completed ? '#D4AF37' : 'rgba(0,0,0,0.55)',
              border: item.is_completed ? 'none' : locked ? '1px solid rgba(248,113,113,0.25)' : '1px solid rgba(212,175,55,0.3)',
              color: item.is_completed ? '#0A0A0A' : locked ? 'rgba(248,113,113,0.5)' : 'rgba(212,175,55,0.7)',
              transition: 'all 0.18s ease',
              boxShadow: item.is_completed ? '0 4px 12px rgba(212,175,55,0.25)' : 'none',
            }}
            onMouseEnter={e => { if (!item.is_completed && !locked && !checking) { e.currentTarget.style.background = 'rgba(212,175,55,0.15)'; e.currentTarget.style.borderColor = '#D4AF37'; e.currentTarget.style.transform = 'scale(1.1)' } }}
            onMouseLeave={e => { if (!item.is_completed && !locked) { e.currentTarget.style.background = 'rgba(0,0,0,0.55)'; e.currentTarget.style.borderColor = 'rgba(212,175,55,0.3)'; e.currentTarget.style.transform = 'none' } }}>
            {checking ? <Spin size={13} color={item.is_completed ? '#0A0A0A' : '#D4AF37'} />
              : item.is_completed ? <svg width={13} height={13} fill='currentColor' viewBox='0 0 20 20'><path fillRule='evenodd' d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z' clipRule='evenodd'/></svg>
              : locked ? <svg width={12} height={12} fill='none' stroke='currentColor' viewBox='0 0 24 24'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z'/></svg>
              : <span style={{ fontSize: 10 }}>✨</span>
            }
          </button>

          {/* Quiz badge / lock on backdrop */}
          {!item.is_completed && !locked && (
            <div style={{ position: 'absolute', bottom: 8, right: 8 }}><QuizBadge type='movie' /></div>
          )}
          {locked && !item.is_completed && (
            <div style={{ position: 'absolute', bottom: 8, right: 8, display: 'flex', alignItems: 'center', gap: 3, padding: '2px 7px', borderRadius: 20, background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)' }}>
              <span style={{ fontSize: 8, color: 'rgba(248,113,113,0.6)', fontWeight: 700 }}>⏳ Locked</span>
            </div>
          )}
        </div>

        {/* Body */}
        <div style={{ display: 'flex', gap: '0.75rem', padding: '0 0.75rem 0.75rem', flex: 1 }}>
          <div style={{ flexShrink: 0, marginTop: -28, zIndex: 1 }}>
            {p
              ? <div style={{ position: 'relative' }}>
                  <img src={p} alt={item.title} style={{ width: 50, height: 72, objectFit: 'cover', borderRadius: 8, boxShadow: '0 8px 20px rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.06)', filter: item.is_completed ? 'brightness(0.45)' : 'none', transition: 'filter 0.2s' }} />
                  {item.is_completed && (
                    <div style={{ position: 'absolute', inset: 0, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(212,175,55,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width={11} height={11} fill='#0A0A0A' viewBox='0 0 20 20'><path fillRule='evenodd' d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z' clipRule='evenodd'/></svg>
                      </div>
                    </div>
                  )}
                </div>
              : <div style={{ width: 50, height: 72, background: '#1A1A1A', borderRadius: 8, marginTop: -28 }} />
            }
          </div>

          <div style={{ flex: 1, minWidth: 0, paddingTop: '0.25rem' }}>
            <h4 style={{ fontWeight: 700, fontSize: 13, lineHeight: 1.3, margin: '0 0 3px', color: item.is_completed ? 'rgba(255,255,255,0.28)' : '#fff', textDecoration: item.is_completed ? 'line-through' : 'none', textDecorationColor: 'rgba(255,255,255,0.12)' }}>
              {item.title}
            </h4>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.22)', marginBottom: 6 }}>
              {item.added_at && <span>Added {relTime(item.added_at)}</span>}
              {item.is_completed && item.completed_at && <span style={{ color: 'rgba(212,175,55,0.4)', marginLeft: 4 }}>· Watched {relTime(item.completed_at)}</span>}
            </div>

            {item.overview && (
              <div>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.32)', lineHeight: 1.5, margin: 0, display: expanded ? 'block' : '-webkit-box', WebkitLineClamp: expanded ? 'unset' : 2, WebkitBoxOrient: 'vertical', overflow: expanded ? 'visible' : 'hidden' }}>
                  {item.overview}
                </p>
                {item.overview.length > 100 && (
                  <button onClick={e => { e.stopPropagation(); setExpanded(p => !p) }}
                    style={{ fontSize: 10, color: 'rgba(212,175,55,0.45)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 0', transition: 'color 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.color = '#D4AF37'}
                    onMouseLeave={e => e.currentTarget.style.color = 'rgba(212,175,55,0.45)'}>
                    {expanded ? '↑ Less' : '↓ More'}
                  </button>
                )}
              </div>
            )}

            {item.quiz_score != null && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 7px', borderRadius: 6, background: '#181818', border: '1px solid #222', marginTop: 6 }}>
                <span style={{ fontSize: 10, color: '#D4AF37' }}>✨</span>
                <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.45)' }}>Quiz {item.quiz_score}%</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {quizOpen && (
        <QuizModal
          type='movie' title={item.title} posterPath={item.poster_path}
          refId={item.id} userId={userId}
          onPass={() => { setQuizOpen(false); onToggle(item) }}
          onClose={() => setQuizOpen(false)}
        />
      )}
    </>
  )
}

/* ─── List Detail Modal ── */
const ListModal = ({ list, userId, onClose, onCountChange }) => {
  const [items,   setItems]   = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)
  const [filter,  setFilter]  = useState('all')

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true); setError(null)
      try {
        const { data, error } = await supabase.from('list_items').select('*').eq('list_id', list.id).order('position', { ascending: true, nullsFirst: false }).order('added_at', { ascending: true })
        if (error) throw error
        if (!cancelled) setItems(data || [])
      } catch { if (!cancelled) setError('Could not load items. Please try again.') }
      finally { if (!cancelled) setLoading(false) }
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
    } catch { setItems(prev => prev.map(i => i.id === item.id ? item : i)) }
  }, [list.id, onCountChange])

  const movies      = items.filter(i => i.media_type !== 'tv')
  const shows       = items.filter(i => i.media_type === 'tv')
  const moviesDone  = movies.filter(i => i.is_completed).length
  const pct         = movies.length ? Math.round((moviesDone / movies.length) * 100) : 0

  const filtMovies = filter === 'watched' ? movies.filter(i => i.is_completed) : filter === 'unwatched' ? movies.filter(i => !i.is_completed) : movies
  const filtShows  = filter === 'watched' ? [] : shows

  return (
    <div onClick={e => e.target === e.currentTarget && onClose()}
      style={{ position: 'fixed', inset: 0, zIndex: 8000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', animation: 'listOverlayIn 0.2s ease-out' }}>
      <div style={{ background: '#080808', border: '1px solid #1C1C1C', borderRadius: 24, width: '100%', maxWidth: 860, maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 40px 100px rgba(0,0,0,0.9)', animation: 'listModalIn 0.28s cubic-bezier(0.34,1.56,0.64,1)', overflow: 'hidden' }}>
        {/* Gold bar */}
        <div style={{ height: 2, flexShrink: 0, background: 'linear-gradient(90deg, transparent, #D4AF37 20%, #F0C93A 50%, #D4AF37 80%, transparent)' }} />

        {/* Header */}
        <div style={{ padding: '1.5rem 1.75rem 0', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', marginBottom: '1.25rem' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: 4 }}>
                <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 28, color: '#fff', letterSpacing: '0.04em', margin: 0, lineHeight: 1 }}>{list.name}</h2>
                {list.isPublic && <span style={{ padding: '2px 8px', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', color: 'rgba(96,165,250,0.9)', fontSize: 9, fontWeight: 900, borderRadius: 20, textTransform: 'uppercase', letterSpacing: '0.15em' }}>Public</span>}
              </div>
              {list.description && <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', margin: '0 0 8px' }}>{list.description}</p>}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: 14 }}>✨</span>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.28)', margin: 0 }}>Watching is AI-verified — films need 60%, episodes 50%, full seasons 80%</p>
              </div>
            </div>
            <button onClick={onClose}
              style={{ width: 36, height: 36, borderRadius: 10, border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.2)', transition: 'all 0.18s ease', flexShrink: 0 }}
              onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = '#181818'; e.currentTarget.style.transform = 'rotate(90deg)' }}
              onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.2)'; e.currentTarget.style.background = 'transparent'; e.currentTarget.style.transform = 'none' }}>
              <svg width={18} height={18} fill='none' stroke='currentColor' viewBox='0 0 24 24'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M6 18L18 6M6 6l12 12'/></svg>
            </button>
          </div>

          {/* Progress */}
          {!loading && items.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginBottom: '1.25rem' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
                  <span style={{ color: 'rgba(255,255,255,0.3)' }}>
                    <span style={{ color: '#fff', fontWeight: 600 }}>{moviesDone}</span> / {movies.length} films watched
                    {shows.length > 0 && <span style={{ marginLeft: 8, color: 'rgba(255,255,255,0.2)' }}>· {shows.length} show{shows.length > 1 ? 's' : ''}</span>}
                  </span>
                  <span style={{ fontWeight: 700, color: 'rgba(255,255,255,0.35)', fontVariantNumeric: 'tabular-nums' }}>{pct}%</span>
                </div>
                <div style={{ height: 5, background: '#161616', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, borderRadius: 3, background: 'linear-gradient(90deg, rgba(212,175,55,0.6), #D4AF37)', transition: 'width 0.6s ease' }} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                {movies.length > 0 && <span style={{ padding: '4px 10px', background: '#141414', border: '1px solid #1E1E1E', borderRadius: 8, fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>🎬 {movies.length}</span>}
                {shows.length  > 0 && <span style={{ padding: '4px 10px', background: '#141414', border: '1px solid #1E1E1E', borderRadius: 8, fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>📺 {shows.length}</span>}
              </div>
            </div>
          )}

          {/* Filter tabs */}
          {!loading && items.length > 0 && (
            <div style={{ display: 'flex', borderBottom: '1px solid #141414', gap: 0 }}>
              {[{ id: 'all', label: 'All', count: items.length }, { id: 'unwatched', label: 'Unwatched', count: movies.filter(i => !i.is_completed).length + shows.length }, { id: 'watched', label: 'Watched', count: moviesDone }].map(t => (
                <button key={t.id} onClick={() => setFilter(t.id)}
                  style={{ padding: '0.625rem 1rem', fontSize: 12, fontWeight: 700, background: 'none', border: 'none', borderBottom: `2px solid ${filter === t.id ? '#D4AF37' : 'transparent'}`, marginBottom: -1, cursor: 'pointer', color: filter === t.id ? '#D4AF37' : 'rgba(255,255,255,0.25)', transition: 'all 0.15s ease' }}>
                  {t.label}
                  <span style={{ marginLeft: 6, padding: '2px 6px', borderRadius: 5, fontSize: 10, background: filter === t.id ? 'rgba(212,175,55,0.15)' : '#181818', color: filter === t.id ? '#D4AF37' : 'rgba(255,255,255,0.2)' }}>{t.count}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem 1.75rem', scrollbarWidth: 'thin', scrollbarColor: '#1E1E1E transparent' }}>
          {loading ? (
            <div style={{ padding: '6rem 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
              <Spin size={36} /><p style={{ fontSize: 13, color: 'rgba(255,255,255,0.2)', margin: 0 }}>Loading your list…</p>
            </div>
          ) : error ? (
            <div style={{ padding: '6rem 0', textAlign: 'center' }}><p style={{ fontSize: 13, color: 'rgba(248,113,113,0.6)', margin: 0 }}>{error}</p></div>
          ) : items.length === 0 ? (
            <div style={{ padding: '6rem 0', textAlign: 'center' }}>
              <div style={{ width: 60, height: 60, background: '#111', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                <svg width={28} height={28} fill='none' stroke='#1E1E1E' viewBox='0 0 24 24'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={1.5} d='M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4'/></svg>
              </div>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.2)', margin: 0 }}>No titles in this list yet.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {filtShows.length > 0 && (
                <div>
                  <p style={{ fontSize: 9, fontWeight: 900, color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: '0.75rem' }}>TV Shows</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {filtShows.map((show, i) => <TVCard key={show.id} item={show} index={i} userId={userId} onTVProgressChange={() => {}} />)}
                  </div>
                </div>
              )}
              {filtMovies.length > 0 && (
                <div>
                  {filtShows.length > 0 && <p style={{ fontSize: 9, fontWeight: 900, color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: '0.75rem' }}>Films</p>}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
                    {filtMovies.map((m, i) => <MovieCard key={m.id} item={m} index={i} userId={userId} onToggle={handleMovieToggle} />)}
                  </div>
                </div>
              )}
              {filtMovies.length === 0 && filtShows.length === 0 && (
                <div style={{ padding: '4rem 0', textAlign: 'center' }}><p style={{ fontSize: 13, color: 'rgba(255,255,255,0.2)', margin: 0 }}>No {filter} titles.</p></div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '0.875rem 1.75rem', borderTop: '1px solid #141414', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.15)', fontVariantNumeric: 'tabular-nums' }}>{items.length} title{items.length !== 1 ? 's' : ''}{shows.length > 0 ? ' · AI-verified episode tracking' : ''}</span>
          <button onClick={onClose}
            style={{ padding: '0.5rem 1.25rem', borderRadius: 10, background: '#141414', border: '1px solid rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)', fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s ease' }}
            onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)' }}
            onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.4)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)' }}>
            Close
          </button>
        </div>
      </div>

      <style>{`
        @keyframes listOverlayIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes listModalIn   { from { opacity: 0; transform: scale(0.96) translateY(12px) } to { opacity: 1; transform: scale(1) translateY(0) } }
        @keyframes cardSlideIn   { from { opacity: 0; transform: translateY(8px) } to { opacity: 1; transform: translateY(0) } }
        @keyframes listSpin      { to { transform: rotate(360deg) } }
      `}</style>
    </div>
  )
}

/* ─── CurrentListTab sidebar ── */
const CurrentListTab = ({ lists = [], userId, onViewAll, onListUpdate }) => {
  const [activeList, setActiveList] = useState(null)
  const [localLists, setLocalLists] = useState(lists)

  useEffect(() => { setLocalLists(lists) }, [lists])

  const handleCountChange = useCallback((listId, completedCount, itemCount) => {
    setLocalLists(prev => prev.map(l => l.id === listId ? { ...l, completedCount, itemCount } : l))
    onListUpdate?.(listId, { completedCount, itemCount })
  }, [onListUpdate])

  const pct = (l) => !l.itemCount ? 0 : Math.round((l.completedCount / l.itemCount) * 100)

  return (
    <>
      <div style={{ background: '#0A0A0A', border: '1px solid #1A1A1A', borderRadius: 16, overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ padding: '0.875rem 1rem', borderBottom: '1px solid #161616', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <svg width={15} height={15} fill='none' stroke='#D4AF37' viewBox='0 0 24 24'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2'/></svg>
            <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 16, letterSpacing: '0.12em', color: '#fff', margin: 0 }}>YOUR LISTS</h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {localLists.length > 0 && <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.2)' }}>{localLists.length}</span>}
            <div style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '2px 7px', borderRadius: 20, border: '1px solid rgba(212,175,55,0.2)', background: 'rgba(212,175,55,0.05)' }}>
              <span style={{ fontSize: 8 }}>✨</span>
              <span style={{ fontSize: 8, fontWeight: 900, color: 'rgba(212,175,55,0.5)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>AI Quiz</span>
            </div>
          </div>
        </div>

        {/* List rows */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {localLists.length > 0 ? localLists.slice(0, 6).map((list, i) => {
            const p = pct(list), done = list.completedCount || 0, total = list.itemCount || 0
            const full = p === 100 && total > 0
            return (
              <button key={list.id} onClick={() => setActiveList(list)}
                style={{ padding: '0.875rem 1rem', background: 'transparent', border: 'none', borderBottom: '1px solid #0F0F0F', cursor: 'pointer', textAlign: 'left', transition: 'background 0.15s', animation: `rowSlideIn 0.3s ease-out ${i * 0.05}s both` }}
                onMouseEnter={e => e.currentTarget.style.background = '#0D0D0D'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginBottom: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.7)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{list.name}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', flexShrink: 0 }}>
                    {list.isPublic && <span style={{ fontSize: 9, fontWeight: 900, color: 'rgba(96,165,250,0.5)', textTransform: 'uppercase' }}>pub</span>}
                    {full ? <span style={{ color: '#D4AF37', fontSize: 11 }}>✓</span> : <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.2)', fontVariantNumeric: 'tabular-nums' }}>{p}%</span>}
                  </div>
                </div>
                <div style={{ height: 3, background: '#161616', borderRadius: 2, overflow: 'hidden', marginBottom: 5 }}>
                  <div style={{ height: '100%', width: `${p}%`, borderRadius: 2, transition: 'width 0.5s ease', background: full ? 'linear-gradient(90deg, #D4AF37, #E8C55B)' : 'rgba(212,175,55,0.4)' }} />
                </div>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', fontVariantNumeric: 'tabular-nums' }}>{done}/{total} watched</span>
              </button>
            )
          }) : (
            <div style={{ padding: '2.5rem 1rem', textAlign: 'center' }}>
              <div style={{ width: 44, height: 44, background: '#111', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.75rem' }}>
                <svg width={22} height={22} fill='none' stroke='#1E1E1E' viewBox='0 0 24 24'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={1.5} d='M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2'/></svg>
              </div>
              <p style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.25)', margin: '0 0 4px' }}>No lists yet</p>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.15)', margin: 0 }}>Create your first watchlist!</p>
            </div>
          )}
        </div>

        {localLists.length > 0 && onViewAll && (
          <div style={{ padding: '0.75rem 1rem', borderTop: '1px solid #111' }}>
            <button onClick={onViewAll}
              style={{ width: '100%', padding: '0.375rem', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 900, color: 'rgba(212,175,55,0.5)', textTransform: 'uppercase', letterSpacing: '0.12em', transition: 'color 0.15s ease' }}
              onMouseEnter={e => e.currentTarget.style.color = '#D4AF37'}
              onMouseLeave={e => e.currentTarget.style.color = 'rgba(212,175,55,0.5)'}>
              VIEW ALL LISTS →
            </button>
          </div>
        )}
      </div>

      {activeList && (
        <ListModal list={activeList} userId={userId} onClose={() => setActiveList(null)} onCountChange={handleCountChange} />
      )}

      <style>{`
        @keyframes rowSlideIn { from { opacity: 0; transform: translateX(-5px) } to { opacity: 1; transform: translateX(0) } }
        @keyframes listSpin   { to { transform: rotate(360deg) } }
      `}</style>
    </>
  )
}

export default CurrentListTab