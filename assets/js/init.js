
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
