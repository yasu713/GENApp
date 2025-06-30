#!/bin/bash
# セキュリティテストスクリプト
# API エンドポイントとセキュリティ設定をテスト

set -e

API_URL=${1:-"http://localhost:3000"}
ENVIRONMENT=${2:-dev}

echo "🔒 セキュリティテスト開始"
echo "API URL: $API_URL"
echo "環境: $ENVIRONMENT"
echo ""

# 1. CORS設定テスト
echo "1️⃣ CORS設定テスト..."
if command -v curl >/dev/null 2>&1; then
    echo "OPTIONS request test:"
    curl -I -X OPTIONS \
        -H "Origin: https://malicious-site.com" \
        -H "Access-Control-Request-Method: POST" \
        -H "Access-Control-Request-Headers: authorization" \
        "$API_URL/api/chat" 2>/dev/null | grep -i "access-control" || echo "No CORS headers found"
    echo ""
else
    echo "⚠️ curl not found - skipping CORS test"
fi

# 2. セキュリティヘッダーテスト
echo "2️⃣ セキュリティヘッダーテスト..."
if command -v curl >/dev/null 2>&1; then
    echo "Security headers check:"
    curl -I "$API_URL" 2>/dev/null | grep -i "x-frame-options\|x-content-type-options\|x-xss-protection\|strict-transport-security\|content-security-policy" || echo "Some security headers missing"
    echo ""
fi

# 3. 認証なしアクセステスト
echo "3️⃣ 認証なしアクセステスト..."
if command -v curl >/dev/null 2>&1; then
    echo "Unauthorized request test:"
    RESPONSE=$(curl -s -w "%{http_code}" -o /dev/null "$API_URL/api/chat" -X POST)
    if [ "$RESPONSE" = "401" ] || [ "$RESPONSE" = "403" ]; then
        echo "✅ 認証なしアクセスは正しく拒否されました (HTTP $RESPONSE)"
    else
        echo "❌ 認証なしアクセスが許可されています (HTTP $RESPONSE)"
    fi
    echo ""
fi

# 4. 不正なトークンテスト
echo "4️⃣ 不正なトークンテスト..."
if command -v curl >/dev/null 2>&1; then
    echo "Invalid token test:"
    RESPONSE=$(curl -s -w "%{http_code}" -o /dev/null \
        -H "Authorization: Bearer invalid-token-12345" \
        "$API_URL/api/chat" -X POST)
    if [ "$RESPONSE" = "401" ] || [ "$RESPONSE" = "403" ]; then
        echo "✅ 不正トークンは正しく拒否されました (HTTP $RESPONSE)"
    else
        echo "❌ 不正トークンが受け入れられています (HTTP $RESPONSE)"
    fi
    echo ""
fi

# 5. ファイルアップロード制限テスト
echo "5️⃣ ファイルアップロード制限テスト..."
if command -v curl >/dev/null 2>&1; then
    echo "Large file upload test:"
    # 大きなファイルをシミュレート（実際には小さなファイルでテスト）
    RESPONSE=$(curl -s -w "%{http_code}" -o /dev/null \
        -H "Authorization: Bearer invalid-token" \
        -F "file=@/dev/null" \
        "$API_URL/api/upload" -X POST)
    echo "Upload response: HTTP $RESPONSE"
    echo ""
fi

# 6. SQLインジェクション・XSSテスト
echo "6️⃣ インジェクション攻撃テスト..."
if command -v curl >/dev/null 2>&1; then
    echo "SQL injection test:"
    INJECTION_PAYLOAD="'; DROP TABLE users; --"
    curl -s -X POST \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer invalid-token" \
        -d "{\"message\":\"$INJECTION_PAYLOAD\"}" \
        "$API_URL/api/chat" > /dev/null
    echo "SQL injection payload sent"
    
    echo "XSS test:"
    XSS_PAYLOAD="<script>alert('XSS')</script>"
    curl -s -X POST \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer invalid-token" \
        -d "{\"message\":\"$XSS_PAYLOAD\"}" \
        "$API_URL/api/chat" > /dev/null
    echo "XSS payload sent"
    echo ""
fi

# 7. レート制限テスト
echo "7️⃣ レート制限テスト..."
if command -v curl >/dev/null 2>&1; then
    echo "Rate limiting test (sending 10 rapid requests):"
    RATE_LIMIT_COUNT=0
    for i in {1..10}; do
        RESPONSE=$(curl -s -w "%{http_code}" -o /dev/null \
            -H "Authorization: Bearer invalid-token" \
            "$API_URL/api/chat" -X POST)
        if [ "$RESPONSE" = "429" ]; then
            RATE_LIMIT_COUNT=$((RATE_LIMIT_COUNT + 1))
        fi
        sleep 0.1
    done
    
    if [ "$RATE_LIMIT_COUNT" -gt 0 ]; then
        echo "✅ レート制限が動作しています ($RATE_LIMIT_COUNT/10 requests limited)"
    else
        echo "⚠️ レート制限が設定されていない可能性があります"
    fi
    echo ""
fi

# 8. HTTPS強制テスト
echo "8️⃣ HTTPS強制テスト..."
if echo "$API_URL" | grep -q "^https://"; then
    echo "✅ HTTPS URL が使用されています"
elif echo "$API_URL" | grep -q "^http://"; then
    if [ "$ENVIRONMENT" = "prod" ]; then
        echo "❌ 本番環境でHTTPが使用されています！"
    else
        echo "⚠️ 開発環境でHTTPが使用されています"
    fi
else
    echo "⚠️ 不明なプロトコル: $API_URL"
fi

echo ""
echo "🎉 セキュリティテスト完了!"
echo ""
echo "📋 推奨事項:"
echo "1. 本番環境では HTTPS を強制してください"
echo "2. API Gateway でレート制限を設定してください"
echo "3. WAF (Web Application Firewall) の導入を検討してください"
echo "4. 定期的なセキュリティスキャンを実施してください"