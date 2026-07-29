import type { ExpoMessage } from './message.ts';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

// Expo documents a ceiling of 100 messages per request. The rate ceiling
// (600/s per project) is far above anything this app will produce, so batching
// is the only limit worth respecting here.
const BATCH_SIZE = 100;

export type ExpoTicket = {
  status: 'ok' | 'error';
  id?: string;
  message?: string;
  details?: { error?: string };
};

export const sendExpoMessages = async (messages: ExpoMessage[]): Promise<ExpoTicket[]> => {
  const tickets: ExpoTicket[] = [];

  for (let index = 0; index < messages.length; index += BATCH_SIZE) {
    const batch = messages.slice(index, index + BATCH_SIZE);

    const response = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(batch)
    });

    if (!response.ok) {
      throw new Error(`Expo push failed: ${response.status} ${await response.text()}`);
    }

    const payload = (await response.json()) as { data?: ExpoTicket[] };
    tickets.push(...(payload.data ?? []));
  }

  return tickets;
};
