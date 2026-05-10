
        // ===== F. BOOKMARKS SYSTEM (معزول لكل مستخدم) =====
        const BookmarksStore = {
            _key: 'bookmarks',
            getIds() { return UserStore.getJSON(this._key, '[]'); },
            toggle(postId) {
                let ids = this.getIds();
                if (ids.includes(postId)) {
                    ids = ids.filter(id => id !== postId);
                    showToast('تم إلغاء الحفظ');
                } else {
                    ids.push(postId);
                    showToast('تم الحفظ ✓');
                }
                UserStore.setJSON(this._key, ids);
                return ids.includes(postId);
            },
            isBookmarked(postId) { return this.getIds().includes(postId); }
        };

        function renderBookmarksPage() {
            const container = document.querySelector('#page-bookmarks .divide-y');
            if (!container) return;
            const bookmarkedIds = BookmarksStore.getIds();

            if (bookmarkedIds.length === 0) {
                container.innerHTML = '<div class="p-8 text-center text-dark-400"><span class="iconify text-3xl mb-2 block" data-icon="lucide:bookmark"></span><p class="text-sm">لم تحفظ أي منشور بعد</p></div>';
                return;
            }

            const bookmarkedPosts = bookmarkedIds.map(id => findPostById(id)).filter(Boolean);
            container.innerHTML = bookmarkedPosts.map(post => {
                const isOwn = isOwnPost(post.id);
                const authorName = isOwn ? getProfile().name : (post.author || 'مستخدم');
                return `<div class="p-4 hover:bg-dark-850 cursor-pointer transition-all" onclick="openPostDetail('${post.id}')">
                    <div class="flex items-center gap-3 mb-2">
                        <div class="w-8 h-8 rounded-lg bg-gradient-to-br ${post.gradient || 'from-blue-500 to-purple-600'} flex items-center justify-center text-white text-xs font-bold">${(authorName).charAt(0)}</div>
                        <div><h4 class="font-medium text-sm">${authorName}</h4><p class="text-dark-400 text-[10px]">${post.time || ''}</p></div>
                        <button class="mr-auto text-dark-500 hover:text-red-400" onclick="event.stopPropagation();BookmarksStore.toggle('${post.id}');renderBookmarksPage();">✕</button>
                    </div>
                    <h3 class="font-semibold text-sm mb-1">${(post.title || '').replace(/</g, '&lt;')}</h3>
                    <p class="text-dark-400 text-xs">${(post.displayText || post.content || '').replace(/<[^>]*>/g, '').substring(0, 100)}...</p>
                </div>`;
            }).join('');
        }

        // Enhanced toggleBookmark to save actual post data
        const _origToggleBookmark = typeof toggleBookmark === 'function' ? toggleBookmark : null;
        function toggleBookmark(btn, postId) {
            const isSaved = btn.classList.toggle('saved');
            const icon = btn.querySelector('.iconify');
            if (isSaved) {
                icon.setAttribute('data-icon', 'lucide:bookmark-check');
                icon.style.color = '#f97316';
                if (postId) BookmarksStore.toggle(postId);
                else showToast('تم الحفظ ✓');
            } else {
                icon.setAttribute('data-icon', 'lucide:bookmark');
                icon.style.color = '';
                if (postId) BookmarksStore.toggle(postId);
                else showToast('تم إلغاء الحفظ');
            }
        }

        // ===== G. CONNECTIONS PAGE =====
        function renderConnectionsPage() {
            const container = document.querySelector('#page-connections .space-y-3');
            if (!container) return;

            const connTabs = document.querySelectorAll('#page-connections .conn-tab');
            const activeTab = document.querySelector('#page-connections .conn-tab.active');
            const activeText = activeTab ? activeTab.textContent.trim() : 'المتابعون';

            let html = '';
            if (activeText === 'المتابعون' || activeText === 'يتابع') {
                const users = [
                    { name: 'سارة المنصوري', role: 'مستشارة قانونية • الإمارات', avatar: 'https://picsum.photos/seed/sara-legal/40/40.jpg', gradient: 'from-pink-500 to-yellow-500' },
                    { name: 'خالد العمري', role: 'أستاذ القانون الدولي • الأردن', avatar: 'https://picsum.photos/seed/khalid-jordan/40/40.jpg', gradient: 'from-cyan-500 to-purple-500' },
                    { name: 'نورة القحطاني', role: 'محامية عقود • السعودية', avatar: 'https://picsum.photos/seed/nora-lawyer/40/40.jpg', gradient: 'from-purple-500 to-red-500' },
                    { name: 'فاطمة الحربي', role: 'خبيرة تقنية مالية', avatar: 'https://picsum.photos/seed/fatima-fintech/40/40.jpg', gradient: 'from-green-500 to-cyan-500' },
                    { name: 'عمر الحسيني', role: 'قاضي متقاعد • العراق', avatar: 'https://picsum.photos/seed/omar-judge/40/40.jpg', gradient: 'from-yellow-500 to-green-500' }
                ];

                html = users.map(u => `<div class="flex items-center gap-3 p-3 bg-dark-850 rounded-xl">
                    <img src="${u.avatar}" class="w-10 h-10 rounded-xl object-cover" alt="">
                    <div class="flex-1"><h4 class="font-medium text-sm">${u.name}</h4><p class="text-dark-400 text-[10px]">${u.role}</p></div>
                    <button class="text-xs text-dark-400 border border-dark-700 px-3 py-1 rounded-lg hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30 transition-all" onclick="this.textContent='تم الإلغاء ✓';this.disabled=true;showToast('تم إلغاء المتابعة')">متابَع</button>
                    <button class="text-xs text-brand-400 border border-brand-500/30 px-3 py-1 rounded-lg hover:bg-brand-500/10 transition-all" onclick="MsgStore.getOrCreate('${u.name}','${u.name}','${u.avatar}');renderMessagesPage();showPage('messages');showToast('فتح المحادثة')">رسالة</button>
                </div>`).join('');
            } else {
                // Connection requests (simulated)
                html = `<div class="flex items-center gap-3 p-3 bg-dark-850 rounded-xl">
                    <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold">أ</div>
                    <div class="flex-1"><h4 class="font-medium text-sm">أحمد المنصور</h4><p class="text-dark-400 text-[10px]">أستاذ قانون دستوري</p></div>
                    <button class="text-xs bg-brand-500 text-white px-3 py-1 rounded-lg" onclick="this.textContent='تم ✓';this.disabled=true;showToast('تم قبول الطلب')">قبول</button>
                    <button class="text-xs text-dark-400 border border-dark-700 px-3 py-1 rounded-lg" onclick="this.closest('.flex').remove();showToast('تم الرفض')">رفض</button>
                </div>
                <div class="flex items-center gap-3 p-3 bg-dark-850 rounded-xl">
                    <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-orange-500 flex items-center justify-center text-white font-bold">ر</div>
                    <div class="flex-1"><h4 class="font-medium text-sm">رنا السعيد</h4><p class="text-dark-400 text-[10px]">محامية جنائية</p></div>
                    <button class="text-xs bg-brand-500 text-white px-3 py-1 rounded-lg" onclick="this.textContent='تم ✓';this.disabled=true;showToast('تم قبول الطلب')">قبول</button>
                    <button class="text-xs text-dark-400 border border-dark-700 px-3 py-1 rounded-lg" onclick="this.closest('.flex').remove();showToast('تم الرفض')">رفض</button>
                </div>`;
            }

            container.innerHTML = html;
        }

        // Fix switchConnTab to actually render
        function switchConnTab(btn) {
            document.querySelectorAll('.conn-tab').forEach(t => { t.classList.remove('active', 'bg-dark-800', 'text-white'); t.classList.add('text-dark-400') });
            btn.classList.add('active', 'bg-dark-800', 'text-white');
            btn.classList.remove('text-dark-400');
            renderConnectionsPage();
        }

        // ===== H. ENHANCED NOTIFICATIONS =====
        function initNotifications() {
            // Make notification items clickable
            document.addEventListener('click', function(e) {
                const notifItem = e.target.closest('.notif-item-row');
                if (!notifItem) return;
                const id = parseInt(notifItem.dataset?.id);
                if (id) clickNotif(id);
            });
        }

        // ===== I. ENHANCED BOOKMARK BUTTON =====
        // Override the bookmark click to save post ID
        document.addEventListener('click', function(e) {
            const bookmarkBtn = e.target.closest('.bookmark-btn');
            if (!bookmarkBtn) return;
            const article = bookmarkBtn.closest('article');
            if (!article) return;
            // Find post ID from the article's like button or comment section
            const likeBtn = article.querySelector('.like-btn');
            if (likeBtn) {
                const onclick = likeBtn.getAttribute('onclick') || '';
                const match = onclick.match(/'([^']+)'/g);
                if (match && match.length >= 2) {
                    const postId = match[match.length - 1].replace(/'/g, '');
                    BookmarksStore.toggle(postId);
                }
            }
        });
