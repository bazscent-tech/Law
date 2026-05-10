        function saveUserReplies() { UserStore.setJSON('userReplies', userReplies); }
        function saveUserLikes() { UserStore.setJSON('userLikes', userLikes); }
        function savePlatformComments() { UserStore.setJSON('platformComments', platformComments); }

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
        // ===== PIN POST FEATURE ============================
        // ====================================================
        let pinnedPostId = UserStore.getString('pinnedPostId', '');

        function isPinned(postId) { return pinnedPostId === postId; }

        function pinPost(postId) {
            pinnedPostId = postId;
            UserStore.setString('pinnedPostId', postId);
            showToast('تم تثبيت المنشور 📌');
            // Re-render profile if on profile page
            const profilePage = document.getElementById('page-profile');
            if (profilePage && !profilePage.classList.contains('hidden')) {
                renderProfilePosts();
            }
        }

        function unpinPost() {
            pinnedPostId = '';
            UserStore.setString('pinnedPostId', '');
            showToast('تم إلغاء تثبيت المنشور');
            const profilePage = document.getElementById('page-profile');
            if (profilePage && !profilePage.classList.contains('hidden')) {
                renderProfilePosts();
            }
        }

        function togglePin(postId) {
            if (isPinned(postId)) {
                unpinPost();
            } else {
                pinPost(postId);
            }
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
                c = Safe.parse(commentOrId, null);
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
            const avatar = profile.avatar || sbProfile?.avatar_url || 'https://api.dicebear.com/7.x/initials/svg?seed=User&backgroundColor=f97316&textColor=ffffff';
            const isStickerOnly = /^[\p{Emoji}\s]+$/u.test(text) && text.length <= 10;
            const comment = { id: 'comment-' + Date.now(), author: profile.name, avatar: avatar, text, isSticker: isStickerOnly, time: 'الآن' };
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
                div.innerHTML = `<img src="${avatar}" class="w-8 h-8 rounded-lg object-cover shrink-0" alt=""><div class="flex-1 bg-dark-850 rounded-xl px-3 py-2"><p class="text-xs font-semibold mb-1">${profile.name}</p>${isStickerOnly ? `<div class="comment-sticker-sm">${text}</div>` : `<p class="text-xs text-dark-300">${text.replace(/</g,'&lt;')}</p>`}<p class="text-[10px] text-dark-500 mt-1">الآن • <span class="cursor-pointer hover:text-brand-400">إعجاب</span> • <span class="cursor-pointer hover:text-brand-400">رد</span> • <span class="share-comment-btn" onclick="shareCommentAsPost('${postId}',comment.id)">مشاركة</span></p></div>`;
                area.insertBefore(div, area.lastElementChild);
            }
            inputEl.value = '';
            showToast('تم إرسال التعليق ✓');
        }

        // ===== Tabs =====
        function switchTab(btn) { document.querySelectorAll('.feed-tab').forEach(t=>{t.classList.remove('active','bg-dark-800','text-white');t.classList.add('text-dark-400')}); btn.classList.add('active','bg-dark-800','text-white');btn.classList.remove('text-dark-400'); }
        function switchProfileTab(btn) { document.querySelectorAll('.profile-tab').forEach(t=>{t.classList.remove('active','bg-dark-800','text-white');t.classList.add('text-dark-400')}); btn.classList.add('active','bg-dark-800','text-white');btn.classList.remove('text-dark-400'); const tn=btn.textContent.trim(); const isLib=tn.includes('المكتبة'); document.getElementById('profilePostsList').style.display=isLib?'none':''; document.getElementById('profileEmptyState').style.display=isLib?'none':''; document.getElementById('profileLibraries').classList.toggle('hidden',!isLib); if(isLib){if(_visitingProfile&&typeof Library!=='undefined'){_renderVisitedProfileLibraries(_visitingProfile.id)}else if(typeof Library!=='undefined')Library.renderProfileLibraries(sbUser?.id||'local')} else if(tn==='المنشورات'){if(_visitingProfile)_renderVisitedProfilePosts(_visitingProfile.id);else renderProfilePosts()} else if(tn==='الردود'){if(!_visitingProfile)renderProfileReplies()} else if(tn==='الإعجابات'){if(!_visitingProfile)renderProfileLikes()} }
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
        function buildRepostHTML(post) {
            const profile = getProfile();
            const pinBtn = isPinned(post.id) ? `<div class="flex items-center gap-1 text-brand-400 text-[10px] mb-1"><span class="iconify text-xs" data-icon="lucide:pin"></span>مثبت</div>` : '';
            return `<article class="post-card bg-dark-900/80 border border-dark-800/50 rounded-2xl mb-5 transition-all duration-300 animate-fade-in-up overflow-hidden">
                ${pinBtn}
                <div class="flex items-center gap-2 px-5 pt-3 pb-0 text-dark-500 text-xs"><span class="iconify text-sm" data-icon="lucide:repeat-2"></span><span>${profile.name} أعاد النشر</span></div>
                <div class="p-5 pb-0"><div class="flex items-start justify-between mb-3"><div class="flex items-center gap-3"><div class="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold border border-dark-700 shrink-0">${(post.originalAuthor||'').charAt(0)}</div><div><h3 class="font-semibold text-sm">${post.originalAuthor}</h3><p class="text-dark-400 text-xs">${post.time}</p></div></div></div>${post.title?`<h2 class="font-bold text-base mb-2">${post.title}</h2>`:''}<div class="mb-3 cursor-pointer" onclick="openPostDetail('${post.repostOf||post.id}')"><p class="text-dark-200 text-sm leading-relaxed">${post.displayText}</p></div></div>
                <div class="border-t border-dark-800/50 px-2 py-1"><div class="flex items-center justify-around"><button class="like-btn flex items-center gap-2 px-4 py-2.5 rounded-xl hover:bg-dark-800/50 transition-all group" onclick="toggleLike(this,${post.likes},'pf-likes-${post.id}','${post.id}',this.closest('article'))"><span class="iconify text-lg text-dark-400 group-hover:text-red-400" data-icon="lucide:heart"></span><span class="text-sm text-dark-400 like-count">${post.likes}</span></button><button class="flex items-center gap-2 px-4 py-2.5 rounded-xl hover:bg-dark-800/50 transition-all group" onclick="openPostDetail('${post.id}')"><span class="iconify text-lg text-dark-400 group-hover:text-blue-400" data-icon="lucide:message-circle"></span><span class="text-sm text-dark-400">${post.comments}</span></button><button class="repost-btn reposted flex items-center gap-2 px-4 py-2.5 rounded-xl hover:bg-dark-800/50 transition-all group" onclick="toggleRepost('${post.id}',this,this.closest('article'))"><span class="iconify text-lg text-green-400" data-icon="lucide:repeat-2"></span><span class="text-sm text-green-400">${post.shares}</span></button><button class="bookmark-btn flex items-center gap-2 px-4 py-2.5 rounded-xl hover:bg-dark-800/50 transition-all group" onclick="toggleBookmark(this)"><span class="iconify text-lg text-dark-400 group-hover:text-brand-400" data-icon="lucide:bookmark"></span></button></div></div>
            </article>`;
        }

        function buildOwnPostHTML(post) {
            const profile = getProfile();
            const avatar = profile.avatar || sbProfile?.avatar_url || 'https://api.dicebear.com/7.x/initials/svg?seed=User&backgroundColor=f97316&textColor=ffffff';
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
                            <img src="${avatar}" class="w-11 h-11 rounded-xl object-cover border border-dark-700" alt="">
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
                                <button onclick="togglePin('${post.id}');this.closest('.post-options-menu').classList.remove('open')"><span class="iconify text-brand-400" data-icon="${isPinned(post.id) ? 'lucide:pin-off' : 'lucide:pin'}" style="font-size:16px"></span>${isPinned(post.id) ? 'إلغاء التثبيت' : 'تثبيت المنشور'}</button>
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
                    <div class="comment-input-row">
                        <button onclick="event.stopPropagation();toggleStickerPicker('${post.id}')" class="comment-sticker-btn"><span class="iconify text-dark-400 text-lg" data-icon="lucide:smile"></span></button>
                        <div id="stickerPicker-${post.id}" class="sticker-picker"></div>
                        <input type="text" placeholder="اكتب تعليقاً..." class="comment-input-field" onkeydown="if(event.key==='Enter'){submitComment(this,'${post.id}')}">
                        <button class="comment-send-btn" onclick="submitComment(this.previousElementSibling,'${post.id}')"><span class="iconify text-white text-sm" data-icon="lucide:send"></span></button>
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
            const authorSafe = Safe.escapeHtml(post.author).replace(/'/g, "\\'");
            const avatarHTML = post.avatarUrl
                ? `<img src="${post.avatarUrl}" class="w-11 h-11 rounded-xl object-cover border border-dark-700 shrink-0" alt="">`
                : `<div class="w-11 h-11 rounded-xl bg-gradient-to-br ${post.gradient} flex items-center justify-center text-white font-bold border border-dark-700 shrink-0">${post.avatar}</div>`;

            return `<article class="post-card bg-dark-900/80 border border-dark-800/50 rounded-2xl mb-5 transition-all duration-300 animate-fade-in-up overflow-hidden" style="animation-delay:${index*80}ms"><div class="p-5 pb-0"><div class="flex items-start justify-between mb-3"><div class="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity" onclick="openUserProfile('${authorSafe}')">${avatarHTML}<div><div class="flex items-center gap-2"><h3 class="font-semibold text-sm hover:underline">${post.author}</h3>${vb}</div><p class="text-dark-400 text-xs">${post.role} • ${post.time}</p></div></div>${fb}</div><div class="mb-3 cursor-pointer" onclick="openPostDetail('${post.id}')">${th}<p class="text-dark-200 text-sm leading-relaxed">${post.content.replace(/\n/g,'<br>')}</p></div><div class="flex flex-wrap gap-2 mb-4">${tagsHTML}</div></div><div class="px-5 pb-2"><div class="flex items-center justify-between text-dark-400 text-xs mb-2"><span id="likes-inf-${index}">${post.likes} إعجاب</span><span class="cursor-pointer hover:text-brand-400" onclick="openPostDetail('${post.id}')">${comments.length} تعليق • ${post.shares} مشاركة</span></div></div><div class="border-t border-dark-800/50 px-2 py-1"><div class="flex items-center justify-around"><button class="like-btn${isLiked(post.id)?' liked':''} flex items-center gap-2 px-4 py-2.5 rounded-xl hover:bg-dark-800/50 transition-all group" onclick="toggleLike(this,${post.likes},'likes-inf-${index}','${post.id}',this.closest('article'))"><span class="iconify text-lg ${isLiked(post.id)?'text-red-400':'text-dark-400'} group-hover:text-red-400 transition-colors" data-icon="lucide:heart"></span><span class="text-sm ${isLiked(post.id)?'text-red-400':'text-dark-400'} group-hover:text-red-400 transition-colors like-count">${post.likes}</span></button><button class="flex items-center gap-2 px-4 py-2.5 rounded-xl hover:bg-dark-800/50 transition-all group" onclick="openPostDetail('${post.id}')"><span class="iconify text-lg text-dark-400 group-hover:text-blue-400 transition-colors" data-icon="lucide:message-circle"></span><span class="text-sm text-dark-400 group-hover:text-blue-400 transition-colors">${comments.length}</span></button><button class="repost-btn${isReposted(post.id)?' reposted':''} flex items-center gap-2 px-4 py-2.5 rounded-xl hover:bg-dark-800/50 transition-all group" onclick="toggleRepost('${post.id}',this,this.closest('article'))"><span class="iconify text-lg ${isReposted(post.id)?'text-green-400':'text-dark-400'} group-hover:text-green-400 transition-colors" data-icon="lucide:repeat-2"></span><span class="text-sm ${isReposted(post.id)?'text-green-400':'text-dark-400'} group-hover:text-green-400 transition-colors">${post.shares}</span></button><button class="bookmark-btn flex items-center gap-2 px-4 py-2.5 rounded-xl hover:bg-dark-800/50 transition-all group" onclick="toggleBookmark(this)"><span class="iconify text-lg text-dark-400 group-hover:text-brand-400 transition-colors" data-icon="lucide:bookmark"></span></button></div></div><div class="comment-section px-5 pb-4" id="comments-${post.id}"><div class="border-t border-dark-800/50 pt-3 space-y-3">${comments.map(c=>`<div class="flex gap-3"><img src="${c.avatar||'https://picsum.photos/seed/default/40/40.jpg'}" class="w-8 h-8 rounded-lg object-cover shrink-0" alt=""><div class="flex-1 bg-dark-850 rounded-xl px-3 py-2"><p class="text-xs font-semibold mb-1">${c.author}</p>${c.isSticker?`<div class="comment-sticker-sm">${c.text}</div>`:`<p class="text-xs text-dark-300">${c.text}</p>`}<p class="text-[10px] text-dark-500 mt-1">${c.time} • <span class="cursor-pointer hover:text-brand-400">إعجاب</span> • <span class="cursor-pointer hover:text-brand-400">رد</span> • <span class="share-comment-btn" onclick="shareCommentAsPost('${post.id}',c.id)">مشاركة</span></p></div></div>`).join('')}<div class="comment-input-row"><button onclick="event.stopPropagation();toggleStickerPicker('${post.id}')" class="comment-sticker-btn"><span class="iconify text-dark-400 text-lg" data-icon="lucide:smile"></span></button><div id="stickerPicker-${post.id}" class="sticker-picker"></div><input type="text" placeholder="اكتب تعليقاً..." class="comment-input-field" onkeydown="if(event.key==='Enter'){submitComment(this,'${post.id}')}"><button class="comment-send-btn" onclick="submitComment(this.previousElementSibling,'${post.id}')"><span class="iconify text-white text-sm" data-icon="lucide:send"></span></button></div></div></div></article>`;
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

            // Separate pinned post from rest
            let pinnedPost = null;
            let otherPosts = allUserPostsLocal;
            if (pinnedPostId) {
                const pinnedIdx = allUserPostsLocal.findIndex(p => p.id === pinnedPostId);
                if (pinnedIdx !== -1) {
                    pinnedPost = allUserPostsLocal[pinnedIdx];
                    otherPosts = [...allUserPostsLocal.slice(0, pinnedIdx), ...allUserPostsLocal.slice(pinnedIdx + 1)];
                }
            }

            let html = '';

            // Render pinned post at top with indicator
            if (pinnedPost) {
                const pinnedHTML = pinnedPost.isRepost ? buildRepostHTML(pinnedPost) : buildOwnPostHTML(pinnedPost);
                html += `<div class="pinned-post-wrapper mb-5">
                    <div class="flex items-center gap-2 px-4 py-2 text-brand-400 text-xs font-medium">
                        <span class="iconify text-sm" data-icon="lucide:pin"></span>
                        <span>منشور مثبت</span>
                    </div>
                    ${pinnedHTML}
                </div>`;
            }

            // Render rest of posts
            html += otherPosts.map(post => {
                if(post.isRepost){
                    return buildRepostHTML(post);
                }
                return buildOwnPostHTML(post);
            }).join('');

            c.innerHTML = html;
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
