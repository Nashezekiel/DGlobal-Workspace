'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { supabase } from '@/lib/supabase/client'
import { Profile } from '@/types'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  MessageSquare,
  ClipboardPlus,
  X,
  CheckCircle2,
  Loader2,
  CalendarClock,
  Flag,
  Users,
} from 'lucide-react'
import Image from 'next/image'

interface WorkerStats extends Profile {
  tasksAssigned: number
  tasksCompleted: number
}

type TaskSummary = {
  assigned_to: string | null
  assigned_role: string | null
  status: string
}

const taskSchema = z.object({
  title: z.string().trim().min(3, 'Title must be at least 3 characters'),
  description: z.string().trim().min(10, 'Description must be at least 10 characters'),
  due_date: z.string().min(1, 'Due date is required'),
  priority: z.enum(['low', 'medium', 'high']),
}).superRefine((values, ctx) => {
  const dueDate = new Date(values.due_date)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  if (!Number.isNaN(dueDate.getTime()) && dueDate < today) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['due_date'],
      message: 'Due date cannot be in the past',
    })
  }
})

type TaskFormValues = z.infer<typeof taskSchema>

function WorkerAvatar({ worker, size = 'md' }: { worker: WorkerStats; size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = {
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-sm',
    lg: 'h-14 w-14 text-lg',
  }

  if (worker.avatar_url) {
    return (
      <div className={`relative ${sizeClasses[size]} rounded-full overflow-hidden ring-2 ring-brand-purple/20 flex-shrink-0`}>
        <Image
          src={worker.avatar_url}
          alt={worker.full_name}
          fill
          className="object-cover"
        />
      </div>
    )
  }

  const initials = worker.full_name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase()

  return (
    <div
      className={`${sizeClasses[size]} rounded-full bg-brand-purple/10 text-brand-purple flex items-center justify-center font-bold ring-2 ring-brand-purple/20 flex-shrink-0`}
    >
      {initials}
    </div>
  )
}

export default function TeamManagementPage() {
  const [workers, setWorkers] = useState<WorkerStats[]>([])
  const [loading, setLoading] = useState(true)

  // Message dialog state
  const [messageDialog, setMessageDialog] = useState<{ open: boolean; worker: WorkerStats | null }>({
    open: false,
    worker: null,
  })
  const [message, setMessage] = useState('')
  const [isSendingMessage, setIsSendingMessage] = useState(false)

  // Assign task panel state
  const [assignPanel, setAssignPanel] = useState<{ open: boolean; worker: WorkerStats | null }>({
    open: false,
    worker: null,
  })
  const [isAssigning, setIsAssigning] = useState(false)
  const [assignStatus, setAssignStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const taskForm = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: '',
      description: '',
      due_date: '',
      priority: 'medium',
    },
  })

  useEffect(() => {
    fetchWorkers()
  }, [])

  const fetchWorkers = async () => {
    setLoading(true)
    const [profilesResult, tasksResult] = await Promise.all([
      supabase.from('profiles').select('*').eq('role', 'worker').order('full_name', { ascending: true }),
      supabase.from('tasks').select('assigned_to,assigned_role,status'),
    ])

    const profiles: Profile[] = (profilesResult.data || []) as Profile[]
    const tasks: TaskSummary[] = (tasksResult.data || []) as TaskSummary[]

    const globalAssignedCount = tasks.filter(
      (task) => task.assigned_role === 'worker' && !task.assigned_to,
    ).length
    const globalCompletedCount = tasks.filter(
      (task) => task.assigned_role === 'worker' && !task.assigned_to && task.status === 'completed',
    ).length

    const workersWithStats: WorkerStats[] = profiles.map((profile) => {
      const assignedSpecific = tasks.filter((task) => task.assigned_to === profile.id).length
      const completedSpecific = tasks.filter(
        (task) => task.assigned_to === profile.id && task.status === 'completed',
      ).length
      return {
        ...profile,
        tasksAssigned: assignedSpecific + globalAssignedCount,
        tasksCompleted: completedSpecific + globalCompletedCount,
      }
    })

    setWorkers(workersWithStats)
    setLoading(false)
  }

  const handleSendMessage = async () => {
    if (!messageDialog.worker || !message.trim()) return
    setIsSendingMessage(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setIsSendingMessage(false); return }

    await supabase.from('messages').insert({
      room_id: 'General',
      sender_id: user.id,
      content: `@${messageDialog.worker.full_name}: ${message.trim()}`,
    })

    setIsSendingMessage(false)
    setMessageDialog({ open: false, worker: null })
    setMessage('')
  }

  const openAssignPanel = (worker: WorkerStats) => {
    taskForm.reset()
    setAssignStatus(null)
    setAssignPanel({ open: true, worker })
  }

  const closeAssignPanel = () => {
    setAssignPanel({ open: false, worker: null })
    setAssignStatus(null)
    taskForm.reset()
  }

  const handleAssignTask = async (values: TaskFormValues) => {
    if (!assignPanel.worker) return
    setIsAssigning(true)
    setAssignStatus(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setAssignStatus({ type: 'error', text: 'Session expired. Please log in again.' })
      setIsAssigning(false)
      return
    }

    const { error } = await supabase.from('tasks').insert({
      title: values.title.trim(),
      description: values.description.trim(),
      due_date: values.due_date,
      priority: values.priority,
      status: 'pending',
      created_by: user.id,
      assigned_role: 'worker',
      assigned_to: assignPanel.worker.id,
    })

    if (!error) {
      // Send notification to the worker
      await supabase.from('notifications').insert({
        user_id: assignPanel.worker.id,
        type: 'task',
        title: 'New Task Assigned',
        message: `A new ${values.priority} priority task "${values.title}" was assigned to you.`,
        link: '/my-tasks',
        is_read: false,
        metadata: {
          task_title: values.title,
          priority: values.priority,
          action_required: true,
        },
      })

      setAssignStatus({ type: 'success', text: `Task successfully assigned to ${assignPanel.worker.full_name}!` })
      taskForm.reset()
      // Refresh worker stats
      fetchWorkers()
    } else {
      setAssignStatus({ type: 'error', text: 'Failed to assign task. Please try again.' })
    }

    setIsAssigning(false)
  }

  const completionRate = (worker: WorkerStats) => {
    if (worker.tasksAssigned === 0) return 0
    return Math.round((worker.tasksCompleted / worker.tasksAssigned) * 100)
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Team Management" subtitle="View your team and assign tasks directly from here." />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-brand-purple" />
            Workers ({workers.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-brand-purple" />
            </div>
          ) : workers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-500">
              <Users className="h-10 w-10 text-gray-300 mb-3" />
              <p className="font-medium">No workers found</p>
              <p className="text-sm mt-1">Approve worker accounts to see them here.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table className="min-w-[800px]">
                <TableHeader>
                  <TableRow className="bg-gray-50/70">
                    <TableHead className="pl-6">Member</TableHead>
                    <TableHead>Role/Track</TableHead>
                    <TableHead>Tasks Assigned</TableHead>
                    <TableHead>Completed</TableHead>
                    <TableHead>Completion</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="pr-6">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {workers.map((worker) => (
                    <TableRow
                      key={worker.id}
                      className="cursor-pointer hover:bg-brand-purple/5 transition-colors group"
                      onClick={() => openAssignPanel(worker)}
                    >
                      <TableCell className="pl-6 py-4">
                        <div className="flex items-center gap-3">
                          <WorkerAvatar worker={worker} size="md" />
                          <div className="min-w-0">
                            <div className="font-semibold text-gray-900 group-hover:text-brand-purple transition-colors truncate">
                              {worker.full_name}
                            </div>
                            <div className="text-xs text-gray-500 truncate">{worker.email}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-700">{worker.job_role || 'Intern'}</span>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium text-gray-900">{worker.tasksAssigned}</span>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium text-gray-900">{worker.tasksCompleted}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-brand-purple rounded-full transition-all"
                              style={{ width: `${completionRate(worker)}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-500">{completionRate(worker)}%</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                          Active
                        </span>
                      </TableCell>
                      <TableCell className="pr-6">
                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <Button
                            size="sm"
                            className="bg-brand-purple hover:bg-brand-purple/90 text-white text-xs gap-1.5"
                            onClick={(e) => { e.stopPropagation(); openAssignPanel(worker) }}
                          >
                            <ClipboardPlus className="h-3.5 w-3.5" />
                            Assign Task
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs gap-1.5"
                            onClick={(e) => {
                              e.stopPropagation()
                              setMessageDialog({ open: true, worker })
                            }}
                          >
                            <MessageSquare className="h-3.5 w-3.5" />
                            Message
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ─── Assign Task Slide-In Panel ─── */}
      {assignPanel.open && assignPanel.worker && (
        <>
          {/* backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm motion-safe:animate-fade-in"
            onClick={closeAssignPanel}
          />

          {/* panel */}
          <aside className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-lg bg-white shadow-2xl flex flex-col motion-safe:animate-slide-in-right overflow-hidden">
            {/* Header */}
            <div className="bg-brand-purple px-6 py-5 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                <WorkerAvatar worker={assignPanel.worker} size="md" />
                <div>
                  <p className="text-xs text-white/70 uppercase tracking-wider font-medium">Assigning task to</p>
                  <h2 className="text-white font-bold text-lg leading-tight">{assignPanel.worker.full_name}</h2>
                  <p className="text-white/60 text-xs">{assignPanel.worker.email}</p>
                </div>
              </div>
              <button
                onClick={closeAssignPanel}
                className="rounded-full p-2 text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                aria-label="Close panel"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Worker stats bar */}
            <div className="bg-brand-purple/5 border-b border-brand-purple/10 px-6 py-3 flex gap-6 flex-shrink-0">
              <div className="text-center">
                <p className="text-xs text-gray-500">Assigned</p>
                <p className="font-bold text-gray-900">{assignPanel.worker.tasksAssigned}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-500">Completed</p>
                <p className="font-bold text-green-700">{assignPanel.worker.tasksCompleted}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-500">Rate</p>
                <p className="font-bold text-brand-purple">{completionRate(assignPanel.worker)}%</p>
              </div>
            </div>

            {/* Form */}
            <div className="flex-1 overflow-y-auto px-6 py-6">
              {assignStatus && (
                <div
                  className={`mb-5 rounded-xl border px-4 py-3 text-sm flex items-center gap-2 ${
                    assignStatus.type === 'success'
                      ? 'border-green-200 bg-green-50 text-green-700'
                      : 'border-red-200 bg-red-50 text-red-700'
                  }`}
                >
                  {assignStatus.type === 'success' && <CheckCircle2 className="h-4 w-4 flex-shrink-0" />}
                  {assignStatus.text}
                </div>
              )}

              <Form {...taskForm}>
                <form
                  id="assign-task-form"
                  onSubmit={taskForm.handleSubmit(handleAssignTask)}
                  className="space-y-5"
                >
                  <FormField
                    control={taskForm.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Task Title</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Write weekly progress report" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={taskForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Describe the expected outcome, steps, and deliverables."
                            className="min-h-28 resize-none"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={taskForm.control}
                      name="due_date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-1.5">
                            <CalendarClock className="h-3.5 w-3.5 text-gray-500" />
                            Due Date
                          </FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={taskForm.control}
                      name="priority"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-1.5">
                            <Flag className="h-3.5 w-3.5 text-gray-500" />
                            Priority
                          </FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select priority" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="low">
                                <span className="flex items-center gap-1.5">
                                  <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block" />
                                  Low
                                </span>
                              </SelectItem>
                              <SelectItem value="medium">
                                <span className="flex items-center gap-1.5">
                                  <span className="h-2 w-2 rounded-full bg-amber-500 inline-block" />
                                  Medium
                                </span>
                              </SelectItem>
                              <SelectItem value="high">
                                <span className="flex items-center gap-1.5">
                                  <span className="h-2 w-2 rounded-full bg-red-500 inline-block" />
                                  High
                                </span>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </form>
              </Form>
            </div>

            {/* Footer */}
            <div className="flex-shrink-0 border-t bg-white px-6 py-4 flex gap-3">
              <Button variant="outline" onClick={closeAssignPanel} className="flex-1">
                Cancel
              </Button>
              <Button
                type="submit"
                form="assign-task-form"
                disabled={isAssigning}
                className="flex-1 bg-brand-purple hover:bg-brand-purple/90 text-white"
              >
                {isAssigning ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Assigning…
                  </>
                ) : (
                  <>
                    <ClipboardPlus className="h-4 w-4 mr-2" />
                    Assign Task
                  </>
                )}
              </Button>
            </div>
          </aside>
        </>
      )}

      {/* ─── Quick Message Dialog ─── */}
      <Dialog
        open={messageDialog.open}
        onOpenChange={(open) => setMessageDialog({ open, worker: open ? messageDialog.worker : null })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              {messageDialog.worker && (
                <WorkerAvatar worker={messageDialog.worker} size="sm" />
              )}
              Message {messageDialog.worker?.full_name}
            </DialogTitle>
          </DialogHeader>
          <Textarea
            placeholder="Enter your message…"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="min-h-28 resize-none"
          />
          <DialogFooter>
            <Button
              onClick={() => setMessageDialog({ open: false, worker: null })}
              variant="outline"
            >
              Cancel
            </Button>
            <Button onClick={handleSendMessage} disabled={!message.trim() || isSendingMessage}>
              {isSendingMessage ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Sending…</>
              ) : 'Send'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}