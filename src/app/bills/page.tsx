import Link from "next/link";
import { db } from "@/lib/db";
import { getT } from "@/lib/i18n";
import { rs, showDate } from "@/lib/money";
import { paidOn } from "@/lib/queries";

export default async function Bills({ searchParams }: { searchParams: Promise<{ show?: string }> }) {
  const { show } = await searchParams;
  const t = await getT();
  const all = await db.bill.findMany({
    include: { party: true, allocations: true },
    orderBy: [{ date: "desc" }, { number: "desc" }],
    take: show === "pending" ? undefined : 300,
  });
  const bills = all.map((b) => ({ ...b, left: b.total - paidOn(b) })).filter((b) => show !== "pending" || b.left > 0);
  const tab = (on: boolean) => (on ? "btn" : "btn-2");

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="h1">{t("bills")}</h1>
        <Link href="/bills/new" className="btn">
          + {t("newBill")}
        </Link>
      </div>
      <div className="flex gap-2">
        <Link href="/bills" className={tab(show !== "pending")}>
          All
        </Link>
        <Link href="/bills?show=pending" className={tab(show === "pending")}>
          {t("pendingBills")}
        </Link>
      </div>
      <section className="card overflow-x-auto">
        {bills.length === 0 ? (
          <p className="text-sm text-stone-500">No bills yet.</p>
        ) : (
          <table className="tbl">
            <thead>
              <tr>
                <th>Bill</th>
                <th>{t("date")}</th>
                <th>{t("party")}</th>
                <th className="r">{t("total")}</th>
                <th className="r">{t("pending")}</th>
              </tr>
            </thead>
            <tbody>
              {bills.map((b) => (
                <tr key={b.id}>
                  <td>
                    <Link href={`/bills/${b.id}`} className="font-medium text-emerald-800">
                      #{b.number}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap">{showDate(b.date)}</td>
                  <td>{b.party?.name ?? b.customerName ?? t("cashSale")}</td>
                  <td className="r">{rs(b.total)}</td>
                  <td className="r">
                    {b.left > 0 ? (
                      <span className="font-semibold text-amber-700">{rs(b.left)}</span>
                    ) : (
                      <span className="text-emerald-700">Cleared</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}
