import Link from "next/link";
import { notFound } from "next/navigation";
import { DeleteButton, PrintButton } from "@/components/Buttons";
import PartyFields from "@/components/PartyFields";
import PaymentForm from "@/components/PaymentForm";
import { deletePayment, saveParty } from "@/lib/actions";
import { db } from "@/lib/db";
import { getSettings, getT } from "@/lib/i18n";
import { rs, showDate, todayStr } from "@/lib/money";
import { paidOn } from "@/lib/queries";

export default async function PartyPage({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  if (!id) notFound();
  const [t, s, party, workers] = await Promise.all([
    getT(),
    getSettings(),
    db.party.findUnique({
      where: { id },
      include: {
        bills: { include: { allocations: { include: { payment: true } } }, orderBy: [{ date: "asc" }, { number: "asc" }] },
        payments: { include: { worker: true, allocations: { include: { bill: true } } }, orderBy: [{ date: "asc" }, { id: "asc" }] },
      },
    }),
    db.worker.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
  ]);
  if (!party) notFound();

  // Khatha statement: bills add to the balance, payments reduce it.
  type Row = { key: string; date: Date; order: number; text: React.ReactNode; sub?: string; debit: number; credit: number; payId?: number };
  const rows: Row[] = [
    ...party.bills.map((b) => ({
      key: `b${b.id}`,
      date: b.date,
      order: 0,
      text: (
        <Link href={`/bills/${b.id}`} className="text-emerald-800">
          Bill #{b.number}
        </Link>
      ),
      debit: b.total,
      credit: 0,
    })),
    ...party.payments.map((p) => ({
      key: `p${p.id}`,
      date: p.date,
      order: 1,
      text: p.withBill ? "Paid with bill" : t("collection"),
      sub: [
        p.mode !== "CASH" ? p.mode : "",
        p.worker ? `${t("collectedBy")}: ${p.worker.name}` : "",
        p.allocations.length ? "for " + p.allocations.map((a) => `#${a.bill.number}`).join(", ") : "",
        p.note ?? "",
      ]
        .filter(Boolean)
        .join(" · "),
      debit: 0,
      credit: p.amount,
      payId: p.withBill ? undefined : p.id,
    })),
  ].sort((a, b) => a.date.getTime() - b.date.getTime() || a.order - b.order);

  let bal = party.openingBalance;
  const statement = rows.map((r) => ({ ...r, bal: (bal += r.debit - r.credit) }));
  const pending = party.bills.map((b) => ({ ...b, left: b.total - paidOn(b) })).filter((b) => b.left > 0);

  const wa = party.phone
    ? `https://wa.me/${party.phone.replace(/\D/g, "").replace(/^(\d{10})$/, "91$1")}?text=${encodeURIComponent(
        `${s.shopName || "Shop"}: Your pending balance is ${rs(bal)}.` +
          (pending.length
            ? "\nPending bills:\n" + pending.map((b) => `#${b.number} (${showDate(b.date)}): ${rs(b.left)}`).join("\n")
            : ""),
      )}`
    : null;

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 className="h1">
            {party.name} {party.nameLocal && <span className="font-normal text-stone-500">{party.nameLocal}</span>}
          </h1>
          <p className="text-sm text-stone-500">{[party.phone, party.address, party.gstin].filter(Boolean).join(" · ")}</p>
        </div>
        <div className="text-right">
          <div className="text-xs text-stone-500">{t("balance")}</div>
          <div className={`text-2xl font-bold tabular-nums ${bal > 0 ? "text-amber-700" : "text-emerald-700"}`}>{rs(bal)}</div>
        </div>
      </div>

      <div className="no-print flex flex-wrap gap-2">
        <Link href={`/bills/new?party=${party.id}`} className="btn">
          + {t("newBill")}
        </Link>
        {wa && bal > 0 && (
          <a href={wa} target="_blank" className="btn-2">
            WhatsApp reminder
          </a>
        )}
        <PrintButton label={t("print")} />
      </div>

      <section className="card no-print">
        <h2 className="h2">{t("recordPayment")}</h2>
        <PaymentForm t={t} today={todayStr()} workers={workers} partyId={party.id} bills={pending} />
      </section>

      <section className="card no-print overflow-x-auto">
        <h2 className="h2">{t("pendingBills")}</h2>
        {pending.length === 0 ? (
          <p className="text-sm text-stone-500">No pending bills.</p>
        ) : (
          <table className="tbl">
            <thead>
              <tr>
                <th>Bill</th>
                <th>{t("date")}</th>
                <th className="r">{t("total")}</th>
                <th className="r">{t("received")}</th>
                <th className="r">{t("pending")}</th>
              </tr>
            </thead>
            <tbody>
              {pending.map((b) => (
                <tr key={b.id}>
                  <td>
                    <Link href={`/bills/${b.id}`} className="text-emerald-800">
                      #{b.number}
                    </Link>
                  </td>
                  <td>{showDate(b.date)}</td>
                  <td className="r">{rs(b.total)}</td>
                  <td className="r">{rs(b.total - b.left)}</td>
                  <td className="r font-semibold text-amber-700">{rs(b.left)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="card overflow-x-auto">
        <h2 className="h2">{t("statement")}</h2>
        <table className="tbl">
          <thead>
            <tr>
              <th>{t("date")}</th>
              <th>Details</th>
              <th className="r">Bill</th>
              <th className="r">{t("received")}</th>
              <th className="r">{t("balance")}</th>
            </tr>
          </thead>
          <tbody>
            <tr className="text-stone-500">
              <td />
              <td>{t("openingBalance")}</td>
              <td />
              <td />
              <td className="r">{rs(party.openingBalance)}</td>
            </tr>
            {statement.map((r) => (
              <tr key={r.key}>
                <td className="whitespace-nowrap">{showDate(r.date)}</td>
                <td>
                  {r.text}
                  {r.sub && <div className="text-xs text-stone-500">{r.sub}</div>}
                  {r.payId && <DeleteButton action={deletePayment.bind(null, r.payId)} />}
                </td>
                <td className="r">{r.debit ? rs(r.debit) : ""}</td>
                <td className="r text-emerald-700">{r.credit ? rs(r.credit) : ""}</td>
                <td className="r font-semibold">{rs(r.bal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <details className="card no-print">
        <summary className="cursor-pointer text-sm font-semibold text-emerald-800">Edit party details</summary>
        <form action={saveParty} className="mt-3">
          <PartyFields t={t} party={party} />
        </form>
      </details>
    </>
  );
}
