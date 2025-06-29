import json
import os
import boto3
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime
from langchain.agents import AgentExecutor
from langchain.tools import Tool
from langchain_community.tools import DuckDuckGoSearchRun
from langchain.schema import HumanMessage, AIMessage
from langgraph.prebuilt import ReActAgent
from anthropic import AnthropicBedrock
import jwt

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# AWS clients
bedrock_client = boto3.client('bedrock-runtime')
s3_client = boto3.client('s3')
ssm_client = boto3.client('ssm')
knowledge_base_client = boto3.client('bedrock-agent-runtime')

# Initialize Anthropic Bedrock client
anthropic_client = AnthropicBedrock()

class ChatAgent:
    def __init__(self):
        self.model_id = "anthropic.claude-3-5-sonnet-20240620-v1:0"
        self.search_tool = DuckDuckGoSearchRun()
        self.knowledge_base_id = os.environ.get('KNOWLEDGE_BASE_ID')
        
    def create_tools(self) -> List[Tool]:
        """Create tools for the ReAct agent"""
        tools = [
            Tool(
                name="web_search",
                description="Search the web for current information. Use this when you need up-to-date facts, news, or information not in your knowledge base.",
                func=self._web_search
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
    
    def invoke_claude(self, messages: List[Dict], tools: List[Tool]) -> str:
        """Invoke Claude 3.5 Sonnet via Bedrock"""
        try:
            # Format messages for Claude
            formatted_messages = []
            for msg in messages:
                if msg['role'] == 'user':
                    formatted_messages.append(HumanMessage(content=msg['content']))
                elif msg['role'] == 'assistant':
                    formatted_messages.append(AIMessage(content=msg['content']))
            
            # Create ReAct agent with tools
            agent = ReActAgent(
                model=anthropic_client,
                tools=tools
            )
            
            # Execute agent
            result = agent.invoke({
                'messages': formatted_messages
            })
            
            return result.get('output', 'No response generated')
            
        except Exception as e:
            logger.error(f"Claude invocation error: {e}")
            return f"AI処理中にエラーが発生しました: {str(e)}"

def validate_token(auth_header: str) -> Optional[Dict]:
    """Validate JWT token from Cognito"""
    try:
        token = auth_header.replace('Bearer ', '')
        # For production, implement proper JWT validation with Cognito public keys
        decoded = jwt.decode(token, options={"verify_signature": False})
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