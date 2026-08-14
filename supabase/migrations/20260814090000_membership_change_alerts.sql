-- A membership change leaves a record, because losing access without being
-- told reads as the app being broken.
--
-- No pushes: dispatch_alert returns early for any row carrying a
-- suppressed_reason, the "a record, not a delivery" path from ADR 0012.
--
-- Nothing renders these yet -- the inbox is #19. Queued now so the history
-- exists from the day that screen ships.

alter type public.alert_kind add value if not exists 'member_removed';
alter type public.alert_kind add value if not exists 'member_role_changed';
alter type public.alert_kind add value if not exists 'member_left';
