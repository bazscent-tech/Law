// ============================================================
// ===== APP ENTRY POINT =====
// ============================================================

import { store } from './core/store.js';
import { initAPI, Auth, Posts, Profiles, Follows, Likes, Bookmarks } from './core/api.js';
import { router } from './core/router.js';
import { showToast, getAvatarUrl, requireAuth, showAuthPrompt, escapeHtml, timeAgo } from './utils/ui.js';
import {
    initAuth, tryRestoreSession,
    showAuthScreen, hideAuthScreen,
    handleLogin, handleSignup, handleForgot,
    switchMode as authSwitchMode,
    checkUsernameRealtime, autoFillUsername
} from './features/auth.js';

// ===== GLOBAL =====
window.__app = {
    store, router, initApp, initGuestMode,
    auth: {
        handleLogin, handleSignup, handleForgot,
        switchMode: authSwitchMode,
        showAuthScreen,
        checkUsernameRealtime,
        autoFillUsername,
        signOut: () => Auth.signOut(),
    },
    navigate: (page) => router.navigate(page),
    showToast,
};

// ===== BOOTSTRAP =====
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Lawbook starting...');

    const connected = await initAPI();
    const hasSession = connected ? await tryRestoreSession() : false;

    if (hasSession && store.get('isLoggedIn')) {
        initApp();
    } else {
        // Guest mode — show popular posts without login
        initGuestMode();
    }
});

// ===== GUEST MODE =====
async function initGuestMode() {
    console.log('👁 Guest mode');
    store.set('isLoggedIn', false);

    // Show guest UI
    setupGuestUI();
    setupGuestNavigation();

    // Load popular posts for guests
    const { data } = await Posts.getPopular(15);
    store.set('posts', data);

    // Init router in guest mode
    router.init();
    registerGuestPages();

    const hash = window.location.hash.replace('#', '') || 'feed';
    router.navigate(hash === 'feed' ? 'feed' : 'feed');

    renderFeed(true);
}

function setupGuestUI() {
    // Replace avatar buttons with guest elements
    document.querySelectorAll('[data-avatar]').forEach(img => {
        img.src = 'https://api.dicebear.com/7.x/shapes/svg?seed=guest&backgroundColor=262626';
        img.style.opacity = '0.5';
    });

    // Hide create post area
    const createPost = document.querySelector('#page-feed .bg-dark-900\\/80:first-child');

    // Show guest banner
    showGuestBanner();

    // Update header for guest
    updateHeaderForGuest();
}

function showGuestBanner() {
    const banner = document.getElementById('guestBanner');
    if (banner) banner.style.display = 'flex';
}

function updateHeaderForGuest() {
    // Update mobile header button to show login
    const mobileAvatar = document.querySelector('.lg\\:hidden .p-2');
    if (mobileAvatar) {
        mobileAvatar.onclick = () => showAuthScreen('login');
        mobileAvatar.innerHTML = '<span style="font-size:13px;font-weight:600;color:#f97316;font-family:\'Noto Kufi Arabic\',sans-serif;">دخول</span>';
    }
}

function setupGuestNavigation() {
    // Block bottom nav items for guests (except feed)
    const blockedPages = ['profile', 'messages', 'bookmarks', 'notifications'];
    document.querySelectorAll('.bottom-nav-item').forEach(btn => {
        const page = btn.dataset.navigate;
        if (blockedPages.includes(page)) {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopImmediatePropagation();
                showAuthPrompt('الوصول لهذه الصفحة');
            }, true);
        }
    });

    // Block search
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('focus', () => {
            searchInput.blur();
            showAuthPrompt('البحث');
        });
    }

    // Block post modal
    window.showPostModal = () => showAuthPrompt('النشر');
}

function registerGuestPages() {
    router.register('feed', { onShow: () => renderFeed(true) });
    router.register('trending', { onShow: () => {} });
    // All other pages redirect to auth
    ['profile','messages','bookmarks','notifications','articles','settings','following','connections','audio-spaces','events','certificates'].forEach(page => {
        router.register(page, {
            onShow: () => {
                router.navigate('feed');
                showAuthPrompt('الوصول لهذه الصفحة');
            }
        });
    });
}

