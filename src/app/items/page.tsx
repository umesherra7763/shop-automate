import Link from "next/link";
import { saveItem } from "@/lib/actions";
import { db } from "@/lib/db";
import { getSettings, getT } from "@/lib/i18n";
import { rs, rupees } from "@/lib/money";

type Item = { id: number; name: string; unit: string; hsn: string | null; gstRate: number; salePrice: number; stock: number; lowStockAt: number };

export default async function Items({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const [t, s, all] = await Promise.all([getT(), getSettings(), db.item.findMany({ orderBy: { name: "asc" } })]);
  const gst = s.gst !== "off";
  const needle = q.trim().toLowerCase();
  const items = needle ? all.filter((i) => i.name.toLowerCase().includes(needle)) : all;

  const Fields = ({ item }: { item?: Item }) => (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {item && <input type="hidden" name="id" value={item.id} />}
      <div className="col-span-2">
        <label className="label">{t("item")} *</label>
        <input name="name" className="input" required defaultValue={item?.name} />
      </div>
      <div>
        <label className="label">Unit (pcs, kg, box, bag…)</label>
        <input name="unit" className="input" defaultValue={item?.unit ?? "pcs"} />
      </div>
      <div>
        <label className="label">Sale {t("rate")} (₹)</label>
        <input name="salePrice" type="number" step="0.01" min="0" inputMode="decimal" className="input" defaultValue={item ? rupees(item.salePrice) : ""} />
      </div>
      <div>
        <label className="label">{item ? "Stock now (correct it here)" : "Stock now"}</label>
        <input name="stock" type="number" step="any" inputMode="decimal" className="input" defaultValue={item?.stock ?? ""} />
      </div>
      <div>
        <label className="label">Warn when stock is at or below</label>
        <input name="lowStockAt" type="number" step="any" min="0" inputMode="decimal" className="input" defaultValue={item?.lowStockAt ?? ""} />
      </div>
      {gst && (
        <>
          <div>
            <label className="label">GST %</label>
            <input name="gstRate" type="number" step="any" min="0" inputMode="decimal" className="input" defaultValue={item?.gstRate ?? 0} />
          </div>
          <div>
            <label className="label">HSN code</label>
            <input name="hsn" className="input" defaultValue={item?.hsn ?? ""} />
          </div>
        </>
      )}
      <div className="col-span-2 md:col-span-4">
        <button className="btn">{t("save")}</button>
      </div>
    </div>
  );

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="h1">{t("stock")}</h1>
        <Link href="/purchases" className="btn-2">
          + {t("purchases")}
        </Link>
      </div>

      <details className="card" open={all.length === 0}>
        <summary className="cursor-pointer text-sm font-semibold text-emerald-800">+ Add new item</summary>
        <form action={saveItem} className="mt-3">
          <Fields />
        </form>
      </details>

      <form>
        <input name="q" defaultValue={q} placeholder="Search item…" className="input" />
      </form>

      <section className="space-y-2">
        {items.length === 0 && <p className="text-sm text-stone-500">No items found.</p>}
        {items.map((i) => {
          const low = i.stock <= i.lowStockAt;
          return (
            <details key={i.id} className="card py-3">
              <summary className="flex cursor-pointer items-center justify-between gap-3">
                <span>
                  <span className="font-medium">{i.name}</span>
                  <span className="ml-2 text-xs text-stone-500">
                    {rs(i.salePrice)}/{i.unit}
                    {gst && i.gstRate > 0 && ` · GST ${i.gstRate}%`}
                  </span>
                </span>
                <span className={`whitespace-nowrap font-semibold tabular-nums ${low ? "text-red-700" : "text-stone-800"}`}>
                  {i.stock} {i.unit}
                  {low && <span className="ml-1 text-xs font-normal">({t("lowStock")})</span>}
                </span>
              </summary>
              <form action={saveItem} className="mt-3 border-t border-stone-100 pt-3">
                <Fields item={i} />
              </form>
            </details>
          );
        })}
      </section>
    </>
  );
}
