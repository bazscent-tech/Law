        function filterTrendingPage(q){document.getElementById('trendingPageList').querySelectorAll('[class*="p-4"]').forEach(i=>{i.style.display=i.textContent.toLowerCase().includes(q.toLowerCase())?'':'none'})}
        function switchTrendingPageTab(btn,period){document.querySelectorAll('.trending-page-tab').forEach(t=>{t.classList.remove('active','bg-dark-800','text-white');t.classList.add('text-dark-400')});btn.classList.add('active','bg-dark-800','text-white');btn.classList.remove('text-dark-400');showToast('عرض: '+(period==='today'?'اليوم':period==='week'?'هذا الأسبوع':'هذا الشهر'));renderTrendingPageList()}

        // ===== All Posts =====
        const allPosts=[{id:'post-1',author:'د. محمد علي الشعيبي',avatar:'م',verified:true,role:'محامي تحكيم دولي',time:'منذ 23 دقيقة',title:'التحكيم في قضايا الطاقة: دراسة حالة جديدة',content:'محكمة التحكيم الدولية نشرت تقريرها السنوي الجديد الذي يرصد تطور قضايا الطاقة والموارد الطبيعية. من أبرز الملاحظات: ارتفاع 40% في عدد القضايا المتعلقة بالعقود النفطية...',tags:['#التحكيم_الدولي','#قانون_الطاقة'],likes:187,comments:42,shares:28,gradient:'from-blue-500 to-purple-600',relevance:95},{id:'post-2',author:'سارة المنصوري',avatar:'س',verified:false,role:'مستشارة قانونية',time:'منذ ساعة',title:'',content:'تحديث مهم: صدر المرسوم التنفيذي الجديد لقانون حماية البيانات الشخصية في الإمارات. يشمل أحكاماً جديدة حول نقل البيانات عبر الحدود وفرض غرامات تصل إلى 5 مليون درهم للمخالفين. 🇦🇪📋',tags:['#حماية_البيانات','#الإمارات'],likes:134,comments:28,shares:19,gradient:'from-pink-500 to-yellow-500',relevance:88},{id:'post-3',author:'خالد العمري',avatar:'خ',verified:true,role:'أستاذ القانون الدولي',time:'منذ 3 ساعات',title:'قانون الشركات الموحد: تحليل شامل',content:'بعد صدور قانون الشركات الموحد في دول مجلس التعاون، نشرت مكتبنا دراسة تحليلية شاملة تغطي أبرز التغييرات:\n\n1. تبسيط إجراءات التأسيس\n2. حماية أفضل للمساهمين الأقلية\n3. إدخال مفهوم الشركة ذات المسؤولية المحدودة المنفردة\n\nالدراسة متوفرة على ملفنا الشخصي.',tags:['#قانون_الشركات','#مجلس_التعاون'],likes:256,comments:67,shares:45,gradient:'from-cyan-500 to-purple-500',relevance:92},{id:'post-4',author:'فاطمة الحربي',avatar:'ف',verified:false,role:'خبيرة تقنية مالية',time:'منذ 5 ساعات',title:'',content:'هل تعلم؟ 🤔\n\nالبنك المركزي السعودي أصدر توجيهات جديدة لشركات التقنية المالية تتعلق بالتحقق من الهوية الرقمية (eKYC). هذه التوجيهات ستدخل حيز التنفيذ في الربع الأول من 2025.\n\nما رأيكم؟ 💡',tags:['#Fintech','#العملات_الرقمية','#SAMA'],likes:89,comments:34,shares:12,gradient:'from-green-500 to-cyan-500',relevance:85},{id:'post-5',author:'نورة القحطاني',avatar:'ن',verified:true,role:'محامية عقود',time:'منذ 7 ساعات',title:'دليلك الشامل لصياغة العقود الدولية',content:'بعد سنوات من العمل في صياغة العقود الدولية، أشارككم أهم 10 نصائح:\n\n✅ حدد القانون الواجب التطبيق بوضوح\n✅ اختر محكمة التحكيم المناسبة\n✅ لا تتجاهل بنود force majeure\n✅ وثّق كل التعديلات كتابياً\n\nالمقال الكامل في الملف الشخصي 📝',tags:['#العقود','#التحكيم_التجاري'],likes:312,comments:78,shares:56,gradient:'from-purple-500 to-red-500',relevance:90},{id:'post-6',author:'يوسف الشريف',avatar:'ي',verified:false,role:'خبير ملكية فكرية',time:'منذ 9 ساعات',title:'',content:'🚨 تنبيه مهم لرواد الأعمال!\n\nالتسجيل في برنامج حماية العلامات التجارية الجديد ابتدأ اليوم.',tags:['#الملكية_الفكرية','#رواد_الأعمال'],likes:167,comments:45,shares:34,gradient:'from-red-500 to-purple-500',relevance:78},{id:'post-7',author:'عمر الحسيني',avatar:'ع',verified:true,role:'قاضي متقاعد',time:'منذ 11 ساعة',title:'قراءة في أحدث أحكاممحكمة التمييز',content:'محكمة التمييز أصدرت حكماً مهماً بشأن المسؤولية التقصيرية في القضايا الطبية. الحكم يُعيد تعريف معايير الإهمال الطبي ويضع معايير جديدة للتعويض.\n\nقرار سيُحدث ثورة في القضاء الطبي! ⚖️',tags:['#القضاء','#المسؤولية_المدنية','#القانون_الطبي'],likes:198,comments:56,shares:41,gradient:'from-yellow-500 to-green-500',relevance:82},{id:'post-8',author:'ليلى بنت خليفة',avatar:'ل',verified:false,role:'وسيطة قانونية',time:'منذ 14 ساعة',title:'',content:'تجربتي مع الوساطة القانونية في حل نزاع تجاري معقد:\n\nالطرفان: شريكان تجاريان\nالنتيجة: حل ودي في 3 أسابيع بدلاً من سنتين!\n\nالوساطة هي المستقبل 🤝',tags:['#الوساطة','#حل_النزاعات'],likes:145,comments:67,shares:23,gradient:'from-teal-500 to-blue-500',relevance:75},{id:'post-9',author:'د. أحمد المنصور',avatar:'أ',verified:true,role:'أستاذ القانون الدستوري',time:'منذ 18 ساعة',title:'التعديلات الدستورية: قراءة تحليلية',content:'التعديلات الدستورية الأخيرة تستحق قراءة تحليلية معمقة.\n\n📌 تعزيز دور القضاء المستقل\n📌 حماية הזכויות الرقمية\n📌 إنشاء هيئة وطنية للذكاء الاصطناعي\n\nندوة تفاعلية يوم الخميس الساعة 8 مساءً 🎙️',tags:['#القانون_الدستوري','#التعديلات'],likes:234,comments:89,shares:67,gradient:'from-indigo-500 to-purple-600',relevance:80},{id:'post-10',author:'رنا السعيد',avatar:'ر',verified:false,role:'محامية جنائية',time:'منذ يوم',title:'',content:'⚖️ نصيحة قانونية يومية\n\nهل تعلم أن الاحتفاظ بنسخة من أي عقد توقعه هو حق قانوني لك؟\n\nالمادة 34 من قانون المعاملات المدنية تنص على ذلك.\n\nلا توقع أي عقد بدون نسخة! 📄',tags:['#نصيحة_قانونية','#القانون_المدني'],likes:456,comments:123,shares:89,gradient:'from-rose-500 to-orange-500',relevance:70},{id:'post-11',author:'طارق الراشد',avatar:'ط',verified:true,role:'مستشار ضريبي',time:'منذ يوم',title:'الضريبة الجديدة: ما يجب أن تعرفه',content:'تحليل شامل للتعديلات الضريبية الجديدة:\n\n📊 ضريبة القيمة المضافة: لا تغييرات\n📊 ضريبة الدخل: خصم جديد للبحث والتطوير\n📊 ضريبة الشركات: معدل تنافسي 15%\n\n📚 الدليل الكامل متوفر في مكتبتنا القانونية',tags:['#الضريبة','#قانون_الضرائب'],likes:178,comments:54,shares:38,gradient:'from-emerald-500 to-teal-600',relevance:72},{id:'post-12',author:'هدى النعيمي',avatar:'ه',verified:false,role:'أستاذة قانون بحري',time:'منذ يومين',title:'',content:'🗺️ حدود بحرية جديدة!\n\nاتفاقية جديدة بين دول الخليج تحدد الحدود البحرية والمناطق الاقتصادية الخالصة.\n\nتفاصيل كاملة في مقالتي الجديدة 🔗',tags:['#القانون_البحري','#الحدود_البحرية'],likes:98,comments:23,shares:15,gradient:'from-sky-500 to-blue-600',relevance:65}];

        function hideStaticPosts(){const fp=document.getElementById('page-feed');if(!fp)return;fp.querySelectorAll(':scope > article.post-card').forEach(a=>a.remove())}
        function getFeedPosts(){return allPosts.filter(p=>!isFollowing(p.author))}

        // Load Supabase posts into allPosts for the feed
        const _gradients = ['from-blue-500 to-purple-600','from-pink-500 to-yellow-500','from-cyan-500 to-purple-500','from-green-500 to-cyan-500','from-purple-500 to-red-500','from-red-500 to-purple-500','from-yellow-500 to-green-500','from-teal-500 to-blue-500','from-indigo-500 to-purple-600','from-rose-500 to-orange-500','from-emerald-500 to-teal-600','from-sky-500 to-blue-600'];
        async function loadSupabaseFeedPosts() {
            if (!sbOnline) return;
            try {
                const { data: sbPosts } = await sb.from('posts')
                    .select('*, profiles(*)')
                    .order('created_at', { ascending: false })
                    .limit(50);
                if (!sbPosts || sbPosts.length === 0) return;
                const existingIds = new Set(allPosts.map(p => p.id));
                sbPosts.forEach((sp, i) => {
                    if (existingIds.has(sp.id)) return;
                    const profile = sp.profiles || {};
                    const name = profile.name || 'مستخدم';
                    const avatarLetter = name.charAt(0);
                    const avatarUrl = profile.avatar_url || '';
                    const timeDiff = Date.now() - new Date(sp.created_at).getTime();
                    const mins = Math.floor(timeDiff / 60000);
                    let time = 'الآن';
                    if (mins < 60) time = `منذ ${mins} دقيقة`;
                    else if (mins < 1440) time = `منذ ${Math.floor(mins/60)} ساعة`;
                    else time = `منذ ${Math.floor(mins/1440)} يوم`;
                    allPosts.push({
                        id: sp.id,
                        author: name,
                        avatar: avatarLetter,
                        avatarUrl: avatarUrl,
                        verified: profile.verified || false,
                        role: profile.title || '',
                        time: time,
                        title: sp.title || '',
                        content: sp.content || '',
                        tags: sp.tags || [],
                        likes: sp.likes_count || 0,
                        comments: sp.comments_count || 0,
                        shares: sp.shares_count || 0,
                        gradient: _gradients[(sp.id.charCodeAt(0) || 0) % _gradients.length],
                        relevance: 70 + Math.floor(Math.random() * 20)
                    });
                });
            } catch(e) { console.warn('Feed Supabase load failed:', e); }
        }

        async function renderFeedPosts(){
            await loadSupabaseFeedPosts();
            const container=document.getElementById('page-feed');if(!container)return;
            container.querySelectorAll('.post-card,.dynamic-post').forEach(el=>el.remove());
            const posts=getFeedPosts().sort((a,b)=>b.relevance-a.relevance);
            const loader=document.getElementById('infiniteLoader');
            if(posts.length===0){
                const e=document.createElement('div');e.className='dynamic-post text-center py-12 text-dark-400';
                e.innerHTML='<span class="iconify text-4xl mb-3 block" data-icon="lucide:file-text"></span><p class="text-sm">لا توجد منشورات بعد. كن أول من ينشر!</p>';
                container.insertBefore(e,loader);document.getElementById('infiniteLoader').style.display='none';return;
            }
            posts.forEach((post,i)=>{const div=document.createElement('div');div.className='dynamic-post';div.innerHTML=buildPlatformPostHTML(post,i);container.insertBefore(div.firstElementChild,loader)});
            document.getElementById('infiniteLoader').style.display='none';document.getElementById('feedEnd').style.display='none';
        }

        async function renderFollowingPosts(){await loadSupabaseFeedPosts();const c=document.getElementById('followingPosts');if(!c)return;const posts=allPosts.filter(p=>isFollowing(p.author));if(posts.length===0){c.innerHTML='<div class="text-center py-12 text-dark-400"><span class="iconify text-4xl mb-3 block" data-icon="lucide:user-plus"></span><p class="text-sm">لم تتابع أحداً بعد</p></div>';return;}c.innerHTML=posts.map((p,i)=>buildPlatformPostHTML(p,i)).join('')}
        function switchFollowingTab(btn,filter){document.querySelectorAll('.following-tab').forEach(t=>{t.classList.remove('active','bg-dark-800','text-white');t.classList.add('text-dark-400')});btn.classList.add('active','bg-dark-800','text-white');btn.classList.remove('text-dark-400');showToast('عرض: '+(filter==='all'?'الكل':filter==='people'?'أشخاص':'صفحات'));renderFollowingPosts()}

        // ===== Audio Spaces =====
        const audioSpaces=[{id:1,title:'التحكيم التجاري: تجارب ودروس',host:'د. محمد علي الشعيبي',avatar:'م',gradient:'from-blue-500 to-purple-600',status:'live',listeners:342,speakers:['م','خ','ن'],speakerNames:['محمد','خالد','نورة'],topic:'قانوني',startedAgo:'منذ 45 دقيقة',desc:'مناقشة أحدث تطورات التحكيم التجاري'},{id:2,title:'مستقبل العملات الرقمية',host:'فاطمة الحربي',avatar:'ف',gradient:'from-green-500 to-cyan-500',status:'live',listeners:189,speakers:['ف','ي'],speakerNames:['فاطمة','يوسف'],topic:'تقنية',startedAgo:'منذ 20 دقيقة',desc:'نقاش حول الإطار التنظيمي للعملات الرقمية'},{id:3,title:'قراءة في قانون الشركات الجديد',host:'خالد العمري',avatar:'خ',gradient:'from-cyan-500 to-purple-500',status:'upcoming',listeners:0,speakers:['خ'],speakerNames:['خالد'],topic:'قانوني',startsAt:'اليوم 8:00 م',desc:'تحليل شامل للتعديلات'},{id:4,title:'ورشة: صياغة العقود الدولية',host:'نورة القحطاني',avatar:'ن',gradient:'from-purple-500 to-red-500',status:'upcoming',listeners:0,speakers:['ن','ل'],speakerNames:['نورة','ليلى'],topic:'قانوني',startsAt:'غداً 6:00 م',desc:'ورشة عملية'},{id:5,title:'قانون حماية البيانات',host:'سارة المنصوري',avatar:'س',gradient:'from-pink-500 to-yellow-500',status:'recorded',listeners:567,speakers:['س','أ'],speakerNames:['سارة','أحمد'],topic:'قانوني',recordedAgo:'منذ يومين',desc:'ملخص التعديلات'},{id:6,title:'الذكاء الاصطناعي والقانون',host:'د. أحمد المنصور',avatar:'أ',gradient:'from-indigo-500 to-purple-600',status:'recorded',listeners:892,speakers:['أ','ف','م'],speakerNames:['أحمد','فاطمة','محمد'],topic:'تقنية',recordedAgo:'منذ 3 أيام',desc:'نقاش حول الإطار القانوني للذكاء الاصطناعي'}];
        function renderSpaces(filter){const c=document.getElementById('spacesList');let f=audioSpaces;if(filter==='live')f=audioSpaces.filter(s=>s.status==='live');else if(filter==='upcoming')f=audioSpaces.filter(s=>s.status==='upcoming');else if(filter==='recorded')f=audioSpaces.filter(s=>s.status==='recorded');c.innerHTML=f.map(space=>{const il=space.status==='live',iu=space.status==='upcoming';const sb=il?'<span class="bg-red-500/20 text-red-400 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1"><span class="w-1.5 h-1.5 bg-red-500 rounded-full live-dot"></span>مباشر</span>':iu?'<span class="bg-blue-500/20 text-blue-400 text-[10px] font-bold px-2 py-0.5 rounded-full">قريباً</span>':'<span class="bg-dark-700/50 text-dark-400 text-[10px] font-bold px-2 py-0.5 rounded-full">مسجل</span>';const sa=space.speakers.map(s=>`<div class="speaker-avatar"><div class="w-10 h-10 rounded-full bg-gradient-to-br ${space.gradient} flex items-center justify-center text-white text-xs font-bold border-2 border-dark-900">${s}</div>${il?'<div class="mic-icon bg-green-500"><span class="iconify text-white" data-icon="lucide:mic" style="font-size:7px"></span></div>':''}</div>`).join('');const ab=il?`<button class="bg-red-500 hover:bg-red-600 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-all active:scale-95" onclick="event.stopPropagation();showToast('انضممت إلى المساحة 🎙️')">انضم الآن</button>`:iu?`<button class="bg-dark-800 hover:bg-dark-700 text-white text-xs font-semibold px-4 py-2 rounded-xl border border-dark-700 transition-all" onclick="event.stopPropagation();showToast('تم تفعيل التذكير 🔔')">تذكير</button>`:`<button class="bg-dark-800 hover:bg-dark-700 text-white text-xs font-semibold px-4 py-2 rounded-xl border border-dark-700 transition-all" onclick="event.stopPropagation();showToast('تشغيل التسجيل ▶️')">استمع</button>`;const mt=il?`<span class="text-red-400 text-[10px] flex items-center gap-1"><span class="w-1.5 h-1.5 bg-red-500 rounded-full live-dot"></span>${space.startedAgo}</span>`:iu?`<span class="text-blue-400 text-[10px]">🕐 ${space.startsAt}</span>`:`<span class="text-dark-500 text-[10px]">🎙️ ${space.recordedAgo}</span>`;return `<div class="space-card ${il?'live':''} bg-dark-900/80 rounded-2xl p-5 cursor-pointer animate-fade-in-up" onclick="showToast('فتح المساحة: ${space.title}')"><div class="flex items-start justify-between mb-3"><div class="flex items-center gap-2">${sb}<span class="text-dark-500 text-[10px]">•</span><span class="text-dark-400 text-[10px]">${space.topic}</span></div>${ab}</div><h3 class="font-bold text-base mb-2 ${il?'text-white':'text-dark-200'}">${space.title}</h3><p class="text-dark-400 text-xs mb-3 leading-relaxed">${space.desc}</p><div class="flex items-center justify-between"><div class="flex items-center gap-3"><div class="flex -space-x-2 space-x-reverse">${sa}</div><div><p class="text-xs font-medium">${space.host}</p><p class="text-dark-500 text-[10px]">${space.speakerNames.join('، ')}</p></div></div><div class="flex items-center gap-3">${mt}${il?`<span class="flex items-center gap-1 text-dark-400 text-[10px]"><span class="iconify" data-icon="lucide:headphones" style="font-size:12px"></span>${space.listeners}</span>`:''}</div></div></div>`}).join('')}
        function switchSpaceTab(btn,filter){document.querySelectorAll('.space-tab').forEach(t=>{t.classList.remove('active','bg-red-500/20','text-red-400','bg-dark-800','text-white');t.classList.add('text-dark-400')});btn.classList.add('active');btn.classList.remove('text-dark-400');if(filter==='live')btn.classList.add('bg-red-500/20','text-red-400');else btn.classList.add('bg-dark-800','text-white');renderSpaces(filter)}

        // ===== Auto-hide on scroll =====
        (function(){let last=0;const h=()=>document.getElementById('mainHeader'),b=()=>document.querySelector('.mobile-bottom-nav');window.addEventListener('scroll',function(){if(window.innerWidth>=1024)return;const c=window.scrollY;if(c<50){h()?.classList.remove('hide-on-scroll');b()?.classList.remove('hide-on-scroll');last=c;return}if(c-last>10){h()?.classList.add('hide-on-scroll');b()?.classList.add('hide-on-scroll')}else if(last-c>10){h()?.classList.remove('hide-on-scroll');b()?.classList.remove('hide-on-scroll')}last=c},{passive:true})})();

        // ============================================================
        // ===== STORIES SYSTEM ======================================
        // ============================================================

        let storiesData = UserStore.getJSON('storiesData', null);
        let viewedStories = UserStore.getJSON('viewedStories', []);
        let currentStoryUserIndex = 0;
        let currentStoryIndex = 0;
        let storyTimer = null;
        let storyPaused = false;
        let storyProgressStart = 0;
        let storyProgressRAF = null;

        function getDefaultStories() {
            return [
                { id: 'user-me', name: 'أنت', avatar: 'https://picsum.photos/seed/lawyer-me/80/80.jpg', isOwn: true, stories: [] },
                { id: 'user-sara', name: 'سارة المنصوري', avatar: 'https://picsum.photos/seed/sara-legal/80/80.jpg', stories: [
                    { id: 's1', type: 'image', src: 'https://picsum.photos/seed/sara-story1/400/700.jpg', time: 'منذ ساعتين', duration: 5000 },
                    { id: 's2', type: 'text', text: 'قانون جديد صدر اليوم! 📋⚖️', bg: 'linear-gradient(135deg,#8b5cf6,#6d28d9)', time: 'منذ 3 ساعات', duration: 5000 }
                ]},
                { id: 'user-khalid', name: 'خالد العمري', avatar: 'https://picsum.photos/seed/khalid-jordan/80/80.jpg', stories: [
                    { id: 'k1', type: 'image', src: 'https://picsum.photos/seed/khalid-story1/400/700.jpg', time: 'منذ 4 ساعات', duration: 5000 },
                    { id: 'k2', type: 'image', src: 'https://picsum.photos/seed/khalid-story2/400/700.jpg', time: 'منذ 5 ساعات', duration: 5000 },
                    { id: 'k3', type: 'text', text: 'المحكمة أصدرت حكماً تاريخياً ⚖️', bg: 'linear-gradient(135deg,#06b6d4,#0891b2)', time: 'منذ 6 ساعات', duration: 5000 }
                ]},
                { id: 'user-fatima', name: 'فاطمة الحربي', avatar: 'https://picsum.photos/seed/fatima-fintech/80/80.jpg', stories: [
                    { id: 'f1', type: 'text', text: 'Fintech is the future! 💡🚀', bg: 'linear-gradient(135deg,#10b981,#059669)', time: 'منذ ساعة', duration: 5000 }
                ]},
                { id: 'user-nora', name: 'نورة القحطاني', avatar: 'https://picsum.photos/seed/nora-lawyer/80/80.jpg', stories: [
                    { id: 'n1', type: 'image', src: 'https://picsum.photos/seed/nora-story1/400/700.jpg', time: 'منذ 8 ساعات', duration: 5000 },
                    { id: 'n2', type: 'text', text: 'ورشة عمل غداً عن العقود الدولية 📝', bg: 'linear-gradient(135deg,#ec4899,#be185d)', time: 'منذ 10 ساعات', duration: 5000 }
                ]},
                { id: 'user-omar', name: 'عمر الحسيني', avatar: 'https://picsum.photos/seed/omar-judge/80/80.jpg', stories: [
                    { id: 'o1', type: 'image', src: 'https://picsum.photos/seed/omar-story1/400/700.jpg', time: 'منذ يوم', duration: 5000 }
                ]}
            ];
        }

        function initStories() {
            if (!storiesData) {
                storiesData = getDefaultStories();
                UserStore.setJSON('storiesData', storiesData);
            }
            renderStoriesBar();
        }

        function saveStories() { UserStore.setJSON('storiesData', storiesData); }
        function saveViewedStories() { UserStore.setJSON('viewedStories', viewedStories); }

        function renderStoriesBar() {
            const bar = document.getElementById('storiesBar');
            if (!bar) return;
            const profile = getProfile();

            // Update "add story" avatar
            const addCard = bar.querySelector('.add-story');
            if (addCard) {
                const savedAvatar = UserStore.getString('profileAvatar');
                if (savedAvatar) addCard.querySelector('.story-card-bg').src = savedAvatar;
            }

            // Remove old story cards (keep add-story)
            bar.querySelectorAll('.story-card:not(.add-story)').forEach(c => c.remove());

            // Render other users' stories
            storiesData.filter(u => !u.isOwn && u.stories.length > 0).forEach(user => {
                const isViewed = user.stories.every(s => viewedStories.includes(s.id));
                const firstStory = user.stories[0];

                if (firstStory.type === 'text') {
                    const card = document.createElement('div');
                    card.className = 'story-card text-story';
                    card.style.background = firstStory.bg || 'linear-gradient(135deg,#f97316,#ea580c)';
                    card.onclick = () => openStoryViewer(user.id);
                    card.innerHTML = `
                        <img src="${user.avatar}" class="story-card-avatar${isViewed ? ' viewed' : ''}" alt="">
                        <span class="story-card-text">${firstStory.text.substring(0, 60)}</span>
                        <span class="story-card-name">${user.name}</span>
                    `;
                    bar.appendChild(card);
                } else {
                    const card = document.createElement('div');
                    card.className = 'story-card';
                    card.onclick = () => openStoryViewer(user.id);
                    card.innerHTML = `
                        <img src="${firstStory.src || firstStory.data || user.avatar}" class="story-card-bg" alt="" loading="lazy">
                        <div class="story-card-overlay"></div>
                        <img src="${user.avatar}" class="story-card-avatar${isViewed ? ' viewed' : ''}" alt="">
                        <span class="story-card-name">${user.name}</span>
                    `;
                    bar.appendChild(card);
                }
            });

            // Update own story card
            const myStories = storiesData.find(u => u.isOwn);
            if (myStories && myStories.stories.length > 0) {
                addCard.onclick = () => openStoryViewer('user-me');
                const label = addCard.querySelector('.story-card-label');
                if (label) label.textContent = 'حالاتي';
            }
        }

        // ===== CREATE STORY =====
        function openCreateStory() {
            const myStories = storiesData.find(u => u.isOwn);
            if (myStories && myStories.stories.length > 0) {
                openStoryViewer('user-me');
                return;
            }
            document.getElementById('createStoryModal').classList.add('active');
        }
        function closeCreateStory(e) { if(e&&e.target!==e.currentTarget)return; document.getElementById('createStoryModal').classList.remove('active'); }

        let textStoryColor = 'linear-gradient(135deg,#f97316,#ea580c)';

        function startTextStory() {
            if (typeof requireAuth === 'function' && !requireAuth()) return;
            document.getElementById('createStoryModal').classList.remove('active');
            document.getElementById('textStoryEditor').style.display = 'flex';
            document.getElementById('textStoryEditor').classList.add('active');
            document.getElementById('textStoryInput').value = '';
            document.getElementById('textStoryPreview').style.background = textStoryColor;
            setTimeout(() => document.getElementById('textStoryInput').focus(), 300);
        }

        function closeTextStoryEditor() {
            document.getElementById('textStoryEditor').style.display = 'none';
            document.getElementById('textStoryEditor').classList.remove('active');
        }

        function setTextStoryColor(btn, color) {
            document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            textStoryColor = color;
            document.getElementById('textStoryPreview').style.background = color;
        }

        function updateTextStoryPreview() {
            // Just live update — no extra logic needed
        }

        function publishTextStory() {
            if (typeof requireAuth === 'function' && !requireAuth()) return;
            const text = document.getElementById('textStoryInput').value.trim();
            if (!text) { showToast('اكتب شيئاً أولاً'); return; }

            let myUser = storiesData.find(u => u.isOwn);
            if (!myUser) {
                myUser = { id: 'user-me', name: getProfile().name, avatar: UserStore.getString('profileAvatar') || 'https://picsum.photos/seed/lawyer-me/80/80.jpg', isOwn: true, stories: [] };
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
