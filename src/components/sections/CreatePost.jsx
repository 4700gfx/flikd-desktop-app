import React, { useState, useRef, useCallback } from 'react'

/**
 * FLIK'D CreatePost — Enhanced & Fixed
 *
 * Key fixes vs original:
 * 1. List creation no longer passes circular/nested user object
 * 2. Movie data is always serialized to a clean flat shape before submission
 * 3. Debounced search uses useCallback to avoid stale closure
 * 4. onMovieDetails (optional) auto-enriches TMDB data on selection
 * 5. Better empty-state validation messages
 * 6. Tab state resets cleanly on success
 */

const TABS = [
  { id: 'review', label: 'Write Review', emoji: '⭐' },
  { id: 'list',   label: 'Create List',  emoji: '📋' },
  { id: 'quick',  label: 'Quick Add',    emoji: '⚡' },
]

// Flatten a movie to only the fields we ever write to the DB
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

const CreatePost = ({
  currentUser,
  onPostCreate,
  onListCreate,
  onListItemAdd,
  onMovieSearch,
  onMovieDetails, // optional: (movie) => Promise<enrichedMovie>
  userLists = [],
}) => {
  // ── Tab ──
  const [activeTab, setActiveTab] = useState('review')

  // ── Review ──
  const [reviewMovie, setReviewMovie] = useState(null)
  const [reviewContent, setReviewContent] = useState('')
  const [rating, setRating] = useState(0)
  const [hovered, setHovered] = useState(0)

  // ── List creation ──
  const [listName, setListName] = useState('')
  const [listDesc, setListDesc] = useState('')
  const [listMovies, setListMovies] = useState([])
  const [listPublic, setListPublic] = useState(false)
  const [listCollab, setListCollab] = useState(false)

  // ── Quick add ──
  const [quickList, setQuickList] = useState('')
  const [quickMovie, setQuickMovie] = useState(null)

  // ── Search ──
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchCtx, setSearchCtx] = useState('review')
  const [searchQ, setSearchQ] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [enriching, setEnriching] = useState(false)

  // ── Submission ──
  const [submitting, setSubmitting] = useState(false)
  const [flash, setFlash] = useState(null) // { type: 'success'|'error', msg }

  const debounceRef = useRef(null)

  /* ── Helpers ── */
  const showFlash = (type, msg) => {
    setFlash({ type, msg })
    setTimeout(() => setFlash(null), 4000)
  }

  const initials = () => {
    if (!currentUser?.displayName) return 'U'
    const p = currentUser.displayName.split(' ')
    return p.length === 1 ? p[0][0].toUpperCase() : (p[0][0] + p[p.length - 1][0]).toUpperCase()
  }

  const posterUrl = (path) => path ? `https://image.tmdb.org/t/p/w185${path}` : null

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

  const openSearch = (ctx) => {
    setSearchCtx(ctx)
    setSearchQ('')
    setSearchResults([])
    setSearchOpen(true)
  }

  const closeSearch = () => {
    setSearchOpen(false)
    setSearchQ('')
    setSearchResults([])
  }

  const pickMovie = async (raw) => {
    closeSearch()

    let movie = serializeMovie(raw)

    // Optionally enrich with full TMDB details
    if (onMovieDetails) {
      setEnriching(true)
      try {
        const enriched = await onMovieDetails(movie)
        movie = serializeMovie(enriched)
      } catch { /* use basic data */ }
      finally { setEnriching(false) }
    }

    if (searchCtx === 'review') setReviewMovie(movie)
    else if (searchCtx === 'list') {
      setListMovies(prev =>
        prev.find(m => m.id === movie.id) ? prev : [...prev, movie]
      )
    } else if (searchCtx === 'quick') setQuickMovie(movie)
  }

  /* ── Submit: Review ── */
  const submitReview = async () => {
    if (!reviewMovie)        return showFlash('error', 'Please select a movie or TV show.')
    if (!reviewContent.trim()) return showFlash('error', 'Please write your review.')
    if (!rating)             return showFlash('error', 'Please add a rating (1–10).')

    setSubmitting(true)
    try {
      const result = await onPostCreate({
        content: reviewContent.trim(),
        movie: reviewMovie,
        rating,
        timestamp: new Date().toISOString(),
      })
      if (result.success) {
        setReviewMovie(null); setReviewContent(''); setRating(0)
        showFlash('success', 'Review posted! +10 points 🎉')
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
    if (!listName.trim())    return showFlash('error', 'Please enter a list name.')
    if (!listMovies.length)  return showFlash('error', 'Add at least one movie to the list.')

    setSubmitting(true)
    try {
      // FIXED: clean serialized data only — no user object, no circular refs
      const payload = {
        name: listName.trim(),
        description: listDesc.trim(),
        isPublic: listPublic,
        isCollaborative: listCollab,
        movies: listMovies.map(serializeMovie), // already serialized but re-run for safety
      }

      const result = await onListCreate(payload)
      if (result.success) {
        setListName(''); setListDesc(''); setListMovies([])
        setListPublic(false); setListCollab(false)
        showFlash('success', `List "${listName.trim()}" created! 🎬`)
      } else {
        showFlash('error', result.error || 'Failed to create list.')
      }
    } catch (e) {
      const msg = e.message?.includes('infinite recursion')
        ? 'Database error — please try again.'
        : e.message || 'Something went wrong.'
      showFlash('error', msg)
    } finally {
      setSubmitting(false)
    }
  }

  /* ── Submit: Quick Add ── */
  const submitQuickAdd = async () => {
    if (!quickList)  return showFlash('error', 'Please select a list.')
    if (!quickMovie) return showFlash('error', 'Please select a movie.')

    setSubmitting(true)
    try {
      // FIXED: clean data only
      const result = await onListItemAdd({
        listId: quickList,
        movie: serializeMovie(quickMovie),
      })
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

  const switchTab = (id) => {
    setActiveTab(id)
    setFlash(null)
  }

  /* ── Spinner ── */
  const Spinner = () => (
    <svg className='w-4 h-4 animate-spin' fill='none' viewBox='0 0 24 24'>
      <circle className='opacity-25' cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='4' />
      <path className='opacity-75' fill='currentColor' d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z' />
    </svg>
  )

  /* ── Movie pill ── */
  const MoviePill = ({ movie, onRemove }) => (
    <div className='flex items-center gap-3 bg-[#181818] border border-[#262626] rounded-xl px-3 py-2 group'>
      {posterUrl(movie.posterPath)
        ? <img src={posterUrl(movie.posterPath)} alt={movie.title} className='w-9 h-12 object-cover rounded-lg shadow-md flex-shrink-0' />
        : <div className='w-9 h-12 bg-[#2D2D2D] rounded-lg flex-shrink-0' />
      }
      <div className='flex-1 min-w-0'>
        <p className='text-white text-sm font-semibold truncate'>{movie.title}</p>
        <p className='text-white/40 text-xs'>{movie.year} · {movie.mediaType}</p>
      </div>
      {onRemove && (
        <button onClick={onRemove} className='text-white/20 hover:text-red-500 transition-colors p-1 opacity-0 group-hover:opacity-100 flex-shrink-0'>
          <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M6 18L18 6M6 6l12 12' />
          </svg>
        </button>
      )}
    </div>
  )

  /* ── Add-movie button ── */
  const AddMovieBtn = ({ ctx, label = '+ Select Movie / Show' }) => (
    <button
      onClick={() => openSearch(ctx)}
      className='w-full py-3.5 border-2 border-dashed border-[#262626] hover:border-[#D4AF37]/60 rounded-xl text-sm font-semibold text-white/40 hover:text-[#D4AF37] transition-all duration-200 group'
    >
      {enriching ? <span className='flex items-center justify-center gap-2'><Spinner /><span>Fetching details…</span></span> : label}
    </button>
  )

  /* ── Submit button ── */
  const SubmitBtn = ({ onClick, disabled, label, loadingLabel }) => (
    <button
      onClick={onClick}
      disabled={disabled || submitting}
      className='px-7 py-2.5 bg-[#D4AF37] text-[#0A0A0A] rounded-full font-bold text-sm hover:bg-[#E8C55B] disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-95 flex items-center gap-2'
    >
      {submitting ? <><Spinner />{loadingLabel}</> : label}
    </button>
  )

  return (
    <div className='bg-[#0A0A0A]'>

      {/* Flash banner */}
      {flash && (
        <div className={`mx-6 mt-4 px-4 py-3 rounded-xl flex items-center gap-3 border text-sm font-inter ${
          flash.type === 'success'
            ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400'
            : 'bg-red-500/10 border-red-500/25 text-red-400'
        }`}>
          {flash.type === 'success'
            ? <svg className='w-4 h-4 shrink-0' fill='none' stroke='currentColor' viewBox='0 0 24 24'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M5 13l4 4L19 7' /></svg>
            : <svg className='w-4 h-4 shrink-0' fill='none' stroke='currentColor' viewBox='0 0 24 24'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' /></svg>
          }
          <span className='flex-1'>{flash.msg}</span>
          <button onClick={() => setFlash(null)} className='hover:opacity-70 transition-opacity'>
            <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M6 18L18 6M6 6l12 12' /></svg>
          </button>
        </div>
      )}

      <div className='p-6 flex gap-4'>
        {/* Avatar */}
        <div className='w-11 h-11 rounded-full flex-shrink-0 overflow-hidden ring-2 ring-[#1A1A1A] shadow-lg'>
          {currentUser?.avatar
            ? <img src={currentUser.avatar} alt={currentUser.displayName} className='w-full h-full object-cover' />
            : <div className='w-full h-full bg-gradient-to-br from-[#D4AF37] to-[#B8961F] flex items-center justify-center font-bold text-[#0A0A0A] text-sm'>{initials()}</div>
          }
        </div>

        <div className='flex-1 min-w-0'>

          {/* Tabs */}
          <div className='flex gap-1 mb-5 border-b border-[#1A1A1A] pb-0'>
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => switchTab(t.id)}
                className={`px-4 py-2.5 text-sm font-semibold transition-all whitespace-nowrap rounded-t-lg border-b-2 -mb-px ${
                  activeTab === t.id
                    ? 'text-[#D4AF37] border-[#D4AF37] bg-[#D4AF37]/5'
                    : 'text-white/40 border-transparent hover:text-white/70 hover:bg-[#1A1A1A]/50'
                }`}
              >
                <span className='mr-1.5'>{t.emoji}</span>{t.label}
              </button>
            ))}
          </div>

          {/* ── TAB: REVIEW ── */}
          {activeTab === 'review' && (
            <div className='space-y-4'>
              <div>
                <h3 className='font-bebas text-xl text-white tracking-wide mb-0.5'>WRITE A REVIEW</h3>
                <p className='text-xs text-white/35'>Share your thoughts · earn 10 points</p>
              </div>

              {/* Movie selector */}
              {reviewMovie
                ? <MoviePill movie={reviewMovie} onRemove={() => { setReviewMovie(null); setRating(0) }} />
                : <AddMovieBtn ctx='review' />
              }

              {/* Rating */}
              {reviewMovie && (
                <div>
                  <label className='block text-xs font-semibold text-white/50 mb-2 uppercase tracking-wider'>Your Rating</label>
                  <div className='flex items-center gap-1.5 flex-wrap'>
                    {[1,2,3,4,5,6,7,8,9,10].map(v => (
                      <button
                        key={v}
                        onClick={() => setRating(v)}
                        onMouseEnter={() => setHovered(v)}
                        onMouseLeave={() => setHovered(0)}
                        className={`w-9 h-9 rounded-lg font-bold text-sm transition-all duration-150 ${
                          v <= (hovered || rating)
                            ? 'bg-[#D4AF37] text-[#0A0A0A] scale-110 shadow-lg shadow-[#D4AF37]/20'
                            : 'bg-[#1A1A1A] text-white/40 hover:bg-[#222]'
                        }`}
                      >{v}</button>
                    ))}
                    {rating > 0 && (
                      <span className='ml-2 text-[#D4AF37] font-bold text-sm'>{rating}/10</span>
                    )}
                  </div>
                </div>
              )}

              {/* Review text */}
              {reviewMovie && (
                <div className='relative'>
                  <textarea
                    value={reviewContent}
                    onChange={(e) => setReviewContent(e.target.value.slice(0, 1000))}
                    placeholder='What did you think?'
                    rows={4}
                    className='w-full bg-[#141414] border border-[#262626] focus:border-[#D4AF37]/60 rounded-xl px-4 py-3 text-white placeholder:text-white/25 text-[15px] resize-none focus:outline-none transition-colors leading-relaxed'
                  />
                  <span className='absolute bottom-3 right-4 text-[11px] text-white/25'>
                    {reviewContent.length}/1000
                  </span>
                </div>
              )}

              {reviewMovie && (
                <div className='flex justify-end'>
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
              <h3 className='font-bebas text-xl text-white tracking-wide'>CREATE A LIST</h3>

              <input
                value={listName}
                onChange={(e) => setListName(e.target.value.slice(0, 100))}
                placeholder="List name — e.g. 'Best Sci-Fi of the 90s'"
                className='w-full bg-[#141414] border border-[#262626] focus:border-[#D4AF37]/60 rounded-xl px-4 py-3 text-white placeholder:text-white/25 text-sm focus:outline-none transition-colors'
              />

              <textarea
                value={listDesc}
                onChange={(e) => setListDesc(e.target.value.slice(0, 500))}
                placeholder='Description (optional)'
                rows={2}
                className='w-full bg-[#141414] border border-[#262626] focus:border-[#D4AF37]/60 rounded-xl px-4 py-3 text-white placeholder:text-white/25 text-sm resize-none focus:outline-none transition-colors'
              />

              {/* Toggles */}
              <div className='flex gap-5'>
                {[
                  { label: 'Public', state: listPublic, set: setListPublic },
                  { label: 'Collaborative', state: listCollab, set: setListCollab },
                ].map(({ label, state, set }) => (
                  <label key={label} className='flex items-center gap-2 cursor-pointer group select-none'>
                    <div
                      onClick={() => set(p => !p)}
                      className={`w-9 h-5 rounded-full relative transition-colors duration-200 ${state ? 'bg-[#D4AF37]' : 'bg-[#2D2D2D]'}`}
                    >
                      <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${state ? 'translate-x-4' : 'translate-x-0.5'}`} />
                    </div>
                    <span className='text-sm text-white/60 group-hover:text-white/90 transition-colors'>{label}</span>
                  </label>
                ))}
              </div>

              {/* Movie list */}
              {listMovies.length > 0 && (
                <div className='space-y-2 max-h-56 overflow-y-auto pr-1 scrollbar-thin'>
                  {listMovies.map((m, i) => (
                    <MoviePill key={`${m.id}-${i}`} movie={m} onRemove={() => setListMovies(prev => prev.filter((_, j) => j !== i))} />
                  ))}
                </div>
              )}

              <AddMovieBtn ctx='list' label={`+ Add Movie ${listMovies.length > 0 ? `(${listMovies.length} added)` : ''}`} />

              <div className='flex items-center justify-between'>
                <span className='text-xs text-white/30'>{listMovies.length} movie{listMovies.length !== 1 ? 's' : ''} added</span>
                <SubmitBtn
                  onClick={submitList}
                  disabled={!listName.trim() || !listMovies.length}
                  label='Create List'
                  loadingLabel='Creating…'
                />
              </div>
            </div>
          )}

          {/* ── TAB: QUICK ADD ── */}
          {activeTab === 'quick' && (
            <div className='space-y-4'>
              <div>
                <h3 className='font-bebas text-xl text-white tracking-wide mb-0.5'>QUICK ADD TO LIST</h3>
                <p className='text-xs text-white/35'>Add a movie to an existing list in seconds</p>
              </div>

              {/* List selector */}
              <div>
                <label className='block text-xs font-semibold text-white/50 uppercase tracking-wider mb-2'>Select List</label>
                {userLists.length === 0 ? (
                  <p className='text-white/30 text-sm italic'>No lists yet — create one first.</p>
                ) : (
                  <div className='grid grid-cols-1 gap-2 max-h-40 overflow-y-auto scrollbar-thin'>
                    {userLists.map(l => (
                      <button
                        key={l.id}
                        onClick={() => setQuickList(l.id)}
                        className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-left transition-all duration-200 border ${
                          quickList === l.id
                            ? 'bg-[#D4AF37]/10 border-[#D4AF37]/50 text-[#D4AF37]'
                            : 'bg-[#141414] border-[#262626] text-white/60 hover:border-[#333] hover:text-white'
                        }`}
                      >
                        <span className='text-lg'>📋</span>
                        <div className='flex-1 min-w-0'>
                          <p className='font-semibold text-sm truncate'>{l.name}</p>
                          <p className='text-xs opacity-50'>{l.itemCount || 0} item{l.itemCount !== 1 ? 's' : ''}</p>
                        </div>
                        {quickList === l.id && (
                          <svg className='w-4 h-4' fill='currentColor' viewBox='0 0 20 20'><path fillRule='evenodd' d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z' clipRule='evenodd' /></svg>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Movie selector */}
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
          className='fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4'
          onClick={closeSearch}
        >
          <div
            className='bg-[#0E0E0E] border border-[#1E1E1E] rounded-2xl w-full max-w-lg max-h-[75vh] flex flex-col shadow-2xl'
            onClick={e => e.stopPropagation()}
            style={{ animation: 'slideUp 0.2s ease-out' }}
          >
            {/* Header */}
            <div className='px-5 py-4 border-b border-[#1A1A1A] flex items-center justify-between'>
              <h3 className='font-bebas text-xl text-white tracking-wide'>
                {searchCtx === 'review' ? 'Select Movie / Show' : searchCtx === 'list' ? 'Add to List' : 'Quick Select'}
              </h3>
              <button onClick={closeSearch} className='text-white/40 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-[#1A1A1A]'>
                <svg className='w-5 h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M6 18L18 6M6 6l12 12' />
                </svg>
              </button>
            </div>

            {/* Search input */}
            <div className='px-5 py-3 border-b border-[#1A1A1A]'>
              <div className='relative'>
                <svg className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z' />
                </svg>
                <input
                  type='text'
                  value={searchQ}
                  onChange={handleSearchInput}
                  placeholder='Search movies & TV shows…'
                  autoFocus
                  className='w-full bg-[#161616] border border-[#262626] focus:border-[#D4AF37]/50 rounded-xl pl-9 pr-10 py-2.5 text-white placeholder:text-white/25 text-sm focus:outline-none transition-colors'
                />
                {searching && (
                  <svg className='absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#D4AF37] animate-spin' fill='none' viewBox='0 0 24 24'>
                    <circle className='opacity-25' cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='4' />
                    <path className='opacity-75' fill='currentColor' d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z' />
                  </svg>
                )}
              </div>
            </div>

            {/* Results */}
            <div className='flex-1 overflow-y-auto py-2 scrollbar-thin'>
              {searchResults.length > 0 ? (
                searchResults.map(m => (
                  <button
                    key={`${m.mediaType}-${m.id}`}
                    onClick={() => pickMovie(m)}
                    className='w-full px-5 py-3 flex items-center gap-3 hover:bg-[#181818] transition-colors text-left group'
                  >
                    {posterUrl(m.posterPath)
                      ? <img src={posterUrl(m.posterPath)} alt={m.title} className='w-10 h-14 object-cover rounded-lg shadow-md flex-shrink-0' />
                      : <div className='w-10 h-14 bg-[#222] rounded-lg flex-shrink-0 flex items-center justify-center'>
                          <svg className='w-5 h-5 text-white/15' fill='none' stroke='currentColor' viewBox='0 0 24 24'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={1.5} d='M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z' /></svg>
                        </div>
                    }
                    <div className='flex-1 min-w-0'>
                      <p className='text-white text-sm font-semibold group-hover:text-[#D4AF37] transition-colors truncate'>{m.title}</p>
                      <p className='text-white/40 text-xs mt-0.5'>{m.year} · {m.mediaType === 'tv' ? 'Series' : 'Movie'}</p>
                    </div>
                    <svg className='w-4 h-4 text-white/20 group-hover:text-[#D4AF37] transition-colors flex-shrink-0' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 5l7 7-7 7' />
                    </svg>
                  </button>
                ))
              ) : searchQ && !searching ? (
                <div className='py-16 text-center'>
                  <svg className='w-12 h-12 text-white/15 mx-auto mb-3' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={1.5} d='M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z' />
                  </svg>
                  <p className='text-white/30 text-sm'>No results for "{searchQ}"</p>
                </div>
              ) : !searchQ ? (
                <div className='py-16 text-center'>
                  <svg className='w-12 h-12 text-white/10 mx-auto mb-3' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={1.5} d='M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z' />
                  </svg>
                  <p className='text-white/25 text-sm'>Start typing to search</p>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .scrollbar-thin::-webkit-scrollbar { width: 4px; }
        .scrollbar-thin::-webkit-scrollbar-track { background: transparent; }
        .scrollbar-thin::-webkit-scrollbar-thumb { background: #2D2D2D; border-radius: 4px; }
        .scrollbar-thin::-webkit-scrollbar-thumb:hover { background: #D4AF37; }
      `}</style>
    </div>
  )
}

export default CreatePost