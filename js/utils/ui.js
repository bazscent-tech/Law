// ============================================================
// ===== UI UTILITIES =====
// ============================================================

let toastTimer = null;
export function showToast(msg, duration = 2500) {
    const el = document.getElementById('toast');
    if (!el) return;
    clearTimeout(toastTimer);
    el.textContent = msg;
    el.classList.add('show');
    toastTimer = setTimeout(() => el.classList.remove('show'), duration);
}

export function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

export function timeAgo(dateStr) {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const m = Math.floor(diff / 60000), h = Math.floor(diff / 3600000), d = Math.floor(diff / 86400000);
    if (m < 1) return 'الآن';
    if (m < 60) return `${m} د`;
    if (h < 24) return `${h} س`;
    if (d < 30) return `${d} ي`;
    return new Date(dateStr).toLocaleDateString('ar-SA');
}

export function debounce(fn, ms = 300) {
    let timer;
    return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), ms); };
}

export function setLoading(el, loading, text = 'جاري المعالجة...') {
    if (!el) return;
    if (loading) {
        el.disabled = true;
        el.dataset.originalText = el.textContent;
        el.textContent = text;
        el.style.opacity = '0.7';
        el.style.cursor = 'wait';
    } else {
        el.disabled = false;
        el.textContent = el.dataset.originalText || '';
        el.style.opacity = '';
        el.style.cursor = '';
    }
}

export function openModal(id) {
    document.getElementById(id)?.classList.add('active');
    document.body.style.overflow = 'hidden';
}

export function closeModal(id) {
    document.getElementById(id)?.classList.remove('active');
    document.body.style.overflow = '';
}

document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-overlay') && e.target === e.currentTarget) {
        e.target.classList.remove('active');
        document.body.style.overflow = '';
    }
});

// Show auth prompt instead of simple toast
export function requireAuth(action = '') {
    const { store } = window.__app;
    if (!store.get('isLoggedIn')) {
        showAuthPrompt(action);
        return false;
    }
    return true;
}

export function showAuthPrompt(action = '') {
    // Remove old prompt if exists
    document.getElementById('authPrompt')?.remove();
    
    const prompt = document.createElement('div');
    prompt.id = 'authPrompt';
    prompt.style.cssText = `
        position:fixed;inset:0;z-index:99998;
        background:rgba(0,0,0,0.7);backdrop-filter:blur(8px);
        display:flex;align-items:flex-end;justify-content:center;
        padding:0 0 20px;
    `;
    prompt.onclick = (e) => { if (e.target === prompt) prompt.remove(); };
    
    const msg = action ? `لـ ${action}، يجب` : 'يجب';
    
    prompt.innerHTML = `
        <div style="background:#111;border:1px solid #2a2a2a;border-radius:22px 22px 16px 16px;padding:28px 24px;width:100%;max-width:440px;margin:0 16px;text-align:center;animation:slideUp 0.25s ease;">
            <div style="width:52px;height:52px;background:rgba(249,115,22,0.15);border-radius:16px;display:inline-flex;align-items:center;justify-content:center;margin-bottom:14px;">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#f97316" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            </div>
            <h3 style="font-size:17px;font-weight:700;color:white;margin-bottom:6px;font-family:'Noto Kufi Arabic',sans-serif;">انضم إلى Lawbook</h3>
            <p style="color:#737373;font-size:13px;margin-bottom:22px;font-family:'Noto Kufi Arabic',sans-serif;">${msg} تسجيل الدخول أو إنشاء حساب مجاني</p>
            <div style="display:flex;gap:10px;">
                <button onclick="document.getElementById('authPrompt').remove();window.__app.auth.showAuthScreen('signup')" 
                    style="flex:1;background:linear-gradient(135deg,#f97316,#ea580c);color:white;font-weight:700;font-size:14px;padding:13px;border:none;border-radius:12px;cursor:pointer;font-family:'Noto Kufi Arabic',sans-serif;">
                    إنشاء حساب
                </button>
                <button onclick="document.getElementById('authPrompt').remove();window.__app.auth.showAuthScreen('login')"
                    style="flex:1;background:#1a1a1a;color:white;font-weight:600;font-size:14px;padding:13px;border:1.5px solid #2a2a2a;border-radius:12px;cursor:pointer;font-family:'Noto Kufi Arabic',sans-serif;">
                    تسجيل الدخول
                </button>
            </div>
        </div>`;
    
    document.body.appendChild(prompt);
    
    const style = document.createElement('style');
    style.textContent = '@keyframes slideUp{from{transform:translateY(40px);opacity:0}to{transform:translateY(0);opacity:1}}';
    prompt.appendChild(style);
}

export function getAvatarUrl(profile) {
    if (profile?.avatar_url) return profile.avatar_url;
    const name = profile?.name || 'User';
    return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}&backgroundColor=f97316&textColor=ffffff`;
}
