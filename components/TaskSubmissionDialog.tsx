'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Task } from '@/types'
import { Send, FileText, CheckCircle, Link as LinkIcon } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'

interface TaskSubmissionDialogProps {
  task: Task
  onSubmitted?: () => void
  trigger?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function TaskSubmissionDialog({
  task,
  onSubmitted,
  trigger,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: TaskSubmissionDialogProps) {
  const [localOpen, setLocalOpen] = useState(false)
  const open = controlledOpen !== undefined ? controlledOpen : localOpen
  const setOpen = controlledOnOpenChange !== undefined ? controlledOnOpenChange : setLocalOpen

  const [isLoading, setIsLoading] = useState(false)
  const [note, setNote] = useState('')
  const [proofLink, setProofLink] = useState('')
  const [error, setError] = useState('')

  const countWords = (text: string) => {
    return text.trim().split(/\s+/).filter(Boolean).length
  }

  const wordCount = countWords(note)
  const isNoteValid = wordCount >= 5
  const isLinkValid = proofLink.trim().length > 0
  const isValid = isNoteValid && isLinkValid

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isLinkValid) {
      setError('Please provide a valid proof link.')
      return
    }
    if (!isNoteValid) {
      setError('Your submission note must be at least 5 words long.')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError('You must be logged in to submit work')
        return
      }

      // Build structured content — backward-compatible JSON
      const contentPayload = JSON.stringify({
        note: note.trim(),
        link: proofLink.trim(),
      })

      await supabase.from('submissions').insert({
        task_id: task.id,
        worker_id: user.id,
        content: contentPayload,
        status: 'pending_review',
        submitted_at: new Date().toISOString(),
      })

      await supabase.from('tasks').update({
        status: 'under_review',
        updated_at: new Date().toISOString(),
      }).eq('id', task.id)

      // Reset form
      setNote('')
      setProofLink('')
      setOpen(false)
      onSubmitted?.()
    } catch (err) {
      console.error('Failed to submit task:', err)
      setError('Failed to submit task. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Send className="h-4 w-4 mr-2" />
            Submit Work
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[540px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Submit Work for Review</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Task info */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-1">{task.title}</h4>
            <p className="text-sm text-gray-600 line-clamp-2">{task.description}</p>
            <div className="flex items-center gap-2 mt-2">
              <FileText className="h-4 w-4 text-gray-500" />
              <span className="text-xs text-gray-500">Task ID: {task.id.slice(0, 8)}</span>
            </div>
          </div>

          {/* Notes / description */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label htmlFor="note" className="text-gray-900 font-semibold">
                Submission Notes <span className="text-red-500">*</span>
              </Label>
              <span className={`text-xs ${isNoteValid ? 'text-green-600 font-medium' : 'text-amber-600'}`}>
                {wordCount === 0 ? '5 words minimum' : `${wordCount} words (minimum 5)`}
              </span>
            </div>
            <Textarea
              id="note"
              placeholder="Describe what you completed, any challenges faced, or additional context..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={4}
              required
            />
          </div>

          {/* Proof link */}
          <div className="space-y-2">
            <Label htmlFor="proof-link" className="flex items-center gap-1.5 text-gray-900 font-semibold">
              <LinkIcon className="h-3.5 w-3.5 text-blue-500" />
              Proof Link <span className="text-red-500">*</span>
            </Label>
            <Input
              id="proof-link"
              type="url"
              placeholder="https://drive.google.com/... or any relevant URL"
              value={proofLink}
              onChange={(e) => setProofLink(e.target.value)}
              required
            />
            <p className="text-xs text-gray-400">
              Link to a Google Drive file, Figma design, GitHub PR, live site, etc.
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Guidelines */}
          <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium">Submission Guidelines:</p>
                <ul className="list-disc list-inside mt-1 space-y-1 text-blue-700">
                  <li>Both submission notes and a proof link are required</li>
                  <li>Submission notes must be at least 5 words long</li>
                  <li>An admin will review your submission before marking it archived</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !isValid}>
              {isLoading ? 'Submitting...' : 'Submit for Review'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

