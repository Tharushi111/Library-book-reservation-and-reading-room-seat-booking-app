-- ==============================================================================
-- SLIIT LIBRARY: ANNOUNCEMENTS TO NOTIFICATIONS FULL CRUD SYNCHRONIZATION
-- Execute in your NEW development Supabase SQL Editor:
-- https://supabase.com/dashboard/project/wkafyepfqqjqbytxghfd/sql
-- ==============================================================================

-- 1. ADD ANNOUNCEMENT_ID TO NOTIFICATIONS WITH CASCADE DELETE
ALTER TABLE public.notifications 
ADD COLUMN IF NOT EXISTS announcement_id UUID REFERENCES public.announcements(id) ON DELETE CASCADE;

-- 2. DROP ANY OLD PARTIAL INDEXES & ENFORCE UNIQUE TABLE CONSTRAINT
-- Drops partial index that caused PostgreSQL error 42P10
DROP INDEX IF EXISTS public.idx_notifications_user_announcement;

-- Clean up any duplicates before applying unique constraint (safety check)
DELETE FROM public.notifications a
USING public.notifications b
WHERE a.id < b.id 
  AND a.user_id = b.user_id 
  AND a.announcement_id IS NOT NULL 
  AND a.announcement_id = b.announcement_id;

-- Add formal UNIQUE constraint matching ON CONFLICT (user_id, announcement_id)
ALTER TABLE public.notifications 
DROP CONSTRAINT IF EXISTS uq_notifications_user_announcement;

ALTER TABLE public.notifications 
ADD CONSTRAINT uq_notifications_user_announcement UNIQUE (user_id, announcement_id);

-- Performance index for foreign key queries
CREATE INDEX IF NOT EXISTS idx_notifications_announcement_id 
ON public.notifications(announcement_id);


