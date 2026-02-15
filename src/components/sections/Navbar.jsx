import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import supabase from '../../config/SupabaseClient'
import logo from '../../assets/photos/flikd-logo.png'

/**
 * REFINED SIDEBAR NAVIGATION - Flik'd App
 * Luxury collapsible sidebar with smooth animations and real user data
 */

const Navbar = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [isExpanded, setIsExpanded] = useState(false)
  const [isDesktop, setIsDesktop] = useState(false)
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  
  // Check if viewport is desktop size
  useEffect(() => {
    const checkViewport = () => {
      const desktop = window.innerWidth >= 1024 // lg breakpoint
      setIsDesktop(desktop)
      setIsExpanded(desktop) // Auto-expand on desktop
    }
    
    checkViewport()
    window.addEventListener('resize', checkViewport)
    return () => window.removeEventListener('resize', checkViewport)
  }, [])
  
  // Fetch user data from Supabase
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data: { user: authUser }, error } = await supabase.auth.getUser()
        
        if (error) throw error
        
        if (authUser) {
          setUser({
            name: authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'User',
            email: authUser.email,
            avatar: authUser.user_metadata?.avatar_url || null
          })
        }
      } catch (error) {
        console.error('Error fetching user:', error)
      } finally {
        setLoading(false)
      }
    }
    
    fetchUser()
  }, [])
  
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
      path: '/home'
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
  
  // Get active item based on current path
  const getActiveItem = () => {
    const currentPath = location.pathname
    const activeNav = navItems.find(item => item.path === currentPath)
    return activeNav?.id || 'home'
  }
  
  // Click handler for navigation items
  const handleItemClick = (item) => {
    navigate(item.path)
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
  
  // Get user initials for avatar
  const getUserInitials = () => {
    if (!user?.name) return 'U'
    const names = user.name.split(' ')
    if (names.length === 1) return names[0][0].toUpperCase()
    return (names[0][0] + names[names.length - 1][0]).toUpperCase()
  }
  
  // Get animation class based on device type
  const getTextAnimationClass = () => {
    // On desktop, text is always visible (persistent expanded state)
    // On mobile/tablet, use delayed animation for smooth reveal
    return isDesktop ? 'opacity-100' : 'opacity-0 animate-fadeInDelayed'
  }
  
  return (
    <>
      <div 
        className={`
          fixed left-4 top-1/2 -translate-y-1/2 h-[90vh] max-h-[800px]
          bg-flikd-gold
          rounded-3xl
          transition-all duration-300 ease-out
          ${isExpanded ? 'w-72' : 'w-20'}
          flex flex-col
          z-50
          shadow-2xl shadow-flikd-gold/30
          border-2 border-flikd-gold
        `}
        onMouseEnter={() => !isDesktop && setIsExpanded(true)}
        onMouseLeave={() => !isDesktop && setIsExpanded(false)}
      >
        
        {/* Decorative subtle overlay */}
        <div className='absolute inset-0 bg-gradient-to-b from-white/10 via-transparent to-black/5 rounded-3xl pointer-events-none' />
        
        {/* Header - Logo and App Name */}
        <div className='relative p-5 flex items-center justify-between border-b border-flikd-black/10'>
          <div className='flex items-center gap-3'>
            {/* Logo with enhanced styling */}
            <div className='w-12 h-12 bg-flikd-black/20 rounded-2xl flex items-center justify-center backdrop-blur-sm shadow-lg'>
              <img 
                src={logo} 
                alt='Flikd Logo' 
                className='w-9 h-9 object-contain drop-shadow-xl' 
              />
            </div>
            
            {/* App name - shows when expanded with conditional animation */}
            {isExpanded && (
              <div className='overflow-hidden'>
                <span className={`text-flikd-black font-bold text-2xl font-bebas tracking-[0.15em] drop-shadow-md ${getTextAnimationClass()}`}>
                  FLIK'D
                </span>
              </div>
            )}
          </div>
          
          {/* Toggle button - only shows on mobile/tablet */}
          {!isDesktop && isExpanded && (
            <button
              onClick={() => setIsExpanded(false)}
              className='p-2 rounded-lg text-flikd-black/60 hover:text-flikd-black hover:bg-flikd-black/10 transition-all duration-200'
              aria-label='Collapse Navbar'
            >
              <svg className='w-5 h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M15 19l-7-7 7-7' />
              </svg>
            </button>
          )}
        </div>
        
        {/* Navigation Items */}
        <nav className='relative flex-1 py-6 px-3 overflow-y-auto overflow-x-hidden scrollbar-hide'>
          <ul className='space-y-1.5'>
            {navItems.map((item) => {
              const isActive = getActiveItem() === item.id
              
              return (
                <li 
                  key={item.id}
                >
                  <button
                    onClick={() => handleItemClick(item)}
                    className={`
                      w-full flex items-center gap-4
                      px-4 py-3.5 rounded-2xl
                      font-bebas text-lg tracking-wide
                      transition-all duration-200
                      group relative
                      ${isActive 
                        ? 'bg-flikd-black text-flikd-gold shadow-lg shadow-black/40 scale-[1.02]' 
                        : 'text-flikd-black/70 hover:text-flikd-black hover:bg-white/30 hover:scale-[1.01]'
                      }
                    `}
                  >
                    {/* Icon container */}
                    <div className={`
                      w-6 h-6 flex-shrink-0 transition-transform duration-200
                      ${isActive ? 'scale-110' : 'group-hover:scale-110'}
                    `}>
                      {item.icon}
                    </div>
                    
                    {/* Label - shows when expanded with conditional animation */}
                    {isExpanded && (
                      <span className={`whitespace-nowrap font-bebas text-lg tracking-wide ${getTextAnimationClass()}`}>
                        {item.label}
                      </span>
                    )}
                    
                    {/* Active indicator dot - shows when collapsed */}
                    {isActive && !isExpanded && (
                      <div className='absolute -right-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-flikd-black rounded-full shadow-lg' />
                    )}
                    
                    {/* Hover shine effect */}
                    <div className='absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl' />
                    
                    {/* Tooltip - shows when collapsed */}
                    {!isExpanded && (
                      <div className='
                        absolute left-full ml-6 px-3 py-2
                        bg-flikd-black text-flikd-gold text-sm font-bebas tracking-wide
                        rounded-xl whitespace-nowrap
                        opacity-0 group-hover:opacity-100
                        transition-opacity duration-200
                        pointer-events-none
                        shadow-xl
                        z-50
                      '>
                        {item.label}
                        {/* Tooltip arrow */}
                        <div className='absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1.5 w-3 h-3 bg-flikd-black rotate-45' />
                      </div>
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
        </nav>
        
        {/* Footer - User Profile and Sign Out */}
        <div className='relative p-4 space-y-2 border-t border-flikd-black/10'>
          
          {/* User Profile Section */}
          <button 
            onClick={() => navigate('/profile')}
            className='
              w-full flex items-center gap-3
              px-3 py-3 rounded-2xl
              text-flikd-black/70 hover:text-flikd-black hover:bg-white/30
              transition-all duration-200
              group
            '
          >
            {/* Avatar */}
            <div className='relative w-11 h-11 flex-shrink-0'>
              {user?.avatar ? (
                <img 
                  src={user.avatar} 
                  alt={user.name}
                  className='w-full h-full rounded-full object-cover ring-2 ring-flikd-black/20 group-hover:ring-flikd-black/40 transition-all'
                />
              ) : (
                <div className='w-full h-full bg-gradient-to-br from-flikd-black to-gray-800 rounded-full flex items-center justify-center ring-2 ring-flikd-black/30 group-hover:ring-flikd-black/50 transition-all shadow-lg'>
                  {loading ? (
                    <svg className='w-5 h-5 text-flikd-gold animate-spin' fill='none' viewBox='0 0 24 24'>
                      <circle className='opacity-25' cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='4'></circle>
                      <path className='opacity-75' fill='currentColor' d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'></path>
                    </svg>
                  ) : (
                    <span className='text-flikd-gold text-sm font-bold font-bebas tracking-wide'>
                      {getUserInitials()}
                    </span>
                  )}
                </div>
              )}
              
              {/* Online indicator */}
              <div className='absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-flikd-gold shadow-lg' />
            </div>
            
            {/* User Info - shows when expanded with conditional animation */}
            {isExpanded && !loading && (
              <div className={`flex-1 text-left overflow-hidden ${getTextAnimationClass()}`}>
                <p className='text-base font-bebas text-flikd-black truncate tracking-wide'>
                  {user?.name || 'User'}
                </p>
                <p className='text-xs font-bebas text-flikd-black/60 truncate tracking-wider'>
                  VIEW PROFILE
                </p>
              </div>
            )}
            
            {/* Arrow icon when expanded with conditional animation */}
            {isExpanded && (
              <svg className={`w-4 h-4 text-flikd-black/40 group-hover:text-flikd-black transition-colors ${getTextAnimationClass()}`} fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 5l7 7-7 7' />
              </svg>
            )}
          </button>
          
          {/* Divider */}
          <div className='h-px bg-gradient-to-r from-transparent via-flikd-black/20 to-transparent' />
          
          {/* Sign Out Button */}
          <button 
            onClick={handleSignOut}
            className='
              w-full flex items-center gap-3
              px-3 py-3 rounded-2xl
              text-flikd-black/70 hover:text-red-700 hover:bg-red-50
              transition-all duration-200
              group
            '
          >
            {/* Sign Out Icon */}
            <div className='w-11 h-11 flex items-center justify-center flex-shrink-0 rounded-xl group-hover:bg-red-100 transition-colors'>
              <svg className='w-5 h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} 
                      d='M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1' />
              </svg>
            </div>
            
            {/* Sign Out Text - shows when expanded with conditional animation */}
            {isExpanded && (
              <span className={`text-base font-bebas tracking-wider ${getTextAnimationClass()}`}>
                SIGN OUT
              </span>
            )}
          </button>
          
        </div>
        
      </div>
      
      {/* Animations */}
      <style jsx>{`
        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(-10px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        @keyframes slideInLeft {
          from {
            opacity: 0;
            transform: translateX(-15px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        @keyframes fadeInDelayed {
          0% {
            opacity: 0;
          }
          60% {
            opacity: 0;
          }
          100% {
            opacity: 1;
          }
        }
        
        @keyframes fadeInImmediate {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        
        .animate-slideInRight {
          animation: slideInRight 0.3s ease-out;
        }
        
        .animate-fadeInDelayed {
          animation: fadeInDelayed 0.4s ease-out forwards;
        }
        
        /* Hide scrollbar but keep functionality */
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </>
  )
}

export default Navbar