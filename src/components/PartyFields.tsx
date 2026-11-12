import type { T } from "@/lib/i18n";
import { rupees } from "@/lib/money";

type P = {
  id: number;
  name: string;
  nameLocal: string | null;
  phone: string | null;
  address: string | null;
  gstin: string | null;
  openingBalance: number;
};

export default function PartyFields({ t, party }: { t: T; party?: P }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
      {party && <input type="hidden" name="id" value={party.id} />}
      <div>
        <label className="label">{t("name")} *</label>
        <input name="name" className="input" required defaultValue={party?.name} />
      </div>
      <div>
        <label className="label">Name in local language</label>
        <input name="nameLocal" className="input" defaultValue={party?.nameLocal ?? ""} />
      </div>
      <div>
        <label className="label">{t("phone")}</label>
        <input name="phone" className="input" inputMode="tel" defaultValue={party?.phone ?? ""} />
      </div>
      <div>
        <label className="label">{t("address")}</label>
        <input name="address" className="input" defaultValue={party?.address ?? ""} />
      </div>
      <div>
        <label className="label">GSTIN</label>
        <input name="gstin" className="input" defaultValue={party?.gstin ?? ""} />
      </div>
      <div>
        <label className="label">Old balance from paper khatha (₹)</label>
        <input
          name="openingBalance"
          type="number"
          step="0.01"
          inputMode="decimal"
          className="input"
          defaultValue={party ? rupees(party.openingBalance) : ""}
        />
      </div>
      <div className="col-span-2 md:col-span-3">
        <button className="btn">{t("save")}</button>
      </div>
    </div>
  );
}
