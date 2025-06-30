import json

def handler(event, context):
    """Simple test handler"""
    print(f"Test event: {json.dumps(event)}")
    
    try:
        # Extract message from event (HTTP API v2.0)
        body = event.get('body', '{}')
        print(f"Raw body: {body}")
        
        if isinstance(body, str):
            try:
                body = json.loads(body)
            except json.JSONDecodeError as e:
                print(f"JSON decode error: {e}")
                body = {}
        elif body is None:
            body = {}
            
        # Also check if body is already parsed
        if isinstance(body, dict):
            message = body.get('message', 'No message provided')
        else:
            message = 'Unable to parse message'
        
        # Simple response without external dependencies
        response = {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,Authorization',
                'Access-Control-Allow-Methods': 'POST,OPTIONS'
            },
            'body': json.dumps({
                'response': f"Echo: {message}",
                'timestamp': context.aws_request_id,
                'message': 'Simple test function working!',
                'event_info': {
                    'method': event.get('httpMethod', event.get('requestContext', {}).get('http', {}).get('method', 'UNKNOWN')),
                    'path': event.get('path', event.get('requestContext', {}).get('http', {}).get('path', 'UNKNOWN'))
                }
            })
        }
        
        print(f"Response: {response}")
        return response
        
    except Exception as e:
        print(f"Error: {e}")
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': str(e)})
        }