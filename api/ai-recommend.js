// Vercel Serverless Function - AI 推薦代理
// 這個函數支援 Claude API 和 Gemini API

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

    // 🔍 自動識別 API 類型
    // Claude API key 格式: sk-ant-xxx
    // Gemini API key 格式: AIzaSyxxx
    const isGemini = apiKey.startsWith('AIzaSy');
    const isClaude = apiKey.startsWith('sk-ant-');

    console.log('API 類型:', isGemini ? 'Gemini' : isClaude ? 'Claude' : '未知');

    let response, data, recommendation;

    if (isGemini) {
      // ========== Gemini API ==========
      console.log('準備調用 Gemini API...');

      const geminiRequestBody = {
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2048,
        }
      };

      response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(geminiRequestBody)
      });

      console.log('Gemini API 回應狀態:', response.status);

      if (!response.ok) {
        let errorDetails;
        try {
          errorDetails = await response.json();
        } catch {
          errorDetails = await response.text();
        }

        console.error('Gemini API 錯誤詳情:', JSON.stringify(errorDetails, null, 2));

        return res.status(response.status).json({
          error: `Gemini API 錯誤: ${response.status}`,
          details: errorDetails,
          apiStatus: response.status
        });
      }

      data = await response.json();
      recommendation = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!recommendation) {
        console.error('Gemini API 回應格式異常:', data);
        return res.status(500).json({
          error: 'Gemini API 回應格式異常',
          details: data
        });
      }

    } else if (isClaude) {
      // ========== Claude API ==========
      console.log('準備調用 Claude API...');

      const claudeRequestBody = {
        model: 'claude-3-haiku-20240307',
        max_tokens: 2048,
        messages: [{
          role: 'user',
          content: prompt
        }]
      };

      response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json'
        },
        body: JSON.stringify(claudeRequestBody)
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

      data = await response.json();
      recommendation = data.content?.[0]?.text;

      if (!recommendation) {
        console.error('Claude API 回應格式異常:', data);
        return res.status(500).json({
          error: 'Claude API 回應格式異常',
          details: data
        });
      }

    } else {
      return res.status(400).json({
        error: '無法識別 API Key 格式',
        details: 'API Key 必須是 Claude (sk-ant-xxx) 或 Gemini (AIzaSyxxx) 格式'
      });
    }

    console.log('AI 推薦成功');

    // 返回 AI 回應
    res.status(200).json({
      success: true,
      recommendation: recommendation,
      apiType: isGemini ? 'gemini' : 'claude'
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
