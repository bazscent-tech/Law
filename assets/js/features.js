        // ============================================================

        // ===== Init =====
        document.addEventListener('DOMContentLoaded', async()=>{
            // Initialize Supabase first
            await initSupabase();
            if (sbOnline) {
                await signInAnonymously();
                console.log('✅ Supabase auth:', sbUser?.id);
            }

            loadSavedImages();loadProfile();renderTrendingList('all');renderFollowingPosts();renderSpaces('live');updateNotifDots();renderProfilePosts();hideStaticPosts();renderFeedPosts();

            // Initialize SPA system
            Router.init();
            PullToRefresh.init();
            NotifPTR.init();
            initStories();

            // Restore state (if returning from refresh)
            const restored = AppState.restore();
            if (restored) {
                // State was restored, skip default scroll-to-top
            }
        });

        // ===== Connect Button =====
        function toggleConnect(btn) {
            if (btn.classList.contains('connected')) {
                btn.classList.remove('connected');
                btn.textContent = 'متابعة';
                btn.style.borderColor = '';
                btn.style.color = '';
                btn.style.background = '';
                showToast('تم إلغاء المتابعة');
            } else {
                btn.classList.add('connected');
                btn.textContent = 'متابَع ✓';
                btn.style.borderColor = 'rgba(34,197,94,0.5)';
                btn.style.color = '#22c55e';
                btn.style.background = 'rgba(34,197,94,0.1)';
                showToast('متابَع ✓');
            }
        }

        // ============================================================
        // ===== ENHANCED FEATURES - ALL FUNCTIONAL ===================
        // ============================================================

        // ===== A. MESSAGING SYSTEM =====
        const MsgStore = {
            _key: 'lawbook_conversations',
            _activeId: null,

            getAll() {
                return Safe.getJSON(this._key, '[]');
            },

            save(list) {
                Safe.setJSON(this._key, list);
            },

            getOrCreate(userId, userName, userAvatar) {
                let list = this.getAll();
                let conv = list.find(c => c.userId === userId);
                if (!conv) {
                    conv = {
                        id: 'conv-' + Date.now(),
                        userId, userName, userAvatar,
                        messages: [], unread: 0, lastActivity: Date.now()
                    };
                    list.unshift(conv);
                    this.save(list);
                }
                return conv;
            },

            sendMessage(convId, text, fromMe) {
                let list = this.getAll();
                const conv = list.find(c => c.id === convId);
                if (!conv) return;
                const msg = {
                    id: 'msg-' + Date.now(),
                    text, fromMe,
                    time: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
                    timestamp: Date.now()
                };
                conv.messages.push(msg);
                conv.lastActivity = Date.now();
                if (!fromMe) conv.unread = (conv.unread || 0) + 1;
                this.save(list);
                return msg;
            },

            markRead(convId) {
                let list = this.getAll();
                const conv = list.find(c => c.id === convId);
                if (conv) { conv.unread = 0; this.save(list); }
            },

            getTotalUnread() {
                return this.getAll().reduce((sum, c) => sum + (c.unread || 0), 0);
            },

            deleteConversation(convId) {
                let list = this.getAll().filter(c => c.id !== convId);
                this.save(list);
            }
        };

        // Initialize default conversations if empty
        function initDefaultConversations() {
            if (MsgStore.getAll().length > 0) return;
            const defaults = [
                { userId: 'sara', userName: 'سارة المنصوري', userAvatar: 'https://picsum.photos/seed/sara-legal/40/40.jpg',
                  messages: [
                    { id: 'm1', text: 'السلام عليكم د. أحمد! هل رأيت قانون التحكيم الجديد؟ 📋', fromMe: false, time: '2:30 م', timestamp: Date.now()-3600000 },
                    { id: 'm2', text: 'وعليكم السلام! نعم، تابعته. تحديثات ممتازة 👍', fromMe: true, time: '2:32 م', timestamp: Date.now()-3500000 },
                    { id: 'm3', text: 'هل يمكنك مشاركة ملاحظاتك على البنود الجديدة؟', fromMe: false, time: '2:33 م', timestamp: Date.now()-3400000 },
                    { id: 'm4', text: 'بالتأكيد! سأرسل لك ملخصاً شاملاً اليوم 📝', fromMe: true, time: '2:35 م', timestamp: Date.now()-3300000 }
                  ], unread: 0, lastActivity: Date.now()-3300000 },
                { userId: 'khalid', userName: 'خالد العمري', userAvatar: 'https://picsum.photos/seed/khalid-jordan/40/40.jpg',
                  messages: [
                    { id: 'm5', text: 'ممتاز! سأراجع العقد غداً', fromMe: false, time: '1:15 م', timestamp: Date.now()-7200000 }
                  ], unread: 1, lastActivity: Date.now()-7200000 },
                { userId: 'nora', userName: 'نورة القحطاني', userAvatar: 'https://picsum.photos/seed/nora-lawyer/40/40.jpg',
                  messages: [
                    { id: 'm6', text: 'شكراً على المساعدة! 🙏', fromMe: false, time: '11:00 ص', timestamp: Date.now()-14400000 }
                  ], unread: 0, lastActivity: Date.now()-14400000 },
                { userId: 'omar', userName: 'عمر الحسيني', userAvatar: 'https://picsum.photos/seed/omar-judge/40/40.jpg',
                  messages: [
                    { id: 'm7', text: 'نلتقي في المؤتمر إن شاء الله', fromMe: false, time: 'أمس', timestamp: Date.now()-86400000 }
                  ], unread: 0, lastActivity: Date.now()-86400000 }
            ];
            MsgStore.save(defaults);
        }

        function renderMessagesPage() {
            const container = document.getElementById('page-messages');
            if (!container) return;
            const conversations = MsgStore.getAll();
            if (conversations.length === 0) {
                container.innerHTML = '<div class="bg-dark-900/80 border border-dark-800/50 rounded-2xl p-12 text-center"><span class="iconify text-4xl text-dark-500 mb-3 block" data-icon="lucide:message-circle"></span><p class="text-dark-400 text-sm">لا توجد محادثات بعد</p><button class="mt-3 bg-brand-500 text-white text-sm px-5 py-2 rounded-xl" onclick="showToast(\'ابحث عن مستخدم لبدء محادثة\')">بدء محادثة</button></div>';
                return;
            }

            const activeConv = MsgStore._activeId ? conversations.find(c => c.id === MsgStore._activeId) : conversations[0];
            if (!MsgStore._activeId && activeConv) MsgStore._activeId = activeConv.id;

            const convListHTML = conversations.map(conv => {
                const lastMsg = conv.messages.length > 0 ? conv.messages[conv.messages.length - 1] : null;
                const isActive = conv.id === MsgStore._activeId;
                return `<div class="msg-item${isActive ? ' active' : ''} flex items-center gap-3 p-3 cursor-pointer transition-all${isActive ? ' border-r-3 border-brand-500' : ''}" onclick="openConversation('${conv.id}')">
                    <img src="${conv.userAvatar}" class="w-10 h-10 rounded-xl object-cover shrink-0" alt="">
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center justify-between">
                            <h4 class="font-medium text-sm truncate">${conv.userName}</h4>
                            <span class="text-[10px] text-dark-500">${lastMsg ? lastMsg.time : ''}</span>
                        </div>
                        <p class="text-dark-400 text-xs truncate">${lastMsg ? (lastMsg.fromMe ? 'أنت: ' : '') + lastMsg.text : 'ابدأ المحادثة'}</p>
                    </div>
                    ${conv.unread > 0 ? `<div class="w-5 h-5 bg-brand-500 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0">${conv.unread}</div>` : ''}
                </div>`;
            }).join('');

            const chatMessagesHTML = activeConv ? activeConv.messages.map(msg =>
                `<div class="flex justify-${msg.fromMe ? 'end' : 'start'}">
                    <div class="${msg.fromMe ? 'bg-brand-500/20 rounded-xl rounded-tl-none' : 'bg-dark-800 rounded-xl rounded-tr-none'} px-4 py-2 max-w-[70%]">
                        <p class="text-sm">${msg.text.replace(/</g, '&lt;')}</p>
                        <p class="text-[10px] text-dark-500 mt-1">${msg.time}</p>
                    </div>
                </div>`
            ).join('') : '';

            const chatHeaderHTML = activeConv ? `<div class="p-4 border-b border-dark-800/50 flex items-center gap-3">
                <img src="${activeConv.userAvatar}" class="w-9 h-9 rounded-xl object-cover" alt="">
                <div><h4 class="font-medium text-sm">${activeConv.userName}</h4><p class="text-green-400 text-[10px]">متصلة الآن</p></div>
                <button class="mr-auto p-2 rounded-lg hover:bg-dark-800" onclick="if(confirm('حذف المحادثة؟')){MsgStore.deleteConversation('${activeConv.id}');MsgStore._activeId=null;renderMessagesPage();showToast('تم حذف المحادثة')}"><span class="iconify text-dark-400" data-icon="lucide:trash-2"></span></button>
            </div>` : '';

            container.innerHTML = `<div class="bg-dark-900/80 border border-dark-800/50 rounded-2xl overflow-hidden animate-fade-in-up flex" style="height: 500px;">
                <div class="w-80 border-l border-dark-800/50 flex flex-col shrink-0">
                    <div class="p-4 border-b border-dark-800/50">
                        <h2 class="font-bold text-base mb-3">الرسائل</h2>
                        <div class="relative">
                            <span class="iconify absolute right-3 top-1/2 -translate-y-1/2 text-dark-400 text-sm" data-icon="lucide:search"></span>
                            <input type="text" placeholder="بحث في الرسائل..." class="w-full bg-dark-850 border border-dark-700/50 rounded-lg pr-9 pl-3 py-2 text-xs text-white placeholder-dark-400 focus:outline-none focus:border-brand-500/50 transition-all" oninput="filterConversations(this.value)">
                        </div>
                    </div>
                    <div class="flex-1 overflow-y-auto" id="convList">${convListHTML}</div>
                </div>
                <div class="flex-1 flex flex-col">
                    ${chatHeaderHTML}
                    <div class="flex-1 overflow-y-auto p-4 space-y-3" id="chatMessages">${chatMessagesHTML}</div>
                    <div class="p-3 border-t border-dark-800/50">
                        <div class="flex gap-2">
                            <button class="p-2 rounded-lg hover:bg-dark-800 transition-colors"><span class="iconify text-dark-400 text-lg" data-icon="lucide:paperclip"></span></button>
                            <input type="text" id="chatInput" placeholder="اكتب رسالة..." class="flex-1 bg-dark-850 border border-dark-700/50 rounded-xl px-4 py-2 text-sm text-white placeholder-dark-400 focus:outline-none focus:border-brand-500/50 transition-all" onkeydown="if(event.key==='Enter')sendChatMessage()">
                            <button class="bg-brand-500 hover:bg-brand-600 text-white p-2 rounded-xl transition-all" onclick="sendChatMessage()"><span class="iconify text-lg" data-icon="lucide:send"></span></button>
                        </div>
                    </div>
                </div>
            </div>`;

            // Scroll to bottom
            setTimeout(() => {
                const chatDiv = document.getElementById('chatMessages');
                if (chatDiv) chatDiv.scrollTop = chatDiv.scrollHeight;
            }, 100);
        }

        function openConversation(convId) {
            MsgStore._activeId = convId;
            MsgStore.markRead(convId);
            renderMessagesPage();
        }

        function sendChatMessage() {
            const input = document.getElementById('chatInput');
            if (!input) return;
            const text = input.value.trim();
            if (!text) return;
            if (!MsgStore._activeId) { showToast('اختر محادثة أولاً'); return; }

            MsgStore.sendMessage(MsgStore._activeId, text, true);
            input.value = '';
            renderMessagesPage();

            // Simulate reply after 2-5 seconds
            const conv = MsgStore.getAll().find(c => c.id === MsgStore._activeId);
            if (conv) {
                const replies = [
                    'شكراً على المعلومة! 👍', 'ممتاز، سأراجع ذلك',
                    'هل يمكنك التوسع أكثر؟', 'اتفق معك تماماً 🤝',
                    'ملاحظة قيمة! شكراً 📝', 'سأرسل لك التفاصيل لاحقاً',
                    'رائع! 🎉', 'مفهوم، شكراً للتوضيح'
                ];
                setTimeout(() => {
                    MsgStore.sendMessage(MsgStore._activeId, replies[Math.floor(Math.random() * replies.length)], false);
                    renderMessagesPage();
                }, 2000 + Math.random() * 3000);
            }
        }

        function filterConversations(q) {
            const items = document.querySelectorAll('#convList .msg-item');
            items.forEach(item => {
                const name = item.querySelector('h4')?.textContent || '';
                const msg = item.querySelector('p')?.textContent || '';
                item.style.display = (name + msg).toLowerCase().includes(q.toLowerCase()) ? '' : 'none';
            });
        }

        // ===== B. SEARCH SYSTEM =====
        function doSearch() {
            const q = document.getElementById('searchInput').value.trim();
            if (!q) return;
            showPage('feed');

            // Remove existing search results
            document.querySelectorAll('.search-results-section').forEach(el => el.remove());

            const fp = document.getElementById('page-feed');
            const firstPost = fp.querySelector('.post-card, .dynamic-post');

            // Search posts
            const matchedPosts = allPosts.filter(p =>
                p.content.includes(q) || p.author.includes(q) || (p.title && p.title.includes(q)) ||
                p.tags.some(t => t.includes(q))
            );

            // Search user posts
            const matchedUserPosts = userPosts.filter(p =>
                (p.text && p.text.includes(q)) || (p.displayText && p.displayText.includes(q)) ||
                (p.tags && p.tags.some(t => t.includes(q)))
            );

            const section = document.createElement('div');
            section.className = 'search-results-section mb-6';
            section.innerHTML = `<div class="bg-dark-900/80 border border-dark-800/50 rounded-2xl p-5 mb-5 animate-fade-in-up">
                <div class="flex items-center justify-between mb-2">
                    <h3 class="font-bold text-base">نتائج البحث: "${q.replace(/</g, '&lt;')}"</h3>
                    <button class="text-dark-400 text-xs hover:text-brand-400" onclick="this.closest('.search-results-section').remove();renderFeedPosts();">✕ إغلاق</button>
                </div>
                <p class="text-dark-400 text-xs">${matchedPosts.length + matchedUserPosts.length} نتيجة</p>
            </div>`;

            fp.insertBefore(section, firstPost);

            // Hide regular posts, show search results
            fp.querySelectorAll('.post-card:not(.search-result), .dynamic-post').forEach(el => el.style.display = 'none');
            document.getElementById('infiniteLoader').style.display = 'none';

            if (matchedPosts.length + matchedUserPosts.length === 0) {
                section.innerHTML += '<div class="text-center py-12 text-dark-400"><span class="iconify text-4xl mb-3 block" data-icon="lucide:search-x"></span><p class="text-sm">لا توجد نتائج</p></div>';
            } else {
                [...matchedUserPosts, ...matchedPosts].forEach((post, i) => {
                    const div = document.createElement('div');
                    div.className = 'search-result';
                    if (post.id && post.id.startsWith('user-')) {
                        div.innerHTML = buildOwnPostHTML(post);
                    } else {
                        div.innerHTML = buildPlatformPostHTML(post, i);
                    }
                    section.appendChild(div.firstElementChild || div);
                });
            }

            showToast(`تم العثور على ${matchedPosts.length + matchedUserPosts.length} نتيجة`);
        }

        // ===== C. SETTINGS PERSISTENCE =====
        const SettingsStore = {
            _key: 'lawbook_settings',
            _defaults: {
                profileVisible: true,
                emailNotifs: true,
                darkMode: true,
                twoFactor: false,
                language: 'ar'
            },
            get() {
                const saved = Safe.getJSON(this._key, '{}');
                return { ...this._defaults, ...saved };
            },
            update(key, value) {
                const s = this.get();
                s[key] = value;
                Safe.setJSON(this._key, s);
            }
        };

        function initSettings() {
            const settings = SettingsStore.get();
            document.querySelectorAll('#page-settings .toggle-switch').forEach((toggle, i) => {
                const keys = ['profileVisible', 'emailNotifs', 'darkMode', 'twoFactor'];
                if (settings[keys[i]]) toggle.classList.add('on');
                else toggle.classList.remove('on');

                // Replace the inline onclick with a proper handler
                toggle.onclick = function() {
                    this.classList.toggle('on');
                    SettingsStore.update(keys[i], this.classList.contains('on'));
                    showToast('تم الحفظ ✓');
                };
            });

            // Logout button
            const logoutBtn = document.querySelector('#page-settings .text-red-400:first-of-type');
            if (logoutBtn && logoutBtn.textContent.includes('تسجيل الخروج')) {
                logoutBtn.onclick = function() {
                    if (confirm('هل تريد تسجيل الخروج؟')) {
                        try { localStorage.clear(); } catch(e) { console.warn("[Safe] clear failed:", e.message); }
                        sessionStorage.clear();
                        location.reload();
                    }
                };
            }

            // Delete account
            const deleteBtn = document.querySelectorAll('#page-settings .text-red-400')[1];
            if (deleteBtn && deleteBtn.textContent.includes('حذف الحساب')) {
                deleteBtn.onclick = function() {
                    if (confirm('تحذير: سيتم حذف جميع بياناتك نهائياً! هل أنت متأكد؟')) {
                        try { localStorage.clear(); } catch(e) { console.warn("[Safe] clear failed:", e.message); }
                        sessionStorage.clear();
                        showToast('تم حذف الحساب');
                        setTimeout(() => location.reload(), 1000);
                    }
                };
            }
        }

        // ===== D. EVENTS REGISTRATION =====
        const EventsStore = {
            _key: 'lawbook_registered_events',
            getRegistered() { return Safe.getJSON(this._key, '[]'); },
            toggle(eventId) {
                let reg = this.getRegistered();
                if (reg.includes(eventId)) {
                    reg = reg.filter(id => id !== eventId);
                    showToast('تم إلغاء التسجيل');
                } else {
                    reg.push(eventId);
                    showToast('تم التسجيل بنجاح ✓');
                }
                Safe.setJSON(this._key, reg);
                return reg.includes(eventId);
            },
            isRegistered(eventId) { return this.getRegistered().includes(eventId); }
        };

        function initEvents() {
            const eventCards = document.querySelectorAll('#page-events .p-4');
            eventCards.forEach((card, i) => {
                const eventId = 'event-' + i;
                const btn = card.querySelector('button');
                if (btn) {
                    if (EventsStore.isRegistered(eventId)) {
                        btn.textContent = 'مسجل ✓';
                        btn.classList.remove('bg-brand-500', 'bg-blue-500', 'bg-purple-500');
                        btn.classList.add('bg-green-500');
                    }
                    btn.onclick = function(e) {
                        e.stopPropagation();
                        const isNow = EventsStore.toggle(eventId);
                        this.textContent = isNow ? 'مسجل ✓' : 'تسجيل';
                        this.classList.toggle('bg-green-500', isNow);
                        this.classList.toggle('bg-brand-500', !isNow);
                    };
                }
            });
        }

        // ===== E. ARTICLES MANAGEMENT =====
        const ArticlesStore = {
            _key: 'lawbook_articles',
            getAll() { return Safe.getJSON(this._key, '[]'); },
            save(list) { Safe.setJSON(this._key, list); },
            add(article) {
                const list = this.getAll();
                list.unshift(article);
                this.save(list);
            },
            delete(articleId) {
                const list = this.getAll().filter(a => a.id !== articleId);
                this.save(list);
            },
            update(articleId, data) {
                const list = this.getAll();
                const idx = list.findIndex(a => a.id === articleId);
                if (idx !== -1) { Object.assign(list[idx], data); this.save(list); }
            }
        };

        function showArticleEditor() {
            // Create modal if it doesn't exist
            let modal = document.getElementById('articleEditorModal');
            if (!modal) {
                modal = document.createElement('div');
                modal.id = 'articleEditorModal';
                modal.className = 'modal-overlay';
                modal.onclick = function(e) { if (e.target === this) this.classList.remove('active'); };
                modal.innerHTML = `<div class="bg-dark-900 border border-dark-700/50 rounded-2xl w-[95%] max-w-lg mx-4 max-h-[90vh] overflow-y-auto" onclick="event.stopPropagation()">
                    <div class="flex items-center justify-between p-5 border-b border-dark-800/50 sticky top-0 bg-dark-900 z-10">
                        <h3 class="font-bold text-base">مقال جديد</h3>
                        <button onclick="document.getElementById('articleEditorModal').classList.remove('active')" class="p-1.5 rounded-lg hover:bg-dark-800"><span class="iconify text-dark-400 text-xl" data-icon="lucide:x"></span></button>
                    </div>
                    <div class="p-5 space-y-4">
                        <div><label class="text-xs text-dark-400 block mb-1.5">عنوان المقال</label><input type="text" id="articleTitle" class="w-full bg-dark-850 border border-dark-700/50 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500/50" placeholder="عنوان المقال"></div>
                        <div><label class="text-xs text-dark-400 block mb-1.5">الوسوم (مفصولة بمسافة)</label><input type="text" id="articleTags" class="w-full bg-dark-850 border border-dark-700/50 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500/50" placeholder="#قانون #تحكيم"></div>
                        <div><label class="text-xs text-dark-400 block mb-1.5">محتوى المقال</label><textarea id="articleContent" rows="8" class="w-full bg-dark-850 border border-dark-700/50 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-brand-500/50 resize-none" placeholder="اكتب مقالك هنا..."></textarea></div>
                    </div>
                    <div class="flex gap-3 p-5 border-t border-dark-800/50 sticky bottom-0 bg-dark-900">
                        <button onclick="document.getElementById('articleEditorModal').classList.remove('active')" class="flex-1 bg-dark-800 text-sm py-2.5 rounded-xl border border-dark-700">إلغاء</button>
                        <button onclick="publishArticle()" class="flex-1 bg-brand-500 text-white text-sm font-semibold py-2.5 rounded-xl">نشر المقال</button>
                    </div>
                </div>`;
                document.body.appendChild(modal);
            }
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }

        function publishArticle() {
            const title = document.getElementById('articleTitle').value.trim();
            const content = document.getElementById('articleContent').value.trim();
            const tagsStr = document.getElementById('articleTags').value.trim();
            if (!title || !content) { showToast('أكمل العنوان والمحتوى'); return; }

            const tags = tagsStr.match(/#[\u0600-\u06FFa-zA-Z0-9_]+/g) || [];
            ArticlesStore.add({
                id: 'article-' + Date.now(),
                title, content, tags,
                time: 'الآن',
                views: 0, likes: 0, comments: 0
            });

            document.getElementById('articleEditorModal').classList.remove('active');
            document.body.style.overflow = '';
            renderArticlesPage();
            showToast('تم نشر المقال ✓');
        }

        function renderArticlesPage() {
            const container = document.querySelector('#page-articles .divide-y');
            if (!container) return;
            const articles = ArticlesStore.getAll();

            if (articles.length === 0) {
                container.innerHTML = '<div class="p-8 text-center text-dark-400"><span class="iconify text-3xl mb-2 block" data-icon="lucide:file-plus"></span><p class="text-sm">لم تنشر أي مقال بعد</p></div>';
                return;
            }

            container.innerHTML = articles.map(a => `<div class="p-4 hover:bg-dark-850 cursor-pointer transition-all">
                <div class="flex items-center justify-between mb-2">
                    <span class="bg-green-500/10 text-green-400 text-[10px] font-bold px-2 py-0.5 rounded-md">منشور</span>
                    <div class="flex items-center gap-2">
                        <span class="text-dark-500 text-[10px]">${a.time}</span>
                        <button class="text-dark-500 hover:text-red-400 text-xs" onclick="event.stopPropagation();if(confirm('حذف المقال؟')){ArticlesStore.delete('${a.id}');renderArticlesPage();showToast('تم الحذف')}">🗑️</button>
                    </div>
                </div>
                <h3 class="font-semibold text-sm mb-1">${a.title.replace(/</g, '&lt;')}</h3>
                <p class="text-dark-400 text-xs mb-2">${a.content.substring(0, 120).replace(/</g, '&lt;')}...</p>
                <div class="flex flex-wrap gap-1 mb-2">${(a.tags || []).map(t => `<span class="text-brand-400 text-[10px]">${t}</span>`).join(' ')}</div>
                <div class="flex gap-4 text-dark-500 text-[10px]"><span>👁 ${a.views || 0}</span><span>❤️ ${a.likes || 0}</span><span>💬 ${a.comments || 0}</span></div>
            </div>`).join('');

            // Update article count
            const countEl = document.querySelector('#page-articles .text-dark-400.text-xs');
            if (countEl) countEl.textContent = `${articles.length} مقالة منشورة`;
        }
