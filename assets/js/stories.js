
        function handleStoryImageUpload(input) {
            if (!requireAuth()) return;
            const file = input.files[0]; if (!file) return;
            const reader = new FileReader();
            reader.onload = function(e) {
                let myUser = storiesData.find(u => u.isOwn);
                if (!myUser) {
                    myUser = { id: 'user-me', name: getProfile().name, avatar: UserStore.getString('profileAvatar') || 'https://picsum.photos/seed/lawyer-me/80/80.jpg', isOwn: true, stories: [] };
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
            if (!requireAuth()) return;
            const file = input.files[0]; if (!file) return;
            if (file.size > 50 * 1024 * 1024) { showToast('الفيديو كبير جداً (max 50MB)'); return; }
            showStoryUploadProgress();
            const reader = new FileReader();
            reader.onload = function(e) {
                let myUser = storiesData.find(u => u.isOwn);
                if (!myUser) {
                    myUser = { id: 'user-me', name: getProfile().name, avatar: UserStore.getString('profileAvatar') || 'https://picsum.photos/seed/lawyer-me/80/80.jpg', isOwn: true, stories: [] };
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

            // Check if this is the owner's story
            const isOwn = user.id === 'user-me' || user.isOwn === true;
            const viewersBar = document.getElementById('storyViewersBar');
            const swipeHint = document.getElementById('storySwipeHint');
            const reactionsRow = document.querySelector('.story-reactions');

            if (isOwn) {
                // Owner: show viewers bar + swipe hint, hide reactions
                if (viewersBar) viewersBar.style.display = 'flex';
                if (swipeHint) swipeHint.style.display = 'flex';
                if (reactionsRow) reactionsRow.style.display = 'none';
                updateStoryViewCount();
            } else {
                // Not owner: hide viewers bar + swipe hint, show reactions
                if (viewersBar) viewersBar.style.display = 'none';
                if (swipeHint) swipeHint.style.display = 'none';
                if (reactionsRow) reactionsRow.style.display = 'flex';
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

        // ===== SWIPE UP/DOWN for story viewer =====
        (function() {
            let touchStartY = 0;
            let touchStartTime = 0;
            const viewer = document.getElementById('storyViewer');
            if (!viewer) return;

            viewer.addEventListener('touchstart', (e) => {
                touchStartY = e.touches[0].clientY;
                touchStartTime = Date.now();
            }, { passive: true });

            viewer.addEventListener('touchend', (e) => {
                const touchEndY = e.changedTouches[0].clientY;
                const deltaY = touchStartY - touchEndY;
                const elapsed = Date.now() - touchStartTime;

                // Swipe up fast (deltaY > 80px, within 400ms)
                if (deltaY > 80 && elapsed < 400) {
                    const user = storiesData[currentStoryUserIndex];
                    if (user && (user.id === 'user-me' || user.isOwn)) {
                        // Pause story and show viewers
                        storyPaused = true;
                        const video = viewer.querySelector('video');
                        if (video) video.pause();
                        showStoryViewersList();
                    }
                }

                // Swipe down fast (deltaY < -80px, within 400ms) → close story
                if (deltaY < -80 && elapsed < 400) {
                    closeStoryViewer();
                }
            }, { passive: true });
        })();

        function sendStoryReply() {
            if (!requireAuth()) return;
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
            if (!requireAuth()) return;
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
