import { recordPayment } from "@/lib/actions";
import type { T } from "@/lib/i18n";
import { MODES, rs, showDate } from "@/lib/money";

// Form to record money received from a party (a collection).
export default function PaymentForm({
  t,
  today,
  workers,
  parties,
  partyId,
  bills,
}: {
  t: T;
  today: string;
  workers: { id: number; name: string }[];
  parties?: { id: number; name: string; balance: number }[];
  partyId?: number;
  bills?: { id: number; number: number; date: Date; left: number }[];
}) {
  return (
    <form action={recordPayment} className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {partyId ? (
        <input type="hidden" name="partyId" value={partyId} />
      ) : (
        <div className="col-span-2">
          <label className="label">{t("party")}</label>
          <select name="partyId" className="input" required defaultValue="">
            <option value="" disabled>
              Choose…
            </option>
            {parties?.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({rs(p.balance)})
              </option>
            ))}
          </select>
        </div>
      )}
      <div>
        <label className="label">{t("amount")} (₹)</label>
        <input name="amount" type="number" step="0.01" min="0.01" inputMode="decimal" className="input" required />
      </div>
      <div>
        <label className="label">{t("date")}</label>
        <input name="date" type="date" defaultValue={today} className="input" required />
      </div>
      <div>
        <label className="label">{t("collectedBy")}</label>
        <select name="workerId" className="input" defaultValue="">
          <option value="">Paid at shop</option>
          {workers.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="label">Mode</label>
        <select name="mode" className="input">
          {MODES.map((m) => (
            <option key={m}>{m}</option>
          ))}
        </select>
      </div>
      {bills && bills.length > 0 && (
        <div className="col-span-2">
          <label className="label">Against bill</label>
          <select name="billId" className="input" defaultValue="">
            <option value="">Oldest bills first (automatic)</option>
            {bills.map((b) => (
              <option key={b.id} value={b.id}>
                #{b.number} · {showDate(b.date)} · {rs(b.left)} pending
              </option>
            ))}
          </select>
        </div>
      )}
      <div className="col-span-2">
        <label className="label">Note</label>
        <input name="note" className="input" />
      </div>
      <div className="col-span-2 flex items-end md:col-span-4">
        <button className="btn">{t("recordPayment")}</button>
      </div>
    </form>
  );
}
