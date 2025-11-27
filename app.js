// ==========================================
// 保養提醒助手 - 主要應用邏輯
// ==========================================

// 全局狀態管理
const App = {
    currentTab: 'today',
    currentRoutineId: null,
    currentSlotId: null,
    editingSlotId: null,
    editingProductId: null,
    notificationPermission: false,
    smartSuggestion: null,

    // 資料
    routines: {},
    products: {},
    timeSlots: [],
    history: [],

    // 初始化
    init() {
        this.loadData();
        this.initializeDefaultData();
        this.setupEventListeners();
        this.updateUI();
        this.checkNotificationPermission();
        this.scheduleNotifications();
    },

    // 載入本地資料
    loadData() {
        const saved = localStorage.getItem('skincareData');
        if (saved) {
            const data = JSON.parse(saved);
            this.routines = data.routines || {};
            this.products = data.products || {};
            this.timeSlots = data.timeSlots || [];
            this.history = data.history || [];
        }
    },

    // 保存資料
    saveData() {
        const data = {
            routines: this.routines,
            products: this.products,
            timeSlots: this.timeSlots,
            history: this.history
        };
        localStorage.setItem('skincareData', JSON.stringify(data));
    },

    // 初始化預設資料
    initializeDefaultData() {
        // 如果沒有資料，創建預設流程
        if (Object.keys(this.routines).length === 0) {
            this.createDefaultRoutines();
        }
        if (Object.keys(this.products).length === 0) {
            this.createDefaultProducts();
        }
        if (this.timeSlots.length === 0) {
            this.createDefaultTimeSlots();
        }
    },

    // 創建預設保養流程
    createDefaultRoutines() {
        this.routines = {
            'routine-a': {
                id: 'routine-a',
                name: '【A】起床重點保養（一般日）',
                type: 'morning-regular',
                steps: [
                    {
                        text: '洗面乳洗臉（用手洗）',
                        notes: '溫和清潔，不要過度摩擦',
                        product: 'cleanser'
                    },
                    {
                        text: '綠大罐 茶樹 Toner Pad',
                        notes: '全臉或以 T 字為主',
                        product: 'tea-tree-pad'
                    },
                    {
                        text: '白綠瓶 Ssuk Latte Cream Toner',
                        notes: '1–2 層',
                        product: 'ssuk-toner'
                    },
                    {
                        text: '綠滴管 積雪草精華',
                        notes: '均勻塗抹全臉',
                        product: 'centella-essence'
                    },
                    {
                        text: '乳液 / 面霜',
                        notes: '覺得會乾再加',
                        optional: true,
                        product: 'moisturizer'
                    }
                ]
            },

            'routine-a-bha': {
                id: 'routine-a-bha',
                name: '【A★】起床重點保養—水楊酸日',
                type: 'morning-bha',
                steps: [
                    {
                        text: '洗面乳洗臉 → 擦乾',
                        notes: '確保臉部完全乾燥',
                        product: 'cleanser'
                    },
                    {
                        text: '紫色 水楊酸 Pad',
                        notes: '只擦 T 字、下巴、粉刺區',
                        product: 'bha-pad',
                        area: 'T字部位'
                    },
                    {
                        text: '等待 5–10 分鐘',
                        notes: '讓水楊酸充分作用',
                        timer: 300,
                        timerMax: 600
                    },
                    {
                        text: '綠滴管 積雪草精華',
                        notes: '舒緩鎮定',
                        product: 'centella-essence'
                    },
                    {
                        text: '白綠瓶 Ssuk Toner',
                        notes: '1–2 層',
                        product: 'ssuk-toner'
                    },
                    {
                        text: '乳液 / 面霜',
                        notes: '需要時使用',
                        optional: true,
                        product: 'moisturizer'
                    }
                ],
                warnings: ['不使用茶樹 Pad', '避開眼周']
            },

            'routine-b': {
                id: 'routine-b',
                name: '【B】出公司前防曬',
                type: 'morning-sunscreen',
                steps: [
                    {
                        text: '視出油情況，用清水或洗面乳簡單洗臉',
                        notes: '輕柔清潔即可',
                        product: 'cleanser',
                        optional: true
                    },
                    {
                        text: '白綠瓶 Ssuk Toner',
                        notes: '薄薄一層',
                        product: 'ssuk-toner'
                    },
                    {
                        text: '綠滴管 積雪草精華',
                        notes: '可選',
                        optional: true,
                        product: 'centella-essence'
                    },
                    {
                        text: '白瓶 Feld apotheke 防曬 SPF42 PA++++',
                        notes: '臉＋脖子兩指長的量',
                        product: 'sunscreen',
                        amount: '兩指長'
                    }
                ]
            },

            'routine-c': {
                id: 'routine-c',
                name: '【C】睡前簡化保養',
                type: 'night-simple',
                steps: [
                    {
                        text: '洗面乳洗臉',
                        notes: '把防曬洗乾淨',
                        product: 'cleanser'
                    },
                    {
                        text: '白綠瓶 Ssuk Toner',
                        notes: '1–2 層',
                        product: 'ssuk-toner'
                    },
                    {
                        text: '綠滴管 積雪草精華',
                        notes: '修護舒緩',
                        product: 'centella-essence'
                    },
                    {
                        text: '乳液 / 面霜',
                        notes: '鎖住水分',
                        product: 'moisturizer'
                    }
                ],
                warnings: ['不使用水楊酸', '不使用茶樹 Pad']
            },

            'routine-c-mask-bright': {
                id: 'routine-c-mask-bright',
                name: '【C+Mask 亮白】睡前＋亮白保濕面膜',
                type: 'night-mask-bright',
                steps: [
                    {
                        text: '洗臉',
                        product: 'cleanser'
                    },
                    {
                        text: '白綠瓶 Ssuk Toner',
                        notes: '一層',
                        product: 'ssuk-toner'
                    },
                    {
                        text: 'Mediheal 玫瑰面膜 或 黃色軟面膜',
                        notes: '二選一',
                        product: 'mask-bright',
                        choices: ['Mediheal 玫瑰面膜', '黃色軟面膜']
                    },
                    {
                        text: '敷面膜 10–15 分鐘',
                        notes: '軟面膜洗掉，片狀面膜拍吸收',
                        timer: 600,
                        timerMax: 900
                    },
                    {
                        text: '積雪草精華＋乳液',
                        notes: '覺得還需要就再擦',
                        optional: true,
                        product: 'centella-essence'
                    }
                ]
            },

            'routine-c-mask-calm': {
                id: 'routine-c-mask-calm',
                name: '【C+Mask 鎮定】睡前＋鎮定修護面膜',
                type: 'night-mask-calm',
                steps: [
                    {
                        text: '洗臉',
                        product: 'cleanser'
                    },
                    {
                        text: '白綠瓶 Ssuk Toner',
                        notes: '一層',
                        product: 'ssuk-toner'
                    },
                    {
                        text: 'Mediheal 積雪草面膜 或 綠色軟面膜',
                        notes: '二選一，同樣 10–15 分鐘',
                        product: 'mask-calm',
                        choices: ['Mediheal 積雪草面膜', '綠色軟面膜'],
                        timer: 600,
                        timerMax: 900
                    },
                    {
                        text: '積雪草精華＋乳液收尾',
                        product: 'centella-essence'
                    }
                ]
            },

            'routine-c-mask-pore': {
                id: 'routine-c-mask-pore',
                name: '【C+Mask 毛孔】睡前＋紫色毛孔軟面膜',
                type: 'night-mask-pore',
                steps: [
                    {
                        text: '洗臉',
                        product: 'cleanser'
                    },
                    {
                        text: '白綠瓶 Ssuk Toner',
                        notes: '一層',
                        product: 'ssuk-toner'
                    },
                    {
                        text: '紫色軟面膜',
                        notes: '厚塗在 T 字、鼻翼、下巴（兩頰不要）',
                        product: 'mask-pore',
                        area: 'T字部位',
                        timer: 600,
                        timerMax: 900
                    },
                    {
                        text: '10–15 分鐘後洗掉 / 擦掉',
                        notes: '溫水清洗'
                    },
                    {
                        text: '綠滴管 積雪草精華',
                        product: 'centella-essence'
                    },
                    {
                        text: '乳液 / 面霜',
                        product: 'moisturizer'
                    }
                ],
                warnings: ['一週最多一次', '避開兩頰敏感區域']
            },

            'routine-sunday': {
                id: 'routine-sunday',
                name: '【週日修護】超溫和保養',
                type: 'sunday-gentle',
                steps: [
                    {
                        text: '洗臉',
                        notes: '溫和清潔',
                        product: 'cleanser'
                    },
                    {
                        text: 'Ssuk Toner',
                        product: 'ssuk-toner'
                    },
                    {
                        text: '積雪草精華',
                        product: 'centella-essence'
                    },
                    {
                        text: '乳液',
                        product: 'moisturizer'
                    }
                ],
                warnings: ['茶樹 Pad 暫停一天', '讓肌膚休息']
            }
        };

        this.saveData();
    },

    // 創建預設產品
    createDefaultProducts() {
        this.products = {
            'cleanser': {
                id: 'cleanser',
                name: '洗面乳',
                type: 'cleanser',
                icon: '🧼',
                usage: '溫水打濕臉部，取適量輕柔按摩，避免過度摩擦'
            },
            'tea-tree-pad': {
                id: 'tea-tree-pad',
                name: '綠大罐 茶樹 Toner Pad',
                type: 'pad',
                icon: '🌿',
                usage: '全臉或以 T 字為主，輕輕擦拭'
            },
            'bha-pad': {
                id: 'bha-pad',
                name: '紫色 水楊酸 Pad',
                type: 'pad',
                icon: '💜',
                usage: '只擦 T 字、下巴、粉刺區，等待 5-10 分鐘',
                frequency: '一週兩次'
            },
            'ssuk-toner': {
                id: 'ssuk-toner',
                name: '白綠瓶 Ssuk Latte Cream Toner',
                type: 'toner',
                icon: '🍶',
                usage: '1-2 層，輕拍至吸收'
            },
            'centella-essence': {
                id: 'centella-essence',
                name: '綠滴管 積雪草精華',
                type: 'essence',
                icon: '💧',
                usage: '2-3 滴，均勻塗抹全臉'
            },
            'moisturizer': {
                id: 'moisturizer',
                name: '乳液 / 面霜',
                type: 'cream',
                icon: '🧴',
                usage: '黃豆大小，由內而外塗抹'
            },
            'sunscreen': {
                id: 'sunscreen',
                name: '白瓶 Feld apotheke 防曬 SPF42 PA++++',
                type: 'sunscreen',
                icon: '☀️',
                usage: '臉＋脖子兩指長的量，出門前 15 分鐘擦'
            },
            'mask-bright': {
                id: 'mask-bright',
                name: 'Mediheal 玫瑰面膜 / 黃色軟面膜',
                type: 'mask',
                icon: '🌸',
                usage: '10-15 分鐘，軟面膜洗掉，片狀拍吸收'
            },
            'mask-calm': {
                id: 'mask-calm',
                name: 'Mediheal 積雪草面膜 / 綠色軟面膜',
                type: 'mask',
                icon: '🌱',
                usage: '10-15 分鐘，鎮定修護'
            },
            'mask-pore': {
                id: 'mask-pore',
                name: '紫色毛孔軟面膜',
                type: 'mask',
                icon: '💜',
                usage: 'T 字部位厚塗，10-15 分鐘後洗掉',
                frequency: '一週最多一次'
            }
        };

        this.saveData();
    },

    // 創建預設時段（基於使用者的一週排程）
    createDefaultTimeSlots() {
        this.timeSlots = [
            // 週一
            { id: 'slot-mon-morning', name: '起床保養', time: '20:30', routine: 'routine-a-bha', weekdays: [1], enabled: true },
            { id: 'slot-mon-sunscreen', name: '出門防曬', time: '07:30', routine: 'routine-b', weekdays: [1], enabled: true },
            { id: 'slot-mon-night', name: '睡前保養', time: '22:00', routine: 'routine-c', weekdays: [1], enabled: true },

            // 週二
            { id: 'slot-tue-morning', name: '起床保養', time: '20:30', routine: 'routine-a', weekdays: [2], enabled: true },
            { id: 'slot-tue-sunscreen', name: '出門防曬', time: '07:30', routine: 'routine-b', weekdays: [2], enabled: true },
            { id: 'slot-tue-night', name: '睡前保養＋亮白面膜', time: '22:00', routine: 'routine-c-mask-bright', weekdays: [2], enabled: true },

            // 週三
            { id: 'slot-wed-morning', name: '起床保養', time: '20:30', routine: 'routine-a', weekdays: [3], enabled: true },
            { id: 'slot-wed-sunscreen', name: '出門防曬', time: '07:30', routine: 'routine-b', weekdays: [3], enabled: true },
            { id: 'slot-wed-night', name: '睡前保養', time: '22:00', routine: 'routine-c', weekdays: [3], enabled: true },

            // 週四
            { id: 'slot-thu-morning', name: '起床保養', time: '20:30', routine: 'routine-a-bha', weekdays: [4], enabled: true },
            { id: 'slot-thu-sunscreen', name: '出門防曬', time: '07:30', routine: 'routine-b', weekdays: [4], enabled: true },
            { id: 'slot-thu-night', name: '睡前保養', time: '22:00', routine: 'routine-c', weekdays: [4], enabled: true },

            // 週五
            { id: 'slot-fri-morning', name: '起床保養', time: '20:30', routine: 'routine-a', weekdays: [5], enabled: true },
            { id: 'slot-fri-sunscreen', name: '出門防曬', time: '07:30', routine: 'routine-b', weekdays: [5], enabled: true },
            { id: 'slot-fri-night', name: '睡前保養＋鎮定面膜', time: '22:00', routine: 'routine-c-mask-calm', weekdays: [5], enabled: true },

            // 週六
            { id: 'slot-sat-morning', name: '起床保養', time: '20:30', routine: 'routine-a', weekdays: [6], enabled: true },
            { id: 'slot-sat-sunscreen', name: '出門防曬', time: '07:30', routine: 'routine-b', weekdays: [6], enabled: true },
            { id: 'slot-sat-night', name: '睡前保養＋毛孔面膜', time: '22:00', routine: 'routine-c-mask-pore', weekdays: [6], enabled: true },

            // 週日
            { id: 'slot-sun-morning', name: '起床保養（溫和）', time: '20:30', routine: 'routine-sunday', weekdays: [0], enabled: true },
            { id: 'slot-sun-sunscreen', name: '出門防曬', time: '07:30', routine: 'routine-b', weekdays: [0], enabled: true },
            { id: 'slot-sun-night', name: '睡前保養', time: '22:00', routine: 'routine-c', weekdays: [0], enabled: true }
        ];

        this.saveData();
    }
};

