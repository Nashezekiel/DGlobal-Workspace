'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Task } from '@/types'
import { TaskCard } from '@/components/TaskCard'
import { PageHeader } from '@/components/PageHeader'
import {
  Loader2,
  Inbox,
  Link as LinkIcon,
  Image as ImageIcon,
  FileText,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Paperclip,
} from 'lucide-react'
import { ImageLightbox } from '@/components/ImageLightbox'

// ─── Extended type that includes the joined submissions ───────────────────────
interface TaskWithSubmissions extends Task {
  submissions?: Array<{
    id: string
    content: string
    status: string
    submitted_at: string
    profiles?: { full_name: string }
  }>
}

interface ParsedContent {
  note?: string
  link?: string
  image?: string
}

function parseContent(raw: string): ParsedContent {
  try {
    return JSON.parse(raw) as ParsedContent
  } catch {
    // Fallback: treat the raw string as a plain-text note
    return { note: raw }
  }
}

// ─── Collapsible evidence panel rendered below each TaskCard ─────────────────
function EvidencePanel({
  submissions,
}: {
  submissions: TaskWithSubmissions['submissions']
}) {
  const [open, setOpen] = useState(false)

  if (!submissions || submissions.length === 0) return null

  // Show the most recently submitted entry
  const latest = [...submissions].sort(
    (a, b) =>
      new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime()
  )[0]

  const content = parseContent(latest.content)
  const hasEvidence = content.note || content.link || content.image

  if (!hasEvidence) return null

  // Build a short summary for the toggle button
  const badges: string[] = []
  if (content.note) badges.push('Note')
  if (content.link) badges.push('Link')
  if (content.image) badges.push('Image')

  return (
    <div className="rounded-b-xl border border-t-0 border-amber-200 overflow-hidden">
      {/* Toggle button */}
      <button
        onClick={() => setOpen(prev => !prev)}
        className="w-full flex items-center gap-2 px-3 py-2 bg-amber-50 hover:bg-amber-100 transition-colors text-left"
      >
        <Paperclip className="h-3.5 w-3.5 text-amber-600 flex-shrink-0" />
        <span className="text-xs font-semibold text-amber-700 flex-1">
          View Evidence
        </span>
        {/* Attachment type badges */}
        <span className="flex items-center gap-1">
          {badges.map(b => (
            <span
              key={b}
              className="text-[10px] bg-amber-200 text-amber-800 rounded-full px-1.5 py-0 font-medium"
            >
              {b}
            </span>
          ))}
        </span>
        {open
          ? <ChevronUp className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
          : <ChevronDown className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />}
      </button>

      {/* Collapsible body */}
      {open && (
        <div className="bg-amber-50 border-t border-amber-100 p-3 space-y-2">
          {/* Submitted by + timestamp */}
          <p className="text-[10px] text-amber-500 flex items-center justify-between">
            {latest.profiles?.full_name && (
              <span className="font-medium text-amber-700">by {latest.profiles.full_name}</span>
            )}
            <span>Submitted: {new Date(latest.submitted_at).toLocaleString()}</span>
          </p>

          {/* Submission note */}
          {content.note && (
            <div className="flex gap-2 bg-white rounded-md px-3 py-2 border border-amber-100">
              <FileText className="h-3.5 w-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-amber-900 whitespace-pre-wrap leading-relaxed">{content.note}</p>
            </div>
          )}

          {/* Proof link */}
          {content.link && (
            <a
              href={content.link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-blue-700 hover:text-blue-900 bg-white rounded-md px-3 py-2 border border-blue-100 hover:border-blue-300 transition-colors group"
            >
              <LinkIcon className="h-3.5 w-3.5 flex-shrink-0 text-blue-500" />
              <span className="truncate flex-1 text-xs">{content.link}</span>
              <ExternalLink className="h-3 w-3 flex-shrink-0 opacity-40 group-hover:opacity-100 transition-opacity" />
            </a>
          )}

          {/* Proof image — click to enlarge */}
          {content.image && (
            <div className="rounded-md overflow-hidden border border-amber-100 bg-white">
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 border-b border-amber-100">
                <ImageIcon className="h-3.5 w-3.5 text-green-600" />
                <span className="text-xs text-gray-500">Screenshot / Proof Image — click to enlarge</span>
              </div>
              <ImageLightbox src={content.image} alt="Proof submitted by worker" />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function AdminTaskReviewPage() {
  const [tasks, setTasks] = useState<TaskWithSubmissions[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchReviewTasks()
  }, [])

  const fetchReviewTasks = async () => {
    setLoading(true)

    // Join the submissions table so the evidence is available immediately
    const { data } = await supabase
      .from('tasks')
      .select(`
        *,
        submissions(
          id,
          content,
          status,
          submitted_at,
          profiles!worker_id(full_name)
        )
      `)
      .eq('status', 'under_review')
      .order('updated_at', { ascending: false })

    setTasks((data as TaskWithSubmissions[]) || [])
    setLoading(false)
  }

  const handleUpdateStatus = useCallback(
    async (taskId: string, status: Task['status']) => {
      const task = tasks.find(t => t.id === taskId)
      if (!task) return

      let feedback = ''

      if (status === 'rejected') {
        let reason = ''
        while (reason.trim() === '') {
          const promptVal = window.prompt(
            'Please provide feedback on why this task is being rejected (required):'
          )
          if (promptVal === null) return // Admin cancelled
          reason = promptVal.trim()
          if (reason === '') {
            alert('A rejection feedback note is required to reject the task.')
          }
        }
        feedback = reason
      } else if (status === 'completed') {
        let note = ''
        while (true) {
          const promptVal = window.prompt(
            'Please provide an acceptance note / approval feedback (required, at least 5 words):'
          )
          if (promptVal === null) return // Admin cancelled
          const trimmed = promptVal.trim()
          const wordCount = trimmed.split(/\s+/).filter(Boolean).length
          if (wordCount < 5) {
            alert(`Approval note must be at least 5 words long. (Current count: ${wordCount} words)`)
          } else {
            note = trimmed
            break
          }
        }
        feedback = note
      }

      // 1. Update the task status and feedback
      const { error: taskError } = await supabase
        .from('tasks')
        .update({ 
          status, 
          admin_feedback: feedback || null,
          updated_at: new Date().toISOString() 
        })
        .eq('id', taskId)

      if (taskError) {
        console.error('Failed to update task:', taskError)
        alert('Failed to update task. Please try again.')
        return
      }

      // 2. Stamp the most recent submission with the status and feedback
      if (status === 'completed' || status === 'rejected') {
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
              status: status === 'completed' ? 'approved' : 'rejected',
              feedback: feedback || null,
              admin_feedback: feedback || null,
              reviewed_at: new Date().toISOString(),
            })
            .eq('id', latestSubmission.id)
        }
      }

      // 3. Notify the assigned worker
      if (task.assigned_to) {
        await supabase.from('notifications').insert({
          user_id: task.assigned_to,
          type: 'task',
          title: status === 'completed' ? 'Submission Approved ✅' : 'Submission Rejected',
          message:
            status === 'completed'
              ? `Your work on "${task.title}" was approved. Note from admin: ${feedback}`
              : `Your work on "${task.title}" was rejected. Feedback: ${feedback}`,
          link: '/my-tasks',
          is_read: false,
        })
      }

      // 4. Remove from the review queue
      setTasks(prev => prev.filter(t => t.id !== taskId))
    },
    [tasks]
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Task Review"
        subtitle="Review and approve tasks submitted by workers — evidence is shown below each card."
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
          <p className="text-sm">All caught up! Workers haven&apos;t submitted any new tasks.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {tasks.map(task => (
            // Wrapper keeps the TaskCard and its EvidencePanel visually connected
            <div key={task.id} className="flex flex-col">
              <TaskCard
                task={task}
                onUpdateStatus={handleUpdateStatus}
                isWorkerView={false}
              />
              <EvidencePanel submissions={task.submissions} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
