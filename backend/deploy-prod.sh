#!/bin/bash
# 本番環境デプロイスクリプト
# 使用法: ./deploy-prod.sh

set -e

echo "🚀 本番環境デプロイ開始"
echo "========================"

# 環境変数の確認
if [ -z "$AWS_REGION" ]; then
    export AWS_REGION=ap-northeast-1
fi

if [ -z "$AWS_PROFILE" ]; then
    echo "⚠️ AWS_PROFILEが設定されていません。デフォルトプロファイルを使用します。"
fi

echo "AWS_REGION: $AWS_REGION"
echo "AWS_PROFILE: ${AWS_PROFILE:-default}"

# 前提条件チェック
echo ""
echo "📋 前提条件チェック..."

# AWSクレデンシャル確認
aws sts get-caller-identity > /dev/null
if [ $? -ne 0 ]; then
    echo "❌ AWS認証に失敗しました。クレデンシャルを確認してください。"
    exit 1
fi
echo "✅ AWS認証確認"

# Terraformチェック
if ! command -v terraform &> /dev/null; then
    echo "❌ Terraformがインストールされていません。"
    exit 1
fi
echo "✅ Terraform確認"

# Serverless Frameworkチェック
if ! command -v serverless &> /dev/null && ! command -v npx &> /dev/null; then
    echo "❌ Serverless Frameworkがインストールされていません。"
    exit 1
fi
echo "✅ Serverless Framework確認"

# Step 1: Terraformインフラデプロイ
echo ""
echo "🏗️ Step 1: Terraformインフラデプロイ"
cd terraform

echo "Terraform初期化..."
terraform init

echo "本番環境プラン作成..."
terraform plan -var-file=terraform.prod.tfvars -out=tfplan-prod

echo "⚠️ 注意: 実際のデプロイではSSMパラメータに実際のAPIキーを設定してください"
echo "続行しますか? (y/N)"
read -r response

if [[ "$response" != "y" && "$response" != "Y" ]]; then
    echo "デプロイをキャンセルしました。"
    exit 0
fi

echo "Terraformデプロイ実行..."
terraform apply tfplan-prod -auto-approve

# Terraform出力値を取得
echo "Terraform出力値を取得中..."
COGNITO_USER_POOL_ID=$(terraform output -raw cognito_user_pool_id)
COGNITO_CLIENT_ID=$(terraform output -raw cognito_user_pool_client_id)
S3_BUCKET_NAME=$(terraform output -raw s3_bucket_name)
KNOWLEDGE_BASE_ID=$(terraform output -raw knowledge_base_id 2>/dev/null || echo "")

# SSMパラメータとして保存
echo "出力値をSSMパラメータに保存..."
aws ssm put-parameter --name "/genai/prod/cognito-user-pool-id" --value "$COGNITO_USER_POOL_ID" --type "String" --overwrite --region "$AWS_REGION"
aws ssm put-parameter --name "/genai/prod/cognito-client-id" --value "$COGNITO_CLIENT_ID" --type "String" --overwrite --region "$AWS_REGION"
aws ssm put-parameter --name "/genai/prod/s3-bucket-name" --value "$S3_BUCKET_NAME" --type "String" --overwrite --region "$AWS_REGION"

if [ -n "$KNOWLEDGE_BASE_ID" ]; then
    aws ssm put-parameter --name "/genai/prod/knowledge-base-id" --value "$KNOWLEDGE_BASE_ID" --type "String" --overwrite --region "$AWS_REGION"
fi

cd ..

# Step 2: Node.js Lambdaビルド
echo ""
echo "🔨 Step 2: Node.js Lambdaビルド"
cd lambda/nodejs

echo "依存関係インストール..."
npm ci --production

echo "TypeScriptビルド..."
npm run build

cd ../..

# Step 3: Python Lambda準備
echo ""
echo "🐍 Step 3: Python Lambda準備"
cd lambda/python

echo "Python依存関係確認..."
if [ -f "requirements.txt" ]; then
    echo "依存関係を確認中..."
    cat requirements.txt
fi

cd ../..

# Step 4: Serverless Framework デプロイ
echo ""
echo "⚡ Step 4: Serverless Framework デプロイ"
cd serverless

echo "依存関係インストール..."
npm ci

echo "本番環境デプロイ実行..."
npx serverless deploy --config serverless.prod.yml --stage prod

cd ..

# Step 5: 設定確認
echo ""
echo "🔍 Step 5: デプロイ後確認"

echo "API Gateway エンドポイント:"
aws apigatewayv2 get-apis --region "$AWS_REGION" --query "Items[?Name=='genai-management-assistant-prod'].ApiEndpoint" --output text

echo "Lambda関数一覧:"
aws lambda list-functions --region "$AWS_REGION" --query "Functions[?starts_with(FunctionName, 'genai-management-assistant-prod')].FunctionName" --output table

echo ""
echo "🎉 本番環境デプロイ完了!"
echo ""
echo "📋 次のステップ:"
echo "1. フロントエンドの環境変数を更新"
echo "2. Amplifyでフロントエンドをデプロイ"
echo "3. エンドツーエンドテストの実行"
echo "4. 監視・アラートの設定"
echo ""
echo "⚠️ 重要: 実際のAPIキーを設定してください"
echo "aws ssm put-parameter --name '/genai/prod/anthropic-api-key' --value 'sk-ant-...' --type 'SecureString' --overwrite"
echo "aws ssm put-parameter --name '/genai/prod/web-search-api-key' --value 'your-key' --type 'SecureString' --overwrite"