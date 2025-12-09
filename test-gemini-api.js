// 測試 Gemini API 的正確格式
// 使用方法：node test-gemini-api.js YOUR_API_KEY [MODEL_NAME]

const apiKey = process.argv[2];
const modelName = process.argv[3] || 'gemini-2.0-flash';

if (!apiKey) {
  console.error('❌ 請提供 Gemini API Key');
  console.error('使用方法: node test-gemini-api.js YOUR_API_KEY [MODEL_NAME]');
  console.error('\n可選模型名稱:');
  console.error('  - gemini-2.0-flash (預設)');
  console.error('  - gemini-1.5-flash-latest');
  console.error('  - gemini-1.5-flash-8b');
  console.error('  - gemini-1.5-pro-latest');
  process.exit(1);
}

console.log(`🧪 測試 Gemini API`);
console.log(`📌 模型: ${modelName}`);
console.log(`🔑 API Key: ${apiKey.substring(0, 10)}...`);
console.log('');

const testPrompt = '請用繁體中文回答：什麼是保養？只需要一句話。';

const requestBody = {
  contents: [{
    parts: [{
      text: testPrompt
    }]
  }],
  generationConfig: {
    temperature: 0.7,
    maxOutputTokens: 100,
  }
};

const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

console.log(`🌐 請求 URL: ${url.replace(apiKey, 'HIDDEN')}`);
console.log('📤 請求內容:', JSON.stringify(requestBody, null, 2));
console.log('');

fetch(url, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(requestBody)
})
  .then(response => {
    console.log(`📊 HTTP 狀態: ${response.status} ${response.statusText}`);
    return response.json().then(data => ({ status: response.status, data }));
  })
  .then(({ status, data }) => {
    if (status === 200) {
      console.log('\n✅ API 呼叫成功！');
      console.log('\n📝 AI 回應:');
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) {
        console.log(text);
      } else {
        console.log('⚠️ 無法解析回應文字');
        console.log('完整回應:', JSON.stringify(data, null, 2));
      }
    } else {
      console.log('\n❌ API 呼叫失敗');
      console.log('\n錯誤詳情:');
      console.log(JSON.stringify(data, null, 2));

      // 提供除錯建議
      console.log('\n💡 除錯建議:');
      if (data.error?.message?.includes('not found')) {
        console.log('  • 模型名稱可能不正確，請嘗試其他模型');
        console.log('  • 執行以下命令查看可用模型:');
        console.log(`    node test-gemini-models.js ${apiKey}`);
      } else if (status === 403) {
        console.log('  • API Key 可能無效或沒有權限');
        console.log('  • 請檢查 Google AI Studio: https://aistudio.google.com/app/apikey');
      } else if (status === 429) {
        console.log('  • API 請求超過限制，請稍後再試');
      }
    }
  })
  .catch(error => {
    console.error('\n❌ 請求失敗:', error.message);
  });