// ===== INIT APP (after auth) =====
async function initApp() {
    const profile = store.get('profile');
    if (!profile) return;

    updateProfileUI(profile);
    registerPages();
    router.init();

    // Hide guest banner
    const banner = document.getElementById('guestBanner');
    if (banner) banner.style.display = 'none';

    // Show create post area
    const createPostArea = document.getElementById('createPostArea');
    if (createPostArea) createPostArea.style.display = '';

    // Show edit profile button
    const editBtn = document.getElementById('editProfileBtn');
    if (editBtn) editBtn.classList.remove('hidden');

    await Promise.allSettled([
        loadFeedPosts(),
        loadUserPosts(),
    ]);

    // Set active nav
    const hash = window.location.hash.replace('#', '') || 'feed';
    router.navigate(hash);

    console.log('✅ App initialized');
}

function updateProfileUI(profile) {
    const name = profile.name || 'مستخدم';
    const avatar = getAvatarUrl(profile);
    const username = profile.username ? '@' + profile.username : '';

    document.querySelectorAll('[data-avatar]').forEach(el => { el.src = avatar; el.style.opacity = ''; });
    document.querySelectorAll('[data-user-name]').forEach(el => el.textContent = name);
    document.querySelectorAll('[data-username]').forEach(el => el.textContent = username);
    document.querySelectorAll('[data-followers]').forEach(el => el.textContent = (profile.followers_count || 0).toLocaleString('ar'));
    document.querySelectorAll('[data-following]').forEach(el => el.textContent = (profile.following_count || 0).toLocaleString('ar'));
    document.querySelectorAll('[data-posts-count]').forEach(el => el.textContent = (profile.posts_count || 0).toLocaleString('ar'));

    const settingsName = document.getElementById('settingsName');
    if (settingsName) settingsName.textContent = name;
    const settingsEmail = document.getElementById('settingsEmail');
    if (settingsEmail) settingsEmail.textContent = store.get('user')?.email || '-';
    const settingsUsername = document.getElementById('settingsUsername');
    if (settingsUsername) settingsUsername.textContent = username;
}

function registerPages() {
    router.register('feed', { onShow: () => renderFeed() });
    router.register('profile', { onShow: () => renderProfile() });
    router.register('notifications', { onShow: () => renderNotifications() });
    router.register('messages', { onShow: () => renderMessages() });
    router.register('bookmarks', { onShow: () => renderBookmarks() });
    router.register('settings', { onShow: () => {} });
    router.register('articles', { onShow: () => renderArticles() });
    router.register('connections', { onShow: () => {} });
    router.register('events', { onShow: () => {} });
    router.register('certificates', { onShow: () => {} });
    router.register('trending', { onShow: () => {} });
    router.register('audio-spaces', { onShow: () => {} });
    router.register('following', { onShow: () => renderFollowing() });
}

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
function renderFeed(isGuest = false) {
    const container = document.getElementById('page-feed');
    if (!container) return;

    const posts = store.get('posts') || [];
    const localPosts = isGuest ? [] : getLocalPosts();
    const allPosts = deduplicatePosts([...localPosts, ...posts]);

    container.querySelectorAll('.dynamic-post').forEach(el => el.remove());

    // Hide create post for guests
    const createPostArea = container.querySelector('#createPostArea');
    if (isGuest && createPostArea) createPostArea.style.display = 'none';

    const loader = document.getElementById('infiniteLoader');

    if (allPosts.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'dynamic-post text-center py-16 text-dark-400';
        empty.innerHTML = '<span class="iconify text-5xl mb-3 block" data-icon="lucide:file-text"></span><p class="text-sm">لا توجد منشورات بعد</p>';
        container.insertBefore(empty, loader);
        return;
    }

    const fragment = document.createDocumentFragment();
    allPosts.forEach((post, i) => {
        const div = document.createElement('div');
        div.className = 'dynamic-post';
        div.dataset.postId = post.id;
        div.innerHTML = buildPostHTML(post, i, isGuest);
        const el = div.firstElementChild;
        if (el) fragment.appendChild(el);
    });
    container.insertBefore(fragment, loader);

    if (loader) loader.style.display = 'none';

    // Re-trigger iconify scan
    if (window.Iconify) Iconify.scan(container);
}

