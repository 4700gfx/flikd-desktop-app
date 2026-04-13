import React, { useState, useEffect, useCallback, useRef } from 'react'
import Navbar from '../components/sections/Navbar'
import CreatePost from '../components/sections/CreatePost'
import Post from '../components/common/Post'
import CurrentListTab from '../components/sections/CurrentListTab'
import RecentActivity from '../components/sections/RecentActivity'
import supabase from '../config/SupabaseClient'
import { ensureUserProfile } from '../utils/ProfileHelper'
import { ListProgressProvider, useListProgress } from '../context/ListProgressContext'

/* ─── Font injection ── */
if (typeof document !== 'undefined' && !document.getElementById('flikd-fonts')) {
  const link = document.createElement('link')
  link.id   = 'flikd-fonts'
  link.rel  = 'stylesheet'
  link.href = 'https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&display=swap'
  document.head.appendChild(link)
}

const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY

/* ─── Skeleton ──────────────────────────────────────────────── */
const PostSkeleton = ({ delay = 0 }) => (
  <div className='px-5 py-5 border-b border-[#141414] animate-pulse' style={{ animationDelay: `${delay}ms` }}>
    <div className='flex items-start gap-3'>
      <div className='w-10 h-10 rounded-full bg-[#181818] flex-shrink-0' />
      <div className='flex-1 space-y-3'>
        <div className='flex gap-3'>
          <div className='h-3 w-24 bg-[#181818] rounded-full' />
          <div className='h-3 w-14 bg-[#141414] rounded-full' />
        </div>
        <div className='rounded-2xl bg-[#0F0F0F] border border-[#181818] overflow-hidden'>
          <div className='h-36 bg-[#141414]' />
          <div className='flex gap-4 p-4'>
            <div className='w-16 h-24 bg-[#181818] rounded-xl -mt-10 flex-shrink-0' />
            <div className='flex-1 space-y-2 pt-1'>
              <div className='h-4 w-3/4 bg-[#181818] rounded-lg' />
              <div className='h-3 w-1/3 bg-[#141414] rounded-full' />
            </div>
          </div>
        </div>
        <div className='space-y-1.5'>
          <div className='h-3 bg-[#141414] rounded-full w-full' />
          <div className='h-3 bg-[#141414] rounded-full w-4/5' />
        </div>
      </div>
    </div>
  </div>
)

/* ─── Bento stat tile ────────────────────────────────────────── */
const BentoStat = ({ icon, label, value, accent = false, wide = false }) => (
  <div className={`rounded-2xl border transition-all duration-200 cursor-default group
    hover:border-[#D4AF37]/25 hover:bg-[#0F0F0F]
    ${accent
      ? 'bg-[#D4AF37]/5 border-[#D4AF37]/20'
      : 'bg-[#0D0D0D] border-[#181818]'
    } ${wide ? 'col-span-2' : ''}`}
    style={{ padding: '14px 16px' }}>
    <div className='flex items-center gap-2 mb-2'>
      <span className='text-sm'>{icon}</span>
      <p className='text-[9px] font-black text-white/25 uppercase tracking-[0.18em]'
        style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
        {label}
      </p>
    </div>
    <p className='leading-none'
      style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '28px', color: accent ? '#D4AF37' : '#fff', letterSpacing: '0.04em' }}>
      {value}
    </p>
  </div>
)

/* ─── Bento streak card ─────────────────────────────────────── */
const StreakCard = ({ streak }) => (
  <div className='rounded-2xl bg-gradient-to-br from-[#D4AF37]/10 to-[#D4AF37]/3
    border border-[#D4AF37]/20 flex items-center justify-between px-4 py-3.5
    hover:border-[#D4AF37]/35 transition-all duration-200 cursor-default'>
    <div>
      <p className='text-[9px] font-black text-[#D4AF37]/60 uppercase tracking-[0.18em] mb-1'
        style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
        Day Streak
      </p>
      <p style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '36px', color: '#D4AF37', letterSpacing: '0.04em', lineHeight: 1 }}>
        {streak}
      </p>
    </div>
    <div className='text-4xl' style={{ filter: 'drop-shadow(0 0 8px rgba(212,175,55,0.4))' }}>🔥</div>
  </div>
)

