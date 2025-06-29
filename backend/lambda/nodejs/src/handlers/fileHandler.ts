import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import { User, FileUploadRequest, FileUploadResponse } from '../types';
import { successResponse, errorResponse } from '../utils/response';

const ALLOWED_FILE_TYPES = [
  'image/jpeg',
  'image/png', 
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export const handleFileUpload = async (
  event: APIGatewayProxyEvent,
  user: User,
  s3Client: S3Client
): Promise<APIGatewayProxyResult> => {
  try {
    const body: FileUploadRequest = JSON.parse(event.body || '{}');
    
    if (!body.fileName || !body.contentType) {
      return errorResponse(400, 'fileName and contentType are required');
    }

    // Validate file type
    if (!ALLOWED_FILE_TYPES.includes(body.contentType)) {
      return errorResponse(400, 'File type not allowed');
    }

    // Validate file size
    if (body.size > MAX_FILE_SIZE) {
      return errorResponse(400, 'File size too large (max 10MB)');
    }

    const fileId = uuidv4();
    const fileName = `uploads/${user.sub}/${fileId}-${body.fileName}`;
    
    // Generate pre-signed URL for upload
    const command = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET!,
      Key: fileName,
      ContentType: body.contentType,
      Metadata: {
        userId: user.sub,
        originalName: body.fileName,
        fileId: fileId,
      },
    });

    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

    const response: FileUploadResponse = {
      uploadUrl,
      fileId,
    };

    console.log(`File upload requested by user: ${user.sub}, fileId: ${fileId}`);
    
    return successResponse(response);
    
  } catch (error) {
    console.error('File upload handler error:', error);
    return errorResponse(500, 'Failed to process file upload request');
  }
};