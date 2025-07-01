#!/bin/bash
# APIキー設定確認スクリプト

echo "🔍 Anthropic APIキー設定確認"
echo "=============================="

# SSMパラメータの存在確認
echo "1. SSMパラメータ確認..."
if aws ssm get-parameter --name "/genai/dev/anthropic-api-key" --query "Parameter.Name" --output text 2>/dev/null; then
    echo "✅ SSMパラメータが存在します"
    
    # 値の先頭部分のみ表示（セキュリティ考慮）
    KEY_PREFIX=$(aws ssm get-parameter --name "/genai/dev/anthropic-api-key" --with-decryption --query "Parameter.Value" --output text | cut -c1-20)
    echo "🔑 キー先頭: ${KEY_PREFIX}..."
else
    echo "❌ SSMパラメータが見つかりません"
    echo "以下のコマンドで設定してください:"
    echo "aws ssm put-parameter --name '/genai/dev/anthropic-api-key' --value 'sk-ant-api03-YOUR_KEY' --type 'SecureString' --overwrite"
    exit 1
fi

echo ""
echo "2. Python Lambda関数テスト..."
cd /home/ubuntu/GENAI/backend/lambda/python/src

# 簡単なAPIテスト
python3 -c "
import boto3
import os

# SSMからAPIキー取得
ssm = boto3.client('ssm', region_name='ap-northeast-1')
try:
    response = ssm.get_parameter(Name='/genai/dev/anthropic-api-key', WithDecryption=True)
    api_key = response['Parameter']['Value']
    
    if api_key.startswith('sk-ant-api03-'):
        print('✅ APIキー形式が正しいです')
        print(f'🔑 キー先頭: {api_key[:20]}...')
    else:
        print('❌ APIキー形式が正しくありません')
        
except Exception as e:
    print(f'❌ エラー: {e}')
"

echo ""
echo "3. 次のステップ:"
echo "   • フロントエンドでのチャット機能テスト"
echo "   • 本番環境へのAPIキー設定"
echo "   • 本番デプロイの実行"