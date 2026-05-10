        // ============================================================
        // ===== SUPABASE INTEGRATION MODULE ========================
        // ============================================================
        const SB_URL = 'https://wxokmokxehssnchtmjke.supabase.co';
        const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4b2ttb2t4ZWhzc25jaHRtamtlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODMxODgyNCwiZXhwIjoyMDkzODk0ODI0fQ.AN5SkazpJVm4R-6Pdh2ZqvzqhNIM-Mu2XHCbrCmqs3g';

        let sb = null; // Supabase client
        let sbUser = null; // Current auth user
        let sbProfile = null; // Current user profile from DB
        let sbOnline = false; // Whether Supabase is reachable

        // Initialize Supabase
        async function initSupabase() {
            try {
                if (typeof supabase !== 'undefined' && supabase.createClient) {
                    sb = supabase.createClient(SB_URL, SB_KEY);
                    // Test connection
                    const { data, error } = await sb.from('profiles').select('id').limit(1);
                    if (!error) {
                        sbOnline = true;
                        console.log('✅ Supabase connected');
                        return true;
                    } else {
                        console.warn('Supabase tables not found.');
                        sbOnline = false;
                    }
                }
            } catch (e) {
                console.warn('Supabase unavailable, using localStorage:', e.message);
                sbOnline = false;
            }
            return false;
        }

        // Load current user profile
        async function loadUserProfile() {
            if (!sb || !sbUser) return null;
            const { data } = await sb.from('profiles').select('*').eq('id', sbUser.id).single();
            sbProfile = data;
            return data;
        }

        // Auth: Load profile directly (bypass Supabase Auth)
        async function signInAnonymously() {
            if (!sb) return null;
            try {
                // Get the first profile as the "logged in" user
                const { data: profiles } = await sb.from('profiles')
                    .select('*')
                    .order('created_at', { ascending: true })
                    .limit(1);
                if (profiles && profiles.length > 0) {
                    sbProfile = profiles[0];
                    sbUser = { id: sbProfile.id };
                    console.log('✅ Supabase profile:', sbProfile.name);
                    return sbUser;
                }
            } catch(e) {
                console.warn('Profile load failed:', e.message);
            }
            return null;
        }

        // ============================================================
        // SUPABASE CRUD OPERATIONS (with localStorage fallback)
        // ============================================================

        const SB = {
            // POSTS
            async getPosts(limit = 20, offset = 0) {
                if (!sbOnline) return null;
                const { data } = await sb.from('posts')
                    .select('*, profiles(*)')
                    .order('created_at', { ascending: false })
                    .range(offset, offset + limit - 1);
                return data;
            },

            async createPost(content, title = '', tags = []) {
                if (!sbOnline || !sbUser) return null;
                const { data } = await sb.from('posts').insert({
                    author_id: sbUser.id,
                    content, title, tags
                }).select('*, profiles(*)').single();
                return data;
            },

            async deletePost(postId) {
                if (!sbOnline || !sbUser) return;
                await sb.from('posts').delete().eq('id', postId).eq('author_id', sbUser.id);
            },

            // LIKES
            async toggleLike(postId) {
                if (!sbOnline || !sbUser) return null;
                // Check if already liked
                const { data: existing } = await sb.from('likes')
                    .select('id').eq('user_id', sbUser.id).eq('post_id', postId).maybeSingle();
                if (existing) {
                    await sb.from('likes').delete().eq('id', existing.id);
                    return false; // unliked
                } else {
                    await sb.from('likes').insert({ user_id: sbUser.id, post_id: postId });
                    return true; // liked
                }
            },

            async isLiked(postId) {
                if (!sbOnline || !sbUser) return false;
                const { data } = await sb.from('likes')
                    .select('id').eq('user_id', sbUser.id).eq('post_id', postId).maybeSingle();
                return !!data;
            },

            // COMMENTS
            async getComments(postId) {
                if (!sbOnline) return null;
                const { data } = await sb.from('comments')
                    .select('*, profiles(*)')
                    .eq('post_id', postId)
                    .order('created_at', { ascending: true });
                return data;
            },

            async addComment(postId, content, isSticker = false) {
                if (!sbOnline || !sbUser) return null;
                const { data } = await sb.from('comments').insert({
                    post_id: postId, author_id: sbUser.id,
                    content, is_sticker: isSticker
                }).select('*, profiles(*)').single();
                return data;
            },

            // BOOKMARKS
            async toggleBookmark(postId) {
                if (!sbOnline || !sbUser) return null;
                const { data: existing } = await sb.from('bookmarks')
                    .select('id').eq('user_id', sbUser.id).eq('post_id', postId).maybeSingle();
                if (existing) {
                    await sb.from('bookmarks').delete().eq('id', existing.id);
                    return false;
                } else {
                    await sb.from('bookmarks').insert({ user_id: sbUser.id, post_id: postId });
                    return true;
                }
            },

            async getBookmarks() {
                if (!sbOnline || !sbUser) return null;
                const { data } = await sb.from('bookmarks')
                    .select('*, posts(*, profiles(*))')
                    .eq('user_id', sbUser.id)
                    .order('created_at', { ascending: false });
                return data;
            },

            // FOLLOWS
            async toggleFollow(userId) {
                if (!sbOnline || !sbUser) return null;
                const { data: existing } = await sb.from('follows')
                    .select('id').eq('follower_id', sbUser.id).eq('following_id', userId).maybeSingle();
                if (existing) {
                    await sb.from('follows').delete().eq('id', existing.id);
                    return false;
                } else {
                    await sb.from('follows').insert({ follower_id: sbUser.id, following_id: userId });
                    return true;
                }
            },

            async getFollowing() {
                if (!sbOnline || !sbUser) return null;
                const { data } = await sb.from('follows')
                    .select('following_id, profiles!following_id(*)')
                    .eq('follower_id', sbUser.id);
                return data;
            },

            async isFollowing(userId) {
                if (!sbOnline || !sbUser) return false;
                const { data } = await sb.from('follows')
                    .select('id').eq('follower_id', sbUser.id).eq('following_id', userId).maybeSingle();
                return !!data;
            },

            // MESSAGES
            async getConversations() {
                if (!sbOnline || !sbUser) return null;
                // Get unique conversation partners
                const { data: sent } = await sb.from('messages')
                    .select('receiver_id, profiles!receiver_id(*)')
                    .eq('sender_id', sbUser.id)
                    .order('created_at', { ascending: false });
                const { data: received } = await sb.from('messages')
                    .select('sender_id, profiles!sender_id(*)')
                    .eq('receiver_id', sbUser.id)
                    .order('created_at', { ascending: false });
                // Merge and deduplicate
                const partners = new Map();
                if (sent) sent.forEach(m => { if (!partners.has(m.receiver_id)) partners.set(m.receiver_id, m.profiles); });
                if (received) received.forEach(m => { if (!partners.has(m.sender_id)) partners.set(m.sender_id, m.profiles); });
                return Array.from(partners.entries()).map(([id, profile]) => ({ userId: id, profile }));
            },

            async getMessages(otherUserId) {
                if (!sbOnline || !sbUser) return null;
                const { data } = await sb.from('messages')
                    .select('*')
                    .or(`and(sender_id.eq.${sbUser.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${sbUser.id})`)
                    .order('created_at', { ascending: true });
                return data;
            },

            async sendMessage(receiverId, content) {
                if (!sbOnline || !sbUser) return null;
                const { data } = await sb.from('messages').insert({
                    sender_id: sbUser.id, receiver_id: receiverId, content
                }).select().single();
                return data;
            },

            async getUnreadCount() {
                if (!sbOnline || !sbUser) return 0;
                const { count } = await sb.from('messages')
                    .select('*', { count: 'exact', head: true })
                    .eq('receiver_id', sbUser.id).eq('is_read', false);
                return count || 0;
            },

            async markConversationRead(otherUserId) {
                if (!sbOnline || !sbUser) return;
                await sb.from('messages').update({ is_read: true })
                    .eq('sender_id', otherUserId).eq('receiver_id', sbUser.id).eq('is_read', false);
            },

            // STORIES
            async getActiveStories() {
                if (!sbOnline) return null;
                const { data } = await sb.from('stories')
                    .select('*, profiles(*)')
                    .gt('expires_at', new Date().toISOString())
                    .order('created_at', { ascending: false });
                return data;
            },

            async createStory(content, type = 'text', mediaUrl = '', bgColor = '') {
                if (!sbOnline || !sbUser) return null;
                const { data } = await sb.from('stories').insert({
                    author_id: sbUser.id, content,
                    type: type, media_url: mediaUrl, bg_color: bgColor
                }).select().single();
                return data;
            },

            // ARTICLES
            async getArticles() {
                if (!sbOnline) return null;
                const { data } = await sb.from('articles')
                    .select('*, profiles(*)')
                    .eq('status', 'published')
                    .order('created_at', { ascending: false });
                return data;
            },

            async createArticle(title, content, tags = []) {
                if (!sbOnline || !sbUser) return null;
                const { data } = await sb.from('articles').insert({
                    author_id: sbUser.id, title, content, tags
                }).select().single();
                return data;
            },

            // NOTIFICATIONS
            async getNotifications() {
                if (!sbOnline || !sbUser) return null;
                const { data } = await sb.from('notifications')
                    .select('*, from_user:profiles!actor_id(*)')
                    .eq('user_id', sbUser.id)
                    .order('created_at', { ascending: false })
                    .limit(50);
                return data;
            },

            async markNotificationsRead() {
                if (!sbOnline || !sbUser) return;
                await sb.from('notifications').update({ is_read: true })
                    .eq('user_id', sbUser.id).eq('is_read', false);
            },

            // EVENTS
            async registerEvent(eventId, eventTitle) {
                if (!sbOnline || !sbUser) return null;
                const { data } = await sb.from('events_registrations').insert({
                    user_id: sbUser.id, event_id: eventId, event_title: eventTitle
                }).select().single();
                return data;
            },

            async unregisterEvent(eventId) {
                if (!sbOnline || !sbUser) return;
                await sb.from('events_registrations').delete()
                    .eq('user_id', sbUser.id).eq('event_id', eventId);
            },

            async getRegisteredEvents() {
                if (!sbOnline || !sbUser) return null;
                const { data } = await sb.from('events_registrations')
                    .select('event_id').eq('user_id', sbUser.id);
                return data ? data.map(d => d.event_id) : [];
            },

            // SEARCH
            async searchPosts(query) {
                if (!sbOnline) return null;
                const { data } = await sb.from('posts')
                    .select('*, profiles(*)')
                    .or(`content.ilike.%${query}%,name.ilike.%${query}%`)
                    .order('created_at', { ascending: false })
                    .limit(20);
                return data;
            },

            async searchProfiles(query) {
                if (!sbOnline) return null;
                const { data } = await sb.from('profiles')
                    .select('*')
                    .or(`display_name.ilike.%${query}%,username.ilike.%${query}%,name.ilike.%${query}%`)
                    .limit(10);
                return data;
            },

            // UTILITY
            isConnected() { return sbOnline; },
            getCurrentUser() { return sbUser; },
            getCurrentProfile() { return sbProfile; }
        };

        // ============================================================
        // ===== SPA STATE MANAGER & PULL-TO-REFRESH ================
        // ============================================================

        const AppState = {
            _key: 'lawbook_app_state',
            _scrollKey: 'lawbook_scroll_positions',

            // Save current app state
            save() {
                const state = {
                    currentPage: this._getCurrentPage(),
                    activeTab: this._getActiveTab(),
                    openPostId: typeof currentDetailPostId !== 'undefined' ? currentDetailPostId : null,
                    openModal: this._getOpenModal(),
                    timestamp: Date.now()
                };
                sessionStorage.setItem(this._key, JSON.stringify(state));
                this._saveScrollPosition();
            },

            // Restore saved state on page load
            restore() {
                try {
                    const raw = sessionStorage.getItem(this._key);
                    if (!raw) return false;
                    const state = JSON.parse(raw);
                    if (!state.currentPage) return false;

                    // Restore page
                    if (state.currentPage !== 'feed') {
                        _silentShowPage(state.currentPage);
                    }

                    // Restore active tab
                    if (state.activeTab) {
                        this._restoreTab(state.activeTab);
                    }

                    // Restore scroll position
                    requestAnimationFrame(() => {
                        this._restoreScrollPosition(state.currentPage);
                    });

                    // Restore open post detail
                    if (state.openPostId) {
                        setTimeout(() => {
                            if (typeof openPostDetail === 'function') {
                                openPostDetail(state.openPostId);
                            }
                        }, 200);
                    }

                    return true;
                } catch (e) {
                    return false;
                }
            },

            _getCurrentPage() {
                const pages = document.querySelectorAll('.page-content');
                for (const p of pages) {
                    if (!p.classList.contains('hidden')) {
                        return p.id.replace('page-', '');
                    }
                }
                return 'feed';
            },

            _getActiveTab() {
                // Check profile tabs
                const profileTab = document.querySelector('#page-profile .profile-tab.active');
                if (profileTab && !document.getElementById('page-profile').classList.contains('hidden')) {
                    return { type: 'profile', label: profileTab.textContent.trim() };
                }
                // Check feed tabs
                const feedTab = document.querySelector('.feed-tab.active');
                if (feedTab && !document.getElementById('page-feed').classList.contains('hidden')) {
                    return { type: 'feed', label: feedTab.textContent.trim() };
                }
                return null;
            },

            _restoreTab(tab) {
                if (tab.type === 'profile') {
                    const tabs = document.querySelectorAll('#page-profile .profile-tab');
                    tabs.forEach(t => {
                        if (t.textContent.trim() === tab.label) {
                            if (typeof switchProfileTab === 'function') switchProfileTab(t);
                        }
                    });
                }
            },

            _getOpenModal() {
                if (document.getElementById('postDetailModal')?.classList.contains('active')) return 'postDetail';
                if (document.getElementById('editPostModal')?.classList.contains('active')) return 'editPost';
                if (document.getElementById('shareModal')?.classList.contains('active')) return 'share';
                if (document.getElementById('postModal')?.classList.contains('active')) return 'post';
                return null;
            },

            _saveScrollPosition() {
                const page = this._getCurrentPage();
                let positions = {};
                try { positions = JSON.parse(sessionStorage.getItem(this._scrollKey) || '{}'); } catch(e) {}
                positions[page] = window.scrollY;
                sessionStorage.setItem(this._scrollKey, JSON.stringify(positions));
            },

            _restoreScrollPosition(page) {
                try {
                    const positions = JSON.parse(sessionStorage.getItem(this._scrollKey) || '{}');
                    const y = positions[page] || 0;
                    window.scrollTo({ top: y, behavior: 'instant' });
                } catch(e) {}
            }
        };

        // Silent page navigation (no scroll to top)
        function _silentShowPage(page) {
            document.querySelectorAll('.page-content').forEach(p => p.classList.add('hidden'));
            const target = document.getElementById('page-' + page);
            if (target) target.classList.remove('hidden');
            if (page === 'profile' && typeof renderProfilePosts === 'function') renderProfilePosts();
            document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
            document.querySelectorAll('.sidebar-link').forEach(l => {
                if (l.textContent.includes(getPageLabel(page))) l.classList.add('active');
            });
        }

        // ============================================================
        // ===== PULL-TO-REFRESH SYSTEM ==============================
        // ============================================================

        const PullToRefresh = {
            _active: false,
            _startY: 0,
            _currentY: 0,
            _threshold: 80,
            _pulling: false,
            _refreshing: false,
            _indicator: null,

            init() {
                // Create indicator element
                this._indicator = document.createElement('div');
                this._indicator.id = 'ptr-indicator';
                this._indicator.innerHTML = `
                    <div class="ptr-spinner"></div>
                    <span class="ptr-text">اسحب للتحديث</span>
                `;
                this._indicator.style.cssText = `
                    position: fixed; top: 0; left: 0; right: 0; z-index: 9998;
                    display: flex; align-items: center; justify-content: center; gap: 10px;
                    height: 0; overflow: hidden; background: #0a0a0a;
                    transition: height 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                    font-size: 13px; color: #a3a3a3;
                `;
                document.body.prepend(this._indicator);

                // Add spinner CSS
                const style = document.createElement('style');
                style.textContent = `
                    .ptr-spinner {
                        width: 20px; height: 20px; border: 2px solid #404040;
                        border-top-color: #f97316; border-radius: 50%;
                        animation: ptr-spin 0.8s linear infinite;
                        transition: transform 0.3s;
                    }
                    .ptr-spinner.refreshing { animation: ptr-spin 0.6s linear infinite; }
                    @keyframes ptr-spin { to { transform: rotate(360deg); } }
                    .ptr-pulling .ptr-spinner { transform: rotate(var(--ptr-rotate, 0deg)); }
                    .ptr-text { font-family: 'Noto Kufi Arabic', sans-serif; }
                `;
                document.head.appendChild(style);

                this._bindEvents();
            },

            _bindEvents() {
                let touchStartY = 0;
                let isTouching = false;

                document.addEventListener('touchstart', (e) => {
                    if (this._refreshing) return;
                    // Only activate at top of page or inside specific scrollable containers
                    const scrollY = window.scrollY || document.documentElement.scrollTop;
                    if (scrollY > 5) return;
                    touchStartY = e.touches[0].clientY;
                    isTouching = true;
                    this._pulling = false;
                }, { passive: true });

                document.addEventListener('touchmove', (e) => {
                    if (!isTouching || this._refreshing) return;
                    const scrollY = window.scrollY || document.documentElement.scrollTop;
                    if (scrollY > 0) { this._pulling = false; return; }

                    const currentY = e.touches[0].clientY;
                    const pullDistance = currentY - touchStartY;

                    if (pullDistance > 10) {
                        this._pulling = true;
                        // Dampen the pull
                        const dampened = Math.min(pullDistance * 0.5, 120);
                        this._indicator.style.height = dampened + 'px';
                        const rotate = (dampened / 120) * 720;
                        const spinner = this._indicator.querySelector('.ptr-spinner');
                        spinner.style.setProperty('--ptr-rotate', rotate + 'deg');
                        spinner.classList.add('ptr-pulling');

                        const text = this._indicator.querySelector('.ptr-text');
                        if (dampened >= this._threshold) {
                            text.textContent = 'اترك للتحديث';
                            text.style.color = '#f97316';
                        } else {
                            text.textContent = 'اسحب للتحديث';
                            text.style.color = '#a3a3a3';
                        }
                    }
                }, { passive: true });

                document.addEventListener('touchend', () => {
                    if (!isTouching) return;
                    isTouching = false;

                    if (!this._pulling) return;
                    this._pulling = false;

                    const height = parseInt(this._indicator.style.height) || 0;
                    if (height >= this._threshold) {
                        this._doRefresh();
                    } else {
                        this._collapse();
                    }
                }, { passive: true });
            },

            async _doRefresh() {
                this._refreshing = true;
                const spinner = this._indicator.querySelector('.ptr-spinner');
                const text = this._indicator.querySelector('.ptr-text');
                spinner.classList.remove('ptr-pulling');
                spinner.classList.add('refreshing');
                text.textContent = 'جاري التحديث...';
                text.style.color = '#f97316';
                this._indicator.style.height = '60px';

                // Save current state before refresh
                AppState.save();

                // Refresh current page content
                await this._refreshCurrentPage();

                // Done
                text.textContent = 'تم التحديث ✓';
                text.style.color = '#22c55e';
                spinner.classList.remove('refreshing');
                spinner.style.display = 'none';

                setTimeout(() => {
                    this._collapse();
                    spinner.style.display = '';
                }, 800);

                this._refreshing = false;
            },

            async _refreshCurrentPage() {
                const currentPage = AppState._getCurrentPage();

                // Simulate a small delay for smooth UX
                await new Promise(r => setTimeout(r, 500));

                switch(currentPage) {
                    case 'feed':
                        if (typeof renderFeedPosts === 'function') renderFeedPosts();
                        break;
                    case 'profile':
                        if (typeof renderProfilePosts === 'function') renderProfilePosts();
                        break;
                    case 'following':
                        if (typeof renderFollowingPosts === 'function') renderFollowingPosts();
                        break;
                    case 'audio-spaces':
                        if (typeof renderSpaces === 'function') renderSpaces('live');
                        break;
                    case 'trending':
                        if (typeof renderTrendingPageList === 'function') renderTrendingPageList();
                        break;
                    case 'notifications':
                        if (typeof renderNotifs === 'function') renderNotifs('all');
                        break;
                    default:
                        if (typeof renderFeedPosts === 'function') renderFeedPosts();
                }
            },

            _collapse() {
                this._indicator.style.height = '0';
                setTimeout(() => {
                    const spinner = this._indicator.querySelector('.ptr-spinner');
                    const text = this._indicator.querySelector('.ptr-text');
                    if (spinner) spinner.classList.remove('ptr-pulling', 'refreshing');
                    if (text) { text.textContent = 'اسحب للتحديث'; text.style.color = '#a3a3a3'; }
                }, 300);
            }
        };

        // ============================================================
        // ===== NOTIFICATION PULL-TO-REFRESH ========================
        // ============================================================

        const NotifPTR = {
            _active: false,
            _startY: 0,
            _refreshing: false,
            _indicator: null,

            init() {
                const dropdown = document.getElementById('notifDropdown');
                if (!dropdown) return;

                this._indicator = document.createElement('div');
                this._indicator.className = 'notif-ptr-indicator';
                this._indicator.innerHTML = '<div class="ptr-spinner"></div><span class="ptr-text" style="font-size:12px">جاري التحديث...</span>';
                this._indicator.style.cssText = 'display:none;align-items:center;justify-content:center;gap:8px;padding:10px;background:#0a0a0a;';
                const list = dropdown.querySelector('.notif-list');
                if (list) list.prepend(this._indicator);

                dropdown.addEventListener('touchstart', (e) => {
                    if (this._refreshing) return;
                    if (list && list.scrollTop <= 0) {
                        this._startY = e.touches[0].clientY;
                        this._active = true;
                    }
                }, { passive: true });

                dropdown.addEventListener('touchend', (e) => {
                    if (!this._active || this._refreshing) return;
                    this._active = false;
                    const endY = e.changedTouches[0].clientY;
                    if (endY - this._startY > 80) {
                        this._refresh();
                    }
                }, { passive: true });
            },

            async _refresh() {
                this._refreshing = true;
                this._indicator.style.display = 'flex';
                await new Promise(r => setTimeout(r, 600));
                if (typeof renderNotifs === 'function') renderNotifs('all');
                this._indicator.style.display = 'none';
                this._refreshing = false;
                if (typeof showToast === 'function') showToast('تم تحديث الإشعارات ✓');
            }
        };

        // ============================================================
        // ===== HISTORY API (SPA NAVIGATION) =========================
        // ============================================================

        const Router = {
            _initialized: false,

            init() {
                if (this._initialized) return;
                this._initialized = true;

                // Override showPage to use history
                const originalShowPage = window.showPage;
                window.showPage = (page) => {
                    // Save current state before navigating
                    AppState.save();
                    // Push new state
                    history.pushState({ page }, '', '#' + page);
                    // Call original (but we override scroll behavior)
                    _silentShowPage(page);
                    window.scrollTo({ top: 0, behavior: 'instant' });
                };

                // Handle back/forward
                window.addEventListener('popstate', (e) => {
                    const page = (e.state && e.state.page) || this._getHashPage() || 'feed';
                    _silentShowPage(page);
                    // Restore scroll for this page
                    requestAnimationFrame(() => {
                        AppState._restoreScrollPosition(page);
                    });
                });

                // Set initial hash if none
                if (!window.location.hash) {
                    history.replaceState({ page: 'feed' }, '', '#feed');
                }
            },

            _getHashPage() {
                const hash = window.location.hash.replace('#', '');
                return hash || 'feed';
            }
        };

        // ============================================================
        // ===== AUTO-SAVE STATE ON INTERACTIONS =====================
        // ============================================================

        // Save state before unload
        window.addEventListener('beforeunload', () => {
            AppState.save();
        });

        // Save state on scroll (debounced)
        let _scrollSaveTimer = null;
        window.addEventListener('scroll', () => {
            clearTimeout(_scrollSaveTimer);
            _scrollSaveTimer = setTimeout(() => {
                AppState._saveScrollPosition();
            }, 300);
        }, { passive: true });

        // Save state periodically
        setInterval(() => { AppState.save(); }, 5000);

        // ============================================================
        // ===== END SPA SYSTEM ======================================
        // ============================================================

        // ===== Image Upload Handlers =====
        function handleProfilePhotoUpload(input, ...imgIds) {
            const file = input.files[0]; if (!file) return;
            if (!file.type.startsWith('image/')) { showToast('يرجى اختيار صورة فقط'); return; }
            const reader = new FileReader();
            reader.onload = function(e) { imgIds.forEach(id => { const el = document.getElementById(id); if (el) el.src = e.target.result; }); localStorage.setItem('profileAvatar', e.target.result); showToast('تم تحديث الصورة الشخصية ✓'); };
            reader.readAsDataURL(file);
        }
        function handleCoverUpload(input) {
            const file = input.files[0]; if (!file) return;
            if (!file.type.startsWith('image/')) { showToast('يرجى اختيار صورة فقط'); return; }
            const reader = new FileReader();
            reader.onload = function(e) { const img = document.getElementById('coverPhoto'); if (img) { img.src = e.target.result; img.classList.remove('hidden'); img.parentElement.style.background = 'none'; } localStorage.setItem('coverPhoto', e.target.result); showToast('تم تحديث صورة الغلاف ✓'); };
            reader.readAsDataURL(file);
        }
        function loadSavedImages() {
            const sa = localStorage.getItem('profileAvatar');
            if (sa) ['mobileAvatar','sidebarAvatar','desktopAvatar'].forEach(id => { const el = document.getElementById(id); if (el) el.src = sa; });
            const sc = localStorage.getItem('coverPhoto');
            if (sc) { const img = document.getElementById('coverPhoto'); if (img) { img.src = sc; img.classList.remove('hidden'); img.parentElement.style.background = 'none'; } }
        }

        // ===== Toast =====
        function showToast(msg) { const t = document.getElementById('toast'); t.textContent = msg; t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 2500); }

        // ===== Following =====
        let followingUsers = JSON.parse(localStorage.getItem('followingUsers') || '[]');
        function saveFollowing() { localStorage.setItem('followingUsers', JSON.stringify(followingUsers)); }
        function isFollowing(author) { return followingUsers.includes(author); }
        function toggleFollow(btn) {
            const author = btn.dataset.author; if (!author) return;
            const icon = btn.querySelector('.iconify');
            const text = btn.querySelector('.follow-text');
            if (isFollowing(author)) {
                followingUsers = followingUsers.filter(a => a !== author);
                btn.classList.remove('following');
                btn.style.color = '#f97316';
                btn.style.borderColor = 'rgba(249,115,22,0.3)';
                text.textContent = 'متابعة';
                icon.setAttribute('data-icon', 'lucide:user-plus');
            } else {
                followingUsers.push(author);
                btn.classList.add('following');
                btn.style.color = '#a3a3a3';
                btn.style.borderColor = '#525252';
                text.textContent = 'يتابع';
                icon.setAttribute('data-icon', 'lucide:check');
            }
            saveFollowing();
        }

        // ===== Page Navigation =====
        function showPage(page) {
            document.querySelectorAll('.page-content').forEach(p => p.classList.add('hidden'));
            const target = document.getElementById('page-' + page);
            if (target) target.classList.remove('hidden');
            if (page === 'profile') renderProfilePosts();
            document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
            document.querySelectorAll('.sidebar-link').forEach(l => { if (l.textContent.includes(getPageLabel(page))) l.classList.add('active'); });
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
        function getPageLabel(page) { const m = { 'feed':'الرئيسية','profile':'ملفي الشخصي','connections':'الروابط','bookmarks':'المحفوظات','articles':'مقالاتي','events':'الفعاليات','certificates':'الشهادات','notifications':'الإشعارات','messages':'الرسائل','settings':'الإعدادات','following':'أتابع','audio-spaces':'المساحات الصوتية','trending':'المواضيع الرائجة' }; return m[page] || ''; }
        function doSearch() { const q = document.getElementById('searchInput').value.trim(); if (q) showToast('بحث عن: ' + q); }

        // ===== Mobile Menu =====
        function openMobileMenu() { document.getElementById('mobileMenuOverlay').classList.add('open'); document.body.style.overflow = 'hidden'; }
        function closeMobileMenu() { document.getElementById('mobileMenuOverlay').classList.remove('open'); document.body.style.overflow = ''; }
        (function(){let sx=0,sy=0,cx=0,cy=0,drag=false,dt=null,mv=false;const E=50,OT=40,CT=50,DZ=15;const ov=()=>document.getElementById('mobileMenuOverlay'),dr=()=>document.getElementById('mobileDrawer');const io=()=>ov()?.classList.contains('open'),im=()=>window.innerWidth<1024;document.addEventListener('touchstart',function(e){if(!im())return;const t=e.touches[0];sx=t.clientX;sy=t.clientY;cx=sx;cy=sy;mv=false;if(!io()&&sx>window.innerWidth-E){drag=true;dt='open';dr().style.transition='none'}else if(io()){drag=true;dt='close';dr().style.transition='none'}},{passive:true});document.addEventListener('touchmove',function(e){if(!drag||!im())return;const t=e.touches[0];cx=t.clientX;cy=t.clientY;mv=true;const dx=cx-sx,dy=Math.abs(cy-sy);if(dt==='open'&&dy>Math.abs(dx)&&dy>DZ){drag=false;dr().style.transition='';ov().style.opacity='';ov().style.visibility='';return}if(dt==='open'&&dx<0){const w=dr().offsetWidth||280;dr().style.transform=`translateX(${Math.max(0,w+dx)}px)`;const p=Math.min(1,Math.abs(dx)/w);ov().style.opacity=String(p*0.5);if(p>0.02)ov().style.visibility='visible'}else if(dt==='close'&&dx>0){const w=dr().offsetWidth||280;dr().style.transform=`translateX(${dx}px)`;const p=Math.min(1,dx/w);ov().style.opacity=String(0.5-p*0.5)}},{passive:true});document.addEventListener('touchend',function(){if(!drag||!im())return;dr().style.transition='';ov().style.opacity='';ov().style.visibility='';const dx=cx-sx;if(dt==='open'){if(mv&&dx<-OT)openMobileMenu();else{dr().style.transform='';ov().style.visibility='hidden'}}else if(dt==='close'){if(mv&&dx>CT)closeMobileMenu();else openMobileMenu()}drag=false;dt=null},{passive:true})})();

        // ===== Post Input =====
        function handlePostInput(el) { el.style.color = el.textContent.trim() === '' ? '' : '#fff'; }
        const postInput = document.getElementById('postInput');
        if (postInput) { const s = document.createElement('style'); s.textContent = `#postInput:empty::before { content: attr(data-placeholder); color: #525252; pointer-events: none; }`; document.head.appendChild(s); }

        // ===== Profile =====
        const defaultProfile = { name:'د. أحمد الخالدي', username:'@ahmed_alkhalidi', title:'محامي دولي', bio:'محامي دولي متخصص في التحكيم التجاري وقانون الشركات. خبرة +15 عاماً في القضايا المعقدة عابرة الحدود.', location:'دبي، الإمارات', website:'ahmed-law.com' };
        function getProfile() { const s = localStorage.getItem('userProfile'); return s ? JSON.parse(s) : { ...defaultProfile }; }
        function applyProfile(p) {
            const pn=document.querySelector('#page-profile .text-xl.font-bold'); if(pn)pn.textContent=p.name;
            const ps=document.querySelector('#page-profile .text-dark-400.text-sm.mb-3'); if(ps)ps.textContent=p.username+' • '+p.title+' • الإمارات 🇦🇪';
            const pb=document.querySelector('#page-profile .text-dark-300.text-sm.mb-4'); if(pb)pb.textContent=p.bio;
            const pl=document.querySelector('#page-profile .flex.flex-wrap.gap-4 span:first-child'); if(pl)pl.innerHTML='<span class="iconify" data-icon="lucide:map-pin" style="font-size:14px"></span>'+p.location;
            const pw=document.querySelector('#page-profile .text-brand-400.cursor-pointer'); if(pw)pw.textContent=p.website;
            const sn=document.querySelector('.desktop-sidebar .font-semibold.text-sm'); if(sn)sn.textContent=p.name;
            const dn=document.querySelector('#mobileDrawer h3'); if(dn)dn.textContent=p.name;
        }
        function loadProfile() { const s=localStorage.getItem('userProfile'); if(s)applyProfile(JSON.parse(s)); }
        function openEditProfile() { const p=getProfile(); document.getElementById('editName').value=p.name; document.getElementById('editUsername').value=p.username; document.getElementById('editTitle').value=p.title; document.getElementById('editBio').value=p.bio; document.getElementById('editLocation').value=p.location; document.getElementById('editWebsite').value=p.website; document.getElementById('editProfileModal').classList.add('active'); document.body.style.overflow='hidden'; }
        function closeEditProfile(e) { if(e&&e.target!==e.currentTarget)return; document.getElementById('editProfileModal').classList.remove('active'); document.body.style.overflow=''; }
        function saveProfile() { const p={name:document.getElementById('editName').value.trim()||defaultProfile.name,username:document.getElementById('editUsername').value.trim()||defaultProfile.username,title:document.getElementById('editTitle').value.trim()||defaultProfile.title,bio:document.getElementById('editBio').value.trim()||defaultProfile.bio,location:document.getElementById('editLocation').value.trim()||defaultProfile.location,website:document.getElementById('editWebsite').value.trim()||defaultProfile.website}; localStorage.setItem('userProfile',JSON.stringify(p)); applyProfile(p); closeEditProfile(); showToast('تم حفظ الملف الشخصي ✓'); }

        // ====================================================
        // ===== STICKER DATA ================================
        // ====================================================
        const stickerCategories = {
            smileys: { label: '😀', stickers: ['😀','😂','🤣','😊','😍','🥰','😘','😎','🤔','😤','😭','😱','🥺','😏','🙄','😴','🤯','🥳','😇','🤩','😡','🤗','😈','💀','👻','🤡','💩','🤖','👽','💀'] },
            gestures: { label: '👍', stickers: ['👍','👎','👏','🙌','🤝','✌️','🤞','🤟','🤘','👌','🤌','💪','🫶','👋','✋','🖐️','☝️','👆','👇','👈','👉','🫵','✊','👊','🤛','🤜','🫰','🤏','👐','🤲'] },
            hearts: { label: '❤️', stickers: ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❤️‍🔥','❤️‍🩹','💕','💞','💓','💗','💖','💘','💝','💟','♥️','🫀','❣️','❤️‍🩹','💕'] },
            law: { label: '⚖️', stickers: ['⚖️','🏛️','📜','📋','✅','❌','🔴','🟢','🟡','⚡','🔥','💡','🎯','📌','📎','🖊️','📝','📚','🎓','💼','🔒','🔓','🛡️','⚔️','🏆','🎉','🎊','💪','🤝','✅'] },
            nature: { label: '🌍', stickers: ['🌍','🌎','🌏','🌞','🌝','🌛','🌜','⭐','🌟','💫','✨','🌈','☀️','🌤️','⛅','🌥️','☁️','🌧️','⛈️','🌩️','🌪️','❄️','☃️','⛄','🌊','🔥','💧','🌺','🌸','🌹'] },
            food: { label: '🍕', stickers: ['🍕','🍔','🍟','🌭','🍿','🧁','🍰','🎂','🍩','🍪','☕','🍵','🥤','🍺','🍷','🥂','🍾','🧃','🫖','🍸','🍹','🧉','🥄','🍴','🥢','🍽️','🧂','🌶️','🫑','🥑'] }
        };
        let currentStickerCategory = 'smileys';
        let currentStickerTarget = null;

        function toggleStickerPicker(target) {
            const picker = document.getElementById('stickerPicker-' + target);
            if (!picker) return;
            if (picker.classList.contains('open')) { picker.classList.remove('open'); return; }
            // Close all other pickers
            document.querySelectorAll('.sticker-picker.open').forEach(p => p.classList.remove('open'));
            currentStickerTarget = target;
            renderStickerPicker(picker);
            picker.classList.add('open');
        }

        function renderStickerPicker(container) {
            const cat = stickerCategories[currentStickerCategory];
            container.innerHTML = `
                <div class="sticker-tabs">
                    ${Object.entries(stickerCategories).map(([key, val]) =>
                        `<button class="sticker-tab${key === currentStickerCategory ? ' active' : ''}" onclick="currentStickerCategory='${key}';renderStickerPicker(this.closest('.sticker-picker'))">${val.label}</button>`
                    ).join('')}
                </div>
                <div class="sticker-grid">
                    ${cat.stickers.map(s => `<button class="sticker-btn" onclick="insertSticker('${s}')">${s}</button>`).join('')}
                </div>
            `;
        }

        function insertSticker(sticker) {
            // Find the active comment input for the current target
            let input = null;
            if (currentStickerTarget === 'detail') {
                input = document.getElementById('detailCommentInput');
            } else {
                // Find the comment input in the post's comment section
                const section = document.getElementById('comments-' + currentStickerTarget);
                if (section) input = section.querySelector('.comment-input');
            }
            if (input) {
                input.value += sticker;
                input.focus();
            }
            // Close picker
            document.querySelectorAll('.sticker-picker.open').forEach(p => p.classList.remove('open'));
        }

        // Close sticker pickers on outside click
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.sticker-picker') && !e.target.closest('[onclick*="toggleStickerPicker"]')) {
                document.querySelectorAll('.sticker-picker.open').forEach(p => p.classList.remove('open'));
            }
        });

        // ====================================================
        // ===== MEDIA UPLOAD SYSTEM ==========================
        // ====================================================
        let pendingMedia = []; // { type: 'image'|'video'|'pdf', data: base64, name: string }

        function triggerMediaUpload() {
            const input = document.getElementById('postMediaInput');
            if (input) input.click();
        }

        function handleMediaUpload(input) {
            const files = Array.from(input.files);
            const remaining = 4 - pendingMedia.length;
            if (remaining <= 0) { showToast('الحد الأقصى 4 ملفات'); input.value = ''; return; }
            const toAdd = files.slice(0, remaining);
            toAdd.forEach(file => {
                if (file.size > 10 * 1024 * 1024) { showToast('حجم الملف كبير (max 10MB)'); return; }
                const reader = new FileReader();
                reader.onload = function(e) {
                    let type = 'image';
                    if (file.type.startsWith('video/')) type = 'video';
                    else if (file.type === 'application/pdf') type = 'pdf';
                    pendingMedia.push({ type, data: e.target.result, name: file.name });
                    renderMediaPreview();
                };
                reader.readAsDataURL(file);
            });
            input.value = '';
        }

        function removeMedia(index) {
            pendingMedia.splice(index, 1);
            renderMediaPreview();
        }

        function renderMediaPreview() {
            const container = document.getElementById('postMediaPreview');
            if (!container) return;
            if (pendingMedia.length === 0) { container.innerHTML = ''; return; }
            const gridClass = 'grid-' + Math.min(pendingMedia.length, 4);
            container.innerHTML = `<div class="media-preview-grid ${gridClass}">${pendingMedia.map((m, i) => {
                if (m.type === 'image') return `<div class="media-item"><img src="${m.data}" alt=""><div class="remove-media" onclick="removeMedia(${i})"><span class="iconify text-white text-sm" data-icon="lucide:x"></span></div></div>`;
                if (m.type === 'video') return `<div class="media-item"><video src="${m.data}" muted></video><div class="remove-media" onclick="removeMedia(${i})"><span class="iconify text-white text-sm" data-icon="lucide:x"></span></div></div>`;
                return `<div class="media-item"><div class="pdf-preview"><div class="pdf-icon"><span class="iconify text-white text-lg" data-icon="lucide:file-text"></span></div><span class="text-xs text-dark-300 truncate">${m.name}</span></div><div class="remove-media" onclick="removeMedia(${i})"><span class="iconify text-white text-sm" data-icon="lucide:x"></span></div></div>`;
            }).join('')}</div>`;
        }

        function renderMediaInPost(media) {
            if (!media || media.length === 0) return '';
            const gridClass = 'grid-' + Math.min(media.length, 4);
            return `<div class="mx-5 mb-4 media-grid ${gridClass}" style="max-height:350px">${media.map(m => {
                if (m.type === 'image') return `<div class="media-item"><img src="${m.data}" alt=""></div>`;
                if (m.type === 'video') return `<div class="media-item"><video src="${m.data}" controls muted></video></div>`;
                return `<div class="media-item"><div class="pdf-preview"><div class="pdf-icon"><span class="iconify text-white text-lg" data-icon="lucide:file-text"></span></div><span class="text-xs text-dark-300 truncate">${m.name||'document.pdf'}</span></div></div>`;
            }).join('')}</div>`;
        }

        // ====================================================
        // ===== POST DATA STORE ==============================
        // ====================================================
        let userPostCounter = parseInt(localStorage.getItem('userPostCounter') || '0');
        let userPosts = JSON.parse(localStorage.getItem('userPosts') || '[]');
        let userReplies = JSON.parse(localStorage.getItem('userReplies') || '[]');
        let userLikes = JSON.parse(localStorage.getItem('userLikes') || '[]');
        let platformComments = JSON.parse(localStorage.getItem('platformComments') || '{}'); // { postId: [comments] }

        function saveUserPosts() { localStorage.setItem('userPosts', JSON.stringify(userPosts)); localStorage.setItem('userPostCounter', String(userPostCounter)); }
        function saveUserReplies() { localStorage.setItem('userReplies', JSON.stringify(userReplies)); }
        function saveUserLikes() { localStorage.setItem('userLikes', JSON.stringify(userLikes)); }
        function savePlatformComments() { localStorage.setItem('platformComments', JSON.stringify(platformComments)); }

        function isLiked(postId) { return userLikes.some(p => p.id === postId); }
        function isReposted(postId) { return userPosts.some(p => p.repostOf === postId); }
        function isOwnPost(postId) { return userPosts.some(p => p.id === postId); }

        function getPostComments(postId) { return platformComments[postId] || []; }
        function addCommentToPost(postId, comment) {
            if (!platformComments[postId]) platformComments[postId] = [];
            platformComments[postId].push(comment);
            savePlatformComments();
        }

        // ====================================================
        // ===== EDIT / DELETE POST ===========================
        // ====================================================
        function openEditPost(postId) {
            const post = userPosts.find(p => p.id === postId);
            if (!post) return;
            document.getElementById('editPostText').value = post.text || '';
            document.getElementById('editPostId').value = postId;
            // Show media preview if exists
            const preview = document.getElementById('editPostMediaPreview');
            if (post.media && post.media.length > 0) {
                preview.innerHTML = `<p class="text-xs text-dark-400 mb-2">الوسائط الحالية:</p><div class="flex gap-2">${post.media.map(m =>
                    m.type === 'image' ? `<img src="${m.data}" class="w-16 h-16 rounded-lg object-cover">` :
                    m.type === 'video' ? `<div class="w-16 h-16 rounded-lg bg-dark-800 flex items-center justify-center"><span class="iconify text-dark-400" data-icon="lucide:video"></span></div>` :
                    `<div class="w-16 h-16 rounded-lg bg-dark-800 flex items-center justify-center"><span class="iconify text-dark-400" data-icon="lucide:file-text"></span></div>`
                ).join('')}</div>`;
            } else { preview.innerHTML = ''; }
            document.getElementById('editPostModal').classList.add('active');
            document.body.style.overflow = 'hidden';
            closeAllMenus();
        }

        function closeEditPostModal(e) { if(e&&e.target!==e.currentTarget)return; document.getElementById('editPostModal').classList.remove('active'); document.body.style.overflow=''; }

        function saveEditPost() {
            const postId = document.getElementById('editPostId').value;
            const newText = document.getElementById('editPostText').value.trim();
            if (!newText) { showToast('المنشور فارغ'); return; }
            const post = userPosts.find(p => p.id === postId);
            if (!post) return;
            const displayText = newText.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
            const hashtagRegex = /#[\u0600-\u06FFa-zA-Z0-9_]+/g;
            post.text = newText;
            post.displayText = displayText;
            post.tags = newText.match(hashtagRegex) || [];
            post.edited = true;
            saveUserPosts();
            closeEditPostModal();
            renderProfilePosts();
            renderFeedPosts();
            showToast('تم تعديل المنشور ✓');
        }

        function deletePost(postId) {
            if (!confirm('هل أنت متأكد من حذف هذا المنشور؟')) return;
            userPosts = userPosts.filter(p => p.id !== postId);
            saveUserPosts();
            closeAllMenus();
            renderProfilePosts();
            renderFeedPosts();
            showToast('تم حذف المنشور ✓');
        }

        function closeAllMenus() {
            document.querySelectorAll('.post-options-menu.open').forEach(m => m.classList.remove('open'));
        }

        // Close menus on outside click
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.post-options-btn') && !e.target.closest('.post-options-menu')) {
                closeAllMenus();
            }
        });

        // ====================================================
        // ===== POST DETAIL MODAL ===========================
        // ====================================================
        let currentDetailPostId = null;

        function openPostDetail(postId) {
            currentDetailPostId = postId;
            const container = document.getElementById('postDetailContent');
            const post = findPostById(postId);
            if (!post) return;

            const profile = getProfile();
            const isOwn = isOwnPost(postId);
            const comments = getPostComments(postId);
            const mediaHTML = post.media ? renderMediaInPost(post.media) : '';

            const authorAvatar = isOwn ? `<img src="https://picsum.photos/seed/lawyer-me/80/80.jpg" class="w-11 h-11 rounded-xl object-cover border border-dark-700" alt="">` :
                `<div class="w-11 h-11 rounded-xl bg-gradient-to-br ${post.gradient || 'from-blue-500 to-purple-600'} flex items-center justify-center text-white font-bold border border-dark-700 shrink-0">${(post.author || '').charAt(0)}</div>`;
            const authorName = isOwn ? profile.name : (post.author || 'مستخدم');
            const authorRole = isOwn ? profile.title : (post.role || '');
            const verified = isOwn || post.verified ? '<span class="iconify text-brand-500 text-sm" data-icon="lucide:badge-check"></span>' : '';

            const tagsHTML = (post.tags || []).map(t => {
                const colors = ['brand','blue','purple','green','cyan','pink','yellow'];
                const c = colors[Math.abs(t.charCodeAt(1)) % colors.length];
                return `<span class="hashtag bg-${c}-500/10 text-${c}-400 text-xs font-medium px-3 py-1 rounded-full">${t}</span>`;
            }).join('');

            const commentsHTML = comments.map(c => `
                <div class="flex gap-3 px-4 py-3">
                    <img src="${c.avatar || 'https://picsum.photos/seed/default/40/40.jpg'}" class="w-9 h-9 rounded-lg object-cover shrink-0" alt="">
                    <div class="flex-1">
                        <div class="flex items-center gap-2 mb-1">
                            <span class="text-xs font-semibold">${c.author}</span>
                            <span class="text-[10px] text-dark-500">${c.time}</span>
                        </div>
                        ${c.isSticker ? `<div class="comment-sticker">${c.text}</div>` : `<p class="text-sm text-dark-200 leading-relaxed">${c.text}</p>`}
                        <div class="flex items-center gap-4 mt-1.5">
                            <span class="text-[10px] text-dark-500 cursor-pointer hover:text-brand-400">إعجاب</span>
                            <span class="text-[10px] text-dark-500 cursor-pointer hover:text-brand-400">رد</span>
                            <span class="share-comment-btn" onclick='shareCommentAsPost(\"${postId}\", ${JSON.stringify(c).replace(/'/g, "\\'").replace(/"/g, '&quot;')})'>مشاركة</span>
                        </div>
                    </div>
                </div>
            `).join('');

            container.innerHTML = `
                <div class="p-5">
                    <div class="flex items-start gap-3 mb-4">
                        ${authorAvatar}
                        <div>
                            <div class="flex items-center gap-2">
                                <h3 class="font-semibold text-sm">${authorName}</h3>
                                ${verified}
                            </div>
                            <p class="text-dark-400 text-xs">${authorRole} • ${post.time || 'الآن'}${post.edited ? ' • تم التعديل' : ''}</p>
                        </div>
                    </div>
                    ${post.title ? `<h2 class="font-bold text-base mb-2">${post.title}</h2>` : ''}
                    <p class="text-dark-200 text-sm leading-relaxed mb-3">${post.displayText || post.content || ''}</p>
                    ${post.tags && post.tags.length > 0 ? `<div class="flex flex-wrap gap-2 mb-3">${tagsHTML}</div>` : ''}
                    ${mediaHTML}
                    <div class="flex items-center justify-between text-dark-400 text-xs mt-4 pt-3 border-t border-dark-800/50">
                        <span>${post.likes || 0} إعجاب</span>
                        <span>${comments.length} تعليق</span>
                        <span>${post.shares || 0} مشاركة</span>
                    </div>
                </div>
                <div class="border-t border-dark-800/50">
                    <div class="px-4 py-3 flex items-center justify-around">
                        <button class="like-btn${isLiked(postId)?' liked':''} flex items-center gap-2 px-4 py-2 rounded-xl hover:bg-dark-800/50 transition-all group" onclick="toggleLike(this,${post.likes||0},'detail-likes','${postId}',null);openPostDetail('${postId}')">
                            <span class="iconify text-lg ${isLiked(postId)?'text-red-400':'text-dark-400'} group-hover:text-red-400" data-icon="lucide:heart"></span>
                            <span class="text-sm ${isLiked(postId)?'text-red-400':'text-dark-400'} like-count">${post.likes||0}</span>
                        </button>
                        <button class="flex items-center gap-2 px-4 py-2 rounded-xl hover:bg-dark-800/50 transition-all group">
                            <span class="iconify text-lg text-dark-400 group-hover:text-blue-400" data-icon="lucide:message-circle"></span>
                            <span class="text-sm text-dark-400">${comments.length}</span>
                        </button>
                        <button class="repost-btn${isReposted(postId)?' reposted':''} flex items-center gap-2 px-4 py-2 rounded-xl hover:bg-dark-800/50 transition-all group" onclick="toggleRepost('${postId}',this,null);openPostDetail('${postId}')">
                            <span class="iconify text-lg ${isReposted(postId)?'text-green-400':'text-dark-400'} group-hover:text-green-400" data-icon="lucide:repeat-2"></span>
                            <span class="text-sm ${isReposted(postId)?'text-green-400':'text-dark-400'}">${post.shares||0}</span>
                        </button>
                    </div>
                </div>
                <div class="border-t border-dark-800/50">
                    <div class="divide-y divide-dark-800/30">
                        ${commentsHTML || '<p class="text-center text-dark-500 text-xs py-6">لا توجد تعليقات بعد</p>'}
                    </div>
                </div>
            `;

            document.getElementById('postDetailModal').classList.add('active');
            document.body.style.overflow = 'hidden';
        }

        function closePostDetail(e) {
            if(e&&e.target!==e.currentTarget)return;
            document.getElementById('postDetailModal').classList.remove('active');
            document.body.style.overflow='';
            currentDetailPostId = null;
        }

        function submitDetailComment() {
            const input = document.getElementById('detailCommentInput');
            const text = input.value.trim();
            if (!text || !currentDetailPostId) return;

            const profile = getProfile();
            const isStickerOnly = /^[\p{Emoji}\s]+$/u.test(text) && text.length <= 10;
            const comment = {
                id: 'comment-' + Date.now(),
                author: profile.name,
                avatar: 'https://picsum.photos/seed/lawyer-me/40/40.jpg',
                text: text,
                isSticker: isStickerOnly,
                time: 'الآن'
            };

            addCommentToPost(currentDetailPostId, comment);

            // Save as user reply
            const post = findPostById(currentDetailPostId);
            userReplies.unshift({
                id: comment.id,
                postId: currentDetailPostId,
                parentAuthor: post ? (post.author || profile.name) : 'مستخدم',
                parentContent: (post ? (post.title || post.content || post.displayText || '') : '').substring(0, 80) + '...',
                replyText: text,
                time: 'الآن',
                isSticker: isStickerOnly
            });
            saveUserReplies();

            input.value = '';
            openPostDetail(currentDetailPostId); // Refresh
            showToast('تم إرسال التعليق ✓');
        }

        function findPostById(postId) {
            // Check user posts first
            let post = userPosts.find(p => p.id === postId);
            if (post) return post;
            // Check platform posts
            post = allPosts.find(p => p.id === postId);
            return post || null;
        }

        function shareCommentAsPost(postId, commentOrId) {
            let c;
            if (typeof commentOrId === 'object') {
                c = commentOrId;
            } else if (typeof commentOrId === 'string' && commentOrId.startsWith('{')) {
                c = JSON.parse(commentOrId);
            } else {
                // Look up by ID from platformComments
                const comments = platformComments[postId] || [];
                c = comments.find(x => x.id === commentOrId);
                if (!c) { showToast('التعليق غير موجود'); return; }
            }
            userPostCounter++;
            const repostId = 'user-' + userPostCounter;
            userPosts.unshift({
                id: repostId, text: c.text, displayText: c.text.replace(/</g,'&lt;').replace(/>/g,'&gt;'),
                tags: [], time: 'الآن', likes: 0, comments: 0, shares: 0, isRepost: false, commentList: [],
                sharedComment: { from: c.author, originalPostId: postId }
            });
            saveUserPosts();
            closePostDetail();
            renderFeedPosts();
            renderProfilePosts();
            showToast('تم نشر التعليق كمنشور ✓');
        }

        // ====================================================
        // ===== LIKE / REPOST / BOOKMARK =====================
        // ====================================================
        function toggleLike(btn, count, likesId, postId, articleEl) {
            const isNowLiked = btn.classList.toggle('liked');
            const countEl = btn.querySelector('.like-count');
            const icon = btn.querySelector('.iconify');
            const likesEl = likesId ? document.getElementById(likesId) : null;

            if (isNowLiked) {
                const nc = count + 1;
                countEl.textContent = nc; icon.style.color = '#ef4444'; countEl.style.color = '#ef4444';
                if (likesEl) likesEl.textContent = nc + ' إعجاب';
                btn.style.transform = 'scale(1.15)'; setTimeout(() => btn.style.transform = '', 200);
                const pd = extractPostDataFromDOM(articleEl, postId);
                if (pd && !isLiked(postId)) { userLikes.unshift(pd); saveUserLikes(); }
            } else {
                countEl.textContent = count; icon.style.color = ''; countEl.style.color = '';
                if (likesEl) likesEl.textContent = count + ' إعجاب';
                userLikes = userLikes.filter(p => p.id !== postId); saveUserLikes();
            }
        }

        function extractPostDataFromDOM(articleEl, postId) {
            if (!articleEl) return { id: postId, author: 'مستخدم', displayText: '', tags: [], likes: 0, comments: 0, shares: 0, time: 'منذ قليل', gradient: 'from-blue-500 to-purple-600' };
            const ae = articleEl.querySelector('.font-semibold.text-sm');
            const re = articleEl.querySelector('.text-dark-400.text-xs');
            const ce = articleEl.querySelector('.text-dark-200.text-sm');
            const te = articleEl.querySelector('.font-bold.text-base');
            return {
                id: postId, author: ae ? ae.textContent.trim() : 'مستخدم',
                role: re ? re.textContent.replace(/•.*/, '').trim() : '',
                content: ce ? ce.innerHTML : '', displayText: ce ? ce.innerHTML : '',
                title: te ? te.textContent.trim() : '',
                tags: Array.from(articleEl.querySelectorAll('.hashtag')).map(t => t.textContent.trim()),
                likes: parseInt(articleEl.querySelector('.like-count')?.textContent || '0'),
                comments: 0, shares: 0, time: 'منذ قليل',
                gradient: 'from-blue-500 to-purple-600'
            };
        }

        function toggleRepost(postId, btn, articleEl) {
            if (isReposted(postId)) {
                userPosts = userPosts.filter(p => p.repostOf !== postId); saveUserPosts();
                btn.classList.remove('reposted');
                const icon = btn.querySelector('.iconify'); const countEl = btn.querySelector('.text-sm');
                icon.style.color = ''; countEl.style.color = '';
                const sc = parseInt(countEl.textContent) || 0; countEl.textContent = Math.max(0, sc - 1);
                showToast('تم إلغاء إعادة النشر');
            } else {
                const pd = extractPostDataFromDOM(articleEl, postId);
                userPostCounter++;
                userPosts.unshift({ id: 'repost-' + userPostCounter, repostOf: postId, originalAuthor: pd.author, text: pd.content, displayText: pd.displayText, tags: pd.tags, title: pd.title, time: 'الآن', likes: 0, comments: 0, shares: 0, isRepost: true });
                saveUserPosts();
                btn.classList.add('reposted');
                const icon = btn.querySelector('.iconify'); const countEl = btn.querySelector('.text-sm');
                icon.style.color = '#22c55e'; countEl.style.color = '#22c55e';
                const sc = parseInt(countEl.textContent) || 0; countEl.textContent = sc + 1;
                btn.style.transform = 'scale(1.15)'; setTimeout(() => btn.style.transform = '', 200);
                showToast('تم إعادة النشر إلى ملفك ✓');
            }
        }

        function toggleBookmark(btn) {
            const isSaved = btn.classList.toggle('saved');
            const icon = btn.querySelector('.iconify');
            if (isSaved) { icon.setAttribute('data-icon','lucide:bookmark-check'); icon.style.color='#f97316'; showToast('تم الحفظ ✓'); }
            else { icon.setAttribute('data-icon','lucide:bookmark'); icon.style.color=''; showToast('تم إلغاء الحفظ'); }
        }

        // ===== Comment Submit (from post card) =====
        function submitComment(inputEl, postId) {
            const text = inputEl.value.trim();
            if (!text) return;
            const profile = getProfile();
            const isStickerOnly = /^[\p{Emoji}\s]+$/u.test(text) && text.length <= 10;
            const comment = { id: 'comment-' + Date.now(), author: profile.name, avatar: 'https://picsum.photos/seed/lawyer-me/40/40.jpg', text, isSticker: isStickerOnly, time: 'الآن' };
            addCommentToPost(postId, comment);

            // Save as reply
            const post = findPostById(postId);
            userReplies.unshift({ id: comment.id, postId, parentAuthor: post ? (post.author || profile.name) : 'مستخدم', parentContent: (post ? (post.title || post.content || post.displayText || '') : '').substring(0, 80) + '...', replyText: text, time: 'الآن', isSticker: isStickerOnly });
            saveUserReplies();

            // Add to DOM
            const section = document.getElementById('comments-' + postId);
            if (section) {
                section.classList.add('open');
                const area = section.querySelector('.space-y-3');
                const div = document.createElement('div'); div.className = 'flex gap-3';
                div.innerHTML = `<img src="https://picsum.photos/seed/lawyer-me/40/40.jpg" class="w-8 h-8 rounded-lg object-cover shrink-0" alt=""><div class="flex-1 bg-dark-850 rounded-xl px-3 py-2"><p class="text-xs font-semibold mb-1">${profile.name}</p>${isStickerOnly ? `<div class="comment-sticker-sm">${text}</div>` : `<p class="text-xs text-dark-300">${text.replace(/</g,'&lt;')}</p>`}<p class="text-[10px] text-dark-500 mt-1">الآن • <span class="cursor-pointer hover:text-brand-400">إعجاب</span> • <span class="cursor-pointer hover:text-brand-400">رد</span> • <span class="share-comment-btn" onclick="shareCommentAsPost('${postId}',comment.id)">مشاركة</span></p></div>`;
                area.insertBefore(div, area.lastElementChild);
            }
            inputEl.value = '';
            showToast('تم إرسال التعليق ✓');
        }

        // ===== Tabs =====
        function switchTab(btn) { document.querySelectorAll('.feed-tab').forEach(t=>{t.classList.remove('active','bg-dark-800','text-white');t.classList.add('text-dark-400')}); btn.classList.add('active','bg-dark-800','text-white');btn.classList.remove('text-dark-400'); }
        function switchProfileTab(btn) { document.querySelectorAll('.profile-tab').forEach(t=>{t.classList.remove('active','bg-dark-800','text-white');t.classList.add('text-dark-400')}); btn.classList.add('active','bg-dark-800','text-white');btn.classList.remove('text-dark-400'); const tn=btn.textContent.trim(); if(tn==='المنشورات')renderProfilePosts(); else if(tn==='الردود')renderProfileReplies(); else if(tn==='الإعجابات')renderProfileLikes(); }
        function switchConnTab(btn) { document.querySelectorAll('.conn-tab').forEach(t=>{t.classList.remove('active','bg-dark-800','text-white');t.classList.add('text-dark-400')}); btn.classList.add('active','bg-dark-800','text-white');btn.classList.remove('text-dark-400'); }
        function switchBottomNav(btn) { document.querySelectorAll('.bottom-nav-item').forEach(b=>{b.classList.remove('active');b.classList.add('text-dark-400')}); btn.classList.add('active');btn.classList.remove('text-dark-400'); }

        // ===== Modals =====
        function showShareModal() { document.getElementById('shareModal').classList.add('active'); }
        function closeShareModal(e) { if(e&&e.target!==e.currentTarget)return; document.getElementById('shareModal').classList.remove('active'); }
        function showPostModal() { document.getElementById('postModal').classList.add('active'); document.body.style.overflow='hidden'; setTimeout(()=>document.getElementById('modalPostText')?.focus(),300); }
        function closePostModal(e) { if(e&&e.target!==e.currentTarget)return; document.getElementById('postModal').classList.remove('active'); document.body.style.overflow=''; }
        function showPostMenu(btn) { document.getElementById('postMenuModal').classList.add('active'); }
        function closePostMenuModal(e) { if(e&&e.target!==e.currentTarget)return; document.getElementById('postMenuModal').classList.remove('active'); }

        // ===== Toggle Comments =====
        function toggleComments(postId) { const s = document.getElementById('comments-' + postId); if (s) s.classList.toggle('open'); }

        // ===== Publish Post =====
        function publishPost() { const i=document.getElementById('postInput'); const t=i.textContent.trim(); if(!t&&!pendingMedia.length){showToast('اكتب شيئاً قبل النشر');return;} addPostToFeed(t); i.textContent=''; i.style.color=''; showToast('تم نشر المنشور بنجاح ✓'); }
        function publishModalPost() { const t=document.getElementById('modalPostText'); const v=t.value.trim(); if(!v&&!pendingMedia.length){showToast('اكتب شيئاً قبل النشر');return;} addPostToFeed(v); t.value=''; closePostModal(); showToast('تم نشر المنشور بنجاح ✓'); }

        function addPostToFeed(text) {
            userPostCounter++;
            const postId = 'user-' + userPostCounter;
            const profile = getProfile();
            const timeStr = 'الآن';
            const hashtagRegex = /#[\u0600-\u06FFa-zA-Z0-9_]+/g;
            const tags = text ? (text.match(hashtagRegex) || []) : [];
            const displayText = text ? text.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>') : '';
            const mediaCopy = [...pendingMedia];
            pendingMedia = [];
            renderMediaPreview();

            const post = { id: postId, text, displayText, tags, time: timeStr, likes: 0, comments: 0, shares: 0, isRepost: false, commentList: [], media: mediaCopy, edited: false };
            userPosts.unshift(post);
            saveUserPosts();

            // Add to feed DOM
            const article = document.createElement('article');
            article.className = 'post-card bg-dark-900/80 border border-dark-800/50 rounded-2xl mb-5 transition-all duration-300 animate-fade-in-up overflow-hidden';
            article.innerHTML = buildOwnPostHTML(post);
            const fp = document.getElementById('page-feed');
            const first = fp.querySelector('.post-card, .dynamic-post');
            const loader = document.getElementById('infiniteLoader');
            if (first) fp.insertBefore(article, first); else fp.insertBefore(article, loader);
            article.scrollIntoView({ behavior: 'smooth', block: 'center' });

            // Sync to Supabase in background
            if (sbOnline && sbUser) {
                SB.createPost(text, '', tags).then(result => {
                    if (result) {
                        // Update local post with Supabase ID for future sync
                        post.sbId = result.id;
                        saveUserPosts();
                    }
                }).catch(() => {});
            }
        }

        // ====================================================
        // ===== BUILD POST HTML ==============================
        // ====================================================
        function buildOwnPostHTML(post) {
            const profile = getProfile();
            const tagsHTML = (post.tags||[]).map(t => { const colors=['brand','blue','purple','green','cyan','pink','yellow']; const c=colors[Math.abs(t.charCodeAt(1))%colors.length]; return `<span class="hashtag bg-${c}-500/10 text-${c}-400 text-xs font-medium px-3 py-1 rounded-full cursor-pointer transition-all" onclick="showToast('تصفية: ${t}')">${t}</span>`; }).join('');
            const mediaHTML = post.media ? renderMediaInPost(post.media) : '';
            const editedTag = post.edited ? '<span class="text-dark-500 text-[10px]"> • تم التعديل</span>' : '';
            const sharedBanner = post.sharedComment ? `<div class="flex items-center gap-2 px-5 pt-3 pb-0 text-dark-500 text-xs"><span class="iconify text-sm" data-icon="lucide:share-2"></span><span>مشاركة تعليق من ${post.sharedComment.from}</span></div>` : '';
            const comments = getPostComments(post.id);

            return `
                ${sharedBanner}
                <div class="p-5 pb-0">
                    <div class="flex items-start justify-between mb-3">
                        <div class="flex items-center gap-3 cursor-pointer" onclick="showPage('profile')">
                            <img src="https://picsum.photos/seed/lawyer-me/80/80.jpg" class="w-11 h-11 rounded-xl object-cover border border-dark-700" alt="">
                            <div>
                                <div class="flex items-center gap-2"><h3 class="font-semibold text-sm">${profile.name}</h3><span class="iconify text-brand-500 text-sm" data-icon="lucide:badge-check"></span></div>
                                <p class="text-dark-400 text-xs">${profile.title} • ${post.time}${editedTag}</p>
                            </div>
                        </div>
                        <div class="relative post-options-btn">
                            <button class="p-2.5 rounded-xl hover:bg-dark-800/50 transition-all group" onclick="event.stopPropagation();this.nextElementSibling.classList.toggle('open')">
                                <span class="iconify text-lg text-dark-400 group-hover:text-dark-200 transition-colors" data-icon="lucide:more-horizontal"></span>
                            </button>
                            <div class="post-options-menu">
                                <button onclick="openEditPost('${post.id}')"><span class="iconify text-blue-400" data-icon="lucide:pencil" style="font-size:16px"></span>تعديل المنشور</button>
                                <button class="danger" onclick="deletePost('${post.id}')"><span class="iconify" data-icon="lucide:trash-2" style="font-size:16px"></span>حذف المنشور</button>
                            </div>
                        </div>
                    </div>
                    <div class="mb-3 cursor-pointer" onclick="openPostDetail('${post.id}')"><p class="text-dark-200 text-sm leading-relaxed">${post.displayText}</p></div>
                    ${post.tags&&post.tags.length>0?`<div class="flex flex-wrap gap-2 mb-4">${tagsHTML}</div>`:''}
                </div>
                ${mediaHTML}
                <div class="px-5 pb-2"><div class="flex items-center justify-between text-dark-400 text-xs mb-2"><span id="likes-${post.id}">${post.likes} إعجاب</span><span class="cursor-pointer hover:text-brand-400" onclick="openPostDetail('${post.id}')">${comments.length} تعليق • ${post.shares} مشاركة</span></div></div>
                <div class="border-t border-dark-800/50 px-2 py-1"><div class="flex items-center justify-around">
                    <button class="like-btn${isLiked(post.id)?' liked':''} flex items-center gap-2 px-4 py-2.5 rounded-xl hover:bg-dark-800/50 transition-all group" onclick="toggleLike(this,${post.likes},'likes-${post.id}','${post.id}',this.closest('article'))"><span class="iconify text-lg ${isLiked(post.id)?'text-red-400':'text-dark-400'} group-hover:text-red-400 transition-colors" data-icon="lucide:heart"></span><span class="text-sm ${isLiked(post.id)?'text-red-400':'text-dark-400'} group-hover:text-red-400 transition-colors like-count">${post.likes}</span></button>
                    <button class="flex items-center gap-2 px-4 py-2.5 rounded-xl hover:bg-dark-800/50 transition-all group" onclick="openPostDetail('${post.id}')"><span class="iconify text-lg text-dark-400 group-hover:text-blue-400 transition-colors" data-icon="lucide:message-circle"></span><span class="text-sm text-dark-400 group-hover:text-blue-400 transition-colors">${comments.length}</span></button>
                    <button class="repost-btn${isReposted(post.id)?' reposted':''} flex items-center gap-2 px-4 py-2.5 rounded-xl hover:bg-dark-800/50 transition-all group" onclick="toggleRepost('${post.id}',this,this.closest('article'))"><span class="iconify text-lg ${isReposted(post.id)?'text-green-400':'text-dark-400'} group-hover:text-green-400 transition-colors" data-icon="lucide:repeat-2"></span><span class="text-sm ${isReposted(post.id)?'text-green-400':'text-dark-400'} group-hover:text-green-400 transition-colors">${post.shares}</span></button>
                    <button class="bookmark-btn flex items-center gap-2 px-4 py-2.5 rounded-xl hover:bg-dark-800/50 transition-all group" onclick="toggleBookmark(this)"><span class="iconify text-lg text-dark-400 group-hover:text-brand-400 transition-colors" data-icon="lucide:bookmark"></span></button>
                </div></div>
                <div class="comment-section px-5 pb-4" id="comments-${post.id}"><div class="border-t border-dark-800/50 pt-3 space-y-3">
                    ${comments.map(c=>`<div class="flex gap-3"><img src="${c.avatar||'https://picsum.photos/seed/default/40/40.jpg'}" class="w-8 h-8 rounded-lg object-cover shrink-0" alt=""><div class="flex-1 bg-dark-850 rounded-xl px-3 py-2"><p class="text-xs font-semibold mb-1">${c.author}</p>${c.isSticker?`<div class="comment-sticker-sm">${c.text}</div>`:`<p class="text-xs text-dark-300">${c.text}</p>`}<p class="text-[10px] text-dark-500 mt-1">${c.time} • <span class="cursor-pointer hover:text-brand-400">إعجاب</span> • <span class="cursor-pointer hover:text-brand-400">رد</span> • <span class="share-comment-btn" onclick="shareCommentAsPost('${post.id}',c.id)">مشاركة</span></p></div></div>`).join('')}
                    <div class="flex gap-2 relative">
                        <button onclick="event.stopPropagation();toggleStickerPicker('${post.id}')" class="p-2 rounded-lg hover:bg-dark-800 transition-colors shrink-0"><span class="iconify text-dark-400 text-lg" data-icon="lucide:smile"></span></button>
                        <div id="stickerPicker-${post.id}" class="sticker-picker"></div>
                        <input type="text" placeholder="اكتب تعليقاً أو اختر ملصق..." class="comment-input flex-1 bg-dark-800 border border-dark-700/50 rounded-lg px-3 py-2 text-xs text-white placeholder-dark-400 focus:outline-none focus:border-brand-500/50 transition-all" onkeydown="if(event.key==='Enter'){submitComment(this,'${post.id}')}">
                        <button class="bg-brand-500 hover:bg-brand-600 text-white text-xs px-3 py-2 rounded-lg transition-all" onclick="submitComment(this.previousElementSibling,'${post.id}')"><span class="iconify text-sm" data-icon="lucide:send"></span></button>
                    </div>
                </div></div>
            `;
        }

        function buildPlatformPostHTML(post, index) {
            const vb = post.verified ? '<span class="iconify text-brand-500 text-sm" data-icon="lucide:badge-check"></span>' : '';
            const th = post.title ? `<h2 class="font-bold text-base mb-2 leading-relaxed">${post.title}</h2>` : '';
            const tagsHTML = post.tags.map(t => { const colors=['brand','blue','purple','green','cyan','pink','yellow']; const c=colors[Math.abs(t.charCodeAt(1))%colors.length]; return `<span class="hashtag bg-${c}-500/10 text-${c}-400 text-xs font-medium px-3 py-1 rounded-full cursor-pointer transition-all" onclick="showToast('تصفية: ${t}')">${t}</span>`; }).join('');
            const alreadyFollowing = isFollowing(post.author);
            const fb = `<button class="follow-btn${alreadyFollowing ? ' following' : ''} flex items-center gap-1.5 bg-dark-800 hover:bg-dark-700 text-xs font-semibold px-3 py-1.5 rounded-full border transition-all shrink-0" style="${alreadyFollowing ? 'color:#a3a3a3;border-color:#525252;' : 'color:#f97316;border-color:rgba(249,115,22,0.3);'}" data-author="${post.author}" onclick="toggleFollow(this)"><span class="iconify text-sm" data-icon="${alreadyFollowing ? 'lucide:check' : 'lucide:user-plus'}"></span><span class="follow-text">${alreadyFollowing ? 'يتابع' : 'متابعة'}</span><span class="unfollow-text">إلغاء</span></button>`;
            const comments = getPostComments(post.id);

            return `<article class="post-card bg-dark-900/80 border border-dark-800/50 rounded-2xl mb-5 transition-all duration-300 animate-fade-in-up overflow-hidden" style="animation-delay:${index*80}ms"><div class="p-5 pb-0"><div class="flex items-start justify-between mb-3"><div class="flex items-center gap-3"><div class="w-11 h-11 rounded-xl bg-gradient-to-br ${post.gradient} flex items-center justify-center text-white font-bold border border-dark-700 shrink-0">${post.avatar}</div><div><div class="flex items-center gap-2"><h3 class="font-semibold text-sm">${post.author}</h3>${vb}</div><p class="text-dark-400 text-xs">${post.role} • ${post.time}</p></div></div>${fb}</div><div class="mb-3 cursor-pointer" onclick="openPostDetail('${post.id}')">${th}<p class="text-dark-200 text-sm leading-relaxed">${post.content.replace(/\n/g,'<br>')}</p></div><div class="flex flex-wrap gap-2 mb-4">${tagsHTML}</div></div><div class="px-5 pb-2"><div class="flex items-center justify-between text-dark-400 text-xs mb-2"><span id="likes-inf-${index}">${post.likes} إعجاب</span><span class="cursor-pointer hover:text-brand-400" onclick="openPostDetail('${post.id}')">${comments.length} تعليق • ${post.shares} مشاركة</span></div></div><div class="border-t border-dark-800/50 px-2 py-1"><div class="flex items-center justify-around"><button class="like-btn${isLiked(post.id)?' liked':''} flex items-center gap-2 px-4 py-2.5 rounded-xl hover:bg-dark-800/50 transition-all group" onclick="toggleLike(this,${post.likes},'likes-inf-${index}','${post.id}',this.closest('article'))"><span class="iconify text-lg ${isLiked(post.id)?'text-red-400':'text-dark-400'} group-hover:text-red-400 transition-colors" data-icon="lucide:heart"></span><span class="text-sm ${isLiked(post.id)?'text-red-400':'text-dark-400'} group-hover:text-red-400 transition-colors like-count">${post.likes}</span></button><button class="flex items-center gap-2 px-4 py-2.5 rounded-xl hover:bg-dark-800/50 transition-all group" onclick="openPostDetail('${post.id}')"><span class="iconify text-lg text-dark-400 group-hover:text-blue-400 transition-colors" data-icon="lucide:message-circle"></span><span class="text-sm text-dark-400 group-hover:text-blue-400 transition-colors">${comments.length}</span></button><button class="repost-btn${isReposted(post.id)?' reposted':''} flex items-center gap-2 px-4 py-2.5 rounded-xl hover:bg-dark-800/50 transition-all group" onclick="toggleRepost('${post.id}',this,this.closest('article'))"><span class="iconify text-lg ${isReposted(post.id)?'text-green-400':'text-dark-400'} group-hover:text-green-400 transition-colors" data-icon="lucide:repeat-2"></span><span class="text-sm ${isReposted(post.id)?'text-green-400':'text-dark-400'} group-hover:text-green-400 transition-colors">${post.shares}</span></button><button class="bookmark-btn flex items-center gap-2 px-4 py-2.5 rounded-xl hover:bg-dark-800/50 transition-all group" onclick="toggleBookmark(this)"><span class="iconify text-lg text-dark-400 group-hover:text-brand-400 transition-colors" data-icon="lucide:bookmark"></span></button></div></div><div class="comment-section px-5 pb-4" id="comments-${post.id}"><div class="border-t border-dark-800/50 pt-3 space-y-3">${comments.map(c=>`<div class="flex gap-3"><img src="${c.avatar||'https://picsum.photos/seed/default/40/40.jpg'}" class="w-8 h-8 rounded-lg object-cover shrink-0" alt=""><div class="flex-1 bg-dark-850 rounded-xl px-3 py-2"><p class="text-xs font-semibold mb-1">${c.author}</p>${c.isSticker?`<div class="comment-sticker-sm">${c.text}</div>`:`<p class="text-xs text-dark-300">${c.text}</p>`}<p class="text-[10px] text-dark-500 mt-1">${c.time} • <span class="cursor-pointer hover:text-brand-400">إعجاب</span> • <span class="cursor-pointer hover:text-brand-400">رد</span> • <span class="share-comment-btn" onclick="shareCommentAsPost('${post.id}',c.id)">مشاركة</span></p></div></div>`).join('')}<div class="flex gap-2 relative"><button onclick="event.stopPropagation();toggleStickerPicker('${post.id}')" class="p-2 rounded-lg hover:bg-dark-800 transition-colors shrink-0"><span class="iconify text-dark-400 text-lg" data-icon="lucide:smile"></span></button><div id="stickerPicker-${post.id}" class="sticker-picker"></div><input type="text" placeholder="اكتب تعليقاً أو اختر ملصق..." class="comment-input flex-1 bg-dark-800 border border-dark-700/50 rounded-lg px-3 py-2 text-xs text-white placeholder-dark-400 focus:outline-none focus:border-brand-500/50 transition-all" onkeydown="if(event.key==='Enter'){submitComment(this,'${post.id}')}"><button class="bg-brand-500 hover:bg-brand-600 text-white text-xs px-3 py-2 rounded-lg transition-all" onclick="submitComment(this.previousElementSibling,'${post.id}')"><span class="iconify text-sm" data-icon="lucide:send"></span></button></div></div></div></article>`;
        }

        // ====================================================
        // ===== PROFILE RENDER ===============================
        // ====================================================
        async function renderProfilePosts() {
            const c=document.getElementById('profilePostsList'); const e=document.getElementById('profileEmptyState'); if(!c)return;

            // Merge localStorage posts with Supabase posts
            let allUserPostsLocal = [...userPosts];

            // Fetch from Supabase if connected
            if (sbOnline && sbUser) {
                try {
                    const { data: sbPosts } = await sb.from('posts')
                        .select('*, profiles(*)')
                        .eq('author_id', sbUser.id)
                        .order('created_at', { ascending: false });
                    if (sbPosts && sbPosts.length > 0) {
                        // Convert Supabase posts to local format and merge (avoid duplicates)
                        const localIds = new Set(allUserPostsLocal.map(p => p.sbId || p.id));
                        sbPosts.forEach(sp => {
                            if (!localIds.has(sp.id)) {
                                allUserPostsLocal.unshift({
                                    id: sp.id, sbId: sp.id,
                                    text: sp.content,
                                    displayText: sp.content.replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>'),
                                    tags: sp.tags || [], time: sp.created_at,
                                    likes: sp.likes_count || 0, comments: sp.comments_count || 0,
                                    shares: sp.shares_count || 0,
                                    isRepost: sp.is_repost, repostOf: sp.repost_of,
                                    title: sp.title, media: sp.media || [],
                                    edited: sp.is_edited, commentList: []
                                });
                            }
                        });
                        // Sort by time
                        allUserPostsLocal.sort((a, b) => {
                            const ta = typeof a.time === 'string' && a.time === 'الآن' ? Date.now() : new Date(a.time || 0).getTime();
                            const tb = typeof b.time === 'string' && b.time === 'الآن' ? Date.now() : new Date(b.time || 0).getTime();
                            return tb - ta;
                        });
                    }
                } catch(err) { console.warn('Supabase posts fetch failed:', err); }
            }

            if(allUserPostsLocal.length===0){c.innerHTML='';if(e){e.style.display='';e.querySelector('p').textContent='لم تنشر أي شيء بعد';e.querySelector('button').textContent='اكتب أول منشور';e.querySelector('button').setAttribute('onclick','showPostModal()');}return;}
            if(e)e.style.display='none';
            c.innerHTML=allUserPostsLocal.map(post=>{
                if(post.isRepost){
                    return `<article class="post-card bg-dark-900/80 border border-dark-800/50 rounded-2xl mb-5 transition-all duration-300 animate-fade-in-up overflow-hidden"><div class="flex items-center gap-2 px-5 pt-3 pb-0 text-dark-500 text-xs"><span class="iconify text-sm" data-icon="lucide:repeat-2"></span><span>${getProfile().name} أعاد النشر</span></div><div class="p-5 pb-0"><div class="flex items-start justify-between mb-3"><div class="flex items-center gap-3"><div class="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold border border-dark-700 shrink-0">${(post.originalAuthor||'').charAt(0)}</div><div><h3 class="font-semibold text-sm">${post.originalAuthor}</h3><p class="text-dark-400 text-xs">${post.time}</p></div></div></div>${post.title?`<h2 class="font-bold text-base mb-2">${post.title}</h2>`:''}<div class="mb-3 cursor-pointer" onclick="openPostDetail('${post.repostOf||post.id}')"><p class="text-dark-200 text-sm leading-relaxed">${post.displayText}</p></div></div><div class="border-t border-dark-800/50 px-2 py-1"><div class="flex items-center justify-around"><button class="like-btn flex items-center gap-2 px-4 py-2.5 rounded-xl hover:bg-dark-800/50 transition-all group" onclick="toggleLike(this,${post.likes},'pf-likes-${post.id}','${post.id}',this.closest('article'))"><span class="iconify text-lg text-dark-400 group-hover:text-red-400" data-icon="lucide:heart"></span><span class="text-sm text-dark-400 like-count">${post.likes}</span></button><button class="flex items-center gap-2 px-4 py-2.5 rounded-xl hover:bg-dark-800/50 transition-all group" onclick="openPostDetail('${post.id}')"><span class="iconify text-lg text-dark-400 group-hover:text-blue-400" data-icon="lucide:message-circle"></span><span class="text-sm text-dark-400">${post.comments}</span></button><button class="repost-btn reposted flex items-center gap-2 px-4 py-2.5 rounded-xl hover:bg-dark-800/50 transition-all group" onclick="toggleRepost('${post.id}',this,this.closest('article'))"><span class="iconify text-lg text-green-400" data-icon="lucide:repeat-2"></span><span class="text-sm text-green-400">${post.shares}</span></button><button class="bookmark-btn flex items-center gap-2 px-4 py-2.5 rounded-xl hover:bg-dark-800/50 transition-all group" onclick="toggleBookmark(this)"><span class="iconify text-lg text-dark-400 group-hover:text-brand-400" data-icon="lucide:bookmark"></span></button></div></div></article>`;
                }
                return buildOwnPostHTML(post);
            }).join('');
        }

        async function renderProfileReplies() {
            const c=document.getElementById('profilePostsList'); const e=document.getElementById('profileEmptyState'); if(!c)return;

            // Merge local + Supabase replies
            let allReplies = [...userReplies];
            if (sbOnline && sbUser) {
                try {
                    const { data: sbComments } = await sb.from('comments')
                        .select('*, posts(title, content, author_id, profiles!author_id(name))')
                        .eq('author_id', sbUser.id)
                        .order('created_at', { ascending: false });
                    if (sbComments && sbComments.length > 0) {
                        const localIds = new Set(allReplies.map(r => r.id));
                        sbComments.forEach(sc => {
                            if (!localIds.has(sc.id)) {
                                const parentPost = sc.posts;
                                allReplies.push({
                                    id: sc.id, postId: sc.post_id,
                                    parentAuthor: parentPost?.profiles?.name || 'مستخدم',
                                    parentContent: (parentPost?.title || parentPost?.content || '').substring(0, 80),
                                    replyText: sc.content, time: sc.created_at,
                                    isSticker: sc.is_sticker
                                });
                            }
                        });
                    }
                } catch(err) { console.warn('Supabase replies fetch failed:', err); }
            }

            if(allReplies.length===0){c.innerHTML='';if(e){e.style.display='';e.querySelector('p').textContent='لم تكتب أي رد بعد';e.querySelector('button').textContent='استعرض الرئيسية';e.querySelector('button').setAttribute('onclick',"showPage('feed')");}return;}
            if(e)e.style.display='none';
            const profile=getProfile();
            c.innerHTML=allReplies.map(r=>{
                const timeDisplay = typeof r.time === 'string' && r.time.includes('T') ? new Date(r.time).toLocaleDateString('ar-SA') : r.time;
                return `<article class="post-card bg-dark-900/80 border border-dark-800/50 rounded-2xl mb-4 transition-all duration-300 animate-fade-in-up overflow-hidden cursor-pointer hover:border-brand-500/30" onclick="openPostDetail('${r.postId}')"><div class="p-5"><div class="flex items-center gap-2 mb-3 text-dark-500 text-xs"><span class="iconify text-sm" data-icon="lucide:message-circle"></span><span>${profile.name} ردّ على ${r.parentAuthor}</span><span class="mr-auto">${timeDisplay}</span></div><div class="bg-dark-850 rounded-xl p-3 mb-3 border-r-2 border-dark-700"><p class="text-xs text-dark-400 font-medium mb-1">${r.parentAuthor}</p><p class="text-xs text-dark-500 truncate">${r.parentContent}</p></div><div class="flex items-start gap-3"><img src="https://picsum.photos/seed/lawyer-me/40/40.jpg" class="w-8 h-8 rounded-lg object-cover shrink-0 mt-0.5" alt=""><div class="flex-1"><div class="flex items-center gap-2 mb-1"><span class="text-xs font-semibold">${profile.name}</span><span class="text-[10px] text-dark-500">${timeDisplay}</span></div>${r.isSticker?`<div class="comment-sticker">${r.replyText}</div>`:`<p class="text-sm text-dark-200 leading-relaxed">${r.replyText}</p>`}</div></div></div></article>`;
            }).join('');
        }

        async function renderProfileLikes() {
            const c=document.getElementById('profilePostsList'); const e=document.getElementById('profileEmptyState'); if(!c)return;

            // Merge local + Supabase likes
            let allLikes = [...userLikes];
            if (sbOnline && sbUser) {
                try {
                    const { data: sbLikes } = await sb.from('likes')
                        .select('post_id, posts(*, profiles(*))')
                        .eq('user_id', sbUser.id)
                        .order('created_at', { ascending: false });
                    if (sbLikes && sbLikes.length > 0) {
                        const localIds = new Set(allLikes.map(l => l.id));
                        sbLikes.forEach(sl => {
                            if (sl.posts && !localIds.has(sl.post_id)) {
                                const sp = sl.posts;
                                allLikes.push({
                                    id: sl.post_id,
                                    author: sp.profiles?.name || 'مستخدم',
                                    role: sp.profiles?.title || '',
                                    content: sp.content, displayText: sp.content,
                                    title: sp.title, tags: sp.tags || [],
                                    likes: sp.likes_count || 0, comments: sp.comments_count || 0,
                                    shares: sp.shares_count || 0, time: sp.created_at,
                                    gradient: 'from-blue-500 to-purple-600'
                                });
                            }
                        });
                    }
                } catch(err) { console.warn('Supabase likes fetch failed:', err); }
            }

            if(allLikes.length===0){c.innerHTML='';if(e){e.style.display='';e.querySelector('p').textContent='لم تعجب بأي منشور بعد';e.querySelector('button').textContent='استعرض الرئيسية';e.querySelector('button').setAttribute('onclick',"showPage('feed')");}return;
            }
            if(e)e.style.display='none';
            c.innerHTML=allLikes.map(post=>{
                const timeDisplay = typeof post.time === 'string' && post.time.includes('T') ? new Date(post.time).toLocaleDateString('ar-SA') : (post.time || '');
                return `<article class="post-card bg-dark-900/80 border border-dark-800/50 rounded-2xl mb-5 transition-all duration-300 animate-fade-in-up overflow-hidden"><div class="p-5 pb-0"><div class="flex items-start justify-between mb-3"><div class="flex items-center gap-3"><div class="w-11 h-11 rounded-xl bg-gradient-to-br ${post.gradient||'from-blue-500 to-purple-600'} flex items-center justify-center text-white font-bold border border-dark-700 shrink-0">${(post.author||'').charAt(0)}</div><div><h3 class="font-semibold text-sm">${post.author}</h3><p class="text-dark-400 text-xs">${post.role||''} • ${timeDisplay}</p></div></div></div>${post.title?`<h2 class="font-bold text-base mb-2">${post.title}</h2>`:''}<div class="mb-3 cursor-pointer" onclick="openPostDetail('${post.id}')"><p class="text-dark-200 text-sm leading-relaxed">${post.displayText||post.content||''}</p></div></div><div class="border-t border-dark-800/50 px-2 py-1"><div class="flex items-center justify-around"><button class="like-btn liked flex items-center gap-2 px-4 py-2.5 rounded-xl hover:bg-dark-800/50 transition-all group" onclick="toggleLike(this,${post.likes||0},'lk-${post.id}','${post.id}',this.closest('article'));renderProfileLikes()"><span class="iconify text-lg text-red-400 group-hover:text-red-400" data-icon="lucide:heart"></span><span class="text-sm text-red-400 like-count">${post.likes||0}</span></button><button class="flex items-center gap-2 px-4 py-2.5 rounded-xl hover:bg-dark-800/50 transition-all group" onclick="openPostDetail('${post.id}')"><span class="iconify text-lg text-dark-400 group-hover:text-blue-400" data-icon="lucide:message-circle"></span><span class="text-sm text-dark-400">${post.comments||0}</span></button><button class="flex items-center gap-2 px-4 py-2.5 rounded-xl hover:bg-dark-800/50 transition-all group" onclick="showShareModal()"><span class="iconify text-lg text-dark-400 group-hover:text-green-400" data-icon="lucide:repeat-2"></span><span class="text-sm text-dark-400">${post.shares||0}</span></button><button class="bookmark-btn flex items-center gap-2 px-4 py-2.5 rounded-xl hover:bg-dark-800/50 transition-all group" onclick="toggleBookmark(this)"><span class="iconify text-lg text-dark-400 group-hover:text-brand-400" data-icon="lucide:bookmark"></span></button></div></div></article>`;
            }).join('');
        }

        // ===== Navigate to post =====
        function navigateToPost(postId) { showPage('feed'); setTimeout(()=>{const el=document.getElementById('comments-'+postId);if(el){const a=el.closest('article');if(a){a.scrollIntoView({behavior:'smooth',block:'center'});a.style.borderColor='rgba(249,115,22,0.6)';a.style.boxShadow='0 0 20px rgba(249,115,22,0.15)';el.classList.add('open');setTimeout(()=>{a.style.borderColor='';a.style.boxShadow='';},3000);}}else showToast('المنشور الأصلي غير موجود');},300); }

        // ===== Notifications =====
        const notifData=[{id:1,type:'like',user:'سارة المنصوري',gradient:'from-pink-500 to-yellow-500',text:'أعجبت بمنشورك',target:'التحكيم التجاري',time:'منذ 5 دقائق',unread:true,category:'all'},{id:2,type:'comment',user:'خالد العمري',gradient:'from-cyan-500 to-purple-500',text:'علّق على مقالك:',comment:'هل يمكنك التوسع في جزء التحكيم التجاري؟',target:'محكمة التحكيم الدولية',time:'منذ 15 دقيقة',unread:true,category:'replies'},{id:3,type:'follow',user:'نورة القحطاني',gradient:'from-purple-500 to-red-500',text:'بدأت بمتابعتك',time:'منذ ساعة',unread:true,hasAction:true,category:'all'},{id:4,type:'mention',user:'فاطمة الحربي',gradient:'from-green-500 to-cyan-500',text:'ذكرتك في تعليق',target:'العملات الرقمية',time:'منذ ساعتين',unread:true,category:'mentions'},{id:5,type:'like',user:'عمر الحسيني',gradient:'from-yellow-500 to-green-500',text:'أعجب بتعليقك على',target:'قانون حقوق النشر',time:'منذ 3 ساعات',unread:false,category:'all'},{id:6,type:'share',user:'يوسف الشريف',gradient:'from-red-500 to-purple-500',text:'شارك منشورك',target:'الملكية الفكرية',time:'منذ 5 ساعات',unread:false,category:'all'},{id:7,type:'comment',user:'ليلى بنت خليفة',gradient:'from-teal-500 to-blue-500',text:'ردّت على تعليقك:',comment:'ممتاز! شكراً على المشاركة',target:'الوساطة القانونية',time:'منذ 8 ساعات',unread:false,category:'replies'},{id:8,type:'event',user:'نظام',gradient:'from-brand-500 to-brand-700',text:'تذكير: مؤتمر التحكيم الدولي غداً',time:'منذ 10 ساعات',unread:false,category:'all',isSystem:true},{id:9,type:'like',user:'طارق الراشد',gradient:'from-emerald-500 to-teal-600',text:'أعجب بمنشورك عن',target:'الضريبة الجديدة',time:'أمس',unread:false,category:'all'},{id:10,type:'badge',user:'نظام',gradient:'from-yellow-500 to-orange-500',text:'🎉 مبروك! وصلت 200 إعجاب على مقالك',time:'أمس',unread:false,category:'all',isSystem:true}];
        function getNotifIcon(t){const i={like:{icon:'lucide:heart',color:'text-red-400',bg:'bg-red-500/15'},comment:{icon:'lucide:message-circle',color:'text-blue-400',bg:'bg-blue-500/15'},follow:{icon:'lucide:user-plus',color:'text-green-400',bg:'bg-green-500/15'},mention:{icon:'lucide:at-sign',color:'text-purple-400',bg:'bg-purple-500/15'},share:{icon:'lucide:share-2',color:'text-cyan-400',bg:'bg-cyan-500/15'},event:{icon:'lucide:calendar',color:'text-brand-400',bg:'bg-brand-500/15'},badge:{icon:'lucide:trophy',color:'text-yellow-400',bg:'bg-yellow-500/15'}};return i[t]||i.like}
        function getNotifTargetPage(t){const p={like:'feed',comment:'feed',follow:'connections',mention:'feed',share:'feed',event:'events',badge:'certificates'};return p[t]||'feed'}
        function renderNotifs(filter){const c=document.getElementById('notifList');let items=notifData;if(filter==='unread')items=items.filter(n=>n.unread);else if(filter==='mentions')items=items.filter(n=>n.type==='mention');else if(filter==='replies')items=items.filter(n=>n.type==='comment');if(items.length===0){c.innerHTML='<div class="notif-empty"><span class="iconify" data-icon="lucide:bell-off"></span><p>لا توجد إشعارات</p></div>';return;}c.innerHTML=items.map(n=>{const ic=getNotifIcon(n.type);const ah=n.isSystem?`<div class="notif-icon-wrap ${ic.bg}"><span class="iconify ${ic.color} text-lg" data-icon="${ic.icon}"></span></div>`:`<div class="notif-icon-wrap ${ic.bg}"><span class="iconify ${ic.color} text-lg" data-icon="${ic.icon}"></span><div class="notif-avatar-letter bg-gradient-to-br ${n.gradient}">${n.user.charAt(0)}</div></div>`;const th=n.target?`<span class="notif-highlight">${n.target}</span>`:'';const ch=n.comment?`<br><span class="text-dark-400 text-xs">"${n.comment}"</span>`:'';const ab=n.hasAction?`<div class="flex gap-2 mt-2"><button class="notif-action-btn accept" onclick="event.stopPropagation();acceptFollow(${n.id})">متابعة</button><button class="notif-action-btn decline" onclick="event.stopPropagation();declineFollow(${n.id})">حذف</button></div>`:'';return `<div class="notif-item-row ${n.unread?'unread':''}" onclick="clickNotif(${n.id})">${ah}<div class="notif-content"><div class="notif-text"><strong>${n.user}</strong> ${n.text} ${th}${ch}</div><div class="notif-time">${n.unread?'<span class="notif-new-dot"></span>':''}${n.time}</div>${ab}</div></div>`}).join('')}
        function toggleNotifDropdown(e){e.stopPropagation();const d=document.getElementById('notifDropdown');if(d.classList.contains('open'))closeNotifDropdown();else{d.classList.add('open');renderNotifs('all');document.querySelectorAll('.notif-tab').forEach(t=>t.classList.remove('active'));document.querySelector('.notif-tab')?.classList.add('active')}}
        function closeNotifDropdown(){document.getElementById('notifDropdown').classList.remove('open')}
        function filterNotifs(btn,filter){document.querySelectorAll('.notif-tab').forEach(t=>t.classList.remove('active'));btn.classList.add('active');renderNotifs(filter)}
        function markAllRead(){notifData.forEach(n=>n.unread=false);renderNotifs('all');updateNotifDots();showToast('تم تحديد الكل كمقروء ✓')}
        function clickNotif(id){const n=notifData.find(n=>n.id===id);if(!n)return;n.unread=false;updateNotifDots();closeNotifDropdown();showPage(getNotifTargetPage(n.type))}
        function acceptFollow(id){const n=notifData.find(n=>n.id===id);if(n){n.hasAction=false;n.text='يتابعك الآن ✓';n.unread=false}renderNotifs('all');updateNotifDots();showToast('تم قبول المتابعة ✓')}
        function declineFollow(id){const idx=notifData.findIndex(n=>n.id===id);if(idx>-1)notifData.splice(idx,1);renderNotifs('all');updateNotifDots();showToast('تم حذف الطلب')}
        function updateNotifDots(){const has=notifData.some(n=>n.unread);const m=document.getElementById('notifDotMobile');const d=document.getElementById('notifDotDesktop');if(m)m.style.display=has?'':'none';if(d)d.style.display=has?'':'none'}
        document.addEventListener('click',(e)=>{const m=document.getElementById('notifDropdownWrapMobile');const d=document.getElementById('notifDropdownWrap');const dd=document.getElementById('notifDropdown');if(dd&&!dd.contains(e.target)&&(!m||!m.contains(e.target))&&(!d||!d.contains(e.target)))closeNotifDropdown()});
        let notifCounter=notifData.length;setInterval(()=>{const u=[{name:'أحمد المنصور',gradient:'from-indigo-500 to-purple-600'},{name:'رنا السعيد',gradient:'from-rose-500 to-orange-500'},{name:'هدى النعيمي',gradient:'from-sky-500 to-blue-600'}];const t=[{type:'like',text:'أعجبت بمنشورك الجديد'},{type:'comment',text:'علّق على مقالك:',comment:'محتوى رائع!'},{type:'mention',text:'ذكرتك في منشور'}];const usr=u[Math.floor(Math.random()*u.length)];const act=t[Math.floor(Math.random()*t.length)];notifCounter++;notifData.unshift({id:notifCounter,type:act.type,user:usr.name,gradient:usr.gradient,text:act.text,comment:act.comment||null,time:'الآن',unread:true,category:act.type==='mention'?'mentions':act.type==='comment'?'replies':'all',isSystem:false});updateNotifDots();const dd=document.getElementById('notifDropdown');if(dd&&dd.classList.contains('open')){renderNotifs('all');document.querySelector('.notif-tab')?.classList.add('active')}},30000);

        // ===== Poll =====
        function votePoll(btn,pct){const p=btn.closest('[id^="poll-"]');p.querySelectorAll('.poll-option').forEach(o=>{o.style.pointerEvents='none';const v=parseInt(o.querySelector('.poll-pct').textContent);o.style.background=`linear-gradient(to left, rgba(249,115,22,0.15) ${v}%, rgba(38,38,38,0.8) ${v}%)`;o.style.opacity=o===btn?'1':'0.6'});btn.style.borderColor='rgba(249,115,22,0.5)';showToast('تم التصويت ✓')}

        // ===== Trending =====
        const trendingData=[{rank:1,tag:'#التحكيم_الدولي',category:'legal',catLabel:'قانوني',catColor:'brand',posts:'2,450',change:'+340',bar:95,desc:'محكمة التحكيم الدولية تصدر قرارات جديدة'},{rank:2,tag:'#قانون_الذكاء_الاصطناعي',category:'legal',catLabel:'قانوني',catColor:'brand',posts:'1,890',change:'+520',bar:82,desc:'الدول العربية تبدأ بسن تشريعات للذكاء الاصطناعي'},{rank:3,tag:'#حقوق_الملكية_الفكرية',category:'legal',catLabel:'قانوني',catColor:'brand',posts:'1,650',change:'+180',bar:72,desc:'تحديثات على قوانين حماية العلامات التجارية'},{rank:4,tag:'#Fintech_التنظيمي',category:'tech',catLabel:'تقنية',catColor:'cyan',posts:'1,420',change:'+290',bar:65,desc:'أطر تنظيمية جديدة للعملات الرقمية'},{rank:5,tag:'#قانون_الشركات_الجديد',category:'legal',catLabel:'قانوني',catColor:'brand',posts:'1,280',change:'+150',bar:58,desc:'تعديلات على قانون الشركات في دول الخليج'},{rank:6,tag:'#الجريمة_الإلكترونية',category:'legal',catLabel:'قانوني',catColor:'brand',posts:'1,120',change:'+210',bar:52,desc:'قوانين جديدة لمكافحة الاحتيال الإلكتروني'},{rank:7,tag:'#Blockchain_قانوني',category:'tech',catLabel:'تقنية',catColor:'cyan',posts:'980',change:'+320',bar:48,desc:'العقود الذكية وتطبيقاتها القانونية'},{rank:8,tag:'#القانون_الدولي_الإنساني',category:'legal',catLabel:'قانوني',catColor:'brand',posts:'870',change:'+95',bar:42,desc:'حماية المدنيين في القانون الدولي'},{rank:9,tag:'#العملات_الرقمية',category:'tech',catLabel:'تقنية',catColor:'cyan',posts:'760',change:'+180',bar:38,desc:'إطار تنظيمي جديد للعملات الرقمية'},{rank:10,tag:'#قانون_العمل',category:'legal',catLabel:'قانوني',catColor:'brand',posts:'650',change:'+75',bar:32,desc:'تعديلات على قوانين العمل'}];
        function toggleTrendingDropdown(e){e.stopPropagation();const d=document.getElementById('trendingDropdown'),a=document.getElementById('trendingArrow');if(d.classList.contains('open'))closeTrendingDropdown();else{d.classList.add('open');a.style.transform='rotate(180deg)';renderTrendingList('all');document.getElementById('trendingSearchInput').value='';document.getElementById('trendingSearchInput').focus()}}
        function closeTrendingDropdown(){document.getElementById('trendingDropdown').classList.remove('open');document.getElementById('trendingArrow').style.transform=''}
        document.addEventListener('click',(e)=>{const w=document.getElementById('trendingDropdownWrap');if(w&&!w.contains(e.target))closeTrendingDropdown()});
        function renderTrendingList(filter){const c=document.getElementById('trendingList');let items=trendingData;if(filter&&filter!=='all')items=items.filter(i=>i.category===filter);c.innerHTML=items.map(item=>{const rc=item.rank<=3?'hot':item.rank<=7?'warm':'normal';const bc=item.catColor==='brand'?'#f97316':item.catColor==='cyan'?'#06b6d4':'#a855f7';return `<div class="trending-item" onclick="showToast('عرض: ${item.tag}');closeTrendingDropdown()"><div class="rank ${rc}">${item.rank}</div><div class="flex-1 min-w-0"><div class="flex items-center gap-2 mb-0.5"><span class="font-bold text-sm text-white">${item.tag}</span><span class="trending-category-tag bg-${item.catColor}-500/15 text-${item.catColor}-400">${item.catLabel}</span></div><p class="text-dark-400 text-[11px] leading-relaxed truncate">${item.desc}</p><div class="flex items-center gap-3 mt-1.5"><span class="text-dark-500 text-[10px]">${item.posts} منشور</span><span class="text-green-400 text-[10px] font-semibold">${item.change} جديد</span></div><div class="trend-bar"><div class="fill" style="width:${item.bar}%;background:${bc}"></div></div></div></div>`}).join('')}
        function filterTrending(q){document.getElementById('trendingList').querySelectorAll('.trending-item').forEach(i=>{i.style.display=i.textContent.toLowerCase().includes(q.toLowerCase())?'':'none'})}
        function switchTrendingTab(btn,filter){document.querySelectorAll('.trending-tab').forEach(t=>{t.classList.remove('active','bg-brand-500/20','text-brand-400');t.classList.add('text-dark-400')});btn.classList.add('active','bg-brand-500/20','text-brand-400');btn.classList.remove('text-dark-400');renderTrendingList(filter)}
        function showTrendingPage(){showPage('trending');renderTrendingPageList()}
        function renderTrendingPageList(filter){const c=document.getElementById('trendingPageList');let items=trendingData;if(filter&&filter!=='all')items=items.filter(i=>i.category===filter);c.innerHTML=items.map(item=>{const rc=item.rank<=3?'hot':item.rank<=7?'warm':'normal';const bc=item.catColor==='brand'?'#f97316':item.catColor==='cyan'?'#06b6d4':'#a855f7';return `<div class="p-4 hover:bg-dark-850 cursor-pointer transition-all" onclick="showToast('عرض: ${item.tag}')"><div class="flex items-start gap-4"><div class="rank ${rc} text-lg w-10 h-10 rounded-xl flex items-center justify-center font-bold" style="font-size:16px">${item.rank}</div><div class="flex-1"><div class="flex items-center gap-2 mb-1"><span class="font-bold text-base text-white">${item.tag}</span><span class="trending-category-tag bg-${item.catColor}-500/15 text-${item.catColor}-400">${item.catLabel}</span></div><p class="text-dark-300 text-sm leading-relaxed mb-2">${item.desc}</p><div class="flex items-center gap-4"><span class="text-dark-400 text-xs">${item.posts} منشور</span><span class="text-green-400 text-xs font-semibold">${item.change} جديد اليوم</span><div class="flex-1 max-w-[200px]"><div class="trend-bar"><div class="fill" style="width:${item.bar}%;background:${bc}"></div></div></div></div></div><button class="shrink-0 text-brand-400 border border-brand-500/30 text-xs px-3 py-1.5 rounded-lg hover:bg-brand-500/10 transition-all" onclick="event.stopPropagation();showToast('تم المتابعة ✓')">متابعة</button></div></div>`}).join('')}
        function filterTrendingPage(q){document.getElementById('trendingPageList').querySelectorAll('[class*="p-4"]').forEach(i=>{i.style.display=i.textContent.toLowerCase().includes(q.toLowerCase())?'':'none'})}
        function switchTrendingPageTab(btn,period){document.querySelectorAll('.trending-page-tab').forEach(t=>{t.classList.remove('active','bg-dark-800','text-white');t.classList.add('text-dark-400')});btn.classList.add('active','bg-dark-800','text-white');btn.classList.remove('text-dark-400');showToast('عرض: '+(period==='today'?'اليوم':period==='week'?'هذا الأسبوع':'هذا الشهر'));renderTrendingPageList()}

        // ===== All Posts =====
        const allPosts=[{id:'post-1',author:'د. محمد علي الشعيبي',avatar:'م',verified:true,role:'محامي تحكيم دولي',time:'منذ 23 دقيقة',title:'التحكيم في قضايا الطاقة: دراسة حالة جديدة',content:'محكمة التحكيم الدولية نشرت تقريرها السنوي الجديد الذي يرصد تطور قضايا الطاقة والموارد الطبيعية. من أبرز الملاحظات: ارتفاع 40% في عدد القضايا المتعلقة بالعقود النفطية...',tags:['#التحكيم_الدولي','#قانون_الطاقة'],likes:187,comments:42,shares:28,gradient:'from-blue-500 to-purple-600',relevance:95},{id:'post-2',author:'سارة المنصوري',avatar:'س',verified:false,role:'مستشارة قانونية',time:'منذ ساعة',title:'',content:'تحديث مهم: صدر المرسوم التنفيذي الجديد لقانون حماية البيانات الشخصية في الإمارات. يشمل أحكاماً جديدة حول نقل البيانات عبر الحدود وفرض غرامات تصل إلى 5 مليون درهم للمخالفين. 🇦🇪📋',tags:['#حماية_البيانات','#الإمارات'],likes:134,comments:28,shares:19,gradient:'from-pink-500 to-yellow-500',relevance:88},{id:'post-3',author:'خالد العمري',avatar:'خ',verified:true,role:'أستاذ القانون الدولي',time:'منذ 3 ساعات',title:'قانون الشركات الموحد: تحليل شامل',content:'بعد صدور قانون الشركات الموحد في دول مجلس التعاون، نشرت مكتبنا دراسة تحليلية شاملة تغطي أبرز التغييرات:\n\n1. تبسيط إجراءات التأسيس\n2. حماية أفضل للمساهمين الأقلية\n3. إدخال مفهوم الشركة ذات المسؤولية المحدودة المنفردة\n\nالدراسة متوفرة على ملفنا الشخصي.',tags:['#قانون_الشركات','#مجلس_التعاون'],likes:256,comments:67,shares:45,gradient:'from-cyan-500 to-purple-500',relevance:92},{id:'post-4',author:'فاطمة الحربي',avatar:'ف',verified:false,role:'خبيرة تقنية مالية',time:'منذ 5 ساعات',title:'',content:'هل تعلم؟ 🤔\n\nالبنك المركزي السعودي أصدر توجيهات جديدة لشركات التقنية المالية تتعلق بالتحقق من الهوية الرقمية (eKYC). هذه التوجيهات ستدخل حيز التنفيذ في الربع الأول من 2025.\n\nما رأيكم؟ 💡',tags:['#Fintech','#العملات_الرقمية','#SAMA'],likes:89,comments:34,shares:12,gradient:'from-green-500 to-cyan-500',relevance:85},{id:'post-5',author:'نورة القحطاني',avatar:'ن',verified:true,role:'محامية عقود',time:'منذ 7 ساعات',title:'دليلك الشامل لصياغة العقود الدولية',content:'بعد سنوات من العمل في صياغة العقود الدولية، أشارككم أهم 10 نصائح:\n\n✅ حدد القانون الواجب التطبيق بوضوح\n✅ اختر محكمة التحكيم المناسبة\n✅ لا تتجاهل بنود force majeure\n✅ وثّق كل التعديلات كتابياً\n\nالمقال الكامل في الملف الشخصي 📝',tags:['#العقود','#التحكيم_التجاري'],likes:312,comments:78,shares:56,gradient:'from-purple-500 to-red-500',relevance:90},{id:'post-6',author:'يوسف الشريف',avatar:'ي',verified:false,role:'خبير ملكية فكرية',time:'منذ 9 ساعات',title:'',content:'🚨 تنبيه مهم لرواد الأعمال!\n\nالتسجيل في برنامج حماية العلامات التجارية الجديد ابتدأ اليوم.',tags:['#الملكية_الفكرية','#رواد_الأعمال'],likes:167,comments:45,shares:34,gradient:'from-red-500 to-purple-500',relevance:78},{id:'post-7',author:'عمر الحسيني',avatar:'ع',verified:true,role:'قاضي متقاعد',time:'منذ 11 ساعة',title:'قراءة في أحدث أحكاممحكمة التمييز',content:'محكمة التمييز أصدرت حكماً مهماً بشأن المسؤولية التقصيرية في القضايا الطبية. الحكم يُعيد تعريف معايير الإهمال الطبي ويضع معايير جديدة للتعويض.\n\nقرار سيُحدث ثورة في القضاء الطبي! ⚖️',tags:['#القضاء','#المسؤولية_المدنية','#القانون_الطبي'],likes:198,comments:56,shares:41,gradient:'from-yellow-500 to-green-500',relevance:82},{id:'post-8',author:'ليلى بنت خليفة',avatar:'ل',verified:false,role:'وسيطة قانونية',time:'منذ 14 ساعة',title:'',content:'تجربتي مع الوساطة القانونية في حل نزاع تجاري معقد:\n\nالطرفان: شريكان تجاريان\nالنتيجة: حل ودي في 3 أسابيع بدلاً من سنتين!\n\nالوساطة هي المستقبل 🤝',tags:['#الوساطة','#حل_النزاعات'],likes:145,comments:67,shares:23,gradient:'from-teal-500 to-blue-500',relevance:75},{id:'post-9',author:'د. أحمد المنصور',avatar:'أ',verified:true,role:'أستاذ القانون الدستوري',time:'منذ 18 ساعة',title:'التعديلات الدستورية: قراءة تحليلية',content:'التعديلات الدستورية الأخيرة تستحق قراءة تحليلية معمقة.\n\n📌 تعزيز دور القضاء المستقل\n📌 حماية הזכויות الرقمية\n📌 إنشاء هيئة وطنية للذكاء الاصطناعي\n\nندوة تفاعلية يوم الخميس الساعة 8 مساءً 🎙️',tags:['#القانون_الدستوري','#التعديلات'],likes:234,comments:89,shares:67,gradient:'from-indigo-500 to-purple-600',relevance:80},{id:'post-10',author:'رنا السعيد',avatar:'ر',verified:false,role:'محامية جنائية',time:'منذ يوم',title:'',content:'⚖️ نصيحة قانونية يومية\n\nهل تعلم أن الاحتفاظ بنسخة من أي عقد توقعه هو حق قانوني لك؟\n\nالمادة 34 من قانون المعاملات المدنية تنص على ذلك.\n\nلا توقع أي عقد بدون نسخة! 📄',tags:['#نصيحة_قانونية','#القانون_المدني'],likes:456,comments:123,shares:89,gradient:'from-rose-500 to-orange-500',relevance:70},{id:'post-11',author:'طارق الراشد',avatar:'ط',verified:true,role:'مستشار ضريبي',time:'منذ يوم',title:'الضريبة الجديدة: ما يجب أن تعرفه',content:'تحليل شامل للتعديلات الضريبية الجديدة:\n\n📊 ضريبة القيمة المضافة: لا تغييرات\n📊 ضريبة الدخل: خصم جديد للبحث والتطوير\n📊 ضريبة الشركات: معدل تنافسي 15%\n\n📚 الدليل الكامل متوفر في مكتبتنا القانونية',tags:['#الضريبة','#قانون_الضرائب'],likes:178,comments:54,shares:38,gradient:'from-emerald-500 to-teal-600',relevance:72},{id:'post-12',author:'هدى النعيمي',avatar:'ه',verified:false,role:'أستاذة قانون بحري',time:'منذ يومين',title:'',content:'🗺️ حدود بحرية جديدة!\n\nاتفاقية جديدة بين دول الخليج تحدد الحدود البحرية والمناطق الاقتصادية الخالصة.\n\nتفاصيل كاملة في مقالتي الجديدة 🔗',tags:['#القانون_البحري','#الحدود_البحرية'],likes:98,comments:23,shares:15,gradient:'from-sky-500 to-blue-600',relevance:65}];

        function hideStaticPosts(){const fp=document.getElementById('page-feed');if(!fp)return;fp.querySelectorAll(':scope > article.post-card').forEach(a=>a.remove())}
        function getFeedPosts(){return allPosts.filter(p=>!isFollowing(p.author))}

        function renderFeedPosts(){
            const container=document.getElementById('page-feed');if(!container)return;
            container.querySelectorAll('.post-card,.dynamic-post').forEach(el=>el.remove());
            const posts=getFeedPosts().sort((a,b)=>b.relevance-a.relevance);
            const loader=document.getElementById('infiniteLoader');
            if(posts.length===0){const e=document.createElement('div');e.className='dynamic-post text-center py-12 text-dark-400';e.innerHTML='<span class="iconify text-4xl mb-3 block" data-icon="lucide:users"></span><p class="text-sm">تابعت كل المقترحات! 🎉</p>';container.insertBefore(e,loader);document.getElementById('infiniteLoader').style.display='none';return;}
            posts.forEach((post,i)=>{const div=document.createElement('div');div.className='dynamic-post';div.innerHTML=buildPlatformPostHTML(post,i);container.insertBefore(div.firstElementChild,loader)});
            document.getElementById('infiniteLoader').style.display='none';document.getElementById('feedEnd').style.display='none';
        }

        function renderFollowingPosts(){const c=document.getElementById('followingPosts');if(!c)return;const posts=allPosts.filter(p=>isFollowing(p.author));if(posts.length===0){c.innerHTML='<div class="text-center py-12 text-dark-400"><span class="iconify text-4xl mb-3 block" data-icon="lucide:user-plus"></span><p class="text-sm">لم تتابع أحداً بعد</p></div>';return;}c.innerHTML=posts.map((p,i)=>buildPlatformPostHTML(p,i)).join('')}
        function switchFollowingTab(btn,filter){document.querySelectorAll('.following-tab').forEach(t=>{t.classList.remove('active','bg-dark-800','text-white');t.classList.add('text-dark-400')});btn.classList.add('active','bg-dark-800','text-white');btn.classList.remove('text-dark-400');showToast('عرض: '+(filter==='all'?'الكل':filter==='people'?'أشخاص':'صفحات'));renderFollowingPosts()}

        // ===== Audio Spaces =====
        const audioSpaces=[{id:1,title:'التحكيم التجاري: تجارب ودروس',host:'د. محمد علي الشعيبي',avatar:'م',gradient:'from-blue-500 to-purple-600',status:'live',listeners:342,speakers:['م','خ','ن'],speakerNames:['محمد','خالد','نورة'],topic:'قانوني',startedAgo:'منذ 45 دقيقة',desc:'مناقشة أحدث تطورات التحكيم التجاري'},{id:2,title:'مستقبل العملات الرقمية',host:'فاطمة الحربي',avatar:'ف',gradient:'from-green-500 to-cyan-500',status:'live',listeners:189,speakers:['ف','ي'],speakerNames:['فاطمة','يوسف'],topic:'تقنية',startedAgo:'منذ 20 دقيقة',desc:'نقاش حول الإطار التنظيمي للعملات الرقمية'},{id:3,title:'قراءة في قانون الشركات الجديد',host:'خالد العمري',avatar:'خ',gradient:'from-cyan-500 to-purple-500',status:'upcoming',listeners:0,speakers:['خ'],speakerNames:['خالد'],topic:'قانوني',startsAt:'اليوم 8:00 م',desc:'تحليل شامل للتعديلات'},{id:4,title:'ورشة: صياغة العقود الدولية',host:'نورة القحطاني',avatar:'ن',gradient:'from-purple-500 to-red-500',status:'upcoming',listeners:0,speakers:['ن','ل'],speakerNames:['نورة','ليلى'],topic:'قانوني',startsAt:'غداً 6:00 م',desc:'ورشة عملية'},{id:5,title:'قانون حماية البيانات',host:'سارة المنصوري',avatar:'س',gradient:'from-pink-500 to-yellow-500',status:'recorded',listeners:567,speakers:['س','أ'],speakerNames:['سارة','أحمد'],topic:'قانوني',recordedAgo:'منذ يومين',desc:'ملخص التعديلات'},{id:6,title:'الذكاء الاصطناعي والقانون',host:'د. أحمد المنصور',avatar:'أ',gradient:'from-indigo-500 to-purple-600',status:'recorded',listeners:892,speakers:['أ','ف','م'],speakerNames:['أحمد','فاطمة','محمد'],topic:'تقنية',recordedAgo:'منذ 3 أيام',desc:'نقاش حول الإطار القانوني للذكاء الاصطناعي'}];
        function renderSpaces(filter){const c=document.getElementById('spacesList');let f=audioSpaces;if(filter==='live')f=audioSpaces.filter(s=>s.status==='live');else if(filter==='upcoming')f=audioSpaces.filter(s=>s.status==='upcoming');else if(filter==='recorded')f=audioSpaces.filter(s=>s.status==='recorded');c.innerHTML=f.map(space=>{const il=space.status==='live',iu=space.status==='upcoming';const sb=il?'<span class="bg-red-500/20 text-red-400 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1"><span class="w-1.5 h-1.5 bg-red-500 rounded-full live-dot"></span>مباشر</span>':iu?'<span class="bg-blue-500/20 text-blue-400 text-[10px] font-bold px-2 py-0.5 rounded-full">قريباً</span>':'<span class="bg-dark-700/50 text-dark-400 text-[10px] font-bold px-2 py-0.5 rounded-full">مسجل</span>';const sa=space.speakers.map(s=>`<div class="speaker-avatar"><div class="w-10 h-10 rounded-full bg-gradient-to-br ${space.gradient} flex items-center justify-center text-white text-xs font-bold border-2 border-dark-900">${s}</div>${il?'<div class="mic-icon bg-green-500"><span class="iconify text-white" data-icon="lucide:mic" style="font-size:7px"></span></div>':''}</div>`).join('');const ab=il?`<button class="bg-red-500 hover:bg-red-600 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-all active:scale-95" onclick="event.stopPropagation();showToast('انضممت إلى المساحة 🎙️')">انضم الآن</button>`:iu?`<button class="bg-dark-800 hover:bg-dark-700 text-white text-xs font-semibold px-4 py-2 rounded-xl border border-dark-700 transition-all" onclick="event.stopPropagation();showToast('تم تفعيل التذكير 🔔')">تذكير</button>`:`<button class="bg-dark-800 hover:bg-dark-700 text-white text-xs font-semibold px-4 py-2 rounded-xl border border-dark-700 transition-all" onclick="event.stopPropagation();showToast('تشغيل التسجيل ▶️')">استمع</button>`;const mt=il?`<span class="text-red-400 text-[10px] flex items-center gap-1"><span class="w-1.5 h-1.5 bg-red-500 rounded-full live-dot"></span>${space.startedAgo}</span>`:iu?`<span class="text-blue-400 text-[10px]">🕐 ${space.startsAt}</span>`:`<span class="text-dark-500 text-[10px]">🎙️ ${space.recordedAgo}</span>`;return `<div class="space-card ${il?'live':''} bg-dark-900/80 rounded-2xl p-5 cursor-pointer animate-fade-in-up" onclick="showToast('فتح المساحة: ${space.title}')"><div class="flex items-start justify-between mb-3"><div class="flex items-center gap-2">${sb}<span class="text-dark-500 text-[10px]">•</span><span class="text-dark-400 text-[10px]">${space.topic}</span></div>${ab}</div><h3 class="font-bold text-base mb-2 ${il?'text-white':'text-dark-200'}">${space.title}</h3><p class="text-dark-400 text-xs mb-3 leading-relaxed">${space.desc}</p><div class="flex items-center justify-between"><div class="flex items-center gap-3"><div class="flex -space-x-2 space-x-reverse">${sa}</div><div><p class="text-xs font-medium">${space.host}</p><p class="text-dark-500 text-[10px]">${space.speakerNames.join('، ')}</p></div></div><div class="flex items-center gap-3">${mt}${il?`<span class="flex items-center gap-1 text-dark-400 text-[10px]"><span class="iconify" data-icon="lucide:headphones" style="font-size:12px"></span>${space.listeners}</span>`:''}</div></div></div>`}).join('')}
        function switchSpaceTab(btn,filter){document.querySelectorAll('.space-tab').forEach(t=>{t.classList.remove('active','bg-red-500/20','text-red-400','bg-dark-800','text-white');t.classList.add('text-dark-400')});btn.classList.add('active');btn.classList.remove('text-dark-400');if(filter==='live')btn.classList.add('bg-red-500/20','text-red-400');else btn.classList.add('bg-dark-800','text-white');renderSpaces(filter)}

        // ===== Auto-hide on scroll =====
        (function(){let last=0;const h=()=>document.getElementById('mainHeader'),b=()=>document.querySelector('.mobile-bottom-nav');window.addEventListener('scroll',function(){if(window.innerWidth>=1024)return;const c=window.scrollY;if(c<50){h()?.classList.remove('hide-on-scroll');b()?.classList.remove('hide-on-scroll');last=c;return}if(c-last>10){h()?.classList.add('hide-on-scroll');b()?.classList.add('hide-on-scroll')}else if(last-c>10){h()?.classList.remove('hide-on-scroll');b()?.classList.remove('hide-on-scroll')}last=c},{passive:true})})();

        // ============================================================
        // ===== STORIES SYSTEM ======================================
        // ============================================================

        let storiesData = JSON.parse(localStorage.getItem('storiesData') || 'null');
        let viewedStories = JSON.parse(localStorage.getItem('viewedStories') || '[]');
        let currentStoryUserIndex = 0;
        let currentStoryIndex = 0;
        let storyTimer = null;
        let storyPaused = false;
        let storyProgressStart = 0;
        let storyProgressRAF = null;

        function getDefaultStories() {
            return [
                { id: 'user-me', name: 'أنت', avatar: 'https://picsum.photos/seed/lawyer-me/80/80.jpg', isOwn: true, stories: [] },
                { id: 'user-sara', name: 'سارة المنصوري', avatar: 'https://picsum.photos/seed/sara-legal/80/80.jpg', stories: [
                    { id: 's1', type: 'image', src: 'https://picsum.photos/seed/sara-story1/400/700.jpg', time: 'منذ ساعتين', duration: 5000 },
                    { id: 's2', type: 'text', text: 'قانون جديد صدر اليوم! 📋⚖️', bg: 'linear-gradient(135deg,#8b5cf6,#6d28d9)', time: 'منذ 3 ساعات', duration: 5000 }
                ]},
                { id: 'user-khalid', name: 'خالد العمري', avatar: 'https://picsum.photos/seed/khalid-jordan/80/80.jpg', stories: [
                    { id: 'k1', type: 'image', src: 'https://picsum.photos/seed/khalid-story1/400/700.jpg', time: 'منذ 4 ساعات', duration: 5000 },
                    { id: 'k2', type: 'image', src: 'https://picsum.photos/seed/khalid-story2/400/700.jpg', time: 'منذ 5 ساعات', duration: 5000 },
                    { id: 'k3', type: 'text', text: 'المحكمة أصدرت حكماً تاريخياً ⚖️', bg: 'linear-gradient(135deg,#06b6d4,#0891b2)', time: 'منذ 6 ساعات', duration: 5000 }
                ]},
                { id: 'user-fatima', name: 'فاطمة الحربي', avatar: 'https://picsum.photos/seed/fatima-fintech/80/80.jpg', stories: [
                    { id: 'f1', type: 'text', text: 'Fintech is the future! 💡🚀', bg: 'linear-gradient(135deg,#10b981,#059669)', time: 'منذ ساعة', duration: 5000 }
                ]},
                { id: 'user-nora', name: 'نورة القحطاني', avatar: 'https://picsum.photos/seed/nora-lawyer/80/80.jpg', stories: [
                    { id: 'n1', type: 'image', src: 'https://picsum.photos/seed/nora-story1/400/700.jpg', time: 'منذ 8 ساعات', duration: 5000 },
                    { id: 'n2', type: 'text', text: 'ورشة عمل غداً عن العقود الدولية 📝', bg: 'linear-gradient(135deg,#ec4899,#be185d)', time: 'منذ 10 ساعات', duration: 5000 }
                ]},
                { id: 'user-omar', name: 'عمر الحسيني', avatar: 'https://picsum.photos/seed/omar-judge/80/80.jpg', stories: [
                    { id: 'o1', type: 'image', src: 'https://picsum.photos/seed/omar-story1/400/700.jpg', time: 'منذ يوم', duration: 5000 }
                ]}
            ];
        }

        function initStories() {
            if (!storiesData) {
                storiesData = getDefaultStories();
                localStorage.setItem('storiesData', JSON.stringify(storiesData));
            }
            renderStoriesBar();
        }

        function saveStories() { localStorage.setItem('storiesData', JSON.stringify(storiesData)); }
        function saveViewedStories() { localStorage.setItem('viewedStories', JSON.stringify(viewedStories)); }

        function renderStoriesBar() {
            const bar = document.getElementById('storiesBar');
            if (!bar) return;
            const profile = getProfile();

            // Update "add story" avatar
            const addCard = bar.querySelector('.add-story');
            if (addCard) {
                const savedAvatar = localStorage.getItem('profileAvatar');
                if (savedAvatar) addCard.querySelector('.story-card-bg').src = savedAvatar;
            }

            // Remove old story cards (keep add-story)
            bar.querySelectorAll('.story-card:not(.add-story)').forEach(c => c.remove());

            // Render other users' stories
            storiesData.filter(u => !u.isOwn && u.stories.length > 0).forEach(user => {
                const isViewed = user.stories.every(s => viewedStories.includes(s.id));
                const firstStory = user.stories[0];

                if (firstStory.type === 'text') {
                    const card = document.createElement('div');
                    card.className = 'story-card text-story';
                    card.style.background = firstStory.bg || 'linear-gradient(135deg,#f97316,#ea580c)';
                    card.onclick = () => openStoryViewer(user.id);
                    card.innerHTML = `
                        <img src="${user.avatar}" class="story-card-avatar${isViewed ? ' viewed' : ''}" alt="">
                        <span class="story-card-text">${firstStory.text.substring(0, 60)}</span>
                        <span class="story-card-name">${user.name}</span>
                    `;
                    bar.appendChild(card);
                } else {
                    const card = document.createElement('div');
                    card.className = 'story-card';
                    card.onclick = () => openStoryViewer(user.id);
                    card.innerHTML = `
                        <img src="${firstStory.src || firstStory.data || user.avatar}" class="story-card-bg" alt="" loading="lazy">
                        <div class="story-card-overlay"></div>
                        <img src="${user.avatar}" class="story-card-avatar${isViewed ? ' viewed' : ''}" alt="">
                        <span class="story-card-name">${user.name}</span>
                    `;
                    bar.appendChild(card);
                }
            });

            // Update own story card
            const myStories = storiesData.find(u => u.isOwn);
            if (myStories && myStories.stories.length > 0) {
                addCard.onclick = () => openStoryViewer('user-me');
                const label = addCard.querySelector('.story-card-label');
                if (label) label.textContent = 'حالاتي';
            }
        }

        // ===== CREATE STORY =====
        function openCreateStory() {
            const myStories = storiesData.find(u => u.isOwn);
            if (myStories && myStories.stories.length > 0) {
                openStoryViewer('user-me');
                return;
            }
            document.getElementById('createStoryModal').classList.add('active');
        }
        function closeCreateStory(e) { if(e&&e.target!==e.currentTarget)return; document.getElementById('createStoryModal').classList.remove('active'); }

        let textStoryColor = 'linear-gradient(135deg,#f97316,#ea580c)';

        function startTextStory() {
            document.getElementById('createStoryModal').classList.remove('active');
            document.getElementById('textStoryEditor').style.display = 'flex';
            document.getElementById('textStoryEditor').classList.add('active');
            document.getElementById('textStoryInput').value = '';
            document.getElementById('textStoryPreview').style.background = textStoryColor;
            setTimeout(() => document.getElementById('textStoryInput').focus(), 300);
        }

        function closeTextStoryEditor() {
            document.getElementById('textStoryEditor').style.display = 'none';
            document.getElementById('textStoryEditor').classList.remove('active');
        }

        function setTextStoryColor(btn, color) {
            document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            textStoryColor = color;
            document.getElementById('textStoryPreview').style.background = color;
        }

        function updateTextStoryPreview() {
            // Just live update — no extra logic needed
        }

        function publishTextStory() {
            const text = document.getElementById('textStoryInput').value.trim();
            if (!text) { showToast('اكتب شيئاً أولاً'); return; }

            let myUser = storiesData.find(u => u.isOwn);
            if (!myUser) {
                myUser = { id: 'user-me', name: getProfile().name, avatar: localStorage.getItem('profileAvatar') || 'https://picsum.photos/seed/lawyer-me/80/80.jpg', isOwn: true, stories: [] };
                storiesData.unshift(myUser);
            }

            myUser.stories.push({
                id: 'story-' + Date.now(),
                type: 'text',
                text: text,
                bg: textStoryColor,
                time: 'الآن',
                duration: 5000,
                data: null
            });
            saveStories();
            closeTextStoryEditor();
            renderStoriesBar();
            showToast('تم نشر الحالة ✓');
        }

        function handleStoryImageUpload(input) {
            const file = input.files[0]; if (!file) return;
            const reader = new FileReader();
            reader.onload = function(e) {
                let myUser = storiesData.find(u => u.isOwn);
                if (!myUser) {
                    myUser = { id: 'user-me', name: getProfile().name, avatar: localStorage.getItem('profileAvatar') || 'https://picsum.photos/seed/lawyer-me/80/80.jpg', isOwn: true, stories: [] };
                    storiesData.unshift(myUser);
                }
                myUser.stories.push({
                    id: 'story-' + Date.now(),
                    type: 'image',
                    src: e.target.result,
                    data: e.target.result,
                    time: 'الآن',
                    duration: 5000
                });
                saveStories();
                document.getElementById('createStoryModal').classList.remove('active');
                renderStoriesBar();
                showToast('تم نشر الحالة ✓');
            };
            reader.readAsDataURL(file);
            input.value = '';
        }

        function handleStoryVideoUpload(input) {
            const file = input.files[0]; if (!file) return;
            if (file.size > 50 * 1024 * 1024) { showToast('الفيديو كبير جداً (max 50MB)'); return; }
            showStoryUploadProgress();
            const reader = new FileReader();
            reader.onload = function(e) {
                let myUser = storiesData.find(u => u.isOwn);
                if (!myUser) {
                    myUser = { id: 'user-me', name: getProfile().name, avatar: localStorage.getItem('profileAvatar') || 'https://picsum.photos/seed/lawyer-me/80/80.jpg', isOwn: true, stories: [] };
                    storiesData.unshift(myUser);
                }
                myUser.stories.push({
                    id: 'story-' + Date.now(),
                    type: 'video',
                    src: e.target.result,
                    data: e.target.result,
                    time: 'الآن',
                    duration: 15000
                });
                saveStories();
                document.getElementById('createStoryModal').classList.remove('active');
                renderStoriesBar();
                hideStoryUploadProgress();
                showToast('تم نشر الحالة ✓');
            };
            reader.readAsDataURL(file);
            input.value = '';
        }

        function showStoryUploadProgress() {
            const div = document.createElement('div');
            div.className = 'story-upload-progress';
            div.id = 'storyUploadProgress';
            div.innerHTML = '<div class="spinner"></div><span>جاري رفع الحالة...</span>';
            document.body.appendChild(div);
        }
        function hideStoryUploadProgress() {
            const el = document.getElementById('storyUploadProgress');
            if (el) el.remove();
        }

        // ===== STORY VIEWER =====
        function openStoryViewer(userId) {
            const userIndex = storiesData.findIndex(u => u.id === userId);
            if (userIndex === -1) return;
            const user = storiesData[userIndex];
            if (!user.stories || user.stories.length === 0) return;

            currentStoryUserIndex = userIndex;
            currentStoryIndex = 0;

            document.getElementById('storyViewer').classList.add('active');
            document.body.style.overflow = 'hidden';
            renderStoryContent();
        }

        function closeStoryViewer() {
            document.getElementById('storyViewer').classList.remove('active');
            document.body.style.overflow = '';
            clearStoryTimer();
            cancelAnimationFrame(storyProgressRAF);
        }

        function renderStoryContent() {
            const user = storiesData[currentStoryUserIndex];
            if (!user) { closeStoryViewer(); return; }
            const story = user.stories[currentStoryIndex];
            if (!story) { nextUser(); return; }

            // Mark as viewed
            if (!viewedStories.includes(story.id)) {
                viewedStories.push(story.id);
                saveViewedStories();
            }

            // Header
            document.getElementById('storyHeaderAvatar').innerHTML = `<img src="${user.avatar}" style="width:100%;height:100%;border-radius:50%;object-fit:cover">`;
            document.getElementById('storyHeaderName').textContent = user.name;
            document.getElementById('storyHeaderTime').textContent = story.time || '';

            // Progress bars
            const progressBar = document.getElementById('storyProgressBar');
            progressBar.innerHTML = user.stories.map((s, i) => {
                let cls = 'story-progress-segment';
                if (i < currentStoryIndex) cls += ' completed';
                else if (i === currentStoryIndex) cls += ' active';
                return `<div class="${cls}"><div class="story-progress-fill"></div></div>`;
            }).join('');

            // Content
            const content = document.getElementById('storyContent');
            if (story.type === 'text') {
                content.innerHTML = `<div class="text-story-view" style="background:${story.bg || 'linear-gradient(135deg,#f97316,#ea580c)'}"><p>${story.text.replace(/</g,'&lt;')}</p></div>`;
            } else if (story.type === 'video') {
                content.innerHTML = `<video src="${story.src || story.data}" autoplay muted playsinline style="width:100%;height:100%;object-fit:cover" onended="storyNext()"></video>`;
            } else {
                content.innerHTML = `<img src="${story.src || story.data}" alt="" style="width:100%;height:100%;object-fit:cover">`;
            }

            // Start progress
            startStoryProgress(story.duration || 5000);
        }

        function startStoryProgress(duration) {
            clearStoryTimer();
            cancelAnimationFrame(storyProgressRAF);
            storyPaused = false;
            storyProgressStart = Date.now();

            const fill = document.querySelector('.story-progress-segment.active .story-progress-fill');
            if (!fill) return;

            function animate() {
                if (storyPaused) {
                    storyProgressRAF = requestAnimationFrame(animate);
                    return;
                }
                const elapsed = Date.now() - storyProgressStart;
                const pct = Math.min((elapsed / duration) * 100, 100);
                fill.style.width = pct + '%';
                if (pct >= 100) {
                    storyNext();
                    return;
                }
                storyProgressRAF = requestAnimationFrame(animate);
            }
            storyProgressRAF = requestAnimationFrame(animate);
        }

        function clearStoryTimer() {
            if (storyTimer) { clearTimeout(storyTimer); storyTimer = null; }
        }

        function storyNext(e) {
            if (e) e.stopPropagation();
            cancelAnimationFrame(storyProgressRAF);
            const user = storiesData[currentStoryUserIndex];
            if (!user) return;

            if (currentStoryIndex < user.stories.length - 1) {
                currentStoryIndex++;
                renderStoryContent();
            } else {
                nextUser();
            }
        }

        function storyPrev(e) {
            if (e) e.stopPropagation();
            cancelAnimationFrame(storyProgressRAF);
            if (currentStoryIndex > 0) {
                currentStoryIndex--;
                renderStoryContent();
            } else {
                prevUser();
            }
        }

        function nextUser() {
            cancelAnimationFrame(storyProgressRAF);
            // Find next user with stories
            let nextIdx = currentStoryUserIndex + 1;
            while (nextIdx < storiesData.length && (!storiesData[nextIdx].stories || storiesData[nextIdx].stories.length === 0)) {
                nextIdx++;
            }
            if (nextIdx < storiesData.length) {
                currentStoryUserIndex = nextIdx;
                currentStoryIndex = 0;
                renderStoryContent();
            } else {
                closeStoryViewer();
                showToast('انتهت الحالات');
            }
        }

        function prevUser() {
            cancelAnimationFrame(storyProgressRAF);
            let prevIdx = currentStoryUserIndex - 1;
            while (prevIdx >= 0 && (!storiesData[prevIdx].stories || storiesData[prevIdx].stories.length === 0)) {
                prevIdx--;
            }
            if (prevIdx >= 0) {
                currentStoryUserIndex = prevIdx;
                currentStoryIndex = storiesData[prevIdx].stories.length - 1;
                renderStoryContent();
            }
        }

        function storyViewerClick(e) {
            // Long press detection for pause
            // Simple: left half = prev, right half = next (handled by nav divs)
        }

        // Touch hold to pause
        (function() {
            let holdTimer = null;
            const viewer = document.getElementById('storyViewer');
            if (!viewer) return;

            viewer.addEventListener('touchstart', (e) => {
                holdTimer = setTimeout(() => {
                    storyPaused = true;
                    // Pause video if playing
                    const video = viewer.querySelector('video');
                    if (video) video.pause();
                }, 300);
            }, { passive: true });

            viewer.addEventListener('touchend', () => {
                clearTimeout(holdTimer);
                if (storyPaused) {
                    storyPaused = false;
                    storyProgressStart = Date.now() - (parseFloat(document.querySelector('.story-progress-segment.active .story-progress-fill')?.style.width || '0') / 100) * 5000;
                    const video = viewer.querySelector('video');
                    if (video) video.play();
                }
            }, { passive: true });
        })();

        function sendStoryReply() {
            const input = document.getElementById('storyReplyInput');
            const text = input.value.trim();
            if (!text) return;
            const user = storiesData[currentStoryUserIndex];
            if (user) showToast(`تم إرسال رد إلى ${user.name} ✓`);
            input.value = '';
        }

        // ===== STORY REACTIONS & VIEWERS (Facebook-style) =====
        const storyReactionsMap = {}; // { storyId: { emoji: count } }
        const storyViewersMap = {};   // { storyId: [{ name, avatar, time, reaction }] }
        const myStoryReactions = {};  // { storyId: emoji }

        // Generate mock viewers for demo
        function generateMockViewers(storyId) {
            if (storyViewersMap[storyId]) return storyViewersMap[storyId];
            const names = [
                { name: 'سارة المنصوري', avatar: 'https://picsum.photos/seed/sara-legal/40/40.jpg' },
                { name: 'خالد العمري', avatar: 'https://picsum.photos/seed/kali-jordan/40/40.jpg' },
                { name: 'فاطمة الحربي', avatar: 'https://picsum.photos/seed/fatima-h/40/40.jpg' },
                { name: 'محمد الشعيبي', avatar: 'https://picsum.photos/seed/mohammed-ali/40/40.jpg' },
                { name: 'نورة القحطاني', avatar: 'https://picsum.photos/seed/noura-q/40/40.jpg' },
                { name: 'عبدالله السعيد', avatar: 'https://picsum.photos/seed/abdullah-s/40/40.jpg' },
                { name: 'ريم العتيبي', avatar: 'https://picsum.photos/seed/reem-o/40/40.jpg' },
                { name: 'يوسف الدوسري', avatar: 'https://picsum.photos/seed/yusuf-d/40/40.jpg' },
            ];
            const emojis = ['❤️', '👍', '😍', '😮', '😢', '', '', ''];
            const times = ['منذ دقيقتين', 'منذ 5 دقائق', 'منذ 10 دقائق', 'منذ 15 دقيقة', 'منذ 20 دقيقة', 'منذ 30 دقيقة', 'منذ ساعة', 'منذ ساعتين'];
            const shuffled = names.sort(() => Math.random() - 0.5);
            const count = Math.floor(Math.random() * 5) + 3;
            storyViewersMap[storyId] = shuffled.slice(0, count).map((u, i) => ({
                ...u,
                time: times[i] || 'منذ ساعة',
                reaction: emojis[Math.floor(Math.random() * emojis.length)]
            }));
            return storyViewersMap[storyId];
        }

        function updateStoryViewCount() {
            const user = storiesData[currentStoryUserIndex];
            if (!user) return;
            const story = user.stories[currentStoryIndex];
            if (!story) return;
            const viewers = generateMockViewers(story.id);
            const el = document.getElementById('storyViewCount');
            if (el) el.textContent = viewers.length;
        }

        function reactToStory(emoji) {
            const user = storiesData[currentStoryUserIndex];
            if (!user) return;
            const story = user.stories[currentStoryIndex];
            if (!story) return;

            // Toggle reaction
            const prevEmoji = myStoryReactions[story.id];
            if (prevEmoji === emoji) {
                // Remove reaction
                delete myStoryReactions[story.id];
                showToast('تم إزالة التفاعل');
            } else {
                myStoryReactions[story.id] = emoji;
                showToast(`تفاعل بـ ${emoji}`);
            }

            // Update button states
            document.querySelectorAll('.story-react-btn').forEach(btn => {
                if (btn.textContent.trim() === emoji && myStoryReactions[story.id] === emoji) {
                    btn.classList.add('reacted');
                } else {
                    btn.classList.remove('reacted');
                }
            });

            // Update mock viewers reaction
            const viewers = generateMockViewers(story.id);
            if (myStoryReactions[story.id]) {
                // Add/update "me" in viewers
                const meIdx = viewers.findIndex(v => v.name === 'أنت');
                if (meIdx >= 0) {
                    viewers[meIdx].reaction = myStoryReactions[story.id];
                } else {
                    viewers.unshift({
                        name: 'أنت',
                        avatar: 'https://picsum.photos/seed/lawyer-me/40/40.jpg',
                        time: 'الآن',
                        reaction: myStoryReactions[story.id]
                    });
                }
            } else {
                // Remove "me" from viewers
                const meIdx = viewers.findIndex(v => v.name === 'أنت');
                if (meIdx >= 0) viewers.splice(meIdx, 1);
            }
            updateStoryViewCount();
        }

        function showStoryViewersList() {
            const user = storiesData[currentStoryUserIndex];
            if (!user) return;
            const story = user.stories[currentStoryIndex];
            if (!story) return;

            const viewers = generateMockViewers(story.id);
            const reacted = viewers.filter(v => v.reaction);
            const allCount = viewers.length;
            const reactedCount = reacted.length;

            document.getElementById('svCountAll').textContent = allCount;
            document.getElementById('svCountReacted').textContent = reactedCount;
            document.getElementById('svCountViewed').textContent = allCount - reactedCount;

            renderStoryViewers(viewers, 'all');
            document.getElementById('storyViewersModal').classList.add('active');
        }

        function renderStoryViewers(viewers, tab) {
            const list = document.getElementById('storyViewersList');
            let filtered = viewers;
            if (tab === 'reacted') filtered = viewers.filter(v => v.reaction);
            if (tab === 'viewed') filtered = viewers.filter(v => !v.reaction);

            if (filtered.length === 0) {
                list.innerHTML = `<div style="text-align:center;padding:40px 20px;color:#737373">
                    <span class="iconify" data-icon="lucide:eye-off" style="font-size:32px;margin-bottom:8px;display:block"></span>
                    <p style="font-size:13px">لا يوجد ${tab === 'reacted' ? 'متفاعلون' : 'مشاهدون'} بعد</p>
                </div>`;
                return;
            }

            list.innerHTML = filtered.map(v => `
                <div class="story-viewer-item">
                    <img src="${v.avatar}" alt="${v.name}">
                    <div class="story-viewer-info">
                        <div class="story-viewer-name">${v.name}</div>
                        <div class="story-viewer-time">${v.time}</div>
                    </div>
                    ${v.reaction ? `<div class="story-viewer-reaction">${v.reaction}</div>` : ''}
                </div>
            `).join('');
        }

        function switchStoryViewersTab(btn, tab) {
            document.querySelectorAll('.story-viewers-tab').forEach(t => t.classList.remove('active'));
            btn.classList.add('active');
            const user = storiesData[currentStoryUserIndex];
            if (!user) return;
            const story = user.stories[currentStoryIndex];
            if (!story) return;
            const viewers = generateMockViewers(story.id);
            renderStoryViewers(viewers, tab);
        }

        function closeStoryViewersModal(e) {
            if (e && e.target !== e.currentTarget) return;
            document.getElementById('storyViewersModal').classList.remove('active');
        }
        function closeStoryViewersModalDirect() {
            document.getElementById('storyViewersModal').classList.remove('active');
        }

        // Update renderStoryContent to show view count and reaction state
        const _origRenderStoryContent = renderStoryContent;
        if (typeof renderStoryContent === 'function') {
            const _origFn = renderStoryContent;
            renderStoryContent = function() {
                _origFn();
                // Update view count after rendering
                setTimeout(() => {
                    updateStoryViewCount();
                    // Restore reaction button state
                    const user = storiesData[currentStoryUserIndex];
                    if (!user) return;
                    const story = user.stories[currentStoryIndex];
                    if (!story) return;
                    const myReact = myStoryReactions[story.id];
                    document.querySelectorAll('.story-react-btn').forEach(btn => {
                        btn.classList.toggle('reacted', btn.textContent.trim() === myReact);
                    });
                }, 100);
            };
        }

        // ============================================================
        // ===== END STORIES ==========================================
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
                btn.textContent = 'ربط';
                btn.style.borderColor = '';
                btn.style.color = '';
                btn.style.background = '';
                showToast('تم إلغاء الربط');
            } else {
                btn.classList.add('connected');
                btn.textContent = 'تم الربط ✓';
                btn.style.borderColor = 'rgba(34,197,94,0.5)';
                btn.style.color = '#22c55e';
                btn.style.background = 'rgba(34,197,94,0.1)';
                showToast('تم الربط ✓');
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
                return JSON.parse(localStorage.getItem(this._key) || '[]');
            },

            save(list) {
                localStorage.setItem(this._key, JSON.stringify(list));
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
                const saved = JSON.parse(localStorage.getItem(this._key) || '{}');
                return { ...this._defaults, ...saved };
            },
            update(key, value) {
                const s = this.get();
                s[key] = value;
                localStorage.setItem(this._key, JSON.stringify(s));
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
                        localStorage.clear();
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
                        localStorage.clear();
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
            getRegistered() { return JSON.parse(localStorage.getItem(this._key) || '[]'); },
            toggle(eventId) {
                let reg = this.getRegistered();
                if (reg.includes(eventId)) {
                    reg = reg.filter(id => id !== eventId);
                    showToast('تم إلغاء التسجيل');
                } else {
                    reg.push(eventId);
                    showToast('تم التسجيل بنجاح ✓');
                }
                localStorage.setItem(this._key, JSON.stringify(reg));
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
            getAll() { return JSON.parse(localStorage.getItem(this._key) || '[]'); },
            save(list) { localStorage.setItem(this._key, JSON.stringify(list)); },
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

        // ===== F. BOOKMARKS SYSTEM =====
        const BookmarksStore = {
            _key: 'lawbook_bookmarks',
            getIds() { return JSON.parse(localStorage.getItem(this._key) || '[]'); },
            toggle(postId) {
                let ids = this.getIds();
                if (ids.includes(postId)) {
                    ids = ids.filter(id => id !== postId);
                    showToast('تم إلغاء الحفظ');
                } else {
                    ids.push(postId);
                    showToast('تم الحفظ ✓');
                }
                localStorage.setItem(this._key, JSON.stringify(ids));
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

        // ===== J. INFINITE SCROLL =====
        let feedPage = 0;
        const feedPageSize = 5;

        function setupInfiniteScroll() {
            const loader = document.getElementById('infiniteLoader');
            if (!loader) return;

            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) loadMoreFeedPosts();
                });
            }, { threshold: 0.5 });

            observer.observe(loader);
        }

        function loadMoreFeedPosts() {
            const container = document.getElementById('page-feed');
            const searchActive = container.querySelector('.search-results-section');
            if (searchActive) return;

            const existingPosts = container.querySelectorAll('.post-card, .dynamic-post');
            const totalAvailable = allPosts.length + userPosts.length;

            if (existingPosts.length >= totalAvailable) {
                document.getElementById('infiniteLoader').style.display = 'none';
                document.getElementById('feedEnd').style.display = '';
                return;
            }

            document.getElementById('infiniteLoader').style.display = 'flex';

            // Simulate loading delay
            setTimeout(() => {
                // Load more platform posts that haven't been shown yet
                const shownCount = existingPosts.length;
                const morePosts = allPosts.slice(shownCount, shownCount + feedPageSize);

                morePosts.forEach((post, i) => {
                    const div = document.createElement('div');
                    div.className = 'dynamic-post';
                    div.innerHTML = buildPlatformPostHTML(post, shownCount + i);
                    container.insertBefore(div.firstElementChild || div, document.getElementById('infiniteLoader'));
                });

                if (shownCount + morePosts.length >= allPosts.length) {
                    document.getElementById('infiniteLoader').style.display = 'none';
                    document.getElementById('feedEnd').style.display = '';
                }
            }, 800);
        }

        // ===== K. ENHANCED INIT =====
        // Override the DOMContentLoaded to include new features
        document.addEventListener('DOMContentLoaded', function() {
            initDefaultConversations();
            initSettings();
            initEvents();
            initNotifications();

            // Render enhanced pages
            renderMessagesPage();
            renderArticlesPage();
            renderBookmarksPage();
            renderConnectionsPage();

            // Setup infinite scroll
            setupInfiniteScroll();

            // Fix article editor button
            const newArticleBtn = document.querySelector('#page-articles button');
            if (newArticleBtn) {
                newArticleBtn.onclick = showArticleEditor;
            }

            // Fix search input
            const searchInput = document.getElementById('searchInput');
            if (searchInput) {
                searchInput.onkeydown = function(e) { if (e.key === 'Enter') doSearch(); };
            }
        });

        // ===== L. ENHANCED LIKE WITH BOOKMARK TRACKING =====
        const _origToggleLike = toggleLike;
        toggleLike = function(btn, count, likesId, postId, articleEl) {
            _origToggleLike(btn, count, likesId, postId, articleEl);
            // Track likes for profile
            if (btn.classList.contains('liked')) {
                const pd = extractPostDataFromDOM(articleEl, postId);
                if (pd && !userLikes.some(p => p.id === postId)) {
                    userLikes.unshift(pd);
                    saveUserLikes();
                }
            }
        };

        // ===== M. X-STYLE FOLLOW SYSTEM (NO RE-RENDER, NO TOAST) =====
        toggleFollow = async function(btn) {
            const author = btn.dataset.author;
            const authorId = btn.dataset.authorId;
            if (!author) return;

            const icon = btn.querySelector('.iconify');
            const textEl = btn.querySelector('.follow-text');

            // Optimistic UI: update immediately
            const wasFollowing = isFollowing(author);
            if (wasFollowing) {
                followingUsers = followingUsers.filter(a => a !== author);
                btn.classList.remove('following');
                btn.style.transition = 'all 0.2s ease';
                btn.style.color = '#f97316';
                btn.style.borderColor = 'rgba(249,115,22,0.3)';
                btn.style.background = 'transparent';
                if (textEl) textEl.textContent = 'متابعة';
                if (icon) icon.setAttribute('data-icon', 'lucide:user-plus');
            } else {
                followingUsers.push(author);
                btn.classList.add('following');
                btn.style.transition = 'all 0.2s ease';
                btn.style.color = '#a3a3a3';
                btn.style.borderColor = '#404040';
                btn.style.background = 'transparent';
                if (textEl) textEl.textContent = 'متابَع';
                if (icon) icon.setAttribute('data-icon', 'lucide:check');
            }
            saveFollowing();

            // Sync with Supabase in background
            if (sbOnline && authorId) {
                try {
                    await SB.toggleFollow(authorId);
                } catch(e) {
                    // Revert on error
                    console.warn('Follow sync failed:', e);
                }
            }
        };

        // ===== N. AUTO-REFRESH MESSAGES BADGE =====
        setInterval(() => {
            const unread = MsgStore.getTotalUnread();
            // Update any message badge indicators
            const msgBtns = document.querySelectorAll('[onclick*="showPage(\'messages\')"]');
            msgBtns.forEach(btn => {
                let badge = btn.querySelector('.msg-badge');
                if (unread > 0) {
                    if (!badge) {
                        badge = document.createElement('span');
                        badge.className = 'msg-badge absolute -top-1 -left-1 w-4 h-4 bg-brand-500 rounded-full text-[9px] flex items-center justify-center font-bold';
                        btn.style.position = 'relative';
                        btn.appendChild(badge);
                    }
                    badge.textContent = unread;
                } else if (badge) {
                    badge.remove();
                }
            });
        }, 5000);

        // ===== O. ENHANCED STORIES - FIX PUBLISH =====
        function publishTextStory() {
            const text = document.getElementById('textStoryInput').value.trim();
            if (!text) { showToast('اكتب شيئاً أولاً'); return; }

            let myUser = storiesData.find(u => u.isOwn);
            if (!myUser) {
                myUser = { id: 'user-me', name: getProfile().name, avatar: localStorage.getItem('profileAvatar') || 'https://picsum.photos/seed/lawyer-me/80/80.jpg', isOwn: true, stories: [] };
                storiesData.unshift(myUser);
            }

            myUser.stories.push({
                id: 'story-' + Date.now(),
                type: 'text',
                text: text,
                bg: textStoryColor,
                time: 'الآن',
                duration: 5000,
                data: null
            });
            saveStories();
            closeTextStoryEditor();
            renderStoriesBar();
            showToast('تم نشر الحالة ✓');
        }
