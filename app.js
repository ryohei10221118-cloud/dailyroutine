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
    editingReminderId: null,
    notificationPermission: false,
    smartSuggestion: null,
    selectMode: false,
    selectedRecords: new Set(),
    slotSelectMode: false,
    selectedSlots: new Set(),
    routineSelectMode: false,
    selectedRoutines: new Set(),
    productSelectMode: false,
    selectedProducts: new Set(),

    // 資料
    routines: {},
    products: {},
    timeSlots: [],
    reminders: [],
    history: [],
    schedules: {}, // 班表數據：{ "2025-12-07": { shift: "N3", type: "work" } }

    // 初始化
    init() {
        this.loadData();
        this.initializeDefaultData();
        this.setupEventListeners();
        this.updateUI();
        this.checkNotificationPermission();
        this.scheduleNotifications();
        this.loadTodayAIRecommendations(); // 載入今日 AI 推薦
    },

    // 載入本地資料
    loadData() {
        const saved = localStorage.getItem('skincareData');
        if (saved) {
            const data = JSON.parse(saved);
            this.routines = data.routines || {};
            this.products = data.products || {};
            this.timeSlots = data.timeSlots || [];
            this.reminders = data.reminders || [];
            this.history = data.history || [];
            this.schedules = data.schedules || {};
        }
    },

    // 保存資料
    saveData() {
        const data = {
            routines: this.routines,
            products: this.products,
            timeSlots: this.timeSlots,
            reminders: this.reminders,
            history: this.history,
            schedules: this.schedules
        };
        localStorage.setItem('skincareData', JSON.stringify(data));

        // 如果已訂閱推送，更新伺服器上的資料
        if (typeof PushManager !== 'undefined') {
            PushManager.updateSubscription().catch(err => {
                console.log('Update subscription failed:', err);
            });
        }
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

    // 星期篩選器
    document.getElementById('weekdayFilter')?.addEventListener('change', () => {
        this.updateScheduleView();
    });

    // 產品管理
    document.getElementById('addProductBtn')?.addEventListener('click', () => this.showProductModal());
    document.getElementById('saveProductBtn')?.addEventListener('click', () => this.saveProduct());
    document.getElementById('cancelProductBtn')?.addEventListener('click', () => {
        document.getElementById('productModal').classList.remove('active');
    });

    // 提醒管理
    document.getElementById('addReminderBtn')?.addEventListener('click', () => this.showReminderModal());
    document.getElementById('saveReminderBtn')?.addEventListener('click', () => this.saveReminder());
    document.getElementById('cancelReminderBtn')?.addEventListener('click', () => {
        document.getElementById('reminderModal').classList.remove('active');
    });

    // 提醒類型切換
    document.getElementById('reminderTypeRecurring')?.addEventListener('change', () => {
        document.getElementById('reminderDateGroup').style.display = 'none';
        document.getElementById('reminderWeekdaysGroup').style.display = 'block';
    });
    document.getElementById('reminderTypeOneTime')?.addEventListener('change', () => {
        document.getElementById('reminderDateGroup').style.display = 'block';
        document.getElementById('reminderWeekdaysGroup').style.display = 'none';
    });

    // 流程編輯
    document.getElementById('cancelEditRoutineBtn')?.addEventListener('click', () => {
        document.getElementById('editRoutineModal').classList.remove('active');
        this.editingRoutineId = null;
    });
    document.getElementById('saveEditRoutineBtn')?.addEventListener('click', () => this.saveEditRoutine());

    // Header 齒輪選單
    const headerMenuBtn = document.getElementById('headerMenuBtn');
    const headerMenuDropdown = document.getElementById('headerMenuDropdown');

    headerMenuBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        headerMenuDropdown.classList.toggle('show');
        headerMenuBtn.classList.toggle('active');
    });

    // 點擊選單項目後關閉選單
    document.querySelectorAll('.header-menu-item').forEach(item => {
        item.addEventListener('click', () => {
            headerMenuDropdown.classList.remove('show');
            headerMenuBtn.classList.remove('active');
        });
    });

    // 點擊外部關閉選單
    document.addEventListener('click', (e) => {
        if (!headerMenuBtn.contains(e.target) && !headerMenuDropdown.contains(e.target)) {
            headerMenuDropdown.classList.remove('show');
            headerMenuBtn.classList.remove('active');
        }
    });

    // 通知權限
    document.getElementById('notificationBtn')?.addEventListener('click', () => this.requestNotificationPermission());

    // 測試通知
    document.getElementById('testNotificationBtn')?.addEventListener('click', () => this.sendTestNotification());

    // 完成流程
    document.getElementById('completeRoutineBtn')?.addEventListener('click', () => this.completeRoutine());

    // 關閉流程詳情
    document.getElementById('closeRoutineBtn')?.addEventListener('click', () => this.closeRoutineDetail());

    // AI 設定
    document.getElementById('aiSettingsBtn')?.addEventListener('click', () => this.showAiSettingsModal());
    document.getElementById('saveAiSettingsBtn')?.addEventListener('click', () => this.saveAiSettings());
    document.getElementById('refreshAIBtn')?.addEventListener('click', () => this.getDailyAIRecommendation());

    // 智能建議
    document.getElementById('smartSuggestBtn')?.addEventListener('click', () => this.showSmartSuggestModal());
    document.getElementById('generateSuggestBtn')?.addEventListener('click', () => this.generateSmartSuggestion());
    document.getElementById('importSuggestBtn')?.addEventListener('click', () => this.importSmartSuggestion());
    document.getElementById('applySuggestBtn')?.addEventListener('click', () => this.applySmartSuggestion());
    document.getElementById('mergeRoutinesBtn')?.addEventListener('click', () => this.applySuggestionMerge());
    document.getElementById('replaceRoutinesBtn')?.addEventListener('click', () => this.applySuggestionReplace());

    // 智能建議模式切換
    document.getElementById('suggestModeGenerate')?.addEventListener('change', () => {
        document.getElementById('generateSuggestArea').style.display = 'block';
        document.getElementById('importSuggestArea').style.display = 'none';
        document.getElementById('generateSuggestBtn').style.display = 'inline-block';
        document.getElementById('importSuggestBtn').style.display = 'none';
    });
    document.getElementById('suggestModeImport')?.addEventListener('change', () => {
        document.getElementById('generateSuggestArea').style.display = 'none';
        document.getElementById('importSuggestArea').style.display = 'block';
        document.getElementById('generateSuggestBtn').style.display = 'none';
        document.getElementById('importSuggestBtn').style.display = 'inline-block';
    });

    // 清除導入輸入框
    document.getElementById('clearImportBtn')?.addEventListener('click', () => {
        document.getElementById('importInput').value = '';
    });

    // 日曆導航
    document.getElementById('prevMonth')?.addEventListener('click', () => this.changeMonth(-1));
    document.getElementById('nextMonth')?.addEventListener('click', () => this.changeMonth(1));

    // 批量選擇（歷史記錄）
    document.getElementById('toggleSelectModeBtn')?.addEventListener('click', () => this.toggleSelectMode());
    document.getElementById('selectAllBtn')?.addEventListener('click', () => this.selectAllRecords());
    document.getElementById('deleteSelectedBtn')?.addEventListener('click', () => this.deleteSelectedRecords());
    document.getElementById('cancelSelectBtn')?.addEventListener('click', () => this.cancelSelectMode());

    // 批量選擇（時段設定）
    document.getElementById('toggleSlotSelectModeBtn')?.addEventListener('click', () => this.toggleSlotSelectMode());
    document.getElementById('selectAllSlotsBtn')?.addEventListener('click', () => this.selectAllSlots());
    document.getElementById('batchEditSlotsBtn')?.addEventListener('click', () => this.showBatchEditSlotModal());
    document.getElementById('deleteSelectedSlotsBtn')?.addEventListener('click', () => this.deleteSelectedSlots());
    document.getElementById('cancelSlotSelectBtn')?.addEventListener('click', () => this.cancelSlotSelectMode());

    // 批量修改時段
    document.getElementById('batchEditTimeCheck')?.addEventListener('change', (e) => {
        document.getElementById('batchEditTime').disabled = !e.target.checked;
    });
    document.getElementById('batchEditRoutineCheck')?.addEventListener('change', (e) => {
        document.getElementById('batchEditRoutine').disabled = !e.target.checked;
    });
    document.getElementById('batchEditWeekdaysCheck')?.addEventListener('change', (e) => {
        document.querySelectorAll('.batch-weekday').forEach(input => {
            input.disabled = !e.target.checked;
        });
    });
    document.getElementById('saveBatchEditBtn')?.addEventListener('click', () => this.applyBatchEditSlots());
    document.getElementById('cancelBatchEditBtn')?.addEventListener('click', () => {
        document.getElementById('batchEditSlotModal').classList.remove('active');
    });

    // 批量選擇（流程管理）
    document.getElementById('toggleRoutineSelectModeBtn')?.addEventListener('click', () => this.toggleRoutineSelectMode());
    document.getElementById('selectAllRoutinesBtn')?.addEventListener('click', () => this.selectAllRoutines());
    document.getElementById('deleteSelectedRoutinesBtn')?.addEventListener('click', () => this.deleteSelectedRoutines());
    document.getElementById('cancelRoutineSelectBtn')?.addEventListener('click', () => this.cancelRoutineSelectMode());

    // 批量選擇（產品管理）
    document.getElementById('toggleProductSelectModeBtn')?.addEventListener('click', () => this.toggleProductSelectMode());
    document.getElementById('selectAllProductsBtn')?.addEventListener('click', () => this.selectAllProducts());
    document.getElementById('deleteSelectedProductsBtn')?.addEventListener('click', () => this.deleteSelectedProducts());
    document.getElementById('cancelProductSelectBtn')?.addEventListener('click', () => this.cancelProductSelectMode());
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
    if (tabName === 'calendar') this.updateCalendarView();
    if (tabName === 'routines') this.updateRoutinesView();
    if (tabName === 'schedule') this.updateScheduleView();
    if (tabName === 'reminders') this.updateRemindersView();
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
        item.className = 'timeline-item' + (isCompleted ? ' completed locked' : '');
        item.innerHTML = `
            <div class="timeline-time">${slot.time}</div>
            <div class="timeline-title">${slot.name}</div>
            <div class="timeline-desc">${routine.name}</div>
            <span class="timeline-status ${isCompleted ? 'completed' : 'pending'}">${isCompleted ? '✓ 已完成 🔒' : '待執行'}</span>
        `;

        // 只有未完成的項目才能點擊
        if (!isCompleted) {
            item.addEventListener('click', () => this.showRoutineDetail(slot.routine, slot.id));
        }
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

        // 添加点击整个区块来切换勾选的功能
        const checkbox = stepDiv.querySelector('.step-checkbox');
        stepDiv.addEventListener('click', (e) => {
            // 如果点击的就是 checkbox 本身，让其正常处理
            if (e.target === checkbox) return;

            // 否则切换 checkbox 状态
            checkbox.checked = !checkbox.checked;

            // 更新步骤项的完成状态样式
            if (checkbox.checked) {
                stepDiv.classList.add('completed');
            } else {
                stepDiv.classList.remove('completed');
            }
        });

        // 当直接点击 checkbox 时也要更新样式
        checkbox.addEventListener('change', () => {
            if (checkbox.checked) {
                stepDiv.classList.add('completed');
            } else {
                stepDiv.classList.remove('completed');
            }
        });

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

    // 獲取所有勾選的步驟
    const checkboxes = document.querySelectorAll('#currentRoutine .step-checkbox');
    const completedSteps = [];
    checkboxes.forEach((checkbox, index) => {
        if (checkbox.checked) {
            completedSteps.push(index);
        }
    });

    const totalSteps = routine.steps.length;
    const completedCount = completedSteps.length;
    const completionRate = Math.round((completedCount / totalSteps) * 100);

    // 記錄到歷史
    this.history.unshift({
        id: 'history-' + Date.now(),
        routineId: this.currentRoutineId,
        routineName: routine.name,
        slotId: this.currentSlotId,
        date: now.toISOString(),
        completed: true,
        completedSteps: completedSteps,
        totalSteps: totalSteps,
        completionRate: completionRate
    });

    // 只保留最近 100 條記錄
    if (this.history.length > 100) {
        this.history = this.history.slice(0, 100);
    }

    this.saveData();

    // 顯示完成訊息
    let message = '';
    if (completionRate === 100) {
        message = `✅ 完美！所有步驟都已完成 (${completedCount}/${totalSteps})`;
    } else if (completionRate >= 50) {
        message = `✅ 已記錄！完成了 ${completedCount}/${totalSteps} 個步驟 (${completionRate}%)`;
    } else if (completionRate > 0) {
        message = `✅ 已記錄！完成了 ${completedCount}/${totalSteps} 個步驟 (${completionRate}%)\n建議下次嘗試完成更多步驟哦～`;
    } else {
        message = '❌ 您沒有勾選任何步驟。\n如果要跳過此流程，請直接關閉即可。';
        return;
    }

    alert(message);

    // 隱藏流程詳情
    this.closeRoutineDetail();

    // 更新今日視圖（會標記已完成）
    this.updateTodayView();
};

App.deleteHistoryRecord = function(recordId) {
    // 確認是否要刪除
    if (!confirm('確定要刪除這筆記錄嗎？刪除後該時段的保養流程將重新開啟。')) {
        return;
    }

    // 查找並刪除記錄
    const index = this.history.findIndex(record => record.id === recordId);
    if (index !== -1) {
        this.history.splice(index, 1);
        this.saveData();

        // 更新歷史記錄視圖
        this.updateHistoryView();

        // 更新今日視圖（會重新開啟對應的流程）
        this.updateTodayView();

        // 顯示提示訊息
        alert('✅ 記錄已刪除，對應的保養流程已重新開啟！');
    }
};

