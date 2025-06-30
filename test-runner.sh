#!/bin/bash
# 統合テストランナー - システム全体の動作確認

set -e

echo "🧪 システム動作確認・統合テスト開始"
echo "================================="

# カラー定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 結果追跡
TESTS_PASSED=0
TESTS_FAILED=0
FAILED_TESTS=()

# テスト結果記録関数
pass_test() {
    echo -e "${GREEN}✅ PASS${NC}: $1"
    TESTS_PASSED=$((TESTS_PASSED + 1))
}

fail_test() {
    echo -e "${RED}❌ FAIL${NC}: $1"
    TESTS_FAILED=$((TESTS_FAILED + 1))
    FAILED_TESTS+=("$1")
}

info_test() {
    echo -e "${BLUE}ℹ️  INFO${NC}: $1"
}

warn_test() {
    echo -e "${YELLOW}⚠️  WARN${NC}: $1"
}

# 1. 環境確認テスト
echo ""
echo "1️⃣ 環境確認テスト"
echo "-------------------"

# Node.js バージョン確認
NODE_VERSION=$(node --version)
if [[ $NODE_VERSION == v18* ]] || [[ $NODE_VERSION == v20* ]]; then
    pass_test "Node.js バージョン: $NODE_VERSION"
else
    fail_test "Node.js バージョンが要件を満たしていません: $NODE_VERSION"
fi

# Python バージョン確認
PYTHON_VERSION=$(python3 --version 2>&1)
if [[ $PYTHON_VERSION == *"3.12"* ]] || [[ $PYTHON_VERSION == *"3.11"* ]]; then
    pass_test "Python バージョン: $PYTHON_VERSION"
else
    fail_test "Python バージョンが要件を満たしていません: $PYTHON_VERSION"
fi

# npm依存関係確認
if [ -d "node_modules" ]; then
    pass_test "Node.js 依存関係インストール済み"
else
    fail_test "Node.js 依存関係がインストールされていません"
fi

# 2. フロントエンドテスト
echo ""
echo "2️⃣ フロントエンドテスト"
echo "----------------------"

# TypeScript型チェック
info_test "TypeScript 型チェック実行中..."
if npm run typecheck > /dev/null 2>&1; then
    pass_test "TypeScript 型チェック"
else
    fail_test "TypeScript 型チェック"
fi

# Next.js ビルドテスト
info_test "Next.js ビルドテスト実行中..."
if npm run build > /dev/null 2>&1; then
    pass_test "Next.js ビルド"
else
    fail_test "Next.js ビルド"
fi

# 3. バックエンドテスト  
echo ""
echo "3️⃣ バックエンドテスト"
echo "--------------------"

# Node.js Lambda ビルドテスト
info_test "Node.js Lambda ビルドテスト実行中..."
cd backend/lambda/nodejs
if npm run build > /dev/null 2>&1; then
    pass_test "Node.js Lambda ビルド"
else
    fail_test "Node.js Lambda ビルド"
fi
cd ../../..

# Python Lambda 構文チェック
info_test "Python Lambda 構文チェック実行中..."
cd backend/lambda/python
if [ -d "venv" ] && source venv/bin/activate && python -m py_compile src/*.py; then
    pass_test "Python Lambda 構文チェック"
else
    fail_test "Python Lambda 構文チェック"
fi
cd ../../..

# 4. 設定ファイル検証
echo ""
echo "4️⃣ 設定ファイル検証"
echo "------------------"

# 必須設定ファイル存在確認
config_files=(
    "package.json"
    "tsconfig.json"
    "next.config.js"
    "tailwind.config.js"
    "backend/serverless/serverless.yml"
    "backend/terraform/main.tf"
    ".env.local.example"
)

for file in "${config_files[@]}"; do
    if [ -f "$file" ]; then
        pass_test "設定ファイル存在: $file"
    else
        fail_test "設定ファイル不足: $file"
    fi
done

# 5. セキュリティファイル確認
echo ""
echo "5️⃣ セキュリティファイル確認"
echo "-------------------------"

security_files=(
    "SECURITY.md"
    "SECURITY_AUDIT_REPORT.md"
    "backend/scripts/security-setup.sh"
    "backend/scripts/security-test.sh"
    "backend/scripts/setup-ssm-parameters.sh"
)

for file in "${security_files[@]}"; do
    if [ -f "$file" ]; then
        pass_test "セキュリティファイル存在: $file"
    else
        fail_test "セキュリティファイル不足: $file"
    fi
done

# 6. プロジェクト構造確認
echo ""
echo "6️⃣ プロジェクト構造確認"
echo "----------------------"

required_dirs=(
    "src/app"
    "src/components"
    "src/lib"
    "backend/lambda/nodejs/src"
    "backend/lambda/python/src"
    "backend/terraform"
    "backend/serverless"
)

for dir in "${required_dirs[@]}"; do
    if [ -d "$dir" ]; then
        pass_test "ディレクトリ存在: $dir"
    else
        fail_test "ディレクトリ不足: $dir"
    fi
done

# 7. Git状態確認
echo ""
echo "7️⃣ Git状態確認"
echo "---------------"

# Git初期化確認
if [ -d ".git" ]; then
    pass_test "Gitリポジトリ初期化済み"
else
    fail_test "Gitリポジトリが初期化されていません"
fi

# .gitignore確認
if [ -f ".gitignore" ]; then
    pass_test ".gitignore ファイル存在"
else
    fail_test ".gitignore ファイルが不足"
fi

# 未コミット変更確認
if git diff --quiet && git diff --cached --quiet; then
    pass_test "全変更がコミット済み"
else
    warn_test "未コミットの変更があります"
fi

# 8. ドキュメント確認
echo ""
echo "8️⃣ ドキュメント確認"
echo "-----------------"

docs=(
    "README.md"
    "CLAUDE.md"
    "artifact.md"
    "backend/README.md"
)

for doc in "${docs[@]}"; do
    if [ -f "$doc" ]; then
        pass_test "ドキュメント存在: $doc"
    else
        fail_test "ドキュメント不足: $doc"
    fi
done

# テスト結果サマリー
echo ""
echo "📊 テスト結果サマリー"
echo "==================="
echo -e "${GREEN}成功: $TESTS_PASSED${NC}"
echo -e "${RED}失敗: $TESTS_FAILED${NC}"

if [ $TESTS_FAILED -gt 0 ]; then
    echo ""
    echo -e "${RED}失敗したテスト:${NC}"
    for test in "${FAILED_TESTS[@]}"; do
        echo "  - $test"
    done
    echo ""
    echo -e "${YELLOW}推奨アクション:${NC}"
    echo "1. 失敗したテストを個別に確認・修正"
    echo "2. 依存関係の再インストール"
    echo "3. 設定ファイルの確認"
    exit 1
else
    echo ""
    echo -e "${GREEN}🎉 全テストがパスしました！${NC}"
    echo "システムは正常に動作する準備ができています。"
    echo ""
    echo "次のステップ:"
    echo "1. AWS環境でのデプロイテスト"
    echo "2. 実際のAPIエンドポイントテスト"
    echo "3. エンドツーエンドテスト"
fi

echo ""
echo "テスト完了: $(date)"