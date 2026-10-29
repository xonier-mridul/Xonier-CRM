/** Database timestamps without an offset are UTC, matching MongoDB storage. */
export function parseFollowUpTime(value: string): Date {
  const hasTimezone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(value);
  return new Date(hasTimezone ? value : `${value}Z`);
}
