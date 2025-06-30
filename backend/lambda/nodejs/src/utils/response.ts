import { APIGatewayProxyResult } from 'aws-lambda';

// CORS設定 - 環境に応じた動的設定
const getAllowedOrigins = (): string => {
  const stage = process.env.STAGE || 'dev';
  
  // 本番環境では特定のドメインのみ許可
  if (stage === 'prod') {
    return process.env.ALLOWED_ORIGINS || 'https://your-production-domain.com';
  }
  
  // 開発環境では localhost を許可
  if (stage === 'dev') {
    return 'http://localhost:3000';
  }
  
  // ステージング環境
  return process.env.ALLOWED_ORIGINS || 'https://your-staging-domain.amplifyapp.com';
};

export const corsHeaders = {
  'Access-Control-Allow-Origin': getAllowedOrigins(),
  'Access-Control-Allow-Headers': 'Content-Type,Authorization,x-amz-date,x-api-key',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'Access-Control-Allow-Credentials': 'true',
  'Content-Type': 'application/json',
  // セキュリティヘッダーを追加
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';",
};

export const successResponse = (
  data: any,
  statusCode: number = 200
): APIGatewayProxyResult => ({
  statusCode,
  headers: corsHeaders,
  body: JSON.stringify(data),
});

export const errorResponse = (
  statusCode: number,
  message: string,
  details?: any
): APIGatewayProxyResult => ({
  statusCode,
  headers: corsHeaders,
  body: JSON.stringify({
    error: message,
    details,
  }),
});

export const streamResponse = (
  statusCode: number = 200
): APIGatewayProxyResult => ({
  statusCode,
  headers: {
    ...corsHeaders,
    'Content-Type': 'text/plain',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  },
  body: '',
});