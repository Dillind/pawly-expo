-- The add_pet migration revoked execute from `anon` alone, which does nothing.
-- Functions carry a default grant to PUBLIC and anon inherits it, so the role
-- kept its access -- verified after the fact: anon could call
-- /rest/v1/rpc/add_pet. Only the household lookup stopped it, since auth.uid()
-- is null for anon, and "the guard happens to catch it" is not an access
-- control.
--
-- `from public, anon` is the form log_feed, pet_slot_states and
-- register_push_token already use. Anything adding a new RPC should copy one of
-- those rather than this pair.

revoke execute on function public.add_pet(
  text, text, public.pet_sex, date, boolean, text, jsonb
) from public, anon;

grant execute on function public.add_pet(
  text, text, public.pet_sex, date, boolean, text, jsonb
) to authenticated;
