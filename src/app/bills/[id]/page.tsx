import Link from "next/link";
import { notFound } from "next/navigation";
import { DeleteButton, PrintButton } from "@/components/Buttons";
import { deleteBill } from "@/lib/actions";
import { db } from "@/lib/db";
import { getSettings, getT } from "@/lib/i18n";
import { rs, showDate } from "@/lib/money";

export default async function BillPage({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  if (!id) notFound();
  const [t, s, bill] = await Promise.all([
    getT(),
    getSettings(),
    db.bill.findUnique({
      where: { id },
      include: {
        party: true,
        lines: { orderBy: { id: "asc" } },
        allocations: { include: { payment: { include: { worker: true } } }, orderBy: { id: "asc" } },
      },
    }),
  ]);
  if (!bill) notFound();
  const gst = bill.tax > 0;
  const paid = bill.allocations.reduce((a, x) => a + x.amount, 0);
  const left = bill.total - paid;
  const who = bill.party?.name ?? bill.customerName ?? t("cashSale");

  const phone = bill.party?.phone?.replace(/\D/g, "").replace(/^(\d{10})$/, "91$1");
  const waText =
    `${s.shopName || "Shop"}\nBill #${bill.number} · ${showDate(bill.date)}\n` +
    bill.lines.map((l) => `${l.name} ${l.qty} ${l.unit} x ${rs(l.rate)} = ${rs(l.taxable)}`).join("\n") +
    (gst ? `\nGST: ${rs(bill.tax)}` : "") +
    `\nTotal: ${rs(bill.total)}\nPaid: ${rs(paid)}\nPending: ${rs(left)}`;

  // One printed copy. The shop copy carries the signature line and the payment record,
  // like the signed paper bill kept in the shop.
  const Copy = ({ title, shop }: { title: string; shop: boolean }) => (
    <div className="text-sm">
      <div className="flex items-start justify-between border-b border-stone-300 pb-2">
        <div>
          <div className="text-lg font-bold">{s.shopName || "Shop name (set in Settings)"}</div>
          <div className="text-xs text-stone-600">{s.shopAddress}</div>
          <div className="text-xs text-stone-600">
            {s.shopPhone && `Ph: ${s.shopPhone}`} {s.shopGstin && ` · GSTIN: ${s.shopGstin}`}
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs uppercase text-stone-500">{title}</div>
          <div className="font-bold">Bill #{bill.number}</div>
          <div>{showDate(bill.date)}</div>
        </div>
      </div>
      <div className="py-2">
        <span className="text-stone-500">To: </span>
        <b>{who}</b>
        {bill.party?.nameLocal && ` (${bill.party.nameLocal})`}
        <div className="text-xs text-stone-600">
          {[bill.party?.address, bill.party?.phone, bill.party?.gstin && `GSTIN: ${bill.party.gstin}`]
            .filter(Boolean)
            .join(" · ")}
        </div>
      </div>
      <table className="tbl">
        <thead>
          <tr>
            <th>#</th>
            <th>{t("item")}</th>
            {gst && <th>HSN</th>}
            <th className="r">{t("qty")}</th>
            <th className="r">{t("rate")}</th>
            {gst && <th className="r">GST</th>}
            <th className="r">{t("amount")}</th>
          </tr>
        </thead>
        <tbody>
          {bill.lines.map((l, i) => (
            <tr key={l.id}>
              <td>{i + 1}</td>
              <td>{l.name}</td>
              {gst && <td>{l.hsn}</td>}
              <td className="r">
                {l.qty} {l.unit}
              </td>
              <td className="r">{rs(l.rate)}</td>
              {gst && <td className="r">{l.gstRate}%</td>}
              <td className="r">{rs(l.taxable)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="ml-auto mt-2 max-w-[260px] space-y-1">
        {gst && (
          <>
            <Row k="Taxable value" v={rs(bill.taxable)} />
            <Row k="CGST" v={rs(Math.floor(bill.tax / 2))} />
            <Row k="SGST" v={rs(bill.tax - Math.floor(bill.tax / 2))} />
          </>
        )}
        {bill.roundOff !== 0 && <Row k="Round off" v={rs(bill.roundOff)} />}
        <div className="flex justify-between border-t border-stone-300 pt-1 text-base font-bold">
          <span>{t("total")}</span>
          <span className="tabular-nums">{rs(bill.total)}</span>
        </div>
        <Row k={t("received")} v={rs(paid)} />
        <div className="flex justify-between font-bold">
          <span>{t("pending")}</span>
          <span className="tabular-nums">{rs(left)}</span>
        </div>
      </div>
      {bill.note && <p className="mt-2 text-xs text-stone-600">Note: {bill.note}</p>}
      {shop && (
        <div className="mt-4">
          <div className="text-xs font-semibold uppercase text-stone-500">{t("payments")}</div>
          <table className="tbl">
            <tbody>
              {bill.allocations.map((a) => (
                <tr key={a.id}>
                  <td>{showDate(a.payment.date)}</td>
                  <td>
                    {a.payment.withBill ? "With bill" : t("collection")}
                    {a.payment.worker && ` · ${a.payment.worker.name}`}
                    {a.payment.mode !== "CASH" && ` · ${a.payment.mode}`}
                  </td>
                  <td className="r">{rs(a.amount)}</td>
                </tr>
              ))}
              {/* blank rows to note payments by hand on the paper copy */}
              {left > 0 &&
                [1, 2, 3].map((i) => (
                  <tr key={`x${i}`} className="hidden print:table-row">
                    <td className="h-8">&nbsp;</td>
                    <td />
                    <td />
                  </tr>
                ))}
            </tbody>
          </table>
          <div className="mt-10 flex justify-between text-xs text-stone-600">
            <span className="border-t border-stone-400 px-6 pt-1">{t("signature")}</span>
            <span className="border-t border-stone-400 px-6 pt-1">For {s.shopName || "shop"}</span>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      <div className="no-print flex flex-wrap items-center justify-between gap-2">
        <h1 className="h1">
          Bill #{bill.number}{" "}
          <span className={`text-sm font-semibold ${left > 0 ? "text-amber-700" : "text-emerald-700"}`}>
            {left > 0 ? `${t("pending")} ${rs(left)}` : "Cleared"}
          </span>
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          <PrintButton label={`${t("print")} (2 copies)`} />
          <a
            className="btn-2"
            target="_blank"
            href={`https://wa.me/${phone ?? ""}?text=${encodeURIComponent(waText)}`}
          >
            WhatsApp
          </a>
          {bill.party && (
            <Link href={`/parties/${bill.party.id}`} className="btn-2">
              {t("khatha")}
            </Link>
          )}
          <Link href="/bills/new" className="btn-2">
            + {t("newBill")}
          </Link>
        </div>
      </div>

      <section className="card page-break">
        <Copy title={t("shopCopy")} shop />
      </section>
      <section className="card hidden print:block">
        <Copy title={t("customerCopy")} shop={false} />
      </section>

      <div className="no-print text-right">
        <DeleteButton
          action={deleteBill.bind(null, bill.id)}
          label="Delete this bill"
          confirmText="Delete this bill? Stock will be added back and the money received with it removed."
        />
      </div>
    </>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between">
      <span>{k}</span>
      <span className="tabular-nums">{v}</span>
    </div>
  );
}
