'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Task } from '@/types'
import { Send, FileText, CheckCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'

interface TaskSubmissionDialogProps {
  task: Task
  onSubmitted?: () => void
  trigger?: React.ReactNode
}

export function TaskSubmissionDialog({ task, onSubmitted, trigger }: TaskSubmissionDialogProps) {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [content, setContent] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim()) {
      setError('Please provide submission content')
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

      // Create submission
      await supabase.from('submissions').insert({
        task_id: task.id,
        worker_id: user.id,
        content: content.trim(),
        status: 'pending_review',
        submitted_at: new Date().toISOString(),
      })

      // Update task status
      await supabase.from('tasks').update({
        status: 'under_review',
        updated_at: new Date().toISOString(),
      }).eq('id', task.id)

      setContent('')
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
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Submit Work for Review</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">{task.title}</h4>
            <p className="text-sm text-gray-600 line-clamp-2">{task.description}</p>
            <div className="flex items-center gap-2 mt-2">
              <FileText className="h-4 w-4 text-gray-500" />
              <span className="text-xs text-gray-500">Task ID: {task.id}</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">
              Submission Details <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="content"
              placeholder="Describe your work, include links, or provide details about your completion..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={5}
              required
            />
            <p className="text-xs text-gray-500">
              Provide details about what you&apos;ve completed, any challenges faced, and resources used.
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium">Submission Guidelines:</p>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>Be specific about what you&apos;ve completed</li>
                  <li>Include any relevant links or resources</li>
                  <li>Mention any challenges or blockers</li>
                  <li>Your work will be reviewed by an admin</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !content.trim()}>
              {isLoading ? 'Submitting...' : 'Submit for Review'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
