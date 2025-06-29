# AI駆動開発のための仕様書

## 目的

この文書は、生成AI（Claudeなど）に読み込ませ、プロジェクトの全体像と詳細な要件を正確に理解させるための公式な仕様書です。AIは、この仕様書に基づいて高品質なコード、テスト、設定ファイル、ドキュメントを生成します。

## 1. プロジェクト概要

**プロジェクト名:** 次世代マネジメント支援AIアシスタント

**目的:** 管理職の意思決定支援、業務効率化、情報収集を目的とした、セキュアで高機能な生成AIチャットアプリケーションのプロトタイプを開発し、その有効性を検証する。

**ターゲットユーザー:** 企業の管理職（部長、課長など）

**開発方針:**

- **AI駆動開発:** Claude CodeとCursorを中核に据え、AIを主体とした開発を推進する。
- **テスト駆動開発 (TDD):** 先にテストコードを作成し、そのテストをパスする形で実装を進める。
- **SOLID原則:** 保守性・拡張性の高いコードを目指す。
- **CI/CD:** テストをパスしたコードのみが自動でデプロイされる環境を構築する。

## 2. システム構成・技術スタック

**構成図:**

```mermaid
graph TD
    subgraph "ユーザー"
        A[管理職ユーザー]
        B[Adminユーザー]
    end

    subgraph "フロントエンド (AWS Amplify)"
        C[Next.js on S3/CloudFront]
    end

    subgraph "認証・認可 (Terraformで管理)"
        D[AWS Cognito]
    end

    subgraph "IaC & CI/CD"
        M[GitHub] --> N[GitHub Actions]
        subgraph "IaC Tools"
            O[Terraform]
            P[Serverless Framework]
        end
        N -- "Plan & Apply" --> O
        N -- "Deploy" --> P
        O -- "Create Core Infra" --> D & K & L & Q
        P -- "Deploy App Logic" --> E & F & G
    end

    subgraph "バックエンド (Serverless Frameworkで管理)"
        E[API Gateway]
        F[Node.js Lambda]
        G[Python Lambda]
    end

    subgraph "生成AI & データストア (Terraformで管理)"
        H[AWS Bedrock - Claude 3.5 Sonnet]
        K[S3 (アップロードファイル)]
        L[Vector DB (Amazon Bedrock Knowledge Bases)]
        Q[SSM Parameter Store (シークレット)]
    end

    A --> C; B --> C;
    C <--> D; C <--> E;
    E <--> F; F --> G;
    G -- "Reads Secret" --> Q
    G -- "ReAct" --> H & L
    H -- "Web Search"

    A -- "Upload" --> K;
    K -- "Trigger" --> G;
    G -- "Vectorize & Store" --> L
```

**IaC戦略:**

- **Terraform:** コアインフラ（Cognito, S3, Bedrock Knowledge Bases, IAM Roles, SSM Parameters）を管理。
- **Serverless Framework:** アプリケーションロジック（API Gateway, Lambda Functions, Event Mappings）を管理。

**シークレット管理:**

- 全てのシークレット（APIキー等）は AWS Systems Manager (SSM) Parameter Store のSecureStringで管理し、コードには含めない。LambdaのIAMロール経由で参照する。

## 3. 機能要件チケット

### チケット #1: ユーザー認証・認可基盤

- **ユーザーストーリー:**
  - 一般ユーザーとして、安全にアカウント登録・ログイン・ログアウトしたい。
  - Adminユーザーとして、ユーザー管理を行いたい。
- **技術仕様:**
  - AWS Cognito User Poolsを使用。adminグループを作成し、認可を制御。
  - フロントエンドはaws-amplifyライブラリ、バックエンドはCognito Admin APIを使用。
- **成功/失敗パターン:**
  - (成功) サインアップ、Eメールによるアカウント確認、サインイン/アウト、パスワードリセットが正常に機能する。
  - (成功) Adminユーザーはユーザー一覧の取得、招待、無効化、削除ができる。
  - (失敗) 一般ユーザーがユーザー管理APIにアクセスすると403 Forbiddenエラーが発生する。
  - (失敗) 無効な認証情報や確認コードでは各操作が失敗し、適切なエラーメッセージが表示される。

