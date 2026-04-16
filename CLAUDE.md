# QA-Testing — Claude Context
Last updated: 30 Mar 2026

---

## 1. QA Repo Overview
This repo contains Playwright-based QA test scripts for the **Help the Move (HTM)** platform and its clones. Tests run against clone environments (not production).

### Clones & Environments
| Clone | Domain | Auth File |
|-------|--------|-----------|
| HTM Clone | `https://admin-clone.helpthemove.co.uk` | `auth.json` |
| Canopy Clone | `https://admin-canopy.helpthemove.co.uk` | `canopy_auth.json` |
| Vouch Clone | TBD | — |

### Authentication
- Sessions stored as cookies in `auth.json` (HTM) and `canopy_auth.json` (Canopy)
- If session expires, scripts re-authenticate via Google OAuth
- To force manual login: `MANUAL_LOGIN=1 node <script>.js`
- Login email: `mac.murapa@helpthemove.co.uk`

### HTM Clone — Branch (App Entity) Naming Convention
Branches in the HTM **application** (not git branches) follow:
```
Mac N[DDMMYY]
```
- `N` = sequential count of branches created today (auto-incremented)
- Example: 1st branch on 19 Mar 2026 → `Mac 1190326`
- Scripts count existing `Mac N[DDMMYY]` entries on `/branches` to determine next `N`

### Default Branch Form Values (HTM)
| Field | Value |
|-------|-------|
| Business Type | Letting Agent |
| Phone | 07561834920 |
| Address Line 1 | 123 Test Street |
| Town | Manchester |
| Post Code | M13 9GS |
| County | Lancashire |

### Folder Structure
```
QA-Testing/
├── CLAUDE.md                        # This file
├── auth.json                        # HTM Clone session cookies
├── canopy_auth.json                 # Canopy Clone session cookies
├── HTM Clone Testing/
│   └── HTM Clone Testing/
│       └── Test Runs/
│           ├── 160326 Test Runs/
│           └── 180326 Test Runs/
│               └── Test Run 007/    # Landlord Creation (PASS)
├── Canopy Clone Testing/
└── Vouch Clone Testing/
```

### Git Branch Convention (this repo)
```
claude/playwright-<clone>-<task>-<id>
```
Example: `claude/playwright-htm-clone-screenshot-TGWXg`
- Never push to `main` or `master` directly
- Always push with: `git push -u origin <branch-name>`

### HTM Clone — Invite Naming Convention
Invite emails follow the same counter logic as branch names:
```
mac.murapa[N][DDMMYY]@helpthemove.co.uk
```
- `N` = sequential count of invites created today (auto-incremented)
- Example: 1st invite on 30 Mar 2026 → `mac.murapa1300326@helpthemove.co.uk`
- Before creating an invite, always run an **Existing User Check** (see below)

### Existing User Check
Before sending an invite, verify the intended email does not already exist in **either** of two places:

**Check 1 — Users page:**
1. Top nav → **Users** → **All**
2. Enter the intended email in the search box
3. If a result is returned → email already exists as a user; increment N and re-check

**Check 2 — Branch Invites page:**
1. Navigate to `/branches/:id/invites`
2. Search for the intended email
3. If the email appears (any status — open, used, or revoked) → increment N and re-check

Only if **both** checks return no results is it safe to proceed with that email.

**Why both checks are needed:** A revoked invite does not create a user record, so the Users page alone will show the email as available even though it already appears on the branch Invites page. Using the same email again would create a duplicate invite entry.

### Invite Flow (HTM Clone)
1. Run **Existing User Check** to confirm email is available
2. Navigate directly to: `/branches/:id/invites`
   - Note: clicking "Other" in the branch tab bar then "Invites" also works, but
     scripting must use the direct URL to avoid the top-level nav "Other" intercepting
3. Click **New invite** → navigates to `/branches/:id/invites/new`
4. Enter the confirmed email address
5. Branch is auto-selected in "Selected Branches" — verify it appears before submitting
6. Click **Send Invite** (button id: `confirm_send_invite_btn`) — use JS click as button may be below fold
7. Success: redirected to invites list showing the email with status **open**, Send Count **1**

### Invite Revoke Flow (HTM Clone)
Revoke is available for any invite with status **open** on the branch Invites page.

1. Navigate to `/branches/:id/invites`
2. Locate the invite row with status **open**
3. Click the **Revoke** button on that row (link with `data-method="delete"`)
4. A browser `confirm()` dialog appears:
   `"Are you sure you want to revoke the invite to <email>?"`
5. Accept the dialog to confirm
6. Success: invite status changes from **open** → **revoked**
   - Row remains visible on the **All** tab with status **revoked**

