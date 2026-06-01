'use client'

import { Task } from '@/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Calendar, AlertCircle, Lock, GripVertical, PlayCircle, CheckCircle2, RotateCcw, Trophy, ChevronRight } from 'lucide-react'
import { memo, useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { TaskSubmissionDialog } from '@/components/TaskSubmissionDialog'

interface TaskCardProps {
  task: Task
  onUpdateStatus?: (taskId: string, status: Task['status']) => void
  isWorkerView?: boolean
  isDragging?: boolean
  isAdminView?: boolean
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
  achieved:     'bg-amber-100 text-amber-700',
}

const STATUS_LABELS: Record<Task['status'], string> = {
  pending:      'To Do',
  in_progress:  'In Progress',
  under_review: 'Under Review',
  completed:    'Done',
  rejected:     'Rejected',
  achieved:     'Achieved',
}

// Columns workers can DRAG FROM (they cannot drag from review/done/rejected)
const WORKER_DRAGGABLE_STATUSES: Task['status'][] = ['pending', 'in_progress', 'rejected', 'completed']

export const TaskCard = memo(function TaskCard({
  task,
  onUpdateStatus,
  isWorkerView = true,
  isAdminView = false,
}: TaskCardProps) {
  const [detailOpen, setDetailOpen] = useState(false)

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
    task.due_date && new Date(task.due_date) < new Date() && task.status !== 'completed' && task.status !== 'achieved'

  // Only lock for under_review — completed cards should NOT show "Awaiting admin review"
  const isLocked = isWorkerView && task.status === 'under_review'

  return (
    <>
      {/* ─── Detail Dialog ─── */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-lg w-[95vw] max-h-[90vh] overflow-y-auto sm:w-full">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold leading-snug pr-6">
              {task.title}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-1">
            {/* Badges row */}
            <div className="flex flex-wrap gap-2">
              <Badge className={`text-xs px-2 py-0.5 font-medium border ${PRIORITY_STYLES[task.priority]}`}>
                {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)} Priority
              </Badge>
              <Badge className={`text-xs px-2 py-0.5 font-medium ${STATUS_STYLES[task.status]}`}>
                {STATUS_LABELS[task.status]}
              </Badge>
            </div>

            {/* Full description */}
            {task.description ? (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">Description</p>
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{task.description}</p>
              </div>
            ) : (
              <p className="text-sm text-gray-400 italic">No description provided.</p>
            )}

            {/* Due Date */}
            {task.due_date && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-400" />
                <span className={`text-sm ${isOverdue ? 'text-red-600 font-semibold' : 'text-gray-600'}`}>
                  Due: {new Date(task.due_date).toLocaleDateString(undefined, { dateStyle: 'long' })}
                  {isOverdue && <span className="ml-1 text-red-500">(Overdue)</span>}
                </span>
              </div>
            )}

            {/* Admin Feedback — Rejection (red) or Acceptance (green) */}
            {task.admin_feedback && (
              <div className={`rounded-md border px-3 py-2 ${
                task.status === 'completed' || task.status === 'achieved'
                  ? 'border-green-200 bg-green-50'
                  : 'border-red-200 bg-red-50'
              }`}>
                <p className={`text-[10px] font-bold uppercase tracking-wide ${
                  task.status === 'completed' || task.status === 'achieved'
                    ? 'text-green-700'
                    : 'text-red-600'
                }`}>
                  {task.status === 'completed' || task.status === 'achieved' ? '✅ Admin Note' : 'Admin Feedback'}
                </p>
                <p className={`mt-0.5 text-sm ${
                  task.status === 'completed' || task.status === 'achieved'
                    ? 'text-green-800'
                    : 'text-red-800'
                }`}>{task.admin_feedback}</p>
              </div>
            )}

            {/* Timestamps */}
            <div className="pt-2 border-t border-gray-100 space-y-1">
              <p className="text-xs text-gray-400">
                Created: {new Date(task.created_at).toLocaleDateString(undefined, { dateStyle: 'medium' })}
              </p>
              {task.updated_at && (
                <p className="text-xs text-gray-400">
                  Last updated: {new Date(task.updated_at).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                </p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── Card ─── */}
      <div
        ref={setNodeRef}
        style={style}
        className={`group rounded-xl border bg-white shadow-sm transition-all duration-200 hover:shadow-md ${
          task.status === 'rejected'
            ? 'border-l-4 border-l-red-500'
            : task.status === 'achieved'
            ? 'border-l-4 border-l-amber-400'
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

          {/* Clickable title + description area → opens detail dialog or admin detail page */}
          {isAdminView ? (
            <a
              href={`/admin/tasks/${task.id}`}
              className="flex-1 min-w-0 text-left group/title block"
              title="Click to view full admin details"
            >
              <p className="font-semibold text-sm text-gray-900 leading-snug truncate group-hover/title:text-purple-700 transition-colors">
                {task.title}
              </p>
              <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{task.description}</p>
              <span className="inline-flex items-center gap-0.5 text-[10px] text-gray-300 group-hover/title:text-purple-400 mt-1 transition-colors">
                Admin Details <ChevronRight className="h-3 w-3" />
              </span>
            </a>
          ) : (
            <button
              className="flex-1 min-w-0 text-left group/title"
              onClick={() => setDetailOpen(true)}
              title="Click to view full details"
            >
              <p className="font-semibold text-sm text-gray-900 leading-snug truncate group-hover/title:text-purple-700 transition-colors">
                {task.title}
              </p>
              <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{task.description}</p>
              <span className="inline-flex items-center gap-0.5 text-[10px] text-gray-300 group-hover/title:text-purple-400 mt-1 transition-colors">
                View details <ChevronRight className="h-3 w-3" />
              </span>
            </button>
          )}
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

        {/* Admin Feedback — shown on card inline */}
        {task.admin_feedback && (
          <div className={`mx-3 mb-2 rounded-md border px-3 py-2 ${
            task.status === 'completed' || task.status === 'achieved'
              ? 'border-green-200 bg-green-50'
              : 'border-red-200 bg-red-50'
          }`}>
            <p className={`text-[10px] font-bold uppercase tracking-wide ${
              task.status === 'completed' || task.status === 'achieved'
                ? 'text-green-700'
                : 'text-red-600'
            }`}>
              {task.status === 'completed' || task.status === 'achieved' ? '✅ Admin Note' : 'Admin Feedback'}
            </p>
            <p className={`mt-0.5 text-xs ${
              task.status === 'completed' || task.status === 'achieved'
                ? 'text-green-800'
                : 'text-red-800'
            }`}>{task.admin_feedback}</p>
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
              <TaskSubmissionDialog
                task={task}
                onSubmitted={() => onUpdateStatus(task.id, 'under_review')}
                trigger={
                  <Button
                    size="sm"
                    className="h-7 text-xs bg-brand-purple hover:bg-brand-purple/90 text-white flex-1"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                    Submit for Review
                  </Button>
                }
              />
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
            {/* Awaiting admin review — ONLY on under_review, NOT on completed */}
            {isLocked && (
              <p className="text-[10px] text-gray-400 flex items-center gap-1 w-full justify-center py-0.5">
                <Lock className="h-3 w-3" />
                Awaiting admin review
              </p>
            )}
            {/* Move to Achieved — only on completed cards */}
            {task.status === 'completed' && (
              <Button
                size="sm"
                className="h-7 text-xs bg-amber-500 hover:bg-amber-600 text-white flex-1"
                onClick={(e) => {
                  e.stopPropagation()
                  onUpdateStatus(task.id, 'achieved')
                }}
              >
                <Trophy className="h-3.5 w-3.5 mr-1" />
                Move to Achieved
              </Button>
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
    </>
  )
})
