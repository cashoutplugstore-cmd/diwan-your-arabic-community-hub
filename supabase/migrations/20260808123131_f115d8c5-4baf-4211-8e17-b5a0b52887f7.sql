-- 1) ROOMS: hierarchy + activity + system-owned public rooms
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS region text;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS country text;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS city text;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS is_official boolean NOT NULL DEFAULT false;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS last_activity_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.rooms ALTER COLUMN owner_id DROP NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS rooms_slug_key ON public.rooms (slug);
CREATE INDEX IF NOT EXISTS rooms_region_country_city_idx ON public.rooms (region, country, city);

-- 2) MESSAGES: reply / edit / soft delete
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS reply_to_id uuid REFERENCES public.messages(id) ON DELETE SET NULL;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS edited_at timestamptz;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS is_deleted boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS messages_room_created_idx ON public.messages (room_id, created_at DESC);

-- 3) Bump room activity on new message
CREATE OR REPLACE FUNCTION public.touch_room_activity()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.rooms SET last_activity_at = now() WHERE id = NEW.room_id;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS messages_touch_room_activity ON public.messages;
CREATE TRIGGER messages_touch_room_activity
AFTER INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.touch_room_activity();

-- 4) USER BLOCKS
CREATE TABLE IF NOT EXISTS public.user_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (blocker_id, blocked_id)
);
GRANT SELECT, INSERT, DELETE ON public.user_blocks TO authenticated;
GRANT ALL ON public.user_blocks TO service_role;
ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS user_blocks_read_own ON public.user_blocks;
CREATE POLICY user_blocks_read_own ON public.user_blocks FOR SELECT TO authenticated USING (blocker_id = auth.uid());
DROP POLICY IF EXISTS user_blocks_insert_own ON public.user_blocks;
CREATE POLICY user_blocks_insert_own ON public.user_blocks FOR INSERT TO authenticated WITH CHECK (blocker_id = auth.uid() AND blocked_id <> auth.uid());
DROP POLICY IF EXISTS user_blocks_delete_own ON public.user_blocks;
CREATE POLICY user_blocks_delete_own ON public.user_blocks FOR DELETE TO authenticated USING (blocker_id = auth.uid());

-- 5) REPORTS
CREATE TABLE IF NOT EXISTS public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  message_id uuid REFERENCES public.messages(id) ON DELETE SET NULL,
  room_id uuid REFERENCES public.rooms(id) ON DELETE CASCADE,
  reason text NOT NULL,
  details text,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.reports TO authenticated;
GRANT ALL ON public.reports TO service_role;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS reports_insert_own ON public.reports;
CREATE POLICY reports_insert_own ON public.reports FOR INSERT TO authenticated WITH CHECK (reporter_id = auth.uid());
DROP POLICY IF EXISTS reports_read ON public.reports;
CREATE POLICY reports_read ON public.reports FOR SELECT TO authenticated
  USING (reporter_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));
DROP POLICY IF EXISTS reports_update_staff ON public.reports;
CREATE POLICY reports_update_staff ON public.reports FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

-- 6) ROOM MODERATION (ban / mute)
CREATE TABLE IF NOT EXISTS public.room_moderation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('ban','mute')),
  expires_at timestamptz,
  reason text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (room_id, user_id, kind)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.room_moderation TO authenticated;
GRANT ALL ON public.room_moderation TO service_role;
ALTER TABLE public.room_moderation ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.can_moderate_room(_room_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(_user_id, 'admin')
      OR public.has_role(_user_id, 'moderator')
      OR EXISTS (SELECT 1 FROM public.rooms r WHERE r.id = _room_id AND r.owner_id = _user_id)
$$;

CREATE OR REPLACE FUNCTION public.is_restricted_in_room(_room_id uuid, _user_id uuid, _kind text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.room_moderation m
    WHERE m.room_id = _room_id AND m.user_id = _user_id AND m.kind = _kind
      AND (m.expires_at IS NULL OR m.expires_at > now())
  )
$$;

DROP POLICY IF EXISTS room_moderation_read ON public.room_moderation;
CREATE POLICY room_moderation_read ON public.room_moderation FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.can_moderate_room(room_id, auth.uid()));
DROP POLICY IF EXISTS room_moderation_write ON public.room_moderation;
CREATE POLICY room_moderation_write ON public.room_moderation FOR INSERT TO authenticated
  WITH CHECK (public.can_moderate_room(room_id, auth.uid()));
DROP POLICY IF EXISTS room_moderation_update ON public.room_moderation;
CREATE POLICY room_moderation_update ON public.room_moderation FOR UPDATE TO authenticated
  USING (public.can_moderate_room(room_id, auth.uid())) WITH CHECK (public.can_moderate_room(room_id, auth.uid()));
DROP POLICY IF EXISTS room_moderation_delete ON public.room_moderation;
CREATE POLICY room_moderation_delete ON public.room_moderation FOR DELETE TO authenticated
  USING (public.can_moderate_room(room_id, auth.uid()));

