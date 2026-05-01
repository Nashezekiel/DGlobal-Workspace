'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Profile } from '@/types'
import { PageHeader } from '@/components/PageHeader'
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

interface WorkerStats extends Profile {
  tasksAssigned: number
  tasksCompleted: number
}

type TaskSummary = {
  assigned_to: string | null
  assigned_role: string | null
  status: string
}

export default function TeamManagementPage() {
  const [workers, setWorkers] = useState<WorkerStats[]>([])
  const [messageDialog, setMessageDialog] = useState<{ open: boolean; worker: WorkerStats | null }>({
    open: false,
    worker: null,
  })
  const [message, setMessage] = useState('')

  useEffect(() => {
    const fetchWorkers = async () => {
      const [profilesResult, tasksResult] = await Promise.all([
        supabase
          .from('profiles')
          .select('*')
          .eq('role', 'worker'),
        supabase
          .from('tasks')
          .select('assigned_to,assigned_role,status'),
      ])

      const profiles: Profile[] = (profilesResult.data || []) as Profile[]
      const tasks: TaskSummary[] = (tasksResult.data || []) as TaskSummary[]
      if (profiles.length === 0) return

      const globalAssignedCount = tasks.filter(
        (task) => task.assigned_role === 'worker' && !task.assigned_to,
      ).length
      const globalCompletedCount = tasks.filter(
        (task) => task.assigned_role === 'worker' && !task.assigned_to && task.status === 'completed',
      ).length

      const workersWithStats: WorkerStats[] = profiles.map((profile) => {
        const assignedSpecific = tasks.filter((task) => task.assigned_to === profile.id).length
        const completedSpecific = tasks.filter(
          (task) => task.assigned_to === profile.id && task.status === 'completed',
        ).length

        return {
          ...profile,
          tasksAssigned: assignedSpecific + globalAssignedCount,
          tasksCompleted: completedSpecific + globalCompletedCount,
        }
      })

      setWorkers(workersWithStats)
    }

    fetchWorkers()
  }, [])

  const handleSendMessage = async () => {
    if (!messageDialog.worker || !message.trim()) return

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase
      .from('messages')
      .insert({
        room_id: 'General',
        sender_id: user.id,
        content: `@${messageDialog.worker.full_name}: ${message.trim()}`,
      })

    setMessageDialog({ open: false, worker: null })
    setMessage('')
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Team Management" subtitle="Manage the Elite 8 interns." />

      <Card>
        <CardHeader>
          <CardTitle>Workers</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Role/Track</TableHead>
                <TableHead>Tasks Assigned</TableHead>
                <TableHead>Tasks Completed</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {workers.map(worker => (
                <TableRow key={worker.id}>
                  <TableCell>{worker.full_name}</TableCell>
                  <TableCell>Intern</TableCell>
                  <TableCell>{worker.tasksAssigned}</TableCell>
                  <TableCell>{worker.tasksCompleted}</TableCell>
                  <TableCell>Active</TableCell>
                  <TableCell>
                    <Dialog
                      open={messageDialog.open && messageDialog.worker?.id === worker.id}
                      onOpenChange={(open) => setMessageDialog({ open, worker: open ? worker : null })}
                    >
                      <DialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setMessageDialog({ open: true, worker })}
                        >
                          Quick Message
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Message {worker.full_name}</DialogTitle>
                        </DialogHeader>
                        <Textarea
                          placeholder="Enter your message"
                          value={message}
                          onChange={(e) => setMessage(e.target.value)}
                        />
                        <DialogFooter>
                          <Button
                            onClick={() => setMessageDialog({ open: false, worker: null })}
                            variant="outline"
                          >
                            Cancel
                          </Button>
                          <Button onClick={handleSendMessage} disabled={!message.trim()}>
                            Send
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
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