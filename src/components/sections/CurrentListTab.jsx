import React, { useState, useEffect } from 'react'

/**
 * CurrentListTab Component for Flik'd Application
 * 
 * Displays user's current watchlist with movie cards
 * Colors: Gold (#D4AF37), Black (#0A0A0A), Grey (#0B375B), White (#FFFFFF)
 * Typography: Bebas Neue for headers, Inter for body
 * 
 * @param {array} movies - Array of movie objects in user's list
 * @param {function} onMovieClick - Callback when movie is clicked
 * @param {function} onViewAll - Callback to view full watchlist
 * @param {number} maxDisplay - Maximum number of movies to show (default: 5)
 */

const CurrentListTab = ({ 
  movies = [],
  onMovieClick,
  onViewAll,
  maxDisplay = 5
}) => {
  const [hoveredMovie, setHoveredMovie] = useState(null)
  
  // Default mock data if no movies provided
  const defaultMovies = [
    {
      id: 1,
      title: 'The Shawshank Redemption',
      year: '1994',
      posterUrl: 'https://image.tmdb.org/t/p/w200/q6y0Go1tsGEsmtFryDOJo3dEmqu.jpg',
      progress: 100
    },
    {
      id: 2,
      title: 'The Dark Knight',
      year: '2008',
      posterUrl: 'https://image.tmdb.org/t/p/w200/qJ2tW6WMUDux911r6m7haRef0WH.jpg',
      progress: 75
    },
    {
      id: 3,
      title: 'Inception',
      year: '2010',
      posterUrl: 'https://image.tmdb.org/t/p/w200/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg',
      progress: 0
    }
  ]
  
  const displayMovies = movies.length > 0 ? movies : defaultMovies
  const limitedMovies = displayMovies.slice(0, maxDisplay)
  
  return (
    <div className='bg-flikd-black/50 backdrop-blur-sm border border-flikd-grey rounded-2xl overflow-hidden'>
      
      {/* Header */}
      <div className='p-4 border-b border-flikd-grey flex items-center justify-between'>
        <div className='flex items-center gap-2'>
          <svg className='w-5 h-5 text-flikd-gold' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z' />
          </svg>
          <h2 className='font-bebas text-xl tracking-wide text-flikd-white'>
            WATCHLIST
          </h2>
        </div>
        <span className='text-xs font-inter font-semibold text-flikd-white/40 bg-flikd-grey/30 px-2 py-1 rounded-full'>
          {displayMovies.length}
        </span>
      </div>
      
      {/* Movies List */}
      <div className='p-3 space-y-2'>
        {limitedMovies.map((movie, index) => (
          <button
            key={movie.id}
            onClick={() => onMovieClick && onMovieClick(movie)}
            onMouseEnter={() => setHoveredMovie(movie.id)}
            onMouseLeave={() => setHoveredMovie(null)}
            className='w-full group'
            style={{ 
              animation: `slideInRight 0.3s ease-out ${index * 0.05}s both` 
            }}
          >
            <div className='flex items-center gap-3 p-2 rounded-xl hover:bg-flikd-grey/30 transition-all duration-200'>
              {/* Movie Poster */}
              <div className='relative flex-shrink-0'>
                <div className='w-12 h-16 rounded-lg overflow-hidden bg-flikd-grey shadow-lg group-hover:shadow-flikd-gold/20 transition-shadow'>
                  {movie.posterUrl ? (
                    <img 
                      src={movie.posterUrl} 
                      alt={movie.title}
                      className='w-full h-full object-cover group-hover:scale-110 transition-transform duration-300'
                    />
                  ) : (
                    <div className='w-full h-full flex items-center justify-center'>
                      <svg className='w-6 h-6 text-flikd-white/20' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z' />
                      </svg>
                    </div>
                  )}
                </div>
                
                {/* Progress Ring */}
                {movie.progress !== undefined && movie.progress > 0 && (
                  <div className='absolute -bottom-1 -right-1 w-5 h-5'>
                    <svg className='w-5 h-5 transform -rotate-90' viewBox='0 0 20 20'>
                      <circle
                        cx='10'
                        cy='10'
                        r='8'
                        fill='none'
                        stroke='rgba(10, 10, 10, 0.8)'
                        strokeWidth='2'
                      />
                      <circle
                        cx='10'
                        cy='10'
                        r='8'
                        fill='none'
                        stroke='#D4AF37'
                        strokeWidth='2'
                        strokeDasharray={`${2 * Math.PI * 8}`}
                        strokeDashoffset={`${2 * Math.PI * 8 * (1 - movie.progress / 100)}`}
                        className='transition-all duration-500'
                      />
                    </svg>
                  </div>
                )}
              </div>
              
              {/* Movie Info */}
              <div className='flex-1 min-w-0 text-left'>
                <h3 className='font-inter font-semibold text-sm text-flikd-white truncate group-hover:text-flikd-gold transition-colors'>
                  {movie.title}
                </h3>
                <div className='flex items-center gap-2 mt-0.5'>
                  <span className='text-xs text-flikd-white/50 font-inter'>
                    {movie.year}
                  </span>
                  {movie.progress !== undefined && (
                    <>
                      <span className='text-flikd-white/30'>•</span>
                      <span className='text-xs text-flikd-gold font-inter font-medium'>
                        {movie.progress === 100 ? 'Watched' : movie.progress === 0 ? 'Not started' : `${movie.progress}%`}
                      </span>
                    </>
                  )}
                </div>
              </div>
              
              {/* Hover Arrow */}
              <svg 
                className={`w-4 h-4 text-flikd-gold transition-all duration-200 ${
                  hoveredMovie === movie.id ? 'translate-x-0 opacity-100' : '-translate-x-2 opacity-0'
                }`} 
                fill='none' 
                stroke='currentColor' 
                viewBox='0 0 24 24'
              >
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 5l7 7-7 7' />
              </svg>
            </div>
          </button>
        ))}
      </div>
      
      {/* View All Button */}
      {displayMovies.length > maxDisplay && (
        <div className='p-3 pt-0'>
          <button
            onClick={onViewAll}
            className='w-full py-2.5 bg-flikd-grey/20 hover:bg-flikd-grey/40 border border-flikd-grey/50 hover:border-flikd-gold/50 rounded-xl text-flikd-white/80 hover:text-flikd-gold font-inter font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2'
          >
            View All {displayMovies.length} Movies
            <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M17 8l4 4m0 0l-4 4m4-4H3' />
            </svg>
          </button>
        </div>
      )}
      
      {/* Empty State */}
      {displayMovies.length === 0 && (
        <div className='p-8 text-center'>
          <div className='w-16 h-16 bg-flikd-grey/20 rounded-full flex items-center justify-center mx-auto mb-3'>
            <svg className='w-8 h-8 text-flikd-white/20' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z' />
            </svg>
          </div>
          <p className='font-inter text-sm text-flikd-white/50 mb-1'>
            Your watchlist is empty
          </p>
          <p className='font-inter text-xs text-flikd-white/30'>
            Add movies to start tracking
          </p>
        </div>
      )}
      
      {/* Animations */}
      <style jsx>{`
        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(10px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  )
}

export default CurrentListTab