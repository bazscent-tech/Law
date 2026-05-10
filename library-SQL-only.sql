-- ============================================================
-- ميزة المكتبة الشخصية — Personal Library Feature
-- انسخ هذا كله والصقه في Supabase SQL Editor
-- https://supabase.com/dashboard/project/wxokmokxehssnchtmjke/sql
-- ============================================================

-- ===== المكتبات =====
CREATE TABLE IF NOT EXISTS public.libraries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    icon TEXT DEFAULT '📚',
    color TEXT DEFAULT '#f97316',
    visibility TEXT DEFAULT 'public' CHECK (visibility IN ('public', 'followers', 'private')),
    items_count INTEGER DEFAULT 0,
    followers_count INTEGER DEFAULT 0,
    views_count INTEGER DEFAULT 0,
    is_pinned BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===== عناصر المكتبة =====
CREATE TABLE IF NOT EXISTS public.library_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    library_id UUID REFERENCES public.libraries(id) ON DELETE CASCADE,
    author_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    type TEXT DEFAULT 'note' CHECK (type IN ('note', 'document', 'link', 'post_reference')),
    title TEXT NOT NULL,
    content TEXT DEFAULT '',
    url TEXT DEFAULT '',
    file_url TEXT DEFAULT '',
    file_name TEXT DEFAULT '',
    file_size INTEGER DEFAULT 0,
    cover_image TEXT DEFAULT '',
    tags TEXT[] DEFAULT '{}',
    category TEXT DEFAULT 'general',
    is_pinned BOOLEAN DEFAULT FALSE,
    post_id UUID REFERENCES public.posts(id) ON DELETE SET NULL,
    sort_order INTEGER DEFAULT 0,
    views_count INTEGER DEFAULT 0,
    saves_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===== حفظ عنصر في مكتبة =====
CREATE TABLE IF NOT EXISTS public.library_saves (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    item_id UUID REFERENCES public.library_items(id) ON DELETE CASCADE,
    library_id UUID REFERENCES public.libraries(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, item_id)
);

-- ===== متابعة مكتبة =====
CREATE TABLE IF NOT EXISTS public.library_follows (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    library_id UUID REFERENCES public.libraries(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, library_id)
);

-- ===== Indexes =====
CREATE INDEX IF NOT EXISTS idx_libraries_owner ON public.libraries(owner_id);
CREATE INDEX IF NOT EXISTS idx_library_items_library ON public.library_items(library_id);
CREATE INDEX IF NOT EXISTS idx_library_items_author ON public.library_items(author_id);
CREATE INDEX IF NOT EXISTS idx_library_items_type ON public.library_items(type);
CREATE INDEX IF NOT EXISTS idx_library_items_tags ON public.library_items USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_library_saves_user ON public.library_saves(user_id);
CREATE INDEX IF NOT EXISTS idx_library_follows_user ON public.library_follows(user_id);

-- ===== RLS Policies =====
ALTER TABLE public.libraries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.library_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.library_saves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.library_follows ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public libraries visible to all') THEN
        CREATE POLICY "Public libraries visible to all" ON public.libraries
            FOR SELECT USING (visibility = 'public' OR owner_id = auth.uid());
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage own libraries') THEN
        CREATE POLICY "Users can manage own libraries" ON public.libraries
            FOR ALL USING (owner_id = auth.uid());
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Items follow library visibility') THEN
        CREATE POLICY "Items follow library visibility" ON public.library_items
            FOR SELECT USING (
                EXISTS (
                    SELECT 1 FROM public.libraries
                    WHERE libraries.id = library_items.library_id
                    AND (libraries.visibility = 'public' OR libraries.owner_id = auth.uid())
                )
            );
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage own items') THEN
        CREATE POLICY "Users can manage own items" ON public.library_items
            FOR ALL USING (author_id = auth.uid());
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage own saves') THEN
        CREATE POLICY "Users can manage own saves" ON public.library_saves
            FOR ALL USING (user_id = auth.uid());
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage own follows') THEN
        CREATE POLICY "Users can manage own follows" ON public.library_follows
            FOR ALL USING (user_id = auth.uid());
    END IF;
END $$;

-- ===== Triggers =====
CREATE OR REPLACE FUNCTION update_library_items_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.libraries SET items_count = items_count + 1, updated_at = NOW()
        WHERE id = NEW.library_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.libraries SET items_count = GREATEST(items_count - 1, 0), updated_at = NOW()
        WHERE id = OLD.library_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_library_items_count ON public.library_items;
CREATE TRIGGER trg_library_items_count
AFTER INSERT OR DELETE ON public.library_items
FOR EACH ROW EXECUTE FUNCTION update_library_items_count();

DROP TRIGGER IF EXISTS trg_libraries_updated_at ON public.libraries;
CREATE TRIGGER trg_libraries_updated_at
BEFORE UPDATE ON public.libraries
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_library_items_updated_at ON public.library_items;
CREATE TRIGGER trg_library_items_updated_at
BEFORE UPDATE ON public.library_items
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- تم! ✅ جداول المكتبة جاهزة
-- ============================================================
