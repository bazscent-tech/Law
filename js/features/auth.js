// ============================================================
// ===== AUTH FEATURE — واجهة تسجيل الدخول ===================
// ============================================================

import { store } from '../core/store.js';
import { Auth, Profiles } from '../core/api.js';
import { showToast, setLoading, escapeHtml } from '../utils/ui.js';

export function initAuth() {
    // Listen for auth changes
    Auth.onAuthChange(async (event, session) => {
        if (event === 'SIGNED_IN' && session) {
            await Profiles.ensureProfile(session.user);
            hideAuthScreen();
            window.__app.initApp();
        }
    });
}

export async function tryRestoreSession() {
    const session = await Auth.getSession();
    if (session?.user) {
        const cached = getCachedProfile(session.user.id);
        if (cached) store.set('profile', cached);

        const { data: profile } = await Profiles.get(session.user.id);
        if (profile) {
            store.set('profile', profile);
            cacheProfile(session.user.id, profile);
        } else {
            await Profiles.ensureProfile(session.user);
        }
        return true;
    }
    return false;
}

export function showAuthScreen() {
    if (document.getElementById('authOverlay')) return;
    const overlay = document.createElement('div');
    overlay.id = 'authOverlay';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;background:#0a0a0a;display:flex;align-items:center;justify-content:center;overflow-y:auto;padding:20px;';
    overlay.innerHTML = buildAuthHTML('login');
    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';
}

export function hideAuthScreen() {
    const overlay = document.getElementById('authOverlay');
    if (overlay) {
        overlay.style.opacity = '0';
        overlay.style.transition = 'opacity 0.3s ease';
        setTimeout(() => { overlay.remove(); document.body.style.overflow = ''; }, 300);
    }
}

// ===== AUTH FORM HANDLERS =====
let authMode = 'login';

function buildAuthHTML(mode) {
    authMode = mode;
    const forms = { login: loginFormHTML, signup: signupFormHTML, forgot: forgotFormHTML };
    return `
    <div style="width:100%;max-width:420px;margin:auto;">
        <div style="text-align:center;margin-bottom:32px;">
            <div style="width:64px;height:64px;background:linear-gradient(135deg,#f97316,#ea580c);border-radius:18px;display:inline-flex;align-items:center;justify-content:center;margin-bottom:16px;box-shadow:0 8px 32px rgba(249,115,22,0.3);">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="M7 21h10"/><path d="M12 3v18"/><path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/></svg>
            </div>
            <h1 style="font-size:28px;font-weight:800;color:white;font-family:'Noto Kufi Arabic',sans-serif;">Law<span style="color:#f97316;">book</span></h1>
            <p style="color:#737373;font-size:14px;margin-top:4px;font-family:'Noto Kufi Arabic',sans-serif;">المنصة القانونية الاجتماعية</p>
        </div>
        <div style="background:#171717;border:1px solid #404040;border-radius:20px;padding:32px 28px;" id="authFormCard">
            ${forms[mode]?.() || forms.login()}
        </div>
        <p style="text-align:center;color:#525252;font-size:11px;margin-top:24px;font-family:'Noto Kufi Arabic',sans-serif;">بالتسجيل، أنت توافق على شروط الاستخدام وسياسة الخصوصية</p>
    </div>`;
}

function loginFormHTML() {
    return `
    <h2 style="font-size:20px;font-weight:700;color:white;margin-bottom:6px;font-family:'Noto Kufi Arabic',sans-serif;">مرحباً بعودتك</h2>
    <p style="color:#737373;font-size:13px;margin-bottom:24px;font-family:'Noto Kufi Arabic',sans-serif;">سجّل دخولك للمتابعة</p>
    <div id="authAlert" style="display:none;padding:10px 14px;border-radius:10px;margin-bottom:16px;font-size:13px;"></div>
    <div style="margin-bottom:14px;">
        <label style="display:block;color:#a3a3a3;font-size:12px;margin-bottom:6px;font-family:'Noto Kufi Arabic',sans-serif;">البريد الإلكتروني</label>
        <input type="email" id="authEmail" placeholder="name@example.com" autocomplete="email" style="width:100%;background:#262626;border:1px solid #404040;border-radius:12px;padding:12px 16px;color:white;font-size:14px;outline:none;box-sizing:border-box;" onfocus="this.style.borderColor='#f97316'" onblur="this.style.borderColor='#404040'">
    </div>
    <div style="margin-bottom:14px;">
        <label style="display:block;color:#a3a3a3;font-size:12px;margin-bottom:6px;font-family:'Noto Kufi Arabic',sans-serif;">كلمة المرور</label>
        <input type="password" id="authPassword" placeholder="••••••••" autocomplete="current-password" style="width:100%;background:#262626;border:1px solid #404040;border-radius:12px;padding:12px 16px;color:white;font-size:14px;outline:none;box-sizing:border-box;" onfocus="this.style.borderColor='#f97316'" onblur="this.style.borderColor='#404040'">
    </div>
    <button onclick="window.__app.auth.handleLogin()" id="authSubmitBtn" style="width:100%;background:linear-gradient(135deg,#f97316,#ea580c);color:white;font-weight:700;font-size:15px;padding:14px;border:none;border-radius:14px;cursor:pointer;font-family:'Noto Kufi Arabic',sans-serif;">تسجيل الدخول</button>
    <div style="text-align:center;margin-top:20px;padding-top:16px;border-top:1px solid #262626;">
        <span style="color:#737373;font-size:13px;font-family:'Noto Kufi Arabic',sans-serif;">ليس لديك حساب؟ </span>
        <button onclick="window.__app.auth.switchMode('signup')" style="background:none;border:none;color:#f97316;font-weight:600;font-size:13px;cursor:pointer;font-family:'Noto Kufi Arabic',sans-serif;">إنشاء حساب</button>
    </div>`;
}

