'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { TaskWithProfile } from '@/types'
import { PageHeader } from '@/components/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  ClipboardList,
  Loader2,
  Calendar,
  User,
  Flag,
  MessageSquare,
  ExternalLink,
} from 'lucide-react'

type TaskStatus = 'in_progress' | 'completed' | 'rejected'

const STATUS_CONFIG: Record<TaskStatus, { label: string; color: string; headerBg: string; badge: string }> = {
  in_progress: {
    label: 'In Progress',
    color: 'text-blue-700',
    headerBg: 'bg-blue-50 border-blue-200',
    badge: 'border-blue-200 bg-blue-50 text-blue-700',
  },
  completed: {
    label: 'Completed',
    color: 'text-green-700',
    headerBg: 'bg-green-50 border-green-200',
    badge: 'border-green-200 bg-green-50 text-green-700',
  },
  rejected: {
    label: 'Rejected',
    color: 'text-red-700',
    headerBg: 'bg-red-50 border-red-200',
    badge: 'border-red-200 bg-red-50 text-red-700',
  },
}

const PRIORITY_CONFIG = {
  high: 'bg-red-50 text-red-700 border-red-100',
  medium: 'bg-amber-50 text-amber-700 border-amber-100',
  low: 'bg-emerald-50 text-emerald-700 border-emerald-100',
}

function getProfile(profiles: { full_name: string } | { full_name: string }[] | null | undefined) {
  if (!profiles) return null
  return Array.isArray(profiles) ? profiles[0] : profiles
}

function isOverdue(task: TaskWithProfile) {
  return (
    task.due_date &&
    new Date(task.due_date) < new Date() &&
    task.status !== 'completed'
  )
}

