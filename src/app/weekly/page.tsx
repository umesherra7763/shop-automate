import Link from "next/link";
import { PrintButton } from "@/components/Buttons";
import { db } from "@/lib/db";
import { getT } from "@/lib/i18n";
import { addDays, rs, showDate, toDate, validDate, weekStart } from "@/lib/money";

// The Sunday posting, done automatically: for each party, what they owed at the start of the
// week, the new bills, what they paid, and what they owe now.
export default async function Weekly({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const sp = await searchParams;
  const from = weekStart(validDate(sp.date));
  const to = addDays(from, 6); // Monday to Sunday
  const start = toDate(from);
  const end = toDate(addDays(from, 7));
  const t = await getT();

  const g = (where: object) => ({ by: ["partyId"] as ["partyId"], where: { partyId: { not: null }, ...where } });
  const [parties, billsBefore, paysBefore, billsWeek, paysWeek] = await Promise.all([
    db.party.findMany({ orderBy: { name: "asc" } }),
    db.bill.groupBy({ ...g({ date: { lt: start } }), _sum: { total: true } }),
    db.payment.groupBy({ ...g({ date: { lt: start } }), _sum: { amount: true } }),
    db.bill.groupBy({ ...g({ date: { gte: start, lt: end } }), _sum: { total: true }, _count: true }),
    db.payment.groupBy({ ...g({ date: { gte: start, lt: end } }), _sum: { amount: true } }),
  ]);
  const m = <R extends { partyId: number | null }>(rows: R[], f: (r: R) => number) =>
    new Map(rows.map((r) => [r.partyId, f(r)]));
  const bb = m(billsBefore, (r) => r._sum.total ?? 0);
  const pb = m(paysBefore, (r) => r._sum.amount ?? 0);
  const bw = m(billsWeek, (r) => r._sum.total ?? 0);
  const bc = m(billsWeek, (r) => r._count);
  const pw = m(paysWeek, (r) => r._sum.amount ?? 0);

  const rows = parties
    .map((p) => {
      const opening = p.openingBalance + (bb.get(p.id) ?? 0) - (pb.get(p.id) ?? 0);
      const bills = bw.get(p.id) ?? 0;
      const paid = pw.get(p.id) ?? 0;
      return { id: p.id, name: p.name, opening, bills, count: bc.get(p.id) ?? 0, paid, closing: opening + bills - paid };
    })
    .filter((r) => r.opening || r.bills || r.paid);
  const tot = (k: "opening" | "bills" | "paid" | "closing") => rows.reduce((a, r) => a + r[k], 0);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="h1">
          {t("weekly")} · {showDate(from)} – {showDate(to)}
        </h1>
        <div className="no-print flex gap-2">
          <Link href={`/weekly?date=${addDays(from, -7)}`} className="btn-2">
            ← Previous week
          </Link>
          <Link href={`/weekly?date=${addDays(from, 7)}`} className="btn-2">
            Next week →
          </Link>
          <PrintButton label={t("print")} />
        </div>
      </div>

      <section className="card overflow-x-auto">
        {rows.length === 0 ? (
          <p className="text-sm text-stone-500">No khatha activity up to this week.</p>
        ) : (
          <table className="tbl">
            <thead>
              <tr>
                <th>{t("party")}</th>
                <th className="r">{t("openingBalance")}</th>
                <th className="r">{t("newBills")}</th>
                <th className="r">{t("payments")}</th>
                <th className="r">{t("closingBalance")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>
                    <Link href={`/parties/${r.id}`} className="font-medium text-emerald-800">
                      {r.name}
                    </Link>
                  </td>
                  <td className="r">{rs(r.opening)}</td>
                  <td className="r">
                    {r.bills ? rs(r.bills) : "–"}
                    {r.count > 0 && <span className="ml-1 text-xs text-stone-500">({r.count})</span>}
                  </td>
                  <td className="r text-emerald-700">{r.paid ? rs(r.paid) : "–"}</td>
                  <td className="r font-semibold">{rs(r.closing)}</td>
                </tr>
              ))}
              <tr className="font-bold">
                <td>{t("total")}</td>
                <td className="r">{rs(tot("opening"))}</td>
                <td className="r">{rs(tot("bills"))}</td>
                <td className="r">{rs(tot("paid"))}</td>
                <td className="r">{rs(tot("closing"))}</td>
              </tr>
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}
