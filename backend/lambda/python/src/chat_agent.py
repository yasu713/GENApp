import json
import os
import boto3
import logging
import base64
from typing import Dict, Any, List, Optional
from datetime import datetime
from langchain.tools import Tool
from langchain_community.tools import DuckDuckGoSearchResults
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from langchain_aws import ChatBedrock
from langgraph.prebuilt import create_react_agent
import jwt
from PIL import Image
import io

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# AWS clients
bedrock_client = boto3.client('bedrock-runtime')
s3_client = boto3.client('s3')
ssm_client = boto3.client('ssm')
knowledge_base_client = boto3.client('bedrock-agent-runtime')

# Initialize Bedrock client
bedrock_llm = ChatBedrock(
    model_id="anthropic.claude-3-5-sonnet-20241022-v2:0",
    region_name="ap-northeast-1"
)

class ChatAgent:
    def __init__(self):
        self.model_id = "anthropic.claude-3-5-sonnet-20241022-v2:0"
        self.search_tool = DuckDuckGoSearchResults(max_results=5)
        self.knowledge_base_id = os.environ.get('KNOWLEDGE_BASE_ID')
        
    def create_tools(self) -> List[Tool]:
        """Create tools for the ReAct agent"""
        tools = [
            Tool(
                name="web_search",
                description="Search the web for current information. Use this when you need up-to-date facts, news, or information not in your knowledge base.",
                func=self._web_search
            ),
            Tool(
                name="analyze_image",
                description="Analyze images using Claude's vision capabilities. Provide the S3 key or URL of the image to analyze. Use this for understanding charts, diagrams, documents, or any visual content.",
                func=self._analyze_image
            )
        ]
        
        if self.knowledge_base_id:
            tools.append(
                Tool(
                    name="knowledge_base_search",
                    description="Search internal company documents and knowledge base. Use this for company-specific information, policies, procedures, and internal data.",
                    func=self._knowledge_base_search
                )
            )
        
        return tools
    
    def _web_search(self, query: str) -> str:
        """Perform web search using DuckDuckGo"""
        try:
            logger.info(f"Performing web search: {query}")
            results = self.search_tool.run(query)
            
            # Format results for better readability
            if isinstance(results, list):
                formatted_results = []
                for i, result in enumerate(results[:5], 1):
                    if isinstance(result, dict):
                        title = result.get('title', 'No title')
                        snippet = result.get('snippet', '')
                        link = result.get('link', '')
                        formatted_results.append(f"{i}. {title}\n   {snippet}\n   URL: {link}")
                    else:
                        formatted_results.append(f"{i}. {str(result)}")
                return f"Web search results for '{query}':\n\n" + "\n\n".join(formatted_results)
            else:
                return f"Web search results for '{query}':\n{results}"
                
        except Exception as e:
            logger.error(f"Web search error: {e}")
            return f"Web search failed: {str(e)}"
    
    def _knowledge_base_search(self, query: str) -> str:
        """Search company knowledge base using Amazon Bedrock"""
        try:
            logger.info(f"Searching knowledge base: {query}")
            
            response = knowledge_base_client.retrieve(
                knowledgeBaseId=self.knowledge_base_id,
                retrievalQuery={
                    'text': query
                },
                retrievalConfiguration={
                    'vectorSearchConfiguration': {
                        'numberOfResults': 5
                    }
                }
            )
            
            results = []
            for result in response.get('retrievalResults', []):
                content = result.get('content', {}).get('text', '')
                source = result.get('location', {}).get('s3Location', {}).get('uri', '')
                score = result.get('score', 0)
                
                results.append(f"Source: {source}\nScore: {score:.3f}\nContent: {content}\n")
            
            if results:
                return f"Knowledge base search results for '{query}':\n" + "\n---\n".join(results)
            else:
                return f"No relevant documents found in knowledge base for '{query}'"
                
        except Exception as e:
            logger.error(f"Knowledge base search error: {e}")
            return f"Knowledge base search failed: {str(e)}"
    
    def _analyze_image(self, image_input: str) -> str:
        """Analyze images using Claude's vision capabilities"""
        try:
            logger.info(f"Analyzing image: {image_input}")
            
            # Extract image data based on input type
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
                    # Determine format from file extension
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
                    # Try to detect format from image data
                    image = Image.open(io.BytesIO(image_data))
                    image_format = image.format.lower()
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
            
            # Create message with image
            messages = [
                SystemMessage(content="You are an expert image analyst. Analyze the provided image thoroughly and describe what you see, including any text, charts, diagrams, objects, people, or other relevant details. If there are any business-related elements like charts, graphs, or documents, pay special attention to those."),
                HumanMessage(content=[
                    {
                        "type": "text",
                        "text": "Please analyze this image in detail:"
                    },
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:image/{image_format};base64,{image_b64}"
                        }
                    }
                ])
            ]
            
            # Use Claude directly for vision analysis
            response = bedrock_llm.invoke(messages)
            
            return f"Image analysis results:\n\n{response.content}"
            
        except Exception as e:
            logger.error(f"Image analysis error: {e}")
            return f"Image analysis failed: {str(e)}"
    
    def invoke_claude(self, messages: List[Dict], tools: List[Tool]) -> str:
        """Invoke Claude 3.5 Sonnet via Bedrock with ReAct agent"""
        try:
            # Format messages for Claude
            formatted_messages = []
            for msg in messages:
                if msg['role'] == 'user':
                    formatted_messages.append(HumanMessage(content=msg['content']))
                elif msg['role'] == 'assistant':
                    formatted_messages.append(AIMessage(content=msg['content']))
            
            # Create ReAct agent with tools
            agent_executor = create_react_agent(
                model=bedrock_llm,
                tools=tools
            )
            
            # Get the latest user message
            latest_message = formatted_messages[-1].content if formatted_messages else ""
            
            # Execute agent
            result = agent_executor.invoke({
                'messages': formatted_messages
            })
            
            # Extract the response from the result
            if isinstance(result, dict):
                if 'messages' in result and result['messages']:
                    last_message = result['messages'][-1]
                    if hasattr(last_message, 'content'):
                        return last_message.content
                    elif isinstance(last_message, dict) and 'content' in last_message:
                        return last_message['content']
                elif 'output' in result:
                    return result['output']
            
            return str(result) if result else 'No response generated'
            
        except Exception as e:
            logger.error(f"Claude invocation error: {e}")
            return f"AI処理中にエラーが発生しました: {str(e)}"

