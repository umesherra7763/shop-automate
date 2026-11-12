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
- **Password** – a single password for the whole app (required once hosted).

## Hosting

The app runs on [Vercel](https://vercel.com) with a [Neon](https://neon.tech) Postgres database, both in or near Mumbai (`vercel.json` pins the app to `bom1`).

- Every push to `main` deploys automatically. During the deploy, `npm run vercel-build` applies any new database migrations before building.
- Every pull request gets its own preview link.
- Neon keeps a restore history, so data can be brought back to an earlier point in time (how far back depends on the Neon plan).

### One-time setup

1. **Vercel**: sign in with GitHub, then *Add New → Project → Import* `shop-automate`. Don't deploy yet.
2. **Database**: in the Vercel project, open *Storage → Create Database → Neon*. Choose a Mumbai (`ap-south-1`) or Singapore region and connect it to the project. This adds `DATABASE_URL` and `DATABASE_URL_UNPOOLED` automatically.
3. **Password**: in *Settings → Environment Variables*, add `APP_PASSWORD`. The hosted app refuses to open without it.
4. **Deploy**: open *Deployments* and redeploy (or push any commit).

## Run it on your computer

Needs [Node.js](https://nodejs.org) 22 or newer and a Postgres database. Use a separate Neon *branch* for this, so testing never touches the shop's real data.

```bash
npm install
cp .env.example .env      # on Windows: copy .env.example .env, then fill in the Neon URLs
npm run db:migrate        # creates the tables
npm run dev               # http://localhost:3000
```

### Changing the database tables

Edit `prisma/schema.prisma`, then run `npm run db:new-migration` against your test branch. Commit the new folder under `prisma/migrations/`. The next deploy applies it to the real database. CI fails if the schema and migrations don't match.

### First-time setup in the app

1. **Settings** – shop name, address, GSTIN, worker names, cash in hand today.
2. **Khatha** – add each party with their old balance from the paper khatha.
3. **Stock** – add items with current quantity, rate and GST %.

## Settings in `.env`

| Name | Meaning |
| --- | --- |
| `DATABASE_URL` | Neon *pooled* connection (host contains `-pooler`). Used by the app. |
| `DATABASE_URL_UNPOOLED` | Neon *direct* connection. Used only for migrations. |
| `APP_PASSWORD` | Password to open the app. Required on Vercel; optional on a local computer. |

## How it is built

- [Next.js 15](https://nextjs.org) (App Router, server actions) and React 19
- [Prisma 6](https://www.prisma.io) with Postgres ([Neon](https://neon.tech))
- Tailwind CSS 4, hosted on Vercel

```
prisma/schema.prisma     database tables
prisma/migrations/       database changes, applied in order on deploy
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

GitHub Actions (`.github/workflows/ci.yml`) starts a throwaway Postgres, applies the migrations, checks they match the schema, type-checks and builds the app. Vercel deploys separately on each push.

## Planned

- [x] Hosting on Vercel + Neon, with automatic deploys
- [ ] WhatsApp: send bills and weekly balances, let parties say whether they will pay online or in cash
- [ ] Editing a saved bill
- [ ] Supplier khatha (what the shop owes)
