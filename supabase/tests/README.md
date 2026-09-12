# SQL tests

Jest cannot reach any of this. `slot_states`, `log_feed`, the Grace Window
arithmetic and every RLS policy live in Postgres, and a unit test that mocks
`@/lib/supabase/client` proves only that the client was called.

`follow.test.sql` is the first test that actually runs the policies. It checks
the read boundary of [ADR 0036](../../docs/adr/0036-a-follow-is-a-household-scoped-read-plus-a-voice.md)
from both sides: what a follower gains, and what stays shut.

`heartbeat.test.sql` covers the alert dispatch heartbeat of
[CRU-140](../../docs/conventions/alert-monitoring.md) — which path each run takes, and that a ping
which raises cannot abort the sweep or roll back its work. It replaces the shim's `net.http_post`
with versions that record and that raise, because the shim's own always succeeds and would prove
nothing.

## Running it

`supabase db reset` is the right way and needs Docker. Without Docker, a bare
Postgres 16 plus the three files here is enough, because every object the
migrations touch is either created by them or stubbed:

```bash
export PATH="$(brew --prefix postgresql@16)/bin:$PATH"
initdb -D /tmp/pgdata -U postgres
pg_ctl -D /tmp/pgdata -o "-p 55432 -k /tmp" -l /tmp/pg.log start
createdb -h /tmp -p 55432 -U postgres crumpet_test

P="psql -h /tmp -p 55432 -U postgres -d crumpet_test -v ON_ERROR_STOP=1 -q"
$P -f supabase/tests/local-shim.sql
for f in supabase/migrations/*.sql; do
  sed -E '/create extension.*(pg_net|pg_cron)/d' "$f" | $P -f -
done
$P -f supabase/tests/local-grants.sql
$P -f supabase/tests/follow.seed.sql
psql -h /tmp -p 55432 -U postgres -d crumpet_test -f supabase/tests/follow.test.sql
```

Run `heartbeat.test.sql` the same way; it needs no seed and is re-runnable, so a second run
against the same database passes too.

Every check prints `PASS`; the first failure raises and stops the file.

## What the shim is, and what it is not

`local-shim.sql` fakes the surface Supabase provides and the migrations assume:
the four roles, `auth.users`, `auth.uid()`, the `storage` helpers, `vault`,
`cron` and a `net.http_post` that does nothing. `local-grants.sql` matters more
than it looks — Supabase grants `authenticated` on every table in `public` by
default, and without it a query is refused at the grant layer and the policy
being tested never runs.

It is not a replica. `pg_net` and `pg_cron` do no work, so nothing here tests
that an alert is actually dispatched.
