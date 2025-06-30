exports.handler = async (event, context) => {
    console.log('Event:', JSON.stringify(event, null, 2));
    
    try {
        // CORS headers
        const corsHeaders = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,Authorization',
            'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
            'Content-Type': 'application/json'
        };

        // Extract path and method (for HTTP API v2.0)
        const path = event.pathParameters?.proxy || '';
        const method = event.requestContext?.http?.method || event.httpMethod || 'UNKNOWN';

        // CORS preflight
        if (method === 'OPTIONS') {
            return {
                statusCode: 200,
                headers: corsHeaders,
                body: '',
            };
        }
        
        console.log(`Processing ${method} request for path: ${path}`);

        // Simple routing - remove leading/trailing slashes and normalize
        const normalizedPath = path.replace(/^\/+|\/+$/g, '');
        
        if (normalizedPath === 'health' && method === 'GET') {
            return {
                statusCode: 200,
                headers: corsHeaders,
                body: JSON.stringify({
                    status: 'healthy',
                    timestamp: new Date().toISOString(),
                    message: 'API is working!',
                    path: path,
                    method: method
                })
            };
        }

        // Default response for unmatched routes
        return {
            statusCode: 404,
            headers: corsHeaders,
            body: JSON.stringify({
                error: 'Route not found',
                path: path,
                method: method,
                available_routes: [
                    'GET /api/health'
                ]
            })
        };

    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                error: 'Internal server error',
                message: error.message
            })
        };
    }
};