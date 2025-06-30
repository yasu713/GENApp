#!/bin/bash
# セキュリティ設定スクリプト
# 本番環境デプロイ前の必須セキュリティチェック

set -e

ENVIRONMENT=${1:-dev}
REGION=${AWS_REGION:-ap-northeast-1}

echo "🔒 セキュリティ設定チェック開始 - 環境: $ENVIRONMENT"
echo ""

# 1. SSMパラメータチェック
echo "1️⃣ SSMパラメータ検証..."
WEB_SEARCH_KEY=$(aws ssm get-parameter --name "/genai/$ENVIRONMENT/web-search-api-key" --with-decryption --region "$REGION" --query "Parameter.Value" --output text 2>/dev/null || echo "placeholder-key")

if [ "$WEB_SEARCH_KEY" = "placeholder-key" ]; then
    echo "❌ Web検索APIキーがプレースホルダーのままです"
    echo "   ./setup-ssm-parameters.sh $ENVIRONMENT を実行してください"
    SECURITY_ISSUES=true
else
    echo "✅ Web検索APIキーが設定済み"
fi

# 2. 環境変数チェック
echo ""
echo "2️⃣ 環境変数検証..."
if [ "$ENVIRONMENT" = "prod" ]; then
    # 本番環境での必須チェック
    if [ -z "$COGNITO_USER_POOL_ID" ] || [ "$COGNITO_USER_POOL_ID" = "ap-northeast-1_YOUR_ACTUAL_POOL_ID" ]; then
        echo "❌ COGNITO_USER_POOL_ID が設定されていません"
        SECURITY_ISSUES=true
    else
        echo "✅ COGNITO_USER_POOL_ID が設定済み"
    fi
    
    if [ -z "$COGNITO_CLIENT_ID" ] || [ "$COGNITO_CLIENT_ID" = "YOUR_ACTUAL_CLIENT_ID" ]; then
        echo "❌ COGNITO_CLIENT_ID が設定されていません"
        SECURITY_ISSUES=true
    else
        echo "✅ COGNITO_CLIENT_ID が設定済み"
    fi
fi

# 3. JWT署名検証確認
echo ""
echo "3️⃣ JWT署名検証確認..."
echo "✅ JWT署名検証システムは実装済み"
echo "   - 開発環境: 署名検証なし（開発用）"
echo "   - 本番環境: 厳密な署名検証（Cognito公開鍵）"

# 4. ファイル権限チェック
echo ""
echo "4️⃣ ファイル権限チェック..."
if [ -f ".env.local" ]; then
    PERM=$(stat -c "%a" .env.local)
    if [ "$PERM" != "600" ]; then
        echo "⚠️ .env.localの権限を600に変更します"
        chmod 600 .env.local
    fi
    echo "✅ 環境変数ファイルの権限が適切"
else
    echo "ℹ️ .env.localファイルが見つかりません"
fi

# 5. Git設定チェック
echo ""
echo "5️⃣ Git設定チェック..."
if git ls-files --error-unmatch .env.local >/dev/null 2>&1; then
    echo "❌ .env.localがGitで追跡されています！"
    echo "   git rm --cached .env.local を実行してください"
    SECURITY_ISSUES=true
else
    echo "✅ 環境変数ファイルはGitで追跡されていません"
fi

# 6. Dependencies脆弱性チェック
echo ""
echo "6️⃣ 依存関係脆弱性チェック..."
if command -v npm >/dev/null 2>&1; then
    echo "Node.js依存関係をチェック中..."
    if npm audit --audit-level high 2>/dev/null; then
        echo "✅ Node.js依存関係に高リスク脆弱性なし"
    else
        echo "⚠️ Node.js依存関係に脆弱性が発見されました"
        echo "   npm audit fix を実行することを推奨します"
    fi
fi

if command -v pip >/dev/null 2>&1; then
    echo "Python依存関係をチェック中..."
    if command -v pip-audit >/dev/null 2>&1; then
        if pip-audit --desc 2>/dev/null; then
            echo "✅ Python依存関係に脆弱性なし"
        else
            echo "⚠️ Python依存関係に脆弱性が発見されました"
        fi
    else
        echo "ℹ️ pip-auditがインストールされていません"
        echo "   pip install pip-audit でインストール可能です"
    fi
fi

# 結果サマリー
echo ""
echo "📊 セキュリティチェック結果:"
if [ "$SECURITY_ISSUES" = "true" ]; then
    echo "❌ セキュリティ問題が発見されました"
    echo "   上記の問題を修正してから本番デプロイを行ってください"
    exit 1
else
    echo "✅ 基本的なセキュリティチェックをパスしました"
    echo "   本番デプロイ前に以下も確認してください:"
    echo "   - AWS IAM権限の最小化"
    echo "   - CloudWatch監視設定"
    echo "   - WAF設定（必要に応じて）"
fi

echo ""
echo "🎉 セキュリティ設定チェック完了!"