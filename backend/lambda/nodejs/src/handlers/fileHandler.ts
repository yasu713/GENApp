import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import { User, FileUploadRequest, FileUploadResponse } from '../types';
import { successResponse, errorResponse } from '../utils/response';
import * as multipart from 'lambda-multipart-parser';

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
    // Parse multipart form data
    const result = await multipart.parse(event);
    const files = result.files;
    
    if (!files || files.length === 0) {
      return errorResponse(400, 'No files provided');
    }

    const uploadedFiles = [];

    for (const file of files) {
      // Validate file type
      if (!ALLOWED_FILE_TYPES.includes(file.contentType)) {
        continue; // Skip unsupported files
      }

      // Validate file size
      if (file.content.length > MAX_FILE_SIZE) {
        continue; // Skip oversized files
      }

      const fileId = uuidv4();
      const fileExtension = file.filename.split('.').pop() || '';
      const fileName = `uploads/${user.sub}/${fileId}-${file.filename}`;
      
      // Upload to S3
      const command = new PutObjectCommand({
        Bucket: process.env.S3_BUCKET!,
        Key: fileName,
        Body: file.content,
        ContentType: file.contentType,
        Metadata: {
          userId: user.sub,
          originalName: file.filename,
          fileId: fileId,
        },
      });

      await s3Client.send(command);

      const uploadedFile = {
        key: fileName,
        name: file.filename,
        size: file.content.length,
        contentType: file.contentType,
        url: `https://${process.env.S3_BUCKET}.s3.${process.env.REGION}.amazonaws.com/${fileName}`,
        fileId,
      };

      uploadedFiles.push(uploadedFile);
      console.log(`File uploaded by user: ${user.sub}, fileId: ${fileId}, fileName: ${file.filename}`);
    }

    if (uploadedFiles.length === 0) {
      return errorResponse(400, 'No valid files were uploaded');
    }

    return successResponse({ 
      files: uploadedFiles,
      count: uploadedFiles.length 
    });
    
  } catch (error) {
    console.error('File upload handler error:', error);
    return errorResponse(500, 'Failed to process file upload request');
  }
};