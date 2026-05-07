import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import dynamic from 'next/dynamic'
import { Users, CheckCircle, Clock, UserCheck, ArrowRight, Plus, ClipboardList, ShieldAlert } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { TaskWithProfile } from '@/types'

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
        .select('id,submitted_at,worker_id,task_id,status,profiles!worker_id(full_name),tasks(title)')
        .eq('status', 'pending_review')
        .order('submitted_at', { ascending: false })
        .limit(5),
      supabase
        .from('tasks')
        .select('id,title,priority,status,due_date,created_at,assigned_to,profiles!assigned_to(full_name)')
        .order('created_at', { ascending: false }),
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

    const recentTasks = (recentTasksResult.data || []) as TaskWithProfile[]

    return (
      <div className="space-y-8">
        <PageHeader title="Admin Dashboard" subtitle="Global overview of team performance." />

        {/* KPI row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6">
          <StatusCard
            icon={Users}
            label="Team Outreach"
            count={outreach}
            color="blue"
          />
          <StatusCard
            icon={CheckCircle}
            label="Task Completions"
            count={completions}
            color="green"
          />
          <StatusCard
            icon={Clock}
            label="Pending Review"
            count={pending}
            color="yellow"
          />
          <StatusCard
            icon={UserCheck}
            label="Active Interns"
            count={active}
            color="purple"
          />
          <StatusCard
            icon={CheckCircle}
            label="Completion Rate"
            count={completionRate}
            color="green"
          />
          <StatusCard
            icon={ShieldAlert}
            label="Pending Approvals"
            count={pendingApprovals}
            color="red"
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
              <span className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-brand-purple" />
                Task Status
              </span>
              <div className="flex items-center gap-2">
                <Button asChild variant="ghost" size="sm" className="text-gray-500 hover:text-brand-purple">
                  <Link href="/admin/tasks/status">View All</Link>
                </Button>
                <Button asChild variant="ghost" size="sm" className="text-brand-purple hover:text-brand-purple hover:bg-brand-purple/10">
                  <Link href="/admin/tasks/new" className="flex items-center gap-1">
                    <Plus className="h-4 w-4" />
                    New Task
                  </Link>
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentTasks.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed">
                <div className="text-gray-400 mb-2">📋</div>
                <div className="text-sm text-gray-500">No tasks found. Create your first task to get started.</div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead>
                    <tr className="border-b text-gray-500 font-medium">
                      <th className="pb-3 pl-2">Task</th>
                      <th className="pb-3">Assignee</th>
                      <th className="pb-3">Status</th>
                      <th className="pb-3">Priority</th>
                      <th className="pb-3">Due Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {recentTasks.map((t) => (
                      <tr key={t.id} className="hover:bg-gray-50/50 transition-colors group">
                        <td className="py-4 pl-2">
                          <div className="font-medium text-gray-900 group-hover:text-brand-purple transition-colors">{t.title}</div>
                          <div className="text-xs text-gray-400 mt-0.5">ID: {t.id.slice(0, 8)}</div>
                        </td>
                        <td className="py-4">
                          <div className="flex items-center gap-2">
                            <div className="h-7 w-7 rounded-full bg-brand-purple/10 text-brand-purple flex items-center justify-center text-[10px] font-bold">
                              {(t.profiles?.full_name || 'U').slice(0, 2).toUpperCase()}
                            </div>
                            <span className="text-gray-700">{t.profiles?.full_name || 'Unassigned'}</span>
                          </div>
                        </td>
                        <td className="py-4">
                          <Badge variant="outline" className={`capitalize ${
                            t.status === 'completed' ? 'border-green-200 bg-green-50 text-green-700' :
                            t.status === 'in_progress' ? 'border-blue-200 bg-blue-50 text-blue-700' :
                            t.status === 'under_review' ? 'border-amber-200 bg-amber-50 text-amber-700' :
                            'border-gray-200 bg-gray-50 text-gray-600'
                          }`}>
                            {t.status.replace('_', ' ')}
                          </Badge>
                        </td>
                        <td className="py-4">
                          <Badge
                            variant="secondary"
                            className={
                              t.priority === 'high'
                                ? 'bg-red-50 text-red-700 border-red-100'
                                : t.priority === 'medium'
                                  ? 'bg-amber-50 text-amber-700 border-amber-100'
                                  : 'bg-emerald-50 text-emerald-700 border-emerald-100'
                            }
                          >
                            {t.priority}
                          </Badge>
                        </td>
                        <td className="py-4 text-gray-500">
                          {t.due_date ? new Date(t.due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'No date'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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