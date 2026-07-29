import { createClient } from 'npm:@supabase/supabase-js@2';

import { sendExpoMessages } from './expo.ts';
import { buildFeedLoggedMessage, type ExpoMessage } from './message.ts';
import { resolveRecipientTokens } from './recipients.ts';

// verify_jwt = false: this is called by the DATABASE, not by a user. It
// authenticates on a shared secret instead -- held in Vault on the database
// side, and as a function secret here -- and reads with the service role.
const DISPATCH_SECRET = Deno.env.get('ALERT_DISPATCH_SECRET');

Deno.serve(async (request) => {
  if (!DISPATCH_SECRET || request.headers.get('x-alert-secret') !== DISPATCH_SECRET) {
    return new Response('Unauthorised', { status: 401 });
  }

  const client = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const { alert_id: alertId } = (await request.json()) as { alert_id: string };

  const { data: alert, error: alertError } = await client
    .from('alerts')
    .select('id, household_id, kind, subject_id, actor_id, sent_at, suppressed_reason')
    .eq('id', alertId)
    .single();

  if (alertError || !alert) return new Response('Alert not found', { status: 404 });

  // Both are terminal states. Re-delivering a sent alert would be worse than
  // not delivering it at all.
  if (alert.sent_at || alert.suppressed_reason) return new Response('Already handled');
  if (alert.kind !== 'feed_logged') return new Response('Unsupported kind');

  const { data: log, error: logError } = await client
    .from('feed_logs')
    .select('id, logged_at, notes, logged_by, pets ( name, households ( timezone ) )')
    .eq('id', alert.subject_id)
    .single();

  if (logError || !log) return new Response('Feed log not found', { status: 404 });

  // logged_by is nullable with on delete set null -- a log can outlive its
  // author, and buildFeedLoggedMessage renders that as "Member".
  const { data: author } = log.logged_by
    ? await client.from('users').select('first_name').eq('id', log.logged_by).maybeSingle()
    : { data: null };

  const tokens = await resolveRecipientTokens(client, alert);

  if (tokens.length === 0) {
    // Stamped as sent, because there is nothing left to do for this alert.
    // "no recipients" distinguishes a household of one, or a fully muted
    // household, from a delivery that broke.
    await client
      .from('alerts')
      .update({ sent_at: new Date().toISOString(), error: 'no recipients' })
      .eq('id', alert.id);
    return new Response('No recipients');
  }

  // deno-lint-ignore no-explicit-any
  const pet = (log as any).pets;

  const message: ExpoMessage = {
    to: tokens,
    ...buildFeedLoggedMessage({
      authorFirstName: author?.first_name ?? null,
      petName: pet.name,
      loggedAt: log.logged_at,
      householdTimezone: pet.households.timezone,
      notes: log.notes,
      logId: log.id
    })
  };

  try {
    // One message with an array `to` returns one ticket per token, in order --
    // which is what makes the index mapping below correct.
    const tickets = await sendExpoMessages([message]);

    // DeviceNotRegistered is acted on immediately: the token is dead and will
    // never work again. Leaving it means every future send carries a
    // guaranteed failure.
    const dead = tickets
      .map((ticket, index) => ({ ticket, token: tokens[index] }))
      .filter(({ ticket }) => ticket.details?.error === 'DeviceNotRegistered')
      .map(({ token }) => token);

    if (dead.length > 0) {
      await client.from('push_tokens').delete().in('token', dead);
    }

    const firstError = tickets.find(
      (ticket) => ticket.status === 'error' && ticket.details?.error !== 'DeviceNotRegistered'
    );

    await client
      .from('alerts')
      .update({ sent_at: new Date().toISOString(), error: firstError?.message ?? null })
      .eq('id', alert.id);

    return new Response('Sent');
  } catch (error) {
    // Left unstamped deliberately, so alerts_pending_idx still finds it and a
    // future retry sweep has something to work from.
    await client
      .from('alerts')
      .update({ error: error instanceof Error ? error.message : 'unknown' })
      .eq('id', alert.id);
    return new Response('Send failed', { status: 500 });
  }
});
