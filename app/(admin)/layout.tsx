import { createClient } from '@/lib/supabase/server'
import { AdminShell } from '@/components/admin/AdminShell'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createClient()

  const { count } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('approval_status', 'pending')

  return <AdminShell initialPendingUsersCount={count || 0}>{children}</AdminShell>
}