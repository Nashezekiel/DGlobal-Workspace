'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { supabase } from '@/lib/supabase/client'
import { Profile } from '@/types'
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
import { CalendarClock, Flag, Sparkles, Users } from 'lucide-react'

const formSchema = z.object({
  title: z.string().trim().min(3, 'Title must be at least 3 characters'),
  description: z.string().trim().min(10, 'Description must be at least 10 characters'),
  due_date: z.string().min(1, 'Due date is required'),
  priority: z.enum(['low', 'medium', 'high']),
  assign_type: z.enum(['all', 'specific']),
  assigned_to: z.string().optional(),
}).superRefine((values, ctx) => {
  if (values.assign_type === 'specific' && !values.assigned_to) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['assigned_to'],
      message: 'Please select an intern',
    })
  }

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

export default function TaskCreationPage() {
  const [workers, setWorkers] = useState<Profile[]>([])
  const [isLoadingWorkers, setIsLoadingWorkers] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      description: '',
      due_date: '',
      priority: 'medium',
      assign_type: 'all',
      assigned_to: '',
    },
  })

  useEffect(() => {
    const fetchWorkers = async () => {
      setIsLoadingWorkers(true)
      const { data } = await supabase
        .from('profiles')
        .select('id,email,full_name,role')
        .eq('role', 'worker')
        .order('full_name', { ascending: true })

      setWorkers(data || [])
      setIsLoadingWorkers(false)
    }

    fetchWorkers()
  }, [])

  const assignmentType = form.watch('assign_type')
  const recipientsCount = assignmentType === 'specific' ? 1 : workers.length
  const selectedPriority = form.watch('priority')

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true)
    setStatusMessage(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setStatusMessage({ type: 'error', text: 'Session expired. Please log in again.' })
      setIsSubmitting(false)
      return
    }

    const taskData = {
      title: values.title.trim(),
      description: values.description.trim(),
      due_date: values.due_date,
      priority: values.priority,
      status: 'pending',
      created_by: user.id,
      assigned_role: values.assign_type === 'all' ? 'worker' : null,
      assigned_to: values.assign_type === 'specific' ? values.assigned_to : null,
    }

    const { error } = await supabase
      .from('tasks')
      .insert(taskData)

    if (!error) {
      const recipients =
        values.assign_type === 'specific' && values.assigned_to
          ? [values.assigned_to]
          : workers.map((worker) => worker.id)

      if (recipients.length > 0) {
        const { error: notificationError } = await supabase.from('notifications').insert(
          recipients.map((userId) => ({
            user_id: userId,
            type: 'task',
            title: 'New Task Assigned',
            message: `A new ${values.priority} priority task "${values.title}" was assigned to you.`,
            link: '/my-tasks',
            is_read: false,
            metadata: {
              task_id: null,
              task_title: values.title,
              priority: values.priority,
              action_required: true,
            },
          })),
        )

        if (notificationError) {
          setStatusMessage({
            type: 'error',
            text: 'Task was created, but notifications could not be sent.',
          })
        }
      }

      form.reset()
      setStatusMessage({
        type: 'success',
        text: `Task created and assigned to ${recipientsCount} intern${recipientsCount === 1 ? '' : 's'}.`,
      })
    } else {
      setStatusMessage({ type: 'error', text: 'Failed to create task. Please try again.' })
    }
    setIsSubmitting(false)
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Task Creation" subtitle="Create new tasks for interns." />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-brand-purple" />
                Task Details
              </CardTitle>
              <CardDescription>
                Define the task scope, deadline, priority, and assignment.
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
                name="assign_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-gray-500" />
                      Assign To
                    </FormLabel>
                    <Select
                      onValueChange={(nextValue: 'all' | 'specific') => {
                        field.onChange(nextValue)
                        if (nextValue === 'all') {
                          form.setValue('assigned_to', '')
                        }
                      }}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select assignment type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="all">All workers</SelectItem>
                        <SelectItem value="specific">Specific intern</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {form.watch('assign_type') === 'specific' && (
                <FormField
                  control={form.control}
                  name="assigned_to"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Select Intern</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select an intern" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {workers.map(worker => (
                            <SelectItem key={worker.id} value={worker.id}>
                              {worker.full_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </CardContent>
          </Card>

          <Card className="h-fit">
            <CardHeader>
              <CardTitle>Assignment Summary</CardTitle>
              <CardDescription>Quick overview before publishing task.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border p-4 space-y-3 bg-gray-50/70">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Recipients</span>
                  <Badge variant="secondary">
                    {recipientsCount} intern{recipientsCount === 1 ? '' : 's'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Priority</span>
                  <Badge
                    className={
                      selectedPriority === 'high'
                        ? 'bg-red-100 text-red-700 hover:bg-red-100'
                        : selectedPriority === 'medium'
                          ? 'bg-amber-100 text-amber-700 hover:bg-amber-100'
                          : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100'
                    }
                  >
                    {selectedPriority}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Available workers</span>
                  <span className="font-medium">{workers.length}</span>
                </div>
              </div>

              <p className="text-xs text-gray-500">
                Tip: keep titles action-oriented and include clear acceptance criteria in the description.
              </p>

              <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting || isLoadingWorkers || workers.length === 0}
              >
                {isSubmitting ? 'Creating...' : 'Create Task'}
              </Button>
            </CardContent>
          </Card>
        </form>
      </Form>
    </div>
  )
}