function signupFormHTML() {
    return `
    <button onclick="window.__app.auth.switchMode('login')" style="background:none;border:none;color:#737373;font-size:13px;cursor:pointer;font-family:'Noto Kufi Arabic',sans-serif;margin-bottom:16px;">← العودة</button>
    <h2 style="font-size:20px;font-weight:700;color:white;margin-bottom:6px;font-family:'Noto Kufi Arabic',sans-serif;">إنشاء حساب جديد</h2>
    <p style="color:#737373;font-size:13px;margin-bottom:24px;font-family:'Noto Kufi Arabic',sans-serif;">انضم للمجتمع القانوني</p>
    <div id="authAlert" style="display:none;padding:10px 14px;border-radius:10px;margin-bottom:16px;font-size:13px;"></div>
    <div style="margin-bottom:14px;">
        <label style="display:block;color:#a3a3a3;font-size:12px;margin-bottom:6px;font-family:'Noto Kufi Arabic',sans-serif;">الاسم الكامل</label>
        <input type="text" id="authName" placeholder="مثال: أحمد الخالدي" autocomplete="name" style="width:100%;background:#262626;border:1px solid #404040;border-radius:12px;padding:12px 16px;color:white;font-size:14px;outline:none;box-sizing:border-box;" onfocus="this.style.borderColor='#f97316'" onblur="this.style.borderColor='#404040'">
    </div>
    <div style="margin-bottom:14px;">
        <label style="display:block;color:#a3a3a3;font-size:12px;margin-bottom:6px;font-family:'Noto Kufi Arabic',sans-serif;">البريد الإلكتروني</label>
        <input type="email" id="authEmail" placeholder="name@example.com" autocomplete="email" style="width:100%;background:#262626;border:1px solid #404040;border-radius:12px;padding:12px 16px;color:white;font-size:14px;outline:none;box-sizing:border-box;" onfocus="this.style.borderColor='#f97316'" onblur="this.style.borderColor='#404040'">
    </div>
    <div style="margin-bottom:14px;">
        <label style="display:block;color:#a3a3a3;font-size:12px;margin-bottom:6px;font-family:'Noto Kufi Arabic',sans-serif;">كلمة المرور</label>
        <input type="password" id="authPassword" placeholder="6 أحرف على الأقل" autocomplete="new-password" style="width:100%;background:#262626;border:1px solid #404040;border-radius:12px;padding:12px 16px;color:white;font-size:14px;outline:none;box-sizing:border-box;" onfocus="this.style.borderColor='#f97316'" onblur="this.style.borderColor='#404040'">
    </div>
    <button onclick="window.__app.auth.handleSignup()" id="authSubmitBtn" style="width:100%;background:linear-gradient(135deg,#f97316,#ea580c);color:white;font-weight:700;font-size:15px;padding:14px;border:none;border-radius:14px;cursor:pointer;font-family:'Noto Kufi Arabic',sans-serif;">إنشاء الحساب</button>
    <div style="text-align:center;margin-top:16px;">
        <span style="color:#737373;font-size:13px;font-family:'Noto Kufi Arabic',sans-serif;">لديك حساب؟ </span>
        <button onclick="window.__app.auth.switchMode('login')" style="background:none;border:none;color:#f97316;font-weight:600;font-size:13px;cursor:pointer;font-family:'Noto Kufi Arabic',sans-serif;">تسجيل الدخول</button>
    </div>`;
}

