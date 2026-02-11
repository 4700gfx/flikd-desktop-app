import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import supabase from '../config/SupabaseClient'

const Home = () => {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        navigate('/login')
      } else {
        setUser(session.user)
        setLoading(false)
      }
    }

    checkUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        navigate('/login')
      } else if (session) {
        setUser(session.user)
        setLoading(false)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [navigate])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
  }

  if (loading) {
    return (
      <div className='min-h-screen bg-gradient-to-br from-flikd-black via-flikd-black to-gray-900 flex items-center justify-center'>
        <div className='text-center'>
          <svg className='animate-spin h-16 w-16 text-flikd-gold mx-auto mb-4' fill='none' viewBox='0 0 24 24'>
            <circle className='opacity-25' cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='4'></circle>
            <path className='opacity-75' fill='currentColor' d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'></path>
          </svg>
          <p className='text-flikd-gold text-xl font-inter font-medium'>Loading your experience...</p>
        </div>
      </div>
    )
  }

  return (
    <div className='min-h-screen bg-gradient-to-br from-flikd-black via-flikd-black to-gray-900 relative overflow-hidden'>
      {/* Animated background elements - matching LoginPage */}
      <div className='absolute inset-0 overflow-hidden pointer-events-none'>
        <div className='absolute -top-40 -right-40 w-80 h-80 bg-flikd-gold/5 rounded-full blur-3xl animate-pulse'></div>
        <div className='absolute top-1/2 -left-40 w-96 h-96 bg-flikd-gold/5 rounded-full blur-3xl animate-pulse' style={{ animationDelay: '1s' }}></div>
        <div className='absolute -bottom-40 right-1/4 w-64 h-64 bg-flikd-gold/5 rounded-full blur-3xl animate-pulse' style={{ animationDelay: '2s' }}></div>
      </div>

      {/* Navigation Bar */}
      <nav className='relative z-10 bg-gradient-to-r from-flikd-gold via-flikd-gold to-yellow-500 shadow-2xl'>
        <div className='container mx-auto px-6 py-5'>
          <div className='flex justify-between items-center'>
            {/* Logo Section */}
            <div className='flex items-center gap-4'>
              <div>
                <h1 className='font-bebas text-6xl text-flikd-black tracking-tight leading-none'>Flik'd</h1>
                <div className='h-0.5 w-16 bg-flikd-black mt-1'></div>
              </div>
            </div>
            
            {/* User Section */}
            <div className='flex items-center gap-6'>
              <div className='hidden md:flex items-center gap-4 bg-flikd-black/10 rounded-xl px-5 py-3'>
                <div className='w-10 h-10 bg-flikd-black/20 rounded-full flex items-center justify-center'>
                  <span className='font-bebas text-xl text-flikd-black'>
                    {user?.user_metadata?.full_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
                  </span>
                </div>
                <div className='text-left'>
                  <p className='font-inter text-xs text-flikd-black/70 leading-none mb-1'>Welcome back,</p>
                  <p className='font-inter font-bold text-flikd-black text-sm leading-none'>
                    {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'}
                  </p>
                </div>
              </div>
              
              <button
                onClick={handleSignOut}
                className='bg-flikd-black text-flikd-gold font-inter font-bold px-6 py-3 rounded-xl hover:bg-gray-900 hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5 active:translate-y-0'
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </nav>
      
      {/* Main Content */}
      <main className='relative z-10 container mx-auto px-6 py-12'>
        <div className='max-w-6xl mx-auto'>
          
          {/* Hero Welcome Section */}
          <div className='mb-12 text-center'>
            <h2 className='font-bebas text-7xl md:text-8xl text-flikd-gold mb-4 tracking-tight animate-fadeIn'>
              Welcome Back!
            </h2>
            <p className='font-inter text-white/80 text-xl md:text-2xl max-w-3xl mx-auto leading-relaxed'>
              Ready to discover, share, and connect? Your review journey continues here.
            </p>
          </div>

          {/* Quick Stats */}
          <div className='grid grid-cols-1 md:grid-cols-3 gap-6 mb-12'>
            {[
              { number: '0', label: 'Reviews Written', icon: '📝' },
              { number: '0', label: 'Communities Joined', icon: '👥' },
              { number: '0', label: 'Helpful Votes', icon: '👍' }
            ].map((stat, index) => (
              <div 
                key={index}
                className='bg-white rounded-2xl p-8 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 group'
                style={{ animation: 'slideUp 0.5s ease-out', animationDelay: `${index * 0.1}s`, animationFillMode: 'backwards' }}
              >
                <div className='text-5xl mb-3'>{stat.icon}</div>
                <div className='font-bebas text-6xl text-flikd-black mb-2 group-hover:text-flikd-gold transition-colors'>
                  {stat.number}
                </div>
                <div className='font-inter text-gray-600 text-sm font-medium uppercase tracking-wide'>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>

          {/* Feature Cards Grid */}
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12'>
            {[
              {
                title: 'Discover Reviews',
                description: 'Explore authentic reviews from our community',
                icon: (
                  <svg className='w-10 h-10' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z' />
                  </svg>
                ),
                color: 'from-blue-500 to-blue-600'
              },
              {
                title: 'Write a Review',
                description: 'Share your experiences and help others decide',
                icon: (
                  <svg className='w-10 h-10' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z' />
                  </svg>
                ),
                color: 'from-flikd-gold to-yellow-500'
              },
              {
                title: 'Join Communities',
                description: 'Connect with people who share your interests',
                icon: (
                  <svg className='w-10 h-10' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' />
                  </svg>
                ),
                color: 'from-purple-500 to-purple-600'
              },
              {
                title: 'Trending Now',
                description: 'See what\'s popular in your area',
                icon: (
                  <svg className='w-10 h-10' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M13 7h8m0 0v8m0-8l-8 8-4-4-6 6' />
                  </svg>
                ),
                color: 'from-red-500 to-red-600'
              },
              {
                title: 'My Bookmarks',
                description: 'Access your saved reviews and places',
                icon: (
                  <svg className='w-10 h-10' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z' />
                  </svg>
                ),
                color: 'from-green-500 to-green-600'
              },
              {
                title: 'Settings',
                description: 'Manage your profile and preferences',
                icon: (
                  <svg className='w-10 h-10' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' />
                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M15 12a3 3 0 11-6 0 3 3 0 016 0z' />
                  </svg>
                ),
                color: 'from-gray-600 to-gray-700'
              }
            ].map((feature, index) => (
              <div 
                key={index}
                className='bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 cursor-pointer group'
                style={{ animation: 'slideUp 0.5s ease-out', animationDelay: `${index * 0.1}s`, animationFillMode: 'backwards' }}
              >
                <div className={`w-16 h-16 bg-gradient-to-br ${feature.color} rounded-xl flex items-center justify-center mb-5 text-white group-hover:scale-110 transition-transform duration-300`}>
                  {feature.icon}
                </div>
                <h3 className='font-bebas text-3xl text-flikd-black mb-2 group-hover:text-flikd-gold transition-colors'>
                  {feature.title}
                </h3>
                <p className='font-inter text-gray-600 leading-relaxed'>
                  {feature.description}
                </p>
              </div>
            ))}
          </div>

          {/* Account Info Card */}
          <div className='bg-white rounded-3xl shadow-2xl overflow-hidden'>
            <div className='bg-gradient-to-r from-flikd-gold via-flikd-gold to-yellow-500 px-8 py-6'>
              <h3 className='font-bebas text-4xl text-flikd-black'>Your Account</h3>
            </div>
            <div className='p-8'>
              <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                <div className='space-y-5'>
                  <div className='flex items-start gap-4 p-4 bg-gray-50 rounded-xl'>
                    <div className='w-12 h-12 bg-flikd-gold/20 rounded-lg flex items-center justify-center flex-shrink-0'>
                      <svg className='w-6 h-6 text-flikd-gold' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' />
                      </svg>
                    </div>
                    <div>
                      <p className='font-inter text-sm text-gray-500 mb-1'>Email Address</p>
                      <p className='font-inter text-gray-900 font-semibold'>{user?.email}</p>
                    </div>
                  </div>
                  
                  <div className='flex items-start gap-4 p-4 bg-gray-50 rounded-xl'>
                    <div className='w-12 h-12 bg-flikd-gold/20 rounded-lg flex items-center justify-center flex-shrink-0'>
                      <svg className='w-6 h-6 text-flikd-gold' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' />
                      </svg>
                    </div>
                    <div>
                      <p className='font-inter text-sm text-gray-500 mb-1'>Full Name</p>
                      <p className='font-inter text-gray-900 font-semibold'>
                        {user?.user_metadata?.full_name || 'Not provided'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className='space-y-5'>
                  <div className='flex items-start gap-4 p-4 bg-gray-50 rounded-xl'>
                    <div className='w-12 h-12 bg-flikd-gold/20 rounded-lg flex items-center justify-center flex-shrink-0'>
                      <svg className='w-6 h-6 text-flikd-gold' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' />
                      </svg>
                    </div>
                    <div>
                      <p className='font-inter text-sm text-gray-500 mb-1'>Member Since</p>
                      <p className='font-inter text-gray-900 font-semibold'>
                        {new Date(user?.created_at).toLocaleDateString('en-US', { 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })}
                      </p>
                    </div>
                  </div>

                  <div className='flex items-start gap-4 p-4 bg-gray-50 rounded-xl'>
                    <div className='w-12 h-12 bg-flikd-gold/20 rounded-lg flex items-center justify-center flex-shrink-0'>
                      <svg className='w-6 h-6 text-flikd-gold' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' />
                      </svg>
                    </div>
                    <div>
                      <p className='font-inter text-sm text-gray-500 mb-1'>Account Status</p>
                      <p className='font-inter text-green-600 font-semibold flex items-center gap-2'>
                        <span className='w-2 h-2 bg-green-600 rounded-full'></span>
                        Active
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </main>

      {/* Animations */}
      <style jsx>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.8s ease-out;
        }
      `}</style>
    </div>
  )
}

export default Home