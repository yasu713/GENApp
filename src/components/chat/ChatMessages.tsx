'use client'

import { useEffect, useRef } from 'react'
import { Bot, User, FileText, Image as ImageIcon } from 'lucide-react'
import { Message } from '@/types/chat'
import { formatDate } from '@/lib/utils'
import { Card } from '@/components/ui/card'

interface ChatMessagesProps {
  messages: Message[]
  isLoading: boolean
  isStreaming?: boolean
  streamingMessageId?: string | null
}

export function ChatMessages({ 
  messages, 
  isLoading, 
  isStreaming, 
  streamingMessageId 
}: ChatMessagesProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Auto-scroll during streaming
  useEffect(() => {
    if (isStreaming && streamingMessageId) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isStreaming, streamingMessageId])

  return (
    <div className="h-full overflow-y-auto scrollbar-thin p-4 space-y-6">
      {messages.map((message) => (
        <div
          key={message.id}
          className={`chat-message flex ${
            message.role === 'user' ? 'justify-end' : 'justify-start'
          }`}
        >
          <div
            className={`flex max-w-[80%] ${
              message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
            }`}
          >
            {/* Avatar */}
            <div
              className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                message.role === 'user'
                  ? 'bg-blue-500 text-white ml-3'
                  : 'bg-gray-200 text-gray-600 mr-3'
              }`}
            >
              {message.role === 'user' ? (
                <User className="h-4 w-4" />
              ) : (
                <Bot className="h-4 w-4" />
              )}
            </div>

            {/* Message Content */}
            <div
              className={`flex-1 ${
                message.role === 'user' ? 'text-right' : 'text-left'
              }`}
            >
              <Card
                className={`p-4 ${
                  message.role === 'user'
                    ? 'bg-blue-500 text-white border-blue-500'
                    : 'bg-white border-gray-200'
                }`}
              >
                {/* Attachments */}
                {message.attachments && message.attachments.length > 0 && (
                  <div className="mb-3 space-y-3">
                    {message.attachments.map((attachment) => (
                      <div key={attachment.id}>
                        {attachment.type === 'image' ? (
                          <div className="space-y-2">
                            <img
                              src={attachment.url}
                              alt={attachment.name}
                              className="max-w-full h-auto rounded border max-h-64 object-contain"
                            />
                            <div
                              className={`flex items-center space-x-2 p-2 rounded text-xs ${
                                message.role === 'user'
                                  ? 'bg-blue-600/20'
                                  : 'bg-gray-100'
                              }`}
                            >
                              <ImageIcon className="h-3 w-3" />
                              <span className="truncate">{attachment.name}</span>
                              {attachment.size && (
                                <span className="text-opacity-70">
                                  ({Math.round(attachment.size / 1024)}KB)
                                </span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div
                            className={`flex items-center space-x-2 p-2 rounded ${
                              message.role === 'user'
                                ? 'bg-blue-600/20'
                                : 'bg-gray-100'
                            }`}
                          >
                            <FileText className="h-4 w-4" />
                            <span className="text-sm truncate">
                              {attachment.name}
                            </span>
                            {attachment.size && (
                              <span className="text-xs text-opacity-70">
                                ({Math.round(attachment.size / 1024)}KB)
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Message Text */}
                <div className="whitespace-pre-wrap">
                  {message.content}
                  {message.isStreaming && (
                    <span className="inline-block w-2 h-5 bg-blue-500 animate-pulse ml-1"></span>
                  )}
                </div>
              </Card>

              {/* Timestamp */}
              <div
                className={`text-xs text-gray-500 mt-1 ${
                  message.role === 'user' ? 'text-right' : 'text-left'
                }`}
              >
                {formatDate(message.timestamp)}
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* Loading indicator */}
      {isLoading && (
        <div className="flex justify-start">
          <div className="flex max-w-[80%]">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-200 text-gray-600 mr-3 flex items-center justify-center">
              <Bot className="h-4 w-4" />
            </div>
            <Card className="p-4 bg-white border-gray-200">
              <div className="typing-indicator">
                <div
                  className="typing-dot"
                  style={{ '--delay': '0s' } as React.CSSProperties}
                />
                <div
                  className="typing-dot"
                  style={{ '--delay': '0.2s' } as React.CSSProperties}
                />
                <div
                  className="typing-dot"
                  style={{ '--delay': '0.4s' } as React.CSSProperties}
                />
              </div>
            </Card>
          </div>
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  )
}