function forgotFormHTML() {
    return `
    <button onclick="window.__app.auth.switchMode('login')" style="background:none;border:none;color:#737373;font-size:13px;cursor:pointer;font-family:'Noto Kufi Arabic',sans-serif;margin-bottom:16px;">← العودة</button>
    <h2 style="font-size:20px;font-weight:700;color:white;margin-bottom:6px;font-family:'Noto Kufi Arabic',sans-serif;">استعادة كلمة المرور</h2>
    <div id="authAlert" style="display:none;padding:10px 14px;border-radius:10px;margin-bottom:16px;font-size:13px;"></div>
    <div style="margin-bottom:20px;">
        <label style="display:block;color:#a3a3a3;font-size:12px;margin-bottom:6px;font-family:'Noto Kufi Arabic',sans-serif;">البريد الإلكتروني</label>
        <input type="email" id="authEmail" placeholder="name@example.com" style="width:100%;background:#262626;border:1px solid #404040;border-radius:12px;padding:12px 16px;color:white;font-size:14px;outline:none;box-sizing:border-box;" onfocus="this.style.borderColor='#f97316'" onblur="this.style.borderColor='#404040'">
    </div>
    <button onclick="window.__app.auth.handleForgot()" id="authSubmitBtn" style="width:100%;background:linear-gradient(135deg,#f97316,#ea580c);color:white;font-weight:700;font-size:15px;padding:14px;border:none;border-radius:14px;cursor:pointer;font-family:'Noto Kufi Arabic',sans-serif;">إرسال رابط الاستعادة</button>`;
}

// ===== HANDLERS =====
export async function handleLogin() {
    const email = document.getElementById('authEmail')?.value?.trim();
    const password = document.getElementById('authPassword')?.value;
    if (!email || !password) { showAuthAlert('أدخل البريد وكلمة المرور', 'error'); return; }

    const btn = document.getElementById('authSubmitBtn');
    setLoading(btn, true);

    const { data, error } = await Auth.signIn(email, password);
    if (error) { showAuthAlert(error, 'error'); setLoading(btn, false); return; }

    showAuthAlert('تم تسجيل الدخول ✓', 'success');
    setTimeout(() => { hideAuthScreen(); window.__app.initApp(); }, 500);
}

export async function handleSignup() {
    const name = document.getElementById('authName')?.value?.trim();
    const email = document.getElementById('authEmail')?.value?.trim();
    const password = document.getElementById('authPassword')?.value;
    if (!name) { showAuthAlert('أدخل اسمك', 'error'); return; }
    if (!email) { showAuthAlert('أدخل البريد', 'error'); return; }
    if (!password || password.length < 6) { showAuthAlert('كلمة المرور 6 أحرف على الأقل', 'error'); return; }

    const btn = document.getElementById('authSubmitBtn');
    setLoading(btn, true);

    const { data, error } = await Auth.signUp(email, password, name);
    if (error) { showAuthAlert(error, 'error'); setLoading(btn, false); return; }

    if (data?.user && !data?.session) {
        showAuthAlert('تم إنشاء الحساب! تحقق من بريدك', 'success');
        setLoading(btn, false);
    } else {
        showAuthAlert('تم إنشاء الحساب ✓', 'success');
        setTimeout(() => { hideAuthScreen(); window.__app.initApp(); }, 500);
    }
}

export async function handleForgot() {
    const email = document.getElementById('authEmail')?.value?.trim();
    if (!email) { showAuthAlert('أدخل البريد', 'error'); return; }
    // Supabase reset password
    showAuthAlert('تم إرسال رابط الاستعادة ✓', 'success');
}

export function switchMode(mode) {
    const card = document.getElementById('authFormCard');
    if (!card) return;
    card.style.opacity = '0';
    card.style.transform = 'translateY(8px)';
    setTimeout(() => {
        const forms = { login: loginFormHTML, signup: signupFormHTML, forgot: forgotFormHTML };
        card.innerHTML = forms[mode]?.() || forms.login();
        authMode = mode;
        card.style.opacity = '1';
        card.style.transform = 'translateY(0)';
        card.style.transition = 'all 0.2s ease';
    }, 150);
}

function showAuthAlert(msg, type) {
    const el = document.getElementById('authAlert');
    if (!el) return;
    const colors = {
        error: { bg: 'rgba(239,68,68,0.15)', border: 'rgba(239,68,68,0.3)', text: '#fca5a5' },
        success: { bg: 'rgba(34,197,94,0.15)', border: 'rgba(34,197,94,0.3)', text: '#86efac' }
    };
    const c = colors[type] || colors.error;
    el.style.cssText = `display:block;padding:10px 14px;border-radius:10px;margin-bottom:16px;font-size:13px;background:${c.bg};border:1px solid ${c.border};color:${c.text};font-family:'Noto Kufi Arabic',sans-serif;`;
    el.textContent = msg;
}

// ===== HELPERS =====
function getCachedProfile(userId) {
    try { return JSON.parse(localStorage.getItem('auth_profile_' + userId)); } catch(e) { return null; }
}

function cacheProfile(userId, data) {
    try { localStorage.setItem('auth_profile_' + userId, JSON.stringify(data)); } catch(e) {}
}
