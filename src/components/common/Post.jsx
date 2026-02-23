import React, { useState } from 'react'

/**
 * FLIK'D Post Component — Enhanced
 * 
 * Rich movie details:
 * - Full backdrop hero with gradient
 * - Genres, runtime, release year
 * - Director & top cast
 * - TMDB rating + user star rating
 * - Overview with expand/collapse
 * - Polished engagement row
 * - Level badge on avatar
 */

const Post = ({
  post,
  currentUserId,
  onUserClick,
  onLike,
  onDislike,
  onRepost,
  onComment,
  style = {}
}) => {
  const {
    id, user, movie, content, rating, timestamp,
    likes = 0, dislikes = 0, reposts = 0, comments = 0,
    userLiked = false, userDisliked = false, userReposted = false
  } = post

  const [localLikes, setLocalLikes] = useState(likes)
  const [localDislikes, setLocalDislikes] = useState(dislikes)
  const [localReposts, setLocalReposts] = useState(reposts)
  const [hasLiked, setHasLiked] = useState(userLiked)
  const [hasDisliked, setHasDisliked] = useState(userDisliked)
  const [hasReposted, setHasReposted] = useState(userReposted)
  const [isExpanded, setIsExpanded] = useState(false)
  const [backdropLoaded, setBackdropLoaded] = useState(false)

  /* ── Formatters ── */
  const formatTime = (date) => {
    const diff = Math.floor((Date.now() - new Date(date)) / 1000)
    if (diff < 60) return 'Just now'
    if (diff < 3600) return `${Math.floor(diff / 60)}m`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`
    if (diff < 604800) return `${Math.floor(diff / 86400)}d`
    return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const formatCount = (n) => {
    if (!n) return '0'
    if (n < 1000) return String(n)
    if (n < 1_000_000) return `${(n / 1000).toFixed(1)}K`
    return `${(n / 1_000_000).toFixed(1)}M`
  }

  const formatRuntime = (mins) => {
    if (!mins) return null
    const h = Math.floor(mins / 60), m = mins % 60
    if (!h) return `${m}m`
    if (!m) return `${h}h`
    return `${h}h ${m}m`
  }

  const formatYear = (dateStr) => {
    if (!dateStr) return null
    return new Date(dateStr).getFullYear()
  }

  const initials = () => {
    if (!user?.displayName) return '?'
    const parts = user.displayName.split(' ')
    return parts.length === 1
      ? parts[0][0].toUpperCase()
      : (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }

  const posterUrl = movie?.posterPath ? `https://image.tmdb.org/t/p/w342${movie.posterPath}` : null
  const backdropUrl = movie?.backdropPath ? `https://image.tmdb.org/t/p/w1280${movie.backdropPath}` : null

  // Convert 0-10 to 0-5 half-stars
  const starRating = rating ? Math.round(rating / 2) : 0
  const hasOverview = movie?.overview && movie.overview.length > 0
  const longOverview = movie?.overview && movie.overview.length > 180

  /* ── Interaction Handlers ── */
  const handleLike = async (e) => {
    e.stopPropagation()
    if (hasLiked) {
      setLocalLikes(p => p - 1); setHasLiked(false)
    } else {
      setLocalLikes(p => p + 1); setHasLiked(true)
      if (hasDisliked) { setLocalDislikes(p => p - 1); setHasDisliked(false) }
    }
    try { await onLike?.(id, !hasLiked) } catch {
      setLocalLikes(likes); setHasLiked(userLiked)
      setLocalDislikes(dislikes); setHasDisliked(userDisliked)
    }
  }

  const handleDislike = async (e) => {
    e.stopPropagation()
    if (hasDisliked) {
      setLocalDislikes(p => p - 1); setHasDisliked(false)
    } else {
      setLocalDislikes(p => p + 1); setHasDisliked(true)
      if (hasLiked) { setLocalLikes(p => p - 1); setHasLiked(false) }
    }
    try { await onDislike?.(id, !hasDisliked) } catch {
      setLocalLikes(likes); setHasLiked(userLiked)
      setLocalDislikes(dislikes); setHasDisliked(userDisliked)
    }
  }

  const handleRepost = async (e) => {
    e.stopPropagation()
    if (hasReposted) {
      setLocalReposts(p => p - 1); setHasReposted(false)
    } else {
      setLocalReposts(p => p + 1); setHasReposted(true)
    }
    try { await onRepost?.(id, !hasReposted) } catch {
      setLocalReposts(reposts); setHasReposted(userReposted)
    }
  }

  return (
    <article
      className='bg-[#0A0A0A] border-b border-[#1A1A1A] hover:bg-[#0B0B0B] transition-colors duration-200'
      style={style}
    >
      {/* ── POST HEADER ── */}
      <div className='px-6 pt-5 pb-3 flex items-start gap-3'>
        {/* Avatar */}
        <button
          onClick={(e) => { e.stopPropagation(); onUserClick?.(user) }}
          className='relative flex-shrink-0 group'
        >
          <div className='w-11 h-11 rounded-full overflow-hidden ring-2 ring-[#1A1A1A] group-hover:ring-[#D4AF37]/70 transition-all duration-300'>
            {user?.avatar
              ? <img src={user.avatar} alt={user.displayName} className='w-full h-full object-cover' />
              : (
                <div className='w-full h-full bg-gradient-to-br from-[#D4AF37] to-[#B8961F] flex items-center justify-center font-bold text-[#0A0A0A] text-sm'>
                  {initials()}
                </div>
              )
            }
          </div>
          {user?.level > 1 && (
            <span className='absolute -bottom-1 -right-1 min-w-[20px] h-5 px-1 bg-gradient-to-r from-[#D4AF37] to-[#E8C55B] rounded-full flex items-center justify-center text-[10px] font-bold text-[#0A0A0A] border-2 border-[#0A0A0A]'>
              {user.level}
            </span>
          )}
        </button>

        {/* User + time */}
        <div className='flex-1 min-w-0'>
          <button
            onClick={(e) => { e.stopPropagation(); onUserClick?.(user) }}
            className='group flex items-baseline gap-2 flex-wrap'
          >
            <span className='font-semibold text-white group-hover:text-[#D4AF37] transition-colors text-[15px]'>
              {user?.displayName || 'User'}
            </span>
            {user?.username && (
              <span className='text-white/40 text-sm'>@{user.username}</span>
            )}
          </button>
          <span className='text-xs text-white/30 mt-0.5 block'>{formatTime(timestamp)}</span>
        </div>

        {/* More */}
        <button className='text-white/20 hover:text-white/60 transition-colors p-1.5 rounded-lg hover:bg-[#1A1A1A]'>
          <svg className='w-4 h-4' fill='currentColor' viewBox='0 0 20 20'>
            <path d='M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z' />
          </svg>
        </button>
      </div>

      {/* ── MOVIE CARD ── */}
      {movie && (
        <div className='px-6 pb-4'>
          <div className='rounded-2xl overflow-hidden border border-[#222] hover:border-[#D4AF37]/40 transition-all duration-300 bg-[#111] cursor-pointer group'>

            {/* Backdrop hero */}
            {backdropUrl ? (
              <div className='relative h-52 overflow-hidden bg-[#111]'>
                <img
                  src={backdropUrl}
                  alt={movie.title}
                  className={`w-full h-full object-cover transition-all duration-700 group-hover:scale-105 ${backdropLoaded ? 'opacity-55' : 'opacity-0'}`}
                  onLoad={() => setBackdropLoaded(true)}
                />
                <div className='absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-[#111]' />

                {/* Media badge */}
                <div className='absolute top-3 right-3 px-2.5 py-1 bg-black/70 backdrop-blur-sm rounded-lg border border-white/10 text-xs font-semibold text-white uppercase tracking-wide'>
                  {movie.mediaType === 'tv' ? '📺 Series' : '🎬 Film'}
                </div>

                {/* TMDB score overlay */}
                {movie.voteAverage > 0 && (
                  <div className='absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 bg-black/70 backdrop-blur-sm rounded-lg border border-white/10'>
                    <svg className='w-3.5 h-3.5 text-[#D4AF37]' fill='currentColor' viewBox='0 0 20 20'>
                      <path d='M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z' />
                    </svg>
                    <span className='text-white text-xs font-bold'>{movie.voteAverage.toFixed(1)}</span>
                    <span className='text-white/40 text-xs'>/10</span>
                  </div>
                )}
              </div>
            ) : null}

            {/* Body: poster + details */}
            <div className={`flex gap-4 p-4 ${backdropUrl ? '-mt-16 relative' : ''}`}>

              {/* Poster */}
              <div className={`flex-shrink-0 ${backdropUrl ? 'z-10' : ''}`}>
                {posterUrl ? (
                  <img
                    src={posterUrl}
                    alt={movie.title}
                    className='w-28 h-40 object-cover rounded-xl shadow-2xl ring-1 ring-white/10 group-hover:ring-[#D4AF37]/30 transition-all duration-300'
                  />
                ) : (
                  <div className='w-28 h-40 bg-[#1A1A1A] rounded-xl flex items-center justify-center'>
                    <svg className='w-10 h-10 text-[#333]' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={1.5} d='M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z' />
                    </svg>
                  </div>
                )}
              </div>

              {/* Details */}
              <div className='flex-1 min-w-0 pt-1'>

                {/* Title */}
                <h3 className='font-bold text-white text-lg leading-tight group-hover:text-[#D4AF37] transition-colors line-clamp-2 mb-2'>
                  {movie.title}
                </h3>

                {/* Meta row */}
                <div className='flex items-center flex-wrap gap-x-2 gap-y-1 text-xs text-white/50 mb-3'>
                  {(movie.releaseDate || movie.year) && (
                    <span className='font-semibold text-white/70'>
                      {movie.releaseDate ? formatYear(movie.releaseDate) : movie.year}
                    </span>
                  )}
                  {movie.runtime && (
                    <>
                      <span className='text-white/20'>·</span>
                      <span>{formatRuntime(movie.runtime)}</span>
                    </>
                  )}
                  {movie.originalLanguage && (
                    <>
                      <span className='text-white/20'>·</span>
                      <span className='uppercase'>{movie.originalLanguage}</span>
                    </>
                  )}
                  {movie.voteAverage > 0 && !backdropUrl && (
                    <>
                      <span className='text-white/20'>·</span>
                      <span className='flex items-center gap-1'>
                        <svg className='w-3 h-3 text-[#D4AF37]' fill='currentColor' viewBox='0 0 20 20'>
                          <path d='M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z' />
                        </svg>
                        {movie.voteAverage.toFixed(1)}
                      </span>
                    </>
                  )}
                </div>

                {/* Genres */}
                {movie.genres && movie.genres.length > 0 && (
                  <div className='flex flex-wrap gap-1.5 mb-3'>
                    {movie.genres.slice(0, 4).map((g, i) => (
                      <span key={i} className='px-2 py-0.5 bg-[#1A1A1A] border border-[#2D2D2D] rounded-md text-[11px] font-medium text-white/60 hover:text-[#D4AF37] hover:border-[#D4AF37]/30 transition-colors cursor-pointer'>
                        {g}
                      </span>
                    ))}
                  </div>
                )}

                {/* User star rating */}
                {rating > 0 && (
                  <div className='flex items-center gap-3 mb-3'>
                    <div className='flex gap-0.5'>
                      {[1, 2, 3, 4, 5].map(i => (
                        <svg key={i} className={`w-4 h-4 ${i <= starRating ? 'text-[#D4AF37]' : 'text-[#2D2D2D]'}`} fill='currentColor' viewBox='0 0 20 20'>
                          <path d='M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z' />
                        </svg>
                      ))}
                    </div>
                    <span className='text-[#D4AF37] font-bold text-sm'>{rating.toFixed(1)}</span>
                    <span className='text-white/30 text-xs'>/ 10</span>
                  </div>
                )}

                {/* Overview */}
                {hasOverview && (
                  <div className='mb-2'>
                    <p className={`text-white/65 text-[13px] leading-relaxed ${isExpanded ? '' : 'line-clamp-2'}`}>
                      {movie.overview}
                    </p>
                    {longOverview && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setIsExpanded(p => !p) }}
                        className='text-[#D4AF37] text-xs font-semibold mt-1 hover:text-[#E8C55B] transition-colors flex items-center gap-1'
                      >
                        {isExpanded ? 'Show less ↑' : 'Read more ↓'}
                      </button>
                    )}
                  </div>
                )}

                {/* Director + Cast */}
                {(movie.director || (movie.cast && movie.cast.length > 0)) && (
                  <div className='mt-3 pt-3 border-t border-[#1A1A1A] space-y-1.5 text-[12px]'>
                    {movie.director && (
                      <div className='flex gap-2'>
                        <span className='text-white/30 w-14 shrink-0'>Director</span>
                        <span className='text-white/70 font-medium'>{movie.director}</span>
                      </div>
                    )}
                    {movie.cast && movie.cast.length > 0 && (
                      <div className='flex gap-2'>
                        <span className='text-white/30 w-14 shrink-0'>Cast</span>
                        <span className='text-white/60 leading-relaxed'>
                          {movie.cast.slice(0, 4).join(', ')}
                          {movie.cast.length > 4 && <span className='text-white/30'> +{movie.cast.length - 4} more</span>}
                        </span>
                      </div>
                    )}
                    {movie.status && (
                      <div className='flex gap-2'>
                        <span className='text-white/30 w-14 shrink-0'>Status</span>
                        <span className='text-white/60'>{movie.status}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── USER REVIEW TEXT ── */}
      {content?.trim() && (
        <div className='px-6 pb-4'>
          <p className='text-white/90 text-[15px] leading-relaxed whitespace-pre-wrap font-normal'>
            {content}
          </p>
        </div>
      )}

      {/* ── ENGAGEMENT BAR ── */}
      <div className='px-6 pb-5 pt-1 border-t border-[#111]'>
        <div className='flex items-center justify-between pt-3'>

          {/* Like */}
          <ActionBtn
            active={hasLiked}
            activeClass='text-[#D4AF37] bg-[#D4AF37]/10'
            hoverClass='hover:text-[#D4AF37] hover:bg-[#1A1A1A]'
            onClick={handleLike}
            count={localLikes}
            formatCount={formatCount}
          >
            <svg className='w-[18px] h-[18px]' fill={hasLiked ? 'currentColor' : 'none'} stroke='currentColor' viewBox='0 0 24 24'>
              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={1.8} d='M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5' />
            </svg>
          </ActionBtn>

          {/* Dislike */}
          <ActionBtn
            active={hasDisliked}
            activeClass='text-red-500 bg-red-500/10'
            hoverClass='hover:text-red-500 hover:bg-[#1A1A1A]'
            onClick={handleDislike}
            count={localDislikes}
            formatCount={formatCount}
            hideZero
          >
            <svg className={`w-[18px] h-[18px] transition-transform ${hasDisliked ? 'rotate-180' : ''}`} fill={hasDisliked ? 'currentColor' : 'none'} stroke='currentColor' viewBox='0 0 24 24'>
              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={1.8} d='M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.096c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5' />
            </svg>
          </ActionBtn>

          {/* Comment */}
          <ActionBtn
            active={false}
            activeClass=''
            hoverClass='hover:text-blue-400 hover:bg-[#1A1A1A]'
            onClick={(e) => { e.stopPropagation(); onComment?.(id) }}
            count={comments}
            formatCount={formatCount}
          >
            <svg className='w-[18px] h-[18px]' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={1.8} d='M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z' />
            </svg>
          </ActionBtn>

          {/* Repost */}
          <ActionBtn
            active={hasReposted}
            activeClass='text-emerald-500 bg-emerald-500/10'
            hoverClass='hover:text-emerald-500 hover:bg-[#1A1A1A]'
            onClick={handleRepost}
            count={localReposts}
            formatCount={formatCount}
            hideZero
          >
            <svg className='w-[18px] h-[18px]' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={1.8} d='M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15' />
            </svg>
          </ActionBtn>

          {/* Share */}
          <button
            onClick={(e) => e.stopPropagation()}
            className='flex items-center justify-center w-9 h-9 rounded-xl text-white/30 hover:text-white hover:bg-[#1A1A1A] transition-all duration-200'
          >
            <svg className='w-[18px] h-[18px]' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={1.8} d='M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z' />
            </svg>
          </button>

        </div>
      </div>
    </article>
  )
}

/* ── Reusable action button ── */
const ActionBtn = ({ active, activeClass, hoverClass, onClick, count, formatCount, hideZero = false, children }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
      active ? activeClass : `text-white/40 ${hoverClass}`
    }`}
  >
    {children}
    {!(hideZero && !count) && (
      <span className='text-xs tabular-nums'>{formatCount(count)}</span>
    )}
  </button>
)

export default Post