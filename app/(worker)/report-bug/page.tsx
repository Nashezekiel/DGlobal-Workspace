'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { supabase } from '@/lib/supabase/client'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, CheckCircle, Bug, AlertTriangle, Shield } from 'lucide-react'
import { BugReport } from '@/types'

const formSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(100, 'Title must be less than 100 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters').max(500, 'Description must be less than 500 characters'),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  steps_to_reproduce: z.string().min(10, 'Steps to reproduce must be at least 10 characters'),
  environment: z.string().optional(),
})

export default function ReportBugPage() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [recentReports, setRecentReports] = useState<BugReport[]>([])

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      description: '',
      severity: 'medium',
      steps_to_reproduce: '',
      environment: '',
    },
  })

  useEffect(() => {
    fetchRecentReports()
  }, [])

  const fetchRecentReports = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('bug_reports')
        .select('*')
        .eq('reported_by', user.id)
        .order('created_at', { ascending: false })
        .limit(5)

      if (data) {
        setRecentReports(data as BugReport[])
      }
    } catch (error) {
      console.error('Failed to fetch recent reports:', error)
    }
  }

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase
        .from('bug_reports')
        .insert({
          reported_by: user.id,
          title: values.title,
          description: values.description,
          severity: values.severity,
          status: 'open',
          created_at: new Date().toISOString(),
        })

      if (!error) {
        setSuccess(true)
        form.reset()
        await fetchRecentReports()
        setTimeout(() => setSuccess(false), 3000)
      }
    } catch (error) {
      console.error('Failed to submit bug report:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-700 border-red-200'
      case 'high':
        return 'bg-orange-100 text-orange-700 border-orange-200'
      case 'medium':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200'
      case 'low':
        return 'bg-blue-100 text-blue-700 border-blue-200'
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <AlertCircle className="h-4 w-4" />
      case 'high':
        return <AlertTriangle className="h-4 w-4" />
      case 'medium':
        return <Shield className="h-4 w-4" />
      case 'low':
        return <CheckCircle className="h-4 w-4" />
      default:
        return <Bug className="h-4 w-4" />
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Report Bug" subtitle="Report any issues you encounter with the application" />

      {success && (
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <p className="text-green-800 font-medium">Bug report submitted successfully!</p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bug Report Form */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bug className="h-5 w-5" />
              New Bug Report
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bug Title</FormLabel>
                      <FormControl>
                        <Input placeholder="Brief summary of the issue" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="severity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Severity</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="low">Low - Minor issue</SelectItem>
                          <SelectItem value="medium">Medium - Affects functionality</SelectItem>
                          <SelectItem value="high">High - Major functionality broken</SelectItem>
                          <SelectItem value="critical">Critical - System breaking issue</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe the bug in detail, including what you expected to happen vs what actually happened"
                          className="min-h-24"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="steps_to_reproduce"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Steps to Reproduce</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="1. Go to...&#10;2. Click on...&#10;3. Observe..."
                          className="min-h-20 font-mono text-sm"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="environment"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Environment (Optional)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., Chrome 120, Windows 11, or Mobile Safari iOS 17"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" disabled={isSubmitting} className="w-full">
                  {isSubmitting ? 'Submitting...' : 'Submit Bug Report'}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Recent Reports */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Recent Reports
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentReports.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">No recent reports</p>
              ) : (
                recentReports.map((report) => (
                  <div key={report.id} className="p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <h4 className="font-medium text-sm text-gray-900 line-clamp-1">
                          {report.title}
                        </h4>
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                          {report.description}
                        </p>
                      </div>
                      <Badge className={`text-xs ${getSeverityColor(report.severity)}`}>
                        {report.severity}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                      {getSeverityIcon(report.severity)}
                      <span className="capitalize">{report.status}</span>
                      <span>•</span>
                      <span>{new Date(report.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}