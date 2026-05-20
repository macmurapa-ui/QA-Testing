# HTM QA Automation Coverage

**Last updated:** 20 May 2026
**QA Test Lead:** Mac Murapa
**Test environment:** HTM Clone (`admin-clone.helpthemove.co.uk`) | Agent Dashboard | Partner API

---

## Overall Coverage

| Metric | Value |
|--------|-------|
| Total functional test areas defined | 61 |
| Automated | 9 |
| Pending | 51 |
| In Progress / Blocked | 1 |
| **Coverage** | **~15%** |

---

## Area 1 — Admin Portal (26 areas)

### 1.1 Authentication & Session

| # | Test Area | Status | Script | Notes |
|---|-----------|--------|--------|-------|
| 1.1 | Google OAuth login | 🔲 PENDING | — | Re-auth blocked by Google CAPTCHA in headless; manual token refresh used |
| 1.2 | Session persistence (auth.json reuse) | 🔲 PENDING | — | Implemented as utility inside other scripts; not a standalone test |
| 1.3 | Session expiry + re-auth | 🔲 PENDING | — | Handled ad-hoc; no automated assertion |

### 1.2 Branch Management

| # | Test Area | Status | Script | Notes |
|---|-----------|--------|--------|-------|
| 2.1 | Branch creation (Mac N[DDMMYY]) | ✅ AUTOMATED | `htm_clone_007.js` | Sequential naming, randomised fields, PASS on 18 Mar 2026 |
| 2.2 | Branch search / list view | 🔲 PENDING | — | `/branches?q=` search exercised within 007 but not an isolated test |
| 2.3 | Edit branch details | 🔲 PENDING | — | |
| 2.4 | Branch deactivation / soft delete | 🔲 PENDING | — | `deleted_at` must be asserted |
| 2.5 | Branch impersonation | ✅ AUTOMATED | — | Finds today's last branch and impersonates via `/branches/:id/impersonation` |

### 1.3 User Management

| # | Test Area | Status | Script | Notes |
|---|-----------|--------|--------|-------|
| 3.1 | Existing user check (pre-invite) | ✅ AUTOMATED | — | Dual check: Users page + Branch Invites page |
| 3.2 | Invite user to branch | ✅ AUTOMATED | — | Sends invite to `mac.murapa[N][DDMMYY]@helpthemove.co.uk` |
| 3.3 | Invite revoke | ✅ AUTOMATED | — | Revokes open invite, confirms status changes to Revoked |
| 3.4 | Remove user from branch | 🔲 PENDING | — | |
| 3.5 | User roles and permissions | 🔲 PENDING | — | CanCanCan-backed — needs role matrix test |

### 1.4 Landlord Management

| # | Test Area | Status | Script | Notes |
|---|-----------|--------|--------|-------|
| 4.1 | Landlord creation (Admin) | ✅ AUTOMATED | `htm_clone_007.js` | Random name/email/phone; PASS result: Mrs Arthur Lewis, ID 88360 |
| 4.2 | Edit landlord | 🔲 PENDING | — | |
| 4.3 | View landlord / landlord detail page | 🔲 PENDING | — | `/landlords/:id/properties` confirmed reachable |

### 1.5 Property Management

| # | Test Area | Status | Script | Notes |
|---|-----------|--------|--------|-------|
| 5.1 | Property creation — Vacant | ✅ AUTOMATED | — | Apartment 1, 113 Newton Street, M1 1AE |
| 5.2 | Property creation — Tenanted | ✅ AUTOMATED | — | Apartment 2, same address |
| 5.3 | Edit property | 🔲 PENDING | — | |
| 5.4 | Property status change (vacant → tenanted) | 🔲 PENDING | — | `properties.create_status`: 10=vacant, 20=tenanted |

### 1.6 Submission Management

