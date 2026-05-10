-- ============================================================
-- Lawbook Supabase Schema - قاعدة البيانات الكاملة
-- ============================================================
-- انسخ هذا الكود والصقه في Supabase SQL Editor
-- https://supabase.com/dashboard/project/wxokmokxehssnchtmjke/sql

-- تنظيف الجداول القديمة إن وجدت
DROP TABLE IF EXISTS public.comments CASCADE;
DROP TABLE IF EXISTS public.likes CASCADE;
DROP TABLE IF EXISTS public.bookmarks CASCADE;
DROP TABLE IF EXISTS public.follows CASCADE;
DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.posts CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.stories CASCADE;
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.articles CASCADE;
DROP TABLE IF EXISTS public.events_registrations CASCADE;

-- ============================================================
-- جدول الملفات الشخصية
-- ============================================================
CREATE TABLE public.profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    bio TEXT DEFAULT '',
    title TEXT DEFAULT '',
    location TEXT DEFAULT '',
    website TEXT DEFAULT '',
    avatar_url TEXT DEFAULT '',
    cover_url TEXT DEFAULT '',
    followers_count INTEGER DEFAULT 0,
    following_count INTEGER DEFAULT 0,
    posts_count INTEGER DEFAULT 0,
    is_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- جدول المنشورات
-- ============================================================
CREATE TABLE public.posts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    author_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    title TEXT DEFAULT '',
    tags TEXT[] DEFAULT '{}',
    media_urls TEXT[] DEFAULT '{}',
    likes_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    shares_count INTEGER DEFAULT 0,
    is_repost BOOLEAN DEFAULT false,
    repost_of UUID REFERENCES public.posts(id) ON DELETE SET NULL,
    is_edited BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- جدول الإعجابات
-- ============================================================
CREATE TABLE public.likes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, post_id)
);

-- ============================================================
-- جدول التعليقات
-- ============================================================
CREATE TABLE public.comments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
    author_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_sticker BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- جدول المحفوظات
-- ============================================================
CREATE TABLE public.bookmarks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, post_id)
);

-- ============================================================
-- جدول المتابعة
-- ============================================================
CREATE TABLE public.follows (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    follower_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    following_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(follower_id, following_id),
    CHECK(follower_id != following_id)
);

-- ============================================================
-- جدول الرسائل
-- ============================================================
CREATE TABLE public.messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    receiver_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- جدول الحالات (Stories)
-- ============================================================
CREATE TABLE public.stories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    author_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT DEFAULT '',
    media_url TEXT DEFAULT '',
    story_type TEXT DEFAULT 'text' CHECK (story_type IN ('text', 'image', 'video')),
    bg_color TEXT DEFAULT '',
    duration INTEGER DEFAULT 5000,
    expires_at TIMESTAMPTZ DEFAULT (now() + INTERVAL '24 hours'),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- جدول الإشعارات
-- ============================================================
CREATE TABLE public.notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    from_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    type TEXT NOT NULL CHECK (type IN ('like', 'comment', 'follow', 'mention', 'share', 'message')),
    post_id UUID REFERENCES public.posts(id) ON DELETE SET NULL,
    content TEXT DEFAULT '',
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- جدول المقالات
-- ============================================================
CREATE TABLE public.articles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    author_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    tags TEXT[] DEFAULT '{}',
    views_count INTEGER DEFAULT 0,
    likes_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    status TEXT DEFAULT 'published' CHECK (status IN ('draft', 'published')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- جدول تسجيل الفعاليات
-- ============================================================
CREATE TABLE public.events_registrations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    event_id TEXT NOT NULL,
    event_title TEXT DEFAULT '',
    registered_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, event_id)
);

