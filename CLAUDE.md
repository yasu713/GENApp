# CLAUDE.md - AI Management Assistant プロジェクト概要

## プロジェクト概要

**プロジェクト名**: 次世代マネジメント支援AIアシスタント  
**目的**: 管理職の意思決定支援、業務効率化、情報収集を目的とした、セキュアで高機能な生成AIチャットアプリケーション  
**ターゲットユーザー**: 企業の管理職（部長、課長など）  

## 技術スタック

### フロントエンド
- **フレームワーク**: Next.js 14 (App Router)
- **言語**: TypeScript
- **スタイリング**: Tailwind CSS + shadcn/ui
- **状態管理**: React hooks
- **認証**: AWS Amplify
- **デプロイ**: AWS Amplify (予定)

### バックエンド
- **インフラ管理**: Terraform (IaC)
- **アプリケーション**: Serverless Framework
- **API**: API Gateway (HTTP API)
- **関数**: AWS Lambda (Node.js + Python)
- **認証**: AWS Cognito
- **ストレージ**: AWS S3
- **AI**: AWS Bedrock (Claude 3.5 Sonnet)
- **検索**: Amazon Bedrock Knowledge Bases + OpenSearch Serverless

## プロジェクト構造

```
/home/ubuntu/GENAI/
├── src/                          # フロントエンド (Next.js)
│   ├── app/                      # Next.js App Router
│   │   ├── layout.tsx           # ルートレイアウト
│   │   ├── page.tsx             # メインページ
│   │   └── globals.css          # グローバルスタイル
│   ├── components/              # UIコンポーネント
│   │   ├── ui/                  # 基本UIコンポーネント (shadcn/ui)
│   │   ├── chat/                # チャット機能
│   │   │   ├── ChatInterface.tsx
│   │   │   ├── ChatMessages.tsx
│   │   │   └── ChatInput.tsx
│   │   └── layout/              # レイアウトコンポーネント
│   │       ├── Header.tsx
│   │       └── Sidebar.tsx
│   ├── lib/                     # ユーティリティ
│   ├── types/                   # TypeScript型定義
│   └── hooks/                   # カスタムフック
├── backend/                     # バックエンド
│   ├── terraform/               # インフラ (IaC)
│   │   ├── main.tf             # メイン設定
│   │   ├── cognito.tf          # Cognito User Pool
│   │   ├── s3.tf               # S3バケット
│   │   ├── bedrock.tf          # Bedrock Knowledge Base
│   │   ├── ssm.tf              # SSM Parameter Store
│   │   └── outputs.tf          # 出力値
│   ├── serverless/             # Serverless Framework
│   │   ├── serverless.yml      # Lambda関数・API Gateway設定
│   │   └── package.json
│   ├── lambda/                 # Lambda関数
│   │   ├── nodejs/             # Node.js Lambda
│   │   │   ├── src/
│   │   │   │   ├── api.ts      # メインAPIハンドラー
│   │   │   │   ├── userManagement.ts  # ユーザー管理
│   │   │   │   ├── handlers/   # リクエストハンドラー
│   │   │   │   ├── utils/      # ユーティリティ
│   │   │   │   └── types/      # 型定義
│   │   │   └── package.json
│   │   └── python/             # Python Lambda
│   │       ├── src/
│   │       │   ├── chat_agent.py     # ReActエージェント
│   │       │   └── file_processor.py # ファイル処理
│   │       └── requirements.txt
│   ├── deploy.sh               # デプロイスクリプト
│   ├── README.md               # バックエンドドキュメント
│   └── .env.example            # 環境変数例
├── package.json                # フロントエンド依存関係
├── next.config.js              # Next.js設定
├── tailwind.config.js          # Tailwind CSS設定
├── tsconfig.json               # TypeScript設定
├── artifact.md                 # 仕様書
├── README.md                   # プロジェクト概要
└── CLAUDE.md                   # このファイル
```

## 主要機能

### ✅ 実装済み機能

1. **フロントエンド**
   - モダンなチャットUI (レスポンシブ対応)
   - ファイルアップロード機能
   - 画像プレビュー機能
   - サイドバー履歴管理
   - TypeScript型安全性