// 繼續 App 物件的其他方法...
App.setupEventListeners = function() {
    // 標籤頁切換
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            this.switchTab(e.target.dataset.tab);
        });
    });

    // 模態框關閉
    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.target.closest('.modal').classList.remove('active');
        });
    });

    // 時段管理
    document.getElementById('addTimeSlotBtn')?.addEventListener('click', () => this.showTimeSlotModal());
    document.getElementById('saveSlotBtn')?.addEventListener('click', () => this.saveTimeSlot());
    document.getElementById('cancelSlotBtn')?.addEventListener('click', () => {
        document.getElementById('timeSlotModal').classList.remove('active');
    });

    // 產品管理
    document.getElementById('addProductBtn')?.addEventListener('click', () => this.showProductModal());
    document.getElementById('saveProductBtn')?.addEventListener('click', () => this.saveProduct());
    document.getElementById('cancelProductBtn')?.addEventListener('click', () => {
        document.getElementById('productModal').classList.remove('active');
    });

    // 通知權限
    document.getElementById('notificationBtn')?.addEventListener('click', () => this.requestNotificationPermission());

    // 完成流程
    document.getElementById('completeRoutineBtn')?.addEventListener('click', () => this.completeRoutine());

    // 關閉流程詳情
    document.getElementById('closeRoutineBtn')?.addEventListener('click', () => this.closeRoutineDetail());

    // 智能建議
    document.getElementById('smartSuggestBtn')?.addEventListener('click', () => this.showSmartSuggestModal());
    document.getElementById('generateSuggestBtn')?.addEventListener('click', () => this.generateSmartSuggestion());
    document.getElementById('applySuggestBtn')?.addEventListener('click', () => this.applySmartSuggestion());
    document.getElementById('mergeRoutinesBtn')?.addEventListener('click', () => this.applySuggestionMerge());
    document.getElementById('replaceRoutinesBtn')?.addEventListener('click', () => this.applySuggestionReplace());
};

