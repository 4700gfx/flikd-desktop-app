import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import supabase from '../../config/SupabaseClient'
import logo from '../../assets/photos/flikd-logo.png'

/**
 * FLIK'D — Complete Navigation System v2
 * ─────────────────────────────────────────
 * Luxury cinema dark aesthetic
 * Gold sidebar rail + 5 cinematic slide-over panels:
 *
 *   🔍 Search     split-pane: live TMDB search + cinematic hover preview
 *   🌐 Discover   tabbed: Trending · Top Rated · Stars · Upcoming + genre filter
 *   📚 Library    grid/list: full deduplicated collection across all user lists
 *   🔖 Watchlist  accordion: list progress, expand to see poster grid
 *   ⚙️  Settings   sidebar nav: Account · Appearance · Notifications · Privacy · Data
 */

/* ─────────────────────────────────────────────────────
   CONSTANTS & HELPERS
───────────────────────────────────────────────────── */
const TMDB_KEY = import.meta.env.VITE_TMDB_API_KEY
const TMDB_IMG = (path, size = 'w342') =>
  path ? `https://image.tmdb.org/t/p/${size}${path}` : null
const getYear = (str = '') => str.slice(0, 4)
const tmdbFetch = (endpoint) =>
  fetch(`https://api.themoviedb.org/3${endpoint}${endpoint.includes('?') ? '&' : '?'}api_key=${TMDB_KEY}`)
    .then(r => { if (!r.ok) throw new Error(r.status); return r.json() })

function useDebounce(val, ms = 320) {
  const [dv, setDv] = useState(val)
  useEffect(() => {
    const t = setTimeout(() => setDv(val), ms)
    return () => clearTimeout(t)
  }, [val, ms])
  return dv
}

/* ─────────────────────────────────────────────────────
   SHARED ATOMS
───────────────────────────────────────────────────── */
const Spinner = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox='0 0 24 24' fill='none'
    className='animate-spin text-[#D4AF37] flex-shrink-0'>
    <circle cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='3' className='opacity-20' />
    <path fill='currentColor' className='opacity-80'
      d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z' />
  </svg>
)

const ScoreRing = ({ score }) => {
  const R = 15, C = 2 * Math.PI * R
  const pct = Math.min(Math.max(score / 10, 0), 1)
  const color = score >= 7 ? '#D4AF37' : score >= 5 ? '#F59E0B' : '#EF4444'
  return (
    <svg width='40' height='40' viewBox='0 0 40 40' className='flex-shrink-0'>
      <circle cx='20' cy='20' r={R} fill='none' stroke='#1E1E1E' strokeWidth='3' />
      <circle cx='20' cy='20' r={R} fill='none' stroke={color} strokeWidth='3'
        strokeDasharray={`${C * pct} ${C}`} strokeLinecap='round'
        transform='rotate(-90 20 20)' />
      <text x='20' y='24' textAnchor='middle'
        style={{ fontSize: '10px', fontWeight: 700, fill: color, fontFamily: 'system-ui' }}>
        {score.toFixed(1)}
      </text>
    </svg>
  )
}

const Pill = ({ children, active, gold, onClick, className = '' }) => (
  <button onClick={onClick}
    className={`
      flex-shrink-0 px-3 py-1.5 rounded-full text-[11px] font-bold
      border transition-all duration-150 cursor-pointer
      ${gold || active
        ? 'bg-[#D4AF37] border-[#D4AF37] text-[#0A0A0A]'
        : 'border-white/10 text-white/40 hover:border-white/30 hover:text-white/70'
      } ${className}
    `}>
    {children}
  </button>
)

