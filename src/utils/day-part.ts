import type { DayPart } from '@/constants/theme';
import { hourInTimezone } from '@/lib/dates';

// Uneven on purpose: dawn and dusk read as transitions. Night starts at 7pm, an
// hour before the greeting would suggest, so "Good evening" reaches the moon.
export function dayPartForHour(hour: number): DayPart {
  if (hour >= 5 && hour < 8) return 'dawn';
  if (hour >= 8 && hour < 17) return 'day';
  if (hour >= 17 && hour < 19) return 'dusk';

  return 'night';
}

export function dayPartInTimezone(zone: string, now: Date = new Date()): DayPart {
  return dayPartForHour(hourInTimezone(zone, now));
}

// Splits at noon and 5pm, which is not where the banner's states split. The two
// scales are deliberately kept apart.
export function greetingForHour(hour: number): string {
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';

  return 'Good evening';
}

export function greetingInTimezone(zone: string, now: Date = new Date()): string {
  return greetingForHour(hourInTimezone(zone, now));
}