App.switchTab = function(tabName) {
    this.currentTab = tabName;

    // 更新標籤按鈕
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabName);
    });

    // 更新內容區
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.toggle('active', content.id === `${tabName}-tab`);
    });

    // 更新對應標籤的內容
    if (tabName === 'today') this.updateTodayView();
    if (tabName === 'schedule') this.updateScheduleView();
    if (tabName === 'products') this.updateProductsView();
    if (tabName === 'history') this.updateHistoryView();
};

App.updateUI = function() {
    // 更新日期
    const now = new Date();
    const dateStr = now.toLocaleDateString('zh-TW', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long'
    });
    document.getElementById('currentDate').textContent = dateStr;

    // 更新當前標籤
    this.switchTab(this.currentTab);
};

App.updateTodayView = function() {
    const now = new Date();
    const weekday = now.getDay();
    const weekdayNames = ['週日', '週一', '週二', '週三', '週四', '週五', '週六'];
    const today = now.toDateString();

    // 更新星期標題
    const dayType = document.getElementById('dayType');
    const todaySlots = this.timeSlots.filter(slot =>
        slot.enabled && slot.weekdays.includes(weekday)
    );

    // 檢查是否為水楊酸日
    const isBHADay = todaySlots.some(slot => slot.routine === 'routine-a-bha');
    dayType.textContent = `${weekdayNames[weekday]} ${isBHADay ? '⭐ 水楊酸日' : ''}`;

    // 渲染今日時間軸
    const timeline = document.getElementById('todayTimeline');
    timeline.innerHTML = '';

    todaySlots.sort((a, b) => a.time.localeCompare(b.time)).forEach(slot => {
        const routine = this.routines[slot.routine];
        if (!routine) return;

        // 檢查今天這個時段是否已完成
        const isCompleted = this.history.some(record => {
            const recordDate = new Date(record.date).toDateString();
            return recordDate === today && record.slotId === slot.id && record.completed;
        });

        const item = document.createElement('div');
        item.className = 'timeline-item' + (isCompleted ? ' completed' : '');
        item.innerHTML = `
            <div class="timeline-time">${slot.time}</div>
            <div class="timeline-title">${slot.name}</div>
            <div class="timeline-desc">${routine.name}</div>
            <span class="timeline-status ${isCompleted ? 'completed' : 'pending'}">${isCompleted ? '✓ 已完成' : '待執行'}</span>
        `;

        item.addEventListener('click', () => this.showRoutineDetail(slot.routine, slot.id));
        timeline.appendChild(item);
    });
};

