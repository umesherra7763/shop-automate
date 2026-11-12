import { addWorker, saveSettings, toggleWorker } from "@/lib/actions";
import { db } from "@/lib/db";
import { DEFAULT_LANG, LANGS, getSettings, getT } from "@/lib/i18n";

export default async function Settings() {
  const [t, s, workers] = await Promise.all([getT(), getSettings(), db.worker.findMany({ orderBy: { name: "asc" } })]);
  return (
    <>
      <h1 className="h1">{t("settings")}</h1>

      <section className="card">
        <h2 className="h2">Shop details (printed on bills)</h2>
        <form action={saveSettings} className="grid grid-cols-2 gap-3 md:grid-cols-3">
          <div>
            <label className="label">Shop name</label>
            <input name="shopName" className="input" defaultValue={s.shopName} />
          </div>
          <div>
            <label className="label">{t("phone")}</label>
            <input name="shopPhone" className="input" defaultValue={s.shopPhone} />
          </div>
          <div>
            <label className="label">GSTIN</label>
            <input name="shopGstin" className="input" defaultValue={s.shopGstin} />
          </div>
          <div className="col-span-2 md:col-span-3">
            <label className="label">{t("address")}</label>
            <input name="shopAddress" className="input" defaultValue={s.shopAddress} />
          </div>
          <div>
            <label className="label">Second language on screen</label>
            <select name="lang" className="input" defaultValue={s.lang ?? DEFAULT_LANG}>
              <option value="">English only</option>
              {Object.entries(LANGS).map(([k, v]) => (
                <option key={k} value={k}>
                  English + {v.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Cash in hand when you started using the app (₹)</label>
            <input name="openingCash" type="number" step="0.01" inputMode="decimal" className="input" defaultValue={s.openingCash} />
          </div>
          <label className="flex items-center gap-2 self-end py-2 text-sm">
            <input type="checkbox" name="gst" defaultChecked={s.gst !== "off"} className="h-4 w-4" />
            Use GST on bills
          </label>
          <div className="col-span-2 md:col-span-3">
            <button className="btn">{t("save")}</button>
          </div>
        </form>
      </section>

      <section className="card">
        <h2 className="h2">{t("workers")} (who go for collection)</h2>
        <table className="tbl mb-3">
          <tbody>
            {workers.map((w) => (
              <tr key={w.id}>
                <td className={w.active ? "" : "text-stone-400 line-through"}>{w.name}</td>
                <td className="r">
                  <form action={toggleWorker.bind(null, w.id)}>
                    <button className="cursor-pointer text-xs text-emerald-800 underline">
                      {w.active ? "Remove from list" : "Add back"}
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <form action={addWorker} className="flex gap-2">
          <input name="name" className="input" placeholder="Worker name" required />
          <button className="btn whitespace-nowrap">+ Add</button>
        </form>
      </section>
    </>
  );
}