2. **バックエンド**
   - Serverless Framework設定
   - API Gateway (CORS対応)
   - AWS Cognito認証統合
   - Node.js Lambda (API統合・ユーザー管理)
   - Python Lambda (ReActエージェント・ファイル処理)
   - Terraform IaC (全インフラ定義)

3. **インフラ**
   - AWS Cognito (ユーザー認証・グループ管理)
   - AWS S3 (ファイルストレージ・ライフサイクル管理)
   - AWS Bedrock Knowledge Base (RAG検索)
   - OpenSearch Serverless (ベクトル検索)
   - SSM Parameter Store (シークレット管理)

### 🔄 準備中機能

1. **ReActエージェント**
   - Web検索 (DuckDuckGo統合)
   - 社内文書検索 (Knowledge Base)
   - マルチモーダル画像認識

2. **フロントエンド統合**
   - AWS Amplify認証
   - リアルタイムAPI連携
   - ストリーミングレスポンス

## API エンドポイント

### 認証が必要なエンドポイント

```
POST /api/chat              # チャット機能
POST /api/upload            # ファイルアップロード
GET  /api/user              # ユーザープロフィール
POST /chat/agent            # ReActエージェント (Python)

# 管理者限定
GET  /admin/users           # ユーザー一覧
PUT  /admin/users/{userId}  # ユーザー更新
```

## 開発コマンド

### フロントエンド
```bash
# 開発サーバー起動
npm run dev

# ビルド
npm run build

# 型チェック
npm run typecheck

# Lint
npm run lint
```

### バックエンド
```bash
# 一括デプロイ
./backend/deploy.sh dev

# Terraform
cd backend/terraform
terraform init && terraform apply

# Serverless Framework
cd backend/serverless
npm install && npx serverless deploy --stage dev

# Node.js Lambda
cd backend/lambda/nodejs
npm install && npm run build

# Python Lambda
cd backend/lambda/python
pip install -r requirements.txt
```

## 環境設定

### 必要な環境変数・設定

1. **AWS設定**
   ```bash
   export AWS_REGION=ap-northeast-1
   export AWS_PROFILE=your-profile
   ```

2. **SSMパラメータ**
   - `/genai/dev/web-search-api-key` - Web検索APIキー
   - `/genai/dev/anthropic-api-key` - Anthropic APIキー (オプション)

3. **Cognito設定**
   - ユーザープール: 管理者・一般ユーザーグループ
   - パスワードポリシー: 8文字以上、記号・数字必須

## セキュリティ

- **認証**: JWT (Cognito発行)
- **認可**: グループベース権限管理
- **暗号化**: S3/SSM暗号化有効
- **ネットワーク**: CORS適切設定
- **権限**: IAM最小権限原則

## モニタリング

- **CloudWatch Logs**: Lambda関数ログ
- **API Gateway**: リクエスト/エラーメトリクス
- **Cognito**: サインイン統計

## デプロイ環境

- **開発**: `dev` environment
- **本番**: `prod` environment (準備済み)

## 注意事項

1. **コスト最適化**
   - Lambda ARM/Graviton2使用
   - VPC外実行 (NAT Gateway回避)
   - Bedrock On-demand課金

2. **リージョン**
   - 基本: ap-northeast-1 (東京)
   - Bedrock対応リージョン必須

3. **依存関係**
   - Node.js >= 18
   - Python >= 3.11
   - Terraform >= 1.0

## トラブルシューティング

### よくある問題
1. **ビルドエラー**: 依存関係の再インストール
2. **認証エラー**: Cognitoトークンの確認
3. **CORS エラー**: オリジン設定の確認
4. **デプロイエラー**: AWS権限・リージョン確認

### ログ確認
```bash
# Lambda logs
aws logs tail /aws/lambda/genai-dev-api --follow

# Terraform state
cd backend/terraform && terraform show
```

## 参考資料

- **仕様書**: `artifact.md`
- **バックエンド詳細**: `backend/README.md`
- **AWS Bedrock**: https://docs.aws.amazon.com/bedrock/
- **Serverless Framework**: https://www.serverless.com/framework/docs/
- **Next.js**: https://nextjs.org/docs

---

このファイルは、AIアシスタント（Claude）がプロジェクトの全体像を把握するためのリファレンスです。
プロジェクトの変更時は、このファイルも更新してください。