App.showRoutineDetail = function(routineId, slotId = null) {
    const routine = this.routines[routineId];
    if (!routine) return;

    this.currentRoutineId = routineId;
    this.currentSlotId = slotId;
    const container = document.getElementById('currentRoutine');
    const title = container.querySelector('.routine-title');
    const stepsList = container.querySelector('.steps-list');

    title.textContent = routine.name;
    stepsList.innerHTML = '';

    routine.steps.forEach((step, index) => {
        const stepDiv = document.createElement('div');
        stepDiv.className = 'step-item';

        let stepHTML = `
            <input type="checkbox" class="step-checkbox" data-step="${index}">
            <div class="step-content">
                <div class="step-number">步驟 ${index + 1}</div>
                <div class="step-text">${step.text}</div>
        `;

        if (step.notes) {
            stepHTML += `<div class="step-note">💡 ${step.notes}</div>`;
        }

        if (step.optional) {
            stepHTML += `<div class="step-note">（可選步驟）</div>`;
        }

        if (step.timer) {
            const minutes = Math.floor(step.timer / 60);
            const maxMinutes = step.timerMax ? Math.floor(step.timerMax / 60) : minutes;
            stepHTML += `<div class="step-timer">⏱ ${minutes}${maxMinutes > minutes ? '-' + maxMinutes : ''} 分鐘</div>`;
        }

        if (step.area) {
            stepHTML += `<div class="step-note">📍 ${step.area}</div>`;
        }

        stepHTML += `</div>`;
        stepDiv.innerHTML = stepHTML;

        stepsList.appendChild(stepDiv);
    });

    if (routine.warnings && routine.warnings.length > 0) {
        const warningDiv = document.createElement('div');
        warningDiv.style.cssText = 'background: #FFF3E0; padding: 12px; border-radius: 8px; margin-top: 15px;';
        warningDiv.innerHTML = `
            <div style="color: #F57C00; font-weight: 600; margin-bottom: 5px;">⚠️ 注意事項</div>
            ${routine.warnings.map(w => `<div style="color: #E65100; font-size: 14px;">• ${w}</div>`).join('')}
        `;
        stepsList.appendChild(warningDiv);
    }

    container.style.display = 'block';
    container.scrollIntoView({ behavior: 'smooth' });
};

App.closeRoutineDetail = function() {
    document.getElementById('currentRoutine').style.display = 'none';
    this.currentRoutineId = null;
    this.currentSlotId = null;
};

App.completeRoutine = function() {
    if (!this.currentRoutineId) return;

    const routine = this.routines[this.currentRoutineId];
    const now = new Date();

    // 記錄到歷史
    this.history.unshift({
        id: 'history-' + Date.now(),
        routineId: this.currentRoutineId,
        routineName: routine.name,
        slotId: this.currentSlotId,
        date: now.toISOString(),
        completed: true
    });

    // 只保留最近 100 條記錄
    if (this.history.length > 100) {
        this.history = this.history.slice(0, 100);
    }

    this.saveData();

    // 顯示完成訊息
    alert('✅ 保養流程已完成！');

    // 隱藏流程詳情
    this.closeRoutineDetail();

    // 更新今日視圖（會標記已完成）
    this.updateTodayView();
};

App.updateScheduleView = function() {
    const list = document.getElementById('timeSlotsList');
    list.innerHTML = '';

    // 按時間排序
    const sortedSlots = [...this.timeSlots].sort((a, b) => a.time.localeCompare(b.time));

    sortedSlots.forEach(slot => {
        const routine = this.routines[slot.routine];
        const weekdayNames = ['日', '一', '二', '三', '四', '五', '六'];
        const daysText = slot.weekdays.map(d => weekdayNames[d]).join('、');

        const card = document.createElement('div');
        card.className = 'time-slot-card';
        card.innerHTML = `
            <div class="slot-info">
                <div class="slot-time">${slot.time}</div>
                <div class="slot-name">${slot.name}</div>
                <div class="slot-days">週${daysText} | ${routine ? routine.name : '未設定'}</div>
            </div>
            <div class="slot-actions">
                <button class="btn-icon edit" data-id="${slot.id}">✏️</button>
                <button class="btn-icon delete" data-id="${slot.id}">🗑️</button>
            </div>
        `;

        card.querySelector('.edit').addEventListener('click', () => this.editTimeSlot(slot.id));
        card.querySelector('.delete').addEventListener('click', () => this.deleteTimeSlot(slot.id));

        list.appendChild(card);
    });

    // 更新週間排程視圖
    this.updateWeeklyScheduleView();
};

