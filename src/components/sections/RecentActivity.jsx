import React from 'react'

/**
 * RecentActivity Component for Flik'd
 * 
 * Displays recent user activities from the activities table
 * Synced with Flikd schema (activities table)
 * Shows review posts, quiz completions, list creations, etc.
 */

const RecentActivity = ({ 
  activities = [],
  onActivityClick,
  maxDisplay = 8
}) => {
  
  const limitedActivities = activities.slice(0, maxDisplay)
  
  // Format timestamp to relative time
  const formatTimestamp = (date) => {
    const now = new Date()
    const activityDate = new Date(date)
    const diffInSeconds = Math.floor((now - activityDate) / 1000)
    
    if (diffInSeconds < 60) return 'Just now'
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`
    return activityDate.toLocaleDateString()
  }
  
  // Get activity icon and color based on type
  const getActivityStyle = (type) => {
    switch (type) {
      case 'review_posted':
        return {
          icon: (
            <svg className='w-3.5 h-3.5' fill='currentColor' viewBox='0 0 20 20'>
              <path d='M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z' />
            </svg>
          ),
          color: 'text-[#D4AF37]',
          bg: 'bg-[#D4AF37]/10'
        }
      case 'quiz_completed':
        return {
          icon: (
            <svg className='w-3.5 h-3.5' fill='currentColor' viewBox='0 0 20 20'>
              <path fillRule='evenodd' d='M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z' clipRule='evenodd' />
            </svg>
          ),
          color: 'text-green-500',
          bg: 'bg-green-500/10'
        }
      case 'list_created':
        return {
          icon: (
            <svg className='w-3.5 h-3.5' fill='currentColor' viewBox='0 0 20 20'>
              <path d='M9 2a1 1 0 000 2h2a1 1 0 100-2H9z' />
              <path fillRule='evenodd' d='M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z' clipRule='evenodd' />
            </svg>
          ),
          color: 'text-blue-500',
          bg: 'bg-blue-500/10'
        }
      case 'points_earned':
        return {
          icon: (
            <svg className='w-3.5 h-3.5' fill='currentColor' viewBox='0 0 20 20'>
              <path d='M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z' />
              <path fillRule='evenodd' d='M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z' clipRule='evenodd' />
            </svg>
          ),
          color: 'text-[#D4AF37]',
          bg: 'bg-[#D4AF37]/10'
        }
      default:
        return {
          icon: (
            <svg className='w-3.5 h-3.5' fill='currentColor' viewBox='0 0 20 20'>
              <path fillRule='evenodd' d='M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z' clipRule='evenodd' />
            </svg>
          ),
          color: 'text-white/50',
          bg: 'bg-[#1A1A1A]'
        }
    }
  }
  
  // Get user initials
  const getUserInitials = (displayName) => {
    if (!displayName) return '?'
    const names = displayName.split(' ')
    if (names.length === 1) return names[0][0].toUpperCase()
    return (names[0][0] + names[names.length - 1][0]).toUpperCase()
  }

  // Format activity message
  const getActivityMessage = (activity) => {
    const data = activity.data || {}
    
    switch (activity.type) {
      case 'review_posted':
        return `reviewed ${data.movie_title || 'a movie'}`
      case 'quiz_completed':
        return data.passed 
          ? `passed the quiz for ${data.movie_title || 'a movie'}` 
          : `took the quiz for ${data.movie_title || 'a movie'}`
      case 'list_created':
        return `created a new list "${data.list_name || 'Untitled'}"`
      case 'list_item_completed':
        return `completed ${data.movie_title || 'a movie'}`
      case 'points_earned':
        return `earned ${data.points || 0} points`
      default:
        return 'had some activity'
    }
  }
  
  return (
    <div className='bg-[#0A0A0A] border border-[#1A1A1A] rounded-2xl overflow-hidden'>
      
      {/* Header */}
      <div className='p-4 border-b border-[#1A1A1A] flex items-center justify-between'>
        <div className='flex items-center gap-2'>
          <svg className='w-5 h-5 text-[#D4AF37]' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M13 10V3L4 14h7v7l9-11h-7z' />
          </svg>
          <h2 className='font-bebas text-xl tracking-wide text-white'>
            RECENT ACTIVITY
          </h2>
        </div>
      </div>
      
      {/* Activities List */}
      <div className='divide-y divide-[#1A1A1A]'>
        {limitedActivities.length > 0 ? (
          limitedActivities.map((activity, index) => {
            const activityStyle = getActivityStyle(activity.type)
            
            return (
              <button
                key={activity.id}
                onClick={() => onActivityClick && onActivityClick(activity)}
                className='w-full p-3 hover:bg-[#1A1A1A] transition-all duration-200 text-left group'
                style={{ 
                  animation: `fadeInUp 0.3s ease-out ${index * 0.05}s both` 
                }}
              >
                <div className='flex items-start gap-3'>
                  {/* User Avatar with Activity Badge */}
                  <div className='relative flex-shrink-0'>
                    <div className='w-10 h-10 rounded-full bg-gradient-to-br from-[#2D2D2D] to-[#1A1A1A] flex items-center justify-center font-inter font-bold text-white text-sm ring-2 ring-[#1A1A1A] group-hover:ring-[#D4AF37]/50 transition-all'>
                      {activity.user?.avatar ? (
                        <img 
                          src={activity.user.avatar} 
                          alt={activity.user.displayName}
                          className='w-full h-full rounded-full object-cover'
                        />
                      ) : (
                        getUserInitials(activity.user?.displayName)
                      )}
                    </div>
                    
                    {/* Activity Type Badge */}
                    <div className={`absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full ${activityStyle.bg} border-2 border-[#0A0A0A] flex items-center justify-center ${activityStyle.color}`}>
                      {activityStyle.icon}
                    </div>
                  </div>
                  
                  {/* Activity Content */}
                  <div className='flex-1 min-w-0'>
                    <div className='flex items-start justify-between gap-2 mb-1'>
                      <p className='font-inter text-sm text-white/90 leading-tight'>
                        <span className='font-semibold group-hover:text-[#D4AF37] transition-colors'>
                          {activity.user?.displayName || 'Someone'}
                        </span>
                        {' '}
                        <span className='text-white/60'>
                          {getActivityMessage(activity)}
                        </span>
                      </p>
                      <span className='text-xs text-white/30 font-inter flex-shrink-0'>
                        {formatTimestamp(activity.timestamp)}
                      </span>
                    </div>
                    
                    {/* Additional Info */}
                    {activity.data?.rating && (
                      <div className='flex items-center gap-1 mt-1'>
                        <svg className='w-3 h-3 text-[#D4AF37]' fill='currentColor' viewBox='0 0 20 20'>
                          <path d='M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z' />
                        </svg>
                        <span className='text-xs font-inter font-semibold text-white/70'>
                          {activity.data.rating}/10
                        </span>
                      </div>
                    )}
                    
                    {activity.data?.score && (
                      <div className='flex items-center gap-2 mt-1'>
                        <span className='text-xs font-inter text-white/50'>
                          Score: <span className='font-semibold text-[#D4AF37]'>{activity.data.score}%</span>
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </button>
            )
          })
        ) : (
          // Empty State
          <div className='p-8 text-center'>
            <div className='w-16 h-16 bg-[#1A1A1A] rounded-full flex items-center justify-center mx-auto mb-3'>
              <svg className='w-8 h-8 text-[#2D2D2D]' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M13 10V3L4 14h7v7l9-11h-7z' />
              </svg>
            </div>
            <p className='font-inter text-sm text-white/50 mb-1'>
              No recent activity
            </p>
            <p className='font-inter text-xs text-white/30'>
              Activity will appear here
            </p>
          </div>
        )}
      </div>
      
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