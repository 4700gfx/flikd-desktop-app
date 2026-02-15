import React from 'react'

/**
 * CurrentListTab Component for Flik'd
 * 
 * Displays user's movie/TV lists in sidebar
 * Synced with Flikd schema (lists table)
 * Shows list name, item count, and completion progress
 */

const CurrentListTab = ({ 
  lists = [],
  onListClick,
  onViewAll
}) => {
  
  // Calculate completion percentage
  const getCompletionPercentage = (list) => {
    if (!list.item_count || list.item_count === 0) return 0
    return Math.round((list.completed_count / list.item_count) * 100)
  }
  
  return (
    <div className='bg-[#0A0A0A] border border-[#1A1A1A] rounded-2xl overflow-hidden'>
      
      {/* Header */}
      <div className='p-4 border-b border-[#1A1A1A] flex items-center justify-between'>
        <div className='flex items-center gap-2'>
          <svg className='w-5 h-5 text-[#D4AF37]' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' />
          </svg>
          <h2 className='font-bebas text-xl tracking-wide text-white'>
            YOUR LISTS
          </h2>
        </div>
      </div>
      
      {/* Lists */}
      <div className='divide-y divide-[#1A1A1A]'>
        {lists.length > 0 ? (
          lists.map((list, index) => {
            const completion = getCompletionPercentage(list)
            
            return (
              <button
                key={list.list_id || list.id}
                onClick={() => onListClick && onListClick(list)}
                className='w-full p-4 hover:bg-[#1A1A1A] transition-all duration-200 text-left group'
                style={{ 
                  animation: `fadeInUp 0.3s ease-out ${index * 0.05}s both` 
                }}
              >
                <div className='flex items-start justify-between gap-3 mb-2'>
                  <h3 className='font-inter font-bold text-white text-sm group-hover:text-[#D4AF37] transition-colors line-clamp-1 flex-1'>
                    {list.name}
                  </h3>
                  {list.is_public && (
                    <span className='px-2 py-0.5 bg-blue-500/10 text-blue-400 text-xs font-inter font-semibold rounded-full flex-shrink-0'>
                      Public
                    </span>
                  )}
                </div>
                
                {list.description && (
                  <p className='text-xs text-white/50 font-inter mb-3 line-clamp-2'>
                    {list.description}
                  </p>
                )}
                
                {/* Progress Bar */}
                <div className='space-y-2'>
                  <div className='flex items-center justify-between text-xs font-inter'>
                    <span className='text-white/60'>
                      {list.completed_count || 0} / {list.item_count || 0} completed
                    </span>
                    <span className='text-[#D4AF37] font-semibold'>
                      {completion}%
                    </span>
                  </div>
                  <div className='w-full h-2 bg-[#1A1A1A] rounded-full overflow-hidden'>
                    <div 
                      className='h-full bg-gradient-to-r from-[#D4AF37] to-[#E8C55B] rounded-full transition-all duration-300'
                      style={{ width: `${completion}%` }}
                    />
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
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' />
              </svg>
            </div>
            <p className='font-inter text-sm text-white/50 mb-1'>
              No lists yet
            </p>
            <p className='font-inter text-xs text-white/30'>
              Create your first watchlist!
            </p>
          </div>
        )}
      </div>
      
      {/* View All Button */}
      {lists.length > 0 && onViewAll && (
        <div className='p-4 border-t border-[#1A1A1A]'>
          <button
            onClick={onViewAll}
            className='w-full py-2 text-center font-inter font-semibold text-sm text-[#D4AF37] hover:text-[#E8C55B] transition-colors'
          >
            View All Lists →
          </button>
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

export default CurrentListTab