-- 3. STAFF RLS POLICIES FOR NOTIFICATIONS
-- Ensure staff can update and delete notifications (essential for announcements sync)
DROP POLICY IF EXISTS "notifications_staff_update" ON public.notifications;
CREATE POLICY "notifications_staff_update"
ON public.notifications FOR UPDATE
TO authenticated
USING (public.is_staff(auth.uid()))
WITH CHECK (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "notifications_staff_delete" ON public.notifications;
CREATE POLICY "notifications_staff_delete"
ON public.notifications FOR DELETE
TO authenticated
USING (public.is_staff(auth.uid()));


-- 4. UPDATE NOTIFICATION COLUMN PROTECTION TRIGGER
-- Ensure database triggers and library staff can update notification title/message
CREATE OR REPLACE FUNCTION public.protect_notification_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_caller_id UUID := auth.uid();
BEGIN
    IF v_caller_id IS NOT NULL AND NOT public.is_staff(v_caller_id) THEN
        IF NEW.user_id IS DISTINCT FROM OLD.user_id OR
           NEW.title IS DISTINCT FROM OLD.title OR
           NEW.message IS DISTINCT FROM OLD.message OR
           NEW.type IS DISTINCT FROM OLD.type OR
           NEW.created_at IS DISTINCT FROM OLD.created_at OR
           NEW.announcement_id IS DISTINCT FROM OLD.announcement_id THEN
            RAISE EXCEPTION 'Permission denied: Students may only update the notification read status.';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;


-- 5. ANNOUNCEMENTS -> NOTIFICATIONS FULL CRUD SYNCHRONIZATION TRIGGER FUNCTION
CREATE OR REPLACE FUNCTION public.fn_sync_announcement_to_notifications()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    -- -------------------------------------------------------------
    -- 1. ANNOUNCEMENT DELETED -> REMOVE NOTIFICATIONS FOR ALL USERS
    -- -------------------------------------------------------------
    IF TG_OP = 'DELETE' THEN
        DELETE FROM public.notifications 
        WHERE announcement_id = OLD.id;
        RETURN OLD;
    END IF;

    -- -------------------------------------------------------------
    -- 2. ANNOUNCEMENT INSERTED -> CREATE NOTIFICATIONS IF PUBLISHED
    -- -------------------------------------------------------------
    IF TG_OP = 'INSERT' THEN
        IF NEW.is_published = true THEN
            INSERT INTO public.notifications (
                user_id, 
                title, 
                message, 
                type, 
                is_read, 
                announcement_id
            )
            SELECT 
                p.id,
                NEW.title,
                NEW.content,
                'system',
                false,
                NEW.id
            FROM public.profiles p
            ON CONFLICT (user_id, announcement_id) 
            DO UPDATE SET 
                title = EXCLUDED.title,
                message = EXCLUDED.message;
        END IF;
        RETURN NEW;
    END IF;

    -- -------------------------------------------------------------
    -- 3. ANNOUNCEMENT UPDATED -> UPDATE OR REMOVE USER NOTIFICATIONS
    -- -------------------------------------------------------------
    IF TG_OP = 'UPDATE' THEN
        -- If announcement was UNPUBLISHED -> remove notifications for all users
        IF NEW.is_published = false THEN
            DELETE FROM public.notifications 
            WHERE announcement_id = NEW.id;
        ELSE
            -- If announcement is PUBLISHED -> update existing and backfill missing
            UPDATE public.notifications
            SET 
                title = NEW.title,
                message = NEW.content
            WHERE announcement_id = NEW.id;

            INSERT INTO public.notifications (
                user_id, 
                title, 
                message, 
                type, 
                is_read, 
                announcement_id
            )
            SELECT 
                p.id,
                NEW.title,
                NEW.content,
                'system',
                false,
                NEW.id
            FROM public.profiles p
            ON CONFLICT (user_id, announcement_id) 
            DO UPDATE SET 
                title = EXCLUDED.title,
                message = EXCLUDED.message;
        END IF;
        RETURN NEW;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_announcement_to_notifications ON public.announcements;
CREATE TRIGGER trg_sync_announcement_to_notifications
AFTER INSERT OR UPDATE OR DELETE ON public.announcements
FOR EACH ROW
EXECUTE FUNCTION public.fn_sync_announcement_to_notifications();


-- 6. AUTOMATIC BACKFILL FOR NEW USERS UPON REGISTRATION
CREATE OR REPLACE FUNCTION public.fn_backfill_announcements_for_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    INSERT INTO public.notifications (
        user_id, 
        title, 
        message, 
        type, 
        is_read, 
        announcement_id
    )
    SELECT 
        NEW.id,
        a.title,
        a.content,
        'system',
        false,
        a.id
    FROM public.announcements a
    WHERE a.is_published = true
      AND (a.expires_at IS NULL OR a.expires_at > now())
    ON CONFLICT (user_id, announcement_id) DO NOTHING;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_backfill_announcements_for_new_user ON public.profiles;
CREATE TRIGGER trg_backfill_announcements_for_new_user
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.fn_backfill_announcements_for_new_user();


-- 7. ONE-TIME INITIAL BACKFILL OF EXISTING PUBLISHED ANNOUNCEMENTS
INSERT INTO public.notifications (
    user_id, 
    title, 
    message, 
    type, 
    is_read, 
    announcement_id
)
SELECT 
    p.id,
    a.title,
    a.content,
    'system',
    false,
    a.id
FROM public.profiles p
CROSS JOIN public.announcements a
WHERE a.is_published = true
  AND (a.expires_at IS NULL OR a.expires_at > now())
ON CONFLICT (user_id, announcement_id) DO UPDATE
SET 
    title = EXCLUDED.title,
    message = EXCLUDED.message;


-- 8. VERIFICATION
SELECT 
    n.id AS notification_id,
    n.user_id,
    n.title,
    n.type,
    n.announcement_id,
    a.title AS announcement_title
FROM public.notifications n
LEFT JOIN public.announcements a ON a.id = n.announcement_id
WHERE n.announcement_id IS NOT NULL
ORDER BY n.created_at DESC;