function renderProfile() {
    const profile = store.get('profile');
    if (!profile) return;
    updateProfileUI(profile);

    const userPosts = store.get('userPosts') || [];
    const localPosts = getLocalPosts();
    const allPosts = deduplicatePosts([...localPosts, ...userPosts]);

    const container = document.getElementById('profilePostsList');
    const emptyState = document.getElementById('profileEmptyState');

    if (allPosts.length === 0) {
        if (container) container.innerHTML = '';
        if (emptyState) emptyState.style.display = '';
        return;
    }
    if (emptyState) emptyState.style.display = 'none';
    if (container) container.innerHTML = allPosts.map(post => buildOwnPostHTML(post, profile)).join('');
}

function renderNotifications() {
    const el = document.getElementById('notifContent');
    if (el) el.innerHTML = `<div class="text-center py-12 text-dark-400"><span class="iconify text-4xl mb-3 block" data-icon="lucide:bell"></span><p class="text-sm">لا توجد إشعارات</p></div>`;
}

function renderMessages() {}
function renderBookmarks() {}
function renderArticles() {}
function renderFollowing() {}

// ===== POST HTML =====
function buildPostHTML(post, index, isGuest = false) {
    const profile = post.profiles || {};
    const name = escapeHtml(profile.name || 'مستخدم');
    const avatar = getAvatarUrl(profile);
    const verified = profile.verified ? `<span class="iconify text-brand-500 text-sm" data-icon="lucide:badge-check"></span>` : '';
    const role = escapeHtml(profile.title || '');
    const time = timeAgo(post.created_at);
    const content = escapeHtml(post.content || '').replace(/\n/g, '<br>');
    const title = post.title ? `<h2 class="font-bold text-base mb-2">${escapeHtml(post.title)}</h2>` : '';
    const tags = (post.tags || []).map(t => `<span class="hashtag">#${escapeHtml(t)}</span>`).join('');

    const interactionsGuest = `
        <button class="post-action" onclick="showAuthPrompt('الإعجاب')">
            <span class="iconify" data-icon="lucide:heart"></span>
            <span>${post.likes_count || 0}</span>
        </button>
        <button class="post-action" onclick="showAuthPrompt('التعليق')">
            <span class="iconify" data-icon="lucide:message-circle"></span>
            <span>${post.comments_count || 0}</span>
        </button>
        <button class="post-action" onclick="showAuthPrompt('المشاركة')">
            <span class="iconify" data-icon="lucide:share-2"></span>
        </button>
        <button class="post-action" onclick="showAuthPrompt('الحفظ')">
            <span class="iconify" data-icon="lucide:bookmark"></span>
        </button>`;

    const interactionsAuth = `
        <button class="post-action like-btn" data-like="${post.id}">
            <span class="iconify" data-icon="lucide:heart"></span>
            <span>${post.likes_count || 0}</span>
        </button>
        <button class="post-action" data-open-post="${post.id}">
            <span class="iconify" data-icon="lucide:message-circle"></span>
            <span>${post.comments_count || 0}</span>
        </button>
        <button class="post-action" data-share="${post.id}">
            <span class="iconify" data-icon="lucide:share-2"></span>
        </button>
        <button class="post-action bookmark-btn" data-bookmark="${post.id}">
            <span class="iconify" data-icon="lucide:bookmark"></span>
        </button>`;

    return `
    <article class="post-card" style="animation-delay:${Math.min(index * 60, 400)}ms" data-post-id="${post.id}">
        <div class="post-card-body">
            <div class="post-header">
                <div class="post-author" data-navigate="profile" data-author-id="${profile.id}">
                    <img src="${avatar}" class="post-avatar" alt="${name}" loading="lazy">
                    <div class="post-author-info">
                        <div class="post-author-name">${name}${verified}</div>
                        <div class="post-author-meta">${role}${role ? ' · ' : ''}${time}</div>
                    </div>
                </div>
                ${!isGuest ? `
                <button class="follow-btn" data-follow="${profile.id}">
                    <span class="iconify" data-icon="lucide:user-plus"></span>
                    <span>متابعة</span>
                </button>` : `
                <button class="btn-secondary text-xs px-3 py-1.5" onclick="showAuthPrompt('المتابعة')">متابعة</button>`}
            </div>
            ${title}
            <div class="post-content">${content}</div>
            ${tags ? `<div class="post-tags">${tags}</div>` : ''}
        </div>
        <div class="post-stats">
            <span>${post.likes_count || 0} إعجاب</span>
            <span>${post.comments_count || 0} تعليق</span>
        </div>
        <div class="post-actions">
            ${isGuest ? interactionsGuest : interactionsAuth}
        </div>
    </article>`;
}

