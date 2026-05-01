import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Clock, Check, X, Mail, User } from 'lucide-react'
import type { Profile } from '@/types'

export default async function UserApprovalsPage() {
  const supabase = createClient()

  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    redirect('/login')
  }

  // Verify admin role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') {
    redirect('/admin/dashboard')
  }

  // Fetch pending users
  const { data: pendingUsers } = await supabase
    .from('profiles')
    .select('id,email,full_name,role,created_at')
    .eq('approval_status', 'pending')
    .order('created_at', { ascending: false })

  const handleApprove = async (userId: string) => {
    'use server'
    const supabase = createClient()
    await supabase
      .from('profiles')
      .update({ approval_status: 'approved' })
      .eq('id', userId)
    revalidatePath('/admin/user-approvals')
    revalidatePath('/user-approvals')
  }

  const handleReject = async (userId: string) => {
    'use server'
    const supabase = createClient()
    await supabase
      .from('profiles')
      .update({ approval_status: 'rejected' })
      .eq('id', userId)
    revalidatePath('/admin/user-approvals')
    revalidatePath('/user-approvals')
  }

  return (
    <div className="space-y-6">
      <PageHeader 
        title="User Approvals" 
        subtitle="Review and approve pending worker accounts"
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Pending Accounts ({pendingUsers?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pendingUsers && pendingUsers.length > 0 ? (
            <div className="space-y-4">
              {pendingUsers.map((user: Pick<Profile, 'id' | 'email' | 'full_name' | 'role'> & { created_at?: string }) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0 h-12 w-12 bg-purple-100 rounded-full flex items-center justify-center">
                      <User className="h-6 w-6 text-purple-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">{user.full_name}</h3>
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <Mail className="h-4 w-4" />
                        <span>{user.email}</span>
                      </div>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge variant="secondary">{user.role}</Badge>
                        <span className="text-xs text-gray-500">
                          Applied {user.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <form action={handleApprove.bind(null, user.id)}>
                      <Button
                        type="submit"
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
                    </form>
                    <form action={handleReject.bind(null, user.id)}>
                      <Button
                        type="submit"
                        size="sm"
                        variant="destructive"
                      >
                        <X className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                    </form>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Clock className="h-12 w-12 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">No pending accounts to review</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