**Status tabs on Invites page:** All / Open / Used / Revoked

**Scripting notes:**
- Revoke button selector: `a[data-method="delete"]` within the matching table row
- Handle confirmation with `page.on('dialog', async d => await d.accept())` — register this BEFORE clicking
- Success check: page text contains `revoked`

### Test Runs Log
| Run | Date | Clone | Task | Result |
|-----|------|-------|------|--------|
| 007 | 18 Mar 2026 | HTM | Landlord Creation (Mac 8180326 / Mrs Arthur Lewis) | PASS |
| 008 | 30 Mar 2026 | HTM | Branch Creation (Mac 1300326 / ID 2481) | PASS |
| 009 | 30 Mar 2026 | HTM | Landlord Creation (Dr Noah Walker / ID 89869 on Branch 2481) | PASS |
| 010 | 30 Mar 2026 | HTM | Existing User Check + Invite Creation (mac.murapa1300326@helpthemove.co.uk on Branch 2481) | PASS |
| 011 | 30 Mar 2026 | HTM | Existing User Check + Invite Creation (mac.murapa1300326@helpthemove.co.uk on Branch 2481) | PASS |
| 012 | 30 Mar 2026 | HTM | Invite Revoke (mac.murapa1300326@helpthemove.co.uk on Branch 2481) | PASS |
| 013 | 30 Mar 2026 | HTM | Existing User Check + Invite Creation (mac.murapa1300326@helpthemove.co.uk on Branch 2481) | PASS |
| 014 | 30 Mar 2026 | HTM | Dual Check (Users + Invites) + Invite Creation (mac.murapa2300326@helpthemove.co.uk on Branch 2481) | PASS |
| 015 | 16 Apr 2026 | HTM | Branch Creation (Mac 1160426 / ID 2494) | PASS |

### Key Scripts
| Script | Purpose |
|--------|---------|
| `htm_clone_007.js` | Creates a branch + landlord on HTM Clone |
| `htm_clone_007_inspect.js` | Inspects/verifies the created branch |
| `htm_clone_008.js` | Creates a branch only (30 Mar 2026) |
| `htm_clone_009.js` | Creates a landlord on an existing branch |
| `htm_clone_010.js` | Existing User Check + invite creation on a branch |
| `htm_clone_011.js` | Existing User Check + invite creation (pre-revoke) |
| `htm_clone_012.js` | Invite Revoke — revokes an open invite on a branch |
| `htm_clone_013.js` | Existing User Check + invite creation on a branch |
| `htm_clone_014.js` | Dual check (Users + Invites pages) + invite creation — correct approach |
| `htm_clone_015.js` | Creates a branch only (16 Apr 2026) |

---

## 2. What is Helpthemove (HTM)?

HTM is a UK **change-of-tenancy and change-of-occupancy orchestration platform**. 50+ employees. Processes ~10,000–20,000 moves/month.

**HTM is a Data Processor, never a Data Controller.** Agents are Data Controllers.

HTM coordinates:
- Energy supplier notifications and introductions (primary revenue driver — OVO only currently)
- Council tax notifications
- Water supplier change-of-bill-payer notices
- Void period energy switching (landlord responsibility)

**Revenue model:** OVO pays HTM per fuel (electricity/gas) switched. Two types:
- **COS (Change of Supply / "sales")** — higher rate, agent/introducer payouts apply
- **COT (Change of Tenancy / "retention")** — lower rate, no agent payouts

**Three-year vision:** Become the operating system for UK home moves.

---

## 3. Core Actors

| Actor | Role | System Table |
|-------|------|-------------|
| Agent (letting agent, HA, council, BTR) | Data Controller; instructs HTM | `branches` |
| Landlord | Responsible for utilities during void | `landlords` |
| Tenant | Occupier; always retains freedom of supplier choice | `tenants` |
| OVO | Energy switching partner (only current partner) | `energy_suppliers` |
| HTM | Data Processor; acts on agent instruction only | — |

---

## 4. Key Business Concepts

### Void Period
Gap between Tenant Out and Tenant In. HTM switches energy to OVO on landlord's behalf during this period.
- PRS average void: ~23 days
- Social housing average: ~53 days

### No Switch Move
Move processed **after** Tenant In date has passed — zero revenue. Affects ~10–25% of moves. Primary cause: late agent submission.
- `submissions.no_switch = true`

### CNF (Cannot Find)
Address cannot be matched to MPAN/MPRN. Affects ~10–20% of moves. Manual queue resolution required.
- Loqate UPRN match rate: ~70%

