-- feed_logs carries narrow column grants (20260725090300) so a direct table
-- insert cannot name a column the app has no business setting. log_feed is
-- security invoker, so its insert runs as the caller and is bound by them.
--
-- Phase 1 added feed_time_series_id and occurrence_date and granted neither, so
-- every attempt to log a feed against an occurrence was refused with
-- "permission denied for table feed_logs" -- surfaced to the member as
-- "Something went wrong. Try again."
--
-- SELECT was already granted on both by the ALTER TABLE, which is why reading
-- occurrences worked and only writing failed.

grant insert (feed_time_series_id, occurrence_date) on public.feed_logs to authenticated;
