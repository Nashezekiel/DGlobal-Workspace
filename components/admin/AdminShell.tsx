'use client'

import { useMemo, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { BarChart3, CheckSquare, Plus, Users, LogOut, UserCheck, MessageSquare, Menu, X, User } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { NotificationBell } from '@/components/NotificationBell'
import { ProfileDropdown } from '@/components/ProfileDropdown'
import { Button } from '@/components/ui/button'
import dgLogo from '@/app/DGlogo.png'

const navItems = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: BarChart3 },
  { href: '/admin/review', label: 'Review Queue', icon: CheckSquare },
  { href: '/admin/tasks/new', label: 'Task Creation', icon: Plus },
  { href: '/admin/user-approvals', label: 'User Approvals', icon: UserCheck },
  { href: '/admin/messages', label: 'Messages', icon: MessageSquare },
  { href: '/admin/team', label: 'Team Management', icon: Users },
  { href: '/admin/profile', label: 'Profile Settings', icon: User },
]

export function AdminShell({
  children,
  initialPendingUsersCount = 0,
}: {
  children: React.ReactNode
  initialPendingUsersCount?: number
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const currentLabel = useMemo(
    () => navItems.find((item) => item.href === pathname)?.label || 'Admin',
    [pathname]
  )

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const goToCreateTask = () => {
    setMobileMenuOpen(false)
    router.push('/admin/tasks/new')
  }

  return (
    <div className="flex h-screen bg-bg-workspace">
      {/* Mobile sidebar overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden motion-safe:animate-fade-in"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-brand-purple text-white flex flex-col transform transition-transform duration-300 ease-in-out motion-safe:will-change-transform ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        } md:relative md:translate-x-0`}
      >
        {/* Logo */}
        <div className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl overflow-hidden border border-white/20 bg-white">
              <Image
                src={dgLogo}
                alt="DGG-Workspace logo"
                width={40}
                height={40}
                className="h-full w-full object-contain"
                priority
              />
            </div>
            <h1 className="text-2xl font-bold">DGG-Workspace</h1>
          </div>
          <button
            className="md:hidden rounded-md p-2 hover:bg-white/10 transition-colors"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4">
          <ul className="space-y-2">
            {navItems.map(({ href, label, icon: Icon }) => {
              const isActive = pathname === href
              return (
                <li key={href}>
                  <Link
                    href={href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center px-4 py-2 rounded transition-colors ${
                      isActive ? 'bg-brand-gold text-brand-purple' : 'hover:bg-white/10'
                    }`}
                  >
                    <Icon className="mr-3 h-5 w-5" />
                    {label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* Logout */}
        <div className="p-4">
          <button
            onClick={handleLogout}
            className="flex items-center px-4 py-2 w-full text-left hover:bg-white/10 rounded transition-colors"
          >
            <LogOut className="mr-3 h-5 w-5" />
            Logout
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white shadow-sm px-4 md:px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <button
              className="md:hidden rounded-md p-2 hover:bg-gray-100 transition-colors"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="hidden sm:block text-sm font-semibold text-gray-900 motion-safe:animate-fade-up">
              {currentLabel}
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-4">
            <Button
              asChild
              variant="outline"
              className="hidden md:inline-flex border-brand-purple/30 text-brand-purple hover:bg-brand-purple/5"
            >
              <Link href="/admin/user-approvals" className="flex items-center gap-2">
                Pending Users
                <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-brand-gold px-2 text-xs font-semibold text-brand-purple motion-safe:animate-scale-in">
                  {initialPendingUsersCount}
                </span>
              </Link>
            </Button>
            <Button
              type="button"
              onClick={goToCreateTask}
              className="hidden sm:inline-flex bg-brand-purple text-white shadow-md ring-1 ring-brand-gold/30 hover:bg-brand-purple/90 hover:ring-brand-gold/50 focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:ring-offset-2"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Task
            </Button>
            <Button
              size="icon"
              type="button"
              onClick={goToCreateTask}
              className="sm:hidden bg-brand-purple text-white shadow-md ring-1 ring-brand-gold/30 hover:bg-brand-purple/90 hover:ring-brand-gold/50 focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:ring-offset-2"
              aria-label="Create task"
              title="Create task"
            >
              <Plus className="h-4 w-4" />
            </Button>
            <NotificationBell />
            <ProfileDropdown />
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 md:p-6 overflow-auto motion-safe:animate-fade-up">
          {children}
        </main>
      </div>
    </div>
  )
}

