'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { User, LogOut, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase/client'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export function ProfileDropdown() {
  const router = useRouter()
  const [user, setUser] = useState<{ full_name: string; email: string; role?: string; avatar_url?: string }>({
    full_name: 'User',
    email: 'No email',
  })

  useEffect(() => {
    const loadUser = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, role, job_role, avatar_url')
        .eq('id', authUser.id)
        .single()

      setUser({
        full_name: profile?.full_name || authUser.email?.split('@')[0] || 'User',
        email: authUser.email || 'No email',
        role: profile?.job_role || profile?.role || undefined,
        avatar_url: profile?.avatar_url,
      })
    }
    loadUser()
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="flex items-center gap-2 hover:bg-brand-purple/10 hover:text-brand-purple">
          {user.avatar_url ? (
            <img src={user.avatar_url} alt="Profile" className="h-6 w-6 rounded-full object-cover border border-brand-purple/20" />
          ) : (
            <User className="h-4 w-4 text-brand-purple" />
          )}
          <span className="hidden sm:block font-medium text-brand-purple">{user.full_name}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem>
          <div className="flex flex-col">
            <span className="font-semibold text-brand-purple">{user.full_name}</span>
            <span className="text-xs text-gray-500">{user.email}</span>
            {user.role && <span className="text-xs font-medium text-brand-gold mt-0.5 capitalize">{user.role}</span>}
          </div>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="focus:bg-brand-purple/10 focus:text-brand-purple cursor-pointer" onClick={() => router.push('/profile')}>
          <Settings className="h-4 w-4 mr-2" />
          Profile Settings
        </DropdownMenuItem>
        <DropdownMenuItem className="focus:bg-red-50 focus:text-red-600 text-red-600 cursor-pointer" onClick={handleSignOut}>
          <LogOut className="h-4 w-4 mr-2" />
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
