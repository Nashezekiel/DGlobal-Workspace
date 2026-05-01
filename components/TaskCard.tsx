'use client'

import { Task } from '@/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar, User, Clock, AlertCircle, Edit2, Trash2 } from 'lucide-react'
import { memo, lazy, Suspense } from 'react'

const TaskSubmissionDialog = lazy(() => import('@/components/TaskSubmissionDialog').then(m => ({ default: m.TaskSubmissionDialog })))

interface TaskCardProps {
  task: Task
  onUpdateStatus?: (taskId: string, status: Task['status']) => void
  onEdit?: (task: Task) => void
  onDelete?: (taskId: string) => void
  showActions?: boolean
  compact?: boolean
}

export const TaskCard = memo(function TaskCard({
  task,
  onUpdateStatus,
  onEdit,
  onDelete,
  showActions = true,
  compact = false,
}: TaskCardProps) {
  const getStatusColor = (status: Task['status']) => {
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

  const getPriorityColor = (priority: Task['priority']) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-700 border-red-200'
      case 'medium':
        return 'bg-orange-100 text-orange-700 border-orange-200'
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'completed'

  return (
    <Card className={`w-full hover:shadow-lg transition-all duration-200 ${
      task.status === 'rejected'
        ? 'border-l-4 border-l-red-500 bg-red-50/40'
        : isOverdue
          ? 'border-red-300 bg-red-50/50'
          : 'border-gray-200'
    }`}>
      <CardHeader className={compact ? 'pb-2' : 'pb-4'}>
        <div className="flex justify-between items-start gap-4">
          <div className="flex-1">
            <CardTitle className="text-lg font-semibold text-gray-900 mb-2">
              {task.title}
            </CardTitle>
            <p className="text-gray-600 text-sm leading-relaxed">{task.description}</p>
          </div>
          <div className="flex flex-col gap-2 flex-shrink-0">
            <Badge className={`text-xs font-medium ${getStatusColor(task.status)}`}>
              {task.status.replace('_', ' ')}
            </Badge>
            <Badge className={`text-xs font-medium ${getPriorityColor(task.priority)}`}>
              {task.priority}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className={`flex items-center gap-4 text-sm text-gray-500 ${compact ? 'mb-2' : 'mb-4'}`}>
          {task.due_date && (
            <div className={`flex items-center gap-1.5 ${
              isOverdue ? 'text-red-600 font-medium' : ''
            }`}>
              <Calendar className="h-4 w-4" />
              <span>
                {new Date(task.due_date).toLocaleDateString()}
                {isOverdue && (
                  <span className="ml-1 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Overdue
                  </span>
                )}
              </span>
            </div>
          )}
          {task.assigned_to && (
            <div className="flex items-center gap-1.5">
              <User className="h-4 w-4" />
              <span>Assigned</span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <Clock className="h-4 w-4" />
            <span>Created {new Date(task.created_at).toLocaleDateString()}</span>
          </div>
        </div>

        {task.status === 'rejected' && task.admin_feedback && (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-red-700">Admin Feedback</p>
            <p className="mt-1 text-sm text-red-800">{task.admin_feedback}</p>
          </div>
        )}

        {showActions && onUpdateStatus && (
          <div className="flex gap-2 pt-2 border-t border-gray-100">
            {onEdit && (
              <Button
                onClick={() => onEdit(task)}
                size="sm"
                variant="ghost"
                className="text-gray-600 hover:text-gray-900"
              >
                <Edit2 className="h-4 w-4" />
              </Button>
            )}
            {onDelete && (
              <Button
                onClick={() => onDelete(task.id)}
                size="sm"
                variant="ghost"
                className="text-red-600 hover:text-red-900"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
            {task.status === 'pending' && (
              <>
                <Button
                  onClick={() => onUpdateStatus(task.id, 'in_progress')}
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Start
                </Button>
                <Button
                  onClick={() => onUpdateStatus(task.id, 'under_review')}
                  size="sm"
                  variant="outline"
                >
                  Review
                </Button>
              </>
            )}
            {task.status === 'in_progress' && (
              <>
                <Suspense fallback={<Button size="sm" variant="outline" disabled>Submit</Button>}>
                  <TaskSubmissionDialog 
                    task={task}
                    onSubmitted={() => onUpdateStatus?.(task.id, 'under_review')}
                    trigger={
                      <Button size="sm" variant="outline">
                        Submit
                      </Button>
                    }
                  />
                </Suspense>
                <Button
                  onClick={() => onUpdateStatus(task.id, 'completed')}
                  size="sm"
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  Done
                </Button>
              </>
            )}
            {task.status === 'under_review' && (
              <>
                <Button
                  onClick={() => onUpdateStatus(task.id, 'in_progress')}
                  size="sm"
                  variant="outline"
                >
                  Reopen
                </Button>
                <Button
                  onClick={() => onUpdateStatus(task.id, 'completed')}
                  size="sm"
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  Approve
                </Button>
              </>
            )}
            {task.status === 'completed' && (
              <Button
                onClick={() => onUpdateStatus(task.id, 'in_progress')}
                size="sm"
                variant="outline"
              >
                Reopen
              </Button>
            )}
            {task.status === 'rejected' && (
              <Button
                onClick={() => onUpdateStatus(task.id, 'in_progress')}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Revise & Resubmit
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
})
