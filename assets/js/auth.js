// ============================================================
// ===== AUTH MANAGER — نظام تسجيل حقيقي ===================
// ============================================================
// Supabase Auth: Email + Phone OTP + Password Reset
// Auto-create profile, unique username, session persistence
// ============================================================

const Auth = {
    _initialized: false,
    _user: null,
    _profile: null,

    // ===== INITIALIZATION =====
    async init() {
        if (this._initialized) return this.isLoggedIn();

        // Listen for auth state changes (token refresh, sign out, etc.)
        if (sb && sb.auth) {
            sb.auth.onAuthStateChange(async (event, session) => {
                if (event === 'SIGNED_OUT') {
                    this._user = null;
                    this._profile = null;
                    window.sbUser = null;
                    window.sbProfile = null;
                    window.sbOnline = false;
                } else if (event === 'SIGNED_IN' && session) {
                    window.sbUser = session.user;
                    window.sbOnline = true;
                    await this._loadProfile();
                } else if (event === 'TOKEN_REFRESHED' && session) {
                    window.sbUser = session.user;
                }
            });
        }

        // Try to restore existing session
        try {
            if (sb && sb.auth) {
                const { data: { session } } = await sb.auth.getSession();
                if (session && session.user) {
                    window.sbUser = session.user;
                    window.sbOnline = true;
                    await this._loadProfile();
                    this._initialized = true;
                    return true;
                }
            }
        } catch (e) {
            console.warn('[Auth] Session restore failed:', e.message);
        }

        this._initialized = true;
        return false;
    },

    // ===== SIGN UP WITH EMAIL =====
    async signUpWithEmail(email, password, displayName) {
        if (!sb || !sb.auth) throw new Error('الخدمة غير متاحة');

        const { data, error } = await sb.auth.signUp({
            email: email.trim(),
            password: password,
            options: {
                data: {
                    display_name: displayName.trim(),
                    username: this._generateUsername(displayName.trim())
                }
            }
        });

        if (error) throw new Error(this._translateError(error.message));
        return data;
    },

    // ===== SIGN IN WITH EMAIL =====
    async signInWithEmail(email, password) {
        if (!sb || !sb.auth) throw new Error('الخدمة غير متاحة');

        const { data, error } = await sb.auth.signInWithPassword({
            email: email.trim(),
            password: password
        });

        if (error) throw new Error(this._translateError(error.message));

        window.sbUser = data.user;
        window.sbOnline = true;

        // Ensure profile exists
        await this._ensureProfile(data.user);

        return data;
    },

    // ===== PHONE: SEND OTP =====
    async sendPhoneOTP(phone) {
        if (!sb || !sb.auth) throw new Error('الخدمة غير متاحة');

        const formatted = this._formatPhone(phone.trim());
        const { error } = await sb.auth.signInWithOtp({
            phone: formatted
        });

        if (error) throw new Error(this._translateError(error.message));
        return true;
    },

    // ===== PHONE: VERIFY OTP =====
    async verifyPhoneOTP(phone, token, displayName) {
        if (!sb || !sb.auth) throw new Error('الخدمة غير متاحة');

        const formatted = this._formatPhone(phone.trim());
        const { data, error } = await sb.auth.verifyOtp({
            phone: formatted,
            token: token.trim(),
            type: 'sms'
        });

        if (error) throw new Error(this._translateError(error.message));

        window.sbUser = data.user;
        window.sbOnline = true;

        // Ensure profile exists
        await this._ensureProfile(data.user, displayName);

        return data;
    },

    // ===== PHONE: SIGN IN WITH PASSWORD =====
    async signInWithPhone(phone, password) {
        if (!sb || !sb.auth) throw new Error('الخدمة غير متاحة');

        const formatted = this._formatPhone(phone.trim());
        const { data, error } = await sb.auth.signInWithPassword({
            phone: formatted,
            password: password
        });

        if (error) throw new Error(this._translateError(error.message));

        window.sbUser = data.user;
        window.sbOnline = true;
        await this._ensureProfile(data.user);

        return data;
    },

    // ===== PASSWORD RECOVERY =====
    async sendPasswordReset(email) {
        if (!sb || !sb.auth) throw new Error('الخدمة غير متاحة');

        const { error } = await sb.auth.resetPasswordForEmail(email.trim(), {
            redirectTo: window.location.origin + window.location.pathname
        });

        if (error) throw new Error(this._translateError(error.message));
        return true;
    },

    // ===== SIGN OUT =====
    async signOut() {
        if (sb && sb.auth) {
            await sb.auth.signOut();
        }
        this._user = null;
        this._profile = null;
        window.sbUser = null;
        window.sbProfile = null;
        window.sbOnline = false;
        // Clear any cached profile data
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith('auth_profile_')) localStorage.removeItem(key);
        });
        // Reload to show auth screen
        window.location.reload();
    },

    // ===== CHECK IF SESSION IS VALID =====
    async ensureSession() {
        if (!sb || !sb.auth) return false;
        try {
            const { data: { session }, error } = await sb.auth.getSession();
            if (error) {
                console.warn('[Auth] Session check error:', error.message);
                return false;
            }
            if (session && session.user) {
                window.sbUser = session.user;
                window.sbOnline = true;
                return true;
            }
            // ⚡ محاولة تجديد الجلسة
            const { data: { session: refreshed } } = await sb.auth.refreshSession();
            if (refreshed && refreshed.user) {
                window.sbUser = refreshed.user;
                window.sbOnline = true;
                return true;
            }
        } catch (e) {
            console.warn('[Auth] Session ensure failed:', e.message);
        }
        return false;
    },

    // ===== GETTERS =====
    getCurrentUserId() {
        return window.sbUser?.id || null;
    },

    getCurrentAccount() {
        return this._profile;
    },

    isLoggedIn() {
        return !!window.sbUser?.id;
    },

    // ===== USERNAME GENERATION =====
    _generateUsername(displayName) {
        // Arabic to transliteration map
        const arabicMap = {
            'ا': 'a', 'أ': 'a', 'إ': 'a', 'آ': 'a', 'ب': 'b', 'ت': 't',
            'ث': 'th', 'ج': 'j', 'ح': 'h', 'خ': 'kh', 'د': 'd', 'ذ': 'dh',
            'ر': 'r', 'ز': 'z', 'س': 's', 'ش': 'sh', 'ص': 's', 'ض': 'd',
            'ط': 't', 'ظ': 'z', 'ع': 'a', 'غ': 'gh', 'ف': 'f', 'ق': 'q',
            'ك': 'k', 'ل': 'l', 'م': 'm', 'ن': 'n', 'ه': 'h', 'و': 'w',
            'ي': 'y', 'ة': 'a', 'ى': 'a', 'ء': 'a', 'ؤ': 'o', 'ئ': 'e',
            ' ': '_'
        };

        let base = '';
        for (const char of displayName) {
            base += arabicMap[char] || char;
        }

        // Clean: only alphanumeric and underscores
        base = base.toLowerCase().replace(/[^a-z0-9_]/g, '').replace(/_+/g, '_').replace(/^_|_$/g, '');

        // Fallback if empty
        if (base.length < 2) {
            base = 'user' + Math.floor(Math.random() * 90000 + 10000);
        }

        // Truncate
        if (base.length > 20) base = base.substring(0, 20);

        // Add random suffix for uniqueness
        const suffix = Math.floor(Math.random() * 9000 + 1000);
        return base + '_' + suffix;
    },

    // ===== ENSURE USERNAME IS UNIQUE =====
    async _ensureUniqueUsername(baseUsername) {
        if (!sb) return baseUsername;

        let username = baseUsername;
        let attempts = 0;

        while (attempts < 5) {
            const { data } = await sb.from('profiles')
                .select('id')
                .eq('username', username)
                .maybeSingle();

            if (!data) return username; // Username is available

            // Generate new suffix
            const suffix = Math.floor(Math.random() * 9000 + 1000);
            const base = baseUsername.replace(/_\d+$/, '') || baseUsername;
            username = base + '_' + suffix;
            attempts++;
        }

        // Last resort: use timestamp
        return baseUsername.replace(/_\d+$/, '') + '_' + Date.now().toString(36);
    },

    // ===== FORMAT PHONE NUMBER =====
    _formatPhone(phone) {
        // Remove spaces and dashes
        let cleaned = phone.replace(/[\s\-\(\)]/g, '');

        // If starts with 0, replace with +966 (Saudi Arabia default)
        if (cleaned.startsWith('0')) {
            cleaned = '+966' + cleaned.substring(1);
        }

        // If no + prefix, add it
        if (!cleaned.startsWith('+')) {
            cleaned = '+' + cleaned;
        }

        return cleaned;
    },

    // ===== ENSURE PROFILE EXISTS =====
    async _ensureProfile(user, displayName) {
        if (!sb) return;

        // Check if profile already exists
        const { data: existing } = await sb.from('profiles')
            .select('*')
            .eq('id', user.id)
            .maybeSingle();

        if (existing) {
            window.sbProfile = existing;
            this._profile = existing;
            Safe.setJSON('auth_profile_' + user.id, existing);
            return;
        }

        // Create new profile
        const meta = user.user_metadata || {};
        const name = displayName || meta.display_name || meta.full_name || 'مستخدم';
        const baseUsername = meta.username || this._generateUsername(name);
        const uniqueUsername = await this._ensureUniqueUsername(baseUsername);

        const newProfile = {
            id: user.id,
            username: uniqueUsername,
            name: name,
            bio: '',
            title: '',
            location: '',
            website: '',
            avatar_url: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}&backgroundColor=f97316&textColor=ffffff`,
            cover_url: '',
            followers_count: 0,
            following_count: 0,
            posts_count: 0,
            verified: false
        };

        const { data: created, error } = await sb.from('profiles')
            .insert(newProfile)
            .select()
            .single();

        if (!error && created) {
            window.sbProfile = created;
            this._profile = created;
            Safe.setJSON('auth_profile_' + user.id, created);
        } else if (error) {
            console.warn('[Auth] Profile creation error:', error.message);
            // Use fallback profile
            window.sbProfile = newProfile;
            this._profile = newProfile;
        }
    },

    // ===== LOAD EXISTING PROFILE =====
    async _loadProfile() {
        if (!sb || !window.sbUser) return;

        const userId = window.sbUser.id;

        // Try cache first
        const cached = Safe.getJSON('auth_profile_' + userId, null);
        if (cached) {
            window.sbProfile = cached;
            this._profile = cached;
        }

        // Fetch fresh data from DB
        try {
            const { data, error } = await sb.from('profiles')
                .select('*')
                .eq('id', userId)
                .maybeSingle();

            if (data && !error) {
                window.sbProfile = data;
                this._profile = data;
                Safe.setJSON('auth_profile_' + userId, data);
            } else if (!cached) {
                // No profile in DB and no cache — create one
                await this._ensureProfile(window.sbUser);
            }
        } catch (e) {
            console.warn('[Auth] Profile load failed:', e.message);
            if (!cached) {
                await this._ensureProfile(window.sbUser);
            }
        }
    },

    // ===== TRANSLATE SUPABASE ERRORS =====
    _translateError(msg) {
        const errors = {
            'Invalid login credentials': 'بيانات تسجيل الدخول غير صحيحة',
            'User already registered': 'البريد الإلكتروني مسجل بالفعل',
            'Email not confirmed': 'يرجى تأكيد البريد الإلكتروني أولاً',
            'Password should be at least 6 characters': 'كلمة المرور يجب أن تكون 6 أحرف على الأقل',
            'Unable to validate email address: invalid format': 'صيغة البريد الإلكتروني غير صحيحة',
            'Phone not confirmed': 'يرجى تأكيد رقم الهاتف أولاً',
            'Token has expired or is invalid': 'رمز التحقق منتهي الصلاحية أو غير صحيح',
            'sms_send_failed': 'فشل إرسال رسالة التحقق. حاول لاحقاً',
            'over_sms_send_rate_limit': 'تم تجاوز الحد. انتظر قليلاً ثم حاول مرة أخرى',
            'over_request_rate_limit': 'طلبات كثيرة. انتظر قليلاً ثم حاول مرة أخرى',
        };

        for (const [en, ar] of Object.entries(errors)) {
            if (msg.includes(en)) return ar;
        }
        return msg;
    }
};

// ============================================================
// ===== AUTH UI — واجهة تسجيل الدخول =======================
// ============================================================

const AuthUI = {
    _mode: 'login', // login | signup | forgot | phone | otp
    _phoneForOTP: '',
    _nameForOTP: '',
    _isVisible: false,

    // ===== SHOW AUTH SCREEN =====
    show() {
        if (this._isVisible) return;
        this._isVisible = true;

        // Create overlay
        const overlay = document.createElement('div');
        overlay.id = 'authOverlay';
        overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;background:#0a0a0a;display:flex;align-items:center;justify-content:center;overflow-y:auto;padding:20px;';
        overlay.innerHTML = this._buildHTML();
        document.body.appendChild(overlay);
        document.body.style.overflow = 'hidden';
    },

    // ===== HIDE AUTH SCREEN =====
    hide() {
        const overlay = document.getElementById('authOverlay');
        if (overlay) {
            overlay.style.opacity = '0';
            overlay.style.transition = 'opacity 0.3s ease';
            setTimeout(() => {
                overlay.remove();
                document.body.style.overflow = '';
            }, 300);
        }
        this._isVisible = false;
    },

    // ===== BUILD FULL HTML =====
    _buildHTML() {
        return `
        <div style="width:100%;max-width:420px;margin:auto;">
            <!-- Logo -->
            <div style="text-align:center;margin-bottom:32px;">
                <div style="width:64px;height:64px;background:linear-gradient(135deg,#f97316,#ea580c);border-radius:18px;display:inline-flex;align-items:center;justify-content:center;margin-bottom:16px;box-shadow:0 8px 32px rgba(249,115,22,0.3);">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/>
                        <path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/>
                        <path d="M7 21h10"/>
                        <path d="M12 3v18"/>
                        <path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/>
                    </svg>
                </div>
                <h1 style="font-size:28px;font-weight:800;color:white;font-family:'Noto Kufi Arabic',sans-serif;">Law<span style="color:#f97316;">book</span></h1>
                <p style="color:#737373;font-size:14px;margin-top:4px;font-family:'Noto Kufi Arabic',sans-serif;">المنصة القانونية الاجتماعية</p>
            </div>

            <!-- Form Card -->
            <div style="background:#171717;border:1px solid #404040;border-radius:20px;padding:32px 28px;" id="authFormCard">
                ${this._getFormHTML()}
            </div>

            <!-- Footer -->
            <p style="text-align:center;color:#525252;font-size:11px;margin-top:24px;font-family:'Noto Kufi Arabic',sans-serif;">
                بالتسجيل، أنت توافق على شروط الاستخدام وسياسة الخصوصية
            </p>
        </div>`;
    },

    // ===== GET FORM HTML BASED ON MODE =====
    _getFormHTML() {
        switch (this._mode) {
            case 'login': return this._loginForm();
            case 'signup': return this._signupForm();
            case 'forgot': return this._forgotForm();
            case 'phone': return this._phoneForm();
            case 'otp': return this._otpForm();
            default: return this._loginForm();
        }
    },

    // ===== LOGIN FORM =====
    _loginForm() {
        return `
            <h2 style="font-size:20px;font-weight:700;color:white;margin-bottom:6px;font-family:'Noto Kufi Arabic',sans-serif;">مرحباً بعودتك</h2>
            <p style="color:#737373;font-size:13px;margin-bottom:24px;font-family:'Noto Kufi Arabic',sans-serif;">سجّل دخولك للمتابعة</p>

            <!-- Email Login -->
            <div id="authAlert" style="display:none;padding:10px 14px;border-radius:10px;margin-bottom:16px;font-size:13px;font-family:'Noto Kufi Arabic',sans-serif;"></div>

            <div style="margin-bottom:14px;">
                <label style="display:block;color:#a3a3a3;font-size:12px;margin-bottom:6px;font-family:'Noto Kufi Arabic',sans-serif;">البريد الإلكتروني</label>
                <input type="email" id="authEmail" placeholder="name@example.com" autocomplete="email"
                    style="width:100%;background:#262626;border:1px solid #404040;border-radius:12px;padding:12px 16px;color:white;font-size:14px;outline:none;box-sizing:border-box;transition:border 0.2s;"
                    onfocus="this.style.borderColor='#f97316'" onblur="this.style.borderColor='#404040'">
            </div>

            <div style="margin-bottom:14px;">
                <label style="display:block;color:#a3a3a3;font-size:12px;margin-bottom:6px;font-family:'Noto Kufi Arabic',sans-serif;">كلمة المرور</label>
                <div style="position:relative;">
                    <input type="password" id="authPassword" placeholder="••••••••" autocomplete="current-password"
                        style="width:100%;background:#262626;border:1px solid #404040;border-radius:12px;padding:12px 16px;padding-left:44px;color:white;font-size:14px;outline:none;box-sizing:border-box;transition:border 0.2s;"
                        onfocus="this.style.borderColor='#f97316'" onblur="this.style.borderColor='#404040'">
                    <button type="button" onclick="AuthUI._togglePass('authPassword',this)" style="position:absolute;left:12px;top:50%;transform:translateY(-50%);background:none;border:none;color:#737373;cursor:pointer;padding:4px;">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                    </button>
                </div>
            </div>

            <!-- Remember Me + Forgot -->
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
                <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-family:'Noto Kufi Arabic',sans-serif;">
                    <input type="checkbox" id="authRemember" style="accent-color:#f97316;width:16px;height:16px;">
                    <span style="color:#a3a3a3;font-size:12px;">تذكرني</span>
                </label>
                <button onclick="AuthUI._switchMode('forgot')" style="background:none;border:none;color:#f97316;font-size:12px;cursor:pointer;font-family:'Noto Kufi Arabic',sans-serif;">نسيت كلمة المرور؟</button>
            </div>

            <button onclick="AuthUI._handleLogin()" id="authSubmitBtn"
                style="width:100%;background:linear-gradient(135deg,#f97316,#ea580c);color:white;font-weight:700;font-size:15px;padding:14px;border:none;border-radius:14px;cursor:pointer;transition:all 0.2s;font-family:'Noto Kufi Arabic',sans-serif;"
                onmouseover="this.style.transform='translateY(-1px)';this.style.boxShadow='0 6px 24px rgba(249,115,22,0.4)'"
                onmouseout="this.style.transform='';this.style.boxShadow=''">
                تسجيل الدخول
            </button>

            <!-- Divider -->
            <div style="display:flex;align-items:center;gap:12px;margin:20px 0;">
                <div style="flex:1;height:1px;background:#404040;"></div>
                <span style="color:#525252;font-size:12px;font-family:'Noto Kufi Arabic',sans-serif;">أو</span>
                <div style="flex:1;height:1px;background:#404040;"></div>
            </div>

            <!-- Phone Login -->
            <button onclick="AuthUI._switchMode('phone')"
                style="width:100%;background:#262626;border:1px solid #404040;color:white;font-size:14px;padding:12px;border-radius:12px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;transition:all 0.2s;font-family:'Noto Kufi Arabic',sans-serif;"
                onmouseover="this.style.borderColor='#f97316'" onmouseout="this.style.borderColor='#404040'">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="14" height="20" x="5" y="2" rx="2" ry="2"/><path d="M12 18h.01"/></svg>
                تسجيل برقم الهاتف
            </button>

            <!-- Switch to Signup -->
            <div style="text-align:center;margin-top:20px;padding-top:16px;border-top:1px solid #262626;">
                <span style="color:#737373;font-size:13px;font-family:'Noto Kufi Arabic',sans-serif;">ليس لديك حساب؟ </span>
                <button onclick="AuthUI._switchMode('signup')" style="background:none;border:none;color:#f97316;font-weight:600;font-size:13px;cursor:pointer;font-family:'Noto Kufi Arabic',sans-serif;">إنشاء حساب</button>
            </div>
        `;
    },

    // ===== SIGNUP FORM =====
    _signupForm() {
        return `
            <button onclick="AuthUI._switchMode('login')" style="background:none;border:none;color:#737373;font-size:13px;cursor:pointer;display:flex;align-items:center;gap:6px;margin-bottom:16px;font-family:'Noto Kufi Arabic',sans-serif;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m9 18 6-6-6-6"/></svg>
                العودة لتسجيل الدخول
            </button>

            <h2 style="font-size:20px;font-weight:700;color:white;margin-bottom:6px;font-family:'Noto Kufi Arabic',sans-serif;">إنشاء حساب جديد</h2>
            <p style="color:#737373;font-size:13px;margin-bottom:24px;font-family:'Noto Kufi Arabic',sans-serif;">انضم للمجتمع القانوني</p>

            <div id="authAlert" style="display:none;padding:10px 14px;border-radius:10px;margin-bottom:16px;font-size:13px;font-family:'Noto Kufi Arabic',sans-serif;"></div>

            <div style="margin-bottom:14px;">
                <label style="display:block;color:#a3a3a3;font-size:12px;margin-bottom:6px;font-family:'Noto Kufi Arabic',sans-serif;">الاسم الكامل</label>
                <input type="text" id="authName" placeholder="مثال: أحمد الخالدي" autocomplete="name"
                    style="width:100%;background:#262626;border:1px solid #404040;border-radius:12px;padding:12px 16px;color:white;font-size:14px;outline:none;box-sizing:border-box;transition:border 0.2s;"
                    onfocus="this.style.borderColor='#f97316'" onblur="this.style.borderColor='#404040'">
            </div>

            <div style="margin-bottom:14px;">
                <label style="display:block;color:#a3a3a3;font-size:12px;margin-bottom:6px;font-family:'Noto Kufi Arabic',sans-serif;">البريد الإلكتروني</label>
                <input type="email" id="authEmail" placeholder="name@example.com" autocomplete="email"
                    style="width:100%;background:#262626;border:1px solid #404040;border-radius:12px;padding:12px 16px;color:white;font-size:14px;outline:none;box-sizing:border-box;transition:border 0.2s;"
                    onfocus="this.style.borderColor='#f97316'" onblur="this.style.borderColor='#404040'">
            </div>

            <div style="margin-bottom:14px;">
                <label style="display:block;color:#a3a3a3;font-size:12px;margin-bottom:6px;font-family:'Noto Kufi Arabic',sans-serif;">كلمة المرور</label>
                <div style="position:relative;">
                    <input type="password" id="authPassword" placeholder="6 أحرف على الأقل" autocomplete="new-password"
                        style="width:100%;background:#262626;border:1px solid #404040;border-radius:12px;padding:12px 16px;padding-left:44px;color:white;font-size:14px;outline:none;box-sizing:border-box;transition:border 0.2s;"
                        onfocus="this.style.borderColor='#f97316'" onblur="this.style.borderColor='#404040'">
                    <button type="button" onclick="AuthUI._togglePass('authPassword',this)" style="position:absolute;left:12px;top:50%;transform:translateY(-50%);background:none;border:none;color:#737373;cursor:pointer;padding:4px;">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                    </button>
                </div>
                <p style="color:#525252;font-size:11px;margin-top:4px;font-family:'Noto Kufi Arabic',sans-serif;">يجب أن تحتوي على 6 أحرف على الأقل</p>
            </div>

            <div style="margin-bottom:14px;">
                <label style="display:block;color:#a3a3a3;font-size:12px;margin-bottom:6px;font-family:'Noto Kufi Arabic',sans-serif;">اسم المستخدم <span style="color:#525252;font-size:11px;">(اختياري — سيُنشأ تلقائياً)</span></label>
                <input type="text" id="authUsername" placeholder="ahmed_law" autocomplete="username"
                    style="width:100%;background:#262626;border:1px solid #404040;border-radius:12px;padding:12px 16px;color:white;font-size:14px;outline:none;box-sizing:border-box;direction:ltr;text-align:left;transition:border 0.2s;"
                    onfocus="this.style.borderColor='#f97316'" onblur="this.style.borderColor='#404040'">
                <p style="color:#525252;font-size:11px;margin-top:4px;font-family:'Noto Kufi Arabic',sans-serif;">سيتم إنشاؤه تلقائياً من اسمك إذا تركته فارغاً</p>
            </div>

            <button onclick="AuthUI._handleSignup()" id="authSubmitBtn"
                style="width:100%;background:linear-gradient(135deg,#f97316,#ea580c);color:white;font-weight:700;font-size:15px;padding:14px;border:none;border-radius:14px;cursor:pointer;margin-top:8px;transition:all 0.2s;font-family:'Noto Kufi Arabic',sans-serif;"
                onmouseover="this.style.transform='translateY(-1px)';this.style.boxShadow='0 6px 24px rgba(249,115,22,0.4)'"
                onmouseout="this.style.transform='';this.style.boxShadow=''">
                إنشاء الحساب
            </button>

            <!-- Divider -->
            <div style="display:flex;align-items:center;gap:12px;margin:20px 0;">
                <div style="flex:1;height:1px;background:#404040;"></div>
                <span style="color:#525252;font-size:12px;font-family:'Noto Kufi Arabic',sans-serif;">أو</span>
                <div style="flex:1;height:1px;background:#404040;"></div>
            </div>

            <button onclick="AuthUI._switchMode('phone')"
                style="width:100%;background:#262626;border:1px solid #404040;color:white;font-size:14px;padding:12px;border-radius:12px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;transition:all 0.2s;font-family:'Noto Kufi Arabic',sans-serif;"
                onmouseover="this.style.borderColor='#f97316'" onmouseout="this.style.borderColor='#404040'">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="14" height="20" x="5" y="2" rx="2" ry="2"/><path d="M12 18h.01"/></svg>
                التسجيل برقم الهاتف
            </button>

            <div style="text-align:center;margin-top:16px;">
                <span style="color:#737373;font-size:13px;font-family:'Noto Kufi Arabic',sans-serif;">لديك حساب بالفعل؟ </span>
                <button onclick="AuthUI._switchMode('login')" style="background:none;border:none;color:#f97316;font-weight:600;font-size:13px;cursor:pointer;font-family:'Noto Kufi Arabic',sans-serif;">تسجيل الدخول</button>
            </div>
        `;
    },

    // ===== FORGOT PASSWORD FORM =====
    _forgotForm() {
        return `
            <button onclick="AuthUI._switchMode('login')" style="background:none;border:none;color:#737373;font-size:13px;cursor:pointer;display:flex;align-items:center;gap:6px;margin-bottom:16px;font-family:'Noto Kufi Arabic',sans-serif;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m9 18 6-6-6-6"/></svg>
                العودة لتسجيل الدخول
            </button>

            <h2 style="font-size:20px;font-weight:700;color:white;margin-bottom:6px;font-family:'Noto Kufi Arabic',sans-serif;">استعادة كلمة المرور</h2>
            <p style="color:#737373;font-size:13px;margin-bottom:24px;font-family:'Noto Kufi Arabic',sans-serif;">أدخل بريدك الإلكتروني وسنرسل لك رابط إعادة التعيين</p>

            <div id="authAlert" style="display:none;padding:10px 14px;border-radius:10px;margin-bottom:16px;font-size:13px;font-family:'Noto Kufi Arabic',sans-serif;"></div>

            <div style="margin-bottom:20px;">
                <label style="display:block;color:#a3a3a3;font-size:12px;margin-bottom:6px;font-family:'Noto Kufi Arabic',sans-serif;">البريد الإلكتروني</label>
                <input type="email" id="authEmail" placeholder="name@example.com" autocomplete="email"
                    style="width:100%;background:#262626;border:1px solid #404040;border-radius:12px;padding:12px 16px;color:white;font-size:14px;outline:none;box-sizing:border-box;transition:border 0.2s;"
                    onfocus="this.style.borderColor='#f97316'" onblur="this.style.borderColor='#404040'">
            </div>

            <button onclick="AuthUI._handleForgot()" id="authSubmitBtn"
                style="width:100%;background:linear-gradient(135deg,#f97316,#ea580c);color:white;font-weight:700;font-size:15px;padding:14px;border:none;border-radius:14px;cursor:pointer;transition:all 0.2s;font-family:'Noto Kufi Arabic',sans-serif;"
                onmouseover="this.style.transform='translateY(-1px)';this.style.boxShadow='0 6px 24px rgba(249,115,22,0.4)'"
                onmouseout="this.style.transform='';this.style.boxShadow=''">
                إرسال رابط الاستعادة
            </button>
        `;
    },

    // ===== PHONE FORM =====
    _phoneForm() {
        return `
            <button onclick="AuthUI._switchMode('login')" style="background:none;border:none;color:#737373;font-size:13px;cursor:pointer;display:flex;align-items:center;gap:6px;margin-bottom:16px;font-family:'Noto Kufi Arabic',sans-serif;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m9 18 6-6-6-6"/></svg>
                العودة لتسجيل الدخول
            </button>

            <h2 style="font-size:20px;font-weight:700;color:white;margin-bottom:6px;font-family:'Noto Kufi Arabic',sans-serif;">تسجيل بالهاتف</h2>
            <p style="color:#737373;font-size:13px;margin-bottom:24px;font-family:'Noto Kufi Arabic',sans-serif;">سنرسل لك رمز التحقق عبر رسالة نصية</p>

            <div id="authAlert" style="display:none;padding:10px 14px;border-radius:10px;margin-bottom:16px;font-size:13px;font-family:'Noto Kufi Arabic',sans-serif;"></div>

            <div style="margin-bottom:14px;">
                <label style="display:block;color:#a3a3a3;font-size:12px;margin-bottom:6px;font-family:'Noto Kufi Arabic',sans-serif;">رقم الهاتف</label>
                <input type="tel" id="authPhone" placeholder="05XXXXXXXX أو +9665XXXXXXXX" autocomplete="tel"
                    style="width:100%;background:#262626;border:1px solid #404040;border-radius:12px;padding:12px 16px;color:white;font-size:14px;outline:none;box-sizing:border-box;direction:ltr;text-align:left;transition:border 0.2s;"
                    onfocus="this.style.borderColor='#f97316'" onblur="this.style.borderColor='#404040'">
            </div>

            <div style="margin-bottom:14px;">
                <label style="display:block;color:#a3a3a3;font-size:12px;margin-bottom:6px;font-family:'Noto Kufi Arabic',sans-serif;">الاسم الكامل <span style="color:#525252;font-size:11px;">(للحسابات الجديدة)</span></label>
                <input type="text" id="authName" placeholder="مثال: أحمد الخالدي" autocomplete="name"
                    style="width:100%;background:#262626;border:1px solid #404040;border-radius:12px;padding:12px 16px;color:white;font-size:14px;outline:none;box-sizing:border-box;transition:border 0.2s;"
                    onfocus="this.style.borderColor='#f97316'" onblur="this.style.borderColor='#404040'">
            </div>

            <button onclick="AuthUI._handlePhone()" id="authSubmitBtn"
                style="width:100%;background:linear-gradient(135deg,#f97316,#ea580c);color:white;font-weight:700;font-size:15px;padding:14px;border:none;border-radius:14px;cursor:pointer;margin-top:4px;transition:all 0.2s;font-family:'Noto Kufi Arabic',sans-serif;"
                onmouseover="this.style.transform='translateY(-1px)';this.style.boxShadow='0 6px 24px rgba(249,115,22,0.4)'"
                onmouseout="this.style.transform='';this.style.boxShadow=''">
                إرسال رمز التحقق
            </button>
        `;
    },

    // ===== OTP VERIFICATION FORM =====
    _otpForm() {
        return `
            <button onclick="AuthUI._switchMode('phone')" style="background:none;border:none;color:#737373;font-size:13px;cursor:pointer;display:flex;align-items:center;gap:6px;margin-bottom:16px;font-family:'Noto Kufi Arabic',sans-serif;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m9 18 6-6-6-6"/></svg>
                تغيير الرقم
            </button>

            <h2 style="font-size:20px;font-weight:700;color:white;margin-bottom:6px;font-family:'Noto Kufi Arabic',sans-serif;">رمز التحقق</h2>
            <p style="color:#737373;font-size:13px;margin-bottom:8px;font-family:'Noto Kufi Arabic',sans-serif;">أدخل الرمز المرسل إلى</p>
            <p style="color:#f97316;font-size:14px;font-weight:600;margin-bottom:24px;direction:ltr;text-align:left;font-family:monospace;">${this._phoneForOTP}</p>

            <div id="authAlert" style="display:none;padding:10px 14px;border-radius:10px;margin-bottom:16px;font-size:13px;font-family:'Noto Kufi Arabic',sans-serif;"></div>

            <div style="margin-bottom:20px;">
                <label style="display:block;color:#a3a3a3;font-size:12px;margin-bottom:6px;font-family:'Noto Kufi Arabic',sans-serif;">رمز التحقق (6 أرقام)</label>
                <input type="text" id="authOTP" placeholder="000000" maxlength="6" inputmode="numeric" autocomplete="one-time-code"
                    style="width:100%;background:#262626;border:1px solid #404040;border-radius:12px;padding:14px 16px;color:white;font-size:24px;outline:none;box-sizing:border-box;direction:ltr;text-align:center;letter-spacing:12px;font-weight:700;transition:border 0.2s;"
                    onfocus="this.style.borderColor='#f97316'" onblur="this.style.borderColor='#404040'"
                    oninput="this.value=this.value.replace(/[^0-9]/g,'').substring(0,6)">
            </div>

            <button onclick="AuthUI._handleVerifyOTP()" id="authSubmitBtn"
                style="width:100%;background:linear-gradient(135deg,#f97316,#ea580c);color:white;font-weight:700;font-size:15px;padding:14px;border:none;border-radius:14px;cursor:pointer;transition:all 0.2s;font-family:'Noto Kufi Arabic',sans-serif;"
                onmouseover="this.style.transform='translateY(-1px)';this.style.boxShadow='0 6px 24px rgba(249,115,22,0.4)'"
                onmouseout="this.style.transform='';this.style.boxShadow=''">
                تأكيد الرمز
            </button>

            <div style="text-align:center;margin-top:16px;">
                <button onclick="AuthUI._handlePhone()" style="background:none;border:none;color:#f97316;font-size:12px;cursor:pointer;font-family:'Noto Kufi Arabic',sans-serif;">إعادة إرسال الرمز</button>
            </div>
        `;
    },

    // ===== SWITCH MODE =====
    _switchMode(mode) {
        this._mode = mode;
        const card = document.getElementById('authFormCard');
        if (card) {
            card.style.opacity = '0';
            card.style.transform = 'translateY(8px)';
            setTimeout(() => {
                card.innerHTML = this._getFormHTML();
                card.style.opacity = '1';
                card.style.transform = 'translateY(0)';
                card.style.transition = 'all 0.2s ease';
            }, 150);
        }
    },

    // ===== SHOW ALERT =====
    _showAlert(message, type) {
        const alert = document.getElementById('authAlert');
        if (!alert) return;

        const colors = {
            error: { bg: 'rgba(239,68,68,0.15)', border: 'rgba(239,68,68,0.3)', text: '#fca5a5' },
            success: { bg: 'rgba(34,197,94,0.15)', border: 'rgba(34,197,94,0.3)', text: '#86efac' },
            info: { bg: 'rgba(59,130,246,0.15)', border: 'rgba(59,130,246,0.3)', text: '#93c5fd' }
        };
        const c = colors[type] || colors.error;

        alert.style.cssText = `display:block;padding:10px 14px;border-radius:10px;margin-bottom:16px;font-size:13px;background:${c.bg};border:1px solid ${c.border};color:${c.text};font-family:'Noto Kufi Arabic',sans-serif;`;
        alert.textContent = message;
    },

    // ===== TOGGLE PASSWORD VISIBILITY =====
    _togglePass(inputId, btn) {
        const input = document.getElementById(inputId);
        if (!input) return;
        if (input.type === 'password') {
            input.type = 'text';
            btn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg>';
        } else {
            input.type = 'password';
            btn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>';
        }
    },

    // ===== SET LOADING STATE =====
    _setLoading(loading) {
        const btn = document.getElementById('authSubmitBtn');
        if (!btn) return;
        if (loading) {
            btn.disabled = true;
            btn.style.opacity = '0.7';
            btn.style.cursor = 'wait';
            btn._originalText = btn.textContent;
            btn.textContent = 'جاري المعالجة...';
        } else {
            btn.disabled = false;
            btn.style.opacity = '1';
            btn.style.cursor = 'pointer';
            if (btn._originalText) btn.textContent = btn._originalText;
        }
    },

    // ===== HANDLE LOGIN =====
    async _handleLogin() {
        const email = document.getElementById('authEmail')?.value?.trim();
        const password = document.getElementById('authPassword')?.value;

        if (!email || !password) {
            this._showAlert('أدخل البريد الإلكتروني وكلمة المرور', 'error');
            return;
        }

        this._setLoading(true);

        try {
            await Auth.signInWithEmail(email, password);
            this._showAlert('تم تسجيل الدخول بنجاح ✓', 'success');
            setTimeout(() => {
                this.hide();
                window.location.reload();
            }, 500);
        } catch (e) {
            this._showAlert(e.message, 'error');
            this._setLoading(false);
        }
    },

    // ===== HANDLE SIGNUP =====
    async _handleSignup() {
        const name = document.getElementById('authName')?.value?.trim();
        const email = document.getElementById('authEmail')?.value?.trim();
        const password = document.getElementById('authPassword')?.value;
        const username = document.getElementById('authUsername')?.value?.trim();

        if (!name) { this._showAlert('أدخل اسمك الكامل', 'error'); return; }
        if (!email) { this._showAlert('أدخل البريد الإلكتروني', 'error'); return; }
        if (!password || password.length < 6) { this._showAlert('كلمة المرور يجب أن تكون 6 أحرف على الأقل', 'error'); return; }

        this._setLoading(true);

        try {
            const result = await Auth.signUpWithEmail(email, password, name);

            // If user provided a custom username, update it
            if (username && result.user) {
                const cleanUsername = username.replace(/[^a-zA-Z0-9_]/g, '');
                const unique = await Auth._ensureUniqueUsername(cleanUsername);
                await sb.from('profiles').update({ username: unique }).eq('id', result.user.id);
            }

            // Check if email confirmation is required
            if (result.user && !result.session) {
                this._showAlert('تم إنشاء الحساب! تحقق من بريدك الإلكتروني لتأكيد الحساب', 'success');
                this._setLoading(false);
            } else {
                this._showAlert('تم إنشاء الحساب بنجاح ✓', 'success');
                setTimeout(() => {
                    this.hide();
                    window.location.reload();
                }, 500);
            }
        } catch (e) {
            this._showAlert(e.message, 'error');
            this._setLoading(false);
        }
    },

    // ===== HANDLE PHONE =====
    async _handlePhone() {
        const phone = document.getElementById('authPhone')?.value?.trim();
        const name = document.getElementById('authName')?.value?.trim();

        if (!phone) { this._showAlert('أدخل رقم الهاتف', 'error'); return; }

        this._setLoading(true);

        try {
            await Auth.sendPhoneOTP(phone);
            this._phoneForOTP = Auth._formatPhone(phone);
            this._nameForOTP = name || '';
            this._showAlert('تم إرسال رمز التحقق ✓', 'success');
            setTimeout(() => {
                this._switchMode('otp');
                this._setLoading(false);
            }, 500);
        } catch (e) {
            this._showAlert(e.message, 'error');
            this._setLoading(false);
        }
    },

    // ===== HANDLE VERIFY OTP =====
    async _handleVerifyOTP() {
        const token = document.getElementById('authOTP')?.value?.trim();

        if (!token || token.length !== 6) {
            this._showAlert('أدخل رمز التحقق المكون من 6 أرقام', 'error');
            return;
        }

        this._setLoading(true);

        try {
            await Auth.verifyPhoneOTP(this._phoneForOTP, token, this._nameForOTP);
            this._showAlert('تم التحقق بنجاح ✓', 'success');
            setTimeout(() => {
                this.hide();
                window.location.reload();
            }, 500);
        } catch (e) {
            this._showAlert(e.message, 'error');
            this._setLoading(false);
        }
    },

    // ===== HANDLE FORGOT PASSWORD =====
    async _handleForgot() {
        const email = document.getElementById('authEmail')?.value?.trim();

        if (!email) { this._showAlert('أدخل البريد الإلكتروني', 'error'); return; }

        this._setLoading(true);

        try {
            await Auth.sendPasswordReset(email);
            this._showAlert('تم إرسال رابط الاستعادة إلى بريدك الإلكتروني ✓', 'success');
            this._setLoading(false);
        } catch (e) {
            this._showAlert(e.message, 'error');
            this._setLoading(false);
        }
    }
};
