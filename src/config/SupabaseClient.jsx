import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_PROJECT_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_API_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    '[Flik\'d] Supabase env vars missing. Ensure VITE_SUPABASE_PROJECT_URL and ' +
    'VITE_SUPABASE_API_KEY are set in .env.local and in Vercel → Project Settings → Environment Variables.'
  )
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession:     true,
    storageKey:         'flikd-auth',
    autoRefreshToken:   true,
    detectSessionInUrl: true,
  },
})

export default supabase