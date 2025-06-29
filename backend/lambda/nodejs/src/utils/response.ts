import { APIGatewayProxyResult } from 'aws-lambda';

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'Access-Control-Allow-Credentials': 'true',
  'Content-Type': 'application/json',
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