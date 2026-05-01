'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Task } from '@/types'
import { TaskCard } from '@/components/TaskCard'
import { PageHeader } from '@/components/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ClipboardList, Loader2, Filter, SortAsc, ArrowUpDown } from 'lucide-react'

type RejectedSubmissionRow = {
  task_id: string
  status: 'rejected'
  admin_feedback: string | null
  submitted_at: string
}

export default function MyTasksPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'low' | 'medium' | 'high'>('all')
  const [sortBy, setSortBy] = useState<'due_date' | 'priority' | 'created_at'>('due_date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [selectedColumn, setSelectedColumn] = useState<Task['status'] | 'all'>('all')

  useEffect(() => {
    const fetchTasks = async () => {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }

      const [tasksResult, submissionsResult] = await Promise.all([
        supabase
          .from('tasks')
          .select('*')
          .or(`assigned_to.eq.${user.id},and(assigned_role.eq.worker,assigned_to.is.null)`)
          .order('due_date', { ascending: true }),
        supabase
          .from('submissions')
          .select('task_id,status,admin_feedback,submitted_at')
          .eq('worker_id', user.id)
          .eq('status', 'rejected')
          .order('submitted_at', { ascending: false }),
      ])

      const rejectedFeedbackByTask = new Map<string, string>()
      ;((submissionsResult.data || []) as RejectedSubmissionRow[]).forEach((submission) => {
        if (!rejectedFeedbackByTask.has(submission.task_id) && submission.admin_feedback) {
          rejectedFeedbackByTask.set(submission.task_id, submission.admin_feedback)
        }
      })

      const hydratedTasks = ((tasksResult.data || []) as Task[]).map((task) => {
        const feedback = rejectedFeedbackByTask.get(task.id)
        if (feedback && task.status !== 'completed') {
          return { ...task, status: 'rejected' as const, admin_feedback: feedback }
        }

        return task
      })

      setTasks(hydratedTasks)
      setLoading(false)
    }

    fetchTasks()
  }, [])

  const onUpdateStatus = useCallback(async (taskId: string, status: Task['status']) => {
    setUpdatingTaskId(taskId)
    const { error } = await supabase
      .from('tasks')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', taskId)

    if (!error) {
      setTasks((prev) =>
        prev.map((task) => (task.id === taskId ? { ...task, status } : task)),
      )
    }

    setUpdatingTaskId(null)
  }, [])

  const visibleTasks = useMemo(() => {
    return tasks
      .filter((task) => {
        // Search filter
        if (search.trim()) {
          const term = search.toLowerCase()
          if (
            !task.title.toLowerCase().includes(term) &&
            !task.description.toLowerCase().includes(term)
          ) {
            return false
          }
        }

        // Priority filter
        if (priorityFilter !== 'all' && task.priority !== priorityFilter) {
          return false
        }

        return true
      })
      .sort((a, b) => {
        let comparison = 0

        switch (sortBy) {
          case 'due_date':
            if (!a.due_date && !b.due_date) comparison = 0
            else if (!a.due_date) comparison = 1
            else if (!b.due_date) comparison = -1
            else comparison = new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
            break
          case 'priority':
            const priorityOrder = { high: 3, medium: 2, low: 1 }
            comparison = priorityOrder[a.priority] - priorityOrder[b.priority]
            break
          case 'created_at':
            comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            break
        }

        return sortOrder === 'asc' ? comparison : -comparison
      })
  }, [tasks, search, priorityFilter, sortBy, sortOrder])

  const columns: { key: Task['status']; title: string }[] = [
    { key: 'pending', title: 'To Do' },
    { key: 'in_progress', title: 'In Progress' },
    { key: 'under_review', title: 'Review' },
    { key: 'rejected', title: 'Rejected' },
    { key: 'completed', title: 'Done' },
  ]

  const handleTaskUpdated = useCallback((updatedTask: Task) => {
    setTasks(prev => prev.map(task => task.id === updatedTask.id ? updatedTask : task))
  }, [])

  const handleTaskDelete = useCallback(async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return

    try {
      await supabase.from('tasks').delete().eq('id', taskId)
      setTasks(prev => prev.filter(task => task.id !== taskId))
    } catch (error) {
      console.error('Failed to delete task:', error)
    }
  }, [])

  return (
    <div className="space-y-6">
      <PageHeader 
        title="My Tasks" 
        subtitle="Track work in a Kanban board view."
      />

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col lg:flex-row gap-4 lg:items-center lg:justify-between">
              <div className="flex flex-col md:flex-row gap-4 md:items-center flex-1">
                <Input
                  placeholder="Search tasks by title or description..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="md:max-w-sm"
                />
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-gray-500" />
                  <Select
                    value={priorityFilter}
                    onValueChange={(value: 'all' | 'low' | 'medium' | 'high') => setPriorityFilter(value)}
                  >
                    <SelectTrigger className="w-[120px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Priority</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <ArrowUpDown className="h-4 w-4 text-gray-500" />
                  <Select
                    value={sortBy}
                    onValueChange={(value: 'due_date' | 'priority' | 'created_at') => setSortBy(value)}
                  >
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="due_date">Due Date</SelectItem>
                      <SelectItem value="priority">Priority</SelectItem>
                      <SelectItem value="created_at">Created</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  >
                    <SortAsc className={`h-4 w-4 ${sortOrder === 'desc' ? 'rotate-180' : ''}`} />
                  </Button>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <ClipboardList className="h-4 w-4" />
                <span>{visibleTasks.length} visible tasks</span>
              </div>
            </div>

            {/* Mobile column selector */}
            <div className="lg:hidden">
              <Select
                value={selectedColumn}
                onValueChange={(value: Task['status'] | 'all') => setSelectedColumn(value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select column" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Columns</SelectItem>
                  {columns.map((column) => (
                    <SelectItem key={column.key} value={column.key}>
                      {column.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex items-center gap-2 text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Loading tasks...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
          {columns
            .filter((column) => selectedColumn === 'all' || column.key === selectedColumn)
            .map((column) => {
              const columnTasks = visibleTasks.filter((task) => task.status === column.key)

              return (
                <Card key={column.key} className="h-fit">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center justify-between text-base">
                      <span>{column.title}</span>
                      <Badge variant="secondary">{columnTasks.length}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {columnTasks.length === 0 ? (
                      <p className="text-sm text-gray-500">No tasks in this column.</p>
                    ) : (
                      columnTasks.map((task) => (
                        <div key={task.id} className={updatingTaskId === task.id ? 'opacity-70' : ''}>
                          <TaskCard
                            task={task}
                            onUpdateStatus={onUpdateStatus}
                            onEdit={handleTaskUpdated}
                            onDelete={handleTaskDelete}
                            compact
                          />
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              )
            })}
        </div>
      )}
    </div>
  )
}