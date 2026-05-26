// ============================================================
// ===== LAWBOOK APP — X-like Experience =====
// ============================================================

import { store } from './core/store.js';
import { initAPI, Auth, Posts, Profiles, Follows, Likes, Comments, Bookmarks } from './core/api.js';
import { router } from './core/router.js';
import {
    showToast, getAvatarUrl, requireAuth, showAuthPrompt, escapeHtml, timeAgo, initSwipeGesture, setLoading
} from './utils/ui.js';
import {
    initAuth, tryRestoreSession,
    showAuthScreen, hideAuthScreen,
    handleLogin, handleSignup, handleForgot,
    switchMode as authSwitchMode,
    checkUsernameRealtime, autoFillUsername
} from './features/auth.js';

// ===== GLOBAL INTERFACE =====
window.__app = {
    store, router,
    initApp, initGuestMode,
    navigate: (page) => navigateTo(page),
    auth: {
        handleLogin, handleSignup, handleForgot,
        switchMode: authSwitchMode,
        showAuthScreen,
        checkUsernameRealtime,
        autoFillUsername,
        signOut: () => Auth.signOut(),
    },
    showToast,
};
window.showToast = showToast;
window.navigateTo = navigateTo;
window.showAuthPrompt = showAuthPrompt;

// ===== GLOBAL PAGE FUNCTIONS =====
window.openDrawer = openDrawer;
window.closeDrawer = closeDrawer;
window.openPostModal = openPostModal;
window.closePostModal = closePostModal;
window.submitPost = submitPost;
window.updatePostCounter = updatePostCounter;
window.handlePostImage = handlePostImage;
window.removePostImage = removePostImage;
window.insertHashtag = insertHashtag;
window.openEditProfile = openEditProfile;
window.closeEditProfile = closeEditProfile;
window.saveProfile = saveProfile;
window.handleEditAvatar = handleEditAvatar;
window.handleEditCover = handleEditCover;
window.triggerAvatarUpload = () => document.getElementById('avatarFileInput')?.click();
window.triggerCoverUpload = () => document.getElementById('coverFileInput')?.click();
window.handleAvatarUpload = handleAvatarUpload;
window.handleCoverUpload = handleCoverUpload;
window.openPostDetail = openPostDetail;
window.closePostDetail = closePostDetail;
window.submitComment = submitComment;
window.switchFeedTab = switchFeedTab;
window.switchProfileTab = switchProfileTab;
window.toggleProfileFollow = toggleProfileFollow;
window.handleSearch = handleSearch;
window.doSearch = doSearch;
window.clearSearch = clearSearch;
window.focusSearch = focusSearch;
window.openImageViewer = openImageViewer;
window.closeImageViewer = closeImageViewer;
window.openUserMenu = openUserMenu;
window.openActionSheet = openActionSheet;
window.deletePost = deletePost;

// ===== STATE =====
let currentPostImageFile = null;
let editProfileData = {};
let viewingUserId = null;
let feedTab = 'latest';


  function showFeedSkeleton(containerId = 'feedList') {
      const c = document.getElementById(containerId);
      if (!c) return;
      c.innerHTML = Array(5).fill('').map(() => `
      <div style="display:flex;gap:12px;padding:14px 16px;border-bottom:1px solid #1f1f1f;">
          <div style="width:42px;height:42px;border-radius:50%;background:linear-gradient(90deg,#1a1a1a 25%,#252525 50%,#1a1a1a 75%);background-size:200% 100%;animation:shimmer 1.5s infinite;flex-shrink:0;"></div>
          <div style="flex:1;">
              <div style="height:14px;width:55%;border-radius:6px;background:linear-gradient(90deg,#1a1a1a 25%,#252525 50%,#1a1a1a 75%);background-size:200% 100%;animation:shimmer 1.5s infinite;margin-bottom:10px;"></div>
              <div style="height:12px;width:100%;border-radius:6px;background:linear-gradient(90deg,#1a1a1a 25%,#252525 50%,#1a1a1a 75%);background-size:200% 100%;animation:shimmer 1.5s infinite;margin-bottom:8px;"></div>
              <div style="height:12px;width:80%;border-radius:6px;background:linear-gradient(90deg,#1a1a1a 25%,#252525 50%,#1a1a1a 75%);background-size:200% 100%;animation:shimmer 1.5s infinite;"></div>
          </div>
      </div>`).join('');
  }
  
// ===== BOOTSTRAP =====
document.addEventListener('DOMContentLoaded', async () => {
    // Init swipe gesture for drawer
    initSwipeGesture(openDrawer, closeDrawer);
    
    

    const connected = await initAPI();
    const hasSession = connected ? await tryRestoreSession() : false;

    if (hasSession && store.get('isLoggedIn')) {
        await initApp();
    } else {
        initGuestMode();
    }
});


// ===== DRAWER =====
function openDrawer() {
    document.getElementById('mainDrawer')?.classList.add('open');
    document.getElementById('drawerOverlay')?.classList.add('open');
}
function closeDrawer() {
    document.getElementById('mainDrawer')?.classList.remove('open');
    document.getElementById('drawerOverlay')?.classList.remove('open');
}

// ===== NAVIGATION =====
function navigateTo(page) {
    router.navigate(page);
    // Update desktop sidebar active
    document.querySelectorAll('.desktop-nav-link').forEach(l => {
        l.classList.toggle('active', l.dataset.page === page);
    });
    // Update mobile bottom nav
    document.querySelectorAll('.bn-item').forEach(b => {
        b.classList.toggle('active', b.dataset.page === page);
    });
    // Update drawer active
    document.querySelectorAll('.drawer-link').forEach(l => {
        l.classList.toggle('active', l.dataset.page === page);
    });
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
    // Close drawer
    closeDrawer();
}