-- ============================================================
-- Indexes للأداء
-- ============================================================
CREATE INDEX idx_posts_author ON public.posts(author_id);
CREATE INDEX idx_posts_created ON public.posts(created_at DESC);
CREATE INDEX idx_posts_tags ON public.posts USING GIN(tags);
CREATE INDEX idx_comments_post ON public.comments(post_id);
CREATE INDEX idx_likes_post ON public.likes(post_id);
CREATE INDEX idx_likes_user ON public.likes(user_id);
CREATE INDEX idx_bookmarks_user ON public.bookmarks(user_id);
CREATE INDEX idx_follows_follower ON public.follows(follower_id);
CREATE INDEX idx_follows_following ON public.follows(following_id);
CREATE INDEX idx_messages_sender ON public.messages(sender_id);
CREATE INDEX idx_messages_receiver ON public.messages(receiver_id);
CREATE INDEX idx_messages_created ON public.messages(created_at DESC);
CREATE INDEX idx_stories_author ON public.stories(author_id);
CREATE INDEX idx_stories_expires ON public.stories(expires_at);
CREATE INDEX idx_notifications_user ON public.notifications(user_id);
CREATE INDEX idx_notifications_read ON public.notifications(user_id, is_read);
CREATE INDEX idx_articles_author ON public.articles(author_id);

-- ============================================================
-- RLS Policies (Row Level Security)
-- ============================================================
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

-- Profiles: anyone can read, only owner can update
CREATE POLICY "Profiles readable by all" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Posts: anyone can read, authenticated can create, owner can update/delete
CREATE POLICY "Posts readable by all" ON public.posts FOR SELECT USING (true);
CREATE POLICY "Authenticated can create posts" ON public.posts FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Owner can update posts" ON public.posts FOR UPDATE USING (auth.uid() = author_id);
CREATE POLICY "Owner can delete posts" ON public.posts FOR DELETE USING (auth.uid() = author_id);

-- Likes: anyone can read, authenticated can create/delete
CREATE POLICY "Likes readable by all" ON public.likes FOR SELECT USING (true);
CREATE POLICY "Authenticated can like" ON public.likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owner can unlike" ON public.likes FOR DELETE USING (auth.uid() = user_id);

-- Comments: anyone can read, authenticated can create
CREATE POLICY "Comments readable by all" ON public.comments FOR SELECT USING (true);
CREATE POLICY "Authenticated can comment" ON public.comments FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Owner can delete comment" ON public.comments FOR DELETE USING (auth.uid() = author_id);

-- Bookmarks: only owner can CRUD
CREATE POLICY "Owner can view bookmarks" ON public.bookmarks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Owner can add bookmark" ON public.bookmarks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owner can remove bookmark" ON public.bookmarks FOR DELETE USING (auth.uid() = user_id);

-- Follows: anyone can read, authenticated can create/delete
CREATE POLICY "Follows readable by all" ON public.follows FOR SELECT USING (true);
CREATE POLICY "Authenticated can follow" ON public.follows FOR INSERT WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "Owner can unfollow" ON public.follows FOR DELETE USING (auth.uid() = follower_id);

-- Messages: only participants can read/create
CREATE POLICY "Participants can view messages" ON public.messages FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
CREATE POLICY "Authenticated can send messages" ON public.messages FOR INSERT WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "Receiver can mark as read" ON public.messages FOR UPDATE USING (auth.uid() = receiver_id);

-- Stories: anyone can read, authenticated can create
CREATE POLICY "Stories readable by all" ON public.stories FOR SELECT USING (expires_at > now());
CREATE POLICY "Authenticated can create stories" ON public.stories FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Owner can delete stories" ON public.stories FOR DELETE USING (auth.uid() = author_id);

-- Notifications: only owner can read/update
CREATE POLICY "Owner can view notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can create notifications" ON public.notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "Owner can mark as read" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);

-- Articles: anyone can read, authenticated can CRUD own
CREATE POLICY "Articles readable by all" ON public.articles FOR SELECT USING (true);
CREATE POLICY "Authenticated can create articles" ON public.articles FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Owner can update articles" ON public.articles FOR UPDATE USING (auth.uid() = author_id);
CREATE POLICY "Owner can delete articles" ON public.articles FOR DELETE USING (auth.uid() = author_id);

-- Events: owner can CRUD
CREATE POLICY "Owner can view registrations" ON public.events_registrations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Owner can register" ON public.events_registrations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owner can unregister" ON public.events_registrations FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- Functions & Triggers
-- ============================================================

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER posts_updated_at BEFORE UPDATE ON public.posts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER articles_updated_at BEFORE UPDATE ON public.articles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Update post counts on like/unlike
CREATE OR REPLACE FUNCTION update_post_likes_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.posts SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = OLD.post_id;
        RETURN OLD;
    END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER likes_count_trigger AFTER INSERT OR DELETE ON public.likes
    FOR EACH ROW EXECUTE FUNCTION update_post_likes_count();

