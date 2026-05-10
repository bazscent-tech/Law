        // ============================================================
        // ===== SPA STATE MANAGER & PULL-TO-REFRESH ================
        // ============================================================

        const AppState = {
            _key: 'lawbook_app_state',
            _scrollKey: 'lawbook_scroll_positions',

            // Save current app state
            save() {
                const state = {
                    currentPage: this._getCurrentPage(),
                    activeTab: this._getActiveTab(),
                    openPostId: typeof currentDetailPostId !== 'undefined' ? currentDetailPostId : null,
                    openModal: this._getOpenModal(),
                    timestamp: Date.now()
                };
                sessionStorage.setItem(this._key, JSON.stringify(state));
                this._saveScrollPosition();
            },

            // Restore saved state on page load
            restore() {
                try {
                    const raw = sessionStorage.getItem(this._key);
                    if (!raw) return false;
                    const state = Safe.parse(raw, null);
                    if (!state.currentPage) return false;

                    // Restore page
                    if (state.currentPage !== 'feed') {
                        _silentShowPage(state.currentPage);
                    }

                    // Restore active tab
                    if (state.activeTab) {
                        this._restoreTab(state.activeTab);
                    }

                    // Restore scroll position
                    requestAnimationFrame(() => {
                        this._restoreScrollPosition(state.currentPage);
                    });

                    // Restore open post detail
                    if (state.openPostId) {
                        setTimeout(() => {
                            if (typeof openPostDetail === 'function') {
                                openPostDetail(state.openPostId);
                            }
                        }, 200);
                    }

                    return true;
                } catch (e) {
                    return false;
                }
            },

            _getCurrentPage() {
                const pages = document.querySelectorAll('.page-content');
                for (const p of pages) {
                    if (!p.classList.contains('hidden')) {
                        return p.id.replace('page-', '');
                    }
                }
                return 'feed';
            },

            _getActiveTab() {
                // Check profile tabs
                const profileTab = document.querySelector('#page-profile .profile-tab.active');
                if (profileTab && !document.getElementById('page-profile').classList.contains('hidden')) {
                    return { type: 'profile', label: profileTab.textContent.trim() };
                }
                // Check feed tabs
                const feedTab = document.querySelector('.feed-tab.active');
                if (feedTab && !document.getElementById('page-feed').classList.contains('hidden')) {
                    return { type: 'feed', label: feedTab.textContent.trim() };
                }
                return null;
            },

            _restoreTab(tab) {
                if (tab.type === 'profile') {
                    const tabs = document.querySelectorAll('#page-profile .profile-tab');
                    tabs.forEach(t => {
                        if (t.textContent.trim() === tab.label) {
                            if (typeof switchProfileTab === 'function') switchProfileTab(t);
                        }
                    });
                }
            },

            _getOpenModal() {
                if (document.getElementById('postDetailModal')?.classList.contains('active')) return 'postDetail';
                if (document.getElementById('editPostModal')?.classList.contains('active')) return 'editPost';
                if (document.getElementById('shareModal')?.classList.contains('active')) return 'share';
                if (document.getElementById('postModal')?.classList.contains('active')) return 'post';
                return null;
            },

            _saveScrollPosition() {
                const page = this._getCurrentPage();
                let positions = {};
                try { positions = JSON.parse(sessionStorage.getItem(this._scrollKey) || '{}'); } catch(e) {}
                positions[page] = window.scrollY;
                sessionStorage.setItem(this._scrollKey, JSON.stringify(positions));
            },

            _restoreScrollPosition(page) {
                try {
                    const positions = Safe.parse(sessionStorage.getItem(this._scrollKey) || '{}', {});
                    const y = positions[page] || 0;
                    window.scrollTo({ top: y, behavior: 'instant' });
                } catch(e) {}
            }
        };

        // Silent page navigation (no scroll to top)
        function _silentShowPage(page) {
            document.querySelectorAll('.page-content').forEach(p => p.classList.add('hidden'));
            const target = document.getElementById('page-' + page);
            if (target) target.classList.remove('hidden');
            if (page === 'profile' && typeof renderProfilePosts === 'function') renderProfilePosts();
            document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
            document.querySelectorAll('.sidebar-link').forEach(l => {
                if (l.textContent.includes(getPageLabel(page))) l.classList.add('active');
            });
        }

