# AI Management Assistant

次世代マネジメント支援AIアシスタント - モダンでスタイリッシュなUI

## 機能

- ✨ モダンなUI/UX（Tailwind CSS + shadcn/ui）
- 💬 リアルタイムチャット機能
- 📎 ファイルアップロード対応
- 🖼️ 画像認識機能（マルチモーダル）  
- 📱 完全レスポンシブデザイン
- 🔐 AWS Amplify認証統合（準備中）
- 🤖 ReActエージェント・Web検索（準備中）
- 📚 RAG社内文書検索（準備中）

## 技術スタック

- **フロントエンド**: Next.js 14, TypeScript, Tailwind CSS
- **UIライブラリ**: shadcn/ui, Radix UI
- **状態管理**: React hooks
- **認証**: AWS Amplify（準備中）
- **バックエンド**: AWS Lambda, API Gateway（準備中）
- **AI**: AWS Bedrock Claude 3.5 Sonnet（準備中）

## 開発

```bash
# パッケージインストール
npm install

# 開発サーバー起動
npm run dev

# ビルド
npm run build

# テスト実行
npm test

# 型チェック
npm run typecheck

# Lint
npm run lint
```

## プロジェクト構造

```
src/
├── app/                 # Next.js App Router
├── components/          # UIコンポーネント
│   ├── ui/             # 基本UIコンポーネント
│   ├── chat/           # チャット関連コンポーネント
│   └── layout/         # レイアウトコンポーネント
├── lib/                # ユーティリティ関数
├── types/              # TypeScript型定義
├── hooks/              # カスタムフック
└── utils/              # ヘルパー関数
```

## ライセンス

MIT