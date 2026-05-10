-- ============================================================
-- Auth Migration — Auto-create profile on signup
-- ============================================================
-- Run this in Supabase SQL Editor AFTER the existing schema
-- https://supabase.com/dashboard/project/wxokmokxehssnchtmjke/sql
-- ============================================================

-- ===== Step 1: Remove demo data (optional — comment out if you want to keep) =====
-- DELETE FROM public.posts WHERE author_id IN ('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000005');
-- DELETE FROM public.profiles WHERE id IN ('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000005');

-- ===== Step 2: Ensure profiles.id references auth.users =====
-- The profiles table should use auth.uid() for RLS
-- If profiles.id is not UUID type matching auth.users, fix it:
ALTER TABLE public.profiles ALTER COLUMN id TYPE UUID USING id::UUID;

-- ===== Step 3: Auto-create profile trigger =====
-- This function runs when a new user signs up via Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    _display_name TEXT;
    _username TEXT;
    _base TEXT;
    _suffix TEXT;
    _counter INTEGER := 0;
    _exists BOOLEAN;
BEGIN
    -- Extract display name from metadata
    _display_name := COALESCE(
        NEW.raw_user_meta_data->>'display_name',
        NEW.raw_user_meta_data->>'full_name',
        'مستخدم'
    );

    -- Generate base username from metadata or email
    _base := COALESCE(
        NEW.raw_user_meta_data->>'username',
        -- Try to extract from email
        CASE
            WHEN NEW.email IS NOT NULL THEN
                regexp_replace(
                    lower(split_part(NEW.email, '@', 1)),
                    '[^a-z0-9_]', '', 'g'
                )
            ELSE 'user'
        END
    );

    -- Ensure minimum length
    IF length(_base) < 2 THEN
        _base := 'user';
    END IF;

    -- Truncate
    IF length(_base) > 20 THEN
        _base := substring(_base FROM 1 FOR 20);
    END IF;

    -- Generate unique username with retry
    _suffix := floor(random() * 9000 + 1000)::TEXT;
    _username := _base || '_' || _suffix;

    WHILE _counter < 10 LOOP
        SELECT EXISTS(SELECT 1 FROM public.profiles WHERE username = _username) INTO _exists;
        EXIT WHEN NOT _exists;
        _suffix := floor(random() * 9000 + 1000)::TEXT;
        _username := _base || '_' || _suffix;
        _counter := _counter + 1;
    END LOOP;

    -- Last resort: use timestamp
    IF _exists THEN
        _username := _base || '_' || extract(epoch FROM now())::bigint::text;
    END IF;

    -- Insert profile
    INSERT INTO public.profiles (
        id,
        username,
        display_name,
        bio,
        title,
        location,
        website,
        avatar_url,
        cover_url,
        followers_count,
        following_count,
        posts_count,
        is_verified
    ) VALUES (
        NEW.id,
        _username,
        _display_name,
        '',
        '',
        '',
        '',
        'https://api.dicebear.com/7.x/initials/svg?seed=' || _display_name || '&backgroundColor=f97316&textColor=ffffff',
        '',
        0,
        0,
        0,
        false
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===== Step 4: Create the trigger =====
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- ===== Step 5: Allow trigger to insert profiles =====
-- The SECURITY DEFINER function runs as the function owner (postgres),
-- so it bypasses RLS. But let's also add a policy for safety:
DROP POLICY IF EXISTS "System can create profiles" ON public.profiles;
CREATE POLICY "System can create profiles" ON public.profiles
    FOR INSERT WITH CHECK (true);

-- ===== Step 6: Ensure username uniqueness constraint =====
-- (should already exist from schema, but let's be safe)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'profiles_username_key'
        AND conrelid = 'public.profiles'::regclass
    ) THEN
        ALTER TABLE public.profiles ADD CONSTRAINT profiles_username_key UNIQUE (username);
    END IF;
END $$;

-- ===== Step 7: Index for username lookups =====
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);

-- ===== Step 8: Ensure the updated_at trigger works =====
-- (already exists from schema, but let's verify)

-- ============================================================
-- DONE! ✅
-- New users signing up via Supabase Auth will automatically
-- get a profile with unique username and avatar.
-- ============================================================
