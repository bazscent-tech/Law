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
        padding: '0 0 calc(56px + env(safe-area-inset-bottom, 0px) + 12px)',
    });
    prompt.onclick = e => { if (e.target === prompt) prompt.remove(); };
    const msg = action ? `لـ ${action}، يجب` : 'يجب';
    prompt.innerHTML = `
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

// ===== SWIPE GESTURE — smooth, no layout impact =====
export function initSwipeGesture(onOpen, onClose) {
    const drawer = document.getElementById('mainDrawer');
    const overlay = document.getElementById('drawerOverlay');
    if (!drawer) return;

    let startX = 0, startY = 0;
    let phase = null; // 'opening' | 'closing' | null
    let dragging = false;
    let drawerW = 0;

    const EDGE = 28;      // px from left edge to start open swipe
    const SNAP_DIST = 60; // px drag distance to commit open/close

    function getDrawerW() {
        return drawer.offsetWidth || 290;
    }

    function setProgress(ratio) {
        // ratio: 0 = fully closed, 1 = fully open
        const x = -drawerW * (1 - ratio);
        drawer.style.transition = 'none';
        drawer.style.transform = `translateX(${x}px)`;
        if (overlay) {
            overlay.style.transition = 'none';
            overlay.style.opacity = String(ratio * 0.55);
            overlay.style.visibility = 'visible';
            overlay.style.pointerEvents = ratio > 0 ? 'auto' : 'none';
        }
    }

    function resetStyles() {
        drawer.style.transition = '';
        drawer.style.transform = '';
        if (overlay) {
            overlay.style.transition = '';
            overlay.style.opacity = '';
            overlay.style.visibility = '';
            overlay.style.pointerEvents = '';
        }
    }

    document.addEventListener('touchstart', e => {
        const x = e.touches[0].clientX;
        const y = e.touches[0].clientY;
        const isOpen = drawer.classList.contains('open');
        startX = x; startY = y;
        phase = null; dragging = false;
        drawerW = getDrawerW();

        if (!isOpen && x < EDGE) {
            phase = 'opening';
        } else if (isOpen) {
            phase = 'closing';
        }
    }, { passive: true });

    document.addEventListener('touchmove', e => {
        if (!phase) return;

        const dx = e.touches[0].clientX - startX;
        const dy = Math.abs(e.touches[0].clientY - startY);

        // Cancel if vertical swipe is dominant early on
        if (!dragging && dy > Math.abs(dx) + 5) {
            phase = null; return;
        }

        dragging = true;

        if (phase === 'opening') {
            const ratio = Math.max(0, Math.min(1, dx / drawerW));
            setProgress(ratio);
        } else if (phase === 'closing') {
            const ratio = Math.max(0, Math.min(1, 1 + dx / drawerW));
            setProgress(ratio);
        }
    }, { passive: true });

    document.addEventListener('touchend', e => {
        if (!phase || !dragging) { phase = null; dragging = false; return; }

        const dx = e.changedTouches[0].clientX - startX;
        resetStyles();

        if (phase === 'opening' && dx > SNAP_DIST) {
            onOpen();
        } else if (phase === 'closing' && dx < -SNAP_DIST) {
            onClose();
        }
        // else: snap back (CSS transition handles it from current class state)

        phase = null; dragging = false;
    }, { passive: true });
}
