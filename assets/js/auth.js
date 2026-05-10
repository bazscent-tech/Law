// ============================================================
// ===== AUTH MANAGER — نظام إدارة الحسابات المتعددة =========
// ============================================================
// كل حساب = هوية مستقلة بالكامل
// - Supabase Auth session حقيقي
// - localStorage معزول per user
// - تبديل حساب = تسجيل دخول جديد
// ============================================================

const Auth = {
    _currentUserId: null,
    _accounts: [],

    // ===== INITIALIZATION =====
    async init() {
        // Load accounts list from localStorage (not user-scoped)
        this._accounts = Safe.getJSON('auth_accounts', []);

        // Try to restore last session
        const lastUserId = Safe.getString('auth_current_user', '');
        if (lastUserId) {
            const restored = await this._restoreSession(lastUserId);
            if (restored) return restored;
        }

        // No valid session — show login screen
        return null;
    },

    // ===== SIGN IN (create new anonymous account) =====
    async signIn(displayName) {
        if (!sb) return null;
        try {
            // Sign out any existing Supabase session first
            await sb.auth.signOut();

            // Create a real Supabase anonymous auth session
            const { data: authData, error: authError } = await sb.auth.signInAnonymously();
            if (authError) throw authError;

            const userId = authData.user.id;
            const session = authData.session;

            // Create profile in Supabase
            const profileData = {
                id: userId,
                username: 'user_' + userId.substring(0, 8),
                display_name: displayName || 'مستخدم جديد',
                bio: '',
                title: '',
                location: '',
                website: '',
                avatar_url: '',
                cover_url: '',
                is_verified: false
            };

            const { error: profileError } = await sb.from('profiles').upsert(profileData);
            if (profileError) console.warn('Profile creation warning:', profileError.message);

            // Save session to localStorage
            this._saveSession(userId, session.access_token, profileData);

            // Register account
            this._registerAccount(userId, profileData.display_name, session.access_token);

            // Set globals
            this._currentUserId = userId;
            sbUser = { id: userId };
            sbProfile = profileData;
            sbOnline = true;

            return { userId, profile: profileData };
        } catch (e) {
            console.error('[Auth] Sign in failed:', e.message);
            return null;
        }
    },

    // ===== SIGN OUT =====
    async signOut() {
        if (sb) {
            await sb.auth.signOut();
        }
        this._currentUserId = null;
        sbUser = null;
        sbProfile = null;
        Safe.setString('auth_current_user', '');
    },

    // ===== SWITCH ACCOUNT =====
    async switchAccount(userId) {
        if (userId === this._currentUserId) return true;

        const account = this._accounts.find(a => a.userId === userId);
        if (!account) return false;

        try {
            // Sign out current session
            if (sb) await sb.auth.signOut();

            // Try to restore this account's session
            const restored = await this._restoreSession(userId);
            if (restored) return true;

            // If restore failed, create new anonymous session
            // and re-link to the same profile
            const { data: authData, error } = await sb.auth.signInAnonymously();
            if (error) throw error;

            // Update session token
            this._saveSession(userId, authData.session.access_token, account.profile);
            account.token = authData.session.access_token;
            this._saveAccounts();

            // Set globals
            this._currentUserId = userId;
            sbUser = { id: userId };
            sbProfile = account.profile;

            return true;
        } catch (e) {
            console.error('[Auth] Switch failed:', e.message);
            // Remove invalid account
            this._accounts = this._accounts.filter(a => a.userId !== userId);
            this._saveAccounts();
            return false;
        }
    },

    // ===== ADD NEW ACCOUNT =====
    async addAccount(displayName) {
        return await this.signIn(displayName);
    },

    // ===== REMOVE ACCOUNT =====
    removeAccount(userId) {
        this._accounts = this._accounts.filter(a => a.userId !== userId);
        this._saveAccounts();
        // Clean up that user's localStorage data
        this._cleanupUserData(userId);
    },

    // ===== GETTERS =====
    getCurrentUserId() {
        return this._currentUserId;
    },

    getAccounts() {
        return [...this._accounts];
    },

    getCurrentAccount() {
        return this._accounts.find(a => a.userId === this._currentUserId) || null;
    },

    isLoggedIn() {
        return !!this._currentUserId;
    },

    // ===== INTERNAL: SESSION MANAGEMENT =====
    _saveSession(userId, token, profile) {
        Safe.setString('auth_current_user', userId);
        Safe.setString('auth_token_' + userId, token);
        Safe.setJSON('auth_profile_' + userId, profile);
    },

    async _restoreSession(userId) {
        if (!sb) return null;

        const token = Safe.getString('auth_token_' + userId, '');
        const profile = Safe.getJSON('auth_profile_' + userId, null);

        if (!token || !profile) return null;

        try {
            // Try to set the session
            const { data, error } = await sb.auth.setSession({
                access_token: token,
                refresh_token: token // For anonymous, we use same token
            });

            if (error) {
                // Session expired — try to create new one
                const { data: freshData, error: freshError } = await sb.auth.signInAnonymously();
                if (freshError) throw freshError;

                this._saveSession(userId, freshData.session.access_token, profile);
                const acc = this._accounts.find(a => a.userId === userId);
                if (acc) acc.token = freshData.session.access_token;
                this._saveAccounts();

                this._currentUserId = userId;
                sbUser = { id: userId };
                sbProfile = profile;
                sbOnline = true;
                return { userId, profile };
            }

            this._currentUserId = userId;
            sbUser = { id: userId };
            sbProfile = profile;
            sbOnline = true;
            return { userId, profile };
        } catch (e) {
            console.warn('[Auth] Session restore failed for', userId, e.message);
            return null;
        }
    },

    _registerAccount(userId, displayName, token) {
        if (!this._accounts.find(a => a.userId === userId)) {
            this._accounts.push({
                userId,
                displayName,
                token,
                profile: Safe.getJSON('auth_profile_' + userId, {}),
                addedAt: Date.now()
            });
            this._saveAccounts();
        }
    },

    _saveAccounts() {
        Safe.setJSON('auth_accounts', this._accounts);
    },

    _cleanupUserData(userId) {
        // Remove all localStorage keys for this user
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('user_' + userId + '_')) {
                keysToRemove.push(key);
            }
        }
        keysToRemove.forEach(k => localStorage.removeItem(k));
    },

    // ===== UI: LOGIN SCREEN =====
    showLoginScreen() {
        const overlay = document.createElement('div');
        overlay.id = 'authLoginScreen';
        overlay.className = 'fixed inset-0 z-[9999] flex items-center justify-center bg-dark-950';
        overlay.innerHTML = `
            <div class="w-full max-w-md mx-4 animate-fade-in-up">
                <div class="text-center mb-8">
                    <div class="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center">
                        <span class="iconify text-white text-4xl" data-icon="lucide:scale"></span>
                    </div>
                    <h1 class="text-2xl font-bold text-white mb-2">قانون بوكت</h1>
                    <p class="text-dark-400 text-sm">منصة التواصل القانوني</p>
                </div>
                <div class="bg-dark-900/80 border border-dark-800/50 rounded-2xl p-6 space-y-4">
                    <div>
                        <label class="text-xs text-dark-400 block mb-2">اسمك</label>
                        <input type="text" id="authDisplayName" class="w-full bg-dark-850 border border-dark-700/50 rounded-xl px-4 py-3 text-sm text-white placeholder-dark-400 focus:outline-none focus:border-brand-500/50 transition-all" placeholder="أدخل اسمك..." value="">
                    </div>
                    <button id="authSignInBtn" onclick="Auth._handleLogin()" class="w-full bg-brand-500 hover:bg-brand-600 text-white font-semibold py-3 rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2">
                        <span class="iconify text-lg" data-icon="lucide:log-in"></span>
                        <span>دخول</span>
                    </button>
                    ${this._accounts.length > 0 ? `
                    <div class="border-t border-dark-800/50 pt-4">
                        <p class="text-xs text-dark-400 mb-3">أو ادخل بحساب موجود:</p>
                        <div class="space-y-2">
                            ${this._accounts.map(acc => `
                                <button onclick="Auth._handleSwitch('${acc.userId}')" class="w-full flex items-center gap-3 p-3 bg-dark-850 hover:bg-dark-800 rounded-xl border border-dark-700/30 transition-all">
                                    <div class="w-9 h-9 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white font-bold text-sm shrink-0">
                                        ${(acc.displayName || 'م').charAt(0)}
                                    </div>
                                    <div class="text-right flex-1 min-w-0">
                                        <p class="text-sm font-medium text-white truncate">${acc.displayName || 'مستخدم'}</p>
                                        <p class="text-[10px] text-dark-500">${new Date(acc.addedAt).toLocaleDateString('ar-SA')}</p>
                                    </div>
                                    <span class="iconify text-dark-500" data-icon="lucide:chevron-left"></span>
                                </button>
                            `).join('')}
                        </div>
                    </div>
                    ` : ''}
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        document.body.style.overflow = 'hidden';

        // Focus input
        setTimeout(() => {
            const input = document.getElementById('authDisplayName');
            if (input) input.focus();
        }, 300);
    },

    hideLoginScreen() {
        const overlay = document.getElementById('authLoginScreen');
        if (overlay) {
            overlay.remove();
            document.body.style.overflow = '';
        }
    },

    async _handleLogin() {
        const input = document.getElementById('authDisplayName');
        const btn = document.getElementById('authSignInBtn');
        const name = input ? input.value.trim() : '';

        if (!name) {
            showToast('أدخل اسمك أولاً');
            input?.focus();
            return;
        }

        btn.disabled = true;
        btn.innerHTML = '<span class="iconify text-lg animate-spin" data-icon="lucide:loader-2"></span><span>جاري الدخول...</span>';

        const result = await this.signIn(name);
        if (result) {
            this.hideLoginScreen();
            showToast('مرحباً ' + result.profile.display_name + ' 👋');
            // Initialize app for this user
            if (typeof onAuthSuccess === 'function') {
                await onAuthSuccess(result);
            }
        } else {
            showToast('فشل تسجيل الدخول، حاول مرة أخرى');
            btn.disabled = false;
            btn.innerHTML = '<span class="iconify text-lg" data-icon="lucide:log-in"></span><span>دخول</span>';
        }
    },

    async _handleSwitch(userId) {
        showToast('جاري التبديل...');
        const success = await this.switchAccount(userId);
        if (success) {
            this.hideLoginScreen();
            showToast('تم التبديل ✓');
            if (typeof onAuthSuccess === 'function') {
                await onAuthSuccess({ userId, profile: sbProfile });
            }
        } else {
            showToast('فشل التبديل، أنشئ حساباً جديداً');
        }
    },

    // ===== UI: ACCOUNT SWITCHER (in settings) =====
    showAccountSwitcher() {
        let modal = document.getElementById('accountSwitcherModal');
        if (modal) modal.remove();

        modal = document.createElement('div');
        modal.id = 'accountSwitcherModal';
        modal.className = 'modal-overlay';
        modal.onclick = function(e) { if (e.target === this) this.classList.remove('active'); };

        const accounts = this.getAccounts();
        const currentId = this.getCurrentUserId();

        modal.innerHTML = `
            <div class="bg-dark-900 border border-dark-700/50 rounded-2xl w-[95%] max-w-md mx-4 max-h-[80vh] overflow-y-auto" onclick="event.stopPropagation()">
                <div class="flex items-center justify-between p-5 border-b border-dark-800/50 sticky top-0 bg-dark-900 z-10">
                    <h3 class="font-bold text-base">تبديل الحساب</h3>
                    <button onclick="document.getElementById('accountSwitcherModal').classList.remove('active')" class="p-1.5 rounded-lg hover:bg-dark-800">
                        <span class="iconify text-dark-400 text-xl" data-icon="lucide:x"></span>
                    </button>
                </div>
                <div class="p-4 space-y-2">
                    ${accounts.map(acc => `
                        <div class="flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${acc.userId === currentId ? 'bg-brand-500/10 border-brand-500/30' : 'bg-dark-850 border-dark-700/30 hover:border-dark-600'}" onclick="${acc.userId !== currentId ? `Auth._doSwitch('${acc.userId}')` : ''}">
                            <div class="w-11 h-11 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white font-bold shrink-0">
                                ${(acc.displayName || 'م').charAt(0)}
                            </div>
                            <div class="flex-1 min-w-0">
                                <div class="flex items-center gap-2">
                                    <p class="text-sm font-semibold text-white truncate">${acc.displayName || 'مستخدم'}</p>
                                    ${acc.userId === currentId ? '<span class="text-[10px] bg-brand-500/20 text-brand-400 px-2 py-0.5 rounded-full">الحالي</span>' : ''}
                                </div>
                                <p class="text-[10px] text-dark-500">انضم ${new Date(acc.addedAt).toLocaleDateString('ar-SA')}</p>
                            </div>
                            ${acc.userId !== currentId ? `
                            <button onclick="event.stopPropagation();Auth._confirmRemove('${acc.userId}','${acc.displayName}')" class="p-2 rounded-lg hover:bg-red-500/10 text-dark-500 hover:text-red-400 transition-all">
                                <span class="iconify text-sm" data-icon="lucide:trash-2"></span>
                            </button>
                            ` : ''}
                        </div>
                    `).join('')}
                </div>
                <div class="p-4 border-t border-dark-800/50">
                    <button onclick="Auth._addNewFromSwitcher()" class="w-full flex items-center justify-center gap-2 p-3 bg-dark-800 hover:bg-dark-700 rounded-xl border border-dark-700 transition-all text-sm">
                        <span class="iconify text-brand-400" data-icon="lucide:user-plus"></span>
                        <span class="text-white">إضافة حساب جديد</span>
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    },

    async _doSwitch(userId) {
        const modal = document.getElementById('accountSwitcherModal');
        showToast('جاري التبديل...');
        const success = await this.switchAccount(userId);
        if (success) {
            if (modal) modal.classList.remove('active');
            document.body.style.overflow = '';
            showToast('تم التبديل إلى ' + (sbProfile?.display_name || 'الحساب'));
            // Reload app state for new user
            if (typeof onAuthSuccess === 'function') {
                await onAuthSuccess({ userId, profile: sbProfile });
            }
        } else {
            showToast('فشل التبديل');
        }
    },

    _confirmRemove(userId, name) {
        if (confirm(`هل تريد إزالة حساب "${name}"؟\nسيتم حذف جميع بياناته المحلية.`)) {
            this.removeAccount(userId);
            showToast('تم إزالة الحساب');
            // Refresh the switcher
            document.getElementById('accountSwitcherModal')?.classList.remove('active');
            document.body.style.overflow = '';
            if (this._accounts.length === 0) {
                this.showLoginScreen();
            } else {
                this.showAccountSwitcher();
            }
        }
    },

    async _addNewFromSwitcher() {
        document.getElementById('accountSwitcherModal')?.classList.remove('active');
        document.body.style.overflow = '';
        this.showLoginScreen();
    }
};
