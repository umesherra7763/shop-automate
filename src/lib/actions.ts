"use server";

import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "./db";
import { MODES, num, toDate, toPaise, validDate } from "./money";

type Tx = Prisma.TransactionClient;

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const opt = (fd: FormData, k: string) => str(fd, k) || null;
const mode = (v: unknown) => (MODES as readonly string[]).includes(String(v)) ? String(v) : "CASH";
const refresh = () => revalidatePath("/", "layout");

/**
 * Adjusts a party's payments against their bills, oldest first.
 * The old (opening) balance is cleared first, then bills in date order.
 * Safe to run any number of times; only unadjusted money is touched.
 */
async function settle(tx: Tx, partyId: number) {
  const party = await tx.party.findUnique({ where: { id: partyId } });
  if (!party) return;
  const pays = await tx.payment.findMany({
    where: { partyId },
    include: { allocations: true },
    orderBy: [{ date: "asc" }, { id: "asc" }],
  });
  const bills = await tx.bill.findMany({
    where: { partyId },
    include: { allocations: true },
    orderBy: [{ date: "asc" }, { number: "asc" }],
  });
  let opening = Math.max(0, party.openingBalance);
  const pend = bills
    .map((b) => ({ id: b.id, left: b.total - b.allocations.reduce((a, x) => a + x.amount, 0) }))
    .filter((b) => b.left > 0);
  for (const p of pays) {
    let free = p.amount - p.allocations.reduce((a, x) => a + x.amount, 0);
    const o = Math.min(free, opening);
    opening -= o;
    free -= o;
    for (const b of pend) {
      if (free <= 0) break;
      const a = Math.min(free, b.left);
      if (a <= 0) continue;
      await tx.allocation.create({ data: { paymentId: p.id, billId: b.id, amount: a } });
      b.left -= a;
      free -= a;
    }
  }
}

// ---------- Settings & workers ----------

export async function saveSettings(fd: FormData) {
  const keys = ["shopName", "shopAddress", "shopPhone", "shopGstin", "lang", "openingCash", "gst"];
  for (const key of keys) {
    const value = key === "gst" ? (fd.get("gst") ? "on" : "off") : str(fd, key);
    await db.setting.upsert({ where: { key }, create: { key, value }, update: { value } });
  }
  refresh();
}

export async function addWorker(fd: FormData) {
  const name = str(fd, "name");
  if (name) await db.worker.create({ data: { name } });
  refresh();
}

export async function toggleWorker(id: number) {
  const w = await db.worker.findUnique({ where: { id } });
  if (w) await db.worker.update({ where: { id }, data: { active: !w.active } });
  refresh();
}

// ---------- Parties ----------

export async function saveParty(fd: FormData) {
  const id = num(fd.get("id"));
  const name = str(fd, "name");
  if (!name) return;
  const data = {
    name,
    nameLocal: opt(fd, "nameLocal"),
    phone: opt(fd, "phone"),
    address: opt(fd, "address"),
    gstin: opt(fd, "gstin"),
    openingBalance: toPaise(fd.get("openingBalance")),
  };
  if (id) {
    await db.$transaction(async (tx) => {
      await tx.party.update({ where: { id }, data });
      await settle(tx, id);
    });
    refresh();
  } else {
    const p = await db.party.create({ data });
    refresh();
    redirect(`/parties/${p.id}`);
  }
}

// ---------- Items & stock ----------

export async function saveItem(fd: FormData) {
  const id = num(fd.get("id"));
  const name = str(fd, "name");
  if (!name) return;
  const stock = num(fd.get("stock"));
  const data = {
    name,
    unit: str(fd, "unit") || "pcs",
    hsn: opt(fd, "hsn"),
    gstRate: num(fd.get("gstRate")),
    salePrice: toPaise(fd.get("salePrice")),
    lowStockAt: num(fd.get("lowStockAt")),
  };
  const today = toDate(validDate(null));
  await db.$transaction(async (tx) => {
    if (id) {
      const old = await tx.item.findUnique({ where: { id } });
      if (!old) return;
      await tx.item.update({ where: { id }, data: { ...data, stock } });
      if (stock !== old.stock)
        await tx.stockMovement.create({
          data: { itemId: id, date: today, qty: stock - old.stock, kind: "ADJUST" },
        });
    } else {
      const it = await tx.item.create({ data: { ...data, stock } });
      if (stock)
        await tx.stockMovement.create({
          data: { itemId: it.id, date: today, qty: stock, kind: "OPENING" },
        });
    }
  });
  refresh();
}

