import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

let browserClient: SupabaseClient | null = null

function getSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY')
  }

  return createBrowserClient(url, anonKey)
}

export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    if (!browserClient) {
      browserClient = getSupabaseBrowserClient()
    }
    return Reflect.get(browserClient, prop, receiver)
  },
})