/* ─────────────────────────────────────────────────────
   PANEL 1 — SEARCH
   Left: debounced TMDB search list + recent history
   Right: cinematic detail preview on hover
───────────────────────────────────────────────────── */
const SearchPanel = () => {
  const [q, setQ] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [hovered, setHovered] = useState(null)
  const [detail, setDetail] = useState(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [recents, setRecents] = useState(() => {
    try { return JSON.parse(localStorage.getItem('flikd_search_recents') || '[]') } catch { return [] }
  })
  const inputRef = useRef(null)
  const dq = useDebounce(q, 360)

  useEffect(() => { requestAnimationFrame(() => inputRef.current?.focus()) }, [])

  /* Live search */
  useEffect(() => {
    if (!dq.trim()) { setResults([]); return }
    let live = true
    setSearching(true)
    tmdbFetch(`/search/multi?query=${encodeURIComponent(dq)}&include_adult=false`)
      .then(d => {
        if (!live) return
        setResults((d.results || []).filter(x => x.media_type !== 'person').slice(0, 14))
      })
      .catch(() => { if (live) setResults([]) })
      .finally(() => { if (live) setSearching(false) })
    return () => { live = false }
  }, [dq])

  /* Detail on hover */
  useEffect(() => {
    if (!hovered) { setDetail(null); return }
    let live = true
    setLoadingDetail(true)
    const ep = hovered.media_type === 'tv'
      ? `/tv/${hovered.id}?append_to_response=credits,similar`
      : `/movie/${hovered.id}?append_to_response=credits,similar`
    tmdbFetch(ep)
      .then(d => { if (live) setDetail(d) })
      .catch(() => {})
      .finally(() => { if (live) setLoadingDetail(false) })
    return () => { live = false }
  }, [hovered?.id])

  const saveRecent = (item) => {
    const next = [item, ...recents.filter(r => r.id !== item.id)].slice(0, 8)
    setRecents(next)
    try { localStorage.setItem('flikd_search_recents', JSON.stringify(next)) } catch {}
  }

  const listItems = q.trim() ? results : recents

  return (
    <div className='flex h-full overflow-hidden'>
      {/* ── Left pane ── */}
      <div className='w-[320px] flex-shrink-0 flex flex-col border-r border-white/[0.04]'>
        {/* Input */}
        <div className='p-4 border-b border-white/[0.04]'>
          <div className='flex items-center gap-3 bg-[#111] rounded-2xl px-4 py-3
            border border-white/[0.06] focus-within:border-[#D4AF37]/50 transition-colors duration-200'>
            <svg className='w-4 h-4 text-white/25 flex-shrink-0' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2}
                d='M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z' />
            </svg>
            <input ref={inputRef} value={q} onChange={e => setQ(e.target.value)}
              placeholder='Films, shows, directors…'
              className='flex-1 bg-transparent text-[13px] text-white outline-none placeholder-white/25 min-w-0' />
            {q && (
              <button onClick={() => { setQ(''); setHovered(null) }}
                className='text-white/25 hover:text-white/60 transition-colors'>
                <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M6 18L18 6M6 6l12 12' />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Section label */}
        {listItems.length > 0 && (
          <div className='px-5 pt-3.5 pb-1.5 flex items-center justify-between'>
            <span className='text-[9px] font-black text-white/25 uppercase tracking-[0.18em]'>
              {q.trim() ? `${results.length} result${results.length !== 1 ? 's' : ''}` : 'Recent'}
            </span>
            {!q.trim() && recents.length > 0 && (
              <button onClick={() => {
                setRecents([])
                try { localStorage.removeItem('flikd_search_recents') } catch {}
              }} className='text-[9px] text-white/25 hover:text-[#D4AF37] transition-colors'>
                Clear
              </button>
            )}
          </div>
        )}

        {/* Results list */}
        <div className='flex-1 overflow-y-auto' style={{ scrollbarWidth: 'thin', scrollbarColor: '#222 transparent' }}>
          {searching && (
            <div className='flex justify-center py-10'><Spinner size={24} /></div>
          )}

          {!searching && listItems.map((item, i) => {
            const title = item.title || item.name
            const year = getYear(item.release_date || item.first_air_date)
            const poster = TMDB_IMG(item.poster_path, 'w92')
            const isActive = hovered?.id === item.id

            return (
              <button key={`${item.id}-${item.media_type}`}
                onMouseEnter={() => setHovered(item)}
                onClick={() => saveRecent(item)}
                className={`
                  w-full flex items-center gap-3 px-4 py-2.5 text-left
                  transition-all duration-100 group border-l-2
                  ${isActive
                    ? 'bg-[#D4AF37]/6 border-[#D4AF37]'
                    : 'border-transparent hover:bg-white/[0.025]'
                  }
                `}>
                {poster
                  ? <img src={poster} alt={title}
                      className='w-8 h-[46px] object-cover rounded-lg flex-shrink-0 ring-1 ring-white/5' />
                  : <div className='w-8 h-[46px] bg-[#181818] rounded-lg flex-shrink-0 flex items-center justify-center'>
                      <svg className='w-3.5 h-3.5 text-white/15' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={1.5}
                          d='M7 4v16M17 4v16M3 12h18' />
                      </svg>
                    </div>
                }
                <div className='flex-1 min-w-0'>
                  <p className={`text-[13px] font-semibold truncate transition-colors
                    ${isActive ? 'text-[#D4AF37]' : 'text-white/80 group-hover:text-white'}`}>
                    {title}
                  </p>
                  <div className='flex items-center gap-1.5 mt-0.5'>
                    <span className='text-[9px] font-black uppercase tracking-wider text-white/25'>
                      {item.media_type === 'tv' ? '📺' : '🎬'}
                    </span>
                    {year && <span className='text-[9px] text-white/20'>· {year}</span>}
                    {item.vote_average > 0 && (
                      <span className='text-[9px] text-[#D4AF37]/60 font-bold ml-0.5'>
                        {item.vote_average.toFixed(1)}★
                      </span>
                    )}
                  </div>
                </div>
                <svg className={`w-3.5 h-3.5 flex-shrink-0 transition-colors
                  ${isActive ? 'text-[#D4AF37]/50' : 'text-white/10 group-hover:text-white/30'}`}
                  fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 5l7 7-7 7' />
                </svg>
              </button>
            )
          })}

          {!searching && !listItems.length && (
            <div className='py-16 text-center px-6'>
              <div className='w-14 h-14 rounded-full border border-white/[0.06] flex items-center justify-center mx-auto mb-3'
                style={{ background: 'radial-gradient(circle, rgba(212,175,55,0.06), transparent)' }}>
                <svg className='w-6 h-6 text-[#D4AF37]/20' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={1.5}
                    d='M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z' />
                </svg>
              </div>
              <p className='text-white/25 text-[13px]'>
                {q.trim() ? `No results for "${q}"` : 'Search any film or series'}
              </p>
              {!q.trim() && <p className='text-white/15 text-[11px] mt-1'>Hover a result to preview</p>}
            </div>
          )}
        </div>
      </div>

      {/* ── Right pane: detail preview ── */}
      <div className='flex-1 overflow-hidden relative bg-[#060606]'>
        {!hovered
          ? <div className='h-full flex items-center justify-center'>
              <div className='text-center'>
                <div className='w-20 h-20 rounded-full border border-[#181818] flex items-center justify-center mx-auto mb-4'
                  style={{ background: 'radial-gradient(circle, rgba(212,175,55,0.04), transparent)' }}>
                  <svg className='w-8 h-8 text-[#D4AF37]/15' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={1}
                      d='M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4' />
                  </svg>
                </div>
                <p className='text-white/20 text-sm'>Hover a result to preview</p>
              </div>
            </div>
          : <SearchDetailPreview item={hovered} detail={detail} loading={loadingDetail} />
        }
      </div>
    </div>
  )
}

const SearchDetailPreview = ({ item, detail, loading }) => {
  const title = item.title || item.name
  const year = getYear(item.release_date || item.first_air_date)
  const backdrop = TMDB_IMG(detail?.backdrop_path || item.backdrop_path, 'w1280')
  const poster = TMDB_IMG(detail?.poster_path || item.poster_path, 'w342')
  const genres = detail?.genres?.map(g => g.name) || []
  const cast = detail?.credits?.cast?.slice(0, 7) || []
  const director = item.media_type === 'tv'
    ? detail?.created_by?.[0]?.name
    : detail?.credits?.crew?.find(c => c.job === 'Director')?.name
  const runtime = detail?.runtime || detail?.episode_run_time?.[0]
  const seasons = detail?.number_of_seasons
  const score = detail?.vote_average || item.vote_average || 0
  const similar = detail?.similar?.results?.slice(0, 5) || []

  return (
    <div key={item.id} className='h-full overflow-y-auto' style={{ scrollbarWidth: 'none' }}>
      {/* Backdrop */}
      <div className='relative h-52 overflow-hidden flex-shrink-0'>
        {backdrop
          ? <img src={backdrop} alt='' className='w-full h-full object-cover'
              style={{ animation: 'bgReveal .35s ease-out' }} />
          : <div className='w-full h-full bg-gradient-to-br from-[#181818] to-[#0A0A0A]' />
        }
        <div className='absolute inset-0'
          style={{ background: 'linear-gradient(to bottom, rgba(6,6,6,.1) 0%, rgba(6,6,6,.65) 65%, #060606 100%)' }} />
        <div className='absolute inset-0'
          style={{ background: 'linear-gradient(to right, rgba(6,6,6,.55) 0%, transparent 55%)' }} />

        {score > 0 && <div className='absolute top-3 right-3'><ScoreRing score={score} /></div>}

        <div className='absolute top-3 left-3 px-2.5 py-1 rounded-full bg-black/50 backdrop-blur-md border border-white/10'>
          <span className='text-[9px] font-black text-white/60 uppercase tracking-widest'>
            {item.media_type === 'tv' ? '📺 Series' : '🎬 Film'}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className='px-5 pb-8 -mt-14 relative z-10'>
        <div className='flex gap-4 mb-5'>
          {poster && (
            <img src={poster} alt={title}
              className='w-[82px] h-[122px] object-cover rounded-xl flex-shrink-0 relative z-10
                ring-2 ring-[#D4AF37]/20 shadow-[0_20px_60px_rgba(0,0,0,.85)]'
              style={{ animation: 'posterReveal .38s cubic-bezier(.34,1.56,.64,1)' }} />
          )}
          <div className='flex-1 min-w-0 pt-10'>
            <h3 className='font-bebas text-[22px] text-white leading-tight tracking-wide mb-1'>{title}</h3>
            <div className='flex flex-wrap items-center gap-1.5 text-[11px]'>
              {year && <span className='text-white/40'>{year}</span>}
              {runtime && <span className='text-white/25'>· {runtime}m</span>}
              {seasons && <span className='text-white/25'>· {seasons}s</span>}
            </div>
          </div>
        </div>

        {loading && (
          <div className='flex justify-center py-8'><Spinner size={24} /></div>
        )}

        {!loading && (
          <>
            {genres.length > 0 && (
              <div className='flex flex-wrap gap-1.5 mb-4'>
                {genres.slice(0, 5).map(g => (
                  <span key={g} className='px-2.5 py-1 rounded-full text-[10px] font-bold
                    border border-[#D4AF37]/20 text-[#D4AF37]/60 bg-[#D4AF37]/5'>
                    {g}
                  </span>
                ))}
              </div>
            )}

            {(detail?.overview || item.overview) && (
              <p className='text-[12px] text-white/45 leading-relaxed mb-4 line-clamp-3'>
                {detail?.overview || item.overview}
              </p>
            )}

            {director && (
              <div className='mb-4 pb-4 border-b border-white/[0.04]'>
                <p className='text-[9px] font-black text-white/20 uppercase tracking-[0.18em] mb-1'>
                  {item.media_type === 'tv' ? 'Created by' : 'Directed by'}
                </p>
                <p className='text-[13px] font-semibold text-white/70'>{director}</p>
              </div>
            )}

            {cast.length > 0 && (
              <div className='mb-4'>
                <p className='text-[9px] font-black text-white/20 uppercase tracking-[0.18em] mb-2.5'>Cast</p>
                <div className='flex gap-2.5 overflow-x-auto pb-1' style={{ scrollbarWidth: 'none' }}>
                  {cast.map(c => (
                    <div key={c.id} className='flex-shrink-0 text-center w-12'>
                      {c.profile_path
                        ? <img src={TMDB_IMG(c.profile_path, 'w45')} alt={c.name}
                            className='w-9 h-9 rounded-full object-cover mx-auto mb-1 ring-1 ring-white/10' />
                        : <div className='w-9 h-9 rounded-full bg-[#1A1A1A] mx-auto mb-1 flex items-center justify-center'>
                            <span className='text-[10px] text-white/30'>{c.name[0]}</span>
                          </div>
                      }
                      <p className='text-[8px] text-white/35 leading-tight line-clamp-2'>{c.name}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {similar.length > 0 && (
              <div>
                <p className='text-[9px] font-black text-white/20 uppercase tracking-[0.18em] mb-2'>More Like This</p>
                <div className='grid grid-cols-5 gap-1.5'>
                  {similar.map(s => (
                    <div key={s.id} className='group/sim cursor-pointer'>
                      {TMDB_IMG(s.poster_path, 'w92')
                        ? <img src={TMDB_IMG(s.poster_path, 'w92')} alt={s.title || s.name}
                            className='w-full h-[58px] object-cover rounded-lg ring-1 ring-white/5
                              group-hover/sim:ring-[#D4AF37]/30 group-hover/sim:scale-105 transition-all duration-200' />
                        : <div className='w-full h-[58px] bg-[#181818] rounded-lg' />
                      }
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────
   PANEL 2 — DISCOVER
   Trending · Top Rated (+ genre filter) · Stars · Upcoming
───────────────────────────────────────────────────── */
const DISCOVER_TABS = [
  { id: 'trending',  label: 'Trending',  icon: '🔥' },
  { id: 'toprated',  label: 'Top Rated', icon: '⭐' },
  { id: 'actors',    label: 'Stars',     icon: '🎭' },
  { id: 'upcoming',  label: 'Upcoming',  icon: '📅' },
  { id: 'mylists',   label: 'My Lists',  icon: '📋' },
]

const GENRES = [
  { id: 28, name: 'Action' }, { id: 35, name: 'Comedy' }, { id: 18, name: 'Drama' },
  { id: 27, name: 'Horror' }, { id: 878, name: 'Sci-Fi' }, { id: 10749, name: 'Romance' },
  { id: 53, name: 'Thriller' }, { id: 16, name: 'Animation' }, { id: 99, name: 'Documentary' },
]

const DiscoverPanel = ({ currentUser }) => {
  const [tab, setTab] = useState('trending')
  const [cache, setCache] = useState({})
  const [loading, setLoading] = useState({})
  const [genre, setGenre] = useState(null)
  const [hoverId, setHoverId] = useState(null)

  // My Lists state
  const [userLists,      setUserLists]      = useState([])
  const [loadingLists,   setLoadingLists]   = useState(false)
  const [expandedList,   setExpandedList]   = useState(null)
  const [listItemsCache, setListItemsCache] = useState({})
  const [loadingListRow, setLoadingListRow] = useState({})

  const load = useCallback(async (t) => {
    if (cache[t]) return
    setLoading(p => ({ ...p, [t]: true }))
    const endpoints = {
      trending: '/trending/all/week',
      toprated: '/movie/top_rated',
      actors:   '/person/popular',
      upcoming: '/movie/upcoming',
    }
    try {
      const d = await tmdbFetch(endpoints[t])
      setCache(p => ({ ...p, [t]: (d.results || []).slice(0, 20) }))
    } catch {}
    setLoading(p => ({ ...p, [t]: false }))
  }, [cache])

  useEffect(() => {
    if (tab !== 'mylists') { load(tab); return }
    if (!currentUser?.id || userLists.length > 0) return
    setLoadingLists(true)
    const normalize = (d) => d.map(l => ({
      id: l.list_id ?? l.id,
      name: l.name,
      description: l.description,
      isPublic: l.is_public,
      total: Number(l.item_count ?? l.list_items?.length) || 0,
      done: Number(l.completed_count ?? l.list_items?.filter(i => i.is_completed).length) || 0,
    }))
    supabase.rpc('get_user_lists_with_counts', { target_user_id: currentUser.id })
      .then(({ data, error }) => {
        if (!error && data) { setUserLists(normalize(data)); return }
        return supabase.from('lists')
          .select('*, list_items(id, is_completed)')
          .eq('user_id', currentUser.id)
          .is('deleted_at', null)
          .order('updated_at', { ascending: false })
          .then(({ data: d }) => { if (d) setUserLists(normalize(d)) })
      })
      .catch(() => {})
      .finally(() => setLoadingLists(false))
  }, [tab, currentUser?.id])

  const openListItems = async (id) => {
    if (listItemsCache[id]) return
    setLoadingListRow(p => ({ ...p, [id]: true }))
    const { data } = await supabase.from('list_items').select('*')
      .eq('list_id', id).order('position', { ascending: true, nullsFirst: false })
    setListItemsCache(p => ({ ...p, [id]: data || [] }))
    setLoadingListRow(p => ({ ...p, [id]: false }))
  }

  const toggleList = (id) => {
    const next = expandedList === id ? null : id
    setExpandedList(next)
    if (next) openListItems(next)
  }

  const raw = cache[tab] || []
  const filtered = (tab === 'toprated' && genre)
    ? raw.filter(i => i.genre_ids?.includes(genre))
    : raw

  return (
    <div className='h-full flex flex-col'>
      {/* Tab bar */}
      <div className='flex px-5 pt-1 border-b border-white/[0.04] flex-shrink-0 overflow-x-auto' style={{ scrollbarWidth: 'none' }}>
        {DISCOVER_TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-3 text-[12px] font-bold whitespace-nowrap
              border-b-2 -mb-px transition-all ${tab === t.id
                ? 'text-[#D4AF37] border-[#D4AF37]'
                : 'text-white/30 border-transparent hover:text-white/55'
              }`}>
            <span>{t.icon}</span><span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* Genre chips — only on Top Rated */}
      {tab === 'toprated' && (
        <div className='flex gap-1.5 px-5 py-2.5 border-b border-white/[0.04] overflow-x-auto flex-shrink-0'
          style={{ scrollbarWidth: 'none' }}>
          <Pill active={!genre} onClick={() => setGenre(null)}>All</Pill>
          {GENRES.map(g => (
            <Pill key={g.id} active={genre === g.id}
              onClick={() => setGenre(genre === g.id ? null : g.id)}>
              {g.name}
            </Pill>
          ))}
        </div>
      )}

      {/* Content */}
      <div className='flex-1 overflow-y-auto px-5 py-4'
        style={{ scrollbarWidth: 'thin', scrollbarColor: '#222 transparent' }}>

        {/* ── My Lists tab ── */}
        {tab === 'mylists' && (
          loadingLists
            ? <div className='flex justify-center py-20'><Spinner size={32} /></div>
            : !currentUser?.id
              ? <div className='py-20 text-center'>
                  <p className='text-white/25 text-sm'>Sign in to see your lists</p>
                </div>
              : userLists.length === 0
                ? <div className='py-20 text-center'>
                    <div className='w-16 h-16 rounded-full border border-white/[0.06] flex items-center justify-center mx-auto mb-4'
                      style={{ background: 'radial-gradient(circle, rgba(212,175,55,0.06), transparent)' }}>
                      <svg className='w-7 h-7 text-[#D4AF37]/20' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={1.5}
                          d='M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' />
                      </svg>
                    </div>
                    <p className='text-white/25 text-sm'>No lists yet</p>
                    <p className='text-white/15 text-xs mt-1'>Create lists from the home feed to see them here</p>
                  </div>
                : <div className='space-y-3'>
                    {/* Summary strip */}
                    <div className='flex items-center gap-5 pb-3 border-b border-white/[0.04] mb-1'>
                      {[
                        ['Lists', userLists.length],
                        ['Films & Shows', userLists.reduce((s, l) => s + l.total, 0)],
                        ['Watched', userLists.reduce((s, l) => s + l.done, 0)],
                      ].map(([k, v]) => (
                        <div key={k}>
                          <p className='font-bebas text-xl text-[#D4AF37] leading-none tabular-nums'>{v}</p>
                          <p className='text-[9px] text-white/25 uppercase tracking-wider'>{k}</p>
                        </div>
                      ))}
                    </div>

                    {userLists.map((list, i) => {
                      const pct    = list.total ? Math.round((list.done / list.total) * 100) : 0
                      const isFull = pct === 100 && list.total > 0
                      const isOpen = expandedList === list.id
                      const items  = listItemsCache[list.id] || []

                      return (
                        <div key={list.id}
                          className={`rounded-2xl border overflow-hidden transition-all duration-200 ${
                            isFull ? 'border-[#D4AF37]/20' : 'border-white/[0.05]'
                          }`}
                          style={{ animation: `cardReveal .22s ease-out ${i * 0.04}s both` }}>

                          {/* List header row */}
                          <button onClick={() => toggleList(list.id)}
                            className='w-full flex items-center gap-3 px-4 py-3.5 hover:bg-white/[0.025] transition-colors text-left'>
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                              isFull ? 'bg-[#D4AF37]/15' : 'bg-[#141414]'
                            }`}>
                              {isFull
                                ? <svg className='w-4 h-4 text-[#D4AF37]' fill='currentColor' viewBox='0 0 20 20'>
                                    <path fillRule='evenodd' clipRule='evenodd'
                                      d='M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z' />
                                  </svg>
                                : <svg className='w-4 h-4 text-white/25' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2}
                                      d='M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' />
                                  </svg>
                              }
                            </div>

                            <div className='flex-1 min-w-0'>
                              <div className='flex items-center gap-2 mb-1.5'>
                                <span className='text-[13px] font-bold text-white/85 truncate'>{list.name}</span>
                                {list.isPublic && (
                                  <span className='text-[8px] font-black text-blue-400/60 uppercase tracking-wider flex-shrink-0'>Public</span>
                                )}
                                {isFull && <span className='text-[#D4AF37] text-xs ml-auto flex-shrink-0'>✓ Complete</span>}
                              </div>
                              <div className='flex items-center gap-2'>
                                <div className='flex-1 h-1.5 bg-[#1A1A1A] rounded-full overflow-hidden'>
                                  <div className={`h-full rounded-full transition-all duration-700 ${
                                    isFull ? 'bg-gradient-to-r from-[#D4AF37] to-[#F0C93A]' : 'bg-[#D4AF37]/55'
                                  }`} style={{ width: `${pct}%` }} />
                                </div>
                                <span className='text-[10px] text-white/25 tabular-nums flex-shrink-0'>
                                  {list.done}/{list.total}
                                </span>
                              </div>
                            </div>

                            <svg className={`w-4 h-4 text-white/20 flex-shrink-0 transition-transform duration-200 ${
                              isOpen ? 'rotate-180' : ''
                            }`} fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M19 9l-7 7-7-7' />
                            </svg>
                          </button>

                          {/* Expanded: poster scroll strip */}
                          {isOpen && (
                            <div className='border-t border-white/[0.04] bg-[#070707] px-4 py-3'>
                              {loadingListRow[list.id]
                                ? <div className='flex justify-center py-5'><Spinner /></div>
                                : items.length === 0
                                  ? <p className='text-center text-white/20 text-xs py-4'>This list is empty</p>
                                  : <>
                                      {/* Horizontal poster strip */}
                                      <div className='flex gap-2 overflow-x-auto pb-2' style={{ scrollbarWidth: 'thin', scrollbarColor: '#1A1A1A transparent' }}>
                                        {items.map(item => {
                                          const p = TMDB_IMG(item.poster_path, 'w154')
                                          return (
                                            <div key={item.id}
                                              className={`relative rounded-xl overflow-hidden flex-shrink-0 border transition-all duration-200 group/card
                                                hover:border-[#D4AF37]/30 hover:scale-[1.03] ${
                                                item.is_completed ? 'border-[#D4AF37]/20' : 'border-white/[0.05]'
                                              }`}
                                              style={{ width: '80px' }}>
                                              {p
                                                ? <img src={p} alt={item.title} className='w-full h-[112px] object-cover' />
                                                : <div className='w-full h-[112px] bg-[#181818] flex items-center justify-center'>
                                                    <svg className='w-5 h-5 text-white/10' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                                                      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={1.5} d='M7 4v16M17 4v16M3 12h18' />
                                                    </svg>
                                                  </div>
                                              }
                                              {item.is_completed && (
                                                <div className='absolute top-1.5 right-1.5 w-4 h-4 bg-[#D4AF37] rounded-full flex items-center justify-center shadow-lg'>
                                                  <svg className='w-2.5 h-2.5 text-[#0A0A0A]' fill='currentColor' viewBox='0 0 20 20'>
                                                    <path fillRule='evenodd' clipRule='evenodd'
                                                      d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z' />
                                                  </svg>
                                                </div>
                                              )}
                                              <div className='absolute inset-0 bg-gradient-to-t from-black/80 to-transparent' />
                                              <p className='absolute bottom-0 left-0 right-0 px-1.5 py-1 text-[8px] text-white font-semibold leading-tight line-clamp-2'>
                                                {item.title}
                                              </p>
                                            </div>
                                          )
                                        })}
                                      </div>
                                      {list.description && (
                                        <p className='text-[10px] text-white/20 italic mt-2 pt-2 border-t border-white/[0.04]'>
                                          {list.description}
                                        </p>
                                      )}
                                    </>
                              }
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
        )}

        {/* ── All other tabs ── */}
        {tab !== 'mylists' && (
          loading[tab]
            ? <div className='flex justify-center py-20'><Spinner size={32} /></div>
            : tab === 'actors'
              ? <ActorGrid actors={raw} />
              : <>
                  {filtered[0] && <DiscoverHero item={filtered[0]} />}
                  <div className='grid grid-cols-3 xl:grid-cols-4 gap-2.5 mt-4'>
                    {filtered.slice(1).map((item, i) => (
                      <DiscoverCard key={item.id} item={item} rank={i + 2}
                        hovered={hoverId === item.id} onHover={setHoverId} />
                    ))}
                  </div>
                </>
        )}
      </div>
    </div>
  )
}

const DiscoverHero = ({ item }) => {
  const title = item.title || item.name
  const year = getYear(item.release_date || item.first_air_date)
  const bg = TMDB_IMG(item.backdrop_path, 'w1280')
  return (
    <div className='relative rounded-2xl overflow-hidden h-48 cursor-pointer group'
      style={{ animation: 'cardReveal .28s ease-out' }}>
      {bg
        ? <img src={bg} alt={title}
            className='w-full h-full object-cover group-hover:scale-105 transition-transform duration-700' />
        : <div className='w-full h-full bg-gradient-to-br from-[#1A1A1A] to-[#0A0A0A]' />
      }
      <div className='absolute inset-0'
        style={{ background: 'linear-gradient(to top, rgba(8,8,8,.95) 0%, rgba(8,8,8,.3) 50%, transparent 100%)' }} />
      <div className='absolute bottom-0 left-0 right-0 p-4'>
        <span className='text-[9px] font-black text-[#D4AF37] uppercase tracking-wider'>
          #1 · {item.media_type === 'tv' ? 'Series' : 'Film'}
        </span>
        <h3 className='font-bebas text-[24px] text-white leading-tight mt-0.5'>{title}</h3>
        <div className='flex items-center gap-2 mt-1'>
          {year && <span className='text-white/45 text-xs'>{year}</span>}
          {item.vote_average > 0 && (
            <span className='text-[#D4AF37]/80 text-xs font-bold'>{item.vote_average.toFixed(1)}★</span>
          )}
          {item.overview && (
            <p className='text-white/30 text-[11px] line-clamp-1 flex-1 ml-1'>{item.overview}</p>
          )}
        </div>
      </div>
    </div>
  )
}

const DiscoverCard = ({ item, rank, hovered, onHover }) => {
  const title = item.title || item.name
  const year = getYear(item.release_date || item.first_air_date)
  const poster = TMDB_IMG(item.poster_path)
  return (
    <div onMouseEnter={() => onHover(item.id)} onMouseLeave={() => onHover(null)}
      className={`group relative rounded-xl overflow-hidden cursor-pointer border transition-all duration-200 ${
        hovered
          ? 'border-[#D4AF37]/40 scale-[1.03] shadow-lg shadow-[#D4AF37]/10'
          : 'border-white/[0.04] hover:border-white/10'
      }`}
      style={{ animation: `cardReveal .28s ease-out ${Math.min((rank - 2) * 0.025, 0.4)}s both` }}>
      {poster
        ? <img src={poster} alt={title}
            className='w-full h-40 object-cover transition-transform duration-500 group-hover:scale-105' />
        : <div className='w-full h-40 bg-[#181818]' />
      }
      <div className='absolute top-2 left-2 w-6 h-6 rounded-full bg-black/70 flex items-center justify-center'>
        <span className='text-[9px] font-black text-white/50'>{rank}</span>
      </div>
      {hovered && item.vote_average > 0 && (
        <div className='absolute top-2 right-2' style={{ animation: 'fadeIn .15s ease-out' }}>
          <ScoreRing score={item.vote_average} />
        </div>
      )}
      <div className='absolute inset-0'
        style={{ background: 'linear-gradient(to top, rgba(8,8,8,.92) 0%, transparent 50%)' }} />
      <div className='absolute bottom-0 p-2'>
        <p className='text-[11px] font-bold text-white line-clamp-1'>{title}</p>
        <p className='text-[9px] text-white/35'>
          {year}{item.vote_average > 0 ? ` · ${item.vote_average.toFixed(1)}★` : ''}
        </p>
      </div>
    </div>
  )
}

const ActorGrid = ({ actors }) => (
  <div className='grid grid-cols-3 xl:grid-cols-4 gap-2.5'>
    {actors.map((a, i) => (
      <div key={a.id}
        className='group relative rounded-xl overflow-hidden cursor-pointer border border-white/[0.04] hover:border-[#D4AF37]/30 transition-all duration-200'
        style={{ animation: `cardReveal .28s ease-out ${Math.min(i * 0.025, 0.45)}s both` }}>
        {TMDB_IMG(a.profile_path, 'w342')
          ? <img src={TMDB_IMG(a.profile_path, 'w342')} alt={a.name}
              className='w-full h-40 object-cover object-top group-hover:scale-105 transition-transform duration-500' />
          : <div className='w-full h-40 bg-[#181818] flex items-center justify-center'>
              <svg className='w-10 h-10 text-white/10' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={1.5}
                  d='M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' />
              </svg>
            </div>
        }
        {/* Known-for hover overlay */}
        <div className='absolute inset-0 bg-[#090909]/92 opacity-0 group-hover:opacity-100
          transition-opacity duration-200 flex flex-col justify-center items-center text-center p-3'>
          <p className='text-[11px] font-black text-[#D4AF37] mb-2'>{a.name}</p>
          <p className='text-[10px] text-white/50 leading-snug'>
            {a.known_for?.slice(0, 3).map(k => k.title || k.name).filter(Boolean).join(' · ') || '—'}
          </p>
        </div>
        <div className='absolute inset-0'
          style={{ background: 'linear-gradient(to top, rgba(8,8,8,.92) 0%, transparent 45%)' }} />
        <div className='absolute bottom-0 left-0 right-0 p-2'>
          <p className='text-[11px] font-bold text-white truncate'>{a.name}</p>
          <p className='text-[9px] text-white/30'>{a.known_for_department}</p>
        </div>
      </div>
    ))}
  </div>
)

/* ─────────────────────────────────────────────────────
   PANEL 3 — MY LIBRARY
   Deduped collection across all user lists
   Grid & list view, filter tabs, sort, search
───────────────────────────────────────────────────── */
const LibraryPanel = ({ currentUser }) => {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('grid')        // grid | list
  const [filter, setFilter] = useState('all')     // all | movies | shows | watched | queued
  const [sort, setSort] = useState('recent')      // recent | title | watched
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (!currentUser?.id) return
    let live = true
    setLoading(true)
    supabase
      .from('list_items')
      .select('*, lists!inner(user_id, name)')
      .eq('lists.user_id', currentUser.id)
      .order('added_at', { ascending: false })
      .then(({ data }) => {
        if (!live) return
        const seen = new Set()
        const deduped = (data || []).filter(i => {
          const k = `${i.tmdb_id}-${i.media_type}`
          if (seen.has(k)) return false
          seen.add(k); return true
        })
        setItems(deduped)
      })
      .catch(() => {})
      .finally(() => { if (live) setLoading(false) })
    return () => { live = false }
  }, [currentUser?.id])

  const stats = useMemo(() => ({
    total:   items.length,
    movies:  items.filter(i => i.media_type !== 'tv').length,
    shows:   items.filter(i => i.media_type === 'tv').length,
    watched: items.filter(i => i.is_completed).length,
  }), [items])

  const filtered = useMemo(() => {
    let r = [...items]
    if (filter === 'movies')  r = r.filter(i => i.media_type !== 'tv')
    if (filter === 'shows')   r = r.filter(i => i.media_type === 'tv')
    if (filter === 'watched') r = r.filter(i => i.is_completed)
    if (filter === 'queued')  r = r.filter(i => !i.is_completed)
    if (search.trim()) r = r.filter(i => i.title?.toLowerCase().includes(search.toLowerCase()))
    if (sort === 'title')   r = r.sort((a, b) => a.title.localeCompare(b.title))
    if (sort === 'watched') r = r.sort((a, b) => (b.is_completed ? 1 : 0) - (a.is_completed ? 1 : 0))
    return r
  }, [items, filter, sort, search])

  const FILTER_OPTS = [
    { id: 'all', label: 'All' }, { id: 'movies', label: '🎬 Films' },
    { id: 'shows', label: '📺 Series' }, { id: 'watched', label: 'Watched' },
    { id: 'queued', label: 'Queued' },
  ]

  return (
    <div className='h-full flex flex-col'>
      {/* Stats bar */}
      <div className='px-5 py-3 border-b border-white/[0.04] flex items-center justify-between gap-4 flex-shrink-0'>
        <div className='flex items-center gap-5'>
          {[['Total', stats.total], ['Films', stats.movies], ['Series', stats.shows], ['Watched', stats.watched]].map(([k, v]) => (
            <div key={k} className='text-center'>
              <p className='font-bebas text-xl text-[#D4AF37] leading-none tabular-nums'>{v}</p>
              <p className='text-[9px] text-white/25 uppercase tracking-wider'>{k}</p>
            </div>
          ))}
        </div>
        <div className='flex items-center gap-2'>
          {/* Search input */}
          <div className='flex items-center gap-2 bg-[#111] border border-white/[0.06] rounded-xl px-3 py-1.5
            focus-within:border-[#D4AF37]/30 transition-colors'>
            <svg className='w-3 h-3 text-white/25' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2}
                d='M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z' />
            </svg>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder='Filter…'
              className='bg-transparent text-[11px] text-white outline-none w-24 placeholder-white/20' />
          </div>
          {/* View toggle */}
          <div className='flex rounded-xl overflow-hidden border border-white/[0.06]'>
            {[
              ['grid', 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z'],
              ['list', 'M4 6h16M4 10h16M4 14h16M4 18h16'],
            ].map(([v, d]) => (
              <button key={v} onClick={() => setView(v)}
                className={`p-2 transition-colors ${
                  view === v ? 'bg-[#D4AF37]/15 text-[#D4AF37]' : 'bg-[#0E0E0E] text-white/25 hover:text-white/55'
                }`}>
                <svg className='w-3.5 h-3.5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d={d} />
                </svg>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Filter + sort */}
      <div className='px-5 py-2 border-b border-white/[0.04] flex items-center justify-between gap-3 flex-shrink-0'>
        <div className='flex gap-1.5 overflow-x-auto' style={{ scrollbarWidth: 'none' }}>
          {FILTER_OPTS.map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[11px] font-bold transition-all ${
                filter === f.id
                  ? 'bg-[#D4AF37] text-[#0A0A0A]'
                  : 'bg-[#111] text-white/35 hover:text-white/65 border border-white/[0.05]'
              }`}>
              {f.label}
            </button>
          ))}
        </div>
        <select value={sort} onChange={e => setSort(e.target.value)}
          className='bg-[#111] border border-white/[0.06] text-white/40 text-[11px] rounded-lg px-2 py-1.5
            outline-none flex-shrink-0 cursor-pointer'>
          <option value='recent'>Recent</option>
          <option value='title'>A–Z</option>
          <option value='watched'>Watched first</option>
        </select>
      </div>

      {/* Content */}
      <div className='flex-1 overflow-y-auto px-5 py-4'
        style={{ scrollbarWidth: 'thin', scrollbarColor: '#222 transparent' }}>
        {loading
          ? <div className='flex justify-center py-20'><Spinner size={32} /></div>
          : filtered.length === 0
            ? <div className='py-20 text-center'>
                <p className='text-white/20 text-sm'>
                  {search ? `No results for "${search}"` : 'No titles found'}
                </p>
              </div>
            : view === 'grid'
              ? <div className='grid grid-cols-4 xl:grid-cols-5 gap-2'>
                  {filtered.map((item, i) => <LibraryCard key={item.id} item={item} index={i} />)}
                </div>
              : <div className='space-y-0.5'>
                  {filtered.map((item, i) => <LibraryRow key={item.id} item={item} index={i} />)}
                </div>
        }
      </div>
    </div>
  )
}

const LibraryCard = ({ item, index }) => {
  const poster = TMDB_IMG(item.poster_path)
  return (
    <div className={`group relative rounded-xl overflow-hidden border cursor-pointer transition-all duration-200 ${
      item.is_completed ? 'border-[#D4AF37]/20' : 'border-white/[0.04] hover:border-white/10'
    }`}
    style={{ animation: `cardReveal .22s ease-out ${Math.min(index * 0.012, 0.4)}s both` }}>
      {poster
        ? <img src={poster} alt={item.title}
            className='w-full h-36 object-cover group-hover:scale-105 transition-transform duration-500' />
        : <div className='w-full h-36 bg-[#181818]' />
      }
      {item.is_completed && (
        <div className='absolute top-1.5 right-1.5 w-5 h-5 bg-[#D4AF37] rounded-full flex items-center justify-center shadow-lg'>
          <svg className='w-3 h-3 text-[#0A0A0A]' fill='currentColor' viewBox='0 0 20 20'>
            <path fillRule='evenodd' clipRule='evenodd'
              d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z' />
          </svg>
        </div>
      )}
      <div className='absolute inset-0'
        style={{ background: 'linear-gradient(to top, rgba(8,8,8,.88) 0%, transparent 55%)' }} />
      <div className='absolute bottom-0 left-0 right-0 p-2'>
        <p className='text-[10px] font-bold text-white line-clamp-1'>{item.title}</p>
        <p className='text-[8px] text-white/30'>{item.media_type === 'tv' ? '📺' : '🎬'} {item.lists?.name}</p>
      </div>
    </div>
  )
}

const LibraryRow = ({ item, index }) => {
  const poster = TMDB_IMG(item.poster_path, 'w92')
  return (
    <div className='flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/[0.025] transition-colors cursor-pointer group'
      style={{ animation: `cardReveal .18s ease-out ${Math.min(index * 0.01, 0.3)}s both` }}>
      {poster
        ? <img src={poster} alt={item.title}
            className='w-8 h-11 object-cover rounded-lg flex-shrink-0 ring-1 ring-white/5' />
        : <div className='w-8 h-11 bg-[#181818] rounded-lg flex-shrink-0' />
      }
      <div className='flex-1 min-w-0'>
        <p className='text-[13px] font-semibold text-white/80 group-hover:text-white transition-colors truncate'>
          {item.title}
        </p>
        <p className='text-[10px] text-white/30'>
          {item.media_type === 'tv' ? '📺 Series' : '🎬 Film'} · {item.lists?.name}
        </p>
      </div>
      {item.is_completed
        ? <span className='flex-shrink-0 px-2 py-0.5 bg-[#D4AF37]/10 border border-[#D4AF37]/20 rounded-full text-[9px] font-black text-[#D4AF37]'>
            Watched
          </span>
        : <span className='flex-shrink-0 px-2 py-0.5 bg-white/[0.04] border border-white/[0.06] rounded-full text-[9px] font-black text-white/25'>
            Queued
          </span>
      }
    </div>
  )
}

/* ─────────────────────────────────────────────────────
   PANEL 4 — WATCHLIST
   Accordion per list: progress bar, expand → poster mini-grid
───────────────────────────────────────────────────── */
const WatchlistPanel = ({ currentUser }) => {
  const [lists, setLists] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('active')     // active | done
  const [expanded, setExpanded] = useState(null)
  const [listItems, setListItems] = useState({})
  const [loadingItem, setLoadingItem] = useState({})

  useEffect(() => {
    if (!currentUser?.id) return
    let live = true
    setLoading(true)
    const normalize = (d) => d.map(l => ({
      id: l.list_id ?? l.id,
      name: l.name,
      description: l.description,
      isPublic: l.is_public,
      isCollab: l.is_collaborative,
      total: Number(l.item_count ?? l.list_items?.length) || 0,
      done: Number(l.completed_count ?? l.list_items?.filter(i => i.is_completed).length) || 0,
    }))

    supabase.rpc('get_user_lists_with_counts', { target_user_id: currentUser.id })
      .then(({ data, error }) => {
        if (!live) return
        if (!error && data) { setLists(normalize(data)); return }
        return supabase.from('lists')
          .select('*, list_items(id, is_completed)')
          .eq('user_id', currentUser.id)
          .is('deleted_at', null)
          .order('updated_at', { ascending: false })
          .then(({ data: d }) => { if (live && d) setLists(normalize(d)) })
      })
      .catch(() => {})
      .finally(() => { if (live) setLoading(false) })
    return () => { live = false }
  }, [currentUser?.id])

  const openList = async (id) => {
    if (listItems[id]) return
    setLoadingItem(p => ({ ...p, [id]: true }))
    const { data } = await supabase.from('list_items').select('*')
      .eq('list_id', id).order('position', { ascending: true, nullsFirst: false })
    setListItems(p => ({ ...p, [id]: data || [] }))
    setLoadingItem(p => ({ ...p, [id]: false }))
  }

  const toggle = (id) => {
    const next = expanded === id ? null : id
    setExpanded(next)
    if (next) openList(next)
  }

  const active = lists.filter(l => l.done < l.total || l.total === 0)
  const done   = lists.filter(l => l.total > 0 && l.done >= l.total)
  const shown  = tab === 'active' ? active : done

  const totalWatched = lists.reduce((s, l) => s + l.done, 0)

  return (
    <div className='h-full flex flex-col'>
      {/* Summary */}
      <div className='px-5 py-3 border-b border-white/[0.04] flex items-center gap-6 flex-shrink-0'>
        {[['Lists', lists.length], ['In Progress', active.length], ['Complete', done.length], ['Watched', totalWatched]].map(([k, v]) => (
          <div key={k}>
            <p className='font-bebas text-xl text-[#D4AF37] leading-none tabular-nums'>{v}</p>
            <p className='text-[9px] text-white/25 uppercase tracking-wider'>{k}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className='flex border-b border-white/[0.04] flex-shrink-0'>
        {[['active', 'In Progress', active.length], ['done', 'Completed', done.length]].map(([id, label, count]) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex-1 py-3 text-[12px] font-bold border-b-2 -mb-px transition-all ${
              tab === id ? 'text-[#D4AF37] border-[#D4AF37]' : 'text-white/30 border-transparent hover:text-white/55'
            }`}>
            {label} <span className='ml-1 opacity-50'>({count})</span>
          </button>
        ))}
      </div>

      {/* Accordion */}
      <div className='flex-1 overflow-y-auto px-5 py-3 space-y-2'
        style={{ scrollbarWidth: 'thin', scrollbarColor: '#222 transparent' }}>
        {loading
          ? <div className='flex justify-center py-20'><Spinner size={32} /></div>
          : shown.length === 0
            ? <div className='py-20 text-center'>
                <p className='text-white/20 text-sm'>No {tab === 'active' ? 'active' : 'completed'} lists</p>
              </div>
            : shown.map((list, i) => {
                const pct    = list.total ? Math.round((list.done / list.total) * 100) : 0
                const isFull = pct === 100 && list.total > 0
                const isOpen = expanded === list.id
                const items  = listItems[list.id] || []

                return (
                  <div key={list.id}
                    className={`rounded-2xl border overflow-hidden transition-all duration-200 ${
                      isFull ? 'border-[#D4AF37]/20' : 'border-white/[0.05]'
                    }`}
                    style={{ animation: `cardReveal .22s ease-out ${i * 0.04}s both` }}>

                    {/* Row header */}
                    <button onClick={() => toggle(list.id)}
                      className='w-full flex items-center gap-3 px-4 py-3.5 hover:bg-white/[0.02] transition-colors text-left'>
                      {/* Icon */}
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        isFull ? 'bg-[#D4AF37]/15' : 'bg-[#141414]'
                      }`}>
                        {isFull
                          ? <svg className='w-4 h-4 text-[#D4AF37]' fill='currentColor' viewBox='0 0 20 20'>
                              <path fillRule='evenodd' clipRule='evenodd'
                                d='M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z' />
                            </svg>
                          : <svg className='w-4 h-4 text-white/25' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2}
                                d='M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' />
                            </svg>
                        }
                      </div>

                      <div className='flex-1 min-w-0'>
                        <div className='flex items-center gap-1.5 mb-1.5'>
                          <span className='text-[13px] font-bold text-white/80 truncate'>{list.name}</span>
                          {list.isPublic && (
                            <span className='text-[8px] font-black text-blue-400/60 uppercase tracking-wider'>pub</span>
                          )}
                          {list.isCollab && (
                            <span className='text-[8px] font-black text-purple-400/60 uppercase tracking-wider'>collab</span>
                          )}
                        </div>
                        <div className='flex items-center gap-2'>
                          <div className='flex-1 h-1.5 bg-[#1A1A1A] rounded-full overflow-hidden'>
                            <div className={`h-full rounded-full transition-all duration-700 ${
                              isFull
                                ? 'bg-gradient-to-r from-[#D4AF37] to-[#F0C93A]'
                                : 'bg-[#D4AF37]/55'
                            }`} style={{ width: `${pct}%` }} />
                          </div>
                          <span className='text-[10px] text-white/25 tabular-nums flex-shrink-0'>
                            {list.done}/{list.total}
                          </span>
                        </div>
                      </div>

                      <svg className={`w-4 h-4 text-white/20 flex-shrink-0 transition-transform duration-200 ${
                        isOpen ? 'rotate-180' : ''
                      }`} fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M19 9l-7 7-7-7' />
                      </svg>
                    </button>

                    {/* Expanded poster grid */}
                    {isOpen && (
                      <div className='border-t border-white/[0.04] bg-[#070707] px-4 py-3'>
                        {loadingItem[list.id]
                          ? <div className='flex justify-center py-5'><Spinner /></div>
                          : items.length === 0
                            ? <p className='text-center text-white/20 text-xs py-4'>Empty list</p>
                            : <>
                                <div className='grid grid-cols-4 gap-1.5'>
                                  {items.slice(0, 8).map(item => {
                                    const p = TMDB_IMG(item.poster_path, 'w92')
                                    return (
                                      <div key={item.id} className={`relative rounded-lg overflow-hidden border ${
                                        item.is_completed ? 'border-[#D4AF37]/20' : 'border-white/[0.04]'
                                      }`}>
                                        {p
                                          ? <img src={p} alt={item.title} className='w-full h-16 object-cover' />
                                          : <div className='w-full h-16 bg-[#181818]' />
                                        }
                                        {item.is_completed && (
                                          <div className='absolute top-1 right-1 w-4 h-4 bg-[#D4AF37] rounded-full flex items-center justify-center'>
                                            <svg className='w-2.5 h-2.5 text-[#0A0A0A]' fill='currentColor' viewBox='0 0 20 20'>
                                              <path fillRule='evenodd' clipRule='evenodd'
                                                d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z' />
                                            </svg>
                                          </div>
                                        )}
                                        <div className='absolute inset-0 bg-gradient-to-t from-black/60 to-transparent' />
                                        <p className='absolute bottom-0 left-0 right-0 px-1 py-0.5 text-[7px] text-white font-bold truncate'>
                                          {item.title}
                                        </p>
                                      </div>
                                    )
                                  })}
                                  {items.length > 8 && (
                                    <div className='rounded-lg border border-white/[0.04] bg-[#0E0E0E] flex items-center justify-center h-16'>
                                      <span className='text-[10px] text-white/25'>+{items.length - 8}</span>
                                    </div>
                                  )}
                                </div>
                                {list.description && (
                                  <p className='text-[10px] text-white/20 italic mt-2 pt-2 border-t border-white/[0.04]'>
                                    {list.description}
                                  </p>
                                )}
                              </>
                        }
                      </div>
                    )}
                  </div>
                )
              })
        }
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────
   PANEL 5 — SETTINGS
   Sidebar sections: Account · Appearance · Notifications · Privacy · Data · Danger
───────────────────────────────────────────────────── */
const SettingsPanel = ({ currentUser }) => {
  const [section, setSection] = useState('account')
  const [saving, setSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState('idle') // idle | saved | error

  const [form, setForm] = useState({
    displayName: currentUser?.displayName || '',
    bio:         currentUser?.bio         || '',
    email:       currentUser?.email       || '',
    username:    currentUser?.username    || '',
  })

  const [toggles, setToggles] = useState({
    compactFeed: false, showBackdrops: true, animations: true, darkMode: true,
    reviewLikes: true, listCollabs: true, newFollowers: true, pointsEarned: true, weeklyDigest: false,
    publicProfile: true, showLists: true, showActivity: true, allowDMs: true,
  })

  const setT = (k) => setToggles(p => ({ ...p, [k]: !p[k] }))

  const save = async () => {
    setSaving(true)
    try {
      if (section === 'account' && currentUser?.id) {
        const { error } = await supabase.from('profiles').update({
          display_name: form.displayName.trim(),
          bio: form.bio.trim(),
        }).eq('id', currentUser.id)
        if (error) throw error
      }
      setSaveStatus('saved')
    } catch {
      setSaveStatus('error')
    }
    setSaving(false)
    setTimeout(() => setSaveStatus('idle'), 2600)
  }

  const SECTIONS = [
    { id: 'account',       label: 'Account',        icon: '👤' },
    { id: 'appearance',    label: 'Appearance',     icon: '🎨' },
    { id: 'notifications', label: 'Notifications',  icon: '🔔' },
    { id: 'privacy',       label: 'Privacy',        icon: '🔒' },
    { id: 'data',          label: 'Data & Export',  icon: '📦' },
    { id: 'danger',        label: 'Danger Zone',    icon: '⚠️' },
  ]

  const Toggle = ({ k, label, desc }) => (
    <div className='flex items-center justify-between py-3.5 border-b border-white/[0.03]'>
      <div className='flex-1 mr-4 min-w-0'>
        <p className='text-[13px] font-semibold text-white/80'>{label}</p>
        {desc && <p className='text-[11px] text-white/30 mt-0.5 leading-snug'>{desc}</p>}
      </div>
      <button onClick={() => setT(k)}
        className={`relative flex-shrink-0 w-11 h-6 rounded-full transition-colors duration-200 ${
          toggles[k] ? 'bg-[#D4AF37]' : 'bg-[#1E1E1E] border border-white/[0.08]'
        }`}>
        <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-all duration-200 ${
          toggles[k] ? 'left-[22px]' : 'left-0.5'
        }`} />
      </button>
    </div>
  )

  const Field = ({ label, value, onChange, disabled = false, rows }) => (
    <div className='mb-4'>
      <label className='text-[10px] font-black text-white/25 uppercase tracking-[0.18em] block mb-1.5'>
        {label}
      </label>
      {rows
        ? <textarea value={value} onChange={e => onChange(e.target.value)} rows={rows} disabled={disabled}
            className={`w-full bg-[#0E0E0E] border rounded-xl px-4 py-3 text-[13px] text-white outline-none resize-none
              transition-colors ${disabled
                ? 'opacity-40 cursor-not-allowed border-white/[0.04]'
                : 'border-white/[0.07] focus:border-[#D4AF37]/40'
              }`} />
        : <input value={value} onChange={e => onChange(e.target.value)} disabled={disabled}
            className={`w-full bg-[#0E0E0E] border rounded-xl px-4 py-3 text-[13px] text-white outline-none
              transition-colors ${disabled
                ? 'opacity-40 cursor-not-allowed border-white/[0.04]'
                : 'border-white/[0.07] focus:border-[#D4AF37]/40'
              }`} />
      }
    </div>
  )

  return (
    <div className='h-full flex overflow-hidden'>
      {/* Section sidebar */}
      <div className='w-44 flex-shrink-0 border-r border-white/[0.04] py-3 overflow-y-auto' style={{ scrollbarWidth: 'none' }}>
        {SECTIONS.map(s => (
          <button key={s.id} onClick={() => setSection(s.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 text-left text-[12px] font-semibold transition-all ${
              section === s.id
                ? 'text-[#D4AF37] bg-[#D4AF37]/8 border-r-2 border-[#D4AF37]'
                : 'text-white/35 hover:text-white/65 hover:bg-white/[0.025]'
            }`}>
            <span className='text-base w-5 text-center flex-shrink-0'>{s.icon}</span>
            <span>{s.label}</span>
          </button>
        ))}
      </div>

      {/* Section content */}
      <div className='flex-1 overflow-y-auto px-6 py-5' style={{ scrollbarWidth: 'thin', scrollbarColor: '#222 transparent' }}>

        {section === 'account' && (
          <div className='max-w-lg'>
            <h3 className='font-bebas text-lg text-white tracking-wide mb-4'>Account Details</h3>
            <Field label='Display Name' value={form.displayName}
              onChange={v => setForm(p => ({ ...p, displayName: v }))} />
            <Field label='Bio' value={form.bio}
              onChange={v => setForm(p => ({ ...p, bio: v }))} rows={3} />
            <Field label='Username' value={form.username} disabled onChange={() => {}} />
            <Field label='Email' value={form.email} disabled onChange={() => {}} />
            <p className='text-[10px] text-white/20 -mt-2 mb-5'>Username and email cannot be changed</p>

            <div className='mb-4'>
              <p className='text-[10px] font-black text-white/25 uppercase tracking-[0.18em] mb-2'>Profile Photo</p>
              <div className='flex items-center gap-4'>
                <div className='w-16 h-16 rounded-full border border-white/10 overflow-hidden flex items-center justify-center bg-gradient-to-br from-[#1A1A1A] to-[#0D0D0D]'>
                  {currentUser?.avatar
                    ? <img src={currentUser.avatar} alt='' className='w-full h-full object-cover' />
                    : <span className='font-bebas text-xl text-[#D4AF37]'>{currentUser?.displayName?.[0] || 'U'}</span>
                  }
                </div>
                <div>
                  <button className='block px-3 py-1.5 bg-[#111] border border-white/[0.08] rounded-lg text-[11px] text-white/50 hover:border-white/20 hover:text-white/80 transition-all mb-1'>
                    Change photo
                  </button>
                  <p className='text-[10px] text-white/20'>JPG, PNG · Max 5MB</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {section === 'appearance' && (
          <div className='max-w-lg'>
            <h3 className='font-bebas text-lg text-white tracking-wide mb-4'>Appearance</h3>
            <Toggle k='compactFeed'   label='Compact Feed'     desc='Tighter spacing — see more posts at once' />
            <Toggle k='showBackdrops' label='Movie Backdrops'  desc='Cinematic backdrops on review posts' />
            <Toggle k='animations'    label='Animations'       desc='UI transitions and micro-interactions' />
            <Toggle k='darkMode'      label='Dark Mode'        desc='Always-on luxury cinema dark theme' />
          </div>
        )}

        {section === 'notifications' && (
          <div className='max-w-lg'>
            <h3 className='font-bebas text-lg text-white tracking-wide mb-4'>Notifications</h3>
            <Toggle k='reviewLikes'  label='Review Interactions' desc='Likes, comments, and reposts on your reviews' />
            <Toggle k='listCollabs'  label='List Collaboration'  desc='When someone adds to your shared list' />
            <Toggle k='newFollowers' label='New Followers'       desc='When someone follows your profile' />
            <Toggle k='pointsEarned' label='Points & Levels'     desc='XP earned and level-up alerts' />
            <Toggle k='weeklyDigest' label='Weekly Digest'       desc='Your watch activity summary every Monday' />
          </div>
        )}

        {section === 'privacy' && (
          <div className='max-w-lg'>
            <h3 className='font-bebas text-lg text-white tracking-wide mb-4'>Privacy</h3>
            <Toggle k='publicProfile' label='Public Profile'    desc='Anyone can view your reviews and lists' />
            <Toggle k='showLists'     label='Visible Watchlists' desc='Lists appear on your public profile' />
            <Toggle k='showActivity'  label='Activity Feed'     desc="Appear in others' activity feeds" />
            <Toggle k='allowDMs'      label='Direct Messages'   desc='Allow other users to message you' />
          </div>
        )}

        {section === 'data' && (
          <div className='max-w-lg'>
            <h3 className='font-bebas text-lg text-white tracking-wide mb-4'>Data & Export</h3>
            <div className='space-y-3'>
              {[
                ['Export Watch History', 'Download all watched titles as CSV', 'Export CSV'],
                ['Export Reviews',       'Download all your reviews as JSON',  'Export JSON'],
                ['Export Watchlists',    'Download your lists as JSON',         'Export JSON'],
              ].map(([label, desc, btn]) => (
                <div key={label} className='flex items-center justify-between p-4 bg-[#0E0E0E] border border-white/[0.05] rounded-xl'>
                  <div>
                    <p className='text-[13px] font-semibold text-white/80'>{label}</p>
                    <p className='text-[11px] text-white/30 mt-0.5'>{desc}</p>
                  </div>
                  <button className='ml-4 flex-shrink-0 px-3 py-1.5 bg-[#1A1A1A] border border-white/[0.08] rounded-lg
                    text-[11px] text-white/50 hover:border-[#D4AF37]/30 hover:text-[#D4AF37] transition-all'>
                    {btn}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {section === 'danger' && (
          <div className='max-w-lg'>
            <h3 className='font-bebas text-lg text-red-400/80 tracking-wide mb-4'>Danger Zone</h3>
            <div className='space-y-3'>
              <div className='p-4 border border-orange-500/20 bg-orange-500/5 rounded-2xl'>
                <p className='text-[13px] font-bold text-white/80 mb-1'>Clear Watch History</p>
                <p className='text-[11px] text-white/35 mb-3'>Mark all items as unwatched. This cannot be undone.</p>
                <button className='px-4 py-2 bg-orange-500/10 border border-orange-500/25 text-orange-400 text-[11px] font-bold rounded-xl hover:bg-orange-500/20 transition-all'>
                  Clear History
                </button>
              </div>
              <div className='p-4 border border-red-500/20 bg-red-500/5 rounded-2xl'>
                <p className='text-[13px] font-bold text-white/80 mb-1'>Delete Account</p>
                <p className='text-[11px] text-white/35 mb-3'>Permanently delete your account and all data. Irreversible.</p>
                <button className='px-4 py-2 bg-red-500/10 border border-red-500/25 text-red-400 text-[11px] font-bold rounded-xl hover:bg-red-500/20 transition-all'>
                  Delete My Account
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Save */}
        {!['danger', 'data'].includes(section) && (
          <div className='mt-8'>
            <button onClick={save} disabled={saving}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[13px] font-bold transition-all ${
                saveStatus === 'saved' ? 'bg-green-500/15 border border-green-500/25 text-green-400' :
                saveStatus === 'error' ? 'bg-red-500/15 border border-red-500/25 text-red-400' :
                'bg-[#D4AF37] text-[#0A0A0A] hover:bg-[#E8C55B] shadow-lg shadow-[#D4AF37]/20'
              } ${saving ? 'opacity-60 cursor-not-allowed' : ''}`}>
              {saving && <Spinner size={16} />}
              {saveStatus === 'saved' ? '✓ Saved' : saveStatus === 'error' ? '✗ Error saving' : 'Save Changes'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────
   PANEL SHELL — chrome wrapper for all 5 panels
───────────────────────────────────────────────────── */
const PANEL_META = {
  search: {
    title: 'SEARCH',
    icon: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z',
    wide: true,
  },
  discover: {
    title: 'DISCOVER',
    icon: 'M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9',
    wide: true,
  },
  library: {
    title: 'MY LIBRARY',
    icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10',
    wide: true,
  },
  watchlist: {
    title: 'WATCHLIST',
    icon: 'M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z',
    wide: false,
  },
  settings: {
    title: 'SETTINGS',
    icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065zM15 12a3 3 0 11-6 0 3 3 0 016 0z',
    wide: false,
  },
}

const SlidePanel = ({ panelId, currentUser, onClose }) => {
  const meta = PANEL_META[panelId]
  if (!meta) return null

  return (
    <>
      {/* Scrim */}
      <div className='fixed inset-0 z-40' onClick={onClose}
        style={{
          background: 'rgba(0,0,0,0.62)',
          backdropFilter: 'blur(5px)',
          animation: 'scrimIn .2s ease-out',
        }} />

      {/* Panel — centered floating modal */}
      <div
        className={`fixed z-50 flex flex-col ${meta.wide ? 'w-[860px]' : 'w-[600px]'}`}
        style={{
          top: '50%',
          left: '50%',
          transform: 'translateX(-50%) translateY(-50%)',
          height: 'min(88vh, 780px)',
          background: 'linear-gradient(160deg, #0E0E0E 0%, #080808 100%)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: '24px',
          boxShadow: '0 32px 120px rgba(0,0,0,.95), 0 0 0 1px rgba(212,175,55,0.06)',
          animation: 'panelIn .3s cubic-bezier(0.22, 1, 0.36, 1)',
        }}>

        {/* Header */}
        <div className='flex items-center justify-between px-6 py-4 border-b border-white/[0.04] flex-shrink-0'>
          <div className='flex items-center gap-3'>
            <div className='w-7 h-7 rounded-lg bg-[#D4AF37]/10 flex items-center justify-center'>
              <svg className='w-4 h-4 text-[#D4AF37]' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={1.8} d={meta.icon} />
              </svg>
            </div>
            <h2 className='font-bebas text-[18px] tracking-[0.12em] text-white/90'>{meta.title}</h2>
          </div>
          <button onClick={onClose}
            className='w-7 h-7 flex items-center justify-center rounded-lg text-white/20
              hover:text-white hover:bg-white/[0.06] transition-all'>
            <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M6 18L18 6M6 6l12 12' />
            </svg>
          </button>
        </div>

        {/* Panel body */}
        <div className='flex-1 overflow-hidden'>
          {panelId === 'search'    && <SearchPanel currentUser={currentUser} />}
          {panelId === 'discover'  && <DiscoverPanel currentUser={currentUser} />}
          {panelId === 'library'   && <LibraryPanel currentUser={currentUser} />}
          {panelId === 'watchlist' && <WatchlistPanel currentUser={currentUser} />}
          {panelId === 'settings'  && <SettingsPanel currentUser={currentUser} />}
        </div>
      </div>

      {/* Keyframes */}
      <style>{`
        @keyframes scrimIn   { from { opacity: 0 }                          to { opacity: 1 } }
        @keyframes panelIn   { from { opacity: 0; transform: translateX(-50%) translateY(-50%) scale(.96) } to { opacity: 1; transform: translateX(-50%) translateY(-50%) scale(1) } }
        @keyframes bgReveal  { from { opacity: 0 }                          to { opacity: 1 } }
        @keyframes posterReveal { from { opacity: 0; transform: scale(.93) translateY(8px) } to { opacity: 1; transform: scale(1) translateY(0) } }
        @keyframes cardReveal { from { opacity: 0; transform: translateY(8px) } to { opacity: 1; transform: translateY(0) } }
        @keyframes fadeIn    { from { opacity: 0 }                          to { opacity: 1 } }
      `}</style>
    </>
  )
}

/* ─────────────────────────────────────────────────────
   NAV ITEMS
───────────────────────────────────────────────────── */
const NAV_ITEMS = [
  {
    id: 'home', label: 'Home', path: '/home', panel: null,
    icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
  },
  {
    id: 'search', label: 'Search', path: null, panel: 'search',
    icon: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z',
  },
  {
    id: 'discover', label: 'Discover', path: null, panel: 'discover',
    icon: 'M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9',
  },
  {
    id: 'library', label: 'My Library', path: null, panel: 'library',
    icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10',
  },
  {
    id: 'watchlist', label: 'Watchlist', path: null, panel: 'watchlist',
    icon: 'M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z',
  },
  {
    id: 'settings', label: 'Settings', path: null, panel: 'settings',
    icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065zM15 12a3 3 0 11-6 0 3 3 0 016 0z',
  },
]

/* ─────────────────────────────────────────────────────
   NAVBAR — main export
───────────────────────────────────────────────────── */
const Navbar = ({ currentUser: propUser }) => {
  const navigate = useNavigate()
  const location = useLocation()

  const [expanded,    setExpanded]    = useState(false)
  const [isDesktop,   setIsDesktop]   = useState(false)
  const [user,        setUser]        = useState(null)
  const [loadingUser, setLoadingUser] = useState(true)
  const [avatarErr,   setAvatarErr]   = useState(false)
  const [activePanel, setActivePanel] = useState(null)

  /* Responsive expand */
  useEffect(() => {
    const check = () => {
      const d = window.innerWidth >= 1024
      setIsDesktop(d)
      if (d) setExpanded(true)
    }
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  /* Fetch profile */
  useEffect(() => {
    let live = true
    ;(async () => {
      try {
        const { data: { user: au } } = await supabase.auth.getUser()
        if (!au || !live) return
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', au.id).single()
        if (!live) return
        setUser({
          name:     profile?.display_name  || au.email?.split('@')[0] || 'User',
          email:    au.email,
          avatar:   profile?.avatar_url    || au.user_metadata?.avatar_url || null,
          level:    profile?.level         || 1,
          points:   profile?.total_points  || 0,
          username: profile?.username,
        })
      } catch {}
      if (live) setLoadingUser(false)
    })()
    return () => { live = false }
  }, [])

  /* ESC closes panel */
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') setActivePanel(null) }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [])

  const handleExpand = (v) => { if (!isDesktop) setExpanded(v) }
  const initials = () => {
    if (!user?.name) return 'U'
    const p = user.name.trim().split(' ')
    return p.length === 1 ? p[0][0].toUpperCase() : (p[0][0] + p.at(-1)[0]).toUpperCase()
  }
  const activeRoute = NAV_ITEMS.find(n => n.path && location.pathname === n.path)?.id

  return (
    <>
      {/* ═══ Gold sidebar rail ═══ */}
      <div
        onMouseEnter={() => handleExpand(true)}
        onMouseLeave={() => handleExpand(false)}
        className={`
          fixed left-4 top-1/2 -translate-y-1/2
          h-[90vh] max-h-[800px]
          rounded-3xl z-50 flex flex-col
          transition-all duration-300 ease-in-out
          ${expanded ? 'w-72' : 'w-20'}
          bg-flikd-gold
          border-2 border-flikd-gold
          shadow-[0_20px_80px_rgba(212,175,55,0.22)]
        `}>

        {/* Gloss overlay */}
        <div className='absolute inset-0 rounded-3xl pointer-events-none overflow-hidden'>
          <div className='absolute inset-0'
            style={{ background: 'linear-gradient(155deg, rgba(255,255,255,0.13) 0%, transparent 50%, rgba(0,0,0,0.06) 100%)' }} />
        </div>

        {/* Logo header */}
        <div className='relative flex items-center gap-3 p-5 border-b border-black/10 overflow-hidden'>
          <button onClick={() => { setActivePanel(null); navigate('/home') }}
            className='w-12 h-12 bg-black/20 rounded-2xl flex items-center justify-center flex-shrink-0
              shadow-lg hover:scale-105 transition-transform duration-200 backdrop-blur-sm'>
            <img src={logo} alt="Flik'd" className='w-9 h-9 object-contain drop-shadow-xl' />
          </button>
          <span className={`font-bebas text-2xl tracking-[0.15em] text-black/85 font-bold whitespace-nowrap
            transition-all duration-300 ${expanded ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-3 pointer-events-none'}`}>
            FLIK'D
          </span>
          {!isDesktop && expanded && (
            <button onClick={() => handleExpand(false)}
              className='ml-auto p-1.5 rounded-lg text-black/50 hover:text-black hover:bg-black/10 transition-all'>
              <svg className='w-5 h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M15 19l-7-7 7-7' />
              </svg>
            </button>
          )}
        </div>

        {/* Nav items */}
        <nav className='flex-1 py-4 px-3 overflow-y-auto' style={{ scrollbarWidth: 'none' }}>
          <ul className='space-y-1'>
            {NAV_ITEMS.map((item, idx) => {
              const isRoute  = activeRoute === item.id
              const isPanelOn = activePanel === item.panel && item.panel !== null

              return (
                <li key={item.id}
                  className={expanded ? 'animate-navSlide' : ''}
                  style={{ animationDelay: `${idx * 25}ms` }}>
                  <button
                    onClick={() => {
                      if (item.panel) setActivePanel(p => p === item.panel ? null : item.panel)
                      else { setActivePanel(null); navigate(item.path) }
                    }}
                    className={`
                      w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl
                      font-bebas text-lg tracking-wide
                      transition-all duration-200 group relative
                      ${isRoute || isPanelOn
                        ? 'bg-black text-[#D4AF37] shadow-lg shadow-black/30 scale-[1.02]'
                        : 'text-black/65 hover:text-black hover:bg-white/30 hover:scale-[1.01]'
                      }
                    `}>
                    {/* Icon */}
                    <div className={`w-6 h-6 flex-shrink-0 transition-transform duration-200 ${
                      isRoute || isPanelOn ? 'scale-110' : 'group-hover:scale-110'
                    }`}>
                      <svg className='w-6 h-6' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d={item.icon} />
                      </svg>
                    </div>

                    {/* Label */}
                    <span className={`whitespace-nowrap font-bebas text-lg tracking-wide flex-1
                      transition-all duration-300 ${expanded ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-3 pointer-events-none'}`}>
                      {item.label}
                    </span>

                    {/* Open panel dot */}
                    {isPanelOn && expanded && (
                      <span className='w-1.5 h-1.5 rounded-full bg-[#D4AF37] flex-shrink-0 animate-pulse' />
                    )}

                    {/* Collapsed indicator */}
                    {(isRoute || isPanelOn) && !expanded && (
                      <div className='absolute -right-1 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-black shadow-lg' />
                    )}

                    {/* Tooltip */}
                    {!expanded && (
                      <div className='absolute left-full ml-5 px-3 py-2 bg-black text-[#D4AF37]
                        text-[13px] font-bebas tracking-wide rounded-xl whitespace-nowrap
                        opacity-0 group-hover:opacity-100 transition-opacity duration-200
                        pointer-events-none shadow-xl z-50'>
                        {item.label}
                        <div className='absolute left-0 top-1/2 -translate-y-1/2 -translate-x-[5px] w-2.5 h-2.5 bg-black rotate-45' />
                      </div>
                    )}

                    {/* Hover shine */}
                    <div className='absolute inset-0 rounded-2xl bg-gradient-to-r from-transparent via-white/5 to-transparent
                      opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none' />
                  </button>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* Footer: profile + sign out */}
        <div className='relative p-4 space-y-1.5 border-t border-black/10'>

          {/* Profile */}
          <button onClick={() => { setActivePanel(null); navigate('/profile') }}
            className='w-full flex items-center gap-3 px-3 py-3 rounded-2xl text-black/65
              hover:text-black hover:bg-white/30 transition-all duration-200 group'>
            <div className='relative w-11 h-11 flex-shrink-0'>
              {user?.avatar && !avatarErr
                ? <img src={user.avatar} alt={user.name} onError={() => setAvatarErr(true)} loading='lazy'
                    className='w-full h-full rounded-full object-cover ring-2 ring-black/20 group-hover:ring-black/40 transition-all' />
                : <div className='w-full h-full rounded-full flex items-center justify-center shadow-lg ring-2 ring-black/25 group-hover:ring-black/40 transition-all'
                    style={{ background: 'linear-gradient(135deg, #0A0A0A, #1A1A1A)' }}>
                    {loadingUser
                      ? <Spinner size={16} />
                      : <span className='text-[#D4AF37] text-sm font-black font-bebas tracking-wide'>{initials()}</span>
                    }
                  </div>
              }
              <div className='absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-[#D4AF37]' />
            </div>

            {expanded && !loadingUser && (
              <div className={`flex-1 text-left overflow-hidden transition-all duration-300 ${expanded ? 'opacity-100' : 'opacity-0'}`}>
                <p className='text-[14px] font-bebas text-black truncate tracking-wide'>{user?.name || 'User'}</p>
                <div className='flex items-center gap-1'>
                  <span className='text-[10px] font-bebas text-black/50'>LVL {user?.level}</span>
                  <span className='text-black/25 text-[10px]'>·</span>
                  <span className='text-[10px] font-bebas text-black/50'>{(user?.points || 0).toLocaleString()} XP</span>
                </div>
              </div>
            )}

            {expanded && (
              <svg className='w-4 h-4 text-black/30 group-hover:text-black transition-colors flex-shrink-0'
                fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 5l7 7-7 7' />
              </svg>
            )}
          </button>

          <div className='h-px' style={{ background: 'linear-gradient(90deg, transparent, rgba(0,0,0,0.15), transparent)' }} />

          {/* Sign out */}
          <button onClick={async () => { await supabase.auth.signOut(); navigate('/login') }}
            className='w-full flex items-center gap-3 px-3 py-3 rounded-2xl text-black/65
              hover:text-red-700 hover:bg-red-50 transition-all duration-200 group'>
            <div className='w-11 h-11 rounded-xl flex items-center justify-center group-hover:bg-red-100 transition-colors'>
              <svg className='w-5 h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2}
                  d='M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1' />
              </svg>
            </div>
            {expanded && (
              <span className={`font-bebas text-base tracking-wider transition-all duration-300 ${expanded ? 'opacity-100' : 'opacity-0'}`}>
                SIGN OUT
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ═══ Active panel ═══ */}
      {activePanel && (
        <SlidePanel panelId={activePanel} currentUser={propUser} onClose={() => setActivePanel(null)} />
      )}

      <style>{`
        @keyframes navSlide {
          from { opacity: 0; transform: translateX(-10px) }
          to   { opacity: 1; transform: translateX(0)      }
        }
        .animate-navSlide { animation: navSlide .25s ease-out forwards }
      `}</style>
    </>
  )
}

export default Navbar