// ---------- Bills ----------

export type BillInput = {
  date: string;
  partyId: number | null;
  customerName: string;
  note: string;
  received: string;
  mode: string;
  lines: { itemId: number | null; name: string; hsn: string; unit: string; qty: string; rate: string; gstRate: string }[];
};

export async function createBill(input: BillInput): Promise<{ error: string } | { id: number }> {
  const gstOn = (await db.setting.findUnique({ where: { key: "gst" } }))?.value !== "off";
  const lines = input.lines
    .map((l) => {
      const qty = num(l.qty);
      const rate = toPaise(l.rate);
      const gstRate = gstOn ? num(l.gstRate) : 0;
      const taxable = Math.round(qty * rate);
      return {
        itemId: l.itemId || null,
        name: l.name.trim(),
        hsn: l.hsn?.trim() || null,
        unit: l.unit?.trim() || "pcs",
        qty,
        rate,
        gstRate,
        taxable,
        tax: Math.round((taxable * gstRate) / 100),
      };
    })
    .filter((l) => l.name && l.qty > 0);
  if (!lines.length) return { error: "Add at least one item with quantity." };

  const taxable = lines.reduce((a, l) => a + l.taxable, 0);
  const tax = lines.reduce((a, l) => a + l.tax, 0);
  const total = Math.round((taxable + tax) / 100) * 100; // round to the nearest rupee
  const roundOff = total - taxable - tax;
  const received = Math.min(Math.max(toPaise(input.received), 0), total);
  const partyId = input.partyId || null;
  if (!partyId && received < total)
    return { error: "For a credit or part-paid bill, choose the party so it goes into their khatha." };

  const date = toDate(validDate(input.date));
  const id = await db.$transaction(async (tx) => {
    const last = await tx.bill.aggregate({ _max: { number: true } });
    const bill = await tx.bill.create({
      data: {
        number: (last._max.number ?? 0) + 1,
        date,
        partyId,
        customerName: partyId ? null : input.customerName.trim() || null,
        taxable,
        tax,
        roundOff,
        total,
        note: input.note.trim() || null,
        lines: { create: lines },
      },
    });
    for (const l of lines) {
      if (!l.itemId) continue;
      await tx.item.update({ where: { id: l.itemId }, data: { stock: { decrement: l.qty } } });
      await tx.stockMovement.create({
        data: { itemId: l.itemId, date, qty: -l.qty, kind: "SALE", ref: `bill:${bill.id}` },
      });
    }
    if (received > 0)
      await tx.payment.create({
        data: {
          date,
          partyId,
          amount: received,
          mode: mode(input.mode),
          withBill: true,
          allocations: { create: { billId: bill.id, amount: received } },
        },
      });
    if (partyId) await settle(tx, partyId); // uses up any advance the party already paid
    return bill.id;
  });
  refresh();
  return { id };
}

export async function deleteBill(id: number) {
  await db.$transaction(async (tx) => {
    const bill = await tx.bill.findUnique({ where: { id }, include: { lines: true } });
    if (!bill) return;
    for (const l of bill.lines)
      if (l.itemId)
        await tx.item.update({ where: { id: l.itemId }, data: { stock: { increment: l.qty } } });
    await tx.stockMovement.deleteMany({ where: { ref: `bill:${id}` } });
    // Money taken at the counter for this bill goes away with it; later collections stay in the khatha.
    await tx.payment.deleteMany({ where: { withBill: true, allocations: { some: { billId: id } } } });
    await tx.bill.delete({ where: { id } });
    if (bill.partyId) await settle(tx, bill.partyId);
  });
  refresh();
  redirect("/bills");
}

// ---------- Payments / collections ----------

