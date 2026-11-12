// Money is kept in paise (integers) everywhere; these helpers convert at the edges.

export const toPaise = (v: unknown): number => {
  const n = parseFloat(String(v ?? "").replace(/,/g, ""));
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
};

export const num = (v: unknown): number => {
  const n = parseFloat(String(v ?? ""));
  return Number.isFinite(n) ? n : 0;
};

export const rs = (paise: number): string =>
  (paise < 0 ? "-" : "") +
  "₹" +
  (Math.abs(paise) / 100).toLocaleString("en-IN", {
    minimumFractionDigits: paise % 100 ? 2 : 0,
    maximumFractionDigits: 2,
  });

export const rupees = (paise: number): string => (paise / 100).toFixed(paise % 100 ? 2 : 0);

// Dates: "YYYY-MM-DD" strings in the UI, UTC-midnight Date objects in the database.
export const todayStr = (): string =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());

export const toDate = (s: string): Date => new Date(s + "T00:00:00.000Z");

export const dstr = (d: Date): string => d.toISOString().slice(0, 10);

export const addDays = (s: string, n: number): string =>
  dstr(new Date(toDate(s).getTime() + n * 86400000));

export const validDate = (s: unknown): string =>
  typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(toDate(s).getTime())
    ? s
    : todayStr();

export const showDate = (d: Date | string): string => {
  const [y, m, dd] = (typeof d === "string" ? d : dstr(d)).split("-");
  return `${dd}-${m}-${y}`;
};

// Monday of the week containing the given day.
export const weekStart = (s: string): string => {
  const dow = toDate(s).getUTCDay(); // 0 = Sunday
  return addDays(s, -((dow + 6) % 7));
};

export const sum = (xs: { amount: number }[]): number => xs.reduce((a, x) => a + x.amount, 0);

export const MODES = ["CASH", "UPI", "BANK", "CHEQUE"] as const;