App.updateWeeklyScheduleView = function() {
    const container = document.getElementById('weeklyScheduleView');
    const weekdayNames = ['週日', '週一', '週二', '週三', '週四', '週五', '週六'];

    container.innerHTML = '';

    for (let day = 0; day < 7; day++) {
        const daySlots = this.timeSlots.filter(slot => slot.weekdays.includes(day));

        if (daySlots.length === 0) continue;

        const dayDiv = document.createElement('div');
        dayDiv.className = 'week-day';
        dayDiv.innerHTML = `
            <div class="week-day-name">${weekdayNames[day]}</div>
            <div class="week-routines">
                ${daySlots.sort((a, b) => a.time.localeCompare(b.time))
                    .map(slot => `• ${slot.time} ${slot.name}`)
                    .join('<br>')}
            </div>
        `;

        container.appendChild(dayDiv);
    }
};

App.showTimeSlotModal = function(slotId = null) {
    this.editingSlotId = slotId;
    const modal = document.getElementById('timeSlotModal');

    // 填充流程選項
    const routineSelect = document.getElementById('slotRoutine');
    routineSelect.innerHTML = '<option value="">選擇流程...</option>';
    Object.values(this.routines).forEach(routine => {
        routineSelect.innerHTML += `<option value="${routine.id}">${routine.name}</option>`;
    });

    if (slotId) {
        const slot = this.timeSlots.find(s => s.id === slotId);
        if (slot) {
            document.getElementById('slotName').value = slot.name;
            document.getElementById('slotTime').value = slot.time;
            document.getElementById('slotRoutine').value = slot.routine;

            // 設定星期選擇
            document.querySelectorAll('.weekday-selector input').forEach(input => {
                input.checked = slot.weekdays.includes(parseInt(input.value));
            });
        }
    } else {
        document.getElementById('slotName').value = '';
        document.getElementById('slotTime').value = '';
        document.getElementById('slotRoutine').value = '';
        document.querySelectorAll('.weekday-selector input').forEach(input => {
            input.checked = false;
        });
    }

    modal.classList.add('active');
};

App.saveTimeSlot = function() {
    const name = document.getElementById('slotName').value.trim();
    const time = document.getElementById('slotTime').value;
    const routine = document.getElementById('slotRoutine').value;

    if (!name || !time || !routine) {
        alert('請填寫所有必填欄位');
        return;
    }

    const weekdays = Array.from(document.querySelectorAll('.weekday-selector input:checked'))
        .map(input => parseInt(input.value));

    if (weekdays.length === 0) {
        alert('請至少選擇一個重複日期');
        return;
    }

    if (this.editingSlotId) {
        const slot = this.timeSlots.find(s => s.id === this.editingSlotId);
        if (slot) {
            slot.name = name;
            slot.time = time;
            slot.routine = routine;
            slot.weekdays = weekdays;
        }
    } else {
        this.timeSlots.push({
            id: 'slot-' + Date.now(),
            name,
            time,
            routine,
            weekdays,
            enabled: true
        });
    }

    this.saveData();
    this.updateScheduleView();
    document.getElementById('timeSlotModal').classList.remove('active');
    this.scheduleNotifications();
};

App.editTimeSlot = function(slotId) {
    this.showTimeSlotModal(slotId);
};

App.deleteTimeSlot = function(slotId) {
    if (confirm('確定要刪除此時段嗎？')) {
        this.timeSlots = this.timeSlots.filter(s => s.id !== slotId);
        this.saveData();
        this.updateScheduleView();
    }
};

App.updateProductsView = function() {
    const grid = document.getElementById('productsList');
    grid.innerHTML = '';

    Object.values(this.products).forEach(product => {
        const card = document.createElement('div');
        card.className = 'product-card';
        card.innerHTML = `
            <div class="product-icon">${product.icon || '🧴'}</div>
            <div class="product-name">${product.name}</div>
            <div class="product-type">${this.getProductTypeName(product.type)}</div>
            ${product.frequency ? `<div class="product-stock">${product.frequency}</div>` : ''}
        `;

        card.addEventListener('click', () => this.showProductDetail(product.id));
        grid.appendChild(card);
    });
};

App.getProductTypeName = function(type) {
    const types = {
        'cleanser': '洗面乳',
        'toner': '化妝水',
        'essence': '精華液',
        'cream': '乳液/面霜',
        'sunscreen': '防曬',
        'mask': '面膜',
        'pad': 'Pad',
        'other': '其他'
    };
    return types[type] || type;
};

App.showProductDetail = function(productId) {
    const product = this.products[productId];
    if (!product) return;

    alert(`${product.icon} ${product.name}\n\n使用方式：\n${product.usage || '無'}\n\n${product.frequency ? '使用頻率：' + product.frequency : ''}`);
};

App.showProductModal = function(productId = null) {
    this.editingProductId = productId;
    const modal = document.getElementById('productModal');

    if (productId) {
        const product = this.products[productId];
        if (product) {
            document.getElementById('productName').value = product.name;
            document.getElementById('productType').value = product.type;
            document.getElementById('productNotes').value = product.usage || '';
            document.getElementById('productStock').value = product.stock || '';
        }
    } else {
        document.getElementById('productName').value = '';
        document.getElementById('productType').value = 'other';
        document.getElementById('productNotes').value = '';
        document.getElementById('productStock').value = '';
    }

    modal.classList.add('active');
};

App.saveProduct = function() {
    const name = document.getElementById('productName').value.trim();
    const type = document.getElementById('productType').value;
    const usage = document.getElementById('productNotes').value.trim();
    const stock = document.getElementById('productStock').value;

    if (!name) {
        alert('請輸入產品名稱');
        return;
    }

    const productId = this.editingProductId || 'product-' + Date.now();

    this.products[productId] = {
        id: productId,
        name,
        type,
        usage,
        stock: stock ? parseInt(stock) : null,
        icon: this.getProductIcon(type)
    };

    this.saveData();
    this.updateProductsView();
    document.getElementById('productModal').classList.remove('active');
};