| # | Test Area | Status | Script | Notes |
|---|-----------|--------|--------|-------|
| 6.1 | View submissions list + search/filter | 🔲 PENDING | — | |
| 6.2 | Move-out submission (landlord submission) | 🔲 PENDING | — | `submission_type = 'landlord'` |
| 6.3 | Move-in submission (tenant submission) | 🔲 PENDING | — | `submission_type = 'tenant'` |
| 6.4 | COT (Change of Tenancy) submission | 🔲 PENDING | — | Combined move-out + move-in |
| 6.5 | Submission cancellation | 🔲 PENDING | — | |
| 6.6 | Late cancellation flow | 🔲 PENDING | — | `late_cancellations` table |

---

## Area 2 — Admin Reporting (7 areas)

| # | Test Area | Status | Script | Notes |
|---|-----------|--------|--------|-------|
| 7.1 | Conversions report | 🔲 PENDING | — | OVO outcome codes (SALI, DONS, FDFD, etc.) |
| 7.2 | OVO batch file mirror (landlord/tenant submissions) | 🔲 PENDING | — | `reporting_production` DB |
| 7.3 | 28DV property report | 🔲 PENDING | — | ~425k records |
| 7.4 | Dropout / CNF report | 🔲 PENDING | — | Cannot Find (~10–20% of moves) |
| 7.5 | CWN (Council Web Notification) status | 🔲 PENDING | — | `council_web_notifications` table |
| 7.6 | Erroneous transfers | 🔲 PENDING | — | `erroneous_transfers` table (soft delete) |
| 7.7 | Payments / commission report | 🔲 PENDING | — | Stored in pence — divide by 100 |

---

## Area 3 — Agent Dashboard (8 areas)

| # | Test Area | Status | Script | Notes |
|---|-----------|--------|--------|-------|
| 8.1 | Dashboard access via impersonation | 🔲 PENDING | — | Two routes: `/users/:id` or `/branches/:id/impersonation` |
| 8.2 | Dashboard navigation | 🔲 PENDING | — | |
| 8.3 | Landlord creation (Dashboard) | ✅ AUTOMATED | — | Via impersonation; end-to-end Dashboard flow |
| 8.4 | Property creation (Dashboard) | 🔲 PENDING | — | |
| 8.5 | Move-out wizard (Dashboard) | 🔲 PENDING | — | Primary revenue flow |
| 8.6 | Move-in wizard (Dashboard) | 🔲 PENDING | — | Triggers Roost journey |
| 8.7 | COT wizard (Dashboard) | 🔲 PENDING | — | |
| 8.8 | Submission list / history view (Dashboard) | 🔲 PENDING | — | |

---

## Area 4 — Partner API (18 endpoints)

Docs: `https://api.helpthemove.co.uk/docs/partner` | Auth: Bearer token per clone environment

### 4.1 Branches

| # | Endpoint | Status | Notes |
|---|----------|--------|-------|
| 9.1 | `POST /partner/branches` — Create branch | 🔲 PENDING | |
| 9.2 | `GET /partner/branches` — List / search branches | 🔲 PENDING | Query by `their_id` |
| 9.3 | `GET /partner/branches/{id}` — Get branch | 🔲 PENDING | |

### 4.2 Landlords

| # | Endpoint | Status | Notes |
|---|----------|--------|-------|
| 9.4 | `POST /partner/branches/{branch_id}/landlords` — Add landlord | 🔲 PENDING | |
| 9.5 | `GET /partner/landlords/{id}` — Get landlord | 🔲 PENDING | |
| 9.6 | `GET /partner/landlords` — Search landlords | 🔲 PENDING | Query by `their_id` |
| 9.7 | `PATCH /partner/landlords/{id}` — Update landlord | 🔲 PENDING | |

### 4.3 Properties

