'use client'

import { useState, useEffect } from 'react'
import { Bell, Check, Trash2, Settings, Clock, MessageSquare, AlertCircle, CheckCircle, Volume2, VolumeX } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { Notification } from '@/types'
import { supabase } from '@/lib/supabase/client'
import { playNotificationSound, requestNotificationPermission } from '@/components/NotificationSimulator'
import type { RealtimeChannel } from '@supabase/supabase-js'

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [userId, setUserId] = useState<string | null>(null)
  const [isSoundEnabled, setIsSoundEnabled] = useState(true)

  useEffect(() => {
    const savedSound = localStorage.getItem('dgew_notification_sound')
    if (savedSound !== null) {
      setIsSoundEnabled(savedSound === 'true')
    }
  }, [])

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
        }, (payload) => {
          if (payload.eventType === 'INSERT') {
            const soundSetting = localStorage.getItem('dgew_notification_sound')
            if (soundSetting !== 'false') {
              playNotificationSound()
            }
          }
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const clearAllNotifications = async () => {
    try {
      if (!userId) return

      await supabase
        .from('notifications')
        .delete()
        .eq('user_id', userId)

      setNotifications([])
      setUnreadCount(0)
    } catch (error) {
      console.error('Failed to clear notifications:', error)
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
        return <CheckCircle className="h-4 w-4 text-brand-purple" />
      case 'message':
        return <MessageSquare className="h-4 w-4 text-brand-purple" />
      case 'system':
        return <Settings className="h-4 w-4 text-gray-600" />
      case 'submission':
        return <Check className="h-4 w-4 text-brand-gold" />
      case 'deadline':
        return <Clock className="h-4 w-4 text-brand-gold" />
      case 'mention':
        return <AlertCircle className="h-4 w-4 text-brand-purple" />
      default:
        return <Bell className="h-4 w-4 text-gray-600" />
    }
  }

  const getNotificationColor = (type: Notification['type']) => {
    switch (type) {
      case 'task':
        return 'bg-brand-purple/10 border-brand-purple/20'
      case 'message':
        return 'bg-brand-purple/10 border-brand-purple/20'
      case 'system':
        return 'bg-gray-50 border-gray-200'
      case 'submission':
        return 'bg-brand-gold/20 border-brand-gold/30'
      case 'deadline':
        return 'bg-brand-gold/20 border-brand-gold/30'
      case 'mention':
        return 'bg-brand-purple/10 border-brand-purple/20'
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
        <Button variant="ghost" size="icon" className="relative hover:bg-brand-purple/10">
          <Bell className="h-5 w-5 text-brand-purple" />
          {unreadCount > 0 && (
            <Badge
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs bg-brand-gold text-brand-purple border-none hover:bg-brand-gold/90"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between text-brand-purple">
          <span>Notifications</span>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={markAllAsRead}
                className="text-xs h-7 px-2 text-brand-purple hover:text-brand-purple/80 hover:bg-brand-purple/10"
              >
                Mark read
              </Button>
            )}
            {notifications.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllNotifications}
                className="text-xs h-7 px-2 text-red-500 hover:text-red-600 hover:bg-red-50"
              >
                Clear all
              </Button>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        <div className="max-h-96 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-4 text-center text-brand-purple/60">
              <Bell className="h-8 w-8 mx-auto mb-2 text-brand-purple/30" />
              <p className="text-sm">No notifications</p>
            </div>
          ) : (
            notifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-3 border-b last:border-b-0 hover:bg-brand-purple/5 transition-colors ${!notification.is_read ? 'bg-brand-purple/10' : ''
                  }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${getNotificationColor(notification.type)}`}>
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-brand-purple truncate">
                      {notification.title}
                    </p>
                    <p className="text-xs text-gray-700 mt-1 line-clamp-2">
                      {notification.message}
                    </p>
                    <p className="text-[10px] font-medium text-brand-purple/60 mt-1">
                      {formatTime(notification.created_at)}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1">
                    {!notification.is_read && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-brand-purple hover:bg-brand-purple/10 hover:text-brand-purple"
                        onClick={() => markAsRead(notification.id)}
                      >
                        <Check className="h-3 w-3" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-red-400 hover:text-red-600 hover:bg-red-50"
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
        <DropdownMenuItem asChild className="focus:bg-brand-purple/10 focus:text-brand-purple cursor-pointer">
          <Button
            variant="ghost"
            className="w-full justify-start text-brand-purple"
            onClick={() => setIsOpen(false)}
          >
            <Settings className="h-4 w-4 mr-2" />
            Notification Settings
          </Button>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuSeparator />
        <div className="p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-brand-purple">Notification Sound</span>
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.preventDefault()
                const newValue = !isSoundEnabled
                setIsSoundEnabled(newValue)
                localStorage.setItem('dgew_notification_sound', String(newValue))
                if (newValue) playNotificationSound()
              }}
              className={`h-8 px-3 border-brand-purple/20 transition-colors ${isSoundEnabled ? 'bg-brand-purple/10 text-brand-purple hover:bg-brand-purple/20' : 'text-gray-500 hover:bg-gray-100'}`}
            >
              {isSoundEnabled ? (
                <><Volume2 className="h-4 w-4 mr-2" /> On</>
              ) : (
                <><VolumeX className="h-4 w-4 mr-2" /> Off</>
              )}
            </Button>
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
