'use client'

import { useState, useRef } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Task } from '@/types'
import { Send, FileText, CheckCircle, Link as LinkIcon, ImageIcon, X } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'

interface TaskSubmissionDialogProps {
  task: Task
  onSubmitted?: () => void
  trigger?: React.ReactNode
}

export function TaskSubmissionDialog({ task, onSubmitted, trigger }: TaskSubmissionDialogProps) {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [note, setNote] = useState('')
  const [proofLink, setProofLink] = useState('')
  const [proofImage, setProofImage] = useState<string | null>(null)
  const [proofImageName, setProofImageName] = useState('')
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be under 5MB')
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      const img = new window.Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        const MAX = 1200
        const scale = Math.min(MAX / img.width, MAX / img.height, 1)
        canvas.width = img.width * scale
        canvas.height = img.height * scale
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
          setProofImage(canvas.toDataURL('image/jpeg', 0.82))
          setProofImageName(file.name)
          setError('')
        }
      }
      img.src = event.target?.result as string
    }
    reader.readAsDataURL(file)
  }

  const removeImage = () => {
    setProofImage(null)
    setProofImageName('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const isValid = note.trim() || proofLink.trim() || proofImage

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValid) {
      setError('Please provide at least a note, a proof link, or an image.')
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
        note: note.trim() || undefined,
        link: proofLink.trim() || undefined,
        image: proofImage || undefined,
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
      setProofImage(null)
      setProofImageName('')
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
            <Label htmlFor="note">
              Submission Notes <span className="text-gray-400 text-xs font-normal">(optional)</span>
            </Label>
            <Textarea
              id="note"
              placeholder="Describe what you completed, any challenges faced, or additional context..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={4}
            />
          </div>

          {/* Proof link */}
          <div className="space-y-2">
            <Label htmlFor="proof-link" className="flex items-center gap-1.5">
              <LinkIcon className="h-3.5 w-3.5 text-blue-500" />
              Proof Link <span className="text-gray-400 text-xs font-normal">(optional)</span>
            </Label>
            <Input
              id="proof-link"
              type="url"
              placeholder="https://drive.google.com/... or any relevant URL"
              value={proofLink}
              onChange={(e) => setProofLink(e.target.value)}
            />
            <p className="text-xs text-gray-400">
              Link to a Google Drive file, Figma design, GitHub PR, live site, etc.
            </p>
          </div>

          {/* Proof image */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <ImageIcon className="h-3.5 w-3.5 text-green-500" />
              Proof Image <span className="text-gray-400 text-xs font-normal">(optional, max 5MB)</span>
            </Label>
            {proofImage ? (
              <div className="relative rounded-lg border border-gray-200 overflow-hidden">
                <img
                  src={proofImage}
                  alt="Proof preview"
                  className="w-full max-h-48 object-contain bg-gray-50"
                />
                <button
                  type="button"
                  onClick={removeImage}
                  className="absolute top-2 right-2 bg-white/90 hover:bg-white rounded-full p-1 shadow text-gray-600 hover:text-red-500 transition-colors"
                  title="Remove image"
                >
                  <X className="h-4 w-4" />
                </button>
                <div className="px-3 py-1.5 bg-gray-50 border-t border-gray-200">
                  <p className="text-xs text-gray-500 truncate">{proofImageName}</p>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full border-2 border-dashed border-gray-200 rounded-lg p-6 text-center hover:border-brand-purple/40 hover:bg-purple-50/30 transition-colors cursor-pointer"
              >
                <ImageIcon className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">Click to upload a screenshot or image</p>
                <p className="text-xs text-gray-400 mt-1">PNG, JPG, GIF up to 5MB</p>
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
            />
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
                  <li>At least one of: notes, link, or image is required</li>
                  <li>Attach a screenshot or link as proof of completion</li>
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
