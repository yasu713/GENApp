#!/bin/bash
# SSMパラメータ設定スクリプト
# 使用法: ./setup-ssm-parameters.sh [dev|staging|prod]

set -e

ENVIRONMENT=${1:-dev}
REGION=${AWS_REGION:-ap-northeast-1}

echo "🔧 SSMパラメータ設定開始 - 環境: $ENVIRONMENT"

# DuckDuckGo APIキーの設定
echo "📡 Web検索APIキーの設定..."
read -p "DuckDuckGo APIキーを入力してください (なければEnterでスキップ): " DDG_API_KEY

if [ -n "$DDG_API_KEY" ]; then
    aws ssm put-parameter \
        --name "/genai/$ENVIRONMENT/web-search-api-key" \
        --value "$DDG_API_KEY" \
        --type "SecureString" \
        --overwrite \
        --region "$REGION"
    echo "✅ Web検索APIキーを設定しました"
else
    echo "⚠️ Web検索APIキーはスキップされました"
fi

# Anthropic APIキーの設定（オプション）
echo "🤖 Anthropic APIキーの設定..."
read -p "Anthropic APIキーを入力してください (なければEnterでスキップ): " ANTHROPIC_API_KEY

if [ -n "$ANTHROPIC_API_KEY" ]; then
    aws ssm put-parameter \
        --name "/genai/$ENVIRONMENT/anthropic-api-key" \
        --value "$ANTHROPIC_API_KEY" \
        --type "SecureString" \
        --overwrite \
        --region "$REGION"
    echo "✅ Anthropic APIキーを設定しました"
else
    echo "⚠️ Anthropic APIキーはスキップされました"
fi

# 設定確認
echo ""
echo "📋 現在のSSMパラメータ一覧:"
aws ssm get-parameters-by-path \
    --path "/genai/$ENVIRONMENT/" \
    --recursive \
    --region "$REGION" \
    --query "Parameters[*].[Name,Type,LastModifiedDate]" \
    --output table

echo ""
echo "🎉 SSMパラメータ設定完了!"
echo ""
echo "⚠️ 注意事項:"
echo "1. 実際のAPIキーは外部サービスから取得してください"
echo "2. DuckDuckGo Instant Answer API: https://duckduckgo.com/api"
echo "3. Anthropic API: https://console.anthropic.com/"
echo "4. 本番環境では必ず実際のAPIキーを設定してください"