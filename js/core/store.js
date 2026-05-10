// ============================================================
// ===== STATE STORE — مصدر الحقيقة الواحد ==================
// ============================================================
// كل البيانات في مكان واحد. أي تحديث يُnotify كل المراقبين.

export class Store {
    constructor(initialState = {}) {
        this._state = { ...initialState };
        this._listeners = new Map(); // key -> Set<callback>
        this._globalListeners = new Set();
    }

    // قراءة حالة واحدة
    get(key) {
        return this._state[key];
    }

    // قراءة كل الحالة
    getAll() {
        return { ...this._state };
    }

    // تحديث حالة واحدة
    set(key, value) {
        const old = this._state[key];
        if (old === value) return; // لا تغيير
        this._state[key] = value;
        this._notify(key, value, old);
    }

    // تحديث جزئي لم object
    merge(key, partial) {
        const current = this._state[key] || {};
        this.set(key, { ...current, ...partial });
    }

    // استمع لتغييرات مفتاح معين
    on(key, callback) {
        if (!this._listeners.has(key)) this._listeners.set(key, new Set());
        this._listeners.get(key).add(callback);
        return () => this._listeners.get(key)?.delete(callback); // unsubscribe
    }

    // استمع لكل التغييرات
    onAny(callback) {
        this._globalListeners.add(callback);
        return () => this._globalListeners.delete(callback);
    }

    // إشعار المراقبين
    _notify(key, value, old) {
        this._listeners.get(key)?.forEach(cb => {
            try { cb(value, old); } catch (e) { console.error(`[Store] Listener error for "${key}":`, e); }
        });
        this._globalListeners.forEach(cb => {
            try { cb(key, value, old); } catch (e) { console.error('[Store] Global listener error:', e); }
        });
    }

    // حفظ في localStorage
    persist(key, storageKey) {
        try {
            const raw = localStorage.getItem(storageKey);
            if (raw) this._state[key] = JSON.parse(raw);
        } catch (e) { /* ignore */ }

        this.on(key, (value) => {
            try { localStorage.setItem(storageKey, JSON.stringify(value)); } catch (e) { /* ignore */ }
        });
    }

    // استعادة من localStorage
    restore(key, storageKey) {
        try {
            const raw = localStorage.getItem(storageKey);
            if (raw) this.set(key, JSON.parse(raw));
        } catch (e) { /* ignore */ }
    }
}

// المتجر العام للتطبيق
export const store = new Store({
    // Auth
    user: null,           // Supabase auth user
    profile: null,        // User profile from DB
    isLoggedIn: false,
    isOnline: false,      // Supabase reachable

    // UI
    currentPage: 'feed',
    isLoading: false,
    toasts: [],

    // Data
    posts: [],            // All posts (local + Supabase)
    userPosts: [],        // Current user's posts
    libraries: [],        // Current user's libraries
    notifications: [],

    // Session
    supabaseClient: null,
});
