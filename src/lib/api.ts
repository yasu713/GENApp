import { fetchAuthSession } from 'aws-amplify/auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_GATEWAY_URL;

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatRequest {
  message: string;
  sessionId?: string;
  history?: ChatMessage[];
}

interface ChatResponse {
  message: {
    id: string;
    content: string;
    role: 'assistant';
    timestamp: string;
  };
  sessionId: string;
}

class APIError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'APIError';
  }
}

async function getAuthHeaders() {
  try {
    const session = await fetchAuthSession();
    const accessToken = session.tokens?.accessToken;
    
    if (!accessToken) {
      throw new Error('No access token available');
    }

    return {
      'Authorization': `Bearer ${accessToken.toString()}`,
      'Content-Type': 'application/json',
    };
  } catch (error) {
    console.error('Error getting auth headers:', error);
    throw new Error('Authentication failed');
  }
}

export async function sendChatMessage(request: ChatRequest): Promise<ChatResponse> {
  if (!API_BASE_URL) {
    throw new Error('API Gateway URL not configured');
  }

  try {
    const headers = await getAuthHeaders();
    
    const response = await fetch(`${API_BASE_URL}/chat/agent`, {
      method: 'POST',
      headers,
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new APIError(
        response.status,
        errorData.error || `HTTP ${response.status}: ${response.statusText}`
      );
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Chat API error:', error);
    if (error instanceof APIError) {
      throw error;
    }
    throw new Error('Failed to send message');
  }
}

interface StreamEvent {
  event: 'start' | 'chunk' | 'end' | 'error';
  data: any;
}

interface StreamCallbacks {
  onStart?: (data: any) => void;
  onChunk?: (chunk: string, fullContent: string) => void;
  onEnd?: (message: any) => void;
  onError?: (error: string) => void;
}

export async function sendChatMessageStream(
  request: ChatRequest, 
  callbacks: StreamCallbacks
): Promise<void> {
  if (!API_BASE_URL) {
    throw new Error('API Gateway URL not configured');
  }

  try {
    const headers = await getAuthHeaders();
    
    const response = await fetch(`${API_BASE_URL}/chat/stream`, {
      method: 'POST',
      headers: {
        ...headers,
        'Cache-Control': 'no-cache',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new APIError(
        response.status,
        errorData.error || `HTTP ${response.status}: ${response.statusText}`
      );
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) {
      throw new Error('Failed to get response stream reader');
    }

    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(line => line.trim());

        for (const line of lines) {
          try {
            const event: StreamEvent = JSON.parse(line);
            
            switch (event.event) {
              case 'start':
                callbacks.onStart?.(event.data);
                break;
              case 'chunk':
                callbacks.onChunk?.(event.data.content, event.data.fullContent);
                break;
              case 'end':
                callbacks.onEnd?.(event.data.message);
                break;
              case 'error':
                callbacks.onError?.(event.data.error);
                break;
            }
          } catch (parseError) {
            console.error('Failed to parse stream event:', parseError);
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  } catch (error) {
    console.error('Chat stream API error:', error);
    if (error instanceof APIError) {
      throw error;
    }
    throw new Error('Failed to send streaming message');
  }
}

export async function uploadFile(file: File, path?: string): Promise<{ url: string; key: string }> {
  if (!API_BASE_URL) {
    throw new Error('API Gateway URL not configured');
  }

  try {
    const headers = await getAuthHeaders();
    
    const formData = new FormData();
    formData.append('file', file);
    if (path) {
      formData.append('path', path);
    }

    const response = await fetch(`${API_BASE_URL}/api/upload`, {
      method: 'POST',
      headers: {
        'Authorization': headers.Authorization,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new APIError(
        response.status,
        errorData.error || `HTTP ${response.status}: ${response.statusText}`
      );
    }

    const data = await response.json();
    // Handle multiple files response format
    if (data.files && data.files.length > 0) {
      return {
        url: data.files[0].url,
        key: data.files[0].key
      };
    }
    return data;
  } catch (error) {
    console.error('Upload API error:', error);
    if (error instanceof APIError) {
      throw error;
    }
    throw new Error('Failed to upload file');
  }
}