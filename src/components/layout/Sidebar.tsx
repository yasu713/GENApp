'use client'

import { useState } from 'react'
import { Plus, MessageSquare, X, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

interface ChatSession {
  id: string
  title: string
  timestamp: string
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const [sessions] = useState<ChatSession[]>([
    {
      id: '1',
      title: '売上分析について',
      timestamp: '2024-01-15 14:30'
    },
    {
      id: '2', 
      title: 'チーム管理の課題',
      timestamp: '2024-01-15 10:15'
    },
    {
      id: '3',
      title: 'マーケティング戦略',
      timestamp: '2024-01-14 16:45'
    }
  ])

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-80 bg-white border-r border-gray-200 transform transition-transform duration-200 ease-in-out md:relative md:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h2 className="font-semibold text-gray-900">チャット履歴</h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="md:hidden"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* New Chat Button */}
          <div className="p-4">
            <Button className="w-full justify-start" variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              新しいチャット
            </Button>
          </div>

          {/* Chat Sessions */}
          <div className="flex-1 overflow-y-auto scrollbar-thin">
            <div className="px-2 pb-4">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className="group flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 cursor-pointer mb-1"
                >
                  <div className="flex items-center flex-1 min-w-0">
                    <MessageSquare className="h-4 w-4 text-gray-400 mr-3 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {session.title}
                      </p>
                      <p className="text-xs text-gray-500">
                        {session.timestamp}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="h-4 w-4 text-gray-400" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}