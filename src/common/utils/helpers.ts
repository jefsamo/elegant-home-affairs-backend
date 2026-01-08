export const startOfDay = (d: Date) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};
export const addDays = (d: Date, days: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
};
export const fmtDayLabel = (d: Date) => {
  return d.toLocaleDateString('en-GB', { weekday: 'short' });
};
export const fmtISODate = (d: Date) => {
  return d.toISOString().slice(0, 10);
};
