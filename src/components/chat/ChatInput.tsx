'use client'

import { useState, useRef } from 'react'
import { Send, Paperclip, X, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

interface ChatInputProps {
  onSendMessage: (message: string, attachments: File[]) => void
  isLoading: boolean
}

export function ChatInput({ onSendMessage, isLoading }: ChatInputProps) {
  const [message, setMessage] = useState('')
  const [attachments, setAttachments] = useState<File[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (message.trim() || attachments.length > 0) {
      onSendMessage(message.trim(), attachments)
      setMessage('')
      setAttachments([])
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    // Filter supported file types
    const supportedFiles = files.filter(file => {
      const isImage = file.type.startsWith('image/')
      const isDocument = ['application/pdf', 'text/plain', 
        'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
        .includes(file.type)
      return isImage || isDocument
    })
    
    if (supportedFiles.length !== files.length) {
      alert('サポートされていないファイル形式が含まれています。画像ファイル（JPG, PNG, GIF, WebP）またはドキュメント（PDF, DOC, DOCX, TXT）のみアップロード可能です。')
    }
    
    setAttachments(prev => [...prev, ...supportedFiles])
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index))
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className="p-4">
      {/* Attachments Preview */}
      {attachments.length > 0 && (
        <div className="mb-3 space-y-2">
          {attachments.map((file, index) => (
            <div
              key={index}
              className="flex items-start justify-between p-3 bg-gray-50 rounded-lg"
            >
              <div className="flex items-start space-x-3 flex-1">
                {file.type.startsWith('image/') ? (
                  <div className="flex-shrink-0">
                    <img
                      src={URL.createObjectURL(file)}
                      alt={file.name}
                      className="w-16 h-16 object-cover rounded border"
                    />
                  </div>
                ) : (
                  <div className="flex-shrink-0 w-16 h-16 bg-gray-200 rounded border flex items-center justify-center">
                    <FileText className="h-6 w-6 text-gray-500" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-700 truncate">
                    {file.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatFileSize(file.size)}
                  </p>
                  {file.type.startsWith('image/') && (
                    <p className="text-xs text-blue-600 mt-1">
                      画像解析機能で自動分析されます
                    </p>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeAttachment(index)}
                className="h-6 w-6 flex-shrink-0"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="flex space-x-2">
        <div className="flex-1 relative">
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="メッセージを入力してください..."
            className="min-h-[60px] max-h-32 resize-none pr-12"
            disabled={isLoading}
          />
          <div className="absolute bottom-2 right-2 flex space-x-1">
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileSelect}
              className="hidden"
              multiple
              accept="image/*,.pdf,.doc,.docx,.txt"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              className="h-8 w-8"
              disabled={isLoading}
            >
              <Paperclip className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <Button
          type="submit"
          disabled={isLoading || (!message.trim() && attachments.length === 0)}
          className="px-6"
        >
          <Send className="h-4 w-4" />
        </Button>
      </form>

      {/* Helper Text */}
      <p className="text-xs text-gray-500 mt-2">
        Shift + Enter で改行、Enter で送信
      </p>
    </div>
  )
}