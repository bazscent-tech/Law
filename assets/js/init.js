        // ===== Init — Real Auth Mode =====
        document.addEventListener('DOMContentLoaded', async () => {
            // ⚡ STEP 1: فوري — اقرأ الكاش المحلي وحدّث الواجهة قبل أي طلب شبكة
            const cachedProfile = _instantCacheRestore();

            // ⚡ STEP 2: تهيئة Supabase (شبكة)
            await initSupabase();

            // ⚡ STEP 3: محاولة استعادة الجلسة
            const hasSession = await Auth.init();

            if (hasSession && Auth.isLoggedIn()) {
                console.log('✅ Authenticated:', sbProfile?.name || sbProfile?.display_name || sbUser?.id);
                await initAppForUser();

                // ⚡ STEP 4: حدّث الواجهة بالبيانات الطازجة من السيرفر
                updateUIWithRealProfile();
            } else {
                // لا توجد جلسة — إظهار شاشة تسجيل الدخول
                console.log('🔒 No session — showing auth screen');
                // إذا كان فيه كاش قديم، نظّفه
                if (cachedProfile) {
                    _clearCachedUI();
                }
                AuthUI.show();
            }
        });

        // ⚡ استعادة فورية من الكاش — تُنفّذ قبل أي طلب شبكة
        function _instantCacheRestore() {
            try {
                // ابحث عن أي بروفايل مخزن (المفتاح: auth_profile_{uuid})
                const allKeys = Object.keys(localStorage);
                const profileKey = allKeys.find(k => k.startsWith('auth_profile_'));
                if (!profileKey) return null;

                const cached = Safe.getJSON(profileKey, null);
                if (!cached || !cached.name) return null;

                // استخدم نفس دالة التحديث لكن مع بيانات الكاش
                const name = cached.name || cached.display_name || 'مستخدم';
                const avatar = cached.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}&backgroundColor=f97316&textColor=ffffff`;

                // حدّث كل الصور فوراً
                ['mobileAvatar', 'sidebarAvatar', 'desktopAvatar', 'mobileDrawerAvatar',
                 'postCreatorAvatar', 'profilePageAvatar', 'storyCreatorAvatar', 'modalPostAvatar'].forEach(id => {
                    const el = document.getElementById(id);
                    if (el) el.src = avatar;
                });

                // حدّث الأسماء فوراً
                const headerName = document.getElementById('headerUserName');
                if (headerName) headerName.textContent = name;

                const sidebarName = document.getElementById('sidebarName');
                if (sidebarName) sidebarName.textContent = name;

                const mdName = document.getElementById('mobileDrawerName');
                if (mdName) mdName.textContent = name;

                const ppName = document.getElementById('profileDisplayName');
                if (ppName) ppName.textContent = name;

                const sName = document.getElementById('settingsName');
                if (sName) sName.textContent = name;

                // username
                const username = cached.username ? '@' + cached.username : '';
                const mdUser = document.getElementById('mobileDrawerUsername');
                if (mdUser) mdUser.textContent = username;

                // counts
                const sF = document.getElementById('sidebarFollowers');
                const sG = document.getElementById('sidebarFollowing');
                const sP = document.getElementById('sidebarPosts');
                if (sF) sF.textContent = (cached.followers_count || 0).toLocaleString('ar');
                if (sG) sG.textContent = (cached.following_count || 0).toLocaleString('ar');
                if (sP) sP.textContent = (cached.posts_count || 0).toLocaleString('ar');

                const mdFoll = document.getElementById('mobileDrawerFollowers');
                const mdFing = document.getElementById('mobileDrawerFollowing');
                if (mdFoll) mdFoll.textContent = (cached.followers_count || 0).toLocaleString('ar');
                if (mdFing) mdFing.textContent = (cached.following_count || 0).toLocaleString('ar');

                console.log('⚡ Instant cache restore:', name);
                return cached;
            } catch (e) {
                console.warn('[Cache] Instant restore failed:', e.message);
                return null;
            }
        }

        // مسح الواجهة عند عدم وجود جلسة
        function _clearCachedUI() {
            const defaultName = 'مستخدم';
            const defaultAvatar = 'https://api.dicebear.com/7.x/initials/svg?seed=User&backgroundColor=f97316&textColor=ffffff';

            ['mobileAvatar', 'sidebarAvatar', 'desktopAvatar', 'mobileDrawerAvatar',
             'postCreatorAvatar', 'profilePageAvatar', 'storyCreatorAvatar', 'modalPostAvatar'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.src = defaultAvatar;
            });

            ['headerUserName', 'sidebarName', 'mobileDrawerName', 'profileDisplayName', 'settingsName'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.textContent = defaultName;
            });
        }

        // Called after successful auth (not used in real auth — page reloads)
        async function onAuthSuccess() {
            await initAppForUser();
        }

        // Initialize all app modules for current user
        async function initAppForUser() {
            if (!Auth.isLoggedIn()) { AuthUI.show(); return; }

            // ⚡ المرحلة 1: فوري — UI محلي فقط (لا شبكة)
            loadSavedImages();
            loadProfile();
            updateUIWithRealProfile();
            hideStaticPosts();
            updateNotifDots();

            // ⚡ المرحلة 2: تهيئة الـ SPA والميزات المحلية (لا تنتظر)
            Router.init();
            NotifPTR.init();
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

            // Initialize enhanced features (sync, fast)
            initDefaultConversations();
            initSettings();
            initEvents();
            initNotifications();

            // Render local pages (sync, fast)
            renderTrendingList('all');
            renderSpaces('live');
            renderMessagesPage();
            renderArticlesPage();
            renderBookmarksPage();
            renderConnectionsPage();

            // ⚡ المرحلة 3: طلبات شبكية — بالتوازي (لا ت阻塞 الواجهة)
            Promise.allSettled([
                renderFeedPosts(),
                renderFollowingPosts(),
                renderProfilePosts(),
                initStories()
            ]).then(() => {
                console.log('✅ Background data loaded');
            });

            // Initialize Library module
            if (typeof Library !== 'undefined') {
                Library.init();
                const uid = sbUser?.id || 'local';
                Library.fetchLibraries(uid);
            }

            // Restore state (if returning from refresh)
            const restored = AppState.restore();
            if (restored) {
                // State was restored, skip default scroll-to-top
            }
        }

        // ===== Infinite Scroll =====
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
            const searchActive = container?.querySelector('.search-results-section');
            if (searchActive) return;
            const existingPosts = container?.querySelectorAll('.post-card, .dynamic-post');
            const totalAvailable = allPosts.length + (typeof userPosts !== 'undefined' ? userPosts.length : 0);
            if (!existingPosts || existingPosts.length >= totalAvailable) {
                const loader = document.getElementById('infiniteLoader');
                if (loader) loader.style.display = 'none';
                const feedEnd = document.getElementById('feedEnd');
                if (feedEnd) feedEnd.style.display = '';
                return;
            }
            const loader = document.getElementById('infiniteLoader');
            if (loader) loader.style.display = 'flex';
            setTimeout(() => {
                const shownCount = existingPosts.length;
                const morePosts = allPosts.slice(shownCount, shownCount + feedPageSize);
                morePosts.forEach((post, i) => {
                    const div = document.createElement('div');
                    div.className = 'dynamic-post';
                    div.innerHTML = buildPlatformPostHTML(post, shownCount + i);
                    container.insertBefore(div.firstElementChild || div, loader);
                });
                if (shownCount + morePosts.length >= allPosts.length) {
                    if (loader) loader.style.display = 'none';
                    const feedEnd = document.getElementById('feedEnd');
                    if (feedEnd) feedEnd.style.display = '';
                }
            }, 800);
        }

        // ===== Update UI with real profile data =====
        function updateUIWithRealProfile() {
            const p = window.sbProfile;
            if (!p) return;

            const name = p.name || p.display_name || 'مستخدم';
            const username = p.username ? '@' + p.username : '';
            const avatar = p.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}&backgroundColor=f97316&textColor=ffffff`;
            const title = p.title || '';
            const location = p.location || '';
            const subtitle = (title || location) ? `${title}${title && location ? ' • ' : ''}${location}` : username;

            // Update all avatars
            ['mobileAvatar', 'sidebarAvatar', 'desktopAvatar', 'mobileDrawerAvatar', 'postCreatorAvatar', 'profilePageAvatar', 'storyCreatorAvatar', 'modalPostAvatar'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.src = avatar;
            });

            // Update header user name
            const headerName = document.getElementById('headerUserName');
            if (headerName) headerName.textContent = name;

            // Update desktop sidebar
            const sidebarName = document.getElementById('sidebarName');
            const sidebarSub = document.getElementById('sidebarSubtitle');
            if (sidebarName) sidebarName.textContent = name;
            if (sidebarSub) sidebarSub.textContent = subtitle;

            // Update sidebar counts
            const sF = document.getElementById('sidebarFollowers');
            const sG = document.getElementById('sidebarFollowing');
            const sP = document.getElementById('sidebarPosts');
            if (sF) sF.textContent = (p.followers_count || 0).toLocaleString('ar');
            if (sG) sG.textContent = (p.following_count || 0).toLocaleString('ar');
            if (sP) sP.textContent = (p.posts_count || 0).toLocaleString('ar');

            // Update mobile drawer
            const mdName = document.getElementById('mobileDrawerName');
            const mdUser = document.getElementById('mobileDrawerUsername');
            const mdFoll = document.getElementById('mobileDrawerFollowers');
            const mdFing = document.getElementById('mobileDrawerFollowing');
            if (mdName) mdName.textContent = name;
            if (mdUser) mdUser.textContent = username;
            if (mdFoll) mdFoll.textContent = (p.followers_count || 0).toLocaleString('ar');
            if (mdFing) mdFing.textContent = (p.following_count || 0).toLocaleString('ar');

            // Update settings page
            const sName = document.getElementById('settingsName');
            const sEmail = document.getElementById('settingsEmail');
            if (sName) sName.textContent = name;
            if (sEmail) sEmail.textContent = sbUser?.email || '-';

            // Update profile page
            const ppName = document.getElementById('profileDisplayName');
            const ppSub = document.getElementById('profileSubtitle');
            const ppBio = document.getElementById('profileBio');
            const ppLoc = document.getElementById('profileLocation');
            const ppWeb = document.getElementById('profileWebsite');
            if (ppName) ppName.textContent = name;
            if (ppSub) ppSub.textContent = subtitle;
            if (ppBio) ppBio.textContent = p.bio || '';
            if (ppLoc) ppLoc.textContent = p.location || '';
            if (ppWeb) ppWeb.textContent = p.website || '';
        }

        // ⚡ toggleConnect is defined in features.js — no duplicate here
