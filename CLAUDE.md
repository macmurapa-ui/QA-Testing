# QA-Testing — Claude Context
Last updated: 19 Mar 2026

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

### Test Runs Log
| Run | Date | Clone | Task | Result |
|-----|------|-------|------|--------|
| 007 | 18 Mar 2026 | HTM | Landlord Creation (Mac 8180326 / Mrs Arthur Lewis) | PASS |

### Key Scripts
| Script | Purpose |
|--------|---------|
| `htm_clone_007.js` | Creates a branch + landlord on HTM Clone |
| `htm_clone_007_inspect.js` | Inspects/verifies the created branch |

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

---

## 15. Database Access (Lambda)

Direct SQL access to all clone databases via AWS Lambda:

**Endpoint:** `https://sn3uqixbqtsh5cbqjrjxxr4n740exasn.lambda-url.eu-west-2.on.aws/`
**API Key:** `htm_clone_hO32TaCqnR3q1IrGUcRMrpCuBQbQEX6uEMD53axKb`

```bash
curl -X POST https://sn3uqixbqtsh5cbqjrjxxr4n740exasn.lambda-url.eu-west-2.on.aws/ \
  -H "X-API-Key: htm_clone_hO32TaCqnR3q1IrGUcRMrpCuBQbQEX6uEMD53axKb" \
  -H "Content-Type: application/json" \
  -d '{"sql": "YOUR SQL HERE"}'
```

### Available Schemas
| Schema | Description |
|--------|-------------|
| `help_the_move_clone` | HTM Clone (Clone 1) |
| `help_the_move_clone2` | Clone 2 |
| `help_the_move_clone3` | Clone 3 |
| `help_the_move_clone4` | Clone 4 |
| `help_the_move_clone5` | Clone 5 |
| `help_the_move_clone6` | Clone 6 |
| `homelet_clone` | HomeLet Clone |
| `canopy_clone` | Canopy Clone |
| `vouch_clone` | Vouch Clone |
| `letalliance_clone` | Let Alliance Clone |
| `rentshield_clone` | Rent Shield Clone |
| `reporting_clone` | Reporting Clone |

> Always filter soft-deleted records: `WHERE deleted_at IS NULL`

---

## 16. Helpthemove Partner API

Base URL: `https://api.helpthemove.co.uk/partner/`
Auth: Bearer token — `Authorization: Bearer API_TOKEN`
Environments: staging, clone, production (separate tokens per env)

### API Keys (Clone Environments)
| Environment | Base URL | API Key |
|-------------|----------|---------|
| Homelet-Clone | `https://api-homelet-clone.helpthemove.co.uk` | `mO4b6QLfY9zryWt6w3O6aCmIiGyhxKPS` |
| Clone 1 | `https://api-clone.helpthemove.co.uk` | `6frd3GwSoJ7KuCWR3MCvN3NpCX17hpzQ` |
| Clone 2 | `https://api-clone2.helpthemove.co.uk` | `FtlmkeTrh3RangyCBZ1MMfnYchMOEwCs` |
| Clone 3 | `https://api-clone3.helpthemove.co.uk` | `XL0xalQyEe6yTXvpKWNGdtNYKyOUeUFG` |
| Clone 4 | `https://api-clone4.helpthemove.co.uk` | `dHK5j5JLVvrOm1o1RXwvhpTk7LJLVdov` |
| Clone 5 | `https://api-clone5.helpthemove.co.uk` | `06aFIhD8CGejEJQ4ocSEnbfd2cbqyLsW` |
| Let Alliance Clone | `https://api-letalliance-clone.helpthemove.co.uk` | `1mNqkzLUvJLDvUOP08MrwvZTUo2S8cwa` |

### 16.1 What is a Move?
- **Move-Out**: tenancy ends, property becomes empty (`submission_type = 'landlord'`)
- **Move-In**: new tenancy commences (`submission_type = 'tenant'`). Requires a prior Move-Out OR property `create_status = 'vacant'`

### 16.2 Data Hierarchy
```
Organisation → Branch(es) → Landlord(s) → Property(ies) → Moves
```

