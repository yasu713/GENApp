import { Amplify } from 'aws-amplify';

const amplifyConfig = {
  Auth: {
    Cognito: {
      userPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID || '',
      userPoolClientId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_CLIENT_ID || '',
      region: process.env.NEXT_PUBLIC_AWS_REGION || 'ap-northeast-1',
      signUpVerificationMethod: 'code' as const,
      loginWith: {
        email: true,
        username: false,
      },
      passwordFormat: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireNumbers: true,
        requireSpecialCharacters: true,
      },
    },
  },
  API: {
    REST: {
      GenAIAPI: {
        endpoint: process.env.NEXT_PUBLIC_API_GATEWAY_URL || '',
        region: process.env.NEXT_PUBLIC_AWS_REGION || 'ap-northeast-1',
      },
    },
  },
  Storage: {
    S3: {
      bucket: process.env.NEXT_PUBLIC_S3_BUCKET || '',
      region: process.env.NEXT_PUBLIC_AWS_REGION || 'ap-northeast-1',
    },
  },
};

Amplify.configure(amplifyConfig);

export default amplifyConfig;