'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { supabase } from '@/lib/supabase/client'

import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CalendarClock, Flag, Sparkles, Users, ArrowLeft, Edit2, Trash2 } from 'lucide-react'

const formSchema = z.object({
  title: z.string().trim().min(3, 'Title must be at least 3 characters'),
  description: z.string().trim().min(10, 'Description must be at least 10 characters'),
  due_date: z.string().min(1, 'Due date is required'),
  priority: z.enum(['low', 'medium', 'high']),
  assign_type: z.enum(['all', 'specific']),
  assigned_to: z.array(z.string()).optional(),
  status: z.enum(['pending', 'in_progress', 'under_review', 'completed', 'rejected']),
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


export default function TaskDetailPage() {
  const params = useParams()
  const router = useRouter()
  const taskId = params.id as string
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [task, setTask] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      description: '',
      due_date: '',
      priority: 'medium',
      assign_type: 'all',
      assigned_to: [],
      status: 'pending',
    },
  })

  useEffect(() => {
    fetchTaskAndWorkers()
  }, [taskId])

  const fetchTaskAndWorkers = async () => {
    setIsLoading(true)
    
    // Fetch task details with submissions
    const { data: taskData, error: taskError } = await supabase
      .from('tasks')
      .select(`
        *,
        profiles!assigned_to(full_name),
        submissions(
          id,
          content,
          status,
          submitted_at,
          reviewed_at,
          reviewed_by,
          feedback,
          admin_feedback,
          profiles!worker_id(full_name)
        )
      `)
      .eq('id', taskId)
      .single()

    if (taskError) {
      console.error('Task fetch error:', taskError)
      setTask(null)
      setIsLoading(false)
      return
    }

    setTask(taskData)
    
    if (taskData) {
      form.reset({
        title: taskData.title,
        description: taskData.description,
        due_date: taskData.due_date,
        priority: taskData.priority,
        assign_type: taskData.assigned_to ? 'specific' : 'all',
        assigned_to: taskData.assigned_to ? [taskData.assigned_to] : [],
        status: taskData.status,
      })
    }
    
    setIsLoading(false)
  }


  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true)
    setStatusMessage(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setStatusMessage({ type: 'error', text: 'Session expired. Please log in again.' })
      setIsSubmitting(false)
      return
    }

    const { error } = await supabase
      .from('tasks')
      .update({
        title: values.title.trim(),
        description: values.description.trim(),
        due_date: values.due_date,
        priority: values.priority,
        status: values.status,
        updated_at: new Date().toISOString(),
        assigned_to: (values.assign_type === 'specific' && values.assigned_to && values.assigned_to.length > 0) ? values.assigned_to[0] : null,
        assigned_role: 'worker',
      })
      .eq('id', taskId)

    if (!error) {
      setStatusMessage({ type: 'success', text: 'Task updated successfully!' })
      setIsEditing(false)
      await fetchTaskAndWorkers() // Refresh task data
    } else {
      setStatusMessage({ type: 'error', text: 'Failed to update task. Please try again.' })
    }
    setIsSubmitting(false)
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this task? This action cannot be undone.')) {
      return
    }

    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId)

    if (!error) {
      router.push('/admin/tasks')
    } else {
      alert('Failed to delete task. Please try again.')
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Task Details" subtitle="Loading task information..." />
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
        </div>
      </div>
    )
  }

  if (!task) {
    return (
      <div className="space-y-6">
        <PageHeader title="Task Not Found" subtitle="The requested task could not be found." />
        <div className="text-center py-20 text-gray-500">
          <p>Task not found or you don&apos;t have permission to view it.</p>
        </div>
      </div>
    )
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'rejected':
        return 'bg-red-100 text-red-700 border-red-200'
      case 'completed':
        return 'bg-green-100 text-green-700 border-green-200'
      case 'in_progress':
        return 'bg-blue-100 text-blue-700 border-blue-200'
      case 'under_review':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200'
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-700 border-red-200'
      case 'medium':
        return 'bg-orange-100 text-orange-700 border-orange-200'
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="min-w-0 flex-1">
          <PageHeader 
            title="Task Details" 
            subtitle={`View and manage task: ${task.title}`}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => router.push('/admin/tasks/status')}
            className="flex items-center gap-2 text-sm sm:text-base"
            size="sm"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Back to Tasks</span>
            <span className="sm:hidden">Back</span>
          </Button>
          {!isEditing && (
            <Button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-2 text-sm sm:text-base"
              size="sm"
            >
              <Edit2 className="h-4 w-4" />
              <span className="hidden sm:inline">Edit Task</span>
              <span className="sm:hidden">Edit</span>
            </Button>
          )}
          <Button
            variant="destructive"
            onClick={handleDelete}
            className="flex items-center gap-2 text-sm sm:text-base"
            size="sm"
          >
            <Trash2 className="h-4 w-4" />
            <span className="hidden sm:inline">Delete</span>
            <span className="sm:hidden">Del</span>
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr] xl:grid-cols-[3fr_1fr]">
        {/* Task Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-600" />
              {isEditing ? 'Edit Task' : 'Task Information'}
            </CardTitle>
            <CardDescription>
              {isEditing ? 'Modify task details and save changes.' : 'Complete task overview and current status.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {statusMessage && (
              <div
                className={`rounded-md border px-4 py-3 text-sm ${
                  statusMessage.type === 'success'
                    ? 'border-green-200 bg-green-50 text-green-700'
                    : 'border-red-200 bg-red-50 text-red-700'
                }`}
              >
                {statusMessage.text}
              </div>
            )}

            {isEditing ? (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Task Title</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Design onboarding checklist for new interns" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Describe expected outcome, key steps, and deliverables."
                            className="min-h-32"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="due_date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <CalendarClock className="h-4 w-4 text-gray-500" />
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
                      control={form.control}
                      name="priority"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <Flag className="h-4 w-4 text-gray-500" />
                            Priority
                          </FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select priority" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="low">Low</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="high">High</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="in_progress">In Progress</SelectItem>
                            <SelectItem value="under_review">Under Review</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="rejected">Rejected</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex flex-col sm:flex-row gap-3 pt-4">
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-1 text-sm sm:text-base"
                      size="sm"
                    >
                      {isSubmitting ? 'Saving...' : 'Save Changes'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsEditing(false)}
                      className="text-sm sm:text-base"
                      size="sm"
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </Form>
            ) : (
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-lg text-gray-900 mb-2">{task.title}</h3>
                  <p className="text-gray-600 leading-relaxed">{task.description}</p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-gray-500">Status:</span>
                      <Badge className={getStatusColor(task.status)}>
                        {task.status.replace('_', ' ')}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-gray-500">Priority:</span>
                      <Badge className={getPriorityColor(task.priority)}>
                        {task.priority}
                      </Badge>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-gray-500">Due Date:</span>
                      <span className="font-medium">
                        {new Date(task.due_date).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-gray-500">Created:</span>
                      <span className="font-medium">
                        {new Date(task.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>

                {task.profiles?.full_name && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-500">Assigned to:</span>
                    <span className="font-medium">{task.profiles.full_name}</span>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Submissions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              Submissions
            </CardTitle>
            <CardDescription>
              View all submissions and feedback for this task.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {task.submissions && task.submissions.length > 0 ? (
              <div className="space-y-4">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {(task.submissions as any[]).map((submission: any) => (
                  <div key={submission.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{submission.profiles?.full_name || 'Unknown'}</span>
                        <Badge className={
                          submission.status === 'approved' ? 'bg-green-100 text-green-700' :
                          submission.status === 'rejected' ? 'bg-red-100 text-red-700' :
                          'bg-yellow-100 text-yellow-700'
                        }>
                          {submission.status}
                        </Badge>
                      </div>
                      <span className="text-sm text-gray-500">
                        Submitted: {new Date(submission.submitted_at).toLocaleDateString()}
                      </span>
                    </div>
                    
                    <div className="text-sm text-gray-700 bg-gray-50 p-3 rounded">
                      {submission.content}
                    </div>

                    {submission.admin_feedback && (
                      <div className="bg-blue-50 border border-blue-200 p-3 rounded">
                        <p className="text-sm font-semibold text-blue-700">Admin Feedback:</p>
                        <p className="text-sm text-blue-800">{submission.admin_feedback}</p>
                      </div>
                    )}

                    {submission.reviewed_at && (
                      <div className="text-xs text-gray-500">
                        Reviewed: {new Date(submission.reviewed_at).toLocaleString()}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No submissions yet for this task.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
