#!/usr/bin/env node

/**
 * VAPID 金鑰生成腳本
 * 執行方式: node generate-vapid-keys.js
 */

const crypto = require('crypto');

function generateVAPIDKeys() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', {
    namedCurve: 'prime256v1',
    publicKeyEncoding: {
      type: 'spki',
      format: 'der'
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'der'
    }
  });

  const publicKeyBase64 = publicKey.toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  const privateKeyBase64 = privateKey.toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  return {
    publicKey: publicKeyBase64,
    privateKey: privateKeyBase64
  };
}

const keys = generateVAPIDKeys();

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
