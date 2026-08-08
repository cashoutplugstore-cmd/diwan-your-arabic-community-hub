-- Security hardening for the Diwan public Data API.
-- RLS remains the primary authorization boundary; these controls add integrity,
-- privilege-escalation protection, abuse throttling, and safer function exposure.

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

-- Keep authorization helpers out of the public RPC surface. They are used only
-- from RLS policies and internal triggers.
CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

CREATE OR REPLACE FUNCTION private.is_room_member(_room_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.room_members
    WHERE room_id = _room_id AND user_id = _user_id
  );
$$;

CREATE OR REPLACE FUNCTION private.can_view_room(_room_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.rooms r
    WHERE r.id = _room_id
      AND (r.is_private = false OR r.owner_id = _user_id OR private.is_room_member(r.id, _user_id))
  );
$$;

CREATE OR REPLACE FUNCTION private.can_moderate_room(_room_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT private.has_role(_user_id, 'admin')
      OR private.has_role(_user_id, 'moderator')
      OR EXISTS (
        SELECT 1 FROM public.rooms r
        WHERE r.id = _room_id AND r.owner_id = _user_id
      );
$$;

CREATE OR REPLACE FUNCTION private.is_restricted_in_room(_room_id uuid, _user_id uuid, _kind text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.room_moderation m
    WHERE m.room_id = _room_id
      AND m.user_id = _user_id
      AND m.kind = _kind
      AND (m.expires_at IS NULL OR m.expires_at > now())
  );
$$;

GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_room_member(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.can_view_room(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.can_moderate_room(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_restricted_in_room(uuid, uuid, text) TO authenticated, service_role;

-- These helpers used to be exposed from public. Keep them for compatibility,
-- but stop authenticated/anonymous callers from invoking them as RPCs.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_room_member(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.can_view_room(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.can_moderate_room(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_restricted_in_room(uuid, uuid, text) FROM PUBLIC, anon, authenticated;

-- Replace exposed helper calls inside RLS with private equivalents.
DROP POLICY IF EXISTS user_roles_read_own ON public.user_roles;
CREATE POLICY user_roles_read_own ON public.user_roles FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id OR private.has_role((select auth.uid()), 'admin'));

DROP POLICY IF EXISTS rooms_read ON public.rooms;
CREATE POLICY rooms_read ON public.rooms FOR SELECT
  USING (is_private = false OR owner_id = (select auth.uid()) OR private.is_room_member(id, (select auth.uid())));
DROP POLICY IF EXISTS rooms_insert_own ON public.rooms;
CREATE POLICY rooms_insert_own ON public.rooms FOR INSERT TO authenticated
  WITH CHECK (owner_id = (select auth.uid()) AND is_official = false);
DROP POLICY IF EXISTS rooms_update_own ON public.rooms;
CREATE POLICY rooms_update_own ON public.rooms FOR UPDATE TO authenticated
  USING (owner_id = (select auth.uid()))
  WITH CHECK (owner_id = (select auth.uid()) AND is_official = false);
DROP POLICY IF EXISTS rooms_delete_own ON public.rooms;
CREATE POLICY rooms_delete_own ON public.rooms FOR DELETE TO authenticated
  USING (owner_id = (select auth.uid()) OR private.has_role((select auth.uid()), 'admin'));

DROP POLICY IF EXISTS room_members_read ON public.room_members;
CREATE POLICY room_members_read ON public.room_members FOR SELECT TO authenticated
  USING (private.can_view_room(room_id, (select auth.uid())));
DROP POLICY IF EXISTS room_members_join ON public.room_members;
CREATE POLICY room_members_join ON public.room_members FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (select auth.uid())
    AND private.can_view_room(room_id, (select auth.uid()))
    AND (
      role = 'member'
      OR (
        role = 'owner'
        AND EXISTS (
          SELECT 1 FROM public.rooms r
          WHERE r.id = room_id AND r.owner_id = (select auth.uid())
        )
      )
    )
  );
DROP POLICY IF EXISTS room_members_leave ON public.room_members;
CREATE POLICY room_members_leave ON public.room_members FOR DELETE TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS messages_read ON public.messages;
CREATE POLICY messages_read ON public.messages FOR SELECT TO authenticated
  USING (private.can_view_room(room_id, (select auth.uid())));
DROP POLICY IF EXISTS messages_insert_own ON public.messages;
CREATE POLICY messages_insert_own ON public.messages FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (select auth.uid())
    AND private.can_view_room(room_id, (select auth.uid()))
    AND NOT private.is_restricted_in_room(room_id, (select auth.uid()), 'ban')
    AND NOT private.is_restricted_in_room(room_id, (select auth.uid()), 'mute')
  );
DROP POLICY IF EXISTS messages_update_own ON public.messages;
CREATE POLICY messages_update_own ON public.messages FOR UPDATE TO authenticated
  USING (user_id = (select auth.uid()) OR private.can_moderate_room(room_id, (select auth.uid())))
  WITH CHECK (user_id = (select auth.uid()) OR private.can_moderate_room(room_id, (select auth.uid())));
DROP POLICY IF EXISTS messages_delete_own ON public.messages;
CREATE POLICY messages_delete_own ON public.messages FOR DELETE TO authenticated
  USING (user_id = (select auth.uid()) OR private.can_moderate_room(room_id, (select auth.uid())));

DROP POLICY IF EXISTS friendships_read ON public.friendships;
CREATE POLICY friendships_read ON public.friendships FOR SELECT TO authenticated
  USING ((select auth.uid()) IN (requester_id, addressee_id));
DROP POLICY IF EXISTS friendships_insert ON public.friendships;
CREATE POLICY friendships_insert ON public.friendships FOR INSERT TO authenticated
  WITH CHECK (requester_id = (select auth.uid()) AND addressee_id <> (select auth.uid()));
DROP POLICY IF EXISTS friendships_update ON public.friendships;
CREATE POLICY friendships_update ON public.friendships FOR UPDATE TO authenticated
  USING ((select auth.uid()) IN (requester_id, addressee_id))
  WITH CHECK ((select auth.uid()) IN (requester_id, addressee_id));
DROP POLICY IF EXISTS friendships_delete ON public.friendships;
CREATE POLICY friendships_delete ON public.friendships FOR DELETE TO authenticated
  USING ((select auth.uid()) IN (requester_id, addressee_id));

DROP POLICY IF EXISTS reports_read ON public.reports;
CREATE POLICY reports_read ON public.reports FOR SELECT TO authenticated
  USING (
    reporter_id = (select auth.uid())
    OR private.has_role((select auth.uid()), 'admin')
    OR private.has_role((select auth.uid()), 'moderator')
  );
DROP POLICY IF EXISTS reports_update_staff ON public.reports;
CREATE POLICY reports_update_staff ON public.reports FOR UPDATE TO authenticated
  USING (private.has_role((select auth.uid()), 'admin') OR private.has_role((select auth.uid()), 'moderator'))
  WITH CHECK (private.has_role((select auth.uid()), 'admin') OR private.has_role((select auth.uid()), 'moderator'));

DROP POLICY IF EXISTS room_moderation_read ON public.room_moderation;
CREATE POLICY room_moderation_read ON public.room_moderation FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()) OR private.can_moderate_room(room_id, (select auth.uid())));
DROP POLICY IF EXISTS room_moderation_write ON public.room_moderation;
CREATE POLICY room_moderation_write ON public.room_moderation FOR INSERT TO authenticated
  WITH CHECK (private.can_moderate_room(room_id, (select auth.uid())));
DROP POLICY IF EXISTS room_moderation_update ON public.room_moderation;
CREATE POLICY room_moderation_update ON public.room_moderation FOR UPDATE TO authenticated
  USING (private.can_moderate_room(room_id, (select auth.uid())))
  WITH CHECK (private.can_moderate_room(room_id, (select auth.uid())));
DROP POLICY IF EXISTS room_moderation_delete ON public.room_moderation;
CREATE POLICY room_moderation_delete ON public.room_moderation FOR DELETE TO authenticated
  USING (private.can_moderate_room(room_id, (select auth.uid())));

-- Input integrity and abuse protection for messages.
ALTER TABLE public.messages
  ADD CONSTRAINT messages_content_length_security
  CHECK (is_deleted OR (char_length(btrim(content)) BETWEEN 1 AND 2000)) NOT VALID;
CREATE INDEX IF NOT EXISTS messages_user_created_idx ON public.messages (user_id, created_at DESC);

CREATE OR REPLACE FUNCTION private.guard_message_write()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  actor uuid := auth.uid();
  recent_count integer;
BEGIN
  IF actor IS NOT NULL THEN
    IF NEW.user_id IS DISTINCT FROM actor THEN
      RAISE EXCEPTION 'message owner mismatch' USING ERRCODE = '42501';
    END IF;
    NEW.created_at := now();
    PERFORM pg_advisory_xact_lock(hashtext(actor::text)::bigint);
    SELECT count(*) INTO recent_count
    FROM public.messages
    WHERE user_id = actor
      AND created_at > now() - interval '10 seconds'
      AND is_deleted = false;
    IF recent_count >= 8 THEN
      RAISE EXCEPTION 'message rate limit exceeded' USING ERRCODE = 'P0001';
    END IF;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.room_id IS DISTINCT FROM OLD.room_id
       OR NEW.user_id IS DISTINCT FROM OLD.user_id
       OR NEW.created_at IS DISTINCT FROM OLD.created_at
       OR NEW.reply_to_id IS DISTINCT FROM OLD.reply_to_id THEN
      RAISE EXCEPTION 'message identity fields cannot be changed' USING ERRCODE = '42501';
    END IF;
    IF OLD.is_deleted AND NOT NEW.is_deleted THEN
      RAISE EXCEPTION 'deleted messages cannot be restored' USING ERRCODE = '42501';
    END IF;
    IF NEW.is_deleted THEN
      NEW.content := '';
      NEW.edited_at := coalesce(NEW.edited_at, now());
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
GRANT EXECUTE ON FUNCTION private.guard_message_write() TO authenticated, service_role;
DROP TRIGGER IF EXISTS guard_message_write ON public.messages;
CREATE TRIGGER guard_message_write
BEFORE INSERT OR UPDATE ON public.messages
FOR EACH ROW EXECUTE FUNCTION private.guard_message_write();

-- Reports: users can create open reports, but cannot forge reporter/status/timestamps.
ALTER TABLE public.reports
  ADD CONSTRAINT reports_status_security
  CHECK (status IN ('open','resolved','dismissed')) NOT VALID;
ALTER TABLE public.reports
  ADD CONSTRAINT reports_details_length_security
  CHECK (details IS NULL OR char_length(details) <= 1000) NOT VALID;

CREATE OR REPLACE FUNCTION private.guard_report_write()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  actor uuid := auth.uid();
  recent_count integer;
BEGIN
  IF actor IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.reporter_id IS DISTINCT FROM actor THEN
      RAISE EXCEPTION 'reporter mismatch' USING ERRCODE = '42501';
    END IF;
    NEW.status := 'open';
    NEW.created_at := now();
    NEW.updated_at := now();
    PERFORM pg_advisory_xact_lock(hashtext(('report:' || actor::text))::bigint);
    SELECT count(*) INTO recent_count
    FROM public.reports
    WHERE reporter_id = actor
      AND created_at > now() - interval '1 minute';
    IF recent_count >= 5 THEN
      RAISE EXCEPTION 'report rate limit exceeded' USING ERRCODE = 'P0001';
    END IF;
  ELSE
    IF NEW.reporter_id IS DISTINCT FROM OLD.reporter_id
       OR NEW.target_user_id IS DISTINCT FROM OLD.target_user_id
       OR NEW.message_id IS DISTINCT FROM OLD.message_id
       OR NEW.room_id IS DISTINCT FROM OLD.room_id
       OR NEW.reason IS DISTINCT FROM OLD.reason
       OR NEW.details IS DISTINCT FROM OLD.details
       OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
      RAISE EXCEPTION 'report fields cannot be changed' USING ERRCODE = '42501';
    END IF;
    NEW.updated_at := now();
  END IF;
  RETURN NEW;
END;
$$;
GRANT EXECUTE ON FUNCTION private.guard_report_write() TO authenticated, service_role;
DROP TRIGGER IF EXISTS guard_report_write ON public.reports;
CREATE TRIGGER guard_report_write
BEFORE INSERT OR UPDATE ON public.reports
FOR EACH ROW EXECUTE FUNCTION private.guard_report_write();

-- Friend requests: prevent account-to-account identity hijacking and self-acceptance.
CREATE OR REPLACE FUNCTION private.guard_friendship_update()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  actor uuid := auth.uid();
BEGIN
  IF actor IS NULL THEN RETURN NEW; END IF;
  IF NEW.requester_id IS DISTINCT FROM OLD.requester_id
     OR NEW.addressee_id IS DISTINCT FROM OLD.addressee_id THEN
    RAISE EXCEPTION 'friendship endpoints cannot be changed' USING ERRCODE = '42501';
  END IF;
  IF actor <> OLD.addressee_id
     OR OLD.status <> 'pending'
     OR NEW.status NOT IN ('accepted','blocked') THEN
    RAISE EXCEPTION 'only the recipient can respond to a pending friend request' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;
GRANT EXECUTE ON FUNCTION private.guard_friendship_update() TO authenticated, service_role;
DROP TRIGGER IF EXISTS guard_friendship_update ON public.friendships;
CREATE TRIGGER guard_friendship_update
BEFORE UPDATE ON public.friendships
FOR EACH ROW EXECUTE FUNCTION private.guard_friendship_update();

-- Moderation records: moderators may change only the moderation metadata,
-- never move a ban/mute to another room/user or impersonate its creator.
CREATE OR REPLACE FUNCTION private.guard_room_moderation_write()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE actor uuid := auth.uid();
BEGIN
  IF actor IS NULL THEN RETURN NEW; END IF;
  IF TG_OP = 'INSERT' THEN
    IF NEW.created_by IS DISTINCT FROM actor THEN
      RAISE EXCEPTION 'moderation creator mismatch' USING ERRCODE = '42501';
    END IF;
  ELSE
    IF NEW.room_id IS DISTINCT FROM OLD.room_id
       OR NEW.user_id IS DISTINCT FROM OLD.user_id
       OR NEW.kind IS DISTINCT FROM OLD.kind
       OR NEW.created_by IS DISTINCT FROM OLD.created_by
       OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
      RAISE EXCEPTION 'moderation identity fields cannot be changed' USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
GRANT EXECUTE ON FUNCTION private.guard_room_moderation_write() TO authenticated, service_role;
DROP TRIGGER IF EXISTS guard_room_moderation_write ON public.room_moderation;
CREATE TRIGGER guard_room_moderation_write
BEFORE INSERT OR UPDATE ON public.room_moderation
FOR EACH ROW EXECUTE FUNCTION private.guard_room_moderation_write();

-- Prevent users from creating themselves as a moderator/admin through room membership.
ALTER TABLE public.room_members
  ADD CONSTRAINT room_members_role_security
  CHECK (role IN ('member','moderator','owner')) NOT VALID;

-- Conservative data-size limits for user-controlled profile/room fields.
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_text_lengths_security
  CHECK (
    char_length(username) BETWEEN 3 AND 40
    AND char_length(display_name) <= 80
    AND (bio IS NULL OR char_length(bio) <= 500)
    AND (avatar_url IS NULL OR char_length(avatar_url) <= 2048)
  ) NOT VALID;
ALTER TABLE public.rooms
  ADD CONSTRAINT rooms_text_lengths_security
  CHECK (
    char_length(name) BETWEEN 1 AND 100
    AND char_length(slug) BETWEEN 1 AND 120
    AND (description IS NULL OR char_length(description) <= 500)
    AND (icon IS NULL OR char_length(icon) <= 2048)
  ) NOT VALID;

-- Keep security-definer trigger helpers outside the exposed public schema.
REVOKE EXECUTE ON FUNCTION private.guard_message_write() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION private.guard_report_write() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION private.guard_friendship_update() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION private.guard_room_moderation_write() FROM PUBLIC, anon;
