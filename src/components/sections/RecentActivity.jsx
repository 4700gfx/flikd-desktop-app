import React from 'react'

/**
 * RecentActivity Component for Flik'd Application
 * 
 * Displays recent user activities (likes, comments, follows, reviews)
 * Colors: Gold (#D4AF37), Black (#0A0A0A), Grey (#0B375B), White (#FFFFFF)
 * Typography: Bebas Neue for headers, Inter for body
 * 
 * @param {array} activities - Array of activity objects
 * @param {function} onActivityClick - Callback when activity is clicked
 * @param {number} maxDisplay - Maximum number of activities to show (default: 8)
 */

const RecentActivity = ({ 
  activities = [],
  onActivityClick,
  maxDisplay = 8
}) => {
  
  // Default mock data if no activities provided
  const defaultActivities = [
    {
      id: 1,
      type: 'like',
      user: { name: 'Sarah Chen', avatar: null },
      content: 'liked your review of "Inception"',
      timestamp: new Date(Date.now() - 1000 * 60 * 5), // 5 min ago
      movie: 'Inception'
    },
    {
      id: 2,
      type: 'comment',
      user: { name: 'Mike Rodriguez', avatar: null },
      content: 'commented on your post',
      timestamp: new Date(Date.now() - 1000 * 60 * 15), // 15 min ago
      movie: null
    },
    {
      id: 3,
      type: 'follow',
      user: { name: 'Emma Watson', avatar: null },
      content: 'started following you',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
      movie: null
    },
    {
      id: 4,
      type: 'review',
      user: { name: 'John Smith', avatar: null },
      content: 'reviewed "The Dark Knight"',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5), // 5 hours ago
      movie: 'The Dark Knight',
      rating: 5
    }
  ]
  
  const displayActivities = activities.length > 0 ? activities : defaultActivities
  const limitedActivities = displayActivities.slice(0, maxDisplay)
  
  // Format timestamp to relative time
  const formatTimestamp = (date) => {
    const now = new Date()
    const diffInSeconds = Math.floor((now - date) / 1000)
    
    if (diffInSeconds < 60) return 'Just now'
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d`
    return date.toLocaleDateString()
  }
  
  // Get activity icon and color
  const getActivityIcon = (type) => {
    switch (type) {
      case 'like':
        return {
          icon: (
            <svg className='w-3.5 h-3.5' fill='currentColor' viewBox='0 0 20 20'>
              <path fillRule='evenodd' d='M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z' clipRule='evenodd' />
            </svg>
          ),
          color: 'text-red-500',
          bg: 'bg-red-500/10'
        }
      case 'comment':
        return {
          icon: (
            <svg className='w-3.5 h-3.5' fill='currentColor' viewBox='0 0 20 20'>
              <path fillRule='evenodd' d='M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z' clipRule='evenodd' />
            </svg>
          ),
          color: 'text-blue-500',
          bg: 'bg-blue-500/10'
        }
      case 'follow':
        return {
          icon: (
            <svg className='w-3.5 h-3.5' fill='currentColor' viewBox='0 0 20 20'>
              <path d='M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6zM16 7a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1V7z' />
            </svg>
          ),
          color: 'text-flikd-gold',
          bg: 'bg-flikd-gold/10'
        }
      case 'review':
        return {
          icon: (
            <svg className='w-3.5 h-3.5' fill='currentColor' viewBox='0 0 20 20'>
              <path d='M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z' />
            </svg>
          ),
          color: 'text-flikd-gold',
          bg: 'bg-flikd-gold/10'
        }
      default:
        return {
          icon: (
            <svg className='w-3.5 h-3.5' fill='currentColor' viewBox='0 0 20 20'>
              <path fillRule='evenodd' d='M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z' clipRule='evenodd' />
            </svg>
          ),
          color: 'text-flikd-white/50',
          bg: 'bg-flikd-grey/30'
        }
    }
  }
  
  // Get user initials
  const getUserInitials = (name) => {
    if (!name) return '?'
    const names = name.split(' ')
    if (names.length === 1) return names[0][0].toUpperCase()
    return (names[0][0] + names[names.length - 1][0]).toUpperCase()
  }
  
  return (
    <div className='bg-flikd-black/50 backdrop-blur-sm border border-flikd-grey rounded-2xl overflow-hidden'>
      
      {/* Header */}
      <div className='p-4 border-b border-flikd-grey flex items-center justify-between'>
        <div className='flex items-center gap-2'>
          <svg className='w-5 h-5 text-flikd-gold' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M13 10V3L4 14h7v7l9-11h-7z' />
          </svg>
          <h2 className='font-bebas text-xl tracking-wide text-flikd-white'>
            RECENT ACTIVITY
          </h2>
        </div>
      </div>
      
      {/* Activities List */}
      <div className='divide-y divide-flikd-grey/50'>
        {limitedActivities.map((activity, index) => {
          const activityStyle = getActivityIcon(activity.type)
          
          return (
            <button
              key={activity.id}
              onClick={() => onActivityClick && onActivityClick(activity)}
              className='w-full p-3 hover:bg-flikd-grey/20 transition-all duration-200 text-left group'
              style={{ 
                animation: `fadeInUp 0.3s ease-out ${index * 0.05}s both` 
              }}
            >
              <div className='flex items-start gap-3'>
                {/* User Avatar with Activity Badge */}
                <div className='relative flex-shrink-0'>
                  <div className='w-10 h-10 rounded-full bg-gradient-to-br from-flikd-grey to-flikd-black flex items-center justify-center font-inter font-bold text-flikd-white text-sm ring-2 ring-flikd-grey group-hover:ring-flikd-gold/50 transition-all'>
                    {activity.user?.avatar ? (
                      <img 
                        src={activity.user.avatar} 
                        alt={activity.user.name}
                        className='w-full h-full rounded-full object-cover'
                      />
                    ) : (
                      getUserInitials(activity.user?.name)
                    )}
                  </div>
                  
                  {/* Activity Type Badge */}
                  <div className={`absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full ${activityStyle.bg} border-2 border-flikd-black flex items-center justify-center ${activityStyle.color}`}>
                    {activityStyle.icon}
                  </div>
                </div>
                
                {/* Activity Content */}
                <div className='flex-1 min-w-0'>
                  <div className='flex items-start justify-between gap-2 mb-1'>
                    <p className='font-inter text-sm text-flikd-white/90 leading-tight'>
                      <span className='font-semibold group-hover:text-flikd-gold transition-colors'>
                        {activity.user?.name}
                      </span>
                      {' '}
                      <span className='text-flikd-white/60'>
                        {activity.content}
                      </span>
                    </p>
                    <span className='text-xs text-flikd-white/40 font-inter flex-shrink-0'>
                      {formatTimestamp(activity.timestamp)}
                    </span>
                  </div>
                  
                  {/* Movie Title or Rating */}
                  {activity.movie && (
                    <div className='flex items-center gap-2 mt-1'>
                      <div className='flex items-center gap-1 px-2 py-0.5 bg-flikd-grey/30 rounded-md'>
                        <svg className='w-3 h-3 text-flikd-gold' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                          <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z' />
                        </svg>
                        <span className='text-xs font-inter font-medium text-flikd-white/70'>
                          {activity.movie}
                        </span>
                      </div>
                      
                      {activity.rating && (
                        <div className='flex items-center gap-0.5'>
                          {[...Array(5)].map((_, i) => (
                            <svg 
                              key={i}
                              className={`w-3 h-3 ${i < activity.rating ? 'text-flikd-gold fill-current' : 'text-flikd-grey'}`}
                              viewBox='0 0 20 20'
                            >
                              <path d='M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z' />
                            </svg>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </button>
          )
        })}
      </div>
      
      {/* Empty State */}
      {displayActivities.length === 0 && (
        <div className='p-8 text-center'>
          <div className='w-16 h-16 bg-flikd-grey/20 rounded-full flex items-center justify-center mx-auto mb-3'>
            <svg className='w-8 h-8 text-flikd-white/20' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M13 10V3L4 14h7v7l9-11h-7z' />
            </svg>
          </div>
          <p className='font-inter text-sm text-flikd-white/50 mb-1'>
            No recent activity
          </p>
          <p className='font-inter text-xs text-flikd-white/30'>
            Activity will appear here
          </p>
        </div>
      )}
      
      {/* Animations */}
      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  )
}

export default RecentActivity