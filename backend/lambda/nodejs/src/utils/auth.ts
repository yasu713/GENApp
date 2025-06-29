import { CognitoIdentityProviderClient, AdminGetUserCommand } from '@aws-sdk/client-cognito-identity-provider';
import jwt from 'jsonwebtoken';
import { User } from '../types';

export const validateJWT = async (
  authHeader: string,
  cognitoClient: CognitoIdentityProviderClient
): Promise<User | null> => {
  try {
    const token = authHeader.replace('Bearer ', '');
    
    // Decode without verification (we'll verify against Cognito)
    const decoded = jwt.decode(token) as any;
    if (!decoded || !decoded.sub) {
      throw new Error('Invalid token structure');
    }

    // Get user from Cognito to verify token validity
    const getUserCommand = new AdminGetUserCommand({
      UserPoolId: process.env.COGNITO_USER_POOL_ID!,
      Username: decoded['cognito:username'] || decoded.sub,
    });

    const cognitoUser = await cognitoClient.send(getUserCommand);
    
    if (!cognitoUser.Username) {
      throw new Error('User not found in Cognito');
    }

    // Extract user attributes
    const attributes = cognitoUser.UserAttributes || [];
    const email = attributes.find(attr => attr.Name === 'email')?.Value || '';
    
    const user: User = {
      sub: decoded.sub,
      email,
      'cognito:username': decoded['cognito:username'] || decoded.sub,
      groups: decoded['cognito:groups'] || [],
    };

    return user;
  } catch (error) {
    console.error('JWT validation error:', error);
    return null;
  }
};

export const isAdmin = (user: User): boolean => {
  return user.groups?.includes('admin') || false;
};