'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Clock, CheckCircle, XCircle } from 'lucide-react'

export default function PendingApprovalPage() {
  const router = useRouter()
  const [fullName, setFullName] = useState('')

  useEffect(() => {
    checkApprovalStatus()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const checkApprovalStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, approval_status')
      .eq('id', user.id)
      .single()

    if (profile) {
      setFullName(profile.full_name || '')
      if (profile.approval_status === 'approved') {
        const { data: roleData } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()

        if (roleData?.role === 'admin') {
          router.push('/admin/dashboard')
        } else {
          router.push('/dashboard')
        }
      }
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Clock className="h-8 w-8 text-yellow-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Account Pending Approval
            </h1>
            <p className="text-gray-600 mb-6">
              Hello{fullName && `, ${fullName}`}! Your account is currently pending approval from an administrator.
            </p>
            <div className="space-y-4 text-left">
              <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg">
                <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="font-medium text-blue-900">What happens next?</p>
                  <p className="text-sm text-blue-700">
                    An administrator will review your account and approve it shortly.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 bg-purple-50 rounded-lg">
                <Clock className="h-5 w-5 text-purple-600 mt-0.5" />
                <div>
                  <p className="font-medium text-purple-900">How long will it take?</p>
                  <p className="text-sm text-purple-700">
                    Approval typically happens within 24-48 hours during business days.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                <XCircle className="h-5 w-5 text-gray-600 mt-0.5" />
                <div>
                  <p className="font-medium text-gray-900">Need help?</p>
                  <p className="text-sm text-gray-700">
                    Contact your administrator if you need immediate assistance.
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-8 pt-6 border-t">
              <button
                onClick={handleLogout}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Sign out
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
