import React, { useState, useEffect } from 'react'
import Navbar from '../components/sections/Navbar'
import CreatePost from '../components/sections/CreatePost'
import Post from '../components/common/Post'
import CurrentListTab from '../components/sections/CurrentListTab'
import RecentActivity from '../components/sections/RecentActivity'
import supabase from '../config/SupabaseClient'
import { ensureUserProfile } from '../utils/ProfileHelper'

/**
 * FLIK'D Home Page - FIXED VERSION
 * Ensures profile exists before allowing posts
 * Adds full list creation and management
 */

const Home = () => {
  const [currentUser, setCurrentUser] = useState(null)
  const [posts, setPosts] = useState([])
  const [userLists, setUserLists] = useState([])
  const [recentActivities, setRecentActivities] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Fetch and ensure user profile exists
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        
        if (authError) throw authError
        
        if (user) {
          // CRITICAL: Ensure profile exists before proceeding
          const profile = await ensureUserProfile(user)
          
          if (profile) {
            setCurrentUser({
              id: user.id,
              username: profile.username,
              displayName: profile.display_name,
              email: user.email,
              avatar: profile.avatar_url,
              bio: profile.bio,
              totalPoints: profile.total_points || 0,
              level: profile.level || 1
            })
          }
        }
      } catch (error) {
        console.error('Error fetching user:', error)
        setError('Failed to load user data. Please refresh.')
      } finally {
        setLoading(false)
      }
    }
    
    fetchUser()
  }, [])

  // Fetch posts
  useEffect(() => {
    const fetchPosts = async () => {
      if (!currentUser) return
      
      try {
        const { data, error } = await supabase
          .from('posts')
          .select(`
            *,
            profiles:user_id (
              id,
              username,
              display_name,
              avatar_url,
              level
            )
          `)
          .order('created_at', { ascending: false })
          .limit(50)
        
        if (error) throw error

        const transformedPosts = (data || []).map(post => ({
          id: post.id,
          userId: post.user_id,
          user: {
            id: post.profiles?.id || post.user_id,
            username: post.profiles?.username || 'unknown',
            displayName: post.profiles?.display_name || 'User',
            avatar: post.profiles?.avatar_url || null,
            level: post.profiles?.level || 1
          },
          movie: {
            id: post.tmdb_id,
            title: post.title,
            posterPath: post.poster_path,
            mediaType: post.media_type || 'movie'
          },
          content: post.content,
          rating: post.rating,
          timestamp: post.created_at,
          type: 'review'
        }))
        
        setPosts(transformedPosts)
      } catch (error) {
        console.error('Error fetching posts:', error)
      }
    }
    
    fetchPosts()
  }, [currentUser])

  // Fetch user's lists
  useEffect(() => {
    const fetchUserLists = async () => {
      if (!currentUser) return
      
      try {
        const { data, error } = await supabase
          .rpc('get_user_lists_with_counts', { target_user_id: currentUser.id })
        
        if (error) {
          const { data: listsData, error: listsError } = await supabase
            .from('lists')
            .select(`
              *,
              list_items (
                id,
                is_completed
              )
            `)
            .eq('user_id', currentUser.id)
            .is('deleted_at', null)
            .order('updated_at', { ascending: false })
          
          if (listsError) throw listsError
          
          const formattedLists = listsData.map(list => ({
            id: list.id,
            name: list.name,
            description: list.description,
            isPublic: list.is_public,
            itemCount: list.list_items?.length || 0,
            completedCount: list.list_items?.filter(item => item.is_completed).length || 0
          }))
          
          setUserLists(formattedLists)
        } else {
          setUserLists(data || [])
        }
      } catch (error) {
        console.error('Error fetching lists:', error)
      }
    }
    
    fetchUserLists()
  }, [currentUser])

  // Fetch activities
  useEffect(() => {
    const fetchActivities = async () => {
      if (!currentUser) return
      
      try {
        const { data, error } = await supabase
          .from('activities')
          .select(`
            *,
            profiles:user_id (
              username,
              display_name,
              avatar_url
            )
          `)
          .order('created_at', { ascending: false })
          .limit(10)
        
        if (error) throw error

        const formattedActivities = (data || []).map(activity => ({
          id: activity.id,
          type: activity.activity_type,
          user: {
            id: activity.user_id,
            username: activity.profiles?.username || 'unknown',
            displayName: activity.profiles?.display_name || 'User',
            avatar: activity.profiles?.avatar_url || null
          },
          data: activity.activity_data,
          timestamp: activity.created_at
        }))
        
        setRecentActivities(formattedActivities)
      } catch (error) {
        console.error('Error fetching activities:', error)
      }
    }
    
    fetchActivities()
  }, [currentUser])

  // Handle post creation
  const handlePostCreate = async (postData) => {
    try {
      const { data, error } = await supabase
        .from('posts')
        .insert({
          user_id: currentUser.id,
          tmdb_id: postData.movie.id,
          media_type: postData.movie.mediaType || 'movie',
          title: postData.movie.title,
          poster_path: postData.movie.posterPath,
          content: postData.content.trim(),
          rating: postData.rating
        })
        .select()
        .single()

      if (error) throw error

      // Award points
      await supabase.from('points_transactions').insert({
        user_id: currentUser.id,
        points: 10,
        reason: 'Created a review',
        reference_type: 'post',
        reference_id: data.id
      })

      // Create activity
      await supabase.from('activities').insert({
        user_id: currentUser.id,
        activity_type: 'review_posted',
        activity_data: {
          post_id: data.id,
          movie_title: postData.movie.title,
          rating: postData.rating
        }
      })

      const newPost = {
        id: data.id,
        userId: currentUser.id,
        user: {
          id: currentUser.id,
          username: currentUser.username,
          displayName: currentUser.displayName,
          avatar: currentUser.avatar,
          level: currentUser.level
        },
        movie: postData.movie,
        content: data.content,
        rating: data.rating,
        timestamp: data.created_at,
        type: 'review'
      }
      
      setPosts([newPost, ...posts])
      setCurrentUser(prev => ({ ...prev, totalPoints: prev.totalPoints + 10 }))
      
      return { success: true }
    } catch (error) {
      console.error('Error creating post:', error)
      return { success: false, error: error.message }
    }
  }

  // Handle list creation
  const handleListCreate = async (listData) => {
    try {
      // Create list
      const { data: list, error: listError } = await supabase
        .from('lists')
        .insert({
          user_id: currentUser.id,
          name: listData.name,
          description: listData.description || null,
          is_public: listData.isPublic,
          is_collaborative: listData.isCollaborative
        })
        .select()
        .single()

      if (listError) throw listError

      // Add movies to list
      if (listData.movies && listData.movies.length > 0) {
        const listItems = listData.movies.map((movie, index) => ({
          list_id: list.id,
          tmdb_id: movie.id,
          media_type: movie.mediaType || 'movie',
          title: movie.title,
          poster_path: movie.posterPath,
          position: index,
          added_by: currentUser.id
        }))

        const { error: itemsError } = await supabase
          .from('list_items')
          .insert(listItems)

        if (itemsError) throw itemsError
      }

      // Create activity
      await supabase.from('activities').insert({
        user_id: currentUser.id,
        activity_type: 'list_created',
        activity_data: {
          list_id: list.id,
          list_name: listData.name,
          movie_count: listData.movies.length
        }
      })

      // Refresh lists
      const updatedLists = [...userLists, {
        id: list.id,
        name: list.name,
        description: list.description,
        isPublic: list.is_public,
        itemCount: listData.movies.length,
        completedCount: 0
      }]
      setUserLists(updatedLists)

      return { success: true }
    } catch (error) {
      console.error('Error creating list:', error)
      return { success: false, error: error.message }
    }
  }

  // Handle quick add to list
  const handleListItemAdd = async (data) => {
    try {
      const { error } = await supabase
        .from('list_items')
        .insert({
          list_id: data.listId,
          tmdb_id: data.movie.id,
          media_type: data.movie.mediaType || 'movie',
          title: data.movie.title,
          poster_path: data.movie.posterPath,
          added_by: currentUser.id
        })

      if (error) throw error

      // Refresh lists
      const { data: listsData } = await supabase
        .rpc('get_user_lists_with_counts', { target_user_id: currentUser.id })
      
      if (listsData) setUserLists(listsData)

      return { success: true }
    } catch (error) {
      console.error('Error adding to list:', error)
      return { success: false, error: error.message }
    }
  }

  // Movie search
  const handleMovieSearch = async (query) => {
    if (!query.trim()) return []
    
    try {
      const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY || process.env.REACT_APP_TMDB_API_KEY
      
      if (!TMDB_API_KEY || TMDB_API_KEY === 'YOUR_API_KEY') {
        console.warn('TMDB API key not configured')
        return []
      }
      
      const response = await fetch(
        `https://api.themoviedb.org/3/search/multi?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}`
      )
      
      if (!response.ok) throw new Error('Movie search failed')
      
      const data = await response.json()
      
      return (data.results || [])
        .filter(item => item.media_type === 'movie' || item.media_type === 'tv')
        .slice(0, 10)
        .map(item => ({
          id: item.id,
          title: item.title || item.name,
          year: item.release_date ? item.release_date.split('-')[0] : 
                item.first_air_date ? item.first_air_date.split('-')[0] : 'N/A',
          mediaType: item.media_type,
          posterPath: item.poster_path
        }))
    } catch (error) {
      console.error('Movie search error:', error)
      return []
    }
  }

  if (loading) {
    return (
      <div className='min-h-screen bg-[#0A0A0A] flex items-center justify-center'>
        <div className='text-center'>
          <svg className='animate-spin h-16 w-16 text-[#D4AF37] mx-auto mb-4' fill='none' viewBox='0 0 24 24'>
            <circle className='opacity-25' cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='4' />
            <path className='opacity-75' fill='currentColor' d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z' />
          </svg>
          <h2 className='font-bebas text-2xl text-[#D4AF37] tracking-wide mb-2'>LOADING FLIK'D</h2>
        </div>
      </div>
    )
  }

  if (error && !currentUser) {
    return (
      <div className='min-h-screen bg-[#0A0A0A] flex items-center justify-center p-4'>
        <div className='text-center max-w-md'>
          <div className='w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6'>
            <svg className='w-10 h-10 text-red-500' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' />
            </svg>
          </div>
          <h2 className='font-bebas text-3xl text-white mb-3 tracking-wide'>ERROR</h2>
          <p className='font-inter text-white/60 mb-6 text-sm'>{error}</p>
          <button onClick={() => window.location.reload()} className='bg-[#D4AF37] text-[#0A0A0A] px-8 py-3 rounded-full font-inter font-bold text-sm hover:bg-[#E8C55B]'>
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className='min-h-screen bg-[#0A0A0A]'>
      <Navbar currentUser={currentUser} />
      
      <main className='ml-20 lg:ml-72'>
        <div className='max-w-7xl mx-auto flex gap-8 px-4'>
          
          <div className='flex-1 max-w-2xl'>
            
            <div className='sticky top-0 z-50 bg-[#0A0A0A]/98 backdrop-blur-xl border-b border-[#1A1A1A]'>
              <div className='px-4 py-4 flex items-center justify-between'>
                <h1 className='font-bebas text-3xl text-white tracking-[0.05em]'>HOME</h1>
                
                {currentUser && (
                  <div className='flex items-center gap-3'>
                    <div className='flex items-center gap-2 px-3 py-1.5 bg-[#1A1A1A] rounded-full border border-[#2D2D2D]'>
                      <svg className='w-4 h-4 text-[#D4AF37]' fill='currentColor' viewBox='0 0 20 20'>
                        <path d='M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z' />
                      </svg>
                      <span className='font-inter font-bold text-white text-sm'>{currentUser.totalPoints}</span>
                    </div>
                    <div className='px-3 py-1.5 bg-gradient-to-r from-[#D4AF37] to-[#E8C55B] rounded-full'>
                      <span className='font-inter font-bold text-[#0A0A0A] text-sm'>Level {currentUser.level}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className='border-b-8 border-[#0A0A0A]'>
              <CreatePost
                currentUser={currentUser}
                onPostCreate={handlePostCreate}
                onListCreate={handleListCreate}
                onListItemAdd={handleListItemAdd}
                onMovieSearch={handleMovieSearch}
                userLists={userLists}
              />
            </div>

            <div className='pb-24'>
              {posts.length > 0 ? (
                posts.map((post, index) => (
                  <Post
                    key={post.id}
                    post={post}
                    currentUserId={currentUser?.id}
                    onUserClick={(user) => console.log('User:', user)}
                    className='border-b border-[#1A1A1A]'
                    style={{ animation: `fadeInUp 0.4s ease-out ${index * 0.05}s both` }}
                  />
                ))
              ) : (
                <div className='p-16 text-center'>
                  <div className='w-24 h-24 bg-[#1A1A1A] rounded-full flex items-center justify-center mx-auto mb-6'>
                    <svg className='w-12 h-12 text-[#2D2D2D]' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={1.5} d='M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z' />
                    </svg>
                  </div>
                  <h3 className='font-bebas text-2xl text-white mb-3 tracking-wide'>NO REVIEWS YET</h3>
                  <p className='font-inter text-white/60 text-sm max-w-sm mx-auto'>Be the first to share your movie thoughts!</p>
                </div>
              )}
            </div>
          </div>
          
          <aside className='hidden xl:block w-80 sticky top-0 h-screen overflow-y-auto py-4 space-y-6'>
            <CurrentListTab
              lists={userLists}
              onListClick={(list) => console.log('List:', list)}
              onViewAll={() => console.log('View all')}
            />
            
            <RecentActivity
              activities={recentActivities}
              onActivityClick={(activity) => console.log('Activity:', activity)}
            />
          </aside>
          
        </div>
      </main>

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}

export default Home