function TaskDetailModal({
  task,
  onClose,
}: {
  task: TaskWithProfile | null
  onClose: () => void
}) {
  if (!task) return null
  const assignee = getProfile(task.profiles)
  const statusConf = STATUS_CONFIG[task.status as TaskStatus]

  return (
    <Dialog open={!!task} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-lg gap-0 p-0 overflow-hidden max-h-[90vh] flex flex-col">
        <DialogHeader className="sr-only">
          <DialogTitle>Task Details</DialogTitle>
        </DialogHeader>
        {/* Header band — fixed */}
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 px-6 py-5 shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Task</p>
              <h2 className="text-white font-bold text-lg leading-tight">{task.title}</h2>
              <p className="text-gray-400 text-xs mt-1 font-mono">ID: {task.id.slice(0, 8).toUpperCase()}</p>
            </div>
            {statusConf && (
              <Badge variant="outline" className={`capitalize shrink-0 ${statusConf.badge}`}>
                {statusConf.label}
              </Badge>
            )}
          </div>
        </div>

        {/* Body — scrollable */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Description */}
          {task.description && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Description</p>
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{task.description}</p>
            </div>
          )}

          {/* Meta grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                <User className="h-4 w-4 text-gray-500" />
              </div>
              <div>
                <p className="text-[10px] text-gray-400 uppercase tracking-wide">Assignee</p>
                <p className="text-sm font-medium text-gray-800">{assignee?.full_name || 'Unassigned'}</p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                <Flag className="h-4 w-4 text-gray-500" />
              </div>
              <div>
                <p className="text-[10px] text-gray-400 uppercase tracking-wide">Priority</p>
                <Badge
                  variant="secondary"
                  className={`capitalize text-xs mt-0.5 ${PRIORITY_CONFIG[task.priority as keyof typeof PRIORITY_CONFIG] || ''}`}
                >
                  {task.priority}
                </Badge>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                <Calendar className="h-4 w-4 text-gray-500" />
              </div>
              <div>
                <p className="text-[10px] text-gray-400 uppercase tracking-wide">Due Date</p>
                <p className={`text-sm font-medium ${isOverdue(task) ? 'text-red-600' : 'text-gray-800'}`}>
                  {task.due_date
                    ? new Date(task.due_date).toLocaleDateString(undefined, { dateStyle: 'medium' })
                    : 'No deadline'}
                  {isOverdue(task) && <span className="ml-1 text-xs">(overdue)</span>}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                <ClipboardList className="h-4 w-4 text-gray-500" />
              </div>
              <div>
                <p className="text-[10px] text-gray-400 uppercase tracking-wide">Created</p>
                <p className="text-sm font-medium text-gray-800">
                  {new Date(task.created_at).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                </p>
              </div>
            </div>
          </div>

          {/* Admin feedback */}
          {task.admin_feedback && (
            <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3">
              <div className="flex items-center gap-2 mb-1">
                <MessageSquare className="h-3.5 w-3.5 text-amber-600" />
                <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider">Admin Feedback</p>
              </div>
              <p className="text-sm text-amber-800 leading-relaxed">{task.admin_feedback}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t bg-gray-50 px-6 py-3 flex justify-between items-center shrink-0">
          <Button variant="ghost" size="sm" onClick={onClose} className="text-gray-500">
            Close
          </Button>
          <a href={`/admin/tasks/${task.id}`}>
            <Button size="sm" className="bg-brand-purple hover:bg-brand-purple/90 text-white gap-1.5">
              <ExternalLink className="h-3.5 w-3.5" />
              Open Full Page
            </Button>
          </a>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function StatusTable({
  status,
  tasks,
  onSelect,
}: {
  status: TaskStatus
  tasks: TaskWithProfile[]
  onSelect: (task: TaskWithProfile) => void
}) {
  const conf = STATUS_CONFIG[status]

  return (
    <div className="flex flex-col rounded-xl border border-gray-200 overflow-hidden shadow-sm min-w-0">
      {/* Table header */}
      <div className={`flex items-center justify-between px-4 py-3 border-b ${conf.headerBg}`}>
        <h3 className={`font-semibold text-sm flex items-center gap-2 ${conf.color}`}>
          <span
            className={`inline-block h-2 w-2 rounded-full ${
              status === 'in_progress' ? 'bg-blue-500' : status === 'completed' ? 'bg-green-500' : 'bg-red-500'
            }`}
          />
          {conf.label}
        </h3>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${conf.badge} border`}>
          {tasks.length}
        </span>
      </div>

      {/* Rows */}
      <div className="flex-1 overflow-y-auto max-h-[420px]">
        {tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-gray-400 text-sm">
            <ClipboardList className="h-8 w-8 mb-2 text-gray-300" />
            No tasks
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {tasks.map((task) => {
              const assignee = getProfile(task.profiles)
              const overdue = isOverdue(task)
              return (
                <button
                  key={task.id}
                  onClick={() => onSelect(task)}
                  className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors group"
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <p className="text-sm font-medium text-gray-900 line-clamp-1 group-hover:text-brand-purple transition-colors flex-1">
                      {task.title}
                    </p>
                    <Badge
                      variant="secondary"
                      className={`capitalize shrink-0 text-[10px] px-1.5 py-0 ${
                        PRIORITY_CONFIG[task.priority as keyof typeof PRIORITY_CONFIG] || ''
                      }`}
                    >
                      {task.priority}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] text-gray-400 truncate">
                      {assignee?.full_name || 'Unassigned'}
                    </span>
                    {task.due_date && (
                      <span className={`text-[11px] shrink-0 ${overdue ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
                        {overdue ? '⚠ ' : ''}
                        {new Date(task.due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default function TaskStatusPage() {
  const [tasks, setTasks] = useState<TaskWithProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTask, setSelectedTask] = useState<TaskWithProfile | null>(null)

  useEffect(() => {
    const fetchTasks = async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select('id,title,description,priority,status,due_date,created_at,assigned_to,admin_feedback,profiles!assigned_to(full_name)')
        .not('status', 'in', '(achieved,pending,under_review)')
        .order('created_at', { ascending: false })

      if (!error && data) {
        setTasks(data as unknown as TaskWithProfile[])
      }
      setLoading(false)
    }
    fetchTasks()
  }, [])

  const inProgress = tasks.filter((t) => t.status === 'in_progress')
  const completed = tasks.filter((t) => t.status === 'completed')
  const rejected = tasks.filter((t) => t.status === 'rejected')

  return (
    <div className="space-y-6">
      <PageHeader
        title="Task Status"
        subtitle="Monitor and track active tasks — grouped by their current status."
      />

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-brand-purple" />
        </div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-20 bg-gray-50 rounded-xl border-2 border-dashed">
          <div className="text-gray-400 text-4xl mb-4">📋</div>
          <h3 className="text-lg font-medium text-gray-900">No active tasks found</h3>
          <p className="text-gray-500">Tasks will appear here once they are in progress, completed, or rejected.</p>
        </div>
      ) : (
        <>
          {/* Summary chips */}
          <div className="flex flex-wrap gap-3">
            {(Object.keys(STATUS_CONFIG) as TaskStatus[]).map((s) => {
              const count = tasks.filter((t) => t.status === s).length
              return (
                <div
                  key={s}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium ${STATUS_CONFIG[s].badge}`}
                >
                  <span>{STATUS_CONFIG[s].label}</span>
                  <span className="font-bold">{count}</span>
                </div>
              )
            })}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-gray-200 bg-gray-50 text-xs font-medium text-gray-600">
              <span>Total</span>
              <span className="font-bold">{tasks.length}</span>
            </div>
          </div>

          {/* Three-column tables */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <StatusTable status="in_progress" tasks={inProgress} onSelect={setSelectedTask} />
            <StatusTable status="completed" tasks={completed} onSelect={setSelectedTask} />
            <StatusTable status="rejected" tasks={rejected} onSelect={setSelectedTask} />
          </div>
        </>
      )}

      {/* Detail modal */}
      <TaskDetailModal task={selectedTask} onClose={() => setSelectedTask(null)} />
    </div>
  )
}
