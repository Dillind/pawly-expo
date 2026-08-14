/**
 * The device's timezone, used only when creating a household — from then on the
 * household's own `timezone` column is the authority for every day boundary and
 * slot calculation.
 */
export const deviceTimezone = (): string => Intl.DateTimeFormat().resolvedOptions().timeZone;