### 16.3 Searching
All entities (Branches, Landlords, Properties, Moves) have HTM IDs. You can also search by your own `their_id`.

---

### 16.4 Branch Endpoints

#### Create Branch — `POST /partner/branches`
Required fields: `name`, `phone_number`, `business_type`, `data_processing_method`, `address_attributes` (address_1, town, county, post_code required; address_2 optional)

Key optional fields: `their_id`, `commission_rate`, `vat_number`, `approx_move_outs_per_month`, `management_system`, `business_support_level`, `number_of_managed_properties`

`business_type` enum: `housing_associations`, `letting_agent`, `residential_developer`, `landlord`, `build_to_rent`, `estate_agent`

`management_system` enum: `no_software`, `10_ninety`, `agent_pro`, `alto`, `aquaint`, `arthur`, `cfp`, `dezrez`, `domus`, `estatesit`, `expert_agent`, `gnomen`, `jupix`, `let_mc`, `microsoft_dynamics_365`, `nbs`, `northgate`, `propco`, `qube_global`, `reapit`, `rentman`, `rentman_software_ltd`, `rentpro_ltd`, `sme_professional`, `teclet`, `thesaurus`, `universal`, `vault`, `vebra`, `veco`, `vtuk_gemini`, `webdadi`, `yardi`, `other`

```bash
curl -X POST 'https://api.helpthemove.co.uk/partner/branches' \
  -H 'Authorization: Bearer API_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{"branch": {"name": "Branch name", "phone_number": "07777777777", "their_id": "uuid", "business_type": "housing_associations", "data_processing_method": "self_managed", "address_attributes": {"address_1": "...", "town": "...", "county": "...", "post_code": "..."}}}'
```

Response includes `id`, `name`, `address`, and links for `landlord_search`, `add_landlord`, `property_search`.

#### Get Branch — `GET /partner/branches/{id}`
#### Search Branches — `GET /partner/branches?query=Name` or `?their_id=uuid`
#### List All Branches — `GET /partner/branches`

---

### 16.5 Landlord Endpoints

#### Get Landlord — `GET /partner/landlords/{id}`
#### Search Landlords — `GET /partner/landlords?their_id=uuid`

A landlord can be registered with more than one branch.

#### Add Landlord — `POST /partner/branches/{branch_id}/landlords`
Required: `first_name`, `last_name` (if `landlord_type = 'individual'`), `email`, `landlord_type` (`individual` or `company`), `email_type` (`variation_of_terms` or `explicit_opt_in`)

Validations:
- `their_id` must be unique per branch
- Combination of email + first + last name must be unique per branch
- `title` must be one of: `Mr`, `Mrs`, `Miss`, `Ms`, `Dr`, `Professor`, `Mx`, `Sir`, `Dame`, `Lord`, `Lady`, `Reverend`, `Other`

`billing_address_type` options:
- `agent_branch_address` — uses branch address (default)
- `landlord_personal_address` — requires `address_attributes`
- `alternative_branch_address` — requires `alternative_landlord_address_attributes` (includes `legal_entity`)

#### Update Landlord — `PATCH /partner/landlords/{id}`
Cannot update to nil: `email`, `first_name`, `last_name`, `landlord_type`, `email_type`

---

### 16.6 Property Endpoints

#### Get Property — `GET /partner/properties/{id}`
#### Search Properties — `GET /partner/properties?their_id=uuid`

#### Add Property — `POST /partner/landlords/{landlord_id}/properties`
Required: `create_status` (`vacant` or `tenanted`), `address_attributes`
- `their_id` must be unique per branch

#### Update Property — `PATCH /partner/properties/{id}`
Updatable: `their_id`, `address_attributes`, `enabled` (false = mark as no longer managed, cancels incomplete moves, notifies energy partner)

---

### 16.7 Move Endpoints

#### Make Move-Out — `POST /partner/properties/{property_id}/move_outs`
Required: `submission_type: "landlord"`
Optional: `fuel_type` (`single` or `dual`), meter serials/readings (electric, gas, water), `forwarding_address`, `notify_council`, `notify_water`, `notify_previous_energy`, `switch_date`, `their_id`