App.updateScheduleView = function() {
    const list = document.getElementById('timeSlotsList');
    list.innerHTML = '';

    // 獲取當前選擇的星期篩選
    const weekdayFilter = document.getElementById('weekdayFilter');
    const selectedWeekday = weekdayFilter ? weekdayFilter.value : 'all';

    // 按時間排序並篩選
    let filteredSlots = [...this.timeSlots];

    // 根據星期篩選
    if (selectedWeekday !== 'all') {
        const dayNum = parseInt(selectedWeekday);
        filteredSlots = filteredSlots.filter(slot => slot.weekdays.includes(dayNum));
    }

    const sortedSlots = filteredSlots.sort((a, b) => a.time.localeCompare(b.time));

    // 顯示篩選結果提示
    if (selectedWeekday !== 'all' && sortedSlots.length === 0) {
        const weekdayNames = ['日', '一', '二', '三', '四', '五', '六'];
        const emptyMsg = document.createElement('div');
        emptyMsg.style.cssText = 'text-align: center; padding: 40px 20px; color: var(--text-secondary);';
        emptyMsg.innerHTML = `<p>📅 週${weekdayNames[parseInt(selectedWeekday)]}沒有設定任何時段</p>`;
        list.appendChild(emptyMsg);
        this.updateWeeklyScheduleView();
        return;
    }

    sortedSlots.forEach(slot => {
        const routine = this.routines[slot.routine];
        const weekdayNames = ['日', '一', '二', '三', '四', '五', '六'];
        const daysText = slot.weekdays.map(d => weekdayNames[d]).join('、');

        const card = document.createElement('div');
        card.className = 'time-slot-card';

        // 選擇模式：顯示複選框
        if (this.slotSelectMode) {
            card.classList.add('select-mode');
            const isChecked = this.selectedSlots.has(slot.id);
            card.innerHTML = `
                <input type="checkbox" class="slot-checkbox" data-slot-id="${slot.id}" ${isChecked ? 'checked' : ''}>
                <div class="slot-info" style="flex: 1;">
                    <div class="slot-time">${slot.time}</div>
                    <div class="slot-name">${slot.name}</div>
                    <div class="slot-days">週${daysText} | ${routine ? routine.name : '未設定'}</div>
                </div>
            `;

            // 添加複選框事件
            const checkbox = card.querySelector('.slot-checkbox');
            checkbox.addEventListener('change', (e) => {
                e.stopPropagation();
                if (e.target.checked) {
                    this.selectedSlots.add(slot.id);
                } else {
                    this.selectedSlots.delete(slot.id);
                }
                this.updateSlotDeleteButtonState();
            });

            // 讓整個卡片可點擊
            card.style.cursor = 'pointer';
            card.addEventListener('click', () => {
                checkbox.checked = !checkbox.checked;
                if (checkbox.checked) {
                    this.selectedSlots.add(slot.id);
                } else {
                    this.selectedSlots.delete(slot.id);
                }
                this.updateSlotDeleteButtonState();
            });
        } else {
            // 普通模式：顯示流程下拉選單和操作按鈕
            // 生成流程下拉選單
            let routineSelectHTML = '<select class="slot-routine-select" data-slot-id="' + slot.id + '">';
            routineSelectHTML += '<option value="">選擇流程...</option>';
            Object.values(this.routines).forEach(r => {
                const selected = r.id === slot.routine ? 'selected' : '';
                routineSelectHTML += `<option value="${r.id}" ${selected}>${r.name}</option>`;
            });
            routineSelectHTML += '</select>';

            card.innerHTML = `
                <div class="slot-info">
                    <div class="slot-time">${slot.time}</div>
                    <div class="slot-name">${slot.name}</div>
                    <div class="slot-days">週${daysText}</div>
                    <div class="slot-routine-wrapper">
                        ${routineSelectHTML}
                    </div>
                </div>
                <div class="slot-actions">
                    <button class="btn-icon edit" data-id="${slot.id}">✏️</button>
                    <button class="btn-icon delete" data-id="${slot.id}">🗑️</button>
                </div>
            `;

            // 添加下拉選單變更事件
            const selectElement = card.querySelector('.slot-routine-select');
            selectElement.addEventListener('change', (e) => {
                this.updateSlotRoutine(slot.id, e.target.value);
            });

            card.querySelector('.edit').addEventListener('click', () => this.editTimeSlot(slot.id));
            card.querySelector('.delete').addEventListener('click', () => this.deleteTimeSlot(slot.id));
        }

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

// === 時段批量選擇功能 ===

App.toggleSlotSelectMode = function() {
    this.slotSelectMode = !this.slotSelectMode;
    this.selectedSlots.clear();

    const toggleBtn = document.getElementById('toggleSlotSelectModeBtn');
    const batchActions = document.getElementById('slotBatchActions');

    if (this.slotSelectMode) {
        toggleBtn.textContent = '取消選擇';
        toggleBtn.style.background = '#FF9800';
        batchActions.style.display = 'flex';
    } else {
        toggleBtn.textContent = '選擇';
        toggleBtn.style.background = '';
        batchActions.style.display = 'none';
    }

    this.updateScheduleView();
};

App.selectAllSlots = function() {
    const checkboxes = document.querySelectorAll('.slot-checkbox');
    const allChecked = checkboxes.length > 0 && Array.from(checkboxes).every(cb => cb.checked);

    if (allChecked) {
        checkboxes.forEach(checkbox => {
            checkbox.checked = false;
            this.selectedSlots.delete(checkbox.dataset.slotId);
        });
        document.getElementById('selectAllSlotsBtn').textContent = '全選';
    } else {
        checkboxes.forEach(checkbox => {
            checkbox.checked = true;
            this.selectedSlots.add(checkbox.dataset.slotId);
        });
        document.getElementById('selectAllSlotsBtn').textContent = '取消全選';
    }

    this.updateSlotDeleteButtonState();
};

App.updateSlotDeleteButtonState = function() {
    const deleteBtn = document.getElementById('deleteSelectedSlotsBtn');
    const selectAllBtn = document.getElementById('selectAllSlotsBtn');
    const checkboxes = document.querySelectorAll('.slot-checkbox');
    const allChecked = checkboxes.length > 0 && Array.from(checkboxes).every(cb => cb.checked);

    deleteBtn.disabled = this.selectedSlots.size === 0;
    deleteBtn.textContent = this.selectedSlots.size > 0
        ? `刪除選中 (${this.selectedSlots.size})`
        : '刪除選中';

    selectAllBtn.textContent = allChecked ? '取消全選' : '全選';
};

App.deleteSelectedSlots = function() {
    if (this.selectedSlots.size === 0) return;

    const count = this.selectedSlots.size;
    if (!confirm(`確定要刪除 ${count} 個時段嗎？`)) {
        return;
    }

    // 刪除選中的時段
    this.timeSlots = this.timeSlots.filter(slot => !this.selectedSlots.has(slot.id));

    this.selectedSlots.clear();
    this.saveData();

    // 更新視圖
    this.updateScheduleView();
    this.updateTodayView();

    alert(`✅ 已刪除 ${count} 個時段！`);

    // 離開選擇模式
    this.cancelSlotSelectMode();
};

App.cancelSlotSelectMode = function() {
    this.slotSelectMode = false;
    this.selectedSlots.clear();

    document.getElementById('toggleSlotSelectModeBtn').textContent = '選擇';
    document.getElementById('toggleSlotSelectModeBtn').style.background = '';
    document.getElementById('slotBatchActions').style.display = 'none';

    this.updateScheduleView();
};

App.showBatchEditSlotModal = function() {
    if (this.selectedSlots.size === 0) {
        alert('請先選擇要修改的時段！');
        return;
    }

    const modal = document.getElementById('batchEditSlotModal');
    document.getElementById('batchEditCount').textContent = this.selectedSlots.size;

    // 填充流程選項
    const routineSelect = document.getElementById('batchEditRoutine');
    routineSelect.innerHTML = '<option value="">選擇流程...</option>';
    Object.values(this.routines).forEach(routine => {
        routineSelect.innerHTML += `<option value="${routine.id}">${routine.name}</option>`;
    });

    // 重置表單
    document.getElementById('batchEditTimeCheck').checked = false;
    document.getElementById('batchEditTime').disabled = true;
    document.getElementById('batchEditTime').value = '';

    document.getElementById('batchEditRoutineCheck').checked = false;
    document.getElementById('batchEditRoutine').disabled = true;
    document.getElementById('batchEditRoutine').value = '';

    document.getElementById('batchEditWeekdaysCheck').checked = false;
    document.querySelectorAll('.batch-weekday').forEach(input => {
        input.disabled = true;
        input.checked = false;
    });

    modal.classList.add('active');
};

App.applyBatchEditSlots = function() {
    const editTime = document.getElementById('batchEditTimeCheck').checked;
    const editRoutine = document.getElementById('batchEditRoutineCheck').checked;
    const editWeekdays = document.getElementById('batchEditWeekdaysCheck').checked;

    if (!editTime && !editRoutine && !editWeekdays) {
        alert('請至少選擇一項要修改的內容！');
        return;
    }

    let count = 0;
    this.selectedSlots.forEach(slotId => {
        const slot = this.timeSlots.find(s => s.id === slotId);
        if (slot) {
            if (editTime) {
                const newTime = document.getElementById('batchEditTime').value;
                if (newTime) {
                    slot.time = newTime;
                }
            }

            if (editRoutine) {
                const newRoutine = document.getElementById('batchEditRoutine').value;
                if (newRoutine) {
                    slot.routine = newRoutine;
                }
            }

            if (editWeekdays) {
                const weekdays = [];
                document.querySelectorAll('.batch-weekday:checked').forEach(input => {
                    weekdays.push(parseInt(input.value));
                });
                if (weekdays.length > 0) {
                    slot.weekdays = weekdays;
                }
            }

            count++;
        }
    });

    this.saveData();
    this.updateScheduleView();
    this.updateTodayView();
    this.updateWeeklyScheduleView();

    document.getElementById('batchEditSlotModal').classList.remove('active');
    alert(`✅ 已成功修改 ${count} 個時段！`);

    // 離開選擇模式
    this.cancelSlotSelectMode();
};

App.updateSlotRoutine = function(slotId, routineId) {
    const slot = this.timeSlots.find(s => s.id === slotId);
    if (slot) {
        slot.routine = routineId;
        this.saveData();
        this.updateTodayView();
        this.updateWeeklyScheduleView();
    }
};

// === 流程管理功能 ===

App.updateRoutinesView = function() {
    const list = document.getElementById('routinesList');
    list.innerHTML = '';

    const routines = Object.values(this.routines);
    if (routines.length === 0) {
        list.innerHTML = '<div style="text-align: center; color: #999; padding: 40px;">尚無保養流程<br>使用「AI 智能建議」自動生成流程</div>';
        return;
    }

    routines.forEach(routine => {
        const card = document.createElement('div');
        card.className = 'routine-card';

        // 選擇模式：顯示複選框
        if (this.routineSelectMode) {
            card.classList.add('select-mode');
            const isChecked = this.selectedRoutines.has(routine.id);
            card.innerHTML = `
                <input type="checkbox" class="routine-checkbox" data-routine-id="${routine.id}" ${isChecked ? 'checked' : ''}>
                <div class="routine-content" style="flex: 1;">
                    <div class="routine-name">${routine.name}</div>
                    <div class="routine-type">${this.getRoutineTypeName(routine.type)}</div>
                    <div class="routine-steps-count">${routine.steps.length} 個步驟</div>
                </div>
            `;

            // 添加複選框事件
            const checkbox = card.querySelector('.routine-checkbox');
            checkbox.addEventListener('change', (e) => {
                e.stopPropagation();
                if (e.target.checked) {
                    this.selectedRoutines.add(routine.id);
                } else {
                    this.selectedRoutines.delete(routine.id);
                }
                this.updateRoutineDeleteButtonState();
            });

            // 讓整個卡片可點擊
            card.style.cursor = 'pointer';
            card.addEventListener('click', () => {
                checkbox.checked = !checkbox.checked;
                if (checkbox.checked) {
                    this.selectedRoutines.add(routine.id);
                } else {
                    this.selectedRoutines.delete(routine.id);
                }
                this.updateRoutineDeleteButtonState();
            });
        } else {
            // 普通模式：顯示流程詳情
            let stepsHTML = '<ul class="routine-steps-list">';
            routine.steps.forEach((step, index) => {
                stepsHTML += `<li>${index + 1}. ${step.text}${step.notes ? ' <span class="step-hint">(' + step.notes + ')</span>' : ''}</li>`;
            });
            stepsHTML += '</ul>';

            card.innerHTML = `
                <div class="routine-header-row">
                    <div class="routine-name">${routine.name}</div>
                    <div style="display: flex; gap: 8px; align-items: center;">
                        <div class="routine-type-badge">${this.getRoutineTypeName(routine.type)}</div>
                        <button class="btn-icon" onclick="App.editRoutine('${routine.id}')" title="編輯流程">✏️</button>
                    </div>
                </div>
                <div class="routine-meta">${routine.steps.length} 個步驟${routine.warnings ? ' · ' + routine.warnings.length + ' 個注意事項' : ''}</div>
                ${stepsHTML}
                ${routine.warnings && routine.warnings.length > 0 ? `
                    <div class="routine-warnings">
                        <div class="warning-title">⚠️ 注意事項</div>
                        ${routine.warnings.map(w => `<div class="warning-item">• ${w}</div>`).join('')}
                    </div>
                ` : ''}
            `;
        }

        list.appendChild(card);
    });
};

App.getRoutineTypeName = function(type) {
    const names = {
        'morning-regular': '一般早晨',
        'morning-bha': '水楊酸早晨',
        'sunscreen': '出門防曬',
        'night-simple': '夜間保養',
        'night-mask-bright': '亮白面膜',
        'night-mask-repair': '修護面膜',
        'night-mask-calm': '舒緩面膜',
        'morning': '早晨保養',
        'night': '夜間保養',
        'custom': '自訂流程'
    };
    return names[type] || type;
};

App.toggleRoutineSelectMode = function() {
    this.routineSelectMode = !this.routineSelectMode;
    this.selectedRoutines.clear();

    const toggleBtn = document.getElementById('toggleRoutineSelectModeBtn');
    const batchActions = document.getElementById('routineBatchActions');

    if (this.routineSelectMode) {
        toggleBtn.textContent = '取消選擇';
        toggleBtn.style.background = '#FF9800';
        batchActions.style.display = 'flex';
    } else {
        toggleBtn.textContent = '選擇';
        toggleBtn.style.background = '';
        batchActions.style.display = 'none';
    }

    this.updateRoutinesView();
};

App.selectAllRoutines = function() {
    const checkboxes = document.querySelectorAll('.routine-checkbox');
    const allChecked = checkboxes.length > 0 && Array.from(checkboxes).every(cb => cb.checked);

    if (allChecked) {
        checkboxes.forEach(checkbox => {
            checkbox.checked = false;
            this.selectedRoutines.delete(checkbox.dataset.routineId);
        });
        document.getElementById('selectAllRoutinesBtn').textContent = '全選';
    } else {
        checkboxes.forEach(checkbox => {
            checkbox.checked = true;
            this.selectedRoutines.add(checkbox.dataset.routineId);
        });
        document.getElementById('selectAllRoutinesBtn').textContent = '取消全選';
    }

    this.updateRoutineDeleteButtonState();
};

App.updateRoutineDeleteButtonState = function() {
    const deleteBtn = document.getElementById('deleteSelectedRoutinesBtn');
    const selectAllBtn = document.getElementById('selectAllRoutinesBtn');
    const checkboxes = document.querySelectorAll('.routine-checkbox');
    const allChecked = checkboxes.length > 0 && Array.from(checkboxes).every(cb => cb.checked);

    deleteBtn.disabled = this.selectedRoutines.size === 0;
    deleteBtn.textContent = this.selectedRoutines.size > 0
        ? `刪除選中 (${this.selectedRoutines.size})`
        : '刪除選中';

    selectAllBtn.textContent = allChecked ? '取消全選' : '全選';
};

App.deleteSelectedRoutines = function() {
    if (this.selectedRoutines.size === 0) return;

    const count = this.selectedRoutines.size;
    if (!confirm(`確定要刪除 ${count} 個流程嗎？\n\n注意：使用這些流程的時段將變為「未設定」狀態。`)) {
        return;
    }

    // 刪除選中的流程
    this.selectedRoutines.forEach(routineId => {
        delete this.routines[routineId];

        // 將使用此流程的時段設為未設定
        this.timeSlots.forEach(slot => {
            if (slot.routine === routineId) {
                slot.routine = '';
            }
        });
    });

    this.selectedRoutines.clear();
    this.saveData();

    // 更新所有視圖
    this.updateRoutinesView();
    this.updateScheduleView();
    this.updateTodayView();

    alert(`✅ 已刪除 ${count} 個流程！`);

    // 離開選擇模式
    this.cancelRoutineSelectMode();
};

App.cancelRoutineSelectMode = function() {
    this.routineSelectMode = false;
    this.selectedRoutines.clear();

    document.getElementById('toggleRoutineSelectModeBtn').textContent = '選擇';
    document.getElementById('toggleRoutineSelectModeBtn').style.background = '';
    document.getElementById('routineBatchActions').style.display = 'none';

    this.updateRoutinesView();
};

App.updateProductsView = function() {
    const grid = document.getElementById('productsList');
    grid.innerHTML = '';

    const products = Object.values(this.products);

    if (products.length === 0) {
        grid.innerHTML = '<div style="text-align: center; color: #999; padding: 40px;">尚無產品<br>點擊「新增」按鈕來添加產品</div>';
        return;
    }

    products.forEach(product => {
        const card = document.createElement('div');
        card.className = 'product-card';

        // 選擇模式：顯示複選框
        if (this.productSelectMode) {
            card.classList.add('select-mode');
            const isChecked = this.selectedProducts.has(product.id);
            card.innerHTML = `
                <input type="checkbox" class="product-checkbox" data-product-id="${product.id}" ${isChecked ? 'checked' : ''}>
                <div class="product-content" style="flex: 1;">
                    <div class="product-icon">${product.icon || '🧴'}</div>
                    <div class="product-name">${product.name}</div>
                    <div class="product-type">${this.getProductTypeName(product.type)}</div>
                    ${product.frequency ? `<div class="product-stock">${product.frequency}</div>` : ''}
                </div>
            `;

            // 添加複選框事件
            const checkbox = card.querySelector('.product-checkbox');
            checkbox.addEventListener('change', (e) => {
                e.stopPropagation();
                if (e.target.checked) {
                    this.selectedProducts.add(product.id);
                } else {
                    this.selectedProducts.delete(product.id);
                }
                this.updateProductDeleteButtonState();
            });

            // 讓整個卡片可點擊
            card.style.cursor = 'pointer';
            card.addEventListener('click', () => {
                checkbox.checked = !checkbox.checked;
                if (checkbox.checked) {
                    this.selectedProducts.add(product.id);
                } else {
                    this.selectedProducts.delete(product.id);
                }
                this.updateProductDeleteButtonState();
            });
        } else {
            // 普通模式：顯示產品詳情和操作按鈕
            card.innerHTML = `
                <div class="product-icon">${product.icon || '🧴'}</div>
                <div class="product-name">${product.name}</div>
                <div class="product-type">${this.getProductTypeName(product.type)}</div>
                ${product.frequency ? `<div class="product-stock">${product.frequency}</div>` : ''}
                <div class="product-actions" style="margin-top: 10px;">
                    <button class="btn-icon edit" data-id="${product.id}" style="margin-right: 5px;">✏️</button>
                    <button class="btn-icon delete" data-id="${product.id}">🗑️</button>
                </div>
            `;

            // 添加編輯按鈕事件
            card.querySelector('.edit').addEventListener('click', (e) => {
                e.stopPropagation();
                this.showProductModal(product.id);
            });

            // 添加刪除按鈕事件
            card.querySelector('.delete').addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteProduct(product.id);
            });
        }

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

App.deleteProduct = function(productId) {
    if (confirm('確定要刪除此產品嗎？')) {
        delete this.products[productId];
        this.saveData();
        this.updateProductsView();
    }
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

    const today = new Date().toDateString();

    last30Days.forEach(record => {
        const date = new Date(record.date);
        const dateStr = date.toLocaleDateString('zh-TW', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        const isToday = date.toDateString() === today;

        // 生成完成度顯示
        let statusText = '';
        let statusClass = 'skipped';
        if (record.completed) {
            if (record.completionRate !== undefined) {
                if (record.completionRate === 100) {
                    statusText = `✓ ${record.completedSteps.length}/${record.totalSteps}`;
                    statusClass = 'completed';
                } else {
                    statusText = `${record.completionRate}% (${record.completedSteps.length}/${record.totalSteps})`;
                    statusClass = 'partial';
                }
            } else {
                // 舊記錄沒有 completionRate，顯示為已完成
                statusText = '✓ 已完成';
                statusClass = 'completed';
            }
        } else {
            statusText = '跳過';
        }

        const item = document.createElement('div');
        item.className = 'history-item';

        // 選擇模式：顯示複選框
        if (this.selectMode) {
            item.classList.add('select-mode');
            const isChecked = this.selectedRecords.has(record.id);
            item.innerHTML = `
                <input type="checkbox" class="history-checkbox" data-record-id="${record.id}" ${isChecked ? 'checked' : ''}>
                <div style="flex: 1;">
                    <div class="history-routine">${record.routineName}</div>
                    <div class="history-date">${dateStr}</div>
                </div>
                <span class="history-status ${statusClass}">
                    ${statusText}
                </span>
            `;

            // 添加複選框事件監聽器
            const checkbox = item.querySelector('.history-checkbox');
            checkbox.addEventListener('change', (e) => {
                if (e.target.checked) {
                    this.selectedRecords.add(record.id);
                } else {
                    this.selectedRecords.delete(record.id);
                }
                this.updateDeleteButtonState();
            });
        } else {
            // 普通模式：顯示刪除按鈕（僅限當天）
            item.innerHTML = `
                <div style="flex: 1;">
                    <div class="history-routine">${record.routineName}</div>
                    <div class="history-date">${dateStr}</div>
                </div>
                <span class="history-status ${statusClass}">
                    ${statusText}
                </span>
                ${isToday ? `<button class="btn-delete-record" data-record-id="${record.id}">🗑️</button>` : ''}
            `;

            // 添加刪除按鈕事件監聽器
            if (isToday) {
                const deleteBtn = item.querySelector('.btn-delete-record');
                deleteBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.deleteHistoryRecord(record.id);
                });
            }
        }

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

// === 批量選擇功能 ===

App.toggleSelectMode = function() {
    this.selectMode = !this.selectMode;
    this.selectedRecords.clear();

    const toggleBtn = document.getElementById('toggleSelectModeBtn');
    const batchActions = document.getElementById('batchActions');

    if (this.selectMode) {
        toggleBtn.textContent = '取消選擇';
        toggleBtn.style.background = '#FF9800';
        batchActions.style.display = 'flex';
    } else {
        toggleBtn.textContent = '選擇';
        toggleBtn.style.background = '';
        batchActions.style.display = 'none';
    }

    this.updateHistoryView();
};

App.selectAllRecords = function() {
    const checkboxes = document.querySelectorAll('.history-checkbox');
    const allChecked = checkboxes.length > 0 && Array.from(checkboxes).every(cb => cb.checked);

    if (allChecked) {
        // 如果全選了，就全部取消
        checkboxes.forEach(checkbox => {
            checkbox.checked = false;
            this.selectedRecords.delete(checkbox.dataset.recordId);
        });
        document.getElementById('selectAllBtn').textContent = '全選';
    } else {
        // 否則全選
        checkboxes.forEach(checkbox => {
            checkbox.checked = true;
            this.selectedRecords.add(checkbox.dataset.recordId);
        });
        document.getElementById('selectAllBtn').textContent = '取消全選';
    }

    this.updateDeleteButtonState();
};

App.updateDeleteButtonState = function() {
    const deleteBtn = document.getElementById('deleteSelectedBtn');
    const selectAllBtn = document.getElementById('selectAllBtn');
    const checkboxes = document.querySelectorAll('.history-checkbox');
    const allChecked = checkboxes.length > 0 && Array.from(checkboxes).every(cb => cb.checked);

    deleteBtn.disabled = this.selectedRecords.size === 0;
    deleteBtn.textContent = this.selectedRecords.size > 0
        ? `刪除選中 (${this.selectedRecords.size})`
        : '刪除選中';

    selectAllBtn.textContent = allChecked ? '取消全選' : '全選';
};

App.deleteSelectedRecords = function() {
    if (this.selectedRecords.size === 0) return;

    const count = this.selectedRecords.size;
    if (!confirm(`確定要刪除 ${count} 筆記錄嗎？刪除後對應的保養流程將重新開啟。`)) {
        return;
    }

    // 刪除選中的記錄
    this.selectedRecords.forEach(recordId => {
        const index = this.history.findIndex(record => record.id === recordId);
        if (index !== -1) {
            this.history.splice(index, 1);
        }
    });

    this.selectedRecords.clear();
    this.saveData();

    // 更新視圖
    this.updateHistoryView();
    this.updateTodayView();

    alert(`✅ 已刪除 ${count} 筆記錄！`);
};

App.cancelSelectMode = function() {
    this.selectMode = false;
    this.selectedRecords.clear();

    document.getElementById('toggleSelectModeBtn').textContent = '選擇';
    document.getElementById('toggleSelectModeBtn').style.background = '';
    document.getElementById('batchActions').style.display = 'none';

    this.updateHistoryView();
};

App.checkNotificationPermission = function() {
    if ('Notification' in window) {
        this.notificationPermission = Notification.permission === 'granted';
        const btn = document.getElementById('notificationBtn');
        const testBtn = document.getElementById('testNotificationBtn');
        if (this.notificationPermission) {
            btn.textContent = '🔔 通知已啟用';
            btn.classList.add('enabled');
            if (testBtn) testBtn.style.display = 'block';
        }
    }
};

App.requestNotificationPermission = async function() {
    if (!('Notification' in window)) {
        alert('您的瀏覽器不支持通知功能');
        return;
    }

    if (Notification.permission === 'granted' && await PushManager.isSubscribed()) {
        alert('推送通知已啟用！即使關閉 App 也能收到提醒 🎉');
        return;
    }

    try {
        const btn = document.getElementById('notificationBtn');
        btn.textContent = '⏳ 啟用中...';
        btn.disabled = true;

        // 訂閱推送服務
        await PushManager.subscribe();

        this.notificationPermission = true;
        const testBtn = document.getElementById('testNotificationBtn');
        btn.textContent = '🔔 推送已啟用';
        btn.classList.add('enabled');
        btn.disabled = false;

        // 顯示測試通知按鈕
        if (testBtn) testBtn.style.display = 'block';

        // 顯示成功通知
        new Notification('保養提醒助手', {
            body: '推送通知已成功啟用！\n即使關閉 App 也能收到提醒 💜',
            icon: '/icon-192.png'
        });

        this.scheduleNotifications();
    } catch (error) {
        console.error('Push subscription error:', error);
        const btn = document.getElementById('notificationBtn');
        btn.textContent = '🔔 啟用通知';
        btn.disabled = false;
        alert('啟用推送通知失敗：' + error.message + '\n\n您仍可使用本地通知，但需要保持 App 開啟。');
    }
};

App.sendTestNotification = function() {
    if (!this.notificationPermission) {
        alert('請先啟用通知權限！');
        return;
    }

    // 發送測試通知
    const testRoutine = Object.values(this.routines)[0];
    const routineName = testRoutine ? testRoutine.name : '早晨保養流程';

    new Notification('⏰ 測試通知', {
        body: `這是一則測試通知！\n該執行「${routineName}」囉！`,
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        vibrate: [200, 100, 200],
        tag: 'test-notification',
        requireInteraction: false
    });

    alert('✅ 測試通知已發送！\n如果您看到通知，表示通知功能正常運作。');
};

App.scheduleNotifications = function() {
    if (!this.notificationPermission) return;

    // 清除現有的檢查計時器
    if (this.notificationInterval) {
        clearInterval(this.notificationInterval);
    }

    // 每分鐘檢查一次是否需要發送通知
    this.notificationInterval = setInterval(() => {
        this.checkAndSendNotifications();
    }, 60000); // 每分鐘檢查一次

    // 立即執行一次檢查
    this.checkAndSendNotifications();
};

App.checkAndSendNotifications = function() {
    if (!this.notificationPermission) return;

    const now = new Date();
    const currentDay = now.getDay();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const today = now.toDateString();

    // 獲取今天已發送的通知記錄
    const sentToday = JSON.parse(localStorage.getItem('sentNotifications') || '{}');
    if (sentToday.date !== today) {
        // 新的一天，清除記錄
        localStorage.setItem('sentNotifications', JSON.stringify({ date: today, slots: [] }));
        sentToday.date = today;
        sentToday.slots = [];
    }

    // 檢查每個時段
    this.timeSlots.forEach(slot => {
        if (!slot.enabled) return;
        if (!slot.weekdays.includes(currentDay)) return;
        if (sentToday.slots && sentToday.slots.includes(slot.id)) return; // 今天已發送過此通知

        const routine = this.routines[slot.routine];
        if (!routine) return;

        // 檢查是否到了通知時間（提前5分鐘通知）
        const slotTime = slot.time;
        const [slotHour, slotMinute] = slotTime.split(':').map(Number);
        const notificationTime = new Date(now);
        notificationTime.setHours(slotHour, slotMinute - 5, 0, 0);

        const currentTimeMs = now.getTime();
        const notificationTimeMs = notificationTime.getTime();
        const slotTimeDate = new Date(now);
        slotTimeDate.setHours(slotHour, slotMinute, 0, 0);

        // 如果當前時間在通知時間和時段時間之間，發送通知
        if (currentTimeMs >= notificationTimeMs && currentTimeMs <= slotTimeDate.getTime()) {
            // 發送通知
            new Notification(`⏰ ${slot.name}`, {
                body: `該執行「${routine.name}」囉！`,
                icon: '/icon-192.png',
                badge: '/icon-192.png',
                tag: `slot-${slot.id}`,
                requireInteraction: false,
                vibrate: [200, 100, 200]
            });

            // 記錄已發送
            if (!sentToday.slots) sentToday.slots = [];
            sentToday.slots.push(slot.id);
            localStorage.setItem('sentNotifications', JSON.stringify(sentToday));
        }
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
    const suggestType = document.querySelector('input[name="suggestType"]:checked')?.value || 'simple';

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
        let suggestion;
        if (suggestType === 'weekly') {
            suggestion = this.analyzeAndGenerateWeeklySuggestion(productsText, scheduleText, skinConcerns);
        } else {
            suggestion = this.analyzeAndGenerateSuggestion(productsText, scheduleText, skinConcerns);
        }
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

// 生成完整週計劃
App.analyzeAndGenerateWeeklySuggestion = function(productsText, scheduleText, skinConcerns) {
    const products = productsText.split('\n').filter(p => p.trim()).map(p => p.trim());
    const scheduleTimes = this.parseSchedule(scheduleText);
    const categorizedProducts = this.categorizeProducts(products);

    const routines = [];
    const timeSlots = [];

    // 週一到週日的流程（每天不同）
    const weekdays = ['週日', '週一', '週二', '週三', '週四', '週五', '週六'];
    const weekdayNums = [0, 1, 2, 3, 4, 5, 6];

    weekdayNums.forEach((dayNum, index) => {
        const dayName = weekdays[dayNum];

        // 早上保養（每天不同的重點）
        if (scheduleTimes.morning) {
            const isSpecialDay = dayNum === 1 || dayNum === 4; // 週一、週四使用特殊產品
            const morningSteps = this.buildDayMorningRoutine(categorizedProducts, skinConcerns, dayNum, isSpecialDay);

            routines.push({
                id: `ai-routine-morning-${dayNum}`,
                name: `【AI建議】${dayName}早上保養`,
                type: 'morning',
                steps: morningSteps
            });

            timeSlots.push({
                id: `ai-slot-morning-${dayNum}`,
                name: `${dayName}早上保養`,
                time: scheduleTimes.morning,
                routine: `ai-routine-morning-${dayNum}`,
                weekdays: [dayNum],
                enabled: true
            });
        }

        // 晚上保養（週期性使用特殊產品）
        if (scheduleTimes.night) {
            const isAcidDay = dayNum === 1 || dayNum === 4; // 週一、週四用酸類
            const isMaskDay = dayNum === 3 || dayNum === 6; // 週三、週六敷面膜

            const nightSteps = this.buildDayNightRoutine(categorizedProducts, skinConcerns, dayNum, isAcidDay, isMaskDay);

            routines.push({
                id: `ai-routine-night-${dayNum}`,
                name: `【AI建議】${dayName}晚上保養`,
                type: 'night',
                steps: nightSteps
            });

            timeSlots.push({
                id: `ai-slot-night-${dayNum}`,
                name: `${dayName}晚上保養`,
                time: scheduleTimes.night,
                routine: `ai-routine-night-${dayNum}`,
                weekdays: [dayNum],
                enabled: true
            });
        }
    });

    return { routines, timeSlots, products: categorizedProducts };
};

// 為特定日期建立早上流程
App.buildDayMorningRoutine = function(products, skinConcerns, dayNum, isSpecialDay) {
    const steps = [];

    // 基本清潔
    if (products.cleanser.length > 0) {
        steps.push({
            text: '溫水洗臉',
            notes: isSpecialDay ? '使用洗面乳深層清潔' : '只用溫水輕柔清潔',
            product: products.cleanser[0]
        });
    }

    // 特殊日使用化妝水或 Pad
    if (isSpecialDay && (products.toner.length > 0 || products.pad.length > 0)) {
        const product = products.pad.length > 0 ? products.pad[0] : products.toner[0];
        steps.push({
            text: '使用化妝水/Pad',
            notes: '幫助後續吸收',
            product: product
        });
    }

    // 精華液
    if (products.serum.length > 0) {
        steps.push({
            text: '塗抹精華液',
            notes: '輕拍至吸收',
            product: products.serum[0]
        });
    }

    // 保濕
    if (products.moisturizer.length > 0) {
        steps.push({
            text: '塗抹乳液/乳霜',
            notes: '鎖住水分',
            product: products.moisturizer[0]
        });
    }

    // 防曬（工作日）
    if (dayNum >= 1 && dayNum <= 5 && products.sunscreen.length > 0) {
        steps.push({
            text: '塗抹防曬',
            notes: 'SPF 足量使用',
            product: products.sunscreen[0]
        });
    }

    return steps;
};

// 為特定日期建立晚上流程
App.buildDayNightRoutine = function(products, skinConcerns, dayNum, isAcidDay, isMaskDay) {
    const steps = [];

    // 清潔
    if (products.cleanser.length > 0) {
        steps.push({
            text: '洗面乳洗臉',
            notes: '徹底清潔',
            product: products.cleanser[0]
        });
    }

    // 酸類日（週一、週四）
    if (isAcidDay && products.pad.length > 0) {
        steps.push({
            text: '使用酸類 Pad',
            notes: '去角質、改善粉刺',
            product: products.pad[0]
        });
    } else if (!isMaskDay && products.toner.length > 0) {
        // 非面膜日使用化妝水
        steps.push({
            text: '使用化妝水',
            notes: '補水準備',
            product: products.toner[0]
        });
    }

    // 面膜日（週三、週六）
    if (isMaskDay && products.mask.length > 0) {
        steps.push({
            text: '敷面膜',
            notes: '15-20分鐘',
            product: products.mask[0]
        });
    }

    // 精華液
    if (products.serum.length > 0) {
        steps.push({
            text: '塗抹精華液',
            notes: '重點保養',
            product: products.serum[0]
        });
    }

    // 保濕
    if (products.moisturizer.length > 0) {
        steps.push({
            text: '塗抹乳液/乳霜',
            notes: '鎖住養分',
            product: products.moisturizer[0]
        });
    }

    return steps;
};

// 導入 AI 建議
App.importSmartSuggestion = function() {
    const importText = document.getElementById('importInput').value.trim();

    if (!importText) {
        alert('請貼上 AI 生成的保養建議');
        return;
    }

    const btn = document.getElementById('importSuggestBtn');
    btn.classList.add('generating');
    btn.textContent = '解析中...';
    btn.disabled = true;

    setTimeout(() => {
        try {
            // 嘗試解析文本
            const suggestion = this.parseImportedSuggestion(importText);

            if (!suggestion || !suggestion.routines || suggestion.routines.length === 0) {
                throw new Error('無法解析建議內容');
            }

            this.smartSuggestion = suggestion;
            this.displaySuggestion(suggestion);

            btn.classList.remove('generating');
            btn.textContent = '解析並導入';
            btn.disabled = false;

            document.getElementById('smartSuggestResult').style.display = 'block';
            document.getElementById('applySuggestBtn').style.display = 'inline-block';
        } catch (error) {
            btn.classList.remove('generating');
            btn.textContent = '解析並導入';
            btn.disabled = false;
            alert('解析失敗：' + error.message + '\n\n請確認格式正確，或提供更詳細的描述');
        }
    }, 800);
};

// 解析導入的建議文本
App.parseImportedSuggestion = function(text) {
    // 先嘗試解析 JSON
    try {
        const json = JSON.parse(text);

        // 格式1：標準格式 { routines: [...], timeSlots: [...] }
        if (json.routines && json.timeSlots) {
            return json;
        }

        // 格式2：模板格式 { templates: [...], schedule: [...] }
        if (json.templates && json.schedule) {
            return this.parseTemplateJSON(json);
        }

        // 格式3：週計劃格式 [{ day: "Monday", routines: [...] }, ...]
        if (Array.isArray(json) && json.length > 0 && json[0].day && json[0].routines) {
            return this.parseWeeklyPlanJSON(json);
        }
    } catch (e) {
        // 不是 JSON，繼續文本解析
    }

    // 文本解析邏輯
    const routines = [];
    const timeSlots = [];
    let routineId = 0;

    // 按行分割，尋找流程描述
    const lines = text.split('\n').map(l => l.trim()).filter(l => l);

    let currentRoutine = null;
    let currentSteps = [];

    lines.forEach((line, index) => {
        // 檢測流程標題（包含時間或早/晚等關鍵字）
        const timeMatch = line.match(/(\d{1,2}[:：]\d{2})|([早晚中午睡前起床出門])/);
        const isTitle = line.includes('保養') || line.includes('流程') || timeMatch;

        if (isTitle && (line.length < 50)) {
            // 保存上一個流程
            if (currentRoutine && currentSteps.length > 0) {
                currentRoutine.steps = currentSteps;
                routines.push(currentRoutine);
            }

            // 創建新流程
            routineId++;
            const time = timeMatch ? timeMatch[0].replace('：', ':') : '08:00';

            currentRoutine = {
                id: `imported-routine-${routineId}`,
                name: line,
                type: 'custom',
                steps: []
            };

            currentSteps = [];

            // 創建對應時段
            timeSlots.push({
                id: `imported-slot-${routineId}`,
                name: line,
                time: time.includes(':') ? time : '08:00',
                routine: `imported-routine-${routineId}`,
                weekdays: [0, 1, 2, 3, 4, 5, 6],
                enabled: true
            });
        } else if (currentRoutine && line.length > 0) {
            // 這是步驟描述
            currentSteps.push({
                text: line,
                notes: ''
            });
        }
    });

    // 保存最後一個流程
    if (currentRoutine && currentSteps.length > 0) {
        currentRoutine.steps = currentSteps;
        routines.push(currentRoutine);
    }

    return { routines, timeSlots, products: {} };
};

// 解析週計劃 JSON 格式
App.parseWeeklyPlanJSON = function(weeklyData) {
    const routines = [];
    const timeSlots = [];

    // 星期幾映射
    const dayMap = {
        'Monday': 1, '週一': 1,
        'Tuesday': 2, '週二': 2,
        'Wednesday': 3, '週三': 3,
        'Thursday': 4, '週四': 4,
        'Friday': 5, '週五': 5,
        'Saturday': 6, '週六': 6,
        'Sunday': 0, '週日': 0
    };

    let routineId = 0;

    weeklyData.forEach(dayData => {
        const dayName = dayData.day;
        const dayNameZh = dayData.weekday_zh || '';
        const weekdayNum = dayMap[dayName] !== undefined ? dayMap[dayName] : dayMap[dayNameZh];

        if (weekdayNum === undefined) {
            console.warn('無法識別的星期:', dayName, dayNameZh);
            return;
        }

        // 處理這一天的所有流程
        dayData.routines.forEach(routineData => {
            routineId++;

            // 創建流程
            const routine = {
                id: `imported-routine-${routineId}`,
                name: `【${dayNameZh || dayName}】${routineData.label}`,
                type: 'custom',
                steps: []
            };

            // 處理步驟
            if (Array.isArray(routineData.steps)) {
                routine.steps = routineData.steps.map(step => {
                    if (typeof step === 'string') {
                        return { text: step, notes: '' };
                    } else if (step.text) {
                        return { text: step.text, notes: step.notes || '' };
                    }
                    return { text: String(step), notes: '' };
                });
            }

            routines.push(routine);

            // 創建時段
            const timeSlot = {
                id: `imported-slot-${routineId}`,
                name: `${dayNameZh || dayName} ${routineData.label}`,
                time: routineData.time || '08:00',
                routine: `imported-routine-${routineId}`,
                weekdays: [weekdayNum], // 只在特定星期幾執行
                enabled: true
            };

            timeSlots.push(timeSlot);
        });
    });

    console.log(`已解析週計劃：${routines.length} 個流程，${timeSlots.length} 個時段`);

    return { routines, timeSlots, products: {} };
};

// 解析模板格式的 JSON
App.parseTemplateJSON = function(templateData) {
    const routines = [];
    const timeSlots = [];

    // 星期幾映射
    const dayMap = {
        'Monday': 1, '週一': 1,
        'Tuesday': 2, '週二': 2,
        'Wednesday': 3, '週三': 3,
        'Thursday': 4, '週四': 4,
        'Friday': 5, '週五': 5,
        'Saturday': 6, '週六': 6,
        'Sunday': 0, '週日': 0
    };

    // 先建立模板映射
    const templateMap = {};
    if (templateData.templates) {
        templateData.templates.forEach(template => {
            templateMap[template.id] = template;
        });
    }

    let routineId = 0;

    // 處理排程
    if (templateData.schedule) {
        templateData.schedule.forEach(dayData => {
            const dayName = dayData.day;
            const dayNameZh = dayData.weekday_zh || '';
            const weekdayNum = dayMap[dayName] !== undefined ? dayMap[dayName] : dayMap[dayNameZh];

            if (weekdayNum === undefined) {
                console.warn('無法識別的星期:', dayName, dayNameZh);
                return;
            }

            // 處理這一天的所有流程
            dayData.routines.forEach(routineData => {
                routineId++;

                // 查找對應的模板
                const template = templateMap[routineData.template];
                if (!template) {
                    console.warn(`找不到模板: ${routineData.template}`);
                    return;
                }

                // 創建流程
                const routine = {
                    id: `imported-routine-${routineId}`,
                    name: `【${dayNameZh || dayName}】${template.label}`,
                    type: 'custom',
                    steps: []
                };

                // 從模板複製步驟
                if (Array.isArray(template.steps)) {
                    routine.steps = template.steps.map(step => {
                        if (typeof step === 'string') {
                            return { text: step, notes: '' };
                        } else if (step.text) {
                            return { text: step.text, notes: step.notes || '' };
                        }
                        return { text: String(step), notes: '' };
                    });
                }

                routines.push(routine);

                // 創建時段
                const timeSlot = {
                    id: `imported-slot-${routineId}`,
                    name: `${dayNameZh || dayName} ${template.label}`,
                    time: routineData.time || '08:00',
                    routine: `imported-routine-${routineId}`,
                    weekdays: [weekdayNum], // 只在特定星期幾執行
                    enabled: true
                };

                timeSlots.push(timeSlot);
            });
        });
    }

    console.log(`已解析模板計劃：${routines.length} 個流程，${timeSlots.length} 個時段`);

    return { routines, timeSlots, products: {} };
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

// === 集章日曆功能 ===

App.currentCalendarMonth = new Date();

App.updateCalendarView = function(date = this.currentCalendarMonth) {
    this.currentCalendarMonth = date;

    const year = date.getFullYear();
    const month = date.getMonth();

    // 更新月份標題
    const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
    document.getElementById('calendarMonth').textContent = `${year}年 ${monthNames[month]}`;

    // 生成日曆網格
    const grid = document.getElementById('calendarGrid');
    grid.innerHTML = '';

    // 添加星期標題
    const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
    weekdays.forEach(day => {
        const header = document.createElement('div');
        header.className = 'calendar-day-header';
        header.textContent = day;
        grid.appendChild(header);
    });

    // 獲取本月第一天和最後一天
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const firstDayWeekday = firstDay.getDay();
    const daysInMonth = lastDay.getDate();

    // 獲取上個月的最後幾天
    const prevMonthLastDay = new Date(year, month, 0).getDate();

    // 今天的日期
    const today = new Date();
    const todayStr = today.toDateString();

    // 填充上個月的日期
    for (let i = firstDayWeekday - 1; i >= 0; i--) {
        const dayNum = prevMonthLastDay - i;
        const dayDate = new Date(year, month - 1, dayNum);
        this.createCalendarDay(grid, dayNum, dayDate, true);
    }

    // 填充本月的日期
    for (let day = 1; day <= daysInMonth; day++) {
        const dayDate = new Date(year, month, day);
        this.createCalendarDay(grid, day, dayDate, false, dayDate.toDateString() === todayStr);
    }

    // 填充下個月的日期（湊滿6週）
    const totalCells = grid.children.length - 7; // 減去星期標題
    const remainingCells = (6 * 7) - totalCells;
    for (let day = 1; day <= remainingCells; day++) {
        const dayDate = new Date(year, month + 1, day);
        this.createCalendarDay(grid, day, dayDate, true);
    }

    // 更新月統計
    this.updateMonthStats(year, month);
};

App.createCalendarDay = function(grid, dayNum, date, isOtherMonth, isToday = false) {
    const dateStr = date.toDateString();

    // 獲取當天的所有完成記錄
    const dayRecords = this.history.filter(record => {
        const recordDate = new Date(record.date).toDateString();
        return recordDate === dateStr && record.completed;
    });

    // 獲取當天應該有的時段數量
    const weekday = date.getDay();
    const expectedSlots = this.timeSlots.filter(slot =>
        slot.enabled && slot.weekdays.includes(weekday)
    );

    const completedCount = dayRecords.length;
    const totalCount = expectedSlots.length;
    const completionRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    const dayDiv = document.createElement('div');
    dayDiv.className = 'calendar-day';

    if (isOtherMonth) {
        dayDiv.classList.add('other-month');
    }

    if (isToday) {
        dayDiv.classList.add('today');
    }

    if (completedCount > 0) {
        if (completionRate === 100) {
            dayDiv.classList.add('completed');
        } else {
            dayDiv.classList.add('partial');
        }
    }

    let dayHTML = `<div class="day-number">${dayNum}</div>`;

    if (completedCount > 0) {
        if (completionRate === 100) {
            dayHTML += `<div class="day-icon">🐾</div>`;
        } else {
            dayHTML += `<div class="day-completion">${completionRate}%</div>`;
        }
    }

    dayDiv.innerHTML = dayHTML;

    // 點擊顯示詳情
    dayDiv.addEventListener('click', () => {
        if (dayRecords.length > 0) {
            this.showDayDetail(date, dayRecords, expectedSlots.length);
        }
    });

    grid.appendChild(dayDiv);
};

App.showDayDetail = function(date, records, totalSlots) {
    const dateStr = date.toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric' });
    const completionRate = totalSlots > 0 ? Math.round((records.length / totalSlots) * 100) : 0;

    let details = `📅 ${dateStr}\n\n`;
    details += `完成度：${records.length}/${totalSlots} (${completionRate}%)\n\n`;
    details += `完成的流程：\n`;
    records.forEach(record => {
        const time = new Date(record.date).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' });
        details += `✓ ${time} - ${record.routineName}\n`;
    });

    alert(details);
};

App.updateMonthStats = function(year, month) {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    let perfectDays = 0;
    let totalCompletion = 0;
    let daysWithSlots = 0;

    for (let day = 1; day <= lastDay.getDate(); day++) {
        const date = new Date(year, month, day);
        const dateStr = date.toDateString();
        const weekday = date.getDay();

        // 獲取當天應有的時段
        const expectedSlots = this.timeSlots.filter(slot =>
            slot.enabled && slot.weekdays.includes(weekday)
        );

        if (expectedSlots.length === 0) continue;

        daysWithSlots++;

        // 獲取當天完成的記錄
        const completedRecords = this.history.filter(record => {
            const recordDate = new Date(record.date).toDateString();
            return recordDate === dateStr && record.completed;
        });

        const completionRate = (completedRecords.length / expectedSlots.length) * 100;
        totalCompletion += completionRate;

        if (completionRate === 100) {
            perfectDays++;
        }
    }

    const avgCompletion = daysWithSlots > 0 ? Math.round(totalCompletion / daysWithSlots) : 0;

    document.getElementById('monthPerfectDays').textContent = perfectDays;
    document.getElementById('monthCompletionRate').textContent = avgCompletion + '%';
};

App.changeMonth = function(offset) {
    const newDate = new Date(this.currentCalendarMonth);
    newDate.setMonth(newDate.getMonth() + offset);
    this.updateCalendarView(newDate);
};

// === 產品批量選擇功能 ===

App.toggleProductSelectMode = function() {
    this.productSelectMode = !this.productSelectMode;
    this.selectedProducts.clear();

    const toggleBtn = document.getElementById('toggleProductSelectModeBtn');
    const batchActions = document.getElementById('productBatchActions');

    if (this.productSelectMode) {
        toggleBtn.textContent = '取消選擇';
        toggleBtn.style.background = '#FF9800';
        batchActions.style.display = 'flex';
    } else {
        toggleBtn.textContent = '選擇';
        toggleBtn.style.background = '';
        batchActions.style.display = 'none';
    }

    this.updateProductsView();
};

App.selectAllProducts = function() {
    const checkboxes = document.querySelectorAll('.product-checkbox');
    const allChecked = checkboxes.length > 0 && Array.from(checkboxes).every(cb => cb.checked);

    if (allChecked) {
        checkboxes.forEach(checkbox => {
            checkbox.checked = false;
            this.selectedProducts.delete(checkbox.dataset.productId);
        });
        document.getElementById('selectAllProductsBtn').textContent = '全選';
    } else {
        checkboxes.forEach(checkbox => {
            checkbox.checked = true;
            this.selectedProducts.add(checkbox.dataset.productId);
        });
        document.getElementById('selectAllProductsBtn').textContent = '取消全選';
    }

    this.updateProductDeleteButtonState();
};

App.updateProductDeleteButtonState = function() {
    const deleteBtn = document.getElementById('deleteSelectedProductsBtn');
    const selectAllBtn = document.getElementById('selectAllProductsBtn');
    const checkboxes = document.querySelectorAll('.product-checkbox');
    const allChecked = checkboxes.length > 0 && Array.from(checkboxes).every(cb => cb.checked);

    deleteBtn.disabled = this.selectedProducts.size === 0;
    deleteBtn.textContent = this.selectedProducts.size > 0
        ? `刪除選中 (${this.selectedProducts.size})`
        : '刪除選中';

    selectAllBtn.textContent = allChecked ? '取消全選' : '全選';
};

App.deleteSelectedProducts = function() {
    if (this.selectedProducts.size === 0) return;

    const count = this.selectedProducts.size;
    if (!confirm(`確定要刪除 ${count} 個產品嗎？`)) {
        return;
    }

    // 刪除選中的產品
    this.selectedProducts.forEach(productId => {
        delete this.products[productId];
    });

    this.selectedProducts.clear();
    this.saveData();

    // 更新視圖
    this.updateProductsView();

    alert(`✅ 已刪除 ${count} 個產品！`);

    // 離開選擇模式
    this.cancelProductSelectMode();
};

App.cancelProductSelectMode = function() {
    this.productSelectMode = false;
    this.selectedProducts.clear();

    document.getElementById('toggleProductSelectModeBtn').textContent = '選擇';
    document.getElementById('toggleProductSelectModeBtn').style.background = '';
    document.getElementById('productBatchActions').style.display = 'none';

    this.updateProductsView();
};

// === 提醒管理功能 ===

App.updateRemindersView = function() {
    const list = document.getElementById('remindersList');
    list.innerHTML = '';

    if (this.reminders.length === 0) {
        list.innerHTML = '<div style="text-align: center; color: #999; padding: 40px;">尚無提醒<br>點擊「新增提醒」建立您的第一個提醒</div>';
        return;
    }

    // 按時間排序
    const sortedReminders = [...this.reminders].sort((a, b) => a.time.localeCompare(b.time));

    sortedReminders.forEach(reminder => {
        const advanceText = reminder.advanceMinutes > 0
            ? ` <span style="color: var(--warning-color); font-size: 12px;">(提前 ${reminder.advanceMinutes} 分鐘)</span>`
            : '';

        let scheduleText = '';
        if (reminder.isOneTime) {
            // 一次性提醒
            const dateObj = new Date(reminder.date + 'T00:00:00');
            const dateStr = `${dateObj.getMonth() + 1}月${dateObj.getDate()}日`;
            scheduleText = `📅 ${dateStr}`;
        } else {
            // 重複提醒
            const weekdayNames = ['日', '一', '二', '三', '四', '五', '六'];
            const daysText = (reminder.weekdays || []).map(d => weekdayNames[d]).join('、');
            scheduleText = `週${daysText}`;
        }

        const card = document.createElement('div');
        card.className = 'reminder-card';
        card.innerHTML = `
            <div class="reminder-info">
                <div class="reminder-title">${reminder.title}</div>
                <div class="reminder-content">${reminder.content || ''}</div>
                <div class="reminder-time">⏰ ${reminder.time}${advanceText}</div>
                <div class="reminder-days">${scheduleText}</div>
            </div>
            <div class="reminder-actions">
                <button class="btn-icon edit" data-id="${reminder.id}">✏️</button>
                <button class="btn-icon delete" data-id="${reminder.id}">🗑️</button>
            </div>
        `;

        card.querySelector('.edit').addEventListener('click', () => this.editReminder(reminder.id));
        card.querySelector('.delete').addEventListener('click', () => this.deleteReminder(reminder.id));

        list.appendChild(card);
    });
};

App.showReminderModal = function(reminderId = null) {
    this.editingReminderId = reminderId;
    const modal = document.getElementById('reminderModal');

    if (reminderId) {
        const reminder = this.reminders.find(r => r.id === reminderId);
        if (reminder) {
            document.getElementById('reminderTitle').value = reminder.title;
            document.getElementById('reminderContent').value = reminder.content || '';
            document.getElementById('reminderTime').value = reminder.time;
            document.getElementById('reminderAdvanceMinutes').value = reminder.advanceMinutes || 0;

            // 設定提醒類型
            if (reminder.isOneTime) {
                document.getElementById('reminderTypeOneTime').checked = true;
                document.getElementById('reminderDate').value = reminder.date || '';
                document.getElementById('reminderDateGroup').style.display = 'block';
                document.getElementById('reminderWeekdaysGroup').style.display = 'none';
            } else {
                document.getElementById('reminderTypeRecurring').checked = true;
                document.getElementById('reminderDateGroup').style.display = 'none';
                document.getElementById('reminderWeekdaysGroup').style.display = 'block';
                // 設定星期選擇
                document.querySelectorAll('.reminder-weekday').forEach(input => {
                    input.checked = (reminder.weekdays || []).includes(parseInt(input.value));
                });
            }
        }
    } else {
        document.getElementById('reminderTitle').value = '';
        document.getElementById('reminderContent').value = '';
        document.getElementById('reminderTime').value = '';
        document.getElementById('reminderDate').value = '';
        document.getElementById('reminderAdvanceMinutes').value = 0;
        document.getElementById('reminderTypeRecurring').checked = true;
        document.getElementById('reminderDateGroup').style.display = 'none';
        document.getElementById('reminderWeekdaysGroup').style.display = 'block';
        document.querySelectorAll('.reminder-weekday').forEach(input => {
            input.checked = false;
        });
    }

    modal.classList.add('active');
};

App.editReminder = function(id) {
    this.showReminderModal(id);
};

App.saveReminder = function() {
    const title = document.getElementById('reminderTitle').value.trim();
    const content = document.getElementById('reminderContent').value.trim();
    const time = document.getElementById('reminderTime').value;
    const advanceMinutes = parseInt(document.getElementById('reminderAdvanceMinutes').value) || 0;
    const isOneTime = document.getElementById('reminderTypeOneTime').checked;

    if (!title || !time) {
        alert('請填寫提醒標題和時間！');
        return;
    }

    let date = null;
    let weekdays = [];

    if (isOneTime) {
        // 一次性提醒
        date = document.getElementById('reminderDate').value;
        if (!date) {
            alert('請選擇提醒日期！');
            return;
        }
    } else {
        // 重複提醒
        document.querySelectorAll('.reminder-weekday:checked').forEach(input => {
            weekdays.push(parseInt(input.value));
        });

        if (weekdays.length === 0) {
            alert('請至少選擇一個重複日期！');
            return;
        }
    }

    if (this.editingReminderId) {
        // 編輯現有提醒
        const reminder = this.reminders.find(r => r.id === this.editingReminderId);
        if (reminder) {
            reminder.title = title;
            reminder.content = content;
            reminder.time = time;
            reminder.isOneTime = isOneTime;
            reminder.date = date;
            reminder.weekdays = weekdays;
            reminder.advanceMinutes = advanceMinutes;
        }
    } else {
        // 新增提醒
        const newReminder = {
            id: 'reminder-' + Date.now(),
            title,
            content,
            time,
            isOneTime,
            date,
            weekdays,
            advanceMinutes,
            enabled: true
        };
        this.reminders.push(newReminder);
    }

    this.saveData();
    this.updateRemindersView();

    document.getElementById('reminderModal').classList.remove('active');
    this.editingReminderId = null;
};

App.deleteReminder = function(id) {
    if (!confirm('確定要刪除此提醒嗎？')) return;

    this.reminders = this.reminders.filter(r => r.id !== id);
    this.saveData();
    this.updateRemindersView();
};

App.editRoutine = function(routineId) {
    const routine = this.routines[routineId];
    if (!routine) {
        alert('找不到此流程');
        return;
    }

    this.editingRoutineId = routineId;

    // 設置流程名稱
    document.getElementById('editRoutineName').value = routine.name;

    // 渲染步驟列表
    this.renderEditSteps();

    // 顯示 modal
    document.getElementById('editRoutineModal').classList.add('active');
};

App.renderEditSteps = function() {
    const routine = this.routines[this.editingRoutineId];
    if (!routine) return;

    const stepsContainer = document.getElementById('editRoutineSteps');
    stepsContainer.innerHTML = '';

    routine.steps.forEach((step, index) => {
        const stepDiv = document.createElement('div');
        stepDiv.className = 'edit-step-item';
        stepDiv.style.cssText = 'margin-bottom: 15px; padding: 15px; border: 1px solid #e0e0e0; border-radius: 8px; background: #f9f9f9; position: relative;';

        stepDiv.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <strong style="color: #333;">步驟 ${index + 1}</strong>
                <button class="btn-icon delete-step-btn" data-step-index="${index}" style="color: #d32f2f;">🗑️</button>
            </div>
            <div style="margin-bottom: 10px;">
                <label style="font-size: 13px; color: #666; display: block; margin-bottom: 5px;">步驟描述</label>
                <input type="text" class="step-text-input" data-step-index="${index}" value="${step.text}"
                    style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
            </div>
            <div style="margin-bottom: 10px;">
                <label style="font-size: 13px; color: #666; display: block; margin-bottom: 5px;">備註（選填）</label>
                <input type="text" class="step-notes-input" data-step-index="${index}" value="${step.notes || ''}"
                    style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;"
                    placeholder="例如：溫和清潔，不要過度摩擦">
            </div>
        `;

        // 添加刪除按鈕事件
        setTimeout(() => {
            const deleteBtn = stepDiv.querySelector('.delete-step-btn');
            deleteBtn.addEventListener('click', () => this.deleteEditStep(index));
        }, 0);

        stepsContainer.appendChild(stepDiv);
    });

    // 添加"新增步驟"按鈕
    const addBtnDiv = document.createElement('div');
    addBtnDiv.style.cssText = 'margin-top: 15px; text-align: center;';
    addBtnDiv.innerHTML = `
        <button class="btn-primary" id="addStepBtn" style="padding: 10px 20px;">
            ➕ 新增步驟
        </button>
    `;
    stepsContainer.appendChild(addBtnDiv);

    setTimeout(() => {
        document.getElementById('addStepBtn').addEventListener('click', () => this.addEditStep());
    }, 0);
};

App.deleteEditStep = function(stepIndex) {
    const routine = this.routines[this.editingRoutineId];
    if (!routine) return;

    if (routine.steps.length <= 1) {
        alert('至少需要保留一個步驟！');
        return;
    }

    if (confirm(`確定要刪除步驟 ${stepIndex + 1}：${routine.steps[stepIndex].text}？`)) {
        routine.steps.splice(stepIndex, 1);
        this.renderEditSteps();
    }
};

App.addEditStep = function() {
    const routine = this.routines[this.editingRoutineId];
    if (!routine) return;

    routine.steps.push({
        text: '新步驟',
        notes: ''
    });
    this.renderEditSteps();
};

App.saveEditRoutine = function() {
    const routine = this.routines[this.editingRoutineId];
    if (!routine) return;

    // 更新流程名稱
    const newName = document.getElementById('editRoutineName').value.trim();
    if (!newName) {
        alert('請輸入流程名稱！');
        return;
    }
    routine.name = newName;

    // 收集所有步驟的文本和備註
    const textInputs = document.querySelectorAll('.step-text-input');
    const notesInputs = document.querySelectorAll('.step-notes-input');

    textInputs.forEach((input, index) => {
        const text = input.value.trim();
        if (!text) {
            alert(`步驟 ${index + 1} 的描述不能為空！`);
            return;
        }
        routine.steps[index].text = text;
    });

    notesInputs.forEach((input, index) => {
        routine.steps[index].notes = input.value.trim();
    });

    this.saveData();
    this.updateRoutinesView();

    // 關閉 modal
    document.getElementById('editRoutineModal').classList.remove('active');
    this.editingRoutineId = null;

    alert('流程已更新！');
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

        // 檢查提醒
        App.reminders.forEach(reminder => {
            if (reminder.enabled && reminder.time === currentTime && reminder.weekdays.includes(weekday)) {
                new Notification(reminder.title, {
                    body: reminder.content || '提醒時間到了！',
                    icon: '/icon-192.png',
                    requireInteraction: true
                });
            }
        });
    }
}, 60000);

// === AI 智能推薦功能 ===

// 顯示 AI 設定對話框
App.showAiSettingsModal = function() {
    // 載入已儲存的設定
    const settings = this.loadAiSettings();

    document.getElementById('claudeApiKey').value = settings.claudeApiKey || '';
    document.getElementById('weatherApiKey').value = settings.weatherApiKey || '';
    document.getElementById('userLocation').value = settings.userLocation || '';
    document.getElementById('googleSheetUrl').value = settings.googleSheetUrl || '';
    document.getElementById('enableAI').checked = settings.enableAI || false;

    document.getElementById('aiSettingsModal').classList.add('active');
};

// 儲存 AI 設定
App.saveAiSettings = async function() {
    const settings = {
        claudeApiKey: document.getElementById('claudeApiKey').value.trim(),
        weatherApiKey: document.getElementById('weatherApiKey').value.trim(),
        userLocation: document.getElementById('userLocation').value,
        googleSheetUrl: document.getElementById('googleSheetUrl').value.trim(),
        enableAI: document.getElementById('enableAI').checked
    };

    // 驗證必填欄位
    if (settings.enableAI) {
        if (!settings.claudeApiKey) {
            alert('請輸入 Claude API Key');
            return;
        }
        if (!settings.weatherApiKey) {
            alert('請輸入中央氣象局 API Key');
            return;
        }
        if (!settings.userLocation) {
            alert('請選擇您的位置');
            return;
        }
        if (!settings.googleSheetUrl) {
            alert('請輸入 Google Sheets 班表連結');
            return;
        }
    }

    // 儲存到 localStorage
    localStorage.setItem('ai_settings', JSON.stringify(settings));

    document.getElementById('aiSettingsModal').classList.remove('active');

    // 如果有 Google Sheet 連結，立即讀取班表
    if (settings.googleSheetUrl) {
        try {
            await this.loadScheduleFromGoogleSheets(settings.googleSheetUrl);
            alert('✅ AI 設定已儲存，班表已同步！');
        } catch (error) {
            alert(`⚠️ AI 設定已儲存，但班表讀取失敗：${error.message}`);
        }
    } else {
        alert('✅ AI 設定已儲存！');
    }

    // 如果啟用 AI，立即獲取一次推薦
    if (settings.enableAI) {
        this.getDailyAIRecommendation();
    }
};

// 載入 AI 設定
App.loadAiSettings = function() {
    const saved = localStorage.getItem('ai_settings');
    if (saved) {
        try {
            return JSON.parse(saved);
        } catch (e) {
            console.error('無法載入 AI 設定:', e);
        }
    }
    return {};
};

// 從 Google Sheets 載入 Sunny 的班表
App.loadScheduleFromGoogleSheets = async function(sheetUrl) {
    try {
        console.log('開始讀取 Google Sheets 班表...');
        console.log('原始 URL:', sheetUrl);

        // 解析 Google Sheets URL，提取 Sheet ID 和 gid
        let sheetId, gid;

        // 格式1: /d/{sheetId}/edit#gid={gid}
        // 格式2: /d/{sheetId}/edit?gid={gid}
        const urlMatch = sheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
        if (!urlMatch) {
            throw new Error('無效的 Google Sheets 連結格式');
        }
        sheetId = urlMatch[1];
        console.log('Sheet ID:', sheetId);

        // 提取 gid（嘗試多種格式）
        // 優先使用 ?gid= 或 &gid=，其次使用 #gid=
        let gidMatch = sheetUrl.match(/[?&]gid=([0-9]+)/);
        if (!gidMatch) {
            gidMatch = sheetUrl.match(/#gid=([0-9]+)/);
        }
        gid = gidMatch ? gidMatch[1] : '0';
        console.log('提取的 gid:', gid);

        // 建立 CSV 匯出 URL
        const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
        console.log('CSV URL:', csvUrl);

        // 獲取 CSV 資料
        const response = await fetch(csvUrl);
        if (!response.ok) {
            throw new Error(`無法存取 Google Sheets (${response.status})。請確認已設定為「知道連結的任何人」可檢視`);
        }

        const csvText = await response.text();
        console.log('成功獲取 CSV 資料');

        // 解析 CSV
        const lines = csvText.split('\n');
        if (lines.length < 2) {
            throw new Error('Google Sheets 資料格式錯誤');
        }

        // 第一行是日期標題（姓名, 11/29, 11/30, 12/1, ...）
        const dateHeaders = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        console.log('日期標題（前10個）:', dateHeaders.slice(0, 10));
        console.log('總共', lines.length, '行資料');

        // 顯示前幾行資料以便除錯
        console.log('前5行資料預覽:');
        for (let i = 0; i < Math.min(5, lines.length); i++) {
            const row = lines[i].split(',').map(cell => cell.trim().replace(/"/g, ''));
            console.log(`  行${i}: [${row.slice(0, 5).join(', ')}...]`);
        }

        // 找到 Sunny 的資料行（支援不同欄位和大小寫）
        let sunnyRow = null;
        let sunnyRowIndex = -1;
        let nameColumnIndex = -1;

        for (let i = 1; i < lines.length; i++) {
            const row = lines[i].split(',').map(cell => cell.trim().replace(/"/g, ''));

            // 檢查所有欄位，找到包含 "sunny" 的（不區分大小寫）
            for (let j = 0; j < Math.min(row.length, 5); j++) {
                const cellValue = row[j];
                if (cellValue && cellValue.toLowerCase().includes('sunny')) {
                    sunnyRow = row;
                    sunnyRowIndex = i;
                    nameColumnIndex = j;
                    console.log(`✅ 找到 Sunny！位於第 ${i + 1} 行，第 ${j + 1} 欄（${String.fromCharCode(65 + j)} 欄）`);
                    console.log(`   姓名欄位內容: "${cellValue}"`);
                    console.log(`   該行前10個欄位:`, row.slice(0, 10));
                    break;
                }
            }

            if (sunnyRow) break;
        }

        if (!sunnyRow) {
            // 提供更詳細的錯誤訊息
            console.error('❌ 找不到 Sunny 的資料');
            console.error('請檢查:');
            console.error('1. Google Sheets 連結是否包含正確的 gid (完整班表的分頁)');
            console.error('2. 姓名欄位是否為「Sunny」（可能有額外空格或不同寫法）');
            console.error('3. 工作表是否設定為「知道連結的任何人」可檢視');

            throw new Error('在 Google Sheets 中找不到「Sunny」的班表資料。請查看瀏覽器主控台（F12）的詳細除錯資訊');
        }

        // 解析班表資料
        const schedules = {};
        const currentYear = new Date().getFullYear();
        const currentMonth = new Date().getMonth() + 1; // 1-12

        // 從姓名欄位的下一欄開始是日期資料
        const dateStartIndex = nameColumnIndex + 1;
        console.log(`日期資料從第 ${dateStartIndex + 1} 欄開始`);

        for (let i = dateStartIndex; i < dateHeaders.length && i < sunnyRow.length; i++) {
            const dateStr = dateHeaders[i]; // 例如: "11/29", "12/1"
            const shift = sunnyRow[i]; // 例如: "N3", "O", "M1"

            if (!dateStr || !shift) continue;

            // 解析日期 (月/日 格式)
            const dateMatch = dateStr.match(/(\d+)\/(\d+)/);
            if (!dateMatch) continue;

            let month = parseInt(dateMatch[1]);
            let day = parseInt(dateMatch[2]);

            // 判斷年份：如果月份小於當前月份，可能是明年
            let year = currentYear;
            if (month < currentMonth) {
                year = currentYear + 1;
            }

            // 格式化為 YYYY-MM-DD
            const dateKey = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

            // 判斷班別類型
            const shiftType = this.getShiftType(shift);

            schedules[dateKey] = {
                shift: shift,
                type: shiftType
            };
        }

        console.log('成功解析班表，共', Object.keys(schedules).length, '天');
        console.log('班表範例:', Object.entries(schedules).slice(0, 5));

        // 儲存到 App.schedules
        this.schedules = schedules;
        this.saveData();

        return schedules;

    } catch (error) {
        console.error('讀取 Google Sheets 失敗:', error);
        throw error;
    }
};

// 判斷班別類型（上班/休假）
App.getShiftType = function(shift) {
    if (!shift) return 'unknown';

    const shiftUpper = shift.toUpperCase();

    // 休假類型：O (休), P (特休), BTD (生日假)
    if (shiftUpper === 'O' || shiftUpper === 'P' || shiftUpper === 'BTD') {
        return 'off';
    }

    // 上班類型：N/N1/N2/N3 (夜班), M/M1/M2/M3 (早班), A/A1/A2 (中班)
    if (shiftUpper.startsWith('N') || shiftUpper.startsWith('M') || shiftUpper.startsWith('A')) {
        return 'work';
    }

    return 'unknown';
};

// 獲取當前時段資訊（根據班別和時間）
App.getCurrentTimeSlot = function() {
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTime = currentHour * 60 + currentMinute; // 轉換為分鐘數以便比較

    // 獲取今日班表
    const todaySchedule = this.schedules[today];

    if (!todaySchedule) {
        console.warn('今天沒有班表資料，使用預設時段');
        return this.getDefaultTimeSlot(currentTime);
    }

    const shift = todaySchedule.shift.toUpperCase();
    const shiftType = todaySchedule.type;

    // 休假日：使用一般作息
    if (shiftType === 'off') {
        return this.getOffDayTimeSlot(currentTime, shift);
    }

    // 上班日：根據班別判斷
    if (shift.startsWith('N')) {
        // 夜班：20:30 起床 → 上班 → 08:00 下班 → 12:00 睡覺
        return this.getNightShiftTimeSlot(currentTime, shift);
    } else if (shift.startsWith('M')) {
        // 早班：05:00-05:30 起床 → 上班 → 16:30 下班 → 23:00 睡覺
        return this.getMorningShiftTimeSlot(currentTime, shift);
    } else if (shift.startsWith('A')) {
        // 中班：12:00 起床 → 上班 → 23:30 下班 → 02:00-03:00 睡覺
        return this.getAfternoonShiftTimeSlot(currentTime, shift);
    }

    // 未知班別，使用預設
    return this.getDefaultTimeSlot(currentTime);
};

// 夜班時段判斷（20:30 起床 → 上班 → 08:00 下班 → 12:00 睡覺）
App.getNightShiftTimeSlot = function(currentTime, shift) {
    const wake = 20 * 60 + 30; // 20:30
    const workOff = 8 * 60; // 08:00 (隔天)
    const sleep = 12 * 60; // 12:00

    // 20:30-21:30: 起床後
    if (currentTime >= wake && currentTime < wake + 60) {
        return { slot: 'wake', label: '起床後', description: `夜班 ${shift}，剛起床準備上班`, shift };
    }
    // 21:30-22:00: 上班前
    if (currentTime >= wake + 60 || currentTime < 0) {
        return { slot: 'before_work', label: '上班前', description: `夜班 ${shift}，準備出門上班`, shift };
    }
    // 08:00-09:00: 下班後
    if (currentTime >= workOff && currentTime < workOff + 60) {
        return { slot: 'after_work', label: '下班後', description: `夜班 ${shift}，剛下班返家`, shift };
    }
    // 11:00-12:00: 睡前
    if (currentTime >= sleep - 60 && currentTime < sleep) {
        return { slot: 'before_sleep', label: '睡前', description: `夜班 ${shift}，準備休息`, shift };
    }
    // 其他時間（睡眠中）
    return { slot: 'resting', label: '休息中', description: `夜班 ${shift}，休息時間`, shift };
};

// 早班時段判斷（05:00-05:30 起床 → 上班 → 16:30 下班 → 23:00 睡覺）
App.getMorningShiftTimeSlot = function(currentTime, shift) {
    const wake = 5 * 60; // 05:00
    const workOff = 16 * 60 + 30; // 16:30
    const sleep = 23 * 60; // 23:00

    // 05:00-06:00: 起床後
    if (currentTime >= wake && currentTime < wake + 60) {
        return { slot: 'wake', label: '起床後', description: `早班 ${shift}，剛起床準備上班`, shift };
    }
    // 06:00-07:00: 上班前
    if (currentTime >= wake + 60 && currentTime < wake + 120) {
        return { slot: 'before_work', label: '上班前', description: `早班 ${shift}，準備出門上班`, shift };
    }
    // 16:30-17:30: 下班後
    if (currentTime >= workOff && currentTime < workOff + 60) {
        return { slot: 'after_work', label: '下班後', description: `早班 ${shift}，剛下班返家`, shift };
    }
    // 22:00-23:00: 睡前
    if (currentTime >= sleep - 60 && currentTime < sleep) {
        return { slot: 'before_sleep', label: '睡前', description: `早班 ${shift}，準備休息`, shift };
    }
    // 其他時間
    if (currentTime >= wake + 120 && currentTime < workOff) {
        return { slot: 'working', label: '工作中', description: `早班 ${shift}，工作時間`, shift };
    }
    return { slot: 'resting', label: '休息中', description: `早班 ${shift}，休息時間`, shift };
};

// 中班時段判斷（12:00 起床 → 上班 → 23:30 下班 → 02:00-03:00 睡覺）
App.getAfternoonShiftTimeSlot = function(currentTime, shift) {
    const wake = 12 * 60; // 12:00
    const workOff = 23 * 60 + 30; // 23:30
    const sleep = 2 * 60 + 30; // 02:30 (隔天)

    // 12:00-13:00: 起床後
    if (currentTime >= wake && currentTime < wake + 60) {
        return { slot: 'wake', label: '起床後', description: `中班 ${shift}，剛起床準備上班`, shift };
    }
    // 13:00-14:00: 上班前
    if (currentTime >= wake + 60 && currentTime < wake + 120) {
        return { slot: 'before_work', label: '上班前', description: `中班 ${shift}，準備出門上班`, shift };
    }
    // 23:30-00:30: 下班後（跨日）
    if (currentTime >= workOff || currentTime < 30) {
        return { slot: 'after_work', label: '下班後', description: `中班 ${shift}，剛下班返家`, shift };
    }
    // 01:30-02:30: 睡前
    if (currentTime >= sleep - 60 && currentTime < sleep) {
        return { slot: 'before_sleep', label: '睡前', description: `中班 ${shift}，準備休息`, shift };
    }
    // 其他時間
    if (currentTime >= wake + 120 && currentTime < workOff) {
        return { slot: 'working', label: '工作中', description: `中班 ${shift}，工作時間`, shift };
    }
    return { slot: 'resting', label: '休息中', description: `中班 ${shift}，休息時間`, shift };
};

// 休假日時段判斷
App.getOffDayTimeSlot = function(currentTime, shift) {
    const wake = 9 * 60; // 09:00
    const sleep = 23 * 60; // 23:00

    // 09:00-10:00: 起床後
    if (currentTime >= wake && currentTime < wake + 60) {
        return { slot: 'wake', label: '起床後', description: `休假日 (${shift})，享受悠閒早晨`, shift };
    }
    // 10:00-12:00: 日間保養
    if (currentTime >= wake + 60 && currentTime < 12 * 60) {
        return { slot: 'morning', label: '上午', description: `休假日 (${shift})，日間活動`, shift };
    }
    // 12:00-18:00: 下午時段
    if (currentTime >= 12 * 60 && currentTime < 18 * 60) {
        return { slot: 'afternoon', label: '下午', description: `休假日 (${shift})，下午時光`, shift };
    }
    // 18:00-22:00: 晚間時段
    if (currentTime >= 18 * 60 && currentTime < 22 * 60) {
        return { slot: 'evening', label: '晚間', description: `休假日 (${shift})，晚間放鬆`, shift };
    }
    // 22:00-23:00: 睡前
    if (currentTime >= sleep - 60 && currentTime < sleep) {
        return { slot: 'before_sleep', label: '睡前', description: `休假日 (${shift})，準備休息`, shift };
    }
    return { slot: 'night', label: '深夜', description: `休假日 (${shift})，深夜時段`, shift };
};

// 預設時段判斷（無班表資料時）
App.getDefaultTimeSlot = function(currentTime) {
    if (currentTime >= 6 * 60 && currentTime < 7 * 60) {
        return { slot: 'wake', label: '起床後', description: '早晨時段', shift: 'N/A' };
    }
    if (currentTime >= 7 * 60 && currentTime < 9 * 60) {
        return { slot: 'morning', label: '上午', description: '上午時段', shift: 'N/A' };
    }
    if (currentTime >= 12 * 60 && currentTime < 18 * 60) {
        return { slot: 'afternoon', label: '下午', description: '下午時段', shift: 'N/A' };
    }
    if (currentTime >= 22 * 60 && currentTime < 23 * 60) {
        return { slot: 'before_sleep', label: '睡前', description: '晚間時段', shift: 'N/A' };
    }
    return { slot: 'other', label: '一般時段', description: '其他時段', shift: 'N/A' };
};

// 獲取天氣資料（中央氣象局）
App.getWeatherData = async function() {
    const settings = this.loadAiSettings();
    if (!settings.weatherApiKey || !settings.userLocation) {
        console.warn('缺少天氣 API 設定');
        return null;
    }

    try {
        // 中央氣象局 API - 鄉鎮天氣預報
        const url = `https://opendata.cwa.gov.tw/api/v1/rest/datastore/F-C0032-001?Authorization=${settings.weatherApiKey}&locationName=${settings.userLocation}`;

        const response = await fetch(url);
        const data = await response.json();

        if (data.success !== 'true') {
            throw new Error('天氣 API 回應失敗');
        }

        // 解析天氣數據
        const location = data.records.location[0];
        const weatherElements = location.weatherElement;

        // 提取需要的資訊
        const weather = {
            location: location.locationName,
            temp: this.getWeatherElement(weatherElements, 'MinT'), // 最低溫
            tempMax: this.getWeatherElement(weatherElements, 'MaxT'), // 最高溫
            pop: this.getWeatherElement(weatherElements, 'PoP'), // 降雨機率
            wx: this.getWeatherElement(weatherElements, 'Wx'), // 天氣現象
            ci: this.getWeatherElement(weatherElements, 'CI') // 舒適度
        };

        console.log('天氣資料:', weather);
        return weather;
    } catch (error) {
        console.error('獲取天氣資料失敗:', error);
        return null;
    }
};

// 輔助函數：從天氣元素中提取值
App.getWeatherElement = function(elements, elementName) {
    const element = elements.find(e => e.elementName === elementName);
    if (element && element.time && element.time[0]) {
        return element.time[0].parameter.parameterName;
    }
    return null;
};

// 獲取每日 AI 推薦
App.getDailyAIRecommendation = async function() {
    const settings = this.loadAiSettings();
    if (!settings.enableAI) {
        console.log('AI 推薦未啟用');
        return;
    }

    try {
        // 1. 獲取天氣資料
        const weather = await this.getWeatherData();
        if (!weather) {
            alert('無法獲取天氣資料，請檢查 API 設定');
            return;
        }

        // 2. 獲取今日班表
        const schedule = this.getTodaySchedule();

        // 3. 獲取當前時段資訊
        const currentTimeSlot = this.getCurrentTimeSlot();

        // 4. 取得產品清單
        const products = this.getProductsList();

        // 5. 調用 Claude API 獲取推薦
        const recommendation = await this.getClaudeRecommendation(weather, schedule, currentTimeSlot, products);

        // 6. 顯示推薦
        this.displayDailyRecommendation(recommendation);

    } catch (error) {
        console.error('AI 推薦失敗:', error);
        alert('AI 推薦失敗：' + error.message);
    }
};

// 獲取今日班表和時段資訊
App.getTodaySchedule = function() {
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    // 獲取今日班表
    const todaySchedule = this.schedules[today];

    if (!todaySchedule) {
        console.warn('今天沒有班表資料');
        return {
            type: 'unknown',
            shift: 'N/A',
            date: today,
            hasSchedule: false
        };
    }

    return {
        type: todaySchedule.type,  // 'work' 或 'off'
        shift: todaySchedule.shift,  // 'N3', 'M1', 'O' 等
        date: today,
        hasSchedule: true
    };
};

// 取得產品清單
App.getProductsList = function() {
    const products = [];
    for (let id in this.products) {
        products.push(this.products[id].name);
    }
    return products.join('\n');
};

// 調用 Claude API 獲取推薦（通過 Vercel Function 代理）
App.getClaudeRecommendation = async function(weather, schedule, timeSlot, products) {
    const settings = this.loadAiSettings();

    // 根據班別確定今日所有時段
    let timeSlots = [];
    if (schedule.type === 'work') {
        if (schedule.shift.toUpperCase().startsWith('N')) {
            timeSlots = ['起床後 (20:30)', '上班前 (21:30)', '下班後 (08:00)', '睡前 (11:00)'];
        } else if (schedule.shift.toUpperCase().startsWith('M')) {
            timeSlots = ['起床後 (05:00)', '上班前 (06:00)', '下班後 (16:30)', '睡前 (22:00)'];
        } else if (schedule.shift.toUpperCase().startsWith('A')) {
            timeSlots = ['起床後 (12:00)', '上班前 (13:00)', '下班後 (23:30)', '睡前 (01:30)'];
        }
    } else {
        // 休假日
        timeSlots = ['起床後 (09:00)', '上午 (10:00)', '下午 (15:00)', '晚間 (19:00)', '睡前 (22:00)'];
    }

    const prompt = `你是專業的保養顧問 Sunny。請根據以下資訊，為今日每個時段推薦完整的保養流程。

# 今日天氣 (${weather.location})
- 溫度：${weather.temp}°C ~ ${weather.tempMax}°C
- 天氣：${weather.wx}
- 降雨機率：${weather.pop}%
- 舒適度：${weather.ci}

# 今日班表
- 日期：${schedule.date}
- 類型：${schedule.type === 'work' ? '上班日' : '休假日'}
- 班別：${schedule.shift}
- 當前時段：${timeSlot.label} (${timeSlot.description})

# 可用保養品
${products || '（尚未設定產品清單）'}

# 任務要求
請為今日的**每個時段**生成一個完整的保養流程，每個流程包含 5-8 個具體步驟。

今日時段：
${timeSlots.map((slot, i) => `${i + 1}. ${slot}`).join('\n')}

# 輸出格式要求
請嚴格按照以下 Markdown 格式輸出，每個時段一個流程：

## 時段名稱
- [ ] 步驟 1：具體動作描述
- [ ] 步驟 2：具體動作描述
- [ ] 步驟 3：具體動作描述
...

## 時段名稱
- [ ] 步驟 1：具體動作描述
...

注意事項：
1. 每個步驟必須是可執行的具體動作（例如："用溫水洗臉"、"塗抹保濕乳液"）
2. 根據天氣條件調整產品選擇（高溫多補水、低溫多保濕、高降雨機率加強防護）
3. 上班日的上班前流程要快速高效，休假日可以更精緻完整
4. 使用可用產品清單中的產品，如無則提供一般性建議
5. 請用繁體中文回答
6. 務必使用 "- [ ]" 格式標記每個步驟（注意空格）

開始生成保養流程：`;

    // 調用 Vercel Serverless Function 代理
    const response = await fetch('/api/ai-recommend', {
        method: 'POST',
        headers: {
            'content-type': 'application/json'
        },
        body: JSON.stringify({
            prompt: prompt,
            apiKey: settings.claudeApiKey
        })
    });

    if (!response.ok) {
        let errorData;
        try {
            errorData = await response.json();
        } catch {
            errorData = { error: await response.text() };
        }

        console.error('API 錯誤詳情:', errorData);

        // 顯示詳細錯誤信息
        let errorMessage = `API 錯誤 ${response.status}`;
        if (errorData.details) {
            if (typeof errorData.details === 'object') {
                errorMessage += '\n\n詳細信息：\n' + JSON.stringify(errorData.details, null, 2);
            } else {
                errorMessage += '\n\n' + errorData.details;
            }
        } else if (errorData.error) {
            errorMessage += '\n\n' + errorData.error;
        }

        throw new Error(errorMessage);
    }

    const data = await response.json();
    return data.recommendation;
};

// 顯示每日推薦
App.displayDailyRecommendation = function(recommendation) {
    console.log('AI 推薦原始內容:', recommendation);

    // 解析 Markdown 格式的推薦
    const routines = this.parseAIRecommendation(recommendation);

    if (routines.length === 0) {
        console.warn('無法解析 AI 推薦');
        alert('AI 推薦格式異常，請重新生成');
        return;
    }

    // 儲存 AI 推薦到 localStorage
    const today = new Date().toISOString().split('T')[0];
    const aiRecommendations = JSON.parse(localStorage.getItem('ai_recommendations') || '{}');
    aiRecommendations[today] = {
        timestamp: Date.now(),
        routines: routines,
        checkedSteps: {} // 格式: { "routineIndex-stepIndex": true }
    };
    localStorage.setItem('ai_recommendations', JSON.stringify(aiRecommendations));

    // 顯示推薦
    this.renderAIRecommendations(routines);

    // 顯示推薦區域
    document.getElementById('aiRecommendations').style.display = 'block';

    console.log('AI 推薦已顯示，共', routines.length, '個流程');
};

// 解析 AI 推薦的 Markdown 格式
App.parseAIRecommendation = function(markdown) {
    const routines = [];
    const lines = markdown.split('\n');

    let currentRoutine = null;

    for (let line of lines) {
        line = line.trim();

        // 檢測標題行 (## 時段名稱)
        if (line.startsWith('##')) {
            // 如果之前有流程，先儲存
            if (currentRoutine && currentRoutine.steps.length > 0) {
                routines.push(currentRoutine);
            }

            // 開始新流程
            const title = line.replace(/^##\s*/, '').trim();
            currentRoutine = {
                title: title,
                steps: []
            };
        }
        // 檢測步驟行 (- [ ] 步驟內容)
        else if (line.match(/^-\s*\[\s*\]\s+/)) {
            if (currentRoutine) {
                const step = line.replace(/^-\s*\[\s*\]\s+/, '').trim();
                currentRoutine.steps.push(step);
            }
        }
    }

    // 儲存最後一個流程
    if (currentRoutine && currentRoutine.steps.length > 0) {
        routines.push(currentRoutine);
    }

    return routines;
};

// 渲染 AI 推薦流程卡片
App.renderAIRecommendations = function(routines) {
    const container = document.getElementById('aiRoutinesContainer');
    container.innerHTML = '';

    const today = new Date().toISOString().split('T')[0];
    const aiData = JSON.parse(localStorage.getItem('ai_recommendations') || '{}')[today];
    const checkedSteps = aiData?.checkedSteps || {};

    routines.forEach((routine, routineIndex) => {
        const card = document.createElement('div');
        card.className = 'ai-routine-card';
        card.style.cssText = 'background: white; border: 2px solid #e5e7eb; border-radius: 12px; padding: 16px; margin-bottom: 15px;';

        // 標題
        const title = document.createElement('h4');
        title.textContent = routine.title;
        title.style.cssText = 'margin: 0 0 12px 0; color: #1f2937; font-size: 16px;';
        card.appendChild(title);

        // 步驟列表
        const stepsList = document.createElement('div');
        stepsList.style.cssText = 'display: flex; flex-direction: column; gap: 8px;';

        routine.steps.forEach((step, stepIndex) => {
            const stepKey = `${routineIndex}-${stepIndex}`;
            const isChecked = checkedSteps[stepKey] || false;

            const stepDiv = document.createElement('div');
            stepDiv.style.cssText = 'display: flex; align-items: flex-start; gap: 8px;';

            // 勾選框
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = isChecked;
            checkbox.style.cssText = 'margin-top: 3px; cursor: pointer; width: 16px; height: 16px;';
            checkbox.addEventListener('change', () => {
                this.toggleAIStepCheck(routineIndex, stepIndex, checkbox.checked);
            });

            // 步驟文字
            const stepText = document.createElement('span');
            stepText.textContent = step;
            stepText.style.cssText = `flex: 1; color: ${isChecked ? '#9ca3af' : '#374151'}; text-decoration: ${isChecked ? 'line-through' : 'none'};`;

            stepDiv.appendChild(checkbox);
            stepDiv.appendChild(stepText);
            stepsList.appendChild(stepDiv);
        });

        card.appendChild(stepsList);

        // 完成進度
        const completedCount = routine.steps.filter((_, idx) => checkedSteps[`${routineIndex}-${idx}`]).length;
        const progress = document.createElement('div');
        progress.style.cssText = 'margin-top: 12px; padding-top: 12px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280;';
        progress.textContent = `已完成 ${completedCount} / ${routine.steps.length} 步驟`;
        card.appendChild(progress);

        container.appendChild(card);
    });
};

// 切換 AI 推薦步驟的勾選狀態
App.toggleAIStepCheck = function(routineIndex, stepIndex, isChecked) {
    const today = new Date().toISOString().split('T')[0];
    const aiRecommendations = JSON.parse(localStorage.getItem('ai_recommendations') || '{}');

    if (!aiRecommendations[today]) {
        console.warn('今日沒有 AI 推薦資料');
        return;
    }

    const stepKey = `${routineIndex}-${stepIndex}`;
    if (isChecked) {
        aiRecommendations[today].checkedSteps[stepKey] = true;
    } else {
        delete aiRecommendations[today].checkedSteps[stepKey];
    }

    localStorage.setItem('ai_recommendations', JSON.stringify(aiRecommendations));

    // 重新渲染以更新進度和樣式
    this.renderAIRecommendations(aiRecommendations[today].routines);
};

// 載入今日 AI 推薦（頁面初始化時）
App.loadTodayAIRecommendations = function() {
    const today = new Date().toISOString().split('T')[0];
    const aiRecommendations = JSON.parse(localStorage.getItem('ai_recommendations') || '{}');

    if (aiRecommendations[today] && aiRecommendations[today].routines) {
        console.log('載入今日已有的 AI 推薦');
        this.renderAIRecommendations(aiRecommendations[today].routines);
        document.getElementById('aiRecommendations').style.display = 'block';
    } else {
        console.log('今日尚未有 AI 推薦');
        // 如果啟用了 AI，可以選擇自動生成
        const settings = this.loadAiSettings();
        if (settings.enableAI) {
            console.log('AI 已啟用，可點擊「🤖 AI 設定」按鈕生成推薦');
        }
    }
};
