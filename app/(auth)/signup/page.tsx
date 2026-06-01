'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, ChevronDown, Check } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import dgLogo from '@/app/DGlogo.png'

/* ─── Role options ──────────────────────────────────────────────────── */
const JOB_ROLES = [
  { value: 'intern', label: 'Intern' },
  { value: 'team_member', label: 'Team Member' },
  { value: 'worker', label: 'Worker' },
]

/* ─── Custom themed role dropdown ───────────────────────────────────── */
function RoleDropdown({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const selected = JOB_ROLES.find(r => r.value === value)

  return (
    <div ref={ref} className="relative w-full" id="reg-role">
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className={`input-glass w-full h-12 px-4 rounded-xl text-xs font-semibold flex items-center justify-between gap-2 text-left focus:outline-none ${
          open ? 'border-dggYellow shadow-[0_0_0_1px_#F2B42C44]' : ''
        }`}
      >
        <span className={selected ? 'text-white' : 'text-white/38'}>
          {selected ? selected.label : 'Select your role...'}
        </span>
        <ChevronDown
          size={14}
          className={`flex-shrink-0 text-white/50 transition-transform duration-200 ${open ? 'rotate-180 text-dggYellow' : ''}`}
        />
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute z-50 top-[calc(100%+6px)] left-0 w-full rounded-xl overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.7)] border border-white/10"
          style={{ background: 'rgba(13,6,20,0.97)', backdropFilter: 'blur(20px)' }}
        >
          {JOB_ROLES.map(role => (
            <button
              key={role.value}
              type="button"
              onClick={() => { onChange(role.value); setOpen(false) }}
              className={`w-full flex items-center justify-between px-4 py-3 text-xs font-semibold transition-colors text-left ${
                value === role.value
                  ? 'bg-dggYellow/15 text-dggYellow'
                  : 'text-white/80 hover:bg-white/8 hover:text-white'
              }`}
            >
              {role.label}
              {value === role.value && <Check size={12} className="text-dggYellow flex-shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/* ─── Live clock (copied pattern from login) ─────────────────────────── */
function useLiveClock() {
  const [time, setTime] = useState({ clock: '00:00:00 WAT', date: '' })
  useEffect(() => {
    const tick = () => {
      const now = new Date()
      const h = String(now.getHours()).padStart(2, '0')
      const m = String(now.getMinutes()).padStart(2, '0')
      const s = String(now.getSeconds()).padStart(2, '0')
      const dateStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      setTime({ clock: `${h}:${m}:${s} WAT`, date: dateStr })
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])
  return time
}

/* ─── Video Background ──────────────────────────────────────────────── */
function VideoBackground() {
  const [visible, setVisible] = useState(false)

  return (
    <div className="absolute inset-0 w-full h-full z-0 overflow-hidden pointer-events-none">
      <div className="absolute inset-0 bg-gradient-to-br from-dggDark via-dggDark/60 to-transparent z-10" />
      <video
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        onCanPlay={() => setVisible(true)}
        className={`w-full h-full object-cover transition-opacity duration-700 ease-in-out ${visible ? 'opacity-100' : 'opacity-0'}`}
        src="/workspace-video.mp4"
      />
    </div>
  )
}

/* ─── HUD Header ────────────────────────────────────────────────────── */
function HudHeader() {
  const { clock, date } = useLiveClock()
  return (
    <header className="absolute top-0 inset-x-0 z-20 p-4 sm:p-6 flex flex-col md:flex-row items-center justify-between gap-3 pointer-events-none w-full">
      <div className="bg-black/50 border border-white/10 px-4 py-2 rounded-2xl backdrop-blur-md flex items-center h-8 pointer-events-auto">
        <span className="text-[10px] font-grotesk font-bold text-white tracking-widest uppercase flex items-center">
          <span className="typewriter-text">DGG-WorkSpace Ecosystem...</span>
        </span>
      </div>
      <div className="flex items-center justify-center gap-2 sm:gap-3 pointer-events-auto w-full md:w-auto">
        <div className="bg-black/50 border border-white/10 px-3 sm:px-4 py-1.5 rounded-xl backdrop-blur-md text-left">
          <p className="text-[9px] font-black tracking-wider text-dggYellow uppercase leading-none">Lagos, NG</p>
          <p className="text-[9px] font-grotesk text-white/50 mt-1">29°C · Scattered</p>
        </div>
        <div className="bg-black/50 border border-white/10 px-3 sm:px-4 py-1.5 rounded-xl backdrop-blur-md flex flex-col justify-center text-right min-w-[125px] sm:min-w-[140px] h-[38px]">
          <span className="text-[11px] sm:text-xs font-grotesk font-bold text-white tracking-wide leading-none">{clock}</span>
          <span className="text-[8px] font-bold text-white/40 tracking-widest uppercase mt-1 leading-none">{date}</span>
        </div>
      </div>
    </header>
  )
}

/* ─── Footer ────────────────────────────────────────────────────────── */
function HudFooter() {
  return (
    <footer className="absolute bottom-0 inset-x-0 z-20 p-4 sm:p-6 flex flex-col md:flex-row items-center justify-between gap-4 bg-gradient-to-t from-black/90 via-black/50 to-transparent pt-10 text-center w-full pointer-events-none">
      <div className="text-[10px] sm:text-[11px] font-medium text-white/30 tracking-wide w-full text-center">
        © 2026 D-Global Growthfield. All Rights Reserved.
      </div>
    </footer>
  )
}

/* ─── Step label pill ───────────────────────────────────────────────── */
function StepLabel({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-1.5 mb-3">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className="h-1 flex-1 rounded-full transition-all duration-300"
          style={{ backgroundColor: i <= current ? '#F2B42C' : 'rgba(255,255,255,0.15)' }}
        />
      ))}
    </div>
  )
}

/* ─── Input wrapper ─────────────────────────────────────────────────── */
function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="block text-[10px] font-black uppercase tracking-wider text-white/70 mb-2 pl-1">{children}</label>
}

/* ─── Main Page ─────────────────────────────────────────────────────── */
export default function SignupPage() {
  const router = useRouter()
  const STEPS = 5

  const [step, setStep] = useState(0)
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
  const [isLoading, setIsLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  // Slide key forces re-animation
  const [slideKey, setSlideKey] = useState(0)

  const validateStep = (): boolean => {
    setError('')
    if (step === 0 && !fullName.trim()) { setError('Please enter your full name.'); return false }
    if (step === 1 && !email.trim()) { setError('Please enter your email address.'); return false }
    if (step === 3 && !jobRole) { setError('Please select your workspace role.'); return false }
    if (step === 4) {
      if (password.length < 6) { setError('Password must be at least 6 characters.'); return false }
      if (password !== confirmPassword) { setError('Passwords do not match.'); return false }
    }
    return true
  }

  const next = () => {
    if (!validateStep()) return
    if (step < STEPS - 1) { setStep(s => s + 1); setSlideKey(k => k + 1) }
    else handleSignup()
  }

  const back = () => {
    setError('')
    if (step === 0) router.push('/login')
    else { setStep(s => s - 1); setSlideKey(k => k + 1) }
  }

  const handleSignup = async () => {
    setIsLoading(true)
    setError('')

    try {
      const { data, error: signupError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName.trim() } },
      })

      if (signupError) { setError(signupError.message); setIsLoading(false); return }
      if (!data.user?.id) { setError('Account created but no user ID returned.'); setIsLoading(false); return }

      await supabase.from('profiles').update({
        phone: phoneNumber.trim(),
        location: location.trim(),
        job_role: jobRole,
      }).eq('id', data.user.id)

      await supabase.auth.signOut()
      setSuccess(true)
      setTimeout(() => router.push('/login'), 2200)
    } catch (err) {
      const typedError = err as { message?: string }
      setError(typedError.message || 'Failed to create account')
      setIsLoading(false)
    }
  }

  const stepLabels = ['Full Name', 'Email', 'Contact', 'Role', 'Password']

  return (
    <div
      className="min-h-screen text-white overflow-y-auto lg:overflow-hidden flex items-center justify-center relative p-4 pb-28 pt-28 lg:py-4 selection:bg-dggYellow selection:text-dggPurple"
      style={{ backgroundColor: '#07020d', fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      <VideoBackground />
      <HudHeader />

      <main className="w-full max-w-[450px] z-20 transition-all duration-300 my-auto">

        {/* Branding */}
        <div className="text-center mb-5">
          <div className="w-12 h-12 bg-white/95 rounded-2xl mx-auto flex items-center justify-center shadow-lg mb-3 border border-white/20 overflow-hidden">
            <Image src={dgLogo} alt="DGG logo" width={48} height={48} className="h-full w-full object-contain" priority />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white leading-none">
            {success ? 'Account Created!' : 'Create Account'}
          </h1>
          <p className="text-xs text-white/60 mt-2">
            {success ? 'Awaiting admin approval — redirecting…' : 'Request access to the DGG-Workspace'}
          </p>
        </div>

        {/* Glass card */}
        <div className="glass-card-auth rounded-[2rem] sm:rounded-[2.5rem] p-5 sm:p-8 shadow-[0_40px_80px_rgba(0,0,0,0.6)] relative mx-auto">

          {/* Success state */}
          {success ? (
            <div className="text-center py-10">
              <span className="text-4xl block animate-bounce">✅</span>
              <h3 className="text-lg font-black text-dggYellow uppercase tracking-widest mt-4">Account Submitted</h3>
              <p className="text-xs text-white/50 font-grotesk mt-2">Your request is pending admin approval.<br />You will be redirected to login shortly.</p>
            </div>
          ) : (
            <>
              {/* Progress bar */}
              <StepLabel current={step} total={STEPS} />

              {/* Step indicator */}
              <p className="text-[9px] font-grotesk font-bold text-white/40 uppercase tracking-widest mb-4 pl-0.5">
                Step {step + 1} of {STEPS} — {stepLabels[step]}
              </p>

              {/* Step slides */}
              <div key={slideKey} className="step-active space-y-4 min-h-[90px]">

                {/* Step 0: Full Name */}
                {step === 0 && (
                  <div className="text-left">
                    <FieldLabel>Full Name *</FieldLabel>
                    <input
                      id="reg-name"
                      type="text"
                      autoFocus
                      placeholder="Enter your full name"
                      value={fullName}
                      onChange={e => setFullName(e.target.value)}
                      className="input-glass w-full h-12 px-4 rounded-xl text-xs font-semibold"
                    />
                  </div>
                )}

                {/* Step 1: Email */}
                {step === 1 && (
                  <div className="text-left">
                    <FieldLabel>Email Address *</FieldLabel>
                    <input
                      id="reg-email"
                      type="email"
                      autoFocus
                      placeholder="Enter your corporate email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="input-glass w-full h-12 px-4 rounded-xl text-xs font-semibold"
                    />
                  </div>
                )}

                {/* Step 2: Phone & Location */}
                {step === 2 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
                    <div>
                      <FieldLabel>Phone Number</FieldLabel>
                      <input
                        id="reg-phone"
                        type="tel"
                        placeholder="+234 567 890"
                        value={phoneNumber}
                        onChange={e => setPhoneNumber(e.target.value)}
                        className="input-glass w-full h-12 px-4 rounded-xl text-xs font-semibold"
                      />
                    </div>
                    <div>
                      <FieldLabel>Location</FieldLabel>
                      <input
                        id="reg-location"
                        type="text"
                        placeholder="City, Country"
                        value={location}
                        onChange={e => setLocation(e.target.value)}
                        className="input-glass w-full h-12 px-4 rounded-xl text-xs font-semibold"
                      />
                    </div>
                  </div>
                )}

                {/* Step 3: Role */}
                {step === 3 && (
                  <div className="text-left">
                    <FieldLabel>Select Your Workspace Role *</FieldLabel>
                    <RoleDropdown value={jobRole} onChange={setJobRole} />
                  </div>
                )}

                {/* Step 4: Password */}
                {step === 4 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
                    <div>
                      <FieldLabel>Password *</FieldLabel>
                      <div className="relative">
                        <input
                          id="reg-password"
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Min 6 characters"
                          value={password}
                          onChange={e => setPassword(e.target.value)}
                          className="input-glass w-full h-12 px-4 pr-10 rounded-xl text-xs font-semibold"
                        />
                        <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/80 transition-colors focus:outline-none">
                          {showPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <FieldLabel>Repeat Password *</FieldLabel>
                      <div className="relative">
                        <input
                          id="reg-confirm-password"
                          type={showConfirmPassword ? 'text' : 'password'}
                          placeholder="Repeat password"
                          value={confirmPassword}
                          onChange={e => setConfirmPassword(e.target.value)}
                          className={`input-glass w-full h-12 px-4 pr-10 rounded-xl text-xs font-semibold ${confirmPassword && password !== confirmPassword ? 'border-red-400/70' : ''}`}
                        />
                        <button type="button" onClick={() => setShowConfirmPassword(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/80 transition-colors focus:outline-none">
                          {showConfirmPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                        </button>
                      </div>
                      {confirmPassword && password !== confirmPassword && (
                        <p className="text-[9px] text-red-400 mt-1 pl-1">Passwords do not match</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Error */}
              {error && (
                <div className="bg-red-500/20 border border-red-500/30 text-red-300 px-4 py-2.5 rounded-xl text-xs font-medium mt-3">
                  {error}
                </div>
              )}

              {/* Navigation */}
              <div className="flex items-center justify-between border-t border-white/10 pt-4 mt-5">
                <button
                  type="button"
                  onClick={back}
                  className="px-3 py-2 rounded-xl text-xs font-bold text-white/40 hover:text-white transition-colors focus:outline-none cursor-pointer bg-transparent border-0"
                >
                  {step === 0 ? '← Cancel To Login' : '← Back'}
                </button>
                <button
                  type="button"
                  onClick={next}
                  disabled={isLoading}
                  className={`px-5 py-2.5 font-black text-xs uppercase tracking-widest rounded-xl hover:opacity-95 shadow-md transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                    step === STEPS - 1
                      ? 'bg-emerald-500 text-white'
                      : 'bg-dggYellow text-dggPurple'
                  }`}
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <span className="animate-spin rounded-full h-3 w-3 border-b-2 border-current" />
                      Creating...
                    </span>
                  ) : step === STEPS - 1 ? 'Create Account ✓' : 'Next Step →'}
                </button>
              </div>

              {/* Login link */}
              <p className="text-center text-xs text-white/60 mt-3">
                Already have an account?{' '}
                <a href="/login" className="text-dggYellow font-bold hover:underline">Sign in</a>
              </p>
            </>
          )}
        </div>
      </main>

      <HudFooter />
    </div>
  )
}
