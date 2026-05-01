'use client'

import { useState } from 'react'
import type { Notification as NotificationType } from '@/types'
import { supabase } from '@/lib/supabase/client'

// Simulated notification templates
const notificationTemplates = [
  {
    type: 'task' as const,
    title: 'New Task Assigned',
    message: 'You have been assigned a new high-priority task',
  },
  {
    type: 'message' as const,
    title: 'New Message',
    message: 'You received a new message from a team member',
  },
  {
    type: 'deadline' as const,
    title: 'Task Due Soon',
    message: 'A task is due within the next 24 hours',
  },
  {
    type: 'system' as const,
    title: 'System Update',
    message: 'The application has been updated with new features',
  },
  {
    type: 'submission' as const,
    title: 'Submission Reviewed',
    message: 'Your task submission has been reviewed',
  },
]

export function useNotificationSimulation() {
  const [isSimulating, setIsSimulating] = useState(false)

  const simulateNotification = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const template = notificationTemplates[Math.floor(Math.random() * notificationTemplates.length)]
      
      const newNotification: Omit<NotificationType, 'id'> = {
        user_id: user.id,
        type: template.type,
        title: template.title,
        message: template.message,
        is_read: false,
        created_at: new Date().toISOString(),
      }

      await supabase.from('notifications').insert(newNotification)
      
      // Play notification sound if enabled
      playNotificationSound()
      
      // Show visual alert
      showVisualAlert()
    } catch (error) {
      console.error('Failed to simulate notification:', error)
    }
  }

  const startSimulation = () => {
    setIsSimulating(true)
    // Simulate a notification every 30-60 seconds
    const interval = setInterval(() => {
      simulateNotification()
    }, Math.random() * 30000 + 30000)
    
    return () => clearInterval(interval)
  }

  const stopSimulation = () => {
    setIsSimulating(false)
  }

  return {
    isSimulating,
    simulateNotification,
    startSimulation,
    stopSimulation,
  }
}

export function playNotificationSound() {
  try {
    // Create audio context for notification sound
    const webkitAudioContext = (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    const AudioContextCtor = window.AudioContext || webkitAudioContext
    if (!AudioContextCtor) return
    const audioContext = new AudioContextCtor()
    
    // Create a simple notification sound
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()
    
    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)
    
    oscillator.frequency.value = 800
    oscillator.type = 'sine'
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3)
    
    oscillator.start(audioContext.currentTime)
    oscillator.stop(audioContext.currentTime + 0.3)
  } catch (error) {
    console.error('Failed to play notification sound:', error)
  }
}

export function showVisualAlert() {
  try {
    // Create a visual flash effect
    const flash = document.createElement('div')
    flash.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(59, 130, 246, 0.1);
      pointer-events: none;
      z-index: 9999;
      animation: flash 0.3s ease-out;
    `
    
    const style = document.createElement('style')
    style.textContent = `
      @keyframes flash {
        0% { opacity: 0; }
        50% { opacity: 1; }
        100% { opacity: 0; }
      }
    `
    
    document.head.appendChild(style)
    document.body.appendChild(flash)
    
    setTimeout(() => {
      document.body.removeChild(flash)
      document.head.removeChild(style)
    }, 300)
  } catch (error) {
    console.error('Failed to show visual alert:', error)
  }
}

// Request notification permission
export function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission()
  }
}

// Show browser notification
export function showBrowserNotification(title: string, body: string) {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, {
      body,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
    })
  }
}
