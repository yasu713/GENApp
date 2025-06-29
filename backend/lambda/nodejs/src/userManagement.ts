import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { 
  CognitoIdentityProviderClient, 
  ListUsersCommand,
  AdminUpdateUserAttributesCommand,
  AdminDisableUserCommand,
  AdminEnableUserCommand,
  AdminDeleteUserCommand
} from '@aws-sdk/client-cognito-identity-provider';
import { corsHeaders, errorResponse, successResponse } from './utils/response';
import { validateJWT, isAdmin } from './utils/auth';

const cognitoClient = new CognitoIdentityProviderClient({ region: process.env.REGION });

export const handler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  console.log('User Management Event:', JSON.stringify(event, null, 2));
  
  try {
    // CORS preflight
    if (event.httpMethod === 'OPTIONS') {
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: '',
      };
    }

    // Validate JWT token
    const authHeader = event.headers.Authorization || event.headers.authorization;
    if (!authHeader) {
      return errorResponse(401, 'Missing authorization header');
    }

    const user = await validateJWT(authHeader, cognitoClient);
    if (!user) {
      return errorResponse(401, 'Invalid token');
    }

    // Check admin privileges
    if (!isAdmin(user)) {
      return errorResponse(403, 'Admin privileges required');
    }

    const method = event.httpMethod;
    const userId = event.pathParameters?.userId;

    switch (method) {
      case 'GET':
        return await listUsers();
      
      case 'PUT':
        if (!userId) {
          return errorResponse(400, 'User ID is required');
        }
        return await updateUser(userId, JSON.parse(event.body || '{}'));
      
      case 'DELETE':
        if (!userId) {
          return errorResponse(400, 'User ID is required');
        }
        return await deleteUser(userId);
      
      default:
        return errorResponse(405, 'Method not allowed');
    }
    
  } catch (error) {
    console.error('User management error:', error);
    return errorResponse(500, 'Internal server error');
  }
};

const listUsers = async (): Promise<APIGatewayProxyResult> => {
  try {
    const command = new ListUsersCommand({
      UserPoolId: process.env.COGNITO_USER_POOL_ID!,
      Limit: 60,
    });

    const response = await cognitoClient.send(command);
    
    const users = response.Users?.map(user => {
      const attributes = user.Attributes || [];
      const getAttributeValue = (name: string) => 
        attributes.find(attr => attr.Name === name)?.Value || '';

      return {
        username: user.Username,
        email: getAttributeValue('email'),
        name: getAttributeValue('name'),
        status: user.UserStatus,
        enabled: user.Enabled,
        createdAt: user.UserCreateDate?.toISOString(),
        lastModified: user.UserLastModifiedDate?.toISOString(),
      };
    }) || [];

    return successResponse({ users });
    
  } catch (error) {
    console.error('List users error:', error);
    return errorResponse(500, 'Failed to list users');
  }
};

const updateUser = async (
  userId: string, 
  updates: any
): Promise<APIGatewayProxyResult> => {
  try {
    const userAttributes = [];
    
    if (updates.name) {
      userAttributes.push({
        Name: 'name',
        Value: updates.name
      });
    }
    
    if (updates.email) {
      userAttributes.push({
        Name: 'email',
        Value: updates.email
      });
    }

    if (userAttributes.length > 0) {
      const updateCommand = new AdminUpdateUserAttributesCommand({
        UserPoolId: process.env.COGNITO_USER_POOL_ID!,
        Username: userId,
        UserAttributes: userAttributes,
      });
      
      await cognitoClient.send(updateCommand);
    }

    // Handle enable/disable
    if (updates.enabled !== undefined) {
      if (updates.enabled) {
        const enableCommand = new AdminEnableUserCommand({
          UserPoolId: process.env.COGNITO_USER_POOL_ID!,
          Username: userId,
        });
        await cognitoClient.send(enableCommand);
      } else {
        const disableCommand = new AdminDisableUserCommand({
          UserPoolId: process.env.COGNITO_USER_POOL_ID!,
          Username: userId,
        });
        await cognitoClient.send(disableCommand);
      }
    }

    return successResponse({ message: 'User updated successfully' });
    
  } catch (error) {
    console.error('Update user error:', error);
    return errorResponse(500, 'Failed to update user');
  }
};

const deleteUser = async (userId: string): Promise<APIGatewayProxyResult> => {
  try {
    const deleteCommand = new AdminDeleteUserCommand({
      UserPoolId: process.env.COGNITO_USER_POOL_ID!,
      Username: userId,
    });
    
    await cognitoClient.send(deleteCommand);
    
    return successResponse({ message: 'User deleted successfully' });
    
  } catch (error) {
    console.error('Delete user error:', error);
    return errorResponse(500, 'Failed to delete user');
  }
};