const TZ = 'Africa/Harare';

export const formatTime = (timestamp: string): string =>
  new Date(timestamp).toLocaleTimeString('en-ZW', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: TZ,
  });

export const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  const now = new Date();

  const toDay = (d: Date) =>
    d.toLocaleDateString('en-ZW', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' });

  if (toDay(date) === toDay(now)) return 'Today';

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (toDay(date) === toDay(yesterday)) return 'Yesterday';

  return date.toLocaleDateString('en-ZW', { month: 'short', day: 'numeric', timeZone: TZ });
};

export const formatDateTime = (dateStr: string): string =>
  new Date(dateStr).toLocaleString('en-ZW', {
    timeZone: TZ,
    dateStyle: 'medium',
    timeStyle: 'short',
  });

export const formatDateOnly = (dateStr: string): string =>
  new Date(dateStr).toLocaleDateString('en-ZW', { timeZone: TZ });

export const formatDateMediumShort = (iso: string | null): string => {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-ZW', {
    timeZone: TZ,
    dateStyle: 'medium',
    timeStyle: 'short',
  });
};
