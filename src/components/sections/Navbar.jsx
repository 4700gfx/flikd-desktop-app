import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import supabase from '../../config/SupabaseClient'
import logo from '../../assets/photos/flikd-logo.png'

/**
 * SIDEBAR NAVIGATION - Flik'd App
 * Collapsible sidebar with hover expansion
 */

const Navbar = () => {
  const navigate = useNavigate()
  const [isExpanded, setIsExpanded] = useState(false)
  const [activeItem, setActiveItem] = useState('home')
  
  // Navigation menu items
  const navItems = [
    {
      id: 'home',
      label: 'Home',
      icon: (
        <svg className='w-6 h-6' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
          <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} 
                d='M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' />
        </svg>
      ),
      path: '/'
    },
    {
      id: 'discover',
      label: 'Discover',
      icon: (
        <svg className='w-6 h-6' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
          <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} 
                d='M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9' />
        </svg>
      ),
      path: '/discover'
    },
    {
      id: 'search',
      label: 'Search',
      icon: (
        <svg className='w-6 h-6' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
          <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} 
                d='M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z' />
        </svg>
      ),
      path: '/search'
    },
    {
      id: 'library',
      label: 'My Library',
      icon: (
        <svg className='w-6 h-6' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
          <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} 
                d='M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10' />
        </svg>
      ),
      path: '/library'
    },
    {
      id: 'favorites',
      label: 'Favorites',
      icon: (
        <svg className='w-6 h-6' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
          <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} 
                d='M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z' />
        </svg>
      ),
      path: '/favorites'
    },
    {
      id: 'watchlist',
      label: 'Watchlist',
      icon: (
        <svg className='w-6 h-6' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
          <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} 
                d='M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z' />
        </svg>
      ),
      path: '/watchlist'
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: (
        <svg className='w-6 h-6' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
          <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} 
                d='M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' />
          <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} 
                d='M15 12a3 3 0 11-6 0 3 3 0 016 0z' />
        </svg>
      ),
      path: '/settings'
    },
  ]
  
  // Click handler for navigation items
  const handleItemClick = (itemId) => {
    setActiveItem(itemId)
    console.log(`Navigating to: ${itemId}`)
  }
  
  // Sign out handler - logs user out and redirects to login
  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut()
      navigate('/login')
    } catch (error) {
      console.error('Sign out error:', error)
    }
  }
  
  return (
    <div 
      className={`
        fixed left-4 top-1/2 -translate-y-1/2 h-[90%]
        bg-[#D4AF37]
        rounded-3xl
        transition-all duration-300 ease-in-out
        ${isExpanded ? 'w-64' : 'w-20'}
        flex flex-col
        z-50
        shadow-2xl shadow-black/40
      `}
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
    >
      
      {/* Header - Logo and App Name */}
      <div className='p-5 flex items-center justify-between'>
        <div className='flex items-center gap-3'>
          {/* Larger logo with better containment */}
          <div className='w-12 h-12 flex items-center justify-center'>
            <img 
              src={logo} 
              alt='Flikd Logo' 
              className='w-full h-full object-contain drop-shadow-lg' 
            />
          </div>
          
          {/* App name - shows when expanded */}
          {isExpanded && (
            <span className='text-flikd-white font-bold text-2xl font-bebas tracking-wider drop-shadow-md'>
              FLIK'D
            </span>
          )}
        </div>
        
        {/* Collapse button - shows when expanded */}
        {isExpanded && (
          <button
            onClick={() => setIsExpanded(false)}
            className='p-2 rounded-lg text-flikd-white/80 hover:text-flikd-white hover:bg-flikd-white/10 transition-all duration-200'
            aria-label='Collapse Navbar'
          >
            <svg className='w-5 h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M15 19l-7-7 7-7' />
            </svg>
          </button>
        )}
      </div>
      
      {/* Navigation Items */}
      <nav className='flex-1 py-6 px-3 overflow-y-auto overflow-x-hidden'>
        <ul className='space-y-2'>
          {navItems.map((item) => {
            const isActive = activeItem === item.id
            
            return (
              <li key={item.id}>
                <button
                  onClick={() => handleItemClick(item.id)}
                  className={`
                    w-full flex items-center gap-4
                    px-4 py-3.5 rounded-2xl
                    font-inter font-medium text-[15px]
                    transition-all duration-200
                    group relative
                    ${isActive 
                      ? 'bg-flikd-black text-flikd-white shadow-xl shadow-black/30' 
                      : 'text-flikd-white/80 hover:text-flikd-white hover:bg-flikd-white/15'
                    }
                  `}
                >
                  {/* Icon */}
                  <div className='w-6 h-6 flex-shrink-0'>
                    {item.icon}
                  </div>
                  
                  {/* Label - shows when expanded */}
                  {isExpanded && (
                    <span className='whitespace-nowrap'>
                      {item.label}
                    </span>
                  )}
                  
                  {/* Active indicator bar */}
                  {isActive && (
                    <div className='absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-10 bg-flikd-white rounded-r-full shadow-lg shadow-flikd-white/30' />
                  )}
                  
                  {/* Tooltip - shows when collapsed */}
                  {!isExpanded && (
                    <div className='
                      absolute left-full ml-6 px-3 py-2
                      bg-flikd-black text-flikd-white text-sm font-semibold font-inter
                      rounded-xl whitespace-nowrap
                      opacity-0 group-hover:opacity-100
                      transition-opacity duration-200
                      pointer-events-none
                      shadow-xl
                    '>
                      {item.label}
                      <div className='absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 w-3 h-3 bg-flikd-black rotate-45' />
                    </div>
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      </nav>
      
      {/* Footer - User Profile and Sign Out */}
      <div className='p-4 space-y-2'>
        
        {/* User Profile Button */}
        <button className='
          w-full flex items-center gap-3
          px-3 py-3 rounded-2xl
          text-flikd-white/80 hover:text-flikd-white hover:bg-flikd-white/15
          transition-all duration-200
          group
        '>
          {/* Avatar */}
          <div className='w-10 h-10 bg-flikd-black rounded-full flex items-center justify-center flex-shrink-0 ring-2 ring-flikd-white/20'>
            <svg className='w-6 h-6 text-flikd-white' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} 
                    d='M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' />
            </svg>
          </div>
          
          {/* User Info - shows when expanded */}
          {isExpanded && (
            <div className='flex-1 text-left'>
              <p className='text-sm font-semibold font-inter text-flikd-white'>John Doe</p>
              <p className='text-xs font-inter text-flikd-white/60'>View Profile</p>
            </div>
          )}
        </button>
        
        {/* Sign Out Button */}
        <button 
          onClick={handleSignOut}
          className='
            w-full flex items-center gap-3
            px-3 py-3 rounded-2xl
            text-flikd-black/80 hover:text-flikd-black hover:bg-flikd-black/10
            transition-all duration-200
            group
          '
        >
          {/* Sign Out Icon */}
          <div className='w-10 h-10 flex items-center justify-center flex-shrink-0'>
            <svg className='w-6 h-6' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} 
                    d='M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1' />
            </svg>
          </div>
          
          {/* Sign Out Text - shows when expanded */}
          {isExpanded && (
            <span className='text-sm font-semibold font-inter'>
              Sign Out
            </span>
          )}
        </button>
        
      </div>
      
    </div>
  )
}

export default Navbar