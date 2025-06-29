# Cognito User Pool
resource "aws_cognito_user_pool" "main" {
  name = "${local.name_prefix}-user-pool"

  # Password policy
  password_policy {
    minimum_length    = 8
    require_lowercase = true
    require_numbers   = true
    require_symbols   = true
    require_uppercase = true
  }

  # Username configuration
  username_attributes = ["email"]
  
  # Account recovery
  account_recovery_setting {
    recovery_mechanism {
      name     = "verified_email"
      priority = 1
    }
  }

  # Auto verification
  auto_verified_attributes = ["email"]

  # Email configuration
  email_configuration {
    email_sending_account = "COGNITO_DEFAULT"
  }

  # User attributes
  schema {
    attribute_data_type = "String"
    name               = "email"
    required           = true
    mutable            = true
  }

  schema {
    attribute_data_type = "String"
    name               = "name"
    required           = false
    mutable            = true
  }

  schema {
    attribute_data_type = "String"
    name               = "family_name"
    required           = false
    mutable            = true
  }

  schema {
    attribute_data_type = "String"
    name               = "given_name" 
    required           = false
    mutable            = true
  }

  # Lambda triggers (optional)
  # lambda_config {
  #   pre_sign_up = aws_lambda_function.cognito_triggers.arn
  # }

  tags = {
    Name = "${local.name_prefix}-user-pool"
  }
}

# Cognito User Pool Client
resource "aws_cognito_user_pool_client" "main" {
  name                          = "${local.name_prefix}-client"
  user_pool_id                  = aws_cognito_user_pool.main.id
  generate_secret              = false
  prevent_user_existence_errors = "ENABLED"

  # Token validity
  access_token_validity  = 1    # 1 hour
  id_token_validity     = 1    # 1 hour
  refresh_token_validity = 30   # 30 days

  token_validity_units {
    access_token  = "hours"
    id_token     = "hours"
    refresh_token = "days"
  }

  # Allowed OAuth flows
  allowed_oauth_flows = ["code", "implicit"]
  allowed_oauth_flows_user_pool_client = true
  allowed_oauth_scopes = ["email", "openid", "profile", "aws.cognito.signin.user.admin"]

  # Callback URLs for development and production
  callback_urls = [
    "http://localhost:3000/auth/callback",
    "https://*.amplifyapp.com/auth/callback"
  ]

  logout_urls = [
    "http://localhost:3000/auth/logout",
    "https://*.amplifyapp.com/auth/logout"
  ]

  # Supported identity providers
  supported_identity_providers = ["COGNITO"]

  # Read and write attributes
  read_attributes = [
    "email",
    "email_verified",
    "name",
    "family_name",
    "given_name"
  ]

  write_attributes = [
    "email",
    "name", 
    "family_name",
    "given_name"
  ]

  explicit_auth_flows = [
    "ALLOW_USER_SRP_AUTH",
    "ALLOW_USER_PASSWORD_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH"
  ]
}

# Cognito User Pool Domain
resource "aws_cognito_user_pool_domain" "main" {
  domain       = "${local.name_prefix}-${random_string.domain_suffix.result}"
  user_pool_id = aws_cognito_user_pool.main.id
}

resource "random_string" "domain_suffix" {
  length  = 8
  special = false
  upper   = false
}

# Admin group
resource "aws_cognito_user_pool_group" "admin" {
  name         = "admin"
  user_pool_id = aws_cognito_user_pool.main.id
  description  = "Admin users with elevated privileges"
  precedence   = 1
}

# Regular users group
resource "aws_cognito_user_pool_group" "users" {
  name         = "users"
  user_pool_id = aws_cognito_user_pool.main.id
  description  = "Regular users"
  precedence   = 10
}