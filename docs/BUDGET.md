# AgriTrack — Pilot Budget (Template)

**Version:** 1.0  
**Currency:** USD *(change to UGX or dual-column if required)*  
**Pilot duration (assumed):** 12 weeks + 2 weeks close-out  
**Notes:** Figures are **illustrative** — replace with local quotes, salaries, and tax rules.

---

## 1. Budget summary

| Category | Low estimate | Mid estimate | High estimate |
|----------|-------------:|-------------:|-------------:|
| People & field operations | | | |
| Technology & hosting | | | |
| Training & materials | | | |
| Communications & participant incentives | | | |
| Contingency (e.g. 10–15%) | | | |
| **Total** | | | |

---

## 2. Assumptions

- **Cohort:** ~20–30 farmers and ~10–15 traders *(adjust)*.
- **Hosting:** 1× Web Service (API) + managed PostgreSQL (e.g. Render + Neon/Render Postgres) for pilot period.
- **No** large custom development budget in pilot — only **bugfixes and small UX** from existing codebase.
- Exchange rate locked for planning: **1 USD = ___ UGX** (fill in).

---

## 3. Line items (detail)

### 3.1 People & field operations

| Item | Unit | Qty | Unit cost | Subtotal | Notes |
|------|------|-----|-----------|----------|--------|
| Field coordinator / community liaison | months | | | | Recruitment, visits, churn control |
| Part-time trainer / agronomist (optional) | days | | | | Listing quality, pricing guidance |
| Support / helpline (phone hours) | hours/week | | | | During P2 peak |
| Pilot manager (fractional PM) | % FTE × months | | | | Coordination, reporting |

**Subtotal people:** ______

---

### 3.2 Technology & hosting *(recurring pilot period)*

| Item | Period | Low | Mid | High | Notes |
|------|--------|-----|-----|------|--------|
| API hosting (e.g. Render Web Service) | 3 months | | | | Instance tier, build minutes |
| Database (PostgreSQL) | 3 months | | | | Connections, storage, backups |
| Domain & SSL | 1 year (prorate) | | | | Optional custom domain |
| Email delivery (SMTP / SendGrid tier) | 3 months | | | | Password reset, alerts |
| Stripe (card payments) — **fees** are % of GMV | — | | | | Budget only **if** pilots pay via card |
| Monitoring / logging (optional) | 3 months | | | | UptimeRobot, Logtail, etc. |
| **One-off:** Secrets audit, penetration-lite review (optional) | once | | | | |

**Subtotal tech:** ______

*(Typical magnitude for small pilot: **\$50–\$300/month** hosting+DB combined, depending on region and SLA — replace with vendor quotes.)*

---

### 3.3 Training & materials

| Item | Qty | Unit cost | Subtotal | Notes |
|------|-----|-----------|----------|--------|
| Training venue / data projector | sessions | | | |
| Printed quick-start guides | copies | | | |
| Internet bundles for participants | people | | | If subsidised |
| Video recording / editing (optional) | package | | | |

**Subtotal training:** ______

---

### 3.4 Communications & incentives

| Item | Qty | Unit cost | Subtotal | Notes |
|------|-----|-----------|----------|--------|
| SMS bundle (OTP / notifications if billed) | messages | | | If not included in hosting |
| Small incentives (data, vouchers) — **ethics/policy compliant** | participants | | | Only if aligned with donor rules |
| Travel — field visits | trips | | | |

**Subtotal comms:** ______

---

### 3.5 Contingency

| Description | % of subtotal | Amount |
|-------------|---------------|--------|
| Risk buffer (scope creep, extra support hours) | 10–15% | |

---

## 4. Revenue / offsets *(if applicable)*

| Source | Amount | Notes |
|--------|--------|--------|
| Grant or sponsor contribution | | |
| Platform fee on trades (if charged in pilot) | | %
| Farmer/trader nominal subscription (future) | | Not usually in pilot |

**Net pilot cost:** Total from §3 minus offsets.

---

## 5. Cash flow (simple)

| Month | Planned spend | Cumulative |
|-------|-----------------|------------|
| M1 | | |
| M2 | | |
| M3 | | |
| Close-out | | |

---

## 6. Governance

- **Approval:** Sponsor signs off total cap and contingency use.
- **Changes:** Budget owner approves moves &gt;10% between major categories.
- **Audit:** Keep invoices for grant compliance; reconcile monthly.

---

## 7. Appendix — environment variables affecting cost

Production API typically requires at minimum:

- `DATABASE_URL` — Postgres (managed tier sized to pilot load).
- `JWT_SECRET` — no direct cost.
- SMTP — may be free tier or paid.
- `STRIPE_SECRET_KEY` — no fixed fee; **transaction fees** on successful card payments.
- `FRONTEND_URL` — for redirects (email, Stripe return URLs).

---

*Prepared for the AgriTrack family of deployments; edit numbers and duration to match your pilot programme.*
