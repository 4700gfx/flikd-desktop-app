import React, { useState, useRef } from 'react'

/**
 * Enhanced CreatePost Component for Flik'd
 * 
 * Multi-tab interface for:
 * - Writing Reviews
 * - Creating Lists
 * - Quick Add to Existing Lists
 * 
 * Brand Colors: Gold (#D4AF37), Black (#0A0A0A), Grey (#1A1A1A/#2D2D2D)
 */

const CreatePost = ({
  currentUser,
  onPostCreate,
  onListCreate,
  onListItemAdd,
  onMovieSearch,
  userLists = [],
  className = ''
}) => {
  
  // Tab Management
  const [activeTab, setActiveTab] = useState('review') // 'review', 'list', 'quick-add'
  
  // Review State
  const [content, setContent] = useState('')
  const [selectedMovie, setSelectedMovie] = useState(null)
  const [rating, setRating] = useState(0)
  const [hoveredRating, setHoveredRating] = useState(0)
  
  // List State
  const [listName, setListName] = useState('')
  const [listDescription, setListDescription] = useState('')
  const [listMovies, setListMovies] = useState([])
  const [isPublic, setIsPublic] = useState(false)
  const [isCollaborative, setIsCollaborative] = useState(false)
  
  // Quick Add State
  const [selectedList, setSelectedList] = useState(null)
  const [quickAddMovie, setQuickAddMovie] = useState(null)
  
  // Search State
  const [isSearching, setIsSearching] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [showMovieSearch, setShowMovieSearch] = useState(false)
  const [searchContext, setSearchContext] = useState('review') // 'review', 'list', 'quick-add'
  
  // UI State
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  
  const searchTimeoutRef = useRef(null)
  
  // Handle movie search with debouncing
  const handleMovieSearch = async (query) => {
    setSearchQuery(query)
    
    if (!query.trim()) {
      setSearchResults([])
      setIsSearching(false)
      return
    }
    
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }
    
    setIsSearching(true)
    
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const results = await onMovieSearch(query)
        setSearchResults(results || [])
      } catch (error) {
        console.error('Movie search error:', error)
        setSearchResults([])
      } finally {
        setIsSearching(false)
      }
    }, 300)
  }
  
  // Select movie based on context
  const selectMovie = (movie) => {
    if (searchContext === 'review') {
      setSelectedMovie(movie)
      setShowMovieSearch(false)
    } else if (searchContext === 'list') {
      // Add to list movies if not already added
      if (!listMovies.find(m => m.id === movie.id && m.mediaType === movie.mediaType)) {
        setListMovies([...listMovies, movie])
      }
      setShowMovieSearch(false)
    } else if (searchContext === 'quick-add') {
      setQuickAddMovie(movie)
      setShowMovieSearch(false)
    }
    
    setSearchResults([])
    setSearchQuery('')
  }
  
  // Open movie search
  const openMovieSearch = (context) => {
    setSearchContext(context)
    setShowMovieSearch(true)
  }
  
  // Clear selections
  const clearMovie = () => {
    setSelectedMovie(null)
    setRating(0)
  }
  
  const removeListMovie = (index) => {
    setListMovies(listMovies.filter((_, i) => i !== index))
  }
  
  // Handle Review Submission
  const handleReviewSubmit = async () => {
    if (!selectedMovie) {
      setError('Please select a movie or TV show')
      return
    }
    
    if (!content.trim()) {
      setError('Please write your review')
      return
    }
    
    if (rating === 0) {
      setError('Please add a rating')
      return
    }
    
    setIsSubmitting(true)
    setError(null)
    
    try {
      const result = await onPostCreate({
        content: content.trim(),
        movie: selectedMovie,
        rating: rating,
        timestamp: new Date().toISOString()
      })
      
      if (result.success) {
        setContent('')
        setSelectedMovie(null)
        setRating(0)
        setSuccess('Review posted successfully! +10 points')
        setTimeout(() => setSuccess(null), 3000)
      } else {
        setError(result.error || 'Failed to create review')
      }
    } catch (error) {
      console.error('Review creation error:', error)
      setError('Something went wrong. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }
  
  // Handle List Creation
  const handleListSubmit = async () => {
    if (!listName.trim()) {
      setError('Please enter a list name')
      return
    }
    
    if (listMovies.length === 0) {
      setError('Please add at least one movie to your list')
      return
    }
    
    setIsSubmitting(true)
    setError(null)
    
    try {
      const result = await onListCreate({
        name: listName.trim(),
        description: listDescription.trim(),
        movies: listMovies,
        isPublic,
        isCollaborative
      })
      
      if (result.success) {
        setListName('')
        setListDescription('')
        setListMovies([])
        setIsPublic(false)
        setIsCollaborative(false)
        setSuccess(`List "${listName}" created successfully!`)
        setTimeout(() => setSuccess(null), 3000)
      } else {
        setError(result.error || 'Failed to create list')
      }
    } catch (error) {
      console.error('List creation error:', error)
      setError('Something went wrong. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }
  
  // Handle Quick Add
  const handleQuickAdd = async () => {
    if (!selectedList) {
      setError('Please select a list')
      return
    }
    
    if (!quickAddMovie) {
      setError('Please select a movie to add')
      return
    }
    
    setIsSubmitting(true)
    setError(null)
    
    try {
      const result = await onListItemAdd({
        listId: selectedList.id,
        movie: quickAddMovie
      })
      
      if (result.success) {
        setQuickAddMovie(null)
        setSelectedList(null)
        setSuccess(`Added to "${selectedList.name}"!`)
        setTimeout(() => setSuccess(null), 3000)
      } else {
        setError(result.error || 'Failed to add to list')
      }
    } catch (error) {
      console.error('Quick add error:', error)
      setError('Something went wrong. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }
  
  const getUserInitials = () => {
    if (!currentUser?.displayName) return 'U'
    const names = currentUser.displayName.split(' ')
    if (names.length === 1) return names[0][0].toUpperCase()
    return (names[0][0] + names[names.length - 1][0]).toUpperCase()
  }

  const getPosterUrl = (posterPath) => {
    if (!posterPath) return null
    return `https://image.tmdb.org/t/p/w185${posterPath}`
  }
  
  return (
    <div className={`bg-[#0A0A0A] border-b border-[#1A1A1A] ${className}`}>
      
      {/* Success Banner */}
      {success && (
        <div className='mx-6 mt-4 p-3 bg-green-500/10 border border-green-500/30 rounded-xl flex items-center gap-3'>
          <svg className='w-5 h-5 text-green-500 flex-shrink-0' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M5 13l4 4L19 7' />
          </svg>
          <p className='text-sm text-green-400 font-inter flex-1'>{success}</p>
        </div>
      )}
      
      {/* Error Banner */}
      {error && (
        <div className='mx-6 mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-3'>
          <svg className='w-5 h-5 text-red-500 flex-shrink-0' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' />
          </svg>
          <p className='text-sm text-red-400 font-inter flex-1'>{error}</p>
          <button onClick={() => setError(null)} className='text-red-400 hover:text-red-300'>
            <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M6 18L18 6M6 6l12 12' />
            </svg>
          </button>
        </div>
      )}
      
      {/* Main Content */}
      <div className='p-6 flex gap-4'>
        {/* User Avatar */}
        <div className='w-12 h-12 rounded-full bg-gradient-to-br from-[#D4AF37] to-[#B8961F] flex items-center justify-center font-inter font-bold text-[#0A0A0A] text-base ring-2 ring-[#1A1A1A] flex-shrink-0'>
          {currentUser?.avatar ? (
            <img src={currentUser.avatar} alt={currentUser.displayName} className='w-full h-full rounded-full object-cover' />
          ) : (
            getUserInitials()
          )}
        </div>
        
        {/* Content Column */}
        <div className='flex-1 min-w-0'>
          
          {/* Tab Navigation */}
          <div className='flex gap-2 mb-6 border-b border-[#1A1A1A] pb-2'>
            <button
              onClick={() => setActiveTab('review')}
              className={`px-4 py-2 rounded-t-lg font-inter font-semibold text-sm transition-all ${
                activeTab === 'review'
                  ? 'bg-[#1A1A1A] text-[#D4AF37] border-b-2 border-[#D4AF37]'
                  : 'text-white/60 hover:text-white hover:bg-[#1A1A1A]/50'
              }`}
            >
              ⭐ Write Review
            </button>
            <button
              onClick={() => setActiveTab('list')}
              className={`px-4 py-2 rounded-t-lg font-inter font-semibold text-sm transition-all ${
                activeTab === 'list'
                  ? 'bg-[#1A1A1A] text-[#D4AF37] border-b-2 border-[#D4AF37]'
                  : 'text-white/60 hover:text-white hover:bg-[#1A1A1A]/50'
              }`}
            >
              📋 Create List
            </button>
            <button
              onClick={() => setActiveTab('quick-add')}
              className={`px-4 py-2 rounded-t-lg font-inter font-semibold text-sm transition-all ${
                activeTab === 'quick-add'
                  ? 'bg-[#1A1A1A] text-[#D4AF37] border-b-2 border-[#D4AF37]'
                  : 'text-white/60 hover:text-white hover:bg-[#1A1A1A]/50'
              }`}
            >
              ⚡ Quick Add
            </button>
          </div>
          
          {/* TAB: WRITE REVIEW */}
          {activeTab === 'review' && (
            <div className='space-y-4'>
              <h3 className='font-bebas text-xl text-white tracking-wide'>
                WRITE A REVIEW
              </h3>
              <p className='text-xs text-white/50 font-inter'>
                Share your thoughts and earn 10 points!
              </p>
              
              {/* Movie Selection */}
              {selectedMovie ? (
                <div className='bg-[#1A1A1A] rounded-xl p-3 flex items-center gap-3 border border-[#2D2D2D]'>
                  {getPosterUrl(selectedMovie.posterPath) && (
                    <img src={getPosterUrl(selectedMovie.posterPath)} alt={selectedMovie.title} className='w-12 h-16 object-cover rounded' />
                  )}
                  <div className='flex-1'>
                    <h4 className='font-inter font-semibold text-white text-sm'>{selectedMovie.title}</h4>
                    <p className='text-xs text-white/50'>{selectedMovie.year} • {selectedMovie.mediaType}</p>
                  </div>
                  <button onClick={clearMovie} className='p-2 text-white/40 hover:text-red-500'>
                    <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M6 18L18 6M6 6l12 12' />
                    </svg>
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => openMovieSearch('review')}
                  className='w-full p-4 border-2 border-dashed border-[#2D2D2D] rounded-xl hover:border-[#D4AF37] transition-colors group'
                >
                  <div className='flex items-center justify-center gap-2 text-white/40 group-hover:text-[#D4AF37]'>
                    <svg className='w-5 h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 4v16m8-8H4' />
                    </svg>
                    <span className='font-inter font-semibold text-sm'>Select Movie or TV Show</span>
                  </div>
                </button>
              )}
              
              {/* Rating */}
              {selectedMovie && (
                <div>
                  <label className='block text-sm font-inter font-semibold text-white mb-2'>Your Rating</label>
                  <div className='flex items-center gap-2'>
                    {[1,2,3,4,5,6,7,8,9,10].map((value) => (
                      <button
                        key={value}
                        onClick={() => setRating(value)}
                        onMouseEnter={() => setHoveredRating(value)}
                        onMouseLeave={() => setHoveredRating(0)}
                        className={`w-10 h-10 rounded-lg font-inter font-bold text-sm transition-all ${
                          value <= (hoveredRating || rating)
                            ? 'bg-[#D4AF37] text-[#0A0A0A] scale-110'
                            : 'bg-[#1A1A1A] text-white/40'
                        }`}
                      >
                        {value}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Review Text */}
              {selectedMovie && (
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value.slice(0, 1000))}
                  placeholder="What did you think?"
                  rows={4}
                  className='w-full bg-[#1A1A1A] border border-[#2D2D2D] rounded-xl px-4 py-3 text-white placeholder:text-white/30 font-inter text-sm resize-none focus:outline-none focus:border-[#D4AF37]'
                />
              )}
              
              {/* Submit */}
              {selectedMovie && (
                <div className='flex justify-end'>
                  <button
                    onClick={handleReviewSubmit}
                    disabled={!selectedMovie || !content.trim() || rating === 0 || isSubmitting}
                    className='px-6 py-2.5 bg-[#D4AF37] text-[#0A0A0A] rounded-full font-inter font-bold text-sm hover:bg-[#E8C55B] disabled:opacity-40 disabled:cursor-not-allowed'
                  >
                    {isSubmitting ? 'Posting...' : 'Post Review'}
                  </button>
                </div>
              )}
            </div>
          )}
          
          {/* TAB: CREATE LIST */}
          {activeTab === 'list' && (
            <div className='space-y-4'>
              <h3 className='font-bebas text-xl text-white tracking-wide'>CREATE A NEW LIST</h3>
              
              <input
                value={listName}
                onChange={(e) => setListName(e.target.value.slice(0, 100))}
                placeholder="List name (e.g., 'Best Sci-Fi Movies')"
                className='w-full bg-[#1A1A1A] border border-[#2D2D2D] rounded-xl px-4 py-3 text-white placeholder:text-white/30 font-inter text-sm focus:outline-none focus:border-[#D4AF37]'
              />
              
              <textarea
                value={listDescription}
                onChange={(e) => setListDescription(e.target.value.slice(0, 500))}
                placeholder="Description (optional)"
                rows={2}
                className='w-full bg-[#1A1A1A] border border-[#2D2D2D] rounded-xl px-4 py-3 text-white placeholder:text-white/30 font-inter text-sm resize-none focus:outline-none focus:border-[#D4AF37]'
              />
              
              {/* List Settings */}
              <div className='flex gap-4'>
                <label className='flex items-center gap-2 cursor-pointer'>
                  <input type='checkbox' checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} className='w-4 h-4' />
                  <span className='text-sm font-inter text-white'>Public</span>
                </label>
                <label className='flex items-center gap-2 cursor-pointer'>
                  <input type='checkbox' checked={isCollaborative} onChange={(e) => setIsCollaborative(e.target.checked)} className='w-4 h-4' />
                  <span className='text-sm font-inter text-white'>Collaborative</span>
                </label>
              </div>
              
              {/* Add Movies */}
              <button
                onClick={() => openMovieSearch('list')}
                className='w-full p-3 border-2 border-dashed border-[#2D2D2D] rounded-xl hover:border-[#D4AF37] transition-colors'
              >
                <span className='text-sm font-inter font-semibold text-[#D4AF37]'>+ Add Movies</span>
              </button>
              
              {/* List Movies */}
              {listMovies.length > 0 && (
                <div className='space-y-2'>
                  {listMovies.map((movie, index) => (
                    <div key={index} className='flex items-center gap-3 bg-[#1A1A1A] p-2 rounded-lg'>
                      {getPosterUrl(movie.posterPath) && (
                        <img src={getPosterUrl(movie.posterPath)} alt={movie.title} className='w-10 h-14 object-cover rounded' />
                      )}
                      <div className='flex-1'>
                        <p className='font-inter font-medium text-white text-sm'>{movie.title}</p>
                        <p className='text-xs text-white/50'>{movie.year}</p>
                      </div>
                      <button onClick={() => removeListMovie(index)} className='p-2 text-white/40 hover:text-red-500'>
                        <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                          <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M6 18L18 6M6 6l12 12' />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
              
              <div className='flex justify-end'>
                <button
                  onClick={handleListSubmit}
                  disabled={!listName.trim() || listMovies.length === 0 || isSubmitting}
                  className='px-6 py-2.5 bg-[#D4AF37] text-[#0A0A0A] rounded-full font-inter font-bold text-sm hover:bg-[#E8C55B] disabled:opacity-40'
                >
                  {isSubmitting ? 'Creating...' : 'Create List'}
                </button>
              </div>
            </div>
          )}
          
          {/* TAB: QUICK ADD */}
          {activeTab === 'quick-add' && (
            <div className='space-y-4'>
              <h3 className='font-bebas text-xl text-white tracking-wide'>QUICK ADD TO LIST</h3>
              
              {/* Select List */}
              <div>
                <label className='block text-sm font-inter font-semibold text-white mb-2'>Select List</label>
                <select
                  value={selectedList?.id || ''}
                  onChange={(e) => setSelectedList(userLists.find(l => l.id === e.target.value))}
                  className='w-full bg-[#1A1A1A] border border-[#2D2D2D] rounded-xl px-4 py-3 text-white font-inter text-sm focus:outline-none focus:border-[#D4AF37]'
                >
                  <option value=''>Choose a list...</option>
                  {userLists.map(list => (
                    <option key={list.id} value={list.id}>{list.name}</option>
                  ))}
                </select>
              </div>
              
              {/* Select Movie */}
              {quickAddMovie ? (
                <div className='bg-[#1A1A1A] rounded-xl p-3 flex items-center gap-3'>
                  {getPosterUrl(quickAddMovie.posterPath) && (
                    <img src={getPosterUrl(quickAddMovie.posterPath)} alt={quickAddMovie.title} className='w-12 h-16 object-cover rounded' />
                  )}
                  <div className='flex-1'>
                    <h4 className='font-inter font-semibold text-white text-sm'>{quickAddMovie.title}</h4>
                    <p className='text-xs text-white/50'>{quickAddMovie.year}</p>
                  </div>
                  <button onClick={() => setQuickAddMovie(null)} className='p-2 text-white/40 hover:text-red-500'>
                    <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M6 18L18 6M6 6l12 12' />
                    </svg>
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => openMovieSearch('quick-add')}
                  className='w-full p-4 border-2 border-dashed border-[#2D2D2D] rounded-xl hover:border-[#D4AF37] transition-colors'
                >
                  <span className='text-sm font-inter font-semibold text-[#D4AF37]'>+ Select Movie</span>
                </button>
              )}
              
              <div className='flex justify-end'>
                <button
                  onClick={handleQuickAdd}
                  disabled={!selectedList || !quickAddMovie || isSubmitting}
                  className='px-6 py-2.5 bg-[#D4AF37] text-[#0A0A0A] rounded-full font-inter font-bold text-sm hover:bg-[#E8C55B] disabled:opacity-40'
                >
                  {isSubmitting ? 'Adding...' : 'Add to List'}
                </button>
              </div>
            </div>
          )}
          
        </div>
      </div>
      
      {/* Movie Search Modal */}
      {showMovieSearch && (
        <div className='fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4'>
          <div className='bg-[#0A0A0A] border border-[#1A1A1A] rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col'>
            <div className='p-4 border-b border-[#1A1A1A] flex items-center justify-between'>
              <h3 className='font-bebas text-xl text-white tracking-wide'>SEARCH MOVIES & TV</h3>
              <button onClick={() => setShowMovieSearch(false)} className='text-white/60 hover:text-white'>
                <svg className='w-6 h-6' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M6 18L18 6M6 6l12 12' />
                </svg>
              </button>
            </div>
            
            <div className='p-4'>
              <div className='relative'>
                <input
                  type='text'
                  value={searchQuery}
                  onChange={(e) => handleMovieSearch(e.target.value)}
                  placeholder='Search...'
                  className='w-full bg-[#1A1A1A] border border-[#2D2D2D] rounded-xl pl-10 pr-4 py-3 text-white placeholder:text-white/30 font-inter focus:outline-none focus:border-[#D4AF37]'
                  autoFocus
                />
                <svg className='absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z' />
                </svg>
              </div>
            </div>
            
            <div className='flex-1 overflow-y-auto p-4'>
              {searchResults.length > 0 ? (
                <div className='space-y-2'>
                  {searchResults.map((movie) => (
                    <button
                      key={`${movie.mediaType}-${movie.id}`}
                      onClick={() => selectMovie(movie)}
                      className='w-full p-3 flex items-center gap-3 hover:bg-[#1A1A1A] rounded-xl transition-colors text-left'
                    >
                      {getPosterUrl(movie.posterPath) ? (
                        <img src={getPosterUrl(movie.posterPath)} alt={movie.title} className='w-12 h-16 object-cover rounded' />
                      ) : (
                        <div className='w-12 h-16 bg-[#2D2D2D] rounded' />
                      )}
                      <div className='flex-1'>
                        <h4 className='font-inter font-medium text-white text-sm'>{movie.title}</h4>
                        <p className='text-xs text-white/50'>{movie.year} • {movie.mediaType}</p>
                      </div>
                    </button>
                  ))}
                </div>
              ) : searchQuery && !isSearching ? (
                <p className='text-center text-white/40 py-8'>No results found</p>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CreatePost