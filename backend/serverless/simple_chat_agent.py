import json
import os
import boto3
import logging
import base64
import urllib.request
import urllib.parse
import urllib.error
from typing import Dict, Any, List, Optional
from datetime import datetime

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# AWS clients
bedrock_client = boto3.client('bedrock-runtime')
s3_client = boto3.client('s3')
ssm_client = boto3.client('ssm')

class SimpleChatAgent:
    def __init__(self):
        self.model_id = "anthropic.claude-3-5-sonnet-20240620-v1:0"
        self.region = os.environ.get('AWS_REGION', 'ap-northeast-1')
        
    def web_search(self, query: str) -> str:
        """Simple web search using DuckDuckGo Instant Answer API"""
        try:
            logger.info(f"Performing web search: {query}")
            
            # DuckDuckGo Instant Answer API (free, no key required)
            url = "https://api.duckduckgo.com/"
            params = {
                'q': query,
                'format': 'json',
                'no_html': '1',
                'skip_disambig': '1'
            }
            
            # Construct URL with parameters
            query_string = urllib.parse.urlencode(params)
            full_url = f"{url}?{query_string}"
            
            # Make request
            req = urllib.request.Request(full_url)
            with urllib.request.urlopen(req, timeout=10) as response:
                response_text = response.read().decode('utf-8')
                data = json.loads(response_text)
            
            # Extract relevant information
            results = []
            
            # Abstract text
            if data.get('Abstract'):
                results.append(f"Summary: {data['Abstract']}")
            
            # Definition
            if data.get('Definition'):
                results.append(f"Definition: {data['Definition']}")
            
            # Answer (for calculations, conversions, etc.)
            if data.get('Answer'):
                results.append(f"Answer: {data['Answer']}")
            
            # Related topics
            if data.get('RelatedTopics'):
                topics = data['RelatedTopics'][:3]  # First 3 topics
                for topic in topics:
                    if isinstance(topic, dict) and topic.get('Text'):
                        results.append(f"Related: {topic['Text']}")
            
            if results:
                return f"Search results for '{query}':\n" + "\n".join(results)
            else:
                return f"No specific results found for '{query}' via instant search API"
                
        except Exception as e:
            logger.error(f"Web search error: {e}")
            return f"Web search temporarily unavailable: {str(e)}"
    
    def analyze_image(self, image_input: str) -> str:
        """Analyze images using Claude's vision capabilities"""
        try:
            logger.info(f"Analyzing image: {image_input[:50]}...")
            
            # Extract image data
            image_data = None
            image_format = None
            
            if image_input.startswith('data:image/'):
                # Data URL format
                header, data = image_input.split(',', 1)
                image_format = header.split(';')[0].split('/')[1]
                image_data = base64.b64decode(data)
            elif image_input.startswith('s3://') or '/' in image_input:
                # S3 key or URL
                s3_key = image_input.replace('s3://', '').split('/', 1)
                if len(s3_key) == 2:
                    bucket, key = s3_key
                else:
                    bucket = os.environ.get('S3_BUCKET', '').replace('s3://', '')
                    key = image_input
                
                try:
                    response = s3_client.get_object(Bucket=bucket, Key=key)
                    image_data = response['Body'].read()
                    image_format = key.split('.')[-1].lower()
                    if image_format == 'jpg':
                        image_format = 'jpeg'
                except Exception as s3_error:
                    logger.error(f"S3 image retrieval error: {s3_error}")
                    return f"Failed to retrieve image from S3: {str(s3_error)}"
            else:
                # Assume it's a base64 encoded image
                try:
                    image_data = base64.b64decode(image_input)
                    image_format = 'jpeg'  # default
                except Exception:
                    return "Invalid image format. Please provide a valid image URL, S3 key, or base64 data."
            
            if not image_data:
                return "Failed to extract image data"
            
            # Validate image format
            supported_formats = ['jpeg', 'jpg', 'png', 'gif', 'webp']
            if image_format not in supported_formats:
                return f"Unsupported image format: {image_format}. Supported formats: {', '.join(supported_formats)}"
            
            # Encode image for Claude
            image_b64 = base64.b64encode(image_data).decode('utf-8')
            
            # Prepare request for Bedrock
            message = {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": "Please analyze this image in detail. Describe what you see, including any text, charts, diagrams, objects, people, or other relevant details. If there are any business-related elements like charts, graphs, or documents, pay special attention to those."
                    },
                    {
                        "type": "image",
                        "source": {
                            "type": "base64",
                            "media_type": f"image/{image_format}",
                            "data": image_b64
                        }
                    }
                ]
            }
            
            # Call Bedrock with image
            response = bedrock_client.invoke_model(
                modelId=self.model_id,
                body=json.dumps({
                    "anthropic_version": "bedrock-2023-05-31",
                    "max_tokens": 2000,
                    "messages": [message]
                })
            )
            
            response_body = json.loads(response['body'].read())
            
            if 'content' in response_body and response_body['content']:
                analysis = response_body['content'][0]['text']
                return f"Image analysis results:\n\n{analysis}"
            else:
                return "No image analysis results returned"
            
        except Exception as e:
            logger.error(f"Image analysis error: {e}")
            return f"Image analysis failed: {str(e)}"
    
    def invoke_claude(self, messages: List[Dict], use_tools: bool = True) -> str:
        """Invoke Claude 3.5 Sonnet via Bedrock with simple tool calling"""
        try:
            # Check if the message contains requests for tools
            latest_message = messages[-1]['content'] if messages else ""
            
            # Simple keyword-based tool detection
            should_search = any(keyword in latest_message.lower() for keyword in [
                'search', 'find information', 'look up', 'current', 'latest', 'news', 'web'
            ])
            
            should_analyze_image = any(keyword in latest_message.lower() for keyword in [
                'image', 'picture', 'analyze', 'photo', 'chart', 'graph', 'diagram'
            ]) and ('s3://' in latest_message or 'data:image/' in latest_message or '.jpg' in latest_message or '.png' in latest_message)
            
            # Perform tool actions if needed
            tool_results = []
            
            if use_tools and should_search:
                # Extract search query (simple approach)
                search_query = latest_message
                # Clean up the query
                for prefix in ['search for ', 'find information about ', 'look up ', 'web search ']:
                    if prefix in search_query.lower():
                        search_query = search_query.lower().replace(prefix, '')
                        break
                
                search_result = self.web_search(search_query)
                tool_results.append(f"\n[Web Search Results]:\n{search_result}\n")
            
            if use_tools and should_analyze_image:
                # Extract image reference from message
                for part in latest_message.split():
                    if 's3://' in part or 'data:image/' in part or part.endswith(('.jpg', '.jpeg', '.png', '.gif')):
                        image_result = self.analyze_image(part)
                        tool_results.append(f"\n[Image Analysis Results]:\n{image_result}\n")
                        break
            
            # Prepare system message
            system_message = """You are an AI assistant for business management support. You help managers with decision-making, efficiency improvement, and information gathering.

You have access to:
1. Web search capabilities for current information
2. Image analysis for charts, documents, and visual content

Always provide helpful, accurate, and professional responses. If you used any tools, acknowledge the information they provided."""

            # Format messages for Claude
            claude_messages = []
            for msg in messages:
                if msg['role'] in ['user', 'assistant']:
                    content = msg['content']
                    # Add tool results to the latest user message if available
                    if msg == messages[-1] and tool_results:
                        content = content + "\n\n" + "\n".join(tool_results)
                    
                    claude_messages.append({
                        "role": msg['role'],
                        "content": content
                    })
            
            # Prepare request
            request_body = {
                "anthropic_version": "bedrock-2023-05-31",
                "max_tokens": 2000,
                "system": system_message,
                "messages": claude_messages
            }
            
            # Call Bedrock
            response = bedrock_client.invoke_model(
                modelId=self.model_id,
                body=json.dumps(request_body)
            )
            
            response_body = json.loads(response['body'].read())
            
            if 'content' in response_body and response_body['content']:
                return response_body['content'][0]['text']
            else:
                return "No response generated"
            
        except Exception as e:
            logger.error(f"Claude invocation error: {e}")
            return f"AI処理中にエラーが発生しました: {str(e)}"


