#!/bin/bash
# パフォーマンステストスクリプト

echo "🚀 パフォーマンステスト開始"
echo "========================="

# Next.js ビルドサイズ確認
echo ""
echo "📦 ビルドサイズ分析"
echo "------------------"

if [ -d ".next" ]; then
    echo "Next.js ビルド成果物:"
    du -h .next/static/chunks/*.js | head -10
    echo ""
    echo "合計サイズ:"
    du -sh .next/
else
    echo "ビルドファイルが見つかりません"
fi

# TypeScript コンパイル時間測定
echo ""
echo "⏱️ TypeScript コンパイル時間"
echo "--------------------------"
start_time=$(date +%s.%N)
npm run typecheck > /dev/null 2>&1
end_time=$(date +%s.%N)
compile_time=$(echo "$end_time - $start_time" | bc -l)
printf "TypeScript 型チェック時間: %.2f秒\n" $compile_time

# Next.js ビルド時間測定
echo ""
echo "⏱️ Next.js ビルド時間"
echo "--------------------"
start_time=$(date +%s.%N)
npm run build > /dev/null 2>&1
end_time=$(date +%s.%N)
build_time=$(echo "$end_time - $start_time" | bc -l)
printf "Next.js ビルド時間: %.2f秒\n" $build_time

# メモリ使用量確認
echo ""
echo "💾 メモリ使用量"
echo "-------------"
echo "システム メモリ使用量:"
free -h

echo ""
echo "Node.js プロセス メモリ使用量:"
ps aux | grep node | grep -v grep | awk '{print $6/1024 " MB - " $11}' | head -5

# パッケージサイズ分析
echo ""
echo "📊 パッケージサイズ分析"
echo "---------------------"
if command -v npx >/dev/null 2>&1; then
    echo "主要なnode_modules サイズ:"
    du -sh node_modules/* 2>/dev/null | sort -hr | head -10
fi

echo ""
echo "🎯 パフォーマンス最適化提案"
echo "========================="
echo "1. 画像最適化: Next.js Image コンポーネントの活用"
echo "2. コード分割: dynamic import の活用"
echo "3. バンドルサイズ削減: 未使用依存関係の削除"
echo "4. CSS最適化: Tailwind CSS purge設定の確認"

echo ""
echo "パフォーマンステスト完了: $(date)"