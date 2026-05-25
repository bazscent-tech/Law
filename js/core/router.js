// ============================================================
// ===== SPA ROUTER ==========================================
// ============================================================

import { store } from './store.js';

class Router {
    constructor() {
        this._pages = new Map();
        this._currentPage = null;
        this._onNavigate = null;
    }

    register(id, { onShow, onHide } = {}) {
        this._pages.set(id, { onShow, onHide });
    }

    navigate(pageId, data = {}) {
        if (this._currentPage === pageId) return;

        // Hide current page
        const currentDef = this._pages.get(this._currentPage);
        currentDef?.onHide?.();

        // Hide all pages
        document.querySelectorAll('.page').forEach(p => p.style.display = 'none');

        // Show target page
        const el = document.getElementById('page-' + pageId);
        if (el) el.style.display = '';

        // Update state
        this._currentPage = pageId;
        store.set('currentPage', pageId);

        // Push history
        try { history.pushState({ page: pageId }, '', '#' + pageId); } catch(e) {}

        // Call onShow
        const page = this._pages.get(pageId);
        page?.onShow?.(data);

        this._onNavigate?.(pageId, data);
    }

    init() {
        // Handle back/forward
        window.addEventListener('popstate', (e) => {
            const page = e.state?.page || this._getHash() || 'feed';
            this.navigate(page);
        });

        if (!window.location.hash) {
            try { history.replaceState({ page: 'feed' }, '', '#feed'); } catch(e) {}
        }

        // DO NOT add click delegation here — handled in app.js
    }

    _getHash() {
        return window.location.hash.replace('#', '') || null;
    }

    onNavigate(callback) {
        this._onNavigate = callback;
    }

    get currentPage() { return this._currentPage; }
}

export const router = new Router();
