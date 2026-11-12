"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createBill } from "@/lib/actions";

type Item = { id: number; name: string; unit: string; hsn: string | null; gstRate: number; salePrice: number; stock: number };
type Line = { itemId: number | null; name: string; hsn: string; unit: string; qty: string; rate: string; gstRate: string };
type Labels = Record<"party" | "date" | "item" | "qty" | "rate" | "amount" | "total" | "received" | "save" | "cashSale", string>;

const blank = (): Line => ({ itemId: null, name: "", hsn: "", unit: "pcs", qty: "", rate: "", gstRate: "0" });
const n = (v: string) => parseFloat(v) || 0;
const money = (v: number) => "₹" + v.toLocaleString("en-IN", { maximumFractionDigits: 2 });

export default function BillForm({
  parties,
  items,
  today,
  gst,
  defaultParty,
  modes,
  labels: L,
}: {
  parties: { id: number; name: string }[];
  items: Item[];
  today: string;
  gst: boolean;
  defaultParty: number | null;
  modes: readonly string[];
  labels: Labels;
}) {
  const router = useRouter();
  const [date, setDate] = useState(today);
  const [partyId, setPartyId] = useState<number | null>(defaultParty);
  const [customerName, setCustomerName] = useState("");
  const [lines, setLines] = useState<Line[]>([blank()]);
  const [payType, setPayType] = useState<"FULL" | "CREDIT" | "PART">(defaultParty ? "CREDIT" : "FULL");
  const [part, setPart] = useState("");
  const [mode, setMode] = useState("CASH");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const set = (i: number, patch: Partial<Line>) => setLines((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)));

  const pickName = (i: number, name: string) => {
    const it = items.find((x) => x.name.toLowerCase() === name.trim().toLowerCase());
    if (it)
      set(i, {
        itemId: it.id,
        name: it.name,
        hsn: it.hsn ?? "",
        unit: it.unit,
        rate: String(it.salePrice / 100),
        gstRate: String(it.gstRate),
      });
    else set(i, { itemId: null, name });
  };

  const taxable = lines.reduce((a, l) => a + n(l.qty) * n(l.rate), 0);
  const tax = gst ? lines.reduce((a, l) => a + (n(l.qty) * n(l.rate) * n(l.gstRate)) / 100, 0) : 0;
  const total = Math.round(taxable + tax);
  const received = payType === "FULL" ? total : payType === "CREDIT" ? 0 : n(part);

  async function submit() {
    setError("");
    setBusy(true);
    const res = await createBill({ date, partyId, customerName, note, mode, received: String(received), lines });
    if ("error" in res) {
      setError(res.error);
      setBusy(false);
    } else router.push(`/bills/${res.id}`);
  }

  return (
    <div className="space-y-4">
      <section className="card grid grid-cols-2 gap-3 md:grid-cols-3">
        <div>
          <label className="label">{L.date}</label>
          <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div>
          <label className="label">{L.party}</label>
          <select
            className="input"
            value={partyId ?? ""}
            onChange={(e) => {
              const v = Number(e.target.value) || null;
              setPartyId(v);
              setPayType(v ? "CREDIT" : "FULL");
            }}
          >
            <option value="">— {L.cashSale} (no khatha) —</option>
            {parties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        {!partyId && (
          <div className="col-span-2 md:col-span-1">
            <label className="label">Customer name (optional)</label>
            <input className="input" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
          </div>
        )}
      </section>

      <section className="card space-y-3">
        <datalist id="items">
          {items.map((i) => (
            <option key={i.id} value={i.name}>
              {`Stock ${i.stock} ${i.unit}`}
            </option>
          ))}
        </datalist>
        {lines.map((l, i) => {
          const it = l.itemId ? items.find((x) => x.id === l.itemId) : null;
          const short = it && n(l.qty) > it.stock;
          return (
            <div key={i} className="grid grid-cols-12 items-end gap-2 border-b border-stone-100 pb-3">
              <div className="col-span-12 md:col-span-5">
                <label className="label">
                  {i + 1}. {L.item}
                  {it && (
                    <span className={short ? "ml-2 text-red-700" : "ml-2 text-stone-400"}>
                      stock {it.stock} {it.unit}
                    </span>
                  )}
                </label>
                <input
                  className="input"
                  list="items"
                  value={l.name}
                  placeholder="Type item name…"
                  onChange={(e) => pickName(i, e.target.value)}
                />
              </div>
              <div className="col-span-3 md:col-span-2">
                <label className="label">
                  {L.qty} ({l.unit})
                </label>
                <input
                  className="input"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="any"
                  value={l.qty}
                  onChange={(e) => set(i, { qty: e.target.value })}
                />
              </div>
              <div className="col-span-3 md:col-span-2">
                <label className="label">{L.rate} (₹)</label>
                <input
                  className="input"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="any"
                  value={l.rate}
                  onChange={(e) => set(i, { rate: e.target.value })}
                />
              </div>
              {gst && (
                <div className="col-span-2 md:col-span-1">
                  <label className="label">GST %</label>
                  <input
                    className="input px-2"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="any"
                    value={l.gstRate}
                    onChange={(e) => set(i, { gstRate: e.target.value })}
                  />
                </div>
              )}
              <div className={`${gst ? "col-span-3" : "col-span-5"} text-right md:col-span-1`}>
                <div className="py-2 text-sm font-semibold tabular-nums">{money(n(l.qty) * n(l.rate))}</div>
              </div>
              <div className="col-span-1 text-right">
                <button
                  type="button"
                  aria-label="Remove item"
                  className="cursor-pointer py-2 text-lg text-red-700"
                  onClick={() => setLines((ls) => (ls.length > 1 ? ls.filter((_, j) => j !== i) : [blank()]))}
                >
                  ×
                </button>
              </div>
            </div>
          );
        })}
        <button type="button" className="btn-2" onClick={() => setLines((ls) => [...ls, blank()])}>
          + Add item
        </button>
      </section>

      <section className="card space-y-3">
        <div className="ml-auto max-w-xs space-y-1 text-sm">
          {gst && (
            <>
              <div className="flex justify-between">
                <span>Taxable value</span>
                <span className="tabular-nums">{money(taxable)}</span>
              </div>
              <div className="flex justify-between">
                <span>GST</span>
                <span className="tabular-nums">{money(tax)}</span>
              </div>
            </>
          )}
          <div className="flex justify-between text-xl font-bold">
            <span>{L.total}</span>
            <span className="tabular-nums">{money(total)}</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {(
            [
              ["FULL", "Full amount received"],
              ["CREDIT", "Credit (khatha)"],
              ["PART", "Part payment"],
            ] as const
          ).map(([k, text]) => (
            <button
              key={k}
              type="button"
              onClick={() => setPayType(k)}
              className={`cursor-pointer rounded-lg border px-2 py-3 text-sm font-semibold ${
                payType === k ? "border-emerald-700 bg-emerald-700 text-white" : "border-stone-300 bg-white text-stone-700"
              }`}
            >
              {text}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {payType === "PART" && (
            <div>
              <label className="label">{L.received} (₹)</label>
              <input className="input" type="number" inputMode="decimal" min="0" value={part} onChange={(e) => setPart(e.target.value)} />
            </div>
          )}
          {payType !== "CREDIT" && (
            <div>
              <label className="label">Mode</label>
              <select className="input" value={mode} onChange={(e) => setMode(e.target.value)}>
                {modes.map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </select>
            </div>
          )}
          <div className="col-span-2">
            <label className="label">Note</label>
            <input className="input" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
        </div>

        {payType !== "FULL" && (
          <p className="text-sm text-amber-700">
            Goes to khatha: <b>{money(Math.max(total - received, 0))}</b>
          </p>
        )}
        {error && <p className="rounded-lg bg-red-50 p-2 text-sm text-red-700">{error}</p>}
        <button type="button" className="btn w-full py-3 text-base" disabled={busy} onClick={submit}>
          {busy ? "Saving…" : `${L.save} bill`}
        </button>
      </section>
    </div>
  );
}
