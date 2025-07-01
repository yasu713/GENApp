import { CognitoIdentityProviderClient, AdminGetUserCommand } from '@aws-sdk/client-cognito-identity-provider';
import jwt from 'jsonwebtoken';
import { User } from '../types';

// JWKSクライアント用のインポート（本番環境では必要）
const jwksClient = require('jwks-rsa');

// Cognito JWKS用のクライアント設定
const getJwksClient = (region: string, userPoolId: string) => {
  return jwksClient({
    jwksUri: `https://cognito-idp.${region}.amazonaws.com/${userPoolId}/.well-known/jwks.json`,
    cache: true,
    cacheMaxEntries: 5,
    cacheMaxAge: 600000, // 10分間キャッシュ
  });
};

// 署名キーを取得する関数
const getSigningKey = (client: any, kid: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    client.getSigningKey(kid, (err: any, key: any) => {
      if (err) {
        reject(err);
      } else {
        resolve(key.getPublicKey());
      }
    });
  });
};

export const validateJWT = async (
  authHeader: string,
  cognitoClient: CognitoIdentityProviderClient
): Promise<User | null> => {
  try {
    const token = authHeader.replace('Bearer ', '');
    const region = process.env.AWS_REGION || 'ap-northeast-1';
    const userPoolId = process.env.COGNITO_USER_POOL_ID!;
    const environment = process.env.ENVIRONMENT || 'dev';
    
    // 本番環境では厳密なJWT署名検証を実行
    if (environment === 'prod') {
      // JWTヘッダーからkidを取得
      const header = jwt.decode(token, { complete: true })?.header;
      if (!header || !header.kid) {
        throw new Error('Invalid JWT header');
      }

      // JWKS クライアントで署名キーを取得
      const client = getJwksClient(region, userPoolId);
      const signingKey = await getSigningKey(client, header.kid);

      // JWT署名を検証
      const decoded = jwt.verify(token, signingKey, {
        algorithms: ['RS256'],
        issuer: `https://cognito-idp.${region}.amazonaws.com/${userPoolId}`,
        audience: process.env.COGNITO_USER_POOL_CLIENT_ID,
      }) as any;

      const user: User = {
        sub: decoded.sub,
        email: decoded.email || '',
        'cognito:username': decoded['cognito:username'] || decoded.sub,
        groups: decoded['cognito:groups'] || [],
      };

      return user;
    } else {
      // 開発環境では簡易検証（従来の方法）
      const decoded = jwt.decode(token) as any;
      if (!decoded || !decoded.sub) {
        throw new Error('Invalid token structure');
      }

      // Get user from Cognito to verify token validity
      const getUserCommand = new AdminGetUserCommand({
        UserPoolId: userPoolId,
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
    }
  } catch (error) {
    console.error('JWT validation error:', error);
    return null;
  }
};

export const isAdmin = (user: User): boolean => {
  return user.groups?.includes('admin') || false;
};