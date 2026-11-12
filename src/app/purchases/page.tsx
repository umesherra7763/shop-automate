import Link from "next/link";
import { DeleteButton } from "@/components/Buttons";
import PurchaseForm from "@/components/PurchaseForm";
import { deletePurchase } from "@/lib/actions";
import { db } from "@/lib/db";
import { getT } from "@/lib/i18n";
import { MODES, rs, showDate, todayStr } from "@/lib/money";

export default async function Purchases() {
  const [t, items, purchases] = await Promise.all([
    getT(),
    db.item.findMany({ select: { id: true, name: true, unit: true }, orderBy: { name: "asc" } }),
    db.purchase.findMany({
      include: { lines: { include: { item: true } } },
      orderBy: [{ date: "desc" }, { id: "desc" }],
      take: 100,
    }),
  ]);

  return (
    <>
      <h1 className="h1">{t("purchases")}</h1>

      <section className="card">
        <h2 className="h2">New purchase (stock coming in)</h2>
        {items.length === 0 ? (
          <p className="text-sm text-stone-500">
            Add your items in{" "}
            <Link href="/items" className="text-emerald-800 underline">
              {t("stock")}
            </Link>{" "}
            first.
          </p>
        ) : (
          <PurchaseForm items={items} today={todayStr()} modes={MODES} />
        )}
      </section>

      <section className="card overflow-x-auto">
        <h2 className="h2">Recent purchases</h2>
        {purchases.length === 0 ? (
          <p className="text-sm text-stone-500">No purchases yet.</p>
        ) : (
          <table className="tbl">
            <thead>
              <tr>
                <th>{t("date")}</th>
                <th>Supplier</th>
                <th>Items</th>
                <th className="r">{t("total")}</th>
                <th className="r">Paid</th>
              </tr>
            </thead>
            <tbody>
              {purchases.map((p) => (
                <tr key={p.id}>
                  <td className="whitespace-nowrap">{showDate(p.date)}</td>
                  <td>
                    {p.supplier}
                    {p.invoiceNo && <div className="text-xs text-stone-500">Bill {p.invoiceNo}</div>}
                    <DeleteButton
                      action={deletePurchase.bind(null, p.id)}
                      confirmText="Delete this purchase? Stock and the day book entry will be reversed."
                    />
                  </td>
                  <td className="text-xs">
                    {p.lines.map((l) => (
                      <div key={l.id}>
                        {l.item.name}: {l.qty} {l.item.unit} × {rs(l.rate)}
                      </div>
                    ))}
                  </td>
                  <td className="r">{rs(p.total)}</td>
                  <td className={`r ${p.paid < p.total ? "text-amber-700" : ""}`}>{rs(p.paid)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}