#### Make Move-In — `POST /partner/properties/{property_id}/move_ins`
Required: `submission_type: "tenant"`
Optional: `fuel_type` (`single` or `dual`), meter data, `tenants_attributes` (array with `first_name`, `last_name`, `email`, `mobile`, `date_of_birth`, `student`, `title`, `landline`)

#### Cancel Move — `DELETE /partner/moves/{id}`

#### Get Single Move — `GET /partner/moves/{id}` (supports HTM id or `their_id`)

#### Get Moves for Property — `GET /partner/properties/{property_id}/moves`

#### Get Moves Requiring Meter Reads for Branch — `GET /partner/branches/{branch_id}/meter_reads_required`
Returns moves with no meter reads or meter reads not within 3 days of `switch_date`.

#### Update Meter Readings — `PATCH /partner/moves/{move_id}/meter_reads`
At least one attribute required. Fields: `electric_meter_serial`, `mpan`, `gas_meter_serial`, `mprn`, `water_meter_serial`, `electric_meter_reading_1`, `electric_meter_reading_2`, `gas_meter_reading`, `water_meter_reading`

---

### 16.8 Error Handling
Errors returned as:
```json
{"errors": ["First name can't be blank"]}
```

### 16.9 Recommended Move Workflow
1. Find/create branch → get `branch_id`
2. Find/create landlord under branch → get `landlord_id`
3. Find/create property under landlord → get `property_id`
4. POST move-out to property → get move `id`
5. POST move-in to property (after move-out or if `create_status = 'vacant'`)
6. Update meter readings as needed via `PATCH /partner/moves/{id}/meter_reads`

---

## 17. QA Test Scenarios

### 17.1 Create Property — Let Alliance Clone
**Endpoint:** `POST /partner/landlords/{landlord_id}/properties`
**Environment:** Let Alliance Clone — `https://api-letalliance-clone.helpthemove.co.uk`
**Auth:** `Authorization: Token token=1mNqkzLUvJLDvUOP08MrwvZTUo2S8cwa`
**Test Landlord ID:** `33523`

#### ✅ 1. Success — agent_branch_address (no billing address params)
```bash
curl --request POST \
  "https://api-letalliance-clone.helpthemove.co.uk/partner/landlords/33523/properties" \
  --header "Authorization: Token token=1mNqkzLUvJLDvUOP08MrwvZTUo2S8cwa" \
  --header "Content-Type: application/json" \
  --data-raw '{
    "property": {
      "create_status": "vacant",
      "their_id": "P-AGENT-1",
      "billing_address_type": "agent_branch_address",
      "address_attributes": {
        "address_1": "10 Demo Street",
        "town": "Manchester",
        "post_code": "M1 1AA"
      }
    }
  }'
```

#### ✅ 2. Success — property_alternative_address (with billing address)
```bash
curl --request POST \
  "https://api-letalliance-clone.helpthemove.co.uk/partner/landlords/33523/properties" \
  --header "Authorization: Token token=1mNqkzLUvJLDvUOP08MrwvZTUo2S8cwa" \
  --header "Content-Type: application/json" \
  --data-raw '{
    "property": {
      "create_status": "vacant",
      "their_id": "P-ALT-1",
      "billing_address_type": "property_alternative_address",
      "billing_address_attributes": {
        "address_1": "99 Billing Road",
        "town": "Manchester",
        "post_code": "M2 2BB"
      },
      "address_attributes": {
        "address_1": "11 Demo Street",
        "town": "Manchester",
        "post_code": "M1 1AB"
      }
    }
  }'
```

