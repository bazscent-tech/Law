// ============================================================
// ===== APP ENTRY POINT — نقطة البداية =====================
// ============================================================

import { store } from './core/store.js';
import { initAPI, Auth, Posts, Profiles, Follows } from './core/api.js';
import { router } from './core/router.js';
import { showToast, getAvatarUrl, requireAuth, escapeHtml, timeAgo } from './utils/ui.js';
import { initAuth, tryRestoreSession, showAuthScreen, hideAuthScreen, handleLogin, handleSignup, handleForgot, switchMode as authSwitchMode } from './features/auth.js';

// ===== GLOBAL APP OBJECT (for inline onclick handlers) =====
window.__app = {
    store,
    router,
    initApp,
    auth: { handleLogin, handleSignup, handleForgot, switchMode: authSwitchMode },
    navigate: (page) => router.navigate(page),
    showToast,
};

// ===== BOOTSTRAP =====
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Lawbook v2 starting...');

    // 1. Initialize Supabase
    await initAPI();

    // 2. Try restore session
    const hasSession = await tryRestoreSession();

    if (hasSession && store.get('isLoggedIn')) {
        console.log('✅ Session restored');
        initApp();
    } else {
        console.log('🔒 No session');
        showAuthScreen();
    }
});

// ===== INIT APP (after auth) =====
async function initApp() {
    const profile = store.get('profile');
    if (!profile) return;

    // Update all UI with profile data
    updateProfileUI(profile);

    // Register pages
    registerPages();

    // Initialize router
    router.init();

    // Load initial data
    await Promise.allSettled([
        loadFeedPosts(),
        loadUserPosts(),
    ]);

    console.log('✅ App initialized');
}

// ===== UPDATE PROFILE UI =====
function updateProfileUI(profile) {
    const name = profile.name || 'مستخدم';
    const avatar = getAvatarUrl(profile);
    const username = profile.username ? '@' + profile.username : '';

    // Update all avatars
    document.querySelectorAll('[data-avatar]').forEach(el => el.src = avatar);

    // Update all names
    document.querySelectorAll('[data-user-name]').forEach(el => el.textContent = name);

    // Update username
    document.querySelectorAll('[data-username]').forEach(el => el.textContent = username);

    // Update counts
    document.querySelectorAll('[data-followers]').forEach(el => el.textContent = (profile.followers_count || 0).toLocaleString('ar'));
    document.querySelectorAll('[data-following]').forEach(el => el.textContent = (profile.following_count || 0).toLocaleString('ar'));
    document.querySelectorAll('[data-posts-count]').forEach(el => el.textContent = (profile.posts_count || 0).toLocaleString('ar'));

    // Settings
    const settingsName = document.getElementById('settingsName');
    if (settingsName) settingsName.textContent = name;
    const settingsEmail = document.getElementById('settingsEmail');
    if (settingsEmail) settingsEmail.textContent = store.get('user')?.email || '-';
}

// ===== REGISTER PAGES =====
function registerPages() {
    router.register('feed', { onShow: () => renderFeed() });
    router.register('profile', { onShow: () => renderProfile() });
    router.register('notifications', { onShow: () => renderNotifications() });
    router.register('messages', { onShow: () => renderMessages() });
    router.register('bookmarks', { onShow: () => renderBookmarks() });
    router.register('settings', { onShow: () => {} });
    router.register('articles', { onShow: () => renderArticles() });
    router.register('connections', { onShow: () => renderConnections() });
    router.register('events', { onShow: () => {} });
    router.register('certificates', { onShow: () => {} });
    router.register('trending', { onShow: () => renderTrending() });
    router.register('audio-spaces', { onShow: () => {} });
    router.register('following', { onShow: () => renderFollowing() });
}

// ===== LOAD DATA =====
async function loadFeedPosts() {
    const { data } = await Posts.getAll(50);
    store.set('posts', data);
    renderFeed();
}

async function loadUserPosts() {
    const user = store.get('user');
    if (!user) return;
    const { data } = await Posts.getByUser(user.id);
    store.set('userPosts', data);
}

