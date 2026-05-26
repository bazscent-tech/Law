// ============================================================
// ===== AUTH FEATURE — نظام تسجيل احترافي كامل =============
// ============================================================

import { store } from '../core/store.js';
import { Auth, Profiles } from '../core/api.js';
import { showToast, setLoading, escapeHtml } from '../utils/ui.js';

let _checkTimer = null;

export function initAuth() {
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

export function showAuthScreen(defaultMode = 'login') {
    if (document.getElementById('authOverlay')) return;
    const overlay = document.createElement('div');
    overlay.id = 'authOverlay';
    overlay.style.cssText = `
        position:fixed;inset:0;z-index:99999;
        background:rgba(10,10,10,0.97);backdrop-filter:blur(12px);
        display:flex;align-items:flex-start;justify-content:center;
        overflow-y:auto;padding:20px 16px 40px;
    `;
    overlay.innerHTML = buildAuthHTML(defaultMode);
    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';

    // Animate in
    overlay.style.opacity = '0';
    requestAnimationFrame(() => {
        overlay.style.transition = 'opacity 0.25s ease';
        overlay.style.opacity = '1';
    });
}

export function hideAuthScreen() {
    const overlay = document.getElementById('authOverlay');
    if (overlay) {
        overlay.style.opacity = '0';
        overlay.style.transition = 'opacity 0.25s ease';
        setTimeout(() => { overlay.remove(); document.body.style.overflow = ''; }, 250);
    }
}

let authMode = 'login';

function buildAuthHTML(mode) {
    authMode = mode;
    const forms = { login: loginFormHTML, signup: signupFormHTML };
    return `
    <div style="width:100%;max-width:440px;margin:auto;padding-top:16px;">
        <div style="text-align:center;margin-bottom:28px;">
            <div style="width:64px;height:64px;background:linear-gradient(135deg,#f97316,#ea580c);border-radius:18px;display:inline-flex;align-items:center;justify-content:center;margin-bottom:14px;box-shadow:0 8px 32px rgba(249,115,22,0.3);">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="M7 21h10"/><path d="M12 3v18"/><path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/></svg>
            </div>
            <h1 style="font-size:26px;font-weight:800;color:white;font-family:'Noto Kufi Arabic',sans-serif;letter-spacing:-0.5px;">Law<span style="color:#f97316;">book</span></h1>
            <p style="color:#737373;font-size:13px;margin-top:4px;font-family:'Noto Kufi Arabic',sans-serif;">المنصة القانونية الاجتماعية</p>
        </div>
        <div style="background:#111111;border:1px solid #2a2a2a;border-radius:22px;padding:28px 24px;box-shadow:0 24px 80px rgba(0,0,0,0.5);" id="authFormCard">
            ${forms[mode]?.() || loginFormHTML()}
        </div>
        <p style="text-align:center;color:#404040;font-size:11px;margin-top:20px;font-family:'Noto Kufi Arabic',sans-serif;line-height:1.6;">
            بالتسجيل أنت توافق على <span style="color:#737373;cursor:pointer">شروط الاستخدام</span> وسياسة الخصوصية
        </p>
    </div>`;
}

function inputStyle(extra = '') {
    return `width:100%;background:#1a1a1a;border:1.5px solid #2a2a2a;border-radius:12px;padding:13px 16px;color:white;font-size:14px;outline:none;box-sizing:border-box;font-family:'Noto Kufi Arabic',sans-serif;transition:border-color 0.2s,background 0.2s;${extra}`;
}

function loginFormHTML() {
    return `
    <h2 style="font-size:19px;font-weight:700;color:white;margin-bottom:4px;font-family:'Noto Kufi Arabic',sans-serif;">مرحباً بعودتك 👋</h2>
    <p style="color:#737373;font-size:13px;margin-bottom:22px;font-family:'Noto Kufi Arabic',sans-serif;">سجّل دخولك للمتابعة</p>
    <div id="authAlert" style="display:none;padding:11px 14px;border-radius:10px;margin-bottom:16px;font-size:13px;"></div>
    <div style="margin-bottom:14px;">
        <label style="display:block;color:#a3a3a3;font-size:12px;font-weight:600;margin-bottom:6px;font-family:'Noto Kufi Arabic',sans-serif;">البريد الإلكتروني</label>
        <input type="email" id="authEmail" placeholder="name@example.com" autocomplete="email" dir="ltr"
            style="${inputStyle()}"
            onfocus="this.style.borderColor='#f97316';this.style.background='#1f1f1f'"
            onblur="this.style.borderColor='#2a2a2a';this.style.background='#1a1a1a'"
            onkeydown="if(event.key==='Enter')document.getElementById('authPassword')?.focus()">
    </div>
    <div style="margin-bottom:6px;">
        <label style="display:block;color:#a3a3a3;font-size:12px;font-weight:600;margin-bottom:6px;font-family:'Noto Kufi Arabic',sans-serif;">كلمة المرور</label>
        <input type="password" id="authPassword" placeholder="••••••••" autocomplete="current-password" dir="ltr"
            style="${inputStyle()}"
            onfocus="this.style.borderColor='#f97316';this.style.background='#1f1f1f'"
            onblur="this.style.borderColor='#2a2a2a';this.style.background='#1a1a1a'"
            onkeydown="if(event.key==='Enter')window.__app.auth.handleLogin()">
    </div>
    <div style="text-align:left;margin-bottom:20px;">
        <button onclick="window.__app.auth.switchMode('forgot')" style="background:none;border:none;color:#737373;font-size:12px;cursor:pointer;font-family:'Noto Kufi Arabic',sans-serif;">نسيت كلمة المرور؟</button>
    </div>
    <button onclick="window.__app.auth.handleLogin()" id="authSubmitBtn"
        style="width:100%;background:linear-gradient(135deg,#f97316,#ea580c);color:white;font-weight:700;font-size:15px;padding:14px;border:none;border-radius:14px;cursor:pointer;font-family:'Noto Kufi Arabic',sans-serif;transition:opacity 0.15s,transform 0.1s;letter-spacing:0.3px;"
        onmousedown="this.style.transform='scale(0.98)'" onmouseup="this.style.transform='scale(1)'">
        تسجيل الدخول
    </button>
    <div style="text-align:center;margin-top:20px;padding-top:18px;border-top:1px solid #1f1f1f;">
        <span style="color:#737373;font-size:13px;font-family:'Noto Kufi Arabic',sans-serif;">ليس لديك حساب؟ </span>
        <button onclick="window.__app.auth.switchMode('signup')" style="background:none;border:none;color:#f97316;font-weight:700;font-size:13px;cursor:pointer;font-family:'Noto Kufi Arabic',sans-serif;">إنشاء حساب مجاني</button>
    </div>`;
}

function signupFormHTML() {
    return `
    <button onclick="window.__app.auth.switchMode('login')" style="background:none;border:none;color:#737373;font-size:13px;cursor:pointer;font-family:'Noto Kufi Arabic',sans-serif;margin-bottom:14px;display:flex;align-items:center;gap:6px;">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9,18 15,12 9,6"/></svg>
        العودة
    </button>
    <h2 style="font-size:19px;font-weight:700;color:white;margin-bottom:4px;font-family:'Noto Kufi Arabic',sans-serif;">إنشاء حساب جديد</h2>
    <p style="color:#737373;font-size:13px;margin-bottom:22px;font-family:'Noto Kufi Arabic',sans-serif;">انضم للمجتمع القانوني اليمني</p>
    <div id="authAlert" style="display:none;padding:11px 14px;border-radius:10px;margin-bottom:16px;font-size:13px;"></div>
    
    <div style="margin-bottom:14px;">
        <label style="display:block;color:#a3a3a3;font-size:12px;font-weight:600;margin-bottom:6px;font-family:'Noto Kufi Arabic',sans-serif;">الاسم الكامل</label>
        <input type="text" id="authName" placeholder="مثال: أحمد محمد الخالدي" autocomplete="name"
            style="${inputStyle()}"
            onfocus="this.style.borderColor='#f97316';this.style.background='#1f1f1f'"
            onblur="this.style.borderColor='#2a2a2a';this.style.background='#1a1a1a'"
            oninput="window.__app.auth.autoFillUsername(this.value)"
            onkeydown="if(event.key==='Enter')document.getElementById('authUsername')?.focus()">
    </div>
    
    <div style="margin-bottom:14px;">
        <label style="display:block;color:#a3a3a3;font-size:12px;font-weight:600;margin-bottom:6px;font-family:'Noto Kufi Arabic',sans-serif;">المعرّف الفريد</label>
        <div style="position:relative;">
            <span style="position:absolute;right:14px;top:50%;transform:translateY(-50%);color:#f97316;font-weight:700;font-size:15px;pointer-events:none;font-family:monospace;">@</span>
            <input type="text" id="authUsername" placeholder="ahmed_law" autocomplete="off" dir="ltr"
                style="${inputStyle('padding-right:32px;font-family:monospace;letter-spacing:0.5px;')}"
                onfocus="this.style.borderColor='#f97316';this.style.background='#1f1f1f'"
                onblur="this.style.borderColor='#2a2a2a';this.style.background='#1a1a1a'"
                oninput="window.__app.auth.checkUsernameRealtime(this.value)"
                onkeydown="if(event.key==='Enter')document.getElementById('authEmail')?.focus()">
            <span id="usernameStatus" style="position:absolute;left:12px;top:50%;transform:translateY(-50%);font-size:18px;"></span>
        </div>
        <p id="usernameMsg" style="font-size:11px;margin-top:5px;font-family:'Noto Kufi Arabic',sans-serif;color:#737373;"></p>
    </div>
    
    <div style="margin-bottom:14px;">
        <label style="display:block;color:#a3a3a3;font-size:12px;font-weight:600;margin-bottom:6px;font-family:'Noto Kufi Arabic',sans-serif;">البريد الإلكتروني</label>
        <input type="email" id="authEmail" placeholder="name@example.com" autocomplete="email" dir="ltr"
            style="${inputStyle()}"
            onfocus="this.style.borderColor='#f97316';this.style.background='#1f1f1f'"
            onblur="this.style.borderColor='#2a2a2a';this.style.background='#1a1a1a'"
            onkeydown="if(event.key==='Enter')document.getElementById('authPassword')?.focus()">
    </div>
    
    <div style="margin-bottom:14px;">
        <label style="display:block;color:#a3a3a3;font-size:12px;font-weight:600;margin-bottom:6px;font-family:'Noto Kufi Arabic',sans-serif;">كلمة المرور</label>
        <input type="password" id="authPassword" placeholder="6 أحرف على الأقل" autocomplete="new-password" dir="ltr"
            style="${inputStyle()}"
            onfocus="this.style.borderColor='#f97316';this.style.background='#1f1f1f'"
            onblur="this.style.borderColor='#2a2a2a';this.style.background='#1a1a1a'"
            onkeydown="if(event.key==='Enter')document.getElementById('authPhone')?.focus()">
    </div>
    
    <div style="margin-bottom:22px;">
        <label style="display:block;color:#a3a3a3;font-size:12px;font-weight:600;margin-bottom:6px;font-family:'Noto Kufi Arabic',sans-serif;">رقم الهاتف اليمني</label>
        <div style="position:relative;display:flex;align-items:center;background:#1a1a1a;border:1.5px solid #2a2a2a;border-radius:12px;overflow:hidden;transition:border-color 0.2s;" id="phoneWrapper">
            <span style="padding:13px 12px;color:#a3a3a3;font-size:13px;font-family:monospace;border-left:1px solid #2a2a2a;white-space:nowrap;background:#141414;">🇾🇪 +967</span>
            <input type="tel" id="authPhone" placeholder="777123456" dir="ltr" maxlength="9" pattern="[0-9]{9}"
                style="flex:1;background:transparent;border:none;padding:13px 12px;color:white;font-size:14px;outline:none;font-family:monospace;letter-spacing:0.5px;"
                onfocus="document.getElementById('phoneWrapper').style.borderColor='#f97316'"
                onblur="document.getElementById('phoneWrapper').style.borderColor='#2a2a2a'"
                oninput="this.value=this.value.replace(/[^0-9]/g,'')"
                onkeydown="if(event.key==='Enter')window.__app.auth.handleSignup()">
        </div>
    </div>
    
    <button onclick="window.__app.auth.handleSignup()" id="authSubmitBtn"
        style="width:100%;background:linear-gradient(135deg,#f97316,#ea580c);color:white;font-weight:700;font-size:15px;padding:14px;border:none;border-radius:14px;cursor:pointer;font-family:'Noto Kufi Arabic',sans-serif;transition:opacity 0.15s,transform 0.1s;letter-spacing:0.3px;"
        onmousedown="this.style.transform='scale(0.98)'" onmouseup="this.style.transform='scale(1)'">
        إنشاء الحساب مجاناً
    </button>
    <div style="text-align:center;margin-top:18px;">
        <span style="color:#737373;font-size:13px;font-family:'Noto Kufi Arabic',sans-serif;">لديك حساب؟ </span>
        <button onclick="window.__app.auth.switchMode('login')" style="background:none;border:none;color:#f97316;font-weight:700;font-size:13px;cursor:pointer;font-family:'Noto Kufi Arabic',sans-serif;">تسجيل الدخول</button>
    </div>`;
}

function forgotFormHTML() {
    return `
    <button onclick="window.__app.auth.switchMode('login')" style="background:none;border:none;color:#737373;font-size:13px;cursor:pointer;font-family:'Noto Kufi Arabic',sans-serif;margin-bottom:14px;display:flex;align-items:center;gap:6px;">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9,18 15,12 9,6"/></svg>
        العودة
    </button>
    <h2 style="font-size:19px;font-weight:700;color:white;margin-bottom:4px;font-family:'Noto Kufi Arabic',sans-serif;">استعادة كلمة المرور</h2>
    <p style="color:#737373;font-size:13px;margin-bottom:22px;font-family:'Noto Kufi Arabic',sans-serif;">سنرسل لك رابط استعادة على البريد</p>
    <div id="authAlert" style="display:none;padding:11px 14px;border-radius:10px;margin-bottom:16px;font-size:13px;"></div>
    <div style="margin-bottom:20px;">
        <label style="display:block;color:#a3a3a3;font-size:12px;font-weight:600;margin-bottom:6px;font-family:'Noto Kufi Arabic',sans-serif;">البريد الإلكتروني</label>
        <input type="email" id="authEmail" placeholder="name@example.com" dir="ltr"
            style="${inputStyle()}"
            onfocus="this.style.borderColor='#f97316';this.style.background='#1f1f1f'"
            onblur="this.style.borderColor='#2a2a2a';this.style.background='#1a1a1a'">
    </div>
    <button onclick="window.__app.auth.handleForgot()" id="authSubmitBtn"
        style="width:100%;background:linear-gradient(135deg,#f97316,#ea580c);color:white;font-weight:700;font-size:15px;padding:14px;border:none;border-radius:14px;cursor:pointer;font-family:'Noto Kufi Arabic',sans-serif;">
        إرسال رابط الاستعادة
    </button>`;
}

// ===== USERNAME REAL-TIME CHECK =====
export function checkUsernameRealtime(value) {
    const cleaned = value.replace(/[^a-z0-9_]/gi, '').toLowerCase();
    const input = document.getElementById('authUsername');
    const status = document.getElementById('usernameStatus');
    const msg = document.getElementById('usernameMsg');
    if (input && cleaned !== value) input.value = cleaned;
    if (!status || !msg) return;

    if (!cleaned || cleaned.length < 3) {
        status.textContent = '';
        msg.textContent = cleaned.length > 0 ? 'المعرف يجب أن يكون 3 أحرف على الأقل' : '';
        msg.style.color = '#f87171';
        return;
    }

    if (cleaned.length > 20) {
        status.textContent = '✗';
        status.style.color = '#ef4444';
        msg.textContent = 'المعرف طويل جداً (20 حرف كحد أقصى)';
        msg.style.color = '#f87171';
        return;
    }

    status.textContent = '...';
    status.style.color = '#737373';
    msg.textContent = 'جاري التحقق...';
    msg.style.color = '#737373';

    clearTimeout(_checkTimer);
    _checkTimer = setTimeout(async () => {
        const available = await Auth.checkUsernameAvailable(cleaned);
        const s = document.getElementById('usernameStatus');
        const m = document.getElementById('usernameMsg');
        if (!s || !m) return;
        if (available) {
            s.textContent = '✓';
            s.style.color = '#22c55e';
            m.textContent = '@' + cleaned + ' متاح ✓';
            m.style.color = '#22c55e';
        } else {
            s.textContent = '✗';
            s.style.color = '#ef4444';
            m.textContent = '@' + cleaned + ' مستخدم بالفعل';
            m.style.color = '#f87171';
        }
    }, 500);
}

export function autoFillUsername(name) {
    const usernameInput = document.getElementById('authUsername');
    if (!usernameInput || usernameInput.value) return;
    const map = {'ا':'a','أ':'a','إ':'a','آ':'a','ب':'b','ت':'t','ج':'j','ح':'h','خ':'kh','د':'d','ر':'r','ز':'z','س':'s','ش':'sh','ع':'a','ف':'f','ق':'q','ك':'k','ل':'l','م':'m','ن':'n','ه':'h','و':'w','ي':'y','ة':'a','ى':'a',' ':'_'};
    let base = '';
    for (const c of (name || '')) base += map[c] || c;
    const clean = base.toLowerCase().replace(/[^a-z0-9_]/g, '').replace(/_+/g, '_').substring(0, 15);
    if (clean.length >= 2) usernameInput.value = clean;
}

// ===== HANDLERS =====
export async function handleLogin() {
    const email = document.getElementById('authEmail')?.value?.trim();
    const password = document.getElementById('authPassword')?.value;
    if (!emailOrPhone) { showAuthAlert('أدخل البريد الإلكتروني أو رقم الهاتف', 'error'); return; }
    if (!password) { showAuthAlert('أدخل كلمة المرور', 'error'); return; }

    const btn = document.getElementById('authSubmitBtn');
    setLoading(btn, true, 'جاري تسجيل الدخول...');

    const { data, error } = await Auth.signIn(emailOrPhone, password);
    if (error) { showAuthAlert(error, 'error'); setLoading(btn, false, 'تسجيل الدخول'); return; }

    showAuthAlert('تم تسجيل الدخول ✓', 'success');
    setTimeout(() => { hideAuthScreen(); window.__app.initApp(); }, 500);
}

export async function handleSignup() {
    const name = document.getElementById('authName')?.value?.trim();
    const username = document.getElementById('authUsername')?.value?.trim().toLowerCase();
    const email = document.getElementById('authEmail')?.value?.trim();
    const password = document.getElementById('authPassword')?.value;
    const phone = document.getElementById('authPhone')?.value?.trim();

    if (!name || name.length < 2) { showAuthAlert('أدخل اسمك الكامل', 'error'); return; }
    if (!username || username.length < 3) { showAuthAlert('أدخل معرفاً فريداً (3 أحرف على الأقل)', 'error'); return; }
    if (!/^[a-z0-9_]+$/.test(username)) { showAuthAlert('المعرف يجب أن يحتوي على حروف إنجليزية وأرقام وشرطة سفلية فقط', 'error'); return; }
    if (!email) { showAuthAlert('أدخل البريد الإلكتروني', 'error'); return; }
    if (!password || password.length < 6) { showAuthAlert('كلمة المرور يجب أن تكون 6 أحرف على الأقل', 'error'); return; }
    if (!phone || phone.length < 9) { showAuthAlert('أدخل رقم هاتفك اليمني (9 أرقام)', 'error'); return; }

    // Check username status
    const statusEl = document.getElementById('usernameStatus');
    if (statusEl && statusEl.textContent === '✗') {
        showAuthAlert('هذا المعرف مستخدم بالفعل، اختر معرفاً آخر', 'error');
        return;
    }

    const btn = document.getElementById('authSubmitBtn');
    setLoading(btn, true, 'جاري إنشاء الحساب...');

    const { data, error, needsEmail } = await Auth.signUp(email, password, name, username, '+967' + phone);

    if (error) { showAuthAlert(error, 'error'); setLoading(btn, false, 'إنشاء الحساب مجاناً'); return; }

    if (needsEmail) {
        showAuthAlert('تم إنشاء الحساب! تحقق من بريدك الإلكتروني لتفعيل الحساب', 'success');
        setLoading(btn, false, 'إنشاء الحساب مجاناً');
        return;
    }

    showAuthAlert('تم إنشاء الحساب بنجاح ✓', 'success');
    setTimeout(() => { hideAuthScreen(); window.__app.initApp(); }, 600);
}

export async function handleForgot() {
    const email = document.getElementById('authEmail')?.value?.trim();
    if (!email) { showAuthAlert('أدخل البريد الإلكتروني', 'error'); return; }
    showAuthAlert('تم إرسال رابط الاستعادة ✓ تحقق من بريدك', 'success');
}

export function switchMode(mode) {
    const card = document.getElementById('authFormCard');
    if (!card) return;
    card.style.opacity = '0';
    card.style.transform = 'translateY(6px)';
    card.style.transition = 'all 0.15s ease';
    setTimeout(() => {
        const forms = { login: loginFormHTML, signup: signupFormHTML, forgot: forgotFormHTML };
        card.innerHTML = (forms[mode] || loginFormHTML)();
        authMode = mode;
        requestAnimationFrame(() => {
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        });
    }, 150);
}

function showAuthAlert(msg, type) {
    const el = document.getElementById('authAlert');
    if (!el) return;
    const c = type === 'success'
        ? { bg: 'rgba(34,197,94,0.12)', border: 'rgba(34,197,94,0.25)', text: '#86efac' }
        : { bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.25)', text: '#fca5a5' };
    el.style.cssText = `display:block;padding:11px 14px;border-radius:10px;margin-bottom:16px;font-size:13px;background:${c.bg};border:1px solid ${c.border};color:${c.text};font-family:'Noto Kufi Arabic',sans-serif;`;
    el.textContent = msg;
}

function getCachedProfile(userId) {
    try { return JSON.parse(localStorage.getItem('auth_profile_' + userId)); } catch(e) { return null; }
}
function cacheProfile(userId, data) {
    try { localStorage.setItem('auth_profile_' + userId, JSON.stringify(data)); } catch(e) {}
}
