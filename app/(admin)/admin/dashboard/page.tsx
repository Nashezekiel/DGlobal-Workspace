import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import dynamic from 'next/dynamic'
import { Users, CheckCircle, Clock, UserCheck, ArrowRight, Plus, ClipboardList, ShieldAlert } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

// Dynamic imports to defer loading of heavy components
const StatusCard = dynamic(() => import('@/components/StatusCard').then(mod => ({ default: mod.StatusCard })), {
  loading: () => <div className="h-24 bg-gray-100 rounded-xl animate-pulse" />
})
const PageHeader = dynamic(() => import('@/components/PageHeader').then(mod => ({ default: mod.PageHeader })))

export default async function AdminDashboardPage() {
  try {
    const supabase = createClient()

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      redirect('/login')
    }

    // Check if admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || profile?.role !== 'admin') {
      redirect('/dashboard')
    }

    // Fetch metrics + lightweight recent items
    const [
      outreachResult,
      completionsResult,
      pendingResult,
      activeResult,
      pendingApprovalsResult,
      recentPendingSubmissionsResult,
      recentTasksResult,
    ] = await Promise.all([
      supabase
        .from('submissions')
        .select('id', { count: 'exact', head: true }),
      supabase
        .from('tasks')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'completed'),
      supabase
        .from('submissions')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending_review'),
      supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('role', 'worker'),
      supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('approval_status', 'pending'),
      supabase
        .from('submissions')
        .select('id,submitted_at,worker_id,task_id,status,profiles(full_name),tasks(title)')
        .eq('status', 'pending_review')
        .order('submitted_at', { ascending: false })
        .limit(5),
      supabase
        .from('tasks')
        .select('id,title,priority,status,due_date,created_at')
        .order('created_at', { ascending: false })
        .limit(5),
    ])

    const outreach = outreachResult.count || 0
    const completions = completionsResult.count || 0
    const pending = pendingResult.count || 0
    const active = activeResult.count || 0
    const pendingApprovals = pendingApprovalsResult.count || 0

    // Calculate additional metrics
    const totalTasks = completions + pending + outreach
    const completionRate = totalTasks > 0 ? Math.round((completions / totalTasks) * 100) : 0

    const recentPendingSubmissions = (recentPendingSubmissionsResult.data || []) as Array<{
      id: string
      submitted_at: string
      status: string
      profiles?: { full_name?: string } | null
      tasks?: { title?: string } | null
    }>

    const recentTasks = (recentTasksResult.data || []) as Array<{
      id: string
      title: string
      priority: 'low' | 'medium' | 'high'
      status: string
      due_date: string | null
      created_at: string
    }>

    return (
      <div className="space-y-8">
        <PageHeader title="Admin Dashboard" subtitle="Global overview of team performance." />

        {/* KPI row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6">
          <StatusCard
            icon={Users}
            label="Team Outreach"
            count={outreach}
            color="border-blue-500"
          />
          <StatusCard
            icon={CheckCircle}
            label="Task Completions"
            count={completions}
            color="border-green-500"
          />
          <StatusCard
            icon={Clock}
            label="Pending Review"
            count={pending}
            color="border-yellow-500"
          />
          <StatusCard
            icon={UserCheck}
            label="Active Interns"
            count={active}
            color="border-purple-500"
          />
          <StatusCard
            icon={CheckCircle}
            label="Completion Rate"
            count={completionRate}
            color="border-green-500"
          />
          <StatusCard
            icon={ShieldAlert}
            label="Pending Approvals"
            count={pendingApprovals}
            color="border-red-500"
          />
        </div>

        {/* Quick actions + activity */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <Card className="xl:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Quick actions</span>
                <Badge variant="secondary">Admin</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button asChild className="w-full justify-between">
                <Link href="/admin/tasks/new">
                  <span className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Create task
                  </span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>

              <Button asChild variant="outline" className="w-full justify-between">
                <Link href="/admin/review">
                  <span className="flex items-center gap-2">
                    <ClipboardList className="h-4 w-4" />
                    Review submissions
                  </span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>

              <Button asChild variant="outline" className="w-full justify-between">
                <Link href="/admin/user-approvals">
                  <span className="flex items-center gap-2">
                    <UserCheck className="h-4 w-4" />
                    Approve users
                  </span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>

              <Button asChild variant="outline" className="w-full justify-between">
                <Link href="/admin/team">
                  <span className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Team management
                  </span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="xl:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Pending review (latest 5)</span>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/admin/review">Open queue</Link>
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentPendingSubmissions.length === 0 ? (
                <div className="text-sm text-gray-500">No submissions waiting for review.</div>
              ) : (
                <div className="divide-y rounded-lg border bg-white">
                  {recentPendingSubmissions.map((s) => (
                    <div key={s.id} className="flex items-center justify-between p-4">
                      <div className="min-w-0">
                        <div className="font-medium text-gray-900 truncate">
                          {s.tasks?.title || 'Task'}
                        </div>
                        <div className="text-sm text-gray-500 truncate">
                          {s.profiles?.full_name || 'Intern'} • {new Date(s.submitted_at).toLocaleString()}
                        </div>
                      </div>
                      <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">Pending</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Recently created tasks (latest 5)</span>
              <Button asChild variant="ghost" size="sm">
                <Link href="/admin/tasks/new">Create another</Link>
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentTasks.length === 0 ? (
              <div className="text-sm text-gray-500">No tasks created yet.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {recentTasks.map((t) => (
                  <div key={t.id} className="rounded-lg border bg-white p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-medium text-gray-900 truncate">{t.title}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          Created {new Date(t.created_at).toLocaleDateString()}
                          {t.due_date ? ` • Due ${new Date(t.due_date).toLocaleDateString()}` : ''}
                        </div>
                      </div>
                      <Badge
                        className={
                          t.priority === 'high'
                            ? 'bg-red-100 text-red-700 hover:bg-red-100'
                            : t.priority === 'medium'
                              ? 'bg-amber-100 text-amber-700 hover:bg-amber-100'
                              : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100'
                        }
                      >
                        {t.priority}
                      </Badge>
                    </div>
                    <div className="mt-3">
                      <Badge variant="secondary">{t.status}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    )
  } catch (error) {
    console.error('Admin dashboard error:', error)
    // Only redirect if it's clearly an auth error, not a transient network issue
    const errMsg = (error as Error)?.message || ''
    if (errMsg.includes('Auth') || errMsg.includes('auth') || errMsg.includes('JWT') || errMsg.includes('token')) {
      redirect('/login')
    }
    // For transient errors, show a friendly error state
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <div className="text-gray-400 text-5xl">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-900">Unable to load dashboard</h2>
          <p className="text-gray-500 max-w-md">
            There was a temporary issue loading your data. Please refresh the page to try again.
          </p>
        </div>
      </div>
    )
  }
}