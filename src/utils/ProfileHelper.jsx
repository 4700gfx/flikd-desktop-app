/**
 * Profile Creation Helper for Flik'd
 * 
 * Ensures user profile exists before creating posts
 * Call this on app initialization or before first post
 */

import supabase from '../config/SupabaseClient'

/**
 * Ensure user profile exists in profiles table
 * Creates one if it doesn't exist
 */
export const ensureUserProfile = async (user) => {
  if (!user) return null

  try {
    // Check if profile exists
    const { data: existingProfile, error: fetchError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    // If profile exists, return it
    if (existingProfile) {
      return existingProfile
    }

    // If not found, create profile
    if (fetchError && fetchError.code === 'PGRST116') {
      // Extract username from email or metadata
      const username = 
        user.user_metadata?.username || 
        user.email?.split('@')[0] || 
        `user_${user.id.substring(0, 8)}`

      const displayName = 
        user.user_metadata?.display_name || 
        user.user_metadata?.full_name || 
        username

      const { data: newProfile, error: createError } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          username: username.toLowerCase().replace(/[^a-z0-9_]/g, '_'),
          display_name: displayName,
          bio: null,
          avatar_url: user.user_metadata?.avatar_url || null,
          total_points: 0,
          level: 1
        })
        .select()
        .single()

      if (createError) throw createError

      console.log('✅ Profile created successfully')
      return newProfile
    }

    throw fetchError
  } catch (error) {
    console.error('Error ensuring profile:', error)
    throw error
  }
}

/**
 * Get or create user profile
 * Safe to call multiple times
 */
export const getOrCreateProfile = async () => {
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    throw new Error('User not authenticated')
  }

  return await ensureUserProfile(user)
}

export default {
  ensureUserProfile,
  getOrCreateProfile
}