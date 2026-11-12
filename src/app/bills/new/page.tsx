import BillForm from "@/components/BillForm";
import { db } from "@/lib/db";
import { getSettings, getT } from "@/lib/i18n";
import { MODES, todayStr } from "@/lib/money";

export default async function NewBill({ searchParams }: { searchParams: Promise<{ party?: string }> }) {
  const sp = await searchParams;
  const [t, s, parties, items] = await Promise.all([
    getT(),
    getSettings(),
    db.party.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.item.findMany({ orderBy: { name: "asc" } }),
  ]);
  const want = Number(sp.party) || null;
  return (
    <>
      <h1 className="h1">{t("newBill")}</h1>
      <BillForm
        parties={parties}
        items={items}
        today={todayStr()}
        gst={s.gst !== "off"}
        defaultParty={parties.some((p) => p.id === want) ? want : null}
        modes={MODES}
        labels={{
          party: t("party"),
          date: t("date"),
          item: t("item"),
          qty: t("qty"),
          rate: t("rate"),
          amount: t("amount"),
          total: t("total"),
          received: t("received"),
          save: t("save"),
          cashSale: t("cashSale"),
        }}
      />
    </>
  );
}
