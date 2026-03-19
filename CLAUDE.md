# QA-Testing — Claude Context

## Project Overview
This repo contains Playwright-based QA test scripts for the **Help the Move (HTM)** platform and its clones.

## Clones & Environments

| Clone | Domain | Auth File |
|-------|--------|-----------|
| HTM Clone | `https://admin-clone.helpthemove.co.uk` | `auth.json` |
| Canopy Clone | `https://<canopy>.helpthemove.co.uk` | `canopy_auth.json` |
| Vouch Clone | TBD | — |

## Authentication
- Sessions are stored as cookies in `auth.json` (HTM) and `canopy_auth.json` (Canopy)
- If a session expires, scripts attempt re-authentication via Google OAuth
- To force manual login: `MANUAL_LOGIN=1 node <script>.js`

## HTM Clone — Branch Naming Convention
Branches created in the HTM app follow this format:

```
Mac N[DDMMYY]
```

- `N` = sequential count of branches created today (1, 2, 3 ...)
- `DDMMYY` = date suffix
- Example: 1st branch on 19 Mar 2026 → `Mac 1190326`

The scripts auto-determine `N` by searching `/branches` for today's suffix and counting matches.

## Default Branch Values (HTM)
| Field | Value |
|-------|-------|
| Business Type | Letting Agent |
| Phone | 07561834920 |
| Address Line 1 | 123 Test Street |
| Town | Manchester |
| Post Code | M13 9GS |
| County | Lancashire |

## Folder Structure
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
│               └── Test Run 007/    # Landlord Creation test
├── Canopy Clone Testing/
└── Vouch Clone Testing/
```

## Git Branch Convention
All Claude working branches follow:
```
claude/playwright-<clone>-<task>-<id>
```
Example: `claude/playwright-htm-clone-screenshot-TGWXg`

- **Never push to `main` or `master` directly**
- Always push with: `git push -u origin <branch-name>`

## Test Runs Log

| Run | Date | Clone | Task | Result |
|-----|------|-------|------|--------|
| 007 | 18 Mar 2026 | HTM | Landlord Creation (Mac 8180326 / Mrs Arthur Lewis) | PASS |

## Key Scripts
| Script | Purpose |
|--------|---------|
| `htm_clone_007.js` | Creates a branch + landlord on HTM Clone |
| `htm_clone_007_inspect.js` | Inspects/verifies the created branch |
