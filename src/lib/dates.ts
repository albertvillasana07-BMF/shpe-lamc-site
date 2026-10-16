/** Today's date in Los Angeles as YYYY-MM-DD (matches how dates are stored). */
export function todayInLA() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles" }).format(new Date());
}
