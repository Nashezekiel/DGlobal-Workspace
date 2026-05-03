'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Eye, EyeOff, Mail, Lock, User, Phone, MapPin, Briefcase } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import dgLogo from '@/app/DGlogo.png'

const JOB_ROLES = [
  { value: 'intern', label: 'Intern' },
  { value: 'team', label: 'Team Member' },
  { value: 'worker', label: 'Worker' },
]

export default function SignupPage() {
  const router = useRouter()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [location, setLocation] = useState('')
  const [jobRole, setJobRole] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    if (!jobRole) {
      setError('Please select your role.')
      return
    }

    setIsLoading(true)

    try {
      const { data, error: signupError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName.trim(),
          },
        },
      })

      if (signupError) {
        setError(signupError.message)
        return
      }

      if (!data.user?.id) {
        setError('Account created but no user ID returned.')
        return
      }

      // Update the profile with the extra fields
      await supabase
        .from('profiles')
        .update({
          phone_number: phoneNumber.trim(),
          location: location.trim(),
          job_role: jobRole,
        })
        .eq('id', data.user.id)

      await supabase.auth.signOut()
      setSuccess('Account created! Your request is pending admin approval.')
      setTimeout(() => router.push('/login'), 2000)
    } catch (err) {
      const typedError = err as { message?: string }
      setError(typedError.message || 'Failed to create account')
    } finally {
      setIsLoading(false)
    }
  }

  const inputClass = 'appearance-none block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm'
  const labelClass = 'block text-sm font-medium text-gray-700 mb-1.5'
  const iconClass = 'absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none'

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-3 overflow-hidden border border-purple-100 bg-white shadow-sm">
            <Image
              src={dgLogo}
              alt="D-Global logo"
              width={56}
              height={56}
              className="h-full w-full object-contain"
              priority
            />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Create Account</h1>
          <p className="text-gray-500 text-sm">Request access to the D-Global workspace</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <form onSubmit={handleSignup} className="space-y-4">

            {/* Row 1: Full Name */}
            <div>
              <label htmlFor="full_name" className={labelClass}>Full Name</label>
              <div className="relative">
                <div className={iconClass}><User className="h-4 w-4 text-gray-400" /></div>
                <input
                  id="full_name"
                  type="text"
                  required
                  className={inputClass}
                  placeholder="Enter your full name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
            </div>

            {/* Row 2: Email */}
            <div>
              <label htmlFor="email" className={labelClass}>Email Address</label>
              <div className="relative">
                <div className={iconClass}><Mail className="h-4 w-4 text-gray-400" /></div>
                <input
                  id="email"
                  type="email"
                  required
                  className={inputClass}
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            {/* Row 3: Phone & Location side by side */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="phone" className={labelClass}>Phone Number</label>
                <div className="relative">
                  <div className={iconClass}><Phone className="h-4 w-4 text-gray-400" /></div>
                  <input
                    id="phone"
                    type="tel"
                    className={inputClass}
                    placeholder="+1 234 567 890"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label htmlFor="location" className={labelClass}>Location</label>
                <div className="relative">
                  <div className={iconClass}><MapPin className="h-4 w-4 text-gray-400" /></div>
                  <input
                    id="location"
                    type="text"
                    className={inputClass}
                    placeholder="City, Country"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Row 4: Job Role */}
            <div>
              <label htmlFor="job_role" className={labelClass}>Role</label>
              <div className="relative">
                <div className={iconClass}><Briefcase className="h-4 w-4 text-gray-400" /></div>
                <select
                  id="job_role"
                  required
                  className="appearance-none block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm bg-white"
                  value={jobRole}
                  onChange={(e) => setJobRole(e.target.value)}
                >
                  <option value="" disabled>Select your role</option>
                  {JOB_ROLES.map(r => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Row 5: Password & Confirm side by side */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="password" className={labelClass}>Password</label>
                <div className="relative">
                  <div className={iconClass}><Lock className="h-4 w-4 text-gray-400" /></div>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    className="appearance-none block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                    placeholder="Min 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button type="button" className="absolute inset-y-0 right-0 pr-3 flex items-center" onClick={() => setShowPassword(v => !v)}>
                    {showPassword ? <EyeOff className="h-4 w-4 text-gray-400" /> : <Eye className="h-4 w-4 text-gray-400" />}
                  </button>
                </div>
              </div>
              <div>
                <label htmlFor="confirm_password" className={labelClass}>Repeat Password</label>
                <div className="relative">
                  <div className={iconClass}><Lock className="h-4 w-4 text-gray-400" /></div>
                  <input
                    id="confirm_password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    className={`appearance-none block w-full pl-10 pr-10 py-3 border rounded-lg placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm ${
                      confirmPassword && password !== confirmPassword
                        ? 'border-red-400 bg-red-50'
                        : 'border-gray-300'
                    }`}
                    placeholder="Repeat password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                  <button type="button" className="absolute inset-y-0 right-0 pr-3 flex items-center" onClick={() => setShowConfirmPassword(v => !v)}>
                    {showConfirmPassword ? <EyeOff className="h-4 w-4 text-gray-400" /> : <Eye className="h-4 w-4 text-gray-400" />}
                  </button>
                </div>
                {confirmPassword && password !== confirmPassword && (
                  <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
                )}
              </div>
            </div>

            {/* Errors & Success */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}
            {success && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
                {success}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center items-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isLoading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <div className="mt-4 text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <Link href="/login" className="font-medium text-purple-600 hover:text-purple-700">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
