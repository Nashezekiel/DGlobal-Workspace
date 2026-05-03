'use client'

import { useState } from 'react'

import Image from 'next/image'
import { supabase } from '@/lib/supabase/client'
import { Eye, EyeOff, Mail, Lock, Clock, X } from 'lucide-react'
import dgLogo from '@/app/DGlogo.png'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showPendingModal, setShowPendingModal] = useState(false)
  const [fullName, setFullName] = useState('')


  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        setError((error as { message?: string }).message || 'Authentication failed')
        setIsLoading(false)
        return
      }
      if (!data.user) {
        setError('No authenticated user returned.')
        setIsLoading(false)
        return
      }

      // Check approval status from profiles table
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('approval_status, role, full_name')
        .eq('id', data.user.id)
        .single()

      if (profileError || !profile) {
        setError('Profile not found. Please complete signup first or ask admin to run the profile trigger SQL.')
        setIsLoading(false)
        return
      }

      // Check if user is pending approval
      if (profile.approval_status === 'pending') {
        setFullName(profile.full_name || '')
        setShowPendingModal(true)
        setIsLoading(false)
        return
      }

      // Check if user was rejected
      if (profile.approval_status === 'rejected') {
        setError('Your account has been rejected. Please contact an administrator.')
        setIsLoading(false)
        return
      }

      // Force a hard redirect instead of client-side routing.
      // This kills any concurrent Supabase lock requests on the client 
      // and forces the server to process the new auth cookies cleanly.
      if (profile.role === 'admin') {
        window.location.href = '/admin/dashboard'
      } else {
        window.location.href = '/dashboard'
      }
    } catch (err: unknown) {
      const error = err as { message?: string }
      setError(error.message || 'Failed to sign in')
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo and Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 overflow-hidden border border-purple-100 bg-white shadow-sm">
            <Image
              src={dgLogo}
              alt="DGG-Workspace logo"
              width={64}
              height={64}
              className="h-full w-full object-contain"
              priority
            />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome to DGG-Workspace</h1>
          <p className="text-gray-600">Sign in to access your workspace</p>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <form onSubmit={handleLogin} className="space-y-6">
            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  className="appearance-none block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  className="appearance-none block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  )}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center items-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-[1.02]"
            >
              {isLoading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Signing in...
                </div>
              ) : (
                'Sign in'
              )}
            </button>
          </form>

          {/* Signup Link */}
          <div className="mt-4 text-center">
            <p className="text-sm text-gray-600">
              Don&apos;t have an account?{' '}
              <a href="/signup" className="font-medium text-purple-600 hover:text-purple-700">
                Sign up
              </a>
            </p>
          </div>
        </div>
      </div>

      {/* Pending Approval Modal */}
      <Dialog open={showPendingModal} onOpenChange={setShowPendingModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <button
              onClick={() => {
                setShowPendingModal(false)
                supabase.auth.signOut()
              }}
              className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </button>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-600" />
              Account Pending Approval
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-gray-600">
              Hello{fullName && `, ${fullName}`}! Your account is currently pending approval from an administrator.
            </p>
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                <Clock className="h-4 w-4 text-blue-600 mt-0.5" />
                <div>
                  <p className="font-medium text-blue-900 text-sm">What happens next?</p>
                  <p className="text-xs text-blue-700">
                    An administrator will review your account and approve it shortly.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg">
                <Clock className="h-4 w-4 text-purple-600 mt-0.5" />
                <div>
                  <p className="font-medium text-purple-900 text-sm">How long will it take?</p>
                  <p className="text-xs text-purple-700">
                    Approval typically happens within 24-48 hours during business days.
                  </p>
                </div>
              </div>
            </div>
            <button
              onClick={() => {
                setShowPendingModal(false)
                supabase.auth.signOut()
              }}
              className="w-full mt-4 py-2 px-4 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Sign out
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}