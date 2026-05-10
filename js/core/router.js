// ============================================================
// ===== SPA ROUTER — تنقل نظيف بين الصفحات ================
// ============================================================

import { store } from './store.js';

class Router {
    constructor() {
        this._pages = new Map();
        this._currentPage = null;
        this._onNavigate = null;
    }

    // سجّل صفحة
    register(id, { onShow, onHide } = {}) {
        this._pages.set(id, { onShow, onHide });
    }

    // انتقل لصفحة
    navigate(pageId, data = {}) {
        if (this._currentPage === pageId) return;

        // Hide current
        const current = this._pages.get(this._currentPage);
        current?.onHide?.();

        // Hide all page elements
        document.querySelectorAll('.page-content').forEach(p => p.classList.add('hidden'));

        // Show target
        const el = document.getElementById('page-' + pageId);
        if (el) el.classList.remove('hidden');

        // Update sidebar
        document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
        document.querySelectorAll('.sidebar-link').forEach(l => {
            if (l.dataset.page === pageId) l.classList.add('active');
        });

        // Update bottom nav
        document.querySelectorAll('.bottom-nav-item').forEach(b => {
            b.classList.remove('active');
            b.classList.add('text-dark-400');
        });

        // Scroll to top
        window.scrollTo(0, 0);

        // Update state
        this._currentPage = pageId;
        store.set('currentPage', pageId);

        // Push history
        history.pushState({ page: pageId }, '', '#' + pageId);

        // Call onShow
        const page = this._pages.get(pageId);
        page?.onShow?.(data);

        // Notify
        this._onNavigate?.(pageId, data);
    }

    // تهيئة
    init() {
        // Handle back/forward
        window.addEventListener('popstate', (e) => {
            const page = e.state?.page || this._getHash() || 'feed';
            this.navigate(page);
        });

        // Set initial hash
        if (!window.location.hash) {
            history.replaceState({ page: 'feed' }, '', '#feed');
        }

        // Event delegation for navigation
        document.addEventListener('click', (e) => {
            const nav = e.target.closest('[data-navigate]');
            if (nav) {
                e.preventDefault();
                this.navigate(nav.dataset.navigate);
            }
        });
    }

    _getHash() {
        return window.location.hash.replace('#', '') || null;
    }

    onNavigate(callback) {
        this._onNavigate = callback;
    }
}

export const router = new Router();