App.getProductIcon = function(type) {
    const icons = {
        'cleanser': '🧼',
        'toner': '🍶',
        'essence': '💧',
        'cream': '🧴',
        'sunscreen': '☀️',
        'mask': '🎭',
        'pad': '🌿',
        'other': '🧪'
    };
    return icons[type] || '🧴';
};

App.updateHistoryView = function() {
    const historyList = document.getElementById('historyList');
    const last30Days = this.history.slice(0, 30);

    historyList.innerHTML = '';

    if (last30Days.length === 0) {
        historyList.innerHTML = '<div style="text-align: center; color: #999; padding: 40px;">尚無使用記錄</div>';
        return;
    }

    last30Days.forEach(record => {
        const date = new Date(record.date);
        const dateStr = date.toLocaleDateString('zh-TW', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

        const item = document.createElement('div');
        item.className = 'history-item';
        item.innerHTML = `
            <div>
                <div class="history-routine">${record.routineName}</div>
                <div class="history-date">${dateStr}</div>
            </div>
            <span class="history-status ${record.completed ? 'completed' : 'skipped'}">
                ${record.completed ? '✓ 已完成' : '跳過'}
            </span>
        `;

        historyList.appendChild(item);
    });

    // 更新統計
    this.updateStats();
};

App.updateStats = function() {
    const last7Days = this.history.filter(record => {
        const recordDate = new Date(record.date);
        const daysDiff = (Date.now() - recordDate.getTime()) / (1000 * 60 * 60 * 24);
        return daysDiff <= 7;
    });

    const completedCount = last7Days.filter(r => r.completed).length;
    const totalCount = last7Days.length;
    const completionRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    // 計算連續天數
    let streak = 0;
    const today = new Date().toDateString();
    let checkDate = new Date();

    for (let i = 0; i < 30; i++) {
        const dateStr = checkDate.toDateString();
        const hasRecord = this.history.some(r =>
            new Date(r.date).toDateString() === dateStr && r.completed
        );

        if (hasRecord) {
            streak++;
        } else if (dateStr !== today) {
            break;
        }

        checkDate.setDate(checkDate.getDate() - 1);
    }

    document.getElementById('streakDays').textContent = streak;
    document.getElementById('completionRate').textContent = completionRate + '%';
    document.getElementById('totalRoutines').textContent = this.history.filter(r => r.completed).length;
};

App.checkNotificationPermission = function() {
    if ('Notification' in window) {
        this.notificationPermission = Notification.permission === 'granted';
        const btn = document.getElementById('notificationBtn');
        if (this.notificationPermission) {
            btn.textContent = '🔔 通知已啟用';
            btn.classList.add('enabled');
        }
    }
};

App.requestNotificationPermission = async function() {
    if (!('Notification' in window)) {
        alert('您的瀏覽器不支持通知功能');
        return;
    }

    if (Notification.permission === 'granted') {
        alert('通知權限已啟用！');
        return;
    }

    const permission = await Notification.requestPermission();

    if (permission === 'granted') {
        this.notificationPermission = true;
        const btn = document.getElementById('notificationBtn');
        btn.textContent = '🔔 通知已啟用';
        btn.classList.add('enabled');

        // 顯示測試通知
        new Notification('保養提醒助手', {
            body: '通知已成功啟用！我會準時提醒您保養 💚',
            icon: '/icon-192.png'
        });

        this.scheduleNotifications();
    } else {
        alert('請在設定中允許通知權限，才能收到提醒喔！');
    }
};

App.scheduleNotifications = function() {
    if (!this.notificationPermission) return;

    // 清除現有的通知計時器（簡化版本，實際需要更複雜的管理）
    // 為每個時段設置通知
    this.timeSlots.forEach(slot => {
        if (!slot.enabled) return;

        const routine = this.routines[slot.routine];
        if (!routine) return;

        // 計算下次觸發時間
        const now = new Date();
        const [hours, minutes] = slot.time.split(':');

        slot.weekdays.forEach(weekday => {
            const nextDate = new Date();
            nextDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);

            // 如果今天已經過了這個時間，找下一個符合的日期
            let daysToAdd = (weekday - now.getDay() + 7) % 7;
            if (daysToAdd === 0 && now.getTime() > nextDate.getTime()) {
                daysToAdd = 7;
            }

            nextDate.setDate(nextDate.getDate() + daysToAdd);

            // 註冊 Service Worker 通知（簡化版）
            if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
                navigator.serviceWorker.controller.postMessage({
                    type: 'SCHEDULE_NOTIFICATION',
                    time: nextDate.toISOString(),
                    title: slot.name,
                    body: routine.name,
                    routineId: routine.id
                });
            }
        });
    });
};

// 初始化應用
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});

// ==========================================
// 智能建議功能
// ==========================================

App.showSmartSuggestModal = function() {
    const modal = document.getElementById('smartSuggestModal');

    // 重置表單
    document.getElementById('productsInput').value = '';
    document.getElementById('scheduleInput').value = '';
    document.getElementById('skinConcernsInput').value = '';
    document.getElementById('smartSuggestResult').style.display = 'none';
    document.getElementById('applySuggestBtn').style.display = 'none';

    modal.classList.add('active');
};

