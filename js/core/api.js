// ============================================================
// ===== API LAYER — Supabase integration =====================
// ============================================================

import { store } from './store.js';

const SB_URL = 'https://wxokmokxehssnchtmjke.supabase.co';
const SB_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4b2ttb2t4ZWhzc25jaHRtamtlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgzMTg4MjQsImV4cCI6MjA5Mzg5NDgyNH0.6RRUCXnX7IdExnirAr4Uz3Y-PmJbMMB00JVDr1BbDkU';
const SB_SERVICE = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4b2ttb2t4ZWhzc25jaHRtamtlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODMxODgyNCwiZXhwIjoyMDkzODk0ODI0fQ.AN5SkazpJVm4R-6Pdh2ZqvzqhNIM-Mu2XHCbrCmqs3g';

let sb = null;

export async function initAPI() {
    try {
        if (typeof supabase === 'undefined' || !supabase.createClient) {
            console.warn('[API] Supabase not loaded');
            return false;
        }
        sb = supabase.createClient(SB_URL, SB_ANON, {
            auth: {
                persistSession: true,
                autoRefreshToken: true,
                storageKey: 'lawbook_auth',
                storage: window.localStorage,
            }
        });
        store.set('supabaseClient', sb);
        const { error } = await sb.from('profiles').select('id').limit(1);
        if (error) throw error;
        store.set('isOnline', true);
        console.log('[API] Connected');
        return true;
    } catch (e) {
        console.warn('[API] Unavailable:', e.message);
        store.set('isOnline', false);
        return false;
    }
}

