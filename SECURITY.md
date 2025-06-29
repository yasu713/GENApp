# セキュリティガイドライン

このドキュメントは、AI Management Assistantプロジェクトのセキュリティに関するガイドラインと注意事項をまとめています。

## 🔒 実装済みセキュリティ機能

### 認証・認可
- **AWS Cognito User Pool**: エンタープライズレベルの認証システム
- **JWT トークン**: セキュアなAPIアクセス制御
- **グループベース認可**: 管理者・一般ユーザーの権限分離
- **トークン有効期限**: 自動的な期限切れとリフレッシュ機能

### データ保護
- **S3暗号化**: 保存時暗号化（AES-256）
- **転送時暗号化**: HTTPS/TLS通信の強制
- **IAM最小権限**: 必要最小限のAWS権限設定
- **CORS設定**: 適切なオリジン制限

### インフラセキュリティ
- **Serverless アーキテクチャ**: 攻撃面の最小化
- **VPC分離**: ネットワークレベルの分離（予定）
- **CloudWatch ログ**: セキュリティイベントの監査

## ⚠️ 重要なセキュリティ注意事項

### 🚨 本番環境での必須対応事項

#### 1. JWT署名検証の実装
**現在の状態**: 開発用にJWT署名検証が無効化されています

**対応必要ファイル**: `backend/lambda/python/src/chat_agent.py`
```python
# TODO: 本番環境では以下を実装してください
# 1. Cognito UserPoolの公開鍵を取得
# 2. JWT署名の検証を有効化
# 3. issuer (iss) claimの検証
# 4. audience (aud) claimの検証
```

**本番実装例**:
```python
import requests
from jose import jwt, JWTError

def get_cognito_public_keys():
    # Cognitoの公開鍵を取得
    region = os.environ['AWS_REGION']
    user_pool_id = os.environ['COGNITO_USER_POOL_ID']
    url = f'https://cognito-idp.{region}.amazonaws.com/{user_pool_id}/.well-known/jwks.json'
    return requests.get(url).json()

def validate_token_production(token: str) -> Optional[Dict]:
    try:
        # 本番用の厳密な検証
        keys = get_cognito_public_keys()
        header = jwt.get_unverified_header(token)
        key = [k for k in keys['keys'] if k['kid'] == header['kid']][0]
        
        decoded = jwt.decode(
            token,
            key,
            algorithms=['RS256'],
            audience=os.environ['COGNITO_CLIENT_ID'],
            issuer=f'https://cognito-idp.{region}.amazonaws.com/{user_pool_id}'
        )
        return decoded
    except JWTError:
        return None
```

#### 2. SSMパラメータの実際値設定
**現在の状態**: プレースホルダー値が設定されています

**対応必要**:
```bash
# Web検索APIキーの設定
aws ssm put-parameter \
  --name "/genai/prod/web-search-api-key" \
  --value "YOUR_ACTUAL_DUCKDUCKGO_API_KEY" \
  --type "SecureString" \
  --overwrite

# Anthropic APIキーの設定（オプション）
aws ssm put-parameter \
  --name "/genai/prod/anthropic-api-key" \
  --value "YOUR_ACTUAL_ANTHROPIC_API_KEY" \
  --type "SecureString" \
  --overwrite
```

## 🛡️ 開発時のセキュリティベストプラクティス

### 環境変数の管理
- **✅ DO**: `.env.local.example`ファイルをテンプレートとして使用
- **❌ DON'T**: 実際のクレデンシャルをコードにコミット
- **✅ DO**: AWS SSM Parameter Storeでシークレット管理

### コードレビュー時のチェックポイント
- [ ] ハードコーディングされたAPIキーがないか
- [ ] JWT署名検証が適切に実装されているか
- [ ] CORS設定が適切か
- [ ] ログに機密情報が出力されていないか
- [ ] エラーメッセージに内部情報が含まれていないか

### ファイルの除外設定
`.gitignore`で以下のファイル・ディレクトリを除外:
- 環境変数ファイル (`.env*`)
- AWSクレデンシャル (`.aws/`, `credentials`)
- Terraformステート (`.tfstate`, `.tfvars`)
- ビルド成果物とキャッシュ

## 🔍 セキュリティ監査

### 定期チェック項目
1. **依存関係の脆弱性**: `npm audit`, `pip-audit`
2. **AWSセキュリティ**: AWS Config, GuardDuty
3. **コードの静的解析**: ESLint security plugins
4. **アクセスログの確認**: CloudWatch Logs

### インシデント対応
1. **即座の対応**: 影響の範囲を特定し、被害を最小化
2. **調査**: ログとメトリクスを使用した原因分析
3. **修復**: 脆弱性の修正とパッチ適用
4. **予防**: 再発防止策の実装

## 📞 セキュリティに関する報告

セキュリティの脆弱性を発見した場合は、以下の手順で報告してください：

1. **機密保持**: 公開の場での議論は避ける
2. **詳細な報告**: 再現手順と影響範囲を明記
3. **迅速な対応**: 発見後24時間以内に関係者に連絡

---

**注意**: このドキュメントは定期的に更新し、最新のセキュリティ要件に対応してください。