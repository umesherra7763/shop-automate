import Link from "next/link";
import { db } from "@/lib/db";
import { getT } from "@/lib/i18n";
import { rs, showDate, sum, toDate, todayStr } from "@/lib/money";
import { partyBalances } from "@/lib/queries";

export default async function Home() {
  const t = await getT();
  const today = todayStr();
  const d = toDate(today);
  const [bills, pays, entries, balances, items] = await Promise.all([
    db.bill.findMany({ where: { date: d } }),
    db.payment.findMany({ where: { date: d } }),
    db.cashEntry.findMany({ where: { date: d } }),
    partyBalances(),
    db.item.findMany({ orderBy: { name: "asc" } }),
  ]);
  const sales = bills.reduce((a, b) => a + b.total, 0);
  const moneyIn = sum(pays) + sum(entries.filter((e) => e.direction === "IN"));
  const moneyOut = sum(entries.filter((e) => e.direction === "OUT"));
  const outstanding = balances.reduce((a, p) => a + Math.max(p.balance, 0), 0);
  const top = balances.filter((p) => p.balance > 0).sort((a, b) => b.balance - a.balance).slice(0, 8);
  const low = items.filter((i) => i.stock <= i.lowStockAt);

  const Stat = ({ label, value, href, tone = "" }: { label: string; value: string; href: string; tone?: string }) => (
    <Link href={href} className="card block hover:border-emerald-600">
      <div className="text-xs text-stone-500">{label}</div>
      <div className={`mt-1 text-xl font-bold tabular-nums ${tone}`}>{value}</div>
    </Link>
  );

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="h1">{showDate(today)}</h1>
        <div className="flex gap-2">
          <Link href="/bills/new" className="btn">
            + {t("newBill")}
          </Link>
          <Link href="/collections" className="btn-2">
            {t("recordPayment")}
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label={t("todaySales")} value={rs(sales)} href="/daybook" />
        <Stat label={t("moneyIn")} value={rs(moneyIn)} href="/daybook" tone="text-emerald-700" />
        <Stat label={t("moneyOut")} value={rs(moneyOut)} href="/daybook" tone="text-red-700" />
        <Stat label={t("outstanding")} value={rs(outstanding)} href="/collections" tone="text-amber-700" />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="card">
          <h2 className="h2">{t("outstanding")}</h2>
          {top.length === 0 && <p className="text-sm text-stone-500">Nobody owes anything.</p>}
          <table className="tbl">
            <tbody>
              {top.map((p) => (
                <tr key={p.id}>
                  <td>
                    <Link href={`/parties/${p.id}`} className="font-medium text-emerald-800">
                      {p.name}
                    </Link>
                  </td>
                  <td className="r">{rs(p.balance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="card">
          <h2 className="h2">{t("lowStock")}</h2>
          {low.length === 0 && <p className="text-sm text-stone-500">All items have enough stock.</p>}
          <table className="tbl">
            <tbody>
              {low.slice(0, 8).map((i) => (
                <tr key={i.id}>
                  <td>{i.name}</td>
                  <td className={`r ${i.stock < 0 ? "text-red-700" : ""}`}>
                    {i.stock} {i.unit}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </>
  );
}