// ===== INIT APP (logged-in) =====
async function initApp() {
    const profile = store.get('profile');
    if (!profile) return;

    initAuth();
    updateAllProfileUI(profile);
    registerAuthPages();
    router.init();

    // Show auth UI
    document.getElementById('guestBanner')?.style.setProperty('display', 'none');
    const compose = document.getElementById('composeBox');
    if (compose) compose.style.display = 'flex';
    document.getElementById('headerGuestBtns')?.style.setProperty('display', 'none');
    document.getElementById('headerUserBtns')?.style.setProperty('display', 'flex');
    document.getElementById('drawerGuest')?.style.setProperty('display', 'none');
    document.getElementById('drawerUser')?.style.setProperty('display', 'block');
    document.getElementById('drawerSignout')?.style.setProperty('display', 'flex');
    document.getElementById('desktopUserCard')?.style.setProperty('display', 'flex');
    document.getElementById('editProfileBtn')?.style.setProperty('display', 'flex');
    document.getElementById('editCoverBtn')?.style.setProperty('display', 'flex');
    document.getElementById('editAvatarBtn')?.style.setProperty('display', 'flex');

    // Load data
    await Promise.allSettled([loadFeedPosts(), loadUserPosts()]);

    const hash = window.location.hash.replace('#', '') || 'feed';
    navigateTo(['feed','profile','notifications','messages','bookmarks','settings'].includes(hash) ? hash : 'feed');
}

// ===== INIT GUEST MODE =====
function initGuestMode() {
    store.set('isLoggedIn', false);
    registerGuestPages();
    router.init();
    
    // Guest UI
    document.getElementById('guestBanner')?.style.setProperty('display', 'block');
    document.getElementById('composeBox')?.style.setProperty('display', 'none');

    loadGuestFeed();
    navigateTo('feed');
}

function registerGuestPages() {
    router.register('feed', { onShow: () => {} });
    router.register('search', { onShow: () => {} });
    ['profile','notifications','messages','bookmarks','settings','following','articles'].forEach(p => {
        router.register(p, { onShow: () => {
            setTimeout(() => { navigateTo('feed'); showAuthPrompt('الوصول لهذه الصفحة'); }, 0);
        }});
    });
}

function registerAuthPages() {
    router.register('feed', { onShow: () => renderFeed() });
    router.register('profile', { onShow: () => renderProfile() });
    router.register('notifications', { onShow: () => renderNotifications() });
    router.register('messages', { onShow: () => {} });
    router.register('bookmarks', { onShow: () => renderBookmarks() });
    router.register('settings', { onShow: () => renderSettings() });
    router.register('following', { onShow: () => renderFollowing() });
    router.register('search', { onShow: () => {} });
    ['articles','connections','events','certificates','trending','audio-spaces'].forEach(p => {
        router.register(p, { onShow: () => {} });
    });
}

// ===== PROFILE UI UPDATE =====
function updateAllProfileUI(profile) {
    const name = profile.name || 'مستخدم';
    const avatar = getAvatarUrl(profile);
    const handle = profile.username ? '@' + profile.username : '';

    // Header
    const hAvatar = document.getElementById('headerAvatar');
    if (hAvatar) hAvatar.src = avatar;

    // Drawer
    const dAvatar = document.getElementById('drawerAvatar');
    if (dAvatar) dAvatar.src = avatar;
    const dName = document.getElementById('drawerName');
    if (dName) dName.textContent = name;
    const dHandle = document.getElementById('drawerHandle');
    if (dHandle) dHandle.textContent = handle;
    const dFollowing = document.getElementById('drawerFollowing');
    if (dFollowing) dFollowing.textContent = (profile.following_count || 0).toLocaleString('ar');
    const dFollowers = document.getElementById('drawerFollowers');
    if (dFollowers) dFollowers.textContent = (profile.followers_count || 0).toLocaleString('ar');

    // Desktop sidebar
    const dsAvatar = document.getElementById('desktopCardAvatar');
    if (dsAvatar) dsAvatar.src = avatar;
    const dsName = document.getElementById('desktopCardName');
    if (dsName) dsName.textContent = name;
    const dsHandle = document.getElementById('desktopCardHandle');
    if (dsHandle) dsHandle.textContent = handle;

    // Compose
    const cAvatar = document.getElementById('composeAvatar');
    if (cAvatar) cAvatar.src = avatar;
    // Post modal
    const pmAvatar = document.getElementById('postModalAvatar');
    if (pmAvatar) pmAvatar.src = avatar;
    // Comment
    const cmtAvatar = document.getElementById('commentAvatar');
    if (cmtAvatar) cmtAvatar.src = avatar;
}

// ===== FEED =====
async function loadGuestFeed() {
      showFeedSkeleton('feedList');
    const { data } = await Posts.getPopular(20);
    store.set('posts', data || []);
    renderFeed(true);
}

async function loadFeedPosts() {
      showFeedSkeleton('feedList');
    const { data } = feedTab === 'latest'
        ? await Posts.getAll(50)
        : await Posts.getPopular(50);
    store.set('posts', data || []);
    renderFeed();
}

async function loadUserPosts() {
    const user = store.get('user');
    if (!user) return;
    const { data } = await Posts.getByUser(user.id);
    store.set('userPosts', data || []);
}

window.switchFeedTab = async function(tab, btn) {
    if (feedTab === tab) return;
    feedTab = tab;
    document.querySelectorAll('.feed-tab').forEach(b => b.classList.remove('active'));
    btn?.classList.add('active');
    const container = document.getElementById('feedList');
    if (container) container.innerHTML = '<div class="feed-loading"><div class="lb-spinner"></div></div>';
    await loadFeedPosts();
};

function renderFeed(isGuest = false) {
    const container = document.getElementById('feedList');
    if (!container) return;

    const posts = store.get('posts') || [];
    const localPosts = isGuest ? [] : getLocalPosts();
    const all = deduplicatePosts([...localPosts, ...posts]);

    if (all.length === 0) {
        container.innerHTML = `
        <div class="empty-state">
            <span class="iconify" data-icon="ph:newspaper-bold"></span>
            <h3>لا توجد منشورات</h3>
            <p>كن أول من ينشر في هذه المنصة</p>
        </div>`;
        return;
    }

    const fragment = document.createDocumentFragment();
    all.forEach((post, i) => {
        const el = document.createElement('div');
        el.innerHTML = buildPostHTML(post, i, isGuest);
        const card = el.firstElementChild;
        if (card) {
            card.style.animationDelay = `${Math.min(i * 40, 300)}ms`;
            fragment.appendChild(card);
        }
    });
    container.innerHTML = '';
    container.appendChild(fragment);

    if (window.Iconify) Iconify.scan(container);
}

