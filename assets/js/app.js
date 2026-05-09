        // ===== Image Upload Handlers =====
        function handleProfilePhotoUpload(input, ...imgIds) {
            const file = input.files[0];
            if (!file) return;
            if (!file.type.startsWith('image/')) { showToast('يرجى اختيار صورة فقط'); return; }
            const reader = new FileReader();
            reader.onload = function(e) {
                imgIds.forEach(id => { const el = document.getElementById(id); if (el) el.src = e.target.result; });
                localStorage.setItem('profileAvatar', e.target.result);
                showToast('تم تحديث الصورة الشخصية ✓');
            };
            reader.readAsDataURL(file);
        }

        function handleCoverUpload(input) {
            const file = input.files[0];
            if (!file) return;
            if (!file.type.startsWith('image/')) { showToast('يرجى اختيار صورة فقط'); return; }
            const reader = new FileReader();
            reader.onload = function(e) {
                const img = document.getElementById('coverPhoto');
                if (img) { img.src = e.target.result; img.classList.remove('hidden'); img.parentElement.style.background = 'none'; }
                localStorage.setItem('coverPhoto', e.target.result);
                showToast('تم تحديث صورة الغلاف ✓');
            };
            reader.readAsDataURL(file);
        }

        function loadSavedImages() {
            const savedAvatar = localStorage.getItem('profileAvatar');
            if (savedAvatar) { ['mobileAvatar','sidebarAvatar','desktopAvatar'].forEach(id => { const el = document.getElementById(id); if (el) el.src = savedAvatar; }); }
            const savedCover = localStorage.getItem('coverPhoto');
            if (savedCover) { const img = document.getElementById('coverPhoto'); if (img) { img.src = savedCover; img.classList.remove('hidden'); img.parentElement.style.background = 'none'; } }
        }

        // ===== Toast =====
        function showToast(message) {
            const toast = document.getElementById('toast');
            toast.textContent = message;
            toast.classList.add('show');
            setTimeout(() => toast.classList.remove('show'), 2500);
        }

        // ===== Following State =====
        let followingUsers = JSON.parse(localStorage.getItem('followingUsers') || '[]');
        function saveFollowing() { localStorage.setItem('followingUsers', JSON.stringify(followingUsers)); }
        function isFollowing(author) { return followingUsers.includes(author); }

        function toggleFollow(btn) {
            const author = btn.dataset.author;
            if (!author) return;
            if (isFollowing(author)) {
                followingUsers = followingUsers.filter(a => a !== author);
                saveFollowing(); showToast('تم إلغاء المتابعة');
            } else {
                followingUsers.push(author);
                saveFollowing(); btn.style.transform = 'scale(1.1)'; setTimeout(() => btn.style.transform = '', 200);
                showToast('تمت المتابعة ✓');
            }
            renderFeedPosts(); renderFollowingPosts();
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

        function getPageLabel(page) {
            const map = { 'feed':'الرئيسية','profile':'ملفي الشخصي','connections':'الروابط','bookmarks':'المحفوظات','articles':'مقالاتي','events':'الفعاليات','certificates':'الشهادات','notifications':'الإشعارات','messages':'الرسائل','settings':'الإعدادات','following':'أتابع','audio-spaces':'المساحات الصوتية','trending':'المواضيع الرائجة' };
            return map[page] || '';
        }

        function doSearch() { const q = document.getElementById('searchInput').value.trim(); if (q) showToast('بحث عن: ' + q); }

        // ===== Mobile Menu =====
        function openMobileMenu() { document.getElementById('mobileMenuOverlay').classList.add('open'); document.body.style.overflow = 'hidden'; }
        function closeMobileMenu() { document.getElementById('mobileMenuOverlay').classList.remove('open'); document.body.style.overflow = ''; }

        // Swipe gestures
        (function() {
            let startX=0,startY=0,currentX=0,currentY=0,isDragging=false,dragType=null,moved=false;
            const EDGE=50,OPEN_THRESHOLD=40,CLOSE_THRESHOLD=50,DEADZONE=15;
            const overlay=()=>document.getElementById('mobileMenuOverlay'), drawer=()=>document.getElementById('mobileDrawer');
            const isOpen=()=>overlay()?.classList.contains('open'), isMobile=()=>window.innerWidth<1024;
            document.addEventListener('touchstart',function(e){if(!isMobile())return;const t=e.touches[0];startX=t.clientX;startY=t.clientY;currentX=startX;currentY=startY;moved=false;if(!isOpen()&&startX>window.innerWidth-EDGE){isDragging=true;dragType='open';drawer().style.transition='none'}else if(isOpen()){isDragging=true;dragType='close';drawer().style.transition='none'}},{passive:true});
            document.addEventListener('touchmove',function(e){if(!isDragging||!isMobile())return;const t=e.touches[0];currentX=t.clientX;currentY=t.clientY;moved=true;const dx=currentX-startX,dy=Math.abs(currentY-startY);if(dragType==='open'&&dy>Math.abs(dx)&&dy>DEADZONE){isDragging=false;drawer().style.transition='';overlay().style.opacity='';overlay().style.visibility='';return}if(dragType==='open'&&dx<0){const dW=drawer().offsetWidth||280;drawer().style.transform=`translateX(${Math.max(0,dW+dx)}px)`;const p=Math.min(1,Math.abs(dx)/dW);overlay().style.opacity=String(p*0.5);if(p>0.02)overlay().style.visibility='visible'}else if(dragType==='close'&&dx>0){const dW=drawer().offsetWidth||280;drawer().style.transform=`translateX(${dx}px)`;const p=Math.min(1,dx/dW);overlay().style.opacity=String(0.5-p*0.5)}},{passive:true});
            document.addEventListener('touchend',function(){if(!isDragging||!isMobile())return;drawer().style.transition='';overlay().style.opacity='';overlay().style.visibility='';const dx=currentX-startX;if(dragType==='open'){if(moved&&dx<-OPEN_THRESHOLD)openMobileMenu();else{drawer().style.transform='';overlay().style.visibility='hidden'}}else if(dragType==='close'){if(moved&&dx>CLOSE_THRESHOLD)closeMobileMenu();else openMobileMenu()}isDragging=false;dragType=null},{passive:true});
        })();

        // ===== Post Input =====
        function handlePostInput(el) { el.style.color = el.textContent.trim() === '' ? '' : '#fff'; }
        const postInput = document.getElementById('postInput');
        if (postInput) { const s = document.createElement('style'); s.textContent = `#postInput:empty::before { content: attr(data-placeholder); color: #525252; pointer-events: none; }`; document.head.appendChild(s); }

        // ===== Profile Data =====
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
        // ===== USER POSTS, REPLIES, LIKES, REPOSTS ==========
        // ====================================================

        let userPostCounter = parseInt(localStorage.getItem('userPostCounter') || '0');
        let userPosts = JSON.parse(localStorage.getItem('userPosts') || '[]');
        let userReplies = JSON.parse(localStorage.getItem('userReplies') || '[]');
        let userLikes = JSON.parse(localStorage.getItem('userLikes') || '[]');

        function saveUserPosts() { localStorage.setItem('userPosts', JSON.stringify(userPosts)); localStorage.setItem('userPostCounter', String(userPostCounter)); }
        function saveUserReplies() { localStorage.setItem('userReplies', JSON.stringify(userReplies)); }
        function saveUserLikes() { localStorage.setItem('userLikes', JSON.stringify(userLikes)); }

        // ===== Helper: create post card HTML =====
        function buildPostCardHTML(post, options = {}) {
            const profile = getProfile();
            const isOwnPost = options.own;
            const isRepost = options.repost;
            const showAuthor = options.author || (isOwnPost ? profile.name : '');
            const showTitle = options.title || '';
            const showRole = options.role || (isOwnPost ? profile.title : '');
            const showTime = options.time || post.time || 'الآن';
            const showAvatar = options.avatar || 'https://picsum.photos/seed/lawyer-me/80/80.jpg';
            const showVerified = options.verified !== false;
            const repostBanner = isRepost ? `<div class="flex items-center gap-2 px-5 pt-3 pb-0 text-dark-500 text-xs"><span class="iconify text-sm" data-icon="lucide:repeat-2"></span><span>${profile.name} أعاد النشر</span></div>` : '';

            const tagsHTML = (post.tags || []).map(t => {
                const colors = ['brand','blue','purple','green','cyan','pink','yellow'];
                const color = colors[Math.abs(t.charCodeAt(1)) % colors.length];
                return `<span class="hashtag bg-${color}-500/10 text-${color}-400 text-xs font-medium px-3 py-1 rounded-full cursor-pointer transition-all" onclick="showToast('تصفية: ${t}')">${t}</span>`;
            }).join('');

            const likesId = options.likesId || `card-likes-${post.id}`;
            const commentsId = options.commentsId || `card-comments-${post.id}`;

            return `
                ${repostBanner}
                <div class="p-5 pb-0">
                    <div class="flex items-start justify-between mb-3">
                        <div class="flex items-center gap-3 cursor-pointer" onclick="showPage('profile')">
                            ${options.avatarHTML || `<img src="${showAvatar}" class="w-11 h-11 rounded-xl object-cover border border-dark-700" alt="">`}
                            <div>
                                <div class="flex items-center gap-2">
                                    <h3 class="font-semibold text-sm">${showAuthor}</h3>
                                    ${showVerified ? '<span class="iconify text-brand-500 text-sm" data-icon="lucide:badge-check"></span>' : ''}
                                </div>
                                <p class="text-dark-400 text-xs">${showRole} • ${showTime}</p>
                            </div>
                        </div>
                        <button class="p-2.5 rounded-xl hover:bg-dark-800/50 transition-all group" onclick="showPostMenu(this)">
                            <span class="iconify text-lg text-dark-400 group-hover:text-dark-200 transition-colors" data-icon="lucide:more-horizontal"></span>
                        </button>
                    </div>
                    ${showTitle ? `<h2 class="font-bold text-base mb-2 leading-relaxed">${showTitle}</h2>` : ''}
                    <div class="mb-3"><p class="text-dark-200 text-sm leading-relaxed">${post.displayText || post.content || ''}</p></div>
                    ${post.tags && post.tags.length > 0 ? `<div class="flex flex-wrap gap-2 mb-4">${tagsHTML}</div>` : ''}
                </div>
                <div class="px-5 pb-2">
                    <div class="flex items-center justify-between text-dark-400 text-xs mb-2">
                        <span id="${likesId}">${post.likes || 0} إعجاب</span>
                        <span>${post.comments || 0} تعليق • ${post.shares || 0} مشاركة</span>
                    </div>
                </div>
                <div class="border-t border-dark-800/50 px-2 py-1">
                    <div class="flex items-center justify-around">
                        <button class="like-btn${isLiked(post.id) ? ' liked' : ''} flex items-center gap-2 px-4 py-2.5 rounded-xl hover:bg-dark-800/50 transition-all group" onclick="toggleLike(this, ${post.likes || 0}, '${likesId}', '${post.id}', this.closest('article'))">
                            <span class="iconify text-lg ${isLiked(post.id) ? 'text-red-400' : 'text-dark-400'} group-hover:text-red-400 transition-colors" data-icon="lucide:heart"></span>
                            <span class="text-sm ${isLiked(post.id) ? 'text-red-400' : 'text-dark-400'} group-hover:text-red-400 transition-colors like-count">${post.likes || 0}</span>
                        </button>
                        <button class="flex items-center gap-2 px-4 py-2.5 rounded-xl hover:bg-dark-800/50 transition-all group" onclick="toggleComments('${post.id}')">
                            <span class="iconify text-lg text-dark-400 group-hover:text-blue-400 transition-colors" data-icon="lucide:message-circle"></span>
                            <span class="text-sm text-dark-400 group-hover:text-blue-400 transition-colors">${post.comments || 0}</span>
                        </button>
                        <button class="repost-btn${isReposted(post.id) ? ' reposted' : ''} flex items-center gap-2 px-4 py-2.5 rounded-xl hover:bg-dark-800/50 transition-all group" onclick="toggleRepost('${post.id}', this, this.closest('article'))">
                            <span class="iconify text-lg ${isReposted(post.id) ? 'text-green-400' : 'text-dark-400'} group-hover:text-green-400 transition-colors" data-icon="lucide:repeat-2"></span>
                            <span class="text-sm ${isReposted(post.id) ? 'text-green-400' : 'text-dark-400'} group-hover:text-green-400 transition-colors">${post.shares || 0}</span>
                        </button>
                        <button class="bookmark-btn flex items-center gap-2 px-4 py-2.5 rounded-xl hover:bg-dark-800/50 transition-all group" onclick="toggleBookmark(this)">
                            <span class="iconify text-lg text-dark-400 group-hover:text-brand-400 transition-colors" data-icon="lucide:bookmark"></span>
                        </button>
                        <button class="p-2.5 rounded-xl hover:bg-dark-800/50 transition-all group" onclick="showPostMenu(this)">
                            <span class="iconify text-lg text-dark-400 group-hover:text-dark-200 transition-colors" data-icon="lucide:more-horizontal"></span>
                        </button>
                    </div>
                </div>
                <div class="comment-section px-5 pb-4" id="comments-${post.id}">
                    <div class="border-t border-dark-800/50 pt-3 space-y-3">
                        ${(post.commentList || []).map(c => `
                            <div class="flex gap-3">
                                <img src="${c.avatar || 'https://picsum.photos/seed/default/40/40.jpg'}" class="w-8 h-8 rounded-lg object-cover shrink-0" alt="">
                                <div class="flex-1 bg-dark-850 rounded-xl px-3 py-2">
                                    <p class="text-xs font-semibold mb-1">${c.author || 'مستخدم'}</p>
                                    <p class="text-xs text-dark-300">${c.text}</p>
                                    <p class="text-[10px] text-dark-500 mt-1">${c.time || ''} • <span class="cursor-pointer hover:text-brand-400">إعجاب</span> • <span class="cursor-pointer hover:text-brand-400">رد</span></p>
                                </div>
                            </div>
                        `).join('')}
                        <div class="flex gap-2 mt-2">
                            <input type="text" placeholder="اكتب تعليقاً..." class="comment-input flex-1 bg-dark-800 border border-dark-700/50 rounded-lg px-3 py-2 text-xs text-white placeholder-dark-400 focus:outline-none focus:border-brand-500/50 transition-all" onkeydown="if(event.key==='Enter'){submitComment(this,'${post.id}')}">
                            <button class="bg-brand-500 hover:bg-brand-600 text-white text-xs px-3 py-2 rounded-lg transition-all" onclick="submitComment(this.previousElementSibling,'${post.id}')">إرسال</button>
                        </div>
                    </div>
                </div>
            `;
        }

        // ===== LIKE SYSTEM =====
        function isLiked(postId) { return userLikes.some(p => p.id === postId); }

        function toggleLike(btn, count, likesId, postId, articleEl) {
            const isNowLiked = btn.classList.toggle('liked');
            const countEl = btn.querySelector('.like-count');
            const icon = btn.querySelector('.iconify');
            const likesEl = document.getElementById(likesId);

            if (isNowLiked) {
                const newCount = count + 1;
                countEl.textContent = newCount;
                icon.style.color = '#ef4444'; countEl.style.color = '#ef4444';
                if (likesEl) likesEl.textContent = newCount + ' إعجاب';
                btn.style.transform = 'scale(1.15)'; setTimeout(() => btn.style.transform = '', 200);

                // Save liked post data
                const postData = extractPostDataFromDOM(articleEl, postId);
                if (postData && !isLiked(postId)) {
                    userLikes.unshift(postData);
                    saveUserLikes();
                }
            } else {
                countEl.textContent = count;
                icon.style.color = ''; countEl.style.color = '';
                if (likesEl) likesEl.textContent = count + ' إعجاب';
                // Remove from likes
                userLikes = userLikes.filter(p => p.id !== postId);
                saveUserLikes();
            }
        }

        function extractPostDataFromDOM(articleEl, postId) {
            if (!articleEl) return null;
            const authorEl = articleEl.querySelector('.font-semibold.text-sm');
            const roleEl = articleEl.querySelector('.text-dark-400.text-xs');
            const contentEl = articleEl.querySelector('.text-dark-200.text-sm');
            const titleEl = articleEl.querySelector('.font-bold.text-base');
            const tagEls = articleEl.querySelectorAll('.hashtag');

            return {
                id: postId,
                author: authorEl ? authorEl.textContent.trim() : 'مستخدم',
                role: roleEl ? roleEl.textContent.replace(/•.*/, '').trim() : '',
                content: contentEl ? contentEl.innerHTML : '',
                displayText: contentEl ? contentEl.innerHTML : '',
                title: titleEl ? titleEl.textContent.trim() : '',
                tags: Array.from(tagEls).map(t => t.textContent.trim()),
                likes: parseInt(articleEl.querySelector('.like-count')?.textContent || '0'),
                comments: 0,
                shares: 0,
                time: 'منذ قليل',
                gradient: 'from-blue-500 to-purple-600'
            };
        }

        // ===== REPOST SYSTEM =====
        function isReposted(postId) { return userPosts.some(p => p.repostOf === postId); }

        function toggleRepost(postId, btn, articleEl) {
            if (isReposted(postId)) {
                // Undo repost
                userPosts = userPosts.filter(p => p.repostOf !== postId);
                saveUserPosts();
                btn.classList.remove('reposted');
                const icon = btn.querySelector('.iconify');
                const countEl = btn.querySelector('.text-sm');
                icon.style.color = ''; countEl.style.color = '';
                showToast('تم إلغاء إعادة النشر');
                // Decrease share count in DOM
                const shareCount = parseInt(countEl.textContent) || 0;
                countEl.textContent = Math.max(0, shareCount - 1);
            } else {
                // Repost
                const profile = getProfile();
                const postData = extractPostDataFromDOM(articleEl, postId);
                if (!postData) return;

                userPostCounter++;
                const repostId = 'repost-' + userPostCounter;
                userPosts.unshift({
                    id: repostId,
                    repostOf: postId,
                    originalAuthor: postData.author,
                    text: postData.content,
                    displayText: postData.displayText,
                    tags: postData.tags,
                    title: postData.title,
                    time: 'الآن',
                    likes: 0,
                    comments: 0,
                    shares: 0,
                    isRepost: true
                });
                saveUserPosts();

                btn.classList.add('reposted');
                const icon = btn.querySelector('.iconify');
                const countEl = btn.querySelector('.text-sm');
                icon.style.color = '#22c55e'; countEl.style.color = '#22c55e';
                const shareCount = parseInt(countEl.textContent) || 0;
                countEl.textContent = shareCount + 1;
                btn.style.transform = 'scale(1.15)'; setTimeout(() => btn.style.transform = '', 200);
                showToast('تم إعادة النشر إلى ملفك ✓');
            }
        }

        // ===== COMMENT / REPLY SYSTEM =====
        function submitComment(inputEl, postId) {
            const text = inputEl.value.trim();
            if (!text) return;

            const profile = getProfile();
            const displayText = text.replace(/</g, '&lt;').replace(/>/g, '&gt;');

            // Find parent post info
            const articleEl = document.getElementById('comments-' + postId)?.closest('article');
            const parentAuthor = articleEl?.querySelector('.font-semibold.text-sm')?.textContent.trim() || 'مستخدم';
            const parentContent = articleEl?.querySelector('.text-dark-200.text-sm, .font-bold.text-base')?.textContent.trim().substring(0, 80) || '';

            // Save reply to userReplies
            userReplies.unshift({
                id: 'reply-' + Date.now(),
                postId: postId,
                parentAuthor: parentAuthor,
                parentContent: parentContent + '...',
                replyText: displayText,
                time: 'الآن'
            });
            saveUserReplies();

            // Add comment to DOM
            const commentSection = document.getElementById('comments-' + postId);
            if (commentSection) {
                commentSection.classList.add('open');
                const commentsArea = commentSection.querySelector('.space-y-3');
                const newComment = document.createElement('div');
                newComment.className = 'flex gap-3';
                newComment.innerHTML = `
                    <img src="https://picsum.photos/seed/lawyer-me/40/40.jpg" class="w-8 h-8 rounded-lg object-cover shrink-0" alt="">
                    <div class="flex-1 bg-dark-850 rounded-xl px-3 py-2">
                        <p class="text-xs font-semibold mb-1">${profile.name}</p>
                        <p class="text-xs text-dark-300">${displayText}</p>
                        <p class="text-[10px] text-dark-500 mt-1">الآن • <span class="cursor-pointer hover:text-brand-400">إعجاب</span> • <span class="cursor-pointer hover:text-brand-400">رد</span></p>
                    </div>
                `;
                commentsArea.insertBefore(newComment, commentsArea.lastElementChild);
            }

            inputEl.value = '';
            showToast('تم إرسال التعليق ✓');
        }

        // ===== RENDER PROFILE TABS =====
        function renderProfilePosts() {
            const container = document.getElementById('profilePostsList');
            const emptyState = document.getElementById('profileEmptyState');
            if (!container) return;

            if (userPosts.length === 0) {
                container.innerHTML = '';
                if (emptyState) { emptyState.style.display = ''; emptyState.querySelector('p').textContent = 'لم تنشر أي شيء بعد'; emptyState.querySelector('button').textContent = 'اكتب أول منشور'; emptyState.querySelector('button').setAttribute('onclick', 'showPostModal()'); }
                return;
            }

            if (emptyState) emptyState.style.display = 'none';
            const profile = getProfile();
            container.innerHTML = userPosts.map((post, i) => {
                if (post.isRepost) {
                    // Reposted post with original author info
                    return `
                    <article class="post-card bg-dark-900/80 border border-dark-800/50 rounded-2xl mb-5 transition-all duration-300 animate-fade-in-up overflow-hidden">
                        <div class="flex items-center gap-2 px-5 pt-3 pb-0 text-dark-500 text-xs">
                            <span class="iconify text-sm" data-icon="lucide:repeat-2"></span>
                            <span>${profile.name} أعاد النشر</span>
                        </div>
                        <div class="p-5 pb-0">
                            <div class="flex items-start justify-between mb-3">
                                <div class="flex items-center gap-3">
                                    <div class="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold border border-dark-700 shrink-0">${(post.originalAuthor || '').charAt(0)}</div>
                                    <div>
                                        <div class="flex items-center gap-2">
                                            <h3 class="font-semibold text-sm">${post.originalAuthor}</h3>
                                        </div>
                                        <p class="text-dark-400 text-xs">${post.time}</p>
                                    </div>
                                </div>
                            </div>
                            ${post.title ? `<h2 class="font-bold text-base mb-2 leading-relaxed">${post.title}</h2>` : ''}
                            <div class="mb-3"><p class="text-dark-200 text-sm leading-relaxed">${post.displayText}</p></div>
                            ${post.tags && post.tags.length > 0 ? `<div class="flex flex-wrap gap-2 mb-4">${post.tags.map(t => `<span class="hashtag bg-brand-500/10 text-brand-400 text-xs font-medium px-3 py-1 rounded-full">${t}</span>`).join('')}</div>` : ''}
                        </div>
                        <div class="border-t border-dark-800/50 px-2 py-1">
                            <div class="flex items-center justify-around">
                                <button class="like-btn flex items-center gap-2 px-4 py-2.5 rounded-xl hover:bg-dark-800/50 transition-all group" onclick="toggleLike(this, ${post.likes}, 'pf-likes-${post.id}', '${post.id}', this.closest('article'))">
                                    <span class="iconify text-lg text-dark-400 group-hover:text-red-400 transition-colors" data-icon="lucide:heart"></span>
                                    <span class="text-sm text-dark-400 group-hover:text-red-400 transition-colors like-count">${post.likes}</span>
                                </button>
                                <button class="flex items-center gap-2 px-4 py-2.5 rounded-xl hover:bg-dark-800/50 transition-all group" onclick="toggleComments('${post.id}')">
                                    <span class="iconify text-lg text-dark-400 group-hover:text-blue-400 transition-colors" data-icon="lucide:message-circle"></span>
                                    <span class="text-sm text-dark-400 group-hover:text-blue-400 transition-colors">${post.comments}</span>
                                </button>
                                <button class="flex items-center gap-2 px-4 py-2.5 rounded-xl hover:bg-dark-800/50 transition-all group" onclick="toggleRepost('${post.id}', this, this.closest('article'))">
                                    <span class="iconify text-lg text-green-400 transition-colors" data-icon="lucide:repeat-2"></span>
                                    <span class="text-sm text-green-400 transition-colors">${post.shares}</span>
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
                } else {
                    // Original post
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
                            <div class="mb-3"><p class="text-dark-200 text-sm leading-relaxed">${post.displayText}</p></div>
                            ${post.tags && post.tags.length > 0 ? `<div class="flex flex-wrap gap-2 mb-4">${post.tags.map(t => { const colors=['brand','blue','purple','green','cyan','pink','yellow']; const c=colors[Math.abs(t.charCodeAt(1))%colors.length]; return `<span class="hashtag bg-${c}-500/10 text-${c}-400 text-xs font-medium px-3 py-1 rounded-full cursor-pointer transition-all" onclick="showToast('تصفية: ${t}')">${t}</span>`; }).join('')}</div>` : ''}
                        </div>
                        <div class="px-5 pb-2">
                            <div class="flex items-center justify-between text-dark-400 text-xs mb-2">
                                <span id="pf-likes-${post.id}">${post.likes} إعجاب</span>
                                <span>${post.comments} تعليق • ${post.shares} مشاركة</span>
                            </div>
                        </div>
                        <div class="border-t border-dark-800/50 px-2 py-1">
                            <div class="flex items-center justify-around">
                                <button class="like-btn${isLiked(post.id)?' liked':''} flex items-center gap-2 px-4 py-2.5 rounded-xl hover:bg-dark-800/50 transition-all group" onclick="toggleLike(this, ${post.likes}, 'pf-likes-${post.id}', '${post.id}', this.closest('article'))">
                                    <span class="iconify text-lg ${isLiked(post.id)?'text-red-400':'text-dark-400'} group-hover:text-red-400 transition-colors" data-icon="lucide:heart"></span>
                                    <span class="text-sm ${isLiked(post.id)?'text-red-400':'text-dark-400'} group-hover:text-red-400 transition-colors like-count">${post.likes}</span>
                                </button>
                                <button class="flex items-center gap-2 px-4 py-2.5 rounded-xl hover:bg-dark-800/50 transition-all group" onclick="toggleComments('${post.id}')">
                                    <span class="iconify text-lg text-dark-400 group-hover:text-blue-400 transition-colors" data-icon="lucide:message-circle"></span>
                                    <span class="text-sm text-dark-400 group-hover:text-blue-400 transition-colors">${post.comments}</span>
                                </button>
                                <button class="repost-btn${isReposted(post.id)?' reposted':''} flex items-center gap-2 px-4 py-2.5 rounded-xl hover:bg-dark-800/50 transition-all group" onclick="toggleRepost('${post.id}', this, this.closest('article'))">
                                    <span class="iconify text-lg ${isReposted(post.id)?'text-green-400':'text-dark-400'} group-hover:text-green-400 transition-colors" data-icon="lucide:repeat-2"></span>
                                    <span class="text-sm ${isReposted(post.id)?'text-green-400':'text-dark-400'} group-hover:text-green-400 transition-colors">${post.shares}</span>
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
                }
            }).join('');
        }

        function renderProfileReplies() {
            const container = document.getElementById('profilePostsList');
            const emptyState = document.getElementById('profileEmptyState');
            if (!container) return;

            if (userReplies.length === 0) {
                container.innerHTML = '';
                if (emptyState) { emptyState.style.display = ''; emptyState.querySelector('p').textContent = 'لم تكتب أي رد بعد'; emptyState.querySelector('button').textContent = 'استعرض الرئيسية'; emptyState.querySelector('button').setAttribute('onclick', "showPage('feed')"); }
                return;
            }

            if (emptyState) emptyState.style.display = 'none';
            const profile = getProfile();
            container.innerHTML = userReplies.map((reply, i) => `
                <article class="post-card bg-dark-900/80 border border-dark-800/50 rounded-2xl mb-4 transition-all duration-300 animate-fade-in-up overflow-hidden cursor-pointer hover:border-brand-500/30" onclick="navigateToPost('${reply.postId}')">
                    <div class="p-5">
                        <div class="flex items-center gap-2 mb-3 text-dark-500 text-xs">
                            <span class="iconify text-sm" data-icon="lucide:message-circle"></span>
                            <span>${profile.name} ردّ على منشور ${reply.parentAuthor}</span>
                            <span class="mr-auto">${reply.time}</span>
                        </div>
                        <!-- Original post preview -->
                        <div class="bg-dark-850 rounded-xl p-3 mb-3 border-r-2 border-dark-700">
                            <p class="text-xs text-dark-400 font-medium mb-1">${reply.parentAuthor}</p>
                            <p class="text-xs text-dark-500 truncate">${reply.parentContent}</p>
                        </div>
                        <!-- User's reply -->
                        <div class="flex items-start gap-3">
                            <img src="https://picsum.photos/seed/lawyer-me/40/40.jpg" class="w-8 h-8 rounded-lg object-cover shrink-0 mt-0.5" alt="">
                            <div class="flex-1">
                                <div class="flex items-center gap-2 mb-1">
                                    <span class="text-xs font-semibold">${profile.name}</span>
                                    <span class="text-[10px] text-dark-500">${reply.time}</span>
                                </div>
                                <p class="text-sm text-dark-200 leading-relaxed">${reply.replyText}</p>
                            </div>
                        </div>
                    </div>
                </article>
            `).join('');
        }

        function renderProfileLikes() {
            const container = document.getElementById('profilePostsList');
            const emptyState = document.getElementById('profileEmptyState');
            if (!container) return;

            if (userLikes.length === 0) {
                container.innerHTML = '';
                if (emptyState) { emptyState.style.display = ''; emptyState.querySelector('p').textContent = 'لم تعجب بأي منشور بعد'; emptyState.querySelector('button').textContent = 'استعرض الرئيسية'; emptyState.querySelector('button').setAttribute('onclick', "showPage('feed')"); }
                return;
            }

            if (emptyState) emptyState.style.display = 'none';
            container.innerHTML = userLikes.map((post, i) => `
                <article class="post-card bg-dark-900/80 border border-dark-800/50 rounded-2xl mb-5 transition-all duration-300 animate-fade-in-up overflow-hidden">
                    <div class="p-5 pb-0">
                        <div class="flex items-start justify-between mb-3">
                            <div class="flex items-center gap-3">
                                <div class="w-11 h-11 rounded-xl bg-gradient-to-br ${post.gradient || 'from-blue-500 to-purple-600'} flex items-center justify-center text-white font-bold border border-dark-700 shrink-0">${(post.author || '').charAt(0)}</div>
                                <div>
                                    <h3 class="font-semibold text-sm">${post.author}</h3>
                                    <p class="text-dark-400 text-xs">${post.role || ''} • ${post.time}</p>
                                </div>
                            </div>
                        </div>
                        ${post.title ? `<h2 class="font-bold text-base mb-2 leading-relaxed">${post.title}</h2>` : ''}
                        <div class="mb-3"><p class="text-dark-200 text-sm leading-relaxed">${post.displayText || post.content}</p></div>
                        ${post.tags && post.tags.length > 0 ? `<div class="flex flex-wrap gap-2 mb-4">${post.tags.map(t => { const colors=['brand','blue','purple','green','cyan','pink','yellow']; const c=colors[Math.abs(t.charCodeAt(1))%colors.length]; return `<span class="hashtag bg-${c}-500/10 text-${c}-400 text-xs font-medium px-3 py-1 rounded-full">${t}</span>`; }).join('')}</div>` : ''}
                    </div>
                    <div class="px-5 pb-2">
                        <div class="flex items-center justify-between text-dark-400 text-xs mb-2">
                            <span>${post.likes || 0} إعجاب</span>
                            <span>${post.comments || 0} تعليق • ${post.shares || 0} مشاركة</span>
                        </div>
                    </div>
                    <div class="border-t border-dark-800/50 px-2 py-1">
                        <div class="flex items-center justify-around">
                            <button class="like-btn liked flex items-center gap-2 px-4 py-2.5 rounded-xl hover:bg-dark-800/50 transition-all group" onclick="toggleLike(this, ${post.likes||0}, 'lk-${post.id}', '${post.id}', this.closest('article'));renderProfileLikes()">
                                <span class="iconify text-lg text-red-400 group-hover:text-red-400 transition-colors" data-icon="lucide:heart"></span>
                                <span class="text-sm text-red-400 group-hover:text-red-400 transition-colors like-count">${post.likes || 0}</span>
                            </button>
                            <button class="flex items-center gap-2 px-4 py-2.5 rounded-xl hover:bg-dark-800/50 transition-all group" onclick="toggleComments('${post.id}')">
                                <span class="iconify text-lg text-dark-400 group-hover:text-blue-400 transition-colors" data-icon="lucide:message-circle"></span>
                                <span class="text-sm text-dark-400 group-hover:text-blue-400 transition-colors">${post.comments || 0}</span>
                            </button>
                            <button class="flex items-center gap-2 px-4 py-2.5 rounded-xl hover:bg-dark-800/50 transition-all group" onclick="showShareModal()">
                                <span class="iconify text-lg text-dark-400 group-hover:text-green-400 transition-colors" data-icon="lucide:repeat-2"></span>
                                <span class="text-sm text-dark-400 group-hover:text-green-400 transition-colors">${post.shares || 0}</span>
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
            `).join('');
        }

        // Navigate to a post (scroll to it in the feed)
        function navigateToPost(postId) {
            showPage('feed');
            setTimeout(() => {
                const el = document.getElementById('comments-' + postId);
                if (el) {
                    const article = el.closest('article');
                    if (article) {
                        article.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        article.style.borderColor = 'rgba(249,115,22,0.6)';
                        article.style.boxShadow = '0 0 20px rgba(249,115,22,0.15)';
                        el.classList.add('open');
                        setTimeout(() => { article.style.borderColor = ''; article.style.boxShadow = ''; }, 3000);
                    }
                } else {
                    showToast('المنشور الأصلي غير موجود في الرئيسية');
                }
            }, 300);
        }

        // ===== Profile Tab Switch =====
        function switchProfileTab(btn) {
            document.querySelectorAll('.profile-tab').forEach(t => { t.classList.remove('active','bg-dark-800','text-white'); t.classList.add('text-dark-400'); });
            btn.classList.add('active','bg-dark-800','text-white'); btn.classList.remove('text-dark-400');
            const tabName = btn.textContent.trim();
            if (tabName === 'المنشورات') renderProfilePosts();
            else if (tabName === 'الردود') renderProfileReplies();
            else if (tabName === 'الإعجابات') renderProfileLikes();
        }

        // ===== Publish Post =====
        function publishPost() {
            const input = document.getElementById('postInput');
            const text = input.textContent.trim();
            if (!text) { showToast('اكتب شيئاً قبل النشر'); return; }
            addPostToFeed(text);
            input.textContent = ''; input.style.color = '';
            showToast('تم نشر المنشور بنجاح ✓');
        }

        function publishModalPost() {
            const textarea = document.getElementById('modalPostText');
            const text = textarea.value.trim();
            if (!text) { showToast('اكتب شيئاً قبل النشر'); return; }
            addPostToFeed(text);
            textarea.value = ''; closePostModal();
            showToast('تم نشر المنشور بنجاح ✓');
        }

        function addPostToFeed(text) {
            userPostCounter++;
            const postId = 'user-' + userPostCounter;
            const profile = getProfile();
            const timeStr = 'الآن';
            const hashtagRegex = /#[\u0600-\u06FFa-zA-Z0-9_]+/g;
            const tags = text.match(hashtagRegex) || [];
            const displayText = text.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');

            // Save to userPosts
            userPosts.unshift({ id: postId, text, displayText, tags, time: timeStr, likes: 0, comments: 0, shares: 0, isRepost: false, commentList: [] });
            saveUserPosts();

            // Add to feed DOM
            const article = document.createElement('article');
            article.className = 'post-card bg-dark-900/80 border border-dark-800/50 rounded-2xl mb-5 transition-all duration-300 animate-fade-in-up overflow-hidden';
            article.innerHTML = buildPostCardHTML({ id: postId, displayText, tags, likes: 0, comments: 0, shares: 0, commentList: [] }, { own: true, likesId: `likes-${postId}` });

            const feedPage = document.getElementById('page-feed');
            const firstPost = feedPage.querySelector('.post-card, .dynamic-post');
            const loader = document.getElementById('infiniteLoader');
            if (firstPost) feedPage.insertBefore(article, firstPost);
            else feedPage.insertBefore(article, loader);
            article.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }

        // ===== Bookmark Toggle =====
        function toggleBookmark(btn) {
            const isSaved = btn.classList.toggle('saved');
            const icon = btn.querySelector('.iconify');
            if (isSaved) { icon.setAttribute('data-icon','lucide:bookmark-check'); icon.style.color='#f97316'; showToast('تم الحفظ ✓'); }
            else { icon.setAttribute('data-icon','lucide:bookmark'); icon.style.color=''; showToast('تم إلغاء الحفظ'); }
        }

        // ===== Connect Toggle =====
        function toggleConnect(btn) {
            const isConnected = btn.dataset.connected === 'true';
            if (isConnected) { btn.textContent='ربط'; btn.classList.remove('bg-brand-500/20','text-brand-300','border-brand-400/50'); btn.classList.add('text-brand-400','border-brand-500/30'); btn.dataset.connected='false'; showToast('تم إلغاء الرباط'); }
            else { btn.textContent='مرتبط ✓'; btn.classList.add('bg-brand-500/20','text-brand-300','border-brand-400/50'); btn.classList.remove('text-brand-400','border-brand-500/30'); btn.dataset.connected='true'; showToast('تم الرباط بنجاح ✓'); }
        }

        // ===== Comments Toggle =====
        function toggleComments(postId) { const s = document.getElementById('comments-' + postId); if (s) s.classList.toggle('open'); }

        // ===== Modals =====
        function showShareModal() { document.getElementById('shareModal').classList.add('active'); }
        function closeShareModal(e) { if(e&&e.target!==e.currentTarget)return; document.getElementById('shareModal').classList.remove('active'); }
        function showPostMenu(btn) { document.getElementById('postMenuModal').classList.add('active'); }
        function closePostMenuModal(e) { if(e&&e.target!==e.currentTarget)return; document.getElementById('postMenuModal').classList.remove('active'); }
        function showPostModal() { document.getElementById('postModal').classList.add('active'); document.body.style.overflow='hidden'; setTimeout(()=>document.getElementById('modalPostText')?.focus(),300); }
        function closePostModal(e) { if(e&&e.target!==e.currentTarget)return; document.getElementById('postModal').classList.remove('active'); document.body.style.overflow=''; }

        // ===== Tab Switches =====
        function switchTab(btn) { document.querySelectorAll('.feed-tab').forEach(t=>{t.classList.remove('active','bg-dark-800','text-white');t.classList.add('text-dark-400')}); btn.classList.add('active','bg-dark-800','text-white');btn.classList.remove('text-dark-400'); showToast('عرض: '+btn.textContent.trim()); }
        function switchConnTab(btn) { document.querySelectorAll('.conn-tab').forEach(t=>{t.classList.remove('active','bg-dark-800','text-white');t.classList.add('text-dark-400')}); btn.classList.add('active','bg-dark-800','text-white');btn.classList.remove('text-dark-400'); }
        function switchBottomNav(btn) { document.querySelectorAll('.bottom-nav-item').forEach(b=>{b.classList.remove('active');b.classList.add('text-dark-400')}); btn.classList.add('active');btn.classList.remove('text-dark-400'); }

        // ===== Notification System =====
        const notifData = [
            { id:1,type:'like',user:'سارة المنصوري',gradient:'from-pink-500 to-yellow-500',text:'أعجبت بمنشورك',target:'التحكيم التجاري',time:'منذ 5 دقائق',unread:true,category:'all' },
            { id:2,type:'comment',user:'خالد العمري',gradient:'from-cyan-500 to-purple-500',text:'علّق على مقالك:',comment:'هل يمكنك التوسع في جزء التحكيم التجاري؟',target:'محكمة التحكيم الدولية',time:'منذ 15 دقيقة',unread:true,category:'replies' },
            { id:3,type:'follow',user:'نورة القحطاني',gradient:'from-purple-500 to-red-500',text:'بدأت بمتابعتك',time:'منذ ساعة',unread:true,hasAction:true,category:'all' },
            { id:4,type:'mention',user:'فاطمة الحربي',gradient:'from-green-500 to-cyan-500',text:'ذكرتك في تعليق',target:'العملات الرقمية',time:'منذ ساعتين',unread:true,category:'mentions' },
            { id:5,type:'like',user:'عمر الحسيني',gradient:'from-yellow-500 to-green-500',text:'أعجب بتعليقك على',target:'قانون حقوق النشر',time:'منذ 3 ساعات',unread:false,category:'all' },
            { id:6,type:'share',user:'يوسف الشريف',gradient:'from-red-500 to-purple-500',text:'شارك منشورك',target:'الملكية الفكرية',time:'منذ 5 ساعات',unread:false,category:'all' },
            { id:7,type:'comment',user:'ليلى بنت خليفة',gradient:'from-teal-500 to-blue-500',text:'ردّت على تعليقك:',comment:'ممتاز! شكراً على المشاركة',target:'الوساطة القانونية',time:'منذ 8 ساعات',unread:false,category:'replies' },
            { id:8,type:'event',user:'نظام',gradient:'from-brand-500 to-brand-700',text:'تذكير: مؤتمر التحكيم الدولي غداً',time:'منذ 10 ساعات',unread:false,category:'all',isSystem:true },
            { id:9,type:'like',user:'طارق الراشد',gradient:'from-emerald-500 to-teal-600',text:'أعجب بمنشورك عن',target:'الضريبة الجديدة',time:'أمس',unread:false,category:'all' },
            { id:10,type:'badge',user:'نظام',gradient:'from-yellow-500 to-orange-500',text:'🎉 مبروك! وصلت 200 إعجاب على مقالك',time:'أمس',unread:false,category:'all',isSystem:true },
        ];
        function getNotifIcon(type) { const icons={like:{icon:'lucide:heart',color:'text-red-400',bg:'bg-red-500/15'},comment:{icon:'lucide:message-circle',color:'text-blue-400',bg:'bg-blue-500/15'},follow:{icon:'lucide:user-plus',color:'text-green-400',bg:'bg-green-500/15'},mention:{icon:'lucide:at-sign',color:'text-purple-400',bg:'bg-purple-500/15'},share:{icon:'lucide:share-2',color:'text-cyan-400',bg:'bg-cyan-500/15'},event:{icon:'lucide:calendar',color:'text-brand-400',bg:'bg-brand-500/15'},badge:{icon:'lucide:trophy',color:'text-yellow-400',bg:'bg-yellow-500/15'}}; return icons[type]||icons.like; }
        function getNotifTargetPage(type) { const pages={like:'feed',comment:'feed',follow:'connections',mention:'feed',share:'feed',event:'events',badge:'certificates'}; return pages[type]||'feed'; }
        function renderNotifs(filter) {
            const container=document.getElementById('notifList'); let items=notifData;
            if(filter==='unread')items=items.filter(n=>n.unread); else if(filter==='mentions')items=items.filter(n=>n.type==='mention'); else if(filter==='replies')items=items.filter(n=>n.type==='comment');
            if(items.length===0){container.innerHTML='<div class="notif-empty"><span class="iconify" data-icon="lucide:bell-off"></span><p>لا توجد إشعارات</p></div>';return;}
            container.innerHTML=items.map(n=>{const iconInfo=getNotifIcon(n.type);const avatarHTML=n.isSystem?`<div class="notif-icon-wrap ${iconInfo.bg}"><span class="iconify ${iconInfo.color} text-lg" data-icon="${iconInfo.icon}"></span></div>`:`<div class="notif-icon-wrap ${iconInfo.bg}"><span class="iconify ${iconInfo.color} text-lg" data-icon="${iconInfo.icon}"></span><div class="notif-avatar-letter bg-gradient-to-br ${n.gradient}">${n.user.charAt(0)}</div></div>`;const targetHTML=n.target?`<span class="notif-highlight">${n.target}</span>`:'';const commentHTML=n.comment?`<br><span class="text-dark-400 text-xs">"${n.comment}"</span>`:'';const actionBtn=n.hasAction?`<div class="flex gap-2 mt-2"><button class="notif-action-btn accept" onclick="event.stopPropagation();acceptFollow(${n.id})">متابعة</button><button class="notif-action-btn decline" onclick="event.stopPropagation();declineFollow(${n.id})">حذف</button></div>`:'';return `<div class="notif-item-row ${n.unread?'unread':''}" onclick="clickNotif(${n.id})">${avatarHTML}<div class="notif-content"><div class="notif-text"><strong>${n.user}</strong> ${n.text} ${targetHTML}${commentHTML}</div><div class="notif-time">${n.unread?'<span class="notif-new-dot"></span>':''}${n.time}</div>${actionBtn}</div></div>`;}).join('');
        }
        function toggleNotifDropdown(e) { e.stopPropagation(); const d=document.getElementById('notifDropdown'); if(d.classList.contains('open'))closeNotifDropdown(); else{d.classList.add('open');renderNotifs('all');document.querySelectorAll('.notif-tab').forEach(t=>t.classList.remove('active'));document.querySelector('.notif-tab')?.classList.add('active');} }
        function closeNotifDropdown() { document.getElementById('notifDropdown').classList.remove('open'); }
        function filterNotifs(btn,filter) { document.querySelectorAll('.notif-tab').forEach(t=>t.classList.remove('active'));btn.classList.add('active');renderNotifs(filter); }
        function markAllRead() { notifData.forEach(n=>n.unread=false);renderNotifs('all');updateNotifDots();showToast('تم تحديد الكل كمقروء ✓'); }
        function clickNotif(id) { const n=notifData.find(n=>n.id===id);if(!n)return;n.unread=false;updateNotifDots();closeNotifDropdown();showPage(getNotifTargetPage(n.type)); }
        function acceptFollow(id) { const n=notifData.find(n=>n.id===id);if(n){n.hasAction=false;n.text='يتابعك الآن ✓';n.unread=false;}renderNotifs('all');updateNotifDots();showToast('تم قبول المتابعة ✓'); }
        function declineFollow(id) { const idx=notifData.findIndex(n=>n.id===id);if(idx>-1)notifData.splice(idx,1);renderNotifs('all');updateNotifDots();showToast('تم حذف الطلب'); }
        function updateNotifDots() { const has=notifData.some(n=>n.unread);const m=document.getElementById('notifDotMobile');const d=document.getElementById('notifDotDesktop');if(m)m.style.display=has?'':'none';if(d)d.style.display=has?'':'none'; }
        document.addEventListener('click',(e)=>{const m=document.getElementById('notifDropdownWrapMobile');const d=document.getElementById('notifDropdownWrap');const dd=document.getElementById('notifDropdown');if(dd&&!dd.contains(e.target)&&(!m||!m.contains(e.target))&&(!d||!d.contains(e.target)))closeNotifDropdown();});

        let notifCounter=notifData.length;
        setInterval(()=>{const users=[{name:'أحمد المنصور',gradient:'from-indigo-500 to-purple-600'},{name:'رنا السعيد',gradient:'from-rose-500 to-orange-500'},{name:'هدى النعيمي',gradient:'from-sky-500 to-blue-600'}];const types=[{type:'like',text:'أعجبت بمنشورك الجديد'},{type:'comment',text:'علّق على مقالك:',comment:'محتوى رائع!'},{type:'mention',text:'ذكرتك في منشور'}];const u=users[Math.floor(Math.random()*users.length)];const a=types[Math.floor(Math.random()*types.length)];notifCounter++;notifData.unshift({id:notifCounter,type:a.type,user:u.name,gradient:u.gradient,text:a.text,comment:a.comment||null,time:'الآن',unread:true,category:a.type==='mention'?'mentions':a.type==='comment'?'replies':'all',isSystem:false});updateNotifDots();const dd=document.getElementById('notifDropdown');if(dd&&dd.classList.contains('open')){renderNotifs('all');document.querySelector('.notif-tab')?.classList.add('active');}},30000);

        // ===== Poll Voting =====
        function votePoll(btn,pct) { const p=btn.closest('[id^="poll-"]');p.querySelectorAll('.poll-option').forEach(o=>{o.style.pointerEvents='none';const v=parseInt(o.querySelector('.poll-pct').textContent);o.style.background=`linear-gradient(to left, rgba(249,115,22,0.15) ${v}%, rgba(38,38,38,0.8) ${v}%)`;o.style.opacity=o===btn?'1':'0.6'});btn.style.borderColor='rgba(249,115,22,0.5)';showToast('تم التصويت ✓'); }

        // ===== Trending =====
        const trendingData=[
            {rank:1,tag:'#التحكيم_الدولي',category:'legal',catLabel:'قانوني',catColor:'brand',posts:'2,450',change:'+340',bar:95,desc:'محكمة التحكيم الدولية تصدر قرارات جديدة بشأن النزاعات التجارية عابرة الحدود'},
            {rank:2,tag:'#قانون_الذكاء_الاصطناعي',category:'legal',catLabel:'قانوني',catColor:'brand',posts:'1,890',change:'+520',bar:82,desc:'الدول العربية تبدأ بسن تشريعات تنظم استخدام الذكاء الاصطناعي'},
            {rank:3,tag:'#حقوق_الملكية_الفكرية',category:'legal',catLabel:'قانوني',catColor:'brand',posts:'1,650',change:'+180',bar:72,desc:'تحديثات على قوانين حماية العلامات التجارية والبراءات'},
            {rank:4,tag:'#Fintech_التنظيمي',category:'tech',catLabel:'تقنية',catColor:'cyan',posts:'1,420',change:'+290',bar:65,desc:'البنوك المركزية تصدر أطرًا تنظيمية جديدة للعملات الرقمية'},
            {rank:5,tag:'#قانون_الشركات_الجديد',category:'legal',catLabel:'قانوني',catColor:'brand',posts:'1,280',change:'+150',bar:58,desc:'تعديلات جوهرية على قانون الشركات في دول الخليج'},
            {rank:6,tag:'#الجريمة_الإلكترونية',category:'legal',catLabel:'قانوني',catColor:'brand',posts:'1,120',change:'+210',bar:52,desc:'ارتفاع قضايا الاحتيال الإلكتروني والقوانين الجديدة لمكافحتها'},
            {rank:7,tag:'#Blockchain_قانوني',category:'tech',catLabel:'تقنية',catColor:'cyan',posts:'980',change:'+320',bar:48,desc:'العقود الذكية وتطبيقاتها القانونية في التحكيم والتوثيق'},
            {rank:8,tag:'#القانون_الدولي_الإنساني',category:'legal',catLabel:'قانوني',catColor:'brand',posts:'870',change:'+95',bar:42,desc:'آخر التطورات في القانون الدولي الإنساني وحماية المدنيين'},
            {rank:9,tag:'#العملات_الرقمية',category:'tech',catLabel:'تقنية',catColor:'cyan',posts:'760',change:'+180',bar:38,desc:'إطار تنظيمي جديد لتجارة العملات الرقمية في المنطقة'},
            {rank:10,tag:'#قانون_العمل',category:'legal',catLabel:'قانوني',catColor:'brand',posts:'650',change:'+75',bar:32,desc:'تعديلات على قوانين العمل وحماية حقوق العاملين'},
            {rank:11,tag:'#التسويق_الرقمي',category:'general',catLabel:'عام',catColor:'purple',posts:'540',change:'+120',bar:28,desc:'تحديات قانونية جديدة في عالم التسويق الرقمي وحماية البيانات'},
            {rank:12,tag:'#قانون_البيئة',category:'general',catLabel:'عام',catColor:'purple',posts:'430',change:'+60',bar:22,desc:'التشريعات البيئية الجديدة وتأثيرها على قطاع الأعمال'},
            {rank:13,tag:'#الامتثال_المالي',category:'legal',catLabel:'قانوني',catColor:'brand',posts:'380',change:'+45',bar:18,desc:'متطلبات الامتثال لمكافحة غسيل الأموال وتمويل الإرهاب'},
            {rank:14,tag:'#القانون_البحري',category:'legal',catLabel:'قانوني',catColor:'brand',posts:'320',change:'+30',bar:15,desc:'نزاعات الحدود البحرية وقانون البحار'},
            {rank:15,tag:'#Cybersecurity_قانوني',category:'tech',catLabel:'تقنية',catColor:'cyan',posts:'290',change:'+85',bar:12,desc:'الإطار القانوني للأمن السيبراني وحماية البيانات الشخصية'},
        ];
        function toggleTrendingDropdown(e){e.stopPropagation();const d=document.getElementById('trendingDropdown'),a=document.getElementById('trendingArrow');if(d.classList.contains('open'))closeTrendingDropdown();else{d.classList.add('open');a.style.transform='rotate(180deg)';renderTrendingList('all');document.getElementById('trendingSearchInput').value='';document.getElementById('trendingSearchInput').focus()}}
        function closeTrendingDropdown(){document.getElementById('trendingDropdown').classList.remove('open');document.getElementById('trendingArrow').style.transform='';}
        document.addEventListener('click',(e)=>{const w=document.getElementById('trendingDropdownWrap');if(w&&!w.contains(e.target))closeTrendingDropdown();});
        function renderTrendingList(filter){const c=document.getElementById('trendingList');let items=trendingData;if(filter&&filter!=='all')items=items.filter(i=>i.category===filter);c.innerHTML=items.map(item=>{const rc=item.rank<=3?'hot':item.rank<=7?'warm':'normal';const bc=item.catColor==='brand'?'#f97316':item.catColor==='cyan'?'#06b6d4':'#a855f7';return `<div class="trending-item" onclick="showToast('عرض: ${item.tag}');closeTrendingDropdown()"><div class="rank ${rc}">${item.rank}</div><div class="flex-1 min-w-0"><div class="flex items-center gap-2 mb-0.5"><span class="font-bold text-sm text-white">${item.tag}</span><span class="trending-category-tag bg-${item.catColor}-500/15 text-${item.catColor}-400">${item.catLabel}</span></div><p class="text-dark-400 text-[11px] leading-relaxed truncate">${item.desc}</p><div class="flex items-center gap-3 mt-1.5"><span class="text-dark-500 text-[10px]">${item.posts} منشور</span><span class="text-green-400 text-[10px] font-semibold">${item.change} جديد</span></div><div class="trend-bar"><div class="fill" style="width:${item.bar}%;background:${bc}"></div></div></div></div>`}).join('')}
        function filterTrending(q){const c=document.getElementById('trendingList');c.querySelectorAll('.trending-item').forEach(i=>{i.style.display=i.textContent.toLowerCase().includes(q.toLowerCase())?'':'none'})}
        function switchTrendingTab(btn,filter){document.querySelectorAll('.trending-tab').forEach(t=>{t.classList.remove('active','bg-brand-500/20','text-brand-400');t.classList.add('text-dark-400')});btn.classList.add('active','bg-brand-500/20','text-brand-400');btn.classList.remove('text-dark-400');renderTrendingList(filter)}
        function showTrendingPage(){showPage('trending');renderTrendingPageList()}
        function renderTrendingPageList(filter){const c=document.getElementById('trendingPageList');let items=trendingData;if(filter&&filter!=='all')items=items.filter(i=>i.category===filter);c.innerHTML=items.map(item=>{const rc=item.rank<=3?'hot':item.rank<=7?'warm':'normal';const bc=item.catColor==='brand'?'#f97316':item.catColor==='cyan'?'#06b6d4':'#a855f7';return `<div class="p-4 hover:bg-dark-850 cursor-pointer transition-all" onclick="showToast('عرض: ${item.tag}')"><div class="flex items-start gap-4"><div class="rank ${rc} text-lg w-10 h-10 rounded-xl flex items-center justify-center font-bold" style="font-size:16px">${item.rank}</div><div class="flex-1"><div class="flex items-center gap-2 mb-1"><span class="font-bold text-base text-white">${item.tag}</span><span class="trending-category-tag bg-${item.catColor}-500/15 text-${item.catColor}-400">${item.catLabel}</span></div><p class="text-dark-300 text-sm leading-relaxed mb-2">${item.desc}</p><div class="flex items-center gap-4"><span class="text-dark-400 text-xs">${item.posts} منشور</span><span class="text-green-400 text-xs font-semibold">${item.change} جديد اليوم</span><div class="flex-1 max-w-[200px]"><div class="trend-bar"><div class="fill" style="width:${item.bar}%;background:${bc}"></div></div></div></div></div><button class="shrink-0 text-brand-400 border border-brand-500/30 text-xs px-3 py-1.5 rounded-lg hover:bg-brand-500/10 transition-all" onclick="event.stopPropagation();showToast('تم المتابعة ✓')">متابعة</button></div></div>`}).join('')}
        function filterTrendingPage(q){const c=document.getElementById('trendingPageList');c.querySelectorAll('[class*="p-4"]').forEach(i=>{i.style.display=i.textContent.toLowerCase().includes(q.toLowerCase())?'':'none'})}
        function switchTrendingPageTab(btn,period){document.querySelectorAll('.trending-page-tab').forEach(t=>{t.classList.remove('active','bg-dark-800','text-white');t.classList.add('text-dark-400')});btn.classList.add('active','bg-dark-800','text-white');btn.classList.remove('text-dark-400');showToast('عرض: '+(period==='today'?'اليوم':period==='week'?'هذا الأسبوع':'هذا الشهر'));renderTrendingPageList()}

        // ===== All Posts Data =====
        const allPosts=[
            {id:'post-1',author:'د. محمد علي الشعيبي',avatar:'م',verified:true,role:'محامي تحكيم دولي',time:'منذ 23 دقيقة',title:'التحكيم في قضايا الطاقة: دراسة حالة جديدة',content:'محكمة التحكيم الدولية نشرت تقريرها السنوي الجديد الذي يرصد تطور قضايا الطاقة والموارد الطبيعية. من أبرز الملاحظات: ارتفاع 40% في عدد القضايا المتعلقة بالعقود النفطية...',tags:['#التحكيم_الدولي','#قانون_الطاقة'],likes:187,comments:42,shares:28,gradient:'from-blue-500 to-purple-600',relevance:95},
            {id:'post-2',author:'سارة المنصوري',avatar:'س',verified:false,role:'مستشارة قانونية',time:'منذ ساعة',title:'',content:'تحديث مهم: صدر المرسوم التنفيذي الجديد لقانون حماية البيانات الشخصية في الإمارات. يشمل أحكاماً جديدة حول نقل البيانات عبر الحدود وفرض غرامات تصل إلى 5 مليون درهم للمخالفين. 🇦🇪📋',tags:['#حماية_البيانات','#الإمارات'],likes:134,comments:28,shares:19,gradient:'from-pink-500 to-yellow-500',relevance:88},
            {id:'post-3',author:'خالد العمري',avatar:'خ',verified:true,role:'أستاذ القانون الدولي',time:'منذ 3 ساعات',title:'قانون الشركات الموحد: تحليل شامل',content:'بعد صدور قانون الشركات الموحد في دول مجلس التعاون، نشرت مكتبنا دراسة تحليلية شاملة تغطي أبرز التغييرات:\n\n1. تبسيط إجراءات التأسيس\n2. حماية أفضل للمساهمين الأقلية\n3. إدخال مفهوم الشركة ذات المسؤولية المحدودة المنفردة\n\nالدراسة متوفرة على ملفنا الشخصي.',tags:['#قانون_الشركات','#مجلس_التعاون'],likes:256,comments:67,shares:45,gradient:'from-cyan-500 to-purple-500',relevance:92},
            {id:'post-4',author:'فاطمة الحربي',avatar:'ف',verified:false,role:'خبيرة تقنية مالية',time:'منذ 5 ساعات',title:'',content:'هل تعلم؟ 🤔\n\nالبنك المركزي السعودي أصدر توجيهات جديدة لشركات التقنية المالية تتعلق بالتحقق من الهوية الرقمية (eKYC). هذه التوجيهات ستدخل حيز التنفيذ في الربع الأول من 2025.\n\nالشركات المتأثرة: منصات التداول، محافظ العملات الرقمية، شركات التحويلات المالية.\n\nما رأيكم؟ هل هذا يساعد أم يقيد الابتكار؟ 💡',tags:['#Fintech','#العملات_الرقمية','#SAMA'],likes:89,comments:34,shares:12,gradient:'from-green-500 to-cyan-500',relevance:85},
            {id:'post-5',author:'نورة القحطاني',avatar:'ن',verified:true,role:'محامية عقود',time:'منذ 7 ساعات',title:'دليلك الشامل لصياغة العقود الدولية',content:'بعد سنوات من العمل في صياغة العقود الدولية، أشارككم أهم 10 نصائح:\n\n✅ حدد القانون الواجب التطبيق بوضوح\n✅ اختر محكمة التحكيم المناسبة\n✅ لا تتجاهل بنود force majeure\n✅ وثّق كل التعديلات كتابياً\n\nالمقال الكامل في الملف الشخصي 📝',tags:['#العقود','#التحكيم_التجاري'],likes:312,comments:78,shares:56,gradient:'from-purple-500 to-red-500',relevance:90},
            {id:'post-6',author:'يوسف الشريف',avatar:'ي',verified:false,role:'خبير ملكية فكرية',time:'منذ 9 ساعات',title:'',content:'🚨 تنبيه مهم لرواد الأعمال!\n\nالتسجيل في برنامج حماية العلامات التجارية الجديد ابتدأ اليوم. البرنامج يوفر:\n\n• حماية مجانية لمدة سنة\n• استشارات قانونية مجانية\n• تسجيل سريع في 48 ساعة\n\nالرابط في التعليقات 👇',tags:['#الملكية_الفكرية','#رواد_الأعمال'],likes:167,comments:45,shares:34,gradient:'from-red-500 to-purple-500',relevance:78},
            {id:'post-7',author:'عمر الحسيني',avatar:'ع',verified:true,role:'قاضي متقاعد',time:'منذ 11 ساعة',title:'قراءة في أحدث أحكاممحكمة التمييز',content:'محكمة التمييز أصدرت حكماً مهماً بشأن المسؤولية التقصيرية في القضايا الطبية. الحكم يُعيد تعريف معايير الإهمال الطبي ويضع معايير جديدة للتعويض.\n\nأهم النقاط:\n• تحمّل المستشفى المسؤولية الكاملة\n• زيادة سقف التعويض بنسبة 200%\n• إلزام بتوفير تأمين شامل للمرضى\n\nقرار سيُحدث ثورة في القضاء الطبي! ⚖️',tags:['#القضاء','#المسؤولية_المدنية','#القانون_الطبي'],likes:198,comments:56,shares:41,gradient:'from-yellow-500 to-green-500',relevance:82},
            {id:'post-8',author:'ليلى بنت خليفة',avatar:'ل',verified:false,role:'وسيطة قانونية',time:'منذ 14 ساعة',title:'',content:'تجربتي مع الوساطة القانونية في حل نزاع تجاري معقد:\n\nالطرفان: شريكان تجاريان في شركة تقنية\nالنزاع: تقسيم الأرباح والملكية الفكرية\nالنتيجة: حل ودي في 3 أسابيع بدلاً من سنتين!\n\nالوساطة هي المستقبل للنزاعات التجارية 🤝\n\nشاركوا تجاربكم في التعليقات',tags:['#الوساطة','#حل_النزاعات'],likes:145,comments:67,shares:23,gradient:'from-teal-500 to-blue-500',relevance:75},
            {id:'post-9',author:'د. أحمد المنصور',avatar:'أ',verified:true,role:'أستاذ القانون الدستوري',time:'منذ 18 ساعة',title:'التعديلات الدستورية: قراءة تحليلية',content:'التعديلات الدستورية الأخيرة تستحق قراءة تحليلية معمقة. أبرز النقاط:\n\n📌 تعزيز دور القضاء المستقل\n📌 حماية الحقوق الرقمية كحقوق أساسية\n📌 إنشاء هيئة وطنية للذكاء الاصطناعي\n📌 تحديث آليات المساءلة الحكومية\n\nندوة تفاعلية يوم الخميس الساعة 8 مساءً للنقاش 🎙️',tags:['#القانون_الدستوري','#التعديلات'],likes:234,comments:89,shares:67,gradient:'from-indigo-500 to-purple-600',relevance:80},
            {id:'post-10',author:'رنا السعيد',avatar:'ر',verified:false,role:'محامية جنائية',time:'منذ يوم',title:'',content:'نصيحة قانونية يومية ⚖️\n\nهل تعلم أن الاحتفاظ بنسخة من أي عقد توقعه هو حق قانوني لك؟\n\nالمادة 34 من قانون المعاملات المدنية تنص على أن لكل طرف الحق في الحصول على نسخة من العقد.\n\nلا توقع أي عقد بدون نسخة! 📄',tags:['#نصيحة_قانونية','#القانون_المدني'],likes:456,comments:123,shares:89,gradient:'from-rose-500 to-orange-500',relevance:70},
            {id:'post-11',author:'طارق الراشد',avatar:'ط',verified:true,role:'مستشار ضريبي',time:'منذ يوم',title:'الضريبة الجديدة: ما يجب أن تعرفه',content:'تحليل شامل للتعديلات الضريبية الجديدة:\n\n📊 ضريبة القيمة المضافة: لا تغييرات\n📊 ضريبة الدخل: خصم جديد للبحث والتطوير\n📊 ضريبة الشركات: معدل تنافسي 15%\n📊 إعفاءات جديدة للشركات الناشئة\n\nالدليل الكامل متوفر في مكتبتنا القانونية 📚',tags:['#الضريبة','#قانون_الضرائب'],likes:178,comments:54,shares:38,gradient:'from-emerald-500 to-teal-600',relevance:72},
            {id:'post-12',author:'هدى النعيمي',avatar:'ه',verified:false,role:'أستاذة قانون بحري',time:'منذ يومين',title:'',content:'🗺️ حدود بحرية جديدة!\n\nاتفاقية جديدة بين دول الخليج تحدد الحدود البحرية والمناطق الاقتصادية الخالصة. الاتفاقية تؤثر على:\n\n• حقوق الصيد\n• استكشاف النفط والغاز\n• الملاحة البحرية\n• حماية البيئة البحرية\n\nتفاصيل كاملة في مقالتي الجديدة 🔗',tags:['#القانون_البحري','#الحدود_البحرية'],likes:98,comments:23,shares:15,gradient:'from-sky-500 to-blue-600',relevance:65}
        ];

        function hideStaticPosts(){const fp=document.getElementById('page-feed');if(!fp)return;fp.querySelectorAll(':scope > article.post-card').forEach(a=>a.remove());}
        function getFeedPosts(){return allPosts.filter(p=>!isFollowing(p.author));}

        function renderFeedPosts(){
            const container=document.getElementById('page-feed');if(!container)return;
            container.querySelectorAll('.post-card,.dynamic-post').forEach(el=>el.remove());
            const posts=getFeedPosts().sort((a,b)=>b.relevance-a.relevance);
            const loader=document.getElementById('infiniteLoader');
            if(posts.length===0){const e=document.createElement('div');e.className='dynamic-post text-center py-12 text-dark-400';e.innerHTML='<span class="iconify text-4xl mb-3 block" data-icon="lucide:users"></span><p class="text-sm">تابعت كل المقترحات! 🎉</p>';container.insertBefore(e,loader);document.getElementById('infiniteLoader').style.display='none';return;}
            posts.forEach((post,i)=>{const div=document.createElement('div');div.className='dynamic-post';div.innerHTML=createPostHTML(post,i);container.insertBefore(div.firstElementChild,loader);});
            document.getElementById('infiniteLoader').style.display='none';document.getElementById('feedEnd').style.display='none';
        }

        function createPostHTML(post,index){
            const vb=post.verified?'<span class="iconify text-brand-500 text-sm" data-icon="lucide:badge-check"></span>':'';
            const th=post.title?`<h2 class="font-bold text-base mb-2 leading-relaxed">${post.title}</h2>`:'';
            const tagsHTML=post.tags.map(t=>{const colors=['brand','blue','purple','green','cyan','pink','yellow'];const c=colors[Math.abs(t.charCodeAt(1))%colors.length];return `<span class="hashtag bg-${c}-500/10 text-${c}-400 text-xs font-medium px-3 py-1 rounded-full cursor-pointer transition-all" onclick="showToast('تصفية: ${t}')">${t}</span>`}).join('');
            const fb=isFollowing(post.author)?'':`<button class="follow-btn flex items-center gap-1.5 bg-dark-800 hover:bg-dark-700 text-brand-400 text-xs font-semibold px-3 py-1.5 rounded-full border border-brand-500/30 transition-all active:scale-95 shrink-0" data-author="${post.author}" onclick="toggleFollow(this)"><span class="iconify text-sm" data-icon="lucide:user-plus"></span><span>متابعة</span></button>`;
            return `<article class="post-card bg-dark-900/80 border border-dark-800/50 rounded-2xl mb-5 transition-all duration-300 animate-fade-in-up overflow-hidden" style="animation-delay:${index*80}ms"><div class="p-5 pb-0"><div class="flex items-start justify-between mb-3"><div class="flex items-center gap-3"><div class="w-11 h-11 rounded-xl bg-gradient-to-br ${post.gradient} flex items-center justify-center text-white font-bold border border-dark-700 shrink-0">${post.avatar}</div><div><div class="flex items-center gap-2"><h3 class="font-semibold text-sm">${post.author}</h3>${vb}</div><p class="text-dark-400 text-xs">${post.role} • ${post.time}</p></div></div>${fb}</div><div class="mb-3">${th}<p class="text-dark-200 text-sm leading-relaxed">${post.content.replace(/\n/g,'<br>')}</p></div><div class="flex flex-wrap gap-2 mb-4">${tagsHTML}</div></div><div class="px-5 pb-2"><div class="flex items-center justify-between text-dark-400 text-xs mb-2"><span id="likes-inf-${index}">${post.likes} إعجاب</span><span>${post.comments} تعليق • ${post.shares} مشاركة</span></div></div><div class="border-t border-dark-800/50 px-2 py-1"><div class="flex items-center justify-around"><button class="like-btn${isLiked(post.id)?' liked':''} flex items-center gap-2 px-4 py-2.5 rounded-xl hover:bg-dark-800/50 transition-all group" onclick="toggleLike(this,${post.likes},'likes-inf-${index}','${post.id}',this.closest('article'))"><span class="iconify text-lg ${isLiked(post.id)?'text-red-400':'text-dark-400'} group-hover:text-red-400 transition-colors" data-icon="lucide:heart"></span><span class="text-sm ${isLiked(post.id)?'text-red-400':'text-dark-400'} group-hover:text-red-400 transition-colors like-count">${post.likes}</span></button><button class="flex items-center gap-2 px-4 py-2.5 rounded-xl hover:bg-dark-800/50 transition-all group" onclick="toggleComments('${post.id}')"><span class="iconify text-lg text-dark-400 group-hover:text-blue-400 transition-colors" data-icon="lucide:message-circle"></span><span class="text-sm text-dark-400 group-hover:text-blue-400 transition-colors">${post.comments}</span></button><button class="repost-btn${isReposted(post.id)?' reposted':''} flex items-center gap-2 px-4 py-2.5 rounded-xl hover:bg-dark-800/50 transition-all group" onclick="toggleRepost('${post.id}',this,this.closest('article'))"><span class="iconify text-lg ${isReposted(post.id)?'text-green-400':'text-dark-400'} group-hover:text-green-400 transition-colors" data-icon="lucide:repeat-2"></span><span class="text-sm ${isReposted(post.id)?'text-green-400':'text-dark-400'} group-hover:text-green-400 transition-colors">${post.shares}</span></button><button class="bookmark-btn flex items-center gap-2 px-4 py-2.5 rounded-xl hover:bg-dark-800/50 transition-all group" onclick="toggleBookmark(this)"><span class="iconify text-lg text-dark-400 group-hover:text-brand-400 transition-colors" data-icon="lucide:bookmark"></span></button><button class="p-2.5 rounded-xl hover:bg-dark-800/50 transition-all group" onclick="showPostMenu(this)"><span class="iconify text-lg text-dark-400 group-hover:text-dark-200 transition-colors" data-icon="lucide:more-horizontal"></span></button></div></div><div class="comment-section px-5 pb-4" id="comments-${post.id}"><div class="border-t border-dark-800/50 pt-3 space-y-3"><div class="flex gap-2 mt-2"><input type="text" placeholder="اكتب تعليقاً..." class="comment-input flex-1 bg-dark-800 border border-dark-700/50 rounded-lg px-3 py-2 text-xs text-white placeholder-dark-400 focus:outline-none focus:border-brand-500/50 transition-all" onkeydown="if(event.key==='Enter'){submitComment(this,'${post.id}')}"><button class="bg-brand-500 hover:bg-brand-600 text-white text-xs px-3 py-2 rounded-lg transition-all" onclick="submitComment(this.previousElementSibling,'${post.id}')">إرسال</button></div></div></div></article>`;
        }

        function renderFollowingPosts(){const c=document.getElementById('followingPosts');if(!c)return;const posts=allPosts.filter(p=>isFollowing(p.author));if(posts.length===0){c.innerHTML='<div class="text-center py-12 text-dark-400"><span class="iconify text-4xl mb-3 block" data-icon="lucide:user-plus"></span><p class="text-sm">لم تتابع أحداً بعد</p></div>';return;}c.innerHTML=posts.map((p,i)=>createPostHTML(p,i)).join('');}
        function switchFollowingTab(btn,filter){document.querySelectorAll('.following-tab').forEach(t=>{t.classList.remove('active','bg-dark-800','text-white');t.classList.add('text-dark-400')});btn.classList.add('active','bg-dark-800','text-white');btn.classList.remove('text-dark-400');showToast('عرض: '+(filter==='all'?'الكل':filter==='people'?'أشخاص':'صفحات'));renderFollowingPosts();}

        // ===== Audio Spaces =====
        const audioSpaces=[
            {id:1,title:'التحكيم التجاري: تجارب ودروس',host:'د. محمد علي الشعيبي',avatar:'م',gradient:'from-blue-500 to-purple-600',status:'live',listeners:342,speakers:['م','خ','ن'],speakerNames:['محمد','خالد','نورة'],topic:'قانوني',startedAgo:'منذ 45 دقيقة',desc:'مناقشة أحدث تطورات التحكيم التجاري مع نخبة من المحامين الدوليين'},
            {id:2,title:'مستقبل العملات الرقمية في المنطقة',host:'فاطمة الحربي',avatar:'ف',gradient:'from-green-500 to-cyan-500',status:'live',listeners:189,speakers:['ف','ي'],speakerNames:['فاطمة','يوسف'],topic:'تقنية',startedAgo:'منذ 20 دقيقة',desc:'نقاش حول الإطار التنظيمي للعملات الرقمية'},
            {id:3,title:'قراءة في قانون الشركات الجديد',host:'خالد العمري',avatar:'خ',gradient:'from-cyan-500 to-purple-500',status:'upcoming',listeners:0,speakers:['خ'],speakerNames:['خالد'],topic:'قانوني',startsAt:'اليوم 8:00 م',desc:'تحليل شامل لأبرز التعديلات على قانون الشركات الموحد'},
            {id:4,title:'ورشة: كيف تكتب عقداً دولياً؟',host:'نورة القحطاني',avatar:'ن',gradient:'from-purple-500 to-red-500',status:'upcoming',listeners:0,speakers:['ن','ل'],speakerNames:['نورة','ليلى'],topic:'قانوني',startsAt:'غداً 6:00 م',desc:'ورشة عملية لتعلم أصول صياغة العقود الدولية'},
            {id:5,title:'قانون حماية البيانات: ما الجديد؟',host:'سارة المنصوري',avatar:'س',gradient:'from-pink-500 to-yellow-500',status:'recorded',listeners:567,speakers:['س','أ'],speakerNames:['سارة','أحمد'],topic:'قانوني',recordedAgo:'منذ يومين',desc:'ملخص لأحدث التعديلات على قوانين حماية البيانات الشخصية'},
            {id:6,title:'الذكاء الاصطناعي والقانون',host:'د. أحمد المنصور',avatar:'أ',gradient:'from-indigo-500 to-purple-600',status:'recorded',listeners:892,speakers:['أ','ف','م'],speakerNames:['أحمد','فاطمة','محمد'],topic:'تقنية',recordedAgo:'منذ 3 أيام',desc:'نقاش حول الإطار القانوني للذكاء الاصطناعي'},
        ];
        function renderSpaces(filter){const c=document.getElementById('spacesList');let f=audioSpaces;if(filter==='live')f=audioSpaces.filter(s=>s.status==='live');else if(filter==='upcoming')f=audioSpaces.filter(s=>s.status==='upcoming');else if(filter==='recorded')f=audioSpaces.filter(s=>s.status==='recorded');c.innerHTML=f.map(space=>{const il=space.status==='live',iu=space.status==='upcoming';const sb=il?'<span class="bg-red-500/20 text-red-400 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1"><span class="w-1.5 h-1.5 bg-red-500 rounded-full live-dot"></span>مباشر</span>':iu?'<span class="bg-blue-500/20 text-blue-400 text-[10px] font-bold px-2 py-0.5 rounded-full">قريباً</span>':'<span class="bg-dark-700/50 text-dark-400 text-[10px] font-bold px-2 py-0.5 rounded-full">مسجل</span>';const sa=space.speakers.map(s=>`<div class="speaker-avatar"><div class="w-10 h-10 rounded-full bg-gradient-to-br ${space.gradient} flex items-center justify-center text-white text-xs font-bold border-2 border-dark-900">${s}</div>${il?'<div class="mic-icon bg-green-500"><span class="iconify text-white" data-icon="lucide:mic" style="font-size:7px"></span></div>':''}</div>`).join('');const ab=il?`<button class="bg-red-500 hover:bg-red-600 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-all active:scale-95" onclick="event.stopPropagation();showToast('انضممت إلى المساحة 🎙️')">انضم الآن</button>`:iu?`<button class="bg-dark-800 hover:bg-dark-700 text-white text-xs font-semibold px-4 py-2 rounded-xl border border-dark-700 transition-all" onclick="event.stopPropagation();showToast('تم تفعيل التذكير 🔔')">تذكير</button>`:`<button class="bg-dark-800 hover:bg-dark-700 text-white text-xs font-semibold px-4 py-2 rounded-xl border border-dark-700 transition-all" onclick="event.stopPropagation();showToast('تشغيل التسجيل ▶️')">استمع</button>`;const mt=il?`<span class="text-red-400 text-[10px] flex items-center gap-1"><span class="w-1.5 h-1.5 bg-red-500 rounded-full live-dot"></span>${space.startedAgo}</span>`:iu?`<span class="text-blue-400 text-[10px]">🕐 ${space.startsAt}</span>`:`<span class="text-dark-500 text-[10px]">🎙️ ${space.recordedAgo}</span>`;return `<div class="space-card ${il?'live':''} bg-dark-900/80 rounded-2xl p-5 cursor-pointer animate-fade-in-up" onclick="showToast('فتح المساحة: ${space.title}')"><div class="flex items-start justify-between mb-3"><div class="flex items-center gap-2">${sb}<span class="text-dark-500 text-[10px]">•</span><span class="text-dark-400 text-[10px]">${space.topic}</span></div>${ab}</div><h3 class="font-bold text-base mb-2 ${il?'text-white':'text-dark-200'}">${space.title}</h3><p class="text-dark-400 text-xs mb-3 leading-relaxed">${space.desc}</p><div class="flex items-center justify-between"><div class="flex items-center gap-3"><div class="flex -space-x-2 space-x-reverse">${sa}</div><div><p class="text-xs font-medium">${space.host}</p><p class="text-dark-500 text-[10px]">${space.speakerNames.join('، ')}</p></div></div><div class="flex items-center gap-3">${mt}${il?`<span class="flex items-center gap-1 text-dark-400 text-[10px]"><span class="iconify" data-icon="lucide:headphones" style="font-size:12px"></span>${space.listeners}</span>`:''}</div></div></div>`}).join('')}
        function switchSpaceTab(btn,filter){document.querySelectorAll('.space-tab').forEach(t=>{t.classList.remove('active','bg-red-500/20','text-red-400','bg-dark-800','text-white');t.classList.add('text-dark-400')});btn.classList.add('active');btn.classList.remove('text-dark-400');if(filter==='live')btn.classList.add('bg-red-500/20','text-red-400');else btn.classList.add('bg-dark-800','text-white');renderSpaces(filter)}

        // ===== Auto-hide on scroll =====
        (function(){let last=0;const h=()=>document.getElementById('mainHeader'),b=()=>document.querySelector('.mobile-bottom-nav');window.addEventListener('scroll',function(){if(window.innerWidth>=1024)return;const c=window.scrollY;if(c<50){h()?.classList.remove('hide-on-scroll');b()?.classList.remove('hide-on-scroll');last=c;return}if(c-last>10){h()?.classList.add('hide-on-scroll');b()?.classList.add('hide-on-scroll')}else if(last-c>10){h()?.classList.remove('hide-on-scroll');b()?.classList.remove('hide-on-scroll')}last=c},{passive:true})})();

        // ===== Initialize =====
        document.addEventListener('DOMContentLoaded',()=>{
            loadSavedImages();loadProfile();renderTrendingList('all');renderFollowingPosts();renderSpaces('live');updateNotifDots();renderProfilePosts();hideStaticPosts();renderFeedPosts();
        });
