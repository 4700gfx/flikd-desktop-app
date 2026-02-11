import React, { useState } from 'react'

/**
 * Post Component for Flik'd Application
 * 
 * Social media style post/review component with likes, comments, and sharing
 * Colors: Gold (#D4AF37), Black (#0A0A0A), Grey (#0B375B), White (#FFFFFF)
 * Typography: Inter font family
 * Displays user reviews, ratings, and movie references
 * 
 * @param {object} post - Post data object containing:
 *   - id: Post identifier
 *   - user: User object (id, name, avatar)
 *   - content: Post text content
 *   - movie: Referenced movie object (title, posterUrl, year, genre)
 *   - rating: Star rating (0-5)
 *   - images: Array of image URLs
 *   - timestamp: Post creation date
 *   - likes: Number of likes
 *   - comments: Array of comment objects
 *   - shares: Number of shares
 *   - isLiked: Boolean for current user's like status
 *   - type: Post type ('review', 'watchlist', 'status')
 * @param {string} currentUserId - Current logged-in user's ID
 * @param {function} onLike - Callback when liking/unliking post
 * @param {function} onComment - Callback when adding comment
 * @param {function} onShare - Callback when sharing post
 * @param {function} onDelete - Callback when deleting post (own posts only)
 * @param {function} onUserClick - Callback when clicking user profile
 * @param {string} className - Additional CSS classes
 */

