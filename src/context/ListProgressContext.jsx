import React, { createContext, useContext, useCallback, useReducer, useRef } from 'react'
import supabase from '../config/SupabaseClient'

/**
 * ListProgressContext
 * ───────────────────
 * Single source of truth for list progress across:
 *   - CurrentListTab (sidebar)
 *   - Navbar Watchlist panel
 *   - Navbar My Lists panel
 *   - ListModal
 *
 * Usage:
 *   wrap your app (or Home.jsx) with <ListProgressProvider userId={id}>
 *   then in any component: const { lists, updateProgress, refreshLists } = useListProgress()
 */

const ListProgressContext = createContext(null)

function reducer(state, action) {
  switch (action.type) {
    case 'SET_LISTS':
      return { ...state, lists: action.payload, loading: false }
    case 'UPDATE_PROGRESS': {
      const { listId, completedCount, itemCount } = action.payload
      return {
        ...state,
        lists: state.lists.map(l =>
          l.id === listId
            ? { ...l, completedCount: completedCount ?? l.completedCount, itemCount: itemCount ?? l.itemCount }
            : l
        ),
      }
    }
    case 'SET_LOADING':
      return { ...state, loading: action.payload }
    default:
      return state
  }
}

export const ListProgressProvider = ({ userId, children }) => {
  const [state, dispatch] = useReducer(reducer, { lists: [], loading: true })
  const fetchedRef = useRef(false)

  const refreshLists = useCallback(async (force = false) => {
    if (!userId || (fetchedRef.current && !force)) return
    fetchedRef.current = true
    dispatch({ type: 'SET_LOADING', payload: true })

    try {
      // Try RPC first, fall back to direct query
      const { data, error } = await supabase
        .rpc('get_user_lists_with_counts', { target_user_id: userId })

      if (!error && data) {
        dispatch({
          type: 'SET_LISTS',
          payload: data.map(l => ({
            id:             l.list_id,
            name:           l.name,
            description:    l.description,
            isPublic:       l.is_public,
            itemCount:      Number(l.item_count)      || 0,
            completedCount: Number(l.completed_count) || 0,
          })),
        })
        return
      }

      // Fallback
      const { data: listsData } = await supabase
        .from('lists')
        .select('*, list_items(id, is_completed)')
        .eq('user_id', userId)
        .is('deleted_at', null)
        .order('updated_at', { ascending: false })

      dispatch({
        type: 'SET_LISTS',
        payload: (listsData || []).map(list => ({
          id:             list.id,
          name:           list.name,
          description:    list.description,
          isPublic:       list.is_public,
          itemCount:      list.list_items?.length || 0,
          completedCount: list.list_items?.filter(i => i.is_completed).length || 0,
        })),
      })
    } catch (e) {
      console.error('[ListProgress] fetch error:', e)
      dispatch({ type: 'SET_LOADING', payload: false })
    }
  }, [userId])

  const updateProgress = useCallback((listId, completedCount, itemCount) => {
    dispatch({ type: 'UPDATE_PROGRESS', payload: { listId, completedCount, itemCount } })
  }, [])

  React.useEffect(() => {
    refreshLists()
  }, [refreshLists])

  return (
    <ListProgressContext.Provider value={{ ...state, refreshLists, updateProgress }}>
      {children}
    </ListProgressContext.Provider>
  )
}

export const useListProgress = () => {
  const ctx = useContext(ListProgressContext)
  if (!ctx) throw new Error('useListProgress must be used within ListProgressProvider')
  return ctx
}