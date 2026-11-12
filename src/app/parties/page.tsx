import Link from "next/link";
import PartyFields from "@/components/PartyFields";
import { saveParty } from "@/lib/actions";
import { getT } from "@/lib/i18n";
import { rs } from "@/lib/money";
import { partyBalances } from "@/lib/queries";

export default async function Parties({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const t = await getT();
  const all = await partyBalances();
  const needle = q.trim().toLowerCase();
  const list = needle
    ? all.filter((p) => (p.name + " " + (p.nameLocal ?? "") + " " + (p.phone ?? "")).toLowerCase().includes(needle))
    : all;

  return (
    <>
      <h1 className="h1">{t("khatha")}</h1>

      <details className="card no-print" open={all.length === 0}>
        <summary className="cursor-pointer text-sm font-semibold text-emerald-800">+ Add new party</summary>
        <form action={saveParty} className="mt-3">
          <PartyFields t={t} />
        </form>
      </details>

      <form className="no-print">
        <input name="q" defaultValue={q} placeholder="Search name or phone…" className="input" />
      </form>

      <section className="card">
        {list.length === 0 && <p className="text-sm text-stone-500">No parties found.</p>}
        <table className="tbl">
          <tbody>
            {list.map((p) => (
              <tr key={p.id}>
                <td>
                  <Link href={`/parties/${p.id}`} className="font-medium text-emerald-800">
                    {p.name}
                  </Link>
                  {p.nameLocal && <span className="ml-2 text-stone-500">{p.nameLocal}</span>}
                  {p.phone && <div className="text-xs text-stone-500">{p.phone}</div>}
                </td>
                <td className={`r font-semibold ${p.balance > 0 ? "text-amber-700" : "text-stone-400"}`}>
                  {rs(p.balance)}
                </td>
              </tr>
            ))}
            <tr className="font-bold">
              <td>{t("outstanding")}</td>
              <td className="r">{rs(list.reduce((a, p) => a + p.balance, 0))}</td>
            </tr>
          </tbody>
        </table>
      </section>
    </>
  );
}
