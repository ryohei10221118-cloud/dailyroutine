// Vercel Serverless Function - AI 推薦代理
// 這個函數會接收前端請求，並代理到 Claude API

export default async function handler(req, res) {
  // 設置 CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // 處理 OPTIONS 請求
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 只允許 POST 請求
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { prompt, apiKey } = req.body;

    // 驗證參數
    if (!prompt || !apiKey) {
      return res.status(400).json({ error: '缺少必要參數' });
    }

    console.log('收到 AI 推薦請求');

    // 調用 Claude API
    const requestBody = {
      model: 'claude-3-haiku-20240307',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: prompt
      }]
    };

    console.log('準備調用 Claude API...');

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    console.log('Claude API 回應狀態:', response.status);

    if (!response.ok) {
      let errorDetails;
      try {
        errorDetails = await response.json();
      } catch {
        errorDetails = await response.text();
      }

      console.error('Claude API 錯誤詳情:', JSON.stringify(errorDetails, null, 2));

      return res.status(response.status).json({
        error: `Claude API 錯誤: ${response.status}`,
        details: errorDetails,
        apiStatus: response.status
      });
    }

    const data = await response.json();
    console.log('AI 推薦成功');

    // 返回 AI 回應
    res.status(200).json({
      success: true,
      recommendation: data.content[0].text
    });

  } catch (error) {
    console.error('AI 推薦失敗:', error);
    res.status(500).json({
      error: '伺服器錯誤',
      message: error.message,
      stack: error.stack
    });
  }
}
