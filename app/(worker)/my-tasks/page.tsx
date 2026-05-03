'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Task } from '@/types'
import { TaskCard } from '@/components/TaskCard'
import { PageHeader } from '@/components/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Filter, Loader2, ClipboardList } from 'lucide-react'
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCenter,
  useDroppable,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'

// Columns the worker is allowed to see and interact with
const COLUMNS: { key: Task['status']; title: string; color: string; description: string }[] = [
  { key: 'pending',      title: 'To Do',       color: 'bg-slate-100 border-slate-300',  description: 'Assigned tasks waiting to be started' },
  { key: 'in_progress',  title: 'In Progress',  color: 'bg-blue-50 border-blue-200',     description: 'Tasks you are currently working on' },
  { key: 'under_review', title: 'Review',       color: 'bg-amber-50 border-amber-200',   description: 'Submitted — awaiting admin approval' },
  { key: 'rejected',     title: 'Rejected',     color: 'bg-red-50 border-red-200',       description: 'Needs revision based on admin feedback' },
  { key: 'completed',    title: 'Done',         color: 'bg-green-50 border-green-200',   description: 'Approved and completed tasks' },
]

// Allowed drag transitions for workers
const ALLOWED_TRANSITIONS: Partial<Record<Task['status'], Task['status'][]>> = {
  pending:     ['in_progress'],
  in_progress: ['pending', 'under_review'],
  rejected:    ['in_progress'],
}

