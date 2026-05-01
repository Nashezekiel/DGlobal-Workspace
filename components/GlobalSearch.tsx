'use client'

import { useState, useEffect } from 'react'
import { Search, X, FileText, MessageSquare, Bug, User } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { useRouter } from 'next/navigation'

interface SearchResult {
  id: string
  type: 'task' | 'message' | 'bug' | 'user'
  title: string
  description?: string
  url: string
  metadata?: {
    status?: string
    priority?: string
    severity?: string
  }
}

export function GlobalSearch() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(true)
      }
      if (e.key === 'Escape') {
        setOpen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      return
    }

    const searchTimeout = setTimeout(() => {
      performSearch(query)
    }, 300)

    return () => clearTimeout(searchTimeout)
  }, [query])

  const performSearch = async (searchQuery: string) => {
    setIsLoading(true)
    try {
      // In a real app, this would query the database
      // For now, we'll use mock results
      const mockResults: SearchResult[] = [
        {
          id: '1',
          type: 'task',
          title: 'Update user authentication',
          description: 'Implement OAuth2 login flow',
          url: '/my-tasks',
          metadata: { status: 'in_progress', priority: 'high' },
        },
        {
          id: '2',
          type: 'task',
          title: 'Fix navigation bug',
          description: 'Mobile menu not closing properly',
          url: '/my-tasks',
          metadata: { status: 'pending', priority: 'medium' },
        },
        {
          id: '3',
          type: 'message',
          title: 'Project Alpha discussion',
          description: 'Latest updates on the project',
          url: '/messages',
        },
        {
          id: '4',
          type: 'bug',
          title: 'Login page error',
          description: 'Users cannot login on mobile devices',
          url: '/report-bug',
          metadata: { severity: 'critical' },
        },
      ]

      const filtered = mockResults.filter(
        (result) =>
          result.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          result.description?.toLowerCase().includes(searchQuery.toLowerCase())
      )

      setResults(filtered)
    } catch (error) {
      console.error('Search error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleResultClick = (result: SearchResult) => {
    router.push(result.url)
    setOpen(false)
    setQuery('')
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'task':
        return <FileText className="h-4 w-4 text-blue-600" />
      case 'message':
        return <MessageSquare className="h-4 w-4 text-green-600" />
      case 'bug':
        return <Bug className="h-4 w-4 text-red-600" />
      case 'user':
        return <User className="h-4 w-4 text-purple-600" />
      default:
        return <Search className="h-4 w-4 text-gray-600" />
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'task':
        return 'bg-blue-100 text-blue-700'
      case 'message':
        return 'bg-green-100 text-green-700'
      case 'bug':
        return 'bg-red-100 text-red-700'
      case 'user':
        return 'bg-purple-100 text-purple-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  return (
    <>
      <Button
        variant="outline"
        className="w-64 justify-start text-muted-foreground"
        onClick={() => setOpen(true)}
      >
        <Search className="h-4 w-4 mr-2" />
        Search...
        <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
          <span>⌘</span>K
        </kbd>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="p-0 max-w-2xl">
          <div className="flex items-center border-b px-3">
            <Search className="h-4 w-4 mr-2 text-muted-foreground" />
            <Input
              placeholder="Search tasks, messages, bugs, users..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="border-0 focus-visible:ring-0 h-12"
              autoFocus
            />
            {query && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setQuery('')}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          <div className="max-h-[400px] overflow-y-auto p-2">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-sm text-muted-foreground">Searching...</div>
              </div>
            ) : query.trim() && results.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Search className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-sm text-muted-foreground">
                  No results found for &quot;{query}&quot;
                </p>
              </div>
            ) : !query.trim() ? (
              <div className="p-4">
                <p className="text-sm text-muted-foreground mb-4">Quick shortcuts:</p>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    className="justify-start h-auto py-3"
                    onClick={() => {
                      router.push('/my-tasks')
                      setOpen(false)
                    }}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    <div className="text-left">
                      <div className="text-sm font-medium">My Tasks</div>
                      <div className="text-xs text-muted-foreground">View and manage tasks</div>
                    </div>
                  </Button>
                  <Button
                    variant="outline"
                    className="justify-start h-auto py-3"
                    onClick={() => {
                      router.push('/messages')
                      setOpen(false)
                    }}
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    <div className="text-left">
                      <div className="text-sm font-medium">Messages</div>
                      <div className="text-xs text-muted-foreground">Team communication</div>
                    </div>
                  </Button>
                  <Button
                    variant="outline"
                    className="justify-start h-auto py-3"
                    onClick={() => {
                      router.push('/report-bug')
                      setOpen(false)
                    }}
                  >
                    <Bug className="h-4 w-4 mr-2" />
                    <div className="text-left">
                      <div className="text-sm font-medium">Report Bug</div>
                      <div className="text-xs text-muted-foreground">Report an issue</div>
                    </div>
                  </Button>
                  <Button
                    variant="outline"
                    className="justify-start h-auto py-3"
                    onClick={() => {
                      router.push('/profile')
                      setOpen(false)
                    }}
                  >
                    <User className="h-4 w-4 mr-2" />
                    <div className="text-left">
                      <div className="text-sm font-medium">Profile</div>
                      <div className="text-xs text-muted-foreground">Manage settings</div>
                    </div>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {results.map((result) => (
                  <Card
                    key={result.id}
                    className="cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => handleResultClick(result)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-start gap-3">
                        <div className="mt-1">{getTypeIcon(result.type)}</div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm">{result.title}</span>
                            <Badge className={`text-xs ${getTypeColor(result.type)}`}>
                              {result.type}
                            </Badge>
                          </div>
                          {result.description && (
                            <p className="text-xs text-muted-foreground line-clamp-1">
                              {result.description}
                            </p>
                          )}
                          {result.metadata && (
                            <div className="flex gap-2 mt-1">
                              {result.metadata.status && (
                                <Badge variant="outline" className="text-xs">
                                  {result.metadata.status}
                                </Badge>
                              )}
                              {result.metadata.priority && (
                                <Badge variant="outline" className="text-xs">
                                  {result.metadata.priority}
                                </Badge>
                              )}
                              {result.metadata.severity && (
                                <Badge variant="outline" className="text-xs">
                                  {result.metadata.severity}
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