// ===== RENDER FUNCTIONS =====
function renderFeed() {
    const container = document.getElementById('page-feed');
    if (!container) return;

    const posts = store.get('posts') || [];
    const localPosts = getLocalPosts();

    // Merge and deduplicate
    const allPosts = deduplicatePosts([...localPosts, ...posts]);

    // Remove existing dynamic posts
    container.querySelectorAll('.dynamic-post').forEach(el => el.remove());

    const loader = document.getElementById('infiniteLoader');

    if (allPosts.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'dynamic-post text-center py-12 text-dark-400';
        empty.innerHTML = '<span class="iconify text-4xl mb-3 block" data-icon="lucide:file-text"></span><p class="text-sm">لا توجد منشورات بعد</p>';
        container.insertBefore(empty, loader);
        return;
    }

    allPosts.forEach((post, i) => {
        const div = document.createElement('div');
        div.className = 'dynamic-post';
        div.dataset.postId = post.id;
        div.innerHTML = buildPostHTML(post, i);
        container.insertBefore(div.firstElementChild || div, loader);
    });

    if (loader) loader.style.display = 'none';
}

function renderProfile() {
    const profile = store.get('profile');
    if (!profile) return;

    const userPosts = store.get('userPosts') || [];
    const localPosts = getLocalPosts().filter(p => p.author_id === store.get('user')?.id);
    const allPosts = deduplicatePosts([...localPosts, ...userPosts]);

    const container = document.getElementById('profilePostsList');
    const emptyState = document.getElementById('profileEmptyState');

    if (allPosts.length === 0) {
        if (container) container.innerHTML = '';
        if (emptyState) emptyState.style.display = '';
        return;
    }

    if (emptyState) emptyState.style.display = 'none';
    if (container) {
        container.innerHTML = allPosts.map((post, i) => buildOwnPostHTML(post, profile)).join('');
    }
}

function renderNotifications() { /* TODO */ }
function renderMessages() { /* TODO */ }
function renderBookmarks() { /* TODO */ }
function renderArticles() { /* TODO */ }
function renderConnections() { /* TODO */ }
function renderTrending() { /* TODO */ }
function renderFollowing() { /* TODO */ }

