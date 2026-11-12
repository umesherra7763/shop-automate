import Link from "next/link";
import { PrintButton } from "@/components/Buttons";
import PaymentForm from "@/components/PaymentForm";
import { db } from "@/lib/db";
import { getT } from "@/lib/i18n";
import { rs, showDate, toDate, todayStr } from "@/lib/money";
import { partyBalances } from "@/lib/queries";

export default async function Collections() {
  const t = await getT();
  const today = todayStr();
  const [balances, workers] = await Promise.all([
    partyBalances(),
    db.worker.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
  ]);
  const due = balances.filter((p) => p.balance > 0).sort((a, b) => b.balance - a.balance);
  const days = (d: Date | null) => (d ? Math.round((toDate(today).getTime() - d.getTime()) / 86400000) : null);

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="h1">{t("collections")}</h1>
        <PrintButton label={t("print")} />
      </div>

      <section className="card no-print">
        <h2 className="h2">{t("recordPayment")}</h2>
        {due.length === 0 && balances.length === 0 ? (
          <p className="text-sm text-stone-500">
            Add parties in{" "}
            <Link href="/parties" className="text-emerald-800 underline">
              {t("khatha")}
            </Link>{" "}
            first.
          </p>
        ) : (
          <PaymentForm t={t} today={today} workers={workers} parties={balances} />
        )}
      </section>

      <section className="card overflow-x-auto">
        <h2 className="h2">
          To collect · {due.length} parties · {rs(due.reduce((a, p) => a + p.balance, 0))}
        </h2>
        <table className="tbl">
          <thead>
            <tr>
              <th>{t("party")}</th>
              <th>{t("phone")}</th>
              <th>Oldest bill</th>
              <th className="r">{t("balance")}</th>
              <th className="r hidden print:table-cell">Collected</th>
            </tr>
          </thead>
          <tbody>
            {due.map((p) => {
              const age = days(p.oldestPending);
              return (
                <tr key={p.id}>
                  <td>
                    <Link href={`/parties/${p.id}`} className="font-medium text-emerald-800">
                      {p.name}
                    </Link>
                    {p.nameLocal && <span className="ml-2 text-stone-500">{p.nameLocal}</span>}
                  </td>
                  <td>{p.phone}</td>
                  <td className={age !== null && age > 30 ? "text-red-700" : ""}>
                    {p.oldestPending ? `${showDate(p.oldestPending)} (${age} days)` : "Old balance"}
                  </td>
                  <td className="r font-semibold">{rs(p.balance)}</td>
                  <td className="r hidden print:table-cell">__________</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="no-print mt-2 text-xs text-stone-500">
          Print this list and give it to the worker going for collection; enter what they bring back above.
        </p>
      </section>
    </>
  );
}
