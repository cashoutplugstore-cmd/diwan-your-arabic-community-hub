-- Fix: message timestamps must be immutable on UPDATE; rate limiting belongs to INSERT only.
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
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF actor IS NOT NULL THEN
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
    RETURN NEW;
  END IF;

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
  RETURN NEW;
END;
$$;