// ===== POST HTML BUILDERS =====
function buildPostHTML(post, index) {
    const profile = post.profiles || {};
    const name = profile.name || 'مستخدم';
    const avatar = getAvatarUrl(profile);
    const verified = profile.verified ? '<span class="iconify text-brand-500 text-sm" data-icon="lucide:badge-check"></span>' : '';
    const role = profile.title || '';
    const time = timeAgo(post.created_at);
    const content = escapeHtml(post.content || '').replace(/\n/g, '<br>');
    const title = post.title ? `<h2 class="font-bold text-base mb-2">${escapeHtml(post.title)}</h2>` : '';
    const tags = (post.tags || []).map(t => `<span class="hashtag bg-brand-500/10 text-brand-400 text-xs font-medium px-3 py-1 rounded-full">${escapeHtml(t)}</span>`).join('');

    return `
    <article class="post-card bg-dark-900/80 border border-dark-800/50 rounded-2xl mb-5 animate-fade-in-up overflow-hidden" style="animation-delay:${index * 80}ms" data-post-id="${post.id}">
        <div class="p-5 pb-0">
            <div class="flex items-start justify-between mb-3">
                <div class="flex items-center gap-3 cursor-pointer" data-navigate="profile" data-author-id="${profile.id}">
                    <img src="${avatar}" class="w-11 h-11 rounded-xl object-cover border border-dark-700" alt="">
                    <div>
                        <div class="flex items-center gap-2"><h3 class="font-semibold text-sm">${escapeHtml(name)}</h3>${verified}</div>
                        <p class="text-dark-400 text-xs">${escapeHtml(role)} • ${time}</p>
                    </div>
                </div>
                <button class="follow-btn flex items-center gap-1.5 bg-dark-800 hover:bg-dark-700 text-brand-400 text-xs font-semibold px-3 py-1.5 rounded-full border border-brand-500/30 transition-all" data-follow="${profile.id}">
                    <span class="iconify text-sm" data-icon="lucide:user-plus"></span><span>متابعة</span>
                </button>
            </div>
            <div class="mb-3 cursor-pointer" data-open-post="${post.id}">
                ${title}
                <p class="text-dark-200 text-sm leading-relaxed">${content}</p>
            </div>
            ${tags ? `<div class="flex flex-wrap gap-2 mb-4">${tags}</div>` : ''}
        </div>
        <div class="px-5 pb-2">
            <div class="flex items-center justify-between text-dark-400 text-xs mb-2">
                <span>${post.likes_count || 0} إعجاب</span>
                <span data-open-post="${post.id}">${post.comments_count || 0} تعليق</span>
            </div>
        </div>
        <div class="border-t border-dark-800/50 px-2 py-1">
            <div class="flex items-center justify-around">
                <button class="like-btn flex items-center gap-2 px-4 py-2.5 rounded-xl hover:bg-dark-800/50 transition-all group" data-like="${post.id}">
                    <span class="iconify text-lg text-dark-400 group-hover:text-red-400" data-icon="lucide:heart"></span>
                    <span class="text-sm text-dark-400 group-hover:text-red-400">${post.likes_count || 0}</span>
                </button>
                <button class="flex items-center gap-2 px-4 py-2.5 rounded-xl hover:bg-dark-800/50 transition-all group" data-open-post="${post.id}">
                    <span class="iconify text-lg text-dark-400 group-hover:text-blue-400" data-icon="lucide:message-circle"></span>
                    <span class="text-sm text-dark-400">${post.comments_count || 0}</span>
                </button>
                <button class="flex items-center gap-2 px-4 py-2.5 rounded-xl hover:bg-dark-800/50 transition-all group" data-share="${post.id}">
                    <span class="iconify text-lg text-dark-400 group-hover:text-green-400" data-icon="lucide:share-2"></span>
                    <span class="text-sm text-dark-400">${post.shares_count || 0}</span>
                </button>
                <button class="bookmark-btn flex items-center gap-2 px-4 py-2.5 rounded-xl hover:bg-dark-800/50 transition-all group" data-bookmark="${post.id}">
                    <span class="iconify text-lg text-dark-400 group-hover:text-brand-400" data-icon="lucide:bookmark"></span>
                </button>
            </div>
        </div>
    </article>`;
}

function buildOwnPostHTML(post, profile) {
    const avatar = getAvatarUrl(profile);
    const time = timeAgo(post.created_at || post.created_at);
    const content = escapeHtml(post.content || post.text || '').replace(/\n/g, '<br>');

    return `
    <article class="post-card bg-dark-900/80 border border-dark-800/50 rounded-2xl mb-5 animate-fade-in-up overflow-hidden" data-post-id="${post.id}">
        <div class="p-5 pb-0">
            <div class="flex items-start justify-between mb-3">
                <div class="flex items-center gap-3 cursor-pointer" data-navigate="profile">
                    <img src="${avatar}" class="w-11 h-11 rounded-xl object-cover border border-dark-700" alt="">
                    <div>
                        <div class="flex items-center gap-2"><h3 class="font-semibold text-sm">${escapeHtml(profile.name)}</h3><span class="iconify text-brand-500 text-sm" data-icon="lucide:badge-check"></span></div>
                        <p class="text-dark-400 text-xs">${escapeHtml(profile.title || '')} • ${time}</p>
                    </div>
                </div>
                <div class="relative">
                    <button class="p-2.5 rounded-xl hover:bg-dark-800/50 transition-all" data-menu="${post.id}">
                        <span class="iconify text-lg text-dark-400" data-icon="lucide:more-horizontal"></span>
                    </button>
                </div>
            </div>
            <div class="mb-3"><p class="text-dark-200 text-sm leading-relaxed">${content}</p></div>
        </div>
        <div class="border-t border-dark-800/50 px-2 py-1">
            <div class="flex items-center justify-around">
                <button class="like-btn flex items-center gap-2 px-4 py-2.5 rounded-xl hover:bg-dark-800/50 transition-all group" data-like="${post.id}">
                    <span class="iconify text-lg text-dark-400 group-hover:text-red-400" data-icon="lucide:heart"></span>
                    <span class="text-sm text-dark-400">${post.likes_count || 0}</span>
                </button>
                <button class="flex items-center gap-2 px-4 py-2.5 rounded-xl hover:bg-dark-800/50 transition-all group" data-open-post="${post.id}">
                    <span class="iconify text-lg text-dark-400 group-hover:text-blue-400" data-icon="lucide:message-circle"></span>
                    <span class="text-sm text-dark-400">${post.comments_count || 0}</span>
                </button>
                <button class="bookmark-btn flex items-center gap-2 px-4 py-2.5 rounded-xl hover:bg-dark-800/50 transition-all group" data-bookmark="${post.id}">
                    <span class="iconify text-lg text-dark-400 group-hover:text-brand-400" data-icon="lucide:bookmark"></span>
                </button>
            </div>
        </div>
    </article>`;
}

