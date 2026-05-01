'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Submission } from '@/types'
import { PageHeader } from '@/components/PageHeader'
import { SubmissionBadge } from '@/components/SubmissionBadge'
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
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ArrowUpDown } from 'lucide-react'

interface SubmissionWithDetails extends Submission {
  profiles: { full_name: string }
  tasks: { id?: string; title: string }
}

export default function ReviewQueuePage() {
  const [submissions, setSubmissions] = useState<SubmissionWithDetails[]>([])
  const [sortBy, setSortBy] = useState<'submitted_at' | 'status' | 'intern_name' | 'task_title'>('submitted_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [rejectDialog, setRejectDialog] = useState<{ open: boolean; submission: SubmissionWithDetails | null }>({
    open: false,
    submission: null,
  })
  const [feedback, setFeedback] = useState('')

  useEffect(() => {
    const fetchSubmissions = async () => {
      const { data } = await supabase
        .from('submissions')
        .select('*, profiles(full_name), tasks(title)')
        .order('submitted_at', { ascending: false })

      setSubmissions(data || [])
    }

    fetchSubmissions()
  }, [])

  const handleApprove = async (submission: SubmissionWithDetails) => {
    // Optimistic update
    setSubmissions(prev => prev.map(s =>
      s.id === submission.id ? { ...s, status: 'approved' } : s
    ))

    const { error } = await supabase
      .from('submissions')
      .update({
        status: 'approved',
        reviewed_at: new Date().toISOString(),
        feedback: null,
        admin_feedback: null,
      })
      .eq('id', submission.id)

    if (error) {
      // Revert
      setSubmissions(prev => prev.map(s =>
        s.id === submission.id ? { ...s, status: 'pending_review' } : s
      ))
      alert('Failed to approve submission')
      return
    }

    await Promise.all([
      supabase
        .from('tasks')
        .update({ status: 'completed', admin_feedback: null, updated_at: new Date().toISOString() })
        .eq('id', submission.task_id),
      supabase
        .from('notifications')
        .insert({
          user_id: submission.worker_id,
          type: 'submission',
          title: 'Submission Approved',
          message: `Your submission for "${submission.tasks?.title || 'task'}" was approved.`,
          link: '/my-tasks',
          is_read: false,
          metadata: {
            task_id: submission.task_id,
            task_title: submission.tasks?.title,
          },
        }),
    ])
  }

  const handleReject = async () => {
    if (!rejectDialog.submission || !feedback.trim()) return

    // Optimistic update
    setSubmissions(prev => prev.map(s =>
      s.id === rejectDialog.submission!.id ? { ...s, status: 'rejected', admin_feedback: feedback } : s
    ))

    const { error } = await supabase
      .from('submissions')
      .update({
        status: 'rejected',
        admin_feedback: feedback,
        feedback,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', rejectDialog.submission.id)

    if (error) {
      // Revert
      setSubmissions(prev => prev.map(s =>
        s.id === rejectDialog.submission!.id ? { ...s, status: 'pending_review', admin_feedback: undefined } : s
      ))
      alert('Failed to reject submission')
    } else {
      await Promise.all([
        supabase
          .from('tasks')
          .update({
            status: 'rejected',
            admin_feedback: feedback,
            updated_at: new Date().toISOString(),
          })
          .eq('id', rejectDialog.submission.task_id),
        supabase
          .from('notifications')
          .insert({
            user_id: rejectDialog.submission.worker_id,
            type: 'submission',
            title: 'Submission Rejected',
            message: `Your submission for "${rejectDialog.submission.tasks?.title || 'task'}" needs revision.`,
            link: '/my-tasks',
            is_read: false,
            metadata: {
              task_id: rejectDialog.submission.task_id,
              task_title: rejectDialog.submission.tasks?.title,
              action_required: true,
            },
          }),
      ])
      setRejectDialog({ open: false, submission: null })
      setFeedback('')
    }
  }

  const sortedSubmissions = [...submissions].sort((a, b) => {
    let comparison = 0

    switch (sortBy) {
      case 'submitted_at':
        comparison = new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime()
        break
      case 'status':
        comparison = a.status.localeCompare(b.status)
        break
      case 'intern_name':
        comparison = (a.profiles?.full_name || '').localeCompare(b.profiles?.full_name || '')
        break
      case 'task_title':
        comparison = (a.tasks?.title || '').localeCompare(b.tasks?.title || '')
        break
    }

    return sortOrder === 'asc' ? comparison : -comparison
  })

  return (
    <div className="space-y-6">
      <PageHeader title="Submission Review Queue" subtitle="Review and approve intern submissions." />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <ArrowUpDown className="h-4 w-4 text-gray-500" />
          <Select value={sortBy} onValueChange={(value: 'submitted_at' | 'status' | 'intern_name' | 'task_title') => setSortBy(value)}>
            <SelectTrigger className="w-[190px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="submitted_at">Submission Date</SelectItem>
              <SelectItem value="status">Status</SelectItem>
              <SelectItem value="intern_name">Intern Name</SelectItem>
              <SelectItem value="task_title">Task Title</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
        >
          {sortOrder === 'asc' ? 'Ascending' : 'Descending'}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Submissions</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Intern Name</TableHead>
                <TableHead>Task Title</TableHead>
                <TableHead>Submission Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedSubmissions.map(submission => (
                <TableRow
                  key={submission.id}
                  className={
                    submission.status === 'approved' ? 'bg-green-50' :
                    submission.status === 'rejected' ? 'bg-red-50' : ''
                  }
                >
                  <TableCell>{submission.profiles?.full_name}</TableCell>
                  <TableCell>{submission.tasks?.title}</TableCell>
                  <TableCell>{new Date(submission.submitted_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <SubmissionBadge status={submission.status} />
                  </TableCell>
                  <TableCell>
                    {submission.status === 'pending_review' && (
                      <div className="flex flex-wrap gap-2">
                        <Button
                          onClick={() => handleApprove(submission)}
                          size="sm"
                          variant="outline"
                        >
                          Approve
                        </Button>
                        <Dialog
                          open={rejectDialog.open && rejectDialog.submission?.id === submission.id}
                          onOpenChange={(open) => setRejectDialog({ open, submission: open ? submission : null })}
                        >
                          <DialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setRejectDialog({ open: true, submission })}
                            >
                              Reject
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Reject Submission</DialogTitle>
                            </DialogHeader>
                            <Textarea
                              placeholder="Enter feedback for the intern"
                              value={feedback}
                              onChange={(e) => setFeedback(e.target.value)}
                            />
                            <DialogFooter>
                              <Button
                                onClick={() => setRejectDialog({ open: false, submission: null })}
                                variant="outline"
                              >
                                Cancel
                              </Button>
                              <Button onClick={handleReject} disabled={!feedback.trim()}>
                                Reject
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}