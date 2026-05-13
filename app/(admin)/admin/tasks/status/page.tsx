import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import dynamic from 'next/dynamic'
import { ClipboardList, Filter } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TaskWithProfile } from '@/types'

// Dynamic imports for better performance
const PageHeader = dynamic(() => import('@/components/PageHeader').then(mod => ({ default: mod.PageHeader })))

export default async function TaskStatusPage() {
  const supabase = createClient()

  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    redirect('/login')
  }

  // Check if admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    redirect('/dashboard')
  }

  const { data: tasks, error: tasksError } = await supabase
    .from('tasks')
    .select('id,title,priority,status,due_date,created_at,assigned_to,profiles!assigned_to(full_name)')
    .order('created_at', { ascending: false })

  if (tasksError) {
    console.error('Task Status Page Error:', tasksError)
  }

  const tasksTyped = (tasks || []) as unknown as TaskWithProfile[]

  const getProfile = (profiles: { full_name: string } | { full_name: string }[] | null | undefined) => {
    if (!profiles) return null
    return Array.isArray(profiles) ? profiles[0] : profiles
  }

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Task Status" 
        subtitle="Monitor and track the progress of all assigned tasks." 
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-brand-purple" />
              All Tasks ({tasks?.length || 0})
            </span>
            <div className="flex items-center gap-2">
               <Badge variant="outline" className="text-xs font-normal">
                  <Filter className="h-3 w-3 mr-1" />
                  All statuses
               </Badge>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!tasks || tasks.length === 0 ? (
            <div className="text-center py-20 bg-gray-50 rounded-xl border-2 border-dashed">
              <div className="text-gray-400 text-4xl mb-4">📋</div>
              <h3 className="text-lg font-medium text-gray-900">No tasks found</h3>
              <p className="text-gray-500">You haven&apos;t created any tasks yet.</p>
            </div>
          ) : (
            <div>
              {/* Mobile Card View (visible on small screens only) */}
              <div className="md:hidden space-y-4">
                {tasksTyped.map((t: TaskWithProfile) => (
                  <div key={t.id} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <a 
                          href={`/admin/tasks/${t.id}`}
                          className="font-semibold text-gray-900 line-clamp-2 block hover:text-brand-purple transition-colors"
                        >
                          {t.title}
                        </a>
                        <div className="text-[10px] text-gray-400 mt-1 uppercase tracking-wider">ID: {t.id.slice(0, 8)}</div>
                      </div>
                      <Badge
                        variant="secondary"
                        className={`capitalize shrink-0 ${
                          t.priority === 'high'
                            ? 'bg-red-50 text-red-700 border-red-100'
                            : t.priority === 'medium'
                              ? 'bg-amber-50 text-amber-700 border-amber-100'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-100'
                        }`}
                      >
                        {t.priority}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-4 py-3 border-y border-gray-50">
                      <div className="space-y-1">
                        <div className="text-[10px] text-gray-400 uppercase font-semibold">Assignee</div>
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-full bg-brand-purple/10 text-brand-purple flex items-center justify-center text-[10px] font-bold">
                            {(getProfile(t.profiles)?.full_name || 'U').slice(0, 2).toUpperCase()}
                          </div>
                          <span className="text-xs text-gray-700 truncate">{getProfile(t.profiles)?.full_name || 'Unassigned'}</span>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-[10px] text-gray-400 uppercase font-semibold">Deadline</div>
                        <div className={`text-xs ${
                          t.due_date && new Date(t.due_date) < new Date() && t.status !== 'completed' 
                            ? 'text-red-600 font-medium' 
                            : 'text-gray-500'
                        }`}>
                          {t.due_date ? new Date(t.due_date).toLocaleDateString() : 'No date'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className={`capitalize px-3 py-1 rounded-full text-xs ${
                        t.status === 'completed' ? 'border-green-200 bg-green-50 text-green-700' :
                        t.status === 'in_progress' ? 'border-blue-200 bg-blue-50 text-blue-700' :
                        t.status === 'under_review' ? 'border-amber-200 bg-amber-50 text-amber-700' :
                        'border-gray-200 bg-gray-50 text-gray-600'
                      }`}>
                        {t.status.replace('_', ' ')}
                      </Badge>
                      <div className="text-[10px] text-gray-400 font-medium italic">
                        Created {new Date(t.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table View (visible on medium screens and up) */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead>
                    <tr className="border-b text-gray-500 font-medium">
                      <th className="pb-3 pl-2">Task Details</th>
                      <th className="pb-3">Assigned To</th>
                      <th className="pb-3">Status</th>
                      <th className="pb-3">Priority</th>
                      <th className="pb-3">Deadline</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {tasksTyped.map((t: TaskWithProfile) => (
                      <tr key={t.id} className="hover:bg-gray-50/50 transition-colors group">
                        <td className="py-4 pl-2">
                          <a 
                            href={`/admin/tasks/${t.id}`}
                            className="font-medium text-gray-900 group-hover:text-brand-purple transition-colors block"
                          >
                            {t.title}
                          </a>
                          <div className="text-xs text-gray-400 mt-1 flex items-center gap-2">
                            <span>ID: {t.id.slice(0, 8)}</span>
                            <span>•</span>
                            <span>Created {new Date(t.created_at).toLocaleDateString()}</span>
                          </div>
                        </td>
                        <td className="py-4">
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-full bg-brand-purple/10 text-brand-purple flex items-center justify-center text-xs font-bold ring-2 ring-white">
                              {(getProfile(t.profiles)?.full_name || 'U').slice(0, 2).toUpperCase()}
                            </div>
                            <span className="text-gray-700 font-medium">
                              {getProfile(t.profiles)?.full_name || 'Unassigned'}
                            </span>
                          </div>
                        </td>
                        <td className="py-4">
                          <Badge variant="outline" className={`capitalize px-2.5 py-0.5 rounded-full ${
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
                            className={`capitalize ${
                              t.priority === 'high'
                                ? 'bg-red-50 text-red-700 border-red-100'
                                : t.priority === 'medium'
                                  ? 'bg-amber-50 text-amber-700 border-amber-100'
                                  : 'bg-emerald-50 text-emerald-700 border-emerald-100'
                            }`}
                          >
                            {t.priority}
                          </Badge>
                        </td>
                        <td className="py-4">
                          <div className={`text-sm ${
                            t.due_date && new Date(t.due_date) < new Date() && t.status !== 'completed' 
                              ? 'text-red-600 font-medium' 
                              : 'text-gray-500'
                          }`}>
                            {t.due_date ? new Date(t.due_date).toLocaleDateString(undefined, { 
                              month: 'short', 
                              day: 'numeric',
                              year: 'numeric'
                            }) : 'No deadline'}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
