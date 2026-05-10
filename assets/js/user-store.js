// ============================================================
// ===== USER-SCOPED STORAGE — تخزين معزول لكل مستخدم =======
// ============================================================
// كل حساب يحصل على مساحة تخزين مستقلة تماماً
// المفتاح: user_{userId}_{key}
// ============================================================

const UserStore = {
    // Get current user's storage prefix
    _prefix() {
        const uid = Auth.getCurrentUserId();
        return uid ? 'user_' + uid + '_' : 'anon_';
    },

    // ===== JSON =====
    getJSON(key, fallback = null) {
        return Safe.getJSON(this._prefix() + key, fallback);
    },

    setJSON(key, value) {
        return Safe.setJSON(this._prefix() + key, value);
    },

    // ===== STRING =====
    getString(key, fallback = '') {
        return Safe.getString(this._prefix() + key, fallback);
    },

    setString(key, value) {
        return Safe.setString(this._prefix() + key, value);
    },

    // ===== REMOVE =====
    remove(key) {
        try {
            localStorage.removeItem(this._prefix() + key);
        } catch (e) {
            console.warn('[UserStore] Failed to remove:', key, e.message);
        }
    },

    // ===== CLEAR ALL FOR CURRENT USER =====
    clearAll() {
        const prefix = this._prefix();
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(prefix)) {
                keysToRemove.push(key);
            }
        }
        keysToRemove.forEach(k => localStorage.removeItem(k));
    }
};
