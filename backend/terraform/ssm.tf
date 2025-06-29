# SSM Parameters for secrets and configuration
resource "aws_ssm_parameter" "web_search_api_key" {
  name  = "/genai/${var.environment}/web-search-api-key"
  type  = "SecureString"
  value = "placeholder-key"
  
  description = "API key for web search service"
  
  tags = {
    Name = "${local.name_prefix}-web-search-api-key"
  }

  lifecycle {
    ignore_changes = [value]
  }
}

resource "aws_ssm_parameter" "anthropic_api_key" {
  name  = "/genai/${var.environment}/anthropic-api-key" 
  type  = "SecureString"
  value = "placeholder-key"
  
  description = "Anthropic API key for Claude integration"
  
  tags = {
    Name = "${local.name_prefix}-anthropic-api-key"
  }

  lifecycle {
    ignore_changes = [value]
  }
}

resource "aws_ssm_parameter" "cors_origins" {
  name  = "/genai/${var.environment}/cors-origins"
  type  = "String"
  value = "http://localhost:3000,https://*.amplifyapp.com"
  
  description = "Allowed CORS origins"
  
  tags = {
    Name = "${local.name_prefix}-cors-origins"
  }
}

resource "aws_ssm_parameter" "max_file_size" {
  name  = "/genai/${var.environment}/max-file-size"
  type  = "String"
  value = "10485760"  # 10MB in bytes
  
  description = "Maximum file upload size in bytes"
  
  tags = {
    Name = "${local.name_prefix}-max-file-size"
  }
}

resource "aws_ssm_parameter" "session_timeout" {
  name  = "/genai/${var.environment}/session-timeout"
  type  = "String"
  value = "3600"  # 1 hour in seconds
  
  description = "Session timeout in seconds"
  
  tags = {
    Name = "${local.name_prefix}-session-timeout"
  }
}