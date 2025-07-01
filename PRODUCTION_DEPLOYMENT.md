# 本番環境デプロイ手順書

## 📋 本番環境デプロイチェックリスト

### 🔐 **事前準備 (必須)**

#### 1. APIキーの取得
- [ ] **Anthropic APIキー**: https://console.anthropic.com/ から取得
- [ ] **DuckDuckGo APIキー** (オプション): https://duckduckgo.com/api から取得

#### 2. AWS環境準備
- [ ] 本番用AWSアカウント・リージョンの確認
- [ ] 適切なIAM権限の設定
- [ ] AWS CLIの設定確認

### 🚀 **デプロイ手順**

#### Step 1: バックエンド (インフラ + Lambda)
```bash
# 1. バックエンドディレクトリに移動
cd backend

# 2. 本番環境デプロイ実行
./deploy-prod.sh

# 3. 実際のAPIキーを設定
aws ssm put-parameter --name "/genai/prod/anthropic-api-key" \
  --value "sk-ant-api03-YOUR-ACTUAL-KEY" \
  --type "SecureString" --overwrite

aws ssm put-parameter --name "/genai/prod/web-search-api-key" \
  --value "your-duckduckgo-api-key" \
  --type "SecureString" --overwrite
```

#### Step 2: フロントエンド環境変数更新
デプロイ後に取得される実際の値で`.env.production`を更新:

```bash
# Terraform出力から値を取得
cd backend/terraform
COGNITO_USER_POOL_ID=$(terraform output -raw cognito_user_pool_id)
COGNITO_CLIENT_ID=$(terraform output -raw cognito_user_pool_client_id)
S3_BUCKET_NAME=$(terraform output -raw s3_bucket_name)

# API Gateway エンドポイントを取得
API_ENDPOINT=$(aws apigatewayv2 get-apis --query "Items[?Name=='genai-management-assistant-prod'].ApiEndpoint" --output text)

# .env.productionファイルを更新
echo "NEXT_PUBLIC_COGNITO_USER_POOL_ID=$COGNITO_USER_POOL_ID" > .env.production
echo "NEXT_PUBLIC_COGNITO_USER_POOL_CLIENT_ID=$COGNITO_CLIENT_ID" >> .env.production
echo "NEXT_PUBLIC_API_GATEWAY_URL=$API_ENDPOINT" >> .env.production
echo "NEXT_PUBLIC_S3_BUCKET=$S3_BUCKET_NAME" >> .env.production
echo "NEXT_PUBLIC_AWS_REGION=ap-northeast-1" >> .env.production
```

#### Step 3: AWS Amplifyでフロントエンドデプロイ

##### 3-1. Amplify CLIを使用する場合
```bash
# Amplify初期化
amplify init

# Amplify設定
amplify add hosting

# デプロイ実行
amplify publish
```

##### 3-2. Amplify Console (推奨)を使用する場合
1. [AWS Amplify Console](https://console.aws.amazon.com/amplify/) にアクセス
2. 「Host your web app」を選択
3. GitHubリポジトリを接続
4. ビルド設定で `amplify.yml` を使用
5. 環境変数に `.env.production` の内容を設定
6. デプロイを実行

### 🔍 **デプロイ後確認**

#### 1. バックエンドAPI確認
```bash
# ヘルスチェック
curl https://YOUR-API-ENDPOINT/api/health

# 認証テスト (トークンが必要)
curl -H "Authorization: Bearer YOUR-JWT-TOKEN" \
  https://YOUR-API-ENDPOINT/api/user
```

#### 2. フロントエンド確認
- [ ] Amplifyアプリケーションがデプロイ完了
- [ ] サインイン・サインアップ機能
- [ ] チャット機能の動作
- [ ] ファイルアップロード機能
- [ ] Web検索機能

#### 3. セキュリティ確認
- [ ] JWT署名検証が有効 (ENVIRONMENT=prod)
- [ ] HTTPS通信の確認
- [ ] CORS設定の確認
- [ ] SSMパラメータの適切な暗号化

### 📊 **監視・運用設定**

#### 1. CloudWatch設定
```bash
# Lambda関数の監視設定
aws logs create-log-group --log-group-name /aws/lambda/genai-management-assistant-prod-api
aws logs create-log-group --log-group-name /aws/lambda/genai-management-assistant-prod-chatSimple

# アラーム設定
aws cloudwatch put-metric-alarm \
  --alarm-name "GenAI-Prod-Lambda-Errors" \
  --alarm-description "GenAI Production Lambda Errors" \
  --metric-name Errors \
  --namespace AWS/Lambda \
  --statistic Sum \
  --period 300 \
  --threshold 5 \
  --comparison-operator GreaterThanThreshold
```

#### 2. コスト監視
- [ ] AWS Billing Alertsの設定
- [ ] Bedrockコスト監視の設定
- [ ] Lambda実行時間・リクエスト数の監視

### 🚨 **トラブルシューティング**

#### よくある問題
1. **Cognito認証エラー**
   - User Pool IDとClient IDの確認
   - CORS設定の確認

2. **API Gateway 403エラー**
   - JWT トークンの有効性確認
   - Lambda関数のIAM権限確認

3. **Bedrock API エラー**
   - リージョンでのBedrock利用可能性確認
   - IAM権限の確認

4. **S3アップロードエラー**
   - バケット名の確認
   - CORS設定の確認

### 📱 **カスタムドメイン設定 (オプション)**

#### 1. Route 53設定
```bash
# ホストゾーン作成
aws route53 create-hosted-zone --name your-domain.com --caller-reference $(date +%s)
```

#### 2. SSL証明書
```bash
# ACM証明書申請
aws acm request-certificate --domain-name your-domain.com --validation-method DNS
```

#### 3. CloudFront設定
- Amplifyアプリケーションにカスタムドメインを追加
- SSL証明書を適用

### 🔄 **CI/CD設定 (推奨)**

#### GitHub Actions例
```yaml
name: Production Deployment
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy Backend
        run: ./backend/deploy-prod.sh
      - name: Deploy Frontend
        run: amplify publish
```

### 📋 **定期メンテナンス**

#### 月次作業
- [ ] セキュリティパッチの適用
- [ ] 依存関係の更新
- [ ] ログの確認・分析
- [ ] コスト分析

#### 四半期作業
- [ ] バックアップ・復旧テスト
- [ ] セキュリティ監査
- [ ] パフォーマンス最適化
- [ ] 災害復旧計画の見直し

---

## ⚠️ **重要事項**

1. **本番環境では必ず実際のAPIキーを設定してください**
2. **定期的なセキュリティ更新を実施してください**  
3. **監視・アラート体制を整備してください**
4. **バックアップ・災害復旧計画を策定してください**
5. **コンプライアンス要件の確認を行ってください**

本番運用開始前に、必ず全機能の動作確認とセキュリティテストを実施してください。