# 推送通知系統部署指南

## 🎯 功能說明

這個推送通知系統可以讓您即使**完全關閉 App** 也能收到保養提醒！

採用：
- **Web Push API** - 標準的網頁推送協議
- **Vercel Serverless Functions** - 免費託管 API
- **Vercel KV** - 免費資料庫儲存訂閱
- **Vercel Cron** - 每分鐘檢查一次提醒時間

## 📋 部署步驟

### 1. 生成 VAPID 金鑰

在專案目錄執行：

```bash
node generate-vapid-keys.js
```

這會生成一對公私鑰並儲存到 `.env.local`。請妥善保管私鑰！

### 2. 註冊 Vercel 帳號

1. 前往 [vercel.com](https://vercel.com)
2. 使用 GitHub 帳號登入
3. 授權 Vercel 存取您的 GitHub repository

### 3. 部署到 Vercel

#### 方法 A：使用 Vercel CLI（推薦）

```bash
# 安裝 Vercel CLI
npm install -g vercel

# 登入
vercel login

# 部署
vercel
```

#### 方法 B：使用 GitHub 整合

1. 將程式碼推送到 GitHub
2. 在 Vercel Dashboard 點擊「New Project」
3. 選擇您的 repository
4. 點擊「Deploy」

### 4. 設定環境變數

在 Vercel Dashboard：

1. 進入您的專案
2. 點擊「Settings」→「Environment Variables」
3. 新增以下變數：

```
VAPID_PUBLIC_KEY=<從 .env.local 複製>
VAPID_PRIVATE_KEY=<從 .env.local 複製>
VAPID_SUBJECT=mailto:your-email@example.com
```

**重要**：`VAPID_SUBJECT` 請填寫您的 email

### 5. 設定 Vercel KV 資料庫

1. 在 Vercel Dashboard 進入「Storage」
2. 點擊「Create Database」
3. 選擇「KV」
4. 選擇免費方案
5. 資料庫會自動連結到您的專案

### 6. 更新前端的 VAPID 公鑰

編輯 `push-manager.js`：

```javascript
vapidPublicKey: 'YOUR_ACTUAL_PUBLIC_KEY_HERE',
```

將 `YOUR_ACTUAL_PUBLIC_KEY_HERE` 替換成您的 VAPID 公鑰。

### 7. 重新部署

```bash
vercel --prod
```

## ✅ 測試

1. 開啟部署後的網站
2. 點擊「🔔 啟用通知」
3. 允許通知權限
4. 設定一個幾分鐘後的提醒
5. **完全關閉網站**
6. 等待提醒時間到達
7. 您應該會收到推送通知！🎉

## 🔧 Vercel Cron 設定

Cron job 已經在 `vercel.json` 中設定：

```json
"crons": [
  {
    "path": "/api/send-notifications",
    "schedule": "* * * * *"
  }
]
```

這表示每分鐘執行一次通知檢查。

**注意**：Vercel 免費方案的 Cron 有以下限制：
- 每月 100 萬次執行（每分鐘執行 = 43,200 次/月，遠低於限制）
- Pro 方案才有保證準時執行

## 💰 費用

完全免費！使用：
- Vercel Hobby 方案（免費）
- Vercel KV 免費額度（足夠個人使用）
- Vercel Cron 免費額度

## 🐛 除錯

### 查看 Cron 執行記錄

1. Vercel Dashboard → 專案 → Deployments
2. 點擊最新的部署
3. 查看「Functions」分頁
4. 點擊 `send-notifications` 查看日誌

### 常見問題

**Q: 通知沒有收到？**
- 檢查 Vercel Functions 日誌
- 確認 Cron job 有在執行
- 確認環境變數設定正確
- 確認時段設定有啟用

**Q: 訂閱失敗？**
- 檢查 VAPID 公鑰是否正確填入 `push-manager.js`
- 檢查瀏覽器 Console 是否有錯誤
- 確認使用的是 HTTPS（或 localhost）

**Q: iOS Safari 不支援？**
- iOS 16.4+ 才支援 Web Push
- 需要「加入主畫面」後才能使用
- 部分功能可能受限

## 📱 平台支援

| 平台 | 支援狀況 |
|------|---------|
| Chrome (Desktop) | ✅ 完整支援 |
| Firefox (Desktop) | ✅ 完整支援 |
| Edge (Desktop) | ✅ 完整支援 |
| Safari (macOS 16+) | ✅ 完整支援 |
| Chrome (Android) | ✅ 完整支援 |
| Safari (iOS 16.4+) | ⚠️ 需加入主畫面 |

## 🔐 安全性

- VAPID 私鑰只存在伺服器端，永不暴露給前端
- 使用 HTTPS 加密傳輸
- 訂閱資料存在 Vercel KV（有加密）
- 符合 Web Push API 標準

## 📚 更多資源

- [Web Push API 文件](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
- [Vercel 文件](https://vercel.com/docs)
- [Vercel KV 文件](https://vercel.com/docs/storage/vercel-kv)
