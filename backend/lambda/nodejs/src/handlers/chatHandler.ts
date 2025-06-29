import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { S3Client } from '@aws-sdk/client-s3';
import { SSMClient, GetParameterCommand } from '@aws-sdk/client-ssm';
import { v4 as uuidv4 } from 'uuid';
import { User, ChatRequest, ChatResponse } from '../types';
import { successResponse, errorResponse } from '../utils/response';

export const handleChatRequest = async (
  event: APIGatewayProxyEvent,
  user: User,
  s3Client: S3Client,
  ssmClient: SSMClient
): Promise<APIGatewayProxyResult> => {
  try {
    const body: ChatRequest = JSON.parse(event.body || '{}');
    
    if (!body.message) {
      return errorResponse(400, 'Message is required');
    }

    // Generate session ID if not provided
    const sessionId = body.sessionId || uuidv4();
    
    // For now, return a mock response
    // In production, this would call the Python Lambda function
    const response: ChatResponse = {
      message: {
        id: uuidv4(),
        content: `こんにちは、${user.email}さん！あなたのメッセージ「${body.message}」を受信しました。\n\n現在、ReActエージェントは開発中ですが、以下の機能を提供予定です：\n- Web検索による最新情報収集\n- 社内文書の検索と分析\n- 画像認識によるマルチモーダル対応\n\n何かご質問がございましたら、お気軽にお聞かせください。`,
        role: 'assistant',
        timestamp: new Date().toISOString(),
      },
      sessionId,
    };

    // Log for monitoring
    console.log(`Chat request from user: ${user.sub}, session: ${sessionId}`);
    
    return successResponse(response);
    
  } catch (error) {
    console.error('Chat handler error:', error);
    return errorResponse(500, 'Failed to process chat request');
  }
};