def validate_token(auth_header):
    """Simple token validation (placeholder)"""
    if auth_header and auth_header.startswith('Bearer '):
        return {'sub': 'test-user', 'cognito:groups': ['admin']}
    return None


def handler(event, context):
    """Lambda handler for simple chat agent"""
    logger.info(f"Simple chat agent event: {json.dumps(event, default=str)}")
    
    try:
        # CORS headers
        cors_headers = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,Authorization',
            'Access-Control-Allow-Methods': 'POST,OPTIONS',
            'Access-Control-Allow-Credentials': 'true',
            'Content-Type': 'application/json'
        }
        
        # Handle CORS preflight
        http_method = event.get('httpMethod') or event.get('requestContext', {}).get('http', {}).get('method')
        if http_method == 'OPTIONS':
            return {
                'statusCode': 200,
                'headers': cors_headers,
                'body': ''
            }
        
        # Validate authorization
        headers = event.get('headers', {})
        auth_header = headers.get('Authorization') or headers.get('authorization')
        if not auth_header:
            return {
                'statusCode': 401,
                'headers': cors_headers,
                'body': json.dumps({'error': 'Missing authorization header'})
            }
        
        user = validate_token(auth_header)
        if not user:
            return {
                'statusCode': 401,
                'headers': cors_headers,
                'body': json.dumps({'error': 'Invalid token'})
            }
        
        # Parse request body
        body_str = event.get('body', '{}')
        if isinstance(body_str, str):
            try:
                body = json.loads(body_str)
            except json.JSONDecodeError as e:
                logger.error(f"JSON decode error: {e}")
                return {
                    'statusCode': 400,
                    'headers': cors_headers,
                    'body': json.dumps({'error': f'Invalid JSON: {str(e)}'})
                }
        else:
            body = body_str
            
        message = body.get('message', '')
        session_id = body.get('sessionId', '')
        conversation_history = body.get('history', [])
        
        if not message:
            return {
                'statusCode': 400,
                'headers': cors_headers,
                'body': json.dumps({'error': 'Message is required'})
            }
        
        # Initialize chat agent
        agent = SimpleChatAgent()
        
        # Prepare messages for agent
        messages = conversation_history + [{'role': 'user', 'content': message}]
        
        # Get response from agent
        response = agent.invoke_claude(messages)
        
        # Prepare response
        result = {
            'message': {
                'id': context.aws_request_id,
                'content': response,
                'role': 'assistant',
                'timestamp': datetime.utcnow().isoformat() + 'Z'
            },
            'sessionId': session_id or context.aws_request_id
        }
        
        logger.info(f"Chat response generated for user: {user.get('sub', 'unknown')}")
        
        return {
            'statusCode': 200,
            'headers': cors_headers,
            'body': json.dumps(result)
        }
        
    except Exception as e:
        logger.error(f"Simple chat agent error: {e}")
        return {
            'statusCode': 500,
            'headers': cors_headers,
            'body': json.dumps({'error': 'Internal server error'})
        }