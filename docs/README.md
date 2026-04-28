# AgriTrack frontend documentation

## Repository layout

| Path | Role |
|------|------|
| `src/App.jsx` | Routes, `RequireAuth`, `RequireRole`, redirects. |
| `src/main.jsx` | React, router, providers, global CSS + SweetAlert2 CSS. |
| `src/config.js` | `API_BASE`, `API_ENABLED` from env. |
| `src/config/navConfig.jsx` | Sidebar items per role (`farmerNav`, `traderNav`, `adminNav`). |
| `src/context/AgriTrackContext.jsx` | App state, API sync, CRUD helpers, notifications. |
| `src/context/ToastContext.jsx` | SweetAlert2 toast stack. |
| `src/api/client.js` | Axios instance (base URL / proxy). |
| `src/api/auth.js` | Login, register, `me`, profile, forgot/reset password calls. |
| `src/api/agritrackApi.js` | Procurements, sales, farms, expenses, seasonal plans, supply chain, notification reads, SMS log. |
| `../fram-trackerBE` (separate folder) | Nest API — run `prisma migrate` and the server from that repo; do not nest the backend inside `fram-trackerFE`. |
| `src/utils/passwordResetStorage.js` | Offline reset tokens (localStorage). |
| `src/utils/popupAlerts.js` | `popupError`, `popupSuccess`, `popupConfirm` wrappers. |
| `src/components/AppShell.jsx` | Sidebar + top bar + outlet; page titles. |
| `src/pages/*.jsx` | Screen-level UI. |

## API surface (frontend expectations)

Base path: **`/api`** (proxied to backend in dev when `VITE_API_URL` is empty).

### Auth

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `PATCH /api/auth/me`
- `POST /api/auth/forgot-password` (optional)
- `POST /api/auth/reset-password` (optional)

JWT is stored under `localStorage` (see `src/api/authKeys.js`) and sent as `Authorization: Bearer …`.

### Farms (registered plots)

- `GET /api/farms` — list farms the user can see (typically scoped by JWT).
- `POST /api/farms` — body: `{ name, address?, latitude?, longitude?, userId? }` (numeric lat/lng or `null`; server may ignore `userId` and use the authenticated user).

If this route is missing (**404**), the app keeps existing behaviour: farms stay local-only and refresh does not overwrite them.

### Procurements (harvests)

- `GET /api/procurements`
- `POST /api/procurements` — optional body field **`farmId`** (UUID string) when the harvest is linked to a server-backed farm.
- `PATCH /api/procurements/:id` (used when editing/deleting API-backed rows) — optional **`farmId`** (UUID or `null` to clear).
- `DELETE /api/procurements/:id`

### Sales

- `GET /api/sales`
- `POST /api/sales` (body includes `userId` of the **farmer** who owns the sale; traders use this for marketplace checkout.)
- `PATCH /api/sales/:id` (e.g. credit payments: `amountPaid`, `paymentStatus`)

If the backend returns **403** for trader-initiated `POST /api/sales`, the UI explains that the farmer must record the sale instead.

### Expenses

- `GET /api/expenses`
- `POST /api/expenses` — body: `{ label, amount, date }` (ISO date)

### Seasonal plans

- `GET /api/seasonal-plans`
- `POST /api/seasonal-plans` — body: `{ crop, plantDate, expectedHarvestDate, farmId?, notes? }` (`farmId` = server farm UUID when linked)

### Supply chain events

- `GET /api/supply-chain-events`
- `POST /api/supply-chain-events` — body: `{ saleId, stage, note? }` (`saleId` matches client sale id, e.g. `api-12`)

### Notification read state

In-app notifications are still **computed** in the UI from stock/sales; only **dismissed / read keys** are stored in the DB:

- `GET /api/notification-reads` — response `{ keys: string[] }`
- `POST /api/notification-reads` — body `{ key }` (same string as the notification id in the UI)

### SMS preview log

- `GET /api/sms-logs`
- `POST /api/sms-logs` — body `{ to, body, kind }` (saved under the authenticated user; farmers sync when they are the logged-in party)

### Health (optional)

- `GET /api/health` — used by `checkHealth()` in `agritrackApi.js` if you call it.

### Backend database

After pulling changes, from `fram-trackerBE/`:

```bash
npm install
npx prisma migrate dev --name agritrack_full_sync
# or for a throwaway DB: npm run db:push
npm run start:dev
```

Point the frontend at this API (`VITE_USE_API=true` and correct port / proxy).

## Role routes (summary)

| Area | Farmer | Trader | Admin |
|------|--------|--------|-------|
| `/farm`, `/stock`, `/sales`, … | Yes | — | Partial (e.g. `/farms`) |
| `/marketplace`, `/purchases`, `/orders`, `/payments` | — | Yes | Partial |
| `/admin`, `/reports`, `/settings`, `/transactions` | — | — | Yes |

Exact guards are in `App.jsx` (`RequireRole`).

## Trader marketplace purchase

`recordTraderPurchase` in context creates a sale with:

- `userId` = farmer from the harvest listing  
- `buyer` = current user’s profile **name** (must match what you use everywhere as “buyer”).  

## Static assets

- `public/logo.png` — brand logo (favicon, `Auth.jsx`, `Sidebar.jsx`).
- `public/auth-hero.png` — optional hero on the auth split layout (`Auth.jsx`).