-- Update post counts on comment
CREATE OR REPLACE FUNCTION update_post_comments_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.posts SET comments_count = comments_count + 1 WHERE id = NEW.post_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.posts SET comments_count = GREATEST(comments_count - 1, 0) WHERE id = OLD.post_id;
        RETURN OLD;
    END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER comments_count_trigger AFTER INSERT OR DELETE ON public.comments
    FOR EACH ROW EXECUTE FUNCTION update_post_comments_count();

-- Update follower/following counts
CREATE OR REPLACE FUNCTION update_follow_counts()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.profiles SET following_count = following_count + 1 WHERE id = NEW.follower_id;
        UPDATE public.profiles SET followers_count = followers_count + 1 WHERE id = NEW.following_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.profiles SET following_count = GREATEST(following_count - 1, 0) WHERE id = OLD.follower_id;
        UPDATE public.profiles SET followers_count = GREATEST(followers_count - 1, 0) WHERE id = OLD.following_id;
        RETURN OLD;
    END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER follow_counts_trigger AFTER INSERT OR DELETE ON public.follows
    FOR EACH ROW EXECUTE FUNCTION update_follow_counts();

-- ============================================================
-- بيانات تجريبية (Demo Data)
-- ============================================================
INSERT INTO public.profiles (id, username, display_name, bio, title, location, avatar_url, is_verified, followers_count, following_count, posts_count) VALUES
    ('00000000-0000-0000-0000-000000000001', 'ahmed_alkhalidi', 'د. أحمد الخالدي', 'محامي دولي متخصص في التحكيم التجاري وقانون الشركات. خبرة +15 عاماً.', 'محامي دولي', 'دبي، الإمارات', 'https://picsum.photos/seed/lawyer-me/120/120.jpg', true, 1247, 856, 34),
    ('00000000-0000-0000-0000-000000000002', 'mohammed_shuaibi', 'د. محمد علي الشعيبي', 'محامي تحكيم دولي', 'محامي تحكيم دولي', 'الرياض، السعودية', 'https://picsum.photos/seed/mohammed-ali/80/80.jpg', true, 890, 234, 28),
    ('00000000-0000-0000-0000-000000000003', 'sara_almansouri', 'سارة المنصوري', 'مستشارة قانونية', 'مستشارة قانونية', 'أبوظبي، الإمارات', 'https://picsum.photos/seed/sara-legal/80/80.jpg', false, 567, 189, 15),
    ('00000000-0000-0000-0000-000000000004', 'khalid_alomari', 'خالد العمري', 'أستاذ القانون الدولي', 'أستاذ القانون الدولي', 'عمان، الأردن', 'https://picsum.photos/seed/khalid-jordan/80/80.jpg', true, 1100, 445, 42),
    ('00000000-0000-0000-0000-000000000005', 'fatima_alharbi', 'فاطمة الحربي', 'خبيرة تقنية مالية', 'خبيرة تقنية مالية', 'جدة، السعودية', 'https://picsum.photos/seed/fatima-fintech/80/80.jpg', false, 345, 123, 8);

-- منشورات تجريبية
INSERT INTO public.posts (id, author_id, content, title, tags, likes_count, comments_count, shares_count) VALUES
    ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'محكمة التحكيم الدولية نشرت تقريرها السنوي الجديد الذي يرصد تطور قضايا الطاقة والموارد الطبيعية. من أبرز المObservations: ارتفاع 40% في عدد القضايا المتعلقة بالعقود النفطية...', 'التحكيم في قضايا الطاقة: دراسة حالة جديدة', ARRAY['#التحكيم_الدولي','#قانون_الطاقة'], 187, 42, 28),
    ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000004', 'بعد صدور قانون الشركات الموحد في دول مجلس التعاون، نشرت مكتبنا دراسة تحليلية شاملة تغطي أبرز التغييرات:', 'قانون الشركات الموحد: تحليل شامل', ARRAY['#قانون_الشركات','#مجلس_التعاون'], 256, 67, 45),
    ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000003', 'تحديث مهم: صدر المرسوم التنفيذي الجديد لقانون حماية البيانات الشخصية في الإمارات.', '', ARRAY['#حماية_البيانات','#الإمارات'], 134, 28, 19);

-- ============================================================
-- تم! ✅ قاعدة البيانات جاهزة
-- ============================================================
