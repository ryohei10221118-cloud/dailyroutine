#!/usr/bin/env node

/**
 * VAPID 金鑰驗證腳本
 * 執行方式: node verify-vapid-keys.js
 */

const webpush = require('web-push');

console.log('\n🔍 驗證 VAPID 金鑰...\n');

// 檢查環境變數
const publicKey = process.env.VAPID_PUBLIC_KEY;
const privateKey = process.env.VAPID_PRIVATE_KEY;
const subject = process.env.VAPID_SUBJECT;

let hasErrors = false;

// 1. 檢查是否存在
if (!publicKey) {
  console.error('❌ VAPID_PUBLIC_KEY 未設定');
  hasErrors = true;
} else {
  console.log('✅ VAPID_PUBLIC_KEY 已設定');
}

if (!privateKey) {
  console.error('❌ VAPID_PRIVATE_KEY 未設定');
  hasErrors = true;
} else {
  console.log('✅ VAPID_PRIVATE_KEY 已設定');
}

if (!subject) {
  console.warn('⚠️  VAPID_SUBJECT 未設定 (將使用預設值)');
} else {
  console.log('✅ VAPID_SUBJECT 已設定:', subject);
}

// 2. 檢查公鑰格式和長度
if (publicKey) {
  try {
    // 將 base64url 轉換為 base64
    const base64 = publicKey
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    // 加上 padding
    const padding = '='.repeat((4 - base64.length % 4) % 4);
    const paddedBase64 = base64 + padding;

    // 解碼
    const decoded = Buffer.from(paddedBase64, 'base64');

    console.log(`\n📏 公鑰長度: ${decoded.length} bytes`);

    if (decoded.length === 65) {
      console.log('✅ 公鑰長度正確 (65 bytes - 未壓縮的 EC 公鑰)');
    } else if (decoded.length === 91) {
      console.log('✅ 公鑰長度正確 (91 bytes - SPKI 格式)');
    } else {
      console.error(`❌ 公鑰長度錯誤: ${decoded.length} bytes (應為 65 或 91 bytes)`);
      hasErrors = true;
    }
  } catch (error) {
    console.error('❌ 公鑰解碼失敗:', error.message);
    hasErrors = true;
  }
}

// 3. 嘗試設定 VAPID 詳情
if (publicKey && privateKey) {
  console.log('\n🧪 測試 setVapidDetails...');
  try {
    webpush.setVapidDetails(
      subject || 'mailto:test@example.com',
      publicKey,
      privateKey
    );
    console.log('✅ VAPID 金鑰驗證成功！');
  } catch (error) {
    console.error('❌ VAPID 金鑰驗證失敗:', error.message);
    hasErrors = true;
  }
}

// 4. 總結
console.log('\n' + '='.repeat(50));
if (hasErrors) {
  console.log('\n❌ 發現問題！請執行以下步驟：');
  console.log('\n1. 重新生成 VAPID 金鑰：');
  console.log('   node generate-vapid-keys.js');
  console.log('\n2. 更新 Vercel 環境變數：');
  console.log('   - 複製新生成的 VAPID_PUBLIC_KEY');
  console.log('   - 複製新生成的 VAPID_PRIVATE_KEY');
  console.log('   - 在 Vercel Dashboard 更新環境變數');
  console.log('\n3. 重新部署：');
  console.log('   vercel --prod\n');
  process.exit(1);
} else {
  console.log('\n✅ 所有檢查通過！VAPID 金鑰配置正確。\n');
  process.exit(0);
}
