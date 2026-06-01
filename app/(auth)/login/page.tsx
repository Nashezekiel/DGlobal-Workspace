'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { supabase } from '@/lib/supabase/client'
import { Eye, EyeOff, X } from 'lucide-react'
import dgLogo from '@/app/DGlogo.png'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

/* ─── Modal content ────────────────────────────────────────────────── */
const TERMS_CONTENT = [
  {
    title: '1. Active Operational Shifts',
    body: 'All staff members, remote personnel, and active interns must maintain full connectivity and system availability between 7:00 AM and 11:00 AM, Monday through Friday. Mandatory team sync logs must be updated continuously during this block.',
  },
  {
    title: '2. Weekly Project Hard Deadlines',
    body: 'All modular task updates, architectural commits, and performance briefs must be completed and pushed through the submission console before 12:30 PM every single Friday without exception.',
  },
  {
    title: '3. Automated Content Engagement Velocity',
    body: 'Personnel are strictly required to track official corporate handles across LinkedIn, Facebook, Instagram, and TikTok. You must actively like, repost, and provide constructive professional commentary on newly published brand media within 60 minutes of release.',
  },
  {
    title: '4. Outreach Commissions & 20% ROI Payouts',
    body: 'Every verified client acquisition or conversion brought in via outreach pathways triggers an instant, direct 20% Return on Investment (ROI) cash commission credit. Consistently hitting targets unlocks senior workspace tiers and technical bonuses.',
  },
  {
    title: '5. Backend Structural Confidentiality',
    body: 'You are strictly prohibited from publicly showcasing, broadcasting, or screenshotting workspace backend structures, database nodes, private dashboard views, or active server setups. Any breach leads to immediate termination and security review.',
  },
  {
    title: '6. Absence Mitigation Framework',
    body: 'If an unavoidable schedule disruption causes you to miss a scheduled meeting or sprint, you must formally notify the system administration team within a strict 24 to 48-hour advance notice window.',
  },
]

const WORKFLOW_CONTENT = [
  { accent: '#F2B42C', title: 'Phase A: Workspace Sign-In & Onboarding', body: 'Log in through your secure terminal port or use the progressive step-by-step onboarding layout wizard to select your specific technical workspace profile role.' },
  { accent: '#512D7C', title: 'Phase B: The Direct Outreach & 20% ROI System', body: 'Deploy assigned keyword structures and promotional media schedules. Track your traffic leads, and see your 20% performance incentives compile automatically as payments clear through Paystack.' },
  { accent: '#F2B42C', title: 'Phase C: Weekly Code & Task Submission', body: 'Build out your project objectives and submit your modules via the tracking dashboard before the Friday 12:30 PM cutoff to clear your verification review ledger.' },
  { accent: '#512D7C', title: 'Phase D: Brand Social Engagement Synchronization', body: 'Maintain real-time alignment with standard engagement protocols across LinkedIn, Instagram, and TikTok channels to secure optimization pacing metrics.' },
  { accent: '#10b981', title: 'Phase E: Continuous LMS Academic Pacing', body: 'Bridge directly over into your localized portal at learning.dglobalgrowthfield.com to build your core developer roadmap skills and review academic milestones.' },
]

/* ─── Live clock ────────────────────────────────────────────────────── */
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
function HudFooter({ onOpenModal }: { onOpenModal: (type: 'terms' | 'workflow') => void }) {
  return (
    <footer className="absolute bottom-0 inset-x-0 z-20 p-4 sm:p-6 flex flex-col md:flex-row items-center justify-between gap-4 bg-gradient-to-t from-black/90 via-black/50 to-transparent pt-10 text-center w-full">
      <div className="flex flex-row items-center justify-center gap-6 text-[11px] sm:text-xs font-bold tracking-wide w-full md:w-auto order-1">
        <button onClick={() => onOpenModal('terms')} className="text-white/60 hover:text-white transition-colors bg-transparent border-0 cursor-pointer focus:outline-none">
          Terms & Conditions <span className="text-[10px] text-dggYellow">→</span>
        </button>
        <button onClick={() => onOpenModal('workflow')} className="text-white/60 hover:text-white transition-colors bg-transparent border-0 cursor-pointer focus:outline-none">
          How It Works <span className="text-[10px] text-dggYellow">→</span>
        </button>
      </div>
      <div className="text-[10px] sm:text-[11px] font-medium text-white/30 tracking-wide order-3 md:order-2 w-full md:w-auto mt-1 md:mt-0">
        © 2026 D-Global Growthfield. All Rights Reserved.
      </div>
      <div className="flex flex-row md:flex-col items-center justify-center md:items-end gap-x-6 gap-y-0.5 font-bold text-[11px] sm:text-xs w-full md:w-auto order-2 md:order-3">
        <a href="https://dglobalgrowthfield.com/" target="_blank" rel="noopener noreferrer" className="text-dggYellow hover:underline inline-flex items-center gap-1 transition-colors">
          Visit Website <span className="text-[9px]">→</span>
        </a>
        <a href="https://learning.dglobalgrowthfield.com/" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline inline-flex items-center gap-1 transition-colors">
          Visit LMS <span className="text-[9px]">→</span>
        </a>
      </div>
    </footer>
  )
}