// ===== AUTH =====
export const Auth = {
    async getSession() {
        if (!sb) return null;
        try {
            const { data: { session } } = await sb.auth.getSession();
            if (session?.user) {
                store.set('user', session.user);
                store.set('isLoggedIn', true);
                return session;
            }
            const { data: { session: refreshed } } = await sb.auth.refreshSession();
            if (refreshed?.user) {
                store.set('user', refreshed.user);
                store.set('isLoggedIn', true);
                return refreshed;
            }
        } catch (e) { console.warn('[Auth]', e.message); }
        return null;
    },

    async signIn(email, password) {
        if (!sb) return { error: 'الخدمة غير متاحة حالياً' };
        const { data, error } = await sb.auth.signInWithPassword({ email, password });
        if (error) return { error: translateError(error.message) };
        store.set('user', data.user);
        store.set('isLoggedIn', true);
        return { data };
    },

    async signUp(email, password, name, username, phone) {
        if (!sb) return { error: 'الخدمة غير متاحة حالياً' };
        const available = await Auth.checkUsernameAvailable(username);
        if (!available) return { error: 'هذا المعرف مستخدم بالفعل، اختر معرفاً آخر' };
        const { data, error } = await sb.auth.signUp({
            email, password,
            options: { data: { display_name: name, username, phone }, emailRedirectTo: undefined }
        });
        if (error) return { error: translateError(error.message) };
        if (data?.session) {
            store.set('user', data.user);
            store.set('isLoggedIn', true);
            await Profiles.ensureProfile(data.user, { name, username, phone });
            return { data };
        }
        if (data?.user && !data?.session) {
            const confirmed = await Auth._adminConfirm(data.user.id);
            if (confirmed) {
                const { data: sd, error: se } = await sb.auth.signInWithPassword({ email, password });
                if (!se && sd?.session) {
                    store.set('user', sd.user);
                    store.set('isLoggedIn', true);
                    await Profiles.ensureProfile(sd.user, { name, username, phone });
                    return { data: sd };
                }
            }
            return { data, needsEmail: true };
        }
        return { data };
    },

    async _adminConfirm(userId) {
        try {
            const res = await fetch(`${SB_URL}/auth/v1/admin/users/${userId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'apikey': SB_SERVICE, 'Authorization': `Bearer ${SB_SERVICE}` },
                body: JSON.stringify({ email_confirm: true })
            });
            return res.ok;
        } catch(e) { return false; }
    },

    async checkUsernameAvailable(username) {
        if (!sb || !username) return false;
        try {
            const { data } = await sb.from('profiles').select('username').eq('username', username.toLowerCase()).maybeSingle();
            return !data;
        } catch(e) { return true; }
    },

    async signOut() {
        if (sb) await sb.auth.signOut();
        store.set('user', null); store.set('profile', null); store.set('isLoggedIn', false);
        localStorage.removeItem('lawbook_auth');
        window.location.reload();
    },

    onAuthChange(callback) {
        if (!sb) return;
        sb.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN' && session) { store.set('user', session.user); store.set('isLoggedIn', true); }
            else if (event === 'SIGNED_OUT') { store.set('user', null); store.set('isLoggedIn', false); }
            callback(event, session);
        });
    }
};

// ===== PROFILES =====
export const Profiles = {
    async get(userId) {
        if (!sb) return { error: 'Offline' };
        const { data, error } = await sb.from('profiles').select('*').eq('id', userId).maybeSingle();
        return { data, error };
    },

    async update(userId, updates) {
        if (!sb) return { error: 'Offline' };
        const { data, error } = await sb.from('profiles')
            .update({ ...updates, updated_at: new Date().toISOString() })
            .eq('id', userId).select().single();
        if (!error && data) store.set('profile', data);
        return { data, error };
    },

    async search(query) {
        if (!sb) return { data: [] };
        const { data } = await sb.from('profiles')
            .select('*').or(`name.ilike.%${query}%,username.ilike.%${query}%`).limit(15);
        return { data: data || [] };
    },

    async ensureProfile(user, extra = {}) {
        if (!sb) return null;
        const { data: existing } = await sb.from('profiles').select('*').eq('id', user.id).maybeSingle();
        if (existing) { store.set('profile', existing); cacheProfile(user.id, existing); return existing; }
        const meta = user.user_metadata || {};
        const name = extra.name || meta.display_name || meta.full_name || 'مستخدم';
        const username = extra.username || meta.username || generateUsername(name);
        const phone = extra.phone || meta.phone || '';
        const newProfile = {
            id: user.id, username: username.toLowerCase(), name, phone,
            bio: '', title: '', location: '', website: '',
            avatar_url: `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(name)}&backgroundColor=f97316&textColor=ffffff&fontSize=38`,
            cover_url: '', followers_count: 0, following_count: 0, posts_count: 0, verified: false
        };
        const { data: created } = await sb.from('profiles').insert(newProfile).select().single();
        if (created) { store.set('profile', created); cacheProfile(user.id, created); }
        return created || newProfile;
    }
};

// ===== POSTS =====
export const Posts = {
    async getAll(limit = 50) {
        if (!sb) return { data: [] };
        const { data, error } = await sb.from('posts')
            .select('*, profiles(*)')
            .order('created_at', { ascending: false }).limit(limit);
        return { data: data || [], error };
    },

    async getPopular(limit = 20) {
        if (!sb) return { data: [] };
        const { data } = await sb.from('posts')
            .select('*, profiles(*)')
            .order('likes_count', { ascending: false }).limit(limit);
        return { data: data || [] };
    },

    async getByUser(userId) {
        if (!sb) return { data: [] };
        const { data } = await sb.from('posts')
            .select('*, profiles(*)').eq('author_id', userId)
            .order('created_at', { ascending: false });
        return { data: data || [] };
    },

    async create(content, title = '', tags = [], imageUrl = null) {
        const user = store.get('user');
        if (!sb || !user) return { error: 'Not authenticated' };
        const insert = { author_id: user.id, content, title, tags };
        if (imageUrl) insert.image_url = imageUrl;
        const { data, error } = await sb.from('posts').insert(insert).select('*, profiles(*)').single();
        return { data, error };
    },

    async update(postId, updates) {
        const user = store.get('user');
        if (!sb || !user) return { error: 'Not authenticated' };
        const { data, error } = await sb.from('posts')
            .update({ ...updates, is_edited: true, updated_at: new Date().toISOString() })
            .eq('id', postId).eq('author_id', user.id).select().single();
        return { data, error };
    },

    async delete(postId) {
        const user = store.get('user');
        if (!sb || !user) return { error: 'Not authenticated' };
        await sb.from('posts').delete().eq('id', postId).eq('author_id', user.id);
        return { data: null, error: null };
    }
};

// ===== INTERACTIONS =====
export const Likes = {
    async toggle(postId) {
        const user = store.get('user');
        if (!sb || !user) return { error: 'Not authenticated' };
        const { data: existing } = await sb.from('likes').select('id').eq('user_id', user.id).eq('post_id', postId).maybeSingle();
        if (existing) { await sb.from('likes').delete().eq('id', existing.id); return { data: false }; }
        await sb.from('likes').insert({ user_id: user.id, post_id: postId });
        return { data: true };
    }
};

export const Comments = {
    async get(postId) {
        if (!sb) return { data: [] };
        const { data } = await sb.from('comments').select('*, profiles(*)').eq('post_id', postId).order('created_at');
        return { data: data || [] };
    },
    async add(postId, content) {
        const user = store.get('user');
        if (!sb || !user) return { error: 'Not authenticated' };
        const { data, error } = await sb.from('comments').insert({ post_id: postId, author_id: user.id, content }).select('*, profiles(*)').single();
        return { data, error };
    }
};

export const Follows = {
    async toggle(userId) {
        const user = store.get('user');
        if (!sb || !user) return { error: 'Not authenticated' };
        const { data: existing } = await sb.from('follows').select('id').eq('follower_id', user.id).eq('following_id', userId).maybeSingle();
        if (existing) { await sb.from('follows').delete().eq('id', existing.id); return { data: false }; }
        await sb.from('follows').insert({ follower_id: user.id, following_id: userId });
        return { data: true };
    }
};

export const Bookmarks = {
    async toggle(postId) {
        const user = store.get('user');
        if (!sb || !user) return { error: 'Not authenticated' };
        const { data: existing } = await sb.from('bookmarks').select('id').eq('user_id', user.id).eq('post_id', postId).maybeSingle();
        if (existing) { await sb.from('bookmarks').delete().eq('id', existing.id); return { data: false }; }
        await sb.from('bookmarks').insert({ user_id: user.id, post_id: postId });
        return { data: true };
    }
};

// ===== HELPERS =====
function cacheProfile(userId, data) {
    try { localStorage.setItem('auth_profile_' + userId, JSON.stringify(data)); } catch(e) {}
}

function generateUsername(name) {
    const map = {'ا':'a','أ':'a','إ':'a','آ':'a','ب':'b','ت':'t','ث':'th','ج':'j','ح':'h','خ':'kh','د':'d','ذ':'dh','ر':'r','ز':'z','س':'s','ش':'sh','ص':'s','ض':'d','ط':'t','ظ':'z','ع':'a','غ':'gh','ف':'f','ق':'q','ك':'k','ل':'l','م':'m','ن':'n','ه':'h','و':'w','ي':'y','ة':'a','ى':'a','ء':'a',' ':'_'};
    let base = '';
    for (const c of name) base += map[c] || c;
    base = base.toLowerCase().replace(/[^a-z0-9_]/g, '').replace(/_+/g, '_').substring(0, 20);
    if (base.length < 2) base = 'user';
    return base + '_' + Math.floor(Math.random() * 9000 + 1000);
}

function translateError(msg) {
    const map = {
        'Invalid login credentials': 'البريد أو كلمة المرور غير صحيحة',
        'User already registered': 'هذا البريد الإلكتروني مسجل بالفعل',
        'Email not confirmed': 'يرجى تأكيد البريد الإلكتروني',
        'Password should be at least 6 characters': 'كلمة المرور يجب أن تكون 6 أحرف على الأقل',
        'Unable to validate email address': 'البريد الإلكتروني غير صالح',
        'signup is disabled': 'التسجيل معطل حالياً',
        'Email rate limit exceeded': 'حاول مرة أخرى لاحقاً',
    };
    for (const [en, ar] of Object.entries(map)) if (msg.includes(en)) return ar;
    return msg;
}

export function isConnected() { return store.get('isOnline') && !!sb; }
