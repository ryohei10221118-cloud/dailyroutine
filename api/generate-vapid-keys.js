#!/usr/bin/env node

/**
 * VAPID 金鑰生成腳本
 * 使用 web-push 內建方法生成正確格式的金鑰
 */

const webpush = require('web-push');
const fs = require('fs');

// 使用 web-push 生成 VAPID 金鑰
const vapidKeys = webpush.generateVAPIDKeys();

console.log('\n🔑 VAPID 金鑰已生成！\n');
console.log('請將以下內容加入 Vercel 環境變數：\n');
console.log('VAPID_PUBLIC_KEY=' + vapidKeys.publicKey);
console.log('VAPID_PRIVATE_KEY=' + vapidKeys.privateKey);
console.log('\n⚠️  請妥善保管私鑰，不要提交到 Git！\n');

// 儲存到 .env.local 檔案以便本地測試
const envContent = `# VAPID Keys - DO NOT COMMIT TO GIT
VAPID_PUBLIC_KEY=${vapidKeys.publicKey}
VAPID_PRIVATE_KEY=${vapidKeys.privateKey}
VAPID_SUBJECT=mailto:your-email@example.com
`;

fs.writeFileSync('.env.local', envContent);
console.log('✅ 已儲存到 .env.local 檔案\n');
