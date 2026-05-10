// ============================================================
// ===== UI UTILITIES — أدوات الواجهة ========================
// ============================================================

// Toast notification
let toastTimer = null;
export function showToast(msg, duration = 2500) {
    const el = document.getElementById('toast');
    if (!el) return;
    clearTimeout(toastTimer);
    el.textContent = msg;
    el.classList.add('show');
    toastTimer = setTimeout(() => el.classList.remove('show'), duration);
}

// Safe HTML escape
export function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// Time ago
export function timeAgo(dateStr) {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const m = Math.floor(diff / 60000), h = Math.floor(diff / 3600000), d = Math.floor(diff / 86400000);
    if (m < 1) return 'الآن';
    if (m < 60) return `منذ ${m} د`;
    if (h < 24) return `منذ ${h} س`;
    if (d < 30) return `منذ ${d} ي`;
    return new Date(dateStr).toLocaleDateString('ar-SA');
}

// Debounce
export function debounce(fn, ms = 300) {
    let timer;
    return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), ms); };
}

// Show/hide loading
export function setLoading(el, loading) {
    if (!el) return;
    if (loading) {
        el.disabled = true;
        el.dataset.originalText = el.textContent;
        el.textContent = 'جاري المعالجة...';
        el.style.opacity = '0.7';
        el.style.cursor = 'wait';
    } else {
        el.disabled = false;
        el.textContent = el.dataset.originalText || '';
        el.style.opacity = '';
        el.style.cursor = '';
    }
}

// Modal helper
export function openModal(id) {
    document.getElementById(id)?.classList.add('active');
    document.body.style.overflow = 'hidden';
}

export function closeModal(id) {
    document.getElementById(id)?.classList.remove('active');
    document.body.style.overflow = '';
}

// Close modal on overlay click
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-overlay') && e.target === e.currentTarget) {
        e.target.classList.remove('active');
        document.body.style.overflow = '';
    }
});

// Require auth helper
export function requireAuth() {
    const { store } = window.__app;
    if (!store.get('isLoggedIn')) {
        showToast('سجّل دخولك أولاً');
        return false;
    }
    return true;
}

// Avatar URL helper
export function getAvatarUrl(profile) {
    if (profile?.avatar_url) return profile.avatar_url;
    const name = profile?.name || 'User';
    return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}&backgroundColor=f97316&textColor=ffffff`;
}
