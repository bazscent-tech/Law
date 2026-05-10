        // ============================================================
        // ===== PULL-TO-REFRESH SYSTEM ==============================
        // ============================================================

        const PullToRefresh = {
            _active: false,
            _startY: 0,
            _currentY: 0,
            _threshold: 80,
            _pulling: false,
            _refreshing: false,
            _indicator: null,

            init() {
                // Create indicator element
                this._indicator = document.createElement('div');
                this._indicator.id = 'ptr-indicator';
                this._indicator.innerHTML = `
                    <div class="ptr-spinner"></div>
                    <span class="ptr-text">اسحب للتحديث</span>
                `;
                this._indicator.style.cssText = `
                    position: fixed; top: 0; left: 0; right: 0; z-index: 9998;
                    display: flex; align-items: center; justify-content: center; gap: 10px;
                    height: 0; overflow: hidden; background: #0a0a0a;
                    transition: height 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                    font-size: 13px; color: #a3a3a3;
                `;
                document.body.prepend(this._indicator);

                // Add spinner CSS
                const style = document.createElement('style');
                style.textContent = `
                    .ptr-spinner {
                        width: 20px; height: 20px; border: 2px solid #404040;
                        border-top-color: #f97316; border-radius: 50%;
                        animation: ptr-spin 0.8s linear infinite;
                        transition: transform 0.3s;
                    }
                    .ptr-spinner.refreshing { animation: ptr-spin 0.6s linear infinite; }
                    @keyframes ptr-spin { to { transform: rotate(360deg); } }
                    .ptr-pulling .ptr-spinner { transform: rotate(var(--ptr-rotate, 0deg)); }
                    .ptr-text { font-family: 'Noto Kufi Arabic', sans-serif; }
                `;
                document.head.appendChild(style);

                this._bindEvents();
            },

            _bindEvents() {
                let touchStartY = 0;
                let isTouching = false;

                document.addEventListener('touchstart', (e) => {
                    if (this._refreshing) return;
                    // Don't activate if story viewer is open
                    const storyViewer = document.getElementById('storyViewer');
                    if (storyViewer && storyViewer.classList.contains('active')) return;
                    // Only activate at top of page or inside specific scrollable containers
                    const scrollY = window.scrollY || document.documentElement.scrollTop;
                    if (scrollY > 5) return;
                    touchStartY = e.touches[0].clientY;
                    isTouching = true;
                    this._pulling = false;
                }, { passive: true });

                document.addEventListener('touchmove', (e) => {
                    if (!isTouching || this._refreshing) return;
                    const scrollY = window.scrollY || document.documentElement.scrollTop;
                    if (scrollY > 0) { this._pulling = false; return; }

                    const currentY = e.touches[0].clientY;
                    const pullDistance = currentY - touchStartY;

                    if (pullDistance > 10) {
                        this._pulling = true;
                        // Dampen the pull
                        const dampened = Math.min(pullDistance * 0.5, 120);
                        this._indicator.style.height = dampened + 'px';
                        const rotate = (dampened / 120) * 720;
                        const spinner = this._indicator.querySelector('.ptr-spinner');
                        spinner.style.setProperty('--ptr-rotate', rotate + 'deg');
                        spinner.classList.add('ptr-pulling');

                        const text = this._indicator.querySelector('.ptr-text');
                        if (dampened >= this._threshold) {
                            text.textContent = 'اترك للتحديث';
                            text.style.color = '#f97316';
                        } else {
                            text.textContent = 'اسحب للتحديث';
                            text.style.color = '#a3a3a3';
                        }
                    }
                }, { passive: true });

                document.addEventListener('touchend', () => {
                    if (!isTouching) return;
                    isTouching = false;

                    if (!this._pulling) return;
                    this._pulling = false;

                    const height = parseInt(this._indicator.style.height) || 0;
                    if (height >= this._threshold) {
                        this._doRefresh();
                    } else {
                        this._collapse();
                    }
                }, { passive: true });
            },

            async _doRefresh() {
                this._refreshing = true;
                const spinner = this._indicator.querySelector('.ptr-spinner');
                const text = this._indicator.querySelector('.ptr-text');
                spinner.classList.remove('ptr-pulling');
                spinner.classList.add('refreshing');
                text.textContent = 'جاري التحديث...';
                text.style.color = '#f97316';
                this._indicator.style.height = '60px';

                // Save current state before refresh
                AppState.save();

                // Refresh current page content
                await this._refreshCurrentPage();

                // Done
                text.textContent = 'تم التحديث ✓';
                text.style.color = '#22c55e';
                spinner.classList.remove('refreshing');
                spinner.style.display = 'none';

                setTimeout(() => {
                    this._collapse();
                    spinner.style.display = '';
                }, 800);

                this._refreshing = false;
            },

            async _refreshCurrentPage() {
                const currentPage = AppState._getCurrentPage();

                // Simulate a small delay for smooth UX
                await new Promise(r => setTimeout(r, 500));

                switch(currentPage) {
                    case 'feed':
                        if (typeof renderFeedPosts === 'function') renderFeedPosts();
                        break;
                    case 'profile':
                        if (typeof renderProfilePosts === 'function') renderProfilePosts();
                        break;
                    case 'following':
                        if (typeof renderFollowingPosts === 'function') renderFollowingPosts();
                        break;
                    case 'audio-spaces':
                        if (typeof renderSpaces === 'function') renderSpaces('live');
                        break;
                    case 'trending':
                        if (typeof renderTrendingPageList === 'function') renderTrendingPageList();
                        break;
                    case 'notifications':
                        if (typeof renderNotifs === 'function') renderNotifs('all');
                        break;
                    default:
                        if (typeof renderFeedPosts === 'function') renderFeedPosts();
                }
            },

            _collapse() {
                this._indicator.style.height = '0';
                setTimeout(() => {
                    const spinner = this._indicator.querySelector('.ptr-spinner');
                    const text = this._indicator.querySelector('.ptr-text');
                    if (spinner) spinner.classList.remove('ptr-pulling', 'refreshing');
                    if (text) { text.textContent = 'اسحب للتحديث'; text.style.color = '#a3a3a3'; }
                }, 300);
            }
        };

        // ============================================================
        // ===== NOTIFICATION PULL-TO-REFRESH ========================
        // ============================================================

        const NotifPTR = {
            _active: false,
            _startY: 0,
            _refreshing: false,
            _indicator: null,

            init() {
                const dropdown = document.getElementById('notifDropdown');
                if (!dropdown) return;

                this._indicator = document.createElement('div');
                this._indicator.className = 'notif-ptr-indicator';
                this._indicator.innerHTML = '<div class="ptr-spinner"></div><span class="ptr-text" style="font-size:12px">جاري التحديث...</span>';
                this._indicator.style.cssText = 'display:none;align-items:center;justify-content:center;gap:8px;padding:10px;background:#0a0a0a;';
                const list = dropdown.querySelector('.notif-list');
                if (list) list.prepend(this._indicator);

                dropdown.addEventListener('touchstart', (e) => {
                    if (this._refreshing) return;
                    if (list && list.scrollTop <= 0) {
                        this._startY = e.touches[0].clientY;
                        this._active = true;
                    }
                }, { passive: true });

                dropdown.addEventListener('touchend', (e) => {
                    if (!this._active || this._refreshing) return;
                    this._active = false;
                    const endY = e.changedTouches[0].clientY;
                    if (endY - this._startY > 80) {
                        this._refresh();
                    }
                }, { passive: true });
            },

            async _refresh() {
                this._refreshing = true;
                this._indicator.style.display = 'flex';
                await new Promise(r => setTimeout(r, 600));
                if (typeof renderNotifs === 'function') renderNotifs('all');
                this._indicator.style.display = 'none';
                this._refreshing = false;
                if (typeof showToast === 'function') showToast('تم تحديث الإشعارات ✓');
            }
        };

        // ============================================================
        // ===== HISTORY API (SPA NAVIGATION) =========================
        // ============================================================

        const Router = {
            _initialized: false,

            init() {
                if (this._initialized) return;
                this._initialized = true;

                // Override showPage to use history
                const originalShowPage = window.showPage;
                window.showPage = (page) => {
                    // Save current state before navigating
                    AppState.save();
                    // Push new state
                    history.pushState({ page }, '', '#' + page);
                    // Call original (but we override scroll behavior)
                    _silentShowPage(page);
                    window.scrollTo({ top: 0, behavior: 'instant' });
                };

                // Handle back/forward
                window.addEventListener('popstate', (e) => {
                    const page = (e.state && e.state.page) || this._getHashPage() || 'feed';
                    _silentShowPage(page);
                    // Restore scroll for this page
                    requestAnimationFrame(() => {
                        AppState._restoreScrollPosition(page);
                    });
                });

                // Set initial hash if none
                if (!window.location.hash) {
                    history.replaceState({ page: 'feed' }, '', '#feed');
                }
            },

            _getHashPage() {
                const hash = window.location.hash.replace('#', '');
                return hash || 'feed';
            }
        };

        // ============================================================
        // ===== AUTO-SAVE STATE ON INTERACTIONS =====================
        // ============================================================

        // Save state before unload
        window.addEventListener('beforeunload', () => {
            AppState.save();
        });

        // Save state on scroll (debounced)
        let _scrollSaveTimer = null;
        window.addEventListener('scroll', () => {
            clearTimeout(_scrollSaveTimer);
            _scrollSaveTimer = setTimeout(() => {
                AppState._saveScrollPosition();
            }, 300);
        }, { passive: true });

        // Save state periodically
        setInterval(() => { AppState.save(); }, 5000);

        // ============================================================
        // ===== END SPA SYSTEM ======================================
        // ============================================================
