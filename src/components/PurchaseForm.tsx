"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createPurchase } from "@/lib/actions";

type Line = { itemId: number; qty: string; rate: string };
const blank = (): Line => ({ itemId: 0, qty: "", rate: "" });
const n = (v: string) => parseFloat(v) || 0;

export default function PurchaseForm({
  items,
  today,
  modes,
}: {
  items: { id: number; name: string; unit: string }[];
  today: string;
  modes: readonly string[];
}) {
  const router = useRouter();
  const [date, setDate] = useState(today);
  const [supplier, setSupplier] = useState("");
  const [invoiceNo, setInvoiceNo] = useState("");
  const [lines, setLines] = useState<Line[]>([blank()]);
  const [paid, setPaid] = useState("");
  const [mode, setMode] = useState("CASH");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const set = (i: number, patch: Partial<Line>) => setLines((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  const total = Math.round(lines.reduce((a, l) => a + n(l.qty) * n(l.rate), 0) * 100) / 100;

  async function submit() {
    setError("");
    setBusy(true);
    const res = await createPurchase({ date, supplier, invoiceNo, paid, mode, lines });
    setBusy(false);
    if ("error" in res) return setError(res.error);
    setLines([blank()]);
    setSupplier("");
    setInvoiceNo("");
    setPaid("");
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div>
          <label className="label">Date</label>
          <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div>
          <label className="label">Supplier</label>
          <input className="input" value={supplier} onChange={(e) => setSupplier(e.target.value)} />
        </div>
        <div>
          <label className="label">Supplier bill no.</label>
          <input className="input" value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} />
        </div>
      </div>

      {lines.map((l, i) => (
        <div key={i} className="grid grid-cols-12 items-end gap-2">
          <div className="col-span-12 md:col-span-6">
            <label className="label">Item</label>
            <select className="input" value={l.itemId} onChange={(e) => set(i, { itemId: Number(e.target.value) })}>
              <option value={0}>Choose…</option>
              {items.map((it) => (
                <option key={it.id} value={it.id}>
                  {it.name} ({it.unit})
                </option>
              ))}
            </select>
          </div>
          <div className="col-span-5 md:col-span-2">
            <label className="label">Qty</label>
            <input className="input" type="number" inputMode="decimal" min="0" step="any" value={l.qty} onChange={(e) => set(i, { qty: e.target.value })} />
          </div>
          <div className="col-span-5 md:col-span-3">
            <label className="label">Cost per unit (₹)</label>
            <input className="input" type="number" inputMode="decimal" min="0" step="any" value={l.rate} onChange={(e) => set(i, { rate: e.target.value })} />
          </div>
          <div className="col-span-2 text-right md:col-span-1">
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
      ))}
      <button type="button" className="btn-2" onClick={() => setLines((ls) => [...ls, blank()])}>
        + Add item
      </button>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div>
          <label className="label">Total</label>
          <div className="py-2 text-lg font-bold tabular-nums">₹{total.toLocaleString("en-IN")}</div>
        </div>
        <div>
          <label className="label">Paid now (₹) — goes to day book</label>
          <div className="flex gap-1">
            <input className="input" type="number" inputMode="decimal" min="0" step="any" value={paid} onChange={(e) => setPaid(e.target.value)} />
            <button type="button" className="btn-2" onClick={() => setPaid(String(total))}>
              Full
            </button>
          </div>
        </div>
        <div>
          <label className="label">Mode</label>
          <select className="input" value={mode} onChange={(e) => setMode(e.target.value)}>
            {modes.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        </div>
      </div>
      {error && <p className="rounded-lg bg-red-50 p-2 text-sm text-red-700">{error}</p>}
      <button type="button" className="btn" disabled={busy} onClick={submit}>
        {busy ? "Saving…" : "Save purchase"}
      </button>
    </div>
  );
}