function buildOwnPostHTML(post, profile) {
    const avatar = getAvatarUrl(profile);
    const time = timeAgo(post.created_at);
    const content = escapeHtml(post.content || post.text || '').replace(/\n/g, '<br>');

    return `
    <article class="post-card" data-post-id="${post.id}">
        <div class="post-card-body">
            <div class="post-header">
                <div class="post-author">
                    <img src="${avatar}" class="post-avatar" alt="">
                    <div class="post-author-info">
                        <div class="post-author-name">${escapeHtml(profile.name)}<span class="iconify text-brand-500 text-sm mr-1" data-icon="lucide:badge-check"></span></div>
                        <div class="post-author-meta">${escapeHtml(profile.title || '')} · ${time}</div>
                    </div>
                </div>
                <button class="p-2 rounded-xl hover:bg-dark-800/50 transition-all" data-menu="${post.id}">
                    <span class="iconify text-dark-400 text-xl" data-icon="lucide:more-horizontal"></span>
                </button>
            </div>
            <div class="post-content">${content}</div>
        </div>
        <div class="post-actions">
            <button class="post-action like-btn" data-like="${post.id}">
                <span class="iconify" data-icon="lucide:heart"></span>
                <span>${post.likes_count || 0}</span>
            </button>
            <button class="post-action" data-open-post="${post.id}">
                <span class="iconify" data-icon="lucide:message-circle"></span>
                <span>${post.comments_count || 0}</span>
            </button>
            <button class="post-action bookmark-btn" data-bookmark="${post.id}">
                <span class="iconify" data-icon="lucide:bookmark"></span>
            </button>
        </div>
    </article>`;
}

// ===== PUBLISH POST =====
window.publishPost = async function() {
    if (!requireAuth()) return;
    const input = document.getElementById('postInput');
    const text = input?.textContent?.trim() || input?.value?.trim();
    if (!text) { showToast('اكتب شيئاً أولاً'); return; }

    const btn = document.querySelector('[onclick="publishPost()"]');
    if (btn) { btn.disabled = true; btn.textContent = 'جاري النشر...'; }

    const { data, error } = await Posts.create(text);
    if (error) {
        // Save locally
        const user = store.get('user');
        const profile = store.get('profile');
        const localPost = { id: 'local_' + Date.now(), content: text, created_at: new Date().toISOString(), author_id: user?.id, profiles: profile, likes_count: 0, comments_count: 0 };
        saveLocalPost(localPost);
        store.set('posts', [localPost, ...(store.get('posts') || [])]);
    } else if (data) {
        store.set('posts', [data, ...(store.get('posts') || [])]);
    }

    if (input) { input.textContent = ''; input.innerHTML = ''; }
    if (btn) { btn.disabled = false; btn.textContent = 'نشر'; }
    showToast('تم النشر ✓');
    renderFeed();
};

window.publishModalPost = async function() {
    if (!requireAuth()) return;
    const textarea = document.getElementById('modalPostText');
    const text = textarea?.value?.trim();
    if (!text) return;
    textarea.value = '';
    document.getElementById('postModal')?.classList.remove('active');
    document.body.style.overflow = '';

    const { data, error } = await Posts.create(text);
    if (!error && data) {
        store.set('posts', [data, ...(store.get('posts') || [])]);
        renderFeed();
    } else {
        const localPost = buildLocalPost(text);
        saveLocalPost(localPost);
        store.set('posts', [localPost, ...(store.get('posts') || [])]);
        renderFeed();
    }
    showToast('تم النشر ✓');
};

