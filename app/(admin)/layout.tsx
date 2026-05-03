import { createClient } from '@/lib/supabase/server'
import { AdminShell } from '@/components/admin/AdminShell'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createClient()

  const { count: pendingUsersCount } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('approval_status', 'pending')

  const { count: reviewTasksCount } = await supabase
    .from('tasks')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'under_review')

  return (
    <AdminShell 
      initialPendingUsersCount={pendingUsersCount || 0}
      initialReviewTasksCount={reviewTasksCount || 0}
    >
      {children}
    </AdminShell>
  )
}