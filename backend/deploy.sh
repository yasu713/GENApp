#!/bin/bash

# Deployment script for GENAI Management Assistant Backend
# This script deploys the infrastructure and application using Terraform and Serverless Framework

set -e

# Configuration
ENVIRONMENT=${1:-dev}
AWS_REGION=${2:-ap-northeast-1}
PROJECT_NAME="genai-management-assistant"

echo "🚀 Starting deployment for environment: $ENVIRONMENT"
echo "📍 AWS Region: $AWS_REGION"
echo "📋 Project: $PROJECT_NAME"
echo ""

# Check prerequisites
echo "🔍 Checking prerequisites..."

# Check if AWS CLI is installed and configured
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI is not installed. Please install it first."
    exit 1
fi

# Check if Terraform is installed
if ! command -v terraform &> /dev/null; then
    echo "❌ Terraform is not installed. Please install it first."
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install it first."
    exit 1
fi

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install it first."
    exit 1
fi

# Check AWS credentials
if ! aws sts get-caller-identity &> /dev/null; then
    echo "❌ AWS credentials not configured. Please run 'aws configure' first."
    exit 1
fi

echo "✅ Prerequisites check passed"
echo ""

# Step 1: Deploy Infrastructure with Terraform
echo "🏗️  Step 1: Deploying infrastructure with Terraform..."
cd terraform

# Initialize Terraform
echo "📦 Initializing Terraform..."
terraform init

# Plan deployment
echo "📋 Planning Terraform deployment..."
terraform plan \
  -var="environment=$ENVIRONMENT" \
  -var="aws_region=$AWS_REGION" \
  -var="project_name=$PROJECT_NAME" \
  -out=tfplan

# Apply deployment
echo "🚀 Applying Terraform deployment..."
terraform apply tfplan

# Get outputs
echo "📤 Getting Terraform outputs..."
COGNITO_USER_POOL_ID=$(terraform output -raw cognito_user_pool_id)
COGNITO_CLIENT_ID=$(terraform output -raw cognito_client_id)
S3_BUCKET_NAME=$(terraform output -raw s3_bucket_name)
KNOWLEDGE_BASE_ID=$(terraform output -raw knowledge_base_id)

echo "✅ Infrastructure deployed successfully"
echo "   - Cognito User Pool ID: $COGNITO_USER_POOL_ID"
echo "   - Cognito Client ID: $COGNITO_CLIENT_ID"
echo "   - S3 Bucket: $S3_BUCKET_NAME"
echo "   - Knowledge Base ID: $KNOWLEDGE_BASE_ID"
echo ""

cd ..

# Step 2: Install dependencies
echo "📦 Step 2: Installing dependencies..."

# Install Serverless Framework dependencies
echo "📦 Installing Serverless Framework dependencies..."
cd serverless
npm install
cd ..

# Install Node.js Lambda dependencies
echo "📦 Installing Node.js Lambda dependencies..."
cd lambda/nodejs
npm install
npm run build
cd ../..

# Install Python Lambda dependencies (will be handled by Serverless Framework)
echo "📦 Python dependencies will be handled by Serverless Framework"
echo "✅ Dependencies installed successfully"
echo ""

# Step 3: Deploy Application with Serverless Framework
echo "🚀 Step 3: Deploying application with Serverless Framework..."
cd serverless

# Deploy to specified environment
echo "🚀 Deploying Serverless application..."
npx serverless deploy --stage $ENVIRONMENT --region $AWS_REGION

echo "✅ Application deployed successfully"
echo ""

cd ..

# Step 4: Post-deployment setup
echo "🔧 Step 4: Post-deployment setup..."

# Update SSM parameters with actual values (if needed)
echo "📝 Updating SSM parameters..."
echo "⚠️  Please update the following SSM parameters manually with actual values:"
echo "   - /genai/$ENVIRONMENT/web-search-api-key"
echo "   - /genai/$ENVIRONMENT/anthropic-api-key"
echo ""

# Final summary
echo "🎉 Deployment completed successfully!"
echo ""
echo "📋 Summary:"
echo "   Environment: $ENVIRONMENT"
echo "   AWS Region: $AWS_REGION"
echo "   Cognito User Pool: $COGNITO_USER_POOL_ID"
echo "   S3 Bucket: $S3_BUCKET_NAME"
echo "   Knowledge Base: $KNOWLEDGE_BASE_ID"
echo ""
echo "🔗 Next steps:"
echo "   1. Update SSM parameters with actual API keys"
echo "   2. Create users in Cognito User Pool"
echo "   3. Upload documents to S3 for knowledge base"
echo "   4. Test the API endpoints"
echo ""
echo "📖 For more information, see the README.md file"