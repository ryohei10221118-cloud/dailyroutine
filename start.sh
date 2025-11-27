#!/bin/bash

# 保養提醒助手 - 快速啟動腳本

echo "🧴 保養提醒助手 - 啟動中..."
echo ""

# 檢查 Python 是否可用
if command -v python3 &> /dev/null; then
    echo "✅ 找到 Python3"
    echo ""
    echo "📱 請在 iPhone Safari 中訪問："
    echo ""

    # 獲取本機 IP
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        IP=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -n 1)
    else
        # Linux
        IP=$(hostname -I | awk '{print $1}')
    fi

    echo "   http://$IP:8000"
    echo ""
    echo "📝 提示："
    echo "   1. 確保 iPhone 和電腦在同一 WiFi"
    echo "   2. 在 Safari 中打開上述網址"
    echo "   3. 點擊分享按鈕 → 加入主畫面"
    echo "   4. 啟用通知權限以接收提醒"
    echo ""
    echo "🛑 按 Ctrl+C 停止伺服器"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""

    # 啟動伺服器
    python3 -m http.server 8000

elif command -v python &> /dev/null; then
    echo "✅ 找到 Python"
    python -m SimpleHTTPServer 8000

else
    echo "❌ 未找到 Python"
    echo ""
    echo "請安裝 Python 或使用其他方式啟動："
    echo "  - Node.js: npx http-server -p 8000"
    echo "  - VS Code: 安裝 Live Server 擴充功能"
    echo ""
fi