| # | Endpoint | Status | Notes |
|---|----------|--------|-------|
| 9.8 | `POST /partner/landlords/{landlord_id}/properties` — Add property | 🔲 PENDING | |
| 9.9 | `GET /partner/properties/{id}` — Get property | 🔲 PENDING | |
| 9.10 | `GET /partner/properties` — Search properties | 🔲 PENDING | Query by `their_id` |
| 9.11 | `PATCH /partner/properties/{id}` — Update property / billing address | 🔲 PENDING | |
| 9.12 | `GET /partner/properties/{id}/moves` — List moves for property | 🔲 PENDING | |

### 4.4 Moves

| # | Endpoint | Status | Notes |
|---|----------|--------|-------|
| 9.13 | `POST /partner/properties/{id}/move_outs` — Create move-out | 🔲 PENDING | `submission_type = 'landlord'`; void starts |
| 9.14 | `POST /partner/properties/{id}/move_ins` — Create move-in | 🔲 PENDING | `submission_type = 'tenant'`; void ends |
| 9.15 | `GET /partner/moves/{id}` — Get move | 🔲 PENDING | |
| 9.16 | `DELETE /partner/moves/{id}` — Cancel move | 🔲 PENDING | |
| 9.17 | `PATCH /partner/moves/{id}/meter_reads` — Update meter readings | 🔲 PENDING | |
| 9.18 | `GET /partner/branches/{id}/meter_reads_required` — List moves needing reads | 🔲 PENDING | |

---

## Area 5 — Billing Preferences (2 areas)

| # | Test Area | Status | Script | Notes |
|---|-----------|--------|--------|-------|
| 10.1 | Billing preference — Branch level | 🔲 PENDING | — | |
| 10.2 | Billing preference — V2 scenarios (61) | ⏳ BLOCKED | — | V2 development not yet complete; 61 scenarios defined, 32 FALSE eliminated in V2 |

---

## Priority Recommendations — Next Test Sprints

### Sprint 1 — Complete the Core Create Flow (High ROI)
These areas extend the existing `htm_clone_007.js` patterns and are well-understood:

1. **Move-out submission** (6.2) — highest business value; directly triggers OVO switch revenue
2. **Move-in submission** (6.3) — closes the void period loop
3. **View submissions list** (6.1) — foundational for all reporting tests

### Sprint 2 — Dashboard Automation via Impersonation
4. **Dashboard access via impersonation** (8.1) — prerequisite for all Dashboard tests
5. **Move-out wizard Dashboard** (8.5) — agent-led submission; primary revenue driver
6. **Move-in wizard Dashboard** (8.6) — void closure

### Sprint 3 — Reporting + Data Integrity
7. **Conversions report** (7.1) — validate OVO outcome codes (SALI, DONS, FDFD)
8. **CWN status** (7.5) — council notification compliance
9. **Erroneous transfer check** (7.6) — regulatory red line

### Sprint 4 — Partner API Coverage
10. **`POST` branch / landlord / property / move** (9.1, 9.4, 9.8, 9.13, 9.14) — core create flow via API mirrors UI tests
11. **`GET` / `PATCH` / `DELETE`** (9.2, 9.3, 9.5–9.7, 9.9–9.12, 9.15–9.18) — full 18-endpoint sweep; keys held per clone

### Sprint 5 — Billing Preferences
12. **Billing preference V2** (10.2) — when V2 development ships; 61 scenario matrix ready

---

## Notes

- **Auth**: Google CAPTCHA prevents fully headless OAuth. Current workaround: user provides fresh session token from browser DevTools; Claude writes it to `auth.json`.
- **Lambda caching**: DB query endpoint caches in-memory. Tautology workaround (`AND {TS} = {TS}`) partially effective. Graeme (CTO) owns the Lambda — prompt raised.
- **Branch naming**: All test branches follow `Mac N[DDMMYY]` (e.g. `Mac 1200526`). `nextBranchName()` in `htm_clone_007.js` handles sequential counting.
- **Soft deletes**: 10 tables use `acts_as_paranoid` — always assert `deleted_at IS NULL` in DB queries.
- **Money**: All commission values stored in pence. Divide by 100 for GBP display.
