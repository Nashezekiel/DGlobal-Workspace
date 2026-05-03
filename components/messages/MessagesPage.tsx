'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase/client'
import { PageHeader } from '@/components/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Send, Hash, Users, Clock, MoreVertical, Plus, Trash2, Reply, X } from 'lucide-react'
import { Room } from '@/types'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import type { RealtimeChannel } from '@supabase/supabase-js'
import type { RealtimePostgresInsertPayload } from '@supabase/supabase-js'

interface Message {
  id: string
  room_id: string
  sender_id: string
  content: string
  created_at: string
  profiles: { full_name: string }
  reply_to_id?: string | null
  replied_to?: {
    content: string
    profiles: { full_name: string }
  } | null
}

export default function MessagesPage() {
  const [selectedRoom, setSelectedRoom] = useState('')
  const [rooms, setRooms] = useState<Room[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isCreateRoomOpen, setIsCreateRoomOpen] = useState(false)
  const [newRoomName, setNewRoomName] = useState('')
  const [newRoomDescription, setNewRoomDescription] = useState('')
  const [currentUserId, setCurrentUserId] = useState<string>('')
  const [replyingTo, setReplyingTo] = useState<Message | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchRooms()
    checkUserRole()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const checkUserRole = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    setCurrentUserId(user.id)

    if (profile?.role === 'admin') {
      setIsAdmin(true)
    }
  }

  useEffect(() => {
    if (selectedRoom) {
      let activeChannel: RealtimeChannel | null = null

      const fetchAndSubscribe = async () => {
        const { data } = await supabase
          .from('messages')
          .select(`
            *,
            profiles(full_name),
            replied_to:messages!reply_to_id(
              content,
              profiles(full_name)
            )
          `)
          .eq('room_id', selectedRoom)
          .order('created_at', { ascending: true })

        setMessages(data || [])

        const channel = supabase
          .channel(`messages:${selectedRoom}`)
          .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `room_id=eq.${selectedRoom}`
          }, async (payload: RealtimePostgresInsertPayload<{ id: string }>) => {
            const { data } = await supabase
              .from('messages')
              .select(`
                *,
                profiles(full_name),
                replied_to:messages!reply_to_id(
                  content,
                  profiles(full_name)
                )
              `)
              .eq('id', payload.new.id)
              .single()

            if (data) setMessages(prev => [...prev, data as Message])
          })
          .subscribe()

        activeChannel = channel
      }

      fetchAndSubscribe()

      return () => {
        if (activeChannel) {
          supabase.removeChannel(activeChannel)
        }
      }
    }
  }, [selectedRoom])

  const fetchRooms = async () => {
    try {
      const { data, error } = await supabase
        .from('rooms')
        .select('*')
        .order('created_at', { ascending: true })

      if (error) {
        console.error('Error fetching rooms:', error)
        // Fallback to hardcoded rooms
        const fallbackRooms: Room[] = [
          { id: 'room-1', name: 'General', description: 'General team discussions', created_at: new Date().toISOString(), created_by: 'admin-1' },
          { id: 'room-2', name: 'Announcements', description: 'Important updates and news', created_at: new Date().toISOString(), created_by: 'admin-1' },
          { id: 'room-3', name: 'Project Alpha', description: 'Project-specific discussions', created_at: new Date().toISOString(), created_by: 'admin-1' },
        ]
        setRooms(fallbackRooms)
        if (!selectedRoom) {
          setSelectedRoom(fallbackRooms[0].id)
        }
        return
      }

      setRooms(data || [])
      if (data && data.length > 0 && !selectedRoom) {
        setSelectedRoom(data[0].id)
      }
    } catch (err) {
      console.error('Error in fetchRooms:', err)
      // Fallback to hardcoded rooms
      const fallbackRooms: Room[] = [
        { id: 'room-1', name: 'General', description: 'General team discussions', created_at: new Date().toISOString(), created_by: 'admin-1' },
        { id: 'room-2', name: 'Announcements', description: 'Important updates and news', created_at: new Date().toISOString(), created_by: 'admin-1' },
        { id: 'room-3', name: 'Project Alpha', description: 'Project-specific discussions', created_at: new Date().toISOString(), created_by: 'admin-1' },
      ]
      setRooms(fallbackRooms)
      if (!selectedRoom) {
        setSelectedRoom(fallbackRooms[0].id)
      }
    }
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    if (!newMessage.trim()) return

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase
      .from('messages')
      .insert({
        room_id: selectedRoom,
        sender_id: user.id,
        content: newMessage.trim(),
        reply_to_id: replyingTo?.id || null
      })

    setNewMessage('')
    setReplyingTo(null)
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`
    return date.toLocaleDateString()
  }

  const handleCreateRoom = async () => {
    if (!newRoomName.trim()) return

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase
      .from('rooms')
      .insert({
        name: newRoomName.trim(),
        description: newRoomDescription.trim(),
        created_by: user.id,
      })

    if (!error) {
      setNewRoomName('')
      setNewRoomDescription('')
      setIsCreateRoomOpen(false)
      fetchRooms()
    }
  }

  const handleDeleteRoom = async (roomId: string) => {
    if (!confirm('Are you sure you want to delete this room? This will also delete all messages in this room.')) return

    const { error: messagesError } = await supabase
      .from('messages')
      .delete()
      .eq('room_id', roomId)

    const { error: roomError } = await supabase
      .from('rooms')
      .delete()
      .eq('id', roomId)

    if (!messagesError && !roomError) {
      if (selectedRoom === roomId) {
        setSelectedRoom('')
        setMessages([])
      }
      fetchRooms()
    }
  }

  const selectedRoomData = rooms.find(r => r.id === selectedRoom)

  return (
    <div className="space-y-6">
      <PageHeader title="Messages" subtitle="Team communication and collaboration" />

      <div className="flex flex-col md:flex-row gap-4">
        {/* Sidebar */}
        <Card className="w-full md:w-72 flex flex-col min-h-[280px] md:min-h-0">
          <CardContent className="p-4 flex-1 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Hash className="h-4 w-4 text-purple-600" />
                <h3 className="font-semibold">Channels</h3>
              </div>
              {isAdmin && (
                <Dialog open={isCreateRoomOpen} onOpenChange={setIsCreateRoomOpen}>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 rounded-md border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50 hover:text-slate-900"
                      aria-label="Create new room"
                      title="Create new room"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create New Room</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div>
                        <label htmlFor="room-name" className="block text-sm font-medium mb-2">
                          Room Name
                        </label>
                        <Input
                          id="room-name"
                          value={newRoomName}
                          onChange={(e) => setNewRoomName(e.target.value)}
                          placeholder="Enter room name"
                        />
                      </div>
                      <div>
                        <label htmlFor="room-description" className="block text-sm font-medium mb-2">
                          Description
                        </label>
                        <Input
                          id="room-description"
                          value={newRoomDescription}
                          onChange={(e) => setNewRoomDescription(e.target.value)}
                          placeholder="Enter room description"
                        />
                      </div>
                      <Button
                        onClick={handleCreateRoom}
                        className="w-full bg-brand-purple text-white hover:bg-brand-purple/90"
                      >
                        Create Room
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
            <div className="space-y-2">
              {rooms.map(room => (
                <div
                  key={room.id}
                  className={`flex items-center justify-between group ${
                    selectedRoom === room.id
                      ? 'bg-purple-100 text-purple-700 border border-purple-200 rounded-lg px-3 py-3'
                      : 'hover:bg-gray-100 rounded-lg px-3 py-3'
                  }`}
                >
                  <button
                    onClick={() => setSelectedRoom(room.id)}
                    className="flex-1 text-left"
                  >
                    <div className="flex items-center gap-2">
                      <Hash className="h-4 w-4" />
                      <span className="font-medium">{room.name}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1 ml-6">{room.description}</p>
                  </button>
                  {isAdmin && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100"
                      onClick={() => handleDeleteRoom(room.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
          <CardContent className="p-4 border-t">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Users className="h-4 w-4" />
              <span>12 members online</span>
            </div>
          </CardContent>
        </Card>

        {/* Chat Area */}
        <Card className="flex-1 flex flex-col min-h-[420px] md:min-h-0">
          <CardContent className="p-0 flex-1 flex flex-col">
            {/* Chat Header */}
            <div className="p-4 border-b flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Hash className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{selectedRoomData?.name}</h3>
                  <p className="text-xs text-gray-500">{selectedRoomData?.description}</p>
                </div>
              </div>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-5 w-5" />
              </Button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
              {messages.length === 0 ? (
                <div className="text-center py-12">
                  <Hash className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-gray-500">No messages yet. Start the conversation!</p>
                </div>
              ) : (
                messages.map((message, index) => {
                  const showDate = index === 0 ||
                    new Date(messages[index - 1].created_at).toDateString() !==
                    new Date(message.created_at).toDateString()

                  return (
                    <div key={message.id}>
                      {showDate && (
                        <div className="flex items-center gap-2 my-4">
                          <div className="flex-1 h-px bg-gray-200" />
                          <span className="text-xs text-gray-500">
                            {new Date(message.created_at).toLocaleDateString()}
                          </span>
                          <div className="flex-1 h-px bg-gray-200" />
                        </div>
                      )}
                      <div className={`flex items-start gap-2 group ${message.sender_id === currentUserId ? 'flex-row-reverse' : ''}`}>
                        <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-white font-medium text-sm mt-1 shadow-sm ${message.sender_id === currentUserId ? 'bg-purple-600' : 'bg-gradient-to-br from-blue-500 to-indigo-500'}`}>
                          {message.profiles?.full_name?.charAt(0) || 'U'}
                        </div>
                        
                        <div className={`flex flex-col max-w-[75%] ${message.sender_id === currentUserId ? 'items-end' : 'items-start'}`}>
                          <div className={`flex items-center gap-2 mb-1 ${message.sender_id === currentUserId ? 'flex-row-reverse' : ''}`}>
                            <span className="font-medium text-xs text-gray-500">
                              {message.sender_id === currentUserId ? 'You' : (message.profiles?.full_name || 'Unknown')}
                            </span>
                            <span className="text-[10px] text-gray-400">
                              {formatTime(message.created_at)}
                            </span>
                          </div>

                          <div className={`relative px-4 py-2.5 rounded-2xl shadow-sm ${
                            message.sender_id === currentUserId 
                              ? 'bg-purple-600 text-white rounded-tr-sm' 
                              : 'bg-white text-gray-800 border border-gray-100 rounded-tl-sm'
                          }`}>
                            {/* Reply Preview inside bubble */}
                            {message.replied_to && (
                              <div className={`text-xs mb-2 p-2 rounded-lg border-l-2 ${
                                message.sender_id === currentUserId 
                                  ? 'bg-purple-700/50 border-purple-300 text-purple-100' 
                                  : 'bg-gray-50 border-purple-500 text-gray-600'
                              }`}>
                                <span className="font-semibold block mb-0.5">
                                  {message.replied_to.profiles?.full_name || 'Unknown'}
                                </span>
                                <span className="truncate block max-w-xs">{message.replied_to.content}</span>
                              </div>
                            )}
                            
                            <p className="whitespace-pre-wrap break-words text-sm">{message.content}</p>
                          </div>
                        </div>

                        {/* Reply Button (Hover) */}
                        <div className={`opacity-0 group-hover:opacity-100 transition-opacity flex items-center self-center px-2 ${message.sender_id === currentUserId ? 'flex-row-reverse' : ''}`}>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-gray-400 hover:text-purple-600 hover:bg-purple-50"
                            onClick={() => setReplyingTo(message)}
                          >
                            <Reply className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="border-t bg-gray-50/50">
              {replyingTo && (
                <div className="flex items-center justify-between px-4 py-3 bg-purple-50/50 border-b border-purple-100">
                  <div className="flex-1 border-l-2 border-purple-500 pl-3">
                    <div className="text-xs font-semibold text-purple-700 mb-0.5">
                      Replying to {replyingTo.profiles?.full_name || 'Unknown'}
                    </div>
                    <div className="text-sm text-gray-600 truncate max-w-md">
                      {replyingTo.content}
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-gray-500 hover:text-gray-700" onClick={() => setReplyingTo(null)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
              
              <div className="p-4">
                {isTyping && (
                <div className="text-xs text-gray-500 mb-2">
                  Someone is typing...
                </div>
              )}
              <div className="flex gap-2">
                <Input
                  value={newMessage}
                  onChange={(e) => {
                    setNewMessage(e.target.value)
                    setIsTyping(e.target.value.length > 0)
                  }}
                  onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Type a message..."
                  className="flex-1"
                />
                <Button onClick={handleSend} disabled={!newMessage.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
