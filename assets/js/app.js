        // ===== Image Upload Handlers =====
        function handleProfilePhotoUpload(input, ...imgIds) {
            const file = input.files[0];
            if (!file) return;
            if (!file.type.startsWith('image/')) {
                showToast('يرجى اختيار صورة فقط');
                return;
            }
            const reader = new FileReader();
            reader.onload = function(e) {
                imgIds.forEach(id => {
                    const el = document.getElementById(id);
                    if (el) el.src = e.target.result;
                });
                // Save to localStorage
                localStorage.setItem('profileAvatar', e.target.result);
                showToast('تم تحديث الصورة الشخصية ✓');
            };
            reader.readAsDataURL(file);
        }

        function handleCoverUpload(input) {
            const file = input.files[0];
            if (!file) return;
            if (!file.type.startsWith('image/')) {
                showToast('يرجى اختيار صورة فقط');
                return;
            }
            const reader = new FileReader();
            reader.onload = function(e) {
                const img = document.getElementById('coverPhoto');
                const gradient = img.previousElementSibling?.previousElementSibling || img.parentElement;
                if (img) {
                    img.src = e.target.result;
                    img.classList.remove('hidden');
                    // Hide gradient background
                    img.parentElement.style.background = 'none';
                }
                localStorage.setItem('coverPhoto', e.target.result);
                showToast('تم تحديث صورة الغلاف ✓');
            };
            reader.readAsDataURL(file);
        }

        // Load saved images on startup
        function loadSavedImages() {
            const savedAvatar = localStorage.getItem('profileAvatar');
            if (savedAvatar) {
                ['mobileAvatar', 'sidebarAvatar', 'desktopAvatar'].forEach(id => {
                    const el = document.getElementById(id);
                    if (el) el.src = savedAvatar;
                });
            }
            const savedCover = localStorage.getItem('coverPhoto');
            if (savedCover) {
                const img = document.getElementById('coverPhoto');
                if (img) {
                    img.src = savedCover;
                    img.classList.remove('hidden');
                    img.parentElement.style.background = 'none';
                }
            }
        }

        // ===== Toast Notification =====
        function showToast(message) {
            const toast = document.getElementById('toast');
            toast.textContent = message;
            toast.classList.add('show');
            setTimeout(() => toast.classList.remove('show'), 2500);
        }

        // ===== Following State (localStorage) =====
        let followingUsers = JSON.parse(localStorage.getItem('followingUsers') || '[]');

        function saveFollowing() {
            localStorage.setItem('followingUsers', JSON.stringify(followingUsers));
        }

        function isFollowing(author) {
            return followingUsers.includes(author);
        }

        // ===== Toggle Follow =====
        function toggleFollow(btn) {
            const author = btn.dataset.author;
            if (!author) return;

            if (isFollowing(author)) {
                // Unfollow
                followingUsers = followingUsers.filter(a => a !== author);
                saveFollowing();
                showToast('تم إلغاء المتابعة');
            } else {
                // Follow
                followingUsers.push(author);
                saveFollowing();
                btn.style.transform = 'scale(1.1)';
                setTimeout(() => btn.style.transform = '', 200);
                showToast('تمت المتابعة ✓');
            }

            // Re-render both pages
            renderFeedPosts();
            renderFollowingPosts();
        }

        // ===== Page Navigation =====
        function showPage(page) {
            document.querySelectorAll('.page-content').forEach(p => p.classList.add('hidden'));
            const target = document.getElementById('page-' + page);
            if (target) {
                target.classList.remove('hidden');
            }
            // Render profile posts when showing profile page
            if (page === 'profile') {
                renderProfilePosts();
            }
            // Update sidebar active state
            document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
            const links = document.querySelectorAll('.sidebar-link');
            links.forEach(l => {
                if (l.textContent.includes(getPageLabel(page))) {
                    l.classList.add('active');
                }
            });
            // Scroll to top
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }

        function getPageLabel(page) {
            const map = {
                'feed': 'الرئيسية',
                'profile': 'ملفي الشخصي',
                'connections': 'الروابط',
                'bookmarks': 'المحفوظات',
                'articles': 'مقالاتي',
                'events': 'الفعاليات',
                'certificates': 'الشهادات',
                'notifications': 'الإشعارات',
                'messages': 'الرسائل',
                'settings': 'الإعدادات',
                'following': 'أتابع',
                'audio-spaces': 'المساحات الصوتية',
                'trending': 'المواضيع الرائجة'
            };
            return map[page] || '';
        }

        // ===== Search =====
        function doSearch() {
            const q = document.getElementById('searchInput').value.trim();
            if (q) showToast('بحث عن: ' + q);
        }

        // ===== Mobile Menu (X-style left drawer) =====
        function openMobileMenu() {
            const overlay = document.getElementById('mobileMenuOverlay');
            const drawer = document.getElementById('mobileDrawer');
            overlay.classList.add('open');
            drawer.style.transform = '';
            document.body.style.overflow = 'hidden';
        }

        function closeMobileMenu() {
            const overlay = document.getElementById('mobileMenuOverlay');
            const drawer = document.getElementById('mobileDrawer');
            overlay.classList.remove('open');
            drawer.style.transform = '';
            document.body.style.overflow = '';
        }

        // Swipe gestures: right edge → open, swipe right → close
        (function() {
            let startX = 0, startY = 0, currentX = 0, currentY = 0;
            let isDragging = false, dragType = null;
            let moved = false;
            const EDGE = 50; // wider edge zone (from right)
            const OPEN_THRESHOLD = 40; // px to trigger open
            const CLOSE_THRESHOLD = 50; // px to trigger close
            const DEADZONE = 15; // ignore small vertical movement

            const overlay = () => document.getElementById('mobileMenuOverlay');
            const drawer = () => document.getElementById('mobileDrawer');
            const isOpen = () => overlay()?.classList.contains('open');
            const isMobile = () => window.innerWidth < 1024;

            document.addEventListener('touchstart', function(e) {
                if (!isMobile()) return;
                const t = e.touches[0];
                startX = t.clientX;
                startY = t.clientY;
                currentX = startX;
                currentY = startY;
                moved = false;
                const screenWidth = window.innerWidth;

                // Swipe from right edge → OPEN
                if (!isOpen() && startX > screenWidth - EDGE) {
                    isDragging = true;
                    dragType = 'open';
                    drawer().style.transition = 'none';
                }
                // Swipe anywhere on drawer → CLOSE
                else if (isOpen()) {
                    isDragging = true;
                    dragType = 'close';
                    drawer().style.transition = 'none';
                }
            }, { passive: true });

            document.addEventListener('touchmove', function(e) {
                if (!isDragging || !isMobile()) return;
                const t = e.touches[0];
                currentX = t.clientX;
                currentY = t.clientY;
                moved = true;

                const dx = currentX - startX; // negative when swiping left
                const dy = Math.abs(currentY - startY);

                // Cancel if vertical scroll wins (only for open)
                if (dragType === 'open' && dy > Math.abs(dx) && dy > DEADZONE) {
                    isDragging = false;
                    drawer().style.transition = '';
                    overlay().style.opacity = '';
                    overlay().style.visibility = '';
                    return;
                }

                // Open: swipe left (dx < 0) pulls drawer from right
                if (dragType === 'open' && dx < 0) {
                    const dWidth = drawer().offsetWidth || 280;
                    const translate = Math.max(0, dWidth + dx);
                    drawer().style.transform = `translateX(${translate}px)`;
                    const progress = Math.min(1, Math.abs(dx) / dWidth);
                    overlay().style.opacity = String(progress * 0.5);
                    if (progress > 0.02) overlay().style.visibility = 'visible';
                }
                // Close: swipe right (dx > 0) pushes drawer back to right
                else if (dragType === 'close' && dx > 0) {
                    const dWidth = drawer().offsetWidth || 280;
                    drawer().style.transform = `translateX(${dx}px)`;
                    const progress = Math.min(1, dx / dWidth);
                    overlay().style.opacity = String(0.5 - progress * 0.5);
                }
            }, { passive: true });

            document.addEventListener('touchend', function() {
                if (!isDragging || !isMobile()) return;

                drawer().style.transition = '';
                overlay().style.opacity = '';
                overlay().style.visibility = '';

                const dx = currentX - startX;

                if (dragType === 'open') {
                    if (moved && dx < -OPEN_THRESHOLD) {
                        openMobileMenu();
                    } else {
                        // Not enough → reset
                        drawer().style.transform = '';
                        overlay().style.visibility = 'hidden';
                    }
                } else if (dragType === 'close') {
                    if (moved && dx > CLOSE_THRESHOLD) {
                        closeMobileMenu();
                    } else {
                        // Not enough → snap back
                        openMobileMenu();
                    }
                }

                isDragging = false;
                dragType = null;
            }, { passive: true });
        })();

        // ===== Post Input Placeholder =====
        function handlePostInput(el) {
            if (el.textContent.trim() === '') {
                el.style.color = '';
            } else {
                el.style.color = '#fff';
            }
        }
        const postInput = document.getElementById('postInput');
        if (postInput) {
            const style = document.createElement('style');
            style.textContent = `#postInput:empty::before { content: attr(data-placeholder); color: #525252; pointer-events: none; }`;
            document.head.appendChild(style);
        }

        // ===== Publish Post =====
        let userPostCounter = 0;
        let userPosts = JSON.parse(localStorage.getItem('userPosts') || '[]');

        function saveUserPosts() {
            localStorage.setItem('userPosts', JSON.stringify(userPosts));
        }

        function renderProfilePosts() {
            const container = document.getElementById('profilePostsList');
            const emptyState = document.getElementById('profileEmptyState');
            if (!container) return;

            if (userPosts.length === 0) {
                container.innerHTML = '';
                if (emptyState) emptyState.style.display = '';
                return;
            }

            if (emptyState) emptyState.style.display = 'none';
            const profile = getProfile();
            container.innerHTML = userPosts.map((post, i) => {
                const tagsHTML = (post.tags || []).map(t => {
                    const colors = ['brand', 'blue', 'purple', 'green', 'cyan', 'pink', 'yellow'];
                    const color = colors[Math.abs(t.charCodeAt(1)) % colors.length];
                    return `<span class="hashtag bg-${color}-500/10 text-${color}-400 text-xs font-medium px-3 py-1 rounded-full cursor-pointer transition-all" onclick="showToast('تصفية: ${t}')">${t}</span>`;
                }).join('');

                return `
                <article class="post-card bg-dark-900/80 border border-dark-800/50 rounded-2xl mb-5 transition-all duration-300 animate-fade-in-up overflow-hidden">
                    <div class="p-5 pb-0">
                        <div class="flex items-start justify-between mb-3">
                            <div class="flex items-center gap-3 cursor-pointer" onclick="showPage('profile')">
                                <img src="https://picsum.photos/seed/lawyer-me/80/80.jpg" class="w-11 h-11 rounded-xl object-cover border border-dark-700" alt="">
                                <div>
                                    <div class="flex items-center gap-2">
                                        <h3 class="font-semibold text-sm">${profile.name}</h3>
                                        <span class="iconify text-brand-500 text-sm" data-icon="lucide:badge-check"></span>
                                    </div>
                                    <p class="text-dark-400 text-xs">${profile.title} • ${post.time}</p>
                                </div>
                            </div>
                            <button class="p-2.5 rounded-xl hover:bg-dark-800/50 transition-all group" onclick="showPostMenu(this)">
                                <span class="iconify text-lg text-dark-400 group-hover:text-dark-200 transition-colors" data-icon="lucide:more-horizontal"></span>
                            </button>
                        </div>
                        <div class="mb-3">
                            <p class="text-dark-200 text-sm leading-relaxed">${post.displayText}</p>
                        </div>
                        ${post.tags && post.tags.length > 0 ? `<div class="flex flex-wrap gap-2 mb-4">${tagsHTML}</div>` : ''}
                    </div>
                    <div class="px-5 pb-2">
                        <div class="flex items-center justify-between text-dark-400 text-xs mb-2">
                            <span id="profile-likes-${post.id}">${post.likes} إعجاب</span>
                            <span>${post.comments} تعليق • ${post.shares} مشاركة</span>
                        </div>
                    </div>
                    <div class="border-t border-dark-800/50 px-2 py-1">
                        <div class="flex items-center justify-around">
                            <button class="like-btn flex items-center gap-2 px-4 py-2.5 rounded-xl hover:bg-dark-800/50 transition-all group" onclick="toggleLike(this, ${post.likes}, 'profile-likes-${post.id}')">
                                <span class="iconify text-lg text-dark-400 group-hover:text-red-400 transition-colors" data-icon="lucide:heart"></span>
                                <span class="text-sm text-dark-400 group-hover:text-red-400 transition-colors like-count">${post.likes}</span>
                            </button>
                            <button class="flex items-center gap-2 px-4 py-2.5 rounded-xl hover:bg-dark-800/50 transition-all group" onclick="showToast('التعليقات')">
                                <span class="iconify text-lg text-dark-400 group-hover:text-blue-400 transition-colors" data-icon="lucide:message-circle"></span>
                                <span class="text-sm text-dark-400 group-hover:text-blue-400 transition-colors">${post.comments}</span>
                            </button>
                            <button class="flex items-center gap-2 px-4 py-2.5 rounded-xl hover:bg-dark-800/50 transition-all group" onclick="showShareModal()">
                                <span class="iconify text-lg text-dark-400 group-hover:text-green-400 transition-colors" data-icon="lucide:share-2"></span>
                                <span class="text-sm text-dark-400 group-hover:text-green-400 transition-colors">${post.shares}</span>
                            </button>
                            <button class="bookmark-btn flex items-center gap-2 px-4 py-2.5 rounded-xl hover:bg-dark-800/50 transition-all group" onclick="toggleBookmark(this)">
                                <span class="iconify text-lg text-dark-400 group-hover:text-brand-400 transition-colors" data-icon="lucide:bookmark"></span>
                            </button>
                            <button class="p-2.5 rounded-xl hover:bg-dark-800/50 transition-all group" onclick="showPostMenu(this)">
                                <span class="iconify text-lg text-dark-400 group-hover:text-dark-200 transition-colors" data-icon="lucide:more-horizontal"></span>
                            </button>
                        </div>
                    </div>
                </article>`;
            }).join('');
        }

        function publishPost() {
            const input = document.getElementById('postInput');
            const text = input.textContent.trim();
            if (text === '') {
                showToast('اكتب شيئاً قبل النشر');
                return;
            }
            addPostToFeed(text);
            input.textContent = '';
            input.style.color = '';
            showToast('تم نشر المنشور بنجاح ✓');
        }

        function publishModalPost() {
            const textarea = document.getElementById('modalPostText');
            const text = textarea.value.trim();
            if (!text) {
                showToast('اكتب شيئاً قبل النشر');
                return;
            }
            addPostToFeed(text);
            textarea.value = '';
            closePostModal();
            showToast('تم نشر المنشور بنجاح ✓');
        }

        function addPostToFeed(text) {
            userPostCounter++;
            const postId = 'user-' + userPostCounter;
            const profile = getProfile();
            const now = new Date();
            const timeStr = 'الآن';

            // Extract hashtags
            const hashtagRegex = /#[\u0600-\u06FFa-zA-Z0-9_]+/g;
            const tags = text.match(hashtagRegex) || [];
            const tagsHTML = tags.map(t => {
                const colors = ['brand', 'blue', 'purple', 'green', 'cyan', 'pink', 'yellow'];
                const color = colors[Math.abs(t.charCodeAt(1)) % colors.length];
                return `<span class="hashtag bg-${color}-500/10 text-${color}-400 text-xs font-medium px-3 py-1 rounded-full cursor-pointer transition-all" onclick="showToast('تصفية: ${t}')">${t}</span>`;
            }).join('');

            // Clean text for display
            const displayText = text.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');

            const article = document.createElement('article');
            article.className = 'post-card bg-dark-900/80 border border-dark-800/50 rounded-2xl mb-5 transition-all duration-300 animate-fade-in-up overflow-hidden';
            article.innerHTML = `
                <div class="p-5 pb-0">
                    <div class="flex items-start justify-between mb-3">
                        <div class="flex items-center gap-3 cursor-pointer" onclick="showPage('profile')">
                            <img src="https://picsum.photos/seed/lawyer-me/80/80.jpg" class="w-11 h-11 rounded-xl object-cover border border-dark-700" alt="">
                            <div>
                                <div class="flex items-center gap-2">
                                    <h3 class="font-semibold text-sm">${profile.name}</h3>
                                    <span class="iconify text-brand-500 text-sm" data-icon="lucide:badge-check"></span>
                                </div>
                                <p class="text-dark-400 text-xs">${profile.title} • ${timeStr}</p>
                            </div>
                        </div>
                        <button class="p-2.5 rounded-xl hover:bg-dark-800/50 transition-all group" onclick="showPostMenu(this)">
                            <span class="iconify text-lg text-dark-400 group-hover:text-dark-200 transition-colors" data-icon="lucide:more-horizontal"></span>
                        </button>
                    </div>
                    <div class="mb-3">
                        <p class="text-dark-200 text-sm leading-relaxed">${displayText}</p>
                    </div>
                    ${tags.length > 0 ? `<div class="flex flex-wrap gap-2 mb-4">${tagsHTML}</div>` : ''}
                </div>
                <div class="px-5 pb-2">
                    <div class="flex items-center justify-between text-dark-400 text-xs mb-2">
                        <span id="likes-${postId}">0 إعجاب</span>
                        <span>0 تعليق • 0 مشاركة</span>
                    </div>
                </div>
                <div class="border-t border-dark-800/50 px-2 py-1">
                    <div class="flex items-center justify-around">
                        <button class="like-btn flex items-center gap-2 px-4 py-2.5 rounded-xl hover:bg-dark-800/50 transition-all group" onclick="toggleLike(this, 0, 'likes-${postId}')">
                            <span class="iconify text-lg text-dark-400 group-hover:text-red-400 transition-colors" data-icon="lucide:heart"></span>
                            <span class="text-sm text-dark-400 group-hover:text-red-400 transition-colors like-count">0</span>
                        </button>
                        <button class="flex items-center gap-2 px-4 py-2.5 rounded-xl hover:bg-dark-800/50 transition-all group" onclick="toggleComments('${postId}')">
                            <span class="iconify text-lg text-dark-400 group-hover:text-blue-400 transition-colors" data-icon="lucide:message-circle"></span>
                            <span class="text-sm text-dark-400 group-hover:text-blue-400 transition-colors">0</span>
                        </button>
                        <button class="flex items-center gap-2 px-4 py-2.5 rounded-xl hover:bg-dark-800/50 transition-all group" onclick="showShareModal()">
                            <span class="iconify text-lg text-dark-400 group-hover:text-green-400 transition-colors" data-icon="lucide:share-2"></span>
                            <span class="text-sm text-dark-400 group-hover:text-green-400 transition-colors">0</span>
                        </button>
                        <button class="bookmark-btn flex items-center gap-2 px-4 py-2.5 rounded-xl hover:bg-dark-800/50 transition-all group" onclick="toggleBookmark(this)">
                            <span class="iconify text-lg text-dark-400 group-hover:text-brand-400 transition-colors" data-icon="lucide:bookmark"></span>
                        </button>
                        <button class="p-2.5 rounded-xl hover:bg-dark-800/50 transition-all group" onclick="showPostMenu(this)">
                            <span class="iconify text-lg text-dark-400 group-hover:text-dark-200 transition-colors" data-icon="lucide:more-horizontal"></span>
                        </button>
                    </div>
                </div>
                <div class="comment-section px-5 pb-4" id="comments-${postId}">
                    <div class="border-t border-dark-800/50 pt-3 space-y-3">
                        <div class="flex gap-2">
                            <input type="text" placeholder="اكتب تعليقاً..." class="flex-1 bg-dark-800 border border-dark-700/50 rounded-lg px-3 py-2 text-xs text-white placeholder-dark-400 focus:outline-none focus:border-brand-500/50 transition-all">
                            <button class="bg-brand-500 hover:bg-brand-600 text-white text-xs px-3 py-2 rounded-lg transition-all" onclick="showToast('تم إرسال التعليق ✓')">إرسال</button>
                        </div>
                    </div>
                </div>
            `;

            // Insert at top of feed
            const feedPage = document.getElementById('page-feed');
            const firstPost = feedPage.querySelector('.post-card, .dynamic-post');
            if (firstPost) {
                feedPage.insertBefore(article, firstPost);
            } else {
                const loader = document.getElementById('infiniteLoader');
                feedPage.insertBefore(article, loader);
            }

            // Save to userPosts for profile page
            userPosts.unshift({
                id: postId,
                text: text,
                displayText: displayText,
                tags: tags,
                time: timeStr,
                likes: 0,
                comments: 0,
                shares: 0
            });
            saveUserPosts();

            // Scroll to the new post
            article.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }

        // ===== Like Toggle =====
        function toggleLike(btn, count, likesId) {
            const isLiked = btn.classList.toggle('liked');
            const countEl = btn.querySelector('.like-count');
            const icon = btn.querySelector('.iconify');
            const likesEl = document.getElementById(likesId);
            if (isLiked) {
                countEl.textContent = count + 1;
                icon.setAttribute('data-icon', 'lucide:heart');
                icon.style.color = '#ef4444';
                countEl.style.color = '#ef4444';
                if (likesEl) likesEl.textContent = (count + 1) + ' إعجاب';
                btn.style.transform = 'scale(1.15)';
                setTimeout(() => btn.style.transform = '', 200);
            } else {
                countEl.textContent = count;
                icon.style.color = '';
                countEl.style.color = '';
                if (likesEl) likesEl.textContent = count + ' إعجاب';
            }
        }

        // ===== Bookmark Toggle =====
        function toggleBookmark(btn) {
            const isSaved = btn.classList.toggle('saved');
            const icon = btn.querySelector('.iconify');
            if (isSaved) {
                icon.setAttribute('data-icon', 'lucide:bookmark-check');
                icon.style.color = '#f97316';
                showToast('تم الحفظ ✓');
            } else {
                icon.setAttribute('data-icon', 'lucide:bookmark');
                icon.style.color = '';
                showToast('تم إلغاء الحفظ');
            }
        }

        // ===== Connect Toggle =====
        function toggleConnect(btn) {
            const isConnected = btn.dataset.connected === 'true';
            if (isConnected) {
                btn.textContent = 'ربط';
                btn.classList.remove('bg-brand-500/20', 'text-brand-300', 'border-brand-400/50');
                btn.classList.add('text-brand-400', 'border-brand-500/30');
                btn.dataset.connected = 'false';
                showToast('تم إلغاء الربط');
            } else {
                btn.textContent = 'مرتبط ✓';
                btn.classList.add('bg-brand-500/20', 'text-brand-300', 'border-brand-400/50');
                btn.classList.remove('text-brand-400', 'border-brand-500/30');
                btn.dataset.connected = 'true';
                showToast('تم الربط بنجاح ✓');
            }
        }

        // ===== Comments Toggle =====
        function toggleComments(postId) {
            const section = document.getElementById('comments-' + postId);
            if (section) section.classList.toggle('open');
        }

        // ===== Share Modal =====
        function showShareModal() {
            document.getElementById('shareModal').classList.add('active');
        }
        function closeShareModal(e) {
            if (e && e.target !== e.currentTarget) return;
            document.getElementById('shareModal').classList.remove('active');
        }

        // ===== Post Menu Modal =====
        function showPostMenu(btn) {
            document.getElementById('postMenuModal').classList.add('active');
        }
        function closePostMenuModal(e) {
            if (e && e.target !== e.currentTarget) return;
            document.getElementById('postMenuModal').classList.remove('active');
        }

        // ===== Feed Tab Switch =====
        function switchTab(btn) {
            document.querySelectorAll('.feed-tab').forEach(t => {
                t.classList.remove('active', 'bg-dark-800', 'text-white');
                t.classList.add('text-dark-400');
            });
            btn.classList.add('active', 'bg-dark-800', 'text-white');
            btn.classList.remove('text-dark-400');
            showToast('عرض: ' + btn.textContent.trim());
        }
        document.querySelector('.feed-tab.active')?.classList.add('bg-dark-800', 'text-white');

        // ===== Profile Tab Switch =====
        function switchProfileTab(btn) {
            document.querySelectorAll('.profile-tab').forEach(t => {
                t.classList.remove('active', 'bg-dark-800', 'text-white');
                t.classList.add('text-dark-400');
            });
            btn.classList.add('active', 'bg-dark-800', 'text-white');
            btn.classList.remove('text-dark-400');

            // Render content based on tab
            const tabName = btn.textContent.trim();
            const postsList = document.getElementById('profilePostsList');
            const emptyState = document.getElementById('profileEmptyState');

            if (tabName === 'المنشورات') {
                renderProfilePosts();
            } else if (tabName === 'المقالات') {
                if (postsList) postsList.innerHTML = '';
                if (emptyState) {
                    emptyState.style.display = '';
                    emptyState.querySelector('p').textContent = 'لم تنشر أي مقال بعد';
                    emptyState.querySelector('button').textContent = 'اكتب أول مقال';
                }
            } else if (tabName === 'الإعجابات') {
                if (postsList) postsList.innerHTML = '';
                if (emptyState) {
                    emptyState.style.display = '';
                    emptyState.querySelector('p').textContent = 'لم تعجب بأي منشور بعد';
                    emptyState.querySelector('button').textContent = 'استعرض الرئيسية';
                }
            }
        }

        // ===== Connection Tab Switch =====
        function switchConnTab(btn) {
            document.querySelectorAll('.conn-tab').forEach(t => {
                t.classList.remove('active', 'bg-dark-800', 'text-white');
                t.classList.add('text-dark-400');
            });
            btn.classList.add('active', 'bg-dark-800', 'text-white');
            btn.classList.remove('text-dark-400');
        }

        // ===== Bottom Nav Switch =====
        function switchBottomNav(btn) {
            document.querySelectorAll('.bottom-nav-item').forEach(b => {
                b.classList.remove('active');
                b.classList.add('text-dark-400');
            });
            btn.classList.add('active');
            btn.classList.remove('text-dark-400');
        }

        // ===== Post Modal =====
        function showPostModal() {
            document.getElementById('postModal').classList.add('active');
            document.body.style.overflow = 'hidden';
            setTimeout(() => document.getElementById('modalPostText')?.focus(), 300);
        }
        function closePostModal(e) {
            if (e && e.target !== e.currentTarget) return;
            document.getElementById('postModal').classList.remove('active');
            document.body.style.overflow = '';
        }
        // ===== Edit Profile =====
        const defaultProfile = {
            name: 'د. أحمد الخالدي',
            username: '@ahmed_alkhalidi',
            title: 'محامي دولي',
            bio: 'محامي دولي متخصص في التحكيم التجاري وقانون الشركات. خبرة +15 عاماً في القضايا المعقدة عابرة الحدود. أشارك المعرفة القانونية مع المجتمع.',
            location: 'دبي، الإمارات',
            website: 'ahmed-law.com'
        };

        function getProfile() {
            const saved = localStorage.getItem('userProfile');
            return saved ? JSON.parse(saved) : { ...defaultProfile };
        }

        function openEditProfile() {
            const profile = getProfile();
            document.getElementById('editName').value = profile.name;
            document.getElementById('editUsername').value = profile.username;
            document.getElementById('editTitle').value = profile.title;
            document.getElementById('editBio').value = profile.bio;
            document.getElementById('editLocation').value = profile.location;
            document.getElementById('editWebsite').value = profile.website;
            document.getElementById('editProfileModal').classList.add('active');
            document.body.style.overflow = 'hidden';
        }

        function closeEditProfile(e) {
            if (e && e.target !== e.currentTarget) return;
            document.getElementById('editProfileModal').classList.remove('active');
            document.body.style.overflow = '';
        }

        function saveProfile() {
            const profile = {
                name: document.getElementById('editName').value.trim() || defaultProfile.name,
                username: document.getElementById('editUsername').value.trim() || defaultProfile.username,
                title: document.getElementById('editTitle').value.trim() || defaultProfile.title,
                bio: document.getElementById('editBio').value.trim() || defaultProfile.bio,
                location: document.getElementById('editLocation').value.trim() || defaultProfile.location,
                website: document.getElementById('editWebsite').value.trim() || defaultProfile.website
            };
            localStorage.setItem('userProfile', JSON.stringify(profile));
            applyProfile(profile);
            closeEditProfile();
            showToast('تم حفظ الملف الشخصي ✓');
        }

        function applyProfile(profile) {
            // Update profile page
            const profileName = document.querySelector('#page-profile .text-xl.font-bold');
            if (profileName) profileName.textContent = profile.name;

            const profileSub = document.querySelector('#page-profile .text-dark-400.text-sm.mb-3');
            if (profileSub) profileSub.textContent = profile.username + ' • ' + profile.title + ' • الإمارات 🇦🇪';

            const profileBio = document.querySelector('#page-profile .text-dark-300.text-sm.mb-4');
            if (profileBio) profileBio.textContent = profile.bio;

            const profileLocation = document.querySelector('#page-profile .flex.flex-wrap.gap-4 span:first-child');
            if (profileLocation) profileLocation.innerHTML = '<span class="iconify" data-icon="lucide:map-pin" style="font-size:14px"></span>' + profile.location;

            const profileWebsite = document.querySelector('#page-profile .text-brand-400.cursor-pointer');
            if (profileWebsite) profileWebsite.textContent = profile.website;

            // Update sidebar
            const sidebarName = document.querySelector('.desktop-sidebar .font-semibold.text-sm');
            if (sidebarName) sidebarName.textContent = profile.name;

            // Update mobile drawer
            const drawerName = document.querySelector('#mobileDrawer h3');
            if (drawerName) drawerName.textContent = profile.name;
        }

        // Load profile on startup
        function loadProfile() {
            const saved = localStorage.getItem('userProfile');
            if (saved) applyProfile(JSON.parse(saved));
        }

        // ===== Facebook-Style Notification System =====
        const notifData = [
            { id: 1, type: 'like', user: 'سارة المنصوري', avatar: 'seed/sara-legal', gradient: 'from-pink-500 to-yellow-500', text: 'أعجبت بمنشورك', target: 'التحكيم التجاري', time: 'منذ 5 دقائق', unread: true, category: 'all' },
            { id: 2, type: 'comment', user: 'خالد العمري', avatar: 'seed/khalid-jordan', gradient: 'from-cyan-500 to-purple-500', text: 'علّق على مقالك:', comment: 'هل يمكنك التوسع في جزء التحكيم التجاري؟', target: 'محكمة التحكيم الدولية', time: 'منذ 15 دقيقة', unread: true, category: 'replies' },
            { id: 3, type: 'follow', user: 'نورة القحطاني', avatar: 'seed/nora-lawyer', gradient: 'from-purple-500 to-red-500', text: 'بدأت بمتابعتك', time: 'منذ ساعة', unread: true, hasAction: true, category: 'all' },
            { id: 4, type: 'mention', user: 'فاطمة الحربي', avatar: 'seed/fatima-fintech', gradient: 'from-green-500 to-cyan-500', text: 'ذكرتك في تعليق', target: 'العملات الرقمية', time: 'منذ ساعتين', unread: true, category: 'mentions' },
            { id: 5, type: 'like', user: 'عمر الحسيني', avatar: 'seed/omar-judge', gradient: 'from-yellow-500 to-green-500', text: 'أعجب بتعليقك على', target: 'قانون حقوق النشر', time: 'منذ 3 ساعات', unread: false, category: 'all' },
            { id: 6, type: 'share', user: 'يوسف الشريف', avatar: 'seed/youssef-ip', gradient: 'from-red-500 to-purple-500', text: 'شارك منشورك', target: 'الملكية الفكرية', time: 'منذ 5 ساعات', unread: false, category: 'all' },
            { id: 7, type: 'comment', user: 'ليلى بنت خليفة', avatar: 'seed/layla-mediator', gradient: 'from-teal-500 to-blue-500', text: 'ردّت على تعليقك:', comment: 'ممتاز! شكراً على المشاركة', target: 'الوساطة القانونية', time: 'منذ 8 ساعات', unread: false, category: 'replies' },
            { id: 8, type: 'event', user: 'نظام', avatar: null, gradient: 'from-brand-500 to-brand-700', text: 'تذكير: مؤتمر التحكيم الدولي غداً', time: 'منذ 10 ساعات', unread: false, category: 'all', isSystem: true },
            { id: 9, type: 'like', user: 'طارق الراشد', avatar: null, gradient: 'from-emerald-500 to-teal-600', text: 'أعجب بمنشورك عن', target: 'الضريبة الجديدة', time: 'أمس', unread: false, category: 'all' },
            { id: 10, type: 'badge', user: 'نظام', avatar: null, gradient: 'from-yellow-500 to-orange-500', text: '🎉 مبروك! وصلت 200 إعجاب على مقالك', time: 'أمس', unread: false, category: 'all', isSystem: true },
        ];

        function getNotifIcon(type) {
            const icons = {
                like: { icon: 'lucide:heart', color: 'text-red-400', bg: 'bg-red-500/15' },
                comment: { icon: 'lucide:message-circle', color: 'text-blue-400', bg: 'bg-blue-500/15' },
                follow: { icon: 'lucide:user-plus', color: 'text-green-400', bg: 'bg-green-500/15' },
                mention: { icon: 'lucide:at-sign', color: 'text-purple-400', bg: 'bg-purple-500/15' },
                share: { icon: 'lucide:share-2', color: 'text-cyan-400', bg: 'bg-cyan-500/15' },
                event: { icon: 'lucide:calendar', color: 'text-brand-400', bg: 'bg-brand-500/15' },
                badge: { icon: 'lucide:trophy', color: 'text-yellow-400', bg: 'bg-yellow-500/15' }
            };
            return icons[type] || icons.like;
        }

        function getNotifTargetPage(type) {
            const pages = {
                like: 'feed',
                comment: 'feed',
                follow: 'connections',
                mention: 'feed',
                share: 'feed',
                event: 'events',
                badge: 'certificates'
            };
            return pages[type] || 'feed';
        }

        function renderNotifs(filter) {
            const container = document.getElementById('notifList');
            let items = notifData;
            if (filter === 'unread') items = items.filter(n => n.unread);
            else if (filter === 'mentions') items = items.filter(n => n.type === 'mention');
            else if (filter === 'replies') items = items.filter(n => n.type === 'comment');

            if (items.length === 0) {
                container.innerHTML = '<div class="notif-empty"><span class="iconify" data-icon="lucide:bell-off"></span><p>لا توجد إشعارات</p></div>';
                return;
            }

            container.innerHTML = items.map(n => {
                const iconInfo = getNotifIcon(n.type);
                const avatarHTML = n.isSystem
                    ? `<div class="notif-icon-wrap ${iconInfo.bg}"><span class="iconify ${iconInfo.color} text-lg" data-icon="${iconInfo.icon}"></span></div>`
                    : `<div class="notif-icon-wrap ${iconInfo.bg}"><span class="iconify ${iconInfo.color} text-lg" data-icon="${iconInfo.icon}"></span><div class="notif-avatar-letter bg-gradient-to-br ${n.gradient}">${n.user.charAt(0)}</div></div>`;

                const targetHTML = n.target ? `<span class="notif-highlight">${n.target}</span>` : '';
                const commentHTML = n.comment ? `<br><span class="text-dark-400 text-xs">"${n.comment}"</span>` : '';

                const actionBtn = n.hasAction
                    ? `<div class="flex gap-2 mt-2"><button class="notif-action-btn accept" onclick="event.stopPropagation();acceptFollow(${n.id})">متابعة</button><button class="notif-action-btn decline" onclick="event.stopPropagation();declineFollow(${n.id})">حذف</button></div>`
                    : '';

                return `
                    <div class="notif-item-row ${n.unread ? 'unread' : ''}" onclick="clickNotif(${n.id})">
                        ${avatarHTML}
                        <div class="notif-content">
                            <div class="notif-text"><strong>${n.user}</strong> ${n.text} ${targetHTML}${commentHTML}</div>
                            <div class="notif-time">${n.unread ? '<span class="notif-new-dot"></span>' : ''}${n.time}</div>
                            ${actionBtn}
                        </div>
                    </div>
                `;
            }).join('');
        }

        function toggleNotifDropdown(e) {
            e.stopPropagation();
            const dropdown = document.getElementById('notifDropdown');
            const isOpen = dropdown.classList.contains('open');
            if (isOpen) {
                closeNotifDropdown();
            } else {
                dropdown.classList.add('open');
                renderNotifs('all');
                // Reset filter tabs
                document.querySelectorAll('.notif-tab').forEach(t => {
                    t.classList.remove('active');
                });
                document.querySelector('.notif-tab')?.classList.add('active');
            }
        }

        function closeNotifDropdown() {
            document.getElementById('notifDropdown').classList.remove('open');
        }

        function filterNotifs(btn, filter) {
            document.querySelectorAll('.notif-tab').forEach(t => t.classList.remove('active'));
            btn.classList.add('active');
            renderNotifs(filter);
        }

        function markAllRead() {
            notifData.forEach(n => n.unread = false);
            renderNotifs('all');
            updateNotifDots();
            showToast('تم تحديد الكل كمقروء ✓');
        }

        function clickNotif(id) {
            const notif = notifData.find(n => n.id === id);
            if (!notif) return;
            notif.unread = false;
            updateNotifDots();
            closeNotifDropdown();
            showPage(getNotifTargetPage(notif.type));
        }

        function acceptFollow(id) {
            const notif = notifData.find(n => n.id === id);
            if (notif) {
                notif.hasAction = false;
                notif.text = 'يتابعك الآن ✓';
                notif.unread = false;
            }
            renderNotifs('all');
            updateNotifDots();
            showToast('تم قبول المتابعة ✓');
        }

        function declineFollow(id) {
            const idx = notifData.findIndex(n => n.id === id);
            if (idx > -1) notifData.splice(idx, 1);
            renderNotifs('all');
            updateNotifDots();
            showToast('تم حذف الطلب');
        }

        function updateNotifDots() {
            const hasUnread = notifData.some(n => n.unread);
            const mobileDot = document.getElementById('notifDotMobile');
            const desktopDot = document.getElementById('notifDotDesktop');
            if (mobileDot) mobileDot.style.display = hasUnread ? '' : 'none';
            if (desktopDot) desktopDot.style.display = hasUnread ? '' : 'none';
        }

        // Close notification dropdown on outside click
        document.addEventListener('click', (e) => {
            const mobileWrap = document.getElementById('notifDropdownWrapMobile');
            const desktopWrap = document.getElementById('notifDropdownWrap');
            const dropdown = document.getElementById('notifDropdown');
            if (dropdown && !dropdown.contains(e.target) &&
                (!mobileWrap || !mobileWrap.contains(e.target)) &&
                (!desktopWrap || !desktopWrap.contains(e.target))) {
                closeNotifDropdown();
            }
        });

        // Simulate new notification every 30s
        let notifCounter = notifData.length;
        function simulateNewNotif() {
            const users = [
                { name: 'أحمد المنصور', avatar: null, gradient: 'from-indigo-500 to-purple-600' },
                { name: 'رنا السعيد', avatar: null, gradient: 'from-rose-500 to-orange-500' },
                { name: 'هدى النعيمي', avatar: null, gradient: 'from-sky-500 to-blue-600' },
            ];
            const types = [
                { type: 'like', text: 'أعجبت بمنشورك الجديد' },
                { type: 'comment', text: 'علّق على مقالك:', comment: 'محتوى رائع!' },
                { type: 'mention', text: 'ذكرتك في منشور' },
            ];
            const user = users[Math.floor(Math.random() * users.length)];
            const action = types[Math.floor(Math.random() * types.length)];
            notifCounter++;
            notifData.unshift({
                id: notifCounter,
                type: action.type,
                user: user.name,
                avatar: null,
                gradient: user.gradient,
                text: action.text,
                comment: action.comment || null,
                target: null,
                time: 'الآن',
                unread: true,
                category: action.type === 'mention' ? 'mentions' : action.type === 'comment' ? 'replies' : 'all',
                isSystem: false
            });
            updateNotifDots();
            // If dropdown is open, re-render
            const dropdown = document.getElementById('notifDropdown');
            if (dropdown && dropdown.classList.contains('open')) {
                renderNotifs('all');
                document.querySelector('.notif-tab')?.classList.add('active');
            }
        }
        setInterval(simulateNewNotif, 30000);

        // ===== Poll Voting =====
        function votePoll(btn, pct) {
            const parent = btn.closest('[id^="poll-"]');
            parent.querySelectorAll('.poll-option').forEach(opt => {
                opt.style.pointerEvents = 'none';
                const p = opt.querySelector('.poll-pct').textContent;
                const pVal = parseInt(p);
                opt.style.background = `linear-gradient(to left, rgba(249,115,22,0.15) ${pVal}%, rgba(38,38,38,0.8) ${pVal}%)`;
                opt.style.opacity = opt === btn ? '1' : '0.6';
            });
            btn.style.borderColor = 'rgba(249,115,22,0.5)';
            showToast('تم التصويت ✓');
        }

        // ===== Trending Data =====
        const trendingData = [
            { rank: 1, tag: '#التحكيم_الدولي', category: 'legal', catLabel: 'قانوني', catColor: 'brand', posts: '2,450', change: '+340', bar: 95, desc: 'محكمة التحكيم الدولية تصدر قرارات جديدة بشأن النزاعات التجارية عابرة الحدود' },
            { rank: 2, tag: '#قانون_الذكاء_الاصطناعي', category: 'legal', catLabel: 'قانوني', catColor: 'brand', posts: '1,890', change: '+520', bar: 82, desc: 'الدول العربية تبدأ بسن تشريعات تنظم استخدام الذكاء الاصطناعي' },
            { rank: 3, tag: '#حقوق_الملكية_الفكرية', category: 'legal', catLabel: 'قانوني', catColor: 'brand', posts: '1,650', change: '+180', bar: 72, desc: 'تحديثات على قوانين حماية العلامات التجارية والبراءات' },
            { rank: 4, tag: '#Fintech_التنظيمي', category: 'tech', catLabel: 'تقنية', catColor: 'cyan', posts: '1,420', change: '+290', bar: 65, desc: 'البنوك المركزية تصدر أطرًا تنظيمية جديدة للعملات الرقمية' },
            { rank: 5, tag: '#قانون_الشركات_الجديد', category: 'legal', catLabel: 'قانوني', catColor: 'brand', posts: '1,280', change: '+150', bar: 58, desc: 'تعديلات جوهرية على قانون الشركات في دول الخليج' },
            { rank: 6, tag: '#الجريمة_الإلكترونية', category: 'legal', catLabel: 'قانوني', catColor: 'brand', posts: '1,120', change: '+210', bar: 52, desc: 'ارتفاع قضايا الاحتيال الإلكتروني والقوانين الجديدة لمكافحتها' },
            { rank: 7, tag: '#Blockchain_قانوني', category: 'tech', catLabel: 'تقنية', catColor: 'cyan', posts: '980', change: '+320', bar: 48, desc: 'العقود الذكية وتطبيقاتها القانونية في التحكيم والتوثيق' },
            { rank: 8, tag: '#القانون_الدولي_الإنساني', category: 'legal', catLabel: 'قانوني', catColor: 'brand', posts: '870', change: '+95', bar: 42, desc: 'آخر التطورات في القانون الدولي الإنساني وحماية المدنيين' },
            { rank: 9, tag: '#العملات_الرقمية', category: 'tech', catLabel: 'تقنية', catColor: 'cyan', posts: '760', change: '+180', bar: 38, desc: 'إطار تنظيمي جديد لتجارة العملات الرقمية في المنطقة' },
            { rank: 10, tag: '#قانون_العمل', category: 'legal', catLabel: 'قانوني', catColor: 'brand', posts: '650', change: '+75', bar: 32, desc: 'تعديلات على قوانين العمل وحماية حقوق العاملين' },
            { rank: 11, tag: '#التسويق_الرقمي', category: 'general', catLabel: 'عام', catColor: 'purple', posts: '540', change: '+120', bar: 28, desc: 'تحديات قانونية جديدة في عالم التسويق الرقمي وحماية البيانات' },
            { rank: 12, tag: '#قانون_البيئة', category: 'general', catLabel: 'عام', catColor: 'purple', posts: '430', change: '+60', bar: 22, desc: 'التشريعات البيئية الجديدة وتأثيرها على قطاع الأعمال' },
            { rank: 13, tag: '#الامتثال_المالي', category: 'legal', catLabel: 'قانوني', catColor: 'brand', posts: '380', change: '+45', bar: 18, desc: 'متطلبات الامتثال لمكافحة غسيل الأموال وتمويل الإرهاب' },
            { rank: 14, tag: '#القانون_البحري', category: 'legal', catLabel: 'قانوني', catColor: 'brand', posts: '320', change: '+30', bar: 15, desc: 'نزاعات الحدود البحرية وقانون البحار' },
            { rank: 15, tag: '#Cybersecurity_قانوني', category: 'tech', catLabel: 'تقنية', catColor: 'cyan', posts: '290', change: '+85', bar: 12, desc: 'الإطار القانوني للأمن السيبراني وحماية البيانات الشخصية' },
        ];

        // ===== Trending Dropdown =====
        function toggleTrendingDropdown(e) {
            e.stopPropagation();
            const dropdown = document.getElementById('trendingDropdown');
            const arrow = document.getElementById('trendingArrow');
            const isOpen = dropdown.classList.contains('open');
            if (isOpen) {
                closeTrendingDropdown();
            } else {
                dropdown.classList.add('open');
                arrow.style.transform = 'rotate(180deg)';
                renderTrendingList('all');
                document.getElementById('trendingSearchInput').value = '';
                document.getElementById('trendingSearchInput').focus();
            }
        }

        function closeTrendingDropdown() {
            document.getElementById('trendingDropdown').classList.remove('open');
            document.getElementById('trendingArrow').style.transform = '';
        }

        // Close on outside click
        document.addEventListener('click', (e) => {
            const wrap = document.getElementById('trendingDropdownWrap');
            if (wrap && !wrap.contains(e.target)) {
                closeTrendingDropdown();
            }
        });

        function renderTrendingList(filter) {
            const container = document.getElementById('trendingList');
            let items = trendingData;
            if (filter && filter !== 'all') {
                items = items.filter(i => i.category === filter);
            }
            container.innerHTML = items.map(item => {
                const rankClass = item.rank <= 3 ? 'hot' : item.rank <= 7 ? 'warm' : 'normal';
                const barColor = item.catColor === 'brand' ? '#f97316' : item.catColor === 'cyan' ? '#06b6d4' : '#a855f7';
                return `
                    <div class="trending-item" onclick="showToast('عرض: ${item.tag}');closeTrendingDropdown()">
                        <div class="rank ${rankClass}">${item.rank}</div>
                        <div class="flex-1 min-w-0">
                            <div class="flex items-center gap-2 mb-0.5">
                                <span class="font-bold text-sm text-white">${item.tag}</span>
                                <span class="trending-category-tag bg-${item.catColor}-500/15 text-${item.catColor}-400">${item.catLabel}</span>
                            </div>
                            <p class="text-dark-400 text-[11px] leading-relaxed truncate">${item.desc}</p>
                            <div class="flex items-center gap-3 mt-1.5">
                                <span class="text-dark-500 text-[10px]">${item.posts} منشور</span>
                                <span class="text-green-400 text-[10px] font-semibold">${item.change} جديد</span>
                            </div>
                            <div class="trend-bar"><div class="fill" style="width:${item.bar}%;background:${barColor}"></div></div>
                        </div>
                    </div>
                `;
            }).join('');
        }

        function filterTrending(query) {
            const container = document.getElementById('trendingList');
            const items = container.querySelectorAll('.trending-item');
            items.forEach(item => {
                const text = item.textContent.toLowerCase();
                item.style.display = text.includes(query.toLowerCase()) ? '' : 'none';
            });
        }

        function switchTrendingTab(btn, filter) {
            document.querySelectorAll('.trending-tab').forEach(t => {
                t.classList.remove('active', 'bg-brand-500/20', 'text-brand-400');
                t.classList.add('text-dark-400');
            });
            btn.classList.add('active', 'bg-brand-500/20', 'text-brand-400');
            btn.classList.remove('text-dark-400');
            renderTrendingList(filter);
        }

        // ===== Trending Full Page =====
        function showTrendingPage() {
            showPage('trending');
            renderTrendingPageList();
        }

        function renderTrendingPageList(filter) {
            const container = document.getElementById('trendingPageList');
            let items = trendingData;
            if (filter && filter !== 'all') {
                items = items.filter(i => i.category === filter);
            }
            container.innerHTML = items.map(item => {
                const rankClass = item.rank <= 3 ? 'hot' : item.rank <= 7 ? 'warm' : 'normal';
                const barColor = item.catColor === 'brand' ? '#f97316' : item.catColor === 'cyan' ? '#06b6d4' : '#a855f7';
                return `
                    <div class="p-4 hover:bg-dark-850 cursor-pointer transition-all" onclick="showToast('عرض: ${item.tag}')">
                        <div class="flex items-start gap-4">
                            <div class="rank ${rankClass} text-lg w-10 h-10 rounded-xl flex items-center justify-center font-bold" style="font-size:16px">${item.rank}</div>
                            <div class="flex-1">
                                <div class="flex items-center gap-2 mb-1">
                                    <span class="font-bold text-base text-white">${item.tag}</span>
                                    <span class="trending-category-tag bg-${item.catColor}-500/15 text-${item.catColor}-400">${item.catLabel}</span>
                                </div>
                                <p class="text-dark-300 text-sm leading-relaxed mb-2">${item.desc}</p>
                                <div class="flex items-center gap-4">
                                    <span class="text-dark-400 text-xs">${item.posts} منشور</span>
                                    <span class="text-green-400 text-xs font-semibold">${item.change} جديد اليوم</span>
                                    <div class="flex-1 max-w-[200px]"><div class="trend-bar"><div class="fill" style="width:${item.bar}%;background:${barColor}"></div></div></div>
                                </div>
                            </div>
                            <button class="shrink-0 text-brand-400 border border-brand-500/30 text-xs px-3 py-1.5 rounded-lg hover:bg-brand-500/10 transition-all" onclick="event.stopPropagation();showToast('تم المتابعة ✓')">متابعة</button>
                        </div>
                    </div>
                `;
            }).join('');
        }

        function filterTrendingPage(query) {
            const container = document.getElementById('trendingPageList');
            const items = container.querySelectorAll('[class*="p-4"]');
            items.forEach(item => {
                const text = item.textContent.toLowerCase();
                item.style.display = text.includes(query.toLowerCase()) ? '' : 'none';
            });
        }

        function switchTrendingPageTab(btn, period) {
            document.querySelectorAll('.trending-page-tab').forEach(t => {
                t.classList.remove('active', 'bg-dark-800', 'text-white');
                t.classList.add('text-dark-400');
            });
            btn.classList.add('active', 'bg-dark-800', 'text-white');
            btn.classList.remove('text-dark-400');
            showToast('عرض: ' + (period === 'today' ? 'اليوم' : period === 'week' ? 'هذا الأسبوع' : 'هذا الشهر'));
            renderTrendingPageList();
        }

        // ===== Smart Feed Algorithm =====
        const userInterests = {
            tags: ['#التحكيم_الدولي', '#قانون_الشركات', '#Fintech', '#حقوق_الملكية_الفكرية', '#القانون_التجاري'],
            authors: ['د. محمد علي الشعيبي', 'سارة المنصوري', 'خالد العمري', 'فاطمة الحربي'],
            topics: ['تحكيم', 'شركات', 'تقنية مالية', 'ملكية فكرية']
        };

        const allPosts = [
            { author: 'د. محمد علي الشعيبي', avatar: 'م', verified: true, role: 'محامي تحكيم دولي', time: 'منذ 23 دقيقة', title: 'التحكيم في قضايا الطاقة: دراسة حالة جديدة', content: 'محكمة التحكيم الدولية نشرت تقريرها السنوي الجديد الذي يرصد تطور قضايا الطاقة والموارد الطبيعية. من أبرز الملاحظات: ارتفاع 40% في عدد القضايا المتعلقة بالعقود النفطية...', tags: ['#التحكيم_الدولي', '#قانون_الطاقة'], likes: 187, comments: 42, shares: 28, gradient: 'from-blue-500 to-purple-600', relevance: 95 },
            { author: 'سارة المنصوري', avatar: 'س', verified: false, role: 'مستشارة قانونية', time: 'منذ ساعة', title: '', content: 'تحديث مهم: صدر المرسوم التنفيذي الجديد لقانون حماية البيانات الشخصية في الإمارات. يشمل أحكاماً جديدة حول نقل البيانات عبر الحدود وفرض غرامات تصل إلى 5 مليون درهم للمخالفين. 🇦🇪📋', tags: ['#حماية_البيانات', '#الإمارات'], likes: 134, comments: 28, shares: 19, gradient: 'from-pink-500 to-yellow-500', relevance: 88 },
            { author: 'خالد العمري', avatar: 'خ', verified: true, role: 'أستاذ القانون الدولي', time: 'منذ 3 ساعات', title: 'قانون الشركات الموحد: تحليل شامل', content: 'بعد صدور قانون الشركات الموحد في دول مجلس التعاون، نشرت مكتبنا دراسة تحليلية شاملة تغطي أبرز التغييرات:\n\n1. تبسيط إجراءات التأسيس\n2. حماية أفضل للمساهمين الأقلية\n3. إدخال مفهوم الشركة ذات المسؤولية المحدودة المنفردة\n\nالدراسة متوفرة على ملفنا الشخصي.', tags: ['#قانون_الشركات', '#مجلس_التعاون'], likes: 256, comments: 67, shares: 45, gradient: 'from-cyan-500 to-purple-500', relevance: 92 },
            { author: 'فاطمة الحربي', avatar: 'ف', verified: false, role: 'خبيرة تقنية مالية', time: 'منذ 5 ساعات', title: '', content: 'هل تعلم؟ 🤔\n\nالبنك المركزي السعودي أصدر توجيهات جديدة لشركات التقنية المالية تتعلق بالتحقق من الهوية الرقمية (eKYC). هذه التوجيهات ستدخل حيز التنفيذ في الربع الأول من 2025.\n\nالشركات المتأثرة: منصات التداول، محافظ العملات الرقمية، شركات التحويلات المالية.\n\nما رأيكم؟ هل هذا يساعد أم يقيد الابتكار؟ 💡', tags: ['#Fintech', '#العملات_الرقمية', '#SAMA'], likes: 89, comments: 34, shares: 12, gradient: 'from-green-500 to-cyan-500', relevance: 85 },
            { author: 'نورة القحطاني', avatar: 'ن', verified: true, role: 'محامية عقود', time: 'منذ 7 ساعات', title: 'دليلك الشامل لصياغة العقود الدولية', content: 'بعد سنوات من العمل في صياغة العقود الدولية، أشارككم أهم 10 نصائح:\n\n✅ حدد القانون الواجب التطبيق بوضوح\n✅ اختر محكمة التحكيم المناسبة\n✅ لا تتجاهل بنود force majeure\n✅ وثّق كل التعديلات كتابياً\n\nالمقال الكامل في الملف الشخصي 📝', tags: ['#العقود', '#التحكيم_التجاري'], likes: 312, comments: 78, shares: 56, gradient: 'from-purple-500 to-red-500', relevance: 90 },
            { author: 'يوسف الشريف', avatar: 'ي', verified: false, role: 'خبير ملكية فكرية', time: 'منذ 9 ساعات', title: '', content: '🚨 تنبيه مهم لرواد الأعمال!\n\nالتسجيل في برنامج حماية العلامات التجارية الجديد ابتدأ اليوم. البرنامج يوفر:\n\n• حماية مجانية لمدة سنة\n• استشارات قانونية مجانية\n• تسجيل سريع في 48 ساعة\n\nالرابط في التعليقات 👇', tags: ['#الملكية_الفكرية', '#رواد_الأعمال'], likes: 167, comments: 45, shares: 34, gradient: 'from-red-500 to-purple-500', relevance: 78 },
            { author: 'عمر الحسيني', avatar: 'ع', verified: true, role: 'قاضي متقاعد', time: 'منذ 11 ساعة', title: 'قراءة في أحدث أحكاممحكمة التمييز', content: 'محكمة التمييز أصدرت حكماً مهماً بشأن المسؤولية التقصيرية في القضايا الطبية. الحكم يُعيد تعريف معايير الإهمال الطبي ويضع معايير جديدة للتعويض.\n\nأهم النقاط:\n• تحمّل المستشفى المسؤولية الكاملة\n• زيادة سقف التعويض بنسبة 200%\n• إلزام بتوفير تأمين شامل للمرضى\n\nقرار سيُحدث ثورة في القضاء الطبي! ⚖️', tags: ['#القضاء', '#المسؤولية_المدنية', '#القانون_الطبي'], likes: 198, comments: 56, shares: 41, gradient: 'from-yellow-500 to-green-500', relevance: 82 },
            { author: 'ليلى بنت خليفة', avatar: 'ل', verified: false, role: 'وسيطة قانونية', time: 'منذ 14 ساعة', title: '', content: 'تجربتي مع الوساطة القانونية في حل نزاع تجاري معقد:\n\nالطرفان: شريكان تجاريان في شركة تقنية\nالنزاع: تقسيم الأرباح والملكية الفكرية\nالنتيجة: حل ودي في 3 أسابيع بدلاً من سنتين!\n\nالوساطة هي المستقبل للنزاعات التجارية 🤝\n\nشاركوا تجاربكم في التعليقات', tags: ['#الوساطة', '#حل_النزاعات'], likes: 145, comments: 67, shares: 23, gradient: 'from-teal-500 to-blue-500', relevance: 75 },
            { author: 'د. أحمد المنصور', avatar: 'أ', verified: true, role: 'أستاذ القانون الدستوري', time: 'منذ 18 ساعة', title: 'التعديلات الدستورية: قراءة تحليلية', content: 'التعديلات الدستورية الأخيرة تستحق قراءة تحليلية معمقة. أبرز النقاط:\n\n📌 تعزيز دور القضاء المستقل\n📌 حماية الحقوق الرقمية كحقوق أساسية\n📌 إنشاء هيئة وطنية للذكاء الاصطناعي\n📌 تحديث آليات المساءلة الحكومية\n\nندوة تفاعلية يوم الخميس الساعة 8 مساءً للنقاش 🎙️', tags: ['#القانون_الدستوري', '#التعديلات'], likes: 234, comments: 89, shares: 67, gradient: 'from-indigo-500 to-purple-600', relevance: 80 },
            { author: 'رنا السعيد', avatar: 'ر', verified: false, role: 'محامية جنائية', time: 'منذ يوم', title: '', content: 'نصيحة قانونية يومية ⚖️\n\nهل تعلم أن الاحتفاظ بنسخة من أي عقد توقعه هو حق قانوني لك؟\n\nالمادة 34 من قانون المعاملات المدنية تنص على أن لكل طرف الحق في الحصول على نسخة من العقد.\n\nلا توقع أي عقد بدون نسخة! 📄', tags: ['#نصيحة_قانونية', '#القانون_المدني'], likes: 456, comments: 123, shares: 89, gradient: 'from-rose-500 to-orange-500', relevance: 70 },
            { author: 'طارق الراشد', avatar: 'ط', verified: true, role: 'مستشار ضريبي', time: 'منذ يوم', title: 'الضريبة الجديدة: ما يجب أن تعرفه', content: 'تحليل شامل للتعديلات الضريبية الجديدة:\n\n📊 ضريبة القيمة المضافة: لا تغييرات\n📊 ضريبة الدخل: خصم جديد للبحث والتطوير\n📊 ضريبة الشركات: معدل تنافسي 15%\n📊 إعفاءات جديدة للشركات الناشئة\n\nالدليل الكامل متوفر في مكتبتنا القانونية 📚', tags: ['#الضريبة', '#قانون_الضرائب'], likes: 178, comments: 54, shares: 38, gradient: 'from-emerald-500 to-teal-600', relevance: 72 },
            { author: 'هدى النعيمي', avatar: 'ه', verified: false, role: 'أستاذة قانون بحري', time: 'منذ يومين', title: '', content: '🗺️ حدود بحرية جديدة!\n\nاتفاقية جديدة بين دول الخليج تحدد الحدود البحرية والمناطق الاقتصادية الخالصة. الاتفاقية تؤثر على:\n\n• حقوق الصيد\n• استكشاف النفط والغاز\n• الملاحة البحرية\n• حماية البيئة البحرية\n\nتفاصيل كاملة في مقالتي الجديدة 🔗', tags: ['#القانون_البحري', '#الحدود_البحرية'], likes: 98, comments: 23, shares: 15, gradient: 'from-sky-500 to-blue-600', relevance: 65 }
        ];

        let feedPage = 0;
        const postsPerPage = 4;
        let isLoadingFeed = false;
        let feedExhausted = false;

        // Hide static posts once dynamic posts load
        function hideStaticPosts() {
            const feedPage2 = document.getElementById('page-feed');
            if (!feedPage2) return;
            const staticArticles = feedPage2.querySelectorAll(':scope > article.post-card');
            staticArticles.forEach(a => a.remove());
        }

        function getFeedPosts() {
            // Show posts from non-followed users only
            return allPosts.filter(p => !isFollowing(p.author));
        }

        function getRelevantPosts(page, perPage) {
            const sorted = [...getFeedPosts()].sort((a, b) => b.relevance - a.relevance);
            const start = page * perPage;
            const end = start + perPage;
            return sorted.slice(start, end);
        }

        function renderFeedPosts() {
            const container = document.getElementById('page-feed');
            if (!container) return;

            // Remove old dynamic posts and static posts
            container.querySelectorAll('.post-card, .dynamic-post').forEach(el => el.remove());

            const posts = getFeedPosts().sort((a, b) => b.relevance - a.relevance);
            const loader = document.getElementById('infiniteLoader');

            if (posts.length === 0) {
                const empty = document.createElement('div');
                empty.className = 'dynamic-post text-center py-12 text-dark-400';
                empty.innerHTML = '<span class="iconify text-4xl mb-3 block" data-icon="lucide:users"></span><p class="text-sm">تابعت كل المقترحات! 🎉</p><p class="text-xs text-dark-500 mt-1">ستظهر منشورات المتابَعين في "أتابع"</p>';
                container.insertBefore(empty, loader);
                document.getElementById('infiniteLoader').style.display = 'none';
                return;
            }

            posts.forEach((post, i) => {
                const div = document.createElement('div');
                div.className = 'dynamic-post';
                div.innerHTML = createPostHTML(post, i);
                container.insertBefore(div.firstElementChild, loader);
            });

            document.getElementById('infiniteLoader').style.display = 'none';
            document.getElementById('feedEnd').style.display = 'none';
        }

        function createPostHTML(post, index) {
            const verifiedBadge = post.verified ? '<span class="iconify text-brand-500 text-sm" data-icon="lucide:badge-check"></span>' : '';
            const titleHTML = post.title ? `<h2 class="font-bold text-base mb-2 leading-relaxed">${post.title}</h2>` : '';
            const tagsHTML = post.tags.map(t => {
                const colors = ['brand', 'blue', 'purple', 'green', 'cyan', 'pink', 'yellow'];
                const color = colors[Math.abs(t.charCodeAt(1)) % colors.length];
                return `<span class="hashtag bg-${color}-500/10 text-${color}-400 text-xs font-medium px-3 py-1 rounded-full cursor-pointer transition-all" onclick="showToast('تصفية: ${t}')">${t}</span>`;
            }).join('');

            const alreadyFollowing = isFollowing(post.author);
            const followBtn = alreadyFollowing ? '' : `
                                <button class="follow-btn flex items-center gap-1.5 bg-dark-800 hover:bg-dark-700 text-brand-400 text-xs font-semibold px-3 py-1.5 rounded-full border border-brand-500/30 transition-all active:scale-95 shrink-0" data-author="${post.author}" onclick="toggleFollow(this)">
                                    <span class="iconify text-sm" data-icon="lucide:user-plus"></span>
                                    <span>متابعة</span>
                                </button>
            `;

            return `
                <article class="post-card bg-dark-900/80 border border-dark-800/50 rounded-2xl mb-5 transition-all duration-300 animate-fade-in-up overflow-hidden" style="animation-delay:${index * 80}ms">
                    <div class="p-5 pb-0">
                        <div class="flex items-start justify-between mb-3">
                            <div class="flex items-center gap-3 cursor-pointer" onclick="showToast('عرض الملف الشخصي')">
                                <div class="w-11 h-11 rounded-xl bg-gradient-to-br ${post.gradient} flex items-center justify-center text-white font-bold border border-dark-700 shrink-0">${post.avatar}</div>
                                <div>
                                    <div class="flex items-center gap-2">
                                        <h3 class="font-semibold text-sm">${post.author}</h3>
                                        ${verifiedBadge}
                                    </div>
                                    <p class="text-dark-400 text-xs">${post.role} • ${post.time}</p>
                                </div>
                            </div>
                            ${followBtn}
                        </div>
                        <div class="mb-3">
                            ${titleHTML}
                            <p class="text-dark-200 text-sm leading-relaxed">${post.content.replace(/\n/g, '<br>')}</p>
                        </div>
                        <div class="flex flex-wrap gap-2 mb-4">${tagsHTML}</div>
                    </div>
                    <div class="px-5 pb-2">
                        <div class="flex items-center justify-between text-dark-400 text-xs mb-2">
                            <span id="likes-inf-${index}">${post.likes} إعجاب</span>
                            <span>${post.comments} تعليق • ${post.shares} مشاركة</span>
                        </div>
                    </div>
                    <div class="border-t border-dark-800/50 px-2 py-1">
                        <div class="flex items-center justify-around">
                            <button class="like-btn flex items-center gap-2 px-4 py-2.5 rounded-xl hover:bg-dark-800/50 transition-all group" onclick="toggleLike(this, ${post.likes}, 'likes-inf-${index}')">
                                <span class="iconify text-lg text-dark-400 group-hover:text-red-400 transition-colors" data-icon="lucide:heart"></span>
                                <span class="text-sm text-dark-400 group-hover:text-red-400 transition-colors like-count">${post.likes}</span>
                            </button>
                            <button class="flex items-center gap-2 px-4 py-2.5 rounded-xl hover:bg-dark-800/50 transition-all group" onclick="showToast('التعليقات')">
                                <span class="iconify text-lg text-dark-400 group-hover:text-blue-400 transition-colors" data-icon="lucide:message-circle"></span>
                                <span class="text-sm text-dark-400 group-hover:text-blue-400 transition-colors">${post.comments}</span>
                            </button>
                            <button class="flex items-center gap-2 px-4 py-2.5 rounded-xl hover:bg-dark-800/50 transition-all group" onclick="showShareModal()">
                                <span class="iconify text-lg text-dark-400 group-hover:text-green-400 transition-colors" data-icon="lucide:share-2"></span>
                                <span class="text-sm text-dark-400 group-hover:text-green-400 transition-colors">${post.shares}</span>
                            </button>
                            <button class="bookmark-btn flex items-center gap-2 px-4 py-2.5 rounded-xl hover:bg-dark-800/50 transition-all group" onclick="toggleBookmark(this)">
                                <span class="iconify text-lg text-dark-400 group-hover:text-brand-400 transition-colors" data-icon="lucide:bookmark"></span>
                            </button>
                            <button class="p-2.5 rounded-xl hover:bg-dark-800/50 transition-all group" onclick="showPostMenu(this)">
                                <span class="iconify text-lg text-dark-400 group-hover:text-dark-200 transition-colors" data-icon="lucide:more-horizontal"></span>
                            </button>
                        </div>
                    </div>
                </article>
            `;
        }

        // ===== Infinite scroll (disabled - all posts render at once) =====
        function loadMoreFeedPosts() { /* handled by renderFeedPosts */ }

        function setupInfiniteScroll() { /* no-op */ }

        // ===== Following Page =====
        function renderFollowingPosts() {
            const container = document.getElementById('followingPosts');
            if (!container) return;
            const posts = allPosts.filter(p => isFollowing(p.author));

            if (posts.length === 0) {
                container.innerHTML = '<div class="text-center py-12 text-dark-400"><span class="iconify text-4xl mb-3 block" data-icon="lucide:user-plus"></span><p class="text-sm">لم تتابع أحداً بعد</p><p class="text-xs text-dark-500 mt-1">تابعاً أشخاصاً من الرئيسية لترى منشوراتهم هنا</p></div>';
                return;
            }

            container.innerHTML = posts.map((post, i) => createPostHTML(post, i)).join('');
        }

        function switchFollowingTab(btn, filter) {
            document.querySelectorAll('.following-tab').forEach(t => {
                t.classList.remove('active', 'bg-dark-800', 'text-white');
                t.classList.add('text-dark-400');
            });
            btn.classList.add('active', 'bg-dark-800', 'text-white');
            btn.classList.remove('text-dark-400');
            showToast('عرض: ' + (filter === 'all' ? 'الكل' : filter === 'people' ? 'أشخاص' : 'صفحات'));
            renderFollowingPosts();
        }

        // ===== Audio Spaces =====
        const audioSpaces = [
            { id: 1, title: 'التحكيم التجاري: تجارب ودروس', host: 'د. محمد علي الشعيبي', avatar: 'م', gradient: 'from-blue-500 to-purple-600', status: 'live', listeners: 342, speakers: ['م', 'خ', 'ن'], speakerNames: ['محمد', 'خالد', 'نورة'], topic: 'قانوني', startedAgo: 'منذ 45 دقيقة', desc: 'مناقشة أحدث تطورات التحكيم التجاري مع نخبة من المحامين الدوليين' },
            { id: 2, title: 'مستقبل العملات الرقمية في المنطقة', host: 'فاطمة الحربي', avatar: 'ف', gradient: 'from-green-500 to-cyan-500', status: 'live', listeners: 189, speakers: ['ف', 'ي'], speakerNames: ['فاطمة', 'يوسف'], topic: 'تقنية', startedAgo: 'منذ 20 دقيقة', desc: 'نقاش حول الإطار التنظيمي للعملات الرقمية وتأثيره على سوق التقنية المالية' },
            { id: 3, title: 'قراءة في قانون الشركات الجديد', host: 'خالد العمري', avatar: 'خ', gradient: 'from-cyan-500 to-purple-500', status: 'upcoming', listeners: 0, speakers: ['خ'], speakerNames: ['خالد'], topic: 'قانوني', startsAt: 'اليوم 8:00 م', desc: 'تحليل شامل لأبرز التعديلات على قانون الشركات الموحد' },
            { id: 4, title: 'ورشة: كيف تكتب عقداً دولياً؟', host: 'نورة القحطاني', avatar: 'ن', gradient: 'from-purple-500 to-red-500', status: 'upcoming', listeners: 0, speakers: ['ن', 'ل'], speakerNames: ['نورة', 'ليلى'], topic: 'قانوني', startsAt: 'غداً 6:00 م', desc: 'ورشة عملية لتعلم أصول صياغة العcontracts الدولية' },
            { id: 5, title: 'قانون حماية البيانات: ما الجديد؟', host: 'سارة المنصوري', avatar: 'س', gradient: 'from-pink-500 to-yellow-500', status: 'recorded', listeners: 567, speakers: ['س', 'أ'], speakerNames: ['سارة', 'أحمد'], topic: 'قانوني', recordedAgo: 'منذ يومين', desc: 'ملخص لأحدث التعديلات على قوانين حماية البيانات الشخصية' },
            { id: 6, title: 'الذكاء الاصطناعي والقانون', host: 'د. أحمد المنصور', avatar: 'أ', gradient: 'from-indigo-500 to-purple-600', status: 'recorded', listeners: 892, speakers: ['أ', 'ف', 'م'], speakerNames: ['أحمد', 'فاطمة', 'محمد'], topic: 'تقنية', recordedAgo: 'منذ 3 أيام', desc: 'ن debate حول الإطار القانوني للذكاء الاصطناعي وتأثيره على المهن القانونية' },
        ];

        let currentSpaceFilter = 'live';

        function renderSpaces(filter) {
            currentSpaceFilter = filter;
            const container = document.getElementById('spacesList');
            let filtered = audioSpaces;
            if (filter === 'live') filtered = audioSpaces.filter(s => s.status === 'live');
            else if (filter === 'upcoming') filtered = audioSpaces.filter(s => s.status === 'upcoming');
            else if (filter === 'recorded') filtered = audioSpaces.filter(s => s.status === 'recorded');

            container.innerHTML = filtered.map(space => {
                const isLive = space.status === 'live';
                const isUpcoming = space.status === 'upcoming';
                const statusBadge = isLive
                    ? '<span class="bg-red-500/20 text-red-400 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1"><span class="w-1.5 h-1.5 bg-red-500 rounded-full live-dot"></span>مباشر</span>'
                    : isUpcoming
                    ? '<span class="bg-blue-500/20 text-blue-400 text-[10px] font-bold px-2 py-0.5 rounded-full">قريباً</span>'
                    : '<span class="bg-dark-700/50 text-dark-400 text-[10px] font-bold px-2 py-0.5 rounded-full">مسجل</span>';

                const speakersAvatars = space.speakers.map((s, i) => `
                    <div class="speaker-avatar">
                        <div class="w-10 h-10 rounded-full bg-gradient-to-br ${space.gradient} flex items-center justify-center text-white text-xs font-bold border-2 border-dark-900">${s}</div>
                        ${isLive ? '<div class="mic-icon bg-green-500"><span class="iconify text-white" data-icon="lucide:mic" style="font-size:7px"></span></div>' : ''}
                    </div>
                `).join('');

                const actionBtn = isLive
                    ? `<button class="bg-red-500 hover:bg-red-600 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-all active:scale-95" onclick="event.stopPropagation();showToast('انضممت إلى المساحة 🎙️')">انضم الآن</button>`
                    : isUpcoming
                    ? `<button class="bg-dark-800 hover:bg-dark-700 text-white text-xs font-semibold px-4 py-2 rounded-xl border border-dark-700 transition-all" onclick="event.stopPropagation();showToast('تم تفعيل التذكير 🔔')">تذكير</button>`
                    : `<button class="bg-dark-800 hover:bg-dark-700 text-white text-xs font-semibold px-4 py-2 rounded-xl border border-dark-700 transition-all" onclick="event.stopPropagation();showToast('تشغيل التسجيل ▶️')">استمع</button>`;

                const metaText = isLive
                    ? `<span class="text-red-400 text-[10px] flex items-center gap-1"><span class="w-1.5 h-1.5 bg-red-500 rounded-full live-dot"></span>${space.startedAgo}</span>`
                    : isUpcoming
                    ? `<span class="text-blue-400 text-[10px]">🕐 ${space.startsAt}</span>`
                    : `<span class="text-dark-500 text-[10px]">🎙️ ${space.recordedAgo}</span>`;

                return `
                    <div class="space-card ${isLive ? 'live' : ''} bg-dark-900/80 rounded-2xl p-5 cursor-pointer animate-fade-in-up" onclick="showToast('فتح المساحة: ${space.title}')">
                        <div class="flex items-start justify-between mb-3">
                            <div class="flex items-center gap-2">
                                ${statusBadge}
                                <span class="text-dark-500 text-[10px]">•</span>
                                <span class="text-dark-400 text-[10px]">${space.topic}</span>
                            </div>
                            ${actionBtn}
                        </div>
                        <h3 class="font-bold text-base mb-2 ${isLive ? 'text-white' : 'text-dark-200'}">${space.title}</h3>
                        <p class="text-dark-400 text-xs mb-3 leading-relaxed">${space.desc}</p>
                        <div class="flex items-center justify-between">
                            <div class="flex items-center gap-3">
                                <div class="flex -space-x-2 space-x-reverse">${speakersAvatars}</div>
                                <div>
                                    <p class="text-xs font-medium">${space.host}</p>
                                    <p class="text-dark-500 text-[10px]">${space.speakerNames.join('، ')}</p>
                                </div>
                            </div>
                            <div class="flex items-center gap-3">
                                ${metaText}
                                ${isLive ? `<span class="flex items-center gap-1 text-dark-400 text-[10px]"><span class="iconify" data-icon="lucide:headphones" style="font-size:12px"></span>${space.listeners}</span>` : ''}
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        }

        function switchSpaceTab(btn, filter) {
            document.querySelectorAll('.space-tab').forEach(t => {
                t.classList.remove('active', 'bg-red-500/20', 'text-red-400', 'bg-dark-800', 'text-white');
                t.classList.add('text-dark-400');
            });
            btn.classList.add('active');
            btn.classList.remove('text-dark-400');
            if (filter === 'live') {
                btn.classList.add('bg-red-500/20', 'text-red-400');
            } else {
                btn.classList.add('bg-dark-800', 'text-white');
            }
            renderSpaces(filter);
        }

        // ===== Auto-hide header + bottom nav on scroll =====
        (function() {
            let lastScroll = 0;
            const header = () => document.getElementById('mainHeader');
            const bottomNav = () => document.querySelector('.mobile-bottom-nav');
            const THRESHOLD = 10;
            const isMobile = () => window.innerWidth < 1024;

            window.addEventListener('scroll', function() {
                if (!isMobile()) return;
                const current = window.scrollY;

                // Don't trigger at very top
                if (current < 50) {
                    header()?.classList.remove('hide-on-scroll');
                    bottomNav()?.classList.remove('hide-on-scroll');
                    lastScroll = current;
                    return;
                }

                if (current - lastScroll > THRESHOLD) {
                    // Scrolling DOWN → hide
                    header()?.classList.add('hide-on-scroll');
                    bottomNav()?.classList.add('hide-on-scroll');
                } else if (lastScroll - current > THRESHOLD) {
                    // Scrolling UP → show
                    header()?.classList.remove('hide-on-scroll');
                    bottomNav()?.classList.remove('hide-on-scroll');
                }

                lastScroll = current;
            }, { passive: true });
        })();

        // ===== Initialize =====
        document.addEventListener('DOMContentLoaded', () => {
            loadSavedImages();
            loadProfile();
            renderTrendingList('all');
            renderFollowingPosts();
            renderSpaces('live');
            updateNotifDots();
            renderProfilePosts();
            // Remove static posts and render dynamic feed
            hideStaticPosts();
            renderFeedPosts();
        });