/* ─── Info Modal ────────────────────────────────────────────────────── */
function InfoModal({ open, type, onClose }: { open: boolean; type: 'terms' | 'workflow' | null; onClose: () => void }) {
  const isTerms = type === 'terms'
  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${open ? '' : 'hidden'}`}>
      <div onClick={onClose} className="absolute inset-0 bg-dggDark/80 backdrop-blur-md cursor-pointer" />
      <div className="modal-zoom relative w-full md:w-[40%] bg-white text-slate-900 border border-neutral-200 rounded-[2.5rem] p-6 sm:p-8 shadow-[0_60px_120px_rgba(0,0,0,0.7)] flex flex-col h-[75vh] max-h-[600px] z-10 overflow-hidden">
        <div className="flex items-center justify-between border-b border-neutral-100 pb-3.5 flex-shrink-0">
          <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-dggPurple">
            {isTerms ? 'Internal Code of Conduct (T&C)' : 'Interactive Operational Guide'}
          </h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-red-500 transition-colors flex items-center justify-center text-xs font-black focus:outline-none cursor-pointer border-0">✕</button>
        </div>
        <div className="py-4 overflow-y-auto text-xs text-slate-600 leading-relaxed font-medium flex-grow pr-1 space-y-4">
          {isTerms
            ? TERMS_CONTENT.map((item, i) => (
                <div key={i}>
                  <h4 className="font-bold text-dggPurple uppercase text-[10px] tracking-wider mb-1">{item.title}</h4>
                  <p className="text-slate-600 pl-1">{item.body}</p>
                </div>
              ))
            : WORKFLOW_CONTENT.map((item, i) => (
                <div key={i} className="pl-3" style={{ borderLeft: `2px solid ${item.accent}` }}>
                  <h4 className="font-bold text-slate-800 text-[11px] uppercase tracking-wider">{item.title}</h4>
                  <p className="text-slate-600 mt-0.5">{item.body}</p>
                </div>
              ))
          }
        </div>
        <div className="pt-3.5 border-t border-neutral-100 flex items-center justify-end flex-shrink-0">
          <button onClick={onClose} className="px-5 py-2.5 bg-dggPurple text-white font-black text-[10px] uppercase tracking-wider rounded-xl hover:opacity-95 shadow-md cursor-pointer border-0">
            Acknowledge & Close
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── Main Page ─────────────────────────────────────────────────────── */
export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showPendingModal, setShowPendingModal] = useState(false)
  const [fullName, setFullName] = useState('')
  const [modalType, setModalType] = useState<'terms' | 'workflow' | null>(null)
  const [success, setSuccess] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })

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

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('approval_status, role, full_name')
        .eq('id', data.user.id)
        .single()

      if (profileError || !profile) {
        setError('Profile not found. Please complete signup first.')
        setIsLoading(false)
        return
      }

      if (profile.approval_status === 'pending') {
        setFullName(profile.full_name || '')
        setShowPendingModal(true)
        setIsLoading(false)
        return
      }

      if (profile.approval_status === 'rejected') {
        setError('Your account has been rejected. Please contact an administrator.')
        setIsLoading(false)
        return
      }

      setSuccess(true)
      setTimeout(() => {
        if (profile.role === 'admin') {
          window.location.href = '/admin/dashboard'
        } else {
          window.location.href = '/dashboard'
        }
      }, 1600)
    } catch (err: unknown) {
      const e = err as { message?: string }
      setError(e.message || 'Failed to sign in')
      setIsLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen text-white overflow-y-auto lg:overflow-hidden flex items-center justify-center relative p-4 pb-32 pt-28 lg:py-4 selection:bg-dggYellow selection:text-dggPurple"
      style={{ backgroundColor: '#07020d', fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      {/* Background video */}
      <VideoBackground />

      {/* HUD */}
      <HudHeader />

      {/* Auth Card */}
      <main className="w-full max-w-[450px] z-20 transition-all duration-300 my-auto">

        {/* Top branding */}
        <div className="text-center mb-5">
          <div className="w-12 h-12 bg-white/95 rounded-2xl mx-auto flex items-center justify-center shadow-lg mb-3 border border-white/20 overflow-hidden">
            <Image src={dgLogo} alt="DGG logo" width={48} height={48} className="h-full w-full object-contain" priority />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white leading-none">
            Welcome to DGG-Workspace
          </h1>
          <p className="text-xs text-white/60 mt-2">Sign in to access your workspace</p>
        </div>

        {/* Glass card */}
        <div className="glass-card-auth rounded-[2rem] sm:rounded-[2.5rem] p-5 sm:p-8 shadow-[0_40px_80px_rgba(0,0,0,0.6)] relative mx-auto">

          {/* Success state */}
          {success ? (
            <div className="text-center py-10">
              <span className="text-4xl block animate-bounce">🔓</span>
              <h3 className="text-lg font-black text-dggYellow uppercase tracking-widest mt-4">Access Cleared</h3>
              <p className="text-xs text-white/50 font-grotesk mt-1">Deploying platform workspace elements...</p>
            </div>
          ) : (
            <form onSubmit={handleLogin} className="space-y-4">

              {/* Email */}
              <div className="text-left">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-white/70 mb-1.5 pl-1">
                  Email Address
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 text-xs">✉️</span>
                  <input
                    id="login-email"
                    type="email"
                    required
                    placeholder="Enter email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="input-glass w-full h-12 pl-10 pr-4 py-2 rounded-xl text-xs font-semibold"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="text-left">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-white/70 mb-1.5 pl-1">
                  Password
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 text-xs">🔒</span>
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="input-glass w-full h-12 pl-10 pr-12 py-2 rounded-xl text-xs font-semibold"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/80 transition-colors focus:outline-none"
                  >
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="bg-red-500/20 border border-red-500/30 text-red-300 px-4 py-2.5 rounded-xl text-xs font-medium">
                  {error}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-black text-xs uppercase tracking-widest rounded-xl hover:opacity-95 shadow-md transition-all mt-2 cursor-pointer select-none disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white" />
                    Signing in...
                  </span>
                ) : 'Sign in'}
              </button>

              <p className="text-center text-xs text-white/60 pt-1">
                Don&apos;t have an account?{' '}
                <a href="/signup" className="text-dggYellow font-bold hover:underline">Sign up</a>
              </p>
            </form>
          )}
        </div>
      </main>

      {/* Footer */}
      <HudFooter onOpenModal={t => setModalType(t)} />

      {/* Info Modals */}
      <InfoModal open={!!modalType} type={modalType} onClose={() => setModalType(null)} />

      {/* Pending Approval Dialog */}
      <Dialog open={showPendingModal} onOpenChange={setShowPendingModal}>
        <DialogContent className="sm:max-w-md bg-white text-slate-900 rounded-3xl border-0 shadow-2xl">
          <DialogHeader>
            <button
              onClick={() => { setShowPendingModal(false); supabase.auth.signOut() }}
              className="absolute right-4 top-4 rounded-full w-8 h-8 flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-red-500 transition-colors focus:outline-none"
            >
              <X className="h-4 w-4" />
            </button>
            <DialogTitle className="flex items-center gap-2 text-dggPurple">
              ⏳ Account Pending Approval
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-gray-600 text-sm">
              Hello{fullName && `, ${fullName}`}! Your account is currently pending approval from an administrator.
            </p>
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-xl">
                <span className="text-blue-500 text-sm mt-0.5">📋</span>
                <div>
                  <p className="font-semibold text-blue-900 text-sm">What happens next?</p>
                  <p className="text-xs text-blue-700">An administrator will review your account and approve it shortly.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-purple-50 rounded-xl">
                <span className="text-purple-500 text-sm mt-0.5">⏰</span>
                <div>
                  <p className="font-semibold text-purple-900 text-sm">How long will it take?</p>
                  <p className="text-xs text-purple-700">Approval typically happens within 24–48 hours during business days.</p>
                </div>
              </div>
            </div>
            <button
              onClick={() => { setShowPendingModal(false); supabase.auth.signOut() }}
              className="w-full mt-2 py-2.5 px-4 bg-dggPurple text-white rounded-xl text-sm font-bold hover:opacity-90 transition-opacity"
            >
              Sign out
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}