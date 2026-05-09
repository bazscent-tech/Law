        // ===== Toast Notification =====
        function showToast(message) {
            const toast = document.getElementById('toast');
            toast.textContent = message;
            toast.classList.add('show');
            setTimeout(() => toast.classList.remove('show'), 2500);
        }

        // ===== Page Navigation =====
        function showPage(page) {
            document.querySelectorAll('.page-content').forEach(p => p.classList.add('hidden'));
            const target = document.getElementById('page-' + page);
            if (target) {
                target.classList.remove('hidden');
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

        // ===== Mobile Menu =====
        function toggleMobileMenu() {
            const menu = document.getElementById('mobileMenu');
            menu.classList.toggle('hidden');
            menu.classList.toggle('flex');
        }

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
        function publishPost() {
            const input = document.getElementById('postInput');
            if (input.textContent.trim() === '') {
                showToast('اكتب شيئاً قبل النشر');
                return;
            }
            showToast('تم نشر المنشور بنجاح ✓');
            input.textContent = '';
            input.style.color = '';
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
        function publishModalPost() {
            const text = document.getElementById('modalPostText').value.trim();
            if (!text) {
                showToast('اكتب شيئاً قبل النشر');
                return;
            }
            showToast('تم نشر المنشور بنجاح ✓');
            document.getElementById('modalPostText').value = '';
            closePostModal();
        }

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

        // ===== Trending Drawer =====
        function openTrendingDrawer() {
            document.getElementById('trendingDrawerOverlay').classList.add('open');
            document.body.style.overflow = 'hidden';
            renderTrendingList('all');
            setTimeout(() => document.getElementById('trendingDrawerSearchInput')?.focus(), 350);
        }

        function closeTrendingDrawer() {
            document.getElementById('trendingDrawerOverlay').classList.remove('open');
            document.body.style.overflow = '';
        }

        // Smart swipe from right edge to open drawer (mobile)
        (function() {
            let touchStartX = 0;
            let touchStartY = 0;
            let isEdgeSwipe = false;
            const EDGE_THRESHOLD = 30; // px from right edge
            const SWIPE_THRESHOLD = 50; // min swipe distance

            document.addEventListener('touchstart', function(e) {
                const touch = e.touches[0];
                touchStartX = touch.clientX;
                touchStartY = touch.clientY;
                // Only trigger if touch starts near right edge and drawer is closed
                isEdgeSwipe = (
                    touchStartX > window.innerWidth - EDGE_THRESHOLD &&
                    !document.getElementById('trendingDrawerOverlay').classList.contains('open')
                );
            }, { passive: true });

            document.addEventListener('touchend', function(e) {
                if (!isEdgeSwipe) return;
                const touch = e.changedTouches[0];
                const deltaX = touchStartX - touch.clientX; // negative = swipe left (RTL: opens from right)
                const deltaY = Math.abs(touchStartY - touch.clientY);
                // Swipe left (from right edge) = open drawer, with some vertical tolerance
                if (deltaX > SWIPE_THRESHOLD && deltaY < 100) {
                    openTrendingDrawer();
                }
                isEdgeSwipe = false;
            }, { passive: true });
        })();

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
                    <div class="trending-item" onclick="showToast('عرض: ${item.tag}');closeTrendingDrawer()">
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

        function getRelevantPosts(page, perPage) {
            const sorted = [...allPosts].sort((a, b) => b.relevance - a.relevance);
            const start = page * perPage;
            const end = start + perPage;
            return sorted.slice(start, end);
        }

        function createPostHTML(post, index) {
            const verifiedBadge = post.verified ? '<span class="iconify text-brand-500 text-sm" data-icon="lucide:badge-check"></span>' : '';
            const titleHTML = post.title ? `<h2 class="font-bold text-base mb-2 leading-relaxed">${post.title}</h2>` : '';
            const tagsHTML = post.tags.map(t => {
                const colors = ['brand', 'blue', 'purple', 'green', 'cyan', 'pink', 'yellow'];
                const color = colors[Math.abs(t.charCodeAt(1)) % colors.length];
                return `<span class="hashtag bg-${color}-500/10 text-${color}-400 text-xs font-medium px-3 py-1 rounded-full cursor-pointer transition-all" onclick="showToast('تصفية: ${t}')">${t}</span>`;
            }).join('');

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
                            <button class="p-1.5 rounded-lg hover:bg-dark-800 transition-colors" onclick="showPostMenu(this)">
                                <span class="iconify text-dark-400 text-lg" data-icon="lucide:more-horizontal"></span>
                            </button>
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
                        </div>
                    </div>
                </article>
            `;
        }

        function loadMoreFeedPosts() {
            if (isLoadingFeed || feedExhausted) return;
            isLoadingFeed = true;
            document.getElementById('infiniteLoader').style.display = 'flex';

            setTimeout(() => {
                const posts = getRelevantPosts(feedPage, postsPerPage);
                if (posts.length === 0) {
                    feedExhausted = true;
                    document.getElementById('infiniteLoader').style.display = 'none';
                    document.getElementById('feedEnd').style.display = 'block';
                    isLoadingFeed = false;
                    return;
                }
                const container = document.getElementById('page-feed');
                const loader = document.getElementById('infiniteLoader');
                posts.forEach((post, i) => {
                    const div = document.createElement('div');
                    div.innerHTML = createPostHTML(post, feedPage * postsPerPage + i);
                    container.insertBefore(div.firstElementChild, loader);
                });
                feedPage++;
                document.getElementById('infiniteLoader').style.display = 'none';
                isLoadingFeed = false;
            }, 800);
        }

        // Intersection Observer for infinite scroll
        function setupInfiniteScroll() {
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const feedPage2 = document.getElementById('page-feed');
                        if (feedPage2 && !feedPage2.classList.contains('hidden')) {
                            loadMoreFeedPosts();
                        }
                    }
                });
            }, { rootMargin: '200px' });
            const loader = document.getElementById('infiniteLoader');
            if (loader) observer.observe(loader);
        }

        // ===== Following Page =====
        function renderFollowingPosts() {
            const container = document.getElementById('followingPosts');
            const followingAuthors = ['سارة المنصوري', 'د. محمد علي الشعيبي', 'خالد العمري', 'فاطمة الحربي', 'نورة القحطاني'];
            const posts = allPosts.filter(p => followingAuthors.includes(p.author));
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

        // ===== Initialize =====
        document.addEventListener('DOMContentLoaded', () => {
            renderTrendingList('all');
            renderFollowingPosts();
            renderSpaces('live');
            setupInfiniteScroll();
            // Show initial loader
            document.getElementById('infiniteLoader').style.display = 'flex';
            setTimeout(() => loadMoreFeedPosts(), 500);
        });
