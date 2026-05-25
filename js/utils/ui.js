// ============================================================
// UI UTILITIES — Toast, Swipe, Helpers
// ============================================================

let toastTimer = null;
export function showToast(msg, duration = 2800) {
    let el = document.getElementById('toast');
    if (!el) return;
    clearTimeout(toastTimer);
    el.textContent = msg;
    el.classList.add('show');
    toastTimer = setTimeout(() => el.classList.remove('show'), duration);
}

export function escapeHtml(str) {
    if (!str) return '';
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
}

export function timeAgo(dateStr) {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const m = Math.floor(diff / 60000);
    const h = Math.floor(diff / 3600000);
    const d = Math.floor(diff / 86400000);
    if (m < 1) return 'الآن';
    if (m < 60) return `${m} د`;
    if (h < 24) return `${h} س`;
    if (d < 30) return `${d} ي`;
    return new Date(dateStr).toLocaleDateString('ar-SA');
}

export function debounce(fn, ms = 300) {
    let t;
    return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}

export function setLoading(el, loading, text = 'جاري...') {
    if (!el) return;
    if (loading) {
        el.disabled = true;
        el.dataset.orig = el.textContent;
        el.textContent = text;
        el.style.opacity = '0.7';
    } else {
        el.disabled = false;
        el.textContent = el.dataset.orig || '';
        el.style.opacity = '';
    }
}

export function getAvatarUrl(profile) {
    if (profile?.avatar_url && !profile.avatar_url.includes('dicebear')) return profile.avatar_url;
    const name = profile?.name || profile?.username || 'U';
    return `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(name)}&backgroundColor=f97316&textColor=ffffff&fontSize=38`;
}

export function requireAuth(action = '') {
    if (!window.__app?.store?.get('isLoggedIn')) {
        showAuthPrompt(action);
        return false;
    }
    return true;
}

export function showAuthPrompt(action = '') {
    document.getElementById('authPrompt')?.remove();
    const prompt = document.createElement('div');
    prompt.id = 'authPrompt';
    Object.assign(prompt.style, {
        position: 'fixed', inset: '0', zIndex: '99998',
        background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        padding: '0 0 24px',
    });
    prompt.onclick = e => { if (e.target === prompt) prompt.remove(); };

    const msg = action ? `لـ ${action}، يجب` : 'يجب';
    prompt.innerHTML = `
    <style>@keyframes slideUp{from{transform:translateY(40px);opacity:0}to{transform:translateY(0);opacity:1}}</style>
    <div style="background:#111;border:1px solid #2a2a2a;border-radius:20px;padding:28px 24px;width:100%;max-width:440px;margin:0 16px;text-align:center;animation:slideUp .25s ease;">
        <div style="width:52px;height:52px;background:rgba(249,115,22,0.15);border-radius:50%;display:inline-flex;align-items:center;justify-content:center;margin-bottom:14px;">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#f97316" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        </div>
        <h3 style="font-size:18px;font-weight:800;color:white;margin-bottom:6px;font-family:'IBM Plex Sans Arabic',sans-serif;">انضم إلى Lawbook</h3>
        <p style="color:#71767b;font-size:14px;margin-bottom:22px;font-family:'IBM Plex Sans Arabic',sans-serif;">${msg} تسجيل الدخول أو إنشاء حساب</p>
        <div style="display:flex;gap:10px;">
            <button onclick="document.getElementById('authPrompt').remove();window.__app.auth.showAuthScreen('signup')"
                style="flex:1;background:#f97316;color:white;font-weight:700;font-size:15px;padding:13px;border:none;border-radius:100px;cursor:pointer;font-family:'IBM Plex Sans Arabic',sans-serif;">
                إنشاء حساب
            </button>
            <button onclick="document.getElementById('authPrompt').remove();window.__app.auth.showAuthScreen('login')"
                style="flex:1;background:transparent;color:white;font-weight:600;font-size:15px;padding:13px;border:1.5px solid #2a2a2a;border-radius:100px;cursor:pointer;font-family:'IBM Plex Sans Arabic',sans-serif;">
                تسجيل الدخول
            </button>
        </div>
    </div>`;
    document.body.appendChild(prompt);
}

// ===== SWIPE GESTURE for Drawer =====
export function initSwipeGesture(onOpen, onClose) {
    let startX = 0, startY = 0, isDragging = false, drawerEl = null;
    const EDGE_THRESHOLD = 30; // px from left edge to trigger open
    const OPEN_THRESHOLD = 0.35; // 35% of drawer width
    
    drawerEl = document.getElementById('mainDrawer');
    if (!drawerEl) return;

    const drawerW = drawerEl.offsetWidth || 280;

    document.addEventListener('touchstart', (e) => {
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        isDragging = false;

        // Open: swipe from left edge (first 30px)
        if (startX < EDGE_THRESHOLD && !drawerEl.classList.contains('open')) {
            isDragging = 'opening';
        }
        // Close: drawer is open, swipe starts anywhere
        if (drawerEl.classList.contains('open')) {
            isDragging = 'closing';
        }
    }, { passive: true });

    document.addEventListener('touchmove', (e) => {
        if (!isDragging) return;
        const dx = e.touches[0].clientX - startX;
        const dy = e.touches[0].clientY - startY;
        
        // If more vertical than horizontal, cancel
        if (Math.abs(dy) > Math.abs(dx) && Math.abs(dx) < 10) {
            isDragging = false;
            return;
        }

        if (isDragging === 'opening') {
            const progress = Math.min(dx / drawerEl.offsetWidth, 1);
            if (progress >= 0) {
                drawerEl.style.transition = 'none';
                drawerEl.style.transform = `translateX(${-100 + progress * 100}%)`;
                const overlay = document.getElementById('drawerOverlay');
                if (overlay) {
                    overlay.style.transition = 'none';
                    overlay.style.opacity = progress * 0.6;
                    overlay.style.visibility = 'visible';
                }
            }
        } else if (isDragging === 'closing') {
            const progress = Math.max(0, -dx / drawerEl.offsetWidth);
            if (dx <= 0) {
                drawerEl.style.transition = 'none';
                drawerEl.style.transform = `translateX(${-progress * 100}%)`;
                const overlay = document.getElementById('drawerOverlay');
                if (overlay) {
                    overlay.style.transition = 'none';
                    overlay.style.opacity = (1 - progress) * 0.6;
                }
            }
        }
    }, { passive: true });

    document.addEventListener('touchend', (e) => {
        if (!isDragging) return;
        const dx = e.changedTouches[0].clientX - startX;
        
        // Reset styles
        drawerEl.style.transition = '';
        drawerEl.style.transform = '';
        const overlay = document.getElementById('drawerOverlay');
        if (overlay) { overlay.style.transition = ''; overlay.style.opacity = ''; }

        if (isDragging === 'opening' && dx > 60) {
            onOpen();
        } else if (isDragging === 'closing' && dx < -60) {
            onClose();
        }
        isDragging = false;
    }, { passive: true });
}
