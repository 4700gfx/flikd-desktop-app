import React, { useState } from 'react'

const LogInPage = () => {
  const [isSignUp, setIsSignUp] = useState(true)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: ''
  })

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    // Add your authentication logic here
    console.log('Form submitted:', formData)
  }

  return (
    <section className='min-h-screen bg-flikd-black flex items-center justify-center p-4'>
      <div className='login-container flex flex-row w-full max-w-6xl h-[600px] rounded-2xl overflow-hidden shadow-2xl'>
        
        {/* Left Panel - Brand Showcase */}
        <div className='image-panel bg-flikd-gold w-1/2 p-12 flex flex-col justify-between relative overflow-hidden hidden md:flex'>
          {/* Decorative background pattern */}
          <div className='absolute inset-0 opacity-10'>
            <div className='absolute top-0 right-0 w-64 h-64 bg-flikd-black rounded-full -translate-y-1/2 translate-x-1/2'></div>
            <div className='absolute bottom-0 left-0 w-96 h-96 bg-flikd-black rounded-full translate-y-1/2 -translate-x-1/2'></div>
          </div>

          <div className='relative z-10'>
            <h1 className='font-bebas text-7xl leading-tight text-flikd-black mb-6'>
              🎥 Flik'd
            </h1>

            <h3 className='font-inter font-bold text-2xl'>Welcome Back</h3>
            <p className='font-inter text-md text-flikd-black/80 max-w-md w-10/12'>
              Sign in to track what you’re watching, share reviews, and discover what’s worth the hype. 
              Share list with your friends, get points and fall in love with the world of cinema. 
            </p>
          </div>

          <div className='relative z-10 space-y-4'>
            <div className='flex items-center gap-3'>
              <div className='w-12 h-12 rounded-full bg-flikd-black/10 flex items-center justify-center'>
                <svg className='w-6 h-6 text-flikd-black' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M5 13l4 4L19 7' />
                </svg>
              </div>
              <p className='font-inter text-flikd-black'>Discover authentic reviews</p>
            </div>
            <div className='flex items-center gap-3'>
              <div className='w-12 h-12 rounded-full bg-flikd-black/10 flex items-center justify-center'>
                <svg className='w-6 h-6 text-flikd-black' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M5 13l4 4L19 7' />
                </svg>
              </div>
              <p className='font-inter text-flikd-black'>Share your experiences</p>
            </div>
            <div className='flex items-center gap-3'>
              <div className='w-12 h-12 rounded-full bg-flikd-black/10 flex items-center justify-center'>
                <svg className='w-6 h-6 text-flikd-black' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M5 13l4 4L19 7' />
                </svg>
              </div>
              <p className='font-inter text-flikd-black'>Connect with community</p>
            </div>
          </div>
        </div>

        {/* Right Panel - Form */}
        <div className='bg-flikd-white w-full md:w-1/2 p-12 flex flex-col justify-center'>
          <div className='max-w-md mx-auto w-full'>
            
            {/* Header */}
            <div className='mb-8'>
              <h2 className='font-bebas text-5xl text-flikd-black mb-2'>
                {isSignUp ? 'Create Account' : 'Welcome Back'}
              </h2>
              <p className='font-inter text-flikd-black/60'>
                {isSignUp ? 'Sign up to get started' : 'Sign in to continue'}
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className='space-y-5'>
              
              {isSignUp && (
                <div>
                  <label className='font-inter text-sm font-medium text-flikd-black block mb-2'>
                    Full Name
                  </label>
                  <input
                    type='text'
                    name='name'
                    value={formData.name}
                    onChange={handleInputChange}
                    className='w-full px-4 py-3 border-2 border-flikd-black/10 rounded-lg font-inter focus:outline-none focus:border-flikd-gold transition-colors'
                    placeholder='Your Name'
                    required={isSignUp}
                  />
                </div>
              )}

              <div>
                <label className='font-inter text-sm font-medium text-flikd-black block mb-2'>
                  Email Address
                </label>
                <input
                  type='email'
                  name='email'
                  value={formData.email}
                  onChange={handleInputChange}
                  className='w-full px-4 py-3 border-2 border-flikd-black/10 rounded-lg font-inter focus:outline-none focus:border-flikd-gold transition-colors'
                  placeholder='you@example.com'
                  required
                />
              </div>

              <div>
                <label className='font-inter text-sm font-medium text-flikd-black block mb-2'>
                  Password
                </label>
                <input
                  type='password'
                  name='password'
                  value={formData.password}
                  onChange={handleInputChange}
                  className='w-full px-4 py-3 border-2 border-flikd-black/10 rounded-lg font-inter focus:outline-none focus:border-flikd-gold transition-colors'
                  placeholder='••••••••'
                  required
                />
              </div>

              {isSignUp && (
                <div>
                  <label className='font-inter text-sm font-medium text-flikd-black block mb-2'>
                    Confirm Password
                  </label>
                  <input
                    type='password'
                    name='confirmPassword'
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    className='w-full px-4 py-3 border-2 border-flikd-black/10 rounded-lg font-inter focus:outline-none focus:border-flikd-gold transition-colors'
                    placeholder='••••••••'
                    required={isSignUp}
                  />
                </div>
              )}

              {!isSignUp && (
                <div className='flex items-center justify-between'>
                  <label className='flex items-center gap-2 cursor-pointer'>
                    <input type='checkbox' className='w-4 h-4 accent-flikd-gold' />
                    <span className='font-inter text-sm text-flikd-black/60'>Remember me</span>
                  </label>
                  <button type='button' className='font-inter text-sm text-flikd-gold hover:underline'>
                    Forgot password?
                  </button>
                </div>
              )}

              <button
                type='submit'
                className='w-full bg-flikd-gold text-flikd-black font-inter font-semibold py-3 rounded-lg hover:bg-flikd-gold/90 transition-all transform hover:scale-[1.02] active:scale-[0.98]'
              >
                {isSignUp ? 'Create Account' : 'Sign In'}
              </button>
            </form>

            {/* Divider */}
            <div className='flex items-center gap-4 my-6'>
              <div className='flex-1 h-px bg-flikd-black/10'></div>
              <span className='font-inter text-sm text-flikd-black/40'>OR</span>
              <div className='flex-1 h-px bg-flikd-black/10'></div>
            </div>

            {/* Social Login */}
            <div className='space-y-3'>
              <button className='w-full border-2 border-flikd-black/10 text-flikd-black font-inter font-medium py-3 rounded-lg hover:border-flikd-gold hover:bg-flikd-gold/5 transition-all flex items-center justify-center gap-3'>
                <svg className='w-5 h-5' viewBox='0 0 24 24'>
                  <path fill='currentColor' d='M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z'/>
                  <path fill='currentColor' d='M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z'/>
                  <path fill='currentColor' d='M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z'/>
                  <path fill='currentColor' d='M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z'/>
                </svg>
                Continue with Google
              </button>
            </div>

            {/* Toggle Sign Up/Sign In */}
            <p className='font-inter text-center text-sm text-flikd-black/60 mt-6'>
              {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
              <button
                type='button'
                onClick={() => setIsSignUp(!isSignUp)}
                className='text-flikd-gold font-semibold hover:underline'
              >
                {isSignUp ? 'Sign In' : 'Sign Up'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

export default LogInPage