-- 7) Enforce ban/mute + moderator delete at the database level
DROP POLICY IF EXISTS messages_insert_own ON public.messages;
CREATE POLICY messages_insert_own ON public.messages FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND public.can_view_room(room_id, auth.uid())
    AND NOT public.is_restricted_in_room(room_id, auth.uid(), 'ban')
    AND NOT public.is_restricted_in_room(room_id, auth.uid(), 'mute')
  );

DROP POLICY IF EXISTS messages_update_own ON public.messages;
CREATE POLICY messages_update_own ON public.messages FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.can_moderate_room(room_id, auth.uid()))
  WITH CHECK (user_id = auth.uid() OR public.can_moderate_room(room_id, auth.uid()));

DROP POLICY IF EXISTS messages_delete_own ON public.messages;
CREATE POLICY messages_delete_own ON public.messages FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.can_moderate_room(room_id, auth.uid()));

-- 8) Real room stats (no fake numbers)
CREATE OR REPLACE VIEW public.room_stats
WITH (security_invoker = true) AS
SELECT r.id AS room_id,
       (SELECT count(*) FROM public.room_members m WHERE m.room_id = r.id) AS member_count,
       (SELECT count(*) FROM public.messages g WHERE g.room_id = r.id AND g.is_deleted = false) AS message_count,
       (SELECT max(g.created_at) FROM public.messages g WHERE g.room_id = r.id) AS last_message_at
FROM public.rooms r;
GRANT SELECT ON public.room_stats TO authenticated, anon;

-- 9) Official public rooms: community -> country -> city
INSERT INTO public.rooms (name, slug, description, region, country, city, is_private, is_official, owner_id)
VALUES
  ('الرياض','ar-sa-riyadh','دردشة أهل الرياض','arab','السعودية','الرياض',false,true,NULL),
  ('جدة','ar-sa-jeddah','دردشة أهل جدة','arab','السعودية','جدة',false,true,NULL),
  ('الدمام','ar-sa-dammam','دردشة أهل الدمام','arab','السعودية','الدمام',false,true,NULL),
  ('القاهرة','ar-eg-cairo','دردشة أهل القاهرة','arab','مصر','القاهرة',false,true,NULL),
  ('الإسكندرية','ar-eg-alex','دردشة أهل الإسكندرية','arab','مصر','الإسكندرية',false,true,NULL),
  ('دبي','ar-ae-dubai','دردشة أهل دبي','arab','الإمارات','دبي',false,true,NULL),
  ('أبوظبي','ar-ae-abudhabi','دردشة أهل أبوظبي','arab','الإمارات','أبوظبي',false,true,NULL),
  ('الدار البيضاء','ar-ma-casa','دردشة أهل الدار البيضاء','arab','المغرب','الدار البيضاء',false,true,NULL),
  ('الرباط','ar-ma-rabat','دردشة أهل الرباط','arab','المغرب','الرباط',false,true,NULL),
  ('بغداد','ar-iq-baghdad','دردشة أهل بغداد','arab','العراق','بغداد',false,true,NULL),
  ('البصرة','ar-iq-basra','دردشة أهل البصرة','arab','العراق','البصرة',false,true,NULL),
  ('عمّان','ar-jo-amman','دردشة أهل عمّان','arab','الأردن','عمّان',false,true,NULL),
  ('تونس','ar-tn-tunis','دردشة أهل تونس','arab','تونس','تونس',false,true,NULL),
  ('الجزائر','ar-dz-algiers','دردشة أهل الجزائر','arab','الجزائر','الجزائر',false,true,NULL),
  ('برلين','eu-de-berlin','مجتمع برلين','europe','ألمانيا','برلين',false,true,NULL),
  ('ميونخ','eu-de-munich','مجتمع ميونخ','europe','ألمانيا','ميونخ',false,true,NULL),
  ('باريس','eu-fr-paris','مجتمع باريس','europe','فرنسا','باريس',false,true,NULL),
  ('ليون','eu-fr-lyon','مجتمع ليون','europe','فرنسا','ليون',false,true,NULL),
  ('لندن','eu-uk-london','مجتمع لندن','europe','بريطانيا','لندن',false,true,NULL),
  ('مانشستر','eu-uk-manchester','مجتمع مانشستر','europe','بريطانيا','مانشستر',false,true,NULL),
  ('أمستردام','eu-nl-amsterdam','مجتمع أمستردام','europe','هولندا','أمستردام',false,true,NULL),
  ('ستوكهولم','eu-se-stockholm','مجتمع ستوكهولم','europe','السويد','ستوكهولم',false,true,NULL),
  ('مدريد','eu-es-madrid','مجتمع مدريد','europe','إسبانيا','مدريد',false,true,NULL),
  ('روما','eu-it-rome','مجتمع روما','europe','إيطاليا','روما',false,true,NULL)
ON CONFLICT (slug) DO NOTHING;