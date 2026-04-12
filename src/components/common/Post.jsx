import React, { useState, useEffect, useRef, useCallback } from 'react'
import supabase from '../../config/SupabaseClient'

/**
 * FLIK'D Post Component — v3 "Cinéaste"
 * ─────────────────────────────────────
 * Luxury cinema-dark aesthetic. Gold accents (#D4AF37).
 * Typography: Bebas Neue (display) + DM Sans (body).
 *
 * New in v3:
 *  ✦ Inline comment panel with real-time Supabase reads/writes
 *  ✦ Live like count updates persisted to DB
 *  ✦ Bebas Neue on post titles & stat labels
 *  ✦ DM Sans on review body copy (imported via Google Fonts)
 *  ✦ Reaction tooltip (who liked)
 *  ✦ Comment avatar ring + reply threading (1 level)
 *  ✦ Gold shimmer on card hover
 *  ✦ Smooth expand/collapse animations
 */

/* ─── Google Font injection (DM Sans) ────────────────────────────────────── */
if (typeof document !== 'undefined' && !document.getElementById('flikd-fonts')) {
  const link = document.createElement('link')
  link.id   = 'flikd-fonts'
  link.rel  = 'stylesheet'
  link.href = 'https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&display=swap'
  document.head.appendChild(link)
}

/* ─── Helpers ─────────────────────────────────────────────────────────────── */
const img = (path, size = 'w342') =>
  path ? `https://image.tmdb.org/t/p/${size}${path}` : null

