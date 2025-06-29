export interface Message {
  id: string
  content: string
  role: 'user' | 'assistant'
  timestamp: Date
  attachments?: Attachment[]
}

export interface Attachment {
  id: string
  name: string
  type: 'image' | 'document'
  url: string
  size: number
}

export interface ChatSession {
  id: string
  title: string
  messages: Message[]
  createdAt: Date
  updatedAt: Date
}

export interface ChatState {
  sessions: ChatSession[]
  currentSession: ChatSession | null
  isLoading: boolean
  error: string | null
}