App.generateSmartSuggestion = function() {
    const productsText = document.getElementById('productsInput').value.trim();
    const scheduleText = document.getElementById('scheduleInput').value.trim();
    const skinConcerns = document.getElementById('skinConcernsInput').value.trim();

    if (!productsText) {
        alert('請至少輸入您的保養品清單');
        return;
    }

    // 顯示生成中狀態
    const btn = document.getElementById('generateSuggestBtn');
    btn.classList.add('generating');
    btn.textContent = '生成中...';
    btn.disabled = true;

    // 模擬 AI 生成（實際應用中可以接入真實的 AI API）
    setTimeout(() => {
        const suggestion = this.analyzeAndGenerateSuggestion(productsText, scheduleText, skinConcerns);
        this.smartSuggestion = suggestion;

        // 顯示結果
        this.displaySuggestion(suggestion);

        // 恢復按鈕狀態
        btn.classList.remove('generating');
        btn.textContent = '生成建議';
        btn.disabled = false;

        // 顯示套用按鈕
        document.getElementById('smartSuggestResult').style.display = 'block';
        document.getElementById('applySuggestBtn').style.display = 'inline-block';
    }, 1500);
};

App.analyzeAndGenerateSuggestion = function(productsText, scheduleText, skinConcerns) {
    // 解析產品列表
    const products = productsText.split('\n').filter(p => p.trim()).map(p => p.trim());

    // 解析時間表
    const scheduleTimes = this.parseSchedule(scheduleText);

    // 產品分類
    const categorizedProducts = this.categorizeProducts(products);

    // 生成建議流程
    const routines = [];
    const timeSlots = [];

    // 起床保養流程
    if (scheduleTimes.morning) {
        const morningSteps = this.buildMorningRoutine(categorizedProducts, skinConcerns);
        routines.push({
            id: 'ai-routine-morning',
            name: '【AI建議】起床保養',
            type: 'morning',
            steps: morningSteps
        });

        timeSlots.push({
            id: 'ai-slot-morning',
            name: '起床保養',
            time: scheduleTimes.morning,
            routine: 'ai-routine-morning',
            weekdays: [0, 1, 2, 3, 4, 5, 6],
            enabled: true
        });
    }

    // 出門前防曬
    if (scheduleTimes.prework && categorizedProducts.sunscreen.length > 0) {
        const sunscreenSteps = this.buildSunscreenRoutine(categorizedProducts);
        routines.push({
            id: 'ai-routine-sunscreen',
            name: '【AI建議】出門防曬',
            type: 'sunscreen',
            steps: sunscreenSteps
        });

        timeSlots.push({
            id: 'ai-slot-sunscreen',
            name: '出門防曬',
            time: scheduleTimes.prework,
            routine: 'ai-routine-sunscreen',
            weekdays: [1, 2, 3, 4, 5],
            enabled: true
        });
    }

    // 睡前保養流程
    if (scheduleTimes.night) {
        const nightSteps = this.buildNightRoutine(categorizedProducts, skinConcerns);
        routines.push({
            id: 'ai-routine-night',
            name: '【AI建議】睡前保養',
            type: 'night',
            steps: nightSteps
        });

        timeSlots.push({
            id: 'ai-slot-night',
            name: '睡前保養',
            time: scheduleTimes.night,
            routine: 'ai-routine-night',
            weekdays: [0, 1, 2, 3, 4, 5, 6],
            enabled: true
        });
    }

    return { routines, timeSlots, products: categorizedProducts };
};

App.parseSchedule = function(scheduleText) {
    const times = {};

    if (!scheduleText) {
        // 預設時間
        return { morning: '20:30', prework: '07:30', night: '22:00' };
    }

    const lines = scheduleText.split('\n');
    lines.forEach(line => {
        const timeMatch = line.match(/(\d{1,2}):(\d{2})|(\d{1,2})點/);
        if (timeMatch) {
            let hour, minute;
            if (timeMatch[1]) {
                hour = timeMatch[1];
                minute = timeMatch[2];
            } else {
                hour = timeMatch[3];
                minute = '00';
            }

            const time = `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`;

            if (line.includes('起床') || line.includes('早上') && hour < 12) {
                times.morning = time;
            } else if (line.includes('出門') || line.includes('上班')) {
                times.prework = time;
            } else if (line.includes('睡前') || line.includes('晚上') || hour >= 20) {
                times.night = time;
            }
        }
    });

    return times;
};

App.categorizeProducts = function(products) {
    const categorized = {
        cleanser: [],
        toner: [],
        essence: [],
        serum: [],
        moisturizer: [],
        sunscreen: [],
        mask: [],
        treatment: [],
        other: []
    };

    products.forEach(product => {
        const lower = product.toLowerCase();

        if (lower.includes('洗面') || lower.includes('cleanse')) {
            categorized.cleanser.push(product);
        } else if (lower.includes('toner') || lower.includes('化妝水') || lower.includes('ssuk')) {
            categorized.toner.push(product);
        } else if (lower.includes('精華') || lower.includes('essence') || lower.includes('serum')) {
            categorized.essence.push(product);
        } else if (lower.includes('乳液') || lower.includes('面霜') || lower.includes('cream') || lower.includes('moisturizer')) {
            categorized.moisturizer.push(product);
        } else if (lower.includes('防曬') || lower.includes('sunscreen') || lower.includes('spf')) {
            categorized.sunscreen.push(product);
        } else if (lower.includes('面膜') || lower.includes('mask')) {
            categorized.mask.push(product);
        } else if (lower.includes('水楊酸') || lower.includes('pad') || lower.includes('茶樹')) {
            categorized.treatment.push(product);
        } else {
            categorized.other.push(product);
        }
    });

    return categorized;
};