#### ❌ 3. Error — missing required billing fields (no post_code)
```bash
curl --request POST \
  "https://api-letalliance-clone.helpthemove.co.uk/partner/landlords/33523/properties" \
  --header "Authorization: Token token=1mNqkzLUvJLDvUOP08MrwvZTUo2S8cwa" \
  --header "Content-Type: application/json" \
  --data-raw '{
    "property": {
      "create_status": "vacant",
      "their_id": "P-ALT-INVALID",
      "billing_address_type": "property_alternative_address",
      "billing_address_attributes": {
        "address_1": "99 Billing Road",
        "town": "Manchester"
      },
      "address_attributes": {
        "address_1": "12 Demo Street",
        "town": "Manchester",
        "post_code": "M1 1AC"
      }
    }
  }'
```

#### ❌ 4. Error — invalid billing_address_type
```bash
curl --request POST \
  "https://api-letalliance-clone.helpthemove.co.uk/partner/landlords/33523/properties" \
  --header "Authorization: Token token=1mNqkzLUvJLDvUOP08MrwvZTUo2S8cwa" \
  --header "Content-Type: application/json" \
  --data-raw '{
    "property": {
      "create_status": "vacant",
      "their_id": "P-BAD-TYPE",
      "billing_address_type": "nope",
      "address_attributes": {
        "address_1": "13 Demo Street",
        "town": "Manchester",
        "post_code": "M1 1AD"
      }
    }
  }'
```

---

### 17.2 Update Billing — Let Alliance Clone
**Endpoint:** `PATCH /partner/properties/{property_id}/billing`
**Environment:** Let Alliance Clone — `https://api-letalliance-clone.helpthemove.co.uk`
**Auth:** `Authorization: Token token=1mNqkzLUvJLDvUOP08MrwvZTUo2S8cwa`
**Test Property ID:** `57931`

#### ✅ 5. Success — set agent_branch_address
```bash
curl --request PATCH \
  "https://api-letalliance-clone.helpthemove.co.uk/partner/properties/57931/billing" \
  --header "Authorization: Token token=1mNqkzLUvJLDvUOP08MrwvZTUo2S8cwa" \
  --header "Content-Type: application/json" \
  --data-raw '{
    "property": {
      "billing_address_type": "agent_branch_address"
    }
  }'
```

#### ✅ 6. Success — set property_alternative_address
```bash
curl --request PATCH \
  "https://api-letalliance-clone.helpthemove.co.uk/partner/properties/57931/billing" \
  --header "Authorization: Token token=1mNqkzLUvJLDvUOP08MrwvZTUo2S8cwa" \
  --header "Content-Type: application/json" \
  --data-raw '{
    "property": {
      "billing_address_type": "property_alternative_address",
      "billing_address_attributes": {
        "address_1": "77 Billing Lane",
        "town": "Manchester",
        "post_code": "M3 3CC"
      }
    }
  }'
```

#### ✅ 7. Success — remove override (null)
```bash
curl --request PATCH \
  "https://api-letalliance-clone.helpthemove.co.uk/partner/properties/57931/billing" \
  --header "Authorization: Token token=1mNqkzLUvJLDvUOP08MrwvZTUo2S8cwa" \
  --header "Content-Type: application/json" \
  --data-raw '{
    "property": {
      "billing_address_type": null
    }
  }'
```

#### ❌ 8. Error — missing billing fields (no post_code)
```bash
curl --request PATCH \
  "https://api-letalliance-clone.helpthemove.co.uk/partner/properties/57931/billing" \
  --header "Authorization: Token token=1mNqkzLUvJLDvUOP08MrwvZTUo2S8cwa" \
  --header "Content-Type: application/json" \
  --data-raw '{
    "property": {
      "billing_address_type": "property_alternative_address",
      "billing_address_attributes": {
        "address_1": "77 Billing Lane",
        "town": "Manchester"
      }
    }
  }'
```

#### ❌ 9. Error — invalid billing_address_type
```bash
curl --request PATCH \
  "https://api-letalliance-clone.helpthemove.co.uk/partner/properties/57931/billing" \
  --header "Authorization: Token token=1mNqkzLUvJLDvUOP08MrwvZTUo2S8cwa" \
  --header "Content-Type: application/json" \
  --data-raw '{
    "property": {
      "billing_address_type": "something_wrong"
    }
  }'
```
