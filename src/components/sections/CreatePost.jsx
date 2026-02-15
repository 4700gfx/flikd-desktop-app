import React, { useState, useRef } from 'react'
import Button from '../common/Button'

/**
 * CreatePost Component for Flik'd Application (Compact Twitter Style)
 * 
 * Streamlined post creation interface with movie search, ratings, and media upload
 * Colors: Gold (#D4AF37), Black (#0A0A0A), Grey (#0B375B), White (#FFFFFF)
 * Typography: Inter font family, Bebas Neue for headers
 * 
 * @param {object} currentUser - Current user object with id, name, avatar
 * @param {function} onPostCreate - Callback when post is created
 * @param {function} onMovieSearch - Callback to search for movies (returns promise with results)
 * @param {string} className - Additional CSS classes
 * @param {string} placeholder - Custom placeholder text
 */

const CreatePost = ({
  currentUser,
  onPostCreate,
  onMovieSearch,
  className = '',
  placeholder = "What's happening with movies?"
}) => {
  
  // State Management
  const [content, setContent] = useState('')
  const [postType, setPostType] = useState('status')
  const [selectedMovie, setSelectedMovie] = useState(null)
  const [rating, setRating] = useState(0)
  const [hoveredRating, setHoveredRating] = useState(0)
  const [images, setImages] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showMovieSearch, setShowMovieSearch] = useState(false)
  
  const fileInputRef = useRef(null)
  
  // Handle image upload
  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files)
    const newImages = files.map(file => ({
      file,
      preview: URL.createObjectURL(file)
    }))
    setImages([...images, ...newImages])
  }
  
  // Remove image
  const removeImage = (index) => {
    const newImages = images.filter((_, i) => i !== index)
    setImages(newImages)
  }
  
  // Handle movie search
  const handleMovieSearch = async (query) => {
    if (!query.trim() || !onMovieSearch) return
    
    setIsSearching(true)
    setSearchQuery(query)
    
    try {
      const results = await onMovieSearch(query)
      setSearchResults(results || [])
    } catch (error) {
      console.error('Movie search error:', error)
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }
  
  // Select movie
  const selectMovie = (movie) => {
    setSelectedMovie(movie)
    setShowMovieSearch(false)
    setSearchResults([])
    setSearchQuery('')
    if (postType === 'status') {
      setPostType('review')
    }
  }
  
  // Clear movie selection
  const clearMovie = () => {
    setSelectedMovie(null)
    setRating(0)
    if (postType === 'review') {
      setPostType('status')
    }
  }
  
  // Handle post submission
  const handleSubmit = async () => {
    if (!content.trim() && images.length === 0) return
    
    setIsSubmitting(true)
    
    try {
      const postData = {
        content: content.trim(),
        type: postType,
        movie: selectedMovie,
        rating: postType === 'review' ? rating : null,
        images: images.map(img => img.preview),
        timestamp: new Date().toISOString()
      }
      
      await onPostCreate(postData)
      
      // Reset form
      setContent('')
      setPostType('status')
      setSelectedMovie(null)
      setRating(0)
      setImages([])
      
    } catch (error) {
      console.error('Post creation error:', error)
    } finally {
      setIsSubmitting(false)
    }
  }
  
  // Get user initials for avatar
  const getUserInitials = () => {
    if (!currentUser?.name) return 'U'
    const names = currentUser.name.split(' ')
    if (names.length === 1) return names[0][0].toUpperCase()
    return (names[0][0] + names[names.length - 1][0]).toUpperCase()
  }
  
  return (
    <div className={`bg-flikd-black/50 backdrop-blur-sm border-b border-flikd-grey ${className}`}>
      
      {/* Main Content Area */}
      <div className='p-4 flex gap-3'>
        {/* User Avatar */}
        <div className='w-12 h-12 rounded-full bg-gradient-to-br from-flikd-gold to-yellow-600 flex items-center justify-center font-inter font-bold text-flikd-black ring-2 ring-flikd-grey flex-shrink-0'>
          {currentUser?.avatar ? (
            <img src={currentUser.avatar} alt={currentUser.name} className='w-full h-full rounded-full object-cover' />
          ) : (
            getUserInitials()
          )}
        </div>
        
        {/* Content Column */}
        <div className='flex-1 min-w-0'>
          
          {/* Post Type Pills - Compact */}
          <div className='flex gap-2 mb-3'>
            <button
              onClick={() => setPostType('status')}
              className={`px-3 py-1.5 rounded-full font-inter font-medium text-xs transition-all ${
                postType === 'status'
                  ? 'bg-flikd-gold text-flikd-black'
                  : 'text-flikd-white/60 hover:text-flikd-white hover:bg-flikd-grey/30'
              }`}
            >
              Status
            </button>
            <button
              onClick={() => {
                setPostType('review')
                if (!selectedMovie) setShowMovieSearch(true)
              }}
              className={`px-3 py-1.5 rounded-full font-inter font-medium text-xs transition-all ${
                postType === 'review'
                  ? 'bg-flikd-gold text-flikd-black'
                  : 'text-flikd-white/60 hover:text-flikd-white hover:bg-flikd-grey/30'
              }`}
            >
              Review
            </button>
            <button
              onClick={() => {
                setPostType('watchlist')
                if (!selectedMovie) setShowMovieSearch(true)
              }}
              className={`px-3 py-1.5 rounded-full font-inter font-medium text-xs transition-all ${
                postType === 'watchlist'
                  ? 'bg-flikd-gold text-flikd-black'
                  : 'text-flikd-white/60 hover:text-flikd-white hover:bg-flikd-grey/30'
              }`}
            >
              Watchlist
            </button>
          </div>
          
          {/* Movie Selection (Inline) */}
          {(postType === 'review' || postType === 'watchlist') && (
            <div className='mb-3'>
              {selectedMovie ? (
                // Selected Movie - Compact Display
                <div className='bg-flikd-grey/20 rounded-lg p-2 flex items-center gap-2 border border-flikd-grey/50'>
                  {selectedMovie.posterUrl && (
                    <img 
                      src={selectedMovie.posterUrl} 
                      alt={selectedMovie.title}
                      className='w-10 h-14 object-cover rounded flex-shrink-0'
                    />
                  )}
                  <div className='flex-1 min-w-0'>
                    <h4 className='font-inter font-semibold text-flikd-white text-xs truncate'>
                      {selectedMovie.title}
                    </h4>
                    <p className='text-xs text-flikd-white/50'>
                      {selectedMovie.year}
                    </p>
                  </div>
                  <button
                    onClick={clearMovie}
                    className='p-1 text-flikd-white/50 hover:text-red-500 transition-colors'
                    aria-label='Remove movie'
                  >
                    <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M6 18L18 6M6 6l12 12' />
                    </svg>
                  </button>
                </div>
              ) : showMovieSearch ? (
                // Movie Search Inline
                <div className='bg-flikd-grey/20 rounded-lg border border-flikd-grey/50 overflow-hidden'>
                  <div className='p-2'>
                    <input
                      type='text'
                      value={searchQuery}
                      onChange={(e) => handleMovieSearch(e.target.value)}
                      placeholder='Search movies...'
                      className='w-full bg-flikd-black/50 border border-flikd-grey/50 rounded-lg px-3 py-2 text-sm text-flikd-white placeholder:text-flikd-white/40 focus:outline-none focus:border-flikd-gold transition-colors'
                      autoFocus
                    />
                  </div>
                  
                  {searchResults.length > 0 && (
                    <div className='max-h-48 overflow-y-auto border-t border-flikd-grey/50'>
                      {searchResults.slice(0, 5).map((movie) => (
                        <button
                          key={movie.id}
                          onClick={() => selectMovie(movie)}
                          className='w-full p-2 flex items-center gap-2 hover:bg-flikd-grey/30 transition-colors text-left'
                        >
                          {movie.posterUrl && (
                            <img 
                              src={movie.posterUrl} 
                              alt={movie.title}
                              className='w-8 h-12 object-cover rounded flex-shrink-0'
                            />
                          )}
                          <div className='flex-1 min-w-0'>
                            <h4 className='font-inter font-medium text-flikd-white text-xs truncate'>
                              {movie.title}
                            </h4>
                            <p className='text-xs text-flikd-white/50'>{movie.year}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => setShowMovieSearch(true)}
                  className='text-flikd-gold hover:text-yellow-500 text-xs font-inter font-medium flex items-center gap-1 transition-colors'
                >
                  <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 4v16m8-8H4' />
                  </svg>
                  Add movie
                </button>
              )}
            </div>
          )}
          
          {/* Rating (Compact) */}
          {postType === 'review' && selectedMovie && (
            <div className='mb-3 flex items-center gap-1'>
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type='button'
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className='transition-transform hover:scale-110'
                >
                  <svg 
                    className={`w-5 h-5 transition-colors ${
                      star <= (hoveredRating || rating) 
                        ? 'text-flikd-gold fill-current' 
                        : 'text-flikd-grey'
                    }`}
                    viewBox='0 0 20 20'
                  >
                    <path d='M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z' />
                  </svg>
                </button>
              ))}
            </div>
          )}
          
          {/* Content Textarea */}
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={placeholder}
            rows={3}
            className='w-full bg-transparent text-flikd-white placeholder:text-flikd-white/40 font-inter text-base resize-none focus:outline-none mb-3'
          />
          
          {/* Image Preview Grid */}
          {images.length > 0 && (
            <div className='mb-3 grid grid-cols-2 gap-2'>
              {images.map((image, index) => (
                <div key={index} className='relative group'>
                  <img 
                    src={image.preview} 
                    alt={`Upload ${index + 1}`}
                    className='w-full h-32 object-cover rounded-lg'
                  />
                  <button
                    onClick={() => removeImage(index)}
                    className='absolute top-1 right-1 w-6 h-6 bg-flikd-black/80 hover:bg-red-500 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all'
                    aria-label='Remove image'
                  >
                    <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M6 18L18 6M6 6l12 12' />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
          
          {/* Actions Bar - Inline */}
          <div className='flex items-center justify-between pt-3 border-t border-flikd-grey/50'>
            <div className='flex items-center gap-1'>
              {/* Image Upload */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className='p-2 text-flikd-gold hover:bg-flikd-gold/10 rounded-full transition-all'
                aria-label='Add photo'
              >
                <svg className='w-5 h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z' />
                </svg>
              </button>
              <input
                ref={fileInputRef}
                type='file'
                accept='image/*'
                multiple
                onChange={handleImageUpload}
                className='hidden'
              />
              
              {/* Emoji */}
              <button
                className='p-2 text-flikd-gold hover:bg-flikd-gold/10 rounded-full transition-all'
                aria-label='Add emoji'
              >
                <svg className='w-5 h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' />
                </svg>
              </button>
              
              {/* Character Count */}
              <span className='text-xs text-flikd-white/30 ml-1'>
                {content.length > 450 && `${content.length}/500`}
              </span>
            </div>
            
            {/* Post Button - Compact */}
            <button
              onClick={handleSubmit}
              disabled={(!content.trim() && images.length === 0) || isSubmitting}
              className='px-4 py-2 bg-flikd-gold text-flikd-black rounded-full font-inter font-bold text-sm hover:bg-yellow-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed'
            >
              {isSubmitting ? 'Posting...' : 'Post'}
            </button>
          </div>
          
        </div>
      </div>
    </div>
  )
}

export default CreatePost