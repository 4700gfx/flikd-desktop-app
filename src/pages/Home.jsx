import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import supabase from '../config/SupabaseClient'
import Navbar from '../components/sections/Navbar'

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
    <main className='min-h-screen bg-[#0a0a0ae1]'>
      <Navbar></Navbar>
    </main>
  )
}

export default Home