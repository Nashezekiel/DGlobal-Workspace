export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import nextDynamic from 'next/dynamic'
import { ClipboardList, CheckCircle, Clock, AlertCircle, TrendingUp, Calendar } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Submission, Task } from '@/types'

// Dynamic imports to defer loading of heavy components
const StatusCard = nextDynamic(() => import('@/components/StatusCard').then(mod => ({ default: mod.StatusCard })), {
  loading: () => <div className="h-24 bg-gray-100 rounded-xl animate-pulse" />
})
const PageHeader = nextDynamic(() => import('@/components/PageHeader').then(mod => ({ default: mod.PageHeader })))
const TaskCard = nextDynamic(() => import('@/components/TaskCard').then(mod => ({ default: mod.TaskCard })), {
  loading: () => <div className="h-32 bg-gray-100 rounded-lg animate-pulse" />
})

export default async function DashboardPage() {
  try {
    const supabase = createClient()

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      redirect('/login')
    }

    const userId = user.id

    // Single optimized query to fetch all tasks and submissions
    const [tasksResult, submissionsResult] = await Promise.all([
      supabase
        .from('tasks')
        .select('*')
        .eq('assigned_to', userId),
      supabase
        .from('submissions')
        .select('*')
        .eq('worker_id', userId)
    ])

    const allTasks: Task[] = (tasksResult.data || []) as Task[]
    const allSubmissions: Submission[] = (submissionsResult.data || []) as Submission[]

    // ── Week boundaries (Monday-based) ──────────────────────────────────────
    const now = new Date()
    const dow = now.getDay() === 0 ? 7 : now.getDay() // 1=Mon … 7=Sun
    const startOfThisWeek = new Date(now)
    startOfThisWeek.setDate(now.getDate() - (dow - 1))
    startOfThisWeek.setHours(0, 0, 0, 0)
    const startOfLastWeek = new Date(startOfThisWeek)
    startOfLastWeek.setDate(startOfThisWeek.getDate() - 7)

    const inThisWeek = (dateStr: string) => new Date(dateStr) >= startOfThisWeek
    const inLastWeek = (dateStr: string) => {
      const d = new Date(dateStr)
      return d >= startOfLastWeek && d < startOfThisWeek
    }

    // Helper: returns { value, isPositive } for the trend chip
    const trend = (current: number, previous: number) => ({
      value: Math.abs(current - previous),
      isPositive: current >= previous,
    })

    // ── Current metrics ───────────────────────────────────────────────────────
    const assigned = allTasks.length
    const completed = allTasks.filter(task => task.status === 'completed').length
    const pendingReview = allSubmissions.filter(sub => sub.status === 'pending_review').length
    const overdue = allTasks.filter(task =>
      task.due_date &&
      new Date(task.due_date) < new Date() &&
      task.status !== 'completed'
    ).length

    // ── This-week vs last-week counts ────────────────────────────────────────
    // Assigned: tasks created this/last week
    const assignedThisWeek = allTasks.filter(t => inThisWeek(t.created_at)).length
    const assignedLastWeek = allTasks.filter(t => inLastWeek(t.created_at)).length

    // Completed: tasks with completed status, bucketed by creation date as proxy
    const completedThisWeek = allTasks.filter(t => t.status === 'completed' && inThisWeek(t.created_at)).length
    const completedLastWeek = allTasks.filter(t => t.status === 'completed' && inLastWeek(t.created_at)).length

    // Pending review: submissions submitted this/last week
    const pendingThisWeek = allSubmissions.filter(s => s.status === 'pending_review' && inThisWeek(s.submitted_at)).length
    const pendingLastWeek = allSubmissions.filter(s => s.status === 'pending_review' && inLastWeek(s.submitted_at)).length

    // Overdue: tasks that became overdue (due_date fell) this/last week
    const overdueThisWeek = allTasks.filter(t =>
      t.due_date && inThisWeek(t.due_date) &&
      new Date(t.due_date) < now && t.status !== 'completed'
    ).length
    const overdueLastWeek = allTasks.filter(t =>
      t.due_date && inLastWeek(t.due_date) &&
      new Date(t.due_date) < now && t.status !== 'completed'
    ).length

    const assignedTrend = trend(assignedThisWeek, assignedLastWeek)
    const completedTrend = trend(completedThisWeek, completedLastWeek)
    const pendingTrend = trend(pendingThisWeek, pendingLastWeek)
    const overdueTrend = trend(overdueThisWeek, overdueLastWeek)

    const recentTasks = allTasks
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5)

    return (
      <div className="space-y-8">
        <PageHeader 
          title="Dashboard" 
          subtitle="Welcome back! Here's your task overview and recent activity."
        />

        {/* Status Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatusCard
            icon={ClipboardList}
            label="Assigned Tasks"
            count={assigned}
            color="text-blue-600"
            trend={assignedTrend}
          />
          <StatusCard
            icon={CheckCircle}
            label="Completed"
            count={completed}
            color="text-green-600"
            trend={completedTrend}
          />
          <StatusCard
            icon={Clock}
            label="Pending Review"
            count={pendingReview}
            color="text-yellow-600"
            trend={pendingTrend}
          />
          <StatusCard
            icon={AlertCircle}
            label="Overdue"
            count={overdue}
            color="text-red-600"
            trend={overdueTrend}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recent Tasks */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ClipboardList className="h-5 w-5" />
                  Recent Tasks
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentTasks.length > 0 ? (
                    recentTasks.map((task) => (
                      <TaskCard 
                        key={task.id} 
                        task={task} 
                      />
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <ClipboardList className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p>No tasks assigned yet</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Stats */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Completion Rate</span>
                    <span className="text-sm font-medium text-green-600">
                      {assigned > 0 ? Math.round((completed / assigned) * 100) : 0}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${assigned > 0 ? Math.round((completed / assigned) * 100) : 0}%` }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Upcoming
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Due This Week</span>
                    <span className="text-sm font-medium text-blue-600">
                      {recentTasks.filter(task => 
                        task.due_date && 
                        new Date(task.due_date) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) &&
                        task.status !== 'completed'
                      ).length}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Due Today</span>
                    <span className="text-sm font-medium text-orange-600">
                      {recentTasks.filter(task => 
                        task.due_date && 
                        new Date(task.due_date).toDateString() === new Date().toDateString() &&
                        task.status !== 'completed'
                      ).length}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )
  } catch (error) {
    console.error('Dashboard error:', error)
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