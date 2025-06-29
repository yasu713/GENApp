export interface User {
  sub: string;
  email: string;
  groups?: string[];
  'cognito:username': string;
}

export interface ChatMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: string;
  attachments?: Attachment[];
}

export interface Attachment {
  id: string;
  name: string;
  type: 'image' | 'document';
  url: string;
  size: number;
}

export interface ChatRequest {
  message: string;
  sessionId?: string;
  attachments?: Attachment[];
}

export interface ChatResponse {
  message: ChatMessage;
  sessionId: string;
}

export interface FileUploadRequest {
  fileName: string;
  contentType: string;
  size: number;
}

export interface FileUploadResponse {
  uploadUrl: string;
  fileId: string;
}