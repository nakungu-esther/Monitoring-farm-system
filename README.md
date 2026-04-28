# AgriTrack (fram-trackerFE)

Frontend for **AgriTrack / Agri-finance**: harvests, stock, sales, credit, marketplace, wallet (mock SUI), and role-based dashboards for **farmers**, **traders**, and **admins**.

Built with **React 19**, **Vite 7**, **Tailwind CSS v4**, **React Router 7**, and **SweetAlert2** toasts.

## Requirements

- **Node.js** 18+ (LTS recommended)
- **npm** 9+

Optional: **[fram-trackerBE](https://github.com/nakungu-esther/fram-trackerBE)** — run the **NestJS + Prisma** API from your **`fram-trackerBE` project folder** (sibling to this repo, or your own clone), not inside `fram-trackerFE`. It should expose farms, procurements, sales (including trader marketplace checkout, `PATCH` sales, Sui confirm), and related modules as used by `src/api/agritrackApi.js`.

## Quick start

```bash
npm install
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`).

### Environment

Copy `.env.example` to `.env` and adjust:

| Variable | Purpose |
|----------|---------|
| `VITE_USE_API` | Set to `true` to call the backend for auth, farms, procurements, and sales. |
| `VITE_API_URL` | Optional full origin (e.g. `https://your-api.onrender.com`). If empty in dev, Vite proxies `/api` to `http://localhost:4000` (see `vite.config.js`). |

Example **local dev** with API on port 4000:

```env
VITE_USE_API=true
# VITE_API_URL=
```

Example **production build** hitting a hosted API:

```env
VITE_USE_API=true
VITE_API_URL=https://your-api.example.com
```

`DATABASE_URL` belongs on the **backend**, not in this frontend.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server with HMR. |
| `npm run build` | Production build to `dist/`. |
| `npm run preview` | Serve `dist/` locally. |
| `npm run lint` | Run ESLint. |

## Features (high level)

- **Auth**: Login, register (register does not auto-login), forgot / reset password (local tokens + API hooks when backend supports them).
- **Farmer**: Dashboard, My Farm (CRUD harvests), Stock (derived), Sales (filters), Wallet, Credit / debts, farms map, seasonal plans, supply chain steps.
- **Trader**: Dashboard, Marketplace (**Buy** records a sale on the farmer’s account when API allows), Orders, Purchases, Payments, Wallet, Credit.
- **Admin**: Users (role select offline), Farms, Sales, wallet transactions, reports, settings.
- **Data**: With `VITE_USE_API=true`, data is loaded and saved via the Nest API (including **farms** when `GET`/`POST /api/farms` exist); offline mode uses seeded state + `localStorage`.

## Deployment (e.g. Render / static host)

1. Set build command: `npm install && npm run build`.
2. Publish directory: `dist`.
3. Set `VITE_API_URL` (and `VITE_USE_API=true`) in the host’s environment so the built app can reach your API.
4. Ensure the API allows your frontend **origin** in CORS.

## Related repo

- **Backend**: separate **`fram-trackerBE`** repository/folder — must expose the `/api` routes expected by `src/api/agritrackApi.js` (see `docs/README.md` and `docs/nestjs-farms.example.ts`).

## Branding

- **`public/logo.png`** — App logo (browser tab icon, login/register screen, sidebar). Replace this file to update branding.
- **`public/auth-hero.png`** — Optional extra hero image on the auth layout.

## License

Private project unless otherwise stated by the repository owner.
