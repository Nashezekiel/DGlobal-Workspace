'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Task } from '@/types'
import { PageHeader } from '@/components/PageHeader'
import { Loader2, Trophy, Calendar } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

const PRIORITY_STYLES: Record<Task['priority'], string> = {
  high:   'bg-red-100 text-red-700 border-red-200',
  medium: 'bg-amber-100 text-amber-700 border-amber-200',
  low:    'bg-emerald-100 text-emerald-700 border-emerald-200',
}

export default function AchievedPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)

  useEffect(() => {
    const fetchAchievedTasks = async () => {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      const { data: tasksData } = await supabase
        .from('tasks')
        .select('*')
        .eq('status', 'achieved')
        .or(`assigned_to.eq.${user.id},and(assigned_role.eq.worker,assigned_to.is.null)`)
        .order('updated_at', { ascending: false })

      setTasks((tasksData || []) as Task[])
      setLoading(false)
    }

    fetchAchievedTasks()
  }, [])

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Achieved Tasks" 
        subtitle="A record of all the tasks you have successfully completed and moved to Achieved." 
      />

      {loading ? (
        <div className="flex items-center gap-2 text-gray-500 py-12 justify-center">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading your achievements...</span>
        </div>
      ) : tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-xl border shadow-sm">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mb-4">
            <Trophy className="h-8 w-8 text-amber-500" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">No achieved tasks yet</h3>
          <p className="text-gray-500 max-w-sm">
            When you complete a task on the My Tasks board, click &quot;Move to Achieved&quot; to build your record here.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50 hover:bg-gray-50">
                  <TableHead className="w-[40%]">Task Title</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Completed Date</TableHead>
                  <TableHead className="text-right">Original Due Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasks.map((task) => (
                  <TableRow 
                    key={task.id} 
                    className="cursor-pointer hover:bg-purple-50 transition-colors"
                    onClick={() => setSelectedTask(task)}
                  >
                    <TableCell className="font-medium text-gray-900">
                      <div className="truncate max-w-md" title={task.title}>
                        {task.title}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={`text-[10px] px-1.5 py-0 h-5 font-medium border ${PRIORITY_STYLES[task.priority]}`}>
                        {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-gray-600 text-sm">
                      {task.updated_at ? new Date(task.updated_at).toLocaleDateString() : 'N/A'}
                    </TableCell>
                    <TableCell className="text-right text-gray-600 text-sm">
                      {task.due_date ? new Date(task.due_date).toLocaleDateString() : '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Task Details Dialog */}
      <Dialog open={!!selectedTask} onOpenChange={(open) => !open && setSelectedTask(null)}>
        <DialogContent className="max-w-lg w-[95vw] max-h-[90vh] overflow-y-auto sm:w-full">
          {selectedTask && (
            <>
              <DialogHeader>
                <DialogTitle className="text-base font-semibold leading-snug pr-6">
                  {selectedTask.title}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4 mt-1">
                {/* Badges row */}
                <div className="flex flex-wrap gap-2">
                  <Badge className={`text-xs px-2 py-0.5 font-medium border ${PRIORITY_STYLES[selectedTask.priority]}`}>
                    {selectedTask.priority.charAt(0).toUpperCase() + selectedTask.priority.slice(1)} Priority
                  </Badge>
                  <Badge className="text-xs px-2 py-0.5 font-medium bg-amber-100 text-amber-700">
                    Achieved
                  </Badge>
                </div>

                {/* Full description */}
                {selectedTask.description ? (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">Description</p>
                    <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{selectedTask.description}</p>
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 italic">No description provided.</p>
                )}

                {/* Due Date */}
                {selectedTask.due_date && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-600">
                      Original Due Date: {new Date(selectedTask.due_date).toLocaleDateString(undefined, { dateStyle: 'long' })}
                    </span>
                  </div>
                )}

                {/* Admin Feedback */}
                {selectedTask.admin_feedback && (
                  <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-red-600">Admin Feedback</p>
                    <p className="mt-0.5 text-sm text-red-800">{selectedTask.admin_feedback}</p>
                  </div>
                )}

                {/* Timestamps */}
                <div className="pt-2 border-t border-gray-100 space-y-1">
                  <p className="text-xs text-gray-400">
                    Created: {new Date(selectedTask.created_at).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                  </p>
                  {selectedTask.updated_at && (
                    <p className="text-xs text-green-600 font-medium">
                      Achieved on: {new Date(selectedTask.updated_at).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                    </p>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
