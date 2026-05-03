'use client'

import { Task } from '@/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Calendar, AlertCircle, Lock, GripVertical, PlayCircle, CheckCircle2, RotateCcw } from 'lucide-react'
import { memo } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface TaskCardProps {
  task: Task
  onUpdateStatus?: (taskId: string, status: Task['status']) => void
  isWorkerView?: boolean
  isDragging?: boolean
}

const PRIORITY_STYLES: Record<Task['priority'], string> = {
  high:   'bg-red-100 text-red-700 border-red-200',
  medium: 'bg-amber-100 text-amber-700 border-amber-200',
  low:    'bg-emerald-100 text-emerald-700 border-emerald-200',
}

const STATUS_STYLES: Record<Task['status'], string> = {
  pending:      'bg-slate-100 text-slate-600',
  in_progress:  'bg-blue-100 text-blue-700',
  under_review: 'bg-yellow-100 text-yellow-700',
  completed:    'bg-green-100 text-green-700',
  rejected:     'bg-red-100 text-red-700',
}

const STATUS_LABELS: Record<Task['status'], string> = {
  pending:      'To Do',
  in_progress:  'In Progress',
  under_review: 'Under Review',
  completed:    'Done',
  rejected:     'Rejected',
}

// Columns workers can DRAG FROM (they cannot drag from review/done/rejected)
const WORKER_DRAGGABLE_STATUSES: Task['status'][] = ['pending', 'in_progress', 'rejected']

export const TaskCard = memo(function TaskCard({
  task,
  onUpdateStatus,
  isWorkerView = true,
}: TaskCardProps) {
  const isDraggable = !isWorkerView || WORKER_DRAGGABLE_STATUSES.includes(task.status)

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    disabled: !isDraggable,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : 'auto',
  }

  const isOverdue =
    task.due_date && new Date(task.due_date) < new Date() && task.status !== 'completed'

  const isLocked = isWorkerView && (task.status === 'under_review' || task.status === 'completed')

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group rounded-xl border bg-white shadow-sm transition-all duration-200 hover:shadow-md ${
        task.status === 'rejected'
          ? 'border-l-4 border-l-red-500'
          : task.status === 'completed'
          ? 'border-l-4 border-l-green-500'
          : task.status === 'under_review'
          ? 'border-l-4 border-l-amber-400'
          : task.status === 'in_progress'
          ? 'border-l-4 border-l-blue-500'
          : 'border-l-4 border-l-slate-300'
      } ${isDragging ? 'rotate-1 scale-105 shadow-xl' : ''}`}
    >
      {/* Card Top */}
      <div className="flex items-start gap-2 p-3 pb-2">
        {/* Drag Handle */}
        {isDraggable ? (
          <button
            {...attributes}
            {...listeners}
            className="mt-0.5 flex-shrink-0 cursor-grab text-gray-300 hover:text-gray-500 active:cursor-grabbing touch-none"
            title="Drag to move"
          >
            <GripVertical className="h-4 w-4" />
          </button>
        ) : (
          <div className="mt-0.5 flex-shrink-0 text-gray-300" title="Locked — awaiting admin">
            <Lock className="h-4 w-4" />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-gray-900 leading-snug truncate">{task.title}</p>
          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{task.description}</p>
        </div>
      </div>

      {/* Badges */}
      <div className="flex items-center gap-1.5 px-3 pb-2 flex-wrap">
        <Badge className={`text-[10px] px-1.5 py-0 h-5 font-medium border ${PRIORITY_STYLES[task.priority]}`}>
          {task.priority}
        </Badge>
        <Badge className={`text-[10px] px-1.5 py-0 h-5 font-medium ${STATUS_STYLES[task.status]}`}>
          {STATUS_LABELS[task.status]}
        </Badge>
        {task.due_date && (
          <span className={`flex items-center gap-1 text-[10px] ${isOverdue ? 'text-red-600 font-semibold' : 'text-gray-400'}`}>
            <Calendar className="h-3 w-3" />
            {new Date(task.due_date).toLocaleDateString()}
            {isOverdue && <AlertCircle className="h-3 w-3" />}
          </span>
        )}
      </div>

      {/* Admin Feedback (Rejected) */}
      {task.status === 'rejected' && task.admin_feedback && (
        <div className="mx-3 mb-2 rounded-md border border-red-200 bg-red-50 px-3 py-2">
          <p className="text-[10px] font-bold uppercase tracking-wide text-red-600">Admin Feedback</p>
          <p className="mt-0.5 text-xs text-red-800">{task.admin_feedback}</p>
        </div>
      )}

      {/* Action Buttons (Worker) */}
      {isWorkerView && onUpdateStatus && (
        <div className="px-3 pb-3 pt-1 border-t border-gray-100 flex gap-2">
          {task.status === 'pending' && (
            <Button
              size="sm"
              className="h-7 text-xs bg-blue-600 hover:bg-blue-700 text-white flex-1"
              onClick={() => onUpdateStatus(task.id, 'in_progress')}
            >
              <PlayCircle className="h-3.5 w-3.5 mr-1" />
              Start
            </Button>
          )}
          {task.status === 'in_progress' && (
            <Button
              size="sm"
              className="h-7 text-xs bg-brand-purple hover:bg-brand-purple/90 text-white flex-1"
              onClick={() => onUpdateStatus(task.id, 'under_review')}
            >
              <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
              Submit for Review
            </Button>
          )}
          {task.status === 'rejected' && (
            <Button
              size="sm"
              className="h-7 text-xs bg-blue-600 hover:bg-blue-700 text-white flex-1"
              onClick={() => onUpdateStatus(task.id, 'in_progress')}
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1" />
              Re-attempt
            </Button>
          )}
          {isLocked && (
            <p className="text-[10px] text-gray-400 flex items-center gap-1 w-full justify-center py-0.5">
              <Lock className="h-3 w-3" />
              Awaiting admin review
            </p>
          )}
        </div>
      )}

      {/* Admin Action Buttons */}
      {!isWorkerView && onUpdateStatus && task.status === 'under_review' && (
        <div className="px-3 pb-3 pt-1 border-t border-gray-100 flex gap-2">
          <Button
            size="sm"
            className="h-7 text-xs bg-green-600 hover:bg-green-700 text-white flex-1"
            onClick={() => onUpdateStatus(task.id, 'completed')}
          >
            Approve
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs text-red-600 border-red-200 hover:bg-red-50 flex-1"
            onClick={() => onUpdateStatus(task.id, 'rejected')}
          >
            Reject
          </Button>
        </div>
      )}
    </div>
  )
})
