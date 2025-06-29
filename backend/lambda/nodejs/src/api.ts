import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider';
import { S3Client } from '@aws-sdk/client-s3';
import { SSMClient } from '@aws-sdk/client-ssm';
import { handleChatRequest } from './handlers/chatHandler';
import { handleFileUpload } from './handlers/fileHandler';
import { handleUserProfile } from './handlers/userHandler';
import { corsHeaders, errorResponse, successResponse } from './utils/response';
import { validateJWT } from './utils/auth';

const cognitoClient = new CognitoIdentityProviderClient({ region: process.env.REGION });
const s3Client = new S3Client({ region: process.env.REGION });
const ssmClient = new SSMClient({ region: process.env.REGION });

export const handler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  console.log('Event:', JSON.stringify(event, null, 2));
  
  try {
    // CORS preflight
    if (event.httpMethod === 'OPTIONS') {
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: '',
      };
    }

    // Extract path and method
    const path = event.pathParameters?.proxy || '';
    const method = event.httpMethod;
    
    // Validate JWT token
    const authHeader = event.headers.Authorization || event.headers.authorization;
    if (!authHeader) {
      return errorResponse(401, 'Missing authorization header');
    }

    const user = await validateJWT(authHeader, cognitoClient);
    if (!user) {
      return errorResponse(401, 'Invalid token');
    }

    // Route requests
    switch (true) {
      case path.startsWith('chat') && method === 'POST':
        return await handleChatRequest(event, user, s3Client, ssmClient);
      
      case path.startsWith('upload') && method === 'POST':
        return await handleFileUpload(event, user, s3Client);
      
      case path.startsWith('user') && method === 'GET':
        return await handleUserProfile(event, user, cognitoClient);
      
      default:
        return errorResponse(404, 'Endpoint not found');
    }
    
  } catch (error) {
    console.error('Handler error:', error);
    return errorResponse(500, 'Internal server error');
  }
};