import React, { useState } from 'react'

/**
 * Post Component for Flik'd - Movie Reviews
 * 
 * Displays movie reviews with ratings
 * Synced with Flikd schema (posts table structure)
 * Brand Colors: Gold (#D4AF37), Black (#0A0A0A), Grey (#1A1A1A/#2D2D2D)
 */

const Post = ({ 
  post,
  currentUserId,
  onUserClick,
  className = '',
  style = {}
}) => {
  
  const {
    id,
    user,
    movie,
    content,
    rating,
    timestamp,
    type = 'review'
  } = post
  
  const isOwnPost = currentUserId === user?.id
  
  // Format timestamp to relative time
  const formatTimestamp = (date) => {
    const now = new Date()
    const postDate = new Date(date)
    const diffInSeconds = Math.floor((now - postDate) / 1000)
    
    if (diffInSeconds < 60) return 'Just now'
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`
    
    return postDate.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: postDate.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    })
  }
  
  // Get user initials for avatar fallback
  const getUserInitials = () => {
    if (!user?.displayName) return '?'
    const names = user.displayName.split(' ')
    if (names.length === 1) return names[0][0].toUpperCase()
    return (names[0][0] + names[names.length - 1][0]).toUpperCase()
  }

  // Get poster URL from TMDB
  const getPosterUrl = () => {
    if (!movie?.posterPath) return null
    return `https://image.tmdb.org/t/p/w342${movie.posterPath}`
  }

  // Convert rating from 0-10 to 0-5 stars for display
  const getStarRating = () => {
    if (!rating) return 0
    return Math.round(rating / 2) // Convert 0-10 to 0-5
  }

  const starRating = getStarRating()
  
  return (
    <article 
      className={`bg-[#0A0A0A] hover:bg-[#0A0A0A]/80 transition-all duration-300 ${className}`}
      style={style}
    >
      
      {/* POST HEADER */}
      <div className='p-6 flex items-start justify-between'>
        <div className='flex items-center gap-3 flex-1 min-w-0'>
          {/* User Avatar */}
          <button 
            onClick={() => onUserClick && onUserClick(user)}
            className='flex-shrink-0 group relative'
          >
            <div className='w-12 h-12 rounded-full bg-gradient-to-br from-[#D4AF37] to-[#B8961F] flex items-center justify-center font-inter font-bold text-[#0A0A0A] text-base ring-2 ring-[#1A1A1A] group-hover:ring-[#D4AF37] transition-all duration-300 transform group-hover:scale-105'>
              {user?.avatar ? (
                <img 
                  src={user.avatar} 
                  alt={user.displayName} 
                  className='w-full h-full rounded-full object-cover'
                  loading='lazy'
                />
              ) : (
                getUserInitials()
              )}
            </div>
            {/* User Level Badge */}
            {user?.level && user.level > 1 && (
              <div className='absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-gradient-to-r from-[#D4AF37] to-[#E8C55B] flex items-center justify-center border-2 border-[#0A0A0A]'>
                <span className='font-inter font-bold text-[#0A0A0A] text-xs'>
                  {user.level}
                </span>
              </div>
            )}
          </button>
          
          {/* User Info */}
          <div className='flex-1 min-w-0'>
            <button 
              onClick={() => onUserClick && onUserClick(user)}
              className='block group'
            >
              <p className='font-inter font-bold text-white group-hover:text-[#D4AF37] transition-colors truncate text-base'>
                {user?.displayName || 'User'}
              </p>
              {user?.username && (
                <p className='font-inter text-xs text-white/40 group-hover:text-white/60 transition-colors'>
                  @{user.username}
                </p>
              )}
            </button>
          </div>
          
          {/* Timestamp */}
          <div className='flex items-center gap-2 flex-shrink-0'>
            <span className='text-xs text-white/40 font-inter'>
              {formatTimestamp(timestamp)}
            </span>
          </div>
        </div>
        
        {/* More Options Menu (for own posts) */}
        {isOwnPost && (
          <button className='text-white/30 hover:text-white/80 transition-colors p-2 rounded-lg hover:bg-[#1A1A1A] ml-2 flex-shrink-0'>
            <svg className='w-5 h-5' fill='currentColor' viewBox='0 0 20 20'>
              <path d='M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z' />
            </svg>
          </button>
        )}
      </div>
      
      {/* MOVIE CARD */}
      {movie && (
        <div className='px-6 pb-4'>
          <div className='group bg-gradient-to-br from-[#1A1A1A] to-[#0A0A0A] rounded-2xl p-5 flex items-start gap-5 border border-[#2D2D2D] hover:border-[#D4AF37]/30 transition-all duration-300 cursor-pointer hover:shadow-lg hover:shadow-[#D4AF37]/5 relative overflow-hidden'>
            
            {/* Decorative gradient overlay */}
            <div className='absolute inset-0 bg-gradient-to-br from-[#D4AF37]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none' />
            
            {/* Movie Poster */}
            {getPosterUrl() ? (
              <div className='relative flex-shrink-0'>
                <img 
                  src={getPosterUrl()} 
                  alt={movie.title}
                  className='w-24 h-36 object-cover rounded-xl shadow-lg group-hover:scale-105 transition-transform duration-300'
                  loading='lazy'
                />
                {/* Media Type Badge */}
                {movie.mediaType === 'tv' && (
                  <div className='absolute -top-2 -left-2 px-2 py-1 bg-blue-500 rounded-md shadow-lg'>
                    <span className='font-inter font-bold text-white text-xs'>TV</span>
                  </div>
                )}
              </div>
            ) : (
              <div className='w-24 h-36 bg-[#2D2D2D] rounded-xl flex items-center justify-center flex-shrink-0'>
                <svg className='w-10 h-10 text-[#1A1A1A]' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={1.5} d='M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z' />
                </svg>
              </div>
            )}
            
            {/* Movie Details */}
            <div className='flex-1 min-w-0 relative z-10'>
              <h4 className='font-inter font-bold text-white text-lg mb-2 group-hover:text-[#D4AF37] transition-colors line-clamp-2'>
                {movie.title}
              </h4>
              
              {/* Metadata */}
              {movie.year && (
                <div className='flex items-center gap-3 text-sm text-white/50 mb-3'>
                  <span className='font-inter font-medium'>{movie.year}</span>
                  <span className='text-white/20'>•</span>
                  <span className='font-inter capitalize'>{movie.mediaType || 'Movie'}</span>
                </div>
              )}
              
              {/* Rating Display */}
              {rating && (
                <div className='flex items-center gap-3 mt-3'>
                  <div className='flex items-center gap-1'>
                    {[...Array(5)].map((_, i) => (
                      <svg 
                        key={i} 
                        className={`w-5 h-5 transition-colors ${
                          i < starRating 
                            ? 'text-[#D4AF37] fill-current' 
                            : 'text-[#2D2D2D]'
                        }`} 
                        viewBox='0 0 20 20'
                      >
                        <path d='M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z' />
                      </svg>
                    ))}
                  </div>
                  <div className='flex items-center gap-2'>
                    <span className='font-inter font-bold text-white text-base'>
                      {rating.toFixed(1)}
                    </span>
                    <span className='text-white/30 text-sm font-inter'>/ 10</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* REVIEW CONTENT */}
      {content && content.trim() && (
        <div className='px-6 pb-6'>
          <p className='font-inter text-white/95 text-[15px] leading-relaxed whitespace-pre-wrap'>
            {content}
          </p>
        </div>
      )}
      
    </article>
  )
}

export default Post