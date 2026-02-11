import React, { useState } from 'react'

/**
 * MovieCard Component for Flik'd Application
 * 
 * Displays movie/show information with poster, rating, and interactive actions
 * Colors: Gold (#D4AF37), Black (#0A0A0A), Grey (#0B375B), White (#FFFFFF)
 * Typography: Inter font family
 * Supports both compact and full card layouts
 * 
 * @param {object} movie - Movie data object containing:
 *   - id: Movie identifier
 *   - title: Movie title
 *   - posterUrl: Poster image URL
 *   - rating: Average rating (0-10)
 *   - userRating: Current user's rating (0-5 stars)
 *   - year: Release year
 *   - genre: Genre(s)
 *   - duration: Runtime
 *   - overview: Plot summary
 *   - isInWatchlist: Boolean for watchlist status
 * @param {function} onAddToWatchlist - Callback when adding/removing from watchlist
 * @param {function} onRate - Callback when rating movie
 * @param {function} onViewDetails - Callback when viewing movie details
 * @param {boolean} compact - Use compact card layout (for grids)
 * @param {boolean} showActions - Show action buttons on hover
 * @param {string} className - Additional CSS classes
 */

const MovieCard = ({ 
  movie,
  onAddToWatchlist,
  onRate,
  onViewDetails,
  compact = false,
  showActions = true,
  className = ''
}) => {
  
  const [isHovered, setIsHovered] = useState(false)
  const [imageError, setImageError] = useState(false)
  
  const {
    id,
    title,
    posterUrl,
    rating,
    userRating,
    year,
    genre,
    duration,
    overview,
    isInWatchlist = false
  } = movie
  
  // Fallback placeholder when image fails to load
  const placeholderImage = (
    <div className='w-full h-full bg-gradient-to-br from-flikd-grey to-flikd-black flex items-center justify-center'>
      <svg className='w-16 h-16 text-flikd-grey' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={1.5} d='M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z' />
      </svg>
    </div>
  )
  
  // COMPACT LAYOUT - For grid displays
  if (compact) {
    return (
      <div 
        className={`group cursor-pointer ${className}`}
        onClick={() => onViewDetails && onViewDetails(movie)}
      >
        <div className='relative aspect-[2/3] rounded-xl overflow-hidden bg-flikd-black shadow-lg transition-all duration-300 group-hover:shadow-2xl group-hover:shadow-flikd-gold/20 group-hover:scale-105'>
          {/* Poster Image */}
          {imageError ? placeholderImage : (
            <img 
              src={posterUrl} 
              alt={title}
              className='w-full h-full object-cover'
              onError={() => setImageError(true)}
            />
          )}
          
          {/* Hover Overlay with Info */}
          <div className='absolute inset-0 bg-gradient-to-t from-flikd-black via-flikd-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4'>
            <p className='text-flikd-white font-inter text-sm font-semibold mb-1 line-clamp-2'>{title}</p>
            <div className='flex items-center gap-2 text-xs text-flikd-white/70'>
              {year && <span>{year}</span>}
              {rating && (
                <>
                  <span>•</span>
                  <span className='flex items-center gap-1'>
                    <svg className='w-3 h-3 text-flikd-gold fill-current' viewBox='0 0 20 20'>
                      <path d='M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z' />
                    </svg>
                    {rating}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }
  
  // FULL LAYOUT - For detailed card view
  return (
    <div 
      className={`group bg-flikd-black/50 backdrop-blur-sm rounded-2xl overflow-hidden border border-flikd-grey transition-all duration-300 hover:border-flikd-gold/50 hover:shadow-xl hover:shadow-flikd-gold/10 ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Poster Section */}
      <div className='relative aspect-[2/3] bg-flikd-black overflow-hidden'>
        {/* Poster Image */}
        {imageError ? placeholderImage : (
          <img 
            src={posterUrl} 
            alt={title}
            className='w-full h-full object-cover transition-transform duration-500 group-hover:scale-110'
            onError={() => setImageError(true)}
          />
        )}
        
        {/* Rating Badge */}
        {rating && (
          <div className='absolute top-3 right-3 bg-flikd-black/80 backdrop-blur-sm px-3 py-1.5 rounded-full flex items-center gap-1'>
            <svg className='w-4 h-4 text-flikd-gold fill-current' viewBox='0 0 20 20'>
              <path d='M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z' />
            </svg>
            <span className='text-flikd-white font-inter text-sm font-semibold'>{rating}</span>
          </div>
        )}
        
        {/* Watchlist Indicator */}
        {isInWatchlist && (
          <div className='absolute top-3 left-3 bg-flikd-gold text-flikd-black px-3 py-1 rounded-full flex items-center gap-1'>
            <svg className='w-4 h-4' fill='currentColor' viewBox='0 0 20 20'>
              <path d='M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z' />
            </svg>
            <span className='text-xs font-inter font-bold'>Saved</span>
          </div>
        )}
        
        {/* Action Overlay (on hover) */}
        {showActions && isHovered && (
          <div className='absolute inset-0 bg-flikd-black/60 backdrop-blur-sm flex items-center justify-center gap-3 transition-opacity duration-300'>
            {/* View Details Button */}
            <button
              onClick={(e) => {
                e.stopPropagation()
                onViewDetails && onViewDetails(movie)
              }}
              className='bg-flikd-gold text-flikd-black p-3 rounded-full hover:bg-yellow-500 transition-all transform hover:scale-110'
              title='View Details'
            >
              <svg className='w-5 h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M15 12a3 3 0 11-6 0 3 3 0 016 0z' />
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z' />
              </svg>
            </button>
            
            {/* Watchlist Toggle Button */}
            <button
              onClick={(e) => {
                e.stopPropagation()
                onAddToWatchlist && onAddToWatchlist(movie)
              }}
              className={`${isInWatchlist ? 'bg-flikd-grey' : 'bg-flikd-white/20'} text-flikd-white p-3 rounded-full hover:bg-flikd-white/30 transition-all transform hover:scale-110`}
              title={isInWatchlist ? 'Remove from Watchlist' : 'Add to Watchlist'}
            >
              <svg className='w-5 h-5' fill={isInWatchlist ? 'currentColor' : 'none'} stroke='currentColor' viewBox='0 0 24 24'>
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z' />
              </svg>
            </button>
            
            {/* Rate Button */}
            <button
              onClick={(e) => {
                e.stopPropagation()
                onRate && onRate(movie)
              }}
              className='bg-flikd-white/20 text-flikd-white p-3 rounded-full hover:bg-flikd-white/30 transition-all transform hover:scale-110'
              title='Rate Movie'
            >
              <svg className='w-5 h-5' fill={userRating ? 'currentColor' : 'none'} stroke='currentColor' viewBox='0 0 24 24'>
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z' />
              </svg>
            </button>
          </div>
        )}
      </div>
      
      {/* Info Section */}
      <div className='p-4'>
        {/* Title */}
        <h3 
          className='font-inter text-flikd-white font-bold text-lg mb-2 line-clamp-1 group-hover:text-flikd-gold transition-colors cursor-pointer' 
          onClick={() => onViewDetails && onViewDetails(movie)}
        >
          {title}
        </h3>
        
        {/* Metadata */}
        <div className='flex items-center gap-3 text-sm text-flikd-white/60 mb-3'>
          {year && <span>{year}</span>}
          {genre && (
            <>
              <span>•</span>
              <span className='line-clamp-1'>{genre}</span>
            </>
          )}
          {duration && (
            <>
              <span>•</span>
              <span>{duration}</span>
            </>
          )}
        </div>
        
        {/* Overview */}
        {overview && (
          <p className='font-inter text-sm text-flikd-white/60 line-clamp-2 mb-3'>
            {overview}
          </p>
        )}
        
        {/* User Rating Display */}
        {userRating && (
          <div className='flex items-center gap-2 pt-3 border-t border-flikd-grey'>
            <span className='font-inter text-xs text-flikd-white/50'>Your Rating:</span>
            <div className='flex items-center gap-1'>
              {[...Array(5)].map((_, i) => (
                <svg 
                  key={i} 
                  className={`w-4 h-4 ${i < userRating ? 'text-flikd-gold fill-current' : 'text-flikd-grey'}`} 
                  viewBox='0 0 20 20'
                >
                  <path d='M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z' />
                </svg>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default MovieCard