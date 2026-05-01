'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Notification } from '@/types'
import { PageHeader } from '@/components/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CardSkeleton } from '@/components/LoadingSkeleton'
import { Bell, CheckCircle, MessageSquare, Settings, Clock, AlertCircle, Check, Trash2, Filter } from 'lucide-react'

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [filteredNotifications, setFilteredNotifications] = useState<Notification[]>([])
  const [filter, setFilter] = useState<'all' | 'unread' | 'task' | 'message' | 'system'>('all')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchNotifications()
  }, [])

  useEffect(() => {
    if (filter === 'all') {
      setFilteredNotifications(notifications)
    } else if (filter === 'unread') {
      setFilteredNotifications(notifications.filter(n => !n.is_read))
    } else {
      setFilteredNotifications(notifications.filter(n => n.type === filter))
    }
  }, [filter, notifications])

  const fetchNotifications = async () => {
    setIsLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setNotifications([])
        setFilteredNotifications([])
        return
      }

      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      
      if (data) {
        setNotifications(data)
        setFilteredNotifications(data)
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const markAsRead = async (notificationId: string) => {
    try {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId)
      
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      )
    } catch (error) {
      console.error('Failed to mark as read:', error)
    }
  }

  const markAllAsRead = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false)
      
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    } catch (error) {
      console.error('Failed to mark all as read:', error)
    }
  }

  const deleteNotification = async (notificationId: string) => {
    try {
      await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId)
      
      setNotifications(prev => prev.filter(n => n.id !== notificationId))
    } catch (error) {
      console.error('Failed to delete notification:', error)
    }
  }

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'task':
        return <CheckCircle className="h-5 w-5 text-blue-600" />
      case 'message':
        return <MessageSquare className="h-5 w-5 text-green-600" />
      case 'system':
        return <Settings className="h-5 w-5 text-gray-600" />
      case 'submission':
        return <Check className="h-5 w-5 text-purple-600" />
      case 'deadline':
        return <Clock className="h-5 w-5 text-orange-600" />
      case 'mention':
        return <AlertCircle className="h-5 w-5 text-red-600" />
      default:
        return <Bell className="h-5 w-5 text-gray-600" />
    }
  }

  const getNotificationColor = (type: Notification['type']) => {
    switch (type) {
      case 'task':
        return 'bg-blue-50 border-blue-200'
      case 'message':
        return 'bg-green-50 border-green-200'
      case 'system':
        return 'bg-gray-50 border-gray-200'
      case 'submission':
        return 'bg-purple-50 border-purple-200'
      case 'deadline':
        return 'bg-orange-50 border-orange-200'
      case 'mention':
        return 'bg-red-50 border-red-200'
      default:
        return 'bg-gray-50 border-gray-200'
    }
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  const unreadCount = notifications.filter(n => !n.is_read).length

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Notifications" 
        subtitle={`You have ${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}`}
        actions={
          unreadCount > 0 && (
            <Button onClick={markAllAsRead} variant="outline">
              <Check className="h-4 w-4 mr-2" />
              Mark All Read
            </Button>
          )
        }
      />

      {/* Filter Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Filter:</span>
              <div className="flex gap-2">
                <Button
                  variant={filter === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilter('all')}
                >
                  All
                </Button>
                <Button
                  variant={filter === 'unread' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilter('unread')}
                >
                  Unread
                </Button>
                <Button
                  variant={filter === 'task' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilter('task')}
                >
                  Tasks
                </Button>
                <Button
                  variant={filter === 'message' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilter('message')}
                >
                  Messages
                </Button>
                <Button
                  variant={filter === 'system' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilter('system')}
                >
                  System
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notifications List */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : filteredNotifications.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Bell className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No notifications found</h3>
            <p className="text-gray-500">
              {filter === 'unread' 
                ? "You're all caught up!" 
                : `No ${filter} notifications to display`}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredNotifications.map((notification) => (
            <Card 
              key={notification.id}
              className={`hover:shadow-md transition-shadow ${
                !notification.is_read ? 'border-l-4 border-l-blue-500' : ''
              }`}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-lg ${getNotificationColor(notification.type)}`}>
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-gray-900">
                            {notification.title}
                          </h3>
                          {!notification.is_read && (
                            <Badge variant="secondary" className="text-xs">
                              New
                            </Badge>
                          )}
                        </div>
                        <p className="text-gray-600 text-sm mb-2">
                          {notification.message}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span>{formatTime(notification.created_at)}</span>
                          {notification.metadata?.priority && (
                            <Badge 
                              variant="outline" 
                              className={`text-xs ${
                                notification.metadata.priority === 'high' 
                                  ? 'border-red-200 text-red-700' 
                                  : notification.metadata.priority === 'medium'
                                  ? 'border-orange-200 text-orange-700'
                                  : 'border-gray-200 text-gray-700'
                              }`}
                            >
                              {notification.metadata.priority}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        {!notification.is_read && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => markAsRead(notification.id)}
                          >
                            <Check className="h-4 w-4 mr-2" />
                            Mark Read
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-500 hover:text-red-600"
                          onClick={() => deleteNotification(notification.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