def validate_token(auth_header: str) -> Optional[Dict]:
    """Validate JWT token from Cognito"""
    try:
        token = auth_header.replace('Bearer ', '')
        
        # In production, you should implement proper JWT validation with Cognito public keys
        # For now, we decode without signature verification but this should be updated
        # TODO: Implement proper Cognito JWT validation with public key verification
        decoded = jwt.decode(token, options={"verify_signature": False})
        
        # Basic token validation checks
        current_time = datetime.utcnow().timestamp()
        if decoded.get('exp', 0) < current_time:
            logger.warning("Token has expired")
            return None
            
        if not decoded.get('sub'):
            logger.warning("Token missing required 'sub' claim")
            return None
            
        return decoded
    except Exception as e:
        logger.error(f"Token validation error: {e}")
        return None

def handler(event, context):
    """Lambda handler for chat agent"""
    logger.info(f"Chat agent event: {json.dumps(event)}")
    
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
        if event.get('httpMethod') == 'OPTIONS':
            return {
                'statusCode': 200,
                'headers': cors_headers,
                'body': ''
            }
        
        # Validate authorization
        auth_header = event.get('headers', {}).get('Authorization') or event.get('headers', {}).get('authorization')
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
        body = json.loads(event.get('body', '{}'))
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
        agent = ChatAgent()
        tools = agent.create_tools()
        
        # Prepare messages for agent
        messages = conversation_history + [{'role': 'user', 'content': message}]
        
        # Get response from agent
        response = agent.invoke_claude(messages, tools)
        
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
        logger.error(f"Chat agent error: {e}")
        return {
            'statusCode': 500,
            'headers': cors_headers,
            'body': json.dumps({'error': 'Internal server error'})
        }