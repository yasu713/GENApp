#!/bin/bash

# Production Deployment Script for AI Management Assistant
# This script handles secure production deployment with proper validations

set -e

echo "🚀 Starting Production Deployment for AI Management Assistant"
echo "============================================================"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
STAGE="prod"
AWS_REGION="ap-northeast-1"
TERRAFORM_DIR="terraform"
SERVERLESS_DIR="serverless"

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Validation functions
validate_aws_credentials() {
    log_info "Validating AWS credentials..."
    if ! aws sts get-caller-identity >/dev/null 2>&1; then
        log_error "AWS credentials not configured or invalid"
        exit 1
    fi
    log_success "AWS credentials validated"
}

validate_environment() {
    log_info "Validating environment variables..."
    
    required_vars=(
        "AWS_REGION"
    )
    
    for var in "${required_vars[@]}"; do
        if [[ -z "${!var}" ]]; then
            log_error "Required environment variable $var is not set"
            exit 1
        fi
    done
    
    log_success "Environment variables validated"
}

validate_ssm_parameters() {
    log_info "Validating SSM parameters..."
    
    required_params=(
        "/genai/prod/web-search-api-key"
        "/genai/prod/anthropic-api-key"
    )
    
    for param in "${required_params[@]}"; do
        if ! aws ssm get-parameter --name "$param" --region "$AWS_REGION" >/dev/null 2>&1; then
            log_warning "SSM parameter $param not found or not accessible"
            log_warning "Please ensure this parameter is set before production use"
        fi
    done
    
    log_success "SSM parameters validation completed"
}

# Confirmation prompt
confirm_deployment() {
    echo ""
    log_warning "⚠️  PRODUCTION DEPLOYMENT CONFIRMATION ⚠️"
    echo "This will deploy to production environment:"
    echo "  - Stage: $STAGE"
    echo "  - Region: $AWS_REGION"
    echo "  - Terraform: Infrastructure changes"
    echo "  - Serverless: Lambda functions and API Gateway"
    echo ""
    
    read -p "Are you sure you want to proceed? (yes/no): " -r
    if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
        log_info "Deployment cancelled by user"
        exit 0
    fi
}

# Backup function
backup_current_state() {
    log_info "Creating backup of current infrastructure state..."
    
    backup_dir="backups/$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$backup_dir"
    
    # Backup Terraform state
    if [[ -f "$TERRAFORM_DIR/terraform.tfstate" ]]; then
        cp "$TERRAFORM_DIR/terraform.tfstate" "$backup_dir/"
        log_success "Terraform state backed up"
    fi
    
    # Backup Serverless state
    if [[ -d "$SERVERLESS_DIR/.serverless" ]]; then
        cp -r "$SERVERLESS_DIR/.serverless" "$backup_dir/"
        log_success "Serverless state backed up"
    fi
    
    echo "Backup created at: $backup_dir"
}

# Deployment functions
deploy_infrastructure() {
    log_info "Deploying infrastructure with Terraform..."
    
    cd "$TERRAFORM_DIR"
    
    # Initialize Terraform
    terraform init -input=false
    
    # Plan infrastructure changes
    log_info "Planning infrastructure changes..."
    terraform plan -var="stage=$STAGE" -out=tfplan
    
    # Apply infrastructure changes
    log_info "Applying infrastructure changes..."
    terraform apply -input=false tfplan
    
    # Clean up plan file
    rm -f tfplan
    
    cd ..
    log_success "Infrastructure deployment completed"
}

deploy_serverless() {
    log_info "Deploying serverless application..."
    
    cd "$SERVERLESS_DIR"
    
    # Install dependencies
    log_info "Installing Node.js dependencies..."
    npm ci --production
    
    # Deploy with production configuration
    log_info "Deploying Lambda functions and API Gateway..."
    npx serverless deploy \
        --stage "$STAGE" \
        --region "$AWS_REGION" \
        --config "serverless.yml" \
        --verbose
    
    cd ..
    log_success "Serverless deployment completed"
}

# Test deployment
test_deployment() {
    log_info "Running post-deployment tests..."
    
    # Test API Gateway health
    api_url=$(aws cloudformation describe-stacks \
        --stack-name "genai-$STAGE" \
        --region "$AWS_REGION" \
        --query 'Stacks[0].Outputs[?OutputKey==`ApiGatewayRestApiUrl`].OutputValue' \
        --output text 2>/dev/null || echo "")
    
    if [[ -n "$api_url" ]]; then
        log_info "Testing API Gateway endpoint..."
        if curl -s -f "${api_url}/health" >/dev/null; then
            log_success "API Gateway health check passed"
        else
            log_warning "API Gateway health check failed"
        fi
    fi
    
    # Test Lambda functions
    log_info "Testing Lambda functions..."
    
    functions=("genai-$STAGE-api" "genai-$STAGE-chatAgent" "genai-$STAGE-chatStream")
    
    for func in "${functions[@]}"; do
        if aws lambda get-function --function-name "$func" --region "$AWS_REGION" >/dev/null 2>&1; then
            log_success "Lambda function $func is deployed"
        else
            log_warning "Lambda function $func not found"
        fi
    done
}

# Main deployment workflow
main() {
    echo "Starting pre-deployment validations..."
    
    # Pre-deployment validations
    validate_aws_credentials
    validate_environment
    validate_ssm_parameters
    
    # Confirmation
    confirm_deployment
    
    # Create backup
    backup_current_state
    
    echo ""
    log_info "Starting deployment process..."
    
    # Deploy infrastructure
    deploy_infrastructure
    
    # Wait for infrastructure to stabilize
    log_info "Waiting for infrastructure to stabilize..."
    sleep 30
    
    # Deploy serverless application
    deploy_serverless
    
    # Test deployment
    test_deployment
    
    echo ""
    log_success "🎉 Production deployment completed successfully!"
    echo ""
    log_info "Next steps:"
    echo "  1. Update DNS records to point to the new API Gateway"
    echo "  2. Update frontend environment variables with new endpoint URLs"
    echo "  3. Configure monitoring and alerting"
    echo "  4. Run comprehensive integration tests"
    echo ""
    log_warning "Remember to:"
    echo "  - Monitor CloudWatch logs for any issues"
    echo "  - Verify all SSM parameters are properly set"
    echo "  - Test all major user workflows"
    echo ""
}

# Execute main function
main "$@"