// ===== BUILD POST HTML =====
function buildPostHTML(post, index = 0, isGuest = false) {
    const p = post.profiles || {};
    const name = escapeHtml(p.name || 'مستخدم');
    const avatar = getAvatarUrl(p);
    const handle = p.username ? '@' + escapeHtml(p.username) : '';
    const time = timeAgo(post.created_at);
    const content = escapeHtml(post.content || '').replace(/\n/g, '<br>').replace(/#(\w+)/g, '<span class="hashtag">#$1</span>');
    const isOwn = !isGuest && store.get('user')?.id === (post.author_id || p.id);
    const verified = p.verified ? `<span class="iconify" data-icon="ph:seal-check-fill" style="color:#f97316;font-size:14px"></span>` : '';

    const imgHTML = post.image_url
        ? `<div class="post-card-image"><img src="${escapeHtml(post.image_url)}" alt="صورة" loading="lazy" onclick="event.stopPropagation();openImageViewer('${escapeHtml(post.image_url)}')"></div>`
        : '';

    const moreBtn = isOwn
        ? `<button class="post-more-btn" onclick="event.stopPropagation();openActionSheet('${post.id}')" title="المزيد"><span class="iconify" data-icon="ph:dots-three-bold"></span></button>`
        : `<button class="post-more-btn" onclick="event.stopPropagation();" title="المزيد"><span class="iconify" data-icon="ph:dots-three-bold"></span></button>`;

    const actions = isGuest ? `
        <button class="post-action like-action" onclick="event.stopPropagation();showAuthPrompt('الإعجاب')">
            <span class="iconify" data-icon="ph:heart-bold"></span>
            <span>${post.likes_count || 0}</span>
        </button>
        <button class="post-action comment-action" onclick="event.stopPropagation();showAuthPrompt('التعليق')">
            <span class="iconify" data-icon="ph:chat-circle-bold"></span>
            <span>${post.comments_count || 0}</span>
        </button>
        <button class="post-action repost-action" onclick="event.stopPropagation();showAuthPrompt('إعادة النشر')">
            <span class="iconify" data-icon="ph:arrows-clockwise-bold"></span>
        </button>
        <button class="post-action share-action" onclick="event.stopPropagation();handleShare('${post.id}')">
            <span class="iconify" data-icon="ph:upload-simple-bold"></span>
        </button>`
    : `
        <button class="post-action like-action${post._liked ? ' liked' : ''}" data-like="${post.id}">
            <span class="iconify" data-icon="${post._liked ? 'ph:heart-fill' : 'ph:heart-bold'}"></span>
            <span>${post.likes_count || 0}</span>
        </button>
        <button class="post-action comment-action" data-open-post="${post.id}">
            <span class="iconify" data-icon="ph:chat-circle-bold"></span>
            <span>${post.comments_count || 0}</span>
        </button>
        <button class="post-action repost-action" data-repost="${post.id}">
            <span class="iconify" data-icon="ph:arrows-clockwise-bold"></span>
        </button>
        <button class="post-action share-action" data-share="${post.id}">
            <span class="iconify" data-icon="ph:upload-simple-bold"></span>
        </button>
        <button class="post-action bookmark-action${post._bookmarked ? ' bookmarked' : ''}" data-bookmark="${post.id}">
            <span class="iconify" data-icon="${post._bookmarked ? 'ph:bookmark-fill' : 'ph:bookmark-bold'}"></span>
        </button>`;

    return `
    <article class="post-card" data-post-id="${post.id}" onclick="openPostDetail('${post.id}')">
        <div class="post-card-left">
            <img src="${avatar}" class="post-card-avatar" alt="${name}" loading="lazy" onclick="event.stopPropagation()">
        </div>
        <div class="post-card-right">
            <div class="post-card-header">
                <div class="post-author-row">
                    <span class="post-display-name">${name}${verified}</span>
                    <span class="post-username">${handle}</span>
                    <span class="post-dot">·</span>
                    <span class="post-time">${time}</span>
                </div>
                ${moreBtn}
            </div>
            <div class="post-card-text">${content}</div>
            ${imgHTML}
            <div class="post-actions">${actions}</div>
        </div>
    </article>`;
}

// ===== POST DETAIL =====
let currentPostId = null;
async function openPostDetail(postId) {
    if (!postId) return;
    currentPostId = postId;

    const modal = document.getElementById('postDetailModal');
    if (modal) modal.classList.add('open');
    document.body.style.overflow = 'hidden';

    const posts = store.get('posts') || [];
    let post = posts.find(p => p.id == postId);

    const contentEl = document.getElementById('postDetailContent');
    if (!post) {
        if (contentEl) contentEl.innerHTML = '<div style="padding:24px;text-align:center;color:#71767b">جاري التحميل...</div>';
        return;
    }

    const p = post.profiles || {};
    const name = escapeHtml(p.name || 'مستخدم');
    const avatar = getAvatarUrl(p);
    const handle = p.username ? '@' + escapeHtml(p.username) : '';
    const isGuest = !store.get('isLoggedIn');
    const content = escapeHtml(post.content || '').replace(/\n/g, '<br>').replace(/#(\w+)/g, '<span class="hashtag">#$1</span>');
    const imgHTML = post.image_url
        ? `<div class="post-card-image" style="margin-bottom:12px"><img src="${escapeHtml(post.image_url)}" style="width:100%;border-radius:14px;cursor:pointer" onclick="openImageViewer('${escapeHtml(post.image_url)}')"></div>`
        : '';

    const time = new Date(post.created_at).toLocaleString('ar', { dateStyle: 'long', timeStyle: 'short' });

    const actions = isGuest ? `
        <button class="post-action like-action" onclick="showAuthPrompt('الإعجاب')"><span class="iconify" data-icon="ph:heart-bold"></span><span>${post.likes_count||0}</span></button>
        <button class="post-action comment-action" onclick="showAuthPrompt('التعليق')"><span class="iconify" data-icon="ph:chat-circle-bold"></span></button>
        <button class="post-action repost-action" onclick="showAuthPrompt('إعادة النشر')"><span class="iconify" data-icon="ph:arrows-clockwise-bold"></span></button>
        <button class="post-action share-action" onclick="handleShare('${post.id}')"><span class="iconify" data-icon="ph:upload-simple-bold"></span></button>`
    : `
        <button class="post-action like-action${post._liked?' liked':''}" data-like="${post.id}"><span class="iconify" data-icon="${post._liked?'ph:heart-fill':'ph:heart-bold'}"></span><span>${post.likes_count||0}</span></button>
        <button class="post-action comment-action"><span class="iconify" data-icon="ph:chat-circle-bold"></span></button>
        <button class="post-action repost-action" data-repost="${post.id}"><span class="iconify" data-icon="ph:arrows-clockwise-bold"></span></button>
        <button class="post-action share-action" data-share="${post.id}"><span class="iconify" data-icon="ph:upload-simple-bold"></span></button>
        <button class="post-action bookmark-action${post._bookmarked?' bookmarked':''}" data-bookmark="${post.id}"><span class="iconify" data-icon="${post._bookmarked?'ph:bookmark-fill':'ph:bookmark-bold'}"></span></button>`;

    if (contentEl) contentEl.innerHTML = `
        <div class="post-detail-header">
            <img src="${avatar}" class="post-detail-avatar" alt="">
            <div>
                <div class="post-detail-name">${name}</div>
                <div class="post-detail-handle">${handle}</div>
            </div>
        </div>
        <div class="post-detail-text">${content}</div>
        ${imgHTML}
        <div class="post-detail-time">${time}</div>
        <div class="post-detail-stats">
            <span><b>${post.likes_count||0}</b> إعجاب</span>
            <span><b>${post.comments_count||0}</b> تعليق</span>
        </div>
        <div class="post-detail-actions">${actions}</div>`;

    if (window.Iconify) Iconify.scan(contentEl);

    // Load comments
    loadComments(postId);
}

function closePostDetail() {
    document.getElementById('postDetailModal')?.classList.remove('open');
    document.body.style.overflow = '';
    currentPostId = null;
}

async function loadComments(postId) {
    const { data } = await Comments.get(postId);
    const container = document.getElementById('commentsList');
    if (!container) return;

    if (!data || data.length === 0) {
        container.innerHTML = '<div class="empty-state" style="padding:24px"><p>لا توجد تعليقات بعد</p></div>';
        return;
    }

    container.innerHTML = data.map(c => {
        const p = c.profiles || {};
        return `
        <div class="comment-item">
            <img src="${getAvatarUrl(p)}" class="comment-avatar" alt="">
            <div class="comment-body">
                <div class="comment-meta">
                    <span class="comment-name">${escapeHtml(p.name||'مستخدم')}</span>
                    <span class="comment-handle">${p.username?'@'+escapeHtml(p.username):''}</span>
                    <span class="comment-time">${timeAgo(c.created_at)}</span>
                </div>
                <div class="comment-text">${escapeHtml(c.content||'')}</div>
            </div>
        </div>`;
    }).join('');
}

async function submitComment() {
    if (!requireAuth('التعليق')) return;
    const input = document.getElementById('commentInput');
    const text = input?.value?.trim();
    if (!text || !currentPostId) return;

    const btn = document.querySelector('.comment-composer .lb-btn-primary-sm');
    if (btn) btn.disabled = true;

    const { data, error } = await Comments.add(currentPostId, text);
    if (input) input.value = '';
    if (btn) btn.disabled = false;

    if (!error && data) {
        showToast('تم إضافة التعليق ✓');
        loadComments(currentPostId);
        // Update count in feed
        const posts = store.get('posts') || [];
        const idx = posts.findIndex(p => p.id == currentPostId);
        if (idx >= 0) {
            posts[idx] = { ...posts[idx], comments_count: (posts[idx].comments_count || 0) + 1 };
            store.set('posts', posts);
        }
    } else {
        showToast('حدث خطأ، حاول مرة أخرى');
    }
}

// ===== POST MODAL =====
function openPostModal(mode = '') {
    if (!requireAuth('النشر')) return;
    const modal = document.getElementById('postModal');
    if (modal) modal.classList.add('open');
    document.body.style.overflow = 'hidden';
    const textarea = document.getElementById('postModalText');
    if (textarea) { textarea.value = ''; textarea.focus(); }
    removePostImage();
    updatePostCounter({ value: '' });
    if (mode === 'image') document.getElementById('postImageInput')?.click();
}

function closePostModal() {
    document.getElementById('postModal')?.classList.remove('open');
    document.body.style.overflow = '';
    currentPostImageFile = null;
}

function updatePostCounter(textarea) {
    const val = typeof textarea === 'string' ? textarea : (textarea?.value || '');
    const len = val.length;
    const counter = document.getElementById('postCounter');
    if (counter) {
        const remaining = 500 - len;
        counter.textContent = remaining;
        counter.classList.toggle('warn', remaining < 50);
    }
}

function handlePostImage(input) {
    const file = input?.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { showToast('الصورة أكبر من 10MB'); return; }
    currentPostImageFile = file;
    const preview = document.getElementById('postImagePreview');
    const img = document.getElementById('postPreviewImg');
    if (preview && img) {
        img.src = URL.createObjectURL(file);
        preview.style.display = 'block';
    }
}

function removePostImage() {
    currentPostImageFile = null;
    const preview = document.getElementById('postImagePreview');
    if (preview) preview.style.display = 'none';
    const input = document.getElementById('postImageInput');
    if (input) input.value = '';
}

function insertHashtag() {
    const ta = document.getElementById('postModalText');
    if (!ta) return;
    const pos = ta.selectionStart;
    const val = ta.value;
    ta.value = val.slice(0, pos) + '#' + val.slice(pos);
    ta.selectionStart = ta.selectionEnd = pos + 1;
    ta.focus();
}

async function submitPost() {
    if (!requireAuth('النشر')) return;
    const textarea = document.getElementById('postModalText');
    const text = textarea?.value?.trim();
    if (!text && !currentPostImageFile) { showToast('اكتب شيئاً أولاً'); return; }

    const btn = document.getElementById('postSubmitBtn');
    if (btn) { btn.disabled = true; btn.textContent = 'جاري النشر...'; }

    let imageUrl = null;
    if (currentPostImageFile) {
        imageUrl = await uploadImage(currentPostImageFile);
    }

    const { data, error } = await Posts.create(text || '', '', [], imageUrl);

    if (error || !data) {
        // Save locally
        const user = store.get('user');
        const profile = store.get('profile');
        const localPost = {
            id: 'local_' + Date.now(),
            content: text || '',
            image_url: imageUrl,
            created_at: new Date().toISOString(),
            author_id: user?.id,
            profiles: profile,
            likes_count: 0,
            comments_count: 0
        };
        saveLocalPost(localPost);
        store.set('posts', [localPost, ...(store.get('posts') || [])]);
    } else {
        store.set('posts', [data, ...(store.get('posts') || [])]);
    }

    closePostModal();
    showToast('تم النشر ✓');
    renderFeed();

    if (btn) { btn.disabled = false; btn.textContent = 'نشر'; }
}

// ===== IMAGE UPLOAD =====
async function uploadImage(file) {
    try {
        const sb = store.get('supabaseClient');
        if (!sb) return null;
        const user = store.get('user');
        if (!user) return null;

        const ext = file.name.split('.').pop() || 'jpg';
        const path = `posts/${user.id}/${Date.now()}.${ext}`;

        const { data, error } = await sb.storage.from('lawbook-media').upload(path, file, {
            contentType: file.type,
            upsert: false
        });
        if (error) return null;

        const { data: url } = sb.storage.from('lawbook-media').getPublicUrl(path);
        return url?.publicUrl || null;
    } catch(e) {
        return null;
    }
}

// ===== PROFILE =====
function renderProfile(userId = null) {
    const user = store.get('user');
    const isOwnProfile = !userId || userId === user?.id;
    const profile = isOwnProfile ? store.get('profile') : null;
    if (!profile && isOwnProfile) return;

    // Show/hide edit buttons
    document.getElementById('editProfileBtn')?.style.setProperty('display', isOwnProfile ? 'flex' : 'none');
    document.getElementById('followProfileBtn')?.style.setProperty('display', isOwnProfile ? 'none' : 'flex');
    document.getElementById('editCoverBtn')?.style.setProperty('display', isOwnProfile ? 'flex' : 'none');
    document.getElementById('editAvatarBtn')?.style.setProperty('display', isOwnProfile ? 'flex' : 'none');

    if (profile) {
        const avatar = getAvatarUrl(profile);
        const profileAvatar = document.getElementById('profileAvatar');
        if (profileAvatar) profileAvatar.src = avatar;
        const profileName = document.getElementById('profileName');
        if (profileName) profileName.innerHTML = escapeHtml(profile.name || 'مستخدم') + (profile.verified ? ` <span class="iconify" data-icon="ph:seal-check-fill" style="color:#f97316;font-size:18px"></span>` : '');
        const profileHandle = document.getElementById('profileHandle');
        if (profileHandle) profileHandle.textContent = profile.username ? '@' + profile.username : '';
        const profileBio = document.getElementById('profileBio');
        if (profileBio) profileBio.textContent = profile.bio || '';
        const profileFollowing = document.getElementById('profileFollowing');
        if (profileFollowing) profileFollowing.textContent = (profile.following_count || 0).toLocaleString('ar');
        const profileFollowers = document.getElementById('profileFollowers');
        if (profileFollowers) profileFollowers.textContent = (profile.followers_count || 0).toLocaleString('ar');
        const profileHeaderName = document.getElementById('profileHeaderName');
        if (profileHeaderName) profileHeaderName.textContent = profile.name || 'مستخدم';

        if (profile.cover_url) {
            const cover = document.getElementById('profileCover');
            if (cover) cover.style.backgroundImage = `url(${profile.cover_url})`;
            if (cover) cover.style.backgroundSize = 'cover';
            if (cover) cover.style.backgroundPosition = 'center';
        }

        if (window.Iconify) Iconify.scan(document.getElementById('page-profile'));
    }

    // Render posts
    const userPosts = store.get('userPosts') || [];
    const localPosts = getLocalPosts();
    const all = deduplicatePosts([...localPosts, ...userPosts]);

    const container = document.getElementById('profilePostsList');
    const empty = document.getElementById('profileEmpty');

    if (all.length === 0) {
        if (container) container.innerHTML = '';
        if (empty) empty.style.display = 'flex';
        const profileHeaderCount = document.getElementById('profileHeaderCount');
        if (profileHeaderCount) profileHeaderCount.textContent = '0 منشور';
    } else {
        if (empty) empty.style.display = 'none';
        const profileHeaderCount = document.getElementById('profileHeaderCount');
        if (profileHeaderCount) profileHeaderCount.textContent = `${all.length} منشور`;
        if (container) {
            container.innerHTML = '';
            const frag = document.createDocumentFragment();
            all.forEach((post, i) => {
                const el = document.createElement('div');
                el.innerHTML = buildPostHTML(post, i, false);
                const card = el.firstElementChild;
                if (card) frag.appendChild(card);
            });
            container.appendChild(frag);
            if (window.Iconify) Iconify.scan(container);
        }
    }
}

function switchProfileTab(tab, btn) {
    document.querySelectorAll('.profile-tab').forEach(b => b.classList.remove('active'));
    btn?.classList.add('active');
    if (tab === 'posts') renderProfile();
    else if (tab === 'likes') {
        const container = document.getElementById('profilePostsList');
        const empty = document.getElementById('profileEmpty');
        if (container) container.innerHTML = '';
        if (empty) {
            empty.style.display = 'flex';
            empty.querySelector('h3').textContent = 'لا توجد إعجابات';
            empty.querySelector('p').textContent = 'أعجب بمنشورات لتظهر هنا';
        }
    }
}

function toggleProfileFollow() {
    if (!requireAuth('المتابعة')) return;
    const btn = document.getElementById('followProfileBtn');
    if (!btn) return;
    const isFollowing = btn.classList.toggle('following');
    btn.textContent = isFollowing ? 'إلغاء المتابعة' : 'متابعة';
    showToast(isFollowing ? 'تمت المتابعة ✓' : 'تم إلغاء المتابعة');
}

// ===== AVATAR/COVER UPLOAD =====
async function handleAvatarUpload(input) {
    const file = input?.files?.[0];
    if (!file) return;
    showToast('جاري رفع الصورة...');
    const url = await uploadImage(file);
    if (url) {
        const profile = store.get('profile');
        const user = store.get('user');
        if (profile && user) {
            const { data } = await Profiles.update(user.id, { avatar_url: url });
            if (data) {
                store.set('profile', data);
                updateAllProfileUI(data);
                renderProfile();
                showToast('تم تحديث الصورة الشخصية ✓');
            }
        }
    } else {
        showToast('فشل رفع الصورة، حاول مجدداً');
    }
}

async function handleCoverUpload(input) {
    const file = input?.files?.[0];
    if (!file) return;
    showToast('جاري رفع صورة الغلاف...');
    const url = await uploadImage(file);
    if (url) {
        const profile = store.get('profile');
        const user = store.get('user');
        if (profile && user) {
            const { data } = await Profiles.update(user.id, { cover_url: url });
            if (data) {
                store.set('profile', data);
                const cover = document.getElementById('profileCover');
                if (cover) { cover.style.backgroundImage = `url(${url})`; cover.style.backgroundSize = 'cover'; }
                showToast('تم تحديث صورة الغلاف ✓');
            }
        }
    } else {
        showToast('فشل رفع الصورة، حاول مجدداً');
    }
}

// ===== EDIT PROFILE MODAL =====
function openEditProfile() {
    if (!requireAuth('تعديل الملف')) return;
    const profile = store.get('profile');
    if (!profile) return;

    const modal = document.getElementById('editProfileModal');
    if (modal) modal.classList.add('open');
    document.body.style.overflow = 'hidden';

    // Fill fields
    const n = document.getElementById('editName');
    if (n) n.value = profile.name || '';
    const u = document.getElementById('editUsername');
    if (u) u.value = profile.username || '';
    const b = document.getElementById('editBio');
    if (b) b.value = profile.bio || '';
    const l = document.getElementById('editLocation');
    if (l) l.value = profile.location || '';
    const w = document.getElementById('editWebsite');
    if (w) w.value = profile.website || '';

    const editAvatar = document.getElementById('editProfileAvatar');
    if (editAvatar) editAvatar.src = getAvatarUrl(profile);

    if (profile.cover_url) {
        const editCover = document.getElementById('editCoverPreview');
        if (editCover) {
            editCover.style.backgroundImage = `url(${profile.cover_url})`;
            editCover.style.backgroundSize = 'cover';
            editCover.style.backgroundPosition = 'center';
        }
    }

    editProfileData = {};
}

function closeEditProfile() {
    document.getElementById('editProfileModal')?.classList.remove('open');
    document.body.style.overflow = '';
}

function handleEditAvatar(input) {
    const file = input?.files?.[0];
    if (!file) return;
    editProfileData._avatarFile = file;
    const img = document.getElementById('editProfileAvatar');
    if (img) img.src = URL.createObjectURL(file);
}

function handleEditCover(input) {
    const file = input?.files?.[0];
    if (!file) return;
    editProfileData._coverFile = file;
    const preview = document.getElementById('editCoverPreview');
    if (preview) {
        preview.style.backgroundImage = `url(${URL.createObjectURL(file)})`;
        preview.style.backgroundSize = 'cover';
        preview.style.backgroundPosition = 'center';
    }
}

async function saveProfile() {
    const user = store.get('user');
    if (!user) return;

    const btn = document.querySelector('#editProfileModal .lb-btn-primary-sm');
    if (btn) { btn.disabled = true; btn.textContent = 'جاري الحفظ...'; }

    const updates = {
        name: document.getElementById('editName')?.value?.trim() || '',
        username: document.getElementById('editUsername')?.value?.trim().toLowerCase() || '',
        bio: document.getElementById('editBio')?.value?.trim() || '',
        location: document.getElementById('editLocation')?.value?.trim() || '',
        website: document.getElementById('editWebsite')?.value?.trim() || '',
    };

    // Upload avatar if changed
    if (editProfileData._avatarFile) {
        const url = await uploadImage(editProfileData._avatarFile);
        if (url) updates.avatar_url = url;
    }
    // Upload cover if changed
    if (editProfileData._coverFile) {
        const url = await uploadImage(editProfileData._coverFile);
        if (url) updates.cover_url = url;
    }

    const { data, error } = await Profiles.update(user.id, updates);
    if (btn) { btn.disabled = false; btn.textContent = 'حفظ'; }

    if (!error && data) {
        store.set('profile', data);
        updateAllProfileUI(data);
        renderProfile();
        closeEditProfile();
        showToast('تم حفظ الملف الشخصي ✓');
    } else {
        showToast('حدث خطأ، حاول مرة أخرى');
    }
}

// ===== SETTINGS =====
function renderSettings() {
    const user = store.get('user');
    const profile = store.get('profile');
    const emailEl = document.getElementById('settingsEmail');
    if (emailEl) emailEl.textContent = user?.email || '-';
}

// ===== BOOKMARKS =====
async function renderBookmarks() {
    const container = document.getElementById('bookmarksList');
    if (!container) return;
    container.innerHTML = '<div class="feed-loading"><div class="lb-spinner"></div></div>';

    const sb = store.get('supabaseClient');
    if (!sb) { container.innerHTML = '<div class="empty-state"><p>غير متاح</p></div>'; return; }

    const user = store.get('user');
    if (!user) return;

    const { data } = await sb.from('bookmarks')
        .select('*, posts(*, profiles(*))')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

    if (!data || data.length === 0) {
        container.innerHTML = `<div class="empty-state">
            <span class="iconify" data-icon="ph:bookmark-simple-bold"></span>
            <h3>لا توجد محفوظات</h3>
            <p>احفظ المنشورات لتراجعها لاحقاً</p>
        </div>`;
        return;
    }

    const frag = document.createDocumentFragment();
    data.forEach((b, i) => {
        if (!b.posts) return;
        const el = document.createElement('div');
        el.innerHTML = buildPostHTML(b.posts, i, false);
        const card = el.firstElementChild;
        if (card) frag.appendChild(card);
    });
    container.innerHTML = '';
    container.appendChild(frag);
    if (window.Iconify) Iconify.scan(container);
}

// ===== NOTIFICATIONS =====
function renderNotifications() {
    const container = document.getElementById('notifList');
    if (!container) return;
    container.innerHTML = `<div class="empty-state">
        <span class="iconify" data-icon="ph:bell-bold"></span>
        <h3>لا توجد إشعارات</h3>
        <p>ستظهر إشعاراتك هنا</p>
    </div>`;
}

// ===== FOLLOWING =====
async function renderFollowing() {
    const container = document.getElementById('followingList');
    if (!container) return;
    container.innerHTML = '<div class="feed-loading"><div class="lb-spinner"></div></div>';

    const user = store.get('user');
    const sb = store.get('supabaseClient');
    if (!user || !sb) { container.innerHTML = '<div class="empty-state"><p>غير متاح</p></div>'; return; }

    const { data } = await sb.from('follows')
        .select('following_id, profiles!follows_following_id_fkey(*)')
        .eq('follower_id', user.id);

    if (!data || data.length === 0) {
        container.innerHTML = `<div class="empty-state">
            <span class="iconify" data-icon="ph:users-bold"></span>
            <h3>لا تتابع أحداً بعد</h3>
            <p>ابحث عن أشخاص وتابعهم</p>
        </div>`;
        return;
    }

    container.innerHTML = data.map(f => {
        const p = f.profiles || {};
        return `
        <div class="user-list-item">
            <img src="${getAvatarUrl(p)}" class="user-list-avatar" alt="">
            <div class="user-list-info">
                <div class="user-list-name">${escapeHtml(p.name || 'مستخدم')}</div>
                <div class="user-list-handle">${p.username ? '@' + escapeHtml(p.username) : ''}</div>
            </div>
            <button class="lb-btn-outline-sm">متابَع</button>
        </div>`;
    }).join('');
}

// ===== SEARCH =====
let searchTimer = null;
let _lastQuery = '';
function handleSearch(query) {
    const clearBtn = document.getElementById('searchClear');
    if (clearBtn) clearBtn.style.display = query ? 'flex' : 'none';
    clearTimeout(searchTimer);
    if (!query) {
        const r = document.getElementById('searchResults');
        if (r) r.innerHTML = `<div class="search-empty"><span class="iconify" data-icon="ph:magnifying-glass-bold"></span><p>ابحث عن أشخاص أو منشورات</p></div>`;
        return;
    }
    searchTimer = setTimeout(() => doSearch(query), 400);
}

async function doSearch(query) {
    if (!query) {
        query = document.getElementById('searchInput')?.value?.trim()
            || document.getElementById('desktopSearchInput')?.value?.trim();
    }
    if (!query) return;
    if (!requireAuth('البحث')) return;

    const results = document.getElementById('searchResults');
    if (results) results.innerHTML = '<div class="feed-loading"><div class="lb-spinner"></div></div>';

    const { data } = await Profiles.search(query);
    if (!data || data.length === 0) {
        if (results) results.innerHTML = `<div class="search-empty"><span class="iconify" data-icon="ph:magnifying-glass-bold"></span><p>لا توجد نتائج لـ "${escapeHtml(query)}"</p></div>`;
        return;
    }

    if (results) results.innerHTML = data.map(p => `
        <div class="search-result-item" onclick="viewProfile('${p.id}')">
            <img src="${getAvatarUrl(p)}" class="search-result-avatar" alt="">
            <div class="search-result-info">
                <div class="search-result-name">${escapeHtml(p.name || 'مستخدم')}</div>
                <div class="search-result-handle">${p.username ? '@' + escapeHtml(p.username) : ''}</div>
            </div>
            <button class="lb-btn-outline-sm" onclick="event.stopPropagation()">متابعة</button>
        </div>`).join('');
}

function clearSearch() {
    const input = document.getElementById('searchInput');
    if (input) input.value = '';
    handleSearch('');
}

function focusSearch() {
    navigateTo('search');
    setTimeout(() => document.getElementById('searchInput')?.focus(), 100);
}

// ===== IMAGE VIEWER =====
function openImageViewer(url) {
    const viewer = document.getElementById('imageViewer');
    const img = document.getElementById('viewerImg');
    if (viewer && img) {
        img.src = url;
        viewer.classList.add('open');
        document.body.style.overflow = 'hidden';
    }
}
function closeImageViewer() {
    document.getElementById('imageViewer')?.classList.remove('open');
    document.body.style.overflow = '';
}

// ===== ACTION SHEET =====
function openActionSheet(postId) {
    const sheet = document.getElementById('actionSheet');
    if (!sheet) {
        // Create action sheet dynamically
        const el = document.createElement('div');
        el.id = 'actionSheet';
        el.className = 'action-sheet open';
        el.innerHTML = `
        <div class="action-sheet-overlay" onclick="document.getElementById('actionSheet').remove()"></div>
        <div class="action-sheet-card">
            <div class="action-sheet-item" onclick="deletePost('${postId}');document.getElementById('actionSheet').remove()">
                <span class="iconify" data-icon="ph:trash-bold"></span>
                <span>حذف المنشور</span>
            </div>
            <div class="action-sheet-item" onclick="document.getElementById('actionSheet').remove()">
                <span class="iconify" data-icon="ph:pencil-bold"></span>
                <span>تعديل المنشور</span>
            </div>
            <div class="action-sheet-hr"></div>
            <div class="action-sheet-item" onclick="handleShare('${postId}');document.getElementById('actionSheet').remove()">
                <span class="iconify" data-icon="ph:upload-simple-bold"></span>
                <span>مشاركة</span>
            </div>
            <div class="action-sheet-item" onclick="document.getElementById('actionSheet').remove()">
                <span class="iconify" data-icon="ph:x-bold"></span>
                <span>إلغاء</span>
            </div>
        </div>`;
        document.body.appendChild(el);
        if (window.Iconify) Iconify.scan(el);
    }
}

async function deletePost(postId) {
    if (!confirm('هل تريد حذف هذا المنشور؟')) return;
    if (postId.startsWith('local_')) {
        // Remove from local storage
        const user = store.get('user');
        if (user) {
            const posts = getLocalPosts().filter(p => p.id !== postId);
            localStorage.setItem('user_' + user.id + '_userPosts', JSON.stringify(posts));
        }
    } else {
        await Posts.delete(postId);
    }
    // Remove from store
    store.set('posts', (store.get('posts') || []).filter(p => p.id !== postId));
    store.set('userPosts', (store.get('userPosts') || []).filter(p => p.id !== postId));
    renderFeed();
    showToast('تم حذف المنشور');
}

function openUserMenu(event) {
    // Simple sign out menu
    event.stopPropagation();
    if (confirm('تسجيل الخروج؟')) Auth.signOut();
}

// ===== SHARE =====
function handleShare(postId) {
    const url = window.location.origin + window.location.pathname + '#post/' + postId;
    if (navigator.share) {
        navigator.share({ title: 'Lawbook', url }).catch(() => {});
    } else {
        navigator.clipboard?.writeText(url).then(() => showToast('تم نسخ الرابط'));
    }
}

// ===== VIEW OTHER PROFILE =====
window.viewProfile = async function(userId) {
    // For now, just show toast
    showToast('عرض الملف الشخصي قريباً...');
};

// ===== EVENT DELEGATION =====
document.addEventListener('click', async (e) => {
    const isGuest = !store.get('isLoggedIn');

    // Like button
    const likeBtn = e.target.closest('[data-like]');
    if (likeBtn) {
        e.stopPropagation();
        if (isGuest) { showAuthPrompt('الإعجاب'); return; }
        const postId = likeBtn.dataset.like;
        const isLiked = likeBtn.classList.toggle('liked');
        const icon = likeBtn.querySelector('.iconify');
        if (icon) icon.setAttribute('data-icon', isLiked ? 'ph:heart-fill' : 'ph:heart-bold');
        const countEl = likeBtn.querySelector('span:last-child');
        if (countEl) {
            const n = parseInt(countEl.textContent) || 0;
            countEl.textContent = isLiked ? n + 1 : Math.max(0, n - 1);
        }
        if (icon) { icon.style.animation = 'none'; requestAnimationFrame(() => { icon.style.animation = ''; icon.style.animationName = 'heartPop'; icon.style.animationDuration = '0.35s'; }); }
        if (window.Iconify) Iconify.scan(likeBtn);
        await Likes.toggle(postId);
        return;
    }

    // Bookmark button
    const bookmarkBtn = e.target.closest('[data-bookmark]');
    if (bookmarkBtn) {
        e.stopPropagation();
        if (isGuest) { showAuthPrompt('الحفظ'); return; }
        const postId = bookmarkBtn.dataset.bookmark;
        const isSaved = bookmarkBtn.classList.toggle('bookmarked');
        const icon = bookmarkBtn.querySelector('.iconify');
        if (icon) icon.setAttribute('data-icon', isSaved ? 'ph:bookmark-fill' : 'ph:bookmark-bold');
        if (window.Iconify) Iconify.scan(bookmarkBtn);
        showToast(isSaved ? 'تم الحفظ ✓' : 'تم إلغاء الحفظ');
        await Bookmarks.toggle(postId);
        return;
    }

    // Open post (comment action)
    const openPost = e.target.closest('[data-open-post]');
    if (openPost) {
        e.stopPropagation();
        if (isGuest) { showAuthPrompt('التعليق'); return; }
        openPostDetail(openPost.dataset.openPost);
        return;
    }

    // Repost
    const repostBtn = e.target.closest('[data-repost]');
    if (repostBtn) {
        e.stopPropagation();
        if (isGuest) { showAuthPrompt('إعادة النشر'); return; }
        repostBtn.classList.toggle('reposted');
        if (window.Iconify) Iconify.scan(repostBtn);
        showToast('تم إعادة النشر ✓');
        return;
    }

    // Share
    const shareBtn = e.target.closest('[data-share]');
    if (shareBtn) {
        e.stopPropagation();
        handleShare(shareBtn.dataset.share);
        return;
    }

    // Navigate data-navigate elements
    const navEl = e.target.closest('[data-navigate]');
    if (navEl) {
        e.preventDefault();
        navigateTo(navEl.dataset.navigate);
        return;
    }
});

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
    try { localStorage.setItem('user_' + user.id + '_userPosts', JSON.stringify(posts.slice(0, 50))); } catch(e) {}
}

function deduplicatePosts(posts) {
    const seen = new Set();
    return posts.filter(p => {
        const id = String(p.id);
        if (seen.has(id)) return false;
        seen.add(id);
        return true;
    });
}