### Erroneous Transfer (ET)
Energy switch without valid consent. Regulatory, financial, reputational risk.
- `erroneous_transfers` table

### Submission Types
- `submission_type = 'landlord'` → Tenant Out (void starts)
- `submission_type = 'tenant'` → Tenant In (void ends, Roost journey triggers)

### Creator Types (submissions.creator_type)
- `10` = agent (Dashboard)
- `20` = api (PMS integration)
- `30` = support (HTM staff)

---

## 5. Platform Instances (7 Production)

| Instance | Database | Admin URL |
|----------|----------|-----------|
| HTM (core) | `help_the_move_production` | `admin.helpthemove.co.uk` |
| HomeLet | `homelet_production` | `admin-homelet.helpthemove.co.uk` |
| Rent Shield | `rentshield_production` | — |
| Let Alliance | `letalliance_production` | `admin-letalliance.helpthemove.co.uk` |
| Vouch | `vouch_production` | — |
| Canopy | `canopy_production` | `admin-canopy.helpthemove.co.uk` |
| OVO | `ovo_production` | — |

Plus: `reporting_production` (24 tables — OVO Go Live, 28DV, Dropout, Meter Read Failures, batch file mirrors), 11 clone instances, 1 staging.

---

## 6. Technical Stack

| Component | Detail |
|-----------|--------|
| Framework | Ruby on Rails 6.x, Ruby 3.1.4 |
| Database | MySQL 8.0, utf8mb4, UTC |
| Hosting | AWS EC2 + Dokku (target: ECS Fargate) |
| Background Jobs | Sidekiq + Redis + Clockwork |
| Auth | CanCanCan (role-based) |
| Feature Flags | Flipper gem |
| Soft Deletes | acts_as_paranoid (10 tables) |
| Address Matching | Loqate (GBG) — ~70% UPRN match |
| Enrichment Service | DataHive (Scala/Play on ECS Fargate) |
| Certifications | ISO27001, Cyber Essentials |

### Always filter soft-deleted tables:
```sql
WHERE deleted_at IS NULL
```
Tables: `affiliates`, `branch_segments`, `branches`, `councils`, `energy_suppliers`, `erroneous_transfers`, `landlords`, `payments`, `properties`, `user_branch_relationships`, `water_suppliers`

### Key Enum Values
```
submissions.submission_type     → 'landlord' or 'tenant' (STRING, not integer)
submissions.creator_type        → 10=agent, 20=api, 30=support
properties.create_status        → 10=vacant, 20=tenanted
branches.business_type          → 0=housing_associations, 1=letting_agent, 2=residential_developer, 3=landlord, 4=build_to_rent, 5=estate_agent
conversions.outcome             → 0=pending, 1=converted, 2=failed
energy_suppliers_*.supplier_type → 0=gas, 1=electricity
erroneous_transfers.reason      → 0=tenant_in_property … 9=other
```

### Money columns (stored in pence — divide by 100 for GBP):
`payments.cents`, `payments.vat_cents`, `rep_commission_payments.cents`

---

## 7. Key Database Tables

| Table | Purpose |
|-------|---------|
| `submissions` | Core move record (656k+ rows in production) |
| `properties` | Rental units (soft delete) |
| `branches` | Agent entities (soft delete) |
| `landlords` | Property owners (soft delete) |
| `tenants` | Tenants per submission (1:many) |
| `conversions` | Energy switch outcomes |
| `conversion_rules` | OVO outcome codes (SALI, DONS, CAOB, etc.) |
| `move_intos` / `move_outs` | Wizard step records (UUID string IDs) |
| `cots` | Combined move-in/move-out records |
| `council_web_notifications` | CWN status tracking |
| `erroneous_transfers` | ET records (soft delete) |
| `late_cancellations` | Late cancel investigations |
| `payments` | Agent commission payments (soft delete) |
| `organisations` | Parent companies of branches |
| `affiliates` | Introducer partners (Barbon, Canopy, etc.) |

### Reporting DB (reporting_production)
| Table | Purpose |
|-------|---------|
| `ovo_ssd_go_live_*` | OVO supply start confirmation (~121k records) |
| `ovo_28dv_*` | 28-day void properties (~425k records) |
| `ovo_dropout_*` | Failed OVO submissions (~65k records) |
| `ovo_meter_read_failures_*` | Rejected meter readings (~57k records) |
| `ovo_landlord_submissions_*` | Batch file mirror — move-outs |
| `ovo_tenant_submissions_*` | Batch file mirror — move-ins |

Join reporting to core: `sub_id` / `external_partner_id` = `submissions.uuid`

---

