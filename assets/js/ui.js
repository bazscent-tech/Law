
        // ===== Image Upload Handlers =====
        function handleProfilePhotoUpload(input, ...imgIds) {
            const file = input.files[0]; if (!file) return;
            if (!file.type.startsWith('image/')) { showToast('يرجى اختيار صورة فقط'); return; }
            const reader = new FileReader();
            reader.onload = function(e) { imgIds.forEach(id => { const el = document.getElementById(id); if (el) el.src = e.target.result; }); UserStore.setString('profileAvatar', e.target.result); showToast('تم تحديث الصورة الشخصية ✓'); };
            reader.readAsDataURL(file);
        }
        function handleCoverUpload(input) {
            const file = input.files[0]; if (!file) return;
            if (!file.type.startsWith('image/')) { showToast('يرجى اختيار صورة فقط'); return; }
            const reader = new FileReader();
            reader.onload = function(e) { const img = document.getElementById('coverPhoto'); if (img) { img.src = e.target.result; img.classList.remove('hidden'); img.parentElement.style.background = 'none'; } UserStore.setString('coverPhoto', e.target.result); showToast('تم تحديث صورة الغلاف ✓'); };
            reader.readAsDataURL(file);
        }
        function loadSavedImages() {
            const sa = UserStore.getString('profileAvatar');
            if (sa) ['mobileAvatar','sidebarAvatar','desktopAvatar','profilePageAvatar','storyCreatorAvatar','modalPostAvatar','mobileDrawerAvatar'].forEach(id => { const el = document.getElementById(id); if (el) el.src = sa; });
            const sc = UserStore.getString('coverPhoto');
            if (sc) { const img = document.getElementById('coverPhoto'); if (img) { img.src = sc; img.classList.remove('hidden'); img.parentElement.style.background = 'none'; } }
        }

        // ===== Toast =====
        function showToast(msg) { const t = document.getElementById('toast'); t.textContent = msg; t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 2500); }

        // ===== Following =====
        let followingUsers = UserStore.getJSON('followingUsers', []);
        function saveFollowing() { UserStore.setJSON('followingUsers', followingUsers); }
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
            // If navigating away from a visited profile, reset it
            if (_visitingProfile && page !== 'profile') closeUserProfile();
            document.querySelectorAll('.page-content').forEach(p => p.classList.add('hidden'));
            const target = document.getElementById('page-' + page);
            if (target) target.classList.remove('hidden');
            if (page === 'profile') {
                if (_visitingProfile) {
                    // Stay on visited profile — don't reset
                    _renderVisitedProfilePosts(_visitingProfile.id);
                } else {
                    renderProfilePosts();
                    _setProfileEditMode(true);
                }
            }
            // Always reset visited profile when clicking sidebar "ملفي الشخصي"
            // (called from sidebar, not from openUserProfile)
            if (page === 'myprofile') {
                closeUserProfile();
                showPage('profile');
                return;
            }
            document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
            document.querySelectorAll('.sidebar-link').forEach(l => { if (l.textContent.includes(getPageLabel(page))) l.classList.add('active'); });
            // ⚡ سرعة: انتقال فوري بدون animation بطيء
            window.scrollTo(0, 0);
        }
        function getPageLabel(page) { const m = { 'feed':'الرئيسية','profile':'ملفي الشخصي','connections':'الروابط','bookmarks':'المحفوظات','articles':'مقالاتي','events':'الفعاليات','certificates':'الشهادات','notifications':'الإشعارات','messages':'الرسائل','settings':'الإعدادات','following':'أتابع','audio-spaces':'المساحات الصوتية','trending':'المواضيع الرائجة' }; return m[page] || ''; }
        // ⚡ doSearch is defined in features.js — no duplicate here

        // ===== Mobile Menu =====
        function openMobileMenu() { document.getElementById('mobileMenuOverlay').classList.add('open'); document.body.style.overflow = 'hidden'; const h=document.getElementById('swipeEdgeHint'); if(h)h.style.display='none'; }
        function closeMobileMenu() { document.getElementById('mobileMenuOverlay').classList.remove('open'); document.body.style.overflow = ''; const h=document.getElementById('swipeEdgeHint'); if(h)h.style.display=''; }

        // ===== MOBILE SWIPE-TO-OPEN DRAWER (X/Twitter style) =====
        (function() {
            let sx = 0, sy = 0, cx = 0, cy = 0;
            let drag = false, dt = null, mv = false;
            const EDGE = 30;       // edge zone width (px)
            const OPEN_THRESH = 40; // min swipe to open
            const CLOSE_THRESH = 50; // min swipe to close
            const ov = () => document.getElementById('mobileMenuOverlay');
            const dr = () => document.getElementById('mobileDrawer');
            const isOpen = () => ov()?.classList.contains('open');
            const isMobile = () => window.innerWidth < 1024;

            // Create edge hint
            function addEdgeHint() {
                if (!isMobile() || document.getElementById('swipeEdgeHint')) return;
                const hint = document.createElement('div');
                hint.id = 'swipeEdgeHint';
                hint.className = 'swipe-edge-hint';
                document.body.appendChild(hint);
            }
            function removeEdgeHint() {
                const h = document.getElementById('swipeEdgeHint');
                if (h) h.remove();
            }

            // Init
            if (isMobile()) addEdgeHint();
            window.addEventListener('resize', () => {
                if (isMobile()) addEdgeHint();
                else removeEdgeHint();
            });

            document.addEventListener('touchstart', function(e) {
                if (!isMobile()) return;
                const t = e.touches[0];
                sx = t.clientX; sy = t.clientY;
                cx = sx; cy = sy;
                mv = false;

                if (!isOpen() && sx > window.innerWidth - EDGE) {
                    // Swipe from right edge → open drawer
                    drag = true; dt = 'open';
                    dr().style.transition = 'none';
                    // Prevent browser back gesture
                    e.preventDefault();
                } else if (isOpen()) {
                    // Swipe anywhere when drawer is open → close
                    drag = true; dt = 'close';
                    dr().style.transition = 'none';
                }
            }, { passive: false });

            document.addEventListener('touchmove', function(e) {
                if (!drag || !isMobile()) return;
                const t = e.touches[0];
                cx = t.clientX; cy = t.clientY;
                mv = true;
                const dx = cx - sx;
                const dy = Math.abs(cy - sy);

                // If vertical scroll dominates, cancel drag
                if (dy > Math.abs(dx) && dy > 15) {
                    drag = false;
                    dr().style.transition = '';
                    ov().style.opacity = '';
                    ov().style.visibility = '';
                    return;
                }

                // Prevent page scroll while dragging
                e.preventDefault();

                if (dt === 'open' && dx < 0) {
                    const w = dr().offsetWidth || 280;
                    dr().style.transform = `translateX(${Math.max(0, w + dx)}px)`;
                    const p = Math.min(1, Math.abs(dx) / w);
                    ov().style.opacity = String(p * 0.5);
                    if (p > 0.02) ov().style.visibility = 'visible';
                } else if (dt === 'close' && dx > 0) {
                    const w = dr().offsetWidth || 280;
                    dr().style.transform = `translateX(${dx}px)`;
                    const p = Math.min(1, dx / w);
                    ov().style.opacity = String(0.5 - p * 0.5);
                }
            }, { passive: false });

            document.addEventListener('touchend', function() {
                if (!drag || !isMobile()) return;
                dr().style.transition = '';
                ov().style.opacity = '';
                ov().style.visibility = '';
                const dx = cx - sx;

                if (dt === 'open') {
                    if (mv && dx < -OPEN_THRESH) openMobileMenu();
                    else { dr().style.transform = ''; ov().style.visibility = 'hidden'; }
                } else if (dt === 'close') {
                    if (mv && dx > CLOSE_THRESH) closeMobileMenu();
                    else openMobileMenu();
                }
                drag = false; dt = null;
            }, { passive: true });
        })();

        // ===== Post Input =====
        function handlePostInput(el) { el.style.color = el.textContent.trim() === '' ? '' : '#fff'; }
        const postInput = document.getElementById('postInput');
        if (postInput) { const s = document.createElement('style'); s.textContent = `#postInput:empty::before { content: attr(data-placeholder); color: #525252; pointer-events: none; }`; document.head.appendChild(s); }

        // ===== Profile =====
        const defaultProfile = { name:'مستخدم', username:'', title:'', bio:'', location:'', website:'' };
        function getProfile() {
            // Prefer real Supabase profile
            const p = window.sbProfile;
            if (p) {
                return {
                    name: p.name || p.display_name || 'مستخدم',
                    username: p.username ? '@' + p.username : '',
                    title: p.title || '',
                    bio: p.bio || '',
                    location: p.location || '',
                    website: p.website || '',
                    avatar: p.avatar_url || ''
                };
            }
            // Fallback to localStorage
            const s = UserStore.getString('userProfile');
            if (s) { try { return JSON.parse(s); } catch(e) {} }
            return { ...defaultProfile };
        }
        function applyProfile(p) {
            const name = p.name || p.display_name || '';
            const username = p.username || '';
            const fullUsername = username.startsWith('@') ? username : '@' + username;
            const subtitle = fullUsername + (p.title ? ' • ' + p.title : '') + (p.location ? ' • ' + p.location : '');

            // Profile page
            const pn=document.getElementById('profileDisplayName'); if(pn)pn.textContent=name;
            const ps=document.getElementById('profileSubtitle'); if(ps)ps.textContent=subtitle;
            const pb=document.getElementById('profileBio'); if(pb)pb.textContent=p.bio||'';
            const pl=document.getElementById('profileLocation'); if(pl)pl.textContent=p.location||'';
            const pw=document.getElementById('profileWebsite'); if(pw)pw.textContent=p.website||'';
            // Legacy selectors as fallback
            const pn2=document.querySelector('#page-profile .text-xl.font-bold'); if(pn2&&!pn)pn2.textContent=name;
            const ps2=document.querySelector('#page-profile .text-dark-400.text-sm.mb-3'); if(ps2&&!ps)ps2.textContent=subtitle;
            const pb2=document.querySelector('#page-profile .text-dark-300.text-sm.mb-4'); if(pb2&&!pb)pb2.textContent=p.bio||'';
            // Sidebar
            const sn=document.querySelector('.desktop-sidebar .font-semibold.text-sm'); if(sn)sn.textContent=name;
            const dn=document.querySelector('#mobileDrawer h3'); if(dn)dn.textContent=name;
        }
        async function loadProfile() {
            // Load from Supabase profile first (real data)
            if(sbProfile){
                applyProfile({
                    name: sbProfile.name || sbProfile.display_name,
                    username: sbProfile.username,
                    title: sbProfile.title,
                    bio: sbProfile.bio,
                    location: sbProfile.location,
                    website: sbProfile.website
                });
                UserStore.setJSON('userProfile',{
                    name: sbProfile.name || sbProfile.display_name,
                    username: '@'+(sbProfile.username||''),
                    title: sbProfile.title||'',
                    bio: sbProfile.bio||'',
                    location: sbProfile.location||'',
                    website: sbProfile.website||''
                });
            } else {
                // Fallback to localStorage if no Supabase profile
                const s=UserStore.getString('userProfile');
                if(s){try{applyProfile(JSON.parse(s));}catch(e){}}
            }
        }

        // ===== VISIT OTHER USER'S PROFILE =====
        let _visitingProfile = null; // null = viewing own profile
        async function openUserProfile(authorName) {
            if (!authorName) return;
            // Find profile from Supabase — search by name first, then username
            let profile = null;
            if (sbOnline) {
                try {
                    // ⚡ ابحث بالاسم أولاً (أكثر شيوعاً)
                    const { data } = await sb.from('profiles')
                        .select('*')
                        .eq('name', authorName)
                        .limit(1);
                    if (data && data.length > 0) {
                        profile = data[0];
                    } else {
                        // ⚡ جرب بالـ username
                        const { data: byUser } = await sb.from('profiles')
                            .select('*')
                            .eq('username', authorName)
                            .limit(1);
                        if (byUser && byUser.length > 0) profile = byUser[0];
                    }
                } catch(e) { console.warn('Profile fetch failed:', e); }
            }
            if (!profile) {
                showToast('لا يمكن عرض الملف الشخصي');
                return;
            }
            _visitingProfile = profile;
            _applyVisitedProfile(profile);
            showPage('profile');
            _renderVisitedProfilePosts(profile.id);
            _renderVisitedProfileLibraries(profile.id);
        }

        function _applyVisitedProfile(p) {
            const pn = document.querySelector('#page-profile .text-xl.font-bold');
            if (pn) pn.textContent = p.name;
            const vb = document.querySelector('#page-profile .iconify[data-icon="lucide:badge-check"]');
            if (vb) vb.style.display = p.verified ? '' : 'none';
            const ps = document.querySelector('#page-profile .text-dark-400.text-sm.mb-3');
            if (ps) ps.textContent = '@' + p.username + (p.title ? ' • ' + p.title : '') + (p.location ? ' • ' + p.location : '');
            const pb = document.querySelector('#page-profile .text-dark-300.text-sm.mb-4');
            if (pb) pb.textContent = p.bio || '';
            const pl = document.querySelector('#page-profile .flex.flex-wrap.gap-4 span:first-child');
            if (pl) pl.innerHTML = p.location ? '<span class="iconify" data-icon="lucide:map-pin" style="font-size:14px"></span>' + p.location : '';
            const pw = document.querySelector('#page-profile .text-brand-400.cursor-pointer');
            if (pw) pw.textContent = p.website || '';
            const pa = document.querySelector('#desktopAvatar');
            if (pa) pa.src = p.avatar_url || 'https://picsum.photos/seed/default/120/120.jpg';
            const cv = document.querySelector('#coverPhoto');
            if (cv) { if (p.cover_url) { cv.src = p.cover_url; cv.classList.remove('hidden'); } else { cv.classList.add('hidden'); } }
            // Stats
            const stats = document.querySelectorAll('#page-profile .profile-stat-item .font-bold');
            if (stats[0]) stats[0].textContent = p.followers_count || 0;
            if (stats[1]) stats[1].textContent = p.following_count || 0;
            if (stats[2]) stats[2].textContent = p.posts_count || 0;
            // Hide edit buttons, show back button
            const editBtns = document.querySelectorAll('#page-profile .bg-dark-800');
            editBtns.forEach(b => { if (b.textContent.includes('تعديل') || b.querySelector('[data-icon="lucide:share-2"]')) b.style.display = 'none'; });
            // Hide ALL edit controls for visited profile
            _setProfileEditMode(false);
            // Hide library create buttons when visiting another profile (but KEEP menu buttons)
            document.querySelectorAll('#libraryEmptyState button, [onclick*="openCreateLibraryModal"], #librariesGrid .lib-btn-primary').forEach(b => b.style.display = 'none');
            // ⚡ أزل إخفاء أزرار القائمة (الثلاث نقاط) — نريدها تعمل للزوار
            document.querySelectorAll('#librariesGrid button[onclick*="openMenu"]').forEach(b => b.style.display = '');
            // Hide "إنشاء مكتبة" button (multiple selectors for reliability)
            document.querySelectorAll('#libraryEmptyState button, [onclick*="openCreateLibraryModal"]').forEach(b => b.style.display = 'none');
            // Change library empty state text for visited profile
            const libEmptyTitle = document.querySelector('#libraryEmptyState h3');
            if (libEmptyTitle) libEmptyTitle.textContent = 'لا توجد مكتبات';
            const libEmptyDesc = document.querySelector('#libraryEmptyState p.text-dark-400');
            if (libEmptyDesc) libEmptyDesc.textContent = 'لم ينشئ هذا المستخدم أي مكتبة بعد';
            // Hide library features card
            const libFeatures = document.querySelector('#libraryEmptyState .bg-dark-900');
            if (libFeatures) libFeatures.style.display = 'none';
            // Hide empty state publish button
            const emptyStateBtn = document.querySelector('#profileEmptyState button');
            if (emptyStateBtn) emptyStateBtn.style.display = 'none';
            // Add follow button if not exists (like Facebook/X)
            let followBtn = document.getElementById('visitProfileFollowBtn');
            if (!followBtn) {
                followBtn = document.createElement('button');
                followBtn.id = 'visitProfileFollowBtn';
                followBtn.className = 'bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold px-5 py-2 rounded-xl transition-all';
                followBtn.innerHTML = '<span class="iconify inline ml-1" data-icon="lucide:user-plus" style="font-size:14px"></span>متابعة';
                followBtn.onclick = function() {
                    if (!requireAuth()) return;
                    if (this.classList.contains('following')) {
                        this.classList.remove('following');
                        this.innerHTML = '<span class="iconify inline ml-1" data-icon="lucide:user-plus" style="font-size:14px"></span>متابعة';
                        this.className = 'bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold px-5 py-2 rounded-xl transition-all';
                        // ⚡ مزامنة إلغاء المتابعة مع Supabase
                        if (sbOnline && sbUser && _visitingProfile) {
                            SB.toggleFollow(_visitingProfile.id).catch(err => console.warn('Unfollow failed:', err));
                        }
                        showToast('تم إلغاء المتابعة');
                    } else {
                        this.classList.add('following');
                        this.innerHTML = '<span class="iconify inline ml-1" data-icon="lucide:check" style="font-size:14px"></span>متابَع ✓';
                        this.className = 'bg-dark-700 hover:bg-dark-600 text-green-400 text-sm font-semibold px-5 py-2 rounded-xl transition-all border border-green-500/30';
                        // ⚡ مزامنة المتابعة مع Supabase
                        if (sbOnline && sbUser && _visitingProfile) {
                            SB.toggleFollow(_visitingProfile.id).catch(err => console.warn('Follow failed:', err));
                        }
                        showToast('متابَع ✓');
                    }
                };
                const btnContainer = document.querySelector('#page-profile .flex.gap-2');
                if (btnContainer) btnContainer.prepend(followBtn);
            }
            followBtn.style.display = '';
            // Cover click → do nothing for other users
            const coverEl = document.querySelector('#page-profile .h-48');
            if (coverEl) coverEl.onclick = null;
            const avatarEl = document.querySelector('#desktopAvatar');
            if (avatarEl) avatarEl.onclick = null;
        }

        function closeUserProfile() {
            _visitingProfile = null;
            // ⚡ استعد البروفايل من الكاش فوراً
            const cachedProfile = (() => {
                try {
                    const allKeys = Object.keys(localStorage);
                    const profileKey = allKeys.find(k => k.startsWith('auth_profile_'));
                    return profileKey ? Safe.getJSON(profileKey, null) : null;
                } catch(e) { return null; }
            })();
            const avatarUrl = cachedProfile?.avatar_url || 'https://api.dicebear.com/7.x/initials/svg?seed=User&backgroundColor=f97316&textColor=ffffff';
            const userName = cachedProfile?.name || 'مستخدم';

            loadProfile();
            const pa = document.querySelector('#desktopAvatar');
            if (pa) { pa.src = avatarUrl; pa.onclick = () => document.getElementById('profileAvatarUpload').click(); }
            // حدّث الاسم أيضاً
            const ppName = document.getElementById('profileDisplayName');
            if (ppName) ppName.textContent = userName;

            const cv = document.querySelector('#coverPhoto');
            if (cv) { cv.classList.add('hidden'); }
            const coverEl = document.querySelector('#page-profile .h-48');
            if (coverEl) coverEl.onclick = () => document.getElementById('coverUpload').click();
            const editBtns = document.querySelectorAll('#page-profile .bg-dark-800');
            editBtns.forEach(b => b.style.display = '');
            // Restore all edit controls for own profile
            _setProfileEditMode(true);
            const emptyBtn = document.querySelector('#profileEmptyState button');
            if (emptyBtn) { emptyBtn.style.display = ''; emptyBtn.textContent = 'اكتب أول منشور'; emptyBtn.setAttribute('onclick', 'showPostModal()'); }
            // Restore library create button
            document.querySelectorAll('#libraryEmptyState button, [onclick*="openCreateLibraryModal"]').forEach(b => b.style.display = '');
            // Restore library empty state text
            const libEmptyTitle = document.querySelector('#libraryEmptyState h3');
            if (libEmptyTitle) libEmptyTitle.textContent = 'مكتبتك الشخصية';
            const libEmptyDesc = document.querySelector('#libraryEmptyState p.text-dark-400');
            if (libEmptyDesc) libEmptyDesc.textContent = 'نظم مراجعك القانونية، ووثائقك، وأبحاثك في مكان واحد';
            const libFeatures = document.querySelector('#libraryEmptyState .bg-dark-900');
            if (libFeatures) libFeatures.style.display = '';
            // Remove follow button (was added for visited profiles)
            const followBtn = document.getElementById('visitProfileFollowBtn');
            if (followBtn) followBtn.remove();
            renderProfilePosts();
            if (typeof Library !== 'undefined') Library.renderProfileLibraries(sbUser?.id || 'local');
            // Switch to posts tab
            const postsTab = document.querySelector('#page-profile .profile-tab');
            if (postsTab) switchProfileTab(postsTab);
        }

        async function _renderVisitedProfilePosts(profileId) {
            const c = document.getElementById('profilePostsList');
            const e = document.getElementById('profileEmptyState');
            if (!c) return;
            c.innerHTML = '';
            // Hide empty state "publish" button when visiting another profile
            if (e) {
                e.style.display = 'none';
                const btn = e.querySelector('button');
                if (btn) btn.style.display = 'none'; // Hide "اكتب أول منشور" button
            }
            if (!sbOnline) return;
            try {
                const { data: posts } = await sb.from('posts')
                    .select('*, profiles(*)')
                    .eq('author_id', profileId)
                    .order('created_at', { ascending: false });
                if (!posts || posts.length === 0) {
                    if (e) {
                        e.style.display = '';
                        e.querySelector('p').textContent = 'لا توجد منشورات بعد';
                        const btn = e.querySelector('button');
                        if (btn) btn.style.display = 'none'; // Don't show publish button for other users
                    }
                    return;
                }
                posts.forEach((sp, i) => {
                    const profile = sp.profiles || {};
                    const name = profile.name || 'مستخدم';
                    const timeDiff = Date.now() - new Date(sp.created_at).getTime();
                    const mins = Math.floor(timeDiff / 60000);
                    let time = 'الآن';
                    if (mins < 60) time = `منذ ${mins} دقيقة`;
                    else if (mins < 1440) time = `منذ ${Math.floor(mins/60)} ساعة`;
                    else time = `منذ ${Math.floor(mins/1440)} يوم`;
                    const gradients = ['from-blue-500 to-purple-600','from-pink-500 to-yellow-500','from-cyan-500 to-purple-500','from-green-500 to-cyan-500','from-purple-500 to-red-500'];
                    const post = {
                        id: sp.id, author: name, avatar: name.charAt(0),
                        verified: profile.verified || false, role: profile.title || '',
                        time: time, title: sp.title || '', content: sp.content || '',
                        tags: sp.tags || [], likes: sp.likes_count || 0,
                        comments: sp.comments_count || 0, shares: sp.shares_count || 0,
                        gradient: gradients[(sp.id.charCodeAt(0)||0) % gradients.length]
                    };
                    const div = document.createElement('div');
                    div.className = 'dynamic-post';
                    div.innerHTML = buildPlatformPostHTML(post, i);
                    c.appendChild(div);
                });
            } catch(err) { console.warn('Posts fetch failed:', err); }
        }

        async function _renderVisitedProfileLibraries(profileId) {
            if (typeof Library === 'undefined') return;
            const container = document.getElementById('profileLibraries');
            const grid = document.getElementById('librariesGrid');
            const emptyState = document.getElementById('libraryEmptyState');
            if (!container) return;
            try {
                const { data: libs } = await sb.from('libraries')
                    .select('*')
                    .eq('owner_id', profileId)
                    .eq('visibility', 'public')  // ⚡ فقط المكتبات العامة
                    .order('created_at', { ascending: false });
                // ⚡ خزن مكتبات الزوار لاستخدامها في openLibrary و openMenu
                Library._visitorLibraries = libs || [];
                if (!libs || libs.length === 0) {
                    if (grid) grid.classList.add('hidden');
                    if (emptyState) emptyState.classList.remove('hidden');
                } else {
                    if (emptyState) emptyState.classList.add('hidden');
                    if (grid) {
                        grid.classList.remove('hidden');
                        grid.innerHTML = libs.map(lib => Library._buildLibraryCard(lib)).join('');
                    }
                }
            } catch(e) { console.warn('Libraries fetch failed:', e); }
        }

        function openEditProfile() { if (!requireAuth()) return; const p=getProfile(); document.getElementById('editName').value=p.name; document.getElementById('editUsername').value=p.username; document.getElementById('editTitle').value=p.title; document.getElementById('editBio').value=p.bio; document.getElementById('editLocation').value=p.location; document.getElementById('editWebsite').value=p.website; document.getElementById('editProfileModal').classList.add('active'); document.body.style.overflow='hidden'; }
        function closeEditProfile(e) { if(e&&e.target!==e.currentTarget)return; document.getElementById('editProfileModal').classList.remove('active'); document.body.style.overflow=''; }
        function saveProfile() {
            if (!requireAuth()) return;
            const p={
                name:document.getElementById('editName').value.trim()||defaultProfile.name,
                username:document.getElementById('editUsername').value.trim()||defaultProfile.username,
                title:document.getElementById('editTitle').value.trim()||defaultProfile.title,
                bio:document.getElementById('editBio').value.trim()||defaultProfile.bio,
                location:document.getElementById('editLocation').value.trim()||defaultProfile.location,
                website:document.getElementById('editWebsite').value.trim()||defaultProfile.website
            };
            UserStore.setJSON('userProfile', p);
            applyProfile(p);
            // ⚡ مزامنة مع Supabase
            if (sbOnline && sbUser) {
                SB.updateProfile(p).catch(err => console.warn('Profile sync failed:', err));
            }
            closeEditProfile();
            showToast('تم حفظ الملف الشخصي ✓');
        }

        // ===== Show/Hide Profile Edit Controls =====
        function _setProfileEditMode(isOwn) {
            // Edit profile button
            const editBtn = document.getElementById('editProfileBtn');
            if (editBtn) editBtn.classList.toggle('hidden', !isOwn);
            // Cover photo click-to-upload
            const coverWrap = document.getElementById('profileCoverWrap');
            if (coverWrap) coverWrap.style.cursor = isOwn ? 'pointer' : 'default';
            const coverOverlay = document.getElementById('coverHoverOverlay');
            if (coverOverlay) coverOverlay.classList.toggle('hidden', !isOwn);
            if (isOwn && coverWrap) {
                coverWrap.onclick = () => document.getElementById('coverUpload').click();
            } else if (coverWrap) {
                coverWrap.onclick = null;
            }
            // Avatar click-to-upload
            const avatarOverlay = document.getElementById('avatarEditOverlay');
            if (avatarOverlay) avatarOverlay.classList.toggle('hidden', !isOwn);
            // Profile tabs: hide "الردود" and "الإعجابات" for other users
            const profileTabs = document.querySelectorAll('#page-profile .profile-tab');
            profileTabs.forEach((tab, i) => {
                if (i === 1 || i === 2) { // الردود, الإعجابات
                    tab.style.display = isOwn ? '' : 'none';
                }
            });
        }

        // ====================================================