function DroppableColumn({ 
  id, 
  column, 
  colTasks, 
  updateTaskStatus 
}: { 
  id: string
  column: typeof COLUMNS[number]
  colTasks: Task[]
  updateTaskStatus: (taskId: string, status: Task['status']) => void
}) {
  const { setNodeRef } = useDroppable({ id })

  return (
    <div
      ref={setNodeRef}
      id={id}
      className={`rounded-xl border-2 ${column.color} flex flex-col min-h-[200px]`}
    >
      <div className="p-3 border-b border-inherit">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-semibold text-sm text-gray-800">{column.title}</h3>
          <Badge variant="secondary" className="text-xs px-1.5 h-5">{colTasks.length}</Badge>
        </div>
        <p className="text-[10px] text-gray-400">{column.description}</p>
      </div>

      <SortableContext
        id={id}
        items={colTasks.map(t => t.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="flex flex-col gap-3 p-3 flex-1 min-h-[120px]">
          {colTasks.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-xs text-gray-300">Drop here</p>
            </div>
          ) : (
            colTasks.map(task => (
              <TaskCard
                key={task.id}
                task={task}
                onUpdateStatus={updateTaskStatus}
                isWorkerView={true}
              />
            ))
          )}
        </div>
      </SortableContext>
    </div>
  )
}

export default function MyTasksPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'low' | 'medium' | 'high'>('all')
  const [activeTask, setActiveTask] = useState<Task | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor,   { activationConstraint: { delay: 250, tolerance: 5 } }),
  )

  useEffect(() => {
    const fetchTasks = async () => {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      const { data: tasksData } = await supabase
        .from('tasks')
        .select('*')
        .or(`assigned_to.eq.${user.id},and(assigned_role.eq.worker,assigned_to.is.null)`)
        .order('created_at', { ascending: false })

      const { data: submissionsData } = await supabase
        .from('submissions')
        .select('task_id, status, admin_feedback, submitted_at')
        .eq('worker_id', user.id)
        .eq('status', 'rejected')
        .order('submitted_at', { ascending: false })

      const feedbackMap = new Map<string, string>()
      ;(submissionsData || []).forEach((s: { task_id: string; admin_feedback: string | null }) => {
        if (!feedbackMap.has(s.task_id) && s.admin_feedback) {
          feedbackMap.set(s.task_id, s.admin_feedback)
        }
      })

      const hydrated = ((tasksData || []) as Task[]).map(task => {
        const feedback = feedbackMap.get(task.id)
        if (feedback && task.status !== 'completed') {
          return { ...task, status: 'rejected' as const, admin_feedback: feedback }
        }
        return task
      })

      setTasks(hydrated)
      setLoading(false)
    }

    fetchTasks()
  }, [])

  const updateTaskStatus = useCallback(async (taskId: string, status: Task['status']) => {
    const { error } = await supabase
      .from('tasks')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', taskId)

    if (!error) {
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status } : t))

      // Notify admin when task is submitted for review
      if (status === 'under_review') {
        const { data: { user } } = await supabase.auth.getUser()
        const task = tasks.find(t => t.id === taskId)
        if (user && task) {
          const { data: admins } = await supabase
            .from('profiles')
            .select('id')
            .eq('role', 'admin')

          if (admins && admins.length > 0) {
            await supabase.from('notifications').insert(
              admins.map((admin: { id: string }) => ({
                user_id: admin.id,
                type: 'submission',
                title: 'Task Submitted for Review',
                message: `"${task.title}" has been submitted for your review.`,
                link: '/admin/tasks/review',
                is_read: false,
              }))
            )
          }
        }
      }
    }
  }, [tasks])

  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks.find(t => t.id === event.active.id)
    setActiveTask(task || null)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveTask(null)
    const { active, over } = event
    if (!over || active.id === over.id) return

    const taskId = active.id as string
    const task = tasks.find(t => t.id === taskId)
    if (!task) return

    // over.id could be a column key or another task id
    const targetStatus = COLUMNS.find(c => c.key === over.id)?.key
      ?? tasks.find(t => t.id === over.id)?.status

    if (!targetStatus || targetStatus === task.status) return

    // Enforce worker transition rules
    const allowed = ALLOWED_TRANSITIONS[task.status]
    if (!allowed?.includes(targetStatus)) return

    updateTaskStatus(taskId, targetStatus)
  }

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const taskId = active.id as string
    const task = tasks.find(t => t.id === taskId)
    if (!task) return

    const targetStatus = COLUMNS.find(c => c.key === over.id)?.key
      ?? tasks.find(t => t.id === over.id)?.status

    if (!targetStatus || targetStatus === task.status) return

    const allowed = ALLOWED_TRANSITIONS[task.status]
    if (!allowed?.includes(targetStatus)) return

    // Optimistic update for smooth UI
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: targetStatus } : t))
  }

  const visibleTasks = tasks.filter(task => {
    if (search.trim()) {
      const term = search.toLowerCase()
      if (!task.title.toLowerCase().includes(term) && !task.description.toLowerCase().includes(term)) return false
    }
    if (priorityFilter !== 'all' && task.priority !== priorityFilter) return false
    return true
  })

  return (
    <div className="space-y-6">
      <PageHeader title="My Tasks" subtitle="Your personal Kanban board — drag tasks or use the action buttons." />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <Input
          placeholder="Search tasks..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="sm:max-w-xs"
        />
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-400" />
          <Select
            value={priorityFilter}
            onValueChange={(v: 'all' | 'low' | 'medium' | 'high') => setPriorityFilter(v)}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priorities</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500 ml-auto">
          <ClipboardList className="h-4 w-4" />
          <span>{visibleTasks.length} tasks</span>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-gray-500 py-12 justify-center">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading your tasks...</span>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-4">
            {COLUMNS.map(column => {
              const colTasks = visibleTasks.filter(t => t.status === column.key)
              return (
                <DroppableColumn
                  key={column.key}
                  id={column.key}
                  column={column}
                  colTasks={colTasks}
                  updateTaskStatus={updateTaskStatus}
                />
              )
            })}
          </div>

          {/* Drag Overlay (ghost card while dragging) */}
          <DragOverlay>
            {activeTask && (
              <div className="rotate-2 scale-105 opacity-90">
                <TaskCard task={activeTask} isWorkerView={true} />
              </div>
            )}
          </DragOverlay>
        </DndContext>
      )}
    </div>
  )
}