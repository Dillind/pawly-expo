-- Both are trigger functions and must never be reachable as RPCs. Postgres
-- grants EXECUTE to public by default, which PostgREST then exposes at
-- /rest/v1/rpc/<name> -- so anon and authenticated could both call them.
--
-- Calling either without trigger context errors out rather than doing damage
-- (`new` is undefined outside a trigger), so this is hardening rather than a
-- fix for an exploitable hole. But an unauthenticated caller should not be
-- able to reach a SECURITY DEFINER function at all, and the security advisor
-- is right to say so.
--
-- Revoking EXECUTE does not stop the triggers: a trigger function runs as part
-- of the triggering statement, not as a call the caller is privileged to make.

revoke all on function public.queue_feed_logged_alert() from public, anon, authenticated;
revoke all on function public.dispatch_alert() from public, anon, authenticated;
