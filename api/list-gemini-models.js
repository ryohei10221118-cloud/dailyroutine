// Vercel Serverless Function - 列出可用的 Gemini 模型
// 訪問: /api/list-gemini-models?key=YOUR_API_KEY

export default async function handler(req, res) {
  // 設置 CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  const { key } = req.query;

  if (!key) {
    return res.status(400).json({
      error: '請提供 API Key',
      usage: '/api/list-gemini-models?key=YOUR_API_KEY'
    });
  }

  try {
    console.log('正在查詢可用的 Gemini 模型...');

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);

    if (!response.ok) {
      const errorData = await response.json();
      return res.status(response.status).json({
        error: 'Gemini API 錯誤',
        details: errorData
      });
    }

    const data = await response.json();

    // 只顯示支援 generateContent 的模型
    const contentModels = data.models
      .filter(model => model.supportedGenerationMethods?.includes('generateContent'))
      .map(model => ({
        name: model.name,
        displayName: model.displayName,
        description: model.description,
        // 提取模型 ID（去掉 "models/" 前綴）
        modelId: model.name.replace('models/', '')
      }));

    res.status(200).json({
      success: true,
      total: contentModels.length,
      models: contentModels,
      // 提供使用建議
      recommended: contentModels
        .filter(m => m.name.includes('gemini'))
        .slice(0, 5)
        .map(m => m.modelId)
    });

  } catch (error) {
    console.error('查詢失敗:', error);
    res.status(500).json({
      error: '伺服器錯誤',
      message: error.message
    });
  }
}