// ===== EVENT DELEGATION =====
document.addEventListener('click', async (e) => {
    // Like
    const likeBtn = e.target.closest('[data-like]');
    if (likeBtn) {
        if (!requireAuth()) return;
        const postId = likeBtn.dataset.like;
        likeBtn.classList.toggle('liked');
        likeBtn.style.transform = 'scale(1.15)';
        setTimeout(() => likeBtn.style.transform = '', 200);
        const { Likes } = await import('./core/api.js');
        await Likes.toggle(postId);
        return;
    }

    // Bookmark
    const bookmarkBtn = e.target.closest('[data-bookmark]');
    if (bookmarkBtn) {
        if (!requireAuth()) return;
        const postId = bookmarkBtn.dataset.bookmark;
        bookmarkBtn.classList.toggle('saved');
        const icon = bookmarkBtn.querySelector('.iconify');
        if (bookmarkBtn.classList.contains('saved')) {
            icon.setAttribute('data-icon', 'lucide:bookmark-check');
            icon.style.color = '#f97316';
            showToast('تم الحفظ ✓');
        } else {
            icon.setAttribute('data-icon', 'lucide:bookmark');
            icon.style.color = '';
            showToast('تم إلغاء الحفظ');
        }
        const { Bookmarks } = await import('./core/api.js');
        await Bookmarks.toggle(postId);
        return;
    }

    // Follow
    const followBtn = e.target.closest('[data-follow]');
    if (followBtn) {
        if (!requireAuth()) return;
        const userId = followBtn.dataset.follow;
        const isFollowing = followBtn.classList.toggle('following');
        if (isFollowing) {
            followBtn.innerHTML = '<span class="iconify text-sm" data-icon="lucide:check"></span><span>متابَع</span>';
            followBtn.style.color = '#a3a3a3';
            followBtn.style.borderColor = '#525252';
        } else {
            followBtn.innerHTML = '<span class="iconify text-sm" data-icon="lucide:user-plus"></span><span>متابعة</span>';
            followBtn.style.color = '#f97316';
            followBtn.style.borderColor = 'rgba(249,115,22,0.3)';
        }
        await Follows.toggle(userId);
        return;
    }

    // Open post detail
    const postEl = e.target.closest('[data-open-post]');
    if (postEl) {
        // TODO: open post detail modal
        showToast('عرض المنشور');
        return;
    }
});

// ===== LOCAL POSTS (localStorage fallback) =====
function getLocalPosts() {
    try {
        const user = store.get('user');
        if (!user) return [];
        const key = 'user_' + user.id + '_userPosts';
        return JSON.parse(localStorage.getItem(key) || '[]');
    } catch(e) { return []; }
}

function saveLocalPost(post) {
    const user = store.get('user');
    if (!user) return;
    const key = 'user_' + user.id + '_userPosts';
    const posts = getLocalPosts();
    posts.unshift(post);
    try { localStorage.setItem(key, JSON.stringify(posts)); } catch(e) {}
}

function deduplicatePosts(posts) {
    const seen = new Set();
    return posts.filter(p => {
        const id = p.id || p.sbId;
        if (seen.has(id)) return false;
        seen.add(id);
        return true;
    });
}
