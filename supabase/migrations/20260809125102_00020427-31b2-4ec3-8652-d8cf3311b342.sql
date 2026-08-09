CREATE TABLE IF NOT EXISTS public.room_voice_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_speaker boolean NOT NULL DEFAULT true,
  is_muted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (room_id, user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.room_voice_participants TO authenticated;
GRANT ALL ON public.room_voice_participants TO service_role;

ALTER TABLE public.room_voice_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY room_voice_read ON public.room_voice_participants
FOR SELECT TO authenticated USING (public.can_view_room(room_id, auth.uid()));

CREATE POLICY room_voice_insert_self ON public.room_voice_participants
FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND public.can_view_room(room_id, auth.uid()) AND NOT public.is_restricted_in_room(room_id, auth.uid(), 'ban') AND NOT public.is_restricted_in_room(room_id, auth.uid(), 'mute'));

CREATE POLICY room_voice_update_self ON public.room_voice_participants
FOR UPDATE TO authenticated USING (user_id = auth.uid() OR public.can_moderate_room(room_id, auth.uid())) WITH CHECK (user_id = auth.uid() OR public.can_moderate_room(room_id, auth.uid()));

CREATE POLICY room_voice_delete_self ON public.room_voice_participants
FOR DELETE TO authenticated USING (user_id = auth.uid() OR public.can_moderate_room(room_id, auth.uid()));

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER room_voice_participants_updated_at BEFORE UPDATE ON public.room_voice_participants
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();