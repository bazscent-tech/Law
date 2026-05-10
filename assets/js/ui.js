
        // ===== Image Upload Handlers =====
        function handleProfilePhotoUpload(input, ...imgIds) {
            const file = input.files[0]; if (!file) return;
            if (!file.type.startsWith('image/')) { showToast('يرجى اختيار صورة فقط'); return; }
            const reader = new FileReader();
            reader.onload = function(e) { imgIds.forEach(id => { const el = document.getElementById(id); if (el) el.src = e.target.result; }); Safe.setString('profileAvatar', e.target.result); showToast('تم تحديث الصورة الشخصية ✓'); };
            reader.readAsDataURL(file);
        }
        function handleCoverUpload(input) {
            const file = input.files[0]; if (!file) return;
            if (!file.type.startsWith('image/')) { showToast('يرجى اختيار صورة فقط'); return; }
            const reader = new FileReader();
            reader.onload = function(e) { const img = document.getElementById('coverPhoto'); if (img) { img.src = e.target.result; img.classList.remove('hidden'); img.parentElement.style.background = 'none'; } Safe.setString('coverPhoto', e.target.result); showToast('تم تحديث صورة الغلاف ✓'); };
            reader.readAsDataURL(file);
        }
        function loadSavedImages() {
            const sa = Safe.getString('profileAvatar');
            if (sa) ['mobileAvatar','sidebarAvatar','desktopAvatar'].forEach(id => { const el = document.getElementById(id); if (el) el.src = sa; });
            const sc = Safe.getString('coverPhoto');
            if (sc) { const img = document.getElementById('coverPhoto'); if (img) { img.src = sc; img.classList.remove('hidden'); img.parentElement.style.background = 'none'; } }
        }

        // ===== Toast =====
        function showToast(msg) { const t = document.getElementById('toast'); t.textContent = msg; t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 2500); }

        // ===== Following =====
        let followingUsers = Safe.getJSON('followingUsers', []);
        function saveFollowing() { Safe.setJSON('followingUsers', followingUsers); }
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
        function getProfile() { const s = Safe.getString('userProfile'); return s ? JSON.parse(s) : { ...defaultProfile }; }
        function applyProfile(p) {
            const pn=document.querySelector('#page-profile .text-xl.font-bold'); if(pn)pn.textContent=p.name;
            const ps=document.querySelector('#page-profile .text-dark-400.text-sm.mb-3'); if(ps)ps.textContent=p.username+' • '+p.title+' • الإمارات 🇦🇪';
            const pb=document.querySelector('#page-profile .text-dark-300.text-sm.mb-4'); if(pb)pb.textContent=p.bio;
            const pl=document.querySelector('#page-profile .flex.flex-wrap.gap-4 span:first-child'); if(pl)pl.innerHTML='<span class="iconify" data-icon="lucide:map-pin" style="font-size:14px"></span>'+p.location;
            const pw=document.querySelector('#page-profile .text-brand-400.cursor-pointer'); if(pw)pw.textContent=p.website;
            const sn=document.querySelector('.desktop-sidebar .font-semibold.text-sm'); if(sn)sn.textContent=p.name;
            const dn=document.querySelector('#mobileDrawer h3'); if(dn)dn.textContent=p.name;
        }
        function loadProfile() { const s=Safe.getString('userProfile'); if(s)applyProfile(JSON.parse(s)); }
        function openEditProfile() { const p=getProfile(); document.getElementById('editName').value=p.name; document.getElementById('editUsername').value=p.username; document.getElementById('editTitle').value=p.title; document.getElementById('editBio').value=p.bio; document.getElementById('editLocation').value=p.location; document.getElementById('editWebsite').value=p.website; document.getElementById('editProfileModal').classList.add('active'); document.body.style.overflow='hidden'; }
        function closeEditProfile(e) { if(e&&e.target!==e.currentTarget)return; document.getElementById('editProfileModal').classList.remove('active'); document.body.style.overflow=''; }
        function saveProfile() { const p={name:document.getElementById('editName').value.trim()||defaultProfile.name,username:document.getElementById('editUsername').value.trim()||defaultProfile.username,title:document.getElementById('editTitle').value.trim()||defaultProfile.title,bio:document.getElementById('editBio').value.trim()||defaultProfile.bio,location:document.getElementById('editLocation').value.trim()||defaultProfile.location,website:document.getElementById('editWebsite').value.trim()||defaultProfile.website}; Safe.setJSON('userProfile', p); applyProfile(p); closeEditProfile(); showToast('تم حفظ الملف الشخصي ✓'); }

        // ====================================================
