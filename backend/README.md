# GENAI Management Assistant - Backend

このディレクトリには、次世代マネジメント支援AIアシスタントのバックエンドコンポーネントが含まれています。

## アーキテクチャ

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Frontend      │────▶│   API Gateway    │────▶│  Lambda (Node)  │
│   (Next.js)     │     │                  │     │                 │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                                 │                         │
                                 ▼                         ▼
                        ┌──────────────────┐     ┌─────────────────┐
                        │ Lambda (Python)  │     │   Cognito       │
                        │ ReAct Agent      │     │   User Pool     │
                        └──────────────────┘     └─────────────────┘
                                 │
                                 ▼
                        ┌──────────────────┐
                        │   AWS Bedrock    │
                        │ Claude 3.5 Sonnet│
                        └──────────────────┘
                                 │
                    ┌────────────┴────────────┐
                    ▼                         ▼
           ┌─────────────────┐      ┌─────────────────┐
           │       S3        │      │ Knowledge Base  │
           │ File Storage    │      │ Vector Search   │
           └─────────────────┘      └─────────────────┘
```

## ディレクトリ構成

```
backend/
├── terraform/              # Infrastructure as Code
│   ├── main.tf             # Main Terraform configuration
│   ├── cognito.tf          # Cognito User Pool
│   ├── s3.tf               # S3 bucket configuration
│   ├── bedrock.tf          # Bedrock Knowledge Base
│   ├── ssm.tf              # SSM Parameter Store
│   └── outputs.tf          # Terraform outputs
├── serverless/             # Serverless Framework
│   ├── serverless.yml      # Lambda functions and API Gateway
│   └── package.json        # Dependencies
├── lambda/
│   ├── nodejs/             # Node.js Lambda functions
│   │   ├── src/
│   │   │   ├── api.ts      # Main API handler
│   │   │   ├── userManagement.ts  # Admin user management
│   │   │   ├── handlers/   # Request handlers
│   │   │   ├── utils/      # Utility functions
│   │   │   └── types/      # TypeScript types
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── python/             # Python Lambda functions
│       ├── src/
│       │   ├── chat_agent.py      # ReAct agent
│       │   └── file_processor.py  # S3 file processing
│       └── requirements.txt
├── deploy.sh               # Deployment script
└── README.md              # This file
```

## 主要コンポーネント

### 1. インフラストラクチャ (Terraform)

- **AWS Cognito**: ユーザー認証・認可
- **AWS S3**: ファイルストレージ
- **AWS Bedrock**: Claude 3.5 Sonnet、Knowledge Base
- **OpenSearch Serverless**: ベクトル検索
- **SSM Parameter Store**: シークレット管理

### 2. アプリケーション (Serverless Framework)

- **API Gateway**: HTTP API エンドポイント
- **Lambda Functions**: 
  - Node.js: API統合、ユーザー管理
  - Python: ReActエージェント、ファイル処理

### 3. 主要機能

#### チャット機能
- ReActエージェントによるWeb検索
- 社内文書のRAG検索
- マルチモーダル画像認識

#### ファイル管理
- S3への安全なファイルアップロード
- 自動的な文書処理とベクトル化
- Knowledge Baseへの統合

#### ユーザー管理
- Cognito認証
- 管理者機能
- グループベースの認可

## デプロイメント

### 前提条件

- AWS CLI (設定済み)
- Terraform >= 1.0
- Node.js >= 18
- Python >= 3.11

### 環境変数

以下の環境変数を設定してください：

```bash
export AWS_REGION=ap-northeast-1
export AWS_PROFILE=your-profile
```

### デプロイ手順

1. **自動デプロイ (推奨)**:
   ```bash
   ./deploy.sh dev
   ```

2. **手動デプロイ**:
   ```bash
   # Infrastructure
   cd terraform
   terraform init
   terraform apply
   
   # Application
   cd ../serverless
   npm install
   npx serverless deploy --stage dev
   ```

### 環境別デプロイ

```bash
# 開発環境
./deploy.sh dev

# 本番環境
./deploy.sh prod ap-northeast-1
```

## 設定

### SSMパラメータ

デプロイ後、以下のパラメータに実際の値を設定してください：

```bash
# Web検索APIキー
aws ssm put-parameter \
  --name "/genai/dev/web-search-api-key" \
  --value "your-api-key" \
  --type "SecureString" \
  --overwrite

# Anthropic APIキー (必要に応じて)
aws ssm put-parameter \
  --name "/genai/dev/anthropic-api-key" \
  --value "your-anthropic-key" \
  --type "SecureString" \
  --overwrite
```

### Cognitoユーザー

管理者ユーザーを作成：

```bash
aws cognito-idp admin-create-user \
  --user-pool-id YOUR_USER_POOL_ID \
  --username admin@example.com \
  --user-attributes Name=email,Value=admin@example.com \
  --temporary-password TempPassword123! \
  --message-action SUPPRESS

# 管理者グループに追加
aws cognito-idp admin-add-user-to-group \
  --user-pool-id YOUR_USER_POOL_ID \
  --username admin@example.com \
  --group-name admin
```

## テスト

### API テスト

```bash
# ヘルスチェック
curl -X GET https://your-api-id.execute-api.ap-northeast-1.amazonaws.com/dev/api/health

# チャット (認証トークン必要)
curl -X POST https://your-api-id.execute-api.ap-northeast-1.amazonaws.com/dev/api/chat \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message": "こんにちは"}'
```

### ローカル開発

```bash
# Serverless Offline
cd serverless
npm run offline

# Node.js Lambda
cd lambda/nodejs
npm run dev

# Python Lambda
cd lambda/python
python -m pytest tests/
```

## モニタリング

### CloudWatch Logs

- `/aws/lambda/genai-dev-api`
- `/aws/lambda/genai-dev-chatAgent`
- `/aws/lambda/genai-dev-fileProcessor`

### メトリクス

- Lambda duration/errors
- API Gateway 4xx/5xx errors
- Cognito sign-in metrics

## セキュリティ

### 最小権限原則
- IAMロールは必要最小限の権限のみ付与
- VPC外でのLambda実行（NAT Gateway不要）

### データ保護
- S3の暗号化有効
- Cognito MFA推奨
- SSMでのシークレット管理

### ネットワーク
- CORS設定による適切なオリジン制限
- HTTPS必須

## トラブルシューティング

### よくある問題

1. **Terraform apply失敗**
   - AWS権限の確認
   - リージョン設定の確認

2. **Lambda関数エラー**
   - CloudWatch Logsの確認
   - Environment variablesの確認

3. **認証エラー**
   - Cognitoトークンの有効性確認
   - CORS設定の確認

### ログ確認

```bash
# Lambda logs
aws logs tail /aws/lambda/genai-dev-api --follow

# Terraform state
terraform show
```

## 参考資料

- [AWS Bedrock Documentation](https://docs.aws.amazon.com/bedrock/)
- [Serverless Framework Guide](https://www.serverless.com/framework/docs/)
- [LangGraph Documentation](https://python.langchain.com/docs/langgraph)
- [AWS Cognito Developer Guide](https://docs.aws.amazon.com/cognito/)