const Post = ({ 
  post,
  currentUserId,
  onLike,
  onComment,
  onShare,
  onDelete,
  onUserClick,
  className = ''
}) => {
  
  const [showComments, setShowComments] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [isLiked, setIsLiked] = useState(post.isLiked || false)
  const [likeCount, setLikeCount] = useState(post.likes || 0)
  
  const {
    id,
    user,
    content,
    movie,
    rating,
    images,
    timestamp,
    comments = [],
    shares = 0,
    type = 'review'
  } = post
  
  const isOwnPost = currentUserId === user?.id
  
  // Handle like toggle
  const handleLike = () => {
    setIsLiked(!isLiked)
    setLikeCount(isLiked ? likeCount - 1 : likeCount + 1)
    onLike && onLike(post)
  }
  
  // Handle comment submission
  const handleComment = () => {
    if (commentText.trim()) {
      onComment && onComment(post, commentText)
      setCommentText('')
    }
  }
  
  // Format timestamp to relative time
  const formatTimestamp = (date) => {
    const now = new Date()
    const postDate = new Date(date)
    const diffInSeconds = Math.floor((now - postDate) / 1000)
    
    if (diffInSeconds < 60) return 'Just now'
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`
    return postDate.toLocaleDateString()
  }
  
  return (
    <article className={`bg-flikd-black/50 backdrop-blur-sm border border-flikd-grey rounded-2xl overflow-hidden transition-all duration-300 hover:border-flikd-grey/80 ${className}`}>
      
      {/* POST HEADER */}
      <div className='p-4 flex items-start justify-between'>
        <div className='flex items-center gap-3 flex-1'>
          {/* User Avatar */}
          <button 
            onClick={() => onUserClick && onUserClick(user)}
            className='flex-shrink-0 group'
          >
            <div className='w-12 h-12 rounded-full bg-gradient-to-br from-flikd-gold to-yellow-600 flex items-center justify-center font-inter font-bold text-flikd-black ring-2 ring-flikd-grey group-hover:ring-flikd-gold transition-all'>
              {user?.avatar ? (
                <img src={user.avatar} alt={user.name} className='w-full h-full rounded-full object-cover' />
              ) : (
                user?.name?.charAt(0).toUpperCase()
              )}
            </div>
          </button>
          
          {/* User Info */}
          <div className='flex-1 min-w-0'>
            <button 
              onClick={() => onUserClick && onUserClick(user)}
              className='font-inter font-semibold text-flikd-white hover:text-flikd-gold transition-colors block truncate'
            >
              {user?.name}
            </button>
            <div className='flex items-center gap-2 text-xs text-flikd-white/50'>
              <span>{formatTimestamp(timestamp)}</span>
              {type === 'review' && rating && (
                <>
                  <span>•</span>
                  <div className='flex items-center gap-1'>
                    {[...Array(5)].map((_, i) => (
                      <svg 
                        key={i} 
                        className={`w-3 h-3 ${i < rating ? 'text-flikd-gold fill-current' : 'text-flikd-grey'}`} 
                        viewBox='0 0 20 20'
                      >
                        <path d='M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z' />
                      </svg>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
        
        {/* More Options Menu (for own posts) */}
        {isOwnPost && (
          <button className='text-flikd-white/50 hover:text-flikd-white transition-colors p-2 rounded-lg hover:bg-flikd-grey/50'>
            <svg className='w-5 h-5' fill='currentColor' viewBox='0 0 20 20'>
              <path d='M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z' />
            </svg>
          </button>
        )}
      </div>
      
      {/* MOVIE REFERENCE (for reviews) */}
      {movie && (
        <div className='px-4 pb-3'>
          <div className='bg-flikd-grey/30 rounded-xl p-3 flex items-center gap-3 border border-flikd-grey hover:border-flikd-gold/50 transition-colors cursor-pointer'>
            {movie.posterUrl && (
              <img 
                src={movie.posterUrl} 
                alt={movie.title}
                className='w-16 h-24 object-cover rounded-lg flex-shrink-0'
              />
            )}
            <div className='flex-1 min-w-0'>
              <h4 className='font-inter font-semibold text-flikd-white text-sm mb-1 truncate'>
                {movie.title}
              </h4>
              <div className='flex items-center gap-2 text-xs text-flikd-white/60'>
                {movie.year && <span>{movie.year}</span>}
                {movie.genre && (
                  <>
                    <span>•</span>
                    <span className='truncate'>{movie.genre}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* POST CONTENT */}
      {content && (
        <div className='px-4 pb-4'>
          <p className='font-inter text-flikd-white/90 text-sm leading-relaxed whitespace-pre-wrap'>
            {content}
          </p>
        </div>
      )}
      
      {/* POST IMAGES */}
      {images && images.length > 0 && (
        <div className={`px-4 pb-4 grid gap-2 ${images.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
          {images.map((image, index) => (
            <img 
              key={index}
              src={image}
              alt={`Post image ${index + 1}`}
              className='w-full rounded-xl object-cover aspect-video'
            />
          ))}
        </div>
      )}
      
      {/* ENGAGEMENT STATS */}
      <div className='px-4 py-3 border-t border-flikd-grey flex items-center justify-between text-sm text-flikd-white/50'>
        <span>{likeCount} {likeCount === 1 ? 'like' : 'likes'}</span>
        <div className='flex items-center gap-4'>
          <span>{comments.length} {comments.length === 1 ? 'comment' : 'comments'}</span>
          <span>{shares} {shares === 1 ? 'share' : 'shares'}</span>
        </div>
      </div>
      
      {/* ACTION BUTTONS */}
      <div className='px-4 py-3 border-t border-flikd-grey flex items-center gap-2'>
        {/* Like Button */}
        <button
          onClick={handleLike}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-inter font-semibold text-sm transition-all ${
            isLiked 
              ? 'text-flikd-gold bg-flikd-gold/10 hover:bg-flikd-gold/20' 
              : 'text-flikd-white/60 hover:text-flikd-white hover:bg-flikd-grey/50'
          }`}
        >
          <svg className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} fill={isLiked ? 'currentColor' : 'none'} stroke='currentColor' viewBox='0 0 24 24'>
            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z' />
          </svg>
          {isLiked ? 'Liked' : 'Like'}
        </button>
        
        {/* Comment Button */}
        <button
          onClick={() => setShowComments(!showComments)}
          className='flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-inter font-semibold text-sm text-flikd-white/60 hover:text-flikd-white hover:bg-flikd-grey/50 transition-all'
        >
          <svg className='w-5 h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z' />
          </svg>
          Comment
        </button>
        
        {/* Share Button */}
        <button
          onClick={() => onShare && onShare(post)}
          className='flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-inter font-semibold text-sm text-flikd-white/60 hover:text-flikd-white hover:bg-flikd-grey/50 transition-all'
        >
          <svg className='w-5 h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z' />
          </svg>
          Share
        </button>
      </div>
      
      {/* COMMENTS SECTION */}
      {showComments && (
        <div className='px-4 pb-4 border-t border-flikd-grey'>
          {/* Comment Input */}
          <div className='py-4 flex items-start gap-3'>
            <div className='w-8 h-8 rounded-full bg-gradient-to-br from-flikd-gold to-yellow-600 flex items-center justify-center font-inter font-bold text-flikd-black text-sm flex-shrink-0'>
              U
            </div>
            <div className='flex-1 flex gap-2'>
              <input
                type='text'
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleComment()}
                placeholder='Write a comment...'
                className='flex-1 bg-flikd-grey/30 border border-flikd-grey rounded-xl px-4 py-2 text-sm text-flikd-white placeholder:text-flikd-white/40 focus:outline-none focus:border-flikd-gold transition-colors'
              />
              <button
                onClick={handleComment}
                disabled={!commentText.trim()}
                className='bg-flikd-gold text-flikd-black px-4 py-2 rounded-xl font-inter font-semibold text-sm hover:bg-yellow-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
              >
                Post
              </button>
            </div>
          </div>
          
          {/* Comments List */}
          {comments.length > 0 && (
            <div className='space-y-4'>
              {comments.map((comment) => (
                <div key={comment.id} className='flex items-start gap-3'>
                  <div className='w-8 h-8 rounded-full bg-gradient-to-br from-flikd-grey to-flikd-black flex items-center justify-center font-inter font-bold text-flikd-white text-sm flex-shrink-0'>
                    {comment.user?.name?.charAt(0).toUpperCase()}
                  </div>
                  <div className='flex-1'>
                    <div className='bg-flikd-grey/30 rounded-xl p-3'>
                      <p className='font-inter font-semibold text-flikd-white text-sm mb-1'>
                        {comment.user?.name}
                      </p>
                      <p className='font-inter text-flikd-white/80 text-sm'>
                        {comment.text}
                      </p>
                    </div>
                    <div className='flex items-center gap-4 mt-2 text-xs text-flikd-white/50 px-3'>
                      <button className='hover:text-flikd-gold transition-colors'>Like</button>
                      <button className='hover:text-flikd-gold transition-colors'>Reply</button>
                      <span>{formatTimestamp(comment.timestamp)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </article>
  )
}

export default Post