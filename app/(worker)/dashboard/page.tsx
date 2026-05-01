import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import dynamic from 'next/dynamic'
import { ClipboardList, CheckCircle, Clock, AlertCircle, TrendingUp, Calendar } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Submission, Task } from '@/types'

// Dynamic imports to defer loading of heavy components
const StatusCard = dynamic(() => import('@/components/StatusCard').then(mod => ({ default: mod.StatusCard })), {
  loading: () => <div className="h-24 bg-gray-100 rounded-xl animate-pulse" />
})
const PageHeader = dynamic(() => import('@/components/PageHeader').then(mod => ({ default: mod.PageHeader })))
const TaskCard = dynamic(() => import('@/components/TaskCard').then(mod => ({ default: mod.TaskCard })), {
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
        .or(`assigned_to.eq.${userId},and(assigned_role.eq.worker,assigned_to.is.null)`),
      supabase
        .from('submissions')
        .select('*')
        .eq('worker_id', userId)
    ])

    const allTasks: Task[] = (tasksResult.data || []) as Task[]
    const allSubmissions: Submission[] = (submissionsResult.data || []) as Submission[]

    // Calculate metrics from fetched data (more efficient)
    const assigned = allTasks.length
    const completed = allTasks.filter(task => task.status === 'completed').length
    const pendingReview = allSubmissions.filter(sub => sub.status === 'pending_review').length
    const overdue = allTasks.filter(task => 
      task.due_date && 
      new Date(task.due_date) < new Date() && 
      task.status !== 'completed'
    ).length
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatusCard
            icon={ClipboardList}
            label="Assigned Tasks"
            count={assigned}
            color="text-blue-600"
            trend={{ value: 12, isPositive: true }}
          />
          <StatusCard
            icon={CheckCircle}
            label="Completed"
            count={completed}
            color="text-green-600"
            trend={{ value: 8, isPositive: true }}
          />
          <StatusCard
            icon={Clock}
            label="Pending Review"
            count={pendingReview}
            color="text-yellow-600"
            trend={{ value: 3, isPositive: false }}
          />
          <StatusCard
            icon={AlertCircle}
            label="Overdue"
            count={overdue}
            color="text-red-600"
            trend={{ value: 2, isPositive: false }}
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
                        showActions={false}
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