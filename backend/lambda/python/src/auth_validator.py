import json
import os
import logging
import requests
from typing import Dict, Optional, Any
from datetime import datetime
from jose import jwt, JWTError
import boto3

logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Global cache for Cognito public keys
_jwks_cache: Optional[Dict] = None
_cache_timestamp: Optional[float] = None
CACHE_TTL = 3600  # 1 hour

class CognitoTokenValidator:
    def __init__(self):
        self.region = os.environ.get('AWS_REGION', 'ap-northeast-1')
        self.user_pool_id = os.environ.get('COGNITO_USER_POOL_ID')
        self.client_id = os.environ.get('COGNITO_CLIENT_ID')
        self.is_production = os.environ.get('STAGE', 'dev') == 'prod'
        
        if not self.user_pool_id or not self.client_id:
            logger.warning("Cognito configuration not found in environment variables")
    
    def get_cognito_public_keys(self) -> Dict:
        """Get Cognito public keys with caching"""
        global _jwks_cache, _cache_timestamp
        
        current_time = datetime.utcnow().timestamp()
        
        # Check cache validity
        if (_jwks_cache and _cache_timestamp and 
            (current_time - _cache_timestamp) < CACHE_TTL):
            return _jwks_cache
        
        try:
            # Fetch fresh keys from Cognito
            jwks_url = f'https://cognito-idp.{self.region}.amazonaws.com/{self.user_pool_id}/.well-known/jwks.json'
            response = requests.get(jwks_url, timeout=10)
            response.raise_for_status()
            
            jwks = response.json()
            
            # Update cache
            _jwks_cache = jwks
            _cache_timestamp = current_time
            
            logger.info("Successfully fetched Cognito public keys")
            return jwks
            
        except Exception as e:
            logger.error(f"Failed to fetch Cognito public keys: {e}")
            # Return cached keys if available, even if expired
            if _jwks_cache:
                logger.warning("Using cached keys due to fetch error")
                return _jwks_cache
            raise Exception(f"Cannot fetch Cognito public keys: {e}")
    
    def get_public_key(self, token_header: Dict) -> Dict:
        """Get the public key for a specific token"""
        kid = token_header.get('kid')
        if not kid:
            raise Exception("Token header missing 'kid' claim")
        
        jwks = self.get_cognito_public_keys()
        
        # Find the matching key
        for key in jwks.get('keys', []):
            if key.get('kid') == kid:
                return key
        
        raise Exception(f"Public key not found for kid: {kid}")
    
    def validate_token_production(self, token: str) -> Optional[Dict]:
        """Production-grade JWT validation with signature verification"""
        try:
            # Get token header without verification
            header = jwt.get_unverified_header(token)
            
            # Get the public key
            public_key = self.get_public_key(header)
            
            # Expected issuer
            expected_issuer = f'https://cognito-idp.{self.region}.amazonaws.com/{self.user_pool_id}'
            
            # Decode and verify the token
            decoded_token = jwt.decode(
                token,
                public_key,
                algorithms=['RS256'],
                audience=self.client_id,
                issuer=expected_issuer,
                options={
                    'verify_signature': True,
                    'verify_aud': True,
                    'verify_iss': True,
                    'verify_exp': True,
                    'verify_nbf': True,
                    'verify_iat': True,
                    'require': ['exp', 'iat', 'sub', 'aud', 'iss']
                }
            )
            
            # Additional custom validations
            current_time = datetime.utcnow().timestamp()
            
            # Check token type
            token_use = decoded_token.get('token_use')
            if token_use not in ['access', 'id']:
                logger.warning(f"Invalid token_use: {token_use}")
                return None
            
            # Check if token is not expired (extra check)
            exp = decoded_token.get('exp', 0)
            if exp <= current_time:
                logger.warning("Token has expired")
                return None
            
            # Check if token is not used before valid time
            nbf = decoded_token.get('nbf')
            if nbf and nbf > current_time:
                logger.warning("Token not yet valid")
                return None
            
            # Check required claims
            required_claims = ['sub', 'aud', 'iss', 'exp', 'iat']
            for claim in required_claims:
                if claim not in decoded_token:
                    logger.warning(f"Token missing required claim: {claim}")
                    return None
            
            logger.info(f"Token successfully validated for user: {decoded_token.get('sub')}")
            return decoded_token
            
        except JWTError as e:
            logger.error(f"JWT validation error: {e}")
            return None
        except Exception as e:
            logger.error(f"Token validation error: {e}")
            return None
    
    def validate_token_development(self, token: str) -> Optional[Dict]:
        """Development JWT validation without signature verification"""
        try:
            # Decode without signature verification (development only)
            decoded = jwt.decode(token, options={"verify_signature": False})
            
            # Basic token validation checks
            current_time = datetime.utcnow().timestamp()
            if decoded.get('exp', 0) < current_time:
                logger.warning("Token has expired")
                return None
                
            if not decoded.get('sub'):
                logger.warning("Token missing required 'sub' claim")
                return None
            
            logger.info(f"Token validated (dev mode) for user: {decoded.get('sub')}")
            return decoded
            
        except Exception as e:
            logger.error(f"Development token validation error: {e}")
            return None
    
    def validate_token(self, auth_header: str) -> Optional[Dict]:
        """Main token validation method"""
        if not auth_header:
            return None
        
        # Extract token from header
        token = auth_header.replace('Bearer ', '').strip()
        if not token:
            return None
        
        # Use production validation if in production environment
        if self.is_production:
            return self.validate_token_production(token)
        else:
            # Use development validation for dev/staging
            return self.validate_token_development(token)

# Global instance
token_validator = CognitoTokenValidator()

def validate_token(auth_header: str) -> Optional[Dict]:
    """Convenience function for token validation"""
    return token_validator.validate_token(auth_header)

def get_user_groups(decoded_token: Dict) -> list:
    """Extract user groups from token"""
    return decoded_token.get('cognito:groups', [])

def is_admin_user(decoded_token: Dict) -> bool:
    """Check if user has admin privileges"""
    groups = get_user_groups(decoded_token)
    return 'admin' in groups or 'administrators' in groups

def get_user_email(decoded_token: Dict) -> Optional[str]:
    """Extract user email from token"""
    return decoded_token.get('email')

def get_user_id(decoded_token: Dict) -> Optional[str]:
    """Extract user ID from token"""
    return decoded_token.get('sub')

def log_auth_event(decoded_token: Dict, action: str, details: str = ""):
    """Log authentication events for security monitoring"""
    user_id = get_user_id(decoded_token)
    user_email = get_user_email(decoded_token)
    groups = get_user_groups(decoded_token)
    
    logger.info(f"AUTH_EVENT: {action} | User: {user_id} | Email: {user_email} | Groups: {groups} | Details: {details}")