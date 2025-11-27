# 📱 安裝指南

## 快速開始（5 分鐘搞定）

### 步驟 1️⃣：準備圖標

應用需要兩個圖標檔案。您有三種選擇：

#### 選項 A：線上生成（最簡單）⭐

1. 訪問 https://favicon.io/favicon-converter/
2. 上傳 `icon.svg` 檔案（在專案目錄中）
3. 下載生成的圖標包
4. 解壓後找到以下檔案：
   - `android-chrome-192x192.png` → 重命名為 `icon-192.png`
   - `android-chrome-512x512.png` → 重命名為 `icon-512.png`
5. 將這兩個檔案放到專案根目錄

#### 選項 B：使用表情符號

1. 訪問 https://emojitopng.com/
2. 選擇 🧴 或 💆‍♀️ 表情符號
3. 分別生成 192x192 和 512x512 尺寸
4. 下載並重命名為 `icon-192.png` 和 `icon-512.png`

#### 選項 C：暫時跳過（測試用）

先創建佔位圖標，稍後再替換：
- 隨便找兩張圖片重命名為 `icon-192.png` 和 `icon-512.png`
- 應用可以正常使用，只是圖標不好看而已

---

### 步驟 2️⃣：啟動伺服器

您的電腦需要能夠提供 HTTP 伺服器。選擇以下任一方式：

#### 方式 A：使用 Python（Mac/Linux 內建）

```bash
# 在專案目錄中執行
cd /path/to/dailyroutine
python3 -m http.server 8000
```

#### 方式 B：使用 Node.js

```bash
# 需要先安裝 Node.js
npx http-server -p 8000
```

#### 方式 C：使用 VS Code

1. 安裝「Live Server」擴充功能
2. 右鍵點擊 `index.html`
3. 選擇「Open with Live Server」

---

### 步驟 3️⃣：在 iPhone 上訪問

1. **查找電腦 IP 位址**

   Mac/Linux:
   ```bash
   ifconfig | grep "inet "
   ```

   Windows:
   ```bash
   ipconfig
   ```

   找到類似 `192.168.1.100` 的 IP（不是 127.0.0.1）

2. **確保 iPhone 和電腦在同一 WiFi**

3. **在 iPhone Safari 中打開**
   ```
   http://192.168.1.100:8000
   ```
   （替換為您的實際 IP）

4. **測試功能是否正常**
   - 檢查頁面是否正確顯示
   - 點擊各個功能測試

---

### 步驟 4️⃣：安裝到主屏幕

1. 在 Safari 中，點擊分享按鈕 📤（底部中間）
2. 向下滾動，找到「加入主畫面螢幕」
3. 點擊「加入」
4. 應用圖標會出現在主屏幕上

✅ **完成！** 現在可以像原生 app 一樣使用了！

---

### 步驟 5️⃣：啟用通知

1. 打開剛安裝的應用
2. 點擊底部「🔔 啟用通知」按鈕
3. 在彈出視窗中選擇「允許」
4. 系統會發送一條測試通知

**重要提醒：**
- iOS 必須是 16.4 或更高版本
- 通知只在「加入主畫面」後才能使用
- 在 Safari 瀏覽器中打開無法接收通知

---

## 正式部署（推薦）

本地伺服器只能在家裡用，出門後就無法訪問。建議部署到網路：

### GitHub Pages（免費 + 簡單）

1. **上傳到 GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/您的用戶名/dailyroutine.git
   git push -u origin main
   ```

2. **啟用 GitHub Pages**
   - 到 Repository → Settings → Pages
   - Source 選擇 `main` 分支
   - 保存

3. **訪問您的應用**
   ```
   https://您的用戶名.github.io/dailyroutine/
   ```

4. **在 iPhone 上安裝**
   - 用 Safari 訪問上述網址
   - 按照步驟 4️⃣ 安裝到主屏幕

### Netlify（更快 + 自動部署）

1. 註冊 https://netlify.com
2. 連接 GitHub 帳號
3. 選擇 `dailyroutine` 倉庫
4. 點擊「Deploy」
5. 獲得網址，例如 `https://your-app.netlify.app`

### Vercel（同樣優秀）

1. 註冊 https://vercel.com
2. Import Git Repository
3. 選擇倉庫並部署
4. 獲得網址

**優點：**
- ✅ 隨時隨地訪問
- ✅ HTTPS 加密（必需）
- ✅ 自動更新（推送代碼即部署）
- ✅ 免費

---

## 故障排除

### 無法訪問本地伺服器？

1. **檢查防火牆**
   - Mac: 系統偏好設定 → 安全性與隱私 → 防火牆
   - 允許 Python/Node.js 通過防火牆

2. **確認 IP 正確**
   - 使用內網 IP（192.168.x.x 或 10.x.x.x）
   - 不要使用 localhost 或 127.0.0.1

3. **確認端口正確**
   - 網址包含 `:8000`
   - 例如：`http://192.168.1.100:8000`

### 收不到通知？

1. **檢查 iOS 版本**
   ```
   設定 → 一般 → 關於本機 → 軟體版本
   ```
   必須 ≥ 16.4

2. **檢查通知權限**
   ```
   設定 → 通知 → 保養提醒助手
   ```
   確保「允許通知」已開啟

3. **重新安裝 PWA**
   - 長按主屏幕圖標 → 刪除
   - 重新添加到主畫面
   - 重新授予通知權限

### 樣式或功能異常？

1. **清除緩存**
   - Safari 設定 → 清除歷史記錄與網站資料
   - 或重新添加到主畫面

2. **檢查檔案完整性**
   - 確保所有檔案都已上傳
   - 確保沒有語法錯誤

3. **查看控制台**
   - Safari → 開發 → iPhone → 您的應用
   - 查看錯誤訊息

---

## 更新應用

### 本地版本

1. 修改代碼
2. 刷新頁面即可看到更新

### 部署版本

1. 修改代碼並推送到 GitHub
   ```bash
   git add .
   git commit -m "Update features"
   git push
   ```

2. 等待幾分鐘自動部署

3. 在 iPhone 上：
   - 打開應用
   - 下拉刷新
   - 或刪除後重新安裝

---

## 需要幫助？

- 📖 查看 [README.md](README.md) 了解功能說明
- 🐛 遇到問題？檢查瀏覽器控制台錯誤訊息
- 💡 有建議？歡迎提出改進意見

**祝您使用愉快！💚**
