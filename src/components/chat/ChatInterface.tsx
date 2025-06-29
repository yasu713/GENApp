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
      content: 'こんにちは！AI Management Assistantです。管理業務に関するご質問やサポートが必要でしたら、お気軽にお声かけください。',
      role: 'assistant',
      timestamp: new Date(),
    }
  ])
  const [isLoading, setIsLoading] = useState(false)

  const handleSendMessage = async (content: string, attachments: File[] = []) => {
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
    setIsLoading(true)

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      const assistantMessage: Message = {
        id: generateId(),
        content: `ご質問いただき、ありがとうございます。「${content.slice(0, 50)}${content.length > 50 ? '...' : ''}」について回答いたします。\n\n現在、このアプリケーションは開発中のため、実際のAI処理は実装されていませんが、以下のような機能を提供予定です：\n\n- ReActエージェントによるWeb検索と情報収集\n- 社内文書のRAG検索\n- マルチモーダル画像認識\n- セキュアな認証システム\n\n具体的なご要望がございましたら、詳細をお聞かせください。`,
        role: 'assistant',
        timestamp: new Date(),
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      console.error('Error sending message:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="flex-1 overflow-hidden">
        <ChatMessages messages={messages} isLoading={isLoading} />
      </div>
      <div className="border-t border-gray-200 bg-white">
        <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />
      </div>
    </div>
  )
}