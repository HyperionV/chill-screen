/** Hour of day as a fraction (13.5 = half past one), overridable with ?hour=21 to preview another time. */
export function hourNow(): number {
  const forced = new URLSearchParams(location.search).get('hour');
  if (forced !== null && !Number.isNaN(Number(forced))) return Number(forced);
  const d = new Date();
  return d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600;
}
