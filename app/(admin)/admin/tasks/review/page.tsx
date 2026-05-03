'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Task } from '@/types'
import { TaskCard } from '@/components/TaskCard'
import { PageHeader } from '@/components/PageHeader'
import { Loader2, Inbox } from 'lucide-react'

export default function AdminTaskReviewPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchReviewTasks()
  }, [])

  const fetchReviewTasks = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .eq('status', 'under_review')
      .order('updated_at', { ascending: false })

    setTasks((data as Task[]) || [])
    setLoading(false)
  }

  const handleUpdateStatus = useCallback(async (taskId: string, status: Task['status']) => {
    const task = tasks.find(t => t.id === taskId)
    if (!task) return

    let feedback = null

    if (status === 'rejected') {
      const reason = window.prompt('Please provide feedback on why this task is being rejected:')
      if (reason === null) return // Admin cancelled
      feedback = reason.trim() || 'No feedback provided.'
    }

    // 1. Update the task status
    const { error: taskError } = await supabase
      .from('tasks')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', taskId)

    if (taskError) {
      console.error('Failed to update task:', taskError)
      alert('Failed to update task. Please try again.')
      return
    }

    // 2. If rejected, update the most recent submission
    if (status === 'rejected') {
      // Find the latest submission for this task
      const { data: latestSubmission } = await supabase
        .from('submissions')
        .select('id')
        .eq('task_id', taskId)
        .order('submitted_at', { ascending: false })
        .limit(1)
        .single()

      if (latestSubmission) {
        await supabase
          .from('submissions')
          .update({
            status: 'rejected',
            admin_feedback: feedback,
            reviewed_at: new Date().toISOString()
          })
          .eq('id', latestSubmission.id)
      }
    }

    // 3. Send notification to the assigned worker
    if (task.assigned_to) {
      await supabase.from('notifications').insert({
        user_id: task.assigned_to,
        type: 'task',
        title: status === 'completed' ? 'Task Approved' : 'Task Rejected',
        message: status === 'completed' 
          ? `Your work on "${task.title}" was approved.` 
          : `Your work on "${task.title}" was rejected. Feedback: ${feedback}`,
        link: '/my-tasks',
        is_read: false,
      })
    }

    // 4. Remove the task from the review queue UI
    setTasks(prev => prev.filter(t => t.id !== taskId))
  }, [tasks])

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Task Review" 
        subtitle="Review and approve tasks submitted by interns."
      />

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-500">
          <Loader2 className="h-8 w-8 animate-spin mb-4 text-brand-purple" />
          <p>Loading tasks under review...</p>
        </div>
      ) : tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-500 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50">
          <Inbox className="h-12 w-12 text-gray-300 mb-3" />
          <p className="text-lg font-medium text-gray-600">No tasks to review</p>
          <p className="text-sm">All caught up! Workers haven't submitted any new tasks.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {tasks.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              onUpdateStatus={handleUpdateStatus}
              isWorkerView={false} // Crucial: enables the Approve/Reject buttons
            />
          ))}
        </div>
      )}
    </div>
  )
}
