import React, { useState, useEffect } from 'react'
import Navbar from '../components/sections/Navbar'
import CreatePost from '../components/sections/CreatePost'
import Post from '../components/common/Post'
import CurrentListTab from '../components/sections/CurrentListTab'
import RecentActivity from '../components/sections/RecentActivity'
import supabase from '../config/SupabaseClient'
import { ensureUserProfile } from '../utils/ProfileHelper'

/**
 * FLIK'D Home Page
 * - Wider main feed (max-w-3xl instead of max-w-2xl)
 * - Tighter sidebar
 * - Better responsive breakpoints
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

  // Fetch posts with full TMDB enrichment
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
            backdropPath: post.backdrop_path || null,
            mediaType: post.media_type || 'movie',
            overview: post.overview || null,
            genres: post.genres || [],
            runtime: post.runtime || null,
            releaseDate: post.release_date || null,
            year: post.year || null,
            voteAverage: post.vote_average || null,
            director: post.director || null,
            cast: post.cast_members || [],
            originalLanguage: post.original_language || null,
            status: post.status || null,
            productionCompanies: post.production_companies || []
          },
          content: post.content,
          rating: post.rating,
          timestamp: post.created_at,
          likes: post.likes_count || 0,
          dislikes: post.dislikes_count || 0,
          reposts: post.reposts_count || 0,
          comments: post.comments_count || 0,
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
            .select(`*, list_items (id, is_completed)`)
            .eq('user_id', currentUser.id)
            .is('deleted_at', null)
            .order('updated_at', { ascending: false })

          if (listsError) throw listsError

          setUserLists(listsData.map(list => ({
            id: list.id,
            name: list.name,
            description: list.description,
            isPublic: list.is_public,
            itemCount: list.list_items?.length || 0,
            completedCount: list.list_items?.filter(i => i.is_completed).length || 0
          })))
        } else {
          // RPC returns list_id (not id) — normalize to match the rest of the app
          setUserLists((data || []).map(l => ({
            id: l.list_id,
            name: l.name,
            description: l.description,
            isPublic: l.is_public,
            itemCount: Number(l.item_count) || 0,
            completedCount: Number(l.completed_count) || 0
          })))
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
          .select(`*, profiles:user_id (username, display_name, avatar_url)`)
          .order('created_at', { ascending: false })
          .limit(10)

        if (error) throw error

        setRecentActivities((data || []).map(activity => ({
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
        })))
      } catch (error) {
        console.error('Error fetching activities:', error)
      }
    }
    fetchActivities()
  }, [currentUser])

  const handlePostCreate = async (postData) => {
    try {
      // DECIMAL(2,1) in schema = max 9.9. Clamp rating so 10 doesn't violate the constraint.
      // To allow 10.0, run: ALTER TABLE posts ALTER COLUMN rating TYPE DECIMAL(3,1);
      const safeRating = Math.min(parseFloat(postData.rating) || 0, 9.9)

      const insertPayload = {
        user_id:     currentUser.id,
        tmdb_id:     postData.movie.id,
        media_type:  postData.movie.mediaType || 'movie',
        title:       postData.movie.title,
        poster_path: postData.movie.posterPath || null,
        content:     postData.content.trim(),
        rating:      safeRating,
        // Enriched TMDB columns — only present after ALTER TABLE migration
        backdrop_path:      postData.movie.backdropPath      || null,
        overview:           postData.movie.overview          || null,
        genres:             postData.movie.genres            || [],
        runtime:            postData.movie.runtime           || null,
        release_date:       postData.movie.releaseDate       || null,
        year:               postData.movie.year              || null,
        vote_average:       postData.movie.voteAverage       || null,
        director:           postData.movie.director          || null,
        cast_members:       postData.movie.cast              || [],
        original_language:  postData.movie.originalLanguage  || null,
      }

      const { data, error } = await supabase
        .from('posts')
        .insert(insertPayload)
        .select()
        .single()

      if (error) throw error

      await supabase.from('points_transactions').insert({
        user_id: currentUser.id,
        points: 10,
        reason: 'Created a review',
        reference_type: 'post',
        reference_id: data.id
      })

      await supabase.from('activities').insert({
        user_id: currentUser.id,
        activity_type: 'review_posted',
        activity_data: { post_id: data.id, movie_title: postData.movie.title, rating: postData.rating }
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
        likes: 0, dislikes: 0, reposts: 0, comments: 0,
        type: 'review'
      }

      setPosts(prev => [newPost, ...prev])
      setCurrentUser(prev => ({ ...prev, totalPoints: prev.totalPoints + 10 }))
      return { success: true }
    } catch (error) {
      console.error('Error creating post:', error)
      return { success: false, error: error.message }
    }
  }

  const handleListCreate = async (listData) => {
    try {
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
        const { error: itemsError } = await supabase.from('list_items').insert(listItems)
        if (itemsError) throw itemsError
      }

      await supabase.from('activities').insert({
        user_id: currentUser.id,
        activity_type: 'list_created',
        activity_data: { list_id: list.id, list_name: listData.name, movie_count: listData.movies.length }
      })

      setUserLists(prev => [...prev, {
        id: list.id,
        name: list.name,
        description: list.description,
        isPublic: list.is_public,
        itemCount: listData.movies.length,
        completedCount: 0
      }])

      return { success: true }
    } catch (error) {
      console.error('Error creating list:', error)
      return { success: false, error: error.message }
    }
  }

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

      // Refresh list counts
      setUserLists(prev => prev.map(l =>
        l.id === data.listId ? { ...l, itemCount: l.itemCount + 1 } : l
      ))

      return { success: true }
    } catch (error) {
      console.error('Error adding to list:', error)
      return { success: false, error: error.message }
    }
  }

  const handleMovieSearch = async (query) => {
    if (!query.trim()) return []
    try {
      const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY
      if (!TMDB_API_KEY || TMDB_API_KEY === 'YOUR_API_KEY') return []

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
          year: item.release_date?.split('-')[0] || item.first_air_date?.split('-')[0] || 'N/A',
          mediaType: item.media_type,
          posterPath: item.poster_path,
          backdropPath: item.backdrop_path || null,
          overview: item.overview || null,
          voteAverage: item.vote_average || null,
          originalLanguage: item.original_language || null
        }))
    } catch (error) {
      console.error('Movie search error:', error)
      return []
    }
  }

  // Fetch enriched TMDB details for a movie (used in CreatePost)
  const handleMovieDetails = async (movie) => {
    try {
      const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY
      if (!TMDB_API_KEY) return movie

      const endpoint = movie.mediaType === 'tv'
        ? `https://api.themoviedb.org/3/tv/${movie.id}?api_key=${TMDB_API_KEY}&append_to_response=credits`
        : `https://api.themoviedb.org/3/movie/${movie.id}?api_key=${TMDB_API_KEY}&append_to_response=credits`

      const res = await fetch(endpoint)
      if (!res.ok) return movie
      const data = await res.json()

      const director = movie.mediaType === 'tv'
        ? data.created_by?.[0]?.name || null
        : data.credits?.crew?.find(c => c.job === 'Director')?.name || null

      const cast = data.credits?.cast?.slice(0, 8).map(c => c.name) || []
      const genres = data.genres?.map(g => g.name) || []

      return {
        ...movie,
        backdropPath: data.backdrop_path || movie.backdropPath,
        overview: data.overview || movie.overview,
        runtime: data.runtime || data.episode_run_time?.[0] || null,
        releaseDate: data.release_date || data.first_air_date || null,
        voteAverage: data.vote_average || movie.voteAverage,
        director,
        cast,
        genres,
        originalLanguage: data.original_language || movie.originalLanguage,
        status: data.status || null,
        productionCompanies: data.production_companies?.slice(0, 3).map(c => c.name) || []
      }
    } catch {
      return movie
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
        {/* Wider container — removed max-w-7xl constraint, use full remaining width */}
        <div className='flex gap-0 xl:gap-6 2xl:gap-8 px-0 xl:px-4 2xl:px-6'>

          {/* ── MAIN FEED ── wider: no max-w cap until xl, then flex-1 */}
          <div className='flex-1 min-w-0 border-x border-[#1A1A1A]'>

            {/* Sticky Header */}
            <div className='sticky top-0 z-50 bg-[#0A0A0A]/98 backdrop-blur-xl border-b border-[#1A1A1A]'>
              <div className='px-6 py-4 flex items-center justify-between'>
                <h1 className='font-bebas text-3xl text-white tracking-[0.05em]'>HOME</h1>
                {currentUser && (
                  <div className='flex items-center gap-3'>
                    <div className='flex items-center gap-2 px-3 py-1.5 bg-[#1A1A1A] rounded-full border border-[#2D2D2D]'>
                      <svg className='w-4 h-4 text-[#D4AF37]' fill='currentColor' viewBox='0 0 20 20'>
                        <path d='M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z' />
                      </svg>
                      <span className='font-inter font-bold text-white text-sm'>{currentUser.totalPoints.toLocaleString()}</span>
                    </div>
                    <div className='px-3 py-1.5 bg-gradient-to-r from-[#D4AF37] to-[#E8C55B] rounded-full'>
                      <span className='font-inter font-bold text-[#0A0A0A] text-sm'>Lvl {currentUser.level}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Create Post */}
            <div className='border-b border-[#1A1A1A]'>
              <CreatePost
                currentUser={currentUser}
                onPostCreate={handlePostCreate}
                onListCreate={handleListCreate}
                onListItemAdd={handleListItemAdd}
                onMovieSearch={handleMovieSearch}
                onMovieDetails={handleMovieDetails}
                userLists={userLists}
              />
            </div>

            {/* Posts Feed */}
            <div className='pb-24'>
              {posts.length > 0 ? (
                posts.map((post, index) => (
                  <Post
                    key={post.id}
                    post={post}
                    currentUserId={currentUser?.id}
                    onUserClick={(user) => console.log('User:', user)}
                    style={{ animation: `fadeInUp 0.4s ease-out ${Math.min(index * 0.04, 0.3)}s both` }}
                  />
                ))
              ) : (
                <div className='p-20 text-center'>
                  <div className='w-24 h-24 bg-[#1A1A1A] rounded-full flex items-center justify-center mx-auto mb-6'>
                    <svg className='w-12 h-12 text-[#2D2D2D]' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={1.5} d='M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z' />
                    </svg>
                  </div>
                  <h3 className='font-bebas text-2xl text-white mb-3 tracking-wide'>NO REVIEWS YET</h3>
                  <p className='font-inter text-white/50 text-sm'>Be the first to share your thoughts!</p>
                </div>
              )}
            </div>
          </div>

          {/* ── SIDEBAR ── fixed width, hidden below xl */}
          <aside className='hidden xl:flex flex-col w-72 2xl:w-80 flex-shrink-0 sticky top-0 h-screen overflow-y-auto py-4 space-y-4 pr-2'>
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
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}

export default Home