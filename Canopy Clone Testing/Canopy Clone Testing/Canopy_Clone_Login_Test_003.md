# Canopy Clone Login - Optional Passkey Login Test (Test 003)

## Test Execution Report

**Test Name:** Canopy Clone Login - Optional Passkey (Skip Passkey Flow)
**Date Executed:** 2026-05-11
**Test Status:** 📋 DOCUMENTED
**Test ID:** Canopy_Clone_Login_Test_003

---

## Overview

This test documents and verifies that the Google Passkey prompt during login is **optional** — users must be able to bypass it and complete login via standard Google OAuth without being forced to authenticate with a passkey.

**Problem Statement:** Users with a Google Passkey registered are currently required to authenticate with it on every login. The expected behaviour is that passkey usage should be optional, with the standard Google account selection remaining available as an alternative path.

---

## Test Scenarios

### Scenario A: Skip Passkey — Use Google Account Selection Instead

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `https://admin-canopy-clone.helpthemove.co.uk/login` | Login page loads |
| 2 | Click "Sign in with Google" | Google authentication dialog opens |
| 3 | When passkey prompt appears, click **"Try another way"** or **"Use a different account"** | Passkey prompt is dismissed |
| 4 | Select account `mac.murapa@helpthemove.co.uk` via standard account picker | Account selected without passkey |
| 5 | OAuth authentication completes | Session established |
| 6 | Dashboard renders | Admin homepage loaded |

**Expected:** User can complete login without using the passkey.
**Pass Criteria:** Dashboard loads successfully after bypassing passkey prompt.

---

### Scenario B: Passkey Present but Not Forced on Subsequent Logins

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Log out of application | Session terminated |
| 2 | Return to login page | Login page displayed |
| 3 | Click "Sign in with Google" | Google authentication dialog opens |
| 4 | Verify a "skip" or "use password instead" option is visible | Option is present in the dialog |
| 5 | Proceed without passkey | Login succeeds via standard OAuth |

**Expected:** Passkey is presented as an option, not a hard requirement.
**Pass Criteria:** "Try another way" / "Use password" option is visible and functional.

---

### Scenario C: Verify Standard Login Still Works After Passkey Registered

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Confirm a passkey is registered on the Google account | Passkey exists in account settings |
| 2 | Initiate login via "Sign in with Google" | Auth dialog opens |
| 3 | Choose **not** to use passkey | Alternative auth path selected |
| 4 | Authenticate via Google password + 2FA if applicable | Authentication succeeds |
| 5 | Redirected back to application | Session created |
| 6 | Dashboard loads | Admin homepage rendered |

**Expected:** Registering a passkey does not break or block the traditional login path.
**Pass Criteria:** Login completes successfully without passkey involvement.

---

## How to Prevent Mandatory Passkey Prompt

When Google presents a passkey authentication prompt, the following options allow you to bypass it:

1. **"Try another way"** — Appears below the passkey prompt in the Google dialog. Clicking this presents alternative sign-in methods including password.
2. **"Use a different account"** — Opens the full account selection screen, bypassing the passkey flow for the pre-selected account.
3. **Browser-level bypass** — In Chrome, navigating to `chrome://settings/passkeys` allows removing the passkey for the specific site/account, preventing the prompt from appearing entirely.
4. **Google Account Settings** — In `myaccount.google.com > Security > Passkeys`, the registered passkey for this account can be removed or the passkey prompt preference adjusted.

---

## Test Environment

- **Application:** Helpthemove Admin Portal (Canopy Clone)
- **Login URL:** `https://admin-canopy-clone.helpthemove.co.uk/login`
- **Test Account:** mac.murapa@helpthemove.co.uk
- **Authentication Method:** Google OAuth 2.0 (with optional Passkey)
- **Browser:** Chrome
- **Viewport:** 1457x812px

---

## Acceptance Criteria

| # | Criteria | Status |
|---|----------|--------|
| 1 | Passkey prompt includes a visible "skip" or "try another way" option | ⬜ To Verify |
| 2 | Login succeeds without using the passkey | ⬜ To Verify |
| 3 | Session is established correctly after skipping passkey | ⬜ To Verify |
| 4 | Dashboard loads with full navigation and data | ⬜ To Verify |
| 5 | No error or warning shown when passkey is skipped | ⬜ To Verify |

---

## Comparison with Previous Tests

| Metric | Test_001 | Test_002 | Test_003 |
|--------|----------|----------|----------|
| Auth Method | Google OAuth | Google OAuth | Google OAuth (Passkey Optional) |
| Passkey Required | Not tested | Not tested | No — optional |
| Execution Time | ~3 seconds | ~2.5 seconds | TBD |
| Status | PASSED | PASSED | Pending Execution |

---

## Notes

- Google's passkey implementation defaults to prompting the user when a passkey is registered for the account. This is a Google-side behaviour.
- The application itself should not enforce passkey usage beyond what Google OAuth returns.
- If the application is configured to require a specific authentication assurance level (AAL), this could force passkey usage — this should be reviewed in the OAuth scope/configuration.
- Test should be re-executed after any authentication configuration changes to confirm passkey remains optional.

---

**Test Author:** QA Team
**Date Created:** 2026-05-11
**Branch:** claude/optional-passkey-login-R2QIc
