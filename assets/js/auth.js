// ============================================================
// ===== DEMO AUTH MANAGER — وضع تجريبي =====================
// ============================================================
// حسابات وهمية جاهزة + تبديل سريع + عزل كامل
// لا يحتاج تسجيل دخول أو إعداد profile
// ============================================================

const Auth = {
    _currentUserId: null,
    _accounts: [],
    _isDemoMode: true,

    // ===== حسابات تجريبية جاهزة =====
    _demoAccounts: [
        {
            id: 'demo-ahmed',
            displayName: 'د. أحمد الخالدي',
            username: '@ahmed_alkhalidi',
            title: 'محامي دولي',
            bio: 'محامي دولي متخصص في التحكيم التجاري وقانون الشركات. خبرة +15 عاماً.',
            location: 'دبي، الإمارات',
            avatar: 'https://picsum.photos/seed/ahmed-law/120/120.jpg',
            verified: true
        },
        {
            id: 'demo-sara',
            displayName: 'سارة المنصوري',
            username: '@sara_mansouri',
            title: 'مستشارة قانونية',
            bio: 'مستشارة قانونية متخصصة في حماية البيانات والخصوصية الرقمية.',
            location: 'أبوظبي، الإمارات',
            avatar: 'https://picsum.photos/seed/sara-legal/120/120.jpg',
            verified: false
        },
        {
            id: 'demo-khalid',
            displayName: 'خالد العمري',
            username: '@khalid_omari',
            title: 'أستاذ القانون الدولي',
            bio: 'أستاذ جامعي متخصص في القانون الدولي والاتفاقيات التجارية.',
            location: 'عمان، الأردن',
            avatar: 'https://picsum.photos/seed/khalid-jordan/120/120.jpg',
            verified: true
        },
        {
            id: 'demo-nora',
            displayName: 'نورة القحطاني',
            username: '@nora_qahtani',
            title: 'محامية عقود',
            bio: 'محامية متخصصة في صياغة العقود الدولية وتسوية النزاعات.',
            location: 'الرياض، السعودية',
            avatar: 'https://picsum.photos/seed/nora-lawyer/120/120.jpg',
            verified: true
        },
        {
            id: 'demo-fatima',
            displayName: 'فاطمة الحربي',
            username: '@fatima_harbi',
            title: 'خبيرة تقنية مالية',
            bio: 'خبيرة في التقنية المالية والعملات الرقمية والتنظيم البنكي.',
            location: 'جدة، السعودية',
            avatar: 'https://picsum.photos/seed/fatima-fintech/120/120.jpg',
            verified: false
        }
    ],

    // ===== INITIALIZATION =====
    async init() {
        this._accounts = this._demoAccounts;

        // استعادة آخر حساب نشط
        const lastUserId = Safe.getString('demo_current_user', '');
        if (lastUserId && this._accounts.find(a => a.id === lastUserId)) {
            this._currentUserId = lastUserId;
            this._applyAccount(this._currentUserId);
            return { userId: this._currentUserId, profile: this.getCurrentAccount() };
        }

        // أول مرة — نختار الحساب الأول تلقائياً
        this._currentUserId = this._accounts[0].id;
        Safe.setString('demo_current_user', this._currentUserId);
        this._applyAccount(this._currentUserId);
        this._ensureDemoData(this._currentUserId);
        return { userId: this._currentUserId, profile: this.getCurrentAccount() };
    },

    // ===== APPLY ACCOUNT TO GLOBALS =====
    _applyAccount(userId) {
        const account = this._accounts.find(a => a.id === userId);
        if (!account) return;

        sbUser = { id: userId };
        sbProfile = {
            id: userId,
            name: account.displayName,
            username: account.username,
            display_name: account.displayName,
            title: account.title,
            bio: account.bio,
            location: account.location,
            avatar_url: account.avatar,
            is_verified: account.verified
        };
        sbOnline = false; // Demo mode = localStorage only
    },

    // ===== SWITCH ACCOUNT =====
    switchAccount(userId) {
        if (userId === this._currentUserId) return true;
        const account = this._accounts.find(a => a.id === userId);
        if (!account) return false;

        this._currentUserId = userId;
        Safe.setString('demo_current_user', userId);
        this._applyAccount(userId);
        this._ensureDemoData(userId);
        return true;
    },

    // ===== GETTERS =====
    getCurrentUserId() { return this._currentUserId; },
    getAccounts() { return [...this._accounts]; },
    getCurrentAccount() { return this._accounts.find(a => a.id === this._currentUserId) || null; },
    isLoggedIn() { return !!this._currentUserId; },

    // ===== DEMO DATA GENERATION =====
    _ensureDemoData(userId) {
        const prefix = 'user_' + userId + '_';

        // إنشاء منشورات تجريبية إذا ما كانت موجودة
        if (!Safe.getJSON(prefix + 'userPosts', null)) {
            Safe.setJSON(prefix + 'userPosts', this._generateDemoPosts(userId));
            Safe.setJSON(prefix + 'userPostCounter', 5);
        }

        // إنشاء متابعين تجريبيين
        if (!Safe.getJSON(prefix + 'followingUsers', null)) {
            const others = this._accounts.filter(a => a.id !== userId).map(a => a.displayName);
            Safe.setJSON(prefix + 'followingUsers', others.slice(0, 3));
        }

        // إنشاء إعجابات تجريبية
        if (!Safe.getJSON(prefix + 'userLikes', null)) {
            Safe.setJSON(prefix + 'userLikes', []);
        }

        // إنشاء ردود تجريبية
        if (!Safe.getJSON(prefix + 'userReplies', null)) {
            Safe.setJSON(prefix + 'userReplies', []);
        }

        // إنشاء تعليقات تجريبية
        if (!Safe.getJSON(prefix + 'platformComments', null)) {
            Safe.setJSON(prefix + 'platformComments', {});
        }

        // إنشاء محادثات تجريبية
        if (!Safe.getJSON(prefix + 'conversations', null)) {
            Safe.setJSON(prefix + 'conversations', this._generateDemoConversations(userId));
        }

        // إنشاء stories تجريبية
        if (!Safe.getJSON(prefix + 'storiesData', null)) {
            Safe.setJSON(prefix + 'storiesData', this._generateDemoStories(userId));
        }

        // إنشاء إعدادات افتراضية
        if (!Safe.getJSON(prefix + 'settings', null)) {
            Safe.setJSON(prefix + 'settings', { profileVisible: true, emailNotifs: true, darkMode: true, twoFactor: false, language: 'ar' });
        }

        // إنشاء bookmarks فارغة
        if (!Safe.getJSON(prefix + 'bookmarks', null)) {
            Safe.setJSON(prefix + 'bookmarks', []);
        }

        // إنشاء مقالات فارغة
        if (!Safe.getJSON(prefix + 'articles', null)) {
            Safe.setJSON(prefix + 'articles', []);
        }

        // إنشاء events فارغة
        if (!Safe.getJSON(prefix + 'registered_events', null)) {
            Safe.setJSON(prefix + 'registered_events', []);
        }

        // إنشاء viewed stories فارغة
        if (!Safe.getJSON(prefix + 'viewedStories', null)) {
            Safe.setJSON(prefix + 'viewedStories', []);
        }

        // Profile
        if (!Safe.getJSON(prefix + 'userProfile', null)) {
            const acc = this._accounts.find(a => a.id === userId);
            if (acc) {
                Safe.setJSON(prefix + 'userProfile', {
                    name: acc.displayName,
                    username: acc.username,
                    title: acc.title,
                    bio: acc.bio,
                    location: acc.location,
                    website: ''
                });
            }
        }
    },

    _generateDemoPosts(userId) {
        const templates = {
            'demo-ahmed': [
                { text: 'محكمة التحكيم الدولية أصدرت قراراً جديداً بشأن النزاعات التجارية عابرة الحدود. تحديث مهم لكل الممارسين في مجال التحكيم التجاري. ⚖️', tags: ['#التحكيم_الدولي', '#قانون_التجارة'], likes: 45, comments: 12, shares: 8 },
                { text: 'نصيحة قانونية: قبل توقيع أي عقد دولي، تأكد من وجود بند حل النزاعات واضح ومحدد. هذا يوفر عليك وقتاً وأموالاً في المستقبل. 📋', tags: ['#نصيحة_قانونية', '#العقود'], likes: 89, comments: 23, shares: 15 },
                { text: 'شاركت اليوم في مؤتمر دبي للقانون الدولي. نقاشات ممتازة حول مستقبل التحكيم في المنطقة. 🏛️', tags: ['#مؤتمر_دبي', '#القانون_الدولي'], likes: 67, comments: 8, shares: 5 },
                { text: 'قراءة في التعديلات الجديدة على قانون الشركات الإماراتي. تغييرات إيجابية تشجع الاستثمار. 🇦🇪', tags: ['#قانون_الشركات', '#الإمارات'], likes: 123, comments: 34, shares: 21 },
                { text: 'ورشة عمل غداً عن "صياغة العقود الدولية" — مفتوحة للتسجيل. الأماكن محدودة! 📝', tags: ['#ورشة_عمل', '#العقود'], likes: 56, comments: 19, shares: 11 }
            ],
            'demo-sara': [
                { text: 'تحديث مهم: صدر المرسوم التنفيذي الجديد لقانون حماية البيانات الشخصية في الإمارات. غرامات تصل إلى 5 مليون درهم! 🇦🇪📋', tags: ['#حماية_البيانات', '#الإمارات'], likes: 134, comments: 28, shares: 19 },
                { text: 'هل تعلم؟ חברות التقنية ملزمة الآن بتشفير بيانات المستخدمين end-to-end. عدم الامتثال يعني غرامات ضخمة. 🔒', tags: ['#التشفير', '#الخصوصية'], likes: 78, comments: 15, shares: 9 },
                { text: 'مقال جديد: "الذكاء الاصطناعي وتحديات الخصوصية" — رابط المقال في الملف الشخصي 🤖', tags: ['#الذكاء_الاصطناعي', '#الخصوصية'], likes: 201, comments: 45, shares: 32 },
                { text: 'نصيحة: لا تشاركوا بياناتكم الشخصية مع أي تطبيق بدون قراءة سياسة الخصوصية أولاً! 🛡️', tags: ['#نصيحة', '#الخصوصية'], likes: 156, comments: 42, shares: 28 }
            ],
            'demo-khalid': [
                { text: 'قانون الشركات الموحد في دول مجلس التعاون — تحليل شامل لأبرز التغييرات في مقالتي الجديدة 📚', tags: ['#قانون_الشركات', '#مجلس_التعاون'], likes: 256, comments: 67, shares: 45 },
                { text: 'مناقشة ممتعة اليوم في الجامعة حول القانون الدولي الإنساني. الطلاب متحمسون! 🎓', tags: ['#التعليم', '#القانون_الدولي'], likes: 89, comments: 12, shares: 3 },
                { text: 'هل تعلم أن الاتفاقية المتحدة لعقود البيع الدولي (CISG) تطبق في أكثر من 90 دولة؟ 🌍', tags: ['#CISG', '#القانون_التجاري'], likes: 145, comments: 34, shares: 22 },
                { text: 'قراءة جديدة في حكم محكمة العدل الدولية الأخير. تأثير كبير على القانون البحري. ⚖️', tags: ['#محكمة_العدل', '#القانون_البحري'], likes: 178, comments: 45, shares: 31 }
            ],
            'demo-nora': [
                { text: 'دليلك الشامل لصياغة العcontracts الدولية — 10 نصائح ذهبية من خبرة سنوات 📝', tags: ['#العقود', '#نصائح_قانونية'], likes: 312, comments: 78, shares: 56 },
                { text: 'انتهيت من مراجعة عقد تجاري معقد بين شريكين من دولتين مختلفتين. النتيجة: اتفاق مرضٍ للطرفين! ✅', tags: ['#نجاح', '#العقود'], likes: 67, comments: 8, shares: 4 },
                { text: 'تحديث: بند القوة القاهرة في العقود أصبح أكثر مرونة بعد التعديلات الجديدة 📋', tags: ['#القوة_القاهرة', '#العقود'], likes: 145, comments: 34, shares: 19 },
                { text: 'ورشة عملية عن "تسوية النزاعات التجارية" الأسبوع القادم. التسجيل مفتوح! 🤝', tags: ['#ورشة', '#تسوية_النزاعات'], likes: 89, comments: 23, shares: 15 }
            ],
            'demo-fatima': [
                { text: 'البنك المركزي السعودي أصدر توجيهات جديدة لشركات التقنية المالية بشأن التحقق من الهوية الرقمية (eKYC) 💡', tags: ['#Fintech', '#SAMA'], likes: 89, comments: 34, shares: 12 },
                { text: 'مستقبل العملات الرقمية في المنطقة: تحليل شامل للإطار التنظيمي الجديد 🪙', tags: ['#العملات_الرقمية', '#التنظيم'], likes: 201, comments: 56, shares: 45 },
                { text: 'نصيحة لرواد الأعمال: ابدأوا بالامتثال التنظيمي من اليوم الأول! لا تنتظروا حتى تكبر الشركة 🚀', tags: ['#ريادة_أعمال', '#امتثال'], likes: 156, comments: 42, shares: 28 },
                { text: 'شاركت فيแฮكاثون التقنية المالية هذا الأسبوع. أفكار مبتكرة لمستقبل المدفوعات الرقمية! 💳', tags: ['#هاكاثون', '#تقنيات_مالية'], likes: 78, comments: 15, shares: 7 }
            ]
        };

        const posts = templates[userId] || templates['demo-ahmed'];
        return posts.map((p, i) => ({
            id: 'user-' + (i + 1),
            text: p.text,
            displayText: p.text.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>'),
            tags: p.tags,
            time: i === 0 ? 'الآن' : `منذ ${i + 1} ساعات`,
            likes: p.likes,
            comments: p.comments,
            shares: p.shares,
            isRepost: false,
            commentList: [],
            media: [],
            edited: false
        }));
    },

    _generateDemoConversations(userId) {
        const others = this._accounts.filter(a => a.id !== userId);
        return others.slice(0, 3).map((acc, i) => ({
            id: 'conv-' + acc.id,
            userId: acc.id,
            userName: acc.displayName,
            userAvatar: acc.avatar,
            messages: [
                { id: 'msg-1', text: 'السلام عليكم! كيف حالك؟', fromMe: false, time: '10:00 ص', timestamp: Date.now() - 3600000 * (i + 1) },
                { id: 'msg-2', text: 'وعليكم السلام! بخير الحمد لله، وأنت؟', fromMe: true, time: '10:05 ص', timestamp: Date.now() - 3500000 * (i + 1) },
                { id: 'msg-3', text: 'بخير! هل رأيت آخر تحديث قانوني؟', fromMe: false, time: '10:10 ص', timestamp: Date.now() - 3400000 * (i + 1) }
            ],
            unread: i === 0 ? 1 : 0,
            lastActivity: Date.now() - 3400000 * (i + 1)
        }));
    },

    _generateDemoStories(userId) {
        const others = this._accounts.filter(a => a.id !== userId);
        return [
            { id: 'user-me', name: 'أنت', avatar: this._accounts.find(a => a.id === userId)?.avatar || '', isOwn: true, stories: [] },
            ...others.slice(0, 3).map(acc => ({
                id: acc.id,
                name: acc.displayName,
                avatar: acc.avatar,
                stories: [
                    { id: `story-${acc.id}-1`, type: 'text', text: `تحديث جديد! 📋⚖️`, bg: 'linear-gradient(135deg,#8b5cf6,#6d28d9)', time: 'منذ ساعتين', duration: 5000 }
                ]
            }))
        ];
    },

    // ===== RESET DEMO DATA =====
    resetDemoData(userId) {
        const prefix = 'user_' + (userId || this._currentUserId) + '_';
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(prefix)) keysToRemove.push(key);
        }
        keysToRemove.forEach(k => localStorage.removeItem(k));
        this._ensureDemoData(userId || this._currentUserId);
    },

    // ===== UI: ACCOUNT QUICK SWITCHER (floating) =====
    showQuickSwitcher() {
        let bar = document.getElementById('demoQuickSwitcher');
        if (bar) { bar.remove(); return; }

        bar = document.createElement('div');
        bar.id = 'demoQuickSwitcher';
        bar.className = 'demo-quick-switcher';

        const currentId = this._currentUserId;

        bar.innerHTML = `
            <div class="demo-switcher-header">
                <span class="iconify text-brand-400" data-icon="lucide:zap"></span>
                <span>Demo Mode</span>
                <button onclick="document.getElementById('demoQuickSwitcher').remove()" class="demo-switcher-close">
                    <span class="iconify" data-icon="lucide:x"></span>
                </button>
            </div>
            <div class="demo-switcher-accounts">
                ${this._accounts.map(acc => `
                    <button class="demo-account-btn ${acc.id === currentId ? 'active' : ''}" onclick="Auth.quickSwitch('${acc.id}')" title="${acc.displayName}">
                        <img src="${acc.avatar}" alt="">
                        <span>${acc.displayName.split(' ')[0]}</span>
                        ${acc.id === currentId ? '<span class="iconify text-brand-400 text-xs" data-icon="lucide:check-circle-2"></span>' : ''}
                    </button>
                `).join('')}
            </div>
        `;

        document.body.appendChild(bar);

        // إغلاق عند الضغط خارجها
        setTimeout(() => {
            document.addEventListener('click', function closeSwitcher(e) {
                if (!bar.contains(e.target)) {
                    bar.remove();
                    document.removeEventListener('click', closeSwitcher);
                }
            });
        }, 100);
    },

    async quickSwitch(userId) {
        if (userId === this._currentUserId) {
            document.getElementById('demoQuickSwitcher')?.remove();
            return;
        }

        const account = this._accounts.find(a => a.id === userId);
        showToast('جاري التبديل إلى ' + account.displayName + '...');

        this.switchAccount(userId);

        document.getElementById('demoQuickSwitcher')?.remove();

        // إعادة تحميل التطبيق بالبيانات الجديدة
        if (typeof onAuthSuccess === 'function') {
            await onAuthSuccess({ userId, profile: this.getCurrentAccount() });
        }

        showToast('تم التبديل ✓ ' + account.displayName);
    },

    // ===== UI: DEMO INDICATOR (صغير في الأعلى) =====
    showDemoIndicator() {
        let indicator = document.getElementById('demoIndicator');
        if (indicator) indicator.remove();

        indicator = document.createElement('div');
        indicator.id = 'demoIndicator';
        indicator.className = 'demo-indicator';
        indicator.onclick = () => this.showQuickSwitcher();
        indicator.innerHTML = `
            <img src="${this.getCurrentAccount()?.avatar || ''}" alt="">
            <span>${this.getCurrentAccount()?.displayName?.split(' ')[0] || 'Demo'}</span>
            <span class="iconify text-[10px] text-dark-400" data-icon="lucide:chevron-down"></span>
        `;
        document.body.appendChild(indicator);
    },

    hideDemoIndicator() {
        document.getElementById('demoIndicator')?.remove();
    },

    // ===== SIGN OUT (for demo: just shows switcher) =====
    async signOut() {
        this.showQuickSwitcher();
    }
};
