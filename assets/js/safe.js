// ============================================================
// ===== SAFE UTILITIES — خط الحماية الأول ===================
// ============================================================

const Safe = {
    // localStorage مع معالجة أخطاء
    getJSON(key, fallback = null) {
        try {
            const raw = localStorage.getItem(key);
            if (!raw) return fallback;
            return JSON.parse(raw);
        } catch (e) {
            console.warn(`[Safe] Failed to read "${key}":`, e.message);
            return fallback;
        }
    },

    setJSON(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (e) {
            console.warn(`[Safe] Failed to write "${key}":`, e.message);
            if (e.name === 'QuotaExceededError') {
                if (typeof showToast === 'function') showToast('مساحة التخزين ممتلئة');
            }
            return false;
        }
    },

    getString(key, fallback = '') {
        try {
            return localStorage.getItem(key) || fallback;
        } catch (e) {
            return fallback;
        }
    },

    setString(key, value) {
        try {
            localStorage.setItem(key, value);
            return true;
        } catch (e) {
            console.warn(`[Safe] Failed to write "${key}":`, e.message);
            return false;
        }
    },

    // JSON.parse آمن
    parse(json, fallback = null) {
        try {
            return JSON.parse(json);
        } catch (e) {
            console.warn('[Safe] JSON parse failed:', e.message);
            return fallback;
        }
    },

    // getElementById آمن مع null check
    el(id) {
        return document.getElementById(id) || null;
    },

    // تنفيذ دالة بأمان — لو فشلت ترجع fallback
    run(fn, fallback = undefined) {
        try {
            return fn();
        } catch (e) {
            console.warn('[Safe] Function error:', e.message);
            return fallback;
        }
    },

    // async بأمان
    async runAsync(fn, fallback = undefined) {
        try {
            return await fn();
        } catch (e) {
            console.warn('[Safe] Async error:', e.message);
            return fallback;
        }
    },

    // XSS protection — تنظيف النصوص
    escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
};

// ===== Global Error Handler =====
window.onerror = function(msg, src, line, col, err) {
    console.error(`[Global] ${msg} at ${src}:${line}:${col}`);
    // لا نعرض toast لكل خطأ — فقط نسجله
    return false;
};

window.addEventListener('unhandledrejection', function(e) {
    console.error('[Global] Unhandled promise rejection:', e.reason?.message || e.reason);
});
