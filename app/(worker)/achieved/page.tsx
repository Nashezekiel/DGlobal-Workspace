'use client'

import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Task } from '@/types'
import { PageHeader } from '@/components/PageHeader'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Loader2, Archive, Calendar, Search, X, Link as LinkIcon, ImageIcon } from 'lucide-react'
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
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const PRIORITY_STYLES: Record<Task['priority'], string> = {
  high:   'bg-red-100 text-red-700 border-red-200',
  medium: 'bg-amber-100 text-amber-700 border-amber-200',
  low:    'bg-emerald-100 text-emerald-700 border-emerald-200',
}

interface ArchivedTask extends Task {
  submission?: { content: string; submitted_at: string } | null
}

function parseSubmissionContent(content: string): { note?: string; link?: string; image?: string } {
  try {
    const parsed = JSON.parse(content)
    if (typeof parsed === 'object' && parsed !== null) return parsed
  } catch {
    // plain text
  }
  return { note: content }
}

export default function WorkerArchivedPage() {
  const [tasks, setTasks] = useState<ArchivedTask[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTask, setSelectedTask] = useState<ArchivedTask | null>(null)

  // Filters
  const [search, setSearch] = useState('')
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all')

  useEffect(() => {
    const fetchArchivedTasks = async () => {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      const { data: tasksData } = await supabase
        .from('tasks')
        .select('*')
        .in('status', ['achieved', 'completed'])
        .or(`assigned_to.eq.${user.id},and(assigned_role.eq.worker,assigned_to.is.null)`)
        .order('updated_at', { ascending: false })

      const taskIds = (tasksData || []).map((t: Task) => t.id)
      const submissionsMap: Record<string, { content: string; submitted_at: string }> = {}

      if (taskIds.length > 0) {
        const { data: subsData } = await supabase
          .from('submissions')
          .select('task_id, content, submitted_at, status')
          .in('task_id', taskIds)
          .eq('status', 'approved')
          .order('submitted_at', { ascending: false })

        for (const sub of (subsData || [])) {
          if (!submissionsMap[sub.task_id]) {
            submissionsMap[sub.task_id] = { content: sub.content, submitted_at: sub.submitted_at }
          }
        }
      }

      const enriched: ArchivedTask[] = (tasksData || []).map((t: Task) => ({
        ...t,
        submission: submissionsMap[t.id] || null,
      }))

      setTasks(enriched)
      setLoading(false)
    }

    fetchArchivedTasks()
  }, [])

  const filtered = useMemo(() => {
    return tasks.filter((task) => {
      if (priorityFilter !== 'all' && task.priority !== priorityFilter) return false
      if (search && !task.title.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
  }, [tasks, search, priorityFilter])

  const hasActiveFilters = search || priorityFilter !== 'all'

  return (
    <div className="space-y-6">
      <PageHeader
        title="Archived Tasks"
        subtitle="A record of all the tasks you have successfully completed."
      />

      {/* Filter bar */}
      <div className="bg-white rounded-xl border shadow-sm p-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by task title..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <Select value={priorityFilter} onValueChange={(v) => setPriorityFilter(v as typeof priorityFilter)}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priorities</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setSearch(''); setPriorityFilter('all') }}
              className="gap-1.5 text-gray-500 hover:text-gray-900"
            >
              <X className="h-4 w-4" />
              Clear
            </Button>
          )}
        </div>
        <p className="text-xs text-gray-400 mt-2">
          Showing {filtered.length} of {tasks.length} archived tasks
        </p>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-gray-500 py-12 justify-center">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading your archived tasks...</span>
        </div>
      ) : tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-xl border shadow-sm">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mb-4">
            <Archive className="h-8 w-8 text-amber-500" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">No archived tasks yet</h3>
          <p className="text-gray-500 max-w-sm">
            When you complete a task and it gets approved, it will appear here.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center bg-white rounded-xl border shadow-sm">
          <Search className="h-10 w-10 text-gray-300 mb-3" />
          <h3 className="text-base font-medium text-gray-900 mb-1">No results found</h3>
          <p className="text-gray-500 text-sm">Try adjusting your filters.</p>
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
                  <TableHead>Original Due Date</TableHead>
                  <TableHead>Proof</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((task) => {
                  const proof = task.submission ? parseSubmissionContent(task.submission.content) : null
                  return (
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
                      <TableCell className="text-gray-600 text-sm">
                        {task.due_date ? new Date(task.due_date).toLocaleDateString() : '—'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          {proof?.link && <LinkIcon className="h-4 w-4 text-blue-500" />}
                          {proof?.image && <ImageIcon className="h-4 w-4 text-green-500" />}
                          {!proof?.link && !proof?.image && <span className="text-xs text-gray-400">—</span>}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Task Details Dialog */}
      <Dialog open={!!selectedTask} onOpenChange={(open) => !open && setSelectedTask(null)}>
        <DialogContent className="max-w-lg w-[95vw] max-h-[90vh] overflow-y-auto sm:w-full">
          {selectedTask && (() => {
            const proof = selectedTask.submission ? parseSubmissionContent(selectedTask.submission.content) : null
            return (
              <>
                <DialogHeader>
                  <DialogTitle className="text-base font-semibold leading-snug pr-6">
                    {selectedTask.title}
                  </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 mt-1">
                  <div className="flex flex-wrap gap-2">
                    <Badge className={`text-xs px-2 py-0.5 font-medium border ${PRIORITY_STYLES[selectedTask.priority]}`}>
                      {selectedTask.priority.charAt(0).toUpperCase() + selectedTask.priority.slice(1)} Priority
                    </Badge>
                    <Badge className="text-xs px-2 py-0.5 font-medium bg-amber-100 text-amber-700">
                      Archived
                    </Badge>
                  </div>

                  {selectedTask.description ? (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">Description</p>
                      <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{selectedTask.description}</p>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 italic">No description provided.</p>
                  )}

                  {selectedTask.due_date && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-600">
                        Original Due Date: {new Date(selectedTask.due_date).toLocaleDateString(undefined, { dateStyle: 'long' })}
                      </span>
                    </div>
                  )}

                  {selectedTask.admin_feedback && (
                    <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-red-600">Admin Feedback</p>
                      <p className="mt-0.5 text-sm text-red-800">{selectedTask.admin_feedback}</p>
                    </div>
                  )}

                  {proof && (proof.link || proof.image || proof.note) && (
                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-3">
                      <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Submission Proof</p>
                      {proof.note && (
                        <div>
                          <p className="text-xs text-gray-500 mb-0.5">Notes</p>
                          <p className="text-sm text-gray-700 whitespace-pre-wrap">{proof.note}</p>
                        </div>
                      )}
                      {proof.link && (
                        <div>
                          <p className="text-xs text-gray-500 mb-0.5">Proof Link</p>
                          <a href={proof.link} target="_blank" rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:underline break-all flex items-center gap-1">
                            <LinkIcon className="h-3.5 w-3.5 flex-shrink-0" />
                            {proof.link}
                          </a>
                        </div>
                      )}
                      {proof.image && (
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Proof Image</p>
                          <img src={proof.image} alt="Submission proof"
                            className="rounded-md border max-h-56 object-contain w-full" />
                        </div>
                      )}
                    </div>
                  )}

                  <div className="pt-2 border-t border-gray-100 space-y-1">
                    <p className="text-xs text-gray-400">
                      Created: {new Date(selectedTask.created_at).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                    </p>
                    {selectedTask.updated_at && (
                      <p className="text-xs text-green-600 font-medium">
                        Archived on: {new Date(selectedTask.updated_at).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                      </p>
                    )}
                  </div>
                </div>
              </>
            )
          })()}
        </DialogContent>
      </Dialog>
    </div>
  )
}
