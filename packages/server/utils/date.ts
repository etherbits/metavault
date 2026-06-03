export function toDateStringFromYearMonthDay({
  year,
  month,
  day,
}: {
  year?: number | null;
  month?: number | null;
  day?: number | null;
}): string | null {
  if (!year || !month || !day) return null;
  return [
    String(year).padStart(4, "0"),
    String(month).padStart(2, "0"),
    String(day).padStart(2, "0"),
  ].join("-");
}