### チケット #2: ReActエージェントとWeb検索

- **ユーザーストーリー:** チャットで質問すると、AIがWebで最新情報を確認しながら、精度の高い回答を生成してほしい。
- **技術仕様:**
  - Python LambdaにLangGraphでReActエージェントを構築。
  - AIモデルは`anthropic.claude-3-5-sonnet-20240620-v1:0`。
  - ツールとして、全てのWebを対象とするWeb検索APIを組み込む。
- **成功/失敗パターン:**
  - (成功) 事実確認が必要な質問に対し、AIがWeb検索ツールを呼び出し、結果を要約・分析して出典付きで回答する。
  - (成功) 回答生成プロセスがストリーミングで表示される。
  - (失敗) Web検索APIが失敗した場合、その旨を伝えた上で内部知識のみで回答を試みる。
  - (失敗) 検索しても情報が見つからない場合、その旨を正直に回答する。

### チケット #3: RAGによる社内文書検索

- **ユーザーストーリー:** 社内文書をアップロードし、その内容に基づいた回答をAIにさせたい。
- **技術仕様:**
  - フロントからS3へファイルをアップロード。
  - Amazon Bedrock Knowledge Bases を利用し、S3連携、チャンク化、ベクトル化、検索APIの提供を自動化する。
  - リアルタイムに近い更新: アップロード完了後、数十秒で検索可能になる。フロントエンドはポーリングで処理完了を検知しユーザーに通知する。
- **成功/失敗パターン:**
  - (成功) 対応形式（.pdf, .docx, .txt）のファイルがアップロードされ、準備完了が通知される。
  - (成功) 文書内容に関する質問に対し、AIが関連箇所を検索し、出典付きで回答する。
  - (失敗) 非対応形式のファイルはエラーとなる。
  - (失敗) 文書内に情報がない場合、その旨を回答し、Web検索など次のアクションを提案する。

### チケット #4: マルチモーダルによる画像認識

- **ユーザーストーリー:** グラフや現場の写真などを添付して、それについて質問したい。
- **技術仕様:**
  - フロントエンドで画像をBase64エンコードし、テキストと共にバックエンドへ送信。
  - Bedrockの`invoke_model` APIをマルチモーダル形式で呼び出す。
- **成功/失敗パターン:**
  - (成功) グラフ画像を分析して傾向を説明したり、写真から異常箇所を指摘したりできる。
  - (失敗) 認識不能な画像の場合、その旨を伝える。
  - (失敗) 質問と無関係な画像の場合、ユーザーの意図を確認する。

### チケット #5: CI/CDパイプライン

- **ユーザーストーリー:** mainブランチにマージされたコードは、自動でテスト・デプロイされてほしい。
- **技術仕様:**
  - GitHub Actionsを使用。
  - mainブランチへのpushをトリガーに起動。
  - フロントエンド(Jest/Vitest)とバックエンド(Pytest)のテストを並列実行。
  - テストが全てパスした場合のみ、Terraform/Serverless Frameworkによるデプロイを実行。
- **成功/失敗パターン:**
  - (成功) テスト成功後、自動でデプロイが完了する。
  - (失敗) テストが1つでも失敗した場合、パイプラインは停止し、デプロイは行われない。

## 4. 非機能要件

- **パフォーマンス:** 通常チャットの応答開始時間は3秒以内。ストリーミングで体感速度を向上。
- **セキュリティ:** AWS IAMの最小権限原則、通信のTLS暗号化、入力のサニタイズを徹底。
- **コスト最適化:**
  - **Lambda:** ARM/Graviton2アーキテクチャを採用。NAT Gatewayのコストを回避するためVPC外で実行。
  - **Bedrock:** On-demand（従量課金）のみ使用。
  - **API Gateway:** 低コストなHTTP APIを優先的に検討。
- **可用性:** AWSマネージドサービスを活用し、基本的な可用性を担保。SLAは設けない。