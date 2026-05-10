-- ============================================================
-- RLS Policies — أمان على مستوى الصفوف
-- ============================================================
-- يضمن أن كل مستخدم يمكنه فقط الوصول لبياناته الخاصة
-- يجب تشغيل هذا بعد supabase-schema.sql
-- ============================================================

-- تفعيل RLS على جميع الجداول
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events_registrations ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- PROFILES
-- ============================================================
-- الجميع يمكنه قراءة الملفات الشخصية
CREATE POLICY "profiles_select" ON public.profiles
    FOR SELECT USING (true);

-- كل مستخدم يحدث ملفه فقط
CREATE POLICY "profiles_update" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- المستخدمون الجدد يمكنهم إنشاء ملفهم
CREATE POLICY "profiles_insert" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- ============================================================
-- POSTS
-- ============================================================
-- الجميع يمكنه قراءة المنشورات
CREATE POLICY "posts_select" ON public.posts
    FOR SELECT USING (true);

-- كل مستخدم ينشئ منشوراته فقط
CREATE POLICY "posts_insert" ON public.posts
    FOR INSERT WITH CHECK (auth.uid() = author_id);

-- كل مستخدم يحدث منشوراته فقط
CREATE POLICY "posts_update" ON public.posts
    FOR UPDATE USING (auth.uid() = author_id);

-- كل مستخدم يحذف منشوراته فقط
CREATE POLICY "posts_delete" ON public.posts
    FOR DELETE USING (auth.uid() = author_id);

-- ============================================================
-- LIKES
-- ============================================================
CREATE POLICY "likes_select" ON public.likes
    FOR SELECT USING (true);

CREATE POLICY "likes_insert" ON public.likes
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "likes_delete" ON public.likes
    FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- COMMENTS
-- ============================================================
CREATE POLICY "comments_select" ON public.comments
    FOR SELECT USING (true);

CREATE POLICY "comments_insert" ON public.comments
    FOR INSERT WITH CHECK (auth.uid() = author_id);

CREATE POLICY "comments_delete" ON public.comments
    FOR DELETE USING (auth.uid() = author_id);

-- ============================================================
-- BOOKMARKS
-- ============================================================
CREATE POLICY "bookmarks_select" ON public.bookmarks
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "bookmarks_insert" ON public.bookmarks
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "bookmarks_delete" ON public.bookmarks
    FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- FOLLOWS
-- ============================================================
CREATE POLICY "follows_select" ON public.follows
    FOR SELECT USING (true);

CREATE POLICY "follows_insert" ON public.follows
    FOR INSERT WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "follows_delete" ON public.follows
    FOR DELETE USING (auth.uid() = follower_id);

-- ============================================================
-- MESSAGES
-- ============================================================
-- المستخدم يرى فقط الرسائل المرسلة أو المستلمة
CREATE POLICY "messages_select" ON public.messages
    FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "messages_insert" ON public.messages
    FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- المستخدم يحدث الرسائل المستلمة فقط ( marking as read )
CREATE POLICY "messages_update" ON public.messages
    FOR UPDATE USING (auth.uid() = receiver_id);

-- ============================================================
-- STORIES
-- ============================================================
CREATE POLICY "stories_select" ON public.stories
    FOR SELECT USING (true);

CREATE POLICY "stories_insert" ON public.stories
    FOR INSERT WITH CHECK (auth.uid() = author_id);

CREATE POLICY "stories_delete" ON public.stories
    FOR DELETE USING (auth.uid() = author_id);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE POLICY "notifications_select" ON public.notifications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "notifications_update" ON public.notifications
    FOR UPDATE USING (auth.uid() = user_id);

-- ============================================================
-- ARTICLES
-- ============================================================
CREATE POLICY "articles_select" ON public.articles
    FOR SELECT USING (status = 'published' OR auth.uid() = author_id);

CREATE POLICY "articles_insert" ON public.articles
    FOR INSERT WITH CHECK (auth.uid() = author_id);

CREATE POLICY "articles_delete" ON public.articles
    FOR DELETE USING (auth.uid() = author_id);

-- ============================================================
-- EVENTS REGISTRATIONS
-- ============================================================
CREATE POLICY "events_select" ON public.events_registrations
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "events_insert" ON public.events_registrations
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "events_delete" ON public.events_registrations
    FOR DELETE USING (auth.uid() = user_id);
