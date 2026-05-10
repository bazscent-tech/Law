        // ===== Init — Real Auth Mode =====
        document.addEventListener('DOMContentLoaded', async () => {
            // تهيئة Supabase
            await initSupabase();

            // محاولة استعادة الجلسة الحقيقية
            const hasSession = await Auth.init();

            if (hasSession && Auth.isLoggedIn()) {
                console.log('✅ Authenticated:', sbProfile?.name || sbProfile?.display_name || sbUser?.id);
                await initAppForUser();
            } else {
                // لا توجد جلسة — إظهار شاشة تسجيل الدخول
                console.log('🔒 No session — showing auth screen');
                AuthUI.show();
            }
        });

        // Called after successful auth (not used in real auth — page reloads)
        async function onAuthSuccess() {
            await initAppForUser();
        }

        // Initialize all app modules for current user
        async function initAppForUser() {
            loadSavedImages();
            loadProfile();
            renderTrendingList('all');
            renderFollowingPosts();
            renderSpaces('live');
            updateNotifDots();
            renderProfilePosts();
            hideStaticPosts();
            renderFeedPosts();

            // Update UI with real user data
            updateUIWithRealProfile();

            // Initialize enhanced features
            initDefaultConversations();
            initSettings();
            initEvents();
            initNotifications();

            // Render enhanced pages
            renderMessagesPage();
            renderArticlesPage();
            renderBookmarksPage();
            renderConnectionsPage();

            // Initialize SPA system
            Router.init();
            PullToRefresh.init();
            NotifPTR.init();
            initStories();

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

        // ===== Update UI with real profile data =====
        function updateUIWithRealProfile() {
            if (!sbProfile) return;

            const name = sbProfile.name || sbProfile.display_name || 'مستخدم';
            const username = sbProfile.username ? '@' + sbProfile.username : '';
            const avatar = sbProfile.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}&backgroundColor=f97316&textColor=ffffff`;
            const title = sbProfile.title || '';
            const location = sbProfile.location || '';
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
            if (sF) sF.textContent = (sbProfile.followers_count || 0).toLocaleString('ar');
            if (sG) sG.textContent = (sbProfile.following_count || 0).toLocaleString('ar');
            if (sP) sP.textContent = (sbProfile.posts_count || 0).toLocaleString('ar');

            // Update mobile drawer
            const mdName = document.getElementById('mobileDrawerName');
            const mdUser = document.getElementById('mobileDrawerUsername');
            const mdFoll = document.getElementById('mobileDrawerFollowers');
            const mdFing = document.getElementById('mobileDrawerFollowing');
            if (mdName) mdName.textContent = name;
            if (mdUser) mdUser.textContent = username;
            if (mdFoll) mdFoll.textContent = (sbProfile.followers_count || 0).toLocaleString('ar');
            if (mdFing) mdFing.textContent = (sbProfile.following_count || 0).toLocaleString('ar');

            // Update settings page
            const sName = document.getElementById('settingsName');
            const sEmail = document.getElementById('settingsEmail');
            if (sName) sName.textContent = name;
            if (sEmail) sEmail.textContent = sbUser?.email || '-';
        }

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
