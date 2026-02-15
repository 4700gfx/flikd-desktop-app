import React, { useState, useEffect } from 'react'
import Navbar from '../components/sections/Navbar'
import CreatePost from '../components/sections/CreatePost'
import Post from '../components/common/Post'
import CurrentListTab from '../components/sections/CurrentListTab'
import RecentActivity from '../components/sections/RecentActivity'
import supabase from '../config/SupabaseClient'

/**
 * Home Page for Flik'd Application
 * 
 * Main feed layout with:
 * - Left sidebar: Navigation
 * - Center column: Create post + feed
 * - Right sidebar: Trends/suggestions (optional)
 * 
 * Colors: Gold (#D4AF37), Black (#0A0A0A), Grey (#0B375B), White (#FFFFFF)
 */

const Home = () => {
  const [currentUser, setCurrentUser] = useState(null)
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)

  // Fetch current user on mount
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser()
        
        if (error) throw error
        
        if (user) {
          setCurrentUser({
            id: user.id,
            name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
            email: user.email,
            avatar: user.user_metadata?.avatar_url || null
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

  // Fetch posts
  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const { data, error } = await supabase
          .from('posts')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(20)
        
        if (error) throw error
        setPosts(data || [])
      } catch (error) {
        console.error('Error fetching posts:', error)
      }
    }
    
    fetchPosts()
  }, [])

  // Handle new post creation
  const handlePostCreate = async (postData) => {
    try {
      // Upload images to Supabase Storage (if any)
      let imageUrls = []
      if (postData.images && postData.images.length > 0) {
        imageUrls = await Promise.all(
          postData.images.map(async (imageUrl, index) => {
            const response = await fetch(imageUrl)
            const blob = await response.blob()
            const fileName = `${currentUser.id}/${Date.now()}_${index}.jpg`
            
            const { data, error } = await supabase.storage
              .from('post-images')
              .upload(fileName, blob)
            
            if (error) throw error
            
            return supabase.storage
              .from('post-images')
              .getPublicUrl(fileName).data.publicUrl
          })
        )
      }

      // Create post in database
      const { data, error } = await supabase
        .from('posts')
        .insert({
          user_id: currentUser.id,
          content: postData.content,
          type: postData.type,
          movie_id: postData.movie?.id,
          rating: postData.rating,
          images: imageUrls,
          created_at: postData.timestamp
        })
        .select()
        .single()

      if (error) throw error

      // Add to local state
      const newPost = {
        ...data,
        user: currentUser,
        movie: postData.movie,
        likes: 0,
        comments: [],
        shares: 0,
        isLiked: false
      }
      
      setPosts([newPost, ...posts])
      
    } catch (error) {
      console.error('Error creating post:', error)
      alert('Failed to create post. Please try again.')
    }
  }

  // Movie search using TMDB API (replace with your API key)
  const handleMovieSearch = async (query) => {
    try {
      // Example using TMDB API - replace with your implementation
      const response = await fetch(
        `https://api.themoviedb.org/3/search/movie?api_key=YOUR_API_KEY&query=${encodeURIComponent(query)}`
      )
      const data = await response.json()
      
      return data.results?.slice(0, 5).map(movie => ({
        id: movie.id,
        title: movie.title,
        year: movie.release_date?.split('-')[0],
        genre: movie.genre_ids?.[0], // Map to genre names as needed
        posterUrl: movie.poster_path 
          ? `https://image.tmdb.org/t/p/w200${movie.poster_path}`
          : null
      })) || []
    } catch (error) {
      console.error('Movie search error:', error)
      return []
    }
  }

  // Handle post interactions
  const handleLike = async (post) => {
    // Implement like logic
    console.log('Liked post:', post.id)
  }

  const handleComment = async (post, commentText) => {
    // Implement comment logic
    console.log('Comment on post:', post.id, commentText)
  }

  const handleShare = async (post) => {
    // Implement share logic
    console.log('Share post:', post.id)
  }

  const handleUserClick = (user) => {
    // Navigate to user profile
    console.log('View user:', user.id)
  }

  if (loading) {
    return (
      <div className='min-h-screen bg-flikd-black flex items-center justify-center'>
        <div className='text-center'>
          <svg className='animate-spin h-12 w-12 text-flikd-gold mx-auto mb-4' fill='none' viewBox='0 0 24 24'>
            <circle className='opacity-25' cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='4'></circle>
            <path className='opacity-75' fill='currentColor' d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'></path>
          </svg>
          <p className='font-inter text-flikd-white/60'>Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className='min-h-screen bg-flikd-black'>
      {/* Navigation Sidebar */}
      <Navbar />
      
      {/* Main Content Area with Right Sidebar */}
      <main className='ml-28 lg:ml-80'>
        <div className='max-w-7xl mx-auto flex px-4'>
          
          {/* Center Feed */}
          <div className='flex-1 max-w'>
            
            {/* Page Header */}
            <div className='sticky top-0 z-40 bg-flikd-black/80 backdrop-blur-xl border-b border-flikd-grey mb-0'>
              <div className='px-4 py-3'>
                <h1 className='font-bebas text-2xl text-flikd-white tracking-wide'>
                  HOME
                </h1>
              </div>
            </div>

            {/* Create Post Section */}
            <div className='border-b-8 border-flikd-black'>
              <CreatePost
                currentUser={currentUser}
                onPostCreate={handlePostCreate}
                onMovieSearch={handleMovieSearch}
              />
            </div>

            {/* Posts Feed */}
            <div>
              {posts.length > 0 ? (
                posts.map((post) => (
                  <Post
                    key={post.id}
                    post={post}
                    currentUserId={currentUser?.id}
                    onLike={handleLike}
                    onComment={handleComment}
                    onShare={handleShare}
                    onUserClick={handleUserClick}
                    className='border-b border-flikd-grey'
                  />
                ))
              ) : (
                // Empty state
                <div className='p-12 text-center'>
                  <svg className='w-16 h-16 text-flikd-grey mx-auto mb-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z' />
                  </svg>
                  <h3 className='font-bebas text-xl text-flikd-white mb-2 tracking-wide'>
                    NO POSTS YET
                  </h3>
                  <p className='font-inter text-flikd-white/60 text-sm'>
                    Be the first to share your movie thoughts!
                  </p>
                </div>
              )}
            </div>
          </div>
          
          {/* Right Sidebar */}
          <aside className='hidden xl:block w-80 sticky top-0 h-screen overflow-y-auto py-4 ml-20 space-y-4'>
            {/* Current Watchlist */}
            <CurrentListTab
              movies={[]} // Pass actual watchlist data
              onMovieClick={(movie) => console.log('Movie clicked:', movie)}
              onViewAll={() => console.log('View all watchlist')}
            />
            
            {/* Recent Activity */}
            <RecentActivity
              activities={[]} // Pass actual activity data
              onActivityClick={(activity) => console.log('Activity clicked:', activity)}
            />
          </aside>
          
        </div>
      </main>
    </div>
  )
}

export default Home