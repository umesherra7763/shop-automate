import Link from "next/link";
import { DeleteButton, PrintButton } from "@/components/Buttons";
import { addCashEntry, deleteCashEntry, deletePayment } from "@/lib/actions";
import { db } from "@/lib/db";
import { getSettings, getT } from "@/lib/i18n";
import { MODES, addDays, rs, showDate, sum, toDate, toPaise, todayStr, validDate } from "@/lib/money";

const OUT_CATEGORIES = ["Expense", "Purchase", "Salary", "Transport", "Rent", "Drawings", "Other"];

export default async function DayBook({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const sp = await searchParams;
  const date = validDate(sp.date);
  const d = toDate(date);
  const [t, s] = await Promise.all([getT(), getSettings()]);

  const [pays, entries, bills, prevPay, prevIn, prevOut] = await Promise.all([
    db.payment.findMany({
      where: { date: d },
      include: { party: true, worker: true, allocations: { include: { bill: true } } },
      orderBy: { id: "asc" },
    }),
    db.cashEntry.findMany({ where: { date: d }, orderBy: { id: "asc" } }),
    db.bill.findMany({
      where: { date: d },
      include: { party: true, allocations: { include: { payment: true } } },
      orderBy: { number: "asc" },
    }),
    db.payment.aggregate({ _sum: { amount: true }, where: { date: { lt: d }, mode: "CASH" } }),
    db.cashEntry.aggregate({ _sum: { amount: true }, where: { date: { lt: d }, mode: "CASH", direction: "IN" } }),
    db.cashEntry.aggregate({ _sum: { amount: true }, where: { date: { lt: d }, mode: "CASH", direction: "OUT" } }),
  ]);

  const ins = entries.filter((e) => e.direction === "IN");
  const outs = entries.filter((e) => e.direction === "OUT");
  const totalIn = sum(pays) + sum(ins);
  const totalOut = sum(outs);
  const cash = (xs: { amount: number; mode: string }[]) => sum(xs.filter((x) => x.mode === "CASH"));
  const openingCash =
    toPaise(s.openingCash) + (prevPay._sum.amount ?? 0) + (prevIn._sum.amount ?? 0) - (prevOut._sum.amount ?? 0);
  const closingCash = openingCash + cash(pays) + cash(ins) - cash(outs);
  const nonCashIn = totalIn - cash(pays) - cash(ins);

  const sales = bills.map((b) => {
    const atCounter = sum(b.allocations.filter((a) => a.payment.withBill));
    return { ...b, atCounter, credit: b.total - atCounter };
  });

  const Tag = ({ mode }: { mode: string }) =>
    mode === "CASH" ? null : <span className="ml-1 rounded bg-sky-100 px-1 text-[10px] text-sky-800">{mode}</span>;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="h1">
          {t("dayBook")} · {showDate(date)}
        </h1>
        <div className="no-print flex items-center gap-2">
          <Link href={`/daybook?date=${addDays(date, -1)}`} className="btn-2">
            ←
          </Link>
          <form>
            <input type="date" name="date" defaultValue={date} className="input" />
          </form>
          <Link href={`/daybook?date=${addDays(date, 1)}`} className="btn-2">
            →
          </Link>
          {date !== todayStr() && (
            <Link href="/daybook" className="btn-2">
              Today
            </Link>
          )}
          <PrintButton label={t("print")} />
        </div>
      </div>
      <p className="no-print -mt-2 text-xs text-stone-500">Pick a date and press Enter to open that day.</p>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="card">
          <h2 className="h2 text-emerald-700">{t("moneyIn")}</h2>
          <table className="tbl">
            <tbody>
              <tr className="text-stone-500">
                <td>{t("openingBalance")} (cash)</td>
                <td className="r">{rs(openingCash)}</td>
              </tr>
              {pays.map((p) => (
                <tr key={`p${p.id}`}>
                  <td>
                    <div className="font-medium">
                      {p.party ? (
                        <Link href={`/parties/${p.party.id}`} className="text-emerald-800">
                          {p.party.name}
                        </Link>
                      ) : (
                        t("cashSale")
                      )}
                      <Tag mode={p.mode} />
                    </div>
                    <div className="text-xs text-stone-500">
                      {p.withBill ? t("cashSale") : t("collection")}
                      {p.allocations.length > 0 &&
                        " · " +
                          p.allocations.map((a) => `#${a.bill.number} (${showDate(a.bill.date)})`).join(", ")}
                      {p.worker && ` · ${p.worker.name}`}
                      {p.note && ` · ${p.note}`}{" "}
                      {!p.withBill && <DeleteButton action={deletePayment.bind(null, p.id)} />}
                    </div>
                  </td>
                  <td className="r">{rs(p.amount)}</td>
                </tr>
              ))}
              {ins.map((e) => (
                <tr key={`e${e.id}`}>
                  <td>
                    <div className="font-medium">
                      {e.description}
                      <Tag mode={e.mode} />
                    </div>
                    <div className="text-xs text-stone-500">
                      {e.category} <DeleteButton action={deleteCashEntry.bind(null, e.id)} />
                    </div>
                  </td>
                  <td className="r">{rs(e.amount)}</td>
                </tr>
              ))}
              <tr className="font-bold">
                <td>{t("total")} (today)</td>
                <td className="r text-emerald-700">{rs(totalIn)}</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section className="card">
          <h2 className="h2 text-red-700">{t("moneyOut")}</h2>
          <table className="tbl">
            <tbody>
              {outs.length === 0 && (
                <tr>
                  <td className="text-stone-500">Nothing paid out.</td>
                  <td />
                </tr>
              )}
              {outs.map((e) => (
                <tr key={e.id}>
                  <td>
                    <div className="font-medium">
                      {e.description}
                      <Tag mode={e.mode} />
                    </div>
                    <div className="text-xs text-stone-500">
                      {e.category}{" "}
                      {e.purchaseId ? null : <DeleteButton action={deleteCashEntry.bind(null, e.id)} />}
                    </div>
                  </td>
                  <td className="r">{rs(e.amount)}</td>
                </tr>
              ))}
              <tr className="font-bold">
                <td>{t("total")} (today)</td>
                <td className="r text-red-700">{rs(totalOut)}</td>
              </tr>
            </tbody>
          </table>
        </section>
      </div>

      <section className="card grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
        <div>
          <div className="text-xs text-stone-500">{t("openingBalance")} (cash)</div>
          <div className="font-bold tabular-nums">{rs(openingCash)}</div>
        </div>
        <div>
          <div className="text-xs text-stone-500">UPI / bank / cheque in</div>
          <div className="font-bold tabular-nums">{rs(nonCashIn)}</div>
        </div>
        <div>
          <div className="text-xs text-stone-500">{t("creditSale")} (today)</div>
          <div className="font-bold tabular-nums text-amber-700">{rs(sales.reduce((a, b) => a + b.credit, 0))}</div>
        </div>
        <div>
          <div className="text-xs text-stone-500">
            {t("cashInHand")} ({t("closingBalance")})
          </div>
          <div className="text-lg font-bold tabular-nums text-emerald-700">{rs(closingCash)}</div>
        </div>
      </section>

      <section className="card overflow-x-auto">
        <h2 className="h2">{t("todaySales")} (goods out)</h2>
        {sales.length === 0 ? (
          <p className="text-sm text-stone-500">No bills on this day.</p>
        ) : (
          <table className="tbl">
            <thead>
              <tr>
                <th>Bill</th>
                <th>{t("party")}</th>
                <th className="r">{t("total")}</th>
                <th className="r">{t("received")}</th>
                <th className="r">{t("creditSale")}</th>
              </tr>
            </thead>
            <tbody>
              {sales.map((b) => (
                <tr key={b.id}>
                  <td>
                    <Link href={`/bills/${b.id}`} className="text-emerald-800">
                      #{b.number}
                    </Link>
                  </td>
                  <td>{b.party?.name ?? b.customerName ?? t("cashSale")}</td>
                  <td className="r">{rs(b.total)}</td>
                  <td className="r">{rs(b.atCounter)}</td>
                  <td className={`r ${b.credit ? "font-semibold text-amber-700" : ""}`}>{rs(b.credit)}</td>
                </tr>
              ))}
              <tr className="font-bold">
                <td colSpan={2}>{t("total")}</td>
                <td className="r">{rs(sales.reduce((a, b) => a + b.total, 0))}</td>
                <td className="r">{rs(sales.reduce((a, b) => a + b.atCounter, 0))}</td>
                <td className="r">{rs(sales.reduce((a, b) => a + b.credit, 0))}</td>
              </tr>
            </tbody>
          </table>
        )}
      </section>

      <section className="card no-print">
        <h2 className="h2">Add expense / other entry</h2>
        <form action={addCashEntry} className="grid grid-cols-2 gap-3 md:grid-cols-6">
          <input type="hidden" name="date" value={date} />
          <div>
            <label className="label">Type</label>
            <select name="direction" className="input">
              <option value="OUT">{t("moneyOut")}</option>
              <option value="IN">{t("moneyIn")}</option>
            </select>
          </div>
          <div>
            <label className="label">Category</label>
            <select name="category" className="input">
              {OUT_CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="col-span-2">
            <label className="label">Details</label>
            <input name="description" className="input" required placeholder="Tea, auto charges, electricity…" />
          </div>
          <div>
            <label className="label">{t("amount")} (₹)</label>
            <input name="amount" type="number" step="0.01" min="0.01" inputMode="decimal" className="input" required />
          </div>
          <div>
            <label className="label">Mode</label>
            <select name="mode" className="input">
              {MODES.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
          </div>
          <div className="col-span-2 md:col-span-6">
            <button className="btn">{t("save")}</button>
            <span className="ml-3 text-xs text-stone-500">
              Bills and collections come here automatically — add only expenses and other entries here.
            </span>
          </div>
        </form>
      </section>
    </>
  );
}