function buildLocalPost(text) {
    const user = store.get('user');
    const profile = store.get('profile');
    return { id: 'local_' + Date.now(), content: text, created_at: new Date().toISOString(), author_id: user?.id, profiles: profile, likes_count: 0, comments_count: 0 };
}

// ===== EVENT DELEGATION =====
document.addEventListener('click', async (e) => {
    const isGuest = !store.get('isLoggedIn');

    // Like
    const likeBtn = e.target.closest('[data-like]');
    if (likeBtn) {
        if (isGuest) { showAuthPrompt('الإعجاب'); return; }
        likeBtn.classList.toggle('liked');
        likeBtn.style.transform = 'scale(1.2)';
        setTimeout(() => likeBtn.style.transform = '', 200);
        const postId = likeBtn.dataset.like;
        const countEl = likeBtn.querySelector('span:last-child');
        if (countEl) {
            const n = parseInt(countEl.textContent) || 0;
            countEl.textContent = likeBtn.classList.contains('liked') ? n + 1 : Math.max(0, n - 1);
        }
        await Likes.toggle(postId);
        return;
    }

    // Bookmark
    const bookmarkBtn = e.target.closest('[data-bookmark]');
    if (bookmarkBtn) {
        if (isGuest) { showAuthPrompt('الحفظ'); return; }
        const postId = bookmarkBtn.dataset.bookmark;
        bookmarkBtn.classList.toggle('saved');
        const icon = bookmarkBtn.querySelector('.iconify');
        if (bookmarkBtn.classList.contains('saved')) {
            icon?.setAttribute('data-icon', 'lucide:bookmark-check');
            icon && (icon.style.color = '#f97316');
            showToast('تم الحفظ ✓');
        } else {
            icon?.setAttribute('data-icon', 'lucide:bookmark');
            icon && (icon.style.color = '');
        }
        await Bookmarks.toggle(postId);
        return;
    }

    // Follow
    const followBtn = e.target.closest('[data-follow]');
    if (followBtn) {
        if (isGuest) { showAuthPrompt('المتابعة'); return; }
        const userId = followBtn.dataset.follow;
        const isFollowing = followBtn.classList.toggle('following');
        if (isFollowing) {
            followBtn.innerHTML = '<span class="iconify" data-icon="lucide:check"></span><span>متابَع</span>';
            followBtn.style.opacity = '0.7';
        } else {
            followBtn.innerHTML = '<span class="iconify" data-icon="lucide:user-plus"></span><span>متابعة</span>';
            followBtn.style.opacity = '';
        }
        await Follows.toggle(userId);
        return;
    }

    // Share
    const shareBtn = e.target.closest('[data-share]');
    if (shareBtn) {
        if (navigator.share) {
            navigator.share({ title: 'Lawbook', url: window.location.href }).catch(() => {});
        } else {
            navigator.clipboard?.writeText(window.location.href).then(() => showToast('تم نسخ الرابط'));
        }
        return;
    }
});

// ===== SEARCH =====
window.doSearch = function() {
    if (!store.get('isLoggedIn')) { showAuthPrompt('البحث'); return; }
    const q = document.getElementById('searchInput')?.value?.trim();
    if (q) showToast('بحث عن: ' + q);
};

// ===== LOCAL POSTS =====
function getLocalPosts() {
    try {
        const user = store.get('user');
        if (!user) return [];
        return JSON.parse(localStorage.getItem('user_' + user.id + '_userPosts') || '[]');
    } catch(e) { return []; }
}

function saveLocalPost(post) {
    const user = store.get('user');
    if (!user) return;
    const posts = getLocalPosts();
    posts.unshift(post);
    try { localStorage.setItem('user_' + user.id + '_userPosts', JSON.stringify(posts)); } catch(e) {}
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

// Make showAuthPrompt globally accessible
window.showAuthPrompt = (action) => {
    const { showAuthPrompt: sap } = window.__app?.ui || {};
    import('./utils/ui.js').then(({ showAuthPrompt }) => showAuthPrompt(action));
};
