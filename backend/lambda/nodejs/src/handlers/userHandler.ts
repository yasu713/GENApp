import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { CognitoIdentityProviderClient, AdminGetUserCommand } from '@aws-sdk/client-cognito-identity-provider';
import { User } from '../types';
import { successResponse, errorResponse } from '../utils/response';

export const handleUserProfile = async (
  event: APIGatewayProxyEvent,
  user: User,
  cognitoClient: CognitoIdentityProviderClient
): Promise<APIGatewayProxyResult> => {
  try {
    // Get detailed user information from Cognito
    const getUserCommand = new AdminGetUserCommand({
      UserPoolId: process.env.COGNITO_USER_POOL_ID!,
      Username: user['cognito:username'],
    });

    const cognitoUser = await cognitoClient.send(getUserCommand);
    
    // Extract user attributes
    const attributes = cognitoUser.UserAttributes || [];
    const getAttributeValue = (name: string) => 
      attributes.find(attr => attr.Name === name)?.Value || '';

    const userProfile = {
      sub: user.sub,
      username: user['cognito:username'],
      email: getAttributeValue('email'),
      emailVerified: getAttributeValue('email_verified') === 'true',
      name: getAttributeValue('name'),
      familyName: getAttributeValue('family_name'),
      givenName: getAttributeValue('given_name'),
      groups: user.groups || [],
      isAdmin: user.groups?.includes('admin') || false,
      userStatus: cognitoUser.UserStatus,
      enabled: cognitoUser.Enabled,
      createdAt: cognitoUser.UserCreateDate?.toISOString(),
      lastModified: cognitoUser.UserLastModifiedDate?.toISOString(),
    };

    console.log(`User profile requested: ${user.sub}`);
    
    return successResponse(userProfile);
    
  } catch (error) {
    console.error('User profile handler error:', error);
    return errorResponse(500, 'Failed to get user profile');
  }
};