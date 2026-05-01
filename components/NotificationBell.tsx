'use client'

import { useState, useEffect } from 'react'
import { Bell, Check, Trash2, Settings, Clock, MessageSquare, AlertCircle, CheckCircle, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { Notification } from '@/types'
import { supabase } from '@/lib/supabase/client'
import { useNotificationSimulation, playNotificationSound, showVisualAlert, requestNotificationPermission } from '@/components/NotificationSimulator'
import type { RealtimeChannel } from '@supabase/supabase-js'

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [userId, setUserId] = useState<string | null>(null)
  const { isSimulating, simulateNotification, startSimulation, stopSimulation } = useNotificationSimulation()

  useEffect(() => {
    let mounted = true
    let channel: RealtimeChannel | null = null

    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!mounted || !user) return

      setUserId(user.id)
      await fetchNotifications(user.id)
      requestNotificationPermission()

      channel = supabase
        .channel(`notifications:${user.id}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        }, () => {
          fetchNotifications(user.id)
        })
        .subscribe()
    }

    init()

    return () => {
      mounted = false
      if (channel) {
        supabase.removeChannel(channel)
      }
    }
  }, [])

  const fetchNotifications = async (resolvedUserId?: string) => {
    try {
      const targetUserId = resolvedUserId || userId
      if (!targetUserId) return

      const { data } = await supabase
        .from('notifications')
        .select('id,user_id,title,message,type,link,is_read,created_at,metadata')
        .eq('user_id', targetUserId)
        .order('created_at', { ascending: false })
        .limit(10)
      
      if (data) {
        setNotifications(data)
        setUnreadCount(data.filter(n => !n.is_read).length)
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error)
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
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (error) {
      console.error('Failed to mark as read:', error)
    }
  }

  const markAllAsRead = async () => {
    try {
      if (!userId) return

      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', userId)
        .eq('is_read', false)
      
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
      setUnreadCount(0)
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
      
      setNotifications(prev => {
        const notification = prev.find(n => n.id === notificationId)
        setUnreadCount(prev => notification && !notification.is_read ? Math.max(0, prev - 1) : prev)
        return prev.filter(n => n.id !== notificationId)
      })
    } catch (error) {
      console.error('Failed to delete notification:', error)
    }
  }

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'task':
        return <CheckCircle className="h-4 w-4 text-blue-600" />
      case 'message':
        return <MessageSquare className="h-4 w-4 text-green-600" />
      case 'system':
        return <Settings className="h-4 w-4 text-gray-600" />
      case 'submission':
        return <Check className="h-4 w-4 text-purple-600" />
      case 'deadline':
        return <Clock className="h-4 w-4 text-orange-600" />
      case 'mention':
        return <AlertCircle className="h-4 w-4 text-red-600" />
      default:
        return <Bell className="h-4 w-4 text-gray-600" />
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

  return (
    <DropdownMenu
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open)
        if (open) {
          fetchNotifications()
        }
      }}
    >
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifications</span>
          {unreadCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={markAllAsRead}
              className="text-xs"
            >
              Mark all read
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        <div className="max-h-96 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              <Bell className="h-8 w-8 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">No notifications</p>
            </div>
          ) : (
            notifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-3 border-b last:border-b-0 hover:bg-gray-50 transition-colors ${
                  !notification.is_read ? 'bg-blue-50/50' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${getNotificationColor(notification.type)}`}>
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {notification.title}
                    </p>
                    <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                      {notification.message}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {formatTime(notification.created_at)}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1">
                    {!notification.is_read && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => markAsRead(notification.id)}
                      >
                        <Check className="h-3 w-3" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-red-500 hover:text-red-600"
                      onClick={() => deleteNotification(notification.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
        
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Button 
            variant="ghost" 
            className="w-full justify-start"
            onClick={() => setIsOpen(false)}
          >
            <Settings className="h-4 w-4 mr-2" />
            Notification Settings
          </Button>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {process.env.NODE_ENV !== 'production' && (
          <div className="p-2">
            <p className="text-xs text-gray-500 mb-2 px-2">Simulation Controls (Dev)</p>
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start"
              onClick={() => {
                simulateNotification()
                playNotificationSound()
                showVisualAlert()
              }}
            >
              <Zap className="h-4 w-4 mr-2" />
              Test Notification
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start mt-1"
              onClick={() => (isSimulating ? stopSimulation() : startSimulation())}
            >
              {isSimulating ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Stop Simulation
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 mr-2" />
                  Start Simulation
                </>
              )}
            </Button>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
