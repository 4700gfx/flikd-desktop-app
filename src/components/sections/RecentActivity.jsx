import React, { useState } from 'react'

/**
 * RecentActivity — Flik'd
 *
 * Fully wired to activity data passed from Home.jsx
 * activity shape: { id, type, user, data, timestamp }
 * activity.data shape (from activity_data JSONB column):
 *   review_posted:      { post_id, movie_title, rating }
 *   quiz_completed:     { movie_title, score, passed }
 *   list_created:       { list_id, list_name, movie_count }
 *   list_item_completed:{ movie_title }
 *   points_earned:      { points }
 */

/* ─── Helpers ──────────────────────────────────────── */
const relativeTime = (iso) => {
  if (!iso) return ''
  const s = Math.floor((Date.now() - new Date(iso)) / 1000)
  if (s < 60)     return 'now'
  if (s < 3600)   return `${Math.floor(s / 60)}m`
  if (s < 86400)  return `${Math.floor(s / 3600)}h`
  if (s < 604800) return `${Math.floor(s / 86400)}d`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const initials = (name) => {
  if (!name) return '?'
  const p = name.trim().split(' ')
  return p.length === 1
    ? p[0][0].toUpperCase()
    : (p[0][0] + p[p.length - 1][0]).toUpperCase()
}

/* ─── Activity config map ──────────────────────────── */
const ACTIVITY_CONFIG = {
  review_posted: {
    color:  '#D4AF37',
    bgClass: 'bg-[#D4AF37]/10',
    label:  'Review',
    icon: (
      <svg className='w-3 h-3' fill='currentColor' viewBox='0 0 20 20'>
        <path d='M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z' />
      </svg>
    ),
    message: (d) => `reviewed "${d?.movie_title || 'a film'}"`,
    badge: (d) => d?.rating ? { text: `${Number(d.rating).toFixed(1)}/10`, color: '#D4AF37' } : null,
  },
  quiz_completed: {
    color:  '#22c55e',
    bgClass: 'bg-green-500/10',
    label:  'Quiz',
    icon: (
      <svg className='w-3 h-3' fill='currentColor' viewBox='0 0 20 20'>
        <path fillRule='evenodd' d='M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z' clipRule='evenodd' />
      </svg>
    ),
    message: (d) => {
      const title = d?.movie_title || 'a film'
      return d?.passed ? `passed quiz for "${title}"` : `took quiz for "${title}"`
    },
    badge: (d) => d?.score != null
      ? { text: `${d.score}%`, color: d.passed ? '#22c55e' : '#ef4444' }
      : null,
  },
  list_created: {
    color:  '#60a5fa',
    bgClass: 'bg-blue-500/10',
    label:  'List',
    icon: (
      <svg className='w-3 h-3' fill='currentColor' viewBox='0 0 20 20'>
        <path d='M9 2a1 1 0 000 2h2a1 1 0 100-2H9z' />
        <path fillRule='evenodd' d='M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z' clipRule='evenodd' />
      </svg>
    ),
    message: (d) => `created list "${d?.list_name || 'Untitled'}"`,
    badge: (d) => d?.movie_count != null
      ? { text: `${d.movie_count} film${d.movie_count !== 1 ? 's' : ''}`, color: '#60a5fa' }
      : null,
  },
  list_item_completed: {
    color:  '#D4AF37',
    bgClass: 'bg-[#D4AF37]/10',
    label:  'Watched',
    icon: (
      <svg className='w-3 h-3' fill='currentColor' viewBox='0 0 20 20'>
        <path fillRule='evenodd' d='M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z' clipRule='evenodd' />
      </svg>
    ),
    message: (d) => `watched "${d?.movie_title || 'a film'}"`,
    badge: () => null,
  },
  points_earned: {
    color:  '#D4AF37',
    bgClass: 'bg-[#D4AF37]/10',
    label:  'Points',
    icon: (
      <svg className='w-3 h-3' fill='currentColor' viewBox='0 0 20 20'>
        <path d='M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z' />
        <path fillRule='evenodd' d='M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z' clipRule='evenodd' />
      </svg>
    ),
    message: (d) => `earned ${d?.points || 0} points`,
    badge: (d) => d?.points ? { text: `+${d.points}`, color: '#D4AF37' } : null,
  },
}

const FALLBACK_CONFIG = {
  color:  '#666',
  bgClass: 'bg-[#1A1A1A]',
  label:  'Activity',
  icon: (
    <svg className='w-3 h-3' fill='currentColor' viewBox='0 0 20 20'>
      <path fillRule='evenodd' d='M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z' clipRule='evenodd' />
    </svg>
  ),
  message: () => 'had some activity',
  badge:   () => null,
}

/* ─── Single activity row ──────────────────────────── */
const ActivityRow = ({ activity, index, onClick }) => {
  const cfg   = ACTIVITY_CONFIG[activity.type] || FALLBACK_CONFIG
  const badge = cfg.badge(activity.data)
  const msg   = cfg.message(activity.data)
  const name  = activity.user?.displayName || 'Someone'
  const avatar= activity.user?.avatar

  return (
    <button
      onClick={() => onClick?.(activity)}
      className='w-full px-4 py-3 flex items-start gap-3 hover:bg-[#0D0D0D] active:bg-[#111] transition-colors text-left group'
      style={{ animation: `rowFade 0.3s ease-out ${Math.min(index * 0.04, 0.32)}s both` }}
    >
      {/* Avatar + badge */}
      <div className='relative flex-shrink-0'>
        <div className='w-8 h-8 rounded-full overflow-hidden ring-1 ring-[#1A1A1A] group-hover:ring-[#2A2A2A] transition-all'>
          {avatar ? (
            <img src={avatar} alt={name} className='w-full h-full object-cover' />
          ) : (
            <div className='w-full h-full flex items-center justify-center text-[11px] font-bold'
              style={{ background: `linear-gradient(135deg, ${cfg.color}30, ${cfg.color}10)`, color: cfg.color }}
            >
              {initials(name)}
            </div>
          )}
        </div>
        {/* Type badge */}
        <div
          className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-[#0A0A0A] flex items-center justify-center ${cfg.bgClass}`}
          style={{ color: cfg.color }}
        >
          {cfg.icon}
        </div>
      </div>

      {/* Text */}
      <div className='flex-1 min-w-0'>
        <p className='text-[12px] leading-snug text-white/60 line-clamp-2'>
          <span className='font-semibold text-white/80 group-hover:text-white transition-colors'>
            {name}
          </span>
          {' '}
          {msg}
        </p>

        {/* Badge + time */}
        <div className='flex items-center gap-2 mt-1'>
          {badge && (
            <span
              className='text-[10px] font-bold px-1.5 py-0.5 rounded-md'
              style={{
                color: badge.color,
                background: badge.color + '18',
                border: `1px solid ${badge.color}30`
              }}
            >
              {badge.text}
            </span>
          )}
          <span className='text-[10px] text-white/20 tabular-nums'>
            {relativeTime(activity.timestamp)}
          </span>
        </div>
      </div>
    </button>
  )
}

/* ─── RecentActivity ───────────────────────────────── */
const RecentActivity = ({ activities = [], onActivityClick, maxDisplay = 10 }) => {
  const [showAll, setShowAll]     = useState(false)
  const PREVIEW                   = 5
  const visible                   = showAll
    ? activities.slice(0, maxDisplay)
    : activities.slice(0, PREVIEW)
  const hasMore                   = activities.length > PREVIEW && !showAll

  return (
    <div className='bg-[#0A0A0A] border border-[#1A1A1A] rounded-2xl overflow-hidden'>

      {/* Header */}
      <div className='px-4 py-3.5 border-b border-[#161616] flex items-center justify-between'>
        <div className='flex items-center gap-2'>
          <svg className='w-4 h-4 text-[#D4AF37]' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M13 10V3L4 14h7v7l9-11h-7z' />
          </svg>
          <h2 className='font-bebas text-[17px] tracking-widest text-white'>ACTIVITY</h2>
        </div>
        {activities.length > 0 && (
          <div className='flex items-center gap-1.5'>
            {/* Live pulse dot */}
            <span className='relative flex h-2 w-2'>
              <span className='animate-ping absolute inline-flex h-full w-full rounded-full bg-[#D4AF37] opacity-40'></span>
              <span className='relative inline-flex rounded-full h-2 w-2 bg-[#D4AF37]/60'></span>
            </span>
            <span className='text-[10px] font-bold text-white/20 tabular-nums'>
              {activities.length}
            </span>
          </div>
        )}
      </div>

      {/* Activity rows */}
      <div className='divide-y divide-[#0D0D0D]'>
        {visible.length > 0 ? (
          visible.map((a, i) => (
            <ActivityRow
              key={a.id}
              activity={a}
              index={i}
              onClick={onActivityClick}
            />
          ))
        ) : (
          <div className='px-4 py-10 text-center'>
            <div className='w-12 h-12 bg-[#111] rounded-full flex items-center justify-center mx-auto mb-3'>
              <svg className='w-6 h-6 text-[#222]' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={1.5} d='M13 10V3L4 14h7v7l9-11h-7z' />
              </svg>
            </div>
            <p className='text-white/25 text-xs font-semibold mb-1'>No activity yet</p>
            <p className='text-white/15 text-xs'>Post a review to get started!</p>
          </div>
        )}
      </div>

      {/* Show more / less */}
      {activities.length > PREVIEW && (
        <div className='px-4 py-3 border-t border-[#111]'>
          <button
            onClick={() => setShowAll(p => !p)}
            className='w-full py-1.5 text-center text-xs font-bold text-[#D4AF37]/50 hover:text-[#D4AF37] transition-colors tracking-wide'
          >
            {showAll
              ? 'SHOW LESS ↑'
              : `SHOW ${Math.min(activities.length - PREVIEW, maxDisplay - PREVIEW)} MORE ↓`
            }
          </button>
        </div>
      )}

      <style>{`
        @keyframes rowFade { from { opacity:0; transform:translateY(6px) } to { opacity:1; transform:translateY(0) } }
      `}</style>
    </div>
  )
}

export default RecentActivity