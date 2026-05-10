        // ============================================================
        // ===== SUPABASE INTEGRATION MODULE ========================
        // ============================================================
        const SB_URL = 'https://wxokmokxehssnchtmjke.supabase.co';
        const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4b2ttb2t4ZWhzc25jaHRtamtlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODMxODgyNCwiZXhwIjoyMDkzODk0ODI0fQ.AN5SkazpJVm4R-6Pdh2ZqvzqhNIM-Mu2XHCbrCmqs3g';

        let sb = null; // Supabase client
        let sbUser = null; // Current auth user
        let sbProfile = null; // Current user profile from DB
        let sbOnline = false; // Whether Supabase is reachable

        // Initialize Supabase
        async function initSupabase() {
            try {
                if (typeof supabase !== 'undefined' && supabase.createClient) {
                    sb = supabase.createClient(SB_URL, SB_KEY);
                    // Test connection
                    const { data, error } = await sb.from('profiles').select('id').limit(1);
                    if (!error) {
                        sbOnline = true;
                        console.log('✅ Supabase connected');
                        return true;
                    } else {
                        console.warn('Supabase tables not found.');
                        sbOnline = false;
                    }
                }
            } catch (e) {
                console.warn('Supabase unavailable, using localStorage:', e.message);
                sbOnline = false;
            }
            return false;
        }

        // Load current user profile
        async function loadUserProfile() {
            if (!sb || !sbUser) return null;
            const { data } = await sb.from('profiles').select('*').eq('id', sbUser.id).single();
            sbProfile = data;
            return data;
        }

        // Auth: Load profile directly (bypass Supabase Auth)
        async function signInAnonymously() {
            if (!sb) return null;
            try {
                // Get the first profile as the "logged in" user
                const { data: profiles } = await sb.from('profiles')
                    .select('*')
                    .order('created_at', { ascending: true })
                    .limit(1);
                if (profiles && profiles.length > 0) {
                    sbProfile = profiles[0];
                    sbUser = { id: sbProfile.id };
                    console.log('✅ Supabase profile:', sbProfile.name);
                    return sbUser;
                }
            } catch(e) {
                console.warn('Profile load failed:', e.message);
            }
            return null;
        }

        // ============================================================
        // SUPABASE CRUD OPERATIONS (with localStorage fallback)
        // ============================================================

        const SB = {
            // POSTS
            async getPosts(limit = 20, offset = 0) {
                if (!sbOnline) return null;
                const { data } = await sb.from('posts')
                    .select('*, profiles(*)')
                    .order('created_at', { ascending: false })
                    .range(offset, offset + limit - 1);
                return data;
            },

            async createPost(content, title = '', tags = []) {
                if (!sbOnline || !sbUser) return null;
                const { data } = await sb.from('posts').insert({
                    author_id: sbUser.id,
                    content, title, tags
                }).select('*, profiles(*)').single();
                return data;
            },

            async deletePost(postId) {
                if (!sbOnline || !sbUser) return;
                await sb.from('posts').delete().eq('id', postId).eq('author_id', sbUser.id);
            },

            // LIKES
            async toggleLike(postId) {
                if (!sbOnline || !sbUser) return null;
                // Check if already liked
                const { data: existing } = await sb.from('likes')
                    .select('id').eq('user_id', sbUser.id).eq('post_id', postId).maybeSingle();
                if (existing) {
                    await sb.from('likes').delete().eq('id', existing.id);
                    return false; // unliked
                } else {
                    await sb.from('likes').insert({ user_id: sbUser.id, post_id: postId });
                    return true; // liked
                }
            },

            async isLiked(postId) {
                if (!sbOnline || !sbUser) return false;
                const { data } = await sb.from('likes')
                    .select('id').eq('user_id', sbUser.id).eq('post_id', postId).maybeSingle();
                return !!data;
            },

            // COMMENTS
            async getComments(postId) {
                if (!sbOnline) return null;
                const { data } = await sb.from('comments')
                    .select('*, profiles(*)')
                    .eq('post_id', postId)
                    .order('created_at', { ascending: true });
                return data;
            },

            async addComment(postId, content, isSticker = false) {
                if (!sbOnline || !sbUser) return null;
                const { data } = await sb.from('comments').insert({
                    post_id: postId, author_id: sbUser.id,
                    content, is_sticker: isSticker
                }).select('*, profiles(*)').single();
                return data;
            },

            // BOOKMARKS
            async toggleBookmark(postId) {
                if (!sbOnline || !sbUser) return null;
                const { data: existing } = await sb.from('bookmarks')
                    .select('id').eq('user_id', sbUser.id).eq('post_id', postId).maybeSingle();
                if (existing) {
                    await sb.from('bookmarks').delete().eq('id', existing.id);
                    return false;
                } else {
                    await sb.from('bookmarks').insert({ user_id: sbUser.id, post_id: postId });
                    return true;
                }
            },

            async getBookmarks() {
                if (!sbOnline || !sbUser) return null;
                const { data } = await sb.from('bookmarks')
                    .select('*, posts(*, profiles(*))')
                    .eq('user_id', sbUser.id)
                    .order('created_at', { ascending: false });
                return data;
            },

            // FOLLOWS
            async toggleFollow(userId) {
                if (!sbOnline || !sbUser) return null;
                const { data: existing } = await sb.from('follows')
                    .select('id').eq('follower_id', sbUser.id).eq('following_id', userId).maybeSingle();
                if (existing) {
                    await sb.from('follows').delete().eq('id', existing.id);
                    return false;
                } else {
                    await sb.from('follows').insert({ follower_id: sbUser.id, following_id: userId });
                    return true;
                }
            },

            async getFollowing() {
                if (!sbOnline || !sbUser) return null;
                const { data } = await sb.from('follows')
                    .select('following_id, profiles!following_id(*)')
                    .eq('follower_id', sbUser.id);
                return data;
            },

            async isFollowing(userId) {
                if (!sbOnline || !sbUser) return false;
                const { data } = await sb.from('follows')
                    .select('id').eq('follower_id', sbUser.id).eq('following_id', userId).maybeSingle();
                return !!data;
            },

            // MESSAGES
            async getConversations() {
                if (!sbOnline || !sbUser) return null;
                // Get unique conversation partners
                const { data: sent } = await sb.from('messages')
                    .select('receiver_id, profiles!receiver_id(*)')
                    .eq('sender_id', sbUser.id)
                    .order('created_at', { ascending: false });
                const { data: received } = await sb.from('messages')
                    .select('sender_id, profiles!sender_id(*)')
                    .eq('receiver_id', sbUser.id)
                    .order('created_at', { ascending: false });
                // Merge and deduplicate
                const partners = new Map();
                if (sent) sent.forEach(m => { if (!partners.has(m.receiver_id)) partners.set(m.receiver_id, m.profiles); });
                if (received) received.forEach(m => { if (!partners.has(m.sender_id)) partners.set(m.sender_id, m.profiles); });
                return Array.from(partners.entries()).map(([id, profile]) => ({ userId: id, profile }));
            },

            async getMessages(otherUserId) {
                if (!sbOnline || !sbUser) return null;
                const { data } = await sb.from('messages')
                    .select('*')
                    .or(`and(sender_id.eq.${sbUser.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${sbUser.id})`)
                    .order('created_at', { ascending: true });
                return data;
            },

            async sendMessage(receiverId, content) {
                if (!sbOnline || !sbUser) return null;
                const { data } = await sb.from('messages').insert({
                    sender_id: sbUser.id, receiver_id: receiverId, content
                }).select().single();
                return data;
            },

            async getUnreadCount() {
                if (!sbOnline || !sbUser) return 0;
                const { count } = await sb.from('messages')
                    .select('*', { count: 'exact', head: true })
                    .eq('receiver_id', sbUser.id).eq('is_read', false);
                return count || 0;
            },

            async markConversationRead(otherUserId) {
                if (!sbOnline || !sbUser) return;
                await sb.from('messages').update({ is_read: true })
                    .eq('sender_id', otherUserId).eq('receiver_id', sbUser.id).eq('is_read', false);
            },

            // STORIES
            async getActiveStories() {
                if (!sbOnline) return null;
                const { data } = await sb.from('stories')
                    .select('*, profiles(*)')
                    .gt('expires_at', new Date().toISOString())
                    .order('created_at', { ascending: false });
                return data;
            },

            async createStory(content, type = 'text', mediaUrl = '', bgColor = '') {
                if (!sbOnline || !sbUser) return null;
                const { data } = await sb.from('stories').insert({
                    author_id: sbUser.id, content,
                    type: type, media_url: mediaUrl, bg_color: bgColor
                }).select().single();
                return data;
            },

            // ARTICLES
            async getArticles() {
                if (!sbOnline) return null;
                const { data } = await sb.from('articles')
                    .select('*, profiles(*)')
                    .eq('status', 'published')
                    .order('created_at', { ascending: false });
                return data;
            },

            async createArticle(title, content, tags = []) {
                if (!sbOnline || !sbUser) return null;
                const { data } = await sb.from('articles').insert({
                    author_id: sbUser.id, title, content, tags
                }).select().single();
                return data;
            },

            // NOTIFICATIONS
            async getNotifications() {
                if (!sbOnline || !sbUser) return null;
                const { data } = await sb.from('notifications')
                    .select('*, from_user:profiles!actor_id(*)')
                    .eq('user_id', sbUser.id)
                    .order('created_at', { ascending: false })
                    .limit(50);
                return data;
            },

            async markNotificationsRead() {
                if (!sbOnline || !sbUser) return;
                await sb.from('notifications').update({ is_read: true })
                    .eq('user_id', sbUser.id).eq('is_read', false);
            },

            // EVENTS
            async registerEvent(eventId, eventTitle) {
                if (!sbOnline || !sbUser) return null;
                const { data } = await sb.from('events_registrations').insert({
                    user_id: sbUser.id, event_id: eventId, event_title: eventTitle
                }).select().single();
                return data;
            },

            async unregisterEvent(eventId) {
                if (!sbOnline || !sbUser) return;
                await sb.from('events_registrations').delete()
                    .eq('user_id', sbUser.id).eq('event_id', eventId);
            },

            async getRegisteredEvents() {
                if (!sbOnline || !sbUser) return null;
                const { data } = await sb.from('events_registrations')
                    .select('event_id').eq('user_id', sbUser.id);
                return data ? data.map(d => d.event_id) : [];
            },

            // SEARCH
            async searchPosts(query) {
                if (!sbOnline) return null;
                const { data } = await sb.from('posts')
                    .select('*, profiles(*)')
                    .or(`content.ilike.%${query}%,name.ilike.%${query}%`)
                    .order('created_at', { ascending: false })
                    .limit(20);
                return data;
            },

            async searchProfiles(query) {
                if (!sbOnline) return null;
                const { data } = await sb.from('profiles')
                    .select('*')
                    .or(`display_name.ilike.%${query}%,username.ilike.%${query}%,name.ilike.%${query}%`)
                    .limit(10);
                return data;
            },

            // UTILITY
            isConnected() { return sbOnline; },
            getCurrentUser() { return sbUser; },
            getCurrentProfile() { return sbProfile; }
        };

