# Shop Khatha

A web app that replaces the paper books of a wholesale shop: the daily day book, the party khatha (credit ledger), hand-written bills, collection rounds and the Sunday posting. It works on a phone and on a computer, with screens in English and Telugu.

## What it replaces

| On paper | In the app |
| --- | --- |
| Daily sheet with *amount in* and *amount out* | **Day Book** – filled automatically from bills and collections; only expenses are typed in |
| Hand-written bill in two copies, one signed and kept | **Bills** – prints a customer copy and a shop copy with signature line and payment record |
| Part payments noted on the kept bill | Every bill shows its payments and the amount still pending |
| Workers going out to collect | **Collections** – printable list of who owes how much; each payment records who collected it |
| Posting every party's khatha on Sunday | **Khatha** is always up to date; **Weekly Posting** shows opening, new bills, payments and closing per party |
| Stock counted by eye | **Stock** reduces with each bill, increases with each purchase, and warns when low |

## Features

- **New bill** – choose party and items, then *full amount received*, *credit* or *part payment*. GST (CGST + SGST) is optional.
- **Khatha per party** – statement with running balance, pending bills, and a WhatsApp reminder link.
- **Payments** – adjusted against the old balance first, then the oldest bills, unless a specific bill is chosen. Extra money is kept as an advance and used on the next bill.
- **Day book** – money in, money out, opening and closing cash in hand for any date. Credit sales are listed separately so cash totals stay right.
- **Purchases** – add stock and record what was paid to the supplier.
- **Two languages** – English with Telugu (or Hindi) labels, chosen in Settings.
- **Password** – optional single password for the whole app.

## Run it on your computer

Needs [Node.js](https://nodejs.org) 22 or newer.

```bash
npm install
cp .env.example .env      # on Windows: copy .env.example .env
npx prisma db push        # creates the database file prisma/shop.db
npm run dev               # http://localhost:3000
```

On Windows you can instead double-click **Start Shop App.bat** after `npm install`.

To open it on a phone, connect the phone to the same Wi-Fi and visit `http://<computer-ip>:3000`.

### First-time setup in the app

1. **Settings** – shop name, address, GSTIN, worker names, cash in hand today.
2. **Khatha** – add each party with their old balance from the paper khatha.
3. **Stock** – add items with current quantity, rate and GST %.

## Settings in `.env`

| Name | Meaning |
| --- | --- |
| `DATABASE_URL` | Where the database is. Default is a file, `prisma/shop.db`. |
| `APP_PASSWORD` | If set, the app asks for this password. Leave empty for use at home only. |

**Backup:** all data is in `prisma/shop.db`. Copy that file somewhere safe regularly.

## How it is built

- [Next.js 15](https://nextjs.org) (App Router, server actions) and React 19
- [Prisma 6](https://www.prisma.io) with SQLite
- Tailwind CSS 4

```
prisma/schema.prisma     database tables
src/lib/actions.ts       everything that changes data (bills, payments, stock, purchases)
src/lib/queries.ts       party balances
src/lib/i18n.ts          English / Telugu / Hindi labels
src/lib/money.ts         money and date helpers
src/app/                 one folder per screen
src/components/          bill form, purchase form, payment form, menu
```

Rules worth knowing before changing the code:

- Money is stored in **paise** as whole numbers; dates as UTC midnight of the calendar day.
- A party's balance is always `old balance + bills − payments`. The `Allocation` table only records which bill each payment was adjusted against.
- `settle()` in `actions.ts` re-adjusts a party's unadjusted money, oldest dues first. It runs after every bill, payment or deletion.
- Bill rates are before GST; the bill total is rounded to the nearest rupee.

## Checks on every push

GitHub Actions (`.github/workflows/ci.yml`) installs the packages, creates a database from the schema, type-checks and builds the app.

## Planned

- [ ] Hosting, so the app can be used from anywhere
- [ ] Automatic deployment after a successful check
- [ ] WhatsApp: send bills and weekly balances, let parties say whether they will pay online or in cash
- [ ] Editing a saved bill
- [ ] Supplier khatha (what the shop owes)