/* ─── Feed tab bar ───────────────────────────────────────────── */
const FEED_TABS = [
  { id: 'foryou',    label: 'For You',      icon: '✦' },
  { id: 'following', label: 'Following',    icon: '👥' },
  { id: 'new',       label: 'New Releases', icon: '🎬' },
]

/* ─── Inner home (needs list context) ──────────────────────────*/
const HomeInner = ({ currentUser, posts, postsLoading, userLists,
  recentActivities, handlePostCreate, handleListCreate,
  handleListItemAdd, handleMovieSearch, handleMovieDetails,
  mainRef, scrolled, showScrollTop }) => {

  const [feedTab, setFeedTab] = useState('foryou')
  const { lists, updateProgress } = useListProgress()

  // Merge external userLists with context lists (context is source of truth after first load)
  const displayLists = lists.length > 0 ? lists : userLists

  return (
    <div className='flex gap-0 xl:gap-6 2xl:gap-8 px-0 xl:px-4 2xl:px-6'>

      {/* ══════════ MAIN FEED ══════════ */}
      <div className='flex-1 min-w-0 border-x border-[#151515] relative'>

        {/* ── Sticky header ── */}
        <div className={`sticky top-0 z-40 transition-all duration-300
          ${scrolled
            ? 'bg-[#0A0A0A]/96 backdrop-blur-xl border-b border-[#1A1A1A] shadow-[0_8px_32px_rgba(0,0,0,.6)]'
            : 'bg-[#0A0A0A] border-b border-[#141414]'
          }`}>
          {scrolled && (
            <div className='absolute inset-x-0 bottom-0 h-px'
              style={{ background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.15) 50%, transparent)' }} />
          )}
          <div className='px-5 pt-4 pb-2 flex items-center justify-between'>
            <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '26px', letterSpacing: '0.1em', color: '#fff' }}>
              HOME
            </h1>
            {currentUser && (
              <div className='flex items-center gap-2'>
                <div className='flex items-center gap-1.5 px-3 py-1.5 bg-[#141414] border border-[#222] rounded-full
                  hover:border-[#D4AF37]/25 transition-colors duration-200'>
                  <svg className='w-3 h-3 text-[#D4AF37]' fill='currentColor' viewBox='0 0 20 20'>
                    <path d='M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z' />
                  </svg>
                  <span className='font-bold text-white text-[13px] tabular-nums'
                    style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.04em' }}>
                    {currentUser.totalPoints.toLocaleString()}
                  </span>
                </div>
                <div className='px-3 py-1.5 rounded-full text-[#0A0A0A] font-black text-[12px]'
                  style={{ background: 'linear-gradient(135deg, #D4AF37, #F0C93A)', fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.08em' }}>
                  LVL {currentUser.level}
                </div>
              </div>
            )}
          </div>
          <div className='flex px-3 pb-0 gap-0 border-t border-[#111]'>
            {FEED_TABS.map(tab => (
              <button key={tab.id} onClick={() => setFeedTab(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-3 text-[11px] font-bold border-b-2 -mb-px
                  transition-all duration-200 whitespace-nowrap
                  ${feedTab === tab.id
                    ? 'text-[#D4AF37] border-[#D4AF37]'
                    : 'text-white/30 border-transparent hover:text-white/60 hover:border-white/10'
                  }`}
                style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.08em', fontSize: '12px' }}>
                <span style={{ transition: 'transform .2s', transform: feedTab === tab.id ? 'scale(1.2)' : 'scale(1)' }}>
                  {tab.icon}
                </span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Create Post ── */}
        <div className='border-b border-[#141414]'>
          <CreatePost
            currentUser={currentUser}
            onPostCreate={handlePostCreate}
            onListCreate={handleListCreate}
            onListItemAdd={handleListItemAdd}
            onMovieSearch={handleMovieSearch}
            onMovieDetails={handleMovieDetails}
            userLists={displayLists}
          />
        </div>

        {/* ── Feed ── */}
        <div className='pb-32'>
          {postsLoading
            ? [0, 1, 2].map(i => <PostSkeleton key={i} delay={i * 80} />)
            : posts.length > 0
              ? posts.map((post, index) => (
                  <Post
                    key={post.id}
                    post={post}
                    currentUserId={currentUser?.id}
                    onUserClick={(u) => console.log('User clicked:', u)}
                    style={{ animation: `postReveal .4s ease-out ${Math.min(index * 0.045, 0.5)}s both` }}
                  />
                ))
              : (
                <div className='flex flex-col items-center justify-center py-28 px-8'>
                  <div className='relative w-20 h-20 mb-8'>
                    <div className='w-20 h-20 rounded-full border-2 border-[#1E1E1E] flex items-center justify-center'
                      style={{ background: 'radial-gradient(circle, rgba(212,175,55,0.05), transparent)' }}>
                      <svg className='w-9 h-9 text-[#D4AF37]/20' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={1.2}
                          d='M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z' />
                      </svg>
                    </div>
                    <div className='absolute inset-0 rounded-full border border-[#D4AF37]/10 animate-ping'
                      style={{ animationDuration: '3s' }} />
                  </div>
                  <h3 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '24px', letterSpacing: '0.1em', color: '#fff', marginBottom: '10px' }}>
                    NO REVIEWS YET
                  </h3>
                  <p style={{ fontFamily: "'DM Sans', sans-serif", color: 'rgba(255,255,255,0.3)', fontSize: '14px', textAlign: 'center', maxWidth: '260px', lineHeight: '1.6' }}>
                    Be the first to share your thoughts on a film or series.
                  </p>
                </div>
              )
          }
        </div>

        {/* Scroll to top */}
        {showScrollTop && (
          <button
            onClick={() => mainRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}
            className='fixed bottom-8 right-8 z-50 flex items-center gap-2 px-4 py-2.5 rounded-full
              border border-[#D4AF37]/30 shadow-2xl shadow-black/60
              hover:border-[#D4AF37]/60 hover:scale-105 active:scale-95 transition-all duration-200'
            style={{ background: 'linear-gradient(135deg, #0E0E0E, #141414)', animation: 'scrollTopIn .2s ease-out' }}>
            <svg className='w-3.5 h-3.5 text-[#D4AF37]' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M5 10l7-7m0 0l7 7m-7-7v18' />
            </svg>
            <span className='text-[#D4AF37] text-[11px] font-black'
              style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.08em' }}>
              TOP
            </span>
          </button>
        )}
      </div>

      {/* ══════════ BENTO SIDEBAR ══════════ */}
      <aside className='hidden xl:flex flex-col w-72 2xl:w-80 flex-shrink-0
        sticky top-0 h-screen overflow-y-auto py-4 space-y-3 pr-1'
        style={{ scrollbarWidth: 'none' }}>

        {/* ── Bento profile card ── */}
        {currentUser && (
          <div className='rounded-2xl border border-[#181818] bg-[#0D0D0D] overflow-hidden'>
            <div className='h-[3px]'
              style={{ background: 'linear-gradient(90deg, transparent, #D4AF37 30%, #F0C93A 50%, #D4AF37 70%, transparent)' }} />
            <div className='p-4'>
              <div className='flex items-center gap-3 mb-4'>
                <div className='w-10 h-10 rounded-full overflow-hidden ring-2 ring-[#D4AF37]/20 flex-shrink-0'>
                  {currentUser.avatar
                    ? <img src={currentUser.avatar} alt={currentUser.displayName} className='w-full h-full object-cover' />
                    : <div className='w-full h-full flex items-center justify-center text-[#0A0A0A] font-black'
                        style={{ background: 'linear-gradient(135deg, #D4AF37, #F0C93A)', fontFamily: "'Bebas Neue', sans-serif", fontSize: '15px' }}>
                        {currentUser.displayName?.[0]?.toUpperCase() || 'U'}
                      </div>
                  }
                </div>
                <div className='flex-1 min-w-0'>
                  <p className='text-white font-semibold text-[13px] truncate'>{currentUser.displayName}</p>
                  {currentUser.username && (
                    <p className='text-[11px] text-white/30'>@{currentUser.username}</p>
                  )}
                </div>
                <div className='px-2 py-1 rounded-full flex-shrink-0 text-[#0A0A0A] font-black text-[10px]'
                  style={{ background: 'linear-gradient(135deg, #D4AF37, #F0C93A)', fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.08em' }}>
                  LVL {currentUser.level}
                </div>
              </div>

              {/* Bento stat grid */}
              <div className='grid grid-cols-2 gap-2'>
                <BentoStat icon='🎬' label='Watched' value={currentUser.watchedCount || 0} accent />
                <BentoStat icon='✍️' label='Reviews'
                  value={currentUser.reviewCount || posts?.filter(p => p.userId === currentUser.id).length || 0} />
                <StreakCard streak={currentUser.streak || 0} />
                <BentoStat icon='📋' label='Lists' value={displayLists.length} />
              </div>

              {/* XP bar */}
              <div className='mt-3 pt-3 border-t border-[#1A1A1A]'>
                <div className='flex justify-between items-center mb-1.5'>
                  <span className='text-[9px] font-black text-white/25 uppercase tracking-widest'
                    style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
                    XP Progress
                  </span>
                  <span className='text-[11px] font-black text-[#D4AF37]'
                    style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
                    {(currentUser.totalPoints % 500)}/500
                  </span>
                </div>
                <div className='h-1.5 bg-[#141414] rounded-full overflow-hidden'>
                  <div className='h-full rounded-full transition-all duration-1000'
                    style={{
                      width: `${((currentUser.totalPoints % 500) / 500) * 100}%`,
                      background: 'linear-gradient(90deg, #D4AF37, #F0C93A)',
                    }} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Lists (synced via context) ── */}
        <CurrentListTab
          lists={displayLists}
          userId={currentUser?.id}
          onListClick={(list) => console.log('List:', list)}
          onViewAll={() => console.log('View all')}
          onCountChange={updateProgress}
        />

        {/* ── Recent activity ── */}
        <RecentActivity
          activities={recentActivities}
          onActivityClick={(a) => console.log('Activity:', a)}
        />
      </aside>
    </div>
  )
}

/* ─── Home ───────────────────────────────────────────────────── */
const Home = () => {
  const [currentUser,      setCurrentUser]      = useState(null)
  const [posts,            setPosts]            = useState([])
  const [userLists,        setUserLists]        = useState([])
  const [recentActivities, setRecentActivities] = useState([])
  const [loading,          setLoading]          = useState(true)
  const [postsLoading,     setPostsLoading]     = useState(true)
  const [error,            setError]            = useState(null)
  const [scrolled,         setScrolled]         = useState(false)
  const [showScrollTop,    setShowScrollTop]    = useState(false)
  const mainRef = useRef(null)

  useEffect(() => {
    const el = mainRef.current
    if (!el) return
    const onScroll = () => {
      setScrolled(el.scrollTop > 20)
      setShowScrollTop(el.scrollTop > 600)
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [])

  /* ── User ── */
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError) throw authError
        if (user) {
          const profile = await ensureUserProfile(user)
          if (profile) {
            setCurrentUser({
              id:           user.id,
              username:     profile.username,
              displayName:  profile.display_name,
              email:        user.email,
              avatar:       profile.avatar_url,
              bio:          profile.bio,
              totalPoints:  profile.total_points  || 0,
              level:        profile.level         || 1,
              watchedCount: profile.watched_count || 0,
              reviewCount:  profile.review_count  || 0,
              streak:       profile.streak_days   || 0,
            })
          }
        }
      } catch (err) {
        console.error('Error fetching user:', err)
        setError('Failed to load user data. Please refresh.')
      } finally {
        setLoading(false)
      }
    }
    fetchUser()
  }, [])

  /* ── Posts ── */
  useEffect(() => {
    const fetchPosts = async () => {
      if (!currentUser) return
      setPostsLoading(true)
      try {
        const { data, error } = await supabase
          .from('posts')
          .select(`*, profiles:user_id(id, username, display_name, avatar_url, level)`)
          .order('created_at', { ascending: false })
          .limit(50)
        if (error) throw error

        // Fetch which posts the current user liked/disliked
        const postIds = (data || []).map(p => p.id)
        const [likesRes, dislikesRes] = await Promise.allSettled([
          supabase.from('post_likes').select('post_id').eq('user_id', currentUser.id).in('post_id', postIds),
          supabase.from('post_dislikes').select('post_id').eq('user_id', currentUser.id).in('post_id', postIds),
        ])
        const likedSet    = new Set((likesRes.value?.data    || []).map(r => r.post_id))
        const dislikedSet = new Set((dislikesRes.value?.data || []).map(r => r.post_id))

        setPosts((data || []).map(post => ({
          id:       post.id,
          userId:   post.user_id,
          user: {
            id:          post.profiles?.id || post.user_id,
            username:    post.profiles?.username    || 'unknown',
            displayName: post.profiles?.display_name || 'User',
            avatar:      post.profiles?.avatar_url   || null,
            level:       post.profiles?.level        || 1,
          },
          movie: {
            id:                  post.tmdb_id,
            title:               post.title,
            posterPath:          post.poster_path,
            backdropPath:        post.backdrop_path          || null,
            mediaType:           post.media_type             || 'movie',
            overview:            post.overview               || null,
            genres:              post.genres                 || [],
            runtime:             post.runtime                || null,
            releaseDate:         post.release_date           || null,
            year:                post.year                   || null,
            voteAverage:         post.vote_average           || null,
            director:            post.director               || null,
            cast:                post.cast_members           || [],
            originalLanguage:    post.original_language      || null,
          },
          content:      post.content,
          rating:       post.rating,
          timestamp:    post.created_at,
          likes:        post.likes_count    || 0,
          dislikes:     post.dislikes_count || 0,
          reposts:      post.reposts_count  || 0,
          comments:     post.comments_count || 0,
          userLiked:    likedSet.has(post.id),
          userDisliked: dislikedSet.has(post.id),
          userReposted: false,
          type:         'review',
        })))
      } catch (err) {
        console.error('Error fetching posts:', err)
      } finally {
        setPostsLoading(false)
      }
    }
    fetchPosts()
  }, [currentUser])

  /* ── Lists (for context seed) ── */
  useEffect(() => {
    const fetchUserLists = async () => {
      if (!currentUser) return
      try {
        const { data, error } = await supabase
          .rpc('get_user_lists_with_counts', { target_user_id: currentUser.id })
        if (error) throw error
        setUserLists((data || []).map(l => ({
          id:             l.list_id,
          name:           l.name,
          description:    l.description,
          isPublic:       l.is_public,
          itemCount:      Number(l.item_count)      || 0,
          completedCount: Number(l.completed_count) || 0,
        })))
      } catch {
        const { data: listsData } = await supabase
          .from('lists').select('*, list_items(id, is_completed)')
          .eq('user_id', currentUser.id).is('deleted_at', null)
          .order('updated_at', { ascending: false })
        setUserLists((listsData || []).map(list => ({
          id:             list.id,
          name:           list.name,
          description:    list.description,
          isPublic:       list.is_public,
          itemCount:      list.list_items?.length || 0,
          completedCount: list.list_items?.filter(i => i.is_completed).length || 0,
        })))
      }
    }
    fetchUserLists()
  }, [currentUser])

  /* ── Activities ── */
  useEffect(() => {
    const fetchActivities = async () => {
      if (!currentUser) return
      try {
        const { data, error } = await supabase
          .from('activities')
          .select('*, profiles:user_id(username, display_name, avatar_url)')
          .order('created_at', { ascending: false })
          .limit(10)
        if (error) throw error
        setRecentActivities((data || []).map(a => ({
          id: a.id, type: a.activity_type,
          user: {
            id: a.user_id, username: a.profiles?.username || 'unknown',
            displayName: a.profiles?.display_name || 'User', avatar: a.profiles?.avatar_url || null,
          },
          data: a.activity_data, timestamp: a.created_at,
        })))
      } catch (err) {
        console.error('Error fetching activities:', err)
      }
    }
    fetchActivities()
  }, [currentUser])

  /* ── Handlers ── */
  const handlePostCreate = useCallback(async (postData) => {
    try {
      const safeRating = Math.min(parseFloat(postData.rating) || 0, 9.9)
      const { data, error } = await supabase.from('posts').insert({
        user_id:           currentUser.id,
        tmdb_id:           postData.movie.id,
        media_type:        postData.movie.mediaType   || 'movie',
        title:             postData.movie.title,
        poster_path:       postData.movie.posterPath  || null,
        content:           postData.content.trim(),
        rating:            safeRating,
        backdrop_path:     postData.movie.backdropPath || null,
        overview:          postData.movie.overview    || null,
        genres:            postData.movie.genres      || [],
        runtime:           postData.movie.runtime     || null,
        release_date:      postData.movie.releaseDate || null,
        year:              postData.movie.year        || null,
        vote_average:      postData.movie.voteAverage || null,
        director:          postData.movie.director    || null,
        cast_members:      postData.movie.cast        || [],
        original_language: postData.movie.originalLanguage || null,
      }).select().single()
      if (error) throw error

      await Promise.allSettled([
        supabase.from('points_transactions').insert({
          user_id: currentUser.id, points: 10, reason: 'Created a review',
          reference_type: 'post', reference_id: data.id,
        }),
        supabase.from('activities').insert({
          user_id: currentUser.id, activity_type: 'review_posted',
          activity_data: { post_id: data.id, movie_title: postData.movie.title, rating: postData.rating },
        }),
      ])

      setPosts(prev => [{
        id: data.id, userId: currentUser.id,
        user: { id: currentUser.id, username: currentUser.username, displayName: currentUser.displayName, avatar: currentUser.avatar, level: currentUser.level },
        movie: postData.movie,
        content: data.content, rating: data.rating, timestamp: data.created_at,
        likes: 0, dislikes: 0, reposts: 0, comments: 0,
        userLiked: false, userDisliked: false, userReposted: false, type: 'review',
      }, ...prev])
      setCurrentUser(prev => ({ ...prev, totalPoints: prev.totalPoints + 10 }))
      return { success: true }
    } catch (err) {
      console.error('Error creating post:', err)
      return { success: false, error: err.message }
    }
  }, [currentUser])

  const handleListCreate = useCallback(async (listData) => {
    try {
      const { data: list, error: listError } = await supabase
        .from('lists').insert({
          user_id: currentUser.id, name: listData.name,
          description: listData.description || null, is_public: listData.isPublic, is_collaborative: listData.isCollaborative,
        }).select().single()
      if (listError) throw listError
      if (listData.movies?.length) {
        const { error: itemsError } = await supabase.from('list_items').insert(
          listData.movies.map((m, i) => ({ list_id: list.id, tmdb_id: m.id, media_type: m.mediaType || 'movie', title: m.title, poster_path: m.posterPath, position: i, added_by: currentUser.id }))
        )
        if (itemsError) throw itemsError
      }
      await supabase.from('activities').insert({ user_id: currentUser.id, activity_type: 'list_created', activity_data: { list_id: list.id, list_name: listData.name, movie_count: listData.movies.length } })
      setUserLists(prev => [...prev, { id: list.id, name: list.name, description: list.description, isPublic: list.is_public, itemCount: listData.movies.length, completedCount: 0 }])
      return { success: true }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }, [currentUser])

  const handleListItemAdd = useCallback(async (data) => {
    try {
      const { error } = await supabase.from('list_items').insert({ list_id: data.listId, tmdb_id: data.movie.id, media_type: data.movie.mediaType || 'movie', title: data.movie.title, poster_path: data.movie.posterPath, added_by: currentUser.id })
      if (error) throw error
      setUserLists(prev => prev.map(l => l.id === data.listId ? { ...l, itemCount: l.itemCount + 1 } : l))
      return { success: true }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }, [currentUser])

  const handleMovieSearch = useCallback(async (query) => {
    if (!query?.trim() || !TMDB_API_KEY) return []
    try {
      const res = await fetch(`https://api.themoviedb.org/3/search/multi?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query.trim())}&include_adult=false&language=en-US&page=1`)
      if (!res.ok) return []
      const data = await res.json()
      return (data.results || [])
        .filter(i => i.media_type === 'movie' || i.media_type === 'tv')
        .slice(0, 10)
        .map(i => ({ id: i.id, title: i.title || i.name, year: i.release_date?.split('-')[0] || i.first_air_date?.split('-')[0] || 'N/A', mediaType: i.media_type, posterPath: i.poster_path, backdropPath: i.backdrop_path || null, overview: i.overview || null, voteAverage: i.vote_average || null, originalLanguage: i.original_language || null }))
    } catch { return [] }
  }, [])

  const handleMovieDetails = useCallback(async (movie) => {
    if (!TMDB_API_KEY) return movie
    try {
      const ep = movie.mediaType === 'tv'
        ? `https://api.themoviedb.org/3/tv/${movie.id}?api_key=${TMDB_API_KEY}&append_to_response=credits`
        : `https://api.themoviedb.org/3/movie/${movie.id}?api_key=${TMDB_API_KEY}&append_to_response=credits`
      const res = await fetch(ep)
      if (!res.ok) return movie
      const data = await res.json()
      return {
        ...movie,
        backdropPath:        data.backdrop_path || movie.backdropPath,
        overview:            data.overview      || movie.overview,
        runtime:             data.runtime || data.episode_run_time?.[0] || null,
        releaseDate:         data.release_date || data.first_air_date || null,
        voteAverage:         data.vote_average || movie.voteAverage,
        director:            movie.mediaType === 'tv' ? data.created_by?.[0]?.name : data.credits?.crew?.find(c => c.job === 'Director')?.name || null,
        cast:                data.credits?.cast?.slice(0, 8).map(c => c.name) || [],
        genres:              data.genres?.map(g => g.name)                   || [],
        originalLanguage:    data.original_language || movie.originalLanguage,
        status:              data.status || null,
        productionCompanies: data.production_companies?.slice(0, 3).map(c => c.name) || [],
      }
    } catch { return movie }
  }, [])

  /* ── Loading screen ── */
  if (loading) {
    return (
      <div className='min-h-screen bg-[#0A0A0A] flex items-center justify-center'>
        <div className='text-center'>
          <div className='relative w-16 h-16 mx-auto mb-4'>
            <svg className='animate-spin w-16 h-16 text-[#D4AF37]/20' fill='none' viewBox='0 0 24 24'>
              <circle cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='1.5' />
            </svg>
            <svg className='animate-spin w-16 h-16 text-[#D4AF37] absolute inset-0' fill='none' viewBox='0 0 24 24' style={{ animationDuration: '1.2s' }}>
              <path fill='currentColor' d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z' opacity='.8' />
            </svg>
          </div>
          <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '24px', letterSpacing: '0.12em', color: '#D4AF37' }}>
            LOADING FLIK'D
          </h2>
          <p style={{ fontFamily: "'DM Sans', sans-serif", color: 'rgba(255,255,255,0.25)', fontSize: '12px', marginTop: '4px' }}>
            Curating your cinema feed…
          </p>
        </div>
      </div>
    )
  }

  if (error && !currentUser) {
    return (
      <div className='min-h-screen bg-[#0A0A0A] flex items-center justify-center p-4'>
        <div className='text-center'>
          <p style={{ fontFamily: "'DM Sans', sans-serif", color: 'rgba(255,255,255,0.45)', fontSize: '14px', marginBottom: '20px' }}>{error}</p>
          <button onClick={() => window.location.reload()}
            className='px-6 py-2.5 rounded-full text-[#0A0A0A] font-bold'
            style={{ background: 'linear-gradient(135deg, #D4AF37, #F0C93A)', fontFamily: "'Bebas Neue', sans-serif", fontSize: '14px', letterSpacing: '0.08em' }}>
            RETRY
          </button>
        </div>
      </div>
    )
  }

  return (
    <ListProgressProvider userId={currentUser?.id}>
      <div className='min-h-screen bg-[#0A0A0A]' style={{ fontFamily: "'DM Sans', sans-serif" }}>
        <Navbar currentUser={currentUser} />
        <main ref={mainRef} className='ml-20 lg:ml-72 h-screen overflow-y-auto'
          style={{ scrollbarWidth: 'thin', scrollbarColor: '#1A1A1A transparent' }}>
          <HomeInner
            currentUser={currentUser}
            posts={posts}
            postsLoading={postsLoading}
            userLists={userLists}
            recentActivities={recentActivities}
            handlePostCreate={handlePostCreate}
            handleListCreate={handleListCreate}
            handleListItemAdd={handleListItemAdd}
            handleMovieSearch={handleMovieSearch}
            handleMovieDetails={handleMovieDetails}
            mainRef={mainRef}
            scrolled={scrolled}
            showScrollTop={showScrollTop}
          />
        </main>

        <style>{`
          @keyframes postReveal   { from { opacity:0; transform:translateY(14px) } to { opacity:1; transform:translateY(0) } }
          @keyframes scrollTopIn  { from { opacity:0; transform:translateY(8px)  } to { opacity:1; transform:translateY(0) } }
        `}</style>
      </div>
    </ListProgressProvider>
  )
}

export default Home