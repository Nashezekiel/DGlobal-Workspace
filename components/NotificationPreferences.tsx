'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Bell, Mail, Volume2, Settings } from 'lucide-react'
import type { NotificationPreferences as NotificationPreferencesType } from '@/types'
import { supabase } from '@/lib/supabase/client'

export function NotificationPreferences() {
  const [preferences, setPreferences] = useState<NotificationPreferencesType>({
    enable_notifications: true,
    email_notifications: false,
    sound_notifications: true,
    task_notifications: true,
    message_notifications: true,
    system_notifications: true,
    deadline_notifications: true,
  })
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    fetchPreferences()
  }, [])

  const fetchPreferences = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        // Mock preferences fetch (store per-user preferences in DB in a real app)
        setPreferences((prev) => ({ ...prev }))
      }
    } catch (error) {
      console.error('Failed to fetch preferences:', error)
    }
  }

  const handleToggle = (key: keyof NotificationPreferencesType) => {
    setPreferences(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const savePreferences = async () => {
    setIsLoading(true)
    try {
      // Mock save - in real app would save to database
      await new Promise(resolve => setTimeout(resolve, 500))
      alert('Preferences saved successfully!')
    } catch (error) {
      console.error('Failed to save preferences:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Notification Preferences
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Task Notifications */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Bell className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <Label htmlFor="task-notifications" className="font-medium">
                  Task Notifications
                </Label>
                <p className="text-sm text-gray-500">
                  Get notified about new tasks and task updates
                </p>
              </div>
            </div>
            <Switch
              id="task-notifications"
              checked={preferences.task_notifications}
              onCheckedChange={() => handleToggle('task_notifications')}
            />
          </div>

          {/* Message Notifications */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Bell className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <Label htmlFor="message-notifications" className="font-medium">
                  Message Notifications
                </Label>
                <p className="text-sm text-gray-500">
                  Get notified about new messages and mentions
                </p>
              </div>
            </div>
            <Switch
              id="message-notifications"
              checked={preferences.message_notifications}
              onCheckedChange={() => handleToggle('message_notifications')}
            />
          </div>

          {/* System Notifications */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 rounded-lg">
                <Settings className="h-5 w-5 text-gray-600" />
              </div>
              <div>
                <Label htmlFor="system-notifications" className="font-medium">
                  System Notifications
                </Label>
                <p className="text-sm text-gray-500">
                  Get notified about system updates and maintenance
                </p>
              </div>
            </div>
            <Switch
              id="system-notifications"
              checked={preferences.system_notifications}
              onCheckedChange={() => handleToggle('system_notifications')}
            />
          </div>

          {/* Deadline Reminders */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Bell className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <Label htmlFor="deadline-reminders" className="font-medium">
                  Deadline Reminders
                </Label>
                <p className="text-sm text-gray-500">
                  Get reminded about upcoming task deadlines
                </p>
              </div>
            </div>
            <Switch
              id="deadline-reminders"
                checked={preferences.deadline_notifications}
                onCheckedChange={() => handleToggle('deadline_notifications')}
            />
          </div>

          {/* Email Notifications */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Mail className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <Label htmlFor="email-notifications" className="font-medium">
                  Email Notifications
                </Label>
                <p className="text-sm text-gray-500">
                  Receive email notifications for important updates
                </p>
              </div>
            </div>
            <Switch
              id="email-notifications"
              checked={preferences.email_notifications}
              onCheckedChange={() => handleToggle('email_notifications')}
            />
          </div>

          {/* Sound Enabled */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <Volume2 className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <Label htmlFor="sound-enabled" className="font-medium">
                  Sound Notifications
                </Label>
                <p className="text-sm text-gray-500">
                  Play sound when new notifications arrive
                </p>
              </div>
            </div>
            <Switch
              id="sound-enabled"
                checked={preferences.sound_notifications}
                onCheckedChange={() => handleToggle('sound_notifications')}
            />
          </div>

          <div className="pt-4 border-t">
            <Button
              onClick={savePreferences}
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? 'Saving...' : 'Save Preferences'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