App.buildMorningRoutine = function(products, concerns) {
    const steps = [];

    // 1. 清潔
    if (products.cleanser.length > 0) {
        steps.push({
            text: products.cleanser[0],
            notes: '溫和清潔，不要過度摩擦'
        });
    }

    // 2. 治療性產品（如果有）
    if (products.treatment.length > 0) {
        const hasBHA = products.treatment.some(p => p.includes('水楊酸'));
        if (hasBHA) {
            steps.push({
                text: products.treatment.find(p => p.includes('水楊酸')),
                notes: '只擦 T 字、下巴、粉刺區，避開兩頰',
                area: 'T字部位'
            });
            steps.push({
                text: '等待 5-10 分鐘',
                notes: '讓成分充分作用',
                timer: 300,
                timerMax: 600
            });
        } else {
            steps.push({
                text: products.treatment[0],
                notes: '按照產品說明使用'
            });
        }
    }

    // 3. 化妝水
    if (products.toner.length > 0) {
        steps.push({
            text: products.toner[0],
            notes: '1-2 層，輕拍至吸收'
        });
    }

    // 4. 精華
    if (products.essence.length > 0) {
        steps.push({
            text: products.essence[0],
            notes: '2-3 滴，均勻塗抹全臉'
        });
    }

    // 5. 保濕
    if (products.moisturizer.length > 0) {
        steps.push({
            text: products.moisturizer[0],
            notes: '覺得會乾再加',
            optional: true
        });
    }

    return steps;
};

App.buildSunscreenRoutine = function(products) {
    const steps = [];

    // 簡單清潔
    if (products.cleanser.length > 0) {
        steps.push({
            text: '清水或' + products.cleanser[0],
            notes: '視出油情況決定',
            optional: true
        });
    }

    // 基礎保濕
    if (products.toner.length > 0) {
        steps.push({
            text: products.toner[0],
            notes: '薄薄一層'
        });
    }

    // 防曬
    if (products.sunscreen.length > 0) {
        steps.push({
            text: products.sunscreen[0],
            notes: '臉＋脖子足量使用（約兩指長）',
            amount: '兩指長'
        });
    }

    return steps;
};

App.buildNightRoutine = function(products, concerns) {
    const steps = [];

    // 1. 卸妝清潔
    if (products.cleanser.length > 0) {
        steps.push({
            text: products.cleanser[0],
            notes: '徹底清潔白天的防曬和髒污'
        });
    }

    // 2. 化妝水
    if (products.toner.length > 0) {
        steps.push({
            text: products.toner[0],
            notes: '1-2 層'
        });
    }

    // 3. 精華
    if (products.essence.length > 0) {
        steps.push({
            text: products.essence[0],
            notes: '修護舒緩'
        });
    }

    // 4. 面膜（週間輪替建議）
    if (products.mask.length > 0) {
        steps.push({
            text: products.mask.join(' 或 '),
            notes: '每週 2-3 次，10-15 分鐘',
            optional: true,
            timer: 600,
            timerMax: 900
        });
    }

    // 5. 保濕
    if (products.moisturizer.length > 0) {
        steps.push({
            text: products.moisturizer[0],
            notes: '鎖住水分'
        });
    }

    return steps;
};

App.displaySuggestion = function(suggestion) {
    const container = document.getElementById('suggestResultContent');
    container.innerHTML = '';

    suggestion.routines.forEach((routine, index) => {
        const correspondingSlot = suggestion.timeSlots[index];

        const routineDiv = document.createElement('div');
        routineDiv.className = 'suggest-routine-item';

        let stepsHTML = '<ol class="suggest-routine-steps">';
        routine.steps.forEach(step => {
            stepsHTML += `<li>${step.text}${step.notes ? ` <small>(${step.notes})</small>` : ''}</li>`;
        });
        stepsHTML += '</ol>';

        routineDiv.innerHTML = `
            <div class="suggest-routine-title">${routine.name}</div>
            <div class="suggest-routine-time">⏰ 建議時間：${correspondingSlot ? correspondingSlot.time : '未設定'}</div>
            ${stepsHTML}
        `;

        container.appendChild(routineDiv);
    });
};

App.applySmartSuggestion = function() {
    if (!this.smartSuggestion) return;

    // 檢查是否已有流程
    const hasExistingRoutines = Object.keys(this.routines).length > 0 || this.timeSlots.length > 0;

    if (hasExistingRoutines) {
        // 顯示衝突確認對話框
        document.getElementById('smartSuggestModal').classList.remove('active');
        document.getElementById('conflictModal').classList.add('active');
    } else {
        // 直接套用
        this.applySuggestionMerge();
    }
};

App.applySuggestionMerge = function() {
    if (!this.smartSuggestion) return;

    // 合併流程
    this.smartSuggestion.routines.forEach(routine => {
        this.routines[routine.id] = routine;
    });

    // 合併時段
    this.smartSuggestion.timeSlots.forEach(slot => {
        // 檢查是否已存在相同ID
        if (!this.timeSlots.some(s => s.id === slot.id)) {
            this.timeSlots.push(slot);
        }
    });

    this.saveData();
    this.updateUI();

    // 關閉所有對話框
    document.getElementById('conflictModal').classList.remove('active');
    document.getElementById('smartSuggestModal').classList.remove('active');

    alert('✅ AI 建議已成功套用！已為您新增建議的流程和時段。');
};

App.applySuggestionReplace = function() {
    if (!this.smartSuggestion) return;

    if (!confirm('確定要清除所有現有流程和時段嗎？此操作無法復原！')) {
        return;
    }

    // 清除並替換
    this.routines = {};
    this.timeSlots = [];

    this.smartSuggestion.routines.forEach(routine => {
        this.routines[routine.id] = routine;
    });

    this.smartSuggestion.timeSlots.forEach(slot => {
        this.timeSlots.push(slot);
    });

    this.saveData();
    this.updateUI();

    // 關閉所有對話框
    document.getElementById('conflictModal').classList.remove('active');
    document.getElementById('smartSuggestModal').classList.remove('active');

    alert('✅ 已清除舊流程並套用 AI 建議！');
};

// 定期檢查通知（每分鐘）
setInterval(() => {
    if (App.notificationPermission) {
        const now = new Date();
        const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        const weekday = now.getDay();

        App.timeSlots.forEach(slot => {
            if (slot.enabled && slot.time === currentTime && slot.weekdays.includes(weekday)) {
                const routine = App.routines[slot.routine];
                if (routine) {
                    new Notification(slot.name, {
                        body: routine.name + ' - 點擊查看詳情',
                        icon: '/icon-192.png',
                        requireInteraction: true
                    });
                }
            }
        });
    }
}, 60000);
