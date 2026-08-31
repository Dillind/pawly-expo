import type { DayPart } from '@/constants/theme';
import { hourInTimezone } from '@/lib/dates';

/**
 * The banner's four states, by the household's clock.
 *
 * The bands are deliberately uneven. Dawn and dusk are short because they read
 * as transitions; day carries the working hours, and night takes everything
 * else. A member awake at 2am gets the night surface, not a stale dusk.
 */
export function dayPartForHour(hour: number): DayPart {
  if (hour >= 5 && hour < 8) return 'dawn';
  if (hour >= 8 && hour < 17) return 'day';
  if (hour >= 17 && hour < 20) return 'dusk';

  return 'night';
}

export function dayPartInTimezone(zone: string, now: Date = new Date()): DayPart {
  return dayPartForHour(hourInTimezone(zone, now));
}

/**
 * The greeting splits at noon and 5pm, which is not where the banner's states
 * split. "Good evening" over the dusk surface is right; "Good evening" over a
 * still-bright day surface is not, so the two scales are kept apart.
 */
export function greetingForHour(hour: number): string {
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';

  return 'Good evening';
}

export function greetingInTimezone(zone: string, now: Date = new Date()): string {
  return greetingForHour(hourInTimezone(zone, now));
}
