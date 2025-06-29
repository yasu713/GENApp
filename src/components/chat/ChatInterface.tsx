'use client'

import { useState } from 'react'
import { ChatMessages } from './ChatMessages'
import { ChatInput } from './ChatInput'
import { Message } from '@/types/chat'
import { generateId } from '@/lib/utils'

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: 'こんにちは！AI Management Assistantです。管理業務に関するご質問やサポートが必要でしたら、お気軽にお声かけください。\n\n💡 **新機能**: リアルタイムストリーミングレスポンスに対応しました！',
      role: 'assistant',
      timestamp: new Date(),
    }
  ])
  const [isLoading, setIsLoading] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null)

  const handleSendMessage = async (content: string, attachments: File[] = [], useStreaming = true) => {
    const userMessage: Message = {
      id: generateId(),
      content,
      role: 'user',
      timestamp: new Date(),
      attachments: attachments.map(file => ({
        id: generateId(),
        name: file.name,
        type: file.type.startsWith('image/') ? 'image' : 'document',
        url: URL.createObjectURL(file),
        size: file.size
      }))
    }

    setMessages(prev => [...prev, userMessage])
    
    if (useStreaming) {
      setIsStreaming(true)
    } else {
      setIsLoading(true)
    }

    try {
      // Upload files if any
      const uploadedFiles = []
      for (const file of attachments) {
        try {
          const { uploadFile } = await import('@/lib/api')
          const result = await uploadFile(file, 'chat-uploads/')
          uploadedFiles.push({
            name: file.name,
            url: result.url,
            key: result.key
          })
        } catch (error) {
          console.error('File upload error:', error)
        }
      }

      // Prepare chat history
      const history = messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }))

      // Add file information to content if any files were uploaded
      let messageContent = content
      if (uploadedFiles.length > 0) {
        const fileInfo = uploadedFiles.map(f => `[添付ファイル: ${f.name}]`).join('\n')
        messageContent = `${content}\n\n${fileInfo}`
        
        // For image files, add instruction to analyze them
        const imageFiles = uploadedFiles.filter(f => 
          attachments.find(att => att.name === f.name)?.type.startsWith('image/')
        )
        if (imageFiles.length > 0) {
          const imageInstructions = imageFiles.map(f => 
            `画像「${f.name}」を analyze_image ツールを使用して詳しく解析してください。S3キー: ${f.key}`
          ).join('\n')
          messageContent = `${messageContent}\n\n${imageInstructions}`
        }
      }

      const requestData = {
        message: messageContent,
        history,
        sessionId: generateId()
      }

      if (useStreaming) {
        // Use streaming API
        const { sendChatMessageStream } = await import('@/lib/api')
        
        // Create placeholder message for streaming
        const streamingMessageId = generateId()
        setStreamingMessageId(streamingMessageId)
        
        const streamingMessage: Message = {
          id: streamingMessageId,
          content: '',
          role: 'assistant',
          timestamp: new Date(),
          isStreaming: true
        }
        
        setMessages(prev => [...prev, streamingMessage])

        await sendChatMessageStream(requestData, {
          onStart: (data) => {
            console.log('Streaming started:', data)
          },
          onChunk: (chunk, fullContent) => {
            setMessages(prev => prev.map(msg => 
              msg.id === streamingMessageId 
                ? { ...msg, content: fullContent }
                : msg
            ))
          },
          onEnd: (message) => {
            setMessages(prev => prev.map(msg => 
              msg.id === streamingMessageId 
                ? { 
                    ...msg, 
                    content: message.content,
                    isStreaming: false,
                    timestamp: new Date(message.timestamp)
                  }
                : msg
            ))
            setStreamingMessageId(null)
          },
          onError: (error) => {
            setMessages(prev => prev.map(msg => 
              msg.id === streamingMessageId 
                ? { 
                    ...msg, 
                    content: `エラーが発生しました: ${error}`,
                    isStreaming: false
                  }
                : msg
            ))
            setStreamingMessageId(null)
          }
        })
      } else {
        // Use regular API
        const { sendChatMessage } = await import('@/lib/api')
        const response = await sendChatMessage(requestData)
        
        const assistantMessage: Message = {
          id: response.message.id,
          content: response.message.content,
          role: 'assistant',
          timestamp: new Date(response.message.timestamp),
        }

        setMessages(prev => [...prev, assistantMessage])
      }
    } catch (error) {
      console.error('Error sending message:', error)
      
      // Show error message to user
      const errorMessage: Message = {
        id: generateId(),
        content: 'エラーが発生しました。しばらく時間をおいて再度お試しください。\n\n詳細: ' + (error instanceof Error ? error.message : '不明なエラー'),
        role: 'assistant',
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
      setIsStreaming(false)
    }
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="flex-1 overflow-hidden">
        <ChatMessages 
          messages={messages} 
          isLoading={isLoading} 
          isStreaming={isStreaming}
          streamingMessageId={streamingMessageId}
        />
      </div>
      <div className="border-t border-gray-200 bg-white">
        <ChatInput 
          onSendMessage={handleSendMessage} 
          isLoading={isLoading || isStreaming} 
        />
      </div>
    </div>
  )
}