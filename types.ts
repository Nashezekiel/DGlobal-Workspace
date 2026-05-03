export interface Task {
  id: string
  title: string
  description: string
  status: 'pending' | 'in_progress' | 'completed' | 'under_review' | 'rejected'
  priority: 'low' | 'medium' | 'high'
  assigned_to?: string
  assigned_role?: 'admin' | 'worker' | 'any'
  due_date?: string
  admin_feedback?: string
  created_at: string
  updated_at?: string
  created_by?: string
}

export interface Submission {
  id: string
  task_id: string
  worker_id: string
  content: string
  status: 'pending_review' | 'approved' | 'rejected'
  submitted_at: string
  reviewed_at?: string
  reviewed_by?: string
  feedback?: string
  admin_feedback?: string
  profiles?: {
    full_name: string
  }
  tasks?: {
    id?: string
    title: string
  }
}

export interface Profile {
  id: string
  email: string
  full_name: string
  role: 'admin' | 'worker'
  job_role?: string
  avatar_url?: string
  phone?: string
  location?: string
  bio?: string
  approval_status?: 'pending' | 'approved' | 'rejected'
  created_at?: string
  updated_at?: string
}

export interface Message {
  id: string
  room_id: string
  sender_id: string
  content: string
  created_at: string
  profiles?: {
    full_name: string
  }
}

export interface Room {
  id: string
  name: string
  description: string
  created_at: string
  created_by: string
}

export interface BugReport {
  id: string
  title: string
  description: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  status: 'open' | 'in_progress' | 'resolved' | 'closed'
  reported_by: string
  created_at: string
  updated_at?: string
  resolved_at?: string
  resolved_by?: string
}

export interface Notification {
  id: string
  user_id: string
  type: 'task' | 'message' | 'system' | 'submission' | 'deadline' | 'mention'
  title: string
  message: string
  link?: string
  is_read: boolean
  created_at: string
  metadata?: {
    task_id?: string
    task_title?: string
    sender_name?: string
    priority?: 'low' | 'medium' | 'high'
    action_required?: boolean
  }
}

export interface NotificationPreferences {
  enable_notifications: boolean
  email_notifications: boolean
  sound_notifications: boolean
  task_notifications: boolean
  message_notifications: boolean
  system_notifications: boolean
  deadline_notifications: boolean
}