## 8. OVO Conversion Outcome Codes (Key Examples)

| Code | Outcome | Meaning |
|------|---------|---------|
| SALI | Converted | Supply live with OVO |
| SAED | Converted | Ended — was live, now left |
| SAPL | Converted | Pending loss (still paid) |
| SARC | Converted | Registration confirmed |
| CAOB | Pending | Objected (may still resolve) |
| DONF | Pending | Cannot find supply (may resolve) |
| FDFD | Pending | Future dated |
| RGPR | Pending | Pending registration |
| CACA | Failed | Cancelled contract |
| DONS | Failed | No switch (backdated move) |
| DOTA | Failed | Tenant already in |
| CAET | Failed | Erroneous transfer raised |
| CAOF | Failed | Objection failed — no resolution |
| DOFF | Failed | Cannot find — permanently failed |

---

## 9. Introducer Partners

| Partner | DB Instance | Notes |
|---------|-------------|-------|
| Barbon (HomeLet + Let Alliance) | `homelet_production`, `letalliance_production` | HTM pays Barbon per fuel; Barbon pays agent |
| Canopy | `canopy_production` | MIN_PAYOUT_AMOUNT = £0 |
| Vouch | `vouch_production` | — |
| Propoly | No dedicated instance | — |
| Lettings Hub | No dedicated instance | — |

---

## 10. Key People

| Name | Role | Key Responsibilities |
|------|------|---------------------|
| Stephen Henesy | CEO/Founder | Document owner, strategic decisions |
| Rachel Braddick | MD | Co-decision on supplier partnerships |
| Graeme Parker | CTO | Tech architecture, schema, API |
| Tom Burney | Head of Product | Product roadmap, feature decisions |
| Jenna Cooper | Head of Ops & HR / DPO | Day-to-day ops, complaints |
| Julie McMullan | CRO | Revenue, agent quality, commercial |
| Jonathan Steele | FD | Invoicing, reconciliation, finance |
| Dan French | Head of Account Management | Agent relationships, churn |
| Stephen Cunningham | Head of Marketing | Competitor analysis, brand |
| Jade Yafai | Operations Manager | Day-to-day ops management |
| Judith Mackie | Senior Data Analyst | OVO file processing, reporting |
| Derek Beswick | Head of Metering | MPAN/MPRN, DataHive |

---

## 11. Regulatory Red Lines (Never Violate)

1. **Never imply tenant does not have choice of supplier**
2. **Never claim authority HTM does not have** — act only on agent instruction
3. **Never switch energy without valid authority**
4. **Never ignore objections** — halt immediately if any party objects
5. **Never misrepresent commercial relationships** — OVO is a commercial partner, not impartial

---

## 12. Strategic Priorities (as of Feb 2026)

1. De-risk OVO dependency — add more supplier partners
2. Reduce No Switch Moves — direct revenue impact
3. Improve CNF / address matching rates
4. Grow Roost into revenue-generating platform
5. Launch homebuyer solution (Connells Countrywide engaged)
6. Fix instance migration pain
7. Build Dashboard edit capability
8. Surface conversion status per property in Dashboard
9. Migrate Core Portal EC2 → ECS
10. Implement AI database connection (MCP server)

---

## 13. AI Knowledge Base Documents

| Document | What it covers |
|----------|---------------|
| Canonical Context (v10.4) | Business model, ops, commercial, strategy, competitive |
| Data Dictionary (v5.1) | 179 business terms with system field mappings |
| Schema Reference | 67 core tables + 24 reporting tables, enums, indexes |
| Contribution Guide (v1.0) | How to update the knowledge base |
| Onboarding Guide (v1.0) | How to use Claude at HTM |

To update the knowledge base: email `itsupport@helpthemove.co.uk` subject `AI Knowledge Gap`, or Slack Stephen.

---

## 14. Competitive Context (Q1 2026)

HTM's primary competitive advantage: **agent-led void switching = 100% conversion, no tenant opt-in required**.

Key threats:
- **One Utility Bill**: £17.50+VAT commission (higher headline than HTM) but requires tenant opt-in
- **The Lettings Hub**: Acquired Canopy, now 2,500+ agents, £45/property BOX platform
- **Homebox**: B2C £10/month tenant charge, 1.8/5 Google reviews (reputation risk)

HTM differentiators:
- Guaranteed commission on EVERY void switch
- Landlord Energy Credits up to £55 (2.75x JMI's £10/fuel)
- OVO's "largest introducer" — exclusive fast-track support
- Free software, no setup costs
- ISO27001 + Cyber Essentials certified
- 11+ years, 3,000+ agents
