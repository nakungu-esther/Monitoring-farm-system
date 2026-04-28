# AgriTrack — Pilot Programme Document

**Version:** 1.0  
**Purpose:** Define scope, participants, timeline, and success criteria for a controlled pilot of the AgriTrack digital agriculture platform (web app + API).

---

## 1. Executive summary

This pilot tests whether **smallholder farmers** and **buyers (traders)** can use a single system to list produce, discover supply on a **marketplace**, record **sales and stock**, and align **payments** (mobile money references, optional card via Stripe, and on-chain / Sui where enabled) with **transparent ledgers** and **notifications**. The pilot is time-bound, measured against clear adoption and data-quality metrics, and designed to surface integration and UX issues before wider rollout.

---

## 2. Objectives

| ID | Objective | How we measure it |
|----|-----------|-------------------|
| O1 | Farmers successfully **list and update** harvests/procurement online | % of enrolled farmers with ≥1 active listing; data completeness (price, quantity, location) |
| O2 | Traders **discover and purchase** via marketplace flow | # of marketplace-initiated sales recorded; checkout completion rate |
| O3 | **Sales and stock** stay consistent (no chronic oversell) | Stock reconciliation checks; support tickets for mismatches |
| O4 | **Payment capture** is traceable (MoMo reference, payer phone, optional Stripe) | % of digital-UGX sales with reference and/or verified card path |
| O5 | **Operational reliability** of hosted API and web app | Uptime, error rate, mean time to recover |
| O6 | Collect **qualitative feedback** on usability and trust | Structured interviews + in-app or survey inputs |

---

## 3. Scope

### 3.1 In scope

- Web application (farmer, trader, admin roles as configured).
- Core modules: **My farm / listings**, **Marketplace**, **Sales & purchases**, **Stock**, **Credit/debts** (where enabled), **Profile** (including farmer payout details), **Notifications** (in-app + SMS log + optional browser push).
- **API-backed** sync when `VITE_USE_API` / production API is enabled.
- **Pilot support**: onboarding help desk, training materials, defined escalation path.

### 3.2 Out of scope (for this pilot)

- Full **MTN/Airtel API** deep integration (unless separately contracted); MoMo remains **reference + ledger** unless MNO partnership is in place.
- National-scale marketing; pilot is **limited cohort** only.
- Custom mobile native apps (unless added later).
- Legal/regulatory sign-off beyond pilot partner agreements (document separately).

---

## 4. Stakeholders

| Role | Responsibility |
|------|----------------|
| **Pilot sponsor** | Budget approval, partner selection, go/no-go after pilot |
| **Product / PM** | Scope, prioritisation, success metrics |
| **Implementer / DevOps** | Hosting (e.g. Render), database, env secrets, backups, monitoring |
| **Field coordinator** | Farmer/trader recruitment, training sessions, follow-up |
| **Support lead** | Ticket handling, FAQ, escalation to engineering |
| **Participants** | Farmers, traders, optional admin observer accounts |

---

## 5. Participant profile (suggested)

- **Farmers:** 15–40 (adjust to budget); active sellers; smartphone + data; willingness to list prices and quantity.
- **Traders:** 8–25; regular buyers; ability to complete digital payment steps and record references.
- **Duration:** 8–12 weeks active pilot + 2 weeks wrap-up and report.

*(Numbers are indicative; align with the budget document.)*

---

## 6. Phases and timeline (indicative)

| Phase | Weeks | Activities |
|-------|-------|------------|
| **P0 — Setup** | 1–2 | Environment (API, DB, JWT, email if used), UAT, seed roles, training deck |
| **P1 — Onboarding** | 2–3 | Register users, profile completion (incl. MoMo receive details), first listings |
| **P2 — Live trading** | 4–6 | Marketplace usage, checkout, support window, weekly check-ins |
| **P3 — Stabilise** | 2 | Fix critical bugs, refine copy and flows, optional Stripe/billing hardening |
| **P4 — Close-out** | 2 | Survey, metrics report, decision: scale / pivot / stop |

---

## 7. Success criteria (exit gates)

**Minimum viable success (all should be true unless explicitly waived by sponsor):**

1. **Availability:** API + app meet agreed uptime target (e.g. ≥98% during business hours) excluding planned maintenance.
2. **Adoption:** ≥60% of enrolled farmers maintain at least one listing for ≥4 consecutive weeks during P2.
3. **Transactions:** ≥N marketplace-originated sales recorded (set N with sponsor, e.g. 30–100 depending on cohort).
4. **Data quality:** &lt;5% of support cases related to **broken stock math** after first month of P2.
5. **Satisfaction:** ≥70% of respondents rate the tool “useful” or “very useful” in closing survey.

---

## 8. Risks and mitigations

| Risk | Mitigation |
|------|------------|
| Low digital literacy | Short video + field training; simplified checklists; buddy farmers |
| Connectivity | Offline expectations clear; encourage Wi-Fi points; low-bandwidth UI |
| Trust in payments | Explain ledger vs. cash; show seller receive details; optional platform escrow number if policy allows |
| API / hosting failure | Staging environment; alerts; backup DB; runbook for `DATABASE_URL` and secrets |
| Scope creep | Change control; pilot backlog only |

---

## 9. Data, privacy, and consent

- Participants **consent** to using the system for the pilot and to aggregate reporting (no personal sale details in public reports without anonymisation).
- **Roles** restrict access (e.g. traders see marketplace; farmers see own farm data).
- Retention and export policy: define with sponsor (e.g. 12 months pilot data, then archive).

---

## 10. Deliverables

1. This **Pilot plan** (living document; versioned).
2. **Budget** (companion document).
3. **Training pack** (PDF or slides): registration, listing, checkout, MoMo reference, where to get help.
4. **Weekly status** (short): numbers + blockers.
5. **Final pilot report**: metrics vs. §7, lessons learned, recommendation.

---

## 11. Approval

| Name | Role | Signature / Date |
|------|------|------------------|
| | Pilot sponsor | |
| | Product lead | |
| | Field coordinator | |

---

*This document is a template. Replace bracketed items, participant counts, and thresholds with values agreed with your organisation and funders.*
