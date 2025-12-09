// 測試腳本：列出所有可用的 Gemini 模型
// 使用方法：node test-gemini-models.js YOUR_API_KEY

const apiKey = process.argv[2];

if (!apiKey) {
  console.error('❌ 請提供 Gemini API Key');
  console.error('使用方法: node test-gemini-models.js YOUR_API_KEY');
  process.exit(1);
}

console.log('🔍 正在查詢可用的 Gemini 模型...\n');

fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`)
  .then(response => response.json())
  .then(data => {
    if (data.models) {
      console.log('✅ 可用的 Gemini 模型：\n');

      data.models
        .filter(model => model.supportedGenerationMethods?.includes('generateContent'))
        .forEach(model => {
          console.log(`📌 ${model.name}`);
          console.log(`   顯示名稱: ${model.displayName}`);
          console.log(`   描述: ${model.description}`);
          console.log(`   支援方法: ${model.supportedGenerationMethods.join(', ')}`);
          console.log('');
        });
    } else {
      console.error('❌ 錯誤:', data);
    }
  })
  .catch(error => {
    console.error('❌ 請求失敗:', error.message);
  });
