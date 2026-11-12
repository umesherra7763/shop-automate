import { db } from "./db";

export type PartyBalance = {
  id: number;
  name: string;
  nameLocal: string | null;
  phone: string | null;
  balance: number;
  oldestPending: Date | null;
};

// Balance owed by every party = opening balance + all bills - all payments.
export async function partyBalances(): Promise<PartyBalance[]> {
  const [parties, bills, pays, pendingBills] = await Promise.all([
    db.party.findMany({ orderBy: { name: "asc" } }),
    db.bill.groupBy({ by: ["partyId"], _sum: { total: true }, where: { partyId: { not: null } } }),
    db.payment.groupBy({ by: ["partyId"], _sum: { amount: true }, where: { partyId: { not: null } } }),
    db.bill.findMany({
      where: { partyId: { not: null } },
      select: { partyId: true, date: true, total: true, allocations: { select: { amount: true } } },
      orderBy: { date: "asc" },
    }),
  ]);
  const billed = new Map(bills.map((b) => [b.partyId, b._sum.total ?? 0]));
  const paid = new Map(pays.map((p) => [p.partyId, p._sum.amount ?? 0]));
  const oldest = new Map<number, Date>();
  for (const b of pendingBills) {
    const left = b.total - b.allocations.reduce((a, x) => a + x.amount, 0);
    if (left > 0 && b.partyId && !oldest.has(b.partyId)) oldest.set(b.partyId, b.date);
  }
  return parties.map((p) => ({
    id: p.id,
    name: p.name,
    nameLocal: p.nameLocal,
    phone: p.phone,
    balance: p.openingBalance + (billed.get(p.id) ?? 0) - (paid.get(p.id) ?? 0),
    oldestPending: oldest.get(p.id) ?? null,
  }));
}

export const paidOn = (b: { allocations: { amount: number }[] }): number =>
  b.allocations.reduce((a, x) => a + x.amount, 0);
