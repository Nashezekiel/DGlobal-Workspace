'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Task, Submission } from '@/types'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'

export default function ReportsPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [profile, setProfile] = useState<{ full_name: string } | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [tasksData, submissionsData, profileData] = await Promise.all([
        supabase
          .from('tasks')
          .select('*')
          .or(`assigned_to.eq.${user.id},and(assigned_role.eq.worker,assigned_to.is.null)`),
        supabase
          .from('submissions')
          .select('*')
          .eq('worker_id', user.id),
        supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .single()
      ])

      setTasks(tasksData.data || [])
      setSubmissions(submissionsData.data || [])
      setProfile(profileData.data as { full_name: string } | null)
    }

    fetchData()
  }, [])

  const completedCount = tasks.filter(task => task.status === 'completed').length
  const totalAssigned = tasks.length
  const progressPercent = totalAssigned > 0 ? (completedCount / totalAssigned) * 100 : 0

  const generatePDF = async (period: 'weekly' | 'monthly') => {
    setIsGenerating(true)
    try {
      const periodDays = period === 'weekly' ? 7 : 30
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - periodDays)

      const periodTasks = tasks.filter(task => new Date(task.created_at) >= startDate)
      const periodSubmissions = submissions.filter(sub => new Date(sub.submitted_at) >= startDate)
      const completedInPeriod = periodTasks.filter(task => task.status === 'completed').length
      const pendingInPeriod = periodTasks.filter(task => task.status !== 'completed').length
      const feedbackReceived = periodSubmissions.filter(sub => sub.admin_feedback).map(sub => sub.admin_feedback)

      const reportHtml = `
      <div style="padding: 20px; font-family: Arial, sans-serif;">
        <h1>Progress Report</h1>
        <p><strong>Worker:</strong> ${profile?.full_name || 'Unknown'}</p>
        <p><strong>Period:</strong> ${period === 'weekly' ? 'Last 7 days' : 'Last 30 days'}</p>
        <p><strong>Tasks Completed:</strong> ${completedInPeriod}</p>
        <p><strong>Tasks Pending:</strong> ${pendingInPeriod}</p>
        <h2>Admin Feedback Received</h2>
        <ul>
          ${feedbackReceived.map(fb => `<li>${fb}</li>`).join('')}
        </ul>
      </div>
    `

      const element = document.createElement('div')
      element.innerHTML = reportHtml
      element.style.position = 'absolute'
      element.style.left = '-9999px'
      document.body.appendChild(element)

      const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
        import('jspdf'),
        import('html2canvas'),
      ])

      const canvas = await html2canvas(element)
      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF()
      const imgWidth = 210 // A4 width in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight)
      pdf.save(`${period}-report.pdf`)

      document.body.removeChild(element)
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Reports" subtitle="View your progress and download reports." />

      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Progress Summary</h2>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex justify-between mb-2">
            <span>Completed Tasks</span>
            <span>{completedCount} / {totalAssigned}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-4">
            <div
              className="bg-brand-purple h-4 rounded-full"
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-4">Download Section</h2>
        <div className="flex space-x-4">
          <Button
            onClick={() => generatePDF('weekly')}
            disabled={isGenerating}
            className="bg-brand-purple text-white hover:bg-brand-purple/80"
          >
            Download Weekly PDF
          </Button>
          <Button
            onClick={() => generatePDF('monthly')}
            disabled={isGenerating}
            className="bg-brand-purple text-white hover:bg-brand-purple/80"
          >
            Download Monthly PDF
          </Button>
        </div>
      </div>
    </div>
  )
}