export async function recordPayment(fd: FormData) {
  const partyId = num(fd.get("partyId"));
  const amount = toPaise(fd.get("amount"));
  if (!partyId || amount <= 0) return;
  const billId = num(fd.get("billId"));
  await db.$transaction(async (tx) => {
    const pay = await tx.payment.create({
      data: {
        date: toDate(validDate(fd.get("date"))),
        partyId,
        amount,
        mode: mode(fd.get("mode")),
        workerId: num(fd.get("workerId")) || null,
        note: opt(fd, "note"),
      },
    });
    if (billId) {
      // Paid against one particular bill; anything extra is adjusted oldest-first below.
      const bill = await tx.bill.findFirst({ where: { id: billId, partyId }, include: { allocations: true } });
      if (bill) {
        const left = bill.total - bill.allocations.reduce((a, x) => a + x.amount, 0);
        const a = Math.min(left, amount);
        if (a > 0) await tx.allocation.create({ data: { paymentId: pay.id, billId, amount: a } });
      }
    }
    await settle(tx, partyId);
  });
  refresh();
}

export async function deletePayment(id: number) {
  await db.$transaction(async (tx) => {
    const p = await tx.payment.findUnique({ where: { id } });
    if (!p) return;
    await tx.payment.delete({ where: { id } });
    if (p.partyId) await settle(tx, p.partyId);
  });
  refresh();
}

// ---------- Other money in / out ----------

export async function addCashEntry(fd: FormData) {
  const amount = toPaise(fd.get("amount"));
  const description = str(fd, "description");
  if (amount <= 0 || !description) return;
  await db.cashEntry.create({
    data: {
      date: toDate(validDate(fd.get("date"))),
      direction: fd.get("direction") === "IN" ? "IN" : "OUT",
      category: str(fd, "category") || "Other",
      description,
      amount,
      mode: mode(fd.get("mode")),
    },
  });
  refresh();
}

export async function deleteCashEntry(id: number) {
  await db.cashEntry.deleteMany({ where: { id, purchaseId: null } });
  refresh();
}

// ---------- Purchases (stock coming in) ----------

export type PurchaseInput = {
  date: string;
  supplier: string;
  invoiceNo: string;
  paid: string;
  mode: string;
  lines: { itemId: number; qty: string; rate: string }[];
};

export async function createPurchase(input: PurchaseInput): Promise<{ error: string } | { ok: true }> {
  const lines = input.lines
    .map((l) => ({ itemId: Number(l.itemId), qty: num(l.qty), rate: toPaise(l.rate) }))
    .filter((l) => l.itemId && l.qty > 0);
  if (!lines.length) return { error: "Add at least one item with quantity." };
  const supplier = input.supplier.trim() || "Supplier";
  const total = lines.reduce((a, l) => a + Math.round(l.qty * l.rate), 0);
  const paid = Math.max(toPaise(input.paid), 0);
  const date = toDate(validDate(input.date));
  await db.$transaction(async (tx) => {
    const p = await tx.purchase.create({
      data: { date, supplier, invoiceNo: input.invoiceNo.trim() || null, total, paid, lines: { create: lines } },
    });
    for (const l of lines) {
      await tx.item.update({ where: { id: l.itemId }, data: { stock: { increment: l.qty } } });
      await tx.stockMovement.create({
        data: { itemId: l.itemId, date, qty: l.qty, kind: "PURCHASE", ref: `purchase:${p.id}` },
      });
    }
    if (paid > 0)
      await tx.cashEntry.create({
        data: {
          date,
          direction: "OUT",
          category: "Purchase",
          description: `Purchase from ${supplier}`,
          amount: paid,
          mode: mode(input.mode),
          purchaseId: p.id,
        },
      });
  });
  refresh();
  return { ok: true };
}

export async function deletePurchase(id: number) {
  await db.$transaction(async (tx) => {
    const p = await tx.purchase.findUnique({ where: { id }, include: { lines: true } });
    if (!p) return;
    for (const l of p.lines)
      await tx.item.update({ where: { id: l.itemId }, data: { stock: { decrement: l.qty } } });
    await tx.stockMovement.deleteMany({ where: { ref: `purchase:${id}` } });
    await tx.purchase.delete({ where: { id } });
  });
  refresh();
}

// ---------- Login ----------

export async function login(fd: FormData) {
  const pw = process.env.APP_PASSWORD;
  if (pw && str(fd, "password") === pw) {
    const token = createHash("sha256").update("shop:" + pw).digest("hex");
    (await cookies()).set("shop_auth", token, { httpOnly: true, sameSite: "lax", maxAge: 60 * 60 * 24 * 90 });
    redirect("/");
  }
  redirect("/login?wrong=1");
}