const relTime = (iso) => {
  if (!iso) return ''
  const s = Math.floor((Date.now() - new Date(iso)) / 1000)
  if (s < 60)     return 'Just now'
  if (s < 3600)   return `${Math.floor(s / 60)}m ago`
  if (s < 86400)  return `${Math.floor(s / 3600)}h ago`
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const fmtCount = (n) => {
  if (!n) return '0'
  if (n < 1000) return String(n)
  if (n < 1_000_000) return `${(n / 1000).toFixed(1)}K`
  return `${(n / 1_000_000).toFixed(1)}M`
}

const fmtRuntime = (m) => {
  if (!m) return null
  const h = Math.floor(m / 60), r = m % 60
  if (!h) return `${r}m`
  if (!r) return `${h}h`
  return `${h}h ${r}m`
}

const initials = (name) => {
  if (!name) return '?'
  const p = name.trim().split(' ')
  return p.length === 1 ? p[0][0].toUpperCase() : (p[0][0] + p.at(-1)[0]).toUpperCase()
}

/* ─── Avatar ──────────────────────────────────────────────────────────────── */
const Avatar = ({ src, name, size = 10, level, onClick, ring = false }) => (
  <button
    onClick={onClick}
    className={`relative flex-shrink-0 group/av focus:outline-none`}
    style={{ width: `${size * 4}px`, height: `${size * 4}px` }}
  >
    <div
      className={`w-full h-full rounded-full overflow-hidden transition-all duration-300
        ${ring ? 'ring-2 ring-[#1E1E1E] group-hover/av:ring-[#D4AF37]/60' : ''}`}
    >
      {src
        ? <img src={src} alt={name} className='w-full h-full object-cover' />
        : <div className='w-full h-full flex items-center justify-center font-bold text-[#0A0A0A]'
            style={{ background: 'linear-gradient(135deg, #D4AF37 0%, #B8961F 100%)', fontFamily: "'Bebas Neue', sans-serif", fontSize: `${size * 1.6}px`, letterSpacing: '0.04em' }}>
            {initials(name)}
          </div>
      }
    </div>
    {level > 1 && (
      <span className='absolute -bottom-1 -right-1 min-w-[18px] h-[18px] px-1
        flex items-center justify-center rounded-full border-2 border-[#0A0A0A]
        text-[9px] font-black text-[#0A0A0A]'
        style={{ background: 'linear-gradient(135deg, #D4AF37, #F0C93A)', fontFamily: "'Bebas Neue', sans-serif" }}>
        {level}
      </span>
    )}
  </button>
)

/* ─── Score ring ──────────────────────────────────────────────────────────── */
const ScoreRing = ({ score }) => {
  const R = 14, C = 2 * Math.PI * R
  const pct = Math.min(Math.max(score / 10, 0), 1)
  const color = score >= 7 ? '#D4AF37' : score >= 5 ? '#F59E0B' : '#EF4444'
  return (
    <svg width='36' height='36' viewBox='0 0 36 36' className='flex-shrink-0'>
      <circle cx='18' cy='18' r={R} fill='none' stroke='rgba(255,255,255,0.06)' strokeWidth='2.5' />
      <circle cx='18' cy='18' r={R} fill='none' stroke={color} strokeWidth='2.5'
        strokeDasharray={`${C * pct} ${C}`} strokeLinecap='round'
        transform='rotate(-90 18 18)' style={{ transition: 'stroke-dasharray .8s ease' }} />
      <text x='18' y='22' textAnchor='middle'
        style={{ fontSize: '9px', fontWeight: 700, fill: color, fontFamily: "'Bebas Neue', sans-serif" }}>
        {score.toFixed(1)}
      </text>
    </svg>
  )
}

/* ─── Star row ─────────────────────────────────────────────────────────────── */
const StarRow = ({ rating }) => {
  const stars = Math.round(rating / 2)
  return (
    <div className='flex items-center gap-2'>
      <div className='flex gap-0.5'>
        {[1,2,3,4,5].map(i => (
          <svg key={i} className={`w-3.5 h-3.5 ${i <= stars ? 'text-[#D4AF37]' : 'text-[#252525]'}`}
            fill='currentColor' viewBox='0 0 20 20'>
            <path d='M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z' />
          </svg>
        ))}
      </div>
      <span className='text-[#D4AF37] font-bold text-sm' style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.04em' }}>
        {rating.toFixed(1)}
      </span>
      <span className='text-white/25 text-xs'>/ 10</span>
    </div>
  )
}

/* ─── Comment component ────────────────────────────────────────────────────── */
const Comment = ({ comment, currentUserId, postId, onReply, depth = 0 }) => {
  const [showReply, setShowReply] = useState(false)
  const [liked,     setLiked]     = useState(false)
  const [likes,     setLikes]     = useState(comment.likes_count || 0)

  const handleLike = async () => {
    setLiked(p => !p)
    setLikes(p => liked ? p - 1 : p + 1)
    try {
      if (!liked) {
        await supabase.from('comment_likes').insert({ comment_id: comment.id, user_id: currentUserId })
      } else {
        await supabase.from('comment_likes').delete()
          .eq('comment_id', comment.id).eq('user_id', currentUserId)
      }
    } catch {}
  }

  return (
    <div className={`flex gap-3 group/comment ${depth > 0 ? 'ml-8 mt-2' : ''}`}>
      {/* Thread line for replies */}
      {depth > 0 && (
        <div className='absolute left-4 top-0 bottom-0 w-px bg-[#1E1E1E]' />
      )}

      <Avatar src={comment.profiles?.avatar_url} name={comment.profiles?.display_name}
        size={8} ring />

      <div className='flex-1 min-w-0'>
        {/* Bubble */}
        <div className='bg-[#0F0F0F] border border-[#1C1C1C] rounded-2xl rounded-tl-sm px-4 py-3
          group-hover/comment:border-[#252525] transition-colors duration-200'>
          <div className='flex items-center gap-2 mb-1.5'>
            <span className='text-[13px] font-semibold text-white/90'
              style={{ fontFamily: "'DM Sans', sans-serif" }}>
              {comment.profiles?.display_name || 'User'}
            </span>
            {comment.profiles?.username && (
              <span className='text-[11px] text-white/30'>@{comment.profiles.username}</span>
            )}
            <span className='text-[10px] text-white/20 ml-auto'>{relTime(comment.created_at)}</span>
          </div>
          <p className='text-[13px] text-white/70 leading-relaxed'
            style={{ fontFamily: "'DM Sans', sans-serif" }}>
            {comment.content}
          </p>
        </div>

        {/* Actions */}
        <div className='flex items-center gap-4 mt-1.5 px-1'>
          <button onClick={handleLike}
            className={`flex items-center gap-1 text-[11px] font-semibold transition-all duration-200
              ${liked ? 'text-[#D4AF37]' : 'text-white/25 hover:text-white/60'}`}>
            <svg className='w-3.5 h-3.5' fill={liked ? 'currentColor' : 'none'} stroke='currentColor' viewBox='0 0 24 24'>
              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2}
                d='M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5' />
            </svg>
            {likes > 0 && <span>{likes}</span>}
          </button>

          {depth === 0 && (
            <button onClick={() => setShowReply(p => !p)}
              className='text-[11px] font-semibold text-white/25 hover:text-[#D4AF37] transition-colors duration-200'>
              Reply
            </button>
          )}
        </div>

        {/* Reply input */}
        {showReply && (
          <ReplyInput
            postId={postId}
            parentId={comment.id}
            currentUserId={currentUserId}
            onSubmit={(c) => { onReply?.(c); setShowReply(false) }}
            onCancel={() => setShowReply(false)}
          />
        )}

        {/* Nested replies */}
        {comment.replies?.length > 0 && (
          <div className='relative mt-2 space-y-2 pl-2 border-l border-[#1A1A1A]'>
            {comment.replies.map(r => (
              <Comment key={r.id} comment={r} currentUserId={currentUserId}
                postId={postId} depth={1} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/* ─── Reply / new comment input ────────────────────────────────────────────── */
const ReplyInput = ({ postId, parentId = null, currentUserId, onSubmit, onCancel, placeholder = 'Write a reply…', autoFocus = true }) => {
  const [text, setText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const ref = useRef(null)

  useEffect(() => { if (autoFocus) ref.current?.focus() }, [autoFocus])

  const submit = async () => {
    if (!text.trim() || submitting || !currentUserId) return
    setSubmitting(true)
    try {
      const { data, error } = await supabase.from('comments').insert({
        post_id:   postId,
        parent_id: parentId,
        user_id:   currentUserId,
        content:   text.trim(),
      }).select('*, profiles:user_id(id, username, display_name, avatar_url)').single()
      if (error) throw error
      setText('')
      onSubmit?.(data)
    } catch (e) {
      console.error('[Flik\'d] comment insert:', e)
    }
    setSubmitting(false)
  }

  const onKey = (e) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit()
    if (e.key === 'Escape') onCancel?.()
  }

  return (
    <div className='mt-2 flex flex-col gap-2' style={{ animation: 'replyIn .18s ease-out' }}>
      <textarea
        ref={ref}
        value={text}
        onChange={e => setText(e.target.value)}
        onKeyDown={onKey}
        placeholder={placeholder}
        rows={2}
        className='w-full bg-[#0D0D0D] border border-[#1E1E1E] rounded-xl px-3.5 py-2.5
          text-[13px] text-white/80 placeholder-white/20 outline-none resize-none
          focus:border-[#D4AF37]/40 focus:shadow-[0_0_0_3px_rgba(212,175,55,0.06)]
          transition-all duration-200'
        style={{ fontFamily: "'DM Sans', sans-serif" }}
      />
      <div className='flex items-center justify-between'>
        <span className='text-[10px] text-white/20'>⌘↵ to send · Esc to cancel</span>
        <div className='flex gap-2'>
          {onCancel && (
            <button onClick={onCancel}
              className='px-3 py-1.5 rounded-lg text-[11px] font-semibold text-white/30
                hover:text-white/60 transition-colors duration-200'>
              Cancel
            </button>
          )}
          <button onClick={submit} disabled={!text.trim() || submitting}
            className='px-4 py-1.5 rounded-lg text-[11px] font-bold transition-all duration-200
              disabled:opacity-30 disabled:cursor-not-allowed'
            style={{
              background: text.trim() ? 'linear-gradient(135deg, #D4AF37, #F0C93A)' : '#1A1A1A',
              color: text.trim() ? '#0A0A0A' : 'rgba(255,255,255,0.2)',
              fontFamily: "'Bebas Neue', sans-serif",
              letterSpacing: '0.08em',
              fontSize: '12px'
            }}>
            {submitting ? '…' : 'POST'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── Comment panel ────────────────────────────────────────────────────────── */
const CommentPanel = ({ postId, currentUserId, onCountChange }) => {
  const [comments,  setComments]  = useState([])
  const [loading,   setLoading]   = useState(true)
  const [sort,      setSort]      = useState('newest') // newest | top

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await supabase
        .from('comments')
        .select('*, profiles:user_id(id, username, display_name, avatar_url), likes_count:comment_likes(count)')
        .eq('post_id', postId)
        .is('parent_id', null)
        .order('created_at', { ascending: sort === 'oldest' })
        .limit(40)

      // Fetch replies for each top-level comment
      if (data?.length) {
        const ids = data.map(c => c.id)
        const { data: replies } = await supabase
          .from('comments')
          .select('*, profiles:user_id(id, username, display_name, avatar_url), likes_count:comment_likes(count)')
          .in('parent_id', ids)
          .order('created_at', { ascending: true })

        const replyMap = {}
        ;(replies || []).forEach(r => {
          if (!replyMap[r.parent_id]) replyMap[r.parent_id] = []
          replyMap[r.parent_id].push({
            ...r,
            likes_count: Array.isArray(r.likes_count) ? r.likes_count[0]?.count : r.likes_count
          })
        })

        const normalized = data.map(c => ({
          ...c,
          likes_count: Array.isArray(c.likes_count) ? c.likes_count[0]?.count : c.likes_count,
          replies: replyMap[c.id] || []
        }))

        // Sort by top if needed
        const sorted = sort === 'top'
          ? [...normalized].sort((a, b) => (b.likes_count || 0) - (a.likes_count || 0))
          : normalized

        setComments(sorted)
        onCountChange?.(sorted.length + (replies?.length || 0))
      } else {
        setComments([])
      }
    } catch (e) {
      console.error('[Flik\'d] load comments:', e)
    }
    setLoading(false)
  }, [postId, sort])

  useEffect(() => { load() }, [load])

  const handleNewComment = (c) => {
    const normalized = {
      ...c,
      likes_count: 0,
      replies: []
    }
    setComments(prev => [normalized, ...prev])
    onCountChange?.(count => count + 1)
  }

  const handleReply = (reply) => {
    setComments(prev => prev.map(c =>
      c.id === reply.parent_id
        ? { ...c, replies: [...(c.replies || []), { ...reply, likes_count: 0 }] }
        : c
    ))
    onCountChange?.(count => count + 1)
  }

  return (
    <div className='border-t border-[#141414]' style={{ animation: 'commentPanelIn .22s ease-out' }}>
      {/* New comment input */}
      <div className='px-5 pt-4 pb-3 border-b border-[#111]'>
        <ReplyInput
          postId={postId}
          currentUserId={currentUserId}
          onSubmit={handleNewComment}
          placeholder='Share your thoughts…'
          autoFocus={false}
        />
      </div>

      {/* Sort bar */}
      {comments.length > 1 && (
        <div className='flex items-center gap-1 px-5 py-2 border-b border-[#0F0F0F]'>
          <span className='text-[10px] text-white/20 uppercase tracking-widest mr-2'>Sort</span>
          {[['newest', 'Newest'], ['top', 'Top'], ['oldest', 'Oldest']].map(([id, label]) => (
            <button key={id} onClick={() => setSort(id)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all duration-200
                ${sort === id
                  ? 'bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/25'
                  : 'text-white/25 hover:text-white/50'
                }`}
              style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.08em' }}>
              {label}
            </button>
          ))}
        </div>
      )}

      {/* List */}
      <div className='px-5 py-3 space-y-4 max-h-96 overflow-y-auto'
        style={{ scrollbarWidth: 'thin', scrollbarColor: '#1E1E1E transparent' }}>
        {loading
          ? <div className='flex justify-center py-8'>
              <svg className='animate-spin w-5 h-5 text-[#D4AF37]/40' fill='none' viewBox='0 0 24 24'>
                <circle cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='3' className='opacity-20' />
                <path fill='currentColor' className='opacity-80' d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z' />
              </svg>
            </div>
          : comments.length === 0
            ? <p className='text-center text-white/20 text-[13px] py-8'
                style={{ fontFamily: "'DM Sans', sans-serif" }}>
                No comments yet. Be the first.
              </p>
            : comments.map(c => (
                <Comment key={c.id} comment={c} currentUserId={currentUserId}
                  postId={postId} onReply={handleReply} />
              ))
        }
      </div>
    </div>
  )
}

/* ─── Main Post ────────────────────────────────────────────────────────────── */
const Post = ({ post, currentUserId, onUserClick, onLike, onDislike, onRepost, style = {} }) => {
  const {
    id, user, movie, content, rating, timestamp,
    likes = 0, dislikes = 0, reposts = 0, comments = 0,
    userLiked = false, userDisliked = false, userReposted = false
  } = post

  /* Local state */
  const [localLikes,    setLocalLikes]    = useState(likes)
  const [localDislikes, setLocalDislikes] = useState(dislikes)
  const [localReposts,  setLocalReposts]  = useState(reposts)
  const [localComments, setLocalComments] = useState(comments)
  const [hasLiked,      setHasLiked]      = useState(userLiked)
  const [hasDisliked,   setHasDisliked]   = useState(userDisliked)
  const [hasReposted,   setHasReposted]   = useState(userReposted)
  const [isExpanded,    setIsExpanded]    = useState(false)
  const [showComments,  setShowComments]  = useState(false)
  const [backdropLoaded, setBackdropLoaded] = useState(false)
  const [likeAnim,      setLikeAnim]      = useState(false)
  /* Who liked tooltip */
  const [likers, setLikers] = useState([])
  const [showLikers, setShowLikers] = useState(false)
  const likersTimer = useRef(null)

  const posterUrl   = img(movie?.posterPath)
  const backdropUrl = img(movie?.backdropPath, 'w1280')
  const hasOverview = movie?.overview?.length > 0
  const longOverview = movie?.overview?.length > 200

  /* ── Fetch likers on hover ── */
  const fetchLikers = useCallback(async () => {
    if (likers.length || !localLikes) return
    try {
      const { data } = await supabase
        .from('post_likes')
        .select('profiles:user_id(display_name, avatar_url)')
        .eq('post_id', id)
        .limit(5)
      setLikers((data || []).map(d => d.profiles))
    } catch {}
  }, [id, likers.length, localLikes])

  /* ── Handlers ── */
  const handleLike = async (e) => {
    e.stopPropagation()
    const next = !hasLiked
    setHasLiked(next)
    setLocalLikes(p => next ? p + 1 : p - 1)
    if (next && hasDisliked) { setHasDisliked(false); setLocalDislikes(p => p - 1) }
    if (next) { setLikeAnim(true); setTimeout(() => setLikeAnim(false), 600) }
    try {
      if (next) {
        await supabase.from('post_likes').insert({ post_id: id, user_id: currentUserId })
        await supabase.from('posts').update({ likes_count: localLikes + 1 }).eq('id', id)
      } else {
        await supabase.from('post_likes').delete().eq('post_id', id).eq('user_id', currentUserId)
        await supabase.from('posts').update({ likes_count: Math.max(0, localLikes - 1) }).eq('id', id)
      }
      setLikers([]) // reset so it refetches
      await onLike?.(id, next)
    } catch {
      setHasLiked(!next)
      setLocalLikes(p => next ? p - 1 : p + 1)
    }
  }

  const handleDislike = async (e) => {
    e.stopPropagation()
    const next = !hasDisliked
    setHasDisliked(next)
    setLocalDislikes(p => next ? p + 1 : p - 1)
    if (next && hasLiked) { setHasLiked(false); setLocalLikes(p => p - 1) }
    try {
      if (next) {
        await supabase.from('post_dislikes').insert({ post_id: id, user_id: currentUserId })
      } else {
        await supabase.from('post_dislikes').delete().eq('post_id', id).eq('user_id', currentUserId)
      }
      await onDislike?.(id, next)
    } catch {
      setHasDisliked(!next)
      setLocalDislikes(p => next ? p - 1 : p + 1)
    }
  }

  const handleRepost = async (e) => {
    e.stopPropagation()
    const next = !hasReposted
    setHasReposted(next)
    setLocalReposts(p => next ? p + 1 : p - 1)
    try {
      await supabase.from('posts').update({ reposts_count: next ? localReposts + 1 : Math.max(0, localReposts - 1) }).eq('id', id)
      await onRepost?.(id, next)
    } catch {
      setHasReposted(!next)
      setLocalReposts(p => next ? p - 1 : p + 1)
    }
  }

  const toggleComments = (e) => {
    e.stopPropagation()
    setShowComments(p => !p)
  }

  return (
    <article className='relative bg-[#0A0A0A] border-b border-[#141414] group/post
      hover:bg-[#0B0B0B] transition-colors duration-300'
      style={style}>

      {/* Gold left accent on hover */}
      <div className='absolute left-0 top-0 bottom-0 w-0.5 bg-[#D4AF37] opacity-0
        group-hover/post:opacity-100 transition-opacity duration-300 rounded-r' />

      {/* ── HEADER ── */}
      <div className='flex items-start gap-3.5 px-6 pt-5 pb-3'>
        <Avatar src={user?.avatar} name={user?.displayName} size={11}
          level={user?.level} ring
          onClick={(e) => { e.stopPropagation(); onUserClick?.(user) }} />

        <div className='flex-1 min-w-0'>
          <button onClick={(e) => { e.stopPropagation(); onUserClick?.(user) }}
            className='group/name flex items-baseline gap-2 flex-wrap text-left'>
            <span className='font-semibold text-white/95 group-hover/name:text-[#D4AF37]
              transition-colors duration-200 text-[15px] leading-tight'
              style={{ fontFamily: "'DM Sans', sans-serif" }}>
              {user?.displayName || 'User'}
            </span>
            {user?.username && (
              <span className='text-white/30 text-[13px]'>@{user.username}</span>
            )}
          </button>
          <div className='flex items-center gap-2 mt-0.5'>
            <span className='text-[11px] text-white/25'>{relTime(timestamp)}</span>
            {movie?.mediaType && (
              <>
                <span className='text-white/15'>·</span>
                <span className='text-[10px] font-black text-white/20 uppercase tracking-widest'>
                  {movie.mediaType === 'tv' ? '📺 Series' : '🎬 Film'}
                </span>
              </>
            )}
          </div>
        </div>

        {/* More menu placeholder */}
        <button className='p-2 rounded-xl text-white/15 hover:text-white/60
          hover:bg-[#1A1A1A] transition-all duration-200'>
          <svg className='w-4 h-4' fill='currentColor' viewBox='0 0 20 20'>
            <path d='M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z' />
          </svg>
        </button>
      </div>

      {/* ── MOVIE CARD ── */}
      {movie && (
        <div className='px-6 pb-4'>
          <div className='rounded-2xl overflow-hidden border border-[#1C1C1C]
            group-hover/post:border-[#252525] transition-all duration-300 bg-[#0D0D0D]
            hover:border-[#D4AF37]/30 cursor-pointer relative overflow-hidden'
            style={{ boxShadow: '0 4px 32px rgba(0,0,0,.6)' }}>

            {/* Gold shimmer on hover */}
            <div className='absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-500 pointer-events-none'
              style={{ background: 'linear-gradient(105deg, transparent 35%, rgba(212,175,55,0.04) 50%, transparent 65%)' }} />

            {/* Backdrop */}
            {backdropUrl && (
              <div className='relative h-48 overflow-hidden bg-[#0D0D0D]'>
                <img src={backdropUrl} alt={movie.title}
                  className={`w-full h-full object-cover transition-all duration-700
                    hover:scale-[1.03] ${backdropLoaded ? 'opacity-50' : 'opacity-0'}`}
                  onLoad={() => setBackdropLoaded(true)} />
                <div className='absolute inset-0'
                  style={{ background: 'linear-gradient(to bottom, rgba(13,13,13,.05) 0%, rgba(13,13,13,.5) 60%, #0D0D0D 100%)' }} />
                <div className='absolute inset-0'
                  style={{ background: 'linear-gradient(to right, rgba(13,13,13,.4) 0%, transparent 50%)' }} />

                {/* TMDB score */}
                {movie.voteAverage > 0 && (
                  <div className='absolute top-3 right-3'>
                    <ScoreRing score={movie.voteAverage} />
                  </div>
                )}
              </div>
            )}

            {/* Body */}
            <div className={`flex gap-4 p-4 ${backdropUrl ? '-mt-14 relative z-10' : ''}`}>
              {/* Poster */}
              <div className='flex-shrink-0'>
                {posterUrl
                  ? <img src={posterUrl} alt={movie.title}
                      className={`object-cover rounded-xl shadow-2xl ring-1 ring-white/8
                        hover:ring-[#D4AF37]/30 transition-all duration-300
                        ${backdropUrl ? 'w-24 h-36' : 'w-20 h-[116px]'}`} />
                  : <div className={`bg-[#181818] rounded-xl flex items-center justify-center
                      ${backdropUrl ? 'w-24 h-36' : 'w-20 h-[116px]'}`}>
                      <svg className='w-8 h-8 text-[#2D2D2D]' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={1.5}
                          d='M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18' />
                      </svg>
                    </div>
                }
              </div>

              {/* Details */}
              <div className='flex-1 min-w-0 pt-0.5'>
                {/* Title — Bebas Neue */}
                <h3 className='font-bold text-white leading-tight mb-1.5 hover:text-[#D4AF37]
                  transition-colors duration-200 line-clamp-2'
                  style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '20px', letterSpacing: '0.04em' }}>
                  {movie.title}
                </h3>

                {/* Meta */}
                <div className='flex items-center flex-wrap gap-x-2 gap-y-0.5 text-xs text-white/40 mb-2.5'>
                  {(movie.releaseDate || movie.year) && (
                    <span className='font-semibold text-white/60'>
                      {movie.releaseDate ? new Date(movie.releaseDate).getFullYear() : movie.year}
                    </span>
                  )}
                  {movie.runtime && (
                    <><span className='text-white/15'>·</span><span>{fmtRuntime(movie.runtime)}</span></>
                  )}
                  {movie.originalLanguage && (
                    <><span className='text-white/15'>·</span><span className='uppercase'>{movie.originalLanguage}</span></>
                  )}
                </div>

                {/* Genres */}
                {movie.genres?.length > 0 && (
                  <div className='flex flex-wrap gap-1.5 mb-3'>
                    {movie.genres.slice(0, 4).map((g, i) => (
                      <span key={i} className='px-2 py-0.5 bg-[#141414] border border-[#222]
                        rounded-md text-[10px] font-semibold text-white/40
                        hover:text-[#D4AF37] hover:border-[#D4AF37]/25 transition-all duration-200 cursor-pointer'
                        style={{ fontFamily: "'DM Sans', sans-serif" }}>
                        {g}
                      </span>
                    ))}
                  </div>
                )}

                {/* Star rating */}
                {rating > 0 && <div className='mb-3'><StarRow rating={rating} /></div>}

                {/* Overview */}
                {hasOverview && (
                  <div>
                    <p className={`text-white/50 text-[12px] leading-relaxed ${isExpanded ? '' : 'line-clamp-2'}`}
                      style={{ fontFamily: "'DM Sans', sans-serif" }}>
                      {movie.overview}
                    </p>
                    {longOverview && (
                      <button onClick={(e) => { e.stopPropagation(); setIsExpanded(p => !p) }}
                        className='text-[11px] font-semibold text-[#D4AF37]/50
                          hover:text-[#D4AF37] transition-colors duration-200 mt-1'
                        style={{ fontFamily: "'DM Sans', sans-serif" }}>
                        {isExpanded ? 'Show less ↑' : 'Read more ↓'}
                      </button>
                    )}
                  </div>
                )}

                {/* Director / Cast */}
                {(movie.director || movie.cast?.length > 0) && (
                  <div className='mt-3 pt-3 border-t border-[#161616] space-y-1 text-[11px]'>
                    {movie.director && (
                      <div className='flex gap-3'>
                        <span className='text-white/25 w-14 shrink-0 uppercase tracking-wider text-[9px] font-black pt-0.5'
                          style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
                          Director
                        </span>
                        <span className='text-white/65 font-medium' style={{ fontFamily: "'DM Sans', sans-serif" }}>
                          {movie.director}
                        </span>
                      </div>
                    )}
                    {movie.cast?.length > 0 && (
                      <div className='flex gap-3'>
                        <span className='text-white/25 w-14 shrink-0 uppercase tracking-wider text-[9px] font-black pt-0.5'
                          style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
                          Cast
                        </span>
                        <span className='text-white/50 leading-relaxed' style={{ fontFamily: "'DM Sans', sans-serif" }}>
                          {movie.cast.slice(0, 4).join(', ')}
                          {movie.cast.length > 4 && <span className='text-white/25'> +{movie.cast.length - 4} more</span>}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── REVIEW TEXT ── DM Sans body font ── */}
      {content?.trim() && (
        <div className='px-6 pb-4'>
          <p className='text-white/85 leading-relaxed whitespace-pre-wrap'
            style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '15px', lineHeight: '1.65' }}>
            {content}
          </p>
        </div>
      )}

      {/* ── ENGAGEMENT BAR ── */}
      <div className='px-6 pb-4 pt-2 border-t border-[#101010]'>
        <div className='flex items-center gap-1 pt-2'>

          {/* ── LIKE ── with tooltip */}
          <div className='relative'
            onMouseEnter={() => {
              clearTimeout(likersTimer.current)
              likersTimer.current = setTimeout(() => { setShowLikers(true); fetchLikers() }, 300)
            }}
            onMouseLeave={() => {
              clearTimeout(likersTimer.current)
              likersTimer.current = setTimeout(() => setShowLikers(false), 200)
            }}>
            <button onClick={handleLike}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold
                transition-all duration-200 relative overflow-hidden
                ${hasLiked
                  ? 'text-[#D4AF37] bg-[#D4AF37]/10'
                  : 'text-white/35 hover:text-[#D4AF37] hover:bg-[#1A1A1A]'
                } ${likeAnim ? 'scale-110' : 'scale-100'}`}>
              <svg className={`w-[18px] h-[18px] transition-transform duration-200 ${likeAnim ? 'scale-125' : ''}`}
                fill={hasLiked ? 'currentColor' : 'none'} stroke='currentColor' viewBox='0 0 24 24'>
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={1.8}
                  d='M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5' />
              </svg>
              <span className='text-xs tabular-nums'
                style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.04em', fontSize: '13px' }}>
                {fmtCount(localLikes)}
              </span>
            </button>

            {/* Likers tooltip */}
            {showLikers && localLikes > 0 && (
              <div className='absolute bottom-full left-0 mb-2 z-50 min-w-[160px]'
                style={{ animation: 'tooltipIn .15s ease-out' }}>
                <div className='bg-[#111] border border-[#252525] rounded-xl p-3 shadow-2xl'>
                  <p className='text-[9px] font-black text-white/25 uppercase tracking-widest mb-2'
                    style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
                    Liked by
                  </p>
                  {likers.length > 0
                    ? likers.map((l, i) => (
                        <div key={i} className='flex items-center gap-2 py-1'>
                          {l?.avatar_url
                            ? <img src={l.avatar_url} className='w-5 h-5 rounded-full object-cover' alt='' />
                            : <div className='w-5 h-5 rounded-full bg-[#D4AF37]/20 flex items-center justify-center text-[8px] font-bold text-[#D4AF37]'>
                                {initials(l?.display_name)}
                              </div>
                          }
                          <span className='text-[11px] text-white/60' style={{ fontFamily: "'DM Sans', sans-serif" }}>
                            {l?.display_name}
                          </span>
                        </div>
                      ))
                    : <div className='flex justify-center py-1'>
                        <svg className='animate-spin w-4 h-4 text-[#D4AF37]/30' fill='none' viewBox='0 0 24 24'>
                          <circle cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='3' className='opacity-20' />
                          <path fill='currentColor' d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z' />
                        </svg>
                      </div>
                  }
                  {localLikes > 5 && (
                    <p className='text-[10px] text-white/25 mt-1' style={{ fontFamily: "'DM Sans', sans-serif" }}>
                      +{localLikes - 5} others
                    </p>
                  )}
                  {/* Tooltip arrow */}
                  <div className='absolute -bottom-1.5 left-4 w-3 h-3 bg-[#111] border-b border-r border-[#252525] rotate-45' />
                </div>
              </div>
            )}
          </div>

          {/* ── DISLIKE ── */}
          <button onClick={handleDislike}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold
              transition-all duration-200
              ${hasDisliked
                ? 'text-red-500 bg-red-500/10'
                : 'text-white/35 hover:text-red-400 hover:bg-[#1A1A1A]'
              }`}>
            <svg className={`w-[18px] h-[18px] transition-transform duration-200 ${hasDisliked ? 'rotate-180' : ''}`}
              fill={hasDisliked ? 'currentColor' : 'none'} stroke='currentColor' viewBox='0 0 24 24'>
              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={1.8}
                d='M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.096c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5' />
            </svg>
            {localDislikes > 0 && (
              <span className='text-xs tabular-nums'
                style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.04em', fontSize: '13px' }}>
                {fmtCount(localDislikes)}
              </span>
            )}
          </button>

          {/* ── COMMENT ── */}
          <button onClick={toggleComments}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold
              transition-all duration-200
              ${showComments
                ? 'text-blue-400 bg-blue-400/10'
                : 'text-white/35 hover:text-blue-400 hover:bg-[#1A1A1A]'
              }`}>
            <svg className='w-[18px] h-[18px]' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={1.8}
                d='M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z' />
            </svg>
            <span className='text-xs tabular-nums'
              style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.04em', fontSize: '13px' }}>
              {fmtCount(localComments)}
            </span>
          </button>

          {/* ── REPOST ── */}
          <button onClick={handleRepost}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold
              transition-all duration-200
              ${hasReposted
                ? 'text-emerald-400 bg-emerald-400/10'
                : 'text-white/35 hover:text-emerald-400 hover:bg-[#1A1A1A]'
              }`}>
            <svg className={`w-[18px] h-[18px] transition-transform duration-300 ${hasReposted ? 'rotate-180' : ''}`}
              fill='none' stroke='currentColor' viewBox='0 0 24 24'>
              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={1.8}
                d='M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15' />
            </svg>
            {localReposts > 0 && (
              <span className='text-xs tabular-nums'
                style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.04em', fontSize: '13px' }}>
                {fmtCount(localReposts)}
              </span>
            )}
          </button>

          <div className='flex-1' />

          {/* ── SHARE ── */}
          <button onClick={(e) => e.stopPropagation()}
            className='flex items-center justify-center w-9 h-9 rounded-xl text-white/20
              hover:text-white/60 hover:bg-[#1A1A1A] transition-all duration-200'>
            <svg className='w-[17px] h-[17px]' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={1.8}
                d='M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z' />
            </svg>
          </button>
        </div>
      </div>

      {/* ── COMMENT PANEL ── */}
      {showComments && (
        <CommentPanel
          postId={id}
          currentUserId={currentUserId}
          onCountChange={setLocalComments}
        />
      )}

      <style>{`
        @keyframes replyIn       { from { opacity:0; transform:translateY(-6px) } to { opacity:1; transform:translateY(0) } }
        @keyframes commentPanelIn{ from { opacity:0; transform:translateY(-4px) } to { opacity:1; transform:translateY(0) } }
        @keyframes tooltipIn     { from { opacity:0; transform:translateY(4px)  } to { opacity:1; transform:translateY(0) } }
      `}</style>
    </article>
  )
}

export default Post