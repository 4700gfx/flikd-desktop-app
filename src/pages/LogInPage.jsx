import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import supabase from '../config/SupabaseClient'

const LogInPage = () => {
  const navigate = useNavigate()
  const [isSignUp, setIsSignUp] = useState(true)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [successMessage, setSuccessMessage] = useState(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // Check if user is already logged in when component mounts
  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        // User is already logged in, redirect to home
        navigate('/home')
      }
    }
    
    checkUser()

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        // Redirect to home after successful sign in
        navigate('/home')
      }
    })

    // Cleanup subscription on unmount
    return () => {
      subscription.unsubscribe()
    }
  }, [navigate])

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
    setError(null)
  }

  const handleSignUp = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccessMessage(null)

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords don't match")
      setLoading(false)
      return
    }

    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters")
      setLoading(false)
      return
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.name,
          }
        }
      })

      if (error) throw error

      // Check if email confirmation is required
      if (data?.user?.identities?.length === 0) {
        setError('This email is already registered. Please sign in instead.')
      } else if (data?.user && !data?.session) {
        // Email confirmation required
        setSuccessMessage('Account created! Please check your email to verify your account.')
      } else {
        // Auto sign-in enabled (no email confirmation required)
        setSuccessMessage('Account created successfully! Redirecting...')
        // The useEffect listener will handle the redirect
      }

      console.log('Sign up successful:', data)

      setFormData({
        email: '',
        password: '',
        confirmPassword: '',
        name: ''
      })

    } catch (error) {
      setError(error.message)
      console.error('Sign up error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSignIn = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccessMessage(null)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      })

      if (error) throw error

      setSuccessMessage('Login successful! Redirecting...')
      console.log('Sign in successful:', data)
      
      // The useEffect listener will automatically redirect to /home

    } catch (error) {
      setError(error.message)
      console.error('Sign in error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setLoading(true)
    setError(null)

    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/home` // Redirect to home after Google auth
        }
      })

      if (error) throw error

    } catch (error) {
      setError(error.message)
      console.error('Google sign in error:', error)
      setLoading(false)
    }
  }

  const handleSubmit = isSignUp ? handleSignUp : handleSignIn

  return (
    <section className='min-h-screen bg-gradient-to-br from-flikd-black via-flikd-black to-gray-900 flex items-center justify-center p-4 relative overflow-hidden'>
      {/* Animated background elements */}
      <div className='absolute inset-0 overflow-hidden pointer-events-none'>
        <div className='absolute -top-40 -right-40 w-80 h-80 bg-flikd-gold/5 rounded-full blur-3xl animate-pulse'></div>
        <div className='absolute -bottom-40 -left-40 w-96 h-96 bg-flikd-gold/5 rounded-full blur-3xl animate-pulse' style={{ animationDelay: '1s' }}></div>
      </div>

      <div className='login-container flex flex-row w-full max-w-5xl min-h-[650px] rounded-3xl overflow-hidden shadow-2xl backdrop-blur-sm bg-white/5 relative z-10'>
        
        {/* Left Panel - Brand Showcase */}
        <div className='image-panel bg-gradient-to-br from-flikd-gold via-flikd-gold to-yellow-500 w-1/2 p-12 flex flex-col justify-between relative overflow-hidden hidden lg:flex'>
          {/* Decorative elements */}
          <div className='absolute inset-0'>
            <div className='absolute top-10 right-10 w-32 h-32 border-2 border-flikd-black/10 rounded-full'></div>
            <div className='absolute bottom-20 left-10 w-24 h-24 border-2 border-flikd-black/10 rounded-full'></div>
            <div className='absolute top-1/2 right-20 w-16 h-16 bg-flikd-black/5 rounded-full'></div>
          </div>

          <div className='relative z-10'>
            <div className='inline-block mb-6'>
              <h1 className='font-bebas text-8xl leading-none text-flikd-black tracking-tight'>
                Flik'd
              </h1>
              <div className='h-1 w-24 bg-flikd-black mt-2'></div>
            </div>
            <p className='font-inter text-2xl text-flikd-black/90 font-light max-w-md leading-relaxed'>
              Your New Favorite Review Application
            </p>
          </div>

          <div className='relative z-10 space-y-6'>
            {[
              { text: 'Discover authentic reviews', delay: '0s' },
              { text: 'Share your experiences', delay: '0.1s' },
              { text: 'Connect with community', delay: '0.2s' }
            ].map((item, index) => (
              <div 
                key={index} 
                className='flex items-center gap-4 group'
                style={{ animation: 'slideIn 0.5s ease-out', animationDelay: item.delay }}
              >
                <div className='w-10 h-10 rounded-full bg-flikd-black/10 flex items-center justify-center group-hover:bg-flikd-black/20 transition-colors'>
                  <svg className='w-5 h-5 text-flikd-black' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2.5} d='M5 13l4 4L19 7' />
                  </svg>
                </div>
                <p className='font-inter text-flikd-black text-lg font-medium'>{item.text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Right Panel - Form */}
        <div className='bg-white w-full lg:w-1/2 p-8 lg:p-12 flex flex-col justify-center'>
          <div className='max-w-md mx-auto w-full'>
            
            {/* Mobile Logo */}
            <div className='lg:hidden mb-8 text-center'>
              <h1 className='font-bebas text-6xl text-flikd-black'>Flik'd</h1>
            </div>

            {/* Header */}
            <div className='mb-8'>
              <h2 className='font-bebas text-5xl text-flikd-black mb-3 tracking-tight'>
                {isSignUp ? 'Create Account' : 'Welcome Back'}
              </h2>
              <p className='font-inter text-gray-500 text-base'>
                {isSignUp ? 'Join the Flik\'d community today' : 'Sign in to continue your journey'}
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className='mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-r-lg animate-shake'>
                <div className='flex items-start'>
                  <svg className='w-5 h-5 text-red-500 mt-0.5 mr-3 flex-shrink-0' fill='currentColor' viewBox='0 0 20 20'>
                    <path fillRule='evenodd' d='M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z' clipRule='evenodd' />
                  </svg>
                  <p className='font-inter text-sm text-red-700 font-medium'>{error}</p>
                </div>
              </div>
            )}

            {/* Success Message */}
            {successMessage && (
              <div className='mb-6 p-4 bg-green-50 border-l-4 border-green-500 rounded-r-lg animate-slideDown'>
                <div className='flex items-start'>
                  <svg className='w-5 h-5 text-green-500 mt-0.5 mr-3 flex-shrink-0' fill='currentColor' viewBox='0 0 20 20'>
                    <path fillRule='evenodd' d='M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z' clipRule='evenodd' />
                  </svg>
                  <p className='font-inter text-sm text-green-700 font-medium'>{successMessage}</p>
                </div>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className='space-y-5'>
              
              {isSignUp && (
                <div className='animate-fadeIn'>
                  <label className='font-inter text-sm font-semibold text-gray-700 block mb-2'>
                    Full Name
                  </label>
                  <input
                    type='text'
                    name='name'
                    value={formData.name}
                    onChange={handleInputChange}
                    className='w-full px-4 py-3.5 border-2 border-gray-200 rounded-xl font-inter text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-flikd-gold focus:ring-4 focus:ring-flikd-gold/10 transition-all duration-200'
                    placeholder='John Doe'
                    required={isSignUp}
                    disabled={loading}
                  />
                </div>
              )}

              <div>
                <label className='font-inter text-sm font-semibold text-gray-700 block mb-2'>
                  Email Address
                </label>
                <input
                  type='email'
                  name='email'
                  value={formData.email}
                  onChange={handleInputChange}
                  className='w-full px-4 py-3.5 border-2 border-gray-200 rounded-xl font-inter text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-flikd-gold focus:ring-4 focus:ring-flikd-gold/10 transition-all duration-200'
                  placeholder='you@example.com'
                  required
                  disabled={loading}
                />
              </div>

              <div>
                <label className='font-inter text-sm font-semibold text-gray-700 block mb-2'>
                  Password
                </label>
                <div className='relative'>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name='password'
                    value={formData.password}
                    onChange={handleInputChange}
                    className='w-full px-4 py-3.5 border-2 border-gray-200 rounded-xl font-inter text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-flikd-gold focus:ring-4 focus:ring-flikd-gold/10 transition-all duration-200 pr-12'
                    placeholder='••••••••'
                    required
                    disabled={loading}
                  />
                  <button
                    type='button'
                    onClick={() => setShowPassword(!showPassword)}
                    className='absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors'
                    disabled={loading}
                  >
                    {showPassword ? (
                      <svg className='w-5 h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M15 12a3 3 0 11-6 0 3 3 0 016 0z' />
                        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z' />
                      </svg>
                    ) : (
                      <svg className='w-5 h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21' />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {isSignUp && (
                <div className='animate-fadeIn'>
                  <label className='font-inter text-sm font-semibold text-gray-700 block mb-2'>
                    Confirm Password
                  </label>
                  <div className='relative'>
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      name='confirmPassword'
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      className='w-full px-4 py-3.5 border-2 border-gray-200 rounded-xl font-inter text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-flikd-gold focus:ring-4 focus:ring-flikd-gold/10 transition-all duration-200 pr-12'
                      placeholder='••••••••'
                      required={isSignUp}
                      disabled={loading}
                    />
                    <button
                      type='button'
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className='absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors'
                      disabled={loading}
                    >
                      {showConfirmPassword ? (
                        <svg className='w-5 h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                          <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M15 12a3 3 0 11-6 0 3 3 0 016 0z' />
                          <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z' />
                        </svg>
                      ) : (
                        <svg className='w-5 h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                          <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21' />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {!isSignUp && (
                <div className='flex items-center justify-between'>
                  <label className='flex items-center gap-2.5 cursor-pointer group'>
                    <input 
                      type='checkbox' 
                      className='w-4 h-4 accent-flikd-gold rounded border-gray-300 focus:ring-flikd-gold focus:ring-2' 
                      disabled={loading} 
                    />
                    <span className='font-inter text-sm text-gray-600 group-hover:text-gray-900 transition-colors'>Remember me</span>
                  </label>
                  <button 
                    type='button' 
                    className='font-inter text-sm text-flikd-gold hover:text-yellow-600 font-medium transition-colors' 
                    disabled={loading}
                  >
                    Forgot password?
                  </button>
                </div>
              )}

              <button
                type='submit'
                disabled={loading}
                className='w-full bg-gradient-to-r from-flikd-gold to-yellow-500 text-flikd-black font-inter font-bold py-4 rounded-xl hover:shadow-xl hover:shadow-flikd-gold/30 transition-all duration-300 transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none mt-6'
              >
                {loading ? (
                  <span className='flex items-center justify-center gap-2'>
                    <svg className='animate-spin h-5 w-5' fill='none' viewBox='0 0 24 24'>
                      <circle className='opacity-25' cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='4'></circle>
                      <path className='opacity-75' fill='currentColor' d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'></path>
                    </svg>
                    Processing...
                  </span>
                ) : (
                  isSignUp ? 'Create Account' : 'Sign In'
                )}
              </button>
            </form>

            {/* Divider */}
            <div className='flex items-center gap-4 my-8'>
              <div className='flex-1 h-px bg-gray-200'></div>
              <span className='font-inter text-sm text-gray-400 font-medium'>OR</span>
              <div className='flex-1 h-px bg-gray-200'></div>
            </div>

            {/* Social Login */}
            <button 
              onClick={handleGoogleSignIn}
              disabled={loading}
              type='button'
              className='w-full border-2 border-gray-200 text-gray-700 font-inter font-semibold py-3.5 rounded-xl hover:border-flikd-gold hover:bg-flikd-gold/5 transition-all duration-200 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed group'
            >
              <svg className='w-5 h-5 group-hover:scale-110 transition-transform' viewBox='0 0 24 24'>
                <path fill='#4285F4' d='M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z'/>
                <path fill='#34A853' d='M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z'/>
                <path fill='#FBBC05' d='M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z'/>
                <path fill='#EA4335' d='M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z'/>
              </svg>
              Continue with Google
            </button>

            {/* Toggle Sign Up/Sign In */}
            <p className='font-inter text-center text-sm text-gray-500 mt-8'>
              {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
              <button
                type='button'
                onClick={() => {
                  setIsSignUp(!isSignUp)
                  setError(null)
                  setSuccessMessage(null)
                }}
                disabled={loading}
                className='text-flikd-gold font-bold hover:text-yellow-600 transition-colors disabled:opacity-50'
              >
                {isSignUp ? 'Sign In' : 'Sign Up'}
              </button>
            </p>
          </div>
        </div>
      </div>

      {/* Add animations */}
      <style jsx>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        .animate-shake {
          animation: shake 0.3s ease-in-out;
        }
        
        .animate-slideDown {
          animation: slideDown 0.3s ease-out;
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-in;
        }
      `}</style>
    </section>
  )
}

export default LogInPage