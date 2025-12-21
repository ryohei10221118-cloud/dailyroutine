// ==========================================
// 新版保養助手 - 核心功能
// ==========================================

// 扩展现有App对象
if (typeof App !== 'undefined') {

    // ==========================================
    // 班表管理功能
    // ==========================================

    App.setupScheduleManagement = function() {
        // 班表类型切换
        document.querySelectorAll('input[name="scheduleType"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                const isShift = e.target.value === 'shift';
                document.getElementById('fixedScheduleSettings').style.display = isShift ? 'none' : 'block';
                document.getElementById('shiftScheduleSettings').style.display = isShift ? 'block' : 'none';
            });
        });

        // 保存班表设定
        document.getElementById('saveScheduleBtn')?.addEventListener('click', () => this.saveWorkSchedule());
    };

    App.saveWorkSchedule = function() {
        const scheduleType = document.querySelector('input[name="scheduleType"]:checked').value;
        const workdays = Array.from(document.querySelectorAll('.workday-check:checked')).map(cb => parseInt(cb.value));
        const wakeUpTime = document.getElementById('wakeUpTime').value;
        const leaveHomeTime = document.getElementById('leaveHomeTime').value;
        const bedTime = document.getElementById('bedTime').value;

        this.workSchedule = {
            type: scheduleType,
            workdays,
            wakeUpTime,
            leaveHomeTime,
            bedTime
        };

        this.saveData();
        alert('✅ 班表设定已保存！');
    };

    App.isWorkday = function(date = new Date()) {
        const weekday = date.getDay();
        return this.workSchedule.workdays.includes(weekday);
    };

    // ==========================================
    // 设置管理功能
    // ==========================================

    App.setupSettingsModal = function() {
        document.getElementById('settingsBtn')?.addEventListener('click', () => this.showSettingsModal());
        document.getElementById('saveSettingsBtn')?.addEventListener('click', () => this.saveSettings());
        document.getElementById('clearDataBtn')?.addEventListener('click', () => this.clearAllData());
    };

    App.showSettingsModal = function() {
        const modal = document.getElementById('settingsModal');

        // 加载当前设置
        document.getElementById('openaiApiKey').value = this.settings.openaiApiKey || '';
        document.getElementById('weatherApiKey').value = this.settings.weatherApiKey || '';
        document.getElementById('cityName').value = this.settings.cityName || 'Taipei';

        modal.classList.add('active');
    };

    App.saveSettings = function() {
        this.settings = {
            openaiApiKey: document.getElementById('openaiApiKey').value.trim(),
            weatherApiKey: document.getElementById('weatherApiKey').value.trim(),
            cityName: document.getElementById('cityName').value.trim() || 'Taipei'
        };

        this.saveData();
        document.getElementById('settingsModal').classList.remove('active');
        alert('✅ 设定已保存！');
    };

    App.clearAllData = function() {
        if (confirm('⚠️ 確定要清除所有資料嗎？此操作無法復原！')) {
            if (confirm('真的確定嗎？所有保養記錄、產品和設定都會被刪除！')) {
                localStorage.clear();
                location.reload();
            }
        }
    };

    // ==========================================
    // 天气API串接
    // ==========================================

    App.getWeather = async function() {
        const apiKey = this.settings.weatherApiKey;
        const city = this.settings.cityName;

        if (!apiKey) {
            // 没有API Key时返回模拟数据
            return {
                temp: 25,
                humidity: 65,
                condition: 'sunny',
                description: '晴天'
            };
        }

        try {
            const url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric&lang=zh_tw`;
            const response = await fetch(url);
            const data = await response.json();

            return {
                temp: Math.round(data.main.temp),
                humidity: data.main.humidity,
                condition: data.weather[0].main.toLowerCase(),
                description: data.weather[0].description
            };
        } catch (error) {
            console.error('获取天气失败:', error);
            return {
                temp: 25,
                humidity: 65,
                condition: 'unknown',
                description: '無法獲取天氣'
            };
        }
    };

    // ==========================================
    // AI 产品分析
    // ==========================================

    App.setupProductAIAnalysis = function() {
        document.getElementById('analyzeProductBtn')?.addEventListener('click', () => this.analyzeProduct());
    };

    App.analyzeProduct = async function() {
        const productName = document.getElementById('productName').value.trim();

        if (!productName) {
            alert('請先輸入產品名稱');
            return;
        }

        const btn = document.getElementById('analyzeProductBtn');
        btn.textContent = '分析中...';
        btn.disabled = true;

        try {
            const analysis = await this.callAIForProductAnalysis(productName);
            this.displayProductAnalysis(analysis);
        } catch (error) {
            alert('AI 分析失敗：' + error.message);
        } finally {
            btn.textContent = '🤖 AI 分析';
            btn.disabled = false;
        }
    };

    App.callAIForProductAnalysis = async function(productName) {
        const apiKey = this.settings.openaiApiKey;

        // 如果没有 API Key，使用简单的关键词匹配
        if (!apiKey) {
            return this.simpleProductAnalysis(productName);
        }

        // 使用 OpenAI API
        try {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: 'gpt-3.5-turbo',
                    messages: [{
                        role: 'user',
                        content: `分析這個保養品：${productName}
請以JSON格式回覆，包含以下資訊：
{
  "type": "產品類型(cleanser/toner/essence/serum/cream/sunscreen/mask/pad/treatment/other)",
  "areas": ["使用部位(face/tzone/cheeks/eye)"],
  "features": ["產品特性(hydrating/brightening/anti-aging/soothing/exfoliating/acne-treatment)"],
  "usage": "使用方法建議"
}`
                    }],
                    temperature: 0.3
                })
            });

            const data = await response.json();
            const content = data.choices[0].message.content;

            // 尝试解析 JSON
            try {
                return JSON.parse(content);
            } catch (e) {
                // 如果不是有效的 JSON，使用简单分析
                return this.simpleProductAnalysis(productName);
            }
        } catch (error) {
            console.error('AI API 调用失败:', error);
            return this.simpleProductAnalysis(productName);
        }
    };

    App.simpleProductAnalysis = function(productName) {
        const lower = productName.toLowerCase();
        const analysis = {
            type: 'other',
            areas: ['face'],
            features: [],
            usage: '請依照產品說明使用'
        };

        // 产品类型判断
        if (lower.includes('洗面') || lower.includes('cleanser') || lower.includes('潔面')) {
            analysis.type = 'cleanser';
            analysis.usage = '取適量搓揉起泡，溫和按摩臉部後清水洗淨';
        } else if (lower.includes('toner') || lower.includes('化妝水') || lower.includes('爽膚')) {
            analysis.type = 'toner';
            analysis.usage = '潔面後取適量，輕拍至吸收';
        } else if (lower.includes('精華') || lower.includes('essence') || lower.includes('serum')) {
            analysis.type = 'essence';
            analysis.usage = '2-3滴，均勻塗抹全臉';
        } else if (lower.includes('乳液') || lower.includes('面霜') || lower.includes('cream')) {
            analysis.type = 'cream';
            analysis.usage = '取適量均勻塗抹，鎖住水分';
        } else if (lower.includes('防曬') || lower.includes('sunscreen') || lower.includes('spf')) {
            analysis.type = 'sunscreen';
            analysis.usage = '出門前15分鐘塗抹，用量約兩指長';
        } else if (lower.includes('面膜') || lower.includes('mask')) {
            analysis.type = 'mask';
            analysis.usage = '敷10-15分鐘後取下';
        } else if (lower.includes('pad') || lower.includes('去角質')) {
            analysis.type = 'pad';
            analysis.usage = '輕輕擦拭全臉或局部';
        }

        // 特性判断
        if (lower.includes('保濕') || lower.includes('補水') || lower.includes('hydra')) {
            analysis.features.push('hydrating');
        }
        if (lower.includes('美白') || lower.includes('亮白') || lower.includes('bright')) {
            analysis.features.push('brightening');
        }
        if (lower.includes('抗老') || lower.includes('anti-aging') || lower.includes('緊緻')) {
            analysis.features.push('anti-aging');
        }
        if (lower.includes('舒緩') || lower.includes('鎮定') || lower.includes('sooth')) {
            analysis.features.push('soothing');
        }
        if (lower.includes('水楊酸') || lower.includes('角質') || lower.includes('exfol')) {
            analysis.features.push('exfoliating');
        }
        if (lower.includes('痘') || lower.includes('粉刺') || lower.includes('acne')) {
            analysis.features.push('acne-treatment');
        }

        // 使用部位判断
        if (lower.includes('眼') || lower.includes('eye')) {
            analysis.areas = ['eye'];
        } else if (lower.includes('t字') || lower.includes('t-zone')) {
            analysis.areas = ['tzone'];
        }

        return analysis;
    };

    App.displayProductAnalysis = function(analysis) {
        const resultDiv = document.getElementById('aiAnalysisResult');
        const contentDiv = document.getElementById('aiAnalysisContent');

        const typeMap = {
            'cleanser': '洗面乳',
            'toner': '化妝水/Toner',
            'essence': '精華液',
            'serum': '精華',
            'cream': '乳液/面霜',
            'sunscreen': '防曬',
            'mask': '面膜',
            'pad': 'Pad/去角質',
            'treatment': '治療性產品',
            'other': '其他'
        };

        const featureMap = {
            'hydrating': '保濕',
            'brightening': '美白',
            'anti-aging': '抗老',
            'soothing': '舒緩',
            'exfoliating': '去角質',
            'acne-treatment': '抗痘'
        };

        let html = `<p><strong>產品類型：</strong>${typeMap[analysis.type] || analysis.type}</p>`;

        if (analysis.features && analysis.features.length > 0) {
            html += `<p><strong>產品特性：</strong>${analysis.features.map(f => featureMap[f] || f).join('、')}</p>`;
        }

        if (analysis.usage) {
            html += `<p><strong>使用方法：</strong>${analysis.usage}</p>`;
        }

        contentDiv.innerHTML = html;
        resultDiv.style.display = 'block';

        // 自动填充表单
        if (analysis.type) {
            document.getElementById('productType').value = analysis.type;
        }

        if (analysis.areas) {
            document.querySelectorAll('.product-area').forEach(cb => {
                cb.checked = analysis.areas.includes(cb.value);
            });
        }

        if (analysis.features) {
            document.querySelectorAll('.product-feature').forEach(cb => {
                cb.checked = analysis.features.includes(cb.value);
            });
        }

        if (analysis.usage) {
            document.getElementById('productNotes').value = analysis.usage;
        }
    };

    // ==========================================
    // 增强的AI建议（整合天气和班表）
    // ==========================================

    App.generateEnhancedSuggestion = async function() {
        const productsText = document.getElementById('productsInput').value.trim();

        if (!productsText) {
            alert('請至少輸入您的保養品清單');
            return;
        }

        const btn = document.getElementById('generateSuggestBtn');
        btn.classList.add('generating');
        btn.textContent = '生成中...';
        btn.disabled = true;

        try {
            // 获取天气信息
            const weather = await this.getWeather();

            // 获取皮肤趋势
            const skinTrend = this.getSkinConditionTrend(7);

            // 获取今天是否为工作日
            const isWorkday = this.isWorkday();

            // 生成建议
            const suggestion = this.analyzeAndGenerateEnhancedSuggestion(
                productsText,
                weather,
                skinTrend,
                isWorkday
            );

            this.smartSuggestion = suggestion;
            this.displayEnhancedSuggestion(suggestion, weather, isWorkday);

            document.getElementById('smartSuggestResult').style.display = 'block';
            document.getElementById('applySuggestBtn').style.display = 'inline-block';
        } catch (error) {
            console.error('生成建议失败:', error);
            alert('生成建议失败：' + error.message);
        } finally {
            btn.classList.remove('generating');
            btn.textContent = '生成建議';
            btn.disabled = false;
        }
    };

    App.analyzeAndGenerateEnhancedSuggestion = function(productsText, weather, skinTrend, isWorkday) {
        const products = productsText.split('\n').filter(p => p.trim()).map(p => p.trim());
        const categorized = this.categorizeProducts(products);

        const suggestions = [];

        // 根据工作日/休假日和天气生成不同建议
        if (isWorkday) {
            // 工作日：简化快速的流程
            suggestions.push({
                title: '【工作日】簡化早間保養',
                time: this.workSchedule.wakeUpTime,
                steps: this.buildWorkdayMorningRoutine(categorized, weather, skinTrend)
            });

            suggestions.push({
                title: '【工作日】出門前防曬',
                time: this.workSchedule.leaveHomeTime,
                steps: this.buildSunscreenRoutine(categorized)
            });

            suggestions.push({
                title: '【工作日】晚間修護',
                time: this.workSchedule.bedTime,
                steps: this.buildWorkdayNightRoutine(categorized, weather, skinTrend)
            });
        } else {
            // 休假日：完整深度的保养
            suggestions.push({
                title: '【休假日】完整早間保養',
                time: this.workSchedule.wakeUpTime,
                steps: this.buildHolidayMorningRoutine(categorized, weather, skinTrend)
            });

            suggestions.push({
                title: '【休假日】深度晚間保養',
                time: this.workSchedule.bedTime,
                steps: this.buildHolidayNightRoutine(categorized, weather, skinTrend)
            });
        }

        return { suggestions, weather, isWorkday };
    };

    App.buildWorkdayMorningRoutine = function(products, weather, skinTrend) {
        const steps = ['快速清水洗臉'];

        if (products.toner.length > 0) {
            steps.push(products.toner[0] + ' - 1層即可');
        }

        if (products.essence.length > 0 && (weather.temp < 20 || skinTrend?.mainConditions.includes('dry'))) {
            steps.push(products.essence[0] + ' - 薄薄一層');
        }

        return steps;
    };

    App.buildHolidayMorningRoutine = function(products, weather, skinTrend) {
        const steps = [];

        if (products.cleanser.length > 0) {
            steps.push(products.cleanser[0] + ' - 溫和清潔');
        }

        if (products.toner.length > 0) {
            steps.push(products.toner[0] + ' - 2-3層');
        }

        if (products.essence.length > 0) {
            steps.push(products.essence[0] + ' - 充分塗抹');
        }

        if (products.mask.length > 0) {
            steps.push(products.mask[0] + ' - 10-15分鐘（可選）');
        }

        if (products.moisturizer.length > 0) {
            steps.push(products.moisturizer[0] + ' - 鎖住水分');
        }

        return steps;
    };

    App.buildWorkdayNightRoutine = function(products, weather, skinTrend) {
        const steps = [];

        if (products.cleanser.length > 0) {
            steps.push(products.cleanser[0] + ' - 卸妝清潔');
        }

        if (products.toner.length > 0) {
            steps.push(products.toner[0] + ' - 1-2層');
        }

        if (products.essence.length > 0) {
            steps.push(products.essence[0]);
        }

        if (products.moisturizer.length > 0) {
            steps.push(products.moisturizer[0]);
        }

        return steps;
    };

    App.buildHolidayNightRoutine = function(products, weather, skinTrend) {
        const steps = [];

        if (products.cleanser.length > 0) {
            steps.push(products.cleanser[0] + ' - 深層清潔');
        }

        if (products.treatment.length > 0) {
            steps.push(products.treatment[0] + ' - 治療性產品');
            steps.push('等待 10-15 分鐘');
        }

        if (products.toner.length > 0) {
            steps.push(products.toner[0] + ' - 2-3層');
        }

        if (products.essence.length > 0) {
            steps.push(products.essence[0] + ' - 充分吸收');
        }

        if (products.mask.length > 0) {
            steps.push(products.mask[0] + ' - 敷15-20分鐘');
        }

        if (products.moisturizer.length > 0) {
            steps.push(products.moisturizer[0] + ' - 厚敷鎖水');
        }

        return steps;
    };

    App.displayEnhancedSuggestion = function(suggestion, weather, isWorkday) {
        const container = document.getElementById('suggestResultContent');

        let html = `
            <div class="suggestion-context">
                <h4>🌤️ 當前環境資訊</h4>
                <p>天氣：${weather.description}　溫度：${weather.temp}°C　濕度：${weather.humidity}%</p>
                <p>今天是：${isWorkday ? '工作日 💼' : '休假日 🏖️'}</p>
            </div>
        `;

        suggestion.suggestions.forEach(item => {
            html += `
                <div class="suggest-routine-item">
                    <div class="suggest-routine-title">${item.title}</div>
                    <div class="suggest-routine-time">⏰ 建議時間：${item.time}</div>
                    <ol class="suggest-routine-steps">
                        ${item.steps.map(step => `<li>${step}</li>`).join('')}
                    </ol>
                </div>
            `;
        });

        container.innerHTML = html;
    };

    // ==========================================
    // 初始化新功能
    // ==========================================

    const originalInit = App.init;
    App.init = function() {
        originalInit.call(this);
        this.setupScheduleManagement();
        this.setupSettingsModal();
        this.setupProductAIAnalysis();
    };

    // 覆盖原有的 generateSmartSuggestion
    App.generateSmartSuggestion = function() {
        this.generateEnhancedSuggestion();
    };
}
