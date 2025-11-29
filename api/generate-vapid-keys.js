#!/usr/bin/env node

/**
 * VAPID 金鑰生成腳本
 * 執行方式: node generate-vapid-keys.js
 */

const webpush = require('web-push');

// 使用 web-push 內建的 VAPID 金鑰生成方法
// 這確保金鑰格式與 web-push 完全相容
const keys = webpush.generateVAPIDKeys();

console.log('\n🔑 VAPID 金鑰已生成！\n');
console.log('請將以下內容加入 Vercel 環境變數：\n');
console.log('VAPID_PUBLIC_KEY=' + keys.publicKey);
console.log('VAPID_PRIVATE_KEY=' + keys.privateKey);
console.log('\n⚠️  請妥善保管私鑰，不要提交到 Git！\n');

// 也儲存到 .env.local 檔案以便本地測試
const fs = require('fs');
const envContent = `# VAPID Keys - DO NOT COMMIT TO GIT
VAPID_PUBLIC_KEY=${keys.publicKey}
VAPID_PRIVATE_KEY=${keys.privateKey}
VAPID_SUBJECT=mailto:your-email@example.com
`;

fs.writeFileSync('.env.local', envContent);
console.log('✅ 已儲存到 .env.local 檔案\n');
