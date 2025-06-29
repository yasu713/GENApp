import json
import boto3
import os
import logging
from typing import Dict, Any
from urllib.parse import unquote_plus
import tempfile

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# AWS clients
s3_client = boto3.client('s3')
bedrock_agent_client = boto3.client('bedrock-agent')

def handler(event, context):
    """Lambda handler for S3 file processing"""
    logger.info(f"File processor event: {json.dumps(event)}")
    
    try:
        # Process S3 event
        for record in event.get('Records', []):
            if record.get('eventSource') == 'aws:s3':
                process_s3_object(record)
        
        return {
            'statusCode': 200,
            'body': json.dumps({'message': 'Files processed successfully'})
        }
        
    except Exception as e:
        logger.error(f"File processor error: {e}")
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }

def process_s3_object(record: Dict[str, Any]):
    """Process uploaded S3 object"""
    try:
        # Extract S3 information
        bucket = record['s3']['bucket']['name']
        key = unquote_plus(record['s3']['object']['key'])
        
        logger.info(f"Processing file: s3://{bucket}/{key}")
        
        # Check if file is in uploads/ directory
        if not key.startswith('uploads/'):
            logger.info(f"Skipping file not in uploads directory: {key}")
            return
        
        # Get file metadata
        response = s3_client.head_object(Bucket=bucket, Key=key)
        metadata = response.get('Metadata', {})
        content_type = response.get('ContentType', '')
        
        user_id = metadata.get('userid', '')
        original_name = metadata.get('originalname', '')
        file_id = metadata.get('fileid', '')
        
        logger.info(f"File metadata - User: {user_id}, Original: {original_name}, ID: {file_id}")
        
        # Process based on file type
        if content_type.startswith('image/'):
            process_image_file(bucket, key, metadata)
        elif content_type in ['application/pdf', 'text/plain', 'application/msword', 
                             'application/vnd.openxmlformats-officedocument.wordprocessingml.document']:
            process_document_file(bucket, key, metadata)
        else:
            logger.warning(f"Unsupported file type: {content_type}")
        
        # Update file status in metadata
        s3_client.copy_object(
            Bucket=bucket,
            Key=key,
            CopySource={'Bucket': bucket, 'Key': key},
            Metadata={
                **metadata,
                'processed': 'true',
                'processed_at': context.aws_request_id
            },
            MetadataDirective='REPLACE'
        )
        
        logger.info(f"Successfully processed file: {key}")
        
    except Exception as e:
        logger.error(f"Error processing S3 object {record}: {e}")
        raise

def process_image_file(bucket: str, key: str, metadata: Dict[str, str]):
    """Process image file for multimodal analysis"""
    try:
        logger.info(f"Processing image file: {key}")
        
        # For now, just log that the image is ready for analysis
        # In production, this could trigger image analysis via Bedrock
        logger.info(f"Image {key} is ready for multimodal analysis")
        
        # Move to processed folder
        processed_key = key.replace('uploads/', 'processed/images/')
        s3_client.copy_object(
            Bucket=bucket,
            Key=processed_key,
            CopySource={'Bucket': bucket, 'Key': key}
        )
        
    except Exception as e:
        logger.error(f"Error processing image file {key}: {e}")
        raise

def process_document_file(bucket: str, key: str, metadata: Dict[str, str]):
    """Process document file for knowledge base ingestion"""
    try:
        logger.info(f"Processing document file: {key}")
        
        knowledge_base_id = os.environ.get('KNOWLEDGE_BASE_ID')
        if not knowledge_base_id:
            logger.warning("Knowledge base ID not configured, skipping document processing")
            return
        
        # Move to knowledge base data source location
        kb_key = key.replace('uploads/', 'knowledge-base/')
        s3_client.copy_object(
            Bucket=bucket,
            Key=kb_key,
            CopySource={'Bucket': bucket, 'Key': key}
        )
        
        logger.info(f"Document moved to knowledge base location: {kb_key}")
        
        # Trigger knowledge base sync (if configured)
        try:
            # Note: This would trigger a knowledge base ingestion job
            # For now, we'll just log the action
            logger.info(f"Document {kb_key} ready for knowledge base ingestion")
            
            # In production, you might trigger:
            # bedrock_agent_client.start_ingestion_job(
            #     knowledgeBaseId=knowledge_base_id,
            #     dataSourceId=data_source_id
            # )
            
        except Exception as e:
            logger.warning(f"Could not trigger knowledge base sync: {e}")
        
    except Exception as e:
        logger.error(f"Error processing document file {key}: {e}")
        raise

def extract_text_from_file(bucket: str, key: str, content_type: str) -> str:
    """Extract text from various file types"""
    try:
        # Download file to temporary location
        with tempfile.NamedTemporaryFile() as tmp_file:
            s3_client.download_fileobj(bucket, key, tmp_file)
            tmp_file.seek(0)
            
            if content_type == 'text/plain':
                return tmp_file.read().decode('utf-8')
            elif content_type == 'application/pdf':
                # For production, implement PDF text extraction
                # Could use PyPDF2, pdfplumber, or AWS Textract
                return "PDF text extraction not implemented"
            else:
                return "Text extraction not supported for this file type"
                
    except Exception as e:
        logger.error(f"Error extracting text from {key}: {e}")
        return f"Error